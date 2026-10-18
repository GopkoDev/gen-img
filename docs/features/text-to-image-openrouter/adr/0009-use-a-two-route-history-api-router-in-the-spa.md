---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0009 — Use a two-route History API router in the SPA

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The UI needs a home page (generate panel + gallery) and a detail page with its own address (ux-flows: bookmarkable, reloadable). The SPA has no router yet; the server already falls back to `index.html` for unknown paths in production.

## Decision drivers

- ux-flows platform decisions (detail page with an address, back link).
- CLAUDE.md: keep dependencies lean; one component library only.

## Considered options

1. **Hand-rolled History API router** — a tiny `useRoute()` over `location.pathname` (`/` and `/generations/:id`) with `pushState` + `popstate`.
2. **A routing library** (e.g. TanStack Router / React Router).
3. **Hash routes** (`#/generations/:id`).

## Decision outcome

**Chosen:** Option 1. Two routes don't justify a dependency, and the server's SPA fallback already supports clean paths. A library becomes worth it if routes grow past a handful (steps 5–6 add none so far). Hash routes work but give uglier, less conventional addresses for no gain.

## Consequences

**Positive**
- Zero new dependencies; trivial to test.

**Negative**
- No nested routes, loaders or typed params; must be replaced if navigation grows.

**Neutral**
- Swapping in a library later touches only `lib/router.tsx` and two call sites.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: —
