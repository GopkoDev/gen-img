---
id: T5
title: "Expose the Owner's known cost history per provider and model"
layer: "ports"
deps: ["T1"]
blocks: ["T6"]
acs: ["AC-05", "AC-06", "AC-09"]
files_hint: ["src/server/modules/generations/repo.ts", "src/server/modules/generations/routes.ts", "src/server/modules/generations/cost-history.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T5 — Expose the Owner's known cost history per provider and model

## Place in the sequence

- **Blocked by:** T1 — Define the shared price shape and the estimate function · **Blocks:** T6 — Show the price and the estimate in the generate panel (SCR-01).
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** per-token pricing and missing prices to be labelled honestly, with an estimate from my own past generations when one exists
> **So that** I'm never misled into thinking something is cheaper or more certain than it is
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose the Owner's known cost history per provider and model.

## Inlined context

> **Chosen:** Option 1. Average per image over the last ≤ 20 known costs of the same provider + model
>
> — `adr/0021, outcome, abridged` · full text: [ADR-0021](../adr/0021-estimate-per-token-models-from-the-owners-last-known-costs.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Read-only: `generations` (provider, model, cost_status, cost_micros, id) + count of `generation_images` — no schema change.

## API contract

- `GET /generations/cost-history?provider=&model=` → 200 `CostHistory` · 400 · 403.

— `contracts/openapi.yaml, getCostHistory, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-05 — domain invariant

> **Given** the selected model is billed per token
> **When** the form is shown
> **Then** it says «priced per token» instead of a per-image price, and gives an estimate only if the Owner has past generations with this provider and model whose cost is known — labelled «≈ $X for N images, from your last K generations»; otherwise «no estimate before generating»
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** past generations with the selected provider and model have costs that are pending or unavailable
> **When** an estimate from past generations is computed
> **Then** only generations with a known cost count, and generations of other models or providers never count
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — authorization

> **Given** gen-img is running
> **When** a page from another site in the Owner's browser asks gen-img for model prices or for the cost history of the Owner's generations
> **Then** gen-img refuses, like every other gen-img request (no data handed out)
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Repo `costHistory(provider, model, limit=20)` over generations + image counts
- [ ] Route GET `/generations/cost-history?provider=&model=`

## Edge cases

| Case | Behaviour |
|---|---|
| pending / unavailable costs | excluded |
| another model with the same prefix | excluded (exact match) |

## Definition of Done

- [ ] integration tests: only known costs of the same provider+model, last ≤ 20, average per received image in micro-USD, count 0 → null, foreign page → 403; NFR ≤ 50 ms p95 with 1 000 generations in the nfr project
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
