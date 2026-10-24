/**
 * Local immutable quest-package registry.
 * Keyed by package id + revision. Current quest ids map to one release.
 * Does not read FF_PREDICTIONS_FILE and does not accept a client path.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { validatePackageBanks } from "../quest-package.js";
import { packageRevision } from "../package-identity.js";
import { parsePackageRef } from "./package-paths.mjs";
import { validateQuestDocument, catalogRecordFromValidated } from "../quest-tile.js";
import { allTechIds } from "../data.js";

export const PACKAGE_SCHEMA_V2 = "future-forge.quest-package/v2";

/**
 * @param {string} root
 */
export function resolveQuestPackagesDir(root, env = process.env) {
  const raw = String(env.FF_QUEST_PACKAGES_DIR || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(root, raw);
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

function walkFiles(dir, prefix = "") {
  /** @type {{ rel: string, abs: string }[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) {
      throw new Error(`package_integrity_failed: symlink ${rel}`);
    }
    if (st.isDirectory()) out.push(...walkFiles(abs, rel));
    else if (st.isFile()) out.push({ rel, abs });
  }
  return out;
}

/**
 * @param {string} rawDir extracted package root, or a root that contains raw/
 * @param {{ techIds?: string[]|null, packageRoot?: string }} [opts]
 */
export function loadVerifiedPackage(rawDir, opts = {}) {
  const root = fs.existsSync(path.join(rawDir, "raw/manifest.json"))
    ? path.join(rawDir, "raw")
    : rawDir;
  const manifestPath = path.join(root, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw Object.assign(new Error("package_dependency_missing: no manifest.json"), {
      code: "package_dependency_missing",
    });
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== PACKAGE_SCHEMA_V2 || manifest.version !== 2) {
    throw Object.assign(
      new Error(`package_version_unsupported: ${manifest.schema} v${manifest.version}`),
      { code: "package_version_unsupported" }
    );
  }
  const files = walkFiles(root).filter((row) => row.rel !== "manifest.json");
  const hashes = {};
  for (const row of files) {
    if (row.rel.split("/").some((part) => part === ".." || part === "")) {
      throw Object.assign(new Error(`package_integrity_failed: ${row.rel}`), {
        code: "package_integrity_failed",
      });
    }
    hashes[row.rel] = sha256File(row.abs);
  }
  const listed = manifest.files || {};
  for (const [rel, digest] of Object.entries(listed)) {
    if (hashes[rel] !== digest) {
      throw Object.assign(new Error(`package_integrity_failed: hash mismatch for ${rel}`), {
        code: "package_integrity_failed",
      });
    }
  }
  for (const rel of Object.keys(hashes)) {
    if (!listed[rel]) {
      throw Object.assign(new Error(`package_integrity_failed: unlisted file ${rel}`), {
        code: "package_integrity_failed",
      });
    }
  }
  const revision = packageRevision(
    manifest.schema,
    manifest.id,
    Object.entries(hashes).map(([filePath, digest]) => ({ path: filePath, digest })),
    (bytes) => createHash("sha256").update(bytes).digest("hex")
  );
  if (manifest.revision !== revision) {
    throw Object.assign(new Error("package_integrity_failed: revision mismatch"), {
      code: "package_integrity_failed",
    });
  }

  const quests = [];
  const banks = {};
  for (const row of files) {
    if (row.rel.startsWith("quests/") && row.rel.endsWith(".json") && row.rel.split("/").length === 2) {
      const tile = JSON.parse(fs.readFileSync(row.abs, "utf8"));
      quests.push({
        id: tile.id,
        kind: tile.kind || "quest",
        file: row.rel,
        tile,
      });
    }
    if (
      row.rel.startsWith("predictions/") &&
      row.rel.endsWith(".json") &&
      row.rel.split("/").length === 2
    ) {
      banks[path.basename(row.rel)] = JSON.parse(fs.readFileSync(row.abs, "utf8"));
    }
  }
  const bound = validatePackageBanks({
    quests,
    banks,
    techIds: opts.techIds ?? allTechIds(),
    requireBanks: true,
  });
  if (!bound.ok) {
    const message = bound.errors.map((item) => item.message).join("; ");
    throw Object.assign(new Error(message), {
      code: "package_dependency_missing",
      errors: bound.errors,
    });
  }
  const packageRoot = opts.packageRoot || root;
  return {
    packageId: manifest.id,
    revision,
    manifest,
    root,
    packageRoot,
    trust: "local-import",
    banks: bound.banks,
    quests: quests.map((quest) => ({
      id: quest.id,
      kind: quest.kind,
      file: quest.file,
      predictionBankId: quest.tile.predictionBankId || "",
      tile: quest.tile,
    })),
  };
}

function freezeRelease(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeRelease(child);
  return Object.freeze(value);
}

export function createPackageRegistry() {
  /** @type {Map<string, object>} */
  const byRevision = new Map();
  /** @type {Map<string, string>} quest id -> revision key */
  const currentQuest = new Map();
  return {
    size() {
      return byRevision.size;
    },
    get(packageId, revision) {
      return byRevision.get(`${packageId}@${revision}`) || null;
    },
    questRelease(questId) {
      const key = currentQuest.get(questId);
      return key ? byRevision.get(key) || null : null;
    },
    /**
     * Replace the registry only after every package validates.
     * @param {object[]} releases
     * @param {{ allowCollision?: boolean }} [opts]
     */
    replaceAll(releases, opts = {}) {
      const nextRev = new Map();
      const nextQuest = new Map();
      for (const release of releases) {
        const key = `${release.packageId}@${release.revision}`;
        if (nextRev.has(key)) {
          throw Object.assign(new Error(`package_quest_collision: duplicate release ${key}`), {
            code: "package_quest_collision",
          });
        }
        nextRev.set(key, freezeRelease(structuredClone(release)));
        for (const quest of release.quests || []) {
          if (quest.kind === "module") continue;
          const prev = nextQuest.get(quest.id);
          if (prev && prev !== key && !opts.allowCollision) {
            throw Object.assign(
              new Error(
                `package_quest_collision: ${quest.id} is in ${prev} and ${key}`
              ),
              { code: "package_quest_collision" }
            );
          }
          if (!prev || opts.allowCollision) nextQuest.set(quest.id, key);
        }
      }
      byRevision.clear();
      currentQuest.clear();
      for (const [key, value] of nextRev) byRevision.set(key, value);
      for (const [key, value] of nextQuest) currentQuest.set(key, value);
      return { releases: byRevision.size, quests: currentQuest.size };
    },
  };
}

/**
 * @param {string} packagesDir
 * @param {{ techIds?: string[]|null }} [opts]
 */
export function registerPackagesDir(packagesDir, opts = {}) {
  const registry = createPackageRegistry();
  if (!packagesDir || !fs.existsSync(packagesDir)) {
    return { registry, errors: [], registered: 0 };
  }
  const errors = [];
  const releases = [];
  const names = fs.readdirSync(packagesDir).sort();
  for (const name of names) {
    if (["quests", "lessons", "assets", "predictions"].includes(name)) continue;
    const abs = path.join(packagesDir, name);
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) {
      errors.push({ dir: name, code: "package_integrity_failed", message: "symbolic package root is not allowed" });
      continue;
    }
    if (!stat.isDirectory()) continue;
    try {
      releases.push(loadVerifiedPackage(abs, { ...opts, packageRoot: abs }));
    } catch (err) {
      errors.push({
        dir: name,
        code: err.code || "package_integrity_failed",
        message: err.message,
      });
    }
  }
  if (!errors.length) {
    try {
      registry.replaceAll(releases);
    } catch (err) {
      errors.push({ dir: packagesDir, code: err.code || "package_integrity_failed", message: err.message });
    }
  }
  return { registry, errors, registered: errors.length ? 0 : releases.length };
}

/** Resolve only registered local bytes, never a browser-supplied path. */
export function resolveLocalPackage(registry, rawRef) {
  const ref = parsePackageRef(rawRef);
  if (!ref) return { ok: false, code: "package_reference_forbidden" };
  const release = registry?.get(ref.packageId, ref.revision);
  if (!release) return { ok: false, code: "package_revision_unavailable" };
  const quest = release.quests.find((entry) => entry.id === ref.questId);
  if (!quest) return { ok: false, code: "package_revision_unavailable" };
  const validated = validateQuestDocument(quest.tile);
  if (!validated.ok) return { ok: false, code: "package_dependency_missing", details: validated.details };
  const bank = release.banks[quest.predictionBankId];
  if (quest.kind !== "module" && !bank) return { ok: false, code: "package_dependency_missing" };
  return {
    ok: true,
    packageRef: ref,
    trust: "local-import",
    record: catalogRecordFromValidated(validated, { source: "hosted", file: quest.file, packageRef: ref }),
    bank: bank ? structuredClone(bank) : null,
  };
}
