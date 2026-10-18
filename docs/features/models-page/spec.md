---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — models-page

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) step 10; the shipped [`model-picker-preferences`](../model-picker-preferences/spec.md) (preference store, picker rules, short prices) and [`app-shell`](../app-shell/spec.md) (sections) specs; `src/shared/providers.ts` (what the catalog says about each model's parameters).

## 1. Context

Since step 9 the Owner can mark favorites inside the model picker, and Ukiyo already keeps a «hidden» flag per model — but there is no place to hide a model, to see every model of both providers side by side with its price and what it supports, or to find the preferences of models a provider stopped offering. Comparing models today means opening the picker of each provider and reading entries one by one; the supported parameters (aspect ratios, seed, number of images, input images) only show up after a model is selected.

There is no external trigger: the Owner asked for it in the V2 round (roadmap step 10), right after the per-model preference store landed in step 9, which this page builds on.

Committed approach: a new «Models» section lists every image model of each configured provider in one table per provider — name, id, published price in step 7's short wording, and the parameters the model supports — with the same ★ favorite toggle as the picker and a «show in picker» toggle that hides or unhides the model. Hidden models stay listed on this page, marked, so they can be brought back. A «No longer offered» list shows models whose preferences are kept but which their provider no longer lists, with a way to forget them. Every change lands in the same per-model preferences the picker reads, so the Generate picker shows it the next time it opens; and when hiding leaves the generate form no suitable visible model, its «none suitable» notice (step 9) says the suitable models are hidden instead of telling the Owner to switch provider.

- Failure modes weighed before the AC (devil's-advocate pass): a «no longer offered» list built from a failed model list, «Forget» refused by step 9's catalog check, price fan-out of a full table holding up the Generate price line, hiding every suitable model leaving a misleading «switch provider» notice, hiding the selected model, and two toggles of one row racing — each is answered by an AC or an NFR row.
- Traceability: preferences, flag-merging writes and the picker's hidden/selected rules come from step 9 (ADR-0026, ADR-0027, ADR-0028), but this step changes step 9's write check — turning a flag off no longer needs the provider (AC-12) — so ADR-0026's write check is amended at design; the section registry comes from step 8 (ADR-0022).

## 2. Goals

- The Owner sees every model of both providers in one place, with its price and what it supports, without selecting each one.
- The Owner decides which models the picker offers, and can undo that decision at any time.
- No stored preference stays invisible: whenever a provider's model list loads, preferences of models it stopped offering can be seen and forgotten.

## 3. Non-goals

- Searching, sorting or filtering the table — the owner asked for a table of every model; a long list is scrolled (same stance as the picker, step 9).
- Generating from the Models page — choosing a model to generate with stays in the Generate section.
- Editing model names, prices or parameters — they come from the providers.
- Per-model usage statistics or cost history — not asked for; the gallery views (steps 11–14) cover the Owner's own generations.

## 4. User stories

### US-01: See every model with price and parameters

**As an** Owner
**I want** a Models page listing every image model of each configured provider with its published price and the parameters it supports
**So that** I can compare models without selecting them one by one

### US-02: Hide or show a model in the picker

**As an** Owner
**I want** a «show in picker» toggle on each model
**So that** the Generate picker only offers the models I actually want to use, and I can bring a model back later

### US-03: Mark favorites from the table

**As an** Owner
**I want** the same ★ favorite toggle on the Models page as in the picker
**So that** I can curate my favorites while comparing models

### US-04: Clean up preferences of retired models

**As an** Owner
**I want** to see models whose preferences are kept but which their provider no longer offers, and forget them
**So that** no hidden or favorite choice is stored without my knowing

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** at least one provider is configured
**When** the Owner opens the Models section
**Then** the page shows one table per configured provider, in the provider's order, with one row per image model: name, id, published price in step 7's short wording («$0.0184 / image», a range, «priced per token», «price unknown» or «price unknown — couldn't load», never $0), and the parameters the model supports — aspect ratios, seed, the most images per request and the input-image range, with «—» for what it doesn't support; rows appear before their prices arrive, a price still loading shows «…», and a row's price is looked up only once the row comes into view, so the table never asks for prices of rows the Owner hasn't scrolled to

### AC-02 (US-02) — happy path

**Given** the Owner is on the Models page
**When** the Owner switches a model's «show in picker» toggle off, or back on
**Then** the model is marked as hidden in its row (or no longer marked), stays listed in the table, and the choice is kept on the machine across reloads and restarts

### AC-03 (US-03) — happy path

**Given** the Owner is on the Models page
**When** the Owner toggles a model's ★
**Then** the model becomes a favorite or stops being one, its «show in picker» state is unchanged, and the change is kept on the machine

### AC-04 (US-02, US-03) — cross-context

**Given** the Owner has changed a favorite or hidden a model on the Models page
**When** the Owner opens the model picker in the Generate section, without reloading the page
**Then** the generate form shows the change without a reload (favorites first, hidden models left out) — and a hidden model that is currently selected in the generate form stays selected and marked as hidden there, as step 9 defines; Ukiyo never switches a model the Owner chose because it was hidden

### AC-05 (US-02, US-03) — error

**Given** Ukiyo can't save a change (it is unreachable or refuses it)
**When** the Owner switches ★ or «show in picker» on a row
**Then** that toggle returns to its previous state, the row says in plain words that the change couldn't be saved, and other rows and toggles — including the other toggle of the same row — keep the state the Owner last set

### AC-06 (US-01) — error

**Given** one provider's model list can't be loaded right now
**When** the Owner opens the Models page
**Then** that provider's table is replaced by a plain message with a way to try again, and the other provider's table is shown normally

### AC-07 (US-01) — cross-context

**Given** a provider has no key configured
**When** the Owner opens the Models page
**Then** that provider is shown with a note that it isn't configured (no models, no toggles), and the other provider's table is shown normally; with no provider configured the page says how to add a key

### AC-08 (US-04) — happy path

**Given** Ukiyo keeps a favorite or hidden preference for a model its provider no longer lists
**When** the Owner opens the Models page
**Then** a «No longer offered» list under that provider's table shows the model id with its kept preference, and «Forget» removes the preference so it no longer appears anywhere — and a «Forget» still succeeds if the provider's list became unavailable after the page loaded

### AC-09 (US-04) — domain invariant

**Given** a provider's model list can't be loaded right now
**When** the Models page is shown
**Then** no model of that provider is presented as «no longer offered» — the list is only built from a model list that loaded

### AC-10 (US-02) — domain invariant

**Given** the Owner hides a model
**When** the Owner looks at the gallery or re-runs a generation made with it
**Then** past generations, their costs and the gallery are unchanged, and a re-run of that generation still selects the hidden model (step 9)

### AC-11 (US-01) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo for the model list, prices or preferences, or tries to change a preference
**Then** Ukiyo refuses, like every other Ukiyo request

### AC-12 (US-02, US-04) — domain invariant

**Given** a request only turns a model's favorite or hidden flag off
**When** it reaches Ukiyo while the provider doesn't list that model, its list can't be loaded, or the provider has no key
**Then** Ukiyo accepts it — turning a preference off never needs the provider — while turning a flag on still needs a model the provider offers, and a provider Ukiyo doesn't know is still refused (step 9)

### AC-13 (US-02) — cross-context

**Given** the Owner has hidden every model of a provider that a generation needs (for example every model that takes input images)
**When** the generate form can't pick a visible model on its own
**Then** it says that the suitable models are hidden and that they can be shown again on the Models page, instead of saying the provider has none

### AC-14 (US-02, US-03, US-04) — error

**Given** Ukiyo can't read the Owner's preferences for a provider right now
**When** the Owner opens the Models page
**Then** that provider's table still lists its models with prices and parameters, says that favorites and hidden models couldn't be loaded, disables its ★ and «show in picker» toggles, and shows no «No longer offered» list

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Models page shows its rows | ≤ 300 ms p95 after the model lists are cached, with 100 models and 100 stored preferences | serial timing run like the `nfr` project — a jsdom `*.nfr.test.tsx` over a seeded list, 20 renders (a component test checks rows render without waiting for prices) |
| Provider requests for the page's prices | the step 9 limits hold: ≤ 1 per model per 10 minutes, ≤ 4 in flight in total, a failed lookup ≤ 1 retry per model per minute | existing price-cache unit tests + a test that the page asks each price once per visit |
| Saving a toggle | ≤ 50 ms p95 of Ukiyo's own work (step 9) | existing nfr test |

## 6.1 Security / privacy

- **Data classification:** internal — public model data and the Owner's own choices about it.
- **Personal data touched:** none.
- **AuthZ/AuthN impact:** no new boundary; the page uses the existing model-list, price and preference reads/writes behind the request guard (ADR-0007).
- **Abuse cases:**
  - A foreign page reads the catalog or flips preferences: refused by the request guard (AC-11).
  - A large table fans out price lookups: bounded by the step 9 server limits (§6).
  - A crafted model id in «Forget»: the same flag-merging write as step 9; turning both flags off only removes a row.
- **Security review:** N/A — no new data, secret use or boundary; the one rule change (turning flags off without a catalog check, AC-12) can only remove the Owner's own rows.

## 7. Metrics / KPIs

- **Hidden models** — baseline: 0 (no way to hide), target: the Owner hides ≥ 1 model within 2 weeks (owner check of the Models page).
- **«$0» or «free» shown for an unknown price on the page** — baseline: n/a, target: 0 occurrences.
- **Preferences of retired models left unseen** — baseline: not visible at all, target: 0 (every kept preference of a model no longer offered is listed while its provider's list loads).

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->
