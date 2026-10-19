---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — gallery-by-prompt

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) step 14 and «Out of scope» (similar-prompt grouping stays out); the shipped [`gallery-by-model`](../gallery-by-model/spec.md) (views in the address, a cache per view, the dialog within a view), [`gallery-grid`](../gallery-grid/spec.md), [`generation-detail-modal`](../generation-detail-modal/spec.md); the generation's stored prompt (step 2: not empty, at most 10 000 characters).

## 1. Context

The Owner often sends the same prompt again — to another model, with other parameters, or simply to get more variants (re-run, step 6). Those results end up spread through the gallery between everything else, so seeing «everything this prompt produced» means scrolling and reading prompts card by card.

There is no external trigger: the Owner asked for it in the V2 round (roadmap step 14). Step 13 made views part of the gallery's address; this step adds the prompt view the same way, and step 15 folders will reuse it.

Committed approach: a «By prompt» view lists one group card per distinct prompt, the most recently used first — its latest image, the beginning of the prompt, how many generations and images it has and which models made them. Opening a group shows that prompt's grid: every generation made from it, newest first, with the grid's cards, badges, scrolling and detail dialog, which steps within the prompt. «Identical» means exactly the same text as stored — no trimming, case folding or similarity. The prompt view is an address that names the prompt by a short key, never by its text. By default «By prompt» shows only prompts used more than once — single-use prompts are one switch away — so the view shows what was reused instead of repeating the whole gallery.

- The roadmap's «one group card opens every image made from it» is met by the prompt's grid (every generation) plus the detail dialog (every output image of each).
- Decision: «identical» stays literal. Text that looks the same but differs in invisible characters (a trailing line break, the same letter written with different invisible codes) makes two groups; the opened view shows the full prompt, so such twins can be told apart. Normalising text would quietly merge prompts the provider received differently.
- Failure modes weighed before the AC (devil's-advocate pass): long prompts and private text in addresses, look-alike prompts splitting a group, group cards going stale after a delete or a new generation, a group list as long as the gallery itself, and dialog stepping leaving the group after a reload — each is answered by an AC, an NFR row or the decision above.

## 2. Goals

- The Owner sees everything one prompt produced, across models and runs, in one place.
- The Owner sees at a glance which prompts they reused most and with which models.
- Prompt views behave like every other gallery view — addresses, scrolling, dialog — without putting prompt text in addresses.

## 3. Non-goals

- Grouping similar or near-identical prompts — roadmap «Out of scope»; only identical text groups.
- Editing or renaming a prompt group — there is no group record; each generation carries a key derived from its own prompt.
- Searching prompts — free text stays out.
- Combining a prompt view with a model view — one view at a time (step 13's rule).

## 4. User stories

### US-01: See the gallery grouped by prompt

**As an** Owner
**I want** a view with one card per distinct prompt, showing its latest image, the prompt's beginning, its counts and its models
**So that** I see which prompts I reused and what they produced

### US-02: Open everything one prompt produced

**As an** Owner
**I want** a prompt group to open a grid of every generation made from that prompt
**So that** I can compare all its results in one place

### US-03: Keep prompt views like the other views

**As an** Owner
**I want** prompt views to keep their address, scroll and dialog stepping like the other gallery views
**So that** browsing by prompt works the same way as browsing by model

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner has generations with several prompts, some used more than once
**When** the Owner switches the gallery to «By prompt»
**Then** it shows one group card per distinct prompt used more than once, the most recently used first (a «Include single-use prompts» switch adds the prompts used once, and is remembered with the view's address): the latest output image of that prompt, the prompt's first two lines (the full text on hover / in the opened view), «N generations · M images», and the models that made them (up to three named, then «+K»); more groups load as the Owner scrolls, like the grid; when no prompt is used more than once yet, it says «No prompt is used more than once yet.» and offers the single-use switch — never «No generations yet» while generations exist

### AC-02 (US-02) — happy path

**Given** the Owner is on «By prompt»
**When** the Owner opens a group card
**Then** the gallery shows that prompt's grid — every generation made from exactly that prompt, newest first, with the grid's cards and badges — under a heading with the full prompt text and «N generations», and «Back to prompts» / «Show all generations»

### AC-03 (US-03) — cross-context

**Given** the Owner opens a card from a prompt's grid
**When** the Owner steps with ← / → in the detail dialog
**Then** the steps go through that prompt's generations only, newest first (loading more of them at the end), the prompt's grid stays behind the dialog, and closing returns to it as for any grid view; deleting moves to the neighbour within the prompt, and deleting its last generation closes onto the «no generations use this prompt any more» state (AC-07)

### AC-04 (US-03) — happy path

**Given** the Owner is on «By prompt» or a prompt's grid
**When** the Owner reloads, goes Back, or opens the gallery's address in a new tab
**Then** the same view is shown (including the single-use switch), with its own scroll position, and the dialog opened from a prompt's grid still steps within that prompt; the address names the prompt by a short key — the same length for any prompt — never by its text

### AC-05 (US-01, US-02) — domain invariant

**Given** two generations' prompts differ in anything — a space, a line break, letter case
**When** the gallery groups by prompt
**Then** they are two groups; generations with exactly the same prompt text are one group, whatever model, provider or parameters they used

### AC-06 (US-01, US-02) — domain invariant

**Given** generations are added, re-run or deleted while a prompt view is shown
**When** the view updates
**Then** each generation appears in exactly one prompt group (counting single-use prompts, which the default view hides behind the switch); a re-run of a single-use prompt turns it into a reused group at the top of the default view, and deleting a reused group down to one generation moves it behind the switch; counts match what the prompt's grid shows; a re-run with the same prompt joins its group and moves it to the top; a group whose generations are all deleted disappears, and a group's card always shows the latest image that still exists; a cost, tag or comment change shows on the card in every view where it appears

### AC-07 (US-02) — error

**Given** the gallery's address names a prompt key that matches no generation (mistyped, or every generation of that prompt deleted)
**When** the gallery is shown
**Then** it says plainly that no generations use that prompt any more and offers «Back to prompts» and «Show all generations» — not an error page

### AC-08 (US-01) — error

**Given** «By prompt» can't be loaded right now
**When** the Owner opens it
**Then** a plain message with a way to try again is shown and the other views stay usable; groups already shown stay with a note that they may be out of date

### AC-09 (US-01) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo for the prompt groups or a prompt's generations
**Then** Ukiyo refuses, like every other Ukiyo request

### AC-10 (US-03) — cross-context

**Given** the Owner has generations made before this feature existed
**When** the Owner opens «By prompt» for the first time
**Then** those generations are grouped like new ones — with single-use prompts included, no generation is missing from the prompt groups

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| «By prompt» page | a page of 24 groups (latest image, counts, models) ≤ 300 ms p95 server time with 1 000 generations across 200 prompts, each with 10 tags and a comment | `nfr` test over a seeded data dir |
| A prompt's page | any page of 24 generations of one prompt ≤ 300 ms p95 server time with the same seed | `nfr` test |
| Existing generations grouped | every generation stored before the feature has its prompt key after the first start, in ≤ 2 s for 1 000 generations | integration test over a seeded data dir |
| Refresh | a finished generation or a deletion costs ≤ 1 request per loaded page of each view on screen + 1 for the recent strip, and 0 for views not on screen (they re-read when next shown); a revisit costs 0 reads unless a change happened since (gallery-by-model §6) | component test counting requests |

## 6.1 Security / privacy

- **Data classification:** confidential — the Owner's prompts and images (as rerun-and-reuse §6.1).
- **Personal data touched:** none new; prompts may contain anything the Owner typed, so they are kept out of addresses and browser history (a short key instead).
- **AuthZ/AuthN impact:** no new boundary; the new reads sit behind the request guard (ADR-0007).
- **Abuse cases:**
  - A foreign page reads prompt groups: refused (AC-09).
  - A crafted key in the address: treated as data — only matched against stored keys.
- **Security review:** N/A — read-only views over existing data.

## 7. Metrics / KPIs

- **Scrolling to collect one prompt's results** — baseline: scan the whole gallery, target: one click from «By prompt» (owner check over 2 weeks).
- **Prompt text in addresses or history** — baseline: n/a, target: 0.
- **Generations missing from prompt groups (single-use included)** — baseline: n/a, target: 0.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->

## Test plan

<!-- quick route: inline per the size matrix (XS/S). -->

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | groups latest first, reused by default, switch, paging, none-reused state | integration + component | T3, T5 |
| AC-02 | prompt grid with full-prompt heading and count | integration + component | T3, T6 |
| AC-03 | dialog steps within the prompt (more at the end), delete within it | component | T4, T6 |
| AC-04 | address keeps the view and switch, key only (32 hex), dialog after reload | unit + component | T4 |
| AC-05 | literal identity: case, spaces, line breaks, Unicode forms → separate groups | unit + integration | T1, T2, T3 |
| AC-06 | exactly one group per generation; counts; re-run joins; 1↔2 moves; cover follows deletions | integration + component | T3, T6 |
| AC-07 | unknown or malformed key → «no generations use this prompt any more» | integration + unit + component | T3, T4, T6 |
| AC-08 | groups fail → message / kept with a note | component | T5 |
| AC-09 | foreign page refused | integration | T3 |
| AC-10 | pre-feature generations keyed on boot | integration | T2 |

- **NFR:** groups page and prompt page ≤ 300 ms p95 (1 000 generations / 200 prompts) — `nfr` (T3); backfill 1 000 rows ≤ 2 s — integration (T2); refresh scope as gallery-by-model — existing request tests extended if needed (T6).
- **Test data:** `seedGeneration` (keys via the repo) + `clearPromptKey` for pre-feature rows; prompts with look-alike variants.
