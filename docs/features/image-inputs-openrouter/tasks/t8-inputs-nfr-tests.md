---
id: T8
title: "Verify the input-image NFRs"
layer: "tests"
deps: ["T5"]
blocks: []
acs: ["AC-06", "AC-07"]
files_hint: ["src/server/nfr-inputs.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T8 — Verify the input-image NFRs

## Place in the sequence

- **Blocked by:** T5 — Accept multipart starts with input images and expose inputs in the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my input images to be sent only to the provider I chose and stored only as part of the generation
> **So that** my private pictures don't leak and don't pile up as stray files
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: verify the input-image NFRs.

## Inlined context

> | Local overhead with inputs (excluding provider time) | ≤ 1 000 ms p95 for 4 input images of 10 MB + 4 output images of 5 MB | integration test with a stubbed provider |
> | Raw request size in metadata | 0 bytes of embedded input image data in the stored raw request | … |
>
> — `spec.md §6, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Exercises `startGeneration`, `getGeneration`, `getFile` via `app.request()`.

## Acceptance criteria

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

## Checklist

- [ ] Timed runs with a stubbed provider
- [ ] Seeded detail timing
- [ ] Raw-request scan

## Edge cases

| Case | Behaviour |
|---|---|
| restart with leftover staging input files | swept like outputs |

## Definition of Done

- [ ] NFR tests pass: local overhead ≤ 1 000 ms p95 for 4 × 10 MB inputs + 4 × 5 MB outputs (stubbed provider); detail with inputs ≤ 150 ms p95; stored raw request holds 0 bytes of input data; unrecorded input path → 404
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
