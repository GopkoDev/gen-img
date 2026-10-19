---
id: T5
title: "Delete from the dialog and move to a neighbour"
layer: "ui"
deps: ["T4"]
blocks: ["T6"]
acs: ["AC-06"]
files_hint: ["src/web/features/gallery/DeleteGeneration.tsx", "src/web/features/gallery/galleryNotice.ts", "src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/DeleteGeneration.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Delete from the dialog and move to a neighbour

## Place in the sequence

- **Blocked by:** T4 — Make the detail body safe and dialog-aware: busy, lineage, re-run and in-place card edits · **Blocks:** T6 — Prove the dialog's timing, request counts and preloads · **Wave:** 4 — after the detail body.
- **Lane:** shares `DeleteGeneration.tsx`/`Gallery.tsx` — serialized.

## Why (user story)

> **As an** Owner
> **I want** to comment, tag, re-run, reuse and delete from the dialog as on the detail page
> **So that** I don't have to open the full page to act on a result
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task makes deleting while browsing land on the next result, never on a deleted one.

## Inlined context

> the neighbour (older, else newer) is computed before the delete; on success the dialog shows «Generation deleted.» and the address is replaced with the neighbour (dialog state), or — when there is none — the dialog closes with `history.back()` and the notice is handed to the mounted grid … if the deleted one was the last loaded and more pages exist, the next page is loaded first — if it fails, the dialog closes onto the grid with the notice and the grid's «Couldn't load more»
>
> — `sad.md §4, item 5, abridged` · full text: [sad.md](../sad.md)

> galleryNotice.ts — a tiny store the mounted grid subscribes to («Generation deleted.»); the `?deleted` flag stays for the full page
>
> — `sad.md §5, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `DELETE /api/generations/{id}` (existing).

## Acceptance criteria

### AC-06 (US-05) — domain invariant

> **Given** the dialog shows a generation
> **When** the Owner deletes it (with the existing confirmation)
> **Then** the generation disappears from the grid and the dialog says «Generation deleted.» and shows its older neighbour (the newer one when it was the oldest), or closes onto the grid with that notice when it was the only one — the neighbour is chosen from the order as it was before the deletion, loading the grid's next page when the deleted one was the last loaded (if that page fails, the dialog closes onto the grid with the notice and the grid's own «Couldn't load more»); the dialog never shows a deleted generation and Back never returns to it
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] neighbour before delete; dialog-aware success path — `DeleteGeneration.tsx`
- [ ] `galleryNotice` store + grid subscription — `galleryNotice.ts`, `Gallery.tsx`
- [ ] tests: older neighbour, newest-deleted → newer, only one → close + notice, last loaded → next page then neighbour, next page fails → close + notice + «Couldn't load more»; Back never returns to the deleted id; full page unchanged

## Edge cases

| Case | Behaviour |
|---|---|
| deleted the oldest | newer neighbour |
| deleted the only one | grid + notice |
| next page fails | grid + notice + Couldn't load more |

## Definition of Done

- [ ] tests pass; full-page delete still lands on the grid with the notice
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
