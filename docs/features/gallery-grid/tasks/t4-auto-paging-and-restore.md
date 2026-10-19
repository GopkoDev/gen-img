---
id: T4
title: "Load pages as the Owner scrolls and keep the place on return"
layer: "ui"
deps: ["T3"]
blocks: ["T5"]
acs: ["AC-04", "AC-05", "AC-06", "AC-08"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/Gallery.test.tsx", "src/web/features/gallery/Paging.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Load pages as the Owner scrolls and keep the place on return

## Place in the sequence

- **Blocked by:** T3 — Show the badge strip over each card's preview · **Blocks:** T5 — Refresh a pending cost per card instead of the whole gallery · **Wave:** 3 — same file as T3.
- **Lane:** shares `Gallery.tsx` — serialized.

## Why (user story)

> **As an** Owner
> **I want** the next page of the gallery to load as I scroll near the end
> **So that** I can browse my whole history without clicking «Load more»
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** the grid to stay complete, in order and without duplicates while I browse and generate
> **So that** what I see is exactly my generations, newest first
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task turns «Load more» clicks into scrolling, without ever losing or duplicating cards.

## Inlined context

> an IntersectionObserver on an end-of-grid sentinel requests the next page only when `hasNextPage && !isFetchingNextPage && !isFetchNextPageError`; the existing «Load more» button stays (disabled while `isFetchingNextPage`, hidden when `!hasNextPage`); `scrollY` saved on unmount and restored in a layout effect once the cached pages render, before the sentinel is armed
>
> — `sad.md §4, item 2, verbatim` · full text: [sad.md](../sad.md)

> `isError && data` renders the loaded cards plus an inline message — «Couldn't load more.» + Try again after a failed next page (`isFetchNextPageError`), «These cards may be out of date.» after a failed refresh; only `isError && !data` shows the full-page error.
>
> — `sad.md §4, item 4, verbatim` · full text: [sad.md](../sad.md)

> Next page requests while scrolling | ≤ 1 request per page; none while one is in flight or after the last page | component test with a controllable scroll trigger
>
> — `spec.md §6, row 2, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations?cursor=<last id>` per page; `nextCursor: null` at the end.

## Acceptance criteria

### AC-04 (US-02) — happy path

> **Given** the gallery holds more generations than one page
> **When** the Owner scrolls near the end of the loaded cards
> **Then** the next page loads by itself and its cards appear after the loaded ones, newest first; «Load more» stays available as a button, and «That's everything» shows once the oldest generation is loaded
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-02) — error

> **Given** loading the next page fails
> **When** the Owner reaches the end of the loaded cards
> **Then** the loaded cards stay, a plain message under them says the next page couldn't be loaded with a way to try again, and the grid does not keep retrying by itself; likewise, when refreshing already loaded cards fails, they stay on screen with a short note that they may be out of date
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-03) — domain invariant

> **Given** the Owner generates, deletes or re-runs while pages are loaded
> **When** the gallery updates
> **Then** every generation appears exactly once, newest first — no card is duplicated or skipped at a page boundary — and a deleted generation's card disappears
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-02) — cross-context

> **Given** the Owner opens a generation from the grid and comes back to the gallery
> **When** the gallery is shown again
> **Then** the pages loaded before are still there, scrolled to where the Owner left, without loading a further page by itself; pages that didn't change are not loaded again, and if the Owner changed something meanwhile (tags, comment, deletion, a re-run) the loaded pages refresh as in AC-06 and the scroll position is kept
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] sentinel + guarded `fetchNextPage`, «Load more», «That's everything», «Loading more…» — `Gallery.tsx`
- [ ] inline errors with data (next page / refresh) — `Gallery.tsx`
- [ ] scroll save on unmount + layout-effect restore before arming — `Gallery.tsx`
- [ ] tests with `tests/helpers/intersection.ts`: one request per page, none in flight twice, none after the end, no retry after failure, Try again, refresh failure keeps cards, return from detail restores scroll without a request, no duplicates at a page boundary after a new generation — `Paging.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| sentinel visible while fetching | no second request |
| page fails | «Couldn't load more.», no auto retry |
| return from detail | same pages, scroll restored, no request |
| new generation while 2 pages loaded | prefix invalidation; each card once |

## Definition of Done

- [ ] paging tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
