---
id: T1
title: "Promote the generation_inputs migration"
layer: "migration"
deps: []
blocks: ["T4"]
acs: ["AC-01", "AC-06"]
files_hint: ["docs/features/image-inputs-openrouter/migrations/01_create_generation_inputs.up.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T1 — Promote the generation_inputs migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Stage and record input copies with the generation.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to attach one or more input images to my prompt and generate
> **So that** I can change or combine existing pictures without a playground
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: promote the generation_inputs migration.

## Inlined context

> Promote-time hint: repo is 4-digit sequential; live tree holds `0001`–`0003` → next ≈ `0004_create_generation_inputs`.
>
> — `_audit/data-model-2026-10-18.md, verbatim` · full text: [audit](../_audit/data-model-2026-10-18.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_inputs.*` (generation_id, position, path, media_type, width, height, byte_size, original_name) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; UNIQUE path; media_type IN png/jpeg/webp/gif; byte_size 1…10 485 760 | added |

— `data-model.md §Entities, generation_inputs, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has chosen a model that accepts input images and attached two supported images
> **When** the Owner writes a prompt and generates
> **Then** the generation is saved with copies of both input images, and its detail view shows the inputs in the order they were attached (no reordering in this slice — remove and re-attach to change it) next to the outputs; after success the attachments and the prompt stay in the form so the Owner can iterate, until the Owner removes them
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** a generation with input images succeeds at the provider but storing its files fails part-way
> **When** the save is attempted
> **Then** the invariant «a generation is saved only together with all its output images and copies of all its input images» holds: neither the generation nor any input copy remains, and the Owner is told why
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Copy the staged pair to `migrations/0004_create_generation_inputs.{up,down}.sql`
- [ ] Extend `src/server/db/migrate.int.test.ts`: versions list + invariants (media type, byte size, FK, cascade, unique path) + down drops the table

## Edge cases

| Case | Behaviour |
|---|---|
| byte_size 10 485 761 | rejected by CHECK |
| delete parent generation | inputs cascade away |

## Definition of Done

- [ ] migration 0004_create_generation_inputs applies and reverts cleanly; CHECKs and the unique path index hold
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
