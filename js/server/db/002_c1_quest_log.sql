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

-- C1 quest log: start time, stack snapshot, in-progress rows (outcome null).
ALTER TABLE runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS tech_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE runs ALTER COLUMN outcome DROP NOT NULL;
UPDATE runs SET started_at = COALESCE(started_at, ended_at, created_at) WHERE started_at IS NULL;
