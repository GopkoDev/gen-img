---
id: T2
title: "Find a generation's newer and older neighbours in the loaded order"
layer: "domain"
deps: []
blocks: ["T3"]
acs: ["AC-02", "AC-08"]
files_hint: ["src/web/features/gallery/neighbours.ts", "src/web/features/gallery/neighbours.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Find a generation's newer and older neighbours in the loaded order

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Show the generation in a dialog over the grid and step through neighbours · **Wave:** 1 — pure.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** ← and → (keys and buttons) to show the newer and older generation in the grid's order
> **So that** I can compare results one after another
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task makes stepping exact — relative to the generation shown, never skipping or repeating.

## Inlined context

> `neighbours(items, id)` over the flattened gallery pages → `{ newer, older, atEnd }`; … a generation not in the order (lineage) has no neighbours
>
> — `sad.md §4, item 3, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-02 (US-02) — happy path

> **Given** the dialog shows a generation of the grid
> **When** the Owner presses → (or the «Older» button), or ← (or «Newer»)
> **Then** the dialog shows the older (or newer) neighbour in the grid's newest-first order and the address follows; the newest generation has no «Newer», the oldest no «Older»; neighbours are taken relative to the generation shown, so a generation finishing meanwhile, or the grid refreshing, never makes a step skip or repeat one
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-05) — cross-context

> **Given** the dialog shows a generation with a lineage link (re-run of / made from)
> **When** the Owner follows the link
> **Then** the dialog shows that generation (still one Back from the grid); if it isn't in the grid's loaded order, «Newer» / «Older» are not offered for it, and closing brings the last grid generation the dialog showed into view (AC-04)
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `neighbours(items, id)` — `neighbours.ts`
- [ ] unit tests — `neighbours.test.ts` (place: unit project picks up `src/**/*.test.ts`; import types relatively)

## Edge cases

| Case | Behaviour |
|---|---|
| id not in items | { newer: null, older: null, atEnd: false, inOrder: false } |
| first item | newer null |
| last item | older null, atEnd true |
| a new item prepended | neighbours of the same id unchanged |

## Definition of Done

- [ ] unit tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
