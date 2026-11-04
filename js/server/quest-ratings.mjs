/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Public quest taste marks: down / up / love.
 * One vote per account. Counts are read from the rows, not a stored counter.
 */

import { sanitizeQuestId, sanitizeSolvedIds } from "./cloud-save.mjs";

export const MAX_RATING_IDS = 80;

/** @type {Record<string, -1|1|2>} */
export const RATING_TO_INT = { down: -1, up: 1, love: 2 };

/** @type {Record<number, "down"|"up"|"love">} */
export const INT_TO_RATING = { [-1]: "down", 1: "up", 2: "love" };

/**
 * @param {string} path
 * @returns {{ kind: "briefed"|"rating", questId: string|null, methods: string[] }|null}
 */
export function matchQuestPlayerRoute(path) {
  const briefed = String(path || "").match(/^\/api\/me\/quests\/([^/]+)\/briefed$/);
  if (briefed) {
    return { kind: "briefed", questId: questIdFromSegment(briefed[1]), methods: ["POST"] };
  }
  const rating = String(path || "").match(/^\/api\/me\/quests\/([^/]+)\/rating$/);
  if (rating) {
    return { kind: "rating", questId: questIdFromSegment(rating[1]), methods: ["PUT"] };
  }
  return null;
}

/**
 * @param {string} segment
 * @returns {string|null}
 */
export function questIdFromSegment(segment) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return sanitizeQuestId(decoded);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseRatingIds(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw || "").split(",");
  const out = [];
  const seen = new Set();
  for (const part of parts) {
    if (out.length >= MAX_RATING_IDS) break;
    const id = sanitizeQuestId(part);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, rating: "down"|"up"|"love"|null } | { ok: false }}
 */
export function parseRatingValue(raw) {
  if (raw == null || raw === "") return { ok: true, rating: null };
  const word = String(raw).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(RATING_TO_INT, word)) {
    return { ok: true, rating: /** @type {"down"|"up"|"love"} */ (word) };
  }
  return { ok: false };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, rating: "down"|"up"|"love"|null } | { ok: false }}
 */
export function parseRatingBody(body) {
  if (!body || typeof body !== "object" || !Object.prototype.hasOwnProperty.call(body, "rating")) {
    return { ok: false };
  }
  return parseRatingValue(/** @type {{ rating?: unknown }} */ (body).rating);
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function parseBriefedIds(raw) {
  return sanitizeSolvedIds(raw);
}

/**
 * @param {{ query: Function }} db
 * @param {string} uid
 * @param {string[]} questIds
 */
export async function recordBriefed(db, uid, questIds) {
  const ids = parseBriefedIds(questIds);
  if (!ids.length) return 0;
  const result = await db.query(
    `INSERT INTO quest_rating_eligibility (clerk_user_id, quest_id)
     SELECT $1, x FROM unnest($2::text[]) AS x
     ON CONFLICT DO NOTHING`,
    [uid, ids]
  );
  return result.rowCount || 0;
}

/**
 * @param {{ query: Function }} db
 * @param {string[]} questIds
 * @param {string|null} [uid]
 */
export async function readTallies(db, questIds, uid = null) {
  const ids = Array.isArray(questIds) ? parseRatingIds(questIds) : parseRatingIds(questIds);
  /** @type {Record<string, { down: number, up: number, love: number, mine?: string|null }>} */
  const ratings = {};
  for (const id of ids) {
    ratings[id] = { down: 0, up: 0, love: 0 };
    if (uid) ratings[id].mine = null;
  }
  if (!ids.length) return { ok: true, ratings };
  const counts = await db.query(
    `SELECT quest_id,
       count(*) FILTER (WHERE rating = -1)::int AS down,
       count(*) FILTER (WHERE rating = 1)::int AS up,
       count(*) FILTER (WHERE rating = 2)::int AS love
     FROM quest_ratings
     WHERE quest_id = ANY($1::text[])
     GROUP BY quest_id`,
    [ids]
  );
  for (const row of counts.rows || []) {
    const slot = ratings[row.quest_id];
    if (!slot) continue;
    slot.down = Number(row.down) || 0;
    slot.up = Number(row.up) || 0;
    slot.love = Number(row.love) || 0;
  }
  if (uid) {
    const mine = await db.query(
      `SELECT quest_id, rating FROM quest_ratings
       WHERE clerk_user_id = $1 AND quest_id = ANY($2::text[])`,
      [uid, ids]
    );
    for (const row of mine.rows || []) {
      const slot = ratings[row.quest_id];
      if (!slot) continue;
      slot.mine = INT_TO_RATING[Number(row.rating)] || null;
    }
  }
  return { ok: true, ratings };
}

/**
 * @param {{ query: Function }} db
 * @param {string} uid
 * @param {string} questId
 * @param {"down"|"up"|"love"|null} rating
 */
export async function writeRating(db, uid, questId, rating) {
  const eligible = await db.query(
    `SELECT 1 AS ok FROM quest_rating_eligibility
     WHERE clerk_user_id = $1 AND quest_id = $2`,
    [uid, questId]
  );
  if (!eligible.rows?.length) {
    return { ok: false, status: 403, error: "briefing_required" };
  }
  if (rating == null) {
    await db.query(
      `DELETE FROM quest_ratings WHERE clerk_user_id = $1 AND quest_id = $2`,
      [uid, questId]
    );
  } else {
    await db.query(
      `INSERT INTO quest_ratings (clerk_user_id, quest_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (clerk_user_id, quest_id)
       DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()`,
      [uid, questId, RATING_TO_INT[rating]]
    );
  }
  const tallies = await readTallies(db, [questId], uid);
  const slot = tallies.ratings[questId] || { down: 0, up: 0, love: 0, mine: null };
  return {
    ok: true,
    questId,
    down: slot.down,
    up: slot.up,
    love: slot.love,
    mine: slot.mine ?? null,
  };
}
