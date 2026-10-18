---
id: T6
title: "Use ModelPicker and pickModel in the generate panel"
layer: "ui"
deps: ["T5"]
blocks: []
acs: ["AC-10", "AC-11", "AC-14"]
files_hint: ["src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/GeneratePanel.test.tsx", "src/web/features/generate/CarryOver.test.tsx", "src/web/features/generate/DraftSource.test.tsx", "src/web/features/generate/InputImages.test.tsx", "src/web/features/generate/ProviderSelect.test.tsx", "src/web/AppShell.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T6 — Use ModelPicker and pickModel in the generate panel

## Place in the sequence

- **Blocked by:** T5 — Build the ModelPicker popover with prices and favorite toggles · **Blocks:** — · **Wave:** 3 — needs the picker.
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

This task makes every automatic model choice in the panel respect favorites and hidden models, and replaces the select.

## Inlined context

> Every automatic choice in the panel (first load, provider switch, re-run model not offered, reuse needs inputs) goes through `pickModel`, so the closed picker and the open list never disagree (AC-09…AC-11).
>
> — `sad.md §4, item 4, abridged` · full text: [sad.md](../sad.md)

> SCR-01 states: default (trigger shows name + filled ★ when favorite) · auto-picked · none suitable (trigger «Choose a model» + existing Notice) · hidden selected (name + muted «hidden»)
>
> — `screens.md SCR-01, abridged` · full text: [screens.md](../screens.md)

> Model switch (SAD §4 choice 4): keep what the new model supports, remove and name the rest.
>
> — `src/web/features/generate/GeneratePanel.tsx, selectModel comment, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface (reads preferences through the T2 client).

## Acceptance criteria

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
### AC-14 (US-04, US-05) — cross-context

> **Given** the Owner changes a favorite or hides a model somewhere else in Ukiyo (the Models page, step 10, or another tab)
> **When** the Owner opens the model picker in the generate form afterwards
> **Then** the picker shows the changed preferences without reloading the page
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] replace the `Select` with `ModelPicker` — `GeneratePanel.tsx`
- [ ] route the four automatic choices (default, provider switch, unavailable re-run model, reuse needs inputs) through `pickModel`
- [ ] rewrite select-driven tests against the picker (`GeneratePanel`, `CarryOver`, `DraftSource`, `InputImages`, `ProviderSelect`, `AppShell` tests)
- [ ] add tests: first favorite preselected; hidden model never auto-picked; hidden re-run model stays selected and marked

## Edge cases

| Case | Behaviour |
|---|---|
| favorites exist, first load | first favorite preselected |
| reuse needs inputs, only hidden models take them | nothing selected + notice |
| re-run with a hidden model | model kept selected, marked hidden |
| Owner chooses another model after that | hidden model disappears from the list |

## Definition of Done

- [ ] all generate-panel tests pass against the picker
- [ ] new tests for the automatic choices pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
