---
id: T3
title: "Describe a model's supported parameters for the table"
layer: "domain"
deps: []
blocks: ["T4"]
acs: ["AC-01"]
files_hint: ["src/web/features/models/params.ts", "src/web/features/models/params.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Describe a model's supported parameters for the table

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Build the Models page section · **Wave:** 1 — pure.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a Models page listing every image model of each configured provider with its published price and the parameters it supports
> **So that** I can compare models without selecting them one by one
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task turns the catalog's parameter shape into the table's plain cells.

## Inlined context

> aspect ratios «1:1, 16:9, …» (all values), seed «yes», max images «up to N», inputs «0–N» / «1–N»; unsupported «—»
>
> — `sad.md §8, Parameters wording, verbatim` · full text: [sad.md](../sad.md)

> params: aspectRatio { values[] }?, seed { min?, max? }?, n { max 1–4 }?, inputs { min, max }? — an absent key means unsupported
>
> — `src/shared/providers.ts, ImageModel, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** at least one provider is configured
> **When** the Owner opens the Models section
> **Then** the page shows one table per configured provider, in the provider's order, with one row per image model: name, id, published price in step 7's short wording («$0.0184 / image», a range, «priced per token», «price unknown» or «price unknown — couldn't load», never $0), and the parameters the model supports — aspect ratios, seed, the most images per request and the input-image range, with «—» for what it doesn't support; rows appear before their prices arrive, a price still loading shows «…», and a row's price is looked up only once the row comes into view, so the table never asks for prices of rows the Owner hasn't scrolled to
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `describeParams(model)` → `{ aspectRatios, seed, images, inputs }` strings — `params.ts`
- [ ] unit tests — `params.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| no params | every cell «—» |
| inputs min 0 max 8 | «0–8» |
| n absent | «up to 1» |

## Definition of Done

- [ ] unit tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
