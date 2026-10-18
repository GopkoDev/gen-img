---
id: T7
title: "Show the inputs hint on tiles and the inputs section on the detail page"
layer: "ui"
deps: ["T5"]
blocks: []
acs: ["AC-01", "AC-10"]
files_hint: ["src/web/features/gallery/"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T7 — Show the inputs hint on tiles and the inputs section on the detail page

## Place in the sequence

- **Blocked by:** T5 — Accept multipart starts with input images and expose inputs in the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** the detail view (and a hint in the gallery) to show the input images a generation was made from, in order
> **So that** I know exactly what produced the result and can reuse it later
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: show the inputs hint on tiles and the inputs section on the detail page.

## Inlined context

> | with inputs | `inputsCount > 0` (AC-10) | Badge outline «N inputs» … | Card «Inputs» above the outputs: thumbnails in attach order …, caption = original file name (or «input N») + W×H |
>
> — `screens.md §SCR-02/SCR-03, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Reads `listGenerations.inputsCount` and `getGeneration.inputs`.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has chosen a model that accepts input images and attached two supported images
> **When** the Owner writes a prompt and generates
> **Then** the generation is saved with copies of both input images, and its detail view shows the inputs in the order they were attached (no reordering in this slice — remove and re-attach to change it) next to the outputs; after success the attachments and the prompt stay in the form so the Owner can iterate, until the Owner removes them
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — happy path

> **Given** some generations were made with input images
> **When** the Owner browses the gallery
> **Then** those tiles show a small «N inputs» hint, and text-only generations show no such hint
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Gallery tile Badge «N inputs» (SCR-02)
- [ ] Detail Inputs card (SCR-03)

## Edge cases

| Case | Behaviour |
|---|---|
| inputsCount 0 | no badge |
| originalName null | caption «input N» |

## Definition of Done

- [ ] web tests: tile shows «N inputs» only when inputsCount > 0; detail shows an Inputs card in attach order with original names and dimensions, none for text-only
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
