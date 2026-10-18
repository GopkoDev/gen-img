---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 6"
---

# 0018 — Record lineage as source columns without a foreign key

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)

## Context

A derived generation must show its source («Re-run of» / «Made from output N of») and the source must list what was derived from it (AC-02…AC-04). Curate-gallery left open what happens on deleting a source; spec §1 decides: keep the derived generation, show «source deleted», never block deletion (AC-07).

## Decision drivers

- Spec AC-07, AC-15; curate-gallery deletion is all-or-nothing and must stay unblocked (ADR-0014).
- Spec §6: detail with lineage ≤ 150 ms p95 with 50 derived.

## Considered options

1. **Columns, no foreign key** — `generations.source_id`, `source_relation` (`rerun` / `reuse`), `source_output` (reuse only); a partial index on `source_id` for the derived list; a deleted source simply doesn't resolve.
2. **Columns with `ON DELETE SET NULL`** — the database clears the link when the source is deleted.
3. **Separate `generation_lineage` table** — one row per link, cascading on either side.

## Decision outcome

**Chosen:** Option 1. AC-07 needs the derived side to *know* it had a source that is now gone; option 2 erases that (a null link looks like «never had a source»), option 3 needs extra joins and its cascade would erase the same knowledge unless it also skipped the FK — at which point it is option 1 with a join. Deletion code stays untouched: no constraint can block it.

## Consequences

**Positive**
- Deleting a source never touches derived rows; «source deleted» is just a failed lookup.
- One indexed query lists derived generations.

**Negative**
- No referential integrity: a `source_id` may point at nothing — every reader must treat that as «deleted».
- A deleted source's id stays stored in its derived generations (an opaque id only; no content of the source remains reachable).

**Neutral**
- A future tree view can walk `source_id` recursively without schema changes.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §8
- Related ADR: [ADR-0014](../../curate-gallery/adr/0014-delete-generations-atomically-by-moving-their-directory-to-staging-inside-the-delete-transaction.md)
