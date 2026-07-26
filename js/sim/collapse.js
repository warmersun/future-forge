/**
 * Win / collapse pure checks (DOM-free).
 */

import { maxPressure } from "./pressure.js";

/**
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} winMax — mission.winMax
 */
export function isWin(pressure, winMax = {}) {
  return Object.entries(winMax).every(([k, max]) => (pressure[k] ?? 0) <= max);
}

/**
 * HUD color band for one crisis meter vs this Quest's win goal.
 * No extra label text — color only:
 * - cool (green): at or under winMax (this meter held)
 * - warm (yellow): above goal, not yet near collapse
 * - hot (red): dangerous (4+) or at collapse (5)
 * If winMax for the key is missing, fall back to absolute severity.
 *
 * @param {number} cur — current pressure 0–5
 * @param {number|null|undefined} winMaxForKey — mission.winMax[key]
 * @returns {"cool"|"warm"|"hot"}
 */
export function crisisMeterLevel(cur, winMaxForKey) {
  const n = Math.max(0, Math.min(5, Math.round(Number(cur) || 0)));
  if (winMaxForKey == null || Number.isNaN(Number(winMaxForKey))) {
    return n >= 4 ? "hot" : n >= 2 ? "warm" : "cool";
  }
  const goal = Math.max(0, Math.min(5, Math.round(Number(winMaxForKey))));
  if (n <= goal) return "cool";
  if (n >= 4) return "hot";
  return "warm";
}

/**
 * Multiplayer race is over — no more seat-turns / deploy actions.
 * - won: full solve (meters under goals)
 * - collapsed: place fell
 * Partial Scale does NOT end the race (others may still Pilot/Scale).
 * @param {object|null|undefined} placeOrStatus — place object or status string
 */
export function isMpQuestOver(placeOrStatus) {
  const st =
    typeof placeOrStatus === "string"
      ? placeOrStatus
      : placeOrStatus?.status || "";
  // won | collapsed | abandoned_by_vote (majority left the Quest)
  return st === "won" || st === "collapsed" || st === "abandoned_by_vote";
}


/**
 * Solo (and single invent) collapse: this invent's year or shared meters.
 * @param {object} opts
 * @param {number} opts.year
 * @param {number} opts.collapseYear
 * @param {Record<string, number>} opts.pressure
 */
export function isCollapsed({ year, collapseYear, pressure }) {
  return year >= collapseYear || maxPressure(pressure) >= 5;
}

/**
 * Multiplayer place collapse.
 *
 * - Shared crisis meters still end the place for everyone (any meter ≥ 5).
 * - Calendar fail only when *every* non-abandoned invent is at/past collapseYear.
 *   One player Waiting late does not sink seats still inventing in the present —
 *   they can keep solving / contributing on earlier invent calendars.
 *
 * @param {object} session — mp session with place + invents
 * @param {{ forgeYear?: (invent: object, place: object) => number }} [opts]
 */
export function isMpPlaceCollapsed(session, opts = {}) {
  const place = session?.place;
  if (!place) return false;
  // Shared meters can still end the place (e.g. after Scale risk) — but one invent
  // calendar must never be enough.
  if (maxPressure(place.pressure || {}) >= 5) return true;

  const startY = place.mission?.startYear ?? place.year ?? 2026;
  const collapseYear = place.collapseYear || place.mission?.collapseYear || 2099;
  const forgeYear =
    opts.forgeYear ||
    ((f, p) => {
      // Missing invent year ⇒ still at scenario present (never inherit a stale place.year)
      if (f?.year != null && Number.isFinite(Number(f.year))) return Number(f.year);
      return p?.mission?.startYear ?? startY;
    });

  const order = session.seatOrder?.length
    ? session.seatOrder
    : Object.keys(session.invents || {});
  const contenders = order
    .map((id) => session.invents?.[id])
    .filter((f) => f && !f.abandoned);
  if (!contenders.length) return false;

  // Year-fail only when the *earliest* invent calendar is already at fail year
  // (⇒ every contender has waited that far). One seat at 2030 while another is
  // still at 2026 must NOT collapse the place.
  const years = contenders.map((f) => forgeYear(f, place));
  const minYear = Math.min(...years);
  return minYear >= collapseYear;
}

/**
 * Earliest invent year among non-abandoned invents (for collapse copy / ranking meta).
 * @param {object} session
 * @param {{ forgeYear?: (invent: object, place: object) => number }} [opts]
 */
export function mpEarliestInventYear(session, opts = {}) {
  const place = session?.place;
  if (!place) return null;
  const forgeYear =
    opts.forgeYear ||
    ((f, p) => (f?.year != null ? f.year : p?.year ?? 2026));
  const order = session.seatOrder?.length
    ? session.seatOrder
    : Object.keys(session.invents || {});
  const contenders = order
    .map((id) => session.invents?.[id])
    .filter((f) => f && !f.abandoned);
  if (!contenders.length) return place.year ?? null;
  return Math.min(...contenders.map((f) => forgeYear(f, place)));
}
