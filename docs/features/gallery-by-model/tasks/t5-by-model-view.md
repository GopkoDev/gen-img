---
id: T5
title: "Show the gallery grouped by model"
layer: "ui"
deps: ["T4"]
blocks: ["T6"]
acs: ["AC-02", "AC-07"]
files_hint: ["src/web/features/gallery/ByModel.tsx", "src/web/features/gallery/ByModel.test.tsx", "src/web/features/gallery/Gallery.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Show the gallery grouped by model

## Place in the sequence

- **Blocked by:** T4 — Add the view switch, the model choice and the filtered grid · **Blocks:** T6 — Step, close and delete in the dialog within the view it was opened from · **Wave:** 4.
- **Lane:** shares `Gallery.tsx` — serialized.

## Why (user story)

> **As an** Owner
> **I want** a view with one section per model, each with its count and latest results
> **So that** I can compare models side by side
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task builds SCR-10.

## Inlined context

> SCR-10: per model a `section` (heading «<model>» + muted «<provider> · N generations» + «Show all N»); a row of up to four cards (the grid's card component, same badges); loading; error «Couldn't load the models.» + Try again; empty as the main grid
>
> — `screens.md SCR-10, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations/models?latest=4`.

## Acceptance criteria

### AC-02 (US-02) — happy path

> **Given** the Owner has generations with several models
> **When** the Owner switches the gallery to «By model»
> **Then** it shows one section per provider + model, the most recently used first; each section names the model and provider, shows its count and its latest four cards, and offers «Show all N», which opens that model's filtered grid
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-01, US-02) — error

> **Given** the model choice or «By model» can't be loaded right now
> **When** the Owner opens it
> **Then** a plain message with a way to try again is shown, and the main grid stays usable
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `ByModel` reusing the card — `ByModel.tsx`
- [ ] route `view=models` in the gallery
- [ ] tests: sections ordered, counts, four cards, Show all N opens the filter at the top, error, empty

## Edge cases

| Case | Behaviour |
|---|---|
| groups fail | message + Try again |
| no generations | main empty state |

## Definition of Done

- [ ] component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
