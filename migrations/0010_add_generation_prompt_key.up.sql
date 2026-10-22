-- gallery-by-prompt: a fixed-length key per exact prompt text (ADR-0037). Written by the app on every save and
-- backfilled on boot for older rows (SQLite has no hash function); NULL only until that backfill has run.
ALTER TABLE generations ADD COLUMN prompt_key TEXT CHECK (prompt_key IS NULL OR length(prompt_key) = 32);
-- A prompt's generations newest first, and the groups ordered by their latest generation.
CREATE INDEX IF NOT EXISTS generations_by_prompt ON generations (prompt_key, id);
