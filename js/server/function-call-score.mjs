/**
 * Overlay TypeSafe function-calling on chat proposals and lobby tags.
 */

import { getTypeSafeClient, typesafeTraceOf } from "./typesafe-client.mjs";
import {
  judgeChatFunctionTypeSafe,
  judgeLobbyTagTypeSafe,
} from "./function-call-typesafe.mjs";

export const CHAT_OVERLAY_MODES = new Set(["chat", "spark"]);
export const STACK_VERIFY_MODES = new Set(["suggest-stack"]);

function emptyProposals() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };
}

/**
 * @param {object} result
 * @param {object} body
 * @param {object} [opts]
 */
export async function applyTypeSafeFunctionCall(result, body = {}, opts = {}) {
  const mode = body.mode || "chat";
  if (!result || typeof result !== "object") return result;

  const resolveClient =
    opts.client !== undefined
      ? () => opts.client
      : opts.getClient || getTypeSafeClient;
  const client = resolveClient();
  if (!client) return result;

  const warn =
    typeof opts.warn === "function"
      ? opts.warn
      : (msg) => console.warn("[function-call-typesafe]", msg);

  try {
    if (mode === "tag-lobby-rule") {
      const judged = await judgeLobbyTagTypeSafe(
        client,
        body.context || {},
        opts.requestOptions
      );
      if (typeof opts.onUsage === "function") {
        opts.onUsage({
          model: judged.model,
          usage: judged.usage,
          mode: "tag-lobby-rule",
        });
      }
      return {
        ...result,
        source: judged.model ? "typesafe" : result.source,
        kind: judged.kind,
        effects: judged.effects,
        typesafeTrace: typesafeTraceOf(judged, {
          state: judged.state,
          questions: judged.questions,
          answers: {
            kind: judged.kind,
            effects: judged.effects,
            effectFlags: judged.effectFlags,
          },
        }),
      };
    }

    const forceAddStack = STACK_VERIFY_MODES.has(mode);
    if (!CHAT_OVERLAY_MODES.has(mode) && !forceAddStack) return result;

    const judged = await judgeChatFunctionTypeSafe(
      client,
      result,
      body.context || {},
      body.messages || [],
      opts.requestOptions,
      { skipIntent: forceAddStack, forceAddStack }
    );
    if (typeof opts.onUsage === "function") {
      opts.onUsage({
        model: judged.model,
        usage: judged.usage,
        mode,
      });
    }
    const out = applyChatJudgment(result, judged, {
      tutorMode: Boolean(
        body.context?.tutorMode || body.context?.isLearningModule
      ),
      forceAddStack,
    });
    out.typesafeTrace = typesafeTraceOf(judged, {
      state: judged.state,
      questions: judged.questions,
      answers: {
        intent: judged.intent,
        intentUncertain: judged.intentUncertain,
        addTechIds: judged.addTechIds,
        endTutoring: judged.endTutoring,
        flags: judged.flags,
      },
    });
    return out;
  } catch (e) {
    warn(String(e?.message || e).slice(0, 200));
    return result;
  }
}

/**
 * @param {object} result
 * @param {object} judged
 * @param {{ tutorMode?: boolean, forceAddStack?: boolean }} [opts]
 */
export function applyChatJudgment(result, judged, opts = {}) {
  const proposals = { ...(result.proposals || emptyProposals()) };
  proposals.addTechIds = Array.isArray(judged.addTechIds)
    ? judged.addTechIds
    : [];

  const intent = judged.intent || "none";
  const uncertain = Boolean(judged.intentUncertain);

  if (!opts.forceAddStack && !uncertain) {
    if (intent === "none" || intent === "end_tutoring") {
      proposals.addTechIds = [];
      proposals.removeTechIds = [];
      proposals.inventionHow = null;
      proposals.inventionImpact = null;
      proposals.inventionName = null;
    } else if (intent === "add_tech" || intent === "remove_tech") {
      proposals.inventionHow = null;
      proposals.inventionImpact = null;
    } else if (intent === "rewrite_how") {
      proposals.addTechIds = [];
      proposals.inventionImpact = null;
    } else if (intent === "rewrite_life") {
      proposals.addTechIds = [];
      proposals.inventionHow = null;
    }
  }

  const out = { ...result, proposals };
  if (opts.tutorMode) {
    if (judged.endTutoring) out.endTutoring = true;
    else delete out.endTutoring;
  }
  return out;
}
