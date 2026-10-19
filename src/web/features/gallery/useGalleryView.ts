import { useRef } from "react";
import { isDialogVisit, useRoute } from "@/lib/router";
import { dialogViews, type GalleryView, parseView } from "./galleryView";

/**
 * The view the gallery shows: the one named by its address; behind a dialog (an address of its own) the `grid` view
 * the dialog was opened from, else the last view seen (ADR-0033, sad §8).
 */
export function useGalleryView(): GalleryView {
  const route = useRoute();
  const last = useRef<GalleryView>({ kind: "all" });
  if (route.name === "page") last.current = parseView(route.search);
  else if (isDialogVisit(route)) last.current = dialogViews(route.state).grid ?? last.current;
  return last.current;
}

/** The list a dialog steps through; All when the state names none. */
export function useOrderView(): { grid: GalleryView; order: GalleryView } {
  const route = useRoute();
  const grid = useGalleryView();
  const order = dialogViews(route.state).order ?? grid;
  return { grid, order };
}
