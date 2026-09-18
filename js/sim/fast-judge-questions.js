/**
 * TypeSafe questions for fast-eval judges other than score-pathway.
 * Review this file when timing lamps, challenge verdicts, or convergence disagree.
 * Code owns composition (red-only-if, damage, priorTiming). Grok copy stays only
 * when it matches the locked verdict.
 */

import {
  claimTimingFingerprint,
  clampTimingForYearAdvance,
} from "./deploy.js";
import {
  NOUL_UNCERTAIN_HIGH,
  NOUL_UNCERTAIN_LOW,
  decisionToFlag,
  noulDecision,
} from "./honesty-questions.js";
import {
  CHOICE_CONFIDENCE_FLOOR,
  choiceIsUncertain,
} from "./pathway-questions.js";

export { CHOICE_CONFIDENCE_FLOOR, choiceIsUncertain, noulDecision, decisionToFlag };

export const FEASIBILITY_NOUL_IDS = [
  "groundingForbid",
  "sciFiRoutine",
  "demonstratedByYear",
];

export const FEASIBILITY_NOULS = {
  groundingForbid: {
    instructions: {
      question:
        "Does `grounding` explicitly forbid this claim, deny it, or say it is not yet possible in `year`?",
      inspect: "`grounding`, `inventionHow`, `year`",
      focus:
        "Yes only on an explicit limit, denial, or \"not yet\" that the claim violates. Omission is not a contradiction. A smaller example in grounding (hoppers, medical boxes) does not cap a larger demonstrated payload. Quest fit and clinic job are not timing.",
    },
    criteria: {
      true: {
        what: "Grounding explicitly contradicts the claim for this year",
        examples: ["Grounding says the architecture is not yet possible in 2026."],
      },
      false: {
        what: "No explicit contradiction — omission or a different example is not a forbid",
      },
    },
  },
  sciFiRoutine: {
    instructions: {
      question:
        "Does `inventionHow` treat sci-fi as routine this year — consumer flying cars, mind upload, unlimited free energy, teleport, or similar?",
      inspect: "`inventionHow`, `year`",
      focus:
        "Yes only if the how-text treats those as ordinary fielded capability now. A supervised pilot of a near-term stack is not sci-fi.",
    },
    criteria: {
      true: {
        what: "Sci-fi treated as routine this year",
        examples: [
          "Upload consciousness for every resident.",
          "Consumer flying cars as daily transit in 2026.",
        ],
      },
      false: {
        what: "Near-term or pilot-honest, even if ambitious",
      },
    },
  },
  demonstratedByYear: {
    instructions: {
      question:
        "Is this architecture and payload already demonstrated, or honestly possible, in `year`?",
      inspect: "`inventionHow`, `stack`, `year`, `grounding`",
      focus:
        "Green-path: existence proof by year, no pilot tax. Grounding examples are existence proofs, not a closed inventory. Vague claims are not demonstrated.",
    },
    criteria: {
      true: {
        what: "Architecture + payload exists or is demonstrated by this year",
      },
      false: {
        what: "Vague, or this scale is not yet demonstrated this year",
      },
    },
  },
};

export const FEASIBILITY_TIMING_CHOICE = {
  instructions: {
    question: "What timing lamp does this claim deserve in `year`?",
    inspect: "`inventionHow`, `stack`, `grounding`, `year`",
    focus:
      "red only if grounding explicitly forbids / not-yet, or sci-fi treated as routine. green if architecture+payload is demonstrated by year. yellow if vague or the claimed scale is not yet demonstrated. Never red or yellow merely for a different category than a small hopper.",
  },
  criteria: {
    green: {
      what: "Demonstrated or honestly possible this year",
      not_for: "Sci-fi as routine, or an explicit grounding forbid",
    },
    yellow: {
      what: "Vague, or this scale is not yet demonstrated",
      not_for: "A clear existence proof this year",
    },
    red: {
      what: "Explicit grounding forbid/not-yet, or sci-fi treated as routine",
      not_for: "Different category or not a small hopper",
    },
  },
};

export const CANNED_FEASIBILITY = {
  grounding:
    "Grounding explicitly forbids this claim or says it is not yet possible this year.",
  scifi:
    "How-it-works treats sci-fi as routine this year — revise toward a demonstrated or pilot-honest mechanism.",
  demonstrated:
    "Architecture and payload exist or are demonstrated by this year.",
  undemonstrated:
    "The claim is vague, or this scale is not yet demonstrated this year.",
  short: "Need a clearer how-it-works to judge claim timing for this year.",
};

export const SCRUTINY_QUALITY_CHOICE = {
  instructions: {
    question:
      "How well does `playerAnswer` answer this critic (`challengeSpeech` / `challengeQuestion`)?",
    inspect: "`playerAnswer`, `challengeQuestion`, `challengeSpeech`, `pathway`",
    focus:
      "hit = concrete actors, costs, limits, or mechanics that answer the question. glance = partial. miss = vague or off-topic. Be strict on freeriding and handwaving.",
  },
  criteria: {
    hit: {
      what: "Concrete actors/costs/limits/mechanics that answer this question",
    },
    glance: {
      what: "Some substance, not a full answer",
    },
    miss: {
      what: "Vague, off-topic, or too short",
    },
  },
};

export const CHALLENGE_VERDICT_CHOICE = {
  instructions: {
    question:
      "Does `playerAnswer` survive this challenge together with the docked pathway?",
    inspect: "`playerAnswer`, `challengeQuestion`, `challengeSpeech`, `pathway`",
    focus:
      "pass/partial need concrete mechanisms, named actors, costs, or physical limits. Vague hope is fail. Judge the writing with the whole pathway. Docking is not required to score the writing.",
  },
  criteria: {
    pass: {
      what: "Concrete counter-move that holds the question",
    },
    partial: {
      what: "Some mechanism, not enough to fully hold",
    },
    fail: {
      what: "Vague hope or off-topic",
    },
  },
};

export const CANNED_SCRUTINY = {
  hit: "That names a real mechanism — the challenge takes a solid hit.",
  glance: "Some substance — not enough to end the attack.",
  miss: "Too vague for this critic — try actors, costs, or hard limits.",
};

export const CANNED_CHALLENGE = {
  pass: "Solid. You named a real counter-move.",
  partial: "Partial credit — more specificity would help.",
  fail: "Too vague — name a concrete actor, cost, or physical limit.",
};

export const CANNED_CHALLENGE_LESSON = {
  pass: "Good inventions survive hostile questions.",
  partial: "Challenges need mechanisms, not hopes — you are partway there.",
  fail: "Challenges need mechanisms, not hopes.",
};

export const CONTRIBUTION_NOUL = {
  instructions: {
    question:
      "Is `afterText` additive relative to `beforeText` on this field — does it keep original substance and layer detail?",
    inspect: "`beforeText`, `afterText`, `field`",
    focus:
      "Yes if it keeps original substance and extends it. No if it rewrites, clears, or strips core meaning. Prefer additive when it complements rather than guts.",
  },
  criteria: {
    true: { what: "Keeps original substance and layers detail" },
    false: { what: "Destructive rewrite, clear, or strip" },
  },
};

export const CANNED_CONTRIBUTION = {
  true: "Keeps original substance and extends it.",
  false: "Clears or guts the original — destructive.",
};

export const CONVERGENCE_NOUL = {
  instructions: {
    question:
      "Do these two adjacent inventions form a demand loop: progress in one honestly accelerates the other, AND more or better of the second pulls demand back onto the first?",
    inspect: "`placed`, `neighbor`, `year`",
    focus:
      "True only for a tech-to-tech loop (capability, cost, or scale), not generic synergy, \"both are tech,\" or a clinic-job unlock. Place/year may color one use but must not replace the loop.",
  },
  criteria: {
    true: {
      what: "A → B improves, and more/better B pulls demand for A",
      examples: [
        "Better light high-capacity batteries → better drones; more drones → more demand for those batteries.",
      ],
    },
    false: {
      what: "No honest demand loop — adjacent or similar is not enough",
    },
  },
};

/**
 * @param {string} neighborId
 */
export function convergeQuestionId(neighborId) {
  const a = String(neighborId || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return a ? `converge_${a}` : "";
}

/**
 * @param {string} nameA
 * @param {string} nameB
 */
export function cannedConvergenceCopy(nameA, nameB) {
  const na = String(nameA || "one field");
  const nb = String(nameB || "the other");
  return {
    title: `${na} × ${nb}`.slice(0, 60),
    reason: `Progress in ${na} honestly accelerates ${nb} — better capability, cost, or scale. More or better ${nb} then pulls demand back onto ${na}.`,
  };
}

const TIMING_RANK = { green: 0, yellow: 1, red: 2 };

/**
 * Compose a timing lamp from Nouls + optional Choice, then honor priorTiming.
 * Red only on a *certain* grounding forbid or sci-fi-as-routine.
 * @param {{ groundingForbid?: number, sciFiRoutine?: number, demonstratedByYear?: number }} nouls
 * @param {{ choice?: string, confidence?: number }|null} timingChoice
 * @param {{ priorTiming?: object, year?: *, inventionHow?: string, techIds?: string[] }} [opts]
 */
export function composeFeasibilityTiming(nouls = {}, timingChoice = null, opts = {}) {
  const forbid = noulDecision(nouls.groundingForbid);
  const scifi = noulDecision(nouls.sciFiRoutine);
  const demo = noulDecision(nouls.demonstratedByYear);

  if (!(opts.techIds || []).length) {
    return {
      level: "red",
      reason: "Add at least one technology to the stack.",
      reasonKey: "nostack",
      nouls: {
        groundingForbid: noulDecision(nouls.groundingForbid),
        sciFiRoutine: noulDecision(nouls.sciFiRoutine),
        demonstratedByYear: noulDecision(nouls.demonstratedByYear),
      },
    };
  }

  let level = "yellow";
  let reasonKey = "undemonstrated";
  if (forbid === "yes") {
    level = "red";
    reasonKey = "grounding";
  } else if (scifi === "yes") {
    level = "red";
    reasonKey = "scifi";
  } else if (demo === "yes") {
    level = "green";
    reasonKey = "demonstrated";
  } else if (demo === "uncertain" && timingChoice) {
    const cl = String(timingChoice.choice || "").toLowerCase();
    if (cl === "green" && !choiceIsUncertain(timingChoice.confidence)) {
      level = "green";
      reasonKey = "demonstrated";
    } else if (cl === "red") {
      level = "yellow";
      reasonKey = "undemonstrated";
    }
  }

  const how = String(opts.inventionHow || "").trim();
  if (how.length < 20 && level === "green") {
    level = "yellow";
    reasonKey = "short";
  }

  const fingerprint = claimTimingFingerprint(how, opts.techIds || []);
  const prior = opts.priorTiming || {};
  level = clampTimingForYearAdvance({
    newLevel: level,
    priorLevel: prior.level,
    fingerprint,
    priorFingerprint: prior.fingerprint,
    year: opts.year,
    priorYear: prior.year,
  });

  return {
    level,
    reason: CANNED_FEASIBILITY[reasonKey] || CANNED_FEASIBILITY.undemonstrated,
    reasonKey,
    nouls: {
      groundingForbid: forbid,
      sciFiRoutine: scifi,
      demonstratedByYear: demo,
    },
  };
}

/**
 * @param {string} quality
 * @param {number} [confidence]
 */
export function composeScrutinyQuality(quality, confidence) {
  let q = String(quality || "").toLowerCase();
  if (!["hit", "glance", "miss"].includes(q)) q = "miss";
  if (choiceIsUncertain(confidence) && q === "hit") q = "glance";
  const damage = q === "hit" ? 2 : q === "glance" ? 1 : 0;
  return { quality: q, damage, message: CANNED_SCRUTINY[q] };
}

/**
 * @param {string} verdict
 * @param {number} [confidence]
 */
export function composeChallengeVerdict(verdict, confidence) {
  let v = String(verdict || "").toLowerCase();
  if (!["pass", "partial", "fail"].includes(v)) v = "partial";
  if (choiceIsUncertain(confidence) && v === "pass") v = "partial";
  return {
    verdict: v,
    message: CANNED_CHALLENGE[v],
    lesson: CANNED_CHALLENGE_LESSON[v],
  };
}

/**
 * Uncertain additive noul keeps the incoming Grok/local flag.
 * A clear shorten/clear is destructive in code even if the noul is mushy.
 * @param {number} noul
 * @param {boolean|null} [fallback]
 * @param {{ beforeText?: string, afterText?: string }} [opts]
 */
export function composeContributionAdditive(noul, fallback = true, opts = {}) {
  const before = String(opts.beforeText || "").trim();
  const after = String(opts.afterText || "").trim();
  if (before.length >= 12 && (!after || after.length < before.length * 0.55)) {
    return { additive: false, reason: CANNED_CONTRIBUTION.false };
  }
  const d = noulDecision(noul);
  if (d === "yes") return { additive: true, reason: CANNED_CONTRIBUTION.true };
  if (d === "no") return { additive: false, reason: CANNED_CONTRIBUTION.false };
  return {
    additive: fallback !== false,
    reason: CANNED_CONTRIBUTION.true,
    uncertain: true,
  };
}

export { TIMING_RANK, NOUL_UNCERTAIN_LOW, NOUL_UNCERTAIN_HIGH };
