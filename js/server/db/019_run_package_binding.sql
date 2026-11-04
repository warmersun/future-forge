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

-- Server-owned package binding for a run. Nullable so legacy rows stay valid.
-- Ordinary save/update routes must not write these columns.
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS package_id TEXT,
  ADD COLUMN IF NOT EXISTS package_revision TEXT,
  ADD COLUMN IF NOT EXISTS package_quest_id TEXT;

COMMENT ON COLUMN runs.package_id IS 'Immutable package id bound at start. Null for legacy and ordinary runs.';
COMMENT ON COLUMN runs.package_revision IS 'sha256: revision bound at start. Not rewritten by save.';
COMMENT ON COLUMN runs.package_quest_id IS 'Quest member inside that release. Not a client selector after start.';
