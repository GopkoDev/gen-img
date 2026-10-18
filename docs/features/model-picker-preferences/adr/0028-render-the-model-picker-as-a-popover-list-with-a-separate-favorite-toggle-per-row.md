---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 9"
---

# 0028 — Render the model picker as a popover list with a separate favorite toggle per row

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The picker is a select whose entries are options: an option selects on pointer-up and closes the list, arrow keys and typeahead move between options, and a control nested inside an option is neither reliably reachable by keyboard nor exposed to screen readers. The ★ must toggle without selecting (AC-03) — and selecting a model by accident runs the model-switch carry-over, which can drop parameters (step 6, ADR-0019).

## Decision drivers

- Spec AC-03: ★ by pointer or keyboard; the list stays open; the selected model is unchanged.
- Spec AC-04/AC-10: two labelled groups, plus a hidden-but-selected entry marked as hidden.
- CLAUDE.md: shadcn/ui primitives only, no second component library.

## Considered options

1. **A popover opened from a picker button, holding a list of rows; each row has a «choose» button (name, id, price) and a separate ★ toggle button with a pressed state; Up/Down move between rows, Tab reaches the ★, Escape closes** — built on the shadcn Popover primitive.
2. **The already vendored dropdown-menu primitive: model entries as radio items, the ★ as a checkbox item per model (or a sub-item)** — no new primitive; menu items get roving focus and announcements for free.
3. **Keep the select, with the ★ as a pointer-handled icon inside each option plus a keyboard shortcut on the highlighted option** — the smallest change to existing code and tests.

## Decision outcome

**Chosen:** Option 1. Two plain buttons per row are the simplest structure where both actions are reachable and announced correctly, and the popover leaves the selected model untouched until «choose». Option 2 forces a menu structure where the ★ is a separate item from its model (two stops per model or a submenu) and closes on selection by default — workable, but the hidden-but-selected entry (AC-10) and the two groups read as a menu of commands, not a picker. Option 3 keeps a control inside an option, which screen readers don't expose reliably, and hides the keyboard path behind a shortcut.

## Consequences

**Positive**
- Toggling a favorite can't select a model or trigger the carry-over.
- The same row (name, id, price, ★) can be reused by the Models page (step 10).

**Negative**
- The picker's keyboard behaviour (open, Up/Down, Escape, focus return) is written and tested by us instead of coming with the select.
- Existing tests that drive the select are rewritten against the new picker.

**Neutral**
- The shadcn Popover primitive is vendored into `src/web/components/ui/`.

## Links

- Spec: [[../spec.md]] AC-03, AC-04, AC-10
- SAD: [[../sad.md]] §4, §5
- UX: [[../ux-flows.md]] SCR-07
