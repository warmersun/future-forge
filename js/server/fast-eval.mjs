/**
 * Fast judge/eval co-invent modes — tiny prompts, lean payloads, exact JSON.
 * Conversational invent (chat, drafts, SIT, etc.) stays on the full envelope.
 */

import { ideasOrFallback } from "../idea-cards.js";

const GROUNDING_CAP = 3000;

export const GROUNDING_LINE =
  "If grounding is present, treat it as authoritative Quest capability truth. Do not invent contradicting facts.";

/** Timing only: examples are existence proofs, not a closed inventory. */
export const ASSESS_GROUNDING_LINE =
  "If grounding is present, it is authoritative only on contradiction: an explicit limit, denial, or \"not yet\" that the claim violates. Capabilities, unlocks, and applications are examples — not a closed inventory. Omission is not a contradiction. \"Different category\" is not \"does not exist this year.\" Do not score quest fit, clinic job, preferred grain, or \"not a small hopper\" as timing.";

function clip(s, n) {
  const t = String(s || "").trim();
  return t ? t.slice(0, n) : "";
}

function slimTech(t) {
  if (!t || typeof t !== "object") return null;
  return {
    id: t.id,
    name: t.name || t.id,
    domain: t.domain || null,
    summary: String(t.summary || "").slice(0, 280),
    readyYear: t.readyYear || t.softHorizon || null,
  };
}

function slimStack(context) {
  const ids = new Set(
    (context?.selectedTechIds || []).map(String).filter(Boolean)
  );
  const fromAvailable = (context?.availableTechs || [])
    .map(slimTech)
    .filter(Boolean);
  if (!ids.size) return fromAvailable.slice(0, 8);
  const hit = fromAvailable.filter((t) => ids.has(String(t.id)));
  return hit.length ? hit : fromAvailable.slice(0, 8);
}

function groundingOf(context) {
  const g =
    (typeof context?.grounding === "string" && context.grounding.trim()) ||
    (typeof context?.mission?.grounding === "string" &&
      context.mission.grounding.trim()) ||
    "";
  return g ? g.slice(0, GROUNDING_CAP) : null;
}

function missionSlice(context) {
  const ch = context?.challenge;
  const title =
    context?.missionTitle ||
    ch?.title ||
    context?.mission?.title ||
    null;
  const scene = clip(
    context?.missionScene ||
      context?.scene ||
      ch?.problem ||
      ch?.scene ||
      context?.mission?.scene ||
      "",
    600
  );
  return {
    title: title || null,
    scene: scene || null,
  };
}

export const SCORE_PATHWAY_SYSTEM = `You score ONE invention pathway in Future Forge.
Judge the combination (techId + howText + timing — no names) for this place and year.
crisisDelta integers -2..+1: negative eases that crisis meter if this pathway docks it (directly or via invention chain).
local = here-and-now relief; global = root cause; support = public buy-in and scale beyond a pilot.
concerns: for each listed angle, judge ALL inventions in that given's reachable pathway PLUS playerAnswer if present, against challengeSpeech/challengeQuestion. Docked concerns may be red, yellow, or green. Green only if the pathway honestly holds the answer — a written answer cannot green an empty dock. Do not prefer yellow over an honest green.
${GROUNDING_LINE}
Return JSON only (no markdown, no other keys):
{"crisisDelta":{"local":0,"global":0,"support":0},"concerns":{"moloch":{"level":"yellow","reason":"one sentence"}}}`;

export const ASSESS_FEASIBILITY_SYSTEM = `You judge claim TIMING only in Future Forge: is this mechanism possible or already demonstrated in year?
Do not judge quest fit, clinic job, hopper vs heavy-lift category, or whether the idea matches grounding's example applications.
green = architecture+payload exists or is demonstrated by year (no pilot tax). If knowledge or search shows it, green even if grounding's examples are smaller.
yellow = vague, OR after checking year the claimed scale is not yet demonstrated.
red = only (1) grounding EXPLICITLY forbids / says not yet, or (2) sci-fi treated as routine (consumer flying cars, mind upload). Never red or yellow merely for "different category" or "not a small hopper".
If priorTiming is set with the same claims, a later year must not score harsher.
${ASSESS_GROUNDING_LINE}
Return JSON only:
{"timing":{"level":"green","reason":"one sentence"}}`;

export const IDEA_SPARKS_SYSTEM = `You return exactly 3 application SPARKS for focusTechId in this place and year.
Different angles. Pilot-honest. howText/insertText is a 1–2 sentence starter for a hex tile.
If refresh is true, do not repeat avoidTitles.
${GROUNDING_LINE}
Return JSON only:
{"ideas":[{"id":"slug","title":"≤60 chars","blurb":"≤140","insertText":"≤280","howText":"≤280","imagePrompt":"≤400","year":2026}]}`;

export const POSE_CHALLENGE_SYSTEM = `You are a hostile critic in Future Forge (local inventing practice).
Speak ONLY as the fixed challengeAngle: moloch (system traps/freeriding), ethicist (hard tradeoffs), stakeholder (funding/permits/public), or nature (physical/ecological limits).
Attack THIS invention in THIS place with 2–4 vivid sentences. End with ONE sharp question.
Stay local and specific. No UN resolutions. No tabletop jargon.
${GROUNDING_LINE}
Return JSON only:
{"angle":"<same as challengeAngle>","angleLabel":"<name>","challengeSpeech":"<2-4 sentences>","challengeQuestion":"<one question>"}`;

export const JUDGE_SCRUTINY_SYSTEM = `You score the learner's argument against a fixed challenger in Future Forge.
quality: hit | glance | miss. hit = concrete actors/costs/limits/mechanics that answer the question; glance = partial; miss = vague or off-topic.
damage: hit=2, glance=1, miss=0. Be fair but strict on freeriding and handwaving.
${GROUNDING_LINE}
Return JSON only:
{"quality":"glance","damage":1,"message":"1-2 sentences of feedback"}`;

export const JUDGE_CHALLENGE_SYSTEM = `You judge the learner's answer to a challenge in Future Forge.
verdict: pass | partial | fail. Concrete mechanisms, named actors, costs, or physical limits = pass/partial. Vague hope = fail.
If concernPathway is present, read the reachable invention howText as the docked invent and judge the written answer together with that pathway. anyTouch false means nothing is docked — still score hit/glance/miss, but that score does not ease the tile light.
${GROUNDING_LINE}
Return JSON only:
{"verdict":"partial","message":"feedback","lesson":"one teaching sentence"}`;

export const JUDGE_CONTRIBUTION_SYSTEM = `You decide if afterText is ADDITIVE vs DESTRUCTIVE relative to beforeText on field.
Additive keeps original substance and layers detail. Destructive rewrites, clears, or strips core meaning.
${GROUNDING_LINE}
Return JSON only:
{"additive":true,"reason":"one sentence"}`;

export const COACH_CHALLENGE_SYSTEM = `You coach a learner stuck on a challenge in Future Forge.
Explain what this angle cares about. Give 2–4 concrete hint bullets for THIS invention. Do not write a full ready-to-submit answer unless they asked to draft.
${GROUNDING_LINE}
Return JSON only:
{"message":"coaching text"}`;

export const DRAFT_CHALLENGE_SYSTEM = `You write a solid draft answer the learner can edit and submit.
Be specific to their invention: actors, costs or physical limits, anti-defection or affordability as relevant.
Put the full draft in draftAnswer and a short coaching note in message.
${GROUNDING_LINE}
Return JSON only:
{"message":"short coaching note","draftAnswer":"full draft"}`;

function buildScorePathwayPayload(context) {
  const invs = Array.isArray(context?.pathway?.inventions)
    ? context.pathway.inventions
    : [];
  const mission = missionSlice(context);
  return {
    mode: "score-pathway",
    place: context?.place || null,
    year: context?.year || null,
    mission,
    grounding: groundingOf(context),
    pressureBase: context?.pressureBase || {},
    winMax: context?.winMax || {},
    crisisRoles: (context?.crisisRoles || []).map((r) => ({
      role: r?.role || null,
      name: r?.name || null,
      meterKey: r?.meterKey || r?.name || null,
    })),
    concerns: (context?.concerns || []).map((c) => ({
      angle: c?.angle || null,
      challengeSpeech: clip(c?.challengeSpeech || c?.analysis, 800),
      challengeQuestion: clip(c?.challengeQuestion, 400),
      playerAnswer: clip(c?.playerAnswer, 2000),
      answerQuality: ["hit", "glance", "miss"].includes(String(c?.answerQuality || ""))
        ? c.answerQuality
        : null,
    })),
    pathway: {
      inventions: invs.map((n) => ({
        techId: n?.techId || null,
        howText: clip(n?.howText, 800),
        timingLevel: n?.timingLevel || null,
        feasibilityPct:
          n?.feasibilityPct != null ? Number(n.feasibilityPct) : null,
        year: n?.year || null,
      })),
    },
  };
}

function buildAssessFeasibilityPayload(context) {
  return {
    mode: "assess-feasibility",
    year: context?.year || null,
    place: context?.place || null,
    grounding: groundingOf(context),
    inventionHow: clip(context?.inventionHow, 1200),
    inventionImpact: clip(context?.inventionImpact, 800),
    stack: slimStack(context),
    priorTiming: context?.priorTiming || null,
  };
}

function buildIdeaSparksPayload(context) {
  const mission = missionSlice(context);
  const focusId = context?.focusTechId || null;
  const techs = (context?.availableTechs || []).map(slimTech).filter(Boolean);
  const focus =
    techs.find((t) => t.id === focusId) || techs[0] || null;
  return {
    mode: "idea-sparks",
    focusTechId: focusId,
    focusTech: focus,
    place: context?.place || null,
    year: context?.year || null,
    mission,
    grounding: groundingOf(context),
    refresh: Boolean(context?.refresh),
    avoidTitles: Array.isArray(context?.avoidTitles)
      ? context.avoidTitles.map(String).slice(0, 12)
      : [],
  };
}

function buildPosePayload(context) {
  const mission = missionSlice(context);
  return {
    mode: "pose-challenge",
    challengeAngle: context?.challengeAngle || null,
    place: context?.place || null,
    year: context?.year || null,
    inventionName: clip(context?.inventionName, 80),
    inventionHow: clip(context?.inventionHow, 1200),
    inventionImpact: clip(context?.inventionImpact, 800),
    stack: slimStack(context),
    grounding: groundingOf(context),
    mission,
  };
}

function buildJudgePayload(mode, context) {
  const mission = missionSlice(context);
  return {
    mode,
    challengeAngle: context?.challengeAngle || null,
    challengeSpeech: clip(context?.challengeSpeech, 800),
    challengeQuestion: clip(context?.challengeQuestion, 400),
    playerAnswer: clip(context?.playerAnswer, 2000),
    concernPathway: context?.concernPathway
      ? {
          anyTouch: Boolean(context.concernPathway.anyTouch),
          techIds: (context.concernPathway.techIds || []).slice(0, 12),
          howText: clip(context.concernPathway.howText, 1600),
          inventions: (context.concernPathway.inventions || [])
            .slice(0, 12)
            .map((n) => ({
              techId: n?.techId || null,
              howText: clip(n?.howText, 400),
              timingLevel: n?.timingLevel || null,
            })),
        }
      : undefined,
    place: context?.place || null,
    year: context?.year || null,
    inventionName: clip(context?.inventionName, 80),
    inventionHow: clip(context?.inventionHow, 1200),
    inventionImpact: clip(context?.inventionImpact, 800),
    stack: slimStack(context),
    grounding: groundingOf(context),
    mission,
    field: context?.field || null,
    beforeText: clip(context?.beforeText, 2000),
    afterText: clip(context?.afterText, 2000),
  };
}

export function buildFastPayload(mode, context = {}) {
  if (mode === "score-pathway") return buildScorePathwayPayload(context);
  if (mode === "assess-feasibility") return buildAssessFeasibilityPayload(context);
  if (mode === "idea-sparks") return buildIdeaSparksPayload(context);
  if (mode === "pose-challenge") return buildPosePayload(context);
  return buildJudgePayload(mode, context);
}

function clampDelta(v) {
  return Math.max(-2, Math.min(1, Math.round(Number(v) || 0)));
}

function sanitizeScorePathway(parsed, source) {
  const cd = parsed?.crisisDelta || {};
  const concerns = {};
  const rawC =
    parsed?.concerns && typeof parsed.concerns === "object" ? parsed.concerns : {};
  for (const [angle, row] of Object.entries(rawC)) {
    const level = String(row?.level || "").toLowerCase();
    if (level !== "red" && level !== "yellow" && level !== "green") continue;
    concerns[angle] = {
      level,
      reason: String(row?.reason || "").slice(0, 280),
    };
  }
  return {
    source,
    crisisDelta: {
      local: clampDelta(cd.local),
      global: clampDelta(cd.global),
      support: clampDelta(cd.support),
    },
    concerns,
  };
}

function sanitizeTiming(parsed, source) {
  const raw = parsed?.timing || parsed;
  const lvl = String(raw?.level || "").toLowerCase();
  const level = ["red", "yellow", "green"].includes(lvl) ? lvl : null;
  return {
    source,
    timing: level
      ? { level, reason: String(raw?.reason || "").slice(0, 280) }
      : null,
  };
}

function sanitizeIdeas(parsed, source, context) {
  const techs = context?.availableTechs || [];
  const focusId = String(context?.focusTechId || (context?.selectedTechIds || [])[0] || "");
  const focus = techs.find((t) => t && t.id === focusId) || techs[0] || null;
  return {
    source,
    ideas: ideasOrFallback(parsed?.ideas, focus, context),
  };
}

function sanitizePose(parsed, source) {
  return {
    source,
    angle: parsed?.angle ? String(parsed.angle) : "",
    angleLabel: parsed?.angleLabel ? String(parsed.angleLabel).slice(0, 80) : "",
    challengeSpeech: parsed?.challengeSpeech
      ? String(parsed.challengeSpeech).slice(0, 3000)
      : "",
    challengeQuestion: parsed?.challengeQuestion
      ? String(parsed.challengeQuestion).slice(0, 500)
      : "",
  };
}

function sanitizeJudgeScrutiny(parsed, source) {
  const q = String(parsed?.quality || "").toLowerCase();
  const quality = ["hit", "glance", "miss"].includes(q) ? q : "miss";
  let damage = parsed?.damage != null ? Math.floor(Number(parsed.damage)) : NaN;
  if (!Number.isFinite(damage)) {
    damage = quality === "hit" ? 2 : quality === "glance" ? 1 : 0;
  }
  return {
    source,
    quality,
    damage: Math.max(0, Math.min(2, damage)),
    message: String(parsed?.message || "").slice(0, 800),
  };
}

function sanitizeJudgeChallenge(parsed, source) {
  const v = String(parsed?.verdict || "").toLowerCase();
  return {
    source,
    verdict: ["pass", "partial", "fail"].includes(v) ? v : "partial",
    message: String(parsed?.message || "").slice(0, 800),
    lesson: parsed?.lesson ? String(parsed.lesson).slice(0, 500) : "",
  };
}

function sanitizeJudgeContribution(parsed, source) {
  return {
    source,
    additive: parsed?.additive === true || parsed?.additive === "true",
    reason: String(parsed?.reason || parsed?.message || "").slice(0, 280),
  };
}

function sanitizeCoach(parsed, source) {
  return {
    source,
    message: String(parsed?.message || "").slice(0, 4000),
  };
}

function sanitizeDraft(parsed, source) {
  return {
    source,
    message: String(parsed?.message || "").slice(0, 2000),
    draftAnswer: parsed?.draftAnswer ? String(parsed.draftAnswer).slice(0, 2500) : "",
  };
}

export function sanitizeFast(mode, parsed, source = "ai", context = {}) {
  if (mode === "score-pathway") return sanitizeScorePathway(parsed, source);
  if (mode === "assess-feasibility") return sanitizeTiming(parsed, source);
  if (mode === "idea-sparks") return sanitizeIdeas(parsed, source, context);
  if (mode === "pose-challenge") return sanitizePose(parsed, source);
  if (mode === "judge-scrutiny-move") return sanitizeJudgeScrutiny(parsed, source);
  if (mode === "judge-challenge") return sanitizeJudgeChallenge(parsed, source);
  if (mode === "judge-contribution") return sanitizeJudgeContribution(parsed, source);
  if (mode === "coach-challenge") return sanitizeCoach(parsed, source);
  if (mode === "draft-challenge") return sanitizeDraft(parsed, source);
  return { source };
}

export const FAST_EVAL_MODES = {
  "score-pathway": {
    system: SCORE_PATHWAY_SYSTEM,
    userPrefix: "Score this pathway (JSON state):",
    temperature: 0,
    maxOutputTokens: 350,
  },
  "assess-feasibility": {
    system: ASSESS_FEASIBILITY_SYSTEM,
    userPrefix: "Judge claim timing (JSON state):",
    temperature: 0,
    maxOutputTokens: 200,
  },
  "idea-sparks": {
    system: IDEA_SPARKS_SYSTEM,
    userPrefix: "Three application sparks (JSON state):",
    temperature: 0.4,
    maxOutputTokens: 700,
  },
  "pose-challenge": {
    system: POSE_CHALLENGE_SYSTEM,
    userPrefix: "Pose this challenge (JSON state):",
    temperature: 0.65,
    maxOutputTokens: 450,
  },
  "judge-scrutiny-move": {
    system: JUDGE_SCRUTINY_SYSTEM,
    userPrefix: "Score this argument (JSON state):",
    temperature: 0,
    maxOutputTokens: 350,
  },
  "judge-challenge": {
    system: JUDGE_CHALLENGE_SYSTEM,
    userPrefix: "Judge this challenge answer (JSON state):",
    temperature: 0,
    maxOutputTokens: 350,
  },
  "judge-contribution": {
    system: JUDGE_CONTRIBUTION_SYSTEM,
    userPrefix: "Judge this contribution (JSON state):",
    temperature: 0,
    maxOutputTokens: 200,
  },
  "coach-challenge": {
    system: COACH_CHALLENGE_SYSTEM,
    userPrefix: "Coach this challenge (JSON state):",
    temperature: 0.4,
    maxOutputTokens: 600,
  },
  "draft-challenge": {
    system: DRAFT_CHALLENGE_SYSTEM,
    userPrefix: "Draft a challenge answer (JSON state):",
    temperature: 0.4,
    maxOutputTokens: 800,
  },
};

export function isFastEvalMode(mode) {
  return Boolean(FAST_EVAL_MODES[mode]);
}

export function fastEvalUserContent(mode, context) {
  const spec = FAST_EVAL_MODES[mode];
  const prefix = spec?.userPrefix || "JSON state:";
  return `${prefix}\n${JSON.stringify(buildFastPayload(mode, context))}\n\nJSON only.`;
}
