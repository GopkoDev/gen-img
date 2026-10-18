---
id: T4
title: "Expose the model price with a per-model 10-minute cache"
layer: "ports"
deps: ["T2", "T3"]
blocks: ["T6"]
acs: ["AC-04", "AC-07", "AC-09", "AC-10"]
files_hint: ["src/server/modules/providers/prices.ts", "src/server/modules/providers/routes.ts", "src/server/modules/providers/prices.int.test.ts", "src/server/app.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T4 — Expose the model price with a per-model 10-minute cache

## Place in the sequence

- **Blocked by:** T2 — Map OpenRouter's per-model endpoints pricing to the price shape, T3 — Map Vercel's inline model-list pricing to the price shape · **Blocks:** T6 — Show the price and the estimate in the generate panel (SCR-01).
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** the model picker and the generate form to show the selected model's published price per image
> **So that** I can compare models before I spend anything
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose the model price with a per-model 10-minute cache.

## Inlined context

> | Caching | price per (provider, model) in memory, 10 min; failures not cached; unknown model answered from the model catalog without a price request | `providers/prices.ts` |
>
> — `sad.md §8, Caching, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /providers/{providerId}/price?model=` → 200 `PriceResponse` · 400 · 403 · 404 · 409 · 502.

— `contracts/openapi.yaml, getModelPrice, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-04 — domain invariant

> **Given** the provider publishes no price for the selected model, or the price can't be loaded right now
> **When** the form is shown
> **Then** it says «price unknown» (with «couldn't load» when loading failed) — never $0 — and generating is still allowed
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — cross-context

> **Given** the Owner switches provider or model
> **When** the new model is selected
> **Then** the price and estimate shown belong to that provider's model only, and the parameters carried over to the new model (step 6) are kept as before
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — authorization

> **Given** gen-img is running
> **When** a page from another site in the Owner's browser asks gen-img for model prices or for the cost history of the Owner's generations
> **Then** gen-img refuses, like every other gen-img request (no data handed out)
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — error

> **Given** the Owner asks for the price of a model the provider doesn't offer
> **When** the request reaches gen-img
> **Then** gen-img answers that the model is unknown, without contacting the provider for prices again within the cache period
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `createPriceCatalog(providers, catalog, now)` keyed by provider+model; failures not cached
- [ ] Route GET `/providers/:providerId/price?model=` validating `model` (1–200 chars) and checking it against the model catalog first
- [ ] Wire in `createApp`

## Edge cases

| Case | Behaviour |
|---|---|
| adapter without priceOf | unknown |
| model query missing | 400 VALIDATION_ERROR |

## Definition of Done

- [ ] integration tests: price served and cached (≤ 1 provider request per model per 10 min, injected clock), failure → 502 not cached, unknown model → 404 without a price request, not configured → 409, foreign page → 403
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
