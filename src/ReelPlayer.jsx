import React, { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { poster, runtime, video } from "./Films";

export default function ReelPlayer({
  film,
  autoPlay = false,
  startAt,
  onPrevious,
  onNext,
}) {
  const frame = useRef(null);
  const footage = useRef(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const [muted, setMuted] = useState(autoPlay);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [clock, setClock] = useState(0);
  const [duration, setDuration] = useState(film.duration);
  const [fullscreen, setFullscreen] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setClock(0);
    setDuration(film.duration);
    setPlaying(!footage.current.paused);
    setEnded(false);
    setFailed(false);
    setNotice("");
    setCanExpand(
      Boolean(
        document.fullscreenEnabled || footage.current.webkitEnterFullscreen,
      ),
    );
  }, [film.id, film.duration]);

  useEffect(() => {
    if (startAt == null || String(startAt).trim() === "") return;
    const requested = Number(startAt);
    if (!Number.isFinite(requested)) return;
    const el = footage.current;
    function cue() {
      if (!Number.isFinite(el.duration)) return;
      el.currentTime = Math.max(0, Math.min(requested, el.duration - 0.1));
      setClock(el.currentTime);
    }
    if (el.readyState >= 1) cue();
    else el.addEventListener("loadedmetadata", cue, { once: true });
    return () => el.removeEventListener("loadedmetadata", cue);
  }, [film.id, startAt]);

  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  function togglePlayback() {
    const el = footage.current;
    if (!el || failed) return;
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch((error) => {
        if (footage.current === el && error.name !== "AbortError")
          setNotice("Playback could not start. Try playing the reel again.");
      });
    } else el.pause();
  }
  async function expand() {
    if (!canExpand) return;
    try {
      if (document.fullscreenElement === frame.current)
        await document.exitFullscreen();
      else if (document.fullscreenEnabled)
        await frame.current.requestFullscreen();
      else footage.current.webkitEnterFullscreen();
    } catch {
      setNotice("Fullscreen is unavailable in this view.");
    }
  }
  function keyboard(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.tagName === "INPUT")
      return;
    const key = e.key.toLowerCase();
    if (key === "k" || (key === " " && e.target.tagName !== "BUTTON")) {
      e.preventDefault();
      togglePlayback();
    } else if (key === "m") {
      e.preventDefault();
      setMuted((value) => !value);
    } else if (key === "f" && canExpand) {
      e.preventDefault();
      expand();
    }
  }
  function startSwipe(e) {
    swiped.current = false;
    if (e.pointerType !== "touch" || !onNext || !onPrevious) return;
    touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function endSwipe(e) {
    const start = touch.current;
    touch.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    if (
      Math.abs(dx) < 45 ||
      Math.abs(dx) < Math.abs(e.clientY - start.y) * 1.25
    )
      return;
    swiped.current = true;
    if (dx < 0) onNext();
    else onPrevious();
  }
  const playLabel = ended
    ? "Replay reel"
    : playing
      ? "Pause reel"
      : "Play reel";
  const soundLabel = muted ? "Unmute reel" : "Mute reel";
  const time = Math.min(clock, duration);
  return (
    <section
      ref={frame}
      className="reel-screen"
      aria-label={"Video player for " + film.title}
      onKeyDown={keyboard}
    >
      <div
        className="reel-stage"
        style={{ "--reel-poster": "url(" + poster(film) + ")" }}
      >
        <video
          ref={footage}
          key={film.id}
          className="reel-footage"
          src={video(film)}
          poster={poster(film)}
          muted={muted}
          autoPlay={autoPlay && !reduceMotion}
          playsInline
          preload="metadata"
          aria-label={film.title}
          onLoadedMetadata={(e) => {
            const seconds = e.currentTarget.duration;
            if (Number.isFinite(seconds)) setDuration(seconds);
          }}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
            setNotice("");
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setEnded(true);
            setPlaying(false);
          }}
          onTimeUpdate={(e) => setClock(e.currentTarget.currentTime)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
            setNotice("This video could not be loaded.");
          }}
        />
        <div
          className="reel-hit"
          aria-hidden="true"
          onPointerDown={startSwipe}
          onPointerUp={endSwipe}
          onPointerCancel={() => {
            touch.current = null;
          }}
          onClick={() => {
            if (!swiped.current) togglePlayback();
            swiped.current = false;
          }}
        >
          {!playing && !failed && (
            <span className="reel-center-play">
              {ended ? <RotateCcw /> : <Play fill="currentColor" />}
            </span>
          )}
        </div>
        {notice && (
          <div className="reel-notice" role="status">
            {notice}{" "}
            {failed && (
              <a
                href={"https://www.facebook.com/reel/" + film.id + "/"}
                target="_blank"
                rel="noreferrer"
              >
                Open original reel
              </a>
            )}
          </div>
        )}
      </div>
      <div className="reel-controls">
        <input
          type="range"
          className="reel-seek"
          aria-label="Seek through reel"
          aria-valuetext={
            runtime(Math.floor(time)) + " of " + runtime(Math.floor(duration))
          }
          min="0"
          max={duration || 1}
          step="0.1"
          value={time}
          disabled={failed}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            const el = footage.current;
            if (!el.readyState) return;
            e.preventDefault();
            el.currentTime = Math.max(
              0,
              Math.min(
                duration,
                el.currentTime + (e.key === "ArrowRight" ? 5 : -5),
              ),
            );
            setClock(el.currentTime);
          }}
          style={{
            "--reel-progress": (duration ? (time / duration) * 100 : 0) + "%",
          }}
          onChange={(e) => {
            const el = footage.current;
            if (el.readyState) {
              el.currentTime = e.target.valueAsNumber;
              setClock(el.currentTime);
            }
          }}
        />
        <div className="reel-control-row">
          <button
            type="button"
            className="reel-play"
            onClick={togglePlayback}
            disabled={failed}
            aria-label={playLabel}
            title={playLabel + " (K)"}
          >
            {playing ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
          </button>
          <div className="reel-clock">
            {runtime(Math.floor(time))}{" "}
            <span>/ {runtime(Math.floor(duration))}</span>
          </div>
          <button
            type="button"
            className="reel-sound"
            aria-label={soundLabel}
            title={soundLabel + " (M)"}
            onClick={() => setMuted((v) => !v)}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{muted ? "Sound off" : "Sound on"}</span>
          </button>
          {canExpand && (
            <button
              type="button"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title="Fullscreen (F)"
              onClick={expand}
            >
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
