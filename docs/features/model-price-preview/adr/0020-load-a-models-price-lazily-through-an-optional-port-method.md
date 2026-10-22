---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 7"
---

# 0020 — Load a model's price lazily through an optional port method

- **Status:** Accepted — amended by [ADR-0027](../../model-picker-preferences/adr/0027-look-up-every-listed-models-price-when-the-picker-opens-deduplicated-and-capped-on-the-server.md) (2026-10-19): prices are also loaded for every model listed in an open picker
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

OpenRouter publishes image prices per model (`/images/models/{id}/endpoints`), not in its model list; Vercel publishes them inline in the model list gen-img already loads. The panel needs the selected model's price (spec AC-01…AC-05, AC-10) without branching on provider outside the adapters.

## Decision drivers

- Spec §6: ≤ 1 provider request per model per 10 minutes; cached price ≤ 50 ms p95.
- CLAUDE.md / ADR-0004: provider differences stay inside adapters.
- Spec AC-04: anything unknown or failing must read «price unknown», never block.

## Considered options

1. **Optional `priceOf(modelId)` on the port, loaded for the selected model only, cached per model 10 min** — adapters map their format to one `ModelPrice` shape; an adapter without it means «price unknown».
2. **Prices inside `listModels`** — every adapter returns prices with the catalog; OpenRouter would need one endpoints request per model (≈ 60) on every catalog refresh.
3. **A separate pricing module that knows each provider's pricing URL** — pricing outside the adapters.

## Decision outcome

**Chosen:** Option 1. It costs one request per model the Owner actually looks at and keeps provider formats inside the adapters. Option 2 multiplies requests for prices nobody looks at and slows the model list; option 3 splits provider knowledge across two modules, which ADR-0004 rules out.

## Consequences

**Positive**
- Picker loading is unchanged; prices appear for the selected model only. *(Superseded by ADR-0027: every listed model once the picker opens.)*
- New providers add pricing by implementing one optional method.

**Negative**
- The picker's option list can't show prices (accepted, SAD §11). *(Superseded by ADR-0027.)*
- One extra request on the first selection of each OpenRouter model per 10 minutes.

**Neutral**
- Vercel's adapter answers from the listing it already holds, refreshing it when needed.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0004](../../text-to-image-openrouter/adr/0004-return-a-normalized-generation-result-from-the-image-provider-port.md), [[0021-estimate-per-token-models-from-the-owners-last-known-costs]]
