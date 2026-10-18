---
id: T1
title: "Carry the duration in the gallery list summary"
layer: "ports"
deps: []
blocks: ["T3"]
acs: ["AC-01", "AC-09"]
files_hint: ["src/shared/generations.ts", "src/server/modules/generations/repo.ts", "src/server/modules/generations/routes.int.test.ts", "src/server/modules/generations/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Carry the duration in the gallery list summary

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Show the badge strip over each card's preview · **Wave:** 1 — no deps.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each gallery card to show the generation's cost, duration and image size over its preview
> **So that** I can compare generations without opening them
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task makes the list carry the one number the cards need and don't have yet.

## Inlined context

> **The summary carries `durationMs`** (inline — additive field): the list read adds `g.duration_ms`; the thumbnail already carries the first output's `width`/`height`; `imagesRequested` / `imagesReceived` give the count badge.
>
> — `sad.md §4, item 3, verbatim` · full text: [sad.md](../sad.md)

> Gallery page with the new fields | any page (first or continued) of 24 items, 1 000 generations, each with 10 tags and a comment ≤ 300 ms p95 server time (curate-gallery §6, unchanged) | existing `nfr` test, extended to a continued page and the new fields
>
> — `spec.md §6, row 1, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads `generations.duration_ms` (existing, NOT NULL ≥ 0) — no schema change.

## API contract

- `GET /api/generations?cursor=&limit=` → `GenerationPage`; each item gains `durationMs` (integer ≥ 0).

— `contracts/openapi.yaml, listGenerations, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the gallery shows a generation with a known cost
> **When** the Owner looks at its card
> **Then** the preview carries three badges: the cost («$0.04»), the duration («12.4 s», or «850 ms» under a second) and the output image size («1024×1024»), plus «4 images» when the generation has more than one output image («2 of 4 images» when the provider returned fewer than asked); the badges sit on one line along the bottom of the preview, on an opaque background, and never cover more than its bottom quarter; the prompt, tags, comment marker, model and time stay below the preview as before, without repeating the cost status there
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for the gallery
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `durationMs` in `GenerationSummary` — `src/shared/generations.ts`
- [ ] select `g.duration_ms` in the summary columns, map it — `repo.ts`
- [ ] integration test: list items carry `durationMs`; foreign page still refused — `routes.int.test.ts`
- [ ] nfr: a continued page (cursor) ≤ 300 ms p95 with the seed — `nfr.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| duration under a second | value kept in ms |
| continued page | same fields |

## Definition of Done

- [ ] integration + nfr tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
