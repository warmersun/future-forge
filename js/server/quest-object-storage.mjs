/**
 * Official quest catalog in a private Neon Object Storage bucket.
 * The portal is the only reader. A missing object is an error, never a
 * fetch of the public warmersun.com catalog.
 */

import { catalogRecordFromValidated, validateQuestDocument } from "../quest-tile.js";
import { parsePackageRef, safePackageMember } from "./package-paths.mjs";
import { catalogCard } from "./cloud-gate.mjs";

/** Package catalog entries are metadata only; never follow their loose file field. */
export function packageCatalogRecord(entry) {
  const ref = parsePackageRef(entry?.packageRef);
  if (!ref || (entry.id && entry.id !== ref.questId)) return null;
  return { ...catalogCard({ ...entry, id: ref.questId, source: "remote" }), packageRef: ref };
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string|null} bucket name, or null when object storage is off
 */
export function questsBucketFromEnv(env = process.env) {
  if (env.FF_QUESTS_BUCKET === undefined) return null;
  const s = String(env.FF_QUESTS_BUCKET).trim();
  if (!s || s === "0" || /^off$/i.test(s) || /^false$/i.test(s)) return null;
  return s;
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function questsObjectPrefixFromEnv(env = process.env) {
  return String(env.FF_QUESTS_OBJECT_PREFIX || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

/**
 * @param {string} prefix
 * @param {string} file
 */
export function joinObjectKey(prefix, file) {
  const name = String(file || "").replace(/^\/+/, "");
  const p = String(prefix || "").replace(/^\/+|\/+$/g, "");
  return p ? `${p}/${name}` : name;
}

/**
 * @type {{
 *   url: string,
 *   at: number,
 *   ttlMs: number,
 *   quests: object[],
 *   errors: object[],
 *   ok: boolean,
 * } | null}
 */
let cache = null;

export function _resetObjectQuestCache() {
  cache = null;
}

/**
 * @param {string} bucket
 * @param {string} key
 */
export function createNeonObjectReader(bucket) {
  let client;
  return async (key) => {
    if (!safePackageMember(key)) throw new Error("object_key_forbidden");
    try {
      if (!client) {
        const { Files } = await import("files-sdk");
        const { neon } = await import("files-sdk/neon");
        client = new Files({ adapter: neon({ bucket }) });
      }
      const stored = await client.download(key);
      return Buffer.from(await stored.arrayBuffer());
    } catch { throw new Error("object_read_failed"); }
  };
}

async function readNeonObjectText(bucket, key) {
  return (await createNeonObjectReader(bucket)(key)).toString("utf8");
}

/**
 * @param {(key: string) => Promise<string>} readText
 * @param {{ prefix?: string, url?: string, remoteBase?: string }} [opts]
 */
export async function catalogFromObjectReader(readText, opts = {}) {
  const prefix = opts.prefix || "";
  const catalogKey = joinObjectKey(prefix, "catalog.json");
  const url = opts.url || catalogKey;
  const remoteBase = opts.remoteBase || "";
  /** @type {object[]} */
  const quests = [];
  /** @type {{ file: string, error: string, details?: string[] }[]} */
  const errors = [];

  let catalogRaw;
  try {
    catalogRaw = await readText(catalogKey);
  } catch (e) {
    return {
      url,
      ok: false,
      quests: [],
      errors: [{ file: catalogKey, error: e?.message || "catalog_fetch_failed" }],
      cached: false,
    };
  }

  let catalog;
  try {
    catalog = JSON.parse(catalogRaw);
  } catch {
    return {
      url,
      ok: false,
      quests: [],
      errors: [{ file: catalogKey, error: "catalog_invalid_json" }],
      cached: false,
    };
  }

  const list = Array.isArray(catalog?.quests) ? catalog.quests : [];
  for (const entry of list) {
    if (entry && Object.hasOwn(entry, "packageRef")) {
      const record = packageCatalogRecord(entry);
      if (record) quests.push(record);
      else errors.push({ file: String(entry?.id || "?"), error: "package_reference_forbidden" });
      continue;
    }
    const file = String(entry?.file || "").trim();
    if (file && !safePackageMember(file)) {
      errors.push({ file, error: "object_key_forbidden" });
      continue;
    }
    if (!file) {
      errors.push({ file: String(entry?.id || "?"), error: "missing_file" });
      continue;
    }
    const key = joinObjectKey(prefix, file);
    let raw;
    try {
      raw = await readText(key);
    } catch (e) {
      errors.push({ file, error: e?.message || "tile_fetch_failed" });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push({ file, error: "invalid_json" });
      continue;
    }
    const v = validateQuestDocument(parsed);
    if (!v.ok) {
      errors.push({
        file,
        error: v.error || "validation_failed",
        details: v.details,
      });
      continue;
    }
    const rec = catalogRecordFromValidated(v, {
      file,
      remoteUrl: remoteBase ? `${remoteBase}${key}` : key,
      source: "remote",
      ...(parsePackageRef(entry.packageRef) ? { packageRef: parsePackageRef(entry.packageRef) } : {}),
    });
    if (!rec) continue;
    quests.push(rec);
  }

  return { url, ok: true, quests, errors, cached: false };
}

/**
 * @param {{
 *   bucket: string,
 *   prefix?: string,
 *   force?: boolean,
 *   ttlMs?: number,
 *   readText?: (key: string) => Promise<string>,
 * }} opts
 */
export async function fetchObjectQuestCatalog(opts) {
  const bucket = String(opts?.bucket || "").trim();
  const prefix = opts?.prefix ?? "";
  const url = `neon://${bucket}/${joinObjectKey(prefix, "catalog.json")}`;
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  if (
    !opts?.force &&
    cache &&
    cache.url === url &&
    cache.ok &&
    now - cache.at < cache.ttlMs
  ) {
    return {
      url,
      ok: true,
      quests: cache.quests,
      errors: cache.errors,
      cached: true,
    };
  }

  const readText = opts?.readText || ((key) => readNeonObjectText(bucket, key));
  const result = await catalogFromObjectReader(readText, {
    prefix,
    url,
    remoteBase: `neon://${bucket}/`,
  });
  if (result.ok) {
    cache = {
      url,
      at: now,
      ttlMs,
      quests: result.quests,
      errors: result.errors,
      ok: true,
    };
  }
  return result;
}
