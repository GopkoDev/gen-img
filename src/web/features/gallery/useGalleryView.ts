import { useRef } from "react";
import { useRoute } from "@/lib/router";
import { type GalleryView, parseView } from "./galleryView";

/**
 * The view named by the gallery's address. A generation's dialog sits on its own address (no view in it) over the
 * grid, so while it is open the view the Owner left stays (ADR-0033).
 */
export function useGalleryView(): GalleryView {
  const route = useRoute();
  const last = useRef<GalleryView>({ kind: "all" });
  if (route.name === "page") last.current = parseView(route.search);
  return last.current;
}
