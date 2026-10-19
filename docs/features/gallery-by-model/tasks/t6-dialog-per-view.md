---
id: T6
title: "Step, close and delete in the dialog within the view it was opened from"
layer: "ui"
deps: ["T5"]
blocks: ["T7"]
acs: ["AC-04", "AC-05"]
files_hint: ["src/web/lib/router.tsx", "src/web/features/gallery/GenerationDialog.tsx", "src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/ByModel.tsx", "src/web/App.tsx", "src/web/features/gallery/GenerationDialog.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T6 — Step, close and delete in the dialog within the view it was opened from

## Place in the sequence

- **Blocked by:** T5 — Show the gallery grouped by model · **Blocks:** T7 — Prove that changes re-read only the views on screen · **Wave:** 5.
- **Lane:** serialized.

## Why (user story)

> **As an** Owner
> **I want** a filtered view to page, show badges and open the detail dialog like the main grid, stepping only within that view
> **So that** browsing one model feels the same as browsing everything
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task makes the dialog respect the view it was opened from.

## Inlined context

> `{ dialog: "gallery", load, grid: view, order: view }`; the grid behind renders `grid`, stepping uses `order`
>
> — `sad.md §8, Dialog state, verbatim` · full text: [sad.md](../sad.md)

> from a filtered grid the dialog steps through that filter's list; from «By model» it steps through the card's model list (`order` = that model), loading it if needed, while the grid behind stays «By model»; close → place follows generation-detail-modal (scroll the last shown into view) only for grids — «By model» keeps its scroll; a dialog delete takes the neighbour from `order`, and the model's last delete closes onto the view (empty-model state or the section removed).
>
> — `sad.md §4, item 4, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- Filtered list reads for the `order` view.

## Acceptance criteria

### AC-04 (US-04) — cross-context

> **Given** the Owner opens a card from a filtered grid or from a «By model» section
> **When** the Owner steps with ← / → in the detail dialog
> **Then** the view behind the dialog is not switched, the steps go through that model's generations only, newest first (loading more of them at the end — from a «By model» section this means all of that model's generations, not only the four shown), and closing returns to the view the Owner opened it from: a filtered grid brings the last generation shown into view as the main grid does (generation-detail-modal AC-04), «By model» returns to the section unchanged; deleting from the dialog moves to the neighbour in that model's order — when it was the model's last generation, the dialog closes onto the view, where the filtered grid shows the «no generations with that model» state (AC-06) and the «By model» section is gone
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-01, US-02) — domain invariant

> **Given** generations are added or deleted while a view is shown
> **When** the view updates
> **Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] dialog state carries grid + order views; App renders the grid view behind
- [ ] dialog reads the `order` view's list; By model card → order = that model
- [ ] close → place per view; delete neighbour from order; last of a model closes onto the view
- [ ] tests

## Edge cases

| Case | Behaviour |
|---|---|
| open from By model | stepping through all of that model |
| delete last of the model in a filter | empty-model state behind |
| delete last of the model in By model | section gone |

## Definition of Done

- [ ] component tests pass; earlier dialog tests green
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
