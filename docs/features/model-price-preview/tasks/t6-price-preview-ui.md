---
id: T6
title: "Show the price and the estimate in the generate panel (SCR-01)"
layer: "ui"
deps: ["T4", "T5"]
blocks: []
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-07", "AC-08"]
files_hint: ["src/web/lib/api.ts", "src/web/features/generate/PricePreview.tsx", "src/web/features/generate/PricePreview.test.tsx", "src/web/features/generate/GeneratePanel.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T6 — Show the price and the estimate in the generate panel (SCR-01)

## Place in the sequence

- **Blocked by:** T4 — Expose the model price with a per-model 10-minute cache, T5 — Expose the Owner's known cost history per provider and model · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** an estimate for the request I'm about to send that follows the number of images and attached input images
> **So that** I know roughly what clicking Generate will cost
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: show the price and the estimate in the generate panel (SCR-01).

## Inlined context

> | per-image | `price.kind = per-image`, min = max (AC-01) | muted «$0.0184 / image» · estimate «Estimate ≈ $0.04 for 2 images» | … | unknown | … muted «Price unknown» — no estimate line | couldn't load | … «Price unknown — couldn't load» |
>
> — `screens.md §SCR-01, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls `getModelPrice` and `getCostHistory`.

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

### AC-04 — domain invariant

> **Given** the provider publishes no price for the selected model, or the price can't be loaded right now
> **When** the form is shown
> **Then** it says «price unknown» (with «couldn't load» when loading failed) — never $0 — and generating is still allowed
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — domain invariant

> **Given** the selected model is billed per token
> **When** the form is shown
> **Then** it says «priced per token» instead of a per-image price, and gives an estimate only if the Owner has past generations with this provider and model whose cost is known — labelled «≈ $X for N images, from your last K generations»; otherwise «no estimate before generating»
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — cross-context

> **Given** the Owner switches provider or model
> **When** the new model is selected
> **Then** the price and estimate shown belong to that provider's model only, and the parameters carried over to the new model (step 6) are kept as before
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — cross-context

> **Given** a generation has finished
> **When** the Owner opens it in the gallery or detail view
> **Then** the cost shown is the recorded cost with its status (steps 2 and 4), never the estimate; the estimate is not stored with the generation
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `api.price(provider, model)`, `api.costHistory(provider, model)`
- [ ] `PricePreview` with TanStack queries (price; history only for per-token)
- [ ] Mount under the model picker + estimate above Generate in `GeneratePanel`

## Edge cases

| Case | Behaviour |
|---|---|
| price request 502 | «Price unknown — couldn't load» |
| model unknown 404 | «Price unknown» |

## Definition of Done

- [ ] web tests of every SCR-01 price state; estimate follows images/inputs; provider/model switch shows the new model's price and keeps the step-6 carry-over tests green; Generate never disabled by pricing
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
