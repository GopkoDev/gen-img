---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "S"
ticket: "roadmap step 7"
---

# 0021 — Estimate per-token models from the Owner's last known costs

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Per-token models (e.g. `openai/gpt-image-1`) can't be estimated from their published rates: the number of tokens per image depends on quality and size the provider decides. The Owner still wants an approximate estimate (roadmap step 7), and spec AC-05/AC-06 require it to be honest.

## Decision drivers

- Spec AC-05, AC-06: only known costs, same provider and model, clearly labelled.
- Spec §6: ≤ 50 ms p95 with 1 000 generations.
- No invented numbers (spec §3).

## Considered options

1. **Average per image over the last ≤ 20 known costs of the same provider + model** — labelled «from your last K generations»; none → «no estimate before generating».
2. **Token heuristic** — assume a typical token count per image and multiply by the published rate.
3. **No estimate for per-token models** — only «priced per token».

## Decision outcome

**Chosen:** Option 1. It uses real, recorded costs of the Owner's own requests and says where the number comes from. Option 2 invents a token count the provider doesn't publish; option 3 is honest but gives up on information the Owner already has.

## Consequences

**Positive**
- Estimates improve as the Owner uses a model; they are based on what was actually charged.

**Negative**
- The first generation with a per-token model has no estimate.
- Past requests with different settings skew the average (shown as «≈», from K generations).

**Neutral**
- The same history could later back estimates for models with unknown per-image prices; not done now (spec §3).

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0020-load-a-models-price-lazily-through-an-optional-port-method]]
