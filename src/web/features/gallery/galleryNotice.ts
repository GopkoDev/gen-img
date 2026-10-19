import { useSyncExternalStore } from "react";

/**
 * A one-off «Generation deleted.» for the mounted grid: the dialog hands it over when it closes after a delete.
 * (The full page still uses the `?deleted` flag on the grid's address.)
 */
let shown = false;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export function showGalleryNotice() {
  shown = true;
  emit();
}

export function clearGalleryNotice() {
  if (!shown) return;
  shown = false;
  emit();
}

export function useGalleryNotice(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => shown,
  );
}
