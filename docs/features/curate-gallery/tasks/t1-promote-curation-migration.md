---
id: T1
title: "Promote the curation migration"
layer: "migration"
deps: []
blocks: ["T3"]
acs: ["AC-01", "AC-02"]
files_hint: ["docs/features/curate-gallery/migrations/01_create_generation_curation.up.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T1 — Promote the curation migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Add comment, tag and atomic-delete queries to the generations repo.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to write, change or clear one note on a generation
> **So that** I remember why it matters or what to try next
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: promote the curation migration.

## Inlined context

> **Promote-time hint:** sequential 4-digit `NNNN_snake_name`; live tree ends at `0005_add_generation_cost_ref` → next ≈ `0006_create_generation_curation`.
>
> — `_audit/data-model-2026-10-18.md, verbatim` · full text: [audit](../_audit/data-model-2026-10-18.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_comments.generation_id` | TEXT | PK, FK → generations ON DELETE CASCADE | added |
| `generation_comments.body` / `updated_at` | TEXT / TEXT | non-blank, ≤ 2 000 chars / ISO-8601 UTC | added |
| `generation_tags.(generation_id, tag)` | TEXT, TEXT | PK; FK → generations ON DELETE CASCADE; tag 1–32, trimmed, lower-case | added |
| `generation_tags.position` | INTEGER | ≥ 1, insertion order | added |

— `data-model.md §Entities, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner writes a comment and saves it
> **Then** the comment is shown on the detail view exactly as written (line breaks kept) and is still there after a reload; saving an edited text replaces it, and saving an empty or whitespace-only text removes it. The comment is saved only by an explicit Save (Cancel drops the edit); if it was changed in another tab meanwhile, the last save wins
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner adds a tag and later removes it
> **Then** each add or remove is saved at once (no separate Save step); the tag appears on the detail view and on the generation's gallery tile, and after removal disappears from both; tags keep the order they were added in, and the change survives a reload
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Copy the staged pair to `migrations/0006_create_generation_curation.{up,down}.sql`
- [ ] Extend `src/server/db/migrate.int.test.ts`: version list incl. 0006; blank comment / 33-char tag / upper-case ASCII tag refused; deleting a generation cascades its comment and tags; down drops both tables

## Edge cases

| Case | Behaviour |
|---|---|
| rollback | both tables dropped; 0001–0005 untouched |

## Definition of Done

- [ ] migration 0006_create_generation_curation applies and reverts cleanly; CHECKs and cascades hold
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
