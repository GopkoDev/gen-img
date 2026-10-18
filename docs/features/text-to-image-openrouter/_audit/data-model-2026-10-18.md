# Data-model audit — text-to-image-openrouter (2026-10-18)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/text-to-image-openrouter/migrations/01_create_generations.up.sql` / `.down.sql`
- **Promote-time convention hint:** repo uses 4-digit sequential `NNNN_snake_name.{up,down}.sql` (`src/server/db/migrate.ts` FILE_RE); live tree holds `0001_init` → next ≈ `0002_create_generations`.
- **Convention adherence:** TEXT ULID PK, ISO-8601 TEXT timestamps, `cost_micros` + `cost_status`, relative image paths only (architecture-map §Persistence). CHECK constraints used (SQLite-native, no prior precedent in the repo — first tables; consistent with the zod-parse-every-row rule, not a divergence).
- **Down reversibility:** 2 CREATE TABLE ↔ 2 DROP TABLE (children first). ✓
- **FK indexes:** `generation_images.generation_id` is the leading PK column. ✓
- **Drift:** none — no domain layer exists yet (greenfield tables).
- **TBD:** none.
