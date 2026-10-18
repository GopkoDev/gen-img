---
id: T2
title: "Validate input images and model input ranges in shared code"
layer: "domain"
deps: []
blocks: ["T3"]
acs: ["AC-03", "AC-04", "AC-05"]
files_hint: ["src/shared/generations.ts", "src/shared/providers.ts", "src/shared/image-sniff.ts", "src/server/modules/providers/image-sniff.ts", "src/server/modules/generations/domain.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T2 — Validate input images and model input ranges in shared code

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Send input images through the OpenRouter adapter.
- **Lane:** shares files with T5 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to attach one or more input images to my prompt and generate
> **So that** I can change or combine existing pictures without a playground
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: validate input images and model input ranges in shared code.

## Inlined context

> | Upload limits | ≤ 8 files, ≤ 10 MiB each (10 × 1024 × 1024 bytes); the route's body limit is 8 × 10 MiB + 1 MiB for fields; over the limit → `VALIDATION_ERROR` |
> | Raw exchange | input data URLs replaced by `{"$input": N}` in the adapter, linked to `{"$file": "generations/<id>/input-N.<ext>"}` on save |
> | Errors | per-file reasons in `VALIDATION_ERROR.details.fields` as `inputs.N` (1-based) |
>
> — `sad.md §8, three rows, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Validation failures surface as `400 VALIDATION_ERROR` with `details.fields.inputs` (count) / `inputs.N` (file).

— `contracts/openapi.yaml, startGeneration 400, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-03 — error

> **Given** the Owner attaches files
> **When** a file is not a PNG, JPEG, WebP or GIF picture (e.g. HEIC, PDF, a broken file) or is larger than 10 MB (10 × 1024 × 1024 bytes)
> **Then** the system refuses that file with the reason («not a supported image», «larger than 10 MB»), keeps the other attachments, and nothing is sent; the same file may be attached twice and then counts twice
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — error

> **Given** the chosen model accepts at most N input images (N = the smaller of the model's maximum and 8)
> **When** the Owner attaches more than N and tries to generate
> **Then** the system blocks the request and tells the Owner the model takes at most N input images
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — domain invariant

> **Given** the chosen model requires at least one input image (an edit-only model)
> **When** the Owner tries to generate without attaching any
> **Then** the system blocks the request and tells the Owner this model needs at least one input image
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Move `sniffImage` to `src/shared/image-sniff.ts` (pure; re-export from `providers/image-sniff.ts`) so the browser validates identically
- [ ] `ImageModel.params.inputs?: {min, max}` in `src/shared/providers.ts`
- [ ] `MAX_INPUT_IMAGES = 8`, `MAX_INPUT_BYTES = 10 * 1024 * 1024`, `checkInputFile(bytes, name)` → `{ok, image} | {ok:false, message}` and `checkAgainstModel(params, model, inputCount = 0)` in `src/shared/generations.ts`
- [ ] Unit tests

## Edge cases

| Case | Behaviour |
|---|---|
| model without params.inputs, 1 file | «This model does not accept input images» |
| min 1, 0 files | «This model needs at least 1 input image» |
| max 4, 5 files | «This model takes at most 4 input images» |
| HEIC bytes | «not a supported image» |
| 10 MiB + 1 byte | «larger than 10 MB» |

## Definition of Done

- [ ] unit tests: checkAgainstModel flags too few / too many inputs and inputs on a text-only model; checkInputFile refuses non-images and > 10 MiB with per-file messages
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
