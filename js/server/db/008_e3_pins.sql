CREATE TABLE IF NOT EXISTS pins (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  slot          SMALLINT NOT NULL,
  mission_id    TEXT NOT NULL,
  global_id     TEXT,
  title         TEXT,
  place         TEXT,
  global_title  TEXT,
  pinned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot      JSONB,
  PRIMARY KEY (clerk_user_id, slot),
  CONSTRAINT pins_slot_range CHECK (slot >= 1 AND slot <= 3)
);
