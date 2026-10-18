---
id: T4
title: "Stage and record input copies with the generation"
layer: "infra"
deps: ["T1"]
blocks: ["T5"]
acs: ["AC-01", "AC-06", "AC-07", "AC-10"]
files_hint: ["src/server/modules/storage/file-store.ts", "src/server/modules/storage/file-store.int.test.ts", "src/server/modules/generations/repo.ts", "src/server/modules/generations/repo.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T4 — Stage and record input copies with the generation

## Place in the sequence

- **Blocked by:** T1 — Promote the generation_inputs migration · **Blocks:** T5 — Accept multipart starts with input images and expose inputs in the API.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** the detail view (and a hint in the gallery) to show the input images a generation was made from, in order
> **So that** I know exactly what produced the result and can reuse it later
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: stage and record input copies with the generation.

## Inlined context

> Separate `generation_inputs` table — same columns as `generation_images` (+ `original_name`), its own PK `(generation_id, position)`, unique `path`; written in the same transaction.
>
> — `adr/0011, option 1, verbatim` · full text: [ADR-0011](../adr/0011-store-input-copies-in-a-separate-generation-inputs-table.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_inputs.*` (generation_id, position, path, media_type, width, height, byte_size, original_name) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; UNIQUE path; media_type IN png/jpeg/webp/gif; byte_size 1…10 485 760 | read + write |

— `data-model.md §Entities, generation_inputs, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has chosen a model that accepts input images and attached two supported images
> **When** the Owner writes a prompt and generates
> **Then** the generation is saved with copies of both input images, and its detail view shows the inputs in the order they were attached (no reordering in this slice — remove and re-attach to change it) next to the outputs; after success the attachments and the prompt stay in the form so the Owner can iterate, until the Owner removes them
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** a generation with input images succeeds at the provider but storing its files fails part-way
> **When** the save is attempted
> **Then** the invariant «a generation is saved only together with all its output images and copies of all its input images» holds: neither the generation nor any input copy remains, and the Owner is told why
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — authorization

> **Given** generations with input images are stored
> **When** anyone asks gen-img for an input-image file that is not recorded as an input of a stored generation, or a foreign page asks for a recorded one
> **Then** the system reveals nothing — only gen-img's own pages get stored input images, and the stored raw request contains references to the stored copies, never the image data itself
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — happy path

> **Given** some generations were made with input images
> **When** the Owner browses the gallery
> **Then** those tiles show a small «N inputs» hint, and text-only generations show no such hint
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `file-store.stage(id, outputs, inputs = [])` → `{outputs: paths, inputs: paths}`; input files `input-<n>.<ext>`
- [ ] `repo.insertAtomic(gen, images, commitFiles, inputs = [])`; `get` → `inputs: InputRecord[]`; `listPage` → `inputsCount`; `recordedImage` checks `generation_inputs` too
- [ ] `seedGeneration(..., { inputs: N })` in `tests/helpers/generations.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| commit throws | no generation, image or input rows |
| text-only generation | inputs: [], inputsCount: 0 |

## Definition of Done

- [ ] integration tests: stage writes input-N.* beside output-N.*; insertAtomic writes inputs in the same transaction (rolls back with it); get returns inputs in order; listPage returns inputsCount; recordedImage finds input paths
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
