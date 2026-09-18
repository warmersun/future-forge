/**
 * TypeSafe score-pathway Choices + canned reasons + confidence floor.
 * Review this file when lamps or Budget disagree with an invent.
 * Honesty Nouls stay in honesty-questions.js; code still clamps after these Choices.
 */

import { CRISIS_ROLES, clipCrisisReason } from "../hex/crisis-delta.js";

/** Cookbook 0.5 is a starting point; wrong Budget grant is the expensive error. */
export const CHOICE_CONFIDENCE_FLOOR = 0.45;

export const DELTA_LABELS = ["ease2", "ease1", "none", "worsen"];

export const DELTA_LABEL_TO_INT = {
  ease2: -2,
  ease1: -1,
  none: 0,
  worsen: 1,
};

export const CRISIS_DELTA_QUESTION_IDS = {
  local: "delta_local",
  global: "delta_global",
  support: "delta_support",
};

export const CONCERN_LEVELS = ["red", "yellow", "green"];

const ROLE_FOCUS = {
  local: {
    meaning: "here-and-now relief in this place",
    inspect: "`crisisRoles` entries whose `role` is local, plus `pathway.howText`",
  },
  global: {
    meaning: "the root cause / driver, not only shelter from it",
    inspect: "`crisisRoles` entries whose `role` is global, plus `pathway.howText`",
  },
  support: {
    meaning: "public buy-in and scale beyond a pilot",
    inspect: "`crisisRoles` entries whose `role` is support, plus `pathway.howText`",
  },
};

const DELTA_CRITERIA = {
  ease2: {
    what: "Strong honest relief (delta −2)",
    not_for: "A thin mention, a statute, or a worsen",
    examples: [
      "A named mechanism clearly cuts this meter in this place this year.",
    ],
  },
  ease1: {
    what: "Honest but partial relief (delta −1)",
    not_for: "Docking with no mechanism, or a law/ban/UBI as the invent",
    examples: [
      "The how-text names a real mechanism that can ease this meter some.",
    ],
  },
  none: {
    what: "No honest change (delta 0) — missing mechanism for this meter",
    not_for: "A real here-and-now (local) or driver (global) cut",
    examples: [
      "The how-text does not name what becomes abundant for this meter.",
    ],
  },
  worsen: {
    what: "The invent makes this meter worse (delta +1)",
    not_for: "Mere omission",
    examples: [
      "A reactor or hostile stack raises public-support pressure.",
      "Faster machines without a share inflame rent and dignity (support).",
    ],
  },
};

const CONCERN_CRITERIA = {
  red: {
    what: "Unanswered, docking-only, or the pathway does not address this critic",
    not_for: "A written answer or invent change that honestly holds the question",
    examples: ["No playerAnswer and the invent is unchanged since this critic was posed."],
  },
  yellow: {
    what: "Partial honest address — some of the question, not the whole hold",
    not_for: "Docking with no substance, or a full honest hold",
  },
  green: {
    what: "The pathway honestly holds this critic's question",
    not_for: "A weaker invent lucking into a better lamp, or docking alone",
  },
};

const CANNED_DELTA = {
  local: {
    [-2]: "The how-text names a strong here-and-now mechanism that can ease this meter.",
    [-1]: "There is a local mechanism on the page.",
    [0]: "Nothing in the how-text names here-and-now relief for this meter.",
    [1]: "This invent makes the local situation harder.",
  },
  global: {
    [-2]: "The how-text cuts the driver, not only the shelter.",
    [-1]: "The how-text touches the root cause.",
    [0]: "Nothing names a mechanism that changes the driver.",
    [1]: "This invent feeds the root cause.",
  },
  support: {
    [-2]: "People could field this and defend it in public.",
    [-1]: "The how-text is specific enough that people could field it.",
    [0]: "Nothing here earns buy-in beyond a pilot.",
    [1]: "This stack is something people will not want next door.",
  },
};

const CANNED_CONCERN = {
  red: "Still unanswered — docking is not enough.",
  yellow: "Partial honest address — the critic is not fully held.",
  green: "The pathway honestly holds this critic's question.",
};

/**
 * @param {string} role
 */
export function crisisDeltaQuestion(role) {
  const r = String(role || "");
  const focus = ROLE_FOCUS[r] || ROLE_FOCUS.local;
  return {
    instructions: {
      question: `How much does this pathway change the ${r} crisis meter?`,
      meaning: focus.meaning,
      inspect: focus.inspect,
      focus:
        "Judge the combination as ONE invent (`pathway.howText` + `pathway.inventions[]`). Negative eases that meter if the pathway docks it. Positive worsens it. 0 means the mechanism for this meter is missing. A law, ban, UBI bill, or treaty is not an invent. If a crisis role has a description, that text is what the meter means here.",
    },
    criteria: DELTA_CRITERIA,
  };
}

/**
 * @param {{ angle?: string, challengeSpeech?: string, challengeQuestion?: string }} concern
 */
export function concernLampQuestion(concern = {}) {
  const angle = String(concern.angle || "this critic");
  return {
    instructions: {
      question: `Does this pathway honestly answer the ${angle} critic?`,
      inspect:
        "`concerns` row for this angle (`challengeSpeech`, `challengeQuestion`, `playerAnswer`, `posedHowText`, `inventChanged`) plus `pathway.howText`",
      focus:
        "Docking or touching is not addressing. Improve yellow/green only if the new pathway honestly answers this critic better than `posedHowText`. Weakening the invent must not luck into a better lamp. Green only if the pathway holds the answer.",
    },
    criteria: CONCERN_CRITERIA,
  };
}

/**
 * @param {string} angle
 */
export function concernQuestionId(angle) {
  const a = String(angle || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return a ? `concern_${a}` : "";
}

/**
 * @param {string} role
 * @param {number} delta
 */
export function cannedDeltaReason(role, delta) {
  const table = CANNED_DELTA[role] || CANNED_DELTA.local;
  const n = Number(delta) || 0;
  return clipCrisisReason(table[n] || table[0]);
}

/**
 * @param {string} level
 */
export function cannedConcernReason(level) {
  const lv = String(level || "red").toLowerCase();
  return String(CANNED_CONCERN[lv] || CANNED_CONCERN.red).slice(0, 280);
}

/**
 * @param {number} confidence
 * @param {number} [floor]
 */
export function choiceIsUncertain(
  confidence,
  floor = CHOICE_CONFIDENCE_FLOOR
) {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return true;
  return n < floor;
}

/**
 * Map a Choice label to a crisis delta integer.
 * @param {string} label
 * @returns {number|null}
 */
export function deltaFromChoiceLabel(label) {
  if (Object.prototype.hasOwnProperty.call(DELTA_LABEL_TO_INT, label)) {
    return DELTA_LABEL_TO_INT[label];
  }
  const n = Number(label);
  if (n === -2 || n === -1 || n === 0 || n === 1) return n;
  return null;
}

export { CRISIS_ROLES };

/**
 * Force red when the critic is still unanswered and the invent did not change.
 * @param {{ playerAnswer?: string, inventChanged?: boolean }} concern
 */
export function concernForcedRed(concern = {}) {
  const hasAnswer = Boolean(String(concern.playerAnswer || "").trim());
  return !concern.inventChanged && !hasAnswer;
}
