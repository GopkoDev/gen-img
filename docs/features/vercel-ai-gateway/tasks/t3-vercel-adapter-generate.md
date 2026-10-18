---
id: T3
title: "Build the Vercel adapter: catalog and the three call paths"
layer: "infra"
deps: ["T2"]
blocks: ["T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-08", "AC-13"]
files_hint: ["src/server/modules/providers/vercel.ts", "src/server/modules/providers/vercel.test.ts", "tests/fixtures/vercel/"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T3 — Build the Vercel adapter: catalog and the three call paths

## Place in the sequence

- **Blocked by:** T2 — Add the provider id, the port's cost reference and the pending-cost rule · **Blocks:** T4 — Look up Vercel prices and register the adapter.
- **Lane:** shares files with T4 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to generate from a prompt with any Vercel image model — an image-only model or a multimodal language model — through the same form
> **So that** I don't have to know how the gateway calls each kind of model
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the Vercel adapter: catalog and the three call paths.

## Inlined context

> One adapter, call path chosen per model from the catalog — the adapter keeps a model-id → kind map from the catalog it lists; `generate` routes: inputs present → edits; else image model → generations; else chat model → chat.
>
> — `adr/0012, option 1, verbatim` · full text: [ADR-0012](../adr/0012-pick-the-vercel-call-path-per-model-inside-one-adapter.md)

> Base `https://ai-gateway.vercel.sh/v1`, `Authorization: Bearer <key>`. `POST /images/generations` `{model, prompt, n, response_format:"b64_json"}` → `{data:[{b64_json}]}`; `POST /images/edits` JSON `{model, prompt, images:[{image_url: "data:…"}]}` → same shape; `POST /chat/completions` `{model, messages, modalities:["text","image"], stream:false}` → `{id, choices[0].message.{content, images[].image_url.url (data URI)}, usage}` — `id` is the generation id. `GET /models` (public): `type`, `tags`, `modalities.input`, `pricing`. Errors `{error:{message,type}}`.
>
> — `Vercel AI Gateway docs (image generation via chat completions, REST API), accessed 2026-10-18, abridged` · full text: [sad.md §2](../sad.md)

> | Call-path choice | … `type: image` → images API; `type: language` + tag `image-generation` → chat (`modalities: ["text","image"]`); any inputs → `/images/edits` with `images[].image_url` data URLs |
> | Parameters offered | Vercel: `n` ≤ 4 for image-only, 1 for chat models; inputs where catalog input modalities include image (≤ 8); never seed / aspect ratio |
> | Money | … else cost reference present → `pending`; else `unavailable`. Lookup: non-BYOK → `total_cost`; BYOK → `upstream_inference_cost` if > 0 (D3), else `unavailable` |
> | Raw exchange | Vercel: `data[].b64_json` and chat `message.images[].image_url.url` → `{"$image": N}`; edit inputs → `{"$input": N}`; no `Authorization` |
>
> — `sad.md §8, four rows, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls Vercel AI Gateway only (outbound).

## Acceptance criteria

### AC-01 — happy path

> **Given** both providers are configured and the Owner selects Vercel AI Gateway in the generate panel
> **When** the Owner picks an image-only model, enters a prompt and generates
> **Then** the system shows «generating», then the output images, and the new generation appears at the top of the gallery labelled with Vercel AI Gateway
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** the Owner selected Vercel AI Gateway
> **When** the Owner picks a multimodal language model that can produce images and generates from a prompt
> **Then** the result is saved and shown exactly like an image-only model's result; any text the model returns alongside the images is kept in the stored provider answer, not shown as an image
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** the Owner opens the model picker with Vercel AI Gateway selected
> **When** the list loads
> **Then** it lists only the gateway models that can produce images — image-only models and multimodal language models the gateway's catalog marks as image-generating — by name and model id, and switching provider switches the list; the form offers up to 4 images per request for image-only models and exactly 1 for multimodal language models, input images only for models the catalog lists as taking image input (at most 8), and never a seed or aspect ratio control
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — happy path

> **Given** the Owner selected a Vercel model that accepts input images
> **When** the Owner attaches images, writes a prompt and generates
> **Then** the generation is saved with copies of the input images, exactly like an OpenRouter generation with inputs
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — error

> **Given** the Owner submits a valid Vercel request
> **When** the gateway refuses or fails it (insufficient credits, moderation, unavailable model, timeout) or answers without a usable image
> **Then** the system shows the provider's reason in plain language, keeps the prompt, settings and attachments, and saves nothing — as for OpenRouter
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** the Vercel key is configured
> **When** anyone inspects what the app shows in the browser — the panel, the gallery, a detail view including the raw request — or the stored data
> **Then** the Vercel key appears nowhere, and price lookups are made only by gen-img itself, never by the browser
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `listModels`: public `GET /models`; keep `type: image` and `type: language` with tag `image-generation`; map n (4 / 1) and inputs (modalities.input includes image → {min 0, max 8}); remember model kinds
- [ ] `generate`: kind lookup (refresh catalog if unknown) → route per ADR-0012; build bodies; parse `data[].b64_json` or `choices[0].message.images[].image_url.url`; sniff usable images; redact to `{$image:N}` / `{$input:N}`; `costRef` from `id` or `providerMetadata.gateway.generationId` when present (D6)
- [ ] Errors `{error:{message,type}}` → `ProviderError('vercel', status, message)`
- [ ] Fixtures in `tests/fixtures/vercel/` (models trimmed from the public catalog; answers handcrafted from the docs)

## Edge cases

| Case | Behaviour |
|---|---|
| model unknown after refresh | ProviderError «Model not offered by Vercel AI Gateway» |
| chat answer with text only | no usable image → failure |
| data URL with unsupported type | not usable |

## Definition of Done

- [ ] adapter unit tests on fixtures: catalog → image-producing models only with n/inputs per kind; generations, edits (inputs) and chat paths send the documented bodies; images decoded and redacted; chat id returned as cost reference; errors carry the gateway reason; abort → timeout error; no key → not configured
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
