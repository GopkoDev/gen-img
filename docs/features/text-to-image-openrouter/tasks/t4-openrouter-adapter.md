---
id: T4
title: "Define the ImageProvider port and build the OpenRouter adapter"
layer: "infra"
deps: ["T3"]
blocks: ["T7", "T9"]
acs: ["AC-03", "AC-06", "AC-09", "AC-10", "AC-14"]
files_hint: ["src/server/modules/providers/port.ts", "src/server/modules/providers/registry.ts", "src/server/modules/providers/openrouter.ts", "src/server/modules/providers/openrouter.test.ts", "tests/fixtures/openrouter/"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T4 — Define the ImageProvider port and build the OpenRouter adapter

## Place in the sequence

- **Blocked by:** T3 — Detect usable images: media type and dimensions from bytes · **Blocks:** T7 — Run generations as a single-slot job and save results atomically, T9 — Expose providers and the cached model catalog.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: define the ImageProvider port and build the OpenRouter adapter.

## Inlined context

> **Request** `POST https://openrouter.ai/api/v1/images` — `model` (req), `prompt` (req), `n` 1–10, `aspect_ratio`, `seed` (where supported) … **Response** `{"created":…, "data":[{"b64_json":"<base64>","media_type":"image/png"}], "usage":{…,"cost":0.04}}` — `media_type` optional; `usage.cost` USD «when available»; no generation id. **Catalog** `GET /api/v1/images/models` → `id`, `name`, `architecture.output_modalities`, `supported_parameters` (enum `values` / range `min`/`max` / boolean). **Errors** `{"error":{"code","message","metadata"?}}`; 402 insufficient credits, 403 moderation (`metadata.reasons`), 408 timeout, 429, 502 (unfinished → not billed), 503.
>
> — `researcher fact-check 2026-10-18 (openrouter.ai/docs/features/multimodal/image-generation, …/api-reference/errors), abridged` · full text: [spec.md §8](../spec.md)

> **Chosen:** Option 1 … `generate(input, signal)` returns `{ images: {bytes, mediaType, width, height}[], costMicros: number|null, acceptedParams: Record|null, rawRequest, rawResponse }` with images already decoded/validated and the raw exchange already redacted; failures throw `ProviderError {provider, upstreamStatus, message}`.
>
> — `adr/0004, Considered options 1 + Decision outcome, abridged` · full text: [ADR-0004](../adr/0004-return-a-normalized-generation-result-from-the-image-provider-port.md)

> the raw request is recorded as method + URL + JSON body + headers without `Authorization`; in the raw response every `b64_json` value is replaced with `{"$file": "<relative path>"}` once paths are known (generations fills the placeholders `{"$image": N}` the adapter left).
>
> — `adr/0008, option 1, verbatim` · full text: [ADR-0008](../adr/0008-redact-secrets-and-image-payloads-from-the-stored-raw-exchange.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls OpenRouter only (outbound); exposes nothing itself.

## Acceptance criteria

### AC-03 — happy path

> **Given** the Owner opens the generate form
> **When** the Owner opens the model picker
> **Then** the system lists the models OpenRouter offers for image output (by name and model id), no older than 10 minutes, so the Owner never has to type a model id from memory; after choosing a model, the form offers only the optional parameters (aspect ratio, seed, number of images) that this model is listed as supporting, with the allowed values the provider lists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — error

> **Given** the Owner submits a valid request
> **When** the provider refuses or fails it (e.g. insufficient credits, content moderation, model unavailable, timeout), or answers without a single usable image (an image that decodes to a non-empty PNG, JPEG, WebP or GIF picture)
> **Then** the system shows the Owner the provider's reason in plain language, keeps the prompt and settings in the form, and saves nothing to the gallery
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — domain invariant

> **Given** the Owner set a seed, an aspect ratio or a number of images
> **When** the generation is saved
> **Then** the detail view shows the parameters exactly as they were sent to the provider (the values the Owner chose), labelled «requested», next to what actually came back (number of images received, each image's real dimensions) and the parameters the provider reports it accepted — the provider reports none today, so this slice shows «not reported» — the system never claims a requested parameter was applied or that the result is pixel-reproducible
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — authorization

> **Given** the Owner has saved generations and a configured key
> **When** anyone inspects what the app shows in the browser — the generate form, the gallery, a detail view including the raw request
> **Then** the provider key appears nowhere; the stored raw request has the key removed
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** the provider's model list cannot be loaded (provider down, network off)
> **When** the Owner opens the model picker
> **Then** the system says the model list is unavailable and lets the Owner retry, while the gallery stays browsable
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `port.ts`: `ImageProvider { id, name, configured, listModels(signal), generate(input, signal) }`, `ImageModel`, `GenerateInput`, `GenerationResult {images:{bytes,mediaType,width,height}[], costMicros|null via raw usd, acceptedParams:null, rawRequest, rawResponse}`, `ProviderError {provider, upstreamStatus, message}`
- [ ] `registry.ts`: `createProviderRegistry(config, fetchImpl)` → map id → provider
- [ ] `openrouter.ts`: `listModels` → GET `https://openrouter.ai/api/v1/images/models`, map `supported_parameters` (aspect_ratio enum, seed, n range) to `ImageModel.params` (n max capped at 4)
- [ ] `openrouter.ts`: `generate` → POST `https://openrouter.ai/api/v1/images` with `Authorization: Bearer <key>`, body `{model, prompt, n, aspect_ratio?, seed?}`; decode `data[].b64_json`, keep only images `sniffImage` accepts; 0 usable → ProviderError «The provider returned no usable image»
- [ ] Redaction (ADR-0008): rawRequest = `{method, url, body}` (no headers); rawResponse = body with each `b64_json` replaced by `{"$image": <position>}` (positions of kept images; dropped ones `{"$image": null}`)
- [ ] Errors: non-2xx → ProviderError with `error.message` from `{error:{code,message,metadata}}` (moderation reasons appended), network/abort → ProviderError with upstreamStatus null and «timed out» on abort
- [ ] Recorded fixtures in `tests/fixtures/openrouter/` (models.json, images-success.json with tiny PNGs, images-no-cost.json, error-402.json, error-403-moderation.json)

## Edge cases

| Case | Behaviour |
|---|---|
| `media_type` absent | use the sniffed type |
| model ignores n and returns fewer | return what came; generations records requested vs received |
| 402 insufficient credits | ProviderError message «Your account or API key has insufficient credits…» |
| 403 moderation | message includes the flagged reasons |
| abort after 180 s | ProviderError «The provider did not answer within 180 s» |
| catalog model without image output | excluded |

## Definition of Done

- [ ] adapter unit tests against recorded fixtures: catalog mapping, success with 1..n images, missing cost, refusal statuses, zero usable images, timeout via abort signal, redaction (no key, b64 → placeholders)
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
