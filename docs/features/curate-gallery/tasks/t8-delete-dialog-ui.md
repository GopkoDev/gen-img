---
id: T8
title: "Build the delete confirmation and its after-effects (SCR-03, SCR-01 notice, SCR-04)"
layer: "ui"
deps: ["T6"]
blocks: []
acs: ["AC-04", "AC-05", "AC-09", "AC-12", "AC-14"]
files_hint: ["src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/DeleteGeneration.tsx", "src/web/features/gallery/DeleteGeneration.test.tsx", "src/web/features/gallery/Gallery.tsx", "src/web/features/generate/GeneratePanel.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T8 — Build the delete confirmation and its after-effects (SCR-03, SCR-01 notice, SCR-04)

## Place in the sequence

- **Blocked by:** T6 — Expose the curation and delete routes and add tags/comment to the DTOs · **Blocks:** —.
- **Lane:** shares files with T7, T9 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to delete a generation after confirming it
> **So that** unwanted results and their files are gone from my machine
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the delete confirmation and its after-effects (SCR-03, SCR-01 notice, SCR-04).

## Inlined context

> | default | Delete pressed (AC-04) | `Dialog` with title «Delete this generation?», body: prompt excerpt (first 80 chars, quoted) + «Its images and input copies will be removed from this machine. This can't be undone.», Button «Cancel» (outline) + Button «Delete» (destructive) |
> | deleting | both buttons disabled, Delete with spinner; dialog can't be dismissed |
>
> — `screens.md §SCR-03, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `deleteGeneration` via `src/web/lib/api.ts`.

## Acceptance criteria

### AC-04 — happy path

> **Given** the Owner is on a generation's detail view (the only place deletion is offered)
> **When** the Owner chooses delete and confirms in the confirmation dialog, which names the generation by its prompt excerpt and says that its images will be removed for good
> **Then** the generation disappears from the gallery, its images (outputs and input copies) can no longer be opened, the Owner lands back on the gallery with a short «deleted» notice, and its files no longer take space on the machine; other open gen-img tabs drop it from their gallery the next time they are focused, and its detail view there says it no longer exists (AC-14)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — happy path

> **Given** the Owner opened the delete confirmation
> **When** the Owner cancels or closes the dialog
> **Then** nothing is deleted and the detail view stays as it was
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — domain invariant

> **Given** the Owner confirmed a deletion but removing the generation's files fails part-way, or gen-img stops in the middle of it
> **When** gen-img continues or starts again
> **Then** the deletion is all-or-nothing: either the generation is fully present (record, comment, tags, every image openable) and the Owner is told the deletion failed and why, or it is fully gone — never a gallery entry with missing images, never images of a deleted generation still openable
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — cross-context

> **Given** the generate panel shows a just-saved generation as the latest result
> **When** the Owner deletes that generation
> **Then** the generate panel stops showing it as the latest result (no broken image or link to a missing generation)
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — error

> **Given** a generation was already deleted (for example in another tab)
> **When** the Owner tries to comment on, tag or delete it again
> **Then** the system tells the Owner the generation no longer exists and offers the way back to the gallery; nothing else changes
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `DeleteGeneration.tsx` with shadcn `Dialog` (no browser confirm)
- [ ] Navigate with state flag → Gallery shows the one-off notice
- [ ] GeneratePanel `LatestResult`: hide on NOT_FOUND

## Edge cases

| Case | Behaviour |
|---|---|
| Confirm twice | second click ignored while deleting |
| dialog dismissed while deleting | not dismissible |

## Definition of Done

- [ ] web tests (mocked api): dialog names the prompt excerpt; Cancel/Esc sends nothing; Confirm deletes, navigates to the gallery with «Generation deleted.», invalidates gallery + job queries; STORAGE_ERROR shows the failure panel; NOT_FOUND shows «no longer exists»; the panel's latest result disappears when its generation 404s
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
