/**
 * E6 rematch / ghost: same Daily tile + a target year to beat.
 * Browser-safe. Do not import js/server/*.mjs from here.
 */

import { parseDailyDate } from "./daily-url.js";
import { normalizeClerkUserId } from "./clerk-id.js";

/**
 * @param {URLSearchParams|Record<string, string>} raw
 */
export function parseGhostQuery(raw) {
  const get =
    raw && typeof raw.get === "function"
      ? (k) => raw.get(k)
      : (k) => (raw && raw[k] != null ? String(raw[k]) : null);
  const daily = get("daily") || get("date");
  const beat = normalizeClerkUserId(get("beat"));
  const year = Number(get("year") || get("beatYear"));
  if (!daily && !beat && !Number.isFinite(year)) return null;
  return {
    daily: daily ? parseDailyDate(daily) : parseDailyDate(""),
    beat,
    year: Number.isFinite(year) && year >= 2020 && year <= 2200 ? Math.trunc(year) : null,
  };
}

/**
 * @param {{ yearReached?: number|null }} hold
 * @param {number|null} targetYear
 */
export function ghostResult(hold, targetYear) {
  const held = Number(hold?.yearReached);
  const target = Number(targetYear);
  if (!Number.isFinite(held) || !Number.isFinite(target)) {
    return { ok: false, beat: false };
  }
  return { ok: true, beat: held < target, held, target };
}

export function ghostSharePath({ daily, beat, year }) {
  const q = new URLSearchParams();
  if (daily) q.set("daily", daily);
  if (beat) q.set("beat", beat);
  if (year != null) q.set("year", String(year));
  return `/?${q.toString()}`;
}
