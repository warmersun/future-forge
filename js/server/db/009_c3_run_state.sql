CREATE TABLE IF NOT EXISTS run_state (
  clerk_user_id TEXT PRIMARY KEY REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  run_id        TEXT,
  quest_id      TEXT NOT NULL,
  year_reached  INTEGER,
  tutor         BOOLEAN NOT NULL DEFAULT false,
  board         JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
