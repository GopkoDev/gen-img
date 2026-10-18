---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 10"
---

# 0030 — Change preferences through one shared, per-flag optimistic mutation

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Two places now change preferences — the Generate picker (step 9) and the Models page — and both read the same cache entry per provider. The picker's mutation writes the whole saved row back on success and rolls back only `favorite`; copied to a row with two toggles, a fast ★ followed by «show in picker» makes the first answer overwrite the second toggle's optimistic state, and a failed second toggle could undo the first (devil's-advocate pass; spec AC-05).

## Decision drivers

- Spec AC-05: a failed toggle reverts only itself; the other toggle of the same row keeps the state the Owner last set.
- Spec AC-04 / step 9 AC-14: a change in one place shows in the other without a reload.
- One cache key per provider already shared by panel and picker (step 9 SAD §4 item 5).

## Considered options

1. **One hook `useSetModelPreference(provider)` used by the picker and the page: the optimistic update, the rollback and the success write each touch only the flags named in that request; a settle invalidates the provider's preferences only when no sibling change for that provider is still in flight (shared mutation key)** — the picker's own mutation is replaced by it.
2. **Each screen keeps its own mutation, writing whole rows; the page refetches after each toggle** — simple, but racing toggles flicker and a rollback can clobber the sibling flag.

## Decision outcome

**Chosen:** Option 1. Per-flag writes make concurrent toggles on one row independent and keep the picker and the page from diverging; option 2 is exactly the race the spec rules out.

## Consequences

**Positive**
- One tested place for optimistic preference changes; the picker and the page can't drift.

**Negative**
- The picker's step 9 mutation is refactored onto the hook (its tests must stay green).

**Neutral**
- The hook lives in `src/web/features/models/` and the generate feature imports it (generate already depends on shared preference reads).

## Links

- Spec: [[../spec.md]] AC-04, AC-05
- SAD: [[../sad.md]] §4, §8
- Related ADR: [ADR-0028](../../model-picker-preferences/adr/0028-render-the-model-picker-as-a-popover-list-with-a-separate-favorite-toggle-per-row.md)
