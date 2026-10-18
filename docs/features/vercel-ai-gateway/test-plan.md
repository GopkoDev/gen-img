---
status: Draft
owner: "dmytro.hopko"
reviewers: ["implementing engineer", "Tech Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Test plan — vercel-ai-gateway

## Levels

| Level | What it covers here | Where |
|---|---|---|
| unit | Vercel adapter over fixtures (catalog mapping, 3 call paths, redaction, errors, price lookup); cost rule; lookup schedule with a fake clock | colocated `*.test.ts` |
| integration | real SQLite + temp data dir via `createTestApp()`; fake `fetch` routing OpenRouter vs Vercel by host; injectable clock + timers for the resolver; migration 0005 | `*.int.test.ts` |
| component (web) | provider selector, per-provider forms, pending-cost display + refetch | `src/web/**/*.test.tsx` |
| contract | every response parsed by the shared zod schemas (ProviderId incl. `vercel`, CostStatus) | integration tests |
| e2e / live | **deferred** — no real Vercel call allowed or possible (no key); D3–D6 confirmed on the first real call | — |

## AC coverage

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | image-only path: generations body + decoded images; flow start → saved with provider vercel | unit + integration | T3, T7 |
| AC-02 | chat path: modalities body, images from `message.images`, text kept only in stored answer | unit | T3 |
| AC-03 | catalog → only image-producing models; n 4 / 1; inputs per modalities; no seed/aspect; selector reloads list | unit + component | T3, T8 |
| AC-04 | edits path with `images[].image_url` data URLs; inputs stored; `{$input:N}` in stored request | unit + integration | T3, T7 |
| AC-05 | pending saved with ref → lookup known → detail/gallery re-read shows amount; deadline → unavailable | unit + integration + component | T2, T6, T7, T9 |
| AC-06 | boot resume: young rescheduled, overdue one lookup then unavailable, no ref → unavailable | integration | T5, T6 |
| AC-07 | lookup failure / unusable → unavailable; generation intact; no job error | unit + integration | T4, T6 |
| AC-08 | gateway errors (402/403/429/5xx bodies), abort, no usable image → job failed with reason, nothing saved | unit + integration | T3, T7 |
| AC-09 | n above kind max, inputs on a model without image input → field errors, nothing sent | integration + component | T7, T8 |
| AC-10 | only one provider configured → other 409 + hint; configured one works | integration + component | T7, T8 |
| AC-11 | job running on OpenRouter → Vercel start refused in progress; panel disabled | integration + component | T6, T8 |
| AC-12 | mixed gallery newest first, provider on tiles + detail names | integration + component | T7, T9 |
| AC-13 | key absent from stored rows (3 paths), API responses and lookup handling; lookups server-side only | unit + integration | T3, T4, T10 |
| AC-14 | cross-site start for provider vercel → refused, provider not called | integration | T7 |
| AC-15 | OpenRouter request bodies + cost handling unchanged (text-only and inputs) | integration | T10 |

## Edge cases / error paths

- Lookup «not found» on every attempt → unavailable after attempt 8 or the deadline, whichever comes first.
- Late lookup after the row was already resolved → no-op (guarded update).
- BYOK lookup with zero upstream cost → unavailable.
- Model id unknown to the cached catalog → adapter refreshes once, then fails with a plain reason.
- Chat answer with text only → no usable image → failure.

## Test data

- `tests/fixtures/vercel/models.json` — entries trimmed from the public `GET /v1/models` (2026-10-18): image-only (with and without image input), multimodal language model with `image-generation`, a non-image language model and a video model (filtered out).
- Answers handcrafted from the docs: images generation/edit (`data[].b64_json`), chat (`message.images[].image_url.url` data URIs, `id: gen_…`), lookup (`total_cost`, BYOK variant, «Usage event not found»), error bodies. Tiny generated PNGs; no PII; test key `vck-test-KEY`.

## NFR validation (load)

| NFR (spec §6) | Test | Threshold |
|---|---|---|
| Pending cost resolution | resolver with fake clock: all tracked rows end known/unavailable by answer + 10 min 30 s | 100 % in test (≥ 95 % target) |
| Lookups per generation | schedule unit test | ≤ 8, first ≥ 5 s, cap 60 s |
| UI reflects resolved cost | component test with mocked re-reads | ≤ 15 s (5 s / 10 s intervals) |
| Gallery page, 1 000 mixed generations | `src/server/nfr.int.test.ts` | ≤ 300 ms p95 |
| Raw answer size | stored-row scan, 3 paths | 0 bytes base64 |

## CI placement

No CI: local gate `pnpm typecheck && pnpm lint && pnpm test` (projects `unit`, `integration`, `web`, then serial `nfr`).
