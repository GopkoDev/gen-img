---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 12"
---

# 0033 — Mark a dialog visit in the history entry and render the grid under it only for this app load

- **Status:** Accepted (extends [ADR-0009](../../text-to-image-openrouter/adr/0009-use-a-two-route-history-api-router-in-the-spa.md): the router now carries an optional history state)
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

A generation's address must mean «dialog over the grid» when the Owner opened it from the grid, and «full page» when it is reached directly — typed, reloaded, new tab, recent strip (spec AC-01, AC-05). The router stores no history state today (`pushState(null)`), the detail route replaces the page, and only Generate stays mounted (ADR-0023). Back must close the dialog in one press however many steps were taken, Forward must reopen it, and Back from Generate after a re-run must land on the grid (AC-04, AC-07). The devil's-advocate pass showed that, without state, these sequences can't be told apart.

## Decision drivers

- Spec AC-04/AC-05/AC-07/AC-08: one Back closes; Forward reopens; direct access = full page; re-run's Back = grid.
- Keep one address per generation (no `?modal` flag in the URL — links stay clean and shareable as the full page).
- ADR-0009 / ADR-0022: History API only, sections own their routes.

## Considered options

1. **History state `{ dialog: "gallery", load: <id of this app load> }` on the entry the grid pushes; stepping and lineage hops `replaceState` with the same state; the app renders the gallery page plus the dialog when the detail route's state matches the current load, otherwise the full page; closing goes `history.back()`; re-run/reuse replace the dialog's entry with the generate address, so Back from Generate lands on the grid entry below.** A reload or a new tab starts a new load id, so a kept state from an older load shows the full page.
2. **A query flag in the address (`/generations/:id?view=dialog`)** — visible in links and copies; a copied link opens a dialog over a grid that was never browsed.
3. **Keep the dialog purely in React state, address unchanged (`/gallery`)** — Back can't close it, the generation has no address while open, and AC-01's «address becomes the generation's own» fails.

## Decision outcome

**Chosen:** Option 1. History state is exactly «how the Owner got here», it survives Back/Forward, and the load id turns a reload into a direct visit as AC-05 asks. Option 2 leaks a UI mode into shareable addresses; option 3 breaks Back and the address.

## Consequences

**Positive**
- One Back closes; Forward reopens; reload shows the full page; links stay clean.

**Negative**
- The gallery must stay one mounted instance across `/gallery` and the dialog state (fixed place in the tree), or the grid's state is lost on open/close.
- `navigate` / `replace` gain an optional state argument and `useRoute` exposes it; every navigation inside the dialog must use `replace` with the state (lint-free but easy to forget — covered by tests).

**Neutral**
- The full detail page and the dialog share one `Detail` body.

## Links

- Spec: [[../spec.md]] AC-01, AC-04, AC-05, AC-07, AC-08
- SAD: [[../sad.md]] §4, §6, §8
- Related ADR: ADR-0009, ADR-0022, ADR-0023, ADR-0032
