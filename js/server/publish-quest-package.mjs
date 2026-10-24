/** Immutable package publication. No credentials, SDK imports, or network defaults.
 *
 * Adapter contract (atomic operations, NOT exists()+upload() emulation):
 * readObject(key) -> null (only if absent) | { body: Uint8Array, version: string }
 * createObject(key, bytes) -> boolean: atomically create iff absent; false on conflict.
 * compareAndSwap(key, bytes, expectedVersion) -> boolean: atomic replacement iff
 * the opaque version matches; null means create iff absent. Every successful write
 * must change the version (including ABA); reads must be strongly consistent.
 * Other failures throw. Never translate permissions/network errors to absence.
 * Immutable keys must not be overwritten/deleted by any other writer.
 * files-sdk's unconditional upload is NOT an implementation of this contract.
 */
import { createHash } from "node:crypto";
import { packageRevision } from "../package-identity.js";
import { packageObjectKey, safePackageMember } from "./package-paths.mjs";
import { resolvePackageRelease } from "./package-release.mjs";
import { joinObjectKey } from "./quest-object-storage.mjs";
import { validateQuestDocument } from "../quest-tile.js";
import { lintQuestTile, formatLintWarnings } from "../quest-lint.js";
import { evaluateQuestEconomy } from "../sim/quest-economy.js";
import { catalogCard } from "./cloud-gate.mjs";

/** Match strict authoring acceptance, not merely package integrity. Modules have
 * craft lint but no playable economy; every playable member must pass both solo
 * paths in the same finite finishing year. No adapter/credentials are involved.
 */
function acceptAuthoring(raw, id) {
  const document = JSON.parse(raw.toString("utf8"));
  const validated = validateQuestDocument(document);
  if (!validated.ok) throw new Error(`Invalid quest ${id}: ${validated.error}`);
  const { warnings } = lintQuestTile(document, validated);
  if (warnings.length) throw new Error(`Craft acceptance failed for ${id}:\n${formatLintWarnings(warnings).join("\n")}`);
  if (validated.kind !== "module" && validated.tile.kind !== "module") {
    const report = evaluateQuestEconomy(validated, { recommend: false });
    const noAi = report.archetypes["solo-no-ai"];
    const ai = report.archetypes["solo-ai"];
    if (report.questVerdict !== "challenging" || noAi?.verdict !== "challenging" || ai?.verdict !== "challenging" ||
        !Number.isFinite(noAi?.year) || !Number.isFinite(ai?.year) || noAi.year !== ai.year) {
      throw new Error(`Economy acceptance failed for ${id}: solo-no-ai ${noAi?.verdict} (${noAi?.year}), solo-ai ${ai?.verdict} (${ai?.year}); both must be challenging in the same year`);
    }
  }
}

const digest = (body) => createHash("sha256").update(body).digest("hex");
function bytes(body) {
  if (!(body instanceof Uint8Array)) throw new Error("Object bytes must be Uint8Array (no text reserialization)");
  return Buffer.from(body);
}

/** files is the verified RAW archive tree, including manifest.json, never a delivery projection.
 * All checks also run in offline dry-run. Access overrides are deliberately rejected.
 */
export function planPublishPackage({ files, prefix = "", access = null }) {
  if (access != null) throw new Error("--access cannot mutate a hashed release. Edit quest access in the source, repack, verify, and publish the NEW content revision.");
  if (!files || typeof files !== "object") throw new Error("Raw package files are required");
  const raw = Object.fromEntries(Object.entries(files).map(([name, body]) => {
    if (!safePackageMember(name)) throw new Error(`Unsafe package member: ${name}`);
    return [name, bytes(body)];
  }));
  let manifest;
  try { manifest = JSON.parse(raw["manifest.json"]?.toString("utf8")); }
  catch { throw new Error("Package manifest is missing or invalid JSON"); }
  if (manifest?.schema !== "future-forge.quest-package/v2" || manifest.version !== 2) {
    throw new Error("v1 package publication is unsupported: repack source with an explicit prediction bank as a self-contained v2 package; legacy tile publisher remains available for v1 quests.");
  }
  if (!manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) throw new Error("Invalid manifest files");
  const names = Object.keys(manifest.files);
  if (names.includes("manifest.json") || Object.keys(raw).length !== names.length + 1 || names.some((name) => !Object.hasOwn(raw, name))) {
    throw new Error("Raw archive must contain exactly manifest.json and every hashed dependency");
  }
  const revision = packageRevision(manifest.schema, manifest.id, names.map((name) => ({ path: name, digest: `sha256:${digest(raw[name])}` })), digest);
  if (manifest.revision !== revision) throw new Error("Package revision does not match raw bytes");
  const ref = { packageId: manifest.id, revision };
  const root = packageObjectKey(prefix, ref);
  if (!root) throw new Error("Unsafe package id, revision, or object prefix");
  const objects = Object.entries(raw).map(([name, body]) => ({ name, key: packageObjectKey(prefix, ref, name), body }));
  const indexed = Object.fromEntries(objects.map(({ key, body }) => [key, body]));
  if (!Array.isArray(manifest.quests) || !manifest.quests.length) throw new Error("No package quests");
  const entries = manifest.quests.map(({ id, file }) => {
    const packageRef = { ...ref, questId: id };
    const resolved = resolvePackageRelease(indexed, packageRef, { prefix, projectDelivery: false });
    if (!resolved.ok) throw new Error(`${resolved.code}: ${resolved.message}`);
    acceptAuthoring(raw[file], id);
    // Only the shared, allowlisted public card belongs in a catalog. Never copy
    // the raw quest, mission, tutor curriculum, or package world into metadata.
    return { ...catalogCard(resolved.record), id, file: packageObjectKey("", ref, file), packageRef };
  });
  return { files: raw, prefix, packageId: manifest.id, revision, objects, entries, catalogKey: joinObjectKey(prefix, "catalog.json") };
}

export function packagePlanSummary(plan) {
  return { packageId: plan.packageId, revision: plan.revision, catalogKey: plan.catalogKey, entries: plan.entries,
    objects: plan.objects.map(({ key, body }) => ({ key, bytes: body.length, sha256: digest(body) })) };
}

function catalogFromSnapshot(snapshot) {
  if (snapshot === null) return { quests: [] };
  if (!snapshot || typeof snapshot.version !== "string" || !snapshot.version) throw new Error("Adapter must return an opaque catalog version");
  let catalog;
  try { catalog = JSON.parse(bytes(snapshot.body).toString("utf8")); }
  catch { throw new Error("Live catalog is invalid JSON; refusing promotion"); }
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog) || !Array.isArray(catalog.quests) ||
      catalog.quests.some((row) => !row || typeof row !== "object" || typeof row.id !== "string")) {
    throw new Error("Live catalog is malformed; refusing promotion");
  }
  if (new Set(catalog.quests.map((row) => row.id)).size !== catalog.quests.length) throw new Error("Live catalog has duplicate ids");
  return catalog;
}

/** Revalidate even a previously created plan before touching the adapter.
 * On upload/readback failure catalog is untouched. Partial immutable uploads are
 * intentionally retained, as are every old revision's objects. Retry is safe.
 * Catalog conflicts re-read and re-merge, preserving unrelated entries/metadata.
 */
export async function publishPackagePlan(input, { dryRun = false, adapter, maxAttempts = 8 } = {}) {
  const plan = planPublishPackage(input);
  if (dryRun) return { ok: true, dryRun: true, wrote: [], plan: packagePlanSummary(plan) };
  if (!adapter || ["readObject", "createObject", "compareAndSwap"].some((name) => typeof adapter[name] !== "function")) {
    throw new Error("Atomic CAS adapter required: readObject/createObject/compareAndSwap. files-sdk unconditional upload is unsafe; supply a verified conditional storage adapter.");
  }
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts must be a positive integer");
  // Validate catalog before uploads too; missing is distinct from failed reads.
  catalogFromSnapshot(await adapter.readObject(plan.catalogKey));
  const wrote = [];
  for (const { key, body } of plan.objects) {
    const existing = await adapter.readObject(key);
    if (existing !== null) {
      if (!bytes(existing.body).equals(body)) throw new Error(`Immutable object conflict: ${key}`);
    } else if (await adapter.createObject(key, Buffer.from(body))) {
      wrote.push(key);
    }
    const stored = await adapter.readObject(key);
    if (stored === null || !bytes(stored.body).equals(body)) throw new Error(`Exact object readback failed: ${key}`);
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const snapshot = await adapter.readObject(plan.catalogKey);
    const catalog = catalogFromSnapshot(snapshot);
    const ids = new Set(plan.entries.map((entry) => entry.id));
    // A matching id is a complete release-owned replacement. Merging stale
    // sponsor/entitlement/learning fields can silently bypass today's access.
    const quests = catalog.quests.map((entry) => ids.has(entry.id)
      ? plan.entries.find((next) => next.id === entry.id) : entry);
    for (const entry of plan.entries) if (!quests.some((row) => row.id === entry.id)) quests.push(entry);
    const body = Buffer.from(`${JSON.stringify({ ...catalog, quests }, null, 2)}\n`);
    if (!await adapter.compareAndSwap(plan.catalogKey, body, snapshot?.version ?? null)) continue;
    const readback = await adapter.readObject(plan.catalogKey);
    catalogFromSnapshot(readback);
    // A concurrent publisher may already have promoted another release. Re-merge
    // from that exact snapshot instead of assuming our write is still current.
    if (readback !== null && bytes(readback.body).equals(body)) {
      return { ok: true, dryRun: false, wrote, catalogKey: plan.catalogKey, attempts: attempt, revision: plan.revision };
    }
  }
  throw new Error(`Catalog promotion conflict after ${maxAttempts} attempts; verified release objects retained; retry publication`);
}
