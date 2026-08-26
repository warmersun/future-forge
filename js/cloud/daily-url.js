/**
 * Official Daily / weekly tile URL. Node-free for the browser.
 */

/**
 * @param {unknown} raw
 * @param {Date} [now]
 */
export function parseDailyDate(raw, now = new Date()) {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(dt.getTime())) return parseDailyDate("", new Date());
  return dt.toISOString().slice(0, 10);
}

/**
 * URL for the official Daily or weekly tile. Ghost links pass the shared UTC date.
 * @param {"daily"|"weekly"} kind
 * @param {{ daily?: string|null, date?: string|null, period?: string|null }} [ghost]
 */
export function officialPeriodUrl(kind, ghost = null) {
  if (kind === "weekly") {
    const period = ghost?.period || null;
    return period
      ? `/api/weekly?period=${encodeURIComponent(period)}`
      : "/api/weekly";
  }
  const date = ghost?.daily || ghost?.date || null;
  return date ? `/api/daily?date=${encodeURIComponent(date)}` : "/api/daily";
}
