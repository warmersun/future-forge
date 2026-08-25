-- D1 official Daily scores. period is UTC date YYYY-MM-DD (D2 reuses as ISO week).
CREATE TABLE IF NOT EXISTS daily_scores (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  period        TEXT NOT NULL,
  quest_id      TEXT NOT NULL,
  run_id        UUID,
  year_reached  INTEGER,
  stars         SMALLINT,
  waits         INTEGER,
  display_name  TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, period)
);

CREATE INDEX IF NOT EXISTS daily_scores_period_rank
  ON daily_scores (period, year_reached ASC, stars DESC, waits ASC);
