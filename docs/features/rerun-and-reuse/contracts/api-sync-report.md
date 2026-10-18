# API sync report — rerun-and-reuse (2026-10-18)

Contract: [`openapi.yaml`](./openapi.yaml) — delta over the four shipped contracts; no new paths.

## Field origins

| Operation.field | Origin | Confidence |
|---|---|---|
| startGeneration.source.id / relation / output | data-model `generations.source_id` / `source_relation` / `source_output` | high |
| startGeneration.inputs[].stored.{generationId, kind, position} | data-model: PK `(generation_id, position)` of `generation_images` (output) / `generation_inputs` (input) | high |
| startGeneration.inputs[].upload | ADR-0010 multipart file parts (index) | high |
| getGeneration.source.{id, relation, output} | `generations.source_*` | high |
| getGeneration.source.exists | PK lookup of `source_id` (ADR-0018) | high |
| getGeneration.derived.items[] / total | `generations` by `generations_source` index | high |

## Drift checklist

- [x] endpoint ↔ model: every new field maps to a data-model column or PK.
- [x] error codes ↔ repo: VALIDATION_ERROR, NOT_FOUND, FORBIDDEN, GENERATION_IN_PROGRESS, PROVIDER_NOT_CONFIGURED exist in `src/server/lib/errors.ts` (repo convention UPPER_SNAKE, as in earlier contracts).
- [x] validation ↔ constraint: `relation` enum ↔ CHECK; `output ≥ 1` ↔ CHECK; `maxItems: 8` ↔ MAX_INPUT_IMAGES; derived `maxItems: 50` ↔ spec §6.
- [x] OpenAPI ↔ sequences: every `alt` branch of «Generate from stored images» (running, foreign page, source missing, not a recorded image, unusable bytes) and «Lineage on the detail view» has a response.

## Back-feed

- Every AC maps to an operation/response or is UI-only (AC-01, AC-05 panel side, AC-06, AC-10, AC-11 → screens). No sequence gaps.
