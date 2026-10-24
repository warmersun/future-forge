/** Async request authority. Identity/entitlement are server inputs, never body fields. */
import { parsePackageRef } from "./package-paths.mjs";
import { applyAuthoritativeContext } from "./quest-world-context.mjs";
import { questIdFromContext, questReadDecision } from "./cloud-gate.mjs";
import { createRunWorld } from "../sim/run-world.js";

const deny = (code, status = 403) => ({ ok: false, code, error: code, status });
const same = (a, b) => a && b && a.packageId === b.packageId && a.revision === b.revision && a.questId === b.questId;
export function packageRefFromRun(row) {
  return parsePackageRef(row?.packageRef || (row?.package_id ? {
    packageId: row.package_id, revision: row.package_revision, questId: row.package_quest_id,
  } : null));
}

/** Standalone synchronous authority; hosted routes use the async adapter below. */
export function createRoomQuestRequestAuthority({ hostedAuthorityRequired = () => false,
  packageRefForQuest = () => null, resolvePackage } = {}) {
  return (selected) => {
    if (hostedAuthorityRequired()) return deny("package_revision_unavailable", 409);
    const raw = selected?.packageRef ?? selected?.runWorld?.packageRef ?? packageRefForQuest(selected?.id);
    if (raw == null) return null;
    const ref = parsePackageRef(raw);
    if (!ref || ref.questId !== selected?.id) return deny("package_reference_forbidden");
    const resolved = resolvePackage?.(ref);
    if (!resolved || typeof resolved.then === "function" || !resolved.ok)
      return deny(resolved?.code || "package_revision_unavailable", 409);
    if (!same(ref, resolved.packageRef) || resolved.record?.id !== ref.questId)
      return deny("package_reference_forbidden");
    const mission = structuredClone(resolved.record.mission);
    if (!mission || mission.id !== ref.questId) return deny("package_reference_forbidden");
    mission.packageRef = structuredClone(ref);
    mission.runWorld = createRunWorld({ packageRef: ref, bank: resolved.bank, trust: resolved.trust || "local-import", questId: ref.questId });
    return { ok: true, mission, globalId: mission.globalId || resolved.record.globalId };
  };
}

/** Resolve every selection through current catalog membership, then every seat's
 * server-held access. No room bearer, payload entitlement, or carried bank is trusted.
 * Portal rooms lacking per-seat credentials deny packages only, not ordinary play.
 */
export function createAsyncRoomQuestRequestAuthority({ loadCatalog, resolvePackage,
  resolveLocal, portal = false, participantAccess = (player) => ({
    identity: { enabled: true, signedIn: Boolean(player.clerkUserId), userId: player.clerkUserId || null },
    entitled: false,
  }) } = {}) {
  return async (selected, { players = [] } = {}) => {
    try {
      const catalog = await loadCatalog({ force: true });
      if (!catalog?.ok || catalog.errors?.length) return deny("package_catalog_unavailable", 503);
      const matches = (catalog.quests || []).filter(q => q.id === selected?.id);
      if (matches.length > 1) return deny("package_quest_collision", 409);
      const current = matches[0];
      const raw = selected?.packageRef ?? selected?.runWorld?.packageRef ?? current?.packageRef;
      if (raw == null) {
        if (current) for (const player of players) {
          const access = await participantAccess(player);
          const decision = questReadDecision(current, access.identity, { entitled: access.entitled === true });
          if (!decision.allow) return deny(decision.error, decision.status);
        }
        const local = resolveLocal?.(selected);
        if (local) return local;
        // Catalog mission is authoritative when present. Generated quests remain usable.
        const mission = structuredClone(current?.mission || selected);
        if (mission?.predictionBankId) return deny("package_revision_unavailable", 409);
        for (const key of ["runWorld", "pinnedPredictionsBank", "predictionsBank"]) delete mission[key];
        return { ok: true, mission, globalId: current?.globalId || mission.globalId };
      }
      const ref = parsePackageRef(raw);
      if (!ref || ref.questId !== selected?.id) return deny("package_reference_forbidden");
      if (portal) return deny("room_package_credentials_unavailable", 409);
      if (!players.length) return deny("package_reference_forbidden");
      let resolved;
      for (const player of players) {
        resolved = await resolvePackage(ref, await participantAccess(player));
        if (!resolved?.ok) return deny(resolved?.code || "package_revision_unavailable", resolved?.status || 409);
        if (!same(ref, resolved.packageRef) || resolved.record?.id !== ref.questId)
          return deny("package_reference_forbidden");
      }
      const mission = structuredClone(resolved.record.mission);
      if (mission?.id !== ref.questId) return deny("package_reference_forbidden");
      mission.packageRef = structuredClone(ref);
      mission.runWorld = createRunWorld({ packageRef: ref, bank: resolved.bank, trust: resolved.trust || "official", questId: ref.questId });
      return { ok: true, mission, globalId: mission.globalId || resolved.record.globalId };
    } catch { return deny("package_authority_unavailable", 503); }
  };
}

export function createQuestRequestAuthority({ loadCatalog, resolvePackage, loadRun } = {}) {
  return async function authorize(body, { identity = { enabled: true, signedIn: false }, entitled = false } = {}) {
    try {
      const context = body?.context && typeof body.context === "object" ? body.context : {};
      const raw = context.packageRef ?? body?.packageRef;
      let ref = raw == null ? null : parsePackageRef(raw);
      if (raw != null && !ref) return deny("package_reference_forbidden");
      if (context.packageRef != null && body?.packageRef != null && !same(ref, parsePackageRef(body.packageRef)))
        return deny("package_reference_forbidden");
      let questId = questIdFromContext(context);
      for (const id of [context.questId, context.mission?.id, context.challenge?.id]) {
        if (id != null && id !== questId) return deny("package_reference_forbidden");
      }
      if (ref && questId && questId !== ref.questId) return deny("package_reference_forbidden");
      const runIds = [context.runId, context.cloudRunId, body?.runId].filter((value) => value != null);
      if (runIds.some((value) => value !== runIds[0])) return deny("package_reference_forbidden");
      const runId = runIds[0];
      if (runId != null) {
        if (typeof runId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
          return deny("package_reference_forbidden");
        if (!identity.signedIn || !identity.userId || typeof loadRun !== "function") return deny("sign_in_required", 401);
        const row = await loadRun(identity.userId, runId);
        if (!row || (questId && (row.quest_id || row.questId) !== questId)) return deny("package_reference_forbidden");
        if (row.clerk_user_id != null && row.clerk_user_id !== identity.userId) return deny("package_reference_forbidden");
        questId = row.quest_id || row.questId;
        if (!questId) return deny("package_reference_forbidden");
        const bound = packageRefFromRun(row);
        if (!bound && (row.packageRef != null || row.package_id != null || row.package_revision != null || row.package_quest_id != null))
          return deny("package_binding_missing", 409);
        if (bound && bound.questId !== questId) return deny("package_reference_forbidden");
        if (ref && !same(ref, bound)) return deny("package_reference_forbidden");
        ref = bound;
        // An old unbound run cannot impersonate a new official package. Resolve
        // current membership below; package inference for these rows fails closed.
        if (!bound && questId) {
          const catalog = await loadCatalog({ force: true });
          if (!catalog?.ok) return deny("package_catalog_unavailable", 503);
          if (catalog.quests?.some((entry) => entry.id === questId && entry.packageRef))
            return deny("package_binding_missing", 409);
        }
      }
      if (!ref && questId) {
        const catalog = await loadCatalog({ force: true });
        if (!catalog?.ok) return deny("package_catalog_unavailable", 503);
        const candidates = (catalog.quests || []).filter((entry) => entry.id === questId);
        if (candidates.length > 1) return deny("package_quest_collision", 409);
        const current = candidates[0];
        if (current?.packageRef) {
          ref = parsePackageRef(current.packageRef);
          if (!ref) return deny("package_integrity_failed", 409);
        }
      }
      if (!ref) return { ok: true, body };
      if (typeof resolvePackage !== "function") return deny("package_revision_unavailable", 409);
      const resolved = await resolvePackage(ref, { identity, entitled });
      if (!resolved?.ok) return deny(resolved?.code || "package_revision_unavailable", resolved?.status || 409);
      const guarded = applyAuthoritativeContext({ ...body, context: { ...context, packageRef: ref } }, () => resolved);
      if (guarded.ok && runId) guarded.body.context.runId = runId;
      return guarded;
    } catch { return deny("package_authority_unavailable", 503); }
  };
}

/** Game delegates private catalog, run ownership and current billing to the portal. */
export function createPortalQuestRequestAuthority({ origin, fetchImpl = fetch } = {}) {
  return async (body, { authorization = "" } = {}) => {
    if (!origin) return deny("package_authority_unavailable", 503);
    try {
      const response = await fetchImpl(`${origin.replace(/\/$/, "")}/api/quests/resolve-context`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok) return deny(result?.error || "package_authority_unavailable", response.status || 503);
      if (!result.context || typeof result.context !== "object") return deny("package_authority_unavailable", 503);
      return { ok: true, body: { ...body, context: result.context } };
    } catch { return deny("package_authority_unavailable", 503); }
  };
}
