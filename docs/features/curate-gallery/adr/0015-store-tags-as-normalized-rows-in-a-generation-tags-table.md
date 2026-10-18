---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 5"
---

# 0015 — Store tags as normalized rows in a generation_tags table

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Each generation gets up to 10 short tags, unique per generation after normalization, shown in insertion order on gallery tiles and the detail view (spec AC-02, AC-03, AC-08). Filtering by tag is out of v1 but likely later (spec §8).

## Decision drivers

- Spec AC-08 invariant «each tag once, at most 10».
- Gallery first page ≤ 300 ms p95 with 1 000 generations × 10 tags (spec §6).
- A future tag filter should not need a data migration.

## Considered options

1. **`generation_tags` rows** — `(generation_id, tag, position)`, primary key `(generation_id, tag)`, `ON DELETE CASCADE`; the page loads tags for its 24 ids in one `IN (…)` query.
2. **JSON array column on `generations`** — `tags TEXT` holding `["a","b"]`, read and rewritten whole.
3. **Separate `tags` table + join table** — a global tag catalog with ids and a many-to-many link.

## Decision outcome

**Chosen:** Option 1. The primary key enforces «each tag once» in the DB, cascade deletion keeps ADR-0014 simple, per-tag add/remove is a single-row change (ADR-0016), and a later filter is an index away. Option 2 can't enforce uniqueness or the count in the DB and turns every tag change into a read-modify-write of the whole list. Option 3 adds renaming and orphan-tag management nobody asked for in a single-owner tool.

## Consequences

**Positive**
- DB-level uniqueness; cheap per-tag writes; ready for filtering.

**Negative**
- One extra query per gallery page (24 ids) and per detail view.
- The «at most 10» limit is enforced by the service inside the insert transaction (SQLite can't express a per-parent count).

**Neutral**
- Moving to a global tag catalog later means deriving it from existing rows — no data loss.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0011](../../image-inputs-openrouter/adr/0011-store-input-copies-in-a-separate-generation-inputs-table.md)
