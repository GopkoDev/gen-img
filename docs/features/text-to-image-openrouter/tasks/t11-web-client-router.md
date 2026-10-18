---
id: T11
title: "Add the typed web API client and the two-route router"
layer: "ui"
deps: ["T10"]
blocks: ["T12", "T13", "T14"]
acs: ["AC-18"]
files_hint: ["src/web/lib/api.ts", "src/web/lib/router.tsx", "src/web/lib/router.test.tsx", "src/web/App.tsx", "src/web/lib/format.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T11 — Add the typed web API client and the two-route router

## Place in the sequence

- **Blocked by:** T10 — Expose generations, job and file routes and wire the app · **Blocks:** T12 — Build the generate panel (SCR-01) in all its states, T13 — Build the gallery (SCR-02) with paging and empty state, T14 — Build the generation detail page (SCR-03).
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to see all my generations newest first as thumbnails
> **So that** I can find a past result quickly
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add the typed web API client and the two-route router.

## Inlined context

> **Chosen:** Option 1. … a tiny `useRoute()` over `location.pathname` (`/` and `/generations/:id`) with `pushState` + `popstate`.
>
> — `adr/0009, option 1 + outcome, abridged` · full text: [ADR-0009](../adr/0009-use-a-two-route-history-api-router-in-the-spa.md)

> Home layout (`/`): two columns at `lg` — SCR-01 generate panel (left, ~380px) + SCR-02 gallery (right, fluid); stacked below `md`. Detail (`/generations/:id`) is SCR-03 full width. … Cost formatting: micro-USD → `$` with 6 decimals trimmed to at least 2 (`$0.04`, `$0.000125`).
>
> — `screens.md §Source + SCR-03, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Calls every operation in `contracts/openapi.yaml` through `src/web/lib/api.ts`.

## Acceptance criteria

### AC-18 — cross-context

> **Given** a generation was made through a provider
> **When** the Owner looks at it in the gallery or the detail view
> **Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `api.ts`: `providers()`, `models(id)`, `startGeneration(body)`, `currentJob()`, `dismissJob()`, `generations(cursor?)`, `generation(id)` parsed with the shared zod schemas
- [ ] `router.tsx`: `useRoute()` over `location.pathname`, `navigate(path)`, `<Link>`; `App.tsx` switches HomePage (generate + gallery columns) / DetailPage
- [ ] `format.ts`: `formatCost(micros, status)`, `formatDuration(ms)`, `formatRelative(iso)`

## Edge cases

| Case | Behaviour |
|---|---|
| unknown path | home page |
| cost 125 micros | «$0.000125» |
| cost status unavailable | «unavailable» |

## Definition of Done

- [ ] web tests: router renders home at / and detail at /generations/:id, navigate() pushes history and popstate re-renders; formatCost renders micro-USD and «unavailable»
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
