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

-- Public quest taste marks. One row per account per quest.
-- Separate from runs.stars and quest_scores (those are performance).

CREATE TABLE IF NOT EXISTS quest_rating_eligibility (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  quest_id      TEXT NOT NULL,
  eligible_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, quest_id)
);

CREATE TABLE IF NOT EXISTS quest_ratings (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  quest_id      TEXT NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating IN (-1, 1, 2)),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clerk_user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS quest_ratings_quest ON quest_ratings (quest_id);

COMMENT ON TABLE quest_ratings IS 'Public taste: -1 down, 1 up, 2 love. Not the performance star score.';
COMMENT ON TABLE quest_rating_eligibility IS 'Set when a signed-in player finishes the briefing walk.';
