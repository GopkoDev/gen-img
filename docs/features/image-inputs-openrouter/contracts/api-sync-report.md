# API sync report — image-inputs-openrouter (2026-10-18)

Contract: [`openapi.yaml`](./openapi.yaml) (0.2.0, extends step 2's 0.1.0) — `redocly lint --extends=minimal`: valid.

## Field origins (new / changed only)

| Path | Origin | Confidence |
|---|---|---|
| `startGeneration` multipart `request` | step-2 `StartGenerationRequest` (unchanged) | high |
| `startGeneration` multipart `inputs[]` | spec AC-01/AC-03/AC-04, ADR-0010; limits from data-model `generation_inputs.byte_size` CHECK + SAD §8 (8 files) | high |
| `ImageModel.params.inputs {min, max}` | public catalog `supported_parameters.input_references` range, max capped at 8 (SAD §4) | high |
| `Generation.inputs[]` (`position, url, mediaType, width, height, byteSize, originalName`) | `generation_inputs` columns (data-model) | high |
| `GenerationSummary.inputsCount` | count of `generation_inputs` rows (data-model access pattern) | high |
| `rawRequest` input placeholders `{ $file }` | ADR-0008 extension (SAD §8) | high |

## Drift checklist

- [x] endpoint ↔ model: every new field maps to a `generation_inputs` column or a catalog field.
- [x] error codes ↔ repo: only existing codes (`VALIDATION_ERROR`, `PROVIDER_*`, `STORAGE_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `GENERATION_IN_PROGRESS`).
- [x] validation ↔ constraint: 10 485 760-byte limit and media types match the table CHECKs; count ≤ 8 matches SAD §8.
- [x] OpenAPI ↔ sequences: §6 «Critical flow 1» refusal branch → 400 with `inputs`/`inputs.N`; «Browse» not-recorded branch → `getFile` 404; «Contain attachments» → 403.

## Back-feed

Every AC-01…AC-11 maps to `startGeneration`, `listImageModels`, `getGeneration`, `listGenerations` or `getFile`; AC-08 is client-side only (model switch) and re-enforced by `startGeneration` 400. No sequence gaps found.
