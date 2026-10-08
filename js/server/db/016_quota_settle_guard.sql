ALTER TABLE ai_quota_reservations
  ADD COLUMN IF NOT EXISTS settle_token TEXT;

CREATE TABLE IF NOT EXISTS quota_grant_key (
  id     INT PRIMARY KEY CHECK (id = 1),
  secret TEXT NOT NULL
);
