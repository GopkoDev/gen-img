---
id: T2
title: "Implement the shared tag and comment rules"
layer: "domain"
deps: []
blocks: ["T3"]
acs: ["AC-06", "AC-07", "AC-08", "AC-15"]
files_hint: ["src/shared/curation.ts", "src/shared/curation.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T2 — Implement the shared tag and comment rules

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Add comment, tag and atomic-delete queries to the generations repo.
- **Lane:** shares files with T6 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to add and remove short tags on a generation
> **So that** I can group related results and recognise them in the gallery
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: implement the shared tag and comment rules.

## Inlined context

> Tag normalization (trim, collapse inner whitespace, lower-case, allowed characters) is one shared function in `src/shared/` used by the form and the server, like `checkInputFile`.
>
> — `sad.md §4, inline decisions, verbatim` · full text: [sad.md](../sad.md)

> **When** the tag is empty after trimming, longer than 32 characters, or contains characters other than letters of any alphabet, digits, spaces, «-» and «_»
> **Then** the system does not add it and tells the Owner what a tag may contain
>
> — `spec.md §5, AC-07, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

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

### AC-15 — authorization

> **Given** a comment or tag contains text that looks like markup or a script
> **When** it is shown in the gallery or detail view
> **Then** it is shown as plain text exactly as written — it never runs or changes the page
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `normalizeTag(raw)` → `{ok:true, tag}` | `{ok:false, message}` in `src/shared/curation.ts` (Unicode `\p{L}\p{N}`)
- [ ] `checkComment(body)` → `{ok:true, body: string|null}` (null = remove) | `{ok:false, message}`
- [ ] Constants `MAX_TAGS = 10`, `MAX_TAG_CHARS = 32`, `MAX_COMMENT_CHARS = 2000`; zod DTOs `Comment`, `SetCommentRequest`, `AddTagRequest`, `TagsResponse`
- [ ] Unit tests

## Edge cases

| Case | Behaviour |
|---|---|
| «  Neon   City » | «neon city» |
| «Кіт» | «кіт» |
| emoji «🐱» | refused |
| 33 characters | refused |
| comment of 2000 emoji | accepted — counted as characters, not UTF-16 units |
| «<script>» | refused as a tag (characters); as a comment accepted and later rendered as text |

## Definition of Done

- [ ] unit tests: normalizeTag trims, collapses spaces, lower-cases (incl. Cyrillic), accepts letters of any alphabet/digits/space/-/_ 1–32 chars and rejects the rest with the spec message; checkComment counts characters (code points) ≤ 2000 and treats blank as removal
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
