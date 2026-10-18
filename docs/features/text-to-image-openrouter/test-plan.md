---
status: Draft
owner: "dmytro.hopko"
reviewers: ["implementing engineer", "Tech Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Test plan — text-to-image-openrouter

## Levels

| Level | What it covers here | Where |
|---|---|---|
| unit | pure rules: validation vs model support, cost conversion, image sniffing, request-guard header matrix, OpenRouter adapter mapping over recorded fixtures (fake `fetch`), web formatters | colocated `*.test.ts` |
| integration | real SQLite file + temp data dir via `createTestApp()` + `app.request()`; provider HTTP stubbed from `tests/fixtures/openrouter/`; file store on the real filesystem; migrations up/down | `*.int.test.ts` |
| component (web) | SCR-01..03 states with a mocked `api` client, Testing Library + jsdom | `src/web/**/*.test.tsx` |
| contract | response bodies parsed by the shared zod schemas that mirror `contracts/openapi.yaml` (every integration test parses through them) | integration tests |
| e2e / load | N/A — single local user; NFRs measured in-process by integration tests (see below); one manual smoke run at `ship` | — |

## AC coverage

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | start → poll job → succeeded → generation in page 1 | integration | T7, T10 |
| AC-01 | success state shows latest result | component | T12 |
| AC-02 | detail returns every stored field; detail page renders them | integration + component | T10, T14 |
| AC-03 | catalog mapping + only supported params; picker lists models, hides unsupported fields | unit + component | T4, T9, T12 |
| AC-04 | 30 seeded → page of 24 newest first + nextCursor → page 2 of 6; Load more appends | integration + component | T6, T10, T13 |
| AC-05 | blank prompt / no model / n out of range → 400 with `details.fields`, provider never called; client messages | unit + integration + component | T2, T10, T12 |
| AC-06 | 402, 403 moderation, 502, network error, 0 usable images, timeout → job failed with reason, nothing stored; failure panel keeps prompt | unit + integration + component | T4, T7, T12 |
| AC-07 | missing `usage.cost` → `unavailable` + null; detail shows «unavailable», never $0 | unit + integration + component | T2, T7, T14 |
| AC-08 | stage fails on 2nd image / commit throws after rename → no rows, no files, failure reason; restart sweep | integration | T5, T6, T7, T15 |
| AC-09 | requested params stored as sent; accepted null → «not reported»; dimensions per image | integration + component | T7, T14 |
| AC-10 | stored raw request has no key/Authorization; raw response has no `b64_json`; no API response contains the key | integration | T4, T15 |
| AC-11 | server bind host constant is the loopback address | unit | T8 |
| AC-12 | file route: recorded path 200; unrecorded, `..`, absolute, DB file → 404 | integration | T10 |
| AC-13 | no key → providers `configured: false`, models + start → PROVIDER_NOT_CONFIGURED; panel shows how to configure; gallery still loads | integration + component | T9, T10, T12 |
| AC-14 | catalog failure → PROVIDER_ERROR; panel «model list unavailable» + Retry | integration + component | T9, T12 |
| AC-15 | empty data dir → empty page; empty state CTA | integration + component | T10, T13 |
| AC-16 | provider returns 2 of 4 → saved with 2 images, imagesRequested 4; detail «2 of 4 received» | integration + component | T7, T14 |
| AC-17 | second start while running → GENERATION_IN_PROGRESS; job survives without a client; failure notice persists across a new app instance until dismissed; panel shows «in progress» from currentJob | integration + component | T7, T10, T12 |
| AC-18 | provider in summaries + detail; tile badge | integration + component | T10, T13, T14 |
| AC-19 | foreign Host / Origin / `Sec-Fetch-Site: cross-site` on generate, list, file → FORBIDDEN, provider not called | unit + integration | T8 |

## Edge cases / error paths

- Fractional-cent cost (`0.000125` USD → 125 micro-USD); stated zero cost stays `known`.
- `media_type` missing in the provider answer → sniffed type used.
- Dismiss while running → GENERATION_IN_PROGRESS; dismiss with no notice → no-op 204.
- Cursor equal to the last id → empty page with `nextCursor: null`.
- Process «restart» simulated by building a second app over the same data dir.

## Test data

- `tests/fixtures/openrouter/*.json` — recorded/handcrafted catalog, success (tiny base64 PNGs), no-cost, error bodies (402, 403 moderation).
- `tests/helpers/generations.ts` `seedGeneration()` — rows + tiny PNG files; no PII (prompts like «A test prompt»).
- Fake `fetch` injected through `createApp` deps; test key `sk-or-test-KEY` searched for in stored rows.

## NFR validation (load)

| NFR (spec §6) | Test | Threshold |
|---|---|---|
| Gallery first page, 1 000 generations | `tests/nfr.int.test.ts` — 20 timed requests | ≤ 300 ms p95 |
| Detail view | same, 20 timed requests | ≤ 150 ms p95 |
| Local overhead (4 × 5 MB) | stubbed provider, start→saved minus provider time | ≤ 500 ms p95 |
| Timeout | hanging stub with injected 50 ms timeout → AC-06 path | cancelled, nothing recorded |
| Durability | leftover staging + orphan dir → new app → only complete generations | 0 half-saved |
| Raw response size | stored row scan | 0 bytes of base64 image payload |

## CI placement

No CI (architecture-map): everything runs in the local gate `pnpm typecheck && pnpm lint && pnpm test` (Vitest projects `unit`, `integration`, `web`). The NFR test file runs in the `integration` project.
