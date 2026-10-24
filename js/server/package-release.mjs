/**
 * Resolve one authorized quest from an immutable package release.
 * Client banks, grants, and hashes are not inputs.
 */

import { createHash } from "node:crypto";
import { projectPackageDelivery } from "./package-delivery.mjs";
import { allTechIds } from "../data.js";
import { catalogRecordFromValidated, validateQuestDocument } from "../quest-tile.js";
import { validatePackageBanks, selectPackageBank } from "../quest-package.js";
import { packageRevision } from "../package-identity.js";
import { catalogCard } from "./cloud-gate.mjs";
import { containedPackageFile, packageObjectKey, parsePackageRef } from "./package-paths.mjs";

/**
 * @param {Record<string, string|Uint8Array>} files path -> immutable raw bytes
 * @param {{ packageId: string, revision: string, questId: string }} ref
 * @param {{ techIds?: string[]|null, prefix?: string, trust?: string, deliveryRoot?: string }} [opts]
 */
export function resolvePackageRelease(files, ref, opts = {}) {
  const parsed = parsePackageRef(ref);
  if (!parsed) {
    return { ok: false, code: "package_reference_forbidden", message: "package reference is not valid" };
  }
  const prefix = String(opts.prefix || "").replace(/^\/+|\/+$/g, "");
  const root = packageObjectKey(prefix, parsed);
  if (!root) {
    return { ok: false, code: "package_reference_forbidden", message: "package path is not contained" };
  }
  const manifestKey = `${root}/manifest.json`;
  const manifestRaw = files[manifestKey];
  if (manifestRaw == null) {
    return { ok: false, code: "package_revision_unavailable", message: "release manifest is missing" };
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch {
    return { ok: false, code: "package_integrity_failed", message: "release manifest is not JSON" };
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ok: false, code: "package_integrity_failed", message: "release manifest must be an object" };
  }
  if (manifest.schema !== "future-forge.quest-package/v2" || manifest.version !== 2) {
    return { ok: false, code: "package_version_unsupported", message: "release schema is unsupported" };
  }
  if (manifest.id !== parsed.packageId) {
    return { ok: false, code: "package_integrity_failed", message: "package id does not match the release" };
  }
  if (!manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files) ||
      !Array.isArray(manifest.quests) || !manifest.quests.length || !Array.isArray(manifest.predictions)) {
    return { ok: false, code: "package_integrity_failed", message: "release indexes are missing or malformed" };
  }
  const listed = manifest.files;
  const questIds = new Set();
  const bankIds = new Set();
  for (const [entries, seen, folder] of [[manifest.quests, questIds, "quests"], [manifest.predictions, bankIds, "predictions"]]) {
    for (const entry of entries) {
      if (!entry || typeof entry.id !== "string" || seen.has(entry.id) ||
          entry.file !== `${folder}/${entry.id}.json` || !Object.hasOwn(listed, entry.file)) {
        return { ok: false, code: "package_integrity_failed", message: `${folder} index is not a unique hashed-file index` };
      }
      seen.add(entry.id);
    }
  }
  for (const rel of Object.keys(listed)) {
    if (rel.startsWith("quests/") && !manifest.quests.some((entry) => entry.file === rel) ||
        rel.startsWith("predictions/") && !manifest.predictions.some((entry) => entry.file === rel)) {
      return { ok: false, code: "package_integrity_failed", message: `unindexed source file ${rel}` };
    }
  }
  /** @type {{ path: string, digest: string }[]} */
  const hashed = [];
  for (const [rel, digest] of Object.entries(listed)) {
    const key = containedPackageFile(root, rel);
    if (!key || !key.startsWith(`${root}/`)) {
      return { ok: false, code: "package_integrity_failed", message: `unsafe package path ${rel}` };
    }
    const body = files[key];
    if (body == null) {
      return { ok: false, code: "package_dependency_missing", message: `missing ${rel}` };
    }
    const actual = `sha256:${createHash("sha256").update(body).digest("hex")}`;
    if (actual !== digest) {
      return { ok: false, code: "package_integrity_failed", message: `hash mismatch for ${rel}` };
    }
    hashed.push({ path: rel, digest: actual });
  }
  const revision = packageRevision(manifest.schema, manifest.id, hashed, (bytes) =>
    createHash("sha256").update(bytes).digest("hex")
  );
  if (revision !== parsed.revision || manifest.revision !== revision) {
    return { ok: false, code: "package_integrity_failed", message: "revision does not match the release bytes" };
  }
  const questEntry = (manifest.quests || []).find((row) => row?.id === parsed.questId);
  if (!questEntry) {
    return { ok: false, code: "package_revision_unavailable", message: "quest is not in this release" };
  }
  const questKey = containedPackageFile(root, questEntry.file);
  const questRaw = questKey ? files[questKey] : null;
  if (!questRaw) {
    return { ok: false, code: "package_dependency_missing", message: "quest file is missing" };
  }
  let tileDoc;
  try {
    tileDoc = JSON.parse(questRaw);
  } catch {
    return { ok: false, code: "package_integrity_failed", message: "quest file is not JSON" };
  }
  const validated = validateQuestDocument(tileDoc);
  if (!validated.ok) {
    return { ok: false, code: "package_dependency_missing", message: `invalid quest ${parsed.questId}: ${validated.details?.join(", ") || validated.error}` };
  }
  const record = catalogRecordFromValidated(validated, {
    file: questEntry.file,
    source: opts.trust === "local-import" ? "package" : "remote",
    packageRef: parsed,
  });
  const quests = [];
  for (const row of manifest.quests || []) {
    const key = containedPackageFile(root, row.file);
    if (!key || files[key] == null) {
      return { ok: false, code: "package_dependency_missing", message: `missing ${row.file}` };
    }
    let tile;
    try {
      tile = JSON.parse(files[key]);
    } catch {
      return { ok: false, code: "package_integrity_failed", message: `${row.file} is not JSON` };
    }
    if (!tile || tile.id !== row.id || (tile.kind || "quest") !== row.kind ||
        (row.kind !== "module" && row.predictionBankId !== tile.predictionBankId)) {
      return { ok: false, code: "package_integrity_failed", message: `quest index disagrees with ${row.file}` };
    }
    const member = validateQuestDocument(tile);
    if (!member.ok) return { ok: false, code: "package_dependency_missing", message: `invalid quest ${row.id}` };
    quests.push({ id: tile.id, kind: tile.kind || "quest", file: row.file, tile });
  }
  const banks = {};
  for (const row of manifest.predictions || []) {
    const key = containedPackageFile(root, row.file);
    if (!key || files[key] == null) {
      return { ok: false, code: "package_dependency_missing", message: `missing bank ${row.id}` };
    }
    try {
      banks[`${row.id}.json`] = JSON.parse(files[key]);
    } catch {
      return { ok: false, code: "package_integrity_failed", message: `${row.file} is not JSON` };
    }
  }
  const bound = validatePackageBanks({
    quests,
    banks,
    techIds: opts.techIds ?? allTechIds(),
    requireBanks: true,
  });
  if (!bound.ok) {
    return {
      ok: false,
      code: bound.errors[0]?.code || "package_dependency_missing",
      message: bound.errors.map((item) => item.message).join("; "),
    };
  }
  const bankId = record?.predictionBankId || tileDoc.predictionBankId || "";
  const bank = bankId ? selectPackageBank(bound.banks, bankId) : null;
  let delivery;
  try {
    delivery = projectPackageDelivery(record, { deliveryRoot: opts.deliveryRoot, objectRoot: root, members: listed, validateOnly: opts.projectDelivery === false });
  } catch (error) {
    return { ok: false, code: error.code || "package_delivery_path_forbidden", message: error.message };
  }
  return {
    ok: true,
    packageRef: parsed,
    revision,
    trust: opts.trust || "official",
    record: delivery.record,
    bank,
    deliveryRoot: delivery.deliveryRoot,
  };
}

/**
 * Public response for one quest. Denied callers get a card, never another quest's world.
 * @param {object|null} resolved
 * @param {{ allow: boolean }} decision
 */
export function packageQuestProjection(resolved, decision) {
  if (!resolved?.ok) return null;
  if (!decision?.allow) return catalogCard(resolved.record);
  const card = {
    ...resolved.record,
    packageRef: resolved.packageRef,
    trust: resolved.trust,
  };
  if (resolved.bank) {
    card.world = {
      bankId: resolved.bank.id,
      predictions: resolved.bank.predictions,
    };
  }
  return card;
}
