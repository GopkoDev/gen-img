# API sync report — gallery-by-model (2026-10-19)

Contract: [`openapi.yaml`](./openapi.yaml) — a delta over the shipped list contract. Derived from [`data-model.md`](../data-model.md) (index only) and the existing `generations` columns.

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| listGenerations.provider / model | `generations.provider` / `model` (exact) | high |
| ModelGroup.count | `count(*)` per provider + model | high |
| ModelGroup.latestId | `max(id)` per provider + model | high |
| ModelGroup.items | filtered page query, limit = `latest` | high |

## Drift checklist

- [x] **endpoint ↔ model:** reads `generations` (+ the shipped summary joins); index `generations_by_model`.
- [x] **error-code ↔ repo:** VALIDATION_ERROR (provider without model, bad latest), FORBIDDEN; no 404 for an unknown model (empty page).
- [x] **validation ↔ constraint:** model 1–200 like elsewhere; provider enum.
- [x] **OpenAPI ↔ sequences:** sad §6 «models fails» → client message; «none» → empty page; route order: `/generations/models` registered before `/generations/:id` (like `cost-history`).

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01, AC-08 | listGenerationModels (latest 0) |
| AC-02 | listGenerationModels (latest 4) |
| AC-03, AC-10 | client address rules |
| AC-04 | listGenerations filtered (dialog stepping) |
| AC-05 | counts + filtered pages + client patches |
| AC-06 | listGenerations filtered → empty page |
| AC-07 | client message on a failed read |
| AC-09 | 403 on both operations |

No sequence gaps. Async: none.
