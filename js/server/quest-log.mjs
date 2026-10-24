/**
 * C1 quest log: parse list filters and shape run rows for the API.
 * No I/O — Neon reads live in db.mjs.
 */

import { mapKind, mapOutcome, sanitizeQuestId, PLACE_MAX } from "./cloud-save.mjs";
import { parsePackageRef } from "./package-paths.mjs";

export const RUN_KINDS = ["theme", "lesson", "friends", "import"];
export const RUN_OUTCOMES = ["hold", "partial", "collapse", "abandon"];
export const DEFAULT_RUNS_LIMIT = 50;
export const MAX_RUNS_LIMIT = 100;
export const MAX_TECH_IDS = 16;

/**
 * @param {URLSearchParams|Record<string, string>} raw
 * @returns {{ kind: string|null, outcome: string|null, limit: number }}
 */
export function parseRunsQuery(raw) {
  const get =
    raw && typeof raw.get === "function"
      ? (k) => raw.get(k)
      : (k) => (raw && raw[k] != null ? String(raw[k]) : null);
  const kindRaw = String(get("kind") || "").trim().toLowerCase();
  const outcomeRaw = String(get("outcome") || "").trim().toLowerCase();
  const kind = RUN_KINDS.includes(kindRaw) ? kindRaw : null;
  let outcome = mapOutcome(outcomeRaw);
  if (outcomeRaw && !outcome) outcome = null;
  const n = Number(get("limit"));
  let limit = DEFAULT_RUNS_LIMIT;
  if (Number.isFinite(n) && n > 0) limit = Math.min(MAX_RUNS_LIMIT, Math.trunc(n));
  return { kind, outcome, limit };
}

/**
 * @param {object[]} rows
 * @param {{ kind?: string|null, outcome?: string|null }} [filt]
 */
export function filterRuns(rows, filt = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const kind = filt.kind || null;
  const outcome = filt.outcome || null;
  return list.filter((r) => {
    if (kind && r.kind !== kind) return false;
    if (outcome && r.outcome !== outcome) return false;
    return true;
  });
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function sanitizeTechIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (out.length >= MAX_TECH_IDS) break;
    const id = sanitizeQuestId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {unknown} body
 * @returns {{ questId: string, kind: string, place: string|null }|null}
 */
export function parseStartBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const questId = sanitizeQuestId(src.questId || src.quest_id);
  if (!questId) return null;
  if ((Object.hasOwn(src, "packageRef") || Object.hasOwn(src, "package_ref")) &&
      !parseStartPackageRef(src)) return null;
  const placeRaw = src.place != null ? String(src.place).trim() : "";
  return {
    questId,
    kind: mapKind(src.kind),
    place: placeRaw ? placeRaw.slice(0, PLACE_MAX) : null,
  };
}

/**
 * A client may name a package ref at start. It is not trusted until the
 * server resolves it. Save bodies cannot supply a replacement.
 * @param {unknown} body
 * @returns {{ packageId: string, revision: string, questId: string } | null}
 */
export function parseStartPackageRef(body) {
  const src = body && typeof body === "object" ? body : {};
  return parsePackageRef(src.packageRef || src.package_ref);
}

/**
 * Binding columns are written only at start. A later save that includes them
 * is ignored rather than applied.
 * @param {unknown} body
 */
export function clientPackageBindingIgnored(body) {
  const src = body && typeof body === "object" ? body : {};
  return (
    src.packageRef != null ||
    src.package_id != null ||
    src.package_revision != null ||
    src.package_quest_id != null
  );
}

/**
 * @param {object} row db row
 */
export function publicRunRow(row) {
  if (!row || typeof row !== "object") return null;
  const tech = row.tech_ids || row.techIds || [];
  return {
    id: row.id ? String(row.id) : null,
    questId: String(row.quest_id || row.questId || ""),
    kind: mapKind(row.kind),
    outcome: row.outcome == null || row.outcome === "" ? null : mapOutcome(row.outcome),
    stars: row.stars == null ? null : Number(row.stars),
    yearReached: row.year_reached ?? row.yearReached ?? null,
    waits: row.waits == null ? null : Number(row.waits),
    place: row.place ? String(row.place) : null,
    techIds: Array.isArray(tech) ? tech.map(String) : [],
    startedAt: row.started_at || row.startedAt || null,
    endedAt: row.ended_at || row.endedAt || null,
    imported: Boolean(row.imported),
    packageRef:
      row.package_id && row.package_revision && row.package_quest_id
        ? {
            packageId: String(row.package_id),
            revision: String(row.package_revision),
            questId: String(row.package_quest_id),
          }
        : null,
  };
}
