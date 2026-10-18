---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — model-picker-preferences

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) steps 9–10; the shipped [`model-price-preview`](../model-price-preview/spec.md) spec (published prices, «price unknown» rule) and the generate panel's model picker (`src/web/features/generate/GeneratePanel.tsx`); [`rerun-and-reuse`](../rerun-and-reuse/spec.md) for the draft/model carry-over rules.

## 1. Context

The model picker lists every image model a provider offers — dozens on OpenRouter — in the provider's own order. The Owner keeps going back to the same handful of models, and has to scroll and read ids to find them every time. Since step 7 the price of the *selected* model is visible under the picker, but comparing models still means selecting them one by one.

There is no external trigger: the Owner asked for it in the V2 round, right after step 7 made prices visible and step 8 gave each section its own page (roadmap step 9). Step 10 (Models page) will add a table of every model where the Owner hides models from the picker; that page needs a place where per-model choices live, and this step introduces it.

Committed approach: every entry of the model picker shows that model's published price in short form (step 7's honest wording: a price per image, a range, «priced per token» or «price unknown» — never $0), and a ★ toggle that marks or unmarks the model as a favorite without selecting it. Favorites are listed first in their own group, the rest follow in the provider's order. The Owner's per-model preferences — favorite now, hidden from the picker for step 10 — are kept on the Owner's machine per provider and model, and survive restarting Ukiyo and clearing the browser. A hidden model is left out of the picker unless a re-run or the current selection needs it.

- Traceability: prices reuse step 7's published-price sources and wording (ADR-0021), but this step changes *when* they are looked up — for every listed model, not only the selected one — so ADR-0020's «selected model only» is amended at design; step 7's guarantees carry over explicitly (no key sent with a price lookup, an unknown model never re-asked within the cache period); the draft/model carry-over rules of step 6 (ADR-0019) stay as they are.
- Failure modes weighed before the AC (devil's-advocate pass): price-lookup fan-out on a large catalog, a ★ inside an option selecting the model, automatic model choices ignoring hidden/favorite order, a shortened price that looks cheaper or free, preferences for retired model ids, and preference changes made elsewhere not reaching the always-mounted generate page — each is answered by an AC or an NFR row.

## 2. Goals

- The Owner reaches the models they use most at the top of the picker, without scrolling or searching.
- The Owner compares models by price while choosing, without selecting each one first.
- The Owner's per-model choices are remembered on the machine, so the Models page (step 10) can build on the same preferences.

## 3. Non-goals

- A UI to hide models — hiding is stored and honoured here, but its toggle comes with the Models page (step 10).
- Sorting, filtering or searching the picker by price or name — the picker stays a grouped list.
- Reordering favorites by hand — favorites keep the provider's order inside their group.
- Sharing preferences between providers — the same model id offered by two providers is two separate models.
- Changing where prices come from or how they are worded — step 7 owns that.

## 4. User stories

### US-01: See every model's price in the picker

**As an** Owner
**I want** every entry of the model picker to show that model's published price in short form
**So that** I can compare models while choosing, without selecting each one first

### US-02: Mark a model as a favorite

**As an** Owner
**I want** a ★ toggle on each picker entry that marks or unmarks the model as a favorite without selecting it
**So that** I can curate my short list right where I choose models

### US-03: Find favorites first

**As an** Owner
**I want** my favorite models listed first, in their own group above all other models
**So that** the models I use most are one click away

### US-04: Keep my preferences

**As an** Owner
**I want** my favorites and hidden models remembered per provider on my machine across restarts
**So that** I curate once and the picker stays the way I left it

### US-05: Keep hidden models out of the picker

**As an** Owner
**I want** models I've hidden (from the Models page, step 10) left out of the picker, unless a re-run or my current selection needs one
**So that** the picker only offers models I actually want to use

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner opens the model picker of a configured provider
**When** the list of models is shown
**Then** every entry shows its model's published price in short form — «$0.0184 / image», a range with both ends «$0.045–$0.151 / image», «priced per token» or «price unknown» — step 7's wording, as under the picker; prices are looked up when the Owner opens the picker, not when the page loads; while an entry's price is still loading it shows «…» without the entries moving under the pointer, and the Owner can choose a model before any price has arrived

### AC-02 (US-01) — domain invariant

**Given** the provider publishes no price for a model, or its price can't be loaded right now
**When** the picker shows that model's entry
**Then** the entry says «price unknown» (with «couldn't load» when the lookup failed) — never $0, «free» or a blank — and the model can still be chosen and used; a failed lookup is tried at most once per model per opening of the picker

### AC-03 (US-02, US-04) — happy path

**Given** the Owner has the model picker open
**When** the Owner clicks or keyboard-activates the ★ toggle on a model's entry
**Then** the model becomes a favorite (filled ★) or stops being one (empty ★), the picker stays open with the selected model unchanged, and the choice is kept on the machine — it is still there after reloading the page or restarting Ukiyo

### AC-04 (US-03) — happy path

**Given** the Owner has marked one or more models of the current provider as favorites
**When** the picker opens
**Then** a «Favorites» group lists those models first and an «All models» group lists every other model below, each group in the provider's order; with no favorites the picker shows one plain list as before

### AC-05 (US-02) — error

**Given** Ukiyo can't save a favorite change (it is unreachable or refuses the change)
**When** the Owner toggles the ★
**Then** the ★ returns to its previous state and the picker tells the Owner in plain words that the favorite couldn't be saved, and nothing else in the form changes

### AC-06 (US-02) — error

**Given** a request asks to mark a model the provider doesn't offer, or names an unknown provider
**When** it reaches Ukiyo
**Then** Ukiyo refuses it and says the model (or provider) is unknown, and keeps no preference for it

### AC-07 (US-04) — domain invariant

**Given** two providers offer a model with the same id
**When** the Owner marks it as a favorite under one provider
**Then** it is a favorite only under that provider — a model holds exactly one set of preferences per provider, and toggling twice in a row ends where it started

### AC-08 (US-04) — domain invariant

**Given** a favorite or hidden model is no longer offered by its provider
**When** the Owner opens the picker
**Then** the model does not appear in any group (no entry for a model that can't be chosen), and its preference is kept so it comes back as before if the provider offers the model again

### AC-09 (US-05) — happy path

**Given** the Owner has hidden a model
**When** the picker opens for that provider
**Then** the hidden model is listed in neither group, even if it is also a favorite — except while it is the selected model (AC-10); when no model is hidden the picker lists every model

### AC-10 (US-05) — cross-context

**Given** the Owner re-runs a generation (step 6) whose model is now hidden, or whose model is already the selected one when it gets hidden
**When** the generate form is filled with that model
**Then** the model stays selected and is shown in the picker at the top of «All models», marked as hidden, for as long as it stays selected, so the draft can be generated as is; hiding a model never changes past generations, the gallery or the recorded costs

### AC-11 (US-03) — cross-context

**Given** the Owner switches provider in the generate form
**When** the new provider's models are listed
**Then** the groups, ★ states and prices shown are that provider's only; whenever Ukiyo picks a model by itself — on first load, after a provider switch, when a re-run's model isn't offered, or when a reuse needs a model that takes input images — it picks from the models the Owner sees in the picker: the first suitable favorite, otherwise the first suitable model of «All models», never a hidden one — when no visible model is suitable, Ukiyo selects nothing and says which kind of model is needed, as step 6 does; switching keeps the prompt, parameters and attachments as step 6 defines

### AC-12 (US-04) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo to read or change model preferences
**Then** Ukiyo refuses, like every other Ukiyo request — no preferences are handed out or changed

### AC-13 (US-04) — error

**Given** Ukiyo can't read the Owner's preferences right now
**When** the Owner opens the generate form
**Then** the picker still works as one plain list of all the provider's models — hidden ones included, since Ukiyo can't tell them apart — says that favorites couldn't be loaded, and generating is not blocked

### AC-14 (US-04, US-05) — cross-context

**Given** the Owner changes a favorite or hides a model somewhere else in Ukiyo (the Models page, step 10, or another tab)
**When** the Owner opens the model picker in the generate form afterwards
**Then** the picker shows the changed preferences without reloading the page

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Picker opens with its groups and ★ states | ≤ 100 ms p95 of Ukiyo's own work once the model list is cached, with 100 models and 100 stored preferences | serial `nfr` project over a seeded data dir (component test checks the groups and ★ states) |
| Saving a ★ change | ≤ 50 ms p95 of Ukiyo's own work | integration test (serial `nfr` project) |
| Provider requests for the picker's prices | ≤ 1 per model per 10 minutes, and never more than 4 in flight at once | unit test over the price cache with an injected clock (a failed lookup counts too: ≤ 1 retry per failing model per minute) + a concurrency-cap test |
| Price lookups for the picker send the Owner's key | 0 requests with an authorization header | adapter tests assert headers |
| Preferences after a restart | 100% of stored preferences survive a restart | integration test reopening the data dir |

## 6.1 Security / privacy

- **Data classification:** internal — the Owner's own choices about public model ids.
- **Personal data touched:** none.
- **AuthZ/AuthN impact:** no new boundary; reading and changing preferences sit behind the existing request guard (ADR-0007), like every other Ukiyo request.
- **Abuse cases:**
  - A foreign page reads or flips the Owner's preferences: refused by the request guard (AC-12).
  - A crafted model id or provider in a preference change: treated as data, checked against the provider's catalog, never stored when unknown (AC-06).
  - Flooding the store with junk models: impossible beyond the provider's catalog (AC-06); one row per provider + model (AC-07).
  - Opening the picker on a large catalog fans out price lookups to the provider: capped per model and in flight (§6).
- **Security review:** N/A — no new secret use, no new boundary, no personal data; a small write path behind the existing guard.

## 7. Metrics / KPIs

- **Generations made with a favorite model** — baseline: 0% (no favorites exist), target: ≥ 70% of generations within 2 weeks once the Owner has marked favorites (owner check against the gallery).
- **Picker entries showing «$0» or «free» for an unknown price** — baseline: n/a, target: 0 occurrences.
- **Preferences lost across a restart** — baseline: n/a, target: 0 over 2 weeks.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->
