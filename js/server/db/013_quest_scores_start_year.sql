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

-- Present year of the quest (catalog startYear). Score = stars / years from present.
ALTER TABLE quest_scores ADD COLUMN IF NOT EXISTS start_year INTEGER;

DROP INDEX IF EXISTS quest_scores_rank;
CREATE INDEX quest_scores_rank ON quest_scores (
  quest_id,
  (
    (COALESCE(stars, 0)::double precision)
    / GREATEST(1, COALESCE(year_reached, 0) - COALESCE(start_year, year_reached, 0))
  ) DESC,
  waits ASC
);
