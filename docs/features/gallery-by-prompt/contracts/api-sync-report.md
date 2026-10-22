# API sync report — gallery-by-prompt (2026-10-19)

Contract: [`openapi.yaml`](./openapi.yaml) — a delta over the gallery-by-model contract. Derived from [`data-model.md`](../data-model.md) (`prompt_key`) and the existing `generations` / `generation_images` columns.

## Field origins

| operation.field | origin | confidence |
|---|---|---|
| listGenerations.prompt / PromptGroup.key | `generations.prompt_key` (32 hex) | high |
| PromptGroup.prompt | `generations.prompt` of the group | high |
| PromptGroup.count / images | `count(*)` / `sum(images received)` per key | high |
| PromptGroup.models / moreModels | distinct `provider, model` per key (≤ 3 + the rest's count) | high |
| PromptGroup.latestId / cover | `max(id)` per key; its first `generation_images` row | high |

## Drift checklist

- [x] **endpoint ↔ model:** reads `generations` via `generations_by_prompt`; images via the first output of `latestId`.
- [x] **error-code ↔ repo:** VALIDATION_ERROR (bad key, prompt with provider/model, bad single/cursor/limit), FORBIDDEN.
- [x] **validation ↔ constraint:** key pattern = the column CHECK (length 32) + lowercase hex.
- [x] **OpenAPI ↔ sequences:** sad §6 «groups fail» → client message; «none» → empty page; route order `/generations/prompts` before `/generations/:id`.

## Back-feed (coverage)

| AC | Operation / response |
|---|---|
| AC-01 | listPromptGroups (single 0/1, paging) |
| AC-02, AC-03 | listGenerations prompt; getPromptGroup (heading) |
| AC-04 | client address rules (key only) |
| AC-05 | key = exact-text hash |
| AC-06 | counts + prefix invalidation |
| AC-07 | getPromptGroup 404 / malformed key → client unknown-key state |
| AC-08 | client errors-with-data |
| AC-09 | 403 on both |
| AC-10 | boot backfill → keys present |

No sequence gaps. Async: none.
