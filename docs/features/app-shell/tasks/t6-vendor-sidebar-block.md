---
id: T6
title: "Vendor the sidebar-08 block and its primitives, trimmed and on the project conventions"
layer: "infra"
deps: ["T2"]
blocks: ["T7"]
acs: ["AC-10", "AC-16"]
files_hint: ["src/web/components/ui/sidebar.tsx", "src/web/components/ui/sheet.tsx", "src/web/components/ui/tooltip.tsx", "src/web/components/ui/dropdown-menu.tsx", "src/web/hooks/use-mobile.ts", "src/web/index.css", "tests/helpers/setup-dom.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: "SELECT"
---

# T6 — Vendor the sidebar-08 block and its primitives, trimmed and on the project conventions

> Amendment 2026-10-19 (spec §1 ¶4).

## Place in the sequence

- **Blocked by:** T2 · **Blocks:** T7.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a navigation bar that lists Ukiyo's sections and shows where I am
> **So that** I reach generating and the gallery in one click, each on its own full page
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

## Inlined context

> Frame = `sidebar-08` block (inset variant): `SidebarProvider` › `AppSidebar` (registry-driven entries, footer with theme toggle + server status) + `SidebarInset` (header: trigger · separator · breadcrumb; then the page).
>
> — `sad.md §4.5` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

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

- [ ] `pnpm dlx shadcn@latest add sidebar-08` (keep our button/input)
- [ ] fix `cn` imports, drop the `cn` dependency
- [ ] delete demo nav-* files, avatar, collapsible
- [ ] neutral oklch sidebar tokens
- [ ] jsdom `matchMedia` polyfill

## Edge cases

| Case | Behaviour |
|---|---|
| shadcn wants to overwrite button/input | declined — ours stay |

## Definition of Done

- [ ] block primitives under `src/web/components/ui/` import `cn` from `@/lib/utils`; no `cn` npm package; demo parts (user, teams, projects, secondary) removed; sidebar tokens on the neutral palette (light + dark); `matchMedia` available in jsdom; typecheck + lint + existing tests green
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
