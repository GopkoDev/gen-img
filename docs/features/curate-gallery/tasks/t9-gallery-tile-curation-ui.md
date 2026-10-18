---
id: T9
title: "Show tags and a comment marker on gallery tiles (SCR-01)"
layer: "ui"
deps: ["T6"]
blocks: []
acs: ["AC-03", "AC-15"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/Gallery.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T9 — Show tags and a comment marker on gallery tiles (SCR-01)

## Place in the sequence

- **Blocked by:** T6 — Expose the curation and delete routes and add tags/comment to the DTOs · **Blocks:** —.
- **Lane:** shares files with T8 — serialized.

## Why (user story)

> **As an** Owner
> **I want** tags on gallery tiles and the comment and tags on the detail view
> **So that** my notes are visible where I browse
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: show tags and a comment marker on gallery tiles (SCR-01).

## Inlined context

> | default | ≥ 1 generation (AC-03) | existing tile + up to 3 `Badge variant="outline"` tags, `Badge` «+N» when more, a `MessageSquare` icon (lucide) with `aria-label="Has a comment"` when a comment exists |
>
> — `screens.md §SCR-01, verbatim` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Reads `GenerationSummary.tags`, `.hasComment`.

## Acceptance criteria

### AC-03 — happy path

> **Given** generations with tags and comments exist
> **When** the Owner opens the gallery and a detail view
> **Then** each tile shows its first 3 tags (with «+N» for the rest) and the detail view shows all tags and the full comment; a tile shows a small marker when a comment exists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — authorization

> **Given** a comment or tag contains text that looks like markup or a script
> **When** it is shown in the gallery or detail view
> **Then** it is shown as plain text exactly as written — it never runs or changes the page
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Tile: up to 3 `Badge variant="outline"` + «+N» Badge; `MessageSquare` icon with `aria-label="Has a comment"`

## Edge cases

| Case | Behaviour |
|---|---|
| 0 tags | no tag row |
| exactly 3 tags | no «+N» |

## Definition of Done

- [ ] web tests: first 3 tags + «+N»; comment marker with aria-label only when hasComment; tag text with markup rendered as text
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
