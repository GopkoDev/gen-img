---
id: T6
title: "Add the input-images area to the generate panel (SCR-01)"
layer: "ui"
deps: ["T5"]
blocks: []
acs: ["AC-02", "AC-03", "AC-04", "AC-05", "AC-08", "AC-09"]
files_hint: ["src/web/features/generate/", "src/web/lib/api.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T6 — Add the input-images area to the generate panel (SCR-01)

## Place in the sequence

- **Blocked by:** T5 — Accept multipart starts with input images and expose inputs in the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** the form to show whether the chosen model takes input images and how many
> **So that** I don't send a request the model will refuse
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add the input-images area to the generate panel (SCR-01).

## Inlined context

> | empty | model takes inputs, none attached (AC-02) | dashed drop zone … + Button «Choose files» … + muted «Up to N images · PNG, JPEG, WebP, GIF · max 10 MB each» |
> | over limit | … thumbnails beyond the max get a destructive ring + Badge «not sent»; message «This model takes at most N input images — remove M»; Generate disabled |
>
> — `screens.md §SCR-01, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls `startGeneration` (multipart) via `src/web/lib/api.ts`.

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner opens the generate form
> **When** the Owner chooses a model
> **Then** the form offers an input-images area only if the model accepts input images, states how many it accepts (e.g. «up to 4», «1 to 8»), and hides it for text-only models; gen-img caps any model at 8 input images per generation even when the model lists more
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

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

### AC-08 — cross-context

> **Given** the Owner has attached images and then switches to another model
> **When** the new model accepts fewer input images or none at all
> **Then** the form keeps the attachments, marks the ones beyond the new model's maximum (the last-attached first; all of them when the model takes none), and blocks generating until the Owner removes them or switches back
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** the Owner generates with input images
> **When** the provider refuses (e.g. moderation of an input image, insufficient credits) or fails
> **Then** the Owner sees the provider's reason, the prompt and the attached images stay in the form, and nothing is saved
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `api.startGeneration(body, files?)` → multipart when files exist
- [ ] `InputImages.tsx` per SCR-01 states: drop zone + hidden file input, thumbnails (object URLs, revoked on remove/unmount), Remove buttons, per-file errors, over-limit marks
- [ ] Wire into `GeneratePanel.tsx`: validate with shared `checkInputFile` + `checkAgainstModel(params, model, files.length)`; keep attachments after success and failure

## Edge cases

| Case | Behaviour |
|---|---|
| drop non-image | «name — not a supported image» |
| switch to text-only model with 2 attached | both marked «not sent», Generate disabled |

## Definition of Done

- [ ] web tests (mocked api): area hidden for text-only models and shows the range otherwise; refused files explained, others kept; over-limit after a model switch marks extras and disables Generate; below minimum blocks; startGeneration called with files in order; failure keeps attachments
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
