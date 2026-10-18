---
id: T5
title: "Accept multipart starts with input images and expose inputs in the API"
layer: "ports"
deps: ["T3", "T4"]
blocks: ["T6", "T7", "T8"]
acs: ["AC-01", "AC-03", "AC-04", "AC-05", "AC-06", "AC-09", "AC-11"]
files_hint: ["src/server/modules/generations/routes.ts", "src/server/modules/generations/service.ts", "src/server/modules/generations/domain.ts", "src/shared/generations.ts", "src/server/modules/generations/routes.int.test.ts", "src/server/modules/generations/service.int.test.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T5 — Accept multipart starts with input images and expose inputs in the API

## Place in the sequence

- **Blocked by:** T3 — Send input images through the OpenRouter adapter, T4 — Stage and record input copies with the generation · **Blocks:** T6 — Add the input-images area to the generate panel (SCR-01), T7 — Show the inputs hint on tiles and the inputs section on the detail page, T8 — Verify the input-image NFRs.
- **Lane:** shares files with T2 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to attach one or more input images to my prompt and generate
> **So that** I can change or combine existing pictures without a playground
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: accept multipart starts with input images and expose inputs in the API.

## Inlined context

> Option 1 — `POST /api/generations` accepts `multipart/form-data` with a `request` JSON part (the existing body) and `inputs` file parts in attach order; plain JSON keeps working for text-only.
>
> — `adr/0010, Considered options 1, verbatim` · full text: [ADR-0010](../adr/0010-accept-input-images-as-multipart-parts-of-the-start-generation-request.md)

> | Upload limits | ≤ 8 files, ≤ 10 MiB each (10 × 1024 × 1024 bytes); the route's body limit is 8 × 10 MiB + 1 MiB for fields; over the limit → `VALIDATION_ERROR` |
> | Raw exchange | input data URLs replaced by `{"$input": N}` in the adapter, linked to `{"$file": "generations/<id>/input-N.<ext>"}` on save |
> | Errors | per-file reasons in `VALIDATION_ERROR.details.fields` as `inputs.N` (1-based) |
>
> — `sad.md §8, three rows, abridged` · full text: [sad.md](../sad.md)

> alt any file invalid or count out of range → refused with per-file reasons · else valid → job accepted · … · Gen->>Store: stage outputs and input copies · Gen->>DB: insert generation, outputs, inputs (transaction)
>
> — `sad.md §6, Critical flow 1, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_inputs.*` (generation_id, position, path, media_type, width, height, byte_size, original_name) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; UNIQUE path; media_type IN png/jpeg/webp/gif; byte_size 1…10 485 760 | write (via repo) |

— `data-model.md §Entities, generation_inputs, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `startGeneration`: `multipart/form-data` (`request` JSON + `inputs[]` binary) or JSON → 202 `JobResponse` · 400 `VALIDATION_ERROR` (`inputs`, `inputs.N`) · 409.
- `getGeneration` → `inputs: InputImage[]`; `listGenerations` items → `inputsCount`; `getFile` serves recorded input paths.

— `contracts/openapi.yaml, operations, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has chosen a model that accepts input images and attached two supported images
> **When** the Owner writes a prompt and generates
> **Then** the generation is saved with copies of both input images, and its detail view shows the inputs in the order they were attached (no reordering in this slice — remove and re-attach to change it) next to the outputs; after success the attachments and the prompt stay in the form so the Owner can iterate, until the Owner removes them
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

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

### AC-06 — domain invariant

> **Given** a generation with input images succeeds at the provider but storing its files fails part-way
> **When** the save is attempted
> **Then** the invariant «a generation is saved only together with all its output images and copies of all its input images» holds: neither the generation nor any input copy remains, and the Owner is told why
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** the Owner generates with input images
> **When** the provider refuses (e.g. moderation of an input image, insufficient credits) or fails
> **Then** the Owner sees the provider's reason, the prompt and the attached images stay in the form, and nothing is saved
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — cross-context

> **Given** the Owner generates without attaching any image on a model that doesn't require one
> **When** the generation runs
> **Then** it behaves exactly as a text-to-image generation from step 2 — nothing about inputs is sent or stored
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Route: parse `multipart/form-data` (`request` JSON part + `inputs` files) or JSON; Hono `bodyLimit` 8 × 10 MiB + 1 MiB on POST /generations
- [ ] Service: `startGenerationChecked(body, files)` → `checkInputFile` per file, `checkAgainstModel(params, model, files.length)`; pass `inputs` to the provider; stage inputs; link `{"$input": N}` → `{"$file": path}`
- [ ] DTO: `Generation.inputs: InputImage[]`, `GenerationSummary.inputsCount` in `src/shared/generations.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| 8 × 10 MiB + fields | accepted |
| 9 files | 400 inputs |
| file part not an image | 400 inputs.N |
| multipart without request part | 400 |

## Definition of Done

- [ ] integration tests via app.request(): multipart with 2 PNGs → saved with input copies, detail lists inputs, raw request links {$file}; per-file and count errors → 400 with inputs.N / inputs, provider not called; storage failure leaves no input copies; JSON text-only unchanged; body over the limit → 400
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
