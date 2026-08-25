-- A2 / C1 skeleton. Clerk remains identity; users is the FK parent only.
CREATE TABLE IF NOT EXISTS users (
  clerk_user_id TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solved_quests (
  clerk_user_id   TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  quest_id        TEXT NOT NULL,
  first_solved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source          TEXT NOT NULL DEFAULT 'play',
  PRIMARY KEY (clerk_user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  quest_id      TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'theme',
  outcome       TEXT NOT NULL,
  stars         SMALLINT,
  year_reached  INTEGER,
  waits         INTEGER,
  place         TEXT,
  ended_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runs_user_ended ON runs (clerk_user_id, ended_at DESC);
