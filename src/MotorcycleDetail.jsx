import React, { useEffect, useRef, useState } from "react";
import { Link } from "./routing";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Maximize,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { bikeName, Status } from "./shared";
import BikePrice from "./BikePrice";

import { FilmShelf } from "./Films";

const sections = [
  ["gallery", "Overview"],
  ["specifications", "Specifications"],
  ["enquire", "Enquire"],
];
const dateLabel = (iso) =>
  new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(iso + "T12:00:00Z"));

export default function MotorcycleDetail({ bike, children }) {
  const [index, setIndex] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const inspectFrame = useRef(null),
    pan = useRef(null);
  const [active, setActive] = useState("gallery");
  const dialog = useRef(null),
    track = useRef(null),
    swipe = useRef(null),
    moved = useRef(false);
  const count = bike.photos.length,
    photo = bike.photos[index],
    name = bikeName(bike);
  const archive = ["Archive", "Sold"].includes(bike.status);
  const ask = archive ? "Source a similar bike" : "Enquire about this bike";
  useEffect(() => {
    document.title = name + " | L & S Motorsports";
    const anchors = sections.map(([id]) => document.getElementById(id));
    let frame = 0;
    function update() {
      frame = 0;
      const threshold = Math.max(
        Math.min(innerHeight * 0.35, 240),
        (track.current?.getBoundingClientRect().bottom ?? 0) + 2,
      );
      const current = anchors
        .filter((el) => el.getBoundingClientRect().top <= threshold)
        .at(-1);
      setActive(current?.id || "gallery");
      const first = anchors[0].getBoundingClientRect().top,
        last = anchors.at(-1).getBoundingClientRect().top;
      const progress = Math.max(
        0,
        Math.min(1, (threshold - first) / Math.max(1, last - first)),
      );
      track.current?.style.setProperty("--read", progress);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const hash = window.location.hash.slice(1);
    if (anchors.some((el) => el.id === hash))
      document.getElementById(hash).scrollIntoView();
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [name]);
  useEffect(() => {
    const el = inspectFrame.current;
    if (!el) return;
    el.scrollTo({
      left: (el.scrollWidth - el.clientWidth) / 2,
      top: (el.scrollHeight - el.clientHeight) / 2,
      behavior: "instant",
    });
  }, [inspecting, index]);
  function change(delta) {
    if (count > 1) {
      setInspecting(false);
      setIndex((i) => (i + delta + count) % count);
    }
  }
  function key(e) {
    if (inspecting && e.target === inspectFrame.current) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      change(e.key === "ArrowLeft" ? -1 : 1);
    }
  }
  const touch = {
    onTouchStart: (e) => {
      moved.current = false;
      swipe.current = [e.touches[0].clientX, e.touches[0].clientY];
    },
    onTouchEnd: (e) => {
      if (!swipe.current) return;
      const dx = e.changedTouches[0].clientX - swipe.current[0],
        dy = e.changedTouches[0].clientY - swipe.current[1];
      if (
        count > 1 &&
        Math.abs(dx) > 45 &&
        Math.abs(dx) > Math.abs(dy) * 1.25
      ) {
        moved.current = true;
        change(dx < 0 ? 1 : -1);
      }
      swipe.current = null;
    },
    onTouchCancel: () => {
      swipe.current = null;
    },
  };
  const counter =
    String(index + 1).padStart(2, "0") + " / " + String(count).padStart(2, "0");
  function arrows() {
    return (
      <>
        <button aria-label="Previous photograph" onClick={() => change(-1)}>
          <ChevronLeft size={19} />
        </button>
        <span aria-live="polite">{counter}</span>
        <button aria-label="Next photograph" onClick={() => change(1)}>
          <ChevronRight size={19} />
        </button>
      </>
    );
  }
  return (
    <main className="motor-detail">
      <nav
        className="detail-track"
        ref={track}
        aria-label="On this motorcycle page"
      >
        <div className="wrap track-inner">
          <Link className="track-back" to="/showroom">
            <ChevronLeft size={15} /> Showroom
          </Link>
          <div>
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={"#" + id}
                aria-current={active === id ? "location" : undefined}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>
      <section
        id="gallery"
        className={"detail-stage" + (!count ? " paper-record" : "")}
      >
        {photo && (
          <div
            className="detail-atmosphere"
            aria-hidden="true"
            style={{ backgroundImage: "url(" + JSON.stringify(photo) + ")" }}
          />
        )}
        <div className="wrap detail-stage-inner">
          <div className="stage-title">
            <Status value={bike.status} />
            <p className="model-year">
              {bike.year ?? "Year unlisted"} <i /> {bike.make}
            </p>
            <h1>
              {bike.model}
              <span>.</span>
            </h1>
            <BikePrice bike={bike} />
            <a className="button" href="#enquire">
              {ask} <ArrowRight size={16} />
            </a>
          </div>
          {photo ? (
            <div className="photo-console" onKeyDown={key}>
              <button
                className="photo-screen"
                aria-label="Enlarge motorcycle photograph"
                {...touch}
                onClick={(e) => {
                  if (!moved.current || e.detail === 0)
                    dialog.current.showModal();
                  moved.current = false;
                }}
              >
                <img
                  src={photo}
                  alt={name + ", seller photograph " + (index + 1)}
                  fetchPriority="high"
                />
                <span>
                  <Maximize size={17} />
                </span>
              </button>
              <div className="console-bottom">
                <div className="filmstrip">
                  {bike.photos.map((url, i) => (
                    <button
                      key={url + i}
                      aria-label={"Show photograph " + (i + 1)}
                      aria-pressed={i === index}
                      onClick={() => setIndex(i)}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
                <div className="photo-steps">
                  {count > 1 ? arrows() : <span>{counter}</span>}
                </div>
              </div>
              {bike.credit && (
                <small className="photo-credit">{bike.credit}</small>
              )}
            </div>
          ) : (
            <div className="archive-plate">
              <span>Showroom archive</span>
              <strong>{bike.year ?? bike.make}</strong>
              <span>Original photograph unavailable</span>
            </div>
          )}
        </div>
      </section>
      <section id="specifications" className="wrap motorcycle-specs">
        <div>
          <p className="section-marker">
            <i /> Motorcycle record
          </p>
          <h2>
            Specifications<span>.</span>
          </h2>
          <p className="record-description">{bike.description}</p>
          {bike.status === "Advertised" && (
            <p className="availability-note">
              Contact L&S to confirm current price and availability.
            </p>
          )}
          {bike.source && (
            <div className="record-source">
              <a
                className="text-link"
                href={bike.source}
                target="_blank"
                rel="noreferrer"
              >
                View original source <ArrowUpRight size={15} />
              </a>
              {bike.checked && (
                <small>
                  {bike.sourceDate
                    ? "Advertised " + dateLabel(bike.sourceDate)
                    : "Source checked " + dateLabel(bike.checked)}
                </small>
              )}
            </div>
          )}
        </div>
        <dl className="spec-table">
          {[
            ["Model year", bike.year ?? "Unlisted"],
            ["Manufacturer", bike.make],
            ["Category", bike.category],
            [
              "Engine capacity",
              bike.cc ? bike.cc.toLocaleString() + " cc" : "Unlisted",
            ],
            [
              "Odometer",
              bike.km == null ? "Unlisted" : bike.km.toLocaleString() + " km",
            ],
            ["Listing status", bike.status],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <FilmShelf bikeId={bike.id} />
      <section id="enquire" className="wrap detail-enquiry">
        <div>
          <h2>
            {archive ? "Find a similar bike" : "Talk motorcycles"}
            <span>.</span>
          </h2>
          <p>Contact L&S about the {name}.</p>
        </div>
        {children}
      </section>
      {photo && (
        <dialog
          ref={dialog}
          className="view-dialog"
          aria-label={name + " photo viewer"}
          onKeyDown={key}
          onClose={() => {
            moved.current = false;
            setInspecting(false);
          }}
        >
          <div className="viewer-layout">
            <div className="viewer-head">
              <strong>{name}</strong>
              <div className="viewer-tools">
                <button
                  className="inspect-toggle"
                  aria-pressed={inspecting}
                  onClick={() => setInspecting(!inspecting)}
                >
                  {inspecting ? <ZoomOut size={17} /> : <ZoomIn size={17} />}{" "}
                  {inspecting ? "Fit photo" : "Inspect 2×"}
                </button>
                <button
                  autoFocus
                  aria-label="Close photograph"
                  onClick={() => dialog.current.close()}
                >
                  <X size={22} />
                </button>
              </div>
            </div>
            <div
              ref={inspectFrame}
              className={"inspect-frame" + (inspecting ? " zoomed" : "")}
              tabIndex={inspecting ? 0 : -1}
              role="group"
              aria-label={
                inspecting
                  ? "Enlarged photograph. Drag or use arrow keys to pan."
                  : "Motorcycle photograph"
              }
              {...(inspecting ? {} : touch)}
              onPointerDown={(e) => {
                if (!inspecting || e.pointerType !== "mouse" || e.button !== 0)
                  return;
                const el = e.currentTarget;
                pan.current = [
                  e.clientX,
                  e.clientY,
                  el.scrollLeft,
                  el.scrollTop,
                ];
                el.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!pan.current) return;
                const [x, y, left, top] = pan.current;
                e.currentTarget.scrollTo({
                  left: left + x - e.clientX,
                  top: top + y - e.clientY,
                  behavior: "instant",
                });
              }}
              onLostPointerCapture={() => {
                pan.current = null;
              }}
            >
              <img
                draggable="false"
                src={photo}
                alt={name + ", photograph " + (index + 1)}
              />
            </div>
            <div className="photo-steps viewer-steps">
              {count > 1 ? arrows() : <span>{counter}</span>}
            </div>
          </div>
        </dialog>
      )}
    </main>
  );
}
