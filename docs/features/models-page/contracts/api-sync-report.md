# API sync report — models-page (2026-10-19)

Contract: [`openapi.yaml`](./openapi.yaml) — a delta over step 9's contract. `data-model.md` absent — legal fast-lane skip (no schema change); fields derived from the existing schema (`migrations/0008_create_model_preferences.up.sql`).

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| SetPreferenceRequest.* / ModelPreference.* | existing schema — `model_preferences` (0008), step 9 contract | high |
| setModelPreference 404/409/502 «only when a flag turns on» | ADR-0029, spec AC-12 | high |

## Drift checklist

- [x] **endpoint ↔ model:** unchanged table; an all-false write merges and deletes the row (step 9 row invariant).
- [x] **error-code ↔ repo:** NOT_FOUND / PROVIDER_NOT_CONFIGURED / PROVIDER_ERROR already exist; only their conditions narrow.
- [x] **validation ↔ constraint:** unchanged (model 1–200).
- [x] **OpenAPI ↔ sequences:** sad §6 «flag turned off (incl. Forget)» → 200 without the provider; «flag turned on … unknown, list down, or no key» → 404/502/409.

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01, AC-06, AC-07 | existing providers, models, price reads |
| AC-02, AC-03, AC-05 | setModelPreference 200 / errors → per-toggle rollback |
| AC-04, AC-13 | listModelPreferences (step 9) — read by the generate form |
| AC-08, AC-12 | setModelPreference all-false → 200 without the provider |
| AC-09, AC-14 | UI rules over the existing reads |
| AC-10 | none — gallery and re-run unchanged |
| AC-11 | 403 on every operation (request guard) |

No sequence gaps. Async: none.
