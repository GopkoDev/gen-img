# Data-model audit — vercel-ai-gateway (2026-10-18)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/vercel-ai-gateway/migrations/01_add_generation_cost_ref.up.sql` / `.down.sql`
- **Promote-time hint:** live tree ends at `0004_create_generation_inputs` → next ≈ `0005_add_generation_cost_ref`.
- **Down reversibility:** ADD COLUMN ↔ DROP COLUMN (SQLite 3.53, supported), CREATE INDEX ↔ DROP INDEX. ✓
- **FK indexes:** no new FK. ✓
- **Convention adherence:** TEXT column, nullable; partial index (SQLite-native); no change to existing CHECKs. ✓
- **Drift:** `repo.ts` row schemas gain `cost_ref`; `ProviderId` gains `vercel`.
- **TBD:** none.
