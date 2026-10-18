---
id: T3
title: "Send input images through the OpenRouter adapter"
layer: "infra"
deps: ["T2"]
blocks: ["T5"]
acs: ["AC-02", "AC-07", "AC-11"]
files_hint: ["src/server/modules/providers/port.ts", "src/server/modules/providers/openrouter.ts", "src/server/modules/providers/openrouter.test.ts", "tests/fixtures/openrouter/models.json"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T3 — Send input images through the OpenRouter adapter

## Place in the sequence

- **Blocked by:** T2 — Validate input images and model input ranges in shared code · **Blocks:** T5 — Accept multipart starts with input images and expose inputs in the API.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to attach one or more input images to my prompt and generate
> **So that** I can change or combine existing pictures without a playground
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: send input images through the OpenRouter adapter.

## Inlined context

> OpenRouter Image API takes inputs as `input_references: [{type: "image_url", image_url: {url}}]` (URL or base64 data URL); the catalog lists `supported_parameters.input_references` as a `{min, max}` range per model.
>
> — `sad.md §2, Technical, verbatim` · full text: [sad.md](../sad.md)

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

Outbound only (OpenRouter); `ImageModel.params.inputs` appears in `listImageModels`.

— `contracts/openapi.yaml, ImageModel, abridged`

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner opens the generate form
> **When** the Owner chooses a model
> **Then** the form offers an input-images area only if the model accepts input images, states how many it accepts (e.g. «up to 4», «1 to 8»), and hides it for text-only models; gen-img caps any model at 8 input images per generation even when the model lists more
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — authorization

> **Given** generations with input images are stored
> **When** anyone asks gen-img for an input-image file that is not recorded as an input of a stored generation, or a foreign page asks for a recorded one
> **Then** the system reveals nothing — only gen-img's own pages get stored input images, and the stored raw request contains references to the stored copies, never the image data itself
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — cross-context

> **Given** the Owner generates without attaching any image on a model that doesn't require one
> **When** the generation runs
> **Then** it behaves exactly as a text-to-image generation from step 2 — nothing about inputs is sent or stored
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `GenerateInput.inputs?: {bytes, mediaType}[]` in `port.ts`
- [ ] Catalog: `supported_parameters.input_references` → `params.inputs = {min, max: min(8, max)}`; only when max ≥ 1
- [ ] Generate: body `input_references: [{type: "image_url", image_url: {url: "data:<type>;base64,…"}}]` when inputs exist; `rawRequest.body.input_references[i].image_url.url = {"$input": i+1}`
- [ ] Add an `input_references` range to a fixture model if missing; tests

## Edge cases

| Case | Behaviour |
|---|---|
| no inputs | no `input_references` key at all (AC-11) |
| model with min 1 | params.inputs.min = 1 |

## Definition of Done

- [ ] adapter unit tests on fixtures: catalog maps input_references to params.inputs (max capped at 8, absent → none); generate sends input_references data URLs in order; stored raw request holds {$input: N} placeholders, never data; zero inputs → body identical to step 2
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
