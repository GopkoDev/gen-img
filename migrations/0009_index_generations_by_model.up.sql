-- gallery-by-model: one model's generations newest first, and per-model counts (ADR-0036).
CREATE INDEX IF NOT EXISTS generations_by_model ON generations (provider, model, id);
