---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — gallery-grid

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) steps 11–14; the shipped gallery ([`text-to-image-openrouter`](../text-to-image-openrouter/spec.md), [`curate-gallery`](../curate-gallery/spec.md) §6, [`app-shell`](../app-shell/spec.md) ADR-0025) and its code (`src/web/features/gallery/Gallery.tsx`).

## 1. Context

The gallery already lists every generation newest first, a page at a time, as cards with a preview, the prompt, tags and the model. What the Owner can't see without opening each generation is what it cost, how long it took and what size the picture is — the three numbers they compare most when trying models (steps 7, 9, 10). Paging is a «Load more» button at the bottom, so browsing a long history is a series of clicks.

There is no external trigger: the Owner asked for it in the V2 round (roadmap step 11). Steps 12–14 build on this grid — the detail modal steps through its order, the model and prompt views filter and group it — so the grid's order and paging become a shared contract.

Committed approach: keep the newest-first gallery paged by generation (each page continues after the last generation shown), and put three badges over each card's preview — the recorded cost (with its status: «cost pending», «cost unavailable», never $0 for an unknown cost), the duration and the output image size — plus the number of images when a generation has several. The next page loads by itself as the Owner scrolls near the end of the grid; «Load more» stays as a fallback. The rest of the card is unchanged.

- Failure modes weighed before the AC (devil's-advocate pass): a failed next page or refresh wiping the grid, refresh cost growing with scroll depth, losing the place after opening a card, badges misstating partial or mixed-size results, duplicated cost wording, and badges covering small previews — each is answered by an AC or an NFR row.

## 2. Goals

- The Owner compares cost, duration and image size across generations at a glance, without opening them.
- Browsing a long history is scrolling, not clicking.
- The grid's order and paging are stable enough for the detail modal and the model / prompt views to build on.

## 3. Non-goals

- Filtering or grouping the grid — steps 13 and 14.
- Opening a generation as a modal — step 12; the card still opens the detail page.
- Changing how cost, duration or images are recorded — steps 2 and 4 own that.
- Choosing the page size or a denser/sparser grid — the grid adapts to the window width as today.

## 4. User stories

### US-01: See cost, duration and size on each card

**As an** Owner
**I want** each gallery card to show the generation's cost, duration and image size over its preview
**So that** I can compare generations without opening them

### US-02: Browse by scrolling

**As an** Owner
**I want** the next page of the gallery to load as I scroll near the end
**So that** I can browse my whole history without clicking «Load more»

### US-03: Keep the grid trustworthy

**As an** Owner
**I want** the grid to stay complete, in order and without duplicates while I browse and generate
**So that** what I see is exactly my generations, newest first

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the gallery shows a generation with a known cost
**When** the Owner looks at its card
**Then** the preview carries three badges: the cost («$0.04»), the duration («12.4 s», or «850 ms» under a second) and the output image size («1024×1024»), plus «4 images» when the generation has more than one output image («2 of 4 images» when the provider returned fewer than asked); the badges sit on one line along the bottom of the preview, on an opaque background, and never cover more than its bottom quarter; the prompt, tags, comment marker, model and time stay below the preview as before, without repeating the cost status there

### AC-02 (US-01) — domain invariant

**Given** a generation's cost is pending or unavailable
**When** its card is shown
**Then** the cost badge says «cost pending» or «cost unavailable» — never $0 — and a pending cost changes to the recorded amount on the card once it is known, without a reload

### AC-03 (US-01) — domain invariant

**Given** a generation's output images have different sizes
**When** its card is shown
**Then** the size badge shows the size of the image the preview shows (the first output) — the badge never claims a size the preview doesn't have

### AC-04 (US-02) — happy path

**Given** the gallery holds more generations than one page
**When** the Owner scrolls near the end of the loaded cards
**Then** the next page loads by itself and its cards appear after the loaded ones, newest first; «Load more» stays available as a button, and «That's everything» shows once the oldest generation is loaded

### AC-05 (US-02) — error

**Given** loading the next page fails
**When** the Owner reaches the end of the loaded cards
**Then** the loaded cards stay, a plain message under them says the next page couldn't be loaded with a way to try again, and the grid does not keep retrying by itself; likewise, when refreshing already loaded cards fails, they stay on screen with a short note that they may be out of date

### AC-06 (US-03) — domain invariant

**Given** the Owner generates, deletes or re-runs while pages are loaded
**When** the gallery updates
**Then** every generation appears exactly once, newest first — no card is duplicated or skipped at a page boundary — and a deleted generation's card disappears

### AC-07 (US-03) — cross-context

**Given** the ten latest generations are also shown next to the generate form (app-shell, recent generations)
**When** the Owner scrolls the gallery or the gallery loads more pages
**Then** the recent strip still shows exactly the ten latest generations, and a new generation appears first in both; refreshing a pending cost on a gallery card makes no request for the recent strip, which still refreshes only when a generation finishes, is deleted or is curated (app-shell)

### AC-08 (US-02) — cross-context

**Given** the Owner opens a generation from the grid and comes back to the gallery
**When** the gallery is shown again
**Then** the pages loaded before are still there, scrolled to where the Owner left, without loading a further page by itself; pages that didn't change are not loaded again, and if the Owner changed something meanwhile (tags, comment, deletion, a re-run) the loaded pages refresh as in AC-06 and the scroll position is kept

### AC-09 (US-01) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo for the gallery
**Then** Ukiyo refuses, like every other Ukiyo request

### AC-10 (US-01) — error

**Given** a card's preview image can't be shown
**When** the card is shown
**Then** it says «Image unavailable» in place of the picture and still shows the cost, duration and size badges

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Gallery page with the new fields | any page (first or continued) of 24 items, 1 000 generations, each with 10 tags and a comment ≤ 300 ms p95 server time (curate-gallery §6, unchanged) | existing `nfr` test, extended to a continued page and the new fields |
| Next page requests while scrolling | ≤ 1 request per page; none while one is in flight or after the last page | component test with a controllable scroll trigger |
| Keeping loaded cards current | a pending cost is refreshed by asking only for the generations still pending — not every loaded page — at most every 10 s; other refreshes cost ≤ 1 request per loaded page | component test counting list/detail requests with 5 pages loaded |
| Badges readable over any preview | text contrast ≥ 4.5:1 against the badge background in light and dark themes | contrast of the badge foreground/background tokens computed in a unit test for both themes (like `theme-tokens.test.ts`), plus a manual check at ship |

## 6.1 Security / privacy

- **Data classification:** internal — the Owner's own generations.
- **Personal data touched:** none new (duration and image size are already stored).
- **AuthZ/AuthN impact:** no new boundary; the gallery read stays behind the request guard (ADR-0007).
- **Abuse cases:**
  - A foreign page reads the gallery: refused (AC-09).
  - Scrolling triggers a request storm: one request per page, none in flight twice (§6).
- **Security review:** N/A — read-only, no new data.

## 7. Metrics / KPIs

- **Generations opened only to read cost/duration/size** — baseline: every comparison needs opening, target: 0 — the three numbers are on every card (owner check, 2 weeks).
- **«Load more» clicks per session** — baseline: one per page, target: ≈ 0 (pages load while scrolling).
- **Duplicate or missing cards at page boundaries** — baseline: n/a, target: 0.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->
