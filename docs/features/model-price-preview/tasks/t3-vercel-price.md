---
id: T3
title: "Map Vercel's inline model-list pricing to the price shape"
layer: "infra"
deps: ["T1", "T2"]
blocks: ["T4"]
acs: ["AC-01", "AC-03", "AC-04", "AC-05"]
files_hint: ["src/server/modules/providers/vercel.ts", "src/server/modules/providers/vercel-price.test.ts", "tests/fixtures/vercel/"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T3 — Map Vercel's inline model-list pricing to the price shape

## Place in the sequence

- **Blocked by:** T1 — Define the shared price shape and the estimate function, T2 — Map OpenRouter's per-model endpoints pricing to the price shape · **Blocks:** T4 — Expose the model price with a per-model 10-minute cache.
- **Lane:** shares `src/server/modules/providers/port.ts` with T3 via the adapters — serialized.

## Why (user story)

> **As an** Owner
> **I want** the model picker and the generate form to show the selected model's published price per image
> **So that** I can compare models before I spend anything
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: map Vercel's inline model-list pricing to the price shape.

## Inlined context

> Vercel: `pricing.image` → exact; else `image_dimension_quality_pricing` entries with a `size` → range; else `input`/`output` → per-token; else unknown
>
> — `sad.md §8, Mapping rules, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Reads the public Vercel model list (outbound only).

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has picked a model whose provider publishes one price per output image
> **When** the generate form is shown
> **Then** the form shows that price per image (e.g. «$0.0184 / image») and an estimate labelled as such for the current number of images (e.g. «Estimate ≈ $0.04 for 2 images»), and the estimate updates as soon as the Owner changes the number of images
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

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

- [ ] Keep each catalog entry's `pricing` when listing models
- [ ] `priceOf` answers from it, refreshing the listing once when the model isn't known

## Edge cases

| Case | Behaviour |
|---|---|
| `image_dimension_quality_pricing` with only `operation` entries | ignored → per-token or unknown |
| string prices | parsed as numbers; NaN → ignored |

## Definition of Done

- [ ] adapter tests over a fixture trimmed from the real /v1/models: `image` → exact, size list → range (operation entries ignored), input/output tokens → per-token, `{}` → unknown, unknown model → refresh once then unknown
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
