-- image-inputs-openrouter: copies of the input images the Owner attached to a generation (ADR-0011).
-- Written in the same transaction as generations + generation_images (ADR-0006); files live under
-- <data dir>/generations/<id>/input-<position>.<ext>.
CREATE TABLE IF NOT EXISTS generation_inputs (
  generation_id TEXT    NOT NULL REFERENCES generations (id) ON DELETE CASCADE,
  position      INTEGER NOT NULL CHECK (position >= 1),     -- 1-based attach order
  path          TEXT    NOT NULL,                           -- relative to the data dir
  media_type    TEXT    NOT NULL CHECK (media_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  width         INTEGER NOT NULL CHECK (width > 0),
  height        INTEGER NOT NULL CHECK (height > 0),
  byte_size     INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  original_name TEXT,                                       -- file name as attached; NULL when unknown
  PRIMARY KEY (generation_id, position)
);

CREATE UNIQUE INDEX IF NOT EXISTS generation_inputs_path ON generation_inputs (path);
