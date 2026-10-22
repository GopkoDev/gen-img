---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 11"
---

# 0032 — Load the next gallery page from an end-of-grid sentinel and restore the scroll position per visit

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The gallery should load the next page as the end comes near (AC-04) and, when the Owner comes back from a generation's page, show the same pages at the same place without loading more (AC-08). The gallery page unmounts when a detail page shows (only Generate stays mounted, ADR-0023), and the window scroll is shared by all pages. Steps 12–14 will build on the same grid.

## Decision drivers

- Spec AC-04 / §6: ≤ 1 request per page, none in flight twice, none after the last page; no automatic retry after a failure (AC-05).
- Spec AC-08: same pages, same scroll position, no extra load on return.
- Keep the router and the section registry as they are (ADR-0009, ADR-0022).

## Considered options

1. **An invisible sentinel after the last card, watched by an IntersectionObserver with a margin; it asks for the next page only when `hasNextPage && !isFetchingNextPage && !isFetchNextPageError` (the existing «Load more» button calls the same guarded function). The gallery saves `window.scrollY` when it unmounts (module-level, per session) and restores it in a layout effect once the cached pages have rendered; the sentinel is armed only after the restore.**
2. **Keep the Gallery section mounted (like Generate) and hide it** — the loaded DOM survives, but the shared window scroll still changes with the detail page, and a hidden grid keeps its images and observers alive.
3. **A scroll listener measuring the distance to the bottom** — the same effect with more code, and it fires on every scroll event.

## Decision outcome

**Chosen:** Option 1. The sentinel is the smallest correct trigger, its guards make double or post-end requests impossible, and arming it only after the restore is what keeps a return from loading another page. Option 2 doesn't solve the shared scroll and costs memory; option 3 is option 1 done by hand.

## Consequences

**Positive**
- Paging and restore live in the gallery; steps 13–14 reuse them for their views.

**Negative**
- Until the cached pages have their height, the browser clamps the scroll; the restore runs before paint once they render, so the Owner never sees the detail page's offset applied to the grid.

**Neutral**
- Tests use the IntersectionObserver double added in step 10 (`tests/helpers/intersection.ts`).

## Links

- Spec: [[../spec.md]] AC-04, AC-05, AC-08
- SAD: [[../sad.md]] §4
- Related ADR: ADR-0023 (Generate stays mounted), ADR-0025
