import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "./routing";
import { ArrowUpRight, Play } from "lucide-react";
import films from "./data/films.json";

export { films };
export const poster = (film) => "/media/films/" + film.id + ".webp";
export const video = (film) => "/media/films/" + film.id + ".mp4";
export const runtime = (seconds) =>
  Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
export function ReelLink({ film, startAt = 0, ...props }) {
  const location = useLocation();
  const state =
    location.pathname === "/journal"
      ? undefined
      : { backgroundLocation: location };
  const query = new URLSearchParams({ film: film.id });
  if (startAt > 0) query.set("t", String(startAt));
  return <Link {...props} to={"/journal?" + query} state={state} />;
}
export function FilmCard({ film }) {
  const card = useRef(null);
  const [preview, setPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const dwell = useRef(null);
  useEffect(() => () => clearTimeout(dwell.current), []);
  function stop() {
    clearTimeout(dwell.current);
    setPreview(false);
    setPlaying(false);
  }
  function prepare(event) {
    if (
      event.pointerType !== "mouse" ||
      navigator.connection?.saveData ||
      !matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)")
        .matches
    )
      return;
    clearTimeout(dwell.current);
    dwell.current = setTimeout(() => setPreview(true), 400);
  }
  useEffect(() => {
    if (!preview) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    observer.observe(card.current);
    function visibility() {
      if (document.hidden) stop();
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [preview]);
  return (
    <ReelLink
      ref={card}
      className={"film-card" + (playing ? " is-previewing" : "")}
      film={film}
      aria-label={"Watch " + film.title + ", " + runtime(film.duration)}
      onPointerEnter={prepare}
      onPointerLeave={stop}
      onClick={stop}
    >
      <div className="film-cover">
        <img src={poster(film)} loading="lazy" alt="" />
        {preview && (
          <video
            className="film-peek"
            muted
            playsInline
            autoPlay
            aria-hidden="true"
            disablePictureInPicture
            tabIndex={-1}
            src={video(film)}
            onPlaying={() => setPlaying(true)}
            onError={stop}
            onEnded={stop}
            onTimeUpdate={(event) => {
              if (event.currentTarget.currentTime >= 4.5) stop();
            }}
          />
        )}
        <span className="play-disc">
          <Play size={16} fill="currentColor" />
        </span>
        <small>{runtime(film.duration)}</small>
      </div>
      <h3>{film.title}</h3>
    </ReelLink>
  );
}
export function FilmShelf({ bikeId }) {
  const collection = bikeId
    ? films.filter((f) => f.bikes.includes(bikeId))
    : [0, 13, 17, 27].map((i) => films[i]);
  if (!collection.length) return null;
  return (
    <section
      className={"film-shelf " + (bikeId ? "related-shelf" : "")}
      id={bikeId ? "motorcycle-films" : "garage-films"}
    >
      <div className="wrap">
        <div className="shelf-heading">
          <div>
            <div className="section-marker">
              <i /> {bikeId ? "From the seller" : "The L&S journal"}
            </div>
            <h2>
              {bikeId ? "Watch this bike" : "On film"}
              <span>.</span>
            </h2>
          </div>
          <Link className="text-link" to="/journal">
            All films <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="shelf-track">
          {collection.map((f) => (
            <FilmCard key={f.id} film={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
