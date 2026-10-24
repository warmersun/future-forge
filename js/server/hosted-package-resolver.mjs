/** Hosted immutable releases. Only server-configured readers/keys are inputs. */
import { resolvePackageRelease } from "./package-release.mjs";
import { packageObjectKey, parsePackageRef, safePackageMember } from "./package-paths.mjs";
import { catalogCard, questReadDecision } from "./cloud-gate.mjs";
import { createRunWorld } from "../sim/run-world.js";
import { createNeonObjectReader, catalogFromObjectReader, questsBucketFromEnv, questsObjectPrefixFromEnv } from "./quest-object-storage.mjs";

const failure = (code, status = 409) => ({ ok: false, code, error: code, status });
const bytes = (value) => {
  if (typeof value === "string") return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));
  throw new Error("object_read_failed");
};

/** Fetch, contain, and validate a complete release before it can enter a cache. */
export async function readHostedPackageRelease(readBytes, rawRef, { prefix = "", trust = "official", techIds, deliveryRoot,
  maxFiles = 2048, maxBytes = 64 * 1024 * 1024 } = {}) {
  const ref = parsePackageRef(rawRef);
  const root = ref && packageObjectKey(prefix, ref);
  if (!root) return failure("package_reference_forbidden", 400);
  const files = Object.create(null);
  let manifest;
  let total = 0;
  try {
    const body = bytes(await readBytes(`${root}/manifest.json`));
    total += body.length;
    if (total > maxBytes) return failure("package_integrity_failed");
    files[`${root}/manifest.json`] = body;
  } catch {
    return failure("package_revision_unavailable", 404);
  }
  try { manifest = JSON.parse(files[`${root}/manifest.json`].toString("utf8")); }
  catch { return failure("package_integrity_failed"); }
  if (!manifest || typeof manifest.files !== "object" || !manifest.files || Array.isArray(manifest.files))
    return failure("package_integrity_failed");
  const members = Object.keys(manifest.files);
  if (members.length > maxFiles || members.some((name) => !safePackageMember(name) || name === "manifest.json"))
    return failure("package_integrity_failed");
  for (const name of members) {
    const key = packageObjectKey(prefix, ref, name);
    if (!key) return failure("package_integrity_failed");
    try {
      const body = bytes(await readBytes(key));
      total += body.length;
      if (total > maxBytes) return failure("package_integrity_failed");
      files[key] = body;
    } catch { return failure("package_dependency_missing"); }
  }
  const resolved = resolvePackageRelease(files, ref, { prefix, trust, techIds, deliveryRoot });
  return resolved.ok ? { ...resolved, files } : resolved;
}

/**
 * loadCatalog is ALWAYS called on resolve, including cache hits. Current membership
 * is packageId + questId, not revision: saved runs may keep an older valid release.
 * identity and entitled must come from server authentication/billing, not a body flag.
 */
export function createHostedPackageResolver({ readBytes, prefix = "", loadCatalog, trust = "official", techIds, deliveryRoot,
  maxCachedRevisions = 32, maxFiles, maxBytes } = {}) {
  const cache = new Map();
  return {
    async resolve(rawRef, { identity = { enabled: true, signedIn: false }, entitled = false } = {}) {
      const ref = parsePackageRef(rawRef);
      if (!ref || !packageObjectKey(prefix, ref)) return failure("package_reference_forbidden", 400);
      let catalog;
      try { catalog = await loadCatalog({ force: true }); } catch { return failure("package_catalog_unavailable", 503); }
      if (!catalog?.ok) return failure("package_catalog_unavailable", 503);
      const candidates = (catalog.quests || []).filter((entry) => {
        const current = parsePackageRef(entry.packageRef);
        return current && current.packageId === ref.packageId && current.questId === ref.questId && entry.id === ref.questId;
      });
      if (candidates.length !== 1) return failure("package_reference_forbidden", 404);
      const current = candidates[0];
      const decision = questReadDecision(current, identity, { entitled });
      if (!decision.allow) return { ...failure(decision.error, decision.status), record: catalogCard(current) };
      const key = `${ref.packageId}@${ref.revision}`;
      let files = cache.get(key);
      let resolved;
      if (files) resolved = resolvePackageRelease(files, ref, { prefix, trust, techIds, deliveryRoot });
      else {
        const loaded = await readHostedPackageRelease(readBytes, ref, { prefix, trust, techIds, deliveryRoot, maxFiles, maxBytes });
        if (!loaded.ok) return loaded;
        ({ files, ...resolved } = loaded);
        if (maxCachedRevisions > 0) {
          cache.set(key, files);
          while (cache.size > maxCachedRevisions) cache.delete(cache.keys().next().value);
        }
      }
      if (!resolved.ok) return resolved;
      // Never let the old release's access policy bypass today's gate, or vice versa.
      const releaseDecision = questReadDecision(resolved.record, identity, { entitled });
      if (!releaseDecision.allow) return { ...failure(releaseDecision.error, releaseDecision.status), record: catalogCard(current) };
      const runWorld = createRunWorld({ packageRef: ref, bank: resolved.bank, trust, questId: ref.questId });
      const record = structuredClone(resolved.record);
      record.packageRef = ref;
      record.runWorld = structuredClone(runWorld);
      if (record.mission) record.mission = { ...record.mission, packageRef: ref, runWorld: structuredClone(runWorld) };
      return { ...resolved, record, tile: record, runWorld };
    },
    clearCache() { cache.clear(); },
  };
}

/** HTTPS catalog directory is an operator-approved origin; redirects are never followed. */
export function createApprovedRemoteObjectReader({ catalogUrl, fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const catalog = new URL(catalogUrl);
  if (catalog.protocol !== "https:" || catalog.username || catalog.password || catalog.search || catalog.hash ||
      !catalog.pathname.endsWith("/catalog.json")) throw new Error("package_origin_forbidden");
  const base = new URL("./", catalog);
  return async (key) => {
    if (!safePackageMember(key)) throw new Error("package_reference_forbidden");
    const target = new URL(key, base);
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw new Error("package_reference_forbidden");
    const response = await fetchImpl(target.href, { redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error("object_read_failed");
    return Buffer.from(await response.arrayBuffer());
  };
}

/** Private bucket takes precedence; no public fallback when private storage fails. */
export function createHostedPackageResolverFromEnv({ env = process.env, loadCatalog, readBytes, fetchImpl, ...opts } = {}) {
  const bucket = questsBucketFromEnv(env);
  const prefix = bucket ? questsObjectPrefixFromEnv(env) : "";
  let reader = readBytes;
  if (!reader && bucket) reader = createNeonObjectReader(bucket);
  if (!reader) {
    try { reader = createApprovedRemoteObjectReader({ catalogUrl: env.FF_QUESTS_REMOTE_URL === undefined
      ? "https://warmersun.com/quests/catalog.json" : String(env.FF_QUESTS_REMOTE_URL).trim(), fetchImpl }); }
    catch { reader = async () => { throw new Error("package_origin_forbidden"); }; }
  }
  const catalogLoader = loadCatalog || (() => catalogFromObjectReader(async (key) => bytes(await reader(key)).toString("utf8"), { prefix }));
  return createHostedPackageResolver({ deliveryRoot: env.FF_QUEST_PACKAGE_DELIVERY_ROOT, ...opts, readBytes: reader, prefix, loadCatalog: catalogLoader });
}
