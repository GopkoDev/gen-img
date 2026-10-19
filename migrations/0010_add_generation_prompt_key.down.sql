DROP INDEX IF EXISTS generations_by_prompt;
ALTER TABLE generations DROP COLUMN prompt_key;
