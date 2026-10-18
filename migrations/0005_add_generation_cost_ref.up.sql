-- vercel-ai-gateway: the provider's reference for looking up a price later (ADR-0013).
ALTER TABLE generations ADD COLUMN cost_ref TEXT;
-- The resolver reads only pending generations on boot.
CREATE INDEX IF NOT EXISTS generations_cost_pending ON generations (id) WHERE cost_status = 'pending';
