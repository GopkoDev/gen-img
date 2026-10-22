---
id: T4
title: "Build the Models page section"
layer: "ui"
deps: ["T1", "T2", "T3"]
blocks: ["T6"]
acs: ["AC-01", "AC-02", "AC-03", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09", "AC-14"]
files_hint: ["src/web/components/ui/table.tsx", "src/web/components/ui/switch.tsx", "src/web/features/models/ModelsPage.tsx", "src/web/features/models/ModelsPage.test.tsx", "src/web/sections.tsx", "src/web/sections.test.tsx", "tests/helpers/setup-dom.ts", "docs/design-system.md"]
owner: "dmytro.hopko"
estimate: "L"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Build the Models page section

## Place in the sequence

- **Blocked by:** T1 — Accept preference writes that only turn flags off without checking the provider, T2 — Share preference reads and a per-flag optimistic mutation between the picker and the Models page, T3 — Describe a model's supported parameters for the table · **Blocks:** T6 — Measure the Models page rendering in a serial web timing project · **Wave:** 2 — needs the server rule, the hooks and the wording.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a Models page listing every image model of each configured provider with its published price and the parameters it supports
> **So that** I can compare models without selecting them one by one
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
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
> **As an** Owner
> **I want** to see models whose preferences are kept but which their provider no longer offers, and forget them
> **So that** no hidden or favorite choice is stored without my knowing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task builds SCR-08.

## Inlined context

> SCR-08 states: default (Card per provider, Table: Name + id · Price · Aspect ratios · Seed · Images · Inputs · ★ · «Show in picker» Switch) · loading · price loading «…» · price states · hidden row (muted + Badge «Hidden») · toggle save failed («Couldn't save — try again.» in the row) · list error («Couldn't load the <provider> models.» + Try again) · not configured · none configured · preferences unreadable (notice, toggles disabled, no «No longer offered») · no longer offered (id + Badge + Forget) · forget failed
>
> — `screens.md SCR-08, state table, abridged` · full text: [screens.md](../screens.md)

> Prices only for rows in view … each row's short price query (`useShortPrice`, key `["price", provider, model]`) is enabled once the row has intersected the viewport (an IntersectionObserver per table, rows tracked by id)
>
> — `sad.md §4, item 3, abridged` · full text: [sad.md](../sad.md)

> «No longer offered» = stored preferences minus a *loaded* model list … only when that provider's list query *and* its preferences query succeeded (AC-09, AC-14); «Forget» sends both flags off
>
> — `sad.md §4, item 4, abridged` · full text: [sad.md](../sad.md)

> Adding a section = one entry here (ADR-0022).
>
> — `src/web/sections.tsx, Section type comment, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Reads `GET /api/providers`, `GET /api/providers/{id}/models`, `GET /api/providers/{id}/price?model=`, `GET /api/model-preferences?provider=`; writes `PATCH /api/model-preferences` through T2's hook.

— `contracts/openapi.yaml`, abridged

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** at least one provider is configured
> **When** the Owner opens the Models section
> **Then** the page shows one table per configured provider, in the provider's order, with one row per image model: name, id, published price in step 7's short wording («$0.0184 / image», a range, «priced per token», «price unknown» or «price unknown — couldn't load», never $0), and the parameters the model supports — aspect ratios, seed, the most images per request and the input-image range, with «—» for what it doesn't support; rows appear before their prices arrive, a price still loading shows «…», and a row's price is looked up only once the row comes into view, so the table never asks for prices of rows the Owner hasn't scrolled to
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-02) — happy path

> **Given** the Owner is on the Models page
> **When** the Owner switches a model's «show in picker» toggle off, or back on
> **Then** the model is marked as hidden in its row (or no longer marked), stays listed in the table, and the choice is kept on the machine across reloads and restarts
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-03) — happy path

> **Given** the Owner is on the Models page
> **When** the Owner toggles a model's ★
> **Then** the model becomes a favorite or stops being one, its «show in picker» state is unchanged, and the change is kept on the machine
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-02, US-03) — error

> **Given** Ukiyo can't save a change (it is unreachable or refuses it)
> **When** the Owner switches ★ or «show in picker» on a row
> **Then** that toggle returns to its previous state, the row says in plain words that the change couldn't be saved, and other rows and toggles — including the other toggle of the same row — keep the state the Owner last set
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-01) — error

> **Given** one provider's model list can't be loaded right now
> **When** the Owner opens the Models page
> **Then** that provider's table is replaced by a plain message with a way to try again, and the other provider's table is shown normally
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-01) — cross-context

> **Given** a provider has no key configured
> **When** the Owner opens the Models page
> **Then** that provider is shown with a note that it isn't configured (no models, no toggles), and the other provider's table is shown normally; with no provider configured the page says how to add a key
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-04) — happy path

> **Given** Ukiyo keeps a favorite or hidden preference for a model its provider no longer lists
> **When** the Owner opens the Models page
> **Then** a «No longer offered» list under that provider's table shows the model id with its kept preference, and «Forget» removes the preference so it no longer appears anywhere — and a «Forget» still succeeds if the provider's list became unavailable after the page loaded
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-04) — domain invariant

> **Given** a provider's model list can't be loaded right now
> **When** the Models page is shown
> **Then** no model of that provider is presented as «no longer offered» — the list is only built from a model list that loaded
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)
### AC-14 (US-02, US-03, US-04) — error

> **Given** Ukiyo can't read the Owner's preferences for a provider right now
> **When** the Owner opens the Models page
> **Then** that provider's table still lists its models with prices and parameters, says that favorites and hidden models couldn't be loaded, disables its ★ and «show in picker» toggles, and shows no «No longer offered» list
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] vendor shadcn Table + Switch (check the `cn` import → `@/lib/utils`)
- [ ] IntersectionObserver test double — `tests/helpers/setup-dom.ts`
- [ ] `ModelsPage` with every SCR-08 state — `ModelsPage.tsx`
- [ ] Models section (`/models`, icon) — `sections.tsx` (+ registry test)
- [ ] component tests per state, incl. rows out of view not looked up, each price asked once per visit, forget — `ModelsPage.test.tsx`
- [ ] register Table, Switch in `docs/design-system.md`

## Edge cases

| Case | Behaviour |
|---|---|
| one provider's list fails | its card shows the error; the other table renders |
| preferences unreadable | toggles disabled, no retired list |
| list failed | no «No longer offered» |
| forget fails | row stays + message |
| row out of view | no price request |

## Definition of Done

- [ ] component tests for every SCR-08 state pass
- [ ] section reachable at /models from the sidebar
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
