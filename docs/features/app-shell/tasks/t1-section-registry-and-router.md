---
id: T1
title: "Parse addresses into pages and declare sections in one registry"
layer: "domain"
deps: []
blocks: ["T2", "T5"]
acs: ["AC-01", "AC-03", "AC-04"]
files_hint: ["src/web/lib/router.tsx", "src/web/lib/router.test.tsx", "src/web/sections.tsx", "src/web/sections.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T1 — Parse addresses into pages and declare sections in one registry

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2, T5.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each section and each generation to have its own address that works with reload, bookmarks, new tabs and back/forward
> **So that** I can come back to exactly where I was
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: parse addresses into pages and declare sections in one registry.

## Inlined context

> Section declaration `{ id, path, label, icon, page, keepMounted?, owns? }`; order = bar order; exact path, one trailing slash tolerated; no match → not found.
>
> — `sad.md §8` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner opens Ukiyo
> **When** any page is shown
> **Then** a navigation bar lists the sections Generate and Gallery in that order, marks the current one as current (visually and for assistive technology), and one click on an entry shows that section's page without reloading the app
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** the Owner is on any section or on a generation's detail page
> **When** they reload the page, open its address in a new tab, or use the browser's back and forward buttons
> **Then** the same section or generation is shown, and back/forward walk the pages in the order the Owner visited them
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — error

> **Given** the Owner opens an address inside Ukiyo that is neither a section nor a generation
> **When** the page is shown
> **Then** Ukiyo says the page was not found, offers a way to Generate, and keeps the navigation bar — it does not silently show another section
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `parseRoute` returns `{name:'page', pathname}` instead of folding unknown paths into home
- [ ] `replace(path)` = `history.replaceState` + nav event
- [ ] `SECTIONS` + `sectionFor(route)` with `owns` for Gallery

## Edge cases

| Case | Behaviour |
|---|---|
| `/gallery/` | Gallery |
| `/generations/` (no id) | not found |
| `/GALLERY` | not found (paths are exact) |

## Definition of Done

- [ ] unit tests: parseRoute → detail | page(pathname); sectionFor: `/` → generate, `/gallery` (+ trailing slash) → gallery, detail → gallery, unknown → none; `replace()` notifies subscribers; registry order Generate, Gallery
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
