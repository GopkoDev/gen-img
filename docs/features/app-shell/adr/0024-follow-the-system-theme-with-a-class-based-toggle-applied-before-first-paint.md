---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 8 (amendment)"
---

# 0024 — Follow the system theme with a class-based toggle applied before first paint

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner — chose «system + toggle» and the kit's Vite theme provider; details delegated to Claude in the design pass)

## Context

The token file already defines light and dark values, with dark under a `.dark` class (`@custom-variant dark (&:is(.dark *))`). Nothing sets the class, so the app is always light. Spec AC-11/AC-12: follow the system by default, Light / Dark / System in the sidebar, remembered, no flash, and no failure when storage is blocked.

## Decision drivers

- AC-11 «without a flash of the other theme while loading»; AC-12 storage may throw.
- CLAUDE.md: no second component library; keep deps lean.
- The tokens are class-scoped already (shadcn convention).

## Considered options

1. **The kit's Vite `ThemeProvider` + `ModeToggle`** — React context holding `light | dark | system`, toggling `.light/.dark` on `<html>`, a `matchMedia` listener for «system»; plus a tiny inline script in `index.html` that applies the stored or system theme before the bundle loads.
2. **Media query only** (`prefers-color-scheme` in CSS) — no toggle possible.
3. **A theme library** (e.g. `next-themes`) — handles the same, adds a dependency built around another framework.

## Decision outcome

**Chosen:** Option 1, with two changes to the docs' version: every storage access is wrapped in try/catch (AC-12) and «system» follows live changes of the system appearance. Key `gen-img:theme` (the app's existing storage prefix), default `system`. The inline script and the provider share the rule «stored light/dark wins, else the system»; a test runs the inline script taken from `index.html` in jsdom (stored light / dark / system / storage throwing) so the two can't drift.

## Consequences

**Positive**
- Both themes reuse the existing tokens; no flash; works with storage blocked.

**Negative**
- The rule exists twice (inline script + module); a test keeps them identical.

**Neutral**
- New screens must use tokens only (design-system convention).

## Links

- Spec: [[../spec.md]] AC-11, AC-12
- SAD: [[../sad.md]] §8
- Related ADR: [ADR-0022](./0022-declare-sections-in-one-registry-over-the-hand-written-router.md)
