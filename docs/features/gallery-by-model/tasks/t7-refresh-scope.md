---
id: T7
title: "Prove that changes re-read only the views on screen"
layer: "tests"
deps: ["T6"]
blocks: []
acs: ["AC-05"]
files_hint: ["src/web/features/gallery/Views.requests.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T7 — Prove that changes re-read only the views on screen

## Place in the sequence

- **Blocked by:** T6 — Step, close and delete in the dialog within the view it was opened from · **Blocks:** — · **Wave:** 6.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a filtered view to page, show badges and open the detail dialog like the main grid, stepping only within that view
> **So that** browsing one model feels the same as browsing everything
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task measures the spec's refresh rows.

## Inlined context

> Refresh on a change | a finished generation or a deletion costs ≤ 1 request per loaded page of each view on screen + 1 for the recent strip, and 0 for views not on screen (they re-read when next shown); a pending cost is refreshed once across all views, ≤ every 10 s, asking only for the pending generation … Requests per view | each view is read on its first visit; a revisit costs 0 reads unless a change happened since …; a curation change still costs 0 list reads (ADR-0034)
>
> — `spec.md §6, rows 3–4, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — counts mocked api calls.

## Acceptance criteria

### AC-05 (US-01, US-02) — domain invariant

> **Given** generations are added or deleted while a view is shown
> **When** the view updates
> **Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] request-count component tests across All, a filter and By model (fake timers for pending)

## Edge cases

| Case | Behaviour |
|---|---|
| view in memory, not on screen | 0 reads until shown |

## Definition of Done

- [ ] tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
