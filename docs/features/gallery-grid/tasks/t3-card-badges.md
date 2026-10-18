---
id: T3
title: "Show the badge strip over each card's preview"
layer: "ui"
deps: ["T1", "T2"]
blocks: ["T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-10"]
files_hint: ["src/web/features/gallery/CardBadges.tsx", "src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/Gallery.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Show the badge strip over each card's preview

## Place in the sequence

- **Blocked by:** T1 — Carry the duration in the gallery list summary, T2 — Word the cost, size and count badges · **Blocks:** T4 — Load pages as the Owner scrolls and keep the place on return · **Wave:** 2 — needs the field and the wording.
- **Lane:** shares `Gallery.tsx` with T4, T5 — serialized.

## Why (user story)

> **As an** Owner
> **I want** each gallery card to show the generation's cost, duration and image size over its preview
> **So that** I can compare generations without opening them
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task puts cost, duration, size and count where the Owner looks — over the preview.

## Inlined context

> one `CardBadges` row absolutely positioned along the bottom of the preview, opaque `bg-background/90` + `text-foreground`, `Badge` primitives, single line with overflow hidden; the footer's duplicate «cost pending» badge is removed
>
> — `sad.md §4, item 5, verbatim` · full text: [sad.md](../sad.md)

> SCR-02 default · cost pending · cost unavailable · partial result «2 of 4 images» · image unavailable (strip still shown)
>
> — `screens.md SCR-02, state table, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Reads `GenerationSummary` fields `costMicros`, `costStatus`, `durationMs`, `thumbnail.width/height`, `imagesRequested`, `imagesReceived`.

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the gallery shows a generation with a known cost
> **When** the Owner looks at its card
> **Then** the preview carries three badges: the cost («$0.04»), the duration («12.4 s», or «850 ms» under a second) and the output image size («1024×1024»), plus «4 images» when the generation has more than one output image («2 of 4 images» when the provider returned fewer than asked); the badges sit on one line along the bottom of the preview, on an opaque background, and never cover more than its bottom quarter; the prompt, tags, comment marker, model and time stay below the preview as before, without repeating the cost status there
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-01) — domain invariant

> **Given** a generation's cost is pending or unavailable
> **When** its card is shown
> **Then** the cost badge says «cost pending» or «cost unavailable» — never $0 — and a pending cost changes to the recorded amount on the card once it is known, without a reload
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-01) — domain invariant

> **Given** a generation's output images have different sizes
> **When** its card is shown
> **Then** the size badge shows the size of the image the preview shows (the first output) — the badge never claims a size the preview doesn't have
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-01) — error

> **Given** a card's preview image can't be shown
> **When** the card is shown
> **Then** it says «Image unavailable» in place of the picture and still shows the cost, duration and size badges
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `CardBadges` — `CardBadges.tsx`
- [ ] use it in the tile; remove the footer «cost pending» badge; keep the strip with «Image unavailable» — `Gallery.tsx`
- [ ] component tests per state — `Gallery.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| preview fails | «Image unavailable» + strip |
| one output | no count badge |

## Definition of Done

- [ ] component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
