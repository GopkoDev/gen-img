---
status: Draft
owner: "dmytro.hopko"
reviewers: ["implementing engineer", "Tech Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Test plan — curate-gallery

## Levels

| Level | What it covers here |
|---|---|
| unit | tag normalization, comment rules, limits (`src/shared/curation.ts`) |
| integration | repo + service + routes against a real SQLite file and a real temp data dir (throwaway per test, via the test app helper); migration up/down |
| contract | every response parsed by the shared zod schemas that mirror `contracts/openapi.yaml` |
| component | Notes card, delete dialog, gallery tile — states from `screens.md` SCR-01…SCR-04, with a mocked API client |
| e2e-through-UI | N/A — single local user; flows from `ux-flows.md` are covered by component tests + route integration tests; one manual smoke run at `ship` |
| load | the serial NFR project (in-process timing over a seeded data dir) |

## AC coverage

| AC | Test | Level | Task |
|---|---|---|---|
| AC-01 | comment saved, replaced, blank removes it, last save wins; Save/Cancel in the editor | integration + component | T3, T5, T6, T7 |
| AC-02 | tag added and removed, kept in insertion order, visible on detail + tile after refetch | integration + component | T3, T6, T7, T9 |
| AC-03 | summary carries ≤ 10 tags + hasComment; tile shows 3 + «+N» and the marker | integration + component | T3, T6, T9 |
| AC-04 | delete removes rows and the generation dir; dialog → gallery with «Generation deleted.» | integration + component | T5, T6, T8 |
| AC-05 | cancelling the dialog sends nothing | component | T8 |
| AC-06 | comment over 2 000 characters refused (server field error; client keeps text) | unit + integration + component | T2, T5, T7 |
| AC-07 | invalid tag text refused with the rule message | unit + integration + component | T2, T5, T7 |
| AC-08 | 11th tag refused; duplicate (case/spaces) not added twice | unit + integration | T2, T3, T5 |
| AC-09 | failing directory move → generation fully intact + reason; leftover trash removed on restart | integration + load | T3, T4, T5, T10 |
| AC-10 | deleting a pending-cost generation cancels its lookup (no lookup after delete) | integration | T5 |
| AC-11 | a held running generation saves normally after another one is deleted | integration | T5 |
| AC-12 | deleting the latest succeeded result clears it from the job; panel hides it | integration + component | T5, T8 |
| AC-13 | foreign Origin / cross-site on all four mutating routes → refused, nothing changed | integration | T6 |
| AC-14 | every curation action on a deleted generation → «no longer exists» | integration + component | T5, T6, T7, T8 |
| AC-15 | markup in comment/tags rendered as text | component | T7, T9 |

## Edge cases / error paths

- Tag with Cyrillic upper-case → stored lower-case; emoji → refused; 32 vs 33 characters.
- Comment of exactly 2 000 characters incl. astral symbols → accepted (characters, not UTF-16 units).
- Delete of a generation whose directory is already missing → succeeds (nothing to move).
- Delete twice (two tabs) → second gets «no longer exists».
- Purge failure after commit → logged; files only under `.staging`, gone after the next start.

## Test data

- `seedGeneration(db, dataDir, { tags, comment, images, inputs })` — tiny PNGs, test prompts, no PII.
- Fresh temp data dir + SQLite file per test (`createTestApp`), removed in cleanup; `app.stopBackground()` before cleanup.

## NFR validation (load)

| NFR (spec §6) | Scenario | Threshold |
|---|---|---|
| Comment / tag save | 20 timed saves over a seeded data dir | ≤ 100 ms p95 server time |
| Delete (4 outputs + 8 inputs) | 20 timed deletes of seeded generations | ≤ 300 ms p95 server time |
| Gallery first page | 1 000 generations × 10 tags + comment, 20 timed page loads | ≤ 300 ms p95 server time |
| Deletion durability | leftover `.staging/<id>.deleted` + restart | 0 half-deleted generations |

## CI placement

No CI: everything runs in the local gate (`pnpm typecheck && pnpm lint && pnpm test`); the NFR file runs last in the serial `nfr` project.
