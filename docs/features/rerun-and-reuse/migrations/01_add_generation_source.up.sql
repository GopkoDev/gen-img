-- rerun-and-reuse: lineage to the source generation (ADR-0018). No foreign key on purpose: a deleted
-- source must stay recorded as «deleted» on its derived generations and must never block deletion.
ALTER TABLE generations ADD COLUMN source_id TEXT;
ALTER TABLE generations ADD COLUMN source_relation TEXT CHECK (source_relation IS NULL OR source_relation IN ('rerun', 'reuse'));
ALTER TABLE generations ADD COLUMN source_output INTEGER CHECK (source_output IS NULL OR source_output >= 1);
-- The detail view lists the newest generations derived from one source.
CREATE INDEX IF NOT EXISTS generations_source ON generations (source_id, id) WHERE source_id IS NOT NULL;
