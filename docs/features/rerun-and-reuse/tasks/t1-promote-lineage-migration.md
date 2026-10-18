---
id: T1
title: "Promote the lineage migration"
layer: "migration"
deps: []
blocks: ["T3"]
acs: ["AC-02", "AC-07"]
files_hint: ["docs/features/rerun-and-reuse/migrations/01_add_generation_source.up.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T1 — Promote the lineage migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Store lineage and look up stored images and derived generations in the repo.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** deleting a generation to never be blocked or to change what was made from it
> **So that** curating the gallery stays simple and derived results are safe
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task delivers: promote the lineage migration.

## Inlined context

> `generations.source_id`, `source_relation` (`rerun` / `reuse`), `source_output` (reuse only); a partial index on `source_id` for the derived list; a deleted source simply doesn't resolve. … Deletion code stays untouched: no constraint can block it.
>
> — `adr/0018, option 1 + outcome, abridged` · full text: [ADR-0018](../adr/0018-record-lineage-as-source-columns-without-a-foreign-key.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.source_id` | TEXT | NULL, no FK | added |
| `generations.source_relation` | TEXT | NULL, CHECK IN (rerun, reuse) | added |
| `generations.source_output` | INTEGER | NULL, CHECK ≥ 1 (reuse only) | added |
| index `generations_source` | (source_id, id) WHERE source_id IS NOT NULL | partial | added |

— `data-model.md §Entities, generations (added columns) + §Indexes, abridged` · full text: [data-model.md](../data-model.md)

Staged pair: `docs/features/rerun-and-reuse/migrations/01_add_generation_source.up.sql` / `.down.sql`.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner generated from a re-run form
> **When** the new generation is saved and the Owner opens it
> **Then** its detail view says «Re-run of» with a link to the source generation, it holds its own copies of the input images, and the source's detail view lists it among the generations made from it
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — domain invariant

> **Given** a derived generation and its source generation
> **When** the Owner deletes the source
> **Then** the deletion goes ahead without asking about derived generations beyond the usual confirmation, the derived generation keeps all its images and input copies, and its lineage shows «source deleted» instead of a link
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Copy the staged pair to `migrations/0007_add_generation_source.{up,down}.sql` (content unchanged)
- [ ] Extend `src/server/db/migrate.int.test.ts`: versions list includes 0007; CHECK rejects relation `copy` and output 0; query plan uses `generations_source`; down drops the columns

## Edge cases

| Case | Behaviour |
|---|---|
| source_relation `copy` | rejected by CHECK |
| rollback | index dropped, then the three columns |

## Definition of Done

- [ ] migration 0007_add_generation_source applies and reverts cleanly; CHECKs reject a bad relation / output; the derived-list query uses generations_source
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
