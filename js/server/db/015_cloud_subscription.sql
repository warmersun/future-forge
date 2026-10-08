CREATE TABLE IF NOT EXISTS subscriptions (
  clerk_user_id TEXT PRIMARY KEY REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  plan_slug     TEXT,
  status        TEXT NOT NULL,
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_period (
  clerk_user_id   TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  spent_points    BIGINT NOT NULL DEFAULT 0,
  held_points     BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (clerk_user_id, period_start)
);

CREATE TABLE IF NOT EXISTS ai_quota_reservations (
  id              TEXT PRIMARY KEY,
  clerk_user_id   TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  period_start    TIMESTAMPTZ NOT NULL,
  kind            TEXT NOT NULL,
  held_points     BIGINT NOT NULL,
  settled         BOOLEAN NOT NULL DEFAULT false,
  settled_points  BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
