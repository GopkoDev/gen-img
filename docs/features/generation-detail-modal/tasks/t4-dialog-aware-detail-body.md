---
id: T4
title: "Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits"
layer: "ui"
deps: ["T1", "T3"]
blocks: ["T5"]
acs: ["AC-07", "AC-08", "AC-09"]
files_hint: ["src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/Notes.tsx", "src/web/features/gallery/Lineage.tsx", "src/web/features/gallery/DeleteGeneration.tsx", "src/web/features/gallery/Notes.test.tsx", "src/web/features/gallery/Lineage.test.tsx", "src/web/features/gallery/GenerationDialog.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits

## Place in the sequence

- **Blocked by:** T1 — Carry a dialog state in history and keep one Gallery instance under it, T3 — Show the generation in a dialog over the grid and step through neighbours · **Blocks:** T5 — Delete from the dialog and move to a neighbour · **Wave:** 3 — same files as T3.
- **Lane:** shares `GenerationDetail.tsx` — serialized.

## Why (user story)

> **As an** Owner
> **I want** to comment, tag, re-run, reuse and delete from the dialog as on the detail page
> **So that** I don't have to open the full page to act on a result
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task makes every action inside the dialog behave right and never leak to another generation.

## Inlined context

> `Detail` reports unsaved comment draft / tag text typed but not added / open delete confirmation via `onBusyChange`
>
> — `sad.md §8, Busy, abridged` · full text: [sad.md](../sad.md)

> the delete confirmation is a nested Radix dialog (closes first by itself); while a comment edit is open the dialog's `onEscapeKeyDown` calls `preventDefault()` and cancels the edit
>
> — `sad.md §8, Esc, abridged` · full text: [sad.md](../sad.md)

> `setQueryData(["generations"], patch(id, { tags, hasComment }))` + `invalidateQueries(["generation", id])` + `invalidateQueries(["generations","recent"], exact)`
>
> — `sad.md §8, Card patch, verbatim` · full text: [sad.md](../sad.md)

> Lineage.tsx — inside the dialog: links replace with the dialog state; on the full page: unchanged pushes … inside the dialog re-run/reuse replace the entry with the generate address
>
> — `sad.md §5, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Uses the existing comment/tag operations (curate-gallery) and their answers for the card patch.

## Acceptance criteria

### AC-07 (US-05) — cross-context

> **Given** the dialog shows a generation
> **When** the Owner re-runs it or uses one of its images as input
> **Then** the dialog closes and the generate form opens with the draft exactly as step 6 defines, and Back from the generate form returns to the grid; a comment or tag change shows on the generation's card in the grid behind the dialog without the grid reloading its pages; a deletion, or a generation finishing while the dialog is open, refreshes the grid's loaded pages as before (gallery-grid AC-06), and a pending cost keeps refreshing on its card
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-05) — cross-context

> **Given** the dialog shows a generation with a lineage link (re-run of / made from)
> **When** the Owner follows the link
> **Then** the dialog shows that generation (still one Back from the grid); if it isn't in the grid's loaded order, «Newer» / «Older» are not offered for it, and closing brings the last grid generation the dialog showed into view (AC-04)
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-02) — error

> **Given** the Owner is typing in the comment or tag field inside the dialog
> **When** the Owner presses ← or →
> **Then** the cursor moves in the text as usual and the dialog does not step; stepping keys work only when no text field has focus, and stepping (keys and buttons) is unavailable while a comment has unsaved changes, tag text is typed but not added, or the delete confirmation is open — Esc then closes the confirmation (or cancels the comment edit) first, not the dialog; nothing typed or confirmed for one generation can ever apply to another
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] busy reporting from Notes (draft, tag text) and DeleteGeneration (confirmation open); Esc cancels a comment edit inside the dialog
- [ ] card patch helper replacing the gallery invalidation in Notes — tests count list requests (0)
- [ ] Lineage links replace with the dialog state inside the dialog
- [ ] re-run / use-as-input inside the dialog replace the entry with the generate address; Back from Generate → grid
- [ ] tests in Notes/Lineage/GenerationDialog tests

## Edge cases

| Case | Behaviour |
|---|---|
| unsaved comment then → | no step |
| tag added in the dialog | card tags update, 0 list reads |
| lineage source not loaded | shown; no Newer/Older |
| re-run then Back | grid, no duplicate entry |

## Definition of Done

- [ ] component tests pass; full-page behaviour unchanged
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
