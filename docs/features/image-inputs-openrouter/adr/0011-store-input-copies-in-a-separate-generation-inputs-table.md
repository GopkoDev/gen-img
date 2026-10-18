---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "S"
ticket: "roadmap step 3"
---

# 0011 — Store input copies in a separate generation_inputs table

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Copies of input images must be stored with their generation, in attach order, all-or-nothing with the outputs (spec AC-01, AC-06), and served only when recorded (AC-07). Step 2 stores outputs in `generation_images` (position, path, media type, dimensions, size) and uses its first row as the gallery thumbnail.

## Decision drivers

- Spec AC-06 / ADR-0006: one transaction + one staging dir per generation.
- The gallery thumbnail, «N of M received» and every step-2 query read `generation_images` as outputs only.
- Spec AC-10: the gallery shows an inputs count.

## Considered options

1. **Separate `generation_inputs` table** — same columns as `generation_images` (+ `original_name`), its own PK `(generation_id, position)`, unique `path`; written in the same transaction.
2. **A `kind` column on `generation_images`** — `output` / `input` rows in one table, with every existing query filtering by kind.

## Decision outcome

**Chosen:** Option 1. Step-2 queries, the thumbnail rule and the received-count stay correct without edits, and inputs get their own column (`original_name`). Option 2 needs a migration that rewrites the existing table's primary key and a `kind` filter in every output query — a regression risk with no benefit while inputs and outputs have different meanings.

## Consequences

**Positive**
- No change to output storage or its queries; additive migration.
- Inputs carry the attached file's original name for the detail view.

**Negative**
- The file route checks two tables (two indexed lookups).

**Neutral**
- Step 6 can point new generations at stored files of either table.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0010-accept-input-images-as-multipart-parts-of-the-start-generation-request]], step 2 [ADR-0006](../../text-to-image-openrouter/adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md)
