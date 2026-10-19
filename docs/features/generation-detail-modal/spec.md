---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — generation-detail-modal

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) steps 12–14; the shipped detail page ([`text-to-image-openrouter`](../text-to-image-openrouter/spec.md), [`curate-gallery`](../curate-gallery/spec.md), [`rerun-and-reuse`](../rerun-and-reuse/spec.md)) and grid ([`gallery-grid`](../gallery-grid/spec.md), ADR-0032); `src/web/features/gallery/GenerationDetail.tsx`.

## 1. Context

Opening a generation from the gallery leaves the grid for a separate page; to look at the next one the Owner goes back, finds the next card and opens it again. Comparing a run of results — the usual reason to browse — is a back-and-forth through two pages, and the grid's place is only kept because step 11 restores it.

There is no external trigger: the Owner asked for it in the V2 round (roadmap step 12), right after step 11 made the grid's order and paging a stable contract.

Committed approach: a card opened from the gallery grid shows the generation in a dialog over the grid, at the generation's own address — its images on the left (every output, the chosen one large), its metadata and every action the detail page has (comment, tags, re-run, reuse, delete, lineage) on the right. ← and → step to the newer and older neighbour in the grid's order, loading the grid's next page when the end is reached. Closing returns to the grid where it was, with the last grid generation the dialog showed in view. The generation's address still works on its own — typed, reloaded, opened in a new tab or reached from the recent strip — and shows the full detail page as today.

- Deliberate changes to shipped behaviour (recorded here so they aren't read as drift): steps and lineage hops inside the dialog replace the address instead of adding history entries — one Back closes the dialog (exception to app-shell AC-03); a comment or tag change made in the dialog updates its card in place instead of refreshing every loaded page (replaces that part of gallery-grid AC-08); deleting from the dialog moves to the neighbour with the «Generation deleted.» notice instead of landing on the grid (curate-gallery AC-04, app-shell AC-08 still hold on the full page).
- Failure modes weighed before the AC (devil's-advocate pass): a comment draft or delete confirmation carried over to the next generation by a step, one address meaning both «dialog» and «page» in history, delete-then-neighbour races, every edit re-reading all loaded pages under the dialog, lineage hops losing the stepping anchor, and pages loading behind the dialog — each is answered by an AC or an NFR row.

## 2. Goals

- The Owner flips through generations one after another without leaving the grid.
- The detail view puts the picture first and its metadata beside it.
- Every way of reaching a generation that works today keeps working.

## 3. Non-goals

- A dialog from the recent strip or from the full detail page — the recent strip and lineage links on the full page keep opening the full page; inside the dialog, lineage links stay in the dialog (AC-08).
- Zoom, pan or full-screen image viewing — the large image fits the dialog.
- Stepping in a filtered or grouped order — steps 13–14 decide their own neighbours; this step uses the grid's newest-first order.
- Editing anything the detail page can't edit today.

## 4. User stories

### US-01: Open a generation over the grid

**As an** Owner
**I want** a card I open from the gallery to show the generation in a dialog over the grid, images on the left and metadata on the right
**So that** I look at the result without losing the grid

### US-02: Step through neighbours

**As an** Owner
**I want** ← and → (keys and buttons) to show the newer and older generation in the grid's order
**So that** I can compare results one after another

### US-03: Close back to where I was

**As an** Owner
**I want** closing the dialog to return me to the grid at the same place
**So that** browsing continues from the last generation I looked at

### US-04: Keep the generation's address working

**As an** Owner
**I want** a generation's address to keep opening its full detail page when I reach it directly
**So that** links, reloads and new tabs behave as before

### US-05: Act from the dialog

**As an** Owner
**I want** to comment, tag, re-run, reuse and delete from the dialog as on the detail page
**So that** I don't have to open the full page to act on a result

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner is on the gallery grid
**When** the Owner opens a card
**Then** a dialog over the grid shows that generation — its output images on the left (the first one large, the others as smaller choices that make themselves large when picked) and on the right its prompt, model, parameters, cost with status, duration, created time, inputs, lineage, comment and tags, and its actions; the address becomes the generation's own; on a narrow window the images come first and the metadata below

### AC-02 (US-02) — happy path

**Given** the dialog shows a generation of the grid
**When** the Owner presses → (or the «Older» button), or ← (or «Newer»)
**Then** the dialog shows the older (or newer) neighbour in the grid's newest-first order and the address follows; the newest generation has no «Newer», the oldest no «Older»; neighbours are taken relative to the generation shown, so a generation finishing meanwhile, or the grid refreshing, never makes a step skip or repeat one

### AC-03 (US-02) — cross-context

**Given** the dialog shows the last loaded generation and the grid has more pages
**When** the Owner steps to the older neighbour
**Then** the grid's next page loads (as when scrolling) and the dialog shows its first generation; if that page fails, the dialog stays on the current generation and says the next one couldn't be loaded, with a way to try again

### AC-04 (US-03) — happy path

**Given** the dialog is open, possibly after stepping
**When** the Owner closes it — Esc, the close button, a click outside, or the browser's Back
**Then** the grid is shown where it was, without reloading its pages; if the last grid generation the dialog showed is outside the visible cards, the grid scrolls just enough to bring it into view — and that scrolling never loads a further page by itself; one Back closes the dialog however many steps or lineage hops were taken; Forward after a Back shows the same generation in the dialog again; while the dialog is open the grid behind it loads a further page only when stepping asks for it (AC-03), and closing drops an unsaved comment or unsent tag text, as leaving the detail page does today

### AC-05 (US-04) — cross-context

**Given** a generation's address is opened directly — typed, reloaded, from a new tab, or from the recent strip next to the generate form
**When** the page loads
**Then** the full detail page is shown as before (no grid behind it, no stepping), with its way back to the gallery

### AC-06 (US-05) — domain invariant

**Given** the dialog shows a generation
**When** the Owner deletes it (with the existing confirmation)
**Then** the generation disappears from the grid and the dialog says «Generation deleted.» and shows its older neighbour (the newer one when it was the oldest), or closes onto the grid with that notice when it was the only one — the neighbour is chosen from the order as it was before the deletion, loading the grid's next page when the deleted one was the last loaded (if that page fails, the dialog closes onto the grid with the notice and the grid's own «Couldn't load more»); the dialog never shows a deleted generation and Back never returns to it

### AC-07 (US-05) — cross-context

**Given** the dialog shows a generation
**When** the Owner re-runs it or uses one of its images as input
**Then** the dialog closes and the generate form opens with the draft exactly as step 6 defines, and Back from the generate form returns to the grid; a comment or tag change shows on the generation's card in the grid behind the dialog without the grid reloading its pages; a deletion, or a generation finishing while the dialog is open, refreshes the grid's loaded pages as before (gallery-grid AC-06), and a pending cost keeps refreshing on its card

### AC-08 (US-05) — cross-context

**Given** the dialog shows a generation with a lineage link (re-run of / made from)
**When** the Owner follows the link
**Then** the dialog shows that generation (still one Back from the grid); if it isn't in the grid's loaded order, «Newer» / «Older» are not offered for it, and closing brings the last grid generation the dialog showed into view (AC-04)

### AC-09 (US-02) — error

**Given** the Owner is typing in the comment or tag field inside the dialog
**When** the Owner presses ← or →
**Then** the cursor moves in the text as usual and the dialog does not step; stepping keys work only when no text field has focus, and stepping (keys and buttons) is unavailable while a comment has unsaved changes, tag text is typed but not added, or the delete confirmation is open — Esc then closes the confirmation (or cancels the comment edit) first, not the dialog; nothing typed or confirmed for one generation can ever apply to another

### AC-10 (US-01) — error

**Given** the generation shown can't be loaded right now, or no longer exists
**When** the dialog shows it
**Then** it says so in plain words inside the dialog («Couldn't load this generation» with a way to try again, or «This generation no longer exists»), and stepping and closing still work

### AC-11 (US-01) — authorization

**Given** Ukiyo is running
**When** a page from another site in the Owner's browser asks Ukiyo for a generation
**Then** Ukiyo refuses, like every other Ukiyo request

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Dialog shows a generation of the loaded grid | ≤ 100 ms p95 from open/step to the dialog rendering the large image element and the metadata, for an already read generation; a generation not read yet costs exactly one detail read, with «Loading…» in the metadata column meanwhile | component timing test (serial `nfr-web`) + a manual check at ship (jsdom has no paint timing) |
| Stepping requests | ≤ 1 detail read per generation shown, none for a generation already read this session; the grid's next page ≤ 1 request | component test counting requests |
| Edits inside the dialog | a comment or tag change costs ≤ 1 detail read and 0 list-page reads | component test counting requests |
| Neighbours preloaded | after a step, at most 2 images are preloaded — the first output of the newer and of the older neighbour — and only among loaded generations (never a page load for a preload) | component test (image preload) |

## 6.1 Security / privacy

- **Data classification:** internal — the Owner's own generations.
- **Personal data touched:** none new.
- **AuthZ/AuthN impact:** no new boundary; the same detail read behind the request guard (ADR-0007).
- **Abuse cases:**
  - A foreign page reads a generation: refused (AC-11).
- **Security review:** N/A — no new data or capability.

## 7. Metrics / KPIs

- **Back-and-forth between grid and detail page per browsing session** — baseline: one round trip per generation looked at, target: 0 (stepping inside the dialog), owner check over 2 weeks.
- **Generation addresses that no longer open** — baseline: 0, target: 0.
- **Times the grid loses its place after closing the dialog** — baseline: n/a, target: 0.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 and the AC). -->

## Test plan

<!-- quick route: inline per the size matrix (XS/S). -->

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | dialog over the grid, images left / metadata right, address = the generation's; narrow stacks | component + nfr-web timing | T3, T6 |
| AC-02 | Newer/Older by keys and buttons; first/last; no skip/repeat when a generation arrives | unit (neighbours) + component | T2, T3 |
| AC-03 | past the end loads the next page; failure stays with a message | component | T3 |
| AC-04 | Esc/×/outside/Back close to the same grid; last grid card in view without a page load; one Back; Forward reopens | component (popstate) | T1, T3 |
| AC-05 | typed / reload / new tab / recent strip → full page | component (router + App) | T1 |
| AC-06 | delete → neighbour + notice; only one → grid + notice; next page needed / fails; Back never to the deleted one | component | T5 |
| AC-07 | re-run/reuse close and open Generate, Back → grid; edits patch the card with 0 list reads | component | T4 |
| AC-08 | lineage stays in the dialog, one Back; outside the order → no Newer/Older | unit + component | T2, T4 |
| AC-09 | no step from a text field or while busy (draft, tag text, confirmation); Esc innermost-first | component | T3, T4 |
| AC-10 | loading / error / gone inside the dialog, stepping and closing still work | component | T3 |
| AC-11 | foreign page refused for the detail read | integration (existing request-guard tests) | T1, T6 |

- **NFR:** step render ≤ 100 ms p95 for read generations — `nfr-web` (T6) + manual check at ship; request counts and preloads — component tests (T6).
- **Test data:** web api mocks per the gallery tests; `tests/helpers/intersection.ts`; popstate-driven history in jsdom.
