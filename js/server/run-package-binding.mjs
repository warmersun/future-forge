import { parsePackageRef } from "./package-paths.mjs";
import { parseRunStateBody, RUN_STATE_MAX_BYTES } from "./run-state.mjs";

const fail = (code, status = 409) => ({ ok: false, code, error: code, status });
const same = (a, b) => a && b && ["packageId", "revision", "questId"].every((k) => a[k] === b[k]);
const denied = (r) => fail(r?.code || r?.error || "package_revision_unavailable", r?.status || (r?.code === "package_reference_forbidden" ? 403 : 409));

/** Select from the current server catalog, never from a client mission. */
export async function resolveStartPackageBinding(input, { loadCatalog, resolvePackage, resolveQuestPackage, userId, identity } = {}) {
  const explicit = input.packageRef ?? input.package_ref;
  const requested = explicit == null ? null : parsePackageRef(explicit);
  if (explicit != null && !requested) return fail("package_reference_forbidden", 400);
  let ref = requested;
  if (loadCatalog) {
    let catalog;
    try { catalog = await loadCatalog({ force: true }); } catch { return fail("package_catalog_unavailable", 503); }
    if (!catalog?.ok) return fail("package_catalog_unavailable", 503);
    const matches = (catalog.quests || []).filter((q) => q.id === input.questId);
    if (matches.length > 1) return fail("package_reference_forbidden");
    const tile = matches[0];
    if (tile?.packageRef) {
      ref = parsePackageRef(tile.packageRef);
      if (!ref) return fail("package_reference_forbidden");
      if (requested && !same(requested, ref)) return fail("package_reference_forbidden");
    } else if (requested) return fail("package_reference_forbidden");
  } else if (resolveQuestPackage) {
    const result = await resolveQuestPackage(input.questId, { userId, identity, packageRef: requested });
    if (!result?.ok) return denied(result);
    if (!result.packageRef) return requested ? fail("package_reference_forbidden") : { ok: true, packageRef: null };
    ref = parsePackageRef(result.packageRef);
    if (!ref || ref.questId !== input.questId || requested && !same(requested, ref)) return fail("package_reference_forbidden");
    return { ...result, packageRef: ref };
  }
  if (!ref) return { ok: true, packageRef: null };
  if (ref.questId !== input.questId) return fail("package_reference_forbidden");
  if (!resolvePackage) return fail("package_revision_unavailable");
  const resolved = await resolvePackage(ref, { userId, identity });
  if (!resolved?.ok) return denied(resolved);
  if (!same(ref, parsePackageRef(resolved.packageRef))) return fail("package_reference_forbidden");
  return { ok: true, packageRef: ref, resolved };
}

/** Owner-scoped row is the only authority for a saved official run. */
export async function resolveRunPackageBinding(snapshot, { userId, loadRun, resolvePackage, identity } = {}) {
  if (!snapshot) return { ok: true, packageRef: null, state: snapshot };
  const refs = [snapshot.packageRef, snapshot.play?.packageRef, snapshot.play?.mission?.packageRef].filter((v) => v != null);
  // An imported package carries its content identity, not official release authority.
  // The normal sanitizer still validates its pinned local world before persistence.
  const claimedOfficial = snapshot.play?.mission?.runWorld?.trust === "local-import"
    ? [snapshot.packageRef, snapshot.play?.packageRef].filter((v) => v != null) : refs;
  if (refs.some((r) => !parsePackageRef(r))) return fail("package_reference_forbidden");
  const row = snapshot.runId && loadRun ? await loadRun(userId, snapshot.runId) : null;
  if (row?.clerk_user_id && row.clerk_user_id !== userId) return fail("run_not_owned", 403);
  if (!row) return claimedOfficial.length || snapshot.runId ? fail("run_not_owned", 403) : { ok: true, packageRef: null, state: snapshot };
  if ((row.quest_id || row.questId) !== snapshot.questId) return fail("package_reference_forbidden");
  const raw = row.packageRef || (row.package_id || row.package_revision || row.package_quest_id ? {
    packageId: row.package_id, revision: row.package_revision, questId: row.package_quest_id,
  } : null);
  const ref = parsePackageRef(raw);
  if (!ref) return raw || claimedOfficial.length ? fail("package_reference_forbidden") : { ok: true, packageRef: null, state: snapshot };
  if (ref.questId !== snapshot.questId || refs.some((r) => !same(ref, parsePackageRef(r)))) return fail("package_reference_forbidden");
  if (!resolvePackage) return fail("package_revision_unavailable");
  const resolved = await resolvePackage(ref, { userId, identity });
  if (!resolved?.ok) return denied(resolved);
  if (!same(ref, parsePackageRef(resolved.packageRef))) return fail("package_reference_forbidden");
  const mission = resolved.record?.mission || resolved.tile?.mission;
  const world = resolved.runWorld || mission?.runWorld;
  if (!mission || !world) return fail("package_dependency_missing");
  const play = { ...snapshot.play, packageRef: ref, mission: { ...structuredClone(mission), packageRef: ref, runWorld: structuredClone(world) } };
  // Hydration has one owner; a second play.runWorld duplicates the entire bank.
  delete play.runWorld;
  delete play.predictionsBank;
  delete play.predictionsBankError;
  return { ok: true, packageRef: ref, resolved, state: { ...snapshot, play } };
}

/** Sanitize progress, then restore only the server-owned package projection.
 * Recheck the final wire size: sanitization deliberately omits official worlds.
 */
export function sanitizeBoundRunState(checked) {
  if (!checked.ok || !checked.state) return checked;
  const parsed = parseRunStateBody(checked.state);
  if (!parsed.ok) return fail(parsed.error, 400);
  const state = parsed.state;
  if (checked.packageRef) state.play = { ...state.play, packageRef: checked.packageRef,
    mission: checked.state.play.mission };
  if (checked.state.updatedAt != null) state.updatedAt = checked.state.updatedAt;
  if (Buffer.byteLength(JSON.stringify(state), "utf8") > RUN_STATE_MAX_BYTES) return fail("too_large", 400);
  return { ...checked, state };
}

/** Official persistence contains progress + exact identity, never static world copies.
 * Reads reauthorize and hydrate mission.runWorld from the retained release.
 */
export function compactBoundRunState(checked) {
  const state = checked.state;
  if (!checked.packageRef || !state) return state;
  const ref = structuredClone(checked.packageRef);
  const mission = { id: ref.questId, packageRef: ref };
  if (state.play?.mission?.predictionBankId) mission.predictionBankId = state.play.mission.predictionBankId;
  const play = { ...state.play, packageRef: ref, mission };
  delete play.runWorld;
  delete play.predictionsBank;
  return { ...state, play };
}

export function packageBindingError(result) {
  return Object.assign(new Error(result.code), { code: result.code, status: result.status, packageBinding: true });
}

export function ownerRunLoader(db) {
  return async (userId, runId) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId || "")) return null;
    return (await db.query(`SELECT id, clerk_user_id, quest_id, package_id, package_revision, package_quest_id
      FROM runs WHERE clerk_user_id = $1 AND id = $2::uuid`, [userId, runId])).rows[0] || null;
  };
}
