---
id: T2
title: "Map OpenRouter's per-model endpoints pricing to the price shape"
layer: "infra"
deps: ["T1"]
blocks: ["T3", "T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05"]
files_hint: ["src/server/modules/providers/port.ts", "src/server/modules/providers/openrouter.ts", "src/server/modules/providers/openrouter-price.test.ts", "tests/fixtures/openrouter/"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T2 — Map OpenRouter's per-model endpoints pricing to the price shape

## Place in the sequence

- **Blocked by:** T1 — Define the shared price shape and the estimate function · **Blocks:** T3 — Map Vercel's inline model-list pricing to the price shape, T4 — Expose the model price with a per-model 10-minute cache.
- **Lane:** shares `src/server/modules/providers/port.ts` with T3 via the adapters — serialized.

## Why (user story)

> **As an** Owner
> **I want** the model picker and the generate form to show the selected model's published price per image
> **So that** I can compare models before I spend anything
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: map OpenRouter's per-model endpoints pricing to the price shape.

## Inlined context

> OpenRouter: `output_image` + `unit: image` prices (all endpoints, all variants) → range; `input_image` + `unit: image` → input range; output billed per token only → per-token; no output price → unknown.
>
> — `sad.md §8, Mapping rules, abridged` · full text: [sad.md](../sad.md)

> **Chosen:** Option 1. … optional `priceOf(modelId)` on the port, loaded for the selected model only, cached per model 10 min
>
> — `adr/0020, outcome, abridged` · full text: [ADR-0020](../adr/0020-load-a-models-price-lazily-through-an-optional-port-method.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls OpenRouter's public endpoints listing (outbound only).

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

## Checklist

- [ ] Port: optional `priceOf?(modelId, signal): Promise<ModelPrice>`
- [ ] OpenRouter `priceOf`: GET `https://openrouter.ai/api/v1/images/models/{author}/{slug}/endpoints` (each segment URI-encoded), no key
- [ ] Mapping per SAD §8; tolerant zod; unrecognised → unknown
- [ ] Fixtures trimmed from real responses (2026-10-18) + README line

## Edge cases

| Case | Behaviour |
|---|---|
| model id with odd characters | segments encoded; adapter is only called for catalog models (T4) |
| endpoint list empty | unknown |

## Definition of Done

- [ ] adapter tests over recorded fixtures: per-image exact (qwen), per-image range over variants/endpoints, input_image per image, per-token (gpt-image-1), empty endpoints → unknown, failure → ProviderError, no authorization header
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
