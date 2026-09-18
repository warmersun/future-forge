/**
 * TypeSafe honesty rubric + thresholds.
 * Review this file when lamps or Budget disagree with an invent.
 * Code composes the four Nouls; do not fold them into one classifier.
 */

export const NOUL_UNCERTAIN_LOW = 0.3;
export const NOUL_UNCERTAIN_HIGH = 0.7;

export const HONESTY_NOUL_IDS = [
  "mechanism",
  "purePolicy",
  "shareBridge",
  "evalOverride",
];

/**
 * Four independent yes/no judgments. Paths refer to the TypeSafe `state` object.
 * Bare "UBI" is not a share bridge. A smarter model is not a reachable override.
 */
export const HONESTY_NOULS = {
  mechanism: {
    instructions: {
      question:
        "Does `pathway.howText` name a fieldable capability — a device, protocol, workflow, or other mechanism that can operate in this place this year — rather than only a statute?",
      inspect: "`pathway.howText`",
      focus:
        "Yes if something can be fielded here: a device, model, score, sorter, radio, pump, kit, logged eval, override, or wallet. Robots on the aisle count. A statute with no operating thing does not.",
    },
    criteria: {
      true: {
        what: "Names a fieldable capability mechanism",
        examples: [
          "Leak sensors page the pump crew before the tank runs dry.",
          "Aisle robots finish the easy shelves.",
          "A trauma model scores the belly and writes the discharge.",
          "A logged override Ramirez can still fire with two fingers.",
        ],
      },
      false: {
        what: "No fieldable mechanism — only a rule, bill, ban, treaty, or empty hope",
        examples: [
          "The council passes universal basic income this year.",
          "Ban superintelligence worldwide.",
        ],
      },
    },
  },
  purePolicy: {
    instructions: {
      question:
        "Is `pathway.howText` only passing, enacting, or adopting a law, ban, UBI bill, or treaty — not an invent?",
      inspect: "`pathway.howText`",
      focus:
        "Yes only when the whole invent is a statute. If a capability is also fielded here, this is not only a statute.",
    },
    criteria: {
      true: {
        what: "The how-text is only a law, ban, UBI bill, ordinance, or treaty",
        examples: [
          "Pass UBI for the warehouse crew.",
          "The UN adopts a treaty pausing all frontier AI.",
        ],
      },
      false: {
        what: "An invent is present, or the text is not a statute at all",
        not_for: "A fielding rule that still names a capability",
        examples: [
          "Sorter surplus hits the crew wallet on Friday so Maya's rent clears.",
          "A logged override button on the trauma model lets Ramirez outvote a green discharge.",
        ],
      },
    },
  },
  shareBridge: {
    instructions: {
      question:
        "Does `pathway.howText` name a surplus share, paid skill, income bridge, or meaning-and-pay that actually reaches the people in the scene?",
      inspect: "`pathway.howText`",
      focus:
        "Bare 'UBI' or 'pass a law' is not enough. Yes if pay, cash, a cut, rent cover, paid training, or a wallet actually lands on named people here from this invent. The word 'surplus' is not required.",
    },
    criteria: {
      true: {
        what: "Surplus, cash, paid training, or meaning-and-pay reaches named people here",
        examples: [
          "Sorter surplus hits the crew wallet this Friday so Maya's rent clears.",
          "Paid training hour before the heat peaks.",
          "Pay the packers a cut of the night's sort.",
          "Friday cash from the sort covers Maya's rent.",
        ],
      },
      false: {
        what: "Faster machines only, or a statute with no share that lands",
        examples: [
          "Aisle robots finish the easy shelves faster than Maya can stretch.",
          "Pass UBI for everyone.",
        ],
      },
    },
  },
  evalOverride: {
    instructions: {
      question:
        "Does `pathway.howText` name a reachable human override, eval, or audit — a path a person can still take the last call — not only a smarter locked model?",
      inspect: "`pathway.howText`",
      focus:
        "Yes if a named person can refuse, outvote, unlock, tripwire, or a logged eval/audit travels with the model. A more accurate score that still writes the discharge is not enough.",
    },
    criteria: {
      true: {
        what: "A human can still take the last call, or eval/audit is reachable",
        examples: [
          "A logged override Ramirez can still fire with two fingers when the belly is tight.",
          "Ramirez can still refuse the discharge when the belly is tight.",
        ],
      },
      false: {
        what: "A smarter score or model still locks the last call",
        examples: [
          "A better trauma model scores the belly.",
          "A more accurate trauma score writes the discharge path.",
        ],
      },
    },
  },
};

/**
 * Map a noul probability to yes / no / uncertain.
 * Inclusive band: p in [low, high] is uncertain.
 * @param {number} p
 * @param {number} [low]
 * @param {number} [high]
 * @returns {"yes"|"no"|"uncertain"}
 */
export function noulDecision(
  p,
  low = NOUL_UNCERTAIN_LOW,
  high = NOUL_UNCERTAIN_HIGH
) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "uncertain";
  if (n < low) return "no";
  if (n > high) return "yes";
  return "uncertain";
}

/**
 * @param {"yes"|"no"|"uncertain"} decision
 * @returns {boolean|null} null = uncertain
 */
export function decisionToFlag(decision) {
  if (decision === "yes") return true;
  if (decision === "no") return false;
  return null;
}
