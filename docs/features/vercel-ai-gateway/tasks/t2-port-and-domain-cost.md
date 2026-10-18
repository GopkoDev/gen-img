---
id: T2
title: "Add the provider id, the port's cost reference and the pending-cost rule"
layer: "domain"
deps: []
blocks: ["T3", "T5"]
acs: ["AC-05", "AC-07"]
files_hint: ["src/shared/providers.ts", "src/server/modules/providers/port.ts", "src/server/modules/generations/domain.ts", "src/server/modules/generations/domain.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T2 — Add the provider id, the port's cost reference and the pending-cost rule

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Build the Vercel adapter: catalog and the three call paths, T5 — Store cost references and resolve pending costs in the repo.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add the provider id, the port's cost reference and the pending-cost rule.

## Inlined context

> `GenerationResult.costRef` and `ImageProvider.lookupCost(ref)`; `generations` saves `pending` with `cost_ref`, and a `cost-sync` component schedules bounded lookups in-process; on boot it re-reads every `pending` row and resumes (overdue rows get one final lookup).
>
> — `adr/0013, option 1, verbatim` · full text: [ADR-0013](../adr/0013-resolve-deferred-costs-with-a-bounded-db-driven-background-lookup.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** a Vercel generation succeeded but its answer did not state a price
> **When** it is saved and the Owner opens it in the gallery or detail view
> **Then** it appears immediately with cost status «pending» — never as zero — and, without the Owner reloading, changes to the final amount (status «known») once the provider reports it, or to «unavailable» if the provider still has not reported it 10 minutes after the provider's answer arrived
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — error

> **Given** the provider's price lookup fails or answers something unusable for a generation
> **When** the lookup gives up
> **Then** the generation's cost becomes «unavailable», the generation itself stays intact and visible, and the Owner is not shown an error for it
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `ProviderId` += `vercel` in `src/shared/providers.ts`
- [ ] `port.ts`: `GenerationResult.costRef?: string | null`; `CostLookup = {status:'known', costUsd} | {status:'not-yet'} | {status:'unavailable'}`; optional `ImageProvider.lookupCost?(ref, signal)`
- [ ] `domain.ts`: `costFromResult(costUsd, costRef)` (wraps `toCost`)

## Edge cases

| Case | Behaviour |
|---|---|
| price 0 stated | known 0 — a stated zero is a price |
| reference but price stated | known (price wins) |
| no price, no reference | unavailable |

## Definition of Done

- [ ] unit tests: costFromResult → known for a stated price, pending with a reference and no price, unavailable otherwise; ProviderId accepts vercel
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
