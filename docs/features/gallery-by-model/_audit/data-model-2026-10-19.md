# Data-model audit — gallery-by-model (2026-10-19)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/gallery-by-model/migrations/01_index_generations_by_model.up.sql` / `.down.sql`
- **Promote-time hint:** sequential 4-digit; the live tree ends at `0008_create_model_preferences` → next ≈ `0009_index_generations_by_model`.
- **Convention adherence:** `IF NOT EXISTS` / `IF EXISTS`, index named `generations_*` like `generations_source`. No schema change to columns.
- **Existing-table index:** SQLite builds it in the migration's transaction; at single-user scale (thousands of rows) this is instant — no concurrent-build concern.
- **Down reversibility:** 1 CREATE INDEX ↔ 1 DROP INDEX. ✓  **FK indexes:** n/a.
- **Drift:** none. **TBD:** none.
- Verified: up → filtered page plan uses `generations_by_model` → down, on an in-memory SQLite.
