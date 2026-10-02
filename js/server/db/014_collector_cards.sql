-- Collector cards: one published card, many collectors.
-- A card is a capability written in general terms. Players collect it, then
-- play it as a reusable invention tile.

CREATE TABLE IF NOT EXISTS collector_cards (
  id           UUID PRIMARY KEY,
  tech_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  links        JSONB NOT NULL DEFAULT '[]'::jsonb,
  image        BYTEA,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_len     INTEGER NOT NULL DEFAULT 0,
  published    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(title) BETWEEN 1 AND 80),
  CHECK (char_length(description) BETWEEN 1 AND 4000),
  CHECK (char_length(body) <= 8000),
  CHECK (byte_len >= 0 AND byte_len <= 1500000),
  CHECK (image IS NULL OR octet_length(image) = byte_len)
);

CREATE TABLE IF NOT EXISTS user_collector_cards (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  card_id       UUID NOT NULL REFERENCES collector_cards(id) ON DELETE CASCADE,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, card_id)
);

CREATE INDEX IF NOT EXISTS user_collector_cards_recent
  ON user_collector_cards (clerk_user_id, collected_at DESC);
