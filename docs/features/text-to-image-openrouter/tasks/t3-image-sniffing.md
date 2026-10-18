---
id: T3
title: "Detect usable images: media type and dimensions from bytes"
layer: "domain"
deps: []
blocks: ["T4"]
acs: ["AC-06", "AC-09"]
files_hint: ["src/server/modules/providers/image-sniff.ts", "src/server/modules/providers/image-sniff.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T3 — Detect usable images: media type and dimensions from bytes

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Define the ImageProvider port and build the OpenRouter adapter.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: detect usable images: media type and dimensions from bytes.

## Inlined context

> | Usable image | a provider image that decodes to a non-empty PNG, JPEG, WebP or GIF picture (spec AC-06) |
>
> — `sad.md §12, Usable image, verbatim` · full text: [sad.md](../sad.md)

> Image dimension sniffing is hand-written for PNG/JPEG/WebP/GIF headers; SVG and other formats count as «not usable».
>
> — `sad.md §11, accepted debt, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

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

## Checklist

- [ ] `sniffImage(bytes: Uint8Array)` → `{mediaType, width, height} | null` reading headers only — `image-sniff.ts`
- [ ] Tiny hand-built fixtures for each format in the test

## Edge cases

| Case | Behaviour |
|---|---|
| 0 bytes | null (not usable) |
| SVG / text | null (not usable) |
| truncated header | null |
| JPEG with EXIF before SOF | dimensions from the SOFn marker |

## Definition of Done

- [ ] unit tests: PNG/JPEG/WebP(VP8/VP8L/VP8X)/GIF bytes return media type + width/height; empty, truncated or other formats return null
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
