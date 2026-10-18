---
id: T7
title: "Build the Notes card: comment editor and tag editor (SCR-02)"
layer: "ui"
deps: ["T6"]
blocks: []
acs: ["AC-01", "AC-02", "AC-06", "AC-07", "AC-08", "AC-14", "AC-15"]
files_hint: ["src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/Notes.tsx", "src/web/features/gallery/Notes.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T7 — Build the Notes card: comment editor and tag editor (SCR-02)

## Place in the sequence

- **Blocked by:** T6 — Expose the curation and delete routes and add tags/comment to the DTOs · **Blocks:** —.
- **Lane:** shares files with T8 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to write, change or clear one note on a generation
> **So that** I remember why it matters or what to try next
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the Notes card: comment editor and tag editor (SCR-02).

## Inlined context

> | default | … Card «Notes» with: comment text (`whitespace-pre-wrap`, plain text) or «No comment yet» + Button «Add comment» / «Edit»; tag list as `Badge variant="secondary"` each with an × Button (ghost, `aria-label="Remove tag <tag>"`) + Input «Add a tag» (Enter adds); header Button «Delete» (destructive, outline) |
> | comment editing | Textarea (rows 5) + counter «N / 2000» + Button «Save» + Button «Cancel» | comment validation «Comment must be at most 2 000 characters» | tag validation «Tags may contain letters, digits, spaces, - and _ (1–32 characters)» / «A generation can have at most 10 tags» | no longer exists «This generation no longer exists.» + «← Gallery» |
>
> — `screens.md §SCR-02, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `setComment`, `addTag`, `removeTag` via `src/web/lib/api.ts`.

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

### AC-06 — error

> **Given** the Owner is editing a comment
> **When** the Owner tries to save a comment longer than 2 000 characters (counted as the characters the Owner sees, not bytes)
> **Then** the system does not save it and tells the Owner the comment must be at most 2 000 characters, keeping the typed text
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — error

> **Given** the Owner is adding a tag
> **When** the tag is empty after trimming, longer than 32 characters, or contains characters other than letters of any alphabet, digits, spaces, «-» and «_»
> **Then** the system does not add it and tells the Owner what a tag may contain
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** a generation already has 10 tags, or already has a tag that matches the new one ignoring case and surrounding spaces
> **When** the Owner adds a tag
> **Then** the system keeps the invariant «a generation holds each tag once, at most 10»: an 11th tag is refused with the reason, and a duplicate is not added twice (tags are stored trimmed, lower-case, inner spaces collapsed)
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — error

> **Given** a generation was already deleted (for example in another tab)
> **When** the Owner tries to comment on, tag or delete it again
> **Then** the system tells the Owner the generation no longer exists and offers the way back to the gallery; nothing else changes
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — authorization

> **Given** a comment or tag contains text that looks like markup or a script
> **When** it is shown in the gallery or detail view
> **Then** it is shown as plain text exactly as written — it never runs or changes the page
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `Notes.tsx` per SCR-02 (Card, Textarea, Input, Badge, Button)
- [ ] Client validation via `checkComment` / `normalizeTag`; server field errors mapped
- [ ] Mutations update the detail query and invalidate the gallery query

## Edge cases

| Case | Behaviour |
|---|---|
| Save while saving | disabled |
| server says 404 | detail switches to «This generation no longer exists.» |

## Definition of Done

- [ ] web tests (mocked api): add/edit/cancel/save/remove comment; counter; >2000 refused client-side with text kept; add tag on Enter, duplicate leaves list, invalid/11th shows the message, remove via ×; NOT_FOUND switches to «no longer exists»; markup in comment/tag shown as text
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
