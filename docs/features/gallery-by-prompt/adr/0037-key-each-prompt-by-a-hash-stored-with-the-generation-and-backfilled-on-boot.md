---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 14"
---

# 0037 — Key each prompt by a hash stored with the generation and backfilled on boot

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

A prompt view must be an address that names the prompt by a short key — the same length for any prompt, never its text (spec AC-04, §6.1): prompts reach 10 000 characters, and a percent-encoded long prompt exceeds the server's request-header limit and leaks into browser history (devil's-advocate pass). Grouping and filtering by exact text must be indexed (spec §6). Migrations are plain SQL files and SQLite has no hash function, and generations made before this step must be grouped too (AC-10).

## Decision drivers

- Spec AC-04: fixed-length key in the address; AC-05: exact text identity; AC-10: no generation missing.
- Spec §6: ≤ 300 ms p95 per page; existing generations keyed in ≤ 2 s for 1 000.
- ADR-0003 / CLAUDE.md: SQL migrations only; boot-time work already exists (migrations, staging sweep, pending-cost resume).

## Considered options

1. **A `prompt_key` column = the first 32 hex characters of SHA-256 over the exact prompt (UTF-8, no normalisation), written on every save; a migration adds the nullable column and an index `(prompt_key, id)`; on boot the generations module fills every row whose key is missing, in one transaction.**
2. **Key a group by the id of its oldest generation** (computed with `min(id) … GROUP BY prompt`) — no new column, but the key changes when that generation is deleted, so a saved address stops matching a group that still exists.
3. **A hash function registered on the database connection, used by an SQL migration to backfill and by inserts** — removes the boot step, but the migration files would then depend on a function only the app registers, so replaying them with `pnpm db:migrate` on a bare connection or any SQLite tool fails.
4. **A `prompts` table (id + unique text) with `generations.prompt_id`** — a real normalisation; the group key is the prompt id. Every insert, the re-run/reuse paths, deletions (orphaned prompts) and every read join change, for a key that only names a group.

## Decision outcome

**Chosen:** Option 1. A content hash is stable for as long as any generation with that text exists, has a fixed length, reveals nothing, and indexes well; the boot backfill keeps migrations pure SQL. Option 2 breaks saved addresses on deletion; option 3 ties plain-SQL migrations to app code; option 4 reshapes the core table and its write paths for no benefit the hash doesn't give. (Prompt text in the address is not weighed: spec §6.1 rules it out.)

## Consequences

**Positive**
- Group, filter and address all use one 32-character key; a re-run with the same text joins its group by construction.

**Negative**
- A key derived in the app must be written on every insert path (one helper in the repo; tests compare it with an independent hash).
- 128-bit keys can in theory collide; for one Owner's prompts the probability is negligible (accepted).

**Neutral**
- The backfill is idempotent and runs after migrations, before the server answers.

## Links

- Spec: [[../spec.md]] AC-04, AC-05, AC-10, §6, §6.1
- SAD: [[../sad.md]] §4, §5, §8
- Data model: [[../data-model.md]]
- Related ADR: ADR-0003, ADR-0006 (boot sweep)
