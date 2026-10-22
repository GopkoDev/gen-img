# Data-model audit — gallery-by-prompt (2026-10-19)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/gallery-by-prompt/migrations/01_add_generation_prompt_key.up.sql` / `.down.sql`
- **Promote-time hint:** sequential 4-digit; the live tree ends at `0009_index_generations_by_model` → next ≈ `0010_add_generation_prompt_key`.
- **Breaking change on an existing table:** a new nullable column (expand) + an app-side backfill on boot (ADR-0037); no contract step — the column stays nullable because the backfill, not SQL, fills it. No NOT NULL is added.
- **Convention adherence:** CHECK constraints as in 0002/0007; index named `generations_*`; `DROP COLUMN` in the down as 0007 does (SQLite ≥ 3.35).
- **Down reversibility:** ADD COLUMN ↔ DROP COLUMN, CREATE INDEX ↔ DROP INDEX (index dropped first). ✓
- **Drift:** none. **TBD:** none.
- Verified: up → a short key refused → the prompt page plan uses `generations_by_prompt` → down, on an in-memory SQLite.
