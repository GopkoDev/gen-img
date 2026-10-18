# API sync report — curate-gallery (2026-10-18)

Contract: [`openapi.yaml`](./openapi.yaml) (delta over the shipped contracts). Lint: `redocly lint --extends=minimal` — valid; 2 warnings: the two `*CurationDelta` schemas are documentation of fields added to the shipped Generation schemas, intentionally unreferenced here.

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| setComment.body / Comment.body | `generation_comments.body` (≤ 2 000 chars, non-blank) | high |
| Comment.updatedAt | `generation_comments.updated_at` | high |
| addTag.tag → Tag | `generation_tags.tag` (1–32, normalized) | high |
| TagsResponse.tags (order) | `generation_tags.position` | high |
| GenerationSummary.hasComment | existence of `generation_comments` row | high |
| deleteGeneration | `generations` row + cascades (images, inputs, comments, tags) + dir (ADR-0014) | high |

## Drift checklist

- [x] **endpoint ↔ model:** every operation reads/writes only `generation_comments` / `generation_tags` / `generations` (delete).
- [x] **error-code ↔ repo:** VALIDATION_ERROR, NOT_FOUND, STORAGE_ERROR, FORBIDDEN, INTERNAL_ERROR all exist in `src/server/lib/errors.ts` (repo convention is UPPER_SNAKE AppError codes, not `module.error_name` — followed, as in earlier features).
- [x] **validation ↔ constraint:** maxLength 2000 / 1–32 / maxItems 10 mirror the CHECKs and the service limit.
- [x] **OpenAPI ↔ sequences:** «no such generation» → 404 on all four; «move fails» → 500 STORAGE_ERROR; «already 10 / invalid text» → 400; duplicate → 200 unchanged; foreign page → 403.

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01, AC-06 | setComment 200 / 400 |
| AC-02, AC-07, AC-08 | addTag 200 / 400; removeTag 200 |
| AC-03 | GenerationSummary + Generation deltas |
| AC-04, AC-09, AC-10, AC-12 | deleteGeneration 204 / 500 (side effects server-side) |
| AC-05 | none — Cancel sends no request |
| AC-11 | none — no new operation; job routes unchanged |
| AC-13 | 403 on every operation |
| AC-14 | 404 on every operation |
| AC-15 | none — rendering rule, enforced in the UI |

No sequence gaps. Async: none (no events document).
