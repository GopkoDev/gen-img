-- curate-gallery: the Owner's comment and tags on a generation (ADR-0015, ADR-0016).
-- Both cascade with the generation, so deletion (ADR-0014) needs no extra statements.
CREATE TABLE IF NOT EXISTS generation_comments (
  generation_id TEXT PRIMARY KEY REFERENCES generations (id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000), -- characters, not bytes
  updated_at    TEXT NOT NULL                                                       -- ISO-8601 UTC
);

CREATE TABLE IF NOT EXISTS generation_tags (
  generation_id TEXT    NOT NULL REFERENCES generations (id) ON DELETE CASCADE,
  tag           TEXT    NOT NULL CHECK (length(tag) BETWEEN 1 AND 32 AND tag = lower(trim(tag))),
  position      INTEGER NOT NULL CHECK (position >= 1),                               -- insertion order
  PRIMARY KEY (generation_id, tag)
);
