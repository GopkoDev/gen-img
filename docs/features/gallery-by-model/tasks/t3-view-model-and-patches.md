---
id: T3
title: "Parse gallery views from the address and patch summaries in every view"
layer: "app"
deps: []
blocks: ["T4"]
acs: ["AC-03", "AC-05"]
files_hint: ["src/web/features/gallery/galleryView.ts", "src/web/features/gallery/galleryView.test.ts", "src/web/features/gallery/summaryPatch.ts", "src/web/features/gallery/summaryPatch.test.tsx", "src/web/features/gallery/cardPatch.ts", "src/web/features/gallery/usePendingCost.ts", "src/web/features/gallery/GenerationDialog.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Parse gallery views from the address and patch summaries in every view

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Add the view switch, the model choice and the filtered grid · **Wave:** 1.
- **Lane:** shares `GenerationDialog.tsx` with T6 — serialized.

## Why (user story)

> **As an** Owner
> **I want** the chosen view to stay in the gallery's address
> **So that** Back, reload and links return me to the same view
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** a filtered view to page, show badges and open the detail dialog like the main grid, stepping only within that view
> **So that** browsing one model feels the same as browsing everything
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task gives every view an address and a cache, and keeps every cached view current.

## Inlined context

> `URLSearchParams`: `provider` + `model` (both or none) = one model; `view=models` = by model; anything else = all; serialization round-trips any id
>
> — `sad.md §8, View ↔ address, verbatim` · full text: [sad.md](../sad.md)

> all `["generations"]` (exact, unchanged); model `["generations","model",provider,model]`; groups `["generations","models"]` …; recent `["generations","recent"]`
>
> — `sad.md §8, View keys, abridged` · full text: [sad.md](../sad.md)

> `patchSummaries` over `qc.getQueriesData({ queryKey: ["generations"] })` by data shape (infinite pages / groups), never the recent strip
>
> — `sad.md §8, Patches, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-03 (US-03) — happy path

> **Given** the Owner is on a filtered grid or on «By model»
> **When** the Owner reloads, goes Back after opening something, or opens the gallery's address in a new tab
> **Then** the same view is shown; choosing «All» returns to the full grid and its address; each view keeps its own scroll position for the session, and a view opened for the first time (for example through «Show all N») starts at the top
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-01, US-02) — domain invariant

> **Given** generations are added or deleted while a view is shown
> **When** the view updates
> **Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `parseView(search)`, `viewSearch(view)`, `viewKey(view)` — `galleryView.ts` + unit tests (round-trip odd ids)
- [ ] `patchSummaries(qc, id, patch | "remove")` — `summaryPatch.ts` + tests over all/filtered/groups/recent shapes
- [ ] use it in cardPatch, usePendingCost and the dialog's delete removal

## Edge cases

| Case | Behaviour |
|---|---|
| model id with + and / | round-trips |
| only provider in the address | all |
| recent strip cached | untouched by patches |
| groups cache | card patched inside its group; removal decrements count |

## Definition of Done

- [ ] unit tests pass; existing gallery tests green
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
