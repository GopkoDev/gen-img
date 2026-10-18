---
id: T9
title: "Verify derived generations survive source deletion and the NFRs"
layer: "tests"
deps: ["T5"]
blocks: []
acs: ["AC-07"]
files_hint: ["src/server/modules/generations/lineage-integrity.int.test.ts", "src/server/modules/generations/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T9 — Verify derived generations survive source deletion and the NFRs

## Place in the sequence

- **Blocked by:** T5 — Expose stored-image inputs and lineage through the routes · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** deleting a generation to never be blocked or to change what was made from it
> **So that** curating the gallery stays simple and derived results are safe
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task delivers: verify derived generations survive source deletion and the NFRs.

## Inlined context

> | Starting a generation from stored images (server work before the provider call) | ≤ 300 ms p95 for 8 stored input images of ≤ 10 MB each |
> | Detail view with lineage | ≤ 150 ms p95 with 1 000 generations and 50 derived from the opened one |
> | Derived list size | at most the 50 newest derived generations are listed, with the total count |
> | Durability | 0 generations whose stored input copies are missing after a crash mid-save |
>
> — `spec.md §6, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-07 — domain invariant

> **Given** a derived generation and its source generation
> **When** the Owner deletes the source
> **Then** the deletion goes ahead without asking about derived generations beyond the usual confirmation, the derived generation keeps all its images and input copies, and its lineage shows «source deleted» instead of a link
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Integrity tests (integration project)
- [ ] NFR timings appended to `src/server/modules/generations/nfr.int.test.ts` (the serial `nfr` project collects only files named `nfr.int.test.ts`)

## Edge cases

| Case | Behaviour |
|---|---|
| slow machine | server time only, in-process |

## Definition of Done

- [ ] tests pass: deleting a source leaves the derived generation's images and input copies served and its source exists=false; a failing commit of a derived save leaves no half-saved generation after restart; NFR timings (stored-input start ≤ 300 ms p95, lineage detail ≤ 150 ms p95) in the serial nfr project
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
