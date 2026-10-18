# Data-model audit — image-inputs-openrouter (2026-10-18)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/image-inputs-openrouter/migrations/01_create_generation_inputs.up.sql` / `.down.sql`
- **Promote-time hint:** repo is 4-digit sequential; live tree holds `0001`–`0003` → next ≈ `0004_create_generation_inputs`.
- **Convention adherence:** mirrors `generation_images` (TEXT ULID FK, CHECKs, relative paths, unique path index as in `0003`). New nullable `original_name`.
- **Down reversibility:** CREATE TABLE + CREATE INDEX ↔ DROP INDEX + DROP TABLE. ✓ Applied up + down over 0002–0003 in an in-memory SQLite. ✓
- **FK indexes:** `generation_id` is the leading PK column. ✓
- **Drift:** none (new table).
- **TBD:** none.
