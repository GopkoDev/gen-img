---
id: T6
title: "Resolve pending costs in the background and resume them on boot"
layer: "app"
deps: ["T4", "T5"]
blocks: ["T7"]
acs: ["AC-05", "AC-06", "AC-07", "AC-11"]
files_hint: ["src/server/modules/generations/cost-sync.ts", "src/server/modules/generations/cost-sync.test.ts", "src/server/modules/generations/service.ts", "src/server/modules/generations/service.int.test.ts", "src/server/app.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T6 — Resolve pending costs in the background and resume them on boot

## Place in the sequence

- **Blocked by:** T4 — Look up Vercel prices and register the adapter, T5 — Store cost references and resolve pending costs in the repo · **Blocks:** T7 — Run the Vercel flow end to end through the API.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: resolve pending costs in the background and resume them on boot.

## Inlined context

> `GenerationResult.costRef` and `ImageProvider.lookupCost(ref)`; `generations` saves `pending` with `cost_ref`, and a `cost-sync` component schedules bounded lookups in-process; on boot it re-reads every `pending` row and resumes (overdue rows get one final lookup).
>
> — `adr/0013, option 1, verbatim` · full text: [ADR-0013](../adr/0013-resolve-deferred-costs-with-a-bounded-db-driven-background-lookup.md)

> | Pending cost resolution | ≥ 95 % of pending costs reach «known» or «unavailable» within 10 min 30 s of the generation | … |
> | Price lookups per generation | ≤ 8 lookups, first one ≥ 5 s after the answer, backoff doubling to at most 60 s | unit test over the lookup schedule |
>
> — `spec.md §6, two rows, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.cost_ref` | TEXT | NULL | read |
| `generations.cost_status` / `cost_micros` | TEXT / INTEGER | CHECK known/pending/unavailable; known ⇔ cost_micros NOT NULL | pending written, then resolved |

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

### AC-07 — error

> **Given** the provider's price lookup fails or answers something unusable for a generation
> **When** the lookup gives up
> **Then** the generation's cost becomes «unavailable», the generation itself stays intact and visible, and the Owner is not shown an error for it
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — cross-context

> **Given** a generation is in progress on one provider
> **When** the Owner switches to the other provider and tries to generate
> **Then** the panel still shows «in progress» and does not submit — one generation at a time across both providers, so one click never spends twice
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `createCostSync({repo, providers, now, setTimer, clearTimer})` → `track(entry)`, `resume()`, `stop()`
- [ ] service: `costFromResult` + `cost_ref` on save; after save `costSync.track` when pending
- [ ] app: build cost-sync with injectable `now`/timers (AppDeps), `resume()` on boot after sweep

## Edge cases

| Case | Behaviour |
|---|---|
| provider without lookupCost | unavailable at once |
| lookup throws | treated as not-yet until limits, then unavailable |
| restart during backoff | resume reschedules within the deadline |

## Definition of Done

- [ ] tests with a fake clock/timers: schedule 5 s doubling to 60 s, ≤ 8 attempts, deadline answer+10 min → unavailable; known resolves; boot resume (young → scheduled, overdue → one lookup then unavailable, no ref → unavailable); service saves pending + tracks; one job slot across providers
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
