/**
 * TypeSafe function-calling for chat proposals and lobby tags. Server-only.
 */

import { choice, noul } from "@typesafe-ai/sdk";
import { jsonSafeQuestions } from "./typesafe-client.mjs";
import {
  ADD_TECH_NOUL,
  CHAT_INTENT_CHOICE,
  END_TUTORING_NOUL,
  LOBBY_EFFECT_NOULS,
  LOBBY_KIND_CHOICE,
  RULE_EFFECT_LIST,
  addTechQuestionId,
  composeAddTechIds,
  composeChatIntent,
  composeLobbyEffects,
  composeLobbyKind,
  decisionToFlag,
  mentionTechCandidates,
  noulDecision,
} from "../sim/function-call-questions.js";

function clip(s, n) {
  const t = String(s || "").trim();
  return t ? t.slice(0, n) : "";
}

function lastUserText(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]?.role === "user") return String(list[i].content || "");
  }
  return "";
}

/**
 * @param {object} result
 * @param {object} context
 * @param {object[]} [messages]
 */
export function chatFunctionState(result, context = {}, messages = []) {
  const available = Array.isArray(context.availableTechs)
    ? context.availableTechs
    : [];
  const proposed = [
    ...((result?.proposals?.addTechIds || []).map(String)),
    ...mentionTechCandidates(
      `${lastUserText(messages)}\n${result?.message || ""}`,
      available,
      8
    ),
  ];
  const unique = [];
  const seen = new Set();
  for (const id of proposed) {
    if (!id || seen.has(id)) continue;
    if (available.length && !available.some((t) => t && t.id === id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= 8) break;
  }
  const techs = unique.map((id) => {
    const t = available.find((x) => x && x.id === id) || { id };
    return { id, name: t.name || id, domain: t.domain || null };
  });
  return {
    userText: clip(lastUserText(messages), 2000),
    assistantMessage: clip(result?.message, 2000),
    tutorMode: Boolean(context.tutorMode || context.isLearningModule),
    proposals: {
      addTechIds: (result?.proposals?.addTechIds || []).map(String).slice(0, 8),
    },
    techs,
  };
}

export function chatFunctionQuestions(state, opts = {}) {
  const questions = {};
  if (!opts.skipIntent) {
    questions.intent = choice(
      CHAT_INTENT_CHOICE.instructions,
      CHAT_INTENT_CHOICE.criteria
    );
  }
  if (state.tutorMode) {
    questions.endTutoring = noul(
      END_TUTORING_NOUL.instructions,
      END_TUTORING_NOUL.criteria
    );
  }
  for (const tech of state.techs || []) {
    const qid = addTechQuestionId(tech.id);
    if (!qid) continue;
    questions[qid] = noul(
      {
        ...ADD_TECH_NOUL.instructions,
        tech: { id: tech.id, name: tech.name },
      },
      ADD_TECH_NOUL.criteria
    );
  }
  return questions;
}

export function parseChatFunctionAnswers(response, state = {}, opts = {}) {
  const answers = response?.answers || {};
  const intentRow = answers.intent;
  const intent = opts.skipIntent
    ? { intent: "add_tech", uncertain: false }
    : composeChatIntent(intentRow?.choice, intentRow?.confidence);
  const flags = {};
  for (const tech of state.techs || []) {
    const qid = addTechQuestionId(tech.id);
    const p = Number(answers[qid]?.noul);
    flags[tech.id] = decisionToFlag(noulDecision(p));
  }
  const proposed = [
    ...(state.proposals?.addTechIds || []),
    ...(state.techs || []).map((t) => t.id),
  ];
  let addTechIds = composeAddTechIds(proposed, flags);
  if (intent.intent === "none" || intent.intent === "end_tutoring") {
    if (!intent.uncertain && !opts.forceAddStack) addTechIds = [];
  }
  if (intent.intent === "rewrite_how" || intent.intent === "rewrite_life") {
    if (!intent.uncertain && !opts.forceAddStack) addTechIds = [];
  }
  let endTutoring = false;
  if (state.tutorMode) {
    const d = noulDecision(Number(answers.endTutoring?.noul));
    if (d === "yes") endTutoring = true;
    if (intent.intent === "end_tutoring" && !intent.uncertain) endTutoring = true;
  }
  return {
    intent: intent.intent,
    intentUncertain: intent.uncertain,
    addTechIds,
    endTutoring,
    flags,
    model: response.model,
    usage: response.usage || null,
  };
}

export async function judgeChatFunctionTypeSafe(
  client,
  result,
  context,
  messages,
  requestOptions,
  opts = {}
) {
  if (!client) throw new Error("judgeChatFunctionTypeSafe requires a TypeSafe client");
  const state = chatFunctionState(result, context, messages);
  const questions = chatFunctionQuestions(state, opts);
  if (!Object.keys(questions).length) {
    return {
      intent: opts.forceAddStack ? "add_tech" : "none",
      addTechIds: result?.proposals?.addTechIds || [],
      endTutoring: false,
      model: null,
      usage: null,
    };
  }
  const response = await client.systemOne({ state, questions }, requestOptions);
  return {
    ...parseChatFunctionAnswers(response, state, opts),
    questions: jsonSafeQuestions(questions),
    state,
  };
}

export function lobbyTagState(context = {}) {
  return {
    kind: context.kind || "policy",
    label: clip(context.label, 80),
    body: clip(context.body, 400),
    globalId: context.globalId || context.mission?.globalId || null,
    year: context.year ?? null,
    place: context.place || null,
  };
}

export function lobbyTagQuestions() {
  const questions = {
    kind: choice(LOBBY_KIND_CHOICE.instructions, LOBBY_KIND_CHOICE.criteria),
  };
  for (const id of RULE_EFFECT_LIST) {
    const spec = LOBBY_EFFECT_NOULS[id];
    questions[id] = noul(spec.instructions, spec.criteria);
  }
  return questions;
}

export function parseLobbyTagAnswers(response, context = {}) {
  const answers = response?.answers || {};
  const kind = composeLobbyKind(
    answers.kind?.choice,
    answers.kind?.confidence,
    context.kind || "policy"
  );
  const effectFlags = {};
  for (const id of RULE_EFFECT_LIST) {
    const p = Number(answers[id]?.noul);
    effectFlags[id] = decisionToFlag(noulDecision(p));
  }
  return {
    kind,
    effects: composeLobbyEffects(effectFlags),
    effectFlags,
    model: response.model,
    usage: response.usage || null,
  };
}

export async function judgeLobbyTagTypeSafe(client, context, requestOptions) {
  if (!client) throw new Error("judgeLobbyTagTypeSafe requires a TypeSafe client");
  const state = lobbyTagState(context);
  const questions = lobbyTagQuestions();
  const response = await client.systemOne(
    { state, questions },
    requestOptions
  );
  return {
    ...parseLobbyTagAnswers(response, context),
    questions: jsonSafeQuestions(questions),
    state,
  };
}
