---
id: T5
title: "Say in the generate form when the suitable models are hidden"
layer: "ui"
deps: ["T2"]
blocks: []
acs: ["AC-04", "AC-10", "AC-13"]
files_hint: ["src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/ModelChoice.test.tsx", "src/shared/model-groups.ts", "src/shared/model-groups.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Say in the generate form when the suitable models are hidden

## Place in the sequence

- **Blocked by:** T2 — Share preference reads and a per-flag optimistic mutation between the picker and the Models page · **Blocks:** — · **Wave:** 2 — after the shared hook (same files).
- **Lane:** shares `GeneratePanel.tsx` with T2 — serialized.

## Why (user story)

> **As an** Owner
> **I want** a «show in picker» toggle on each model
> **So that** the Generate picker only offers the models I actually want to use, and I can bring a model back later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task points the Owner to the Models page instead of telling them to switch provider when hiding left nothing suitable.

## Inlined context

> when `pickModel` finds nothing visible but a hidden model would have been suitable, the panel's notice becomes «The <provider> models that <kind> are hidden — show one on the Models page.» (AC-13); the form never changes a model the Owner chose because it was hidden (step 9 AC-10).
>
> — `sad.md §4, item 5, verbatim` · full text: [sad.md](../sad.md)

> SCR-01 none suitable, hidden exist: «The <provider> models that take input images are hidden — show one on the Models page.» (or «All <provider> models are hidden — show one on the Models page.») with «Models page» as a link
>
> — `screens.md SCR-01, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-04 (US-02, US-03) — cross-context

> **Given** the Owner has changed a favorite or hidden a model on the Models page
> **When** the Owner opens the model picker in the Generate section, without reloading the page
> **Then** the generate form shows the change without a reload (favorites first, hidden models left out) — and a hidden model that is currently selected in the generate form stays selected and marked as hidden there, as step 9 defines; Ukiyo never switches a model the Owner chose because it was hidden
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-02) — domain invariant

> **Given** the Owner hides a model
> **When** the Owner looks at the gallery or re-runs a generation made with it
> **Then** past generations, their costs and the gallery are unchanged, and a re-run of that generation still selects the hidden model (step 9)
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)
### AC-13 (US-02) — cross-context

> **Given** the Owner has hidden every model of a provider that a generation needs (for example every model that takes input images)
> **When** the generate form can't pick a visible model on its own
> **Then** it says that the suitable models are hidden and that they can be shown again on the Models page, instead of saying the provider has none
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] a helper telling whether a hidden model would have been suitable (e.g. `hiddenSuitable(models, prefs, suitable)`) — `model-groups.ts` + unit test
- [ ] notice wording + link to /models — `GeneratePanel.tsx`
- [ ] component tests: hidden-suitable notice; Owner-chosen model hidden elsewhere stays selected and marked; re-run of a hidden model still selects it — `ModelChoice.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| no model takes inputs at all | step 6/9 wording unchanged |
| all models hidden | «All <provider> models are hidden — …» |
| selected model hidden on the Models page | stays selected, marked hidden |

## Definition of Done

- [ ] unit + component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
