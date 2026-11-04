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

-- Rename the dollar-micro ledger to integer points.
-- Fresh installs already create the points columns in 015, so this no-ops.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_period'
      AND column_name = 'spent_microusd'
  ) THEN
    ALTER TABLE ai_usage_period RENAME COLUMN spent_microusd TO spent_points;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_usage_period'
      AND column_name = 'held_microusd'
  ) THEN
    ALTER TABLE ai_usage_period RENAME COLUMN held_microusd TO held_points;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_quota_reservations'
      AND column_name = 'held_microusd'
  ) THEN
    ALTER TABLE ai_quota_reservations RENAME COLUMN held_microusd TO held_points;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_quota_reservations'
      AND column_name = 'settled_microusd'
  ) THEN
    ALTER TABLE ai_quota_reservations RENAME COLUMN settled_microusd TO settled_points;
  END IF;
END $$;
