---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — generation-detail-modal

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. SCR-09 is new (`GenerationDialog`, on the existing `Dialog` primitive); SCR-03 (full page) and SCR-02 (grid) keep their states — SCR-02 only gains «bring the last shown card into view» on close.

## Screens

### SCR-09 — Detail dialog (new)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | generation read (AC-01) | `Dialog` (`DialogContent` `sm:max-w-6xl h-[90vh] p-0`) · header: `DialogTitle` = prompt excerpt, `Button` ghost icon «Newer» (ChevronLeft), «Older» (ChevronRight), `DialogClose` · left column: large output image (contain, area reserved before load), output thumbnails as `Button`s when > 1 (selected = ring) · right column (scrolls): the full page's metadata rows, Inputs, Lineage, Notes (comment + tags), actions (Re-run, Use as input per output, Delete), raw exchange | wireframe A |
| loading | detail not read yet (§6) | left: muted placeholder of the reserved size; right: «Loading…» | wireframe B |
| error | detail read failed (AC-10) | right column: destructive-tinted panel «Couldn't load this generation» + `Button` outline «Try again»; Newer/Older + close still work | wireframe B |
| gone | generation no longer exists (AC-10) | right column: «This generation no longer exists.» | wireframe B |
| first / last | newest / oldest of the grid (AC-02) | «Newer» / «Older» disabled (`aria-disabled`, tooltip «No newer generation» / «No older generation») | wireframe A |
| loading next | stepping past the last loaded card (AC-03) | «Older» shows a spinner and is disabled until the page arrives | wireframe C |
| next failed | the grid's next page failed (AC-03) | under the header: destructive-tinted line «Couldn't load the next one.» + `Button` link «Try again» | wireframe C |
| busy | unsaved comment, typed tag text, or delete confirmation open (AC-09) | Newer/Older disabled with tooltip «Save or cancel your changes first» | wireframe A |
| outside the grid | reached by a lineage link, not in the loaded order (AC-08) | Newer/Older hidden; muted note in the header «Not in the gallery's current order» | wireframe D |
| deleted → neighbour | delete confirmed, a neighbour exists (AC-06) | the neighbour shown + muted notice line «Generation deleted.» under the header (cleared on the next step) | wireframe D |
| narrow | below `lg` | one column: images, then metadata; the whole body scrolls | — |
| empty | N/A: a dialog always shows one generation | — | — |

```text
A — default (lg)
┌──────────────────────────────────────────────────────────────────────────────┐
│ A neon city at night, rain…                         [‹ Newer] [Older ›]  [×] │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │ Provider  OpenRouter          │
│                large output 1                 │ Model     qwen/…              │
│                                               │ Cost      $0.04 · known       │
│                                               │ Duration  12.4 s              │
│  [▣1] [2] [3] [4]                             │ Prompt …  Inputs …  Lineage … │
│                                               │ Comment / Tags (Notes)        │
│                                               │ [Re-run] [Use as input] [Delete]│
└───────────────────────────────────────────────┴──────────────────────────────┘
B — loading / error / gone (right column)      C — stepping past the end
│ Loading…                                     │ [‹ Newer] [⟳ Older]  
│ ⚠ Couldn't load this generation [Try again]  │ ⚠ Couldn't load the next one. Try again
│ This generation no longer exists.
D — outside the grid / after delete
│ Not in the gallery's current order       (no Newer/Older)
│ Generation deleted.                      (neighbour shown)
```

Keyboard: focus starts on the dialog's close button; ← newer, → older (not while a text field has focus or while busy); Esc closes the innermost layer (delete confirmation, comment edit) before the dialog; Tab cycles inside the dialog.

### SCR-02 — Gallery (on close)

| State | Trigger / condition | Components | Source-ref |
|---|---|---|---|
| returned | dialog closed (AC-04) | grid as it was; if the last grid generation shown is off screen, scrolled into view (nearest); no page load | — |
| deleted notice | dialog closed after deleting the last one / next page failed (AC-06) | existing «Generation deleted.» line | — |

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| GenerationDialog | feature component composing `Dialog` + the detail body | n/a — feature-level |
