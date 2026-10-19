---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — gallery-by-model

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) steps 13–15 and its «V2 scope» decision («by model» means both a filter and a group view); the shipped [`gallery-grid`](../gallery-grid/spec.md) and [`generation-detail-modal`](../generation-detail-modal/spec.md) specs; roadmap «Out of scope» (free-text search stays out).

## 1. Context

The gallery shows every generation in one newest-first stream. When the Owner wants to judge a model — «how do my Seedream results look?» — they have to scroll and pick its cards out by the model badge, and there is no way to see side by side what each model produced.

There is no external trigger: the Owner asked for it in the V2 round (roadmap step 13), bringing «by model» back into scope as both a filter and a group view (roadmap, Decisions so far). Step 14 will add the same for identical prompts, and step 15 folders reuse the grid with its filters, so the way a view is chosen becomes shared.

Committed approach: the gallery gets a view choice that lives in its address, so Back, reload and links keep it — «All» (today's grid), one model (the grid filtered to one provider + model, chosen from the models the Owner has actually generated with, each with its count), and «By model» (one section per provider + model, the most recently used first, each showing its count, its latest few cards and «Show all» opening that model's filtered grid). The filtered grid behaves exactly like the main grid — badges, paging as you scroll, the detail dialog — and stepping in the dialog stays within the view it was opened from.

- Failure modes weighed before the AC (devil's-advocate pass): the dialog losing the view it was opened from, card updates reaching only the «All» list, one scroll position shared by every view, counts and empty states drifting after deletions, model ids with special characters in the address, and one finished generation reloading every list — each is answered by an AC or an NFR row.

## 2. Goals

- The Owner sees all results of one model without scanning the whole gallery.
- The Owner compares what each model produced, side by side, at a glance.
- Every view is an address: Back, reload and links bring the Owner back to the same view.

## 3. Non-goals

- Filtering by anything other than the model in this step — free text stays out (roadmap «Out of scope»); prompts are step 14, folders step 15; whether tags become filterable stays the open curate-gallery §8 question.
- Several models at once — one model or all.
- Showing models the Owner never generated with — the catalog is the Models page (step 10).
- Changing the order inside a view — always newest first.

## 4. User stories

### US-01: Filter the gallery to one model

**As an** Owner
**I want** to choose one of the models I have generated with and see only its generations
**So that** I can judge that model's results

### US-02: See the gallery grouped by model

**As an** Owner
**I want** a view with one section per model, each with its count and latest results
**So that** I can compare models side by side

### US-03: Keep my view

**As an** Owner
**I want** the chosen view to stay in the gallery's address
**So that** Back, reload and links return me to the same view

### US-04: Browse a view like the gallery

**As an** Owner
**I want** a filtered view to page, show badges and open the detail dialog like the main grid, stepping only within that view
**So that** browsing one model feels the same as browsing everything

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner has generations with several models
**When** the Owner opens the model choice in the gallery
**Then** it lists every provider + model the Owner has generated with — the model's name or id, the provider, and how many generations it has — most recently used first, and choosing one shows only that model's generations, newest first, with the same cards and badges as the main grid

### AC-02 (US-02) — happy path

**Given** the Owner has generations with several models
**When** the Owner switches the gallery to «By model»
**Then** it shows one section per provider + model, the most recently used first; each section names the model and provider, shows its count and its latest four cards, and offers «Show all N», which opens that model's filtered grid

### AC-03 (US-03) — happy path

**Given** the Owner is on a filtered grid or on «By model»
**When** the Owner reloads, goes Back after opening something, or opens the gallery's address in a new tab
**Then** the same view is shown; choosing «All» returns to the full grid and its address; each view keeps its own scroll position for the session, and a view opened for the first time (for example through «Show all N») starts at the top

### AC-04 (US-04) — cross-context

**Given** the Owner opens a card from a filtered grid or from a «By model» section
**When** the Owner steps with ← / → in the detail dialog
**Then** the view behind the dialog is not switched, the steps go through that model's generations only, newest first (loading more of them at the end — from a «By model» section this means all of that model's generations, not only the four shown), and closing returns to the view the Owner opened it from: a filtered grid brings the last generation shown into view as the main grid does (generation-detail-modal AC-04), «By model» returns to the section unchanged; deleting from the dialog moves to the neighbour in that model's order — when it was the model's last generation, the dialog closes onto the view, where the filtered grid shows the «no generations with that model» state (AC-06) and the «By model» section is gone

### AC-05 (US-01, US-02) — domain invariant

**Given** generations are added or deleted while a view is shown
**When** the view updates
**Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears

### AC-06 (US-01) — error

**Given** the gallery's address names a model the Owner has no generations with (mistyped, or every generation of it deleted)
**When** the gallery is shown
**Then** it says plainly that there are no generations with that model (naming it) and offers to show all generations — not an error page and never «No generations yet» while other generations exist; a model is matched exactly as it was stored (same characters, same case), and any model id survives the address unchanged

### AC-07 (US-01, US-02) — error

**Given** the model choice or «By model» can't be loaded right now
**When** the Owner opens it
**Then** a plain message with a way to try again is shown, and the main grid stays usable

### AC-08 (US-01) — domain invariant

**Given** two providers offer a model with the same id
**When** the Owner has generated with both
**Then** they are two separate entries in the choice and two sections in «By model», each with its own generations and count

### AC-09 (US-01) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo for a filtered list or the model groups
**Then** Ukiyo refuses, like every other Ukiyo request

### AC-10 (US-03) — cross-context

**Given** the Owner is on a filtered view or «By model»
**When** the Owner goes to another section and comes back to the gallery through the sidebar
**Then** the gallery opens on «All», as the sidebar entry always does; Back still returns to the view the Owner left

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| A filtered page | any page (first or continued) of 24 items of one model, 1 000 generations across 30 models, each with 10 tags and a comment, ≤ 300 ms p95 server time | `nfr` test over a seeded data dir |
| Model choice and «By model» | the model list with counts, and the groups with their latest four cards, ≤ 300 ms p95 server time with 1 000 generations across 30 models | `nfr` test |
| Refresh on a change | a finished generation or a deletion costs ≤ 1 request per loaded page of each view on screen + 1 for the recent strip, and 0 for views not on screen (they re-read when next shown); a pending cost is refreshed once across all views, ≤ every 10 s, asking only for the pending generation | component test counting requests |
| Requests per view | each view is read on its first visit; a revisit costs 0 reads unless a change happened since (then as «Refresh on a change»); a curation change still costs 0 list reads (ADR-0034) | component test counting requests |

## 6.1 Security / privacy

- **Data classification:** internal — the Owner's own generations.
- **Personal data touched:** none new.
- **AuthZ/AuthN impact:** no new boundary; the new reads sit behind the request guard (ADR-0007).
- **Abuse cases:**
  - A foreign page reads the Owner's models or filtered lists: refused (AC-09).
  - A crafted model in the address: treated as data — only matched against stored generations, never used to reach a provider.
- **Security review:** N/A — read-only views over existing data.

## 7. Metrics / KPIs

- **Scrolling to find one model's results** — baseline: scan the whole gallery, target: one choice (owner check over 2 weeks).
- **Views lost on Back or reload** — baseline: n/a, target: 0.
- **Generations missing or duplicated in a view** — baseline: n/a, target: 0.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->

## Test plan

<!-- quick route: inline per the size matrix (XS/S). -->

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | model choice lists used models with counts newest first; filtered grid newest first | integration + component | T2, T4 |
| AC-02 | sections per model newest first, count, ≤ 4 cards, «Show all N» | integration + component | T2, T5 |
| AC-03 | view in the address through reload/Back/new tab; per-view scroll; «All» | unit (view parse) + component | T3, T4 |
| AC-04 | dialog keeps the view behind, steps within the model, close per view, delete in the view | component | T6 |
| AC-05 | each generation once; counts = pages; updates and removals in every cached view; refresh scope | integration + unit + component | T1, T2, T3, T6, T7 |
| AC-06 | unknown/mistyped/emptied model → empty-model state; exact matching; ids round-trip | integration + unit + component | T2, T3, T4 |
| AC-07 | failed choice / groups → message + Try again, grid usable | component | T4, T5 |
| AC-08 | same model id under two providers = two entries | integration | T2 |
| AC-09 | foreign page refused | integration | T2 |
| AC-10 | sidebar Gallery opens «All»; Back returns to the view | component | T4 |

- **NFR:** filtered page and models read ≤ 300 ms p95 at 1 000 generations / 30 models — `nfr` (T2); refresh and revisit request counts — component (T7).
- **Test data:** `seedGeneration` across 30 models (incl. ids with `/`, `:`, `+`, same id under both providers); web api mocks.
