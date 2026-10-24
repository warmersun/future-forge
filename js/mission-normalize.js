/** Browser-safe normalization shared by catalog selection, starts, and Continue. */
import { GAME, allTechIds, globalById, packRulesForMission } from "./data.js";
import { CAPS, normalizeMissionPressure, parseResourceOverrides } from "./quest-tile.js";
import { briefMdFromLivedStory, normalizeBriefBeats } from "./brief-beats.js";
import { parseCompanion } from "./companion.js";
import { parseQuestRules } from "./sim/policy-rules.js";
import { SCENE_CHAR_CAP } from "./scene-prose.js";
import { sanitizeSuggestedWhy } from "./tech-why.js";
import { prepareRunWorld, createRunWorld } from "./sim/run-world.js";
import { validatePredictionsBank } from "./sim/world-foresight.js";

// Keep reference tokens literally, including malformed ones: start validation
// must reject them rather than silently converting a package into legacy play.
function missionWorldFields(raw) {
  const fields = {};
  if (raw.predictionBankId != null) fields.predictionBankId = structuredClone(raw.predictionBankId);
  if (raw.packageRef != null) fields.packageRef = structuredClone(raw.packageRef);
  if (raw.runWorld) {
    if (raw.predictionBankId != null || raw.packageRef != null || raw.runWorld.packageRef) {
      // A world-only binding must not turn into unbound legacy play.
      if (!fields.packageRef && raw.runWorld.packageRef) fields.packageRef = structuredClone(raw.runWorld.packageRef);
      const resolved = prepareRunWorld({ ...raw, ...fields }, { year: raw.startYear });
      if (resolved.ok) fields.runWorld = resolved.world;
    } else {
      const checked = raw.runWorld.bank ? validatePredictionsBank(raw.runWorld.bank) : null;
      if (!raw.runWorld.bank || checked?.ok) {
        fields.runWorld = createRunWorld({ ...raw.runWorld, bank: checked?.bank || null, trust: "legacy" });
      }
    }
  }
  return fields;
}

export function normalizeMission(raw, globalId) {
  const id =
    String(raw.id || "").trim() ||
    `gen-${globalId}-${Math.random().toString(36).slice(2, 8)}`;

  // Structured { local|global|support: { label, pressure, … } } or legacy flat maps
  const meters = normalizeMissionPressure(raw.pressure, raw.pressureRise, raw.winMax);
  let pressure;
  let pressureRise;
  let winMax;
  let crisisRoles = null;
  /** @type {Record<string, string>} */
  let pressureDesc = {};
  if (meters.ok) {
    pressure = meters.pressure;
    pressureRise = meters.pressureRise;
    winMax = meters.winMax;
    crisisRoles = meters.crisisRoles;
    pressureDesc = { ...(meters.pressureDesc || {}) };
  } else {
    // Fallback (should not happen for valid data)
    pressure = { Pressure: 2, Capacity: 2, Trust: 1 };
    pressureRise = { Pressure: 1, Capacity: 1, Trust: 0 };
    winMax = { Pressure: 1, Capacity: 1, Trust: 1 };
  }
  // Prefer explicit crisisRoles already on a pre-normalized mission
  if (Array.isArray(raw.crisisRoles) && raw.crisisRoles.length) {
    crisisRoles = raw.crisisRoles.map(String);
  }
  // Label-keyed descriptions survive flatten / cache round-trip
  if (raw.pressureDesc && typeof raw.pressureDesc === "object") {
    for (const k of Object.keys(pressure)) {
      if (pressureDesc[k]) continue;
      const d = raw.pressureDesc[k];
      if (typeof d === "string" && d.trim()) {
        pressureDesc[k] = d.trim().slice(0, 400);
      }
    }
  }
  for (const k of Object.keys(pressure)) {
    if (pressureDesc[k] == null) pressureDesc[k] = "";
  }

  const validTech = new Set(allTechIds());
  let suggested = (Array.isArray(raw.suggested) ? raw.suggested : [])
    .map(String)
    .filter((t) => validTech.has(t))
    .slice(0, 8);

  let spotlight = null;
  if (raw.spotlight && typeof raw.spotlight === "object" && raw.spotlight.techId) {
    const techId = String(raw.spotlight.techId);
    if (validTech.has(techId)) {
      spotlight = {
        techId,
        advanceTitle: String(raw.spotlight.advanceTitle || "").slice(0, 200),
        advanceSummary: String(raw.spotlight.advanceSummary || "").slice(0, 600),
        asOf: String(raw.spotlight.asOf || "").slice(0, 32),
        encourageCopy: String(raw.spotlight.encourageCopy || "").slice(0, 280),
      };
      // Spotlight Quests: the spotlight leads the "For this place" shelf;
      // authored supporting emTechs follow in order (convergence partners).
      suggested = [techId, ...suggested.filter((id) => id !== techId)].slice(0, 8);
    }
  }

  const authoredBrief = String(raw.briefMd || "").trim().slice(0, 12_000);
  const briefMd =
    authoredBrief ||
    briefMdFromLivedStory({
      scene: String(raw.scene || "").trim(),
      title: String(raw.title || "").trim(),
      stakeholder: String(raw.stakeholder || "").trim(),
      pressure: raw.pressure,
      globalTitle: String(globalById(globalId)?.title || "").trim(),
      encourageCopy: String(
        raw.encourageCopy || raw.spotlight?.encourageCopy || ""
      ).trim(),
    }).slice(0, 12_000);
  const source =
    raw.source === "curated"
      ? "curated"
      : raw.source === "imported"
        ? "imported"
        : raw.source === "hosted"
          ? "hosted"
          : raw.source === "remote"
            ? "remote"
            : raw.source === "daily"
              ? "daily"
              : "generated";

  const resourcesParsed = parseResourceOverrides(raw.resources);
  const resources =
    resourcesParsed.ok && resourcesParsed.value ? resourcesParsed.value : null;
  const grounding =
    typeof raw.grounding === "string" && raw.grounding.trim()
      ? raw.grounding.trim().slice(0, 50_000)
      : null;
  const isLearningModule = raw.isLearningModule === true;
  const aiTutorContext =
    typeof raw.aiTutorContext === "string" && raw.aiTutorContext.trim()
      ? raw.aiTutorContext.trim().slice(0, 50_000)
      : null;
  const posInt = (v) =>
    typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : null;
  const moduleTitle =
    typeof raw.module === "string" && raw.module.trim()
      ? raw.module.trim().slice(0, CAPS.moduleTitle)
      : null;
  const lessonN = posInt(raw.lesson);
  const totalLessonsN = posInt(raw.totalLessons);
  const sponsorName =
    typeof raw.sponsorName === "string" && raw.sponsorName.trim()
      ? raw.sponsorName.trim().slice(0, 120)
      : null;
  const sponsorBanner =
    typeof raw.sponsorBanner === "string" && raw.sponsorBanner.trim()
      ? raw.sponsorBanner.trim().slice(0, 200)
      : null;

  const trends = Array.isArray(raw.trends)
    ? raw.trends.filter((t) => t && typeof t === "object" && t.id)
    : null;
  const spotlightTrends = Array.isArray(raw.spotlightTrends)
    ? raw.spotlightTrends.map(String).filter(Boolean).slice(0, 8)
    : null;
  let briefBeatsSafe = null;
  if (Array.isArray(raw.briefBeats) && raw.briefBeats.length) {
    const n = normalizeBriefBeats(raw.briefBeats);
    if (n.ok) briefBeatsSafe = n.beats;
  }
  const suggestedSafe = suggested.length ? suggested : ["ai", "iot", "networks"];
  const suggestedWhy = sanitizeSuggestedWhy(raw.suggestedWhy, new Set(suggestedSafe));

  return {
    ...missionWorldFields(raw),
    ...(["open", "account", "paid"].includes(raw.access) ? { access: raw.access } : {}),
    id,
    globalId,
    title: String(raw.title || "Local Challenge").slice(0, 100),
    place: String(raw.place || "Local place").slice(0, 80),
    startYear: Number(raw.startYear) || GAME.startYear,
    collapseYear: Number(raw.collapseYear) || GAME.startYear + 8,
    yearsPerTurn: Number(raw.yearsPerTurn) || GAME.yearsPerTurn,
    pressure,
    pressureRise,
    winMax,
    pressureDesc,
    scene: String(raw.scene || "").slice(
      0,
      source === "imported" || source === "hosted" || source === "remote"
        ? 500
        : SCENE_CHAR_CAP
    ),
    briefMd,
    stakeholder: String(raw.stakeholder || "").slice(0, 120),
    suggested: suggestedSafe,
    ...(suggestedWhy ? { suggestedWhy } : {}),
    visionTheme: String(raw.visionTheme || "rebuild-city").slice(0, 40),
    source,
    spotlight,
    ...(resources ? { resources } : {}),
    ...(crisisRoles?.length ? { crisisRoles } : {}),
    ...(grounding ? { grounding } : {}),
    ...(isLearningModule ? { isLearningModule: true } : {}),
    ...(aiTutorContext ? { aiTutorContext } : {}),
    ...(moduleTitle ? { module: moduleTitle } : {}),
    ...(lessonN != null ? { lesson: lessonN } : {}),
    ...(totalLessonsN != null ? { totalLessons: totalLessonsN } : {}),
    ...(sponsorName ? { sponsorName } : {}),
    ...(sponsorBanner ? { sponsorBanner } : {}),
    ...(() => {
      if (!raw.companion || typeof raw.companion !== "object") return {};
      const parsed = parseCompanion(raw.companion, {
        access: raw.access || "open",
      });
      return parsed.ok ? { companion: parsed.value } : {};
    })(),
    ...(trends?.length ? { trends } : {}),
    ...(spotlightTrends?.length ? { spotlightTrends } : {}),
    ...(String(raw.summary || "").trim()
      ? { summary: String(raw.summary).trim().slice(0, CAPS.summary) }
      : {}),
    ...(briefBeatsSafe ? { briefBeats: briefBeatsSafe } : {}),
    ...(() => {
      const rawRules =
        Array.isArray(raw.rules) && raw.rules.length
          ? raw.rules
          : packRulesForMission(raw);
      const parsed = parseQuestRules(rawRules);
      return parsed.ok && parsed.value?.length ? { rules: parsed.value } : {};
    })(),
  };
}

