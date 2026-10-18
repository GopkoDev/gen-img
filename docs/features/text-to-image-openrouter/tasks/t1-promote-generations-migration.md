---
id: T1
title: "Promote the generations migration into the live tree"
layer: "migration"
deps: []
blocks: ["T6"]
acs: ["AC-02", "AC-08"]
files_hint: ["docs/features/text-to-image-openrouter/migrations/01_create_generations.up.sql", "docs/features/text-to-image-openrouter/migrations/01_create_generations.down.sql", "migrations/"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T1 — Promote the generations migration into the live tree

## Place in the sequence

- **Blocked by:** — · **Blocks:** T6 — Write the generations repo: atomic insert, gallery page, detail, recorded path lookup.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each successful generation saved on my machine with its output images and full metadata
> **So that** no prompt or result is lost and I can repeat the request later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: promote the generations migration into the live tree.

## Inlined context

> Images never go in the DB — only relative paths under the data dir. Timestamps: ISO-8601 UTC text. Money: integer micro-USD (`cost_micros`) + status (`known | pending | unavailable`).
>
> — `CLAUDE.md §Conventions, Persistence, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

> Promote-time convention hint: repo uses 4-digit sequential `NNNN_snake_name.{up,down}.sql`; live tree holds `0001_init` → next ≈ `0002_create_generations`.
>
> — `_audit/data-model-2026-10-18.md, hint, abridged` · full text: [audit](../_audit/data-model-2026-10-18.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.*` (id, provider, model, prompt, requested_params, accepted_params, images_requested, cost_micros, cost_status, created_at, duration_ms, raw_request, raw_response) | TEXT/INTEGER | PK id; CHECK prompt non-blank; cost_status IN known/pending/unavailable; known ⇔ cost_micros NOT NULL | added |
| `generation_images.*` (generation_id, position, path, media_type, width, height, byte_size) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; media_type IN png/jpeg/webp/gif | added |

— `data-model.md §Entities, generations + generation_images, abridged` · full text: [data-model.md](../data-model.md)

Staged pair: `docs/features/text-to-image-openrouter/migrations/01_create_generations.up.sql` / `.down.sql`.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-02 — happy path

> **Given** a generation has just succeeded
> **When** the Owner opens its detail view
> **Then** the Owner sees the output images, provider, image model, prompt, the parameters the Owner set, created-at (the moment the Owner submitted; the gallery orders by it), duration (from sending the request to the provider until its answer arrived), the cost with its cost status, and the raw request and response the provider exchanged
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
> **When** the save is attempted
> **Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Copy the staged pair to `migrations/0002_create_generations.up.sql` / `.down.sql` (content unchanged)
- [ ] Extend `src/server/db/migrate.int.test.ts`: up creates both tables (CHECKs reject a blank prompt and `known` without cost), down drops them

## Edge cases

| Case | Behaviour |
|---|---|
| cost_status known with NULL cost | insert rejected by CHECK |
| blank prompt | insert rejected by CHECK |
| rollback | both tables dropped, children first |

## Definition of Done

- [ ] migration 0002_create_generations applies and reverts cleanly in an integration test
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
