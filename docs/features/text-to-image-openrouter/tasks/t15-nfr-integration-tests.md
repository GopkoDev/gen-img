---
id: T15
title: "Verify the performance and durability NFRs"
layer: "tests"
deps: ["T10"]
blocks: []
acs: ["AC-08"]
files_hint: ["tests/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T15 — Verify the performance and durability NFRs

## Place in the sequence

- **Blocked by:** T10 — Expose generations, job and file routes and wire the app · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each successful generation saved on my machine with its output images and full metadata
> **So that** no prompt or result is lost and I can repeat the request later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: verify the performance and durability NFRs.

## Inlined context

> | Gallery first page (24 items) with 1 000 saved generations | ≤ 300 ms p95 server time | integration test over a seeded data dir |
> | Detail view load | ≤ 150 ms p95 server time | integration test over a seeded data dir |
> | Local overhead on a generation (excluding provider time) | ≤ 500 ms p95 for up to 4 output images of ≤ 5 MB each | integration test with a stubbed provider |
> | Raw response size in metadata | 0 bytes of embedded image payload in the stored raw response … |
>
> — `spec.md §6, four rows, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Exercises `listGenerations`, `getGeneration`, `startGeneration` through `app.request()`.

## Acceptance criteria

### AC-08 — domain invariant

> **Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
> **When** the save is attempted
> **Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Seed 1 000 generations with `seedGeneration`, time 20 requests each for page + detail, assert p95
- [ ] Stubbed provider returning 4 × 5 MB PNGs; measure start→saved minus provider time
- [ ] Create `.staging/x` + `generations/orphan/`, rebuild the app, assert both gone and seeded ones intact
- [ ] Assert stored `raw_request`/`raw_response` contain neither the test key nor `b64_json` strings

## Edge cases

| Case | Behaviour |
|---|---|
| slow CI-less laptop | thresholds are server time only, measured in-process |

## Definition of Done

- [ ] NFR integration tests pass: gallery page p95 ≤ 300 ms with 1 000 seeded generations; detail p95 ≤ 150 ms; local overhead p95 ≤ 500 ms for 4 × 5 MB with a stubbed provider; restart with leftover staging/orphan dirs leaves only complete generations; stored raw response has no base64 payload and no key
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
