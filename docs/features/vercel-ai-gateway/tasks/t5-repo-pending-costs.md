---
id: T5
title: "Store cost references and resolve pending costs in the repo"
layer: "infra"
deps: ["T1", "T2"]
blocks: ["T6"]
acs: ["AC-05", "AC-06"]
files_hint: ["src/server/modules/generations/repo.ts", "src/server/modules/generations/repo.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T5 — Store cost references and resolve pending costs in the repo

## Place in the sequence

- **Blocked by:** T1 — Promote the cost_ref migration, T2 — Add the provider id, the port's cost reference and the pending-cost rule · **Blocks:** T6 — Resolve pending costs in the background and resume them on boot.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: store cost references and resolve pending costs in the repo.

## Inlined context

> resolve: `UPDATE generations SET cost_status = ?, cost_micros = ? WHERE id = ? AND cost_status = 'pending'` → PK. The guard on `pending` makes a late or duplicate lookup a no-op.
>
> — `data-model.md §generations, access patterns, verbatim` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.cost_ref` | TEXT | NULL | written + read |
| `generations.cost_status` / `cost_micros` | TEXT / INTEGER | CHECK known/pending/unavailable; known ⇔ cost_micros NOT NULL | pending → known/unavailable |

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

- [ ] `cost_ref` in insert + row schema
- [ ] `listPendingCosts()` → `{id, provider, costRef, answeredAt}` (createdAt + durationMs)
- [ ] `resolveCost(id, micros|null)` guarded by `cost_status = 'pending'`
- [ ] `seedGeneration` accepts `costRef`

## Edge cases

| Case | Behaviour |
|---|---|
| resolve on a known row | no change |
| pending row without ref | listed; resolver makes it unavailable |

## Definition of Done

- [ ] integration tests: insert keeps cost_ref; listPendingCosts returns provider, ref and answer time; resolveCost updates only pending rows (late lookups are no-ops)
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
