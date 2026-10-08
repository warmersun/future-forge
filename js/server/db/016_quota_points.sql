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
