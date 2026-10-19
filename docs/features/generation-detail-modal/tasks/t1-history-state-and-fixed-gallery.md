---
id: T1
title: "Carry a dialog state in history and keep one Gallery instance under it"
layer: "app"
deps: []
blocks: ["T3", "T4"]
acs: ["AC-04", "AC-05", "AC-11"]
files_hint: ["src/web/lib/router.tsx", "src/web/lib/router.test.tsx", "src/web/App.tsx", "src/web/App.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Carry a dialog state in history and keep one Gallery instance under it

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Show the generation in a dialog over the grid and step through neighbours, T4 — Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits · **Wave:** 1 — no deps.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** closing the dialog to return me to the grid at the same place
> **So that** browsing continues from the last generation I looked at
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** a generation's address to keep opening its full detail page when I reach it directly
> **So that** links, reloads and new tabs behave as before
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task lets one address mean «dialog over the grid» or «full page» depending on how the Owner got there.

## Inlined context

> History state `{ dialog: "gallery", load: <id of this app load> }` on the entry the grid pushes; stepping and lineage hops `replaceState` with the same state; the app renders the gallery page plus the dialog when the detail route's state matches the current load, otherwise the full page; closing goes `history.back()`; re-run/reuse replace the dialog's entry with the generate address
>
> — `adr/0033, option 1, abridged` · full text: [adr/0033-mark-a-dialog-visit-in-the-history-entry-and-render-the-grid-under-it-only-for-this-app-load.md](../adr/0033-mark-a-dialog-visit-in-the-history-entry-and-render-the-grid-under-it-only-for-this-app-load.md)

> Gallery rendered at one fixed place in the tree for both `/gallery` and a detail route with this load's dialog state (never remounts on open/step/close); GenerationDialog on top; any other detail route → full page
>
> — `sad.md §5, App.tsx, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface (the detail read stays behind the request guard; AC-11 is covered by the existing guard integration tests, re-run in the gate).

## Acceptance criteria

### AC-04 (US-03) — happy path

> **Given** the dialog is open, possibly after stepping
> **When** the Owner closes it — Esc, the close button, a click outside, or the browser's Back
> **Then** the grid is shown where it was, without reloading its pages; if the last grid generation the dialog showed is outside the visible cards, the grid scrolls just enough to bring it into view — and that scrolling never loads a further page by itself; one Back closes the dialog however many steps or lineage hops were taken; Forward after a Back shows the same generation in the dialog again; while the dialog is open the grid behind it loads a further page only when stepping asks for it (AC-03), and closing drops an unsaved comment or unsent tag text, as leaving the detail page does today
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-04) — cross-context

> **Given** a generation's address is opened directly — typed, reloaded, from a new tab, or from the recent strip next to the generate form
> **When** the page loads
> **Then** the full detail page is shown as before (no grid behind it, no stepping), with its way back to the gallery
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
### AC-11 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for a generation
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `navigate(path, state?)`, `replace(path, state?)`, `useRoute()` → `{ …route, state }`, `APP_LOAD` id, `dialogState()` helper — `router.tsx` + tests
- [ ] App: Gallery at a fixed tree position for `/gallery` and dialog-state detail routes; a `GenerationDialog` slot (placeholder until T3); other detail routes → full page — `App.tsx`
- [ ] tests: same address with this load's state → grid + dialog slot, with an older load's state or none → full page; Gallery not remounted between `/gallery` and the dialog route; popstate back/forward

## Edge cases

| Case | Behaviour |
|---|---|
| reload (state kept, new load id) | full page |
| new tab / typed address | full page |
| Back from dialog entry | /gallery, same Gallery instance |

## Definition of Done

- [ ] router + App tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
