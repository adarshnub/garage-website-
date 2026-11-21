import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation } from "./routing";
import { ArrowUpRight, LockKeyhole, Menu, X, ArrowRight } from "lucide-react";

export const money = (n) =>
  n == null
    ? "Price on enquiry"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      }).format(n);
export const bikeName = (b) =>
  [b.year, b.make, b.model].filter(Boolean).join(" ");
export async function api(path, method = "GET", data, { signal } = {}) {
  const options = { method, credentials: "same-origin", signal };
  if (method !== "GET") {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data || {});
  }
  const response = await fetch("/api/" + path, options);
  const body = await response
    .json()
    .catch(() => ({ error: "The showroom server could not be reached." }));
  if (!response.ok || body.error)
    throw Object.assign(new Error(body.error || "Request failed."), {
      status: response.status,
    });
  return body;
}
export const PublicStock = createContext(undefined);
export function useResource(path, refresh = 0) {
  const stock = useContext(PublicStock);
  const serverValue = path === "listings" ? stock : undefined;
  const [state, set] = useState({ data: null, error: "" });
  useEffect(() => {
    if (serverValue !== undefined) return;
    let active = true;
    set({ data: null, error: "" });
    api(path)
      .then((data) => active && set({ data, error: "" }))
      .catch((e) => active && set({ data: null, error: e.message }));
    return () => {
      active = false;
    };
  }, [path, refresh, serverValue]);
  return serverValue === undefined ? state : { data: serverValue, error: "" };
}
export function Logo() {
  return (
    <span className="brand-lockup">
      <span className="brand-art">
        <img
          src="/media/ls-original.jpg"
          alt="L & S Motorsports Services and Consulting"
        />
      </span>
      <span className="brand-text">
        L&S MOTORSPORTS<small>GOLD COAST · AUSTRALIA</small>
      </span>
    </span>
  );
}
export function Header({ pagePath }) {
  const [open, setOpen] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);
  const menu = useRef(null);
  const { key } = useLocation();
  const overMedia = pagePath === "/" || pagePath === "/journal";
  useEffect(() => {
    setOpen(false);
  }, [key]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector("a")?.focus({ preventScroll: true });
    const desktop = window.matchMedia("(min-width: 701px)");
    function dismissOutside(event) {
      if (!header.current?.contains(event.target)) setOpen(false);
    }
    function dismissOnEscape(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }
    function dismissOnResize(event) {
      if (event.matches) setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    desktop.addEventListener("change", dismissOnResize);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
      desktop.removeEventListener("change", dismissOnResize);
    };
  }, [open]);
  return (
    <header
      ref={header}
      className={
        "site-header floating-header" + (overMedia ? " over-media" : "")
      }
    >
      <div className="wrap nav-bar">
        <Link to="/" aria-label="L & S Motorsports home">
          <Logo />
        </Link>
        <nav
          id="main-navigation"
          ref={menu}
          className={open ? "primary-nav open" : "primary-nav"}
          aria-label="Main navigation"
        >
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/showroom">Showroom</NavLink>
          <NavLink to="/journal">Journal</NavLink>
          <NavLink to="/sell">Sell your bike</NavLink>
          <NavLink to="/about">About</NavLink>
          <Link to="/admin" className="mobile-admin">
            Admin
          </Link>
        </nav>
        <div className="nav-actions">
          <Link className="contact-link" to="/contact">
            <span className="desktop-contact">Get in touch</span>
            <span className="short-contact">Contact</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link className="admin-icon" aria-label="Admin workspace" to="/admin">
            <LockKeyhole size={16} />
          </Link>
          <button
            ref={toggle}
            type="button"
            className="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="wrap footer-in">
        <Link to="/">
          <Logo />
        </Link>
        <div className="foot-links">
          <a
            href="https://www.facebook.com/gclsmotorsports/"
            target="_blank"
            rel="noreferrer"
          >
            Facebook <ArrowUpRight />
          </a>
          <a
            href="https://www.instagram.com/lsmotorsportsaustralia/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram <ArrowUpRight />
          </a>
          <Link to="/admin">
            Admin <LockKeyhole />
          </Link>
        </div>
      </div>
      <div className="wrap footer-base">
        <span>L & S Motorsports Services and Consulting</span>
        <span>ABN 11 320 484 631</span>
      </div>
    </footer>
  );
}
export function Message({ error, children }) {
  return (
    <p
      className={error ? "message error" : "message"}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Action({ to, children, secondary = false }) {
  return (
    <Link className={secondary ? "button secondary" : "button"} to={to}>
      {children}
      <ArrowRight size={18} />
    </Link>
  );
}
export function Status({ value }) {
  return (
    <span className={"status s-" + value.toLowerCase()}>
      <i />
      {value}
    </span>
  );
}
