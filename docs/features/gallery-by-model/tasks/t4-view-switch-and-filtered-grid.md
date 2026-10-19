---
id: T4
title: "Add the view switch, the model choice and the filtered grid"
layer: "ui"
deps: ["T2", "T3"]
blocks: ["T5"]
acs: ["AC-01", "AC-03", "AC-06", "AC-07", "AC-10"]
files_hint: ["src/web/features/gallery/GalleryViews.tsx", "src/web/features/gallery/Gallery.tsx", "src/web/sections.tsx", "src/web/features/gallery/GalleryViews.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Add the view switch, the model choice and the filtered grid

## Place in the sequence

- **Blocked by:** T2 — Filter the list by model and read the models with counts and latest cards, T3 — Parse gallery views from the address and patch summaries in every view · **Blocks:** T5 — Show the gallery grouped by model · **Wave:** 3.
- **Lane:** shares `Gallery.tsx` with T5, T6 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to choose one of the models I have generated with and see only its generations
> **So that** I can judge that model's results
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** the chosen view to stay in the gallery's address
> **So that** Back, reload and links return me to the same view
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task lets the Owner pick a model and see only its generations.

## Inlined context

> SCR-02 view switch (All / By model + model choice Popover: name · provider · count), choice loading / failed, one model heading «<model> · <provider> · N generations» + «Show all generations», no generations with the model «No generations with <model> (<provider>).» + «Show all generations»
>
> — `screens.md SCR-02, abridged` · full text: [screens.md](../screens.md)

> `savedScroll[viewKey]`; a view never shown starts at 0
>
> — `sad.md §8, Scroll per view, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations/models?latest=4` (the choice and «By model» share it); `GET /api/generations?provider=&model=`.

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner has generations with several models
> **When** the Owner opens the model choice in the gallery
> **Then** it lists every provider + model the Owner has generated with — the model's name or id, the provider, and how many generations it has — most recently used first, and choosing one shows only that model's generations, newest first, with the same cards and badges as the main grid
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-03) — happy path

> **Given** the Owner is on a filtered grid or on «By model»
> **When** the Owner reloads, goes Back after opening something, or opens the gallery's address in a new tab
> **Then** the same view is shown; choosing «All» returns to the full grid and its address; each view keeps its own scroll position for the session, and a view opened for the first time (for example through «Show all N») starts at the top
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-01) — error

> **Given** the gallery's address names a model the Owner has no generations with (mistyped, or every generation of it deleted)
> **When** the gallery is shown
> **Then** it says plainly that there are no generations with that model (naming it) and offers to show all generations — not an error page and never «No generations yet» while other generations exist; a model is matched exactly as it was stored (same characters, same case), and any model id survives the address unchanged
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-01, US-02) — error

> **Given** the model choice or «By model» can't be loaded right now
> **When** the Owner opens it
> **Then** a plain message with a way to try again is shown, and the main grid stays usable
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-03) — cross-context

> **Given** the Owner is on a filtered view or «By model»
> **When** the Owner goes to another section and comes back to the gallery through the sidebar
> **Then** the gallery opens on «All», as the sidebar entry always does; Back still returns to the view the Owner left
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `GalleryViews` — `GalleryViews.tsx`
- [ ] grid per view (key, filter, heading, empty-model state, per-view scroll) — `Gallery.tsx`
- [ ] sidebar Gallery entry stays `/gallery` (All)
- [ ] component tests incl. reload/Back with popstate

## Edge cases

| Case | Behaviour |
|---|---|
| choice fails | message + Try again; grid unchanged |
| unknown model in the address | empty-model state |
| sidebar entry from a filter | All |

## Definition of Done

- [ ] component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
