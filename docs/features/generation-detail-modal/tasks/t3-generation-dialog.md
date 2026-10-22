---
id: T3
title: "Show the generation in a dialog over the grid and step through neighbours"
layer: "ui"
deps: ["T1", "T2"]
blocks: ["T4"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-09", "AC-10"]
files_hint: ["src/web/features/gallery/GenerationDialog.tsx", "src/web/features/gallery/GenerationDialog.test.tsx", "src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/GenerationDetail.tsx", "src/web/App.tsx"]
owner: "dmytro.hopko"
estimate: "L"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Show the generation in a dialog over the grid and step through neighbours

## Place in the sequence

- **Blocked by:** T1 — Carry a dialog state in history and keep one Gallery instance under it, T2 — Find a generation's newer and older neighbours in the loaded order · **Blocks:** T4 — Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits · **Wave:** 2 — needs the router and neighbours.
- **Lane:** shares `GenerationDetail.tsx` with T4 — serialized.

## Why (user story)

> **As an** Owner
> **I want** a card I open from the gallery to show the generation in a dialog over the grid, images on the left and metadata on the right
> **So that** I look at the result without losing the grid
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** ← and → (keys and buttons) to show the newer and older generation in the grid's order
> **So that** I can compare results one after another
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** closing the dialog to return me to the grid at the same place
> **So that** browsing continues from the last generation I looked at
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task builds SCR-09 and its movement.

## Inlined context

> SCR-09 states: default (two columns, header with prompt excerpt, Newer/Older, close) · loading · error · gone · first/last · loading next · next failed · busy · outside the grid · deleted → neighbour · narrow
>
> — `screens.md SCR-09, state table, abridged` · full text: [screens.md](../screens.md)

> `keydown` on the dialog: ← newer, → older; ignored when the target is an input, textarea, select or contenteditable, or while busy
>
> — `sad.md §8, Stepping keys, verbatim` · full text: [sad.md](../sad.md)

> on close the grid scrolls the last *grid* generation the dialog showed into view (`scrollIntoView({ block: "nearest" })`) only when it is outside the viewport, else keeps the scroll; the sentinel is re-armed only after the Owner's next scroll — scroll events within 500 ms of the close-time `scrollIntoView` are ignored, so this never loads a page
>
> — `sad.md §8, Close → place, verbatim` · full text: [sad.md](../sad.md)

> `DialogContent` `sm:max-w-6xl h-[90vh] p-0`; `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`; each column `overflow-y-auto`
>
> — `sad.md §8, Layout, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Reads `GET /api/generations/{id}` (existing, cached `["generation", id]`); the grid's next page via its guarded `fetchNextPage`.

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner is on the gallery grid
> **When** the Owner opens a card
> **Then** a dialog over the grid shows that generation — its output images on the left (the first one large, the others as smaller choices that make themselves large when picked) and on the right its prompt, model, parameters, cost with status, duration, created time, inputs, lineage, comment and tags, and its actions; the address becomes the generation's own; on a narrow window the images come first and the metadata below
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-02) — happy path

> **Given** the dialog shows a generation of the grid
> **When** the Owner presses → (or the «Older» button), or ← (or «Newer»)
> **Then** the dialog shows the older (or newer) neighbour in the grid's newest-first order and the address follows; the newest generation has no «Newer», the oldest no «Older»; neighbours are taken relative to the generation shown, so a generation finishing meanwhile, or the grid refreshing, never makes a step skip or repeat one
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-02) — cross-context

> **Given** the dialog shows the last loaded generation and the grid has more pages
> **When** the Owner steps to the older neighbour
> **Then** the grid's next page loads (as when scrolling) and the dialog shows its first generation; if that page fails, the dialog stays on the current generation and says the next one couldn't be loaded, with a way to try again
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-04 (US-03) — happy path

> **Given** the dialog is open, possibly after stepping
> **When** the Owner closes it — Esc, the close button, a click outside, or the browser's Back
> **Then** the grid is shown where it was, without reloading its pages; if the last grid generation the dialog showed is outside the visible cards, the grid scrolls just enough to bring it into view — and that scrolling never loads a further page by itself; one Back closes the dialog however many steps or lineage hops were taken; Forward after a Back shows the same generation in the dialog again; while the dialog is open the grid behind it loads a further page only when stepping asks for it (AC-03), and closing drops an unsaved comment or unsent tag text, as leaving the detail page does today
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-02) — error

> **Given** the Owner is typing in the comment or tag field inside the dialog
> **When** the Owner presses ← or →
> **Then** the cursor moves in the text as usual and the dialog does not step; stepping keys work only when no text field has focus, and stepping (keys and buttons) is unavailable while a comment has unsaved changes, tag text is typed but not added, or the delete confirmation is open — Esc then closes the confirmation (or cancels the comment edit) first, not the dialog; nothing typed or confirmed for one generation can ever apply to another
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-01) — error

> **Given** the generation shown can't be loaded right now, or no longer exists
> **When** the dialog shows it
> **Then** it says so in plain words inside the dialog («Couldn't load this generation» with a way to try again, or «This generation no longer exists»), and stepping and closing still work
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] cards open the dialog (push with the dialog state) — `Gallery.tsx`; sentinel paused while open; close-time scroll rule
- [ ] `GenerationDialog` — layout, Newer/Older (keys + buttons), next page on stepping past the end + failure line, busy guard, close via `history.back()`, preload of ≤ 2 neighbour images — `GenerationDialog.tsx`
- [ ] make the detail body render in the dialog's two-column layout (`GenerationDetail.tsx`), keyed by id
- [ ] component tests per SCR-09 state and the keyboard rules — `GenerationDialog.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| arrow in a text field | no step |
| busy | Newer/Older disabled |
| past the last loaded card | next page, then first of it |
| next page fails | stays + «Couldn't load the next one.» |
| close near the end of the grid | scroll into view, no page load |

## Definition of Done

- [ ] component tests for SCR-09 states, stepping, paging, close pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
