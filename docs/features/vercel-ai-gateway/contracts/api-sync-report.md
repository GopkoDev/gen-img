# API sync report — vercel-ai-gateway (2026-10-18)

Contract: [`openapi.yaml`](./openapi.yaml) v0.3.0, derived from image-inputs-openrouter v0.2.0.

## Changes

| Change | Where | Source |
|---|---|---|
| `ProviderId` enum `[openrouter, vercel]` | providers list, models path param, start request, summaries, detail | spec AC-01, AC-10, AC-12 |
| `CostStatus.pending` now produced, with lifecycle description | summaries, detail | spec AC-05…AC-07, ADR-0013 |
| Vercel models: no `aspectRatio` / `seed`; `n.max` 4 / 1; `inputs` from catalog | `ImageModel.params` (shape unchanged) | spec AC-03, D4 |

No new operations: the pending lifecycle is observed by re-reading `getGeneration` / `listGenerations` (sad §8 UI polling). The cost reference (`cost_ref`) stays server-side and is not exposed. Async: in-process only (ADR-0013), so there is no events document.

## Drift check — contract ↔ data-model ↔ sad §6

| Item | Contract | Model / flow | Status |
|---|---|---|---|
| provider `vercel` | `ProviderId` | `generations.provider` | ✓ |
| pending cost | `CostStatus` + `costMicros: null` | `cost_status`, `cost_micros` CHECK | ✓ |
| cost reference | not exposed | `cost_ref` | ✓ intentional |
| provider not configured | 409 `PROVIDER_NOT_CONFIGURED` | «Choose the provider» flow | ✓ unchanged |
| gateway failures | 502 `PROVIDER_ERROR` (`details.provider: vercel`) | «Vercel call path» flow | ✓ |

## Findings

None.
