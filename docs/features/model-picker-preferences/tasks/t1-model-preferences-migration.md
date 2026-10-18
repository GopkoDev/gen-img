---
id: T1
title: "Promote the model_preferences migration"
layer: "migration"
deps: []
blocks: ["T2"]
acs: ["AC-07"]
files_hint: ["docs/features/model-picker-preferences/migrations/01_create_model_preferences.up.sql", "docs/features/model-picker-preferences/migrations/01_create_model_preferences.down.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Promote the model_preferences migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2 — Read and set model preferences through a models module · **Wave:** 1 — no deps; the store and its routes need the table.
- **Lane:** own lane (migrations serialized).

## Why (user story)

> **As an** Owner
> **I want** my favorites and hidden models remembered per provider on my machine across restarts
> **So that** I curate once and the picker stays the way I left it
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task creates the table that holds exactly one set of preferences per provider + model.

## Inlined context

> Preferences: one row per (provider, model) with `favorite` + `hidden`, in a new `models` module — writes checked against the cached catalog, a row with both flags off is deleted, reads return every row of a provider
>
> — `sad.md §4, item 1, verbatim` · full text: [sad.md](../sad.md)

> **Promote-time hint:** sequential 4-digit `NNNN_snake_name`; live tree ends at `0007_add_generation_source` → next ≈ `0008_create_model_preferences`.
>
> — `_audit/data-model-2026-10-19.md, promote hint, verbatim` · full text: [_audit/data-model-2026-10-19.md](../_audit/data-model-2026-10-19.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `provider` | TEXT | NOT NULL, `openrouter`/`vercel`, PK part | added |
| `model` | TEXT | NOT NULL, 1–200 chars, PK part | added |
| `favorite` | INTEGER | NOT NULL, 0/1, default 0 | added |
| `hidden` | INTEGER | NOT NULL, 0/1, default 0 | added |
| `updated_at` | TEXT | NOT NULL, ISO-8601 UTC | added |
| (row) | — | CHECK `favorite = 1 OR hidden = 1` | added |

Staged pair: `docs/features/model-picker-preferences/migrations/01_create_model_preferences.up.sql` / `.down.sql` → promote as `migrations/0008_create_model_preferences.{up,down}.sql`.

— `data-model.md §Entities, model_preferences, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-07 (US-04) — domain invariant

> **Given** two providers offer a model with the same id
> **When** the Owner marks it as a favorite under one provider
> **Then** it is a favorite only under that provider — a model holds exactly one set of preferences per provider, and toggling twice in a row ends where it started
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] copy the staged pair to `migrations/0008_create_model_preferences.up.sql` / `.down.sql` (content unchanged)
- [ ] extend `src/server/db/migrate.int.test.ts`: 0008 applies, a both-flags-off row is refused, a duplicate (provider, model) is refused, rollback drops the table

## Edge cases

| Case | Behaviour |
|---|---|
| both flags 0 | insert refused by CHECK |
| same model id under two providers | two rows allowed |
| rollback | table gone, earlier tables untouched |

## Definition of Done

- [ ] migration 0008 applies on boot and reverts with `pnpm db:rollback`
- [ ] migrate integration test covers the CHECK and the PK
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
