import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from "react";

// Two routes, History API only (ADR-0009). The server falls back to index.html for both.
export type Route = { name: "home" } | { name: "detail"; id: string };

const NAV_EVENT = "gen-img:navigate";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

export function parseRoute(pathname: string): Route {
  const m = /^\/generations\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ? { name: "detail", id: decodeURIComponent(m[1]) } : { name: "home" };
}

export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname);
  return parseRoute(pathname);
}

export function navigate(path: string) {
  window.history.pushState(null, "", path);
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
