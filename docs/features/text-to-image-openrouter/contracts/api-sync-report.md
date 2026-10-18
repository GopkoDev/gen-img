# API sync report — text-to-image-openrouter (2026-10-18)

Contract: [`openapi.yaml`](./openapi.yaml) — `redocly lint --extends=minimal`: valid, 0 warnings.

## Drift check — contract ↔ data model

| Model field | Contract field | Status |
|---|---|---|
| `generations.id/provider/model/prompt` | `Generation.id/provider/model/prompt` | ✓ |
| `requested_params` (JSON) | `requestedParams` (`RequestedParams`) | ✓ |
| `accepted_params` (NULL = not reported) | `acceptedParams` (object \| null) | ✓ |
| `images_requested` | `imagesRequested` | ✓ |
| count of `generation_images` | `imagesReceived` (summary), `images[]` (detail) | ✓ derived |
| `cost_micros` / `cost_status` | `costMicros` (int \| null) / `costStatus` | ✓ |
| `created_at` / `duration_ms` | `createdAt` / `durationMs` | ✓ |
| `raw_request` / `raw_response` | `rawRequest` / `rawResponse` (redacted) | ✓ |
| `generation_images.path` | `OutputImage.url` = `/api/files/<path>` | ✓ |
| `media_type/width/height/byte_size` | `mediaType/width/height/byteSize` | ✓ |

## Drift check — contract ↔ sad.md §6 sequences

| Sequence step | Operation | Error branches |
|---|---|---|
| get providers | `listProviders` | 403 guard |
| get image models | `listImageModels` | 409 PROVIDER_NOT_CONFIGURED, 502 PROVIDER_ERROR, 404 unknown provider |
| start generation | `startGeneration` (202 + job) | 400 VALIDATION_ERROR, 409 GENERATION_IN_PROGRESS / PROVIDER_NOT_CONFIGURED |
| get current job / dismiss | `getCurrentJob` / `dismissJob` | 409 dismiss while running |
| gallery page / next page | `listGenerations` (cursor) | 400 bad cursor/limit |
| detail | `getGeneration` | 404 |
| image file | `getFile` | 404 not recorded |
| guard refusal | all operations | 403 FORBIDDEN |

Async: none crossing a process boundary — the job runs in-process (ADR-0005); no events document.

## Findings

None — every model field and every §6 branch has a contract counterpart.
