/**
 * Plan an upsert of quest tiles into the live object-store catalog.
 * Does not talk to the network.
 */

import { tileAccess } from "./cloud-gate.mjs";
import { joinObjectKey } from "./quest-object-storage.mjs";
import { slugId } from "../quest-tile.js";

const ACCESS = new Set(["open", "account", "paid"]);

/**
 * @param {string} id
 * @returns {string|null}
 */
export function safeTileId(id) {
  const s = String(id || "").trim();
  if (!s || /[\\/]/.test(s) || s.includes("..")) return null;
  return s;
}

/**
 * Parse a live catalog.json. Invalid JSON or a non-catalog value fails
 * so a publisher cannot replace the bucket index with an empty list.
 * A missing object is the caller's case: pass `{ quests: [] }` yourself.
 * @param {string} text
 * @returns {{ ok: true, catalog: object } | { ok: false, error: string }}
 */
export function parseLiveCatalog(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "catalog_invalid_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "catalog_invalid_json" };
  }
  if (parsed.quests != null && !Array.isArray(parsed.quests)) {
    return { ok: false, error: "catalog_invalid_json" };
  }
  return { ok: true, catalog: parsed };
}

/**
 * @param {string|null|undefined} access
 * @returns {string|null}
 */
export function parseAccessFlag(access) {
  if (access == null || access === "") return null;
  const v = String(access).trim().toLowerCase();
  if (!ACCESS.has(v)) return null;
  return v;
}

/**
 * Copy a tile and set access on the copy. The source object is unchanged.
 * @param {object} doc
 * @param {string|null} access
 */
export function applyAccessOverride(doc, access) {
  if (!access) return doc;
  const next = structuredClone(doc);
  next.access = access;
  if (next.mission && typeof next.mission === "object") next.mission.access = access;
  return next;
}

/**
 * @param {object|null|undefined} catalog
 * @param {{ id: string, file: string }[]} entries
 */
export function upsertCatalog(catalog, entries) {
  const base = catalog && typeof catalog === "object" ? { ...catalog } : {};
  const quests = Array.isArray(base.quests) ? base.quests.map((e) => ({ ...e })) : [];
  /** @type {{ id: string, file: string, action: "added"|"updated" }[]} */
  const actions = [];
  for (const entry of entries) {
    const id = String(entry.id || "").trim();
    const file = String(entry.file || `${id}.json`);
    const idx = quests.findIndex((e) => e && (e.id === id || e.file === file));
    if (idx >= 0) {
      quests[idx] = { ...quests[idx], id, file };
      actions.push({ id, file, action: "updated" });
    } else {
      quests.push({ id, file });
      actions.push({ id, file, action: "added" });
    }
  }
  base.quests = quests;
  return { catalog: base, actions };
}

/**
 * Lesson ids named by a wrapper that are not in this batch or the catalog.
 * @param {{ id: string, kind?: string, lessons?: string[] }[]} tiles
 * @param {{ id?: string }[]} catalogQuests
 */
export function missingWrapperLessons(tiles, catalogQuests) {
  const present = new Set();
  for (const tile of tiles) present.add(slugId(tile.id));
  for (const entry of catalogQuests || []) present.add(slugId(entry?.id));
  /** @type {{ wrapper: string, lesson: string }[]} */
  const missing = [];
  for (const tile of tiles) {
    if (tile.kind !== "module" || !Array.isArray(tile.lessons)) continue;
    for (const lessonId of tile.lessons) {
      if (!present.has(slugId(lessonId))) {
        missing.push({ wrapper: tile.id, lesson: String(lessonId) });
      }
    }
  }
  return missing;
}

/**
 * @param {{ documents: object[], catalog?: object, access?: string|null }} input
 */
export function planPublish(input) {
  const access = input.access || null;
  /** @type {string[]} */
  const unsafe = [];
  const prepared = (input.documents || []).map((doc) => {
    const body = applyAccessOverride(doc, access);
    const id = safeTileId(body.id);
    if (!id) unsafe.push(String(body.id || "").trim() || "(empty)");
    return {
      id: id || "",
      kind: body.kind || "quest",
      file: id ? `${id}.json` : "",
      lessons: Array.isArray(body.lessons) ? body.lessons : [],
      access: tileAccess(body),
      body,
    };
  });
  const merged = upsertCatalog(
    input.catalog,
    prepared.filter((item) => item.id)
  );
  const missing = missingWrapperLessons(
    prepared.filter((item) => item.id),
    merged.catalog.quests
  );
  return { ...merged, prepared, missing, unsafe };
}

/**
 * @param {ReturnType<typeof planPublish>} plan
 * @param {{ dryRun?: boolean, prefix?: string, writeObject?: (key: string, body: string) => Promise<void> }} opts
 */
export async function publishPlanned(plan, opts = {}) {
  if (plan.unsafe?.length || plan.missing.length) {
    return { ok: false, wrote: [], missing: plan.missing, unsafe: plan.unsafe || [] };
  }
  if (opts.dryRun) return { ok: true, wrote: [], missing: [] };
  const writeObject = opts.writeObject;
  /** @type {string[]} */
  const wrote = [];
  const prefix = opts.prefix || "";
  for (const item of plan.prepared) {
    const key = joinObjectKey(prefix, item.file);
    await writeObject(key, `${JSON.stringify(item.body, null, 2)}\n`);
    wrote.push(key);
  }
  const catalogKey = joinObjectKey(prefix, "catalog.json");
  await writeObject(catalogKey, `${JSON.stringify(plan.catalog, null, 2)}\n`);
  wrote.push(catalogKey);
  return { ok: true, wrote, missing: [] };
}
