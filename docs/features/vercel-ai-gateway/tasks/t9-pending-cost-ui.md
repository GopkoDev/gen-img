---
id: T9
title: "Show pending costs that update themselves, and provider names"
layer: "ui"
deps: ["T7"]
blocks: []
acs: ["AC-05", "AC-12"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/PendingCost.test.tsx", "src/web/lib/format.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T9 — Show pending costs that update themselves, and provider names

## Place in the sequence

- **Blocked by:** T7 — Run the Vercel flow end to end through the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: show pending costs that update themselves, and provider names.

## Inlined context

> | cost pending | `costStatus = pending` (AC-05) | Cost row «pending» + Badge outline «pending» + muted «updates automatically»; never «$0» |
> | tile with pending cost | `costStatus = pending` (AC-05) | Badge outline «cost pending» next to the provider badge |
>
> — `screens.md §SCR-02/03, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `getGeneration`, `listGenerations`.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** a Vercel generation succeeded but its answer did not state a price
> **When** it is saved and the Owner opens it in the gallery or detail view
> **Then** it appears immediately with cost status «pending» — never as zero — and, without the Owner reloading, changes to the final amount (status «known») once the provider reports it, or to «unavailable» if the provider still has not reported it 10 minutes after the provider's answer arrived
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — happy path

> **Given** the gallery holds generations from both providers
> **When** the Owner browses it or opens a detail view
> **Then** every tile and detail view names the provider that made the generation, and generations from both providers are ordered together newest first
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Detail: `refetchInterval` 5000 while `costStatus === 'pending'`; «updates automatically» hint
- [ ] Gallery: tile Badge «cost pending»; `refetchInterval` 10000 while any loaded item pending
- [ ] PROVIDER_NAMES += vercel

## Edge cases

| Case | Behaviour |
|---|---|
| resolved to unavailable | «unavailable», polling stops |

## Definition of Done

- [ ] web tests: detail shows «pending» (never $) and refetches every 5 s until resolved; gallery tile shows «cost pending» and the gallery refetches every 10 s while any tile is pending; provider names OpenRouter / Vercel AI Gateway
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
