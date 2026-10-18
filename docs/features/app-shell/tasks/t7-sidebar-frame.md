---
id: T7
title: "Put the app frame on the sidebar block (SCR-04)"
layer: "ui"
deps: ["T6"]
blocks: ["T8", "T9"]
acs: ["AC-01", "AC-02", "AC-04", "AC-06", "AC-10", "AC-16"]
files_hint: ["src/web/App.tsx", "src/web/components/app-sidebar.tsx", "src/web/App.test.tsx", "src/web/AppShell.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: "SELECT"
---

# T7 — Put the app frame on the sidebar block (SCR-04)

> Amendment 2026-10-19 (spec §1 ¶4).

## Place in the sequence

- **Blocked by:** T6 · **Blocks:** T8, T9.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a navigation bar that lists Ukiyo's sections and shows where I am
> **So that** I reach generating and the gallery in one click, each on its own full page
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

## Inlined context

> SCR-04 default: `AppSidebar` (variant inset): header = brand; content = `SidebarMenu` with one `SidebarMenuButton` per section inside `<nav aria-label="Sections">`; footer = `ModeToggle` + server status Badge. `SidebarInset`: header row `SidebarTrigger` · `Separator` · `Breadcrumb`, then the page.
>
> — `screens.md §SCR-04, abridged` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full and follow it. Do not guess.

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

### AC-04 — error

> **Given** the Owner opens an address inside Ukiyo that is neither a section nor a generation
> **When** the page is shown
> **Then** Ukiyo says the page was not found, offers a way to Generate, and keeps the navigation bar — it does not silently show another section
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** a generation is in progress
> **When** the Owner is on any section other than Generate
> **Then** the navigation bar shows that a generation is running on the Generate entry; when it finishes it is in the gallery without the Owner reloading, and a failure that is still waiting for the Owner's dismissal is flagged on the Generate entry until it is dismissed
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — happy path

> **Given** a window narrower than a tablet
> **When** any page is shown
> **Then** a menu button at the top of the page opens the sections as a slide-in panel, choosing one closes the panel and shows that section, and no page needs horizontal scrolling because of the navigation
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — happy path

> **Given** a desktop-wide window
> **When** the Owner collapses the sidebar (its button or the keyboard shortcut)
> **Then** it shrinks to an icon rail where each section still opens in one click and names itself on hover, and the current section stays marked; expanding brings the labels back
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `AppSidebar` from the block's skeleton
- [ ] `App` = `SidebarProvider` › `AppSidebar` + `SidebarInset` (header + page)
- [ ] `TooltipProvider` at the root
- [ ] close the mobile sheet on navigation
- [ ] remove `NavBar.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| collapsed + generation running | spinner still shown on the Generate icon row |
| sheet open + back button | sheet closes with the page change |

## Definition of Done

- [ ] web tests over `App`: `AppSidebar` entries from `SECTIONS` with `aria-current`; job spinner / failure dot on Generate; breadcrumb names the section (› Generation on detail; «Page not found»); trigger collapses to the icon rail with entries still links; below `md` the trigger opens a sheet and choosing an entry closes it and navigates; all earlier App/AppShell/sections tests green; NavBar removed
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
