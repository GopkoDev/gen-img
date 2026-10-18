---
id: T2
title: "Share preference reads and a per-flag optimistic mutation between the picker and the Models page"
layer: "app"
deps: []
blocks: ["T4", "T5"]
acs: ["AC-04", "AC-05"]
files_hint: ["src/web/features/models/preferences.ts", "src/web/features/models/preferences.test.tsx", "src/web/features/generate/useModelPreferences.ts", "src/web/features/generate/ModelPicker.tsx", "src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/PricePreview.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Share preference reads and a per-flag optimistic mutation between the picker and the Models page

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Build the Models page section, T5 — Say in the generate form when the suitable models are hidden · **Wave:** 1 — no deps.
- **Lane:** shares `ModelPicker.tsx`/`GeneratePanel.tsx` with T5 — serialized.

## Why (user story)

> **As an** Owner
> **I want** a «show in picker» toggle on each model
> **So that** the Generate picker only offers the models I actually want to use, and I can bring a model back later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** the same ★ favorite toggle on the Models page as in the picker
> **So that** I can curate my favorites while comparing models
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task gives both screens one way to change preferences, so toggles never clobber each other and both screens agree.

## Inlined context

> per named flag: optimistic set, rollback of that flag only, success writes that flag only; shared `mutationKey: ["set-model-preference", provider]`; `onSettled` invalidates `["model-preferences", provider]` only when `isMutating({ mutationKey }) === 1` (no sibling still in flight)
>
> — `sad.md §8, Optimistic preference change, verbatim` · full text: [sad.md](../sad.md)

> `useShortPrice` … `retry: false` always; `retryOnMount: true` on this page …, `false` in the picker; key shared with the picker
>
> — `sad.md §8, Price lookups on the page, abridged` · full text: [sad.md](../sad.md)

> src/web/features/models/preferences.ts — useModelPreferences (moved from generate) + useSetModelPreference (ADR-0030)
>
> — `sad.md §5, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Calls `GET /api/model-preferences?provider=` and `PATCH /api/model-preferences` through `api.modelPreferences` / `api.setModelPreference`.

— `contracts/openapi.yaml` (step 9 + delta), abridged

## Acceptance criteria

### AC-04 (US-02, US-03) — cross-context

> **Given** the Owner has changed a favorite or hidden a model on the Models page
> **When** the Owner opens the model picker in the Generate section, without reloading the page
> **Then** the generate form shows the change without a reload (favorites first, hidden models left out) — and a hidden model that is currently selected in the generate form stays selected and marked as hidden there, as step 9 defines; Ukiyo never switches a model the Owner chose because it was hidden
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-02, US-03) — error

> **Given** Ukiyo can't save a change (it is unreachable or refuses it)
> **When** the Owner switches ★ or «show in picker» on a row
> **Then** that toggle returns to its previous state, the row says in plain words that the change couldn't be saved, and other rows and toggles — including the other toggle of the same row — keep the state the Owner last set
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] move `useModelPreferences` + `modelPreferencesKey` to `src/web/features/models/preferences.ts` (update imports)
- [ ] add `useSetModelPreference(provider)` with per-flag optimistic set/rollback/success and guarded invalidation
- [ ] switch `ModelPicker` to the hook (its tests stay green)
- [ ] `useShortPrice(provider, model, enabled, { retryOnMount })` option; `retry` stays false — `PricePreview.tsx`
- [ ] hook tests with deferred responses — `preferences.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| ★ then hide on one row, ★ fails | only favorite reverts; hidden stays as set |
| ★ settles while hide is in flight | no refetch until hide settles; hide not flipped back |
| both succeed | one refetch after the last settles |

## Definition of Done

- [ ] hook tests for the edge cases pass
- [ ] all ModelPicker / generate tests green
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
