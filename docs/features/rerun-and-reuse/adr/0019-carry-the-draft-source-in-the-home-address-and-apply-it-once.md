---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 6"
---

# 0019 — Carry the draft source in the home address and apply it once

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)

## Context

Re-run and «use as input» start on the detail view and must open the generate panel (on the home page) with a filled draft (ux-flows). The SPA has two routes and no global store (ADR-0009); the panel keeps its draft in component state.

## Decision drivers

- ux-flows platform decisions: the draft source survives a reload until applied; starting a re-run replaces the draft.
- Keep the router tiny (ADR-0009); no new state library (CLAUDE.md).

## Considered options

1. **Source in the home address** — navigate to `/?rerun=<id>` or `/?reuse=<id>&output=<n>`; the panel reads it on mount, loads the source, fills the draft, then replaces the address with `/`.
2. **In-memory hand-off** — a module-level or context store set by the detail view and read by the panel.
3. **Session storage hand-off** — the detail view writes the draft request into session storage.

## Decision outcome

**Chosen:** Option 1. The address is the one place both views already share; it survives a reload before the panel applies it and costs no new state mechanism. Option 2 is lost on reload and adds a global store; option 3 leaks a stale draft into later visits unless carefully cleared — the address is cleared by construction once applied.

## Consequences

**Positive**
- Re-run / reuse links are plain links (open in a new tab works).
- The panel stays the single owner of its draft.

**Negative**
- The panel must handle a source it can't load (deleted, unknown) — shown as a notice (AC-08, AC-10).

**Neutral**
- If routes grow, the query handling moves into a router library along with ADR-0009's replacement.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0009](../../text-to-image-openrouter/adr/0009-use-a-two-route-history-api-router-in-the-spa.md)
