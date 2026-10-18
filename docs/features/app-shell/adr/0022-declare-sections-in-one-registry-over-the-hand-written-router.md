---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "S"
ticket: "roadmap step 8"
---

# 0022 — Declare sections in one registry over the hand-written router

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)
- **Supersedes (in part):** [ADR-0009](../../text-to-image-openrouter/adr/0009-use-a-two-route-history-api-router-in-the-spa.md) — its «two routes» scope; the History API mechanism stays.

## Context

The app shell splits the home page into sections (Generate, Gallery) with their own addresses, a navigation bar and a not-found page (spec AC-01..AC-04). Roadmap steps 10 and 15 add Models and Folders; the spec asks that a new section be one declaration (spec §6). ADR-0009 said a routing library becomes worth it «if routes grow past a handful» — after this step there are three route shapes (a section, a generation, not found), with two more sections planned.

## Decision drivers

- Spec §6: adding a section = one declaration; no edit to the navigation bar.
- CLAUDE.md: keep dependencies lean.
- Existing call sites use `Link` / `navigate` from `lib/router.tsx` (gallery, detail, lineage, panel, delete).

## Considered options

1. **A section registry over the existing router** — `src/web/sections.tsx` lists `{ id, path, label, icon, page, keepMounted?, owns? }`; the navigation bar, the page switch, the document title and the not-found decision all read it. The router only parses `pathname` into «a generation» or «a page path».
2. **A routing library** (TanStack Router / React Router) — nested layouts, typed params, loaders.
3. **Keep two routes and render sections as tabs inside the home page** — no addresses per section.

## Decision outcome

**Chosen:** Option 1. Sections are flat (no nesting beyond «a generation belongs to Gallery»), so a list plus a `pathname` match covers every need; the existing `Link` / `navigate` keep working unchanged, and the call sites need only new targets. Option 2 would add a dependency and a migration of every call site for features this app doesn't use (nested data loading, search-param schemas). Option 3 fails AC-03 (addresses, reload, new tab).

The trigger to revisit: a section needs nested routes of its own or typed search parameters beyond the one-off flags carried today (ADR-0019).

## Consequences

**Positive**
- A new section is one registry entry plus its page component; the bar, the title and the addresses follow.
- Zero new dependencies; parsing stays a pure, unit-tested function.

**Negative**
- No route-level code splitting or loaders; each page fetches its own data as today.
- The «a generation belongs to Gallery» rule is an explicit `owns` predicate on the section, not a nested route.

**Neutral**
- The server's SPA fallback (`index.html` for any non-`/api` path) already serves every section address.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: ADR-0009, [ADR-0023](./0023-keep-the-generate-page-mounted-and-apply-address-carried-drafts-on-every-arrival.md)
