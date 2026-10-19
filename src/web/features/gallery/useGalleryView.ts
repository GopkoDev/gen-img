import { isDialogVisit, useRoute } from "@/lib/router";
import type { ListView } from "./Gallery";
import { dialogViews, type GalleryView, parseView } from "./galleryView";

const ALL: GalleryView = { kind: "all" };

/** The last view the gallery showed: one source for the Gallery and the dialog, so they never diverge. */
let lastView: GalleryView = ALL;

/** Test-only: forget the last view. */
export function resetLastView() {
  lastView = ALL;
}

/**
 * The view the gallery shows: the one named by its address; behind a dialog (an address of its own) the `grid` view
 * the dialog was opened from, else the last view seen (ADR-0033, sad §8).
 */
export function useGalleryView(): GalleryView {
  const route = useRoute();
  if (route.name === "page") lastView = parseView(route.search);
  else if (isDialogVisit(route)) lastView = dialogViews(route.state).grid ?? lastView;
  return lastView;
}

/** The list a dialog steps through: the state's order, All when it names none or an overview («By model», «By prompt»: no list). */
export function useOrderView(): { grid: GalleryView; order: ListView } {
  const route = useRoute();
  const grid = useGalleryView();
  const order = dialogViews(route.state).order;
  return { grid, order: !order || order.kind === "models" || order.kind === "prompts" ? ALL_LIST : order };
}

const ALL_LIST: ListView = { kind: "all" };
