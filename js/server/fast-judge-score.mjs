/**
 * Overlay TypeSafe fast-eval judgments on Grok/local results.
 * Missing key or TypeSafe error → leave the incoming result (regex/Grok path).
 */

import {
  getTypeSafeClient,
  typesafeErrorOf,
  typesafeTraceOf,
} from "./typesafe-client.mjs";
import {
  judgeChallengeTypeSafe,
  judgeContributionTypeSafe,
  judgeConvergenceTypeSafe,
  judgeFeasibilityTypeSafe,
  judgeScrutinyTypeSafe,
} from "./fast-judge-typesafe.mjs";

const MODE_HANDLERS = {
  "assess-feasibility": applyFeasibility,
  "judge-scrutiny-move": applyScrutiny,
  "judge-challenge": applyChallenge,
  "judge-contribution": applyContribution,
  "evaluate-convergence": applyConvergence,
};

/**
 * @param {object} result
 * @param {object} body
 * @param {{
 *   client?: object|null,
 *   getClient?: () => object|null,
 *   requestOptions?: object,
 *   onUsage?: (info: object) => void,
 *   warn?: (msg: string) => void,
 * }} [opts]
 */
export async function applyTypeSafeFastJudge(result, body = {}, opts = {}) {
  const mode = body.mode || "chat";
  const handler = MODE_HANDLERS[mode];
  if (!handler || !result || typeof result !== "object") return result;

  const resolveClient =
    opts.client !== undefined
      ? () => opts.client
      : opts.getClient || getTypeSafeClient;
  const client = resolveClient();
  if (!client) return result;

  const warn =
    typeof opts.warn === "function"
      ? opts.warn
      : (msg) => console.warn("[fast-judge-typesafe]", msg);

  try {
    const judged = await handler(result, body.context || {}, client, opts);
    if (!judged || typeof judged !== "object") return result;
    const { _usage, ...rest } = judged;
    if (typeof opts.onUsage === "function" && _usage) {
      opts.onUsage(_usage);
    }
    return rest;
  } catch (e) {
    warn(String(e?.message || e).slice(0, 200));
    const error = typesafeErrorOf(e, mode);
    if (typeof opts.onUsage === "function") {
      opts.onUsage({
        model: null,
        usage: null,
        mode,
        ok: false,
        error: error.message,
      });
    }
    return { ...result, typesafeError: error };
  }
}

function usagePack(judged, mode) {
  if (!judged?.model && !judged?.usage) return null;
  return {
    model: judged.model || null,
    usage: judged.usage || null,
    mode,
  };
}

function withTrace(result, judged, answers) {
  const trace = typesafeTraceOf(judged, {
    answers,
    questions: judged.questions,
    state: judged.state,
  });
  if (!trace || !result || typeof result !== "object") return result;
  return { ...result, typesafeTrace: trace };
}

async function applyFeasibility(result, context, client, opts) {
  const judged = await judgeFeasibilityTypeSafe(
    client,
    context,
    opts.requestOptions
  );
  const grokLv = String(result.timing?.level || "").toLowerCase();
  const grokReason = String(result.timing?.reason || result.message || "").trim();
  const reason =
    grokLv === judged.level && grokReason ? grokReason.slice(0, 280) : judged.reason;
  return {
    ...withTrace(result, judged, {
      level: judged.level,
      reason: judged.reason,
      nouls: judged.nouls,
      timingChoice: judged.timingChoice,
    }),
    source: result.source || "typesafe",
    timing: { level: judged.level, reason },
    _usage: usagePack(judged, "assess-feasibility"),
  };
}

async function applyScrutiny(result, context, client, opts) {
  const judged = await judgeScrutinyTypeSafe(
    client,
    context,
    opts.requestOptions
  );
  const grokQ = String(result.quality || "").toLowerCase();
  const grokMsg = String(result.message || "").trim();
  return {
    ...withTrace(result, judged, {
      quality: judged.quality,
      damage: judged.damage,
      confidence: judged.confidence,
    }),
    quality: judged.quality,
    damage: judged.damage,
    message:
      grokQ === judged.quality && grokMsg ? grokMsg.slice(0, 800) : judged.message,
    _usage: usagePack(judged, "judge-scrutiny-move"),
  };
}

async function applyChallenge(result, context, client, opts) {
  const judged = await judgeChallengeTypeSafe(
    client,
    context,
    opts.requestOptions
  );
  const grokV = String(result.verdict || "").toLowerCase();
  const grokMsg = String(result.message || "").trim();
  const grokLesson = String(result.lesson || "").trim();
  return {
    ...withTrace(result, judged, {
      verdict: judged.verdict,
      confidence: judged.confidence,
    }),
    verdict: judged.verdict,
    message:
      grokV === judged.verdict && grokMsg ? grokMsg.slice(0, 800) : judged.message,
    lesson:
      grokV === judged.verdict && grokLesson
        ? grokLesson.slice(0, 500)
        : judged.lesson,
    _usage: usagePack(judged, "judge-challenge"),
  };
}

async function applyContribution(result, context, client, opts) {
  const judged = await judgeContributionTypeSafe(
    client,
    context,
    opts.requestOptions
  );
  if (judged.uncertain) {
    return {
      ...withTrace(result, judged, {
        additive: judged.additive,
        uncertain: true,
        noul: judged.noul,
      }),
      _usage: usagePack(judged, "judge-contribution"),
    };
  }
  const grokReason = String(result.reason || result.message || "").trim();
  const grokAdd = result.additive === true || result.additive === "true";
  return {
    ...withTrace(result, judged, {
      additive: judged.additive,
      noul: judged.noul,
    }),
    additive: judged.additive,
    reason:
      grokAdd === judged.additive && grokReason
        ? grokReason.slice(0, 280)
        : judged.reason,
    _usage: usagePack(judged, "judge-contribution"),
  };
}

async function applyConvergence(result, context, client, opts) {
  const judged = await judgeConvergenceTypeSafe(
    client,
    context,
    opts.requestOptions
  );
  const incoming = Array.isArray(result.convergences) ? result.convergences : [];
  const byId = new Map(incoming.map((row) => [String(row?.neighborId), row]));
  const convergences = (judged.convergences || []).map((row) => {
    const grok = byId.get(String(row.neighborId));
    if (row.uncertain && grok) {
      return {
        ...row,
        converges: grok.converges === true || grok.converges === "true",
        title: grok.title || row.title,
        reason: grok.reason || row.reason,
        enhancedId: grok.enhancedId || row.enhancedId,
      };
    }
    if (grok && (grok.converges === true) === row.converges) {
      return {
        ...row,
        title: grok.title || row.title,
        reason: grok.reason || row.reason,
        enhancedId: grok.enhancedId || row.enhancedId,
      };
    }
    return {
      neighborId: row.neighborId,
      converges: row.converges,
      enhancedId: row.enhancedId,
      title: row.converges ? row.title : "",
      reason: row.converges ? row.reason : "",
    };
  });
  return {
    ...withTrace(result, judged, { convergences: judged.convergences }),
    convergences,
    _usage: usagePack(judged, "evaluate-convergence"),
  };
}
