---
id: T8
title: "Follow the system theme with a Light / Dark / System toggle (ADR-0024)"
layer: "ui"
deps: ["T7"]
blocks: []
acs: ["AC-11", "AC-12"]
files_hint: ["src/web/components/theme-provider.tsx", "src/web/components/mode-toggle.tsx", "src/web/components/theme.test.tsx", "index.html", "src/web/main.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: "SELECT"
---

# T8 — Follow the system theme with a Light / Dark / System toggle (ADR-0024)

> Amendment 2026-10-19 (spec §1 ¶4).

## Place in the sequence

- **Blocked by:** T7 · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** Ukiyo to follow my system's light or dark appearance, and to pick light or dark myself when I prefer
> **So that** the app is comfortable to look at for long sessions and matches my desktop
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

## Inlined context

> `light | dark | system` (default system) in `localStorage["gen-img:theme"]` (try/catch); `.light`/`.dark` on `<html>`; inline script in `index.html` applies it before paint; «system» follows `prefers-color-scheme` changes.
>
> — `sad.md §8` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

### AC-11 — happy path

> **Given** the Owner has never chosen a theme
> **When** Ukiyo is shown
> **Then** it uses the system's light or dark appearance and follows it when the system changes; a theme control in the sidebar offers Light, Dark and System, the chosen one applies at once to every page and is remembered after a reload, without a flash of the other theme while loading
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — error

> **Given** the browser refuses to remember the Owner's choice (storage blocked or broken)
> **When** Ukiyo loads or the Owner picks a theme
> **Then** Ukiyo still works: it shows the system appearance on load, the pick applies for the open page, and nothing fails or shows an error
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] kit ThemeProvider with try/catch storage + live system listener
- [ ] kit ModeToggle in the sidebar footer
- [ ] inline pre-paint script
- [ ] wrap the app in `ThemeProvider`

## Edge cases

| Case | Behaviour |
|---|---|
| stored value garbage | treated as system |
| system changes while «Light» chosen | stays light |

## Definition of Done

- [ ] unit/web tests: provider default system → `.dark` iff the system prefers dark and follows its change; Light/Dark/System from the toggle set the class and storage; storage throwing → still works, no error; the inline script in `index.html` (run in jsdom) applies stored light/dark, else system, and survives throwing storage
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
