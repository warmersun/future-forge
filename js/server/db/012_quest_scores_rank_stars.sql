-- Rank: honesty stars, then earlier year, then fewer waits.
DROP INDEX IF EXISTS quest_scores_rank;
CREATE INDEX quest_scores_rank
  ON quest_scores (quest_id, stars DESC, year_reached ASC, waits ASC);
