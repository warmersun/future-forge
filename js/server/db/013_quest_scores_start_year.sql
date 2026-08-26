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
