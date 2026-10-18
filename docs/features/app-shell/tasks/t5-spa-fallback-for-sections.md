---
id: T5
title: "Prove section addresses get the app page and the API stays guarded"
layer: "ports"
deps: ["T1"]
blocks: []
acs: ["AC-03", "AC-09"]
files_hint: ["src/server/spa-fallback.int.test.ts", "src/server/app.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T5 — Prove section addresses get the app page and the API stays guarded

## Place in the sequence

- **Blocked by:** T1 — Parse addresses into pages and declare sections in one registry · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each section and each generation to have its own address that works with reload, bookmarks, new tabs and back/forward
> **So that** I can come back to exactly where I was
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: prove section addresses get the app page and the API stays guarded.

## Inlined context

> The server already serves `index.html` for every non-`/api` path when it serves the built SPA.
>
> — `sad.md §2` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

### AC-03 — happy path

> **Given** the Owner is on any section or on a generation's detail page
> **When** they reload the page, open its address in a new tab, or use the browser's back and forward buttons
> **Then** the same section or generation is shown, and back/forward walk the pages in the order the Owner visited them
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — authorization

> **Given** Ukiyo is running
> **When** a page of another site in the Owner's browser asks Ukiyo for a section's address
> **Then** the new addresses add no way in: Ukiyo's data stays refused to other sites exactly as before (the app's pages carry no data of their own)
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] integration test over `createApp(..., { webDir })`
- [ ] fix the fallback only if the test is red

## Edge cases

| Case | Behaviour |
|---|---|
| a real asset path | served as the file, not index.html |

## Definition of Done

- [ ] integration tests with a temp web dir: `/gallery`, `/generations/<id>`, an unknown path → the app page; unknown `/api/*` → error envelope; a cross-site request to `/api/*` still refused
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
