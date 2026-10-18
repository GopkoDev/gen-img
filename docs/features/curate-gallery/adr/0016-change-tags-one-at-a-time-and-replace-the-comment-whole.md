---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 5"
---

# 0016 — Change tags one at a time and replace the comment whole

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Tags save on every add/remove and the comment on an explicit Save (spec AC-01, AC-02). Two tabs may curate the same generation; spec AC-01 accepts last-save-wins for the comment, but losing a tag added in another tab would be a silent data loss.

## Decision drivers

- Spec AC-01 (last save wins for the comment), AC-02 (each tag change saved at once), AC-08 (dedup + limit).
- Shared zod schemas for request bodies (CLAUDE.md).

## Considered options

1. **Per-tag add/remove + whole-comment replace** — add one tag (server normalizes, dedups, enforces 10, returns the full list); remove one tag by its normalized value; set the comment to a text (empty removes it).
2. **Replace the whole tag list** — the client sends the full desired list on each change.
3. **One generic update of the generation** — a single partial update carrying comment and/or tags.

## Decision outcome

**Chosen:** Option 1. Per-tag operations commute, so two tabs can't overwrite each other's tags, and dedup/limit errors map to the one tag the Owner just typed. Option 2 makes the last tab's stale list delete tags added elsewhere. Option 3 merges two different save models (immediate tags, explicit comment) into one request and blurs which field failed.

## Consequences

**Positive**
- No lost tag updates across tabs; clear per-field errors.

**Negative**
- Three small endpoints instead of one.

**Neutral**
- A future bulk-tag action can still be added as its own operation.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0015](./0015-store-tags-as-normalized-rows-in-a-generation-tags-table.md)
