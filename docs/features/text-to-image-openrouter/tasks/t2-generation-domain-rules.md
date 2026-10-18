---
id: T2
title: "Implement generation domain rules: validation, params, cost conversion"
layer: "domain"
deps: []
blocks: ["T6"]
acs: ["AC-05", "AC-07"]
files_hint: ["src/server/modules/generations/domain.ts", "src/server/modules/generations/domain.test.ts", "src/shared/generations.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T2 — Implement generation domain rules: validation, params, cost conversion

## Place in the sequence

- **Blocked by:** — · **Blocks:** T6 — Write the generations repo: atomic insert, gallery page, detail, recorded path lookup.
- **Lane:** shares `src/shared/generations.ts` with T10 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: implement generation domain rules: validation, params, cost conversion.

## Inlined context

> Money | `usage.cost` USD → `Math.round(cost × 1e6)` micro-USD; absent → `cost_micros NULL`, `cost_status 'unavailable'`; this slice never writes `pending`
>
> — `sad.md §8, Money row, verbatim` · full text: [sad.md](../sad.md)

> | Cost precision | a known cost is kept exactly to 1 micro-USD (fractions of a cent never rounded to 0) | unit test over fractional-cent fixtures |
>
> — `spec.md §6, Cost precision, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `StartGenerationRequest` `{provider, model, prompt (1–10000, non-blank), params: {aspectRatio?, seed?, n 1–4}}`; validation failures → `400 VALIDATION_ERROR` with `details.fields`.

— `contracts/openapi.yaml, StartGenerationRequest, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-05 — error

> **Given** the Owner is on the generate form
> **When** the Owner tries to generate with an empty or whitespace-only prompt, no model selected, or a number of images outside 1–4 (or above what the model supports)
> **Then** the system does not send anything to the provider and tells the Owner which field must be fixed and how
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — domain invariant

> **Given** the provider's answer for a successful generation does not state a price
> **When** the generation is saved and the Owner opens it
> **Then** the cost status is «unavailable» and the cost is shown as «unavailable», never as zero — an unknown price is never presented as free; when the answer states a price, the status is «known» with that exact amount (this slice never marks a cost «pending»)
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Define zod schemas `RequestedParams` + `StartGenerationRequest` in `src/shared/generations.ts` (prompt non-blank, max 10000; n 1–4; optional aspectRatio, seed int)
- [ ] In `domain.ts`: `validateAgainstModel(req, model)` → per-field messages (aspect ratio not in model values, seed unsupported, n above model max)
- [ ] In `domain.ts`: `toCost(usd: number|undefined|null)` → `{costMicros, costStatus}` with `Math.round(usd*1e6)`; absent/null/NaN → `{null,'unavailable'}`
- [ ] Unit tests in `domain.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| prompt of only spaces/newlines | rejected: «Prompt must not be empty» |
| n = 0 or 5 | rejected: «Number of images must be between 1 and 4» |
| usd 0.000125 | 125 micro-USD, status known |
| usd 0 | 0 micro-USD, status known (a stated zero is known) |
| usage.cost missing | null + unavailable — never 0 |

## Definition of Done

- [ ] unit tests cover prompt/model/n validation against model support and USD→micro-USD conversion incl. fractional cents and missing cost
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
