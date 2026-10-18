---
status: Living
tool: code               # figma | pencil | code — the single committed source of the design-tool choice (never sdd.local.md: that file is per-developer + gitignored)
figma_file: ""           # tool: figma → the Figma file URL/key the canon lives in; else ""
pen_file: ""             # tool: pencil → the .pen library path (e.g. docs/design/library.pen); else ""
updated_at: "2026-10-18"
---

# Design system — Ukiyo

> The project's **design canon**, produced once per repo by `design-system` and read by
> `ux-flows` / `screens` / `implement` / `review`. Committed — the tool choice and the inventory
> are team-wide, not per-developer. `architecture-map.md` §Frontend / UI foundation stays the
> inventory of the **code**; this file is the **design-side** canon (tool, posture, tokens,
> component inventory, cross-screen conventions). Refresh via `/sdd:design-system` when the
> foundation changes.

## Platform posture

- **Posture:** desktop-first — a local tool used in a desktop browser on the owner's machine; it stays usable down to tablet width, phone layout is not a goal.
- **Breakpoints / device classes:** Tailwind defaults; layouts are designed at `lg` (≥1024px) and degrade to a single column below `md` (768px).

## Design tool

- **Tool:** code — solo maintainer, no design-tool MCP in use; `screens.md` carries inline markdown wireframes.
- **Library location:** the in-repo components are the library — `src/web/components/ui/`.

## Token source

- **Colors:** shadcn/ui theme CSS variables (light + dark) — `src/web/index.css:6`
- **Spacing / sizing:** Tailwind v4 default scale + `--radius` — `src/web/index.css:7`
- **Typography:** Tailwind v4 defaults (system font stack) — `src/web/index.css:1`

## Component inventory

| Component | Source (`file:line` / node / URL) | States it supports | Notes |
|---|---|---|---|
| Badge | `src/web/components/ui/badge.tsx:39` | default / secondary / destructive / outline | status chips (cost status, server health) |
| Button | `src/web/components/ui/button.tsx:61` | default / hover / disabled; variants default · secondary · outline · ghost · destructive · link | loading = disabled + spinner icon |
| Card | `src/web/components/ui/card.tsx:55` | default | gallery tiles, panels |
| Dialog | `src/web/components/ui/dialog.tsx:124` | open / closed | overlays |
| Input | `src/web/components/ui/input.tsx:20` | default / focus / disabled / invalid (`aria-invalid`) | |
| Select | `src/web/components/ui/select.tsx:150` | closed / open / disabled / invalid | short fixed option lists |
| Textarea | `src/web/components/ui/textarea.tsx:17` | default / focus / disabled / invalid (`aria-invalid`) | prompt entry |

## Interaction & writing conventions

- **Errors:** inline — a field error under its field; a request-level error as a destructive-tinted panel above the form's submit button. No toasts.
- **Empty states:** plain text + one call-to-action button.
- **Loading:** a muted «Loading…» line for lists/details; an in-button spinner + disabled form for in-flight actions.
- **Validation:** on submit; errors attach to fields via `aria-invalid` + a message line under the field.
- **Microcopy tone:** short, plain, no exclamation marks; say what happened and what to do next.
