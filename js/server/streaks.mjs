/**
 * Invent-day streaks. A day counts when a hold or partial pathway ended
 * on that local calendar date. The client never supplies the count.
 */

/**
 * @param {unknown} raw
 * @returns {string|null} IANA zone, or null
 */
export function sanitizeTimeZone(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 64 || /[\s;]/.test(s)) return null;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: s }).format(0);
    return s;
  } catch {
    return null;
  }
}

/**
 * @param {Date|string|number} input
 * @param {string} timeZone
 * @returns {string} YYYY-MM-DD
 */
export function localDateKey(input, timeZone) {
  const date = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(date.getTime())) return "";
  const zone = sanitizeTimeZone(timeZone) || "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/**
 * Calendar shift. Independent of DST because it moves a civil date, not an instant.
 * @param {string} key YYYY-MM-DD
 * @param {number} deltaDays
 */
export function shiftDateKey(key, deltaDays) {
  const [y, m, d] = String(key || "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * @param {Array<Date|string|number>} endedAts
 * @param {string|null|undefined} timeZone
 * @param {Date} [now]
 */
export function computeStreak(endedAts, timeZone, now = new Date()) {
  const zone = sanitizeTimeZone(timeZone) || "UTC";
  const days = new Set();
  for (const t of endedAts || []) {
    const key = localDateKey(t, zone);
    if (key) days.add(key);
  }
  const today = localDateKey(now, zone);
  const rail = [];
  for (let i = 6; i >= 0; i--) rail.push(days.has(shiftDateKey(today, -i)));

  let cursor = days.has(today) ? today : shiftDateKey(today, -1);
  let current = 0;
  while (cursor && days.has(cursor) && current < 4000) {
    current += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const key of sorted) {
    run = prev && shiftDateKey(prev, 1) === key ? run + 1 : 1;
    if (run > best) best = run;
    prev = key;
  }

  return {
    current,
    best,
    today: Boolean(today && days.has(today)),
    days: rail,
    timeZone: zone,
  };
}
