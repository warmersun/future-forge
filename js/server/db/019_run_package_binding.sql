-- Server-owned package binding for a run. Nullable so legacy rows stay valid.
-- Ordinary save/update routes must not write these columns.
ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS package_id TEXT,
  ADD COLUMN IF NOT EXISTS package_revision TEXT,
  ADD COLUMN IF NOT EXISTS package_quest_id TEXT;

COMMENT ON COLUMN runs.package_id IS 'Immutable package id bound at start. Null for legacy and ordinary runs.';
COMMENT ON COLUMN runs.package_revision IS 'sha256: revision bound at start. Not rewritten by save.';
COMMENT ON COLUMN runs.package_quest_id IS 'Quest member inside that release. Not a client selector after start.';
