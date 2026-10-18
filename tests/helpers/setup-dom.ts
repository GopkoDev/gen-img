import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installIntersectionObserver, resetIntersections } from "./intersection";

afterEach(() => {
  cleanup();
  resetIntersections();
});

// Radix primitives (Select) use pointer capture and scrollIntoView, which jsdom lacks.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

// Attachment thumbnails use object URLs, which jsdom doesn't implement.
if (typeof URL.createObjectURL !== "function") {
  let n = 0;
  URL.createObjectURL = () => `blob:test/${++n}`;
  URL.revokeObjectURL = () => {};
}

// The sidebar block reads the viewport through matchMedia (narrow → sheet), which jsdom lacks; tests resize via
// window.innerWidth and dispatch "resize" — the listener set below fires on it.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => {
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = () => (max ? window.innerWidth <= Number(max[1]) : false);
    const listeners = new Set<() => void>();
    const mql = {
      media: query,
      get matches() {
        return matches();
      },
      onchange: null,
      addEventListener: (_: string, l: () => void) => {
        listeners.add(l);
        window.addEventListener("resize", l);
      },
      removeEventListener: (_: string, l: () => void) => {
        listeners.delete(l);
        window.removeEventListener("resize", l);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
    return mql as unknown as MediaQueryList;
  };
}

// Radix popper content (Tooltip) measures itself with ResizeObserver, which jsdom lacks.
if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// The Models page loads prices only for rows in view (IntersectionObserver). The double reports nothing
// intersecting until a test calls intersect()/intersectAll() — see tests/helpers/intersection.ts.
installIntersectionObserver();
