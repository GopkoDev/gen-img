-- text-to-image-openrouter: the Generation aggregate (generations + their output images).
-- Images live on disk under <data dir>/generations/<id>/ (ADR-0003); rows hold relative paths only.
CREATE TABLE IF NOT EXISTS generations (
  id               TEXT    PRIMARY KEY,                       -- ULID, minted at submit → id order = created_at order
  provider         TEXT    NOT NULL,                          -- provider id, e.g. 'openrouter'
  model            TEXT    NOT NULL,                          -- provider model id
  prompt           TEXT    NOT NULL CHECK (length(trim(prompt)) > 0),
  requested_params TEXT    NOT NULL,                          -- JSON: parameters exactly as sent
  accepted_params  TEXT,                                      -- JSON reported by the provider; NULL = not reported
  images_requested INTEGER NOT NULL CHECK (images_requested >= 1),
  cost_micros      INTEGER CHECK (cost_micros IS NULL OR cost_micros >= 0),
  cost_status      TEXT    NOT NULL CHECK (cost_status IN ('known', 'pending', 'unavailable')),
  created_at       TEXT    NOT NULL,                          -- ISO-8601 UTC, the moment the Owner submitted
  duration_ms      INTEGER NOT NULL CHECK (duration_ms >= 0), -- provider request sent → answer received
  raw_request      TEXT    NOT NULL,                          -- JSON, redacted (ADR-0008)
  raw_response     TEXT    NOT NULL,                          -- JSON, image payloads replaced by file refs (ADR-0008)
  CHECK ((cost_status = 'known') = (cost_micros IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS generation_images (
  generation_id TEXT    NOT NULL REFERENCES generations (id) ON DELETE CASCADE,
  position      INTEGER NOT NULL CHECK (position >= 1),     -- 1-based order as returned by the provider
  path          TEXT    NOT NULL,                           -- relative to the data dir, e.g. generations/<id>/output-1.png
  media_type    TEXT    NOT NULL CHECK (media_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  width         INTEGER NOT NULL CHECK (width > 0),
  height        INTEGER NOT NULL CHECK (height > 0),
  byte_size     INTEGER NOT NULL CHECK (byte_size > 0),
  PRIMARY KEY (generation_id, position)
);
