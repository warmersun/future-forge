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

CREATE TABLE IF NOT EXISTS pins (
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  slot          SMALLINT NOT NULL,
  mission_id    TEXT NOT NULL,
  global_id     TEXT,
  title         TEXT,
  place         TEXT,
  global_title  TEXT,
  pinned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot      JSONB,
  PRIMARY KEY (clerk_user_id, slot),
  CONSTRAINT pins_slot_range CHECK (slot >= 1 AND slot <= 3)
);
