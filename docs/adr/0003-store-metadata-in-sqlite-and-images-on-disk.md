---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: ""
ticket: ""
---

# 0003 — Store metadata in SQLite with hand-written SQL migrations and keep images as files on disk

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (owner), survey foundation session

## Context

Every generation must be kept locally with enough metadata to repeat or vary it: provider, model,
prompt, accepted params, input images, cost (possibly pending), timestamps, duration, raw
request/response, comment, tags, and a parent link when an output is reused as input (brief §7).
The gallery lists, filters by id/time, and edits comments/tags. Storage format and access style are
expensive to change once data accumulates.

## Decision drivers

- Single user, single machine, one process — no database server to install or run.
- Relational needs: tags (many-to-many), parent→child lineage, cost status updates.
- Images are large binaries and should be openable directly from the file system.
- The SDD `data-model` stage emits paired `*.up.sql` / `*.down.sql` migrations — the tooling should consume them as-is.

## Considered options

1. **SQLite via `better-sqlite3` with hand-written SQL in repos (rows parsed by zod) + own paired up/down SQL migration runner; image files under `<data dir>/generations/<ulid>/`** — zero-infra, SQL-transparent.
2. **SQLite via Drizzle ORM + drizzle-kit migrations** — typed queries from a TS schema, but drizzle-kit has no down migrations and the schema source of truth would be split between TS and data-model's SQL.
3. **JSON sidecar file per generation, no database** — simplest storage, but tags, lineage and gallery listing become full directory scans and ad-hoc indexing.

## Decision outcome

**Chosen:** Option 1 (owner confirmed the hand-written SQL default). SQLite covers the relational
needs in a single file; SQL migrations from `data-model` drop straight into `migrations/` and are
applied on boot by `scripts/migrate.ts`; images stay on disk with only relative paths in the DB.
Data dir is `GEN_IMG_DATA_DIR` (default `./data`, gitignored). Money is stored as integer micro-USD
plus `cost_status` (`known | pending | unavailable`).

## Consequences

**Positive**
- No external services; backup = copy the data dir.
- Migrations are plain SQL with rollback; schema is readable without tooling.
- Images remain normal files (open in Finder, reuse elsewhere).

**Negative**
- No compile-time typing of queries — mitigated by zod parsing every row in the repo layer.
- A small custom migration runner to maintain (~50 lines).
- DB and file store can drift (e.g. a file deleted by hand) — deletion must go through the app, and reads must tolerate a missing file.

**Neutral**
- `better-sqlite3` is a native module; Node's built-in `node:sqlite` is a possible later swap behind the repo layer.

## Links

- Idea brief: [[../idea-brief.md]] §7, §8 (cost pending, key storage)
- Architecture map: [[../architecture-map.md]] §Datastores, §Conventions (Persistence, Migrations)
- Related ADR: [[0001-use-typescript-node-hono-react-stack]], [[0002-organize-as-modular-monolith-with-provider-port]]
