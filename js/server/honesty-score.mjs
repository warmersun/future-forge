/**
 * Apply TypeSafe honesty + pathway Choices to a score-pathway result.
 * TypeSafe when a client exists; regex clamp otherwise.
 * Grok/local numbers are replaced when Choices come back; Grok reasons stay
 * only when they match the locked signed delta.
 */

import { clampPathwayScore } from "../hex/evaluate.js";
import { CRISIS_ROLES, clipCrisisReason } from "../hex/crisis-delta.js";
import { cannedDeltaReason } from "../sim/pathway-questions.js";
import {
  getTypeSafeClient,
  typesafeErrorOf,
  typesafeTraceOf,
} from "./typesafe-client.mjs";
import {
  pathwayTypeSafeState,
  scorePathwayTypeSafe,
} from "./honesty-typesafe.mjs";

function pathwayHowText(context = {}) {
  const island = String(context.pathway?.howText || "").trim();
  if (island) return island;
  const invs = Array.isArray(context.pathway?.inventions)
    ? context.pathway.inventions
    : [];
  return invs
    .map((n) => String(n?.howText || "").trim())
    .filter(Boolean)
    .join("\n");
}

function pathwayInventions(context = {}) {
  return Array.isArray(context.pathway?.inventions)
    ? context.pathway.inventions
    : [];
}

function grokDeltaOf(result, role) {
  const v = result?.crisisDelta?.[role];
  if (v && typeof v === "object") return Number(v.delta) || 0;
  return Number(v) || 0;
}

function grokReasonOf(result, role) {
  const nested = result?.crisisDelta?.[role];
  if (nested && typeof nested === "object" && nested.reason) {
    return clipCrisisReason(nested.reason);
  }
  return clipCrisisReason(result?.crisisReasons?.[role]);
}

/**
 * Overlay TypeSafe deltas onto a Grok/local payload.
 * @param {object} result
 * @param {object} judged — parsePathwayTypeSafeAnswers
 */
export function composeTypeSafeScore(result, judged) {
  const src = result && typeof result === "object" ? result : {};
  const crisisDelta = {
    local: grokDeltaOf(src, "local"),
    global: grokDeltaOf(src, "global"),
    support: grokDeltaOf(src, "support"),
  };
  const crisisReasons = {
    local: grokReasonOf(src, "local"),
    global: grokReasonOf(src, "global"),
    support: grokReasonOf(src, "support"),
  };
  const tsDelta = judged?.crisisDelta || {};
  const tsReasons = judged?.crisisReasons || {};
  for (const role of CRISIS_ROLES) {
    if (!Object.prototype.hasOwnProperty.call(tsDelta, role)) continue;
    const locked = tsDelta[role];
    crisisDelta[role] = locked;
    const grokR = grokReasonOf(src, role);
    if (grokR && grokDeltaOf(src, role) === locked) {
      crisisReasons[role] = grokR;
    } else {
      crisisReasons[role] =
        tsReasons[role] || cannedDeltaReason(role, locked);
    }
  }
  return {
    ...src,
    crisisDelta,
    crisisReasons,
    concerns: { ...(src.concerns || {}), ...(judged?.concerns || {}) },
    scoreUncertain: Boolean(judged?.scoreUncertain),
    pathwayChoices: judged?.choices || null,
  };
}

/**
 * @param {object} result — sanitizeFast / local score-pathway payload
 * @param {object} context — co-invent context
 * @param {{
 *   client?: object|null,
 *   getClient?: () => object|null,
 *   requestOptions?: object,
 *   onUsage?: (info: object) => void,
 *   warn?: (msg: string) => void,
 * }} [opts]
 */
export async function applyHonestyToScorePathway(
  result,
  context = {},
  opts = {}
) {
  if (!result || typeof result !== "object") return result;
  const invs = pathwayInventions(context);
  const howText = pathwayHowText(context);
  const globalId =
    context.globalId || context.mission?.globalId || context.global?.id;
  const rules = context.rules || context.mission?.rules;
  const clampOpts = {
    globalId,
    mission: context.mission,
    rules,
    howText,
  };

  const resolveClient =
    opts.client !== undefined
      ? () => opts.client
      : opts.getClient || getTypeSafeClient;
  const client = resolveClient();
  const warn =
    typeof opts.warn === "function"
      ? opts.warn
      : (msg) => console.warn("[honesty-typesafe]", msg);

  let composed = result;
  let trace = null;
  let typesafeError = null;
  if (client) {
    try {
      const state = pathwayTypeSafeState({
        howText,
        techIds: invs,
        inventions: invs,
        globalId,
        place: context.place,
        year: context.year,
        rules,
        crisisRoles: context.crisisRoles,
        concerns: context.concerns,
        grounding: context.grounding || context.mission?.grounding,
      });
      const judged = await scorePathwayTypeSafe(
        client,
        state,
        opts.requestOptions
      );
      clampOpts.flags = judged.flags;
      composed = composeTypeSafeScore(result, judged);
      trace = typesafeTraceOf(judged, {
        state,
        questions: judged.questions,
        answers: {
          flags: judged.flags,
          crisisDelta: judged.crisisDelta,
          crisisReasons: judged.crisisReasons,
          concerns: judged.concerns,
          choices: judged.choices,
          scoreUncertain: judged.scoreUncertain,
        },
      });
      if (typeof opts.onUsage === "function" && (judged.model || judged.usage)) {
        opts.onUsage({
          model: judged.model || null,
          usage: judged.usage,
          flags: judged.flags,
          scoreUncertain: judged.scoreUncertain,
          mode: "score-pathway",
        });
      }
    } catch (e) {
      warn(String(e?.message || e).slice(0, 200));
      typesafeError = typesafeErrorOf(e, "score-pathway");
      if (typeof opts.onUsage === "function") {
        opts.onUsage({
          model: null,
          usage: null,
          mode: "score-pathway",
          ok: false,
          error: typesafeError.message,
        });
      }
    }
  }

  const out = clampPathwayScore(composed, invs, clampOpts);
  if (!out || typeof out !== "object") return out;
  if (trace) out.typesafeTrace = trace;
  if (typesafeError) return { ...out, typesafeError };
  return out;
}
