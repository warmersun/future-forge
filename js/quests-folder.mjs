/**
 * Scan a designated folder for Future Forge quest tile JSON files.
 * Used by the game server (GET /api/quests) and unit tests.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { resolveLocalPackage } from "./server/quest-package-resolver.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/**
 * Resolve quests directory (env FF_QUESTS_DIR or <repo>/quests).
 * @param {string} [root=ROOT]
 */
export function resolveQuestsDir(root = ROOT) {
  const env = process.env.FF_QUESTS_DIR;
  if (env && String(env).trim()) {
    return path.isAbsolute(env) ? env : path.join(root, env);
  }
  return path.join(root, "quests");
}

/**
 * Ensure folder exists (creates empty dir + does not write README).
 * @param {string} dir
 */
export function ensureQuestsDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  return dir;
}

/**
 * @param {string} [dir]
 * @returns {Promise<{
 *   dir: string,
 *   quests: object[],
 *   errors: { file: string, error: string, details?: string[] }[],
 * }>}
 */
export async function scanQuestsFolder(dir = resolveQuestsDir(), opts = {}) {
  ensureQuestsDir(dir);
  const { parseQuestTileJson, validateQuestDocument, catalogRecordFromValidated } =
    await import(pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href);

  /** @type {object[]} */
  const quests = [];
  /** @type {{ file: string, error: string, details?: string[] }[]} */
  const errors = [];

  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    return {
      dir,
      quests: [],
      errors: [{ file: dir, error: e.message || "read_failed" }],
    };
  }

  const jsonFiles = names
    .filter((n) => n.toLowerCase().endsWith(".json") && !n.startsWith("."))
    .sort((a, b) => a.localeCompare(b));

  for (const name of jsonFiles) {
    const filePath = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (e) {
      errors.push({ file: name, error: e.message || "read_failed" });
      continue;
    }

    const parsed = parseQuestTileJson(raw);
    if (!parsed.ok) {
      errors.push({ file: name, error: parsed.error || "invalid_json" });
      continue;
    }

    const v = validateQuestDocument(parsed.value);
    if (!v.ok) {
      errors.push({
        file: name,
        error: v.error || "validation_failed",
        details: v.details,
      });
      continue;
    }

    const rec = catalogRecordFromValidated(v, { file: name, source: "hosted" });
    if (!rec) continue;
    if (rec.predictionBankId) {
      const release = opts.packageRegistry?.questRelease(rec.id);
      const packageRef = release ? {
        packageId: release.packageId,
        revision: release.revision,
        questId: rec.id,
      } : null;
      const resolved = packageRef ? resolveLocalPackage(opts.packageRegistry, packageRef) : null;
      if (!resolved?.ok) {
        errors.push({ file: name, error: resolved?.code || "package_dependency_missing" });
        continue;
      }
      rec.packageRef = packageRef;
      rec.trust = "local-import";
      rec.mission.packageRef = packageRef;
      rec.mission.runWorld = { packageRef, bank: resolved.bank, trust: "local-import", questId: rec.id };
    }
    quests.push(rec);
  }

  return { dir, quests, errors };
}
