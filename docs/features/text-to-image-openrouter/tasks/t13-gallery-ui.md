---
id: T13
title: "Build the gallery (SCR-02) with paging and empty state"
layer: "ui"
deps: ["T11"]
blocks: []
acs: ["AC-04", "AC-15", "AC-18"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/Gallery.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T13 — Build the gallery (SCR-02) with paging and empty state

## Place in the sequence

- **Blocked by:** T11 — Add the typed web API client and the two-route router · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to see all my generations newest first as thumbnails
> **So that** I can find a past result quickly
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: build the gallery (SCR-02) with paging and empty state.

## Inlined context

> | default | ≥ 1 generation (AC-04, AC-18) | grid of Card tiles: image (lazy), prompt excerpt (2 lines), Badge provider · model, created-at relative; Button «Load more» (outline) when `nextCursor` |
> | empty | 0 generations (AC-15) | text «No generations yet.» + Button «Write a prompt» |
>
> — `screens.md §SCR-02, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `listGenerations` and `getFile` URLs.

## Acceptance criteria

### AC-04 — happy path

> **Given** the Owner has many saved generations
> **When** the Owner opens the gallery
> **Then** the system shows thumbnails newest first with prompt excerpt, model and created-at, and loads older generations on demand rather than all at once
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — happy path

> **Given** the Owner has no saved generations yet
> **When** the Owner opens the gallery
> **Then** the system shows an empty state that points to the generate form
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** a generation was made through a provider
> **When** the Owner looks at it in the gallery or the detail view
> **Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `Gallery.tsx` with `useInfiniteQuery` over `api.generations(cursor)`; Card tiles with `loading="lazy"` images linking to `/generations/:id`
- [ ] Empty state button focuses the prompt textarea (by id)

## Edge cases

| Case | Behaviour |
|---|---|
| thumbnail 404 | «Image unavailable» placeholder |
| nextCursor null | no Load more |

## Definition of Done

- [ ] web tests (mocked api): empty state CTA; tiles show prompt excerpt, provider · model badge, relative time; Load more appends next page and hides when nextCursor null; error + retry
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
