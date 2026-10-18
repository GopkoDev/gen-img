# Data-model audit — model-picker-preferences (2026-10-19)

- **Staged migrations** (not yet in the live `migrations/` tree — `implement` promotes them):
  - `docs/features/model-picker-preferences/migrations/01_create_model_preferences.up.sql` / `.down.sql`
- **Promote-time hint:** sequential 4-digit `NNNN_snake_name`; live tree ends at `0007_add_generation_source` → next ≈ `0008_create_model_preferences`.
- **Convention adherence:** TEXT keys, INTEGER 0/1 flags with CHECK (CHECK used since 0002), ISO-8601 TEXT timestamps, `IF NOT EXISTS`. Composite natural PK (provider, model) instead of a ULID — the pair *is* the identity (ADR-0026); no table references it.
- **Down reversibility:** 1 CREATE ↔ 1 DROP. ✓  **FK indexes:** no FKs. ✓
- **Drift:** none (new table, no domain layer yet). **TBD:** none.
- Verified: up → insert → both-flags-off row refused → down, on an in-memory SQLite.
