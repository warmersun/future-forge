-- C1 quest log: start time, stack snapshot, in-progress rows (outcome null).
ALTER TABLE runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS tech_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE runs ALTER COLUMN outcome DROP NOT NULL;
UPDATE runs SET started_at = COALESCE(started_at, ended_at, created_at) WHERE started_at IS NULL;
