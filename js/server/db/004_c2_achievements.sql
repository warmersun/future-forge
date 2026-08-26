CREATE TABLE IF NOT EXISTS achievements (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  run_id        UUID,
  unlocked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, code)
);
