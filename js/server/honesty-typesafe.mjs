/**
 * TypeSafe honesty flags + score-pathway Choices. Server-only (imports the SDK).
 */

import { choice, noul } from "@typesafe-ai/sdk";
import { jsonSafeQuestions } from "./typesafe-client.mjs";
import {
  HONESTY_NOUL_IDS,
  HONESTY_NOULS,
  decisionToFlag,
  noulDecision,
} from "../sim/honesty-questions.js";
import {
  CRISIS_DELTA_QUESTION_IDS,
  CRISIS_ROLES,
  cannedConcernReason,
  cannedDeltaReason,
  choiceIsUncertain,
  concernForcedRed,
  concernLampQuestion,
  concernQuestionId,
  crisisDeltaQuestion,
  deltaFromChoiceLabel,
} from "../sim/pathway-questions.js";

export function honestyTypeSafeQuestions() {
  /** @type {Record<string, ReturnType<typeof noul>>} */
  const questions = {};
  for (const id of HONESTY_NOUL_IDS) {
    const spec = HONESTY_NOULS[id];
    questions[id] = noul(spec.instructions, spec.criteria);
  }
  return questions;
}

/**
 * @param {Record<string, number>} nouls
 */
export function flagsFromNouls(nouls = {}) {
  /** @type {Record<string, boolean>} */
  const uncertain = {};
  const flags = {
    source: "typesafe",
    mechanism: /** @type {boolean|null} */ (null),
    purePolicy: /** @type {boolean|null} */ (null),
    shareBridge: /** @type {boolean|null} */ (null),
    evalOverride: /** @type {boolean|null} */ (null),
    nouls: /** @type {Record<string, number>} */ ({}),
    uncertain,
  };
  for (const id of HONESTY_NOUL_IDS) {
    const p = Number(nouls[id]);
    flags.nouls[id] = Number.isFinite(p) ? p : NaN;
    const decision = noulDecision(p);
    flags[id] = decisionToFlag(decision);
    if (decision === "uncertain") uncertain[id] = true;
  }
  return flags;
}

/**
 * @param {object} client — TypeSafeClient
 * @param {object} state
 * @param {object} [requestOptions]
 */
export async function detectHonestyFlagsTypeSafe(client, state, requestOptions) {
  if (!client) {
    throw new Error("detectHonestyFlagsTypeSafe requires a TypeSafe client");
  }
  const response = await client.systemOne(
    {
      state,
      questions: honestyTypeSafeQuestions(),
    },
    requestOptions
  );
  /** @type {Record<string, number>} */
  const nouls = {};
  for (const id of HONESTY_NOUL_IDS) {
    nouls[id] = response.answers[id].noul;
  }
  return {
    flags: flagsFromNouls(nouls),
    model: response.model,
    usage: response.usage || null,
  };
}

function clip(s, n) {
  const t = String(s || "").trim();
  return t ? t.slice(0, n) : "";
}

/**
 * Lean state for honesty + pathway Choices.
 * @param {object} opts
 */
export function pathwayTypeSafeState(opts = {}) {
  const base = honestyTypeSafeState(opts);
  const inventions = (opts.inventions || opts.techIds || [])
    .map((n) => {
      if (typeof n === "string") return { techId: n, howText: "", timingLevel: null };
      return {
        techId: n?.techId || n?.id || null,
        howText: clip(n?.howText, 800),
        timingLevel: n?.timingLevel || null,
      };
    })
    .filter((n) => n.techId)
    .slice(0, 12);
  if (inventions.length) base.pathway.inventions = inventions;

  const crisisRoles = Array.isArray(opts.crisisRoles)
    ? opts.crisisRoles.slice(0, 6).map((r) => ({
        role: r?.role || null,
        name: clip(r?.name, 80) || null,
        description: clip(r?.description, 400),
      }))
    : [];
  if (crisisRoles.length) base.crisisRoles = crisisRoles;

  const concerns = Array.isArray(opts.concerns)
    ? opts.concerns
        .filter((c) => c && c.angle)
        .slice(0, 8)
        .map((c) => ({
          angle: String(c.angle),
          challengeSpeech: clip(c.challengeSpeech || c.analysis, 800),
          challengeQuestion: clip(c.challengeQuestion, 400),
          playerAnswer: clip(c.playerAnswer, 2000),
          inventChanged: Boolean(c.inventChanged),
          posedHowText: clip(c.posedHowText, 1600),
          priorLevel: ["red", "yellow", "green"].includes(String(c.priorLevel || ""))
            ? c.priorLevel
            : "red",
        }))
    : [];
  if (concerns.length) base.concerns = concerns;

  const grounding = clip(opts.grounding, 1500);
  if (grounding) base.grounding = grounding;
  return base;
}

export function pathwayDeltaQuestions() {
  /** @type {Record<string, ReturnType<typeof choice>>} */
  const questions = {};
  for (const role of CRISIS_ROLES) {
    const spec = crisisDeltaQuestion(role);
    questions[CRISIS_DELTA_QUESTION_IDS[role]] = choice(
      spec.instructions,
      spec.criteria
    );
  }
  return questions;
}

/**
 * @param {object[]} concerns
 */
export function concernTypeSafeQuestions(concerns = []) {
  /** @type {Record<string, ReturnType<typeof choice>>} */
  const questions = {};
  for (const c of concerns) {
    if (concernForcedRed(c)) continue;
    const id = concernQuestionId(c?.angle);
    if (!id || questions[id]) continue;
    const spec = concernLampQuestion(c);
    questions[id] = choice(spec.instructions, spec.criteria);
  }
  return questions;
}

/**
 * Honesty Nouls + crisis Choices + concern Choices in one request.
 * @param {object} client
 * @param {object} state
 * @param {object} [requestOptions]
 */
export async function scorePathwayTypeSafe(client, state, requestOptions) {
  if (!client) {
    throw new Error("scorePathwayTypeSafe requires a TypeSafe client");
  }
  const questions = {
    ...honestyTypeSafeQuestions(),
    ...pathwayDeltaQuestions(),
    ...concernTypeSafeQuestions(state.concerns || []),
  };
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  return {
    ...parsePathwayTypeSafeAnswers(response, state),
    questions: jsonSafeQuestions(questions),
    state,
  };
}

/**
 * @param {object} response
 * @param {object} state
 */
export function parsePathwayTypeSafeAnswers(response, state = {}) {
  const answers = response?.answers || {};
  /** @type {Record<string, number>} */
  const nouls = {};
  for (const id of HONESTY_NOUL_IDS) {
    const row = answers[id];
    nouls[id] = row && typeof row.noul === "number" ? row.noul : NaN;
  }
  const flags = flagsFromNouls(nouls);

  /** @type {Record<string, number>} */
  const crisisDelta = {};
  /** @type {Record<string, string>} */
  const crisisReasons = {};
  /** @type {Record<string, { choice: string, confidence: number, probabilities?: object }>} */
  const choices = {};
  let scoreUncertain = false;

  for (const role of CRISIS_ROLES) {
    const qid = CRISIS_DELTA_QUESTION_IDS[role];
    const row = answers[qid];
    if (!row || row.choice == null) continue;
    const label = String(row.choice);
    let delta = deltaFromChoiceLabel(label);
    if (delta == null) continue;
    const confidence = Number(row.confidence);
    choices[qid] = {
      choice: label,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      probabilities: row.probabilities || {},
    };
    if (choiceIsUncertain(confidence) && delta < 0) {
      delta = 0;
      scoreUncertain = true;
    } else if (choiceIsUncertain(confidence)) {
      scoreUncertain = true;
    }
    crisisDelta[role] = delta;
    crisisReasons[role] = cannedDeltaReason(role, delta);
  }

  /** @type {Record<string, { level: string, reason: string }>} */
  const concerns = {};
  for (const c of state.concerns || []) {
    const angle = String(c.angle || "");
    if (!angle) continue;
    if (concernForcedRed(c)) {
      concerns[angle] = {
        level: "red",
        reason: cannedConcernReason("red"),
      };
      continue;
    }
    const qid = concernQuestionId(angle);
    const row = answers[qid];
    let level = String(row?.choice || "").toLowerCase();
    if (level !== "red" && level !== "yellow" && level !== "green") continue;
    const confidence = Number(row.confidence);
    choices[qid] = {
      choice: level,
      confidence: Number.isFinite(confidence) ? confidence : 0,
      probabilities: row.probabilities || {},
    };
    if (choiceIsUncertain(confidence)) {
      scoreUncertain = true;
      const prior = String(c.priorLevel || "red").toLowerCase();
      level = prior === "yellow" || prior === "green" ? prior : "red";
    }
    concerns[angle] = {
      level,
      reason: cannedConcernReason(level),
    };
  }

  return {
    flags,
    crisisDelta,
    crisisReasons,
    concerns,
    choices,
    scoreUncertain,
    model: response.model,
    usage: response.usage || null,
  };
}

/**
 * Lean state for the honesty rubric.
 * @param {{ howText?: string, techIds?: string[], globalId?: string, place?: string, year?: *, rules?: object[] }} opts
 */
export function honestyTypeSafeState(opts = {}) {
  const techIds = (opts.techIds || [])
    .map((t) => (typeof t === "string" ? t : t?.techId || t?.id))
    .filter(Boolean)
    .slice(0, 12);
  const rules = Array.isArray(opts.rules)
    ? opts.rules.slice(0, 8).map((r) => ({
        id: r?.id || null,
        kind: r?.kind || null,
        label: r?.label || null,
        status: r?.status === "suspended" ? "suspended" : "active",
      }))
    : [];
  return {
    pathway: {
      howText: String(opts.howText || "").slice(0, 2400),
      techIds,
    },
    mission: {
      globalId: opts.globalId || null,
      place: opts.place || null,
      year: opts.year ?? null,
    },
    rules,
  };
}
