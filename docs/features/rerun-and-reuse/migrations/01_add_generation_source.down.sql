DROP INDEX IF EXISTS generations_source;
ALTER TABLE generations DROP COLUMN source_output;
ALTER TABLE generations DROP COLUMN source_relation;
ALTER TABLE generations DROP COLUMN source_id;
