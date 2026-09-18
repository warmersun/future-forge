/**
 * TypeSafe fast-eval judges. Server-only (imports the SDK).
 */

import { choice, noul } from "@typesafe-ai/sdk";
import { jsonSafeQuestions } from "./typesafe-client.mjs";
import {
  CHALLENGE_VERDICT_CHOICE,
  CONTRIBUTION_NOUL,
  CONVERGENCE_NOUL,
  FEASIBILITY_NOUL_IDS,
  FEASIBILITY_NOULS,
  FEASIBILITY_TIMING_CHOICE,
  SCRUTINY_QUALITY_CHOICE,
  cannedConvergenceCopy,
  composeChallengeVerdict,
  composeContributionAdditive,
  composeFeasibilityTiming,
  composeScrutinyQuality,
  convergeQuestionId,
  noulDecision,
} from "../sim/fast-judge-questions.js";

function clip(s, n) {
  const t = String(s || "").trim();
  return t ? t.slice(0, n) : "";
}

function slimStack(context) {
  const ids = context?.selectedTechIds || context?.techIds || [];
  return (Array.isArray(ids) ? ids : [])
    .map((id) => (typeof id === "string" ? id : id?.id || id?.techId))
    .filter(Boolean)
    .slice(0, 8);
}

export function feasibilityTypeSafeState(context = {}) {
  const stack = slimStack(context);
  return {
    year: context.year ?? null,
    place: context.place || null,
    inventionHow: clip(context.inventionHow, 1200),
    inventionImpact: clip(context.inventionImpact, 800),
    stack,
    grounding: clip(context.grounding, 1500),
    priorTiming: context.priorTiming
      ? {
          level: context.priorTiming.level || null,
          year: context.priorTiming.year ?? null,
          fingerprint: context.priorTiming.fingerprint || null,
        }
      : null,
  };
}

export function feasibilityTypeSafeQuestions() {
  const questions = {};
  for (const id of FEASIBILITY_NOUL_IDS) {
    const spec = FEASIBILITY_NOULS[id];
    questions[id] = noul(spec.instructions, spec.criteria);
  }
  questions.timing = choice(
    FEASIBILITY_TIMING_CHOICE.instructions,
    FEASIBILITY_TIMING_CHOICE.criteria
  );
  return questions;
}

export function parseFeasibilityAnswers(response, context = {}) {
  const answers = response?.answers || {};
  const nouls = {};
  for (const id of FEASIBILITY_NOUL_IDS) {
    nouls[id] =
      answers[id] && typeof answers[id].noul === "number"
        ? answers[id].noul
        : NaN;
  }
  const timingChoice = answers.timing
    ? {
        choice: String(answers.timing.choice || ""),
        confidence: Number(answers.timing.confidence),
      }
    : null;
  const composed = composeFeasibilityTiming(nouls, timingChoice, {
    priorTiming: context.priorTiming,
    year: context.year,
    inventionHow: context.inventionHow,
    techIds: slimStack(context),
  });
  return {
    ...composed,
    timingChoice,
    model: response.model,
    usage: response.usage || null,
  };
}

export async function judgeFeasibilityTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeFeasibilityTypeSafe requires a TypeSafe client");
  const state = feasibilityTypeSafeState(context);
  const questions = feasibilityTypeSafeQuestions();
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  return {
    ...parseFeasibilityAnswers(response, context),
    questions: jsonSafeQuestions(questions),
    state,
  };
}

function judgeState(context = {}) {
  const path = context.pathway || {};
  return {
    playerAnswer: clip(context.playerAnswer, 2000),
    challengeAngle: context.challengeAngle || null,
    challengeSpeech: clip(context.challengeSpeech, 800),
    challengeQuestion: clip(context.challengeQuestion, 400),
    pathway: {
      howText: clip(path.howText, 1600),
      inventions: (Array.isArray(path.inventions) ? path.inventions : [])
        .slice(0, 8)
        .map((n) => ({
          techId: n?.techId || null,
          howText: clip(n?.howText, 800),
        })),
    },
    place: context.place || null,
    year: context.year ?? null,
  };
}

export async function judgeScrutinyTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeScrutinyTypeSafe requires a TypeSafe client");
  const state = judgeState(context);
  const questions = {
    quality: choice(
      SCRUTINY_QUALITY_CHOICE.instructions,
      SCRUTINY_QUALITY_CHOICE.criteria
    ),
  };
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  const row = response.answers.quality;
  const composed = composeScrutinyQuality(row?.choice, row?.confidence);
  return {
    ...composed,
    confidence: Number(row?.confidence),
    model: response.model,
    usage: response.usage || null,
    questions: jsonSafeQuestions(questions),
    state,
  };
}

export async function judgeChallengeTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeChallengeTypeSafe requires a TypeSafe client");
  const state = judgeState(context);
  const questions = {
    verdict: choice(
      CHALLENGE_VERDICT_CHOICE.instructions,
      CHALLENGE_VERDICT_CHOICE.criteria
    ),
  };
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  const row = response.answers.verdict;
  const composed = composeChallengeVerdict(row?.choice, row?.confidence);
  return {
    ...composed,
    confidence: Number(row?.confidence),
    model: response.model,
    usage: response.usage || null,
    questions: jsonSafeQuestions(questions),
    state,
  };
}

export async function judgeContributionTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeContributionTypeSafe requires a TypeSafe client");
  const state = {
    field: context.field || null,
    beforeText: clip(context.beforeText, 2000),
    afterText: clip(context.afterText, 2000),
  };
  const questions = {
    additive: noul(CONTRIBUTION_NOUL.instructions, CONTRIBUTION_NOUL.criteria),
  };
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  const p = Number(response.answers.additive?.noul);
  const composed = composeContributionAdditive(p, true, {
    beforeText: context.beforeText,
    afterText: context.afterText,
  });
  return {
    ...composed,
    noul: p,
    decision: noulDecision(p),
    model: response.model,
    usage: response.usage || null,
    questions: jsonSafeQuestions(questions),
    state,
  };
}

function tileSlice(t) {
  return {
    id: t?.id || null,
    techId: t?.techId || null,
    techName: clip(t?.techName || t?.name, 80) || null,
    howText: clip(t?.howText, 800),
    polarity: t?.polarity || null,
  };
}

export function convergenceTypeSafeState(context = {}) {
  const neighbors = Array.isArray(context.neighbors) ? context.neighbors : [];
  return {
    year: context.year ?? null,
    place: context.place || null,
    placed: tileSlice(context.placed),
    neighbors: neighbors.slice(0, 8).map(tileSlice),
  };
}

export function convergenceTypeSafeQuestions(neighbors = []) {
  const questions = {};
  for (const n of neighbors) {
    const id = convergeQuestionId(n?.id);
    if (!id || questions[id]) continue;
    questions[id] = noul(CONVERGENCE_NOUL.instructions, {
      true: {
        ...CONVERGENCE_NOUL.criteria.true,
        neighborId: n.id,
        neighborTech: n.techId || n.techName || null,
      },
      false: CONVERGENCE_NOUL.criteria.false,
    });
  }
  return questions;
}

export function parseConvergenceAnswers(response, context = {}) {
  const answers = response?.answers || {};
  const placed = context.placed || {};
  const neighbors = Array.isArray(context.neighbors) ? context.neighbors : [];
  const na = placed.techName || placed.techId || "one field";
  const convergences = [];
  for (const n of neighbors) {
    const qid = convergeQuestionId(n?.id);
    if (!qid) continue;
    const p = Number(answers[qid]?.noul);
    const decision = noulDecision(p);
    const nb = n.techName || n.techId || "the other";
    const copy = cannedConvergenceCopy(na, nb);
    convergences.push({
      neighborId: n.id,
      converges: decision === "yes",
      uncertain: decision === "uncertain",
      noul: Number.isFinite(p) ? p : NaN,
      enhancedId: placed.id || n.id,
      title: copy.title,
      reason: decision === "yes" ? copy.reason : "",
    });
  }
  return {
    convergences,
    model: response.model,
    usage: response.usage || null,
  };
}

export async function judgeConvergenceTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeConvergenceTypeSafe requires a TypeSafe client");
  const state = convergenceTypeSafeState(context);
  const questions = convergenceTypeSafeQuestions(state.neighbors);
  if (!Object.keys(questions).length) {
    return {
      convergences: [],
      model: null,
      usage: null,
      questions: {},
      state,
    };
  }
  const response = await client.systemOne({ state, questions }, requestOptions);
  return {
    ...parseConvergenceAnswers(response, state),
    questions: jsonSafeQuestions(questions),
    state,
  };
}
