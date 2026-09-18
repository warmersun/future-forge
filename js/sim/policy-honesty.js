/**
 * Policy is weather, not the invent.
 * A law / ban / UBI bill cannot ease crisis meters. On automation and rogue-si,
 * a gadget stack without a coordination mechanism cannot green the root cause.
 */

import { worseLevel } from "./deploy.js";
import { honestyNeeds } from "./policy-rules.js";

/** Techs that can eat shifts unless a share/bridge is in the how-text. */
export const DISPLACEMENT_TECH_IDS = new Set([
  "robots",
  "ai",
  "self-driving",
]);

/** High-stakes decision stacks on rogue-si. */
export const HIGH_STAKES_AI_TECH_IDS = new Set(["ai", "computing"]);

const MECHANISM_RE =
  /\b(wallet|ledger|token|sensor|override|button|eval|audit|radio|grid|robot|sorter|model|schedule|pump|kit|dock|camera|tripwire|harness|protocol|microgrid|logged|unlock)\b/i;

const POLICY_ACT_RE =
  /\b(pass(?:es|ed|ing)?|enact(?:s|ed|ing)?|adopt(?:s|ed|ing)?)\b[\s\S]{0,80}\b(ubi|universal basic income|law|bill|act|ban|regulation|ordinance|treaty|statute)\b/i;

const BAN_RE =
  /\b(ban|outlaw|prohibit)\b[\s\S]{0,60}\b(ai|agi|asi|superintelligence|automation|robots?|models?)\b/i;

const UBI_RE = /\b(universal basic income|ubi)\b/i;

const UN_TREATY_RE =
  /\b(un|united nations|congress|parliament)\b[\s\S]{0,80}\b(treaty|resolution|ban|pause|bill|act)\b/i;

const SHARE_RE =
  /\b(crew (wallet|pay|share|dividend)|machine[- ]?dividend|surplus (to|hits|goes to|share)|paid (training|hour|retrain)|portable benefit|income bridge|split (the )?gains?|pay(?:s|ing)? the (crew|hands|drivers|packers)|meaning and pay)\b/i;

const EVAL_OVERRIDE_RE =
  /\b(human[- ]in[- ]the[- ]loop|override|unlock(?:able)?|eval(?:uation)? (harness|set|run)|audit trail|logged (override|decision)|surgeon can still|outvote the (model|score)|second (pass|look)|tripwire|kill[- ]?switch|reachable (button|override))\b/i;

/**
 * @param {object|string|null|undefined} globalOrId
 * @param {object|null|undefined} [mission]
 */
export function resolveGlobalId(globalOrId, mission = null) {
  if (typeof globalOrId === "string" && globalOrId) return globalOrId;
  return (
    globalOrId?.id ||
    mission?.globalId ||
    ""
  );
}

/**
 * Concrete capability mechanism in the how-text (not a statute).
 * @param {string} howText
 */
export function hasCapabilityMechanism(howText) {
  return MECHANISM_RE.test(String(howText || ""));
}

/**
 * The how-text is only a law, ban, UBI bill, or treaty — not an invent.
 * @param {string} howText
 */
export function isPurePolicyInvent(howText) {
  const how = String(howText || "").trim();
  if (how.length < 8) return false;
  if (hasCapabilityMechanism(how)) return false;
  return (
    POLICY_ACT_RE.test(how) ||
    BAN_RE.test(how) ||
    UBI_RE.test(how) ||
    UN_TREATY_RE.test(how)
  );
}

/**
 * Surplus / pay / meaning actually moves to the people in the scene.
 * Bare "UBI" is not enough.
 * @param {string} howText
 */
export function hasShareBridgeClaim(howText) {
  return SHARE_RE.test(String(howText || ""));
}

/**
 * A human can still take the last call, or an eval/audit travels with the model.
 * @param {string} howText
 */
export function hasEvalOverrideClaim(howText) {
  return EVAL_OVERRIDE_RE.test(String(howText || ""));
}

/**
 * Sync regex detector. TypeSafe fills the same shape with true/false/null.
 * @param {string} howText
 * @returns {{
 *   source: "regex",
 *   mechanism: boolean,
 *   purePolicy: boolean,
 *   shareBridge: boolean,
 *   evalOverride: boolean,
 *   uncertain: Record<string, boolean>,
 * }}
 */
export function detectHonestyFlagsRegex(howText) {
  const how = String(howText || "");
  return {
    source: "regex",
    mechanism: hasCapabilityMechanism(how),
    purePolicy: isPurePolicyInvent(how),
    shareBridge: hasShareBridgeClaim(how),
    evalOverride: hasEvalOverrideClaim(how),
    uncertain: {},
  };
}

/**
 * @param {object|null|undefined} flags
 * @returns {boolean}
 */
function isTrue(flagsValue) {
  return flagsValue === true;
}

/**
 * @param {object|null|undefined} flagsValue
 * @returns {boolean}
 */
function isFalse(flagsValue) {
  return flagsValue === false;
}

/**
 * Used-branch uncertainty: statute always; share/eval only when the theme needs them.
 * @param {object|null|undefined} flags
 * @param {{ share?: boolean, eval?: boolean }} [needs]
 */
export function honestyFlagsUncertain(flags, needs = {}) {
  if (!flags) return false;
  if (flags.purePolicy == null) return true;
  if (needs.share && flags.shareBridge == null) return true;
  if (needs.eval && flags.evalOverride == null) return true;
  return false;
}

function resolveHonestyFlags(opts = {}) {
  if (opts.flags && typeof opts.flags === "object") return opts.flags;
  return detectHonestyFlagsRegex(opts.howText);
}

function techIdsOf(list) {
  return (list || []).map((t) => (typeof t === "string" ? t : t?.techId || t?.id)).filter(Boolean);
}

/**
 * Cap the root-cause lamp. Null = no extra cap.
 * @param {{ globalId?: string, techIds?: string[], howText?: string, rules?: object[] }} opts
 * @returns {{ level: "red"|"yellow", note: string } | null}
 */
export function coordinationLampCap(opts = {}) {
  const ids = techIdsOf(opts.techIds);
  const needs = honestyNeeds({
    globalId: opts.globalId,
    rules: opts.rules,
  });
  const flags = resolveHonestyFlags(opts);

  if (isTrue(flags.purePolicy)) {
    return {
      level: "red",
      note: "A law or ban is not an invent — name what becomes abundant here, with which capability, this year.",
    };
  }

  if (
    needs.share &&
    ids.some((id) => DISPLACEMENT_TECH_IDS.has(id)) &&
    isFalse(flags.shareBridge)
  ) {
    return {
      level: "red",
      note: "The root cause is who captures the surplus — name a share, paid skill, or meaning bridge, not only a faster machine.",
    };
  }

  if (
    needs.eval &&
    ids.some((id) => HIGH_STAKES_AI_TECH_IDS.has(id)) &&
    isFalse(flags.evalOverride)
  ) {
    return {
      level: "red",
      note: "A smarter score without an unlockable human path still locks the last call.",
    };
  }

  return null;
}

/**
 * After assessSustainable: never greener than the coordination cap.
 * @param {{ level: string, note: string, [k: string]: * }} result
 * @param {{ global?: *, mission?: *, techs?: *, inventionHow?: string, inventionImpact?: string }} opts
 */
export function applyCoordinationCap(result, opts = {}) {
  const cap = coordinationLampCap({
    globalId: resolveGlobalId(opts.global, opts.mission),
    techIds: opts.techs,
    howText: [opts.inventionHow, opts.inventionImpact].filter(Boolean).join("\n"),
    rules: opts.rules || opts.mission?.rules,
    flags: opts.flags,
  });
  if (!cap || !result) return result;
  const level = worseLevel(result.level, cap.level);
  if (level === result.level) return result;
  return { ...result, level, note: cap.note };
}

function cloneDelta(delta) {
  return {
    local: Number(delta?.local) || 0,
    global: Number(delta?.global) || 0,
    support: Number(delta?.support) || 0,
  };
}

function cloneReasons(reasons) {
  return {
    local: String(reasons?.local || ""),
    global: String(reasons?.global || ""),
    support: String(reasons?.support || ""),
  };
}

/**
 * Clamp crisisDelta so a statute cannot ease meters, and unpaired stacks
 * cannot ease the root-cause meter (and may inflame support).
 * Optional `flags` (true/false/null) replace regex detection. Null = uncertain:
 * that branch does not clamp (not treated as a known violation).
 * @param {{ globalId?: string, techIds?: string[], howText?: string, rules?: object[], crisisDelta?: object, crisisReasons?: object, flags?: object }} opts
 */
export function applyPolicyHonesty(opts = {}) {
  const ids = techIdsOf(opts.techIds);
  const needs = honestyNeeds({
    globalId: opts.globalId,
    rules: opts.rules,
  });
  const flags = resolveHonestyFlags(opts);
  const crisisDelta = cloneDelta(opts.crisisDelta);
  const crisisReasons = cloneReasons(opts.crisisReasons);

  if (isTrue(flags.purePolicy)) {
    crisisDelta.local = Math.max(crisisDelta.local, 0);
    crisisDelta.global = Math.max(crisisDelta.global, 0);
    crisisDelta.support = Math.max(crisisDelta.support, 0);
    crisisReasons.local =
      "A law or ban is not an invent — name what becomes abundant here, with which capability, this year.";
    crisisReasons.global =
      "Passing a rule does not change the driver unless a mechanism in this place makes something abundant.";
    crisisReasons.support =
      "A statute without a fieldable pathway does not earn buy-in on the ground.";
    return { crisisDelta, crisisReasons, tag: "pure-policy", flags };
  }

  if (
    needs.share &&
    ids.some((id) => DISPLACEMENT_TECH_IDS.has(id)) &&
    isFalse(flags.shareBridge)
  ) {
    crisisDelta.global = Math.max(crisisDelta.global, 0);
    crisisReasons.global =
      "The root cause is who captures the surplus — name a share, paid skill, or meaning bridge.";
    if (needs.backlash && crisisDelta.local < 0) {
      crisisDelta.support = Math.max(crisisDelta.support, 1);
      crisisReasons.support =
        "Faster machines without a share for the crew inflame rent and dignity.";
    }
    return { crisisDelta, crisisReasons, tag: "no-share", flags };
  }

  if (
    needs.eval &&
    ids.some((id) => HIGH_STAKES_AI_TECH_IDS.has(id)) &&
    isFalse(flags.evalOverride)
  ) {
    crisisDelta.global = Math.max(crisisDelta.global, 0);
    crisisReasons.global =
      "A smarter score without an unlockable human path still locks the last call.";
    if (needs.backlash && crisisDelta.local < 0) {
      crisisDelta.support = Math.max(crisisDelta.support, 1);
      crisisReasons.support =
        "Liability and the board treat a locked model as safer than a reachable override.";
    }
    return { crisisDelta, crisisReasons, tag: "no-eval", flags };
  }

  return { crisisDelta, crisisReasons, tag: null, flags };
}

/**
 * Clamp a normalized / blended pathway score in place (idempotent).
 * @param {object} score
 * @param {object[]} inventions
 * @param {{ globalId?: string, global?: *, mission?: *, rules?: object[], howText?: string, flags?: object }} [opts]
 */
export function clampPathwayScore(score, inventions = [], opts = {}) {
  if (!score || typeof score !== "object") return score;
  const howText =
    opts.howText != null
      ? String(opts.howText)
      : inventions
          .map((n) => String(n?.howText || "").trim())
          .filter(Boolean)
          .join("\n");
  const globalId = resolveGlobalId(opts.globalId || opts.global, opts.mission);
  const rules = opts.rules || opts.mission?.rules;
  const flags = opts.flags || detectHonestyFlagsRegex(howText);
  const needs = honestyNeeds({ globalId, rules });
  const applied = applyPolicyHonesty({
    globalId,
    techIds: inventions,
    howText,
    rules,
    flags,
    crisisDelta: score.crisisDelta,
    crisisReasons: score.crisisReasons,
  });
  const uncertain = honestyFlagsUncertain(flags, needs);
  if (!applied.tag && !uncertain && !opts.flags && !score.scoreUncertain) {
    return score;
  }
  const out = applied.tag
    ? {
        ...score,
        crisisDelta: applied.crisisDelta,
        crisisReasons: applied.crisisReasons,
      }
    : { ...score };
  if (opts.flags || uncertain) {
    out.honestyFlags = flags;
    out.honestyUncertain = uncertain;
  }
  if (score.scoreUncertain) out.scoreUncertain = true;
  return out;
}
