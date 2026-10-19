---
id: T1
title: "Promote the by-model index migration"
layer: "migration"
deps: []
blocks: ["T2"]
acs: ["AC-05"]
files_hint: ["docs/features/gallery-by-model/migrations/01_index_generations_by_model.up.sql", "docs/features/gallery-by-model/migrations/01_index_generations_by_model.down.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Promote the by-model index migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2 — Filter the list by model and read the models with counts and latest cards · **Wave:** 1.
- **Lane:** own lane (migrations serialized).

## Why (user story)

> **As an** Owner
> **I want** to choose one of the models I have generated with and see only its generations
> **So that** I can judge that model's results
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task makes one model's pages and the per-model counts cheap.

## Inlined context

> A new index `generations (provider, model, id)`; the list read takes an optional provider + model filter
>
> — `adr/0036, option 1, abridged` · full text: [adr/0036-read-the-models-with-counts-and-their-latest-cards-in-one-request.md](../adr/0036-read-the-models-with-counts-and-their-latest-cards-in-one-request.md)

> **Promote-time hint:** sequential 4-digit; the live tree ends at `0008_create_model_preferences` → next ≈ `0009_index_generations_by_model`.
>
> — `_audit/data-model-2026-10-19.md, verbatim` · full text: [_audit/data-model-2026-10-19.md](../_audit/data-model-2026-10-19.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Index | Columns | Change |
|---|---|---|
| `generations_by_model` | `provider, model, id` | added |

Staged pair → `migrations/0009_index_generations_by_model.{up,down}.sql`.

— `data-model.md §Indexes, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 (US-01, US-02) — domain invariant

> **Given** generations are added or deleted while a view is shown
> **When** the view updates
> **Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] promote the staged pair as 0009
- [ ] migrate test: applies, a filtered query plan uses the index, rollback drops it; roundtrip lists include 0009

## Edge cases

| Case | Behaviour |
|---|---|
| rollback | index gone, table intact |

## Definition of Done

- [ ] 0009 applies/reverts; plan uses the index
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
