---
id: T6
title: "Expose the curation and delete routes and add tags/comment to the DTOs"
layer: "ports"
deps: ["T5"]
blocks: ["T7", "T8", "T9", "T10"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-13", "AC-14"]
files_hint: ["src/server/modules/generations/routes.ts", "src/server/modules/generations/curation-routes.int.test.ts", "src/shared/generations.ts", "src/shared/curation.ts", "src/web/lib/api.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T6 — Expose the curation and delete routes and add tags/comment to the DTOs

## Place in the sequence

- **Blocked by:** T5 — Curate and delete generations in the service without disturbing running work · **Blocks:** T7 — Build the Notes card: comment editor and tag editor (SCR-02), T8 — Build the delete confirmation and its after-effects (SCR-03, SCR-01 notice, SCR-04), T9 — Show tags and a comment marker on gallery tiles (SCR-01), T10 — Verify the curation and deletion NFRs.
- **Lane:** shares files with T2 — serialized.

## Why (user story)

> **As an** Owner
> **I want** only gen-img's own pages to be able to change or delete my generations
> **So that** another site in my browser cannot wipe or vandalise my gallery
>
> — `spec.md §4, US-06, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose the curation and delete routes and add tags/comment to the DTOs.

## Inlined context

> **Given** a page from another site is open in the Owner's browser while gen-img runs
> **When** that page tries to change a comment or tags, or delete a generation, through gen-img
> **Then** gen-img refuses: nothing is changed or deleted
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `PUT /generations/{id}/comment` `{body}` → 200 `{comment: {body, updatedAt} | null}` · 400 VALIDATION_ERROR `details.fields.body` · 404.
- `POST /generations/{id}/tags` `{tag}` → 200 `{tags: string[]}` (insertion order) · 400 `details.fields.tag` · 404.
- `DELETE /generations/{id}/tags/{tag}` → 200 `{tags}` · 404.
- `DELETE /generations/{id}` → 204 · 404 · 500 STORAGE_ERROR (generation intact).
- Summary adds `tags`, `hasComment`; detail adds `tags`, `comment`. All → 403 FORBIDDEN via the guard.

— `contracts/openapi.yaml, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner writes a comment and saves it
> **Then** the comment is shown on the detail view exactly as written (line breaks kept) and is still there after a reload; saving an edited text replaces it, and saving an empty or whitespace-only text removes it. The comment is saved only by an explicit Save (Cancel drops the edit); if it was changed in another tab meanwhile, the last save wins
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner adds a tag and later removes it
> **Then** each add or remove is saved at once (no separate Save step); the tag appears on the detail view and on the generation's gallery tile, and after removal disappears from both; tags keep the order they were added in, and the change survives a reload
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** generations with tags and comments exist
> **When** the Owner opens the gallery and a detail view
> **Then** each tile shows its first 3 tags (with «+N» for the rest) and the detail view shows all tags and the full comment; a tile shows a small marker when a comment exists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — happy path

> **Given** the Owner is on a generation's detail view (the only place deletion is offered)
> **When** the Owner chooses delete and confirms in the confirmation dialog, which names the generation by its prompt excerpt and says that its images will be removed for good
> **Then** the generation disappears from the gallery, its images (outputs and input copies) can no longer be opened, the Owner lands back on the gallery with a short «deleted» notice, and its files no longer take space on the machine; other open gen-img tabs drop it from their gallery the next time they are focused, and its detail view there says it no longer exists (AC-14)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** a page from another site is open in the Owner's browser while gen-img runs
> **When** that page tries to change a comment or tags, or delete a generation, through gen-img
> **Then** gen-img refuses: nothing is changed or deleted
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — error

> **Given** a generation was already deleted (for example in another tab)
> **When** the Owner tries to comment on, tag or delete it again
> **Then** the system tells the Owner the generation no longer exists and offers the way back to the gallery; nothing else changes
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Routes: `PUT /generations/:id/comment`, `POST /generations/:id/tags`, `DELETE /generations/:id/tags/:tag`, `DELETE /generations/:id`
- [ ] DTOs: `GenerationSummary.tags`, `.hasComment`; `Generation.tags`, `.comment` (zod in `src/shared/generations.ts`)
- [ ] `src/web/lib/api.ts`: `setComment`, `addTag`, `removeTag`, `deleteGeneration`

## Edge cases

| Case | Behaviour |
|---|---|
| malformed JSON body | 400 VALIDATION_ERROR |
| tag path segment with %-encoding | decoded before normalization |
| foreign Origin | 403, no change |

## Definition of Done

- [ ] integration tests via app.request(): each operation's happy + 400 + 404 paths; summary/detail carry tags/hasComment/comment; cross-site requests to all four mutating routes → 403 and nothing changes; web api client methods parse with the shared schemas
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
