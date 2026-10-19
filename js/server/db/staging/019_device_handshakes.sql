-- Apply explicitly to the selected Neon Functions branch after verification.
-- Codes are SHA-256 digests, never plaintext.
-- Expiry is enforced in every read/write, with opportunistic cleanup on start.
CREATE TABLE IF NOT EXISTS device_handshakes (
  code_hash TEXT PRIMARY KEY CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  session_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS device_handshakes_expires_at_idx ON device_handshakes (expires_at);
