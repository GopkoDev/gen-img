# API sync report — model-picker-preferences (2026-10-19)

Contract: [`openapi.yaml`](./openapi.yaml) (delta over the shipped contracts). The step 7 price operation is unchanged in shape (server-side limits only, ADR-0027).

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| ModelPreference.provider | `model_preferences.provider` (enum openrouter/vercel) | high |
| ModelPreference.model | `model_preferences.model` (1–200 chars, case-sensitive) | high |
| ModelPreference.favorite / hidden | `model_preferences.favorite` / `hidden` (0/1) | high |
| ModelPreference.updatedAt | `model_preferences.updated_at`; null when no row (both flags off) | high |
| SetPreferenceRequest.favorite / hidden | optional, ≥ 1 of the two (minProperties 3) | high |

## Drift checklist

- [x] **endpoint ↔ model:** both operations read/write only `model_preferences`; PATCH with both flags off deletes the row (data-model row invariant).
- [x] **error-code ↔ repo:** VALIDATION_ERROR, NOT_FOUND, FORBIDDEN, PROVIDER_ERROR, PROVIDER_NOT_CONFIGURED exist in `src/server/lib/errors.ts` / `providers/routes.ts` (repo convention UPPER_SNAKE AppError codes, followed as in earlier features).
- [x] **validation ↔ constraint:** model 1–200 mirrors the CHECK and the price lookup; provider enum mirrors the CHECK.
- [x] **OpenAPI ↔ sequences:** sad §6 «unknown model or provider» → 404, «catalog unavailable» → 502 (409 when not configured, as the model list); «read fails» → the client's degraded list (AC-13), no extra response; foreign page → 403.

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01, AC-02 | getModelPrice (step 7) — unchanged shape, cached failures |
| AC-03, AC-07 | setModelPreference 200; listModelPreferences 200 |
| AC-04, AC-09, AC-10, AC-11 | listModelPreferences 200 — grouping/hidden/auto-pick are UI rules |
| AC-05 | setModelPreference 400/404/409/502 → ★ rolls back |
| AC-06 | setModelPreference 404 |
| AC-08 | listModelPreferences returns rows of models no longer listed |
| AC-12 | 403 on both operations |
| AC-13 | listModelPreferences failure → UI fallback |
| AC-14 | listModelPreferences (refetched on picker open) |

No sequence gaps. Async: none (no events document).
