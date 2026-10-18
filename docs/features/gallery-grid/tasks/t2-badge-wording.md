---
id: T2
title: "Word the cost, size and count badges"
layer: "domain"
deps: []
blocks: ["T3"]
acs: ["AC-01", "AC-02", "AC-03"]
files_hint: ["src/web/lib/format.ts", "src/web/lib/format.test.ts", "src/web/theme-tokens.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Word the cost, size and count badges

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Show the badge strip over each card's preview · **Wave:** 1 — pure.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each gallery card to show the generation's cost, duration and image size over its preview
> **So that** I can compare generations without opening them
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task fixes the exact words the badges say.

## Inlined context

> known → `formatCost` («$0.04»); pending → «cost pending»; unavailable → «cost unavailable»; never `$0` for an unknown cost
>
> — `sad.md §8, Cost badge, verbatim` · full text: [sad.md](../sad.md)

> first output `width×height` (× = U+00D7); count only when `imagesReceived > 1` → «N images», or when `imagesReceived < imagesRequested` → «R of Q images»
>
> — `sad.md §8, Size / count badges, verbatim` · full text: [sad.md](../sad.md)

> text contrast ≥ 4.5:1 against the badge background in light and dark themes | contrast of the badge foreground/background tokens computed in a unit test for both themes (like `theme-tokens.test.ts`), plus a manual check at ship
>
> — `spec.md §6, row 4, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

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

## Checklist

- [ ] `formatCostBadge`, `formatSize`, `formatCount` — `format.ts` + `format.test.ts`
- [ ] contrast assertion for the badge tokens (foreground on background) in both themes — `theme-tokens.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| known cost 0 | «$0.00» (known) |
| received 1 of 1 | no count |
| received 2 of 4 | «2 of 4 images» |
| received 4 of 4 | «4 images» |

## Definition of Done

- [ ] unit tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
