/**
 * E2 Daily streak: consecutive official UTC days with a daily_scores row.
 * Missing a day breaks it. Weekly period keys do not count as a day.
 */

/**
 * @param {string[]} periods
 * @param {string} today YYYY-MM-DD UTC
 */
export function dailyStreak(periods, today) {
  const days = new Set(
    (periods || []).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(String(p)))
  );
  if (!days.size || !/^\d{4}-\d{2}-\d{2}$/.test(String(today))) return 0;
  let n = 0;
  let cursor = String(today);
  while (days.has(cursor)) {
    n += 1;
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return n;
}
