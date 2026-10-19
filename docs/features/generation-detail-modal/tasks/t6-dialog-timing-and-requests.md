---
id: T6
title: "Prove the dialog's timing, request counts and preloads"
layer: "tests"
deps: ["T5"]
blocks: []
acs: ["AC-01", "AC-11"]
files_hint: ["src/web/features/gallery/GenerationDialog.nfr.test.tsx", "src/web/features/gallery/GenerationDialog.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T6 — Prove the dialog's timing, request counts and preloads

## Place in the sequence

- **Blocked by:** T5 — Delete from the dialog and move to a neighbour · **Blocks:** — · **Wave:** 5 — after the dialog.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a card I open from the gallery to show the generation in a dialog over the grid, images on the left and metadata on the right
> **So that** I look at the result without losing the grid
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task measures the spec's §6 rows for the dialog.

## Inlined context

> Dialog shows a generation of the loaded grid | ≤ 100 ms p95 from open/step to the dialog rendering the large image element and the metadata, for an already read generation; a generation not read yet costs exactly one detail read, with «Loading…» in the metadata column meanwhile | component timing test (serial `nfr-web`) + a manual check at ship (jsdom has no paint timing)
>
> — `spec.md §6, row 1, verbatim` · full text: [spec.md](../spec.md)

> Stepping requests | ≤ 1 detail read per generation shown, none for a generation already read this session; the grid's next page ≤ 1 request … Edits inside the dialog | a comment or tag change costs ≤ 1 detail read and 0 list-page reads … after a step, at most 2 images are preloaded — the first output of the newer and of the older neighbour — and only among loaded generations (never a page load for a preload)
>
> — `spec.md §6, rows 2–4, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — counts calls to the mocked api; AC-11's refusal stays covered by the server's request-guard integration tests (unchanged, run in the gate).

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner is on the gallery grid
> **When** the Owner opens a card
> **Then** a dialog over the grid shows that generation — its output images on the left (the first one large, the others as smaller choices that make themselves large when picked) and on the right its prompt, model, parameters, cost with status, duration, created time, inputs, lineage, comment and tags, and its actions; the address becomes the generation's own; on a narrow window the images come first and the metadata below
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-11 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for a generation
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] timing test (20 steps, cached details) p95 ≤ 100 ms — `GenerationDialog.nfr.test.tsx` (nfr-web)
- [ ] request-count tests: one detail read per new generation, none on revisit, ≤ 1 next page, 0 list reads per edit; preload ≤ 2 images, none beyond loaded — `GenerationDialog.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| revisit a generation | 0 detail reads |
| last loaded | no preload past it |

## Definition of Done

- [ ] nfr-web and component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
