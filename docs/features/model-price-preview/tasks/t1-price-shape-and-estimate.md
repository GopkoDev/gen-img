---
id: T1
title: "Define the shared price shape and the estimate function"
layer: "domain"
deps: []
blocks: ["T2", "T3", "T5"]
acs: ["AC-01", "AC-02", "AC-03", "AC-05"]
files_hint: ["src/shared/pricing.ts", "src/shared/pricing.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T1 — Define the shared price shape and the estimate function

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2 — Map OpenRouter's per-model endpoints pricing to the price shape, T3 — Map Vercel's inline model-list pricing to the price shape, T5 — Expose the Owner's known cost history per provider and model.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** an estimate for the request I'm about to send that follows the number of images and attached input images
> **So that** I know roughly what clicking Generate will cost
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: define the shared price shape and the estimate function.

## Inlined context

> | Price shape | `per-image {output: {minUsd, maxUsd}, input: {minUsd, maxUsd} | null}` · `per-token` · `unknown` | `src/shared/pricing.ts` |
>
> — `sad.md §8, Price shape, verbatim` · full text: [sad.md](../sad.md)

> Formatting: prices per image with 2–4 decimals as needed («$0.0184», «$0.04», «$0.007»); estimates rounded **up** to the cent with «≈» («≈ $0.04»); an estimate below one cent reads «≈ < $0.01».
>
> — `screens.md §SCR-01, Formatting, verbatim` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface (shared schemas used by T4/T5/T6).

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has picked a model whose provider publishes one price per output image
> **When** the generate form is shown
> **Then** the form shows that price per image (e.g. «$0.0184 / image») and an estimate labelled as such for the current number of images (e.g. «Estimate ≈ $0.04 for 2 images»), and the estimate updates as soon as the Owner changes the number of images
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** the provider bills input images per image for the selected model and the Owner has attached input images
> **When** the form shows the estimate
> **Then** the estimate includes the input images at their published price, and says so (e.g. «≈ $0.05 for 2 images + 1 input»)
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** the selected model has several published per-image prices (different resolutions or several provider endpoints)
> **When** the form shows the price
> **Then** it shows the range (e.g. «$0.045–$0.151 / image») and the estimate as a range, because gen-img doesn't choose the resolution or the endpoint
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — domain invariant

> **Given** the selected model is billed per token
> **When** the form is shown
> **Then** it says «priced per token» instead of a per-image price, and gives an estimate only if the Owner has past generations with this provider and model whose cost is known — labelled «≈ $X for N images, from your last K generations»; otherwise «no estimate before generating»
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] zod `UsdRange`, `ModelPrice` (per-image / per-token / unknown), `PriceResponse`, `CostHistory` in `src/shared/pricing.ts`
- [ ] `estimate({price, images, inputs, history})` → `{kind:'range', minUsd, maxUsd, inputsPriced, fromHistory?: K} | {kind:'none', reason}`
- [ ] Formatting helpers `formatUnitPrice`, `formatEstimate` (round up to the cent, «≈ < $0.01»)

## Edge cases

| Case | Behaviour |
|---|---|
| input price null | inputs not added, estimate says nothing about inputs |
| range min=max | shown as exact |
| history count 0 | no estimate for per-token |

## Definition of Done

- [ ] unit tests: per-image exact and range estimates incl. input images, rounding up to the cent, «< $0.01», per-token history estimate, unknown → no estimate
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
