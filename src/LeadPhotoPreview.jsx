import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export function MediaArrows({ onChange, label = "photo" }) {
  return (
    <>
      <button
        type="button"
        className="source-media-arrow previous"
        aria-label={"Previous " + label}
        onClick={() => onChange(-1)}
      >
        <ChevronLeft size={23} />
      </button>
      <button
        type="button"
        className="source-media-arrow next"
        aria-label={"Next " + label}
        onClick={() => onChange(1)}
      >
        <ChevronRight size={23} />
      </button>
    </>
  );
}

export default function LeadPhotoPreview({
  title,
  asset,
  count,
  caption,
  onChange,
  onClose,
}) {
  const dialog = useRef(null);
  const close = useRef(null);
  const frame = useRef(null);
  const pan = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState("");
  const available = asset.url !== failed;
  const magnified = zoomed && available;

  useEffect(() => {
    const preview = dialog.current;
    const opener = document.activeElement;
    preview.showModal();
    close.current.focus({ preventScroll: true });
    return () => {
      preview.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const view = frame.current;
    pan.current = null;
    view.scrollTo({
      left: (view.scrollWidth - view.clientWidth) / 2,
      top: (view.scrollHeight - view.clientHeight) / 2,
      behavior: "instant",
    });
  }, [magnified, asset.url]);

  function change(delta) {
    setZoomed(false);
    onChange(delta);
  }

  return (
    <dialog
      ref={dialog}
      className="view-dialog source-photo-preview"
      aria-labelledby="source-full-photo-title"
      onCancel={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.stopPropagation();
        if (
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          (magnified && event.target === frame.current)
        )
          return;
        if (count > 1) {
          event.preventDefault();
          change(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="viewer-layout">
        <header className="source-preview-header">
          <strong id="source-full-photo-title">{title} · Photo preview</strong>
          <div className="source-preview-tools">
            <button
              type="button"
              aria-pressed={magnified}
              disabled={!available}
              aria-label={magnified ? "Fit photo" : "Magnify 2×"}
              onClick={() => setZoomed((value) => !value)}
            >
              {magnified ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              <span>{magnified ? "Fit photo" : "Magnify 2×"}</span>
            </button>
            <button
              ref={close}
              type="button"
              aria-label="Close full-screen photo"
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>
        </header>
        <div className="source-preview-stage">
          <div
            ref={frame}
            className={"inspect-frame" + (magnified ? " zoomed" : "")}
            role="group"
            tabIndex={magnified ? 0 : undefined}
            aria-label={
              magnified
                ? "Magnified photo. Drag, swipe, or use the arrow keys to pan."
                : "Full-screen photo"
            }
            onPointerDown={(event) => {
              if (
                !magnified ||
                event.pointerType !== "mouse" ||
                event.button !== 0
              )
                return;
              const view = event.currentTarget;
              view.focus({ preventScroll: true });
              pan.current = {
                x: event.clientX + view.scrollLeft,
                y: event.clientY + view.scrollTop,
              };
              view.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (pan.current)
                event.currentTarget.scrollTo({
                  left: pan.current.x - event.clientX,
                  top: pan.current.y - event.clientY,
                  behavior: "instant",
                });
            }}
            onLostPointerCapture={() => {
              pan.current = null;
            }}
          >
            {available ? (
              <img
                key={asset.url}
                src={asset.url}
                alt={title + " · " + caption}
                draggable="false"
                referrerPolicy="no-referrer"
                onError={() => setFailed(asset.url)}
              />
            ) : (
              <div className="source-preview-unavailable">
                <Image size={25} /> This photo is unavailable.
              </div>
            )}
          </div>
          {count > 1 && <MediaArrows onChange={change} />}
        </div>
        <div className="source-preview-caption">
          <span role="status">{caption}</span>
          {magnified && <span>Drag or swipe to look around</span>}
        </div>
      </div>
    </dialog>
  );
}
