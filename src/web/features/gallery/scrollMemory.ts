import { useEffect, useLayoutEffect } from "react";
import { type GalleryView, viewKey } from "./galleryView";
import { resetLastView } from "./useGalleryView";

/** Where the Owner left each view (by view key); kept for the page's lifetime. A view never shown starts at 0. */
const savedScroll = new Map<string, number>();

/** Test-only: forget the saved positions so one test's scroll does not leak into the next. */
export function resetGalleryScroll() {
  savedScroll.clear();
  resetLastView();
}

/**
 * Keeps the position current while the view is on screen (at unmount the next page may already have replaced it and
 * the browser clamped scrollY) and restores it once the view's data is ready.
 */
export function useSavedScroll(view: GalleryView, ready: boolean) {
  const scrollKey = JSON.stringify(viewKey(view));
  useEffect(() => {
    const onScroll = () => {
      savedScroll.set(scrollKey, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollKey]);
  useLayoutEffect(() => {
    if (!ready) return;
    const y = savedScroll.get(scrollKey) ?? 0;
    if (y > 0 || window.scrollY > 0) window.scrollTo(0, y);
  }, [ready, scrollKey]);
}
