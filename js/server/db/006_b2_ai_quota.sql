CREATE TABLE IF NOT EXISTS ai_usage_daily (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  day           DATE NOT NULL,
  hits          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (clerk_user_id, day)
);
