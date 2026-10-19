-- Apply explicitly to the selected Neon Functions branch after verification.
-- This file is nested so legacy top-level migration discovery will not run it.
CREATE TABLE IF NOT EXISTS clerk_webhook_events (
  event_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
