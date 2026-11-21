"use client";

import { useEffect, useRef } from "react";

// Keep reading and interaction surfaces still. Motion is applied to their
// introduction or imagery and is calculated only while a scene is on screen.
const sceneSelector = [
  ".cinema-home",
  ".shelf-heading",
  ".shelf-track .film-card",
  ".collection-title",
  ".bike-grid .bike-card",
  ".sell-strip",
  ".journal-mast",
  ".journal-grid > *",
  ".album-heading",
  ".stage-title",
  ".motorcycle-specs",
  ".detail-enquiry > div:first-child",
  ".about-grid figure",
  ".about-grid > div:first-child",
  ".contact-grid > div:first-child",
  ".login-grid > div:first-child",
  ".workspace .heading-row",
  ".workspace .metrics",
  ".workspace .analytics-layout > section",
  ".workspace .rankings",
  "footer .footer-in",
].join(",");

const unit = (value) => Math.max(0, Math.min(1, value));

function enableMotion(progress) {
  const root = document.documentElement;
  const seen = new Set(),
    visible = new Set();
  let pointer = null;
  let frame = 0;
  function paint() {
    frame = 0;
    const viewHeight = window.innerHeight;
    const distance = root.scrollHeight - viewHeight;
    const measurements = Array.from(visible, (element) => [
      element,
      element.getBoundingClientRect(),
    ]);
    progress.style.transform =
      "scaleX(" + (distance > 0 ? unit(window.scrollY / distance) : 0) + ")";
    for (const [el, rect] of measurements) {
      if (el.dataset.scrollScene === "hero") {
        const p = unit(-rect.top / Math.max(rect.height, 1));
        const x = pointer
          ? (unit((pointer.x - rect.left) / rect.width) - 0.5) * 16
          : 0;
        const y = pointer
          ? (unit((pointer.y - rect.top) / rect.height) - 0.5) * 9
          : 0;
        el.style.setProperty("--stage-travel", p.toFixed(4));
        el.style.setProperty("--camera-x", x.toFixed(1) + "px");
        el.style.setProperty("--pointer-y", y.toFixed(1) + "px");
      } else {
        const amount =
          1 -
          unit(
            (viewHeight - rect.top) /
              Math.min(170, Math.max(72, rect.height * 0.65)),
          );
        el.style.setProperty("--scroll-entry", amount.toFixed(4));
        if (el.dataset.scrollScene === "cover") {
          el.style.setProperty(
            "--cover-travel",
            unit(-rect.top / Math.max(rect.height, 1)).toFixed(4),
          );
        }
      }
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      schedule();
    },
    { rootMargin: "48px 0px" },
  );
  function observe(el) {
    if (seen.has(el)) return;
    seen.add(el);
    el.dataset.scrollScene = el.matches(".cinema-home")
      ? "hero"
      : el.matches(
            ".journal-mast, .stage-title, .about-grid > *, .contact-grid > div:first-child",
          )
        ? "cover"
        : "entry";
    visibility.observe(el);
  }
  function discover(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(sceneSelector)) observe(node);
    node.querySelectorAll(sceneSelector).forEach(observe);
  }
  discover(document.body);
  root.dataset.showroomMotion = "";
  const changes = new MutationObserver((records) => {
    let removedNodes = false;
    for (const record of records) {
      record.addedNodes.forEach(discover);
      removedNodes ||= record.removedNodes.length > 0;
    }
    if (removedNodes) {
      for (const el of seen) {
        if (el.isConnected) continue;
        visibility.unobserve(el);
        seen.delete(el);
        visible.delete(el);
      }
    }
    schedule();
  });
  changes.observe(document.body, { childList: true, subtree: true });
  const dimensions = new ResizeObserver(schedule);
  dimensions.observe(document.body);
  function resetPointer() {
    if (!pointer) return;
    pointer = null;
    schedule();
  }
  function move(e) {
    if (e.pointerType !== "mouse") return;
    const hero =
      e.target instanceof Element && e.target.closest(".cinema-home");
    if (!hero) return resetPointer();
    pointer = { x: e.clientX, y: e.clientY };
    schedule();
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", resetPointer);
  schedule();
  return () => {
    delete root.dataset.showroomMotion;
    visibility.disconnect();
    changes.disconnect();
    dimensions.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", resetPointer);
    for (const el of seen) {
      delete el.dataset.scrollScene;
      for (const property of [
        "--stage-travel",
        "--scroll-entry",
        "--camera-x",
        "--pointer-y",
        "--cover-travel",
      ])
        el.style.removeProperty(property);
    }
  };
}

export default function ScrollMotion() {
  const progress = useRef(null);
  useEffect(() => {
    if (!("IntersectionObserver" in window) || !("ResizeObserver" in window))
      return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose;
    function configure() {
      dispose?.();
      dispose = preference.matches ? undefined : enableMotion(progress.current);
    }
    configure();
    preference.addEventListener("change", configure);
    return () => {
      preference.removeEventListener("change", configure);
      dispose?.();
    };
  }, []);
  return (
    <span ref={progress} className="page-read-progress" aria-hidden="true" />
  );
}
