---
id: T9
title: "Show the ten latest generations next to the generate form (SCR-06, ADR-0025)"
layer: "ui"
deps: ["T7"]
blocks: []
acs: ["AC-09", "AC-13", "AC-14", "AC-15"]
files_hint: ["src/web/lib/api.ts", "src/web/features/generate/RecentGenerations.tsx", "src/web/features/generate/RecentGenerations.test.tsx", "src/web/sections.tsx", "src/server/modules/generations/routes.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: "SELECT"
---

# T9 — Show the ten latest generations next to the generate form (SCR-06, ADR-0025)

> Amendment 2026-10-19 (spec §1 ¶4).

## Place in the sequence

- **Blocked by:** T7 · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my ten latest generations next to the generate form, each opening its detail page
> **So that** I can compare and revisit recent results without leaving Generate
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

## Inlined context

> `["generations","recent"]`, `limit=10`, `staleTime: ∞`, refetch on focus; thumbnail = `summary.thumbnail`; link to the detail page.
>
> — `sad.md §8` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses the existing `limit` query parameter of the generations list.

## Acceptance criteria

### AC-09 — authorization

> **Given** Ukiyo is running
> **When** a page of another site in the Owner's browser asks Ukiyo for a section's address or for the latest generations
> **Then** the new addresses add no way in: Ukiyo's data stays refused to other sites exactly as before (the app's pages carry no data of their own)
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — happy path

> **Given** the Owner has saved generations
> **When** the Generate page is shown
> **Then** to the right of the generate form a panel lists the ten latest generations, newest first, one thumbnail each (its first output image), and a click on a thumbnail opens that generation's detail page; with fewer than ten it shows all of them, and there is no «load more»
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** the recent panel is shown
> **When** a generation finishes, or a generation is deleted
> **Then** the panel shows the new ten latest without a reload — the new generation first, the deleted one gone — and never more than ten
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — error

> **Given** the latest generations can't be loaded, are loading, or don't exist yet
> **When** the Generate page is shown
> **Then** the panel says so in the app's usual way — a «Loading…» line, «Couldn't load recent generations» with Retry, or «No generations yet.» — and the generate form keeps working
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `api.generations(cursor, limit)`
- [ ] `RecentGenerations` (Card, grid, states)
- [ ] Generate page two-column layout

## Edge cases

| Case | Behaviour |
|---|---|
| a generation with no thumbnail file | «Image unavailable» square |
| 11th generation saved | oldest of the ten drops out |

## Definition of Done

- [ ] web tests: list asked with limit 10 under `["generations","recent"]`; up to ten thumbnails newest first linking to detail; loading / empty / error + Retry; a finished generation and a deletion refresh it once; revisiting Generate makes no request; Generate page lays out two columns at `lg` (class contract); integration test: `limit=10` returns the ten newest and a cross-site request is refused
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
