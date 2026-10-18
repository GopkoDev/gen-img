---
id: T1
title: "Promote the cost_ref migration"
layer: "migration"
deps: []
blocks: ["T5"]
acs: ["AC-05", "AC-06"]
files_hint: ["docs/features/vercel-ai-gateway/migrations/01_add_generation_cost_ref.up.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T1 — Promote the cost_ref migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T5 — Store cost references and resolve pending costs in the repo.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: promote the cost_ref migration.

## Inlined context

> **Promote-time hint:** live tree ends at `0004_create_generation_inputs` → next ≈ `0005_add_generation_cost_ref`.
>
> — `_audit/data-model-2026-10-18.md, verbatim` · full text: [audit](../_audit/data-model-2026-10-18.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.cost_ref` | TEXT | NULL | added |
| `generations.cost_status` / `cost_micros` | TEXT / INTEGER | CHECK known/pending/unavailable; known ⇔ cost_micros NOT NULL | unchanged |

Partial index `generations_cost_pending ON generations(id) WHERE cost_status = 'pending'`.

— `data-model.md §generations (delta), abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** a Vercel generation succeeded but its answer did not state a price
> **When** it is saved and the Owner opens it in the gallery or detail view
> **Then** it appears immediately with cost status «pending» — never as zero — and, without the Owner reloading, changes to the final amount (status «known») once the provider reports it, or to «unavailable» if the provider still has not reported it 10 minutes after the provider's answer arrived
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** gen-img stops while some generations still have a pending cost
> **When** it starts again
> **Then** pending costs whose answer arrived less than 10 minutes ago keep being looked up, older ones get one last lookup and then become «unavailable»; no generation stays «pending» forever
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Copy the staged pair to `migrations/0005_add_generation_cost_ref.{up,down}.sql`
- [ ] Extend `src/server/db/migrate.int.test.ts`: version list incl. 0005, column present/absent after up/down, query plan of the pending lookup uses `generations_cost_pending`

## Edge cases

| Case | Behaviour |
|---|---|
| rollback | column and index dropped; 0002–0004 untouched |

## Definition of Done

- [ ] migration 0005_add_generation_cost_ref applies and reverts cleanly; the pending lookup uses the partial index
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
