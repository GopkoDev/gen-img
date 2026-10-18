---
id: T7
title: "Keep supported parameters and name removed ones when the model changes"
layer: "ui"
deps: ["T6", "T2"]
blocks: []
acs: ["AC-05"]
files_hint: ["src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/CarryOver.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T7 — Keep supported parameters and name removed ones when the model changes

## Place in the sequence

- **Blocked by:** T6 — Fill the generate panel from a re-run or reuse source, T2 — Extend the shared start and detail schemas and add the parameter carry-over rule · **Blocks:** —.
- **Lane:** shares `GeneratePanel.tsx` with T6 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to switch the pre-filled request to another model or provider before generating
> **So that** I compare models on the same request safely
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: keep supported parameters and name removed ones when the model changes.

## Inlined context

> **One re-validation rule for every model switch** … when the model changes, the panel keeps each parameter the new model supports, removes the rest and names them, and lowers `n` to the model's maximum; the server's existing `checkAgainstModel` stays the final guard.
>
> — `sad.md §4, choice 4, abridged` · full text: [sad.md](../sad.md)

> | removed parameters | … «Not supported by this model: seed, aspect ratio. Images lowered to 1.» — cleared on the next change |
>
> — `screens.md §SCR-01, verbatim row` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** a re-run form pre-filled from a generation
> **When** the Owner switches to a model or provider that does not support some of the pre-filled parameters (seed, aspect ratio, number of images) or input images
> **Then** the system removes the unsupported parameters from the form and names each one to the Owner («not supported by this model: seed»), marks input images the new model cannot take, lowers the number of images to the new model's maximum and names that too, and never sends a parameter or image the chosen model does not support
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `selectModel` uses `carryParams` instead of resetting; keep a `removed` note until the next change
- [ ] Tests in `CarryOver.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| switching back | removed values are not restored (the note says what was removed) |

## Definition of Done

- [ ] web tests: switching a pre-filled draft to a model without seed / aspect ratio / with a lower image max keeps what fits, shows «Not supported by this model: …» and the lowered count; the request never carries a removed value
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
