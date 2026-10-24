/**
 * Rebuild model context from a resolved package release.
 * Player text stays. Client banks, grants, grounding, and pressure rules do not.
 */

import { selectPackageBank } from "../quest-package.js";
import { worldClockContext } from "./fast-eval.mjs";
import { buildSourceInquiry } from "../companion-context.js";
import { parsePackageRef } from "./package-paths.mjs";
import { sourceConstraintText } from "../companion.js";

const PLAYER_KEYS = [
  "invention", "inventionText", "inventionName", "inventionHow", "inventionImpact",
  "answers", "selectedTechIds", "availableTechs", "year", "turn", "mode",
  "challengeAngle", "angle", "concern", "sourceConcern", "concerns",
  "pathway", "concernPathway", "placed", "neighbors", "priorTiming",
  "playerAnswer", "challengeSpeech", "challengeQuestion", "field", "beforeText", "afterText",
  "hexInvent", "hexBoard", "pathways", "pressure", "pressureBase", "metricsPending",
  "budget", "will", "ap", "apMax", "focusTechId", "refresh", "avoidTitles",
  "tutorMode", "tutorProgress", "lessonProgress", "toolkit", "storyFace",
];

/**
 * @param {object|null|undefined} clientContext
 * @param {{
 *   ok?: boolean,
 *   record?: object,
 *   bank?: object|null,
 *   packageRef?: object,
 *   trust?: string,
 * }} resolved
 */
export function authoritativeQuestContext(clientContext, resolved) {
  if (!resolved?.ok || !resolved.record) {
    return { ok: false, code: "package_revision_unavailable", context: null };
  }
  const client = clientContext && typeof clientContext === "object" ? clientContext : {};
  const mission = resolved.record.mission || resolved.record.tile?.mission || {};
  const tile = resolved.record.tile || resolved.record;
  const companion = mission.companion || tile.companion || null;
  const bank = resolved.bank || null;
  const bankId = resolved.record.predictionBankId || mission.predictionBankId || bank?.id || "";
  if (bankId && (!bank || bank.id !== bankId)) {
    return { ok: false, code: "package_dependency_missing", context: null };
  }
  /** @type {Record<string, unknown>} */
  const context = {};
  for (const key of PLAYER_KEYS) {
    if (client[key] !== undefined) context[key] = client[key];
  }
  // Missing year means the authored start, in every mode (including chat).
  // Supplied values must be JSON numbers, not coercible strings/null/fractions.
  const start = mission.startYear;
  const collapse = mission.collapseYear;
  const year = context.year === undefined ? start : context.year;
  if (!Number.isInteger(year) || !Number.isFinite(year) ||
      !Number.isInteger(start) || !Number.isInteger(collapse) ||
      year < start || year > collapse) {
    return { ok: false, code: "package_reference_forbidden", context: null };
  }
  context.year = year;
  context.packageRef = resolved.packageRef ? structuredClone(resolved.packageRef) : null;
  context.trust = resolved.trust || "local-import";
  context.questId = mission.id || resolved.record.id;
  context.globalId = mission.globalId || tile.globalId;
  context.place = mission.place || "";
  context.missionTitle = mission.title || tile.title || "";
  context.missionScene = mission.scene || "";
  context.briefMd = mission.briefMd || "";
  context.isLearningModule = mission.isLearningModule === true || tile.isLearningModule === true;
  context.aiTutorContext = mission.aiTutorContext || tile.aiTutorContext || "";
  context.challenge = {
    id: context.questId, title: context.missionTitle,
    problem: context.missionScene, recommended: structuredClone(mission.suggested || []),
  };
  context.crisisRoles = (mission.crisisRoles || []).map((role, index) => {
    const name = Object.keys(mission.pressure || {})[index] || "";
    return { role, name, meterKey: name, description: mission.pressureDesc?.[name] || "" };
  });
  context.winMax = structuredClone(mission.winMax || {});
  context.rules = structuredClone(mission.rules || []);
  context.grounding = mission.grounding || tile.grounding || "";
  context.sourceConstraint = companion ? sourceConstraintText(companion) : "";
  context.predictionsBank = bank ? selectPackageBank({ [bank.id]: bank }, bank.id) : null;
  context.predictionsBankId = bankId;
  context.mission = {
    id: mission.id || resolved.record.id,
    globalId: mission.globalId,
    title: mission.title,
    grounding: context.grounding,
    pressure: structuredClone(mission.pressure || {}),
    pressureDesc: structuredClone(mission.pressureDesc || {}),
    rules: structuredClone(mission.rules || []),
    companion: companion ? structuredClone(companion) : null,
    predictionBankId: bankId,
  };
  context.sourceInquiry = buildSourceInquiry(companion, {
    bank: context.predictionsBank,
    year: context.year,
    mode: context.mode || "chat",
    angle: context.challengeAngle || context.angle,
    concern: context.concern || context.sourceConcern,
    concerns: context.concerns,
  });
  context.worldClock = worldClockContext(context, {
    predictionsBank: context.predictionsBank,
    predictionsBankId: bankId,
  });
  return { ok: true, context };
}

/**
 * Replace client world fields before a model call. A package ref with no
 * synchronous resolver does not proceed.
 * @param {object|null|undefined} body
 * @param {(ref: object) => object} [resolvePackage]
 */
export function applyAuthoritativeContext(body, resolvePackage) {
  const client = body?.context && typeof body.context === "object" ? body.context : {};
  const rawRef = client.packageRef ?? body?.packageRef;
  if (rawRef == null) return { ok: true, body };
  const ref = parsePackageRef(rawRef);
  if (!ref) return { ok: false, code: "package_reference_forbidden", status: 403 };
  if (typeof resolvePackage !== "function") {
    return { ok: false, code: "package_revision_unavailable", status: 409 };
  }
  const resolved = resolvePackage(ref);
  if (!resolved || typeof resolved.then === "function" || !resolved.ok) {
    return {
      ok: false,
      code: resolved?.code || "package_revision_unavailable",
      status: 409,
    };
  }
  const boundRef = parsePackageRef(resolved.packageRef);
  if (!boundRef || boundRef.packageId !== ref.packageId || boundRef.revision !== ref.revision ||
      boundRef.questId !== ref.questId || resolved.record?.id !== ref.questId) {
    return { ok: false, code: "package_reference_forbidden", status: 403 };
  }
  const auth = authoritativeQuestContext({ ...client, mode: body?.mode || client.mode }, resolved);
  if (!auth.ok) return { ok: false, code: auth.code, status: 409 };
  return { ok: true, body: { ...body, context: auth.context } };
}
