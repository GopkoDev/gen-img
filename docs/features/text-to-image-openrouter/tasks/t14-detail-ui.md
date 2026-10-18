---
id: T14
title: "Build the generation detail page (SCR-03)"
layer: "ui"
deps: ["T11"]
blocks: []
acs: ["AC-02", "AC-07", "AC-09", "AC-10", "AC-16", "AC-18"]
files_hint: ["src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/GenerationDetail.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T14 — Build the generation detail page (SCR-03)

## Place in the sequence

- **Blocked by:** T11 — Add the typed web API client and the two-route router · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to open a generation and see its images, prompt, model, parameters, cost with its status, created-at, duration and the raw provider exchange
> **So that** I know exactly what produced the image and what it cost
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the generation detail page (SCR-03).

## Inlined context

> | default | `getGeneration` 200 (AC-02, AC-09, AC-16, AC-18) | … Card «Details» with rows: Provider, Model, Prompt …, Created, Duration, Cost + Badge status; Card «Parameters»: Requested / Received (N of M images, W×H each) / Accepted «not reported»; Card «Raw exchange» with two collapsible `<pre>` blocks … labelled «redacted» |
> | cost unavailable | (AC-07) | Cost row «unavailable» + Badge outline «unavailable» — never «$0» |
> | not found | 404 | text «Generation not found.» + Button «← Gallery» |
>
> — `screens.md §SCR-03, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `getGeneration` and `getFile` URLs.

## Acceptance criteria

### AC-02 — happy path

> **Given** a generation has just succeeded
> **When** the Owner opens its detail view
> **Then** the Owner sees the output images, provider, image model, prompt, the parameters the Owner set, created-at (the moment the Owner submitted; the gallery orders by it), duration (from sending the request to the provider until its answer arrived), the cost with its cost status, and the raw request and response the provider exchanged
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — domain invariant

> **Given** the provider's answer for a successful generation does not state a price
> **When** the generation is saved and the Owner opens it
> **Then** the cost status is «unavailable» and the cost is shown as «unavailable», never as zero — an unknown price is never presented as free; when the answer states a price, the status is «known» with that exact amount (this slice never marks a cost «pending»)
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

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

### AC-16 — domain invariant

> **Given** the Owner asked for several images
> **When** the provider returns fewer usable images than requested (but at least one)
> **Then** the system saves the generation with the images it received and the detail view states how many were requested and how many were received — a paid partial result is never thrown away
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** a generation was made through a provider
> **When** the Owner looks at it in the gallery or the detail view
> **Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `GenerationDetail.tsx` per SCR-03: back link, images row, Details card, Parameters card, Raw exchange card with collapsible `<pre>`
- [ ] Not found / error states

## Edge cases

| Case | Behaviour |
|---|---|
| cost known 0 | «$0.00» with Badge known (a stated zero) |
| acceptedParams null | «not reported» |

## Definition of Done

- [ ] web tests (mocked api): all metadata rows; cost «unavailable» never $0; requested vs «2 of 4 received» with dimensions; accepted «not reported»; raw exchange labelled redacted; not-found state
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
