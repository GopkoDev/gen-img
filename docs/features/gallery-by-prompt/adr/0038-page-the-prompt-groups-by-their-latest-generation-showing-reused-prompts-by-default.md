---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 14"
---

# 0038 — Page the prompt groups by their latest generation, showing reused prompts by default

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Unlike models (a few dozen), prompt groups are nearly as many as generations — most prompts are used once — so the by-model read (all groups, a page query per group) doesn't scale here, and a list of mostly single cards repeats the gallery (devil's-advocate pass). The group card needs the latest existing image, counts and the models (spec AC-01, AC-06).

## Decision drivers

- Spec AC-01: groups load as the Owner scrolls; reused prompts by default, single-use one switch away.
- Spec §6: a page of 24 groups ≤ 300 ms p95 with 1 000 generations / 200 prompts.
- ADR-0032: the grid's sentinel paging, reusable for groups.

## Considered options

1. **`GET /generations/prompts?cursor=&limit=24&single=0|1`: one grouped query `GROUP BY prompt_key` with `count(*)`, `sum(images received)`, `max(id) AS latestId`, `HAVING count(*) > 1` unless `single=1`, ordered `latestId DESC`, paged by `latestId < cursor`; per group the cover (first output of `latestId`), the prompt text and the 3 most recently used models (+ the count of the rest) read by key; the response is `{ groups, nextCursor }`.** The web pages it with the grid's sentinel.
2. **All groups in one answer, like «By model»** — fine for models, unbounded for prompts.
3. **The same grouped query paged by offset** — simpler, but a new generation joining or creating a group shifts every later page by one, so scrolling shows a group twice or skips one.

## Decision outcome

**Chosen:** Option 1. Cursor paging by the latest generation keeps «most recent first» stable under inserts and costs one grouped query plus a few indexed lookups per page; the reused-only default keeps the view useful. Option 2 doesn't scale; option 3 duplicates or skips groups under inserts (AC-06).

## Consequences

**Positive**
- The groups page reuses the grid's paging, errors-with-data and scroll memory.

**Negative**
- A group's position can move between pages when one of its generations is added or deleted (a refresh re-reads loaded pages, as for the grid).

**Neutral**
- Group cards carry no tags or comment marks, so curation patches don't touch them; deletions and new generations refresh them through the existing prefix invalidation.

## Links

- Spec: [[../spec.md]] AC-01, AC-06, AC-08, §6
- SAD: [[../sad.md]] §4, §8
- Related ADR: ADR-0032, ADR-0035, ADR-0036
