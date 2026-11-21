import React, { createContext, useContext } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";

// The background page keeps its own URL while a reel is open over it.
export const DisplayPath = createContext(null);
const base = "http://showroom.local";
function parts(path) {
  const url = new URL(path, base);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    key: path,
  };
}
export function useLocation() {
  const router = useRouter();
  const display = useContext(DisplayPath);
  const path = display || router.asPath;
  const location = parts(path);
  const origin = router.query._origin;
  if (!display && typeof origin === "string")
    location.state = { backgroundLocation: parts(origin) };
  else if (router.query._saved === "1") location.state = { saved: true };
  return location;
}
function internalHref(path, state) {
  const origin = state?.backgroundLocation;
  if (!origin && !state?.saved) return path;
  const url = new URL(path, base);
  if (origin)
    url.searchParams.set(
      "_origin",
      origin.pathname + origin.search + origin.hash,
    );
  if (state?.saved) url.searchParams.set("_saved", "1");
  return url.pathname + url.search + url.hash;
}
export function Link({ to, state, children, ...props }) {
  const isFilm = to.startsWith("/journal?film=");
  return (
    <NextLink
      href={internalHref(to, state)}
      as={to}
      prefetch={false}
      scroll={isFilm ? false : undefined}
      {...props}
    >
      {children}
    </NextLink>
  );
}
export function NavLink({ to, end = false, className, ...props }) {
  const { pathname } = useLocation();
  const active = pathname === to || (!end && pathname.startsWith(to + "/"));
  return (
    <Link
      to={to}
      className={
        [className, active && "active"].filter(Boolean).join(" ") || undefined
      }
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}
export function useNavigate() {
  const router = useRouter();
  return (to, options = {}) => {
    if (to === -1) return router.back();
    const method = options.replace ? "replace" : "push";
    return router[method](internalHref(to, options.state), to, {
      scroll: !options.preventScrollReset,
    });
  };
}
export function useSearchParams() {
  const router = useRouter();
  const { pathname, search } = useLocation();
  return [
    new URLSearchParams(search),
    (input, options = {}) => {
      const query = new URLSearchParams(input).toString();
      const path = pathname + (query ? "?" + query : "");
      return router[options.replace ? "replace" : "push"](
        internalHref(path, options.state),
        path,
        { shallow: true, scroll: !options.preventScrollReset },
      );
    },
  ];
}
