---
id: T4
title: "Arrange models into favorites and others and pick models for automatic choices"
layer: "domain"
deps: []
blocks: ["T5"]
acs: ["AC-04", "AC-08", "AC-09", "AC-10", "AC-11"]
files_hint: ["src/shared/model-groups.ts", "src/shared/model-groups.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Arrange models into favorites and others and pick models for automatic choices

## Place in the sequence

- **Blocked by:** — · **Blocks:** T5 — Build the ModelPicker popover with prices and favorite toggles · **Wave:** 1 — pure, no deps.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my favorite models listed first, in their own group above all other models
> **So that** the models I use most are one click away
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** models I've hidden (from the Models page, step 10) left out of the picker, unless a re-run or my current selection needs one
> **So that** the picker only offers models I actually want to use
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task is the one rule set for what the Owner sees in the picker and what Ukiyo may pick on its own.

## Inlined context

> `arrangeModels(models, prefs, selectedId)` → `{ favorites, others, hiddenSelected? }`; `pickModel(arranged, suitable)` → first suitable favorite, else first suitable visible model, else none. Every automatic choice in the panel (first load, provider switch, re-run model not offered, reuse needs inputs) goes through `pickModel`, so the closed picker and the open list never disagree
>
> — `sad.md §4, item 4, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-04 (US-03) — happy path

> **Given** the Owner has marked one or more models of the current provider as favorites
> **When** the picker opens
> **Then** a «Favorites» group lists those models first and an «All models» group lists every other model below, each group in the provider's order; with no favorites the picker shows one plain list as before
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-04) — domain invariant

> **Given** a favorite or hidden model is no longer offered by its provider
> **When** the Owner opens the picker
> **Then** the model does not appear in any group (no entry for a model that can't be chosen), and its preference is kept so it comes back as before if the provider offers the model again
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-05) — happy path

> **Given** the Owner has hidden a model
> **When** the picker opens for that provider
> **Then** the hidden model is listed in neither group, even if it is also a favorite — except while it is the selected model (AC-10); when no model is hidden the picker lists every model
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-05) — cross-context

> **Given** the Owner re-runs a generation (step 6) whose model is now hidden, or whose model is already the selected one when it gets hidden
> **When** the generate form is filled with that model
> **Then** the model stays selected and is shown in the picker at the top of «All models», marked as hidden, for as long as it stays selected, so the draft can be generated as is; hiding a model never changes past generations, the gallery or the recorded costs
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)
### AC-11 (US-03) — cross-context

> **Given** the Owner switches provider in the generate form
> **When** the new provider's models are listed
> **Then** the groups, ★ states and prices shown are that provider's only; whenever Ukiyo picks a model by itself — on first load, after a provider switch, when a re-run's model isn't offered, or when a reuse needs a model that takes input images — it picks from the models the Owner sees in the picker: the first suitable favorite, otherwise the first suitable model of «All models», never a hidden one — when no visible model is suitable, Ukiyo selects nothing and says which kind of model is needed, as step 6 does; switching keeps the prompt, parameters and attachments as step 6 defines
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `arrangeModels` + `pickModel` (pure, provider order kept) — `src/shared/model-groups.ts`
- [ ] unit tests — `src/shared/model-groups.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| preferences for models not in the list | ignored (not listed anywhere) |
| hidden + favorite | in neither group |
| selected model hidden | returned as hiddenSelected, first in others |
| no visible model suitable | pickModel returns none |
| preferences unavailable (null) | plain list, nothing treated as hidden |

## Definition of Done

- [ ] unit tests for every edge case above pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
