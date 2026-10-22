/** The grid's place when the dialog closes (sad §8, Close → place). */
const SCROLL_QUIET_MS = 500;
const lastScroll = { at: Number.NEGATIVE_INFINITY };

/**
 * Brings the grid card of `id` into view (nearest) only when it is outside the viewport, and stamps the time so the
 * grid's sentinel can ignore the scroll events this causes.
 */
export function bringCardIntoView(id: string) {
  const card = document.querySelector<HTMLElement>(`[data-generation-id="${CSS.escape(id)}"]`);
  if (!card) return;
  const r = card.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= window.innerHeight) return;
  lastScroll.at = Date.now();
  card.scrollIntoView({ block: "nearest" });
}

/** True when a scroll event is the Owner's own, not an echo of `bringCardIntoView`. */
export function isOwnScroll(): boolean {
  return Date.now() - lastScroll.at > SCROLL_QUIET_MS;
}
