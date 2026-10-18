---
status: Draft
owner: "dmytro.hopko"
reviewers: ["implementing engineer", "Tech Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Test plan — rerun-and-reuse

## Levels

| Level | What it covers here |
|---|---|
| unit | shared request schema (source/inputs shape), carry-over rule on model switch |
| integration | repo lineage + stored-image lookup, service resolving stored references, routes — real SQLite file + temp data dir per test, provider stubbed |
| component | panel draft from a source (SCR-01 states), detail actions + lineage card (SCR-03 states) — mocked API client |
| e2e-through-UI | N/A as an automated tier (no browser runner in the repo); the ux-flows paths are exercised by component tests + one manual run at ship |
| load | the serial NFR project measures the two §6 timings in-process |

## AC coverage

| AC | Test | Level | Task |
|---|---|---|---|
| AC-01 | re-run fills provider, model, prompt, params and stored inputs in order; «Re-run of» shown | component | T6 |
| AC-01 | re-run from stored inputs sends the same bytes in the same order | integration | T4 |
| AC-02 | derived generation saved with own input copies and «rerun» lineage; source lists it | integration | T3, T4 |
| AC-02 | lineage card shows «Re-run of» link | component | T8 |
| AC-03 | reuse attaches exactly that output, empty prompt, input-capable model kept/selected | component | T6 |
| AC-03 | reuse sends the output bytes and saves «reuse» lineage with the output number | integration | T4 |
| AC-04 | detail lists derived newest first, ≤ 50 + total; hidden when none | integration + component | T3, T8 |
| AC-05 | switching model removes and names unsupported params, lowers image count | unit + component | T2, T7 |
| AC-05 | server refuses an unsupported param on a stored-ref request | integration | T4 |
| AC-06 | re-run draft says «results can differ» | component | T6 |
| AC-07 | deleting the source keeps the derived images and copies served; lineage «source deleted» | integration + component | T9, T8 |
| AC-08 | source deleted before submit → field error, nothing sent; panel notice + remove link | integration + component | T4, T6 |
| AC-09 | output > 10 MB refused in place on the detail view | component | T8 |
| AC-09 | oversize / unsupported stored image refused at start, nothing sent | integration | T4 |
| AC-10 | source model not offered / provider not configured → notice, draft kept | component | T6 |
| AC-11 | no input-capable model → notice, Generate disabled | component | T6 |
| AC-12 | cross-site start with stored refs → refused, provider not called | integration | T5 |
| AC-13 | unknown generation / position / kind → one generic field error, no read | integration | T4, T5 |
| AC-14 | start with stored refs while a job runs → in progress, nothing sent | integration | T4 |
| AC-15 | chain A→B→C: B shows only A as source and only C as derived | integration | T3 |

## Edge cases / error paths

- Upload slot referenced twice / a file part never referenced → field error, nothing sent.
- `inputs` absent → uploads in order (older clients unchanged).
- Reuse without an output number / re-run with one → validation error.
- Source deleted during the provider call → derived saved, lineage reads «deleted».
- Address with an unknown `rerun` id → «source no longer exists», draft unchanged.

## Test data

- `seedGeneration` extended with `source` and with output/input files; tiny PNG fixture; 10 MB+ padded PNG for the size cases; no PII.
- Cleanup: each integration test uses its own temp data dir + DB (createTestApp), removed after the test.

## NFR validation (load)

| NFR (spec §6) | Scenario | Threshold |
|---|---|---|
| Start from stored images | 8 stored inputs of ~10 MB each, stubbed provider, 10 runs | ≤ 300 ms p95 server time before the provider call |
| Detail with lineage | 1 000 generations, 50 derived from the opened one, 20 runs | ≤ 150 ms p95 |
| Derived list size | 53 derived | 50 items + total 53 |
| Durability | commit fails after staging a derived generation, restart | 0 half-saved generations |

## CI placement

No CI: the local gate `pnpm typecheck && pnpm lint && pnpm test` runs unit, integration, web and (last, serial) nfr projects.
