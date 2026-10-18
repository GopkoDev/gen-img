# Data-model audit — curate-gallery (2026-10-18)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/curate-gallery/migrations/01_create_generation_curation.up.sql` / `.down.sql`
- **Promote-time hint:** sequential 4-digit `NNNN_snake_name`; live tree ends at `0005_add_generation_cost_ref` → next ≈ `0006_create_generation_curation`.
- **Convention adherence:** TEXT ULID FKs, ISO-8601 TEXT timestamps, CHECK constraints (used since 0002), `ON DELETE CASCADE` like `generation_images` / `generation_inputs`. No change to existing tables.
- **Down reversibility:** 2 CREATE ↔ 2 DROP (children only). ✓  **FK indexes:** both FKs lead their PK. ✓
- **Note:** SQLite `lower()` is ASCII-only; the tag CHECK is a backstop, normalization lives in `src/shared/curation.ts`.
- **Drift:** none. **TBD:** none.
- Verified: up → insert → upper-case ASCII tag refused → down, on an in-memory SQLite.
