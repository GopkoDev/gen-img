# API sync report — gallery-grid (2026-10-19)

Contract: [`openapi.yaml`](./openapi.yaml) — a delta over the shipped list contract. `data-model.md` absent — legal fast-lane skip (no schema change); fields derived from the existing schema (`migrations/0002_create_generations.up.sql`: `duration_ms`, `generation_images.width/height`).

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| GenerationSummary.durationMs | existing schema — `generations.duration_ms` (0002, NOT NULL ≥ 0) | high |
| thumbnail.width / height | existing schema — first `generation_images` row (0002) | high |
| imagesRequested / imagesReceived | shipped summary (step 2) | high |

## Drift checklist

- [x] **endpoint ↔ model:** list reads `generations` + first image; one added column in the select.
- [x] **error-code ↔ repo:** unchanged (VALIDATION_ERROR, FORBIDDEN).
- [x] **validation ↔ constraint:** cursor/limit unchanged.
- [x] **OpenAPI ↔ sequences:** sad §6 «page after the last id» → cursor; «fails» → client inline error; pending card → existing detail read.

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01, AC-03 | listGenerations — costMicros/costStatus, durationMs, thumbnail size, image counts |
| AC-02 | listGenerations + existing getGeneration (pending refresh) |
| AC-04, AC-06 | listGenerations cursor paging, nextCursor null at the end |
| AC-05 | client behaviour on a failed page |
| AC-07, AC-08 | client cache rules (ADR-0025, ADR-0032) |
| AC-09 | 403 (request guard) |
| AC-10 | client image fallback |

No sequence gaps. Async: none.
