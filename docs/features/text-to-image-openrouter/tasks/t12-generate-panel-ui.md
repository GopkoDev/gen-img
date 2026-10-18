---
id: T12
title: "Build the generate panel (SCR-01) in all its states"
layer: "ui"
deps: ["T11"]
blocks: []
acs: ["AC-01", "AC-03", "AC-05", "AC-06", "AC-08", "AC-13", "AC-14", "AC-17"]
files_hint: ["src/web/features/generate/", "src/web/features/generate/GeneratePanel.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T12 — Build the generate panel (SCR-01) in all its states

## Place in the sequence

- **Blocked by:** T11 — Add the typed web API client and the two-route router · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the generate panel (SCR-01) in all its states.

## Inlined context

> | default | provider configured, no job running | Card, Select (model), Textarea (prompt), Select (aspect ratio), Input (seed, number), Input (images, number), Button |
> | models error | … (AC-14) | … Button «Retry» | not configured (AC-13) | validation (AC-05) | generating / in progress (AC-17) | success (AC-01) | failure (AC-06, AC-08) — destructive-tinted panel above the submit button: title + provider message + Button «Dismiss»; prompt and settings kept |
>
> — `screens.md §SCR-01, states table, abridged` · full text: [screens.md](../screens.md)

> **Errors:** inline — a field error under its field; a request-level error as a destructive-tinted panel above the form's submit button. No toasts.
>
> — `docs/design-system.md §Interaction, verbatim` · full text: [design-system.md](../../../design-system.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `listProviders`, `listImageModels`, `startGeneration`, `getCurrentJob`, `dismissJob` via `src/web/lib/api.ts`.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has configured an OpenRouter key and opened the generate form
> **When** the Owner selects an image model, enters a non-empty prompt and generates
> **Then** the system shows a «generating» state, then the resulting output images, and the new generation appears at the top of the gallery
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** the Owner opens the generate form
> **When** the Owner opens the model picker
> **Then** the system lists the models OpenRouter offers for image output (by name and model id), no older than 10 minutes, so the Owner never has to type a model id from memory; after choosing a model, the form offers only the optional parameters (aspect ratio, seed, number of images) that this model is listed as supporting, with the allowed values the provider lists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — error

> **Given** the Owner is on the generate form
> **When** the Owner tries to generate with an empty or whitespace-only prompt, no model selected, or a number of images outside 1–4 (or above what the model supports)
> **Then** the system does not send anything to the provider and tells the Owner which field must be fixed and how
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — error

> **Given** the Owner submits a valid request
> **When** the provider refuses or fails it (e.g. insufficient credits, content moderation, model unavailable, timeout), or answers without a single usable image (an image that decodes to a non-empty PNG, JPEG, WebP or GIF picture)
> **Then** the system shows the Owner the provider's reason in plain language, keeps the prompt and settings in the form, and saves nothing to the gallery
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
> **When** the save is attempted
> **Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — cross-context

> **Given** no OpenRouter key is configured on the server
> **When** the Owner opens the generate form
> **Then** the system tells the Owner that OpenRouter is not configured and how to configure it, and generation is not offered; the gallery of earlier generations stays browsable
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** the provider's model list cannot be loaded (provider down, network off)
> **When** the Owner opens the model picker
> **Then** the system says the model list is unavailable and lets the Owner retry, while the gallery stays browsable
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** a generation is in progress
> **When** the Owner closes or reloads the page before it finishes
> **Then** the generation still completes and appears in the gallery; only one generation can be in progress in gen-img at a time — any open or reloaded generate form shows «in progress» and cannot submit another until it ends, so one click never spends twice; if that generation fails or cannot be stored while no page is watching, the reason is shown the next time the Owner opens the generate form, until the Owner dismisses it
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `GeneratePanel.tsx` composing Card, Select, Textarea, Input, Button, Badge per SCR-01
- [ ] TanStack Query: providers, models (on picker open), currentJob (on mount + window focus; `refetchInterval` 1000 while running)
- [ ] Client validation mirroring T2 messages; server `details.fields` mapped to fields
- [ ] On success invalidate the gallery query

## Edge cases

| Case | Behaviour |
|---|---|
| job finished while tab hidden | on focus shows the result or the failure notice |
| 409 in progress on submit | form switches to «in progress» |

## Definition of Done

- [ ] web tests (mocked api): not-configured state; models loading/error+retry; only supported params shown; client validation messages; generating locks the form; failure panel with provider reason + dismiss keeps prompt; success shows latest result; running job from another tab shows «in progress»
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
