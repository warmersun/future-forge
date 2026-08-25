/**
 * D1 official Daily: UTC day, deterministic pick, submit rules, board rank.
 * No I/O. Do not import js/meta.js (it touches DOM Image at load).
 */

import { sanitizeQuestId } from "./cloud-save.mjs";

/** Same FNV-1a as js/meta.js hashSeed. */
export function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const DAILY_SALT = "warmer-sun-daily";
export const BOARD_LIMIT = 20;

/**
 * Official Daily pool: authored tiles, not learning modules.
 * @param {object[]} tiles
 */
export function dailyPoolFromTiles(tiles) {
  return (Array.isArray(tiles) ? tiles : []).filter((t) => {
    if (!t || (!t.id && !t.mission?.id)) return false;
    if (t.isLearningModule === true || t.mission?.isLearningModule === true) return false;
    return true;
  });
}

/**
 * @param {Date|string|number} [d]
 */
export function utcDayString(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return utcDayString(new Date());
  return dt.toISOString().slice(0, 10);
}

/**
 * @param {unknown} raw
 * @param {Date} [now]
 */
export function parseDailyDate(raw, now = new Date()) {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return utcDayString(now);
}

/**
 * D1 period is the UTC date. D2 adds ISO week keys on the same column.
 * @param {unknown} raw
 * @param {Date} [now]
 */
export function dailyPeriod(raw, now = new Date()) {
  return parseDailyDate(raw, now);
}

/**
 * @param {unknown[]} pool
 * @param {string} period
 * @param {string} [salt]
 */
export function pickFromPool(pool, period, salt = DAILY_SALT) {
  const list = (Array.isArray(pool) ? pool : []).filter(Boolean);
  if (!list.length) return null;
  const h = hashSeed(`${salt}:${period}`);
  return list[h % list.length];
}

/**
 * @param {unknown} year
 */
export function isPlausibleYear(year) {
  const y = Number(year);
  return Number.isInteger(y) && y >= 2020 && y <= 2200;
}

/**
 * Lower year (earlier hold) wins, then more stars, then fewer waits.
 * @param {{ yearReached?: number|null, stars?: number|null, waits?: number|null }} row
 */
export function scoreTuple(row) {
  const year = Number.isFinite(Number(row?.yearReached)) ? Number(row.yearReached) : 9999;
  const stars = Number.isFinite(Number(row?.stars)) ? Number(row.stars) : 0;
  const waits = Number.isFinite(Number(row?.waits)) ? Number(row.waits) : 9999;
  return [year, -stars, waits];
}

/**
 * True if `a` should replace `b` (strictly better). Equal keeps existing.
 * @param {object} a
 * @param {object} b
 */
export function isBetterScore(a, b) {
  if (!b) return true;
  const ta = scoreTuple(a);
  const tb = scoreTuple(b);
  for (let i = 0; i < ta.length; i++) {
    if (ta[i] < tb[i]) return true;
    if (ta[i] > tb[i]) return false;
  }
  return false;
}

/**
 * @param {unknown} raw
 */
export function sanitizeDisplayName(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  if (!s || s.includes("@")) return "Inventor";
  return s;
}

/**
 * @param {unknown} body
 * @param {{ expectedQuestId: string, period: string }} expected
 * @returns {{ ok: true, row: object } | { ok: false, error: string }}
 */
export function parseDailySubmit(body, expected) {
  const src = body && typeof body === "object" ? body : {};
  const questId = sanitizeQuestId(src.questId || src.quest_id);
  if (!questId) return { ok: false, error: "invalid_quest" };
  if (expected?.expectedQuestId && questId !== expected.expectedQuestId) {
    return { ok: false, error: "wrong_daily" };
  }
  if (!isPlausibleYear(src.yearReached ?? src.year_reached)) {
    return { ok: false, error: "impossible_year" };
  }
  const runId =
    typeof src.runId === "string" && /^[0-9a-f-]{36}$/i.test(src.runId.trim())
      ? src.runId.trim()
      : null;
  if (!runId) return { ok: false, error: "run_required" };
  const starsRaw = Number(src.stars);
  const waitsRaw = Number(src.waits);
  return {
    ok: true,
    row: {
      period: expected.period,
      questId,
      runId,
      yearReached: Math.trunc(Number(src.yearReached ?? src.year_reached)),
      stars: Number.isFinite(starsRaw) ? Math.max(0, Math.min(5, Math.trunc(starsRaw))) : 0,
      waits: Number.isFinite(waitsRaw) ? Math.max(0, Math.min(10_000, Math.trunc(waitsRaw))) : 0,
      displayName: sanitizeDisplayName(src.displayName || src.display_name),
    },
  };
}

/**
 * @param {object[]} rows
 * @param {{ userId?: string|null, limit?: number }} [opts]
 */
export function rankBoard(rows, opts = {}) {
  const list = (Array.isArray(rows) ? rows : []).map((r, i) => ({ ...r, _i: i }));
  list.sort((a, b) => {
    if (isBetterScore(a, b)) return -1;
    if (isBetterScore(b, a)) return 1;
    return a._i - b._i;
  });
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || BOARD_LIMIT));
  const top = list.slice(0, limit).map((r, idx) => ({
    rank: idx + 1,
    displayName: r.displayName || r.display_name || "Inventor",
    yearReached: r.yearReached ?? r.year_reached ?? null,
    stars: r.stars ?? 0,
    waits: r.waits ?? 0,
    clerkUserId: r.clerkUserId || r.clerk_user_id || null,
  }));
  const uid = opts.userId || null;
  let you = null;
  if (uid) {
    const idx = list.findIndex(
      (r) => (r.clerkUserId || r.clerk_user_id) === uid
    );
    if (idx >= 0) {
      const r = list[idx];
      you = {
        rank: idx + 1,
        displayName: r.displayName || r.display_name || "Inventor",
        yearReached: r.yearReached ?? r.year_reached ?? null,
        stars: r.stars ?? 0,
        waits: r.waits ?? 0,
      };
    }
  }
  return { top, you };
}
