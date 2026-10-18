---
id: T5
title: "Build the ModelPicker popover with prices and favorite toggles"
layer: "ui"
deps: ["T2", "T4"]
blocks: ["T6"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-09", "AC-10", "AC-13", "AC-14"]
files_hint: ["src/web/components/ui/popover.tsx", "src/web/features/generate/ModelPicker.tsx", "src/web/features/generate/ModelPicker.test.tsx", "src/web/features/generate/PricePreview.tsx", "docs/design-system.md"]
owner: "dmytro.hopko"
estimate: "L"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Build the ModelPicker popover with prices and favorite toggles

## Place in the sequence

- **Blocked by:** T2 — Read and set model preferences through a models module, T4 — Arrange models into favorites and others and pick models for automatic choices · **Blocks:** T6 — Use ModelPicker and pickModel in the generate panel · **Wave:** 2 — needs the client and the grouping rules.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** every entry of the model picker to show that model's published price in short form
> **So that** I can compare models while choosing, without selecting each one first
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** a ★ toggle on each picker entry that marks or unmarks the model as a favorite without selecting it
> **So that** I can curate my short list right where I choose models
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** my favorite models listed first, in their own group above all other models
> **So that** the models I use most are one click away
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task builds SCR-07 — the open list with groups, short prices and ★ toggles.

## Inlined context

> A popover opened from a picker button, holding a list of rows; each row has a «choose» button (name, id, price) and a separate ★ toggle button with a pressed state; Up/Down move between rows, Tab reaches the ★, Escape closes — built on the shadcn Popover primitive.
>
> — `adr/0028, option 1 (chosen), verbatim` · full text: [adr/0028-render-the-model-picker-as-a-popover-list-with-a-separate-favorite-toggle-per-row.md](../adr/0028-render-the-model-picker-as-a-popover-list-with-a-separate-favorite-toggle-per-row.md)

> SCR-07 states: default grouped · default plain · price loading «…» in a fixed-width slot · price states (`$X / image`, `$X–$Y / image`, Badge «priced per token», «price unknown», «price unknown — couldn't load») · ★ toggled (list open, focus stays) · ★ save failed (★ reverts + «Couldn't save the favorite — try again.») · hidden but selected (first in «All models», muted «hidden») · preferences unreadable (plain list incl. hidden, «Favorites couldn't be loaded.», ★ disabled)
>
> — `screens.md SCR-07, state table, abridged` · full text: [screens.md](../screens.md)

> Enter/Space/↓ on the trigger opens with focus on the selected row (else the first); ↑/↓ move between rows' «choose» buttons; Tab moves to the row's ★; Enter/Space on ★ toggles; Enter on «choose» selects and closes; Escape closes; focus returns to the trigger.
>
> — `screens.md SCR-07, Keyboard, verbatim` · full text: [screens.md](../screens.md)

> key `["model-preferences", provider]`, `staleTime: 0` + refetch on open and on window focus … the ★ is optimistic and rolls back on failure (AC-05); a failed read degrades to the plain list with a notice (AC-13).
>
> — `sad.md §4, item 5, abridged` · full text: [sad.md](../sad.md)

> per-entry query `["price", provider, model]` shared with the price line; `retry: false` for picker entries
>
> — `sad.md §8, Price lookups, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Calls `GET /api/model-preferences?provider=`, `PATCH /api/model-preferences` (T2 client) and `GET /api/providers/{providerId}/price?model=` (step 7 client), each entry's price only while the popover is open.

— `contracts/openapi.yaml, listModelPreferences + setModelPreference, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner opens the model picker of a configured provider
> **When** the list of models is shown
> **Then** every entry shows its model's published price in short form — «$0.0184 / image», a range with both ends «$0.045–$0.151 / image», «priced per token» or «price unknown» — step 7's wording, as under the picker; prices are looked up when the Owner opens the picker, not when the page loads; while an entry's price is still loading it shows «…» without the entries moving under the pointer, and the Owner can choose a model before any price has arrived
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-01) — domain invariant

> **Given** the provider publishes no price for a model, or its price can't be loaded right now
> **When** the picker shows that model's entry
> **Then** the entry says «price unknown» (with «couldn't load» when the lookup failed) — never $0, «free» or a blank — and the model can still be chosen and used; a failed lookup is tried at most once per model per opening of the picker
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-02, US-04) — happy path

> **Given** the Owner has the model picker open
> **When** the Owner clicks or keyboard-activates the ★ toggle on a model's entry
> **Then** the model becomes a favorite (filled ★) or stops being one (empty ★), the picker stays open with the selected model unchanged, and the choice is kept on the machine — it is still there after reloading the page or restarting Ukiyo
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-04 (US-03) — happy path

> **Given** the Owner has marked one or more models of the current provider as favorites
> **When** the picker opens
> **Then** a «Favorites» group lists those models first and an «All models» group lists every other model below, each group in the provider's order; with no favorites the picker shows one plain list as before
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-02) — error

> **Given** Ukiyo can't save a favorite change (it is unreachable or refuses the change)
> **When** the Owner toggles the ★
> **Then** the ★ returns to its previous state and the picker tells the Owner in plain words that the favorite couldn't be saved, and nothing else in the form changes
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
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
### AC-13 (US-04) — error

> **Given** Ukiyo can't read the Owner's preferences right now
> **When** the Owner opens the generate form
> **Then** the picker still works as one plain list of all the provider's models — hidden ones included, since Ukiyo can't tell them apart — says that favorites couldn't be loaded, and generating is not blocked
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)
### AC-14 (US-04, US-05) — cross-context

> **Given** the Owner changes a favorite or hides a model somewhere else in Ukiyo (the Models page, step 10, or another tab)
> **When** the Owner opens the model picker in the generate form afterwards
> **Then** the picker shows the changed preferences without reloading the page
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] vendor shadcn Popover (`pnpm dlx shadcn@latest add popover`, check the `cn` import) — `src/web/components/ui/popover.tsx`
- [ ] export a reusable short-price hook/label from `PricePreview.tsx` (same wording, query key shared, `retry: false` option)
- [ ] `ModelPicker` props `{ provider, models, value, onChange, disabled, prefs }` with rows, groups, ★ mutation (optimistic + rollback), keyboard contract — `src/web/features/generate/ModelPicker.tsx`
- [ ] component tests for every SCR-07 state + keyboard — `ModelPicker.test.tsx`
- [ ] register Popover + ModelPicker in `docs/design-system.md` inventory

## Edge cases

| Case | Behaviour |
|---|---|
| ★ clicked | model not selected, popover stays open |
| ★ save fails | ★ reverts, message shown |
| prices not yet loaded | «…», choose still works |
| price lookup fails | «price unknown — couldn't load», no retry in this opening |
| preferences read fails | plain list incl. hidden, ★ disabled, notice |
| preference changed elsewhere | next opening refetches and shows it |

## Definition of Done

- [ ] component tests for every SCR-07 state and the keyboard contract pass
- [ ] Popover + ModelPicker registered in docs/design-system.md
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
