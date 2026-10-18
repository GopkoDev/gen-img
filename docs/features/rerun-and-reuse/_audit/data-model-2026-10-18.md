# Data-model audit — rerun-and-reuse (2026-10-18)

- **Staged** (not yet in the live `migrations/` tree — `implement` promotes): `docs/features/rerun-and-reuse/migrations/01_add_generation_source.{up,down}.sql`.
- **Promote-time hint:** 4-digit sequential; live tree ends at `0006_create_generation_curation` → next ≈ `0007_add_generation_source`.
- **Conventions followed:** TEXT ids, CHECK constraints (as 0002/0004/0006), `ADD COLUMN` + `DROP COLUMN` down (as 0005), partial index (as 0005's `generations_cost_pending`).
- **Deliberate:** no FK on `source_id` (ADR-0018) — a dangling value means «source deleted».
- **Reversibility:** 3 ADD COLUMN ↔ 3 DROP COLUMN, 1 CREATE INDEX ↔ 1 DROP INDEX (index dropped first). Verified on SQLite 3.51 over 0001–0006.
- **Plan check:** derived-list query uses `COVERING INDEX generations_source (source_id=?)`.
- **Drift:** none (columns are new; domain types extended in implement).
- **TBD:** none.
