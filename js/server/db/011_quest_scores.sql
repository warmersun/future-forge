-- Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon
--
-- This file is part of Future Forge.
--
-- Future Forge is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- Future Forge is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with Future Forge. If not, see <https://www.gnu.org/licenses/>.

-- Per-quest leaderboard (all-time). One personal-best row per user per quest.
-- Vision stills only for the current top 3 (enforced in app code).

CREATE TABLE IF NOT EXISTS quest_scores (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  quest_id      TEXT NOT NULL,
  run_id        UUID,
  year_reached  INTEGER,
  stars         SMALLINT,
  waits         INTEGER,
  display_name  TEXT,
  place         TEXT,
  stack         TEXT[],
  pathway_text  TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS quest_scores_rank
  ON quest_scores (quest_id, year_reached ASC, stars DESC, waits ASC);

CREATE TABLE IF NOT EXISTS quest_stills (
  quest_id      TEXT NOT NULL,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  bytes         BYTEA NOT NULL,
  content_type  TEXT NOT NULL DEFAULT 'image/jpeg',
  byte_len      INTEGER NOT NULL,
  PRIMARY KEY (quest_id, clerk_user_id),
  CHECK (byte_len > 0 AND byte_len <= 1500000)
);
