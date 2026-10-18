---
id: T2
title: "Render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05)"
layer: "ui"
deps: ["T1"]
blocks: ["T3"]
acs: ["AC-01", "AC-02", "AC-03", "AC-04", "AC-10"]
files_hint: ["src/web/App.tsx", "src/web/App.test.tsx", "src/web/components/NavBar.tsx", "src/web/components/NotFound.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: "SELECT"
---

# T2 — Render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05)

## Place in the sequence

- **Blocked by:** T1 — Parse addresses into pages and declare sections in one registry · **Blocks:** T3.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a navigation bar that lists Ukiyo's sections and shows where I am
> **So that** I reach generating and the gallery in one click, each on its own full page
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05).

## Inlined context

> SCR-04 default: brand «Ukiyo»; `<nav aria-label="Sections">` with one link per section: lucide icon + label; server status Badge at the bottom · current: `aria-current="page"` + `bg-accent` · narrow: same entries in a top row.
>
> — `screens.md §SCR-04, abridged` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

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

### AC-02 — happy path

> **Given** the Owner is on the Gallery or opens a generation's detail page
> **When** the page is shown
> **Then** the Gallery section is marked as current on the detail page too, the detail page's «Gallery» link returns to the Gallery section, and the browser tab title names the current section (e.g. «Gallery · Ukiyo»)
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

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

### AC-10 — happy path

> **Given** a window narrower than a tablet
> **When** any page is shown
> **Then** the sections stay reachable in one click from a compact bar at the top of the page, and no page needs horizontal scrolling because of the navigation
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `NavBar` from `SECTIONS`
- [ ] page switch in `App` honouring `keepMounted` with `hidden`
- [ ] document title effect
- [ ] `NotFound`

## Edge cases

| Case | Behaviour |
|---|---|
| health pending | «checking…» badge as before |
| detail of an unknown id | SCR-03 «Generation not found.», Gallery still current |

## Definition of Done

- [ ] web tests over `App`: bar lists Generate, Gallery in order with `aria-current` on the owning entry (detail → Gallery); click switches page without reload; popstate back/forward; unknown address → «Page not found.» + «Go to Generate», no entry current; document title per page; bar is a top row below `md` (class contract); server status texts unchanged
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
