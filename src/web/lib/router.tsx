import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from "react";

// History API only (ADR-0009). A generation's address is the detail route; every other path is a page path
// that the section registry matches (ADR-0022). The server falls back to index.html for all of them.
export type Route = { name: "detail"; id: string } | { name: "page"; pathname: string; search: string };

const NAV_EVENT = "gen-img:navigate";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

export function parseRoute(pathname: string, search = ""): Route {
  const m = /^\/generations\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ? { name: "detail", id: decodeURIComponent(m[1]) } : { name: "page", pathname, search };
}

export function useRoute(): Route {
  // One string snapshot, so the store compares by value.
  const address = useSyncExternalStore(subscribe, () => window.location.pathname + window.location.search);
  const at = address.indexOf("?");
  return at < 0 ? parseRoute(address) : parseRoute(address.slice(0, at), address.slice(at));
}

export function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** Swaps the address without a history entry — e.g. dropping a carried flag once applied (ADR-0023). */
export function replace(path: string) {
  window.history.replaceState(null, "", path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function Link({ to, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...props} />;
}
