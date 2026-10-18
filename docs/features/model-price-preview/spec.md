---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "S"
---

# Spec — model-price-preview

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) step 7; shipped features' SADs/ADRs (0004–0019); public pricing sources checked 2026-10-18 without a key — OpenRouter `GET /api/v1/images/models/{author}/{slug}/endpoints` (`pricing[]`: `billable`, `unit`, `cost_usd`, optional `variant`) and Vercel AI Gateway `GET /v1/models` (`pricing`: `image`, `image_dimension_quality_pricing[]`, per-token `input`/`output`, or empty).

## 1. Context

Today the Owner learns what a generation cost only after it is made (step 2's cost with status). Choosing between models — or deciding to ask for 4 images instead of 1 — happens blind: the price per image differs by an order of magnitude between models (e.g. $0.007 vs $0.0184 vs $0.13 per image on the same day), and some models are billed per token, so the cost isn't even proportional to the number of images.

There is no external trigger; the Owner asked for it after the first real generations (roadmap step 7, 2026-10-18). Both providers publish prices without a key: OpenRouter per model and provider endpoint, Vercel AI Gateway inline in its public model list — so the price can be shown before anything is sent and before any money is spent.

Committed approach: when the Owner picks a model, the generate panel shows that model's published price per image and a clearly labelled estimate for the current request (number of images, and input images where the provider bills them per image). Models billed per token get an honest «priced per token» label and, when the Owner has generated with that model before, an estimate derived from the actual costs of their own past generations. The actual cost recorded after generating stays the only source of truth; an unknown price is shown as «price unknown», never as free.

- Traceability: price shapes source-verified 2026-10-18 (unauthenticated public GETs, recorded as test fixtures); Vercel image-only models may publish no price at all (`pricing: {}`), and some publish only size-dependent prices.

## 2. Goals

- The Owner sees what a model charges before generating, in the place where they choose the model.
- The Owner sees an estimate for the exact request they're about to send, and knows when it is only an approximation.
- Nothing about pricing is ever presented as more certain than it is: unknown prices stay visibly unknown, estimates never replace the recorded cost.

## 3. Non-goals

- Spending limits, budgets or confirmation prompts above a price — the Owner asked to see prices, not to be blocked.
- Sorting or filtering models by price — the picker stays a plain list (no filters in v1, idea-brief §5).
- Prices of models for which the provider publishes none — no guessing from other models.
- Changing how the actual cost of a generation is recorded (steps 2 and 4 own that).
- Currency conversion — prices are shown in USD as published.

## 4. User stories

### US-01: See the model's price while choosing

**As an** Owner
**I want** the model picker and the generate form to show the selected model's published price per image
**So that** I can compare models before I spend anything

### US-02: See an estimate for this request

**As an** Owner
**I want** an estimate for the request I'm about to send that follows the number of images and attached input images
**So that** I know roughly what clicking Generate will cost

### US-03: Know when a price is uncertain

**As an** Owner
**I want** per-token pricing and missing prices to be labelled honestly, with an estimate from my own past generations when one exists
**So that** I'm never misled into thinking something is cheaper or more certain than it is

## 5. Acceptance criteria

### AC-01 (US-01, US-02) — happy path

**Given** the Owner has picked a model whose provider publishes one price per output image
**When** the generate form is shown
**Then** the form shows that price per image (e.g. «$0.0184 / image») and an estimate labelled as such for the current number of images (e.g. «Estimate ≈ $0.04 for 2 images»), and the estimate updates as soon as the Owner changes the number of images

### AC-02 (US-02) — happy path

**Given** the provider bills input images per image for the selected model and the Owner has attached input images
**When** the form shows the estimate
**Then** the estimate includes the input images at their published price, and says so (e.g. «≈ $0.05 for 2 images + 1 input»)

### AC-03 (US-01, US-02) — happy path

**Given** the selected model has several published per-image prices (different resolutions or several provider endpoints)
**When** the form shows the price
**Then** it shows the range (e.g. «$0.045–$0.151 / image») and the estimate as a range, because gen-img doesn't choose the resolution or the endpoint

### AC-04 (US-03) — domain invariant

**Given** the provider publishes no price for the selected model, or the price can't be loaded right now
**When** the form is shown
**Then** it says «price unknown» (with «couldn't load» when loading failed) — never $0 — and generating is still allowed

### AC-05 (US-03) — domain invariant

**Given** the selected model is billed per token
**When** the form is shown
**Then** it says «priced per token» instead of a per-image price, and gives an estimate only if the Owner has past generations with this provider and model whose cost is known — labelled «≈ $X for N images, from your last K generations»; otherwise «no estimate before generating»

### AC-06 (US-03) — domain invariant

**Given** past generations with the selected provider and model have costs that are pending or unavailable
**When** an estimate from past generations is computed
**Then** only generations with a known cost count, and generations of other models or providers never count

### AC-07 (US-01) — cross-context

**Given** the Owner switches provider or model
**When** the new model is selected
**Then** the price and estimate shown belong to that provider's model only, and the parameters carried over to the new model (step 6) are kept as before

### AC-08 (US-02) — cross-context

**Given** a generation has finished
**When** the Owner opens it in the gallery or detail view
**Then** the cost shown is the recorded cost with its status (steps 2 and 4), never the estimate; the estimate is not stored with the generation

### AC-09 (US-01) — authorization

**Given** gen-img is running
**When** a page from another site in the Owner's browser asks gen-img for model prices or for the cost history of the Owner's generations
**Then** gen-img refuses, like every other gen-img request (no data handed out)

### AC-10 (US-01) — error

**Given** the Owner asks for the price of a model the provider doesn't offer
**When** the request reaches gen-img
**Then** gen-img answers that the model is unknown, without contacting the provider for prices again within the cache period

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Price shown after picking a model | gen-img's own work ≤ 100 ms p95 on top of one provider answer on a first pick; ≤ 50 ms p95 when cached | integration test with a stubbed provider + cache-hit test |
| Provider requests for prices | ≤ 1 per model per 10 minutes (same as the model list cache) | unit test over the price cache with an injected clock |
| Estimate from past generations | computed from at most the last 20 known costs of that provider + model; ≤ 50 ms p95 with 1 000 generations | integration test over a seeded data dir |
| Price lookups never send the Owner's key | 0 requests with an authorization header for prices | adapter tests assert headers |

## 6.1 Security / privacy

- **Data classification:** internal — public list prices; the cost history is derived from the Owner's own records.
- **Personal data touched:** none.
- **AuthZ/AuthN impact:** no new boundary; the new reads sit behind the existing request guard (ADR-0007); price lookups to providers are unauthenticated public reads.
- **Abuse cases:**
  - A foreign page reads the Owner's spending history: refused by the request guard (AC-09).
  - A crafted model id in the price request: treated as data — only looked up in the provider's catalog, never placed into a provider URL unvalidated.
  - Hammering price lookups to get gen-img throttled by a provider: one provider request per model per 10 minutes (§6).
- **Security review:** N/A — read-only public data behind the existing guard; no new secret use, no new write path.

## 7. Metrics / KPIs

- **Generations made with a price visible beforehand** — baseline: 0%, target: ≥ 90% of generations with an OpenRouter model within 2 weeks (owner check of the panel).
- **Estimate accuracy for per-image models** — baseline: n/a, target: the recorded cost is within the shown estimate range for ≥ 90% of per-image generations over 2 weeks (compare estimate vs recorded cost).
- **«$0» shown for an unknown price** — baseline: n/a, target: 0 occurrences.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->

## Test plan

<!-- quick route: inline per the size matrix (XS/S). -->

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | exact per-image price → «$X / image» + estimate for n; estimate follows n | unit (estimate) + component | T1, T6 |
| AC-02 | input images billed per image are added and named | unit + component | T1, T6 |
| AC-03 | several prices (variants / endpoints) → range + range estimate | unit (mapping, estimate) + component | T1, T2, T3, T6 |
| AC-04 | no published price / lookup failure → «price unknown» («couldn't load»), never $0, Generate enabled | unit (mapping) + integration (502 not cached) + component | T2, T3, T4, T6 |
| AC-05 | per-token → «priced per token» + history estimate or «no estimate before generating» | unit + integration + component | T1, T2, T3, T5, T6 |
| AC-06 | history uses only known costs of the same provider + model, last ≤ 20 | integration | T5 |
| AC-07 | switching provider/model shows the new model's price; step-6 carry-over tests stay green | component | T6 |
| AC-08 | detail/gallery show the recorded cost; no estimate is sent or stored | component (no request carries an estimate) | T6 |
| AC-09 | foreign page → refused for price and history | integration | T4, T5 |
| AC-10 | unknown model → not found, no price request | integration | T4 |

- **NFR:** price cache (≤ 1 provider request per model per 10 min, injected clock) — unit/integration; history ≤ 50 ms p95 over 1 000 generations and cached price ≤ 50 ms p95 — serial `nfr` project.
- **Test data:** pricing fixtures trimmed from real public responses (2026-10-18) under `tests/fixtures/openrouter/` and `tests/fixtures/vercel/`; seeded generations via `seedGeneration`.
