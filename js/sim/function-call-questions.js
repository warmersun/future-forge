/**
 * TypeSafe function-calling for chat proposals and lobby weather.
 * Closed sets only: catalog tech ids, RULE_KINDS, RULE_EFFECTS.
 */

import { RULE_EFFECTS, RULE_KINDS } from "./policy-rules.js";
import {
  CHOICE_CONFIDENCE_FLOOR,
  choiceIsUncertain,
} from "./pathway-questions.js";
import { decisionToFlag, noulDecision } from "./honesty-questions.js";

export { CHOICE_CONFIDENCE_FLOOR, choiceIsUncertain, noulDecision, decisionToFlag };

export const CHAT_INTENT_IDS = [
  "none",
  "add_tech",
  "remove_tech",
  "rewrite_how",
  "rewrite_life",
  "end_tutoring",
];

export const CHAT_INTENT_CHOICE = {
  instructions: {
    question: "What should software do with this co-inventor turn?",
    inspect: "`userText`, `assistantMessage`, `proposals`",
    focus:
      "Pick the primary action. none = talk only (no stack or story apply). add_tech = add catalog techs. remove_tech = drop techs. rewrite_how / rewrite_life = apply a how-it-works or everyday-life draft. end_tutoring = the learner is done with the tutor session.",
  },
  criteria: {
    none: {
      what: "A question, comment, or teaching turn with no stack/story apply",
      not_for: "An explicit ask to add techs or rewrite how/life",
    },
    add_tech: {
      what: "Add one or more emTech categories from the catalog to the stack",
    },
    remove_tech: {
      what: "Remove techs already on the stack",
    },
    rewrite_how: {
      what: "Apply a how-it-works draft",
    },
    rewrite_life: {
      what: "Apply an everyday-life / impact draft",
    },
    end_tutoring: {
      what: "End the free tutor session — the learner is ready to invent on their own",
      not_for: "A follow-up question still inside tutoring",
    },
  },
};

export const END_TUTORING_NOUL = {
  instructions: {
    question:
      "Should this tutor session end now — has the learner understood this one idea and is ready to invent, or did they ask to stop tutoring?",
    inspect: "`userText`, `assistantMessage`, `tutorMode`",
    focus:
      "Yes only when they clearly wrapped this idea or asked to end. Do not end on every turn. A new question means keep tutoring.",
  },
  criteria: {
    true: { what: "End tutoring this turn" },
    false: { what: "Keep the tutor session open" },
  },
};

export const ADD_TECH_NOUL = {
  instructions: {
    question:
      "Should this catalog tech be added to the learner's stack based on this turn?",
    inspect: "`tech.id`, `tech.name`, `userText`, `assistantMessage`",
    focus:
      "Yes only if this specific category is requested or clearly proposed as a stack member. A passing mention is not enough.",
  },
  criteria: {
    true: { what: "Add this tech id" },
    false: { what: "Do not add this tech id" },
  },
};

export const LOBBY_KIND_CHOICE = {
  instructions: {
    question: "What kind of local weather is this lobby text?",
    inspect: "`label`, `body`, `kind`",
    focus:
      "regulation / law / policy / ban. A fielding rule that names who can operate is usually policy or regulation. A prohibition is a ban. Keep the player's `kind` if the text is flavor and does not clearly pick another.",
  },
  criteria: {
    regulation: { what: "A named regulation or permit/operating rule" },
    law: { what: "A statute or ordinance with legal force" },
    policy: { what: "Local policy, contract, or board rule" },
    ban: { what: "A prohibition — cannot field or must not do X" },
  },
};

export const LOBBY_EFFECT_NOULS = {
  "share-required": {
    instructions: {
      question:
        "Does this rule require a surplus share, paid skill, or meaning-and-pay that reaches workers here?",
      inspect: "`label`, `body`",
      focus:
        "Yes if the rule says surplus, crew pay, a cut, rent cover, or paid training must land. Flavor text without that bite is no.",
    },
    criteria: {
      true: { what: "share-required weather" },
      false: { what: "No share/bridge requirement" },
    },
  },
  "eval-required": {
    instructions: {
      question:
        "Does this rule require a reachable human override, eval, or audit — a person can still take the last call?",
      inspect: "`label`, `body`",
    },
    criteria: {
      true: { what: "eval-required weather" },
      false: { what: "No override/eval requirement" },
    },
  },
  backlash: {
    instructions: {
      question:
        "Should violating this weather inflame public support (backlash) if machines eat shifts or lock the last call?",
      inspect: "`label`, `body`",
    },
    criteria: {
      true: { what: "backlash if the invent ignores this weather" },
      false: { what: "No support-meter backlash from this rule" },
    },
  },
};

export const RULE_KIND_LIST = RULE_KINDS;
export const RULE_EFFECT_LIST = RULE_EFFECTS;

/**
 * @param {string} techId
 */
export function addTechQuestionId(techId) {
  const id = String(techId || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .slice(0, 40);
  return id ? `add_${id}` : "";
}

/**
 * Mentioned catalog techs in free text (over-find; TypeSafe selects).
 * @param {string} text
 * @param {{ id?: string, name?: string }[]} techs
 * @param {number} [cap]
 */
export function mentionTechCandidates(text, techs = [], cap = 8) {
  const blob = String(text || "").toLowerCase();
  if (!blob) return [];
  const out = [];
  const seen = new Set();
  for (const tech of techs) {
    const id = String(tech?.id || "").trim();
    if (!id || seen.has(id)) continue;
    const name = String(tech?.name || "").toLowerCase();
    let hit = false;
    if (id.length >= 4 && blob.includes(id)) hit = true;
    if (!hit && name.length >= 4 && blob.includes(name)) hit = true;
    if (!hit && id.length >= 2 && id.includes("-")) {
      const re = new RegExp(`\\b${id.replace(/-/g, "[- ]")}\\b`, "i");
      hit = re.test(blob);
    }
    if (!hit) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * @param {string} intent
 * @param {number} confidence
 */
export function composeChatIntent(intent, confidence) {
  const id = String(intent || "none");
  const ok = CHAT_INTENT_IDS.includes(id) ? id : "none";
  return {
    intent: ok,
    uncertain: choiceIsUncertain(confidence),
  };
}

/**
 * Filter proposed ids to TypeSafe yes. Uncertain / no are dropped.
 * @param {string[]} proposed
 * @param {Record<string, boolean|null>} flags — techId → true/false/null
 */
export function composeAddTechIds(proposed, flags = {}) {
  const out = [];
  const seen = new Set();
  for (const raw of proposed || []) {
    const id = String(raw || "");
    if (!id || seen.has(id)) continue;
    if (flags[id] === true) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * @param {Record<string, boolean|null>} effectFlags
 */
export function composeLobbyEffects(effectFlags = {}) {
  const out = [];
  for (const id of RULE_EFFECTS) {
    if (effectFlags[id] === true) out.push(id);
  }
  return out;
}

/**
 * @param {string} choiceKind
 * @param {number} confidence
 * @param {string} fallbackKind
 */
export function composeLobbyKind(choiceKind, confidence, fallbackKind = "policy") {
  const k = String(choiceKind || "").toLowerCase();
  if (RULE_KINDS.includes(k) && !choiceIsUncertain(confidence)) return k;
  const fb = String(fallbackKind || "policy").toLowerCase();
  return RULE_KINDS.includes(fb) ? fb : "policy";
}
