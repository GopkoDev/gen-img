-- model-picker-preferences: the Owner's per-model choices, one row per provider + model (ADR-0026).
-- No foreign key: models live in the providers' catalogs, not in this DB; a row of a model the provider
-- stopped offering is kept so it returns with its model (spec AC-08). A row with both flags off is deleted.
CREATE TABLE IF NOT EXISTS model_preferences (
  provider   TEXT    NOT NULL CHECK (provider IN ('openrouter', 'vercel')),
  model      TEXT    NOT NULL CHECK (length(model) BETWEEN 1 AND 200),   -- the provider's own id, case-sensitive
  favorite   INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
  hidden     INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  updated_at TEXT    NOT NULL,                                           -- ISO-8601 UTC
  PRIMARY KEY (provider, model),
  CHECK (favorite = 1 OR hidden = 1)
);
