/**
 * Sustainable feasibility dim — does the invent address why the crisis keeps
 * happening, or only how people shelter from it?
 * Rules-only v1 (no AI). Used for Scale odds with the Scale dim.
 */

/** Techs that mostly protect / sense exposure without cutting the driver. */
export const SHELTER_TECH_IDS = new Set([
  "materials",
  "iot",
  "print3d",
  "vr",
  "bci",
  "nano",
]);

/** Techs that can cut or replace a source / driver when the story says so. */
export const ABATEMENT_TECH_IDS = new Set([
  "solar",
  "wind",
  "wave",
  "tidal",
  "geothermal",
  "nuclear",
  "battery",
  "energy",
  "self-driving",
  "transportation",
  "drones",
  "networks",
  "ai",
  "computing",
  "crypto",
  "synbio",
  "genetic-engineering",
  "gene-sequencing",
  "robots",
  "space",
  "quantum",
  "quantum-internet",
  "alt-proteins",
]);

/**
 * Per-theme depth metadata (merged onto GLOBALS via themeDepthFor).
 * depthCharacter: source | acute | access | coord
 */
export const THEME_DEPTH = {
  air: {
    depthCharacter: "source",
    causeHints: [
      "truck",
      "corridor",
      "exhaust",
      "idle",
      "cook",
      "charcoal",
      "stove",
      "fuel",
      "stack",
      "ship",
      "port",
      "particulate",
      "emission",
      "smokestack",
      "diesel",
      "traffic",
      "industry",
    ],
    shelterHints: [
      "filter",
      "indoor",
      "seal",
      "insulation",
      "insulat",
      "shelter",
      "ppe",
      "mask",
      "hvac",
      "purif",
      "window",
      "school room",
    ],
  },
  climate: {
    depthCharacter: "source",
    causeHints: [
      "emission",
      "coal",
      "diesel",
      "fossil",
      "methane",
      "flaring",
      "grid",
      "drain",
      "runoff",
      "heat island",
      "deforestation",
    ],
    shelterHints: ["sandbag", "evacuate", "shelter", "cooling center", "raise floor", "filter"],
  },
  "short-termism": {
    depthCharacter: "source",
    causeHints: [
      "slaughter",
      "liquidate",
      "sell off",
      "credit",
      "loan",
      "discount rate",
      "harvest now",
      "clear-cut",
      "short-term",
      "quarterly",
    ],
    shelterHints: ["relief", "ration", "food aid", "temporary", "bailout only"],
  },
  misinfo: {
    depthCharacter: "source",
    causeHints: [
      "amplif",
      "deepfake",
      "bot",
      "feed",
      "engagement",
      "pipeline",
      "virality",
      "recommend",
    ],
    shelterHints: ["fact.?check poster", "ignore", "block only", "shelter from news"],
  },
  weather: {
    depthCharacter: "acute",
    causeHints: ["heat", "flood", "storm", "drought", "drain", "embankment"],
    shelterHints: ["evacuate", "shelter", "sandbag", "cooling"],
  },
  water: {
    depthCharacter: "access",
    causeHints: ["leak", "theft", "tariff", "pipe", "aquifer", "pump", "ration"],
    shelterHints: ["jerrycan", "queue", "bottle", "tank only"],
  },
  "energy-access": {
    depthCharacter: "access",
    causeHints: ["diesel", "tariff", "grid", "theft", "mini-grid", "meter"],
    shelterHints: ["candle", "lantern", "one clinic generator only"],
  },
  infectious: {
    depthCharacter: "acute",
    causeHints: ["transmission", "outbreak", "vector", "cold chain", "wastewater"],
    shelterHints: ["ppe", "isolate", "lockdown only"],
  },
  // Spark / flood-style starter lives under climate but Portside is acute-feeling;
  // mission-level override possible later. Default climate stays source.
};

const DEFAULT_DEPTH = {
  depthCharacter: "source",
  causeHints: ["cause", "source", "driver", "system", "emission", "leak", "incentive"],
  shelterHints: ["filter", "shelter", "indoor", "seal", "ppe", "temporary", "relief"],
};

const ACUTE_DEFAULT = {
  depthCharacter: "acute",
  causeHints: [],
  shelterHints: [],
};

/**
 * @param {string|object|null|undefined} globalOrId
 * @param {object|null} [mission]
 */
export function themeDepthFor(globalOrId, mission = null) {
  const id =
    typeof globalOrId === "string"
      ? globalOrId
      : globalOrId?.id || mission?.globalId || "";
  // Spark flagship: protection-honest acute board
  if (mission?.id === "portside-floods") {
    return { ...ACUTE_DEFAULT, depthCharacter: "acute" };
  }
  const row = THEME_DEPTH[id];
  if (row) return { ...DEFAULT_DEPTH, ...row };
  // before-kind catastrophe themes: treat as source (need real leverage)
  if (globalOrId?.kind === "before") {
    return {
      ...DEFAULT_DEPTH,
      depthCharacter: "source",
    };
  }
  return { ...DEFAULT_DEPTH };
}

function countHits(text, hints) {
  const t = String(text || "").toLowerCase();
  if (!t) return 0;
  let n = 0;
  for (const h of hints || []) {
    try {
      if (new RegExp(h, "i").test(t)) n += 1;
    } catch {
      if (t.includes(String(h).toLowerCase())) n += 1;
    }
  }
  return n;
}

/**
 * @param {object} opts
 * @param {object|null} opts.global
 * @param {object|null} opts.mission
 * @param {object[]} opts.techs
 * @param {string} opts.inventionHow
 * @param {string} opts.inventionImpact
 * @param {string} [opts.inventionName]
 * @returns {{ level: "red"|"yellow"|"green", note: string, depthCharacter: string }}
 */
export function assessSustainable(opts) {
  const global = opts.global || null;
  const mission = opts.mission || null;
  const techs = opts.techs || [];
  const depth = themeDepthFor(global || mission?.globalId, mission);
  const character = depth.depthCharacter || "source";

  const inventText = [
    opts.inventionName,
    opts.inventionHow,
    opts.inventionImpact,
  ]
    .filter(Boolean)
    .join("\n");
  const sceneText = [mission?.scene, mission?.title, mission?.place].filter(Boolean).join("\n");
  const blob = `${inventText}\n${sceneText}`;

  const causeHits = countHits(blob, depth.causeHints);
  const inventCauseHits = countHits(inventText, depth.causeHints);
  const shelterHits = countHits(inventText, depth.shelterHints);
  const sceneCauseHits = countHits(sceneText, depth.causeHints);

  const techIds = techs.map((t) => t.id || t);
  const abatementTechs = techIds.filter((id) => ABATEMENT_TECH_IDS.has(id));
  const shelterTechs = techIds.filter((id) => SHELTER_TECH_IDS.has(id));
  const onlyShelterStack =
    techIds.length > 0 &&
    shelterTechs.length === techIds.length &&
    abatementTechs.length === 0;

  // Acute: protection can fully win — don't punish Scale for shelter invents
  if (character === "acute") {
    if (!techIds.length && inventText.trim().length < 20) {
      return {
        level: "yellow",
        note: "Acute crisis — local protection can be lasting enough once you invent.",
        depthCharacter: character,
      };
    }
    return {
      level: "green",
      note: "Acute crisis — helping people here now can be a lasting local fix.",
      depthCharacter: character,
    };
  }

  // Access: delivering supply is on-theme; pure queues/bottles without system = weak
  if (character === "access") {
    if (inventCauseHits >= 1 || abatementTechs.length >= 1 || causeHits >= 2) {
      return {
        level: inventCauseHits >= 1 && abatementTechs.length >= 1 ? "green" : "yellow",
        note:
          inventCauseHits >= 1
            ? "Touches the access system (supply, leaks, tariffs) — can last beyond one delivery."
            : "Some system leverage — strengthen how supply stays on.",
        depthCharacter: character,
      };
    }
    if (shelterHits >= 2 && inventCauseHits === 0) {
      return {
        level: "yellow",
        note: "Mostly one-off relief — Scale wants a system that keeps access open.",
        depthCharacter: character,
      };
    }
    return {
      level: "yellow",
      note: "Access themes need a system that keeps supply flowing — not only a one-time drop.",
      depthCharacter: character,
    };
  }

  // source / coord (default): pure mitigation is not sustainable at Scale
  if (!techIds.length || inventText.trim().length < 15) {
    return {
      level: "red",
      note: "Add a stack and how-it-works that touch why this problem keeps happening.",
      depthCharacter: character,
    };
  }

  const dual =
    inventCauseHits >= 1 &&
    abatementTechs.length >= 1 &&
    (shelterHits === 0 || inventCauseHits >= shelterHits || abatementTechs.length >= 1);

  if (dual && inventCauseHits >= 1 && abatementTechs.length >= 1) {
    const strong = inventCauseHits >= 2 || abatementTechs.length >= 2;
    return {
      level: strong ? "green" : "yellow",
      note: strong
        ? "Invent names a local driver and uses tech that can move it — Scale can last."
        : "Touches the driver — tighten how the source changes to go green on Sustainable.",
      depthCharacter: character,
    };
  }

  if (onlyShelterStack || (shelterHits >= 1 && inventCauseHits === 0)) {
    return {
      level: onlyShelterStack && shelterHits >= 1 ? "red" : "yellow",
      note:
        sceneCauseHits >= 1
          ? "Mostly shelters people from the harm — the local driver is still running. Pilot can help; Scale is weak."
          : "Looks like protection only (filters, seals, indoor safety). That can Pilot; it rarely Scales sustainably.",
      depthCharacter: character,
    };
  }

  if (inventCauseHits >= 1 && abatementTechs.length === 0) {
    return {
      level: "yellow",
      note: "Story mentions a driver, but the stack is light on tech that can change it.",
      depthCharacter: character,
    };
  }

  if (abatementTechs.length >= 1 && inventCauseHits === 0) {
    return {
      level: "yellow",
      note: "Stack could cut a source — say how it changes the local driver in how-it-works.",
      depthCharacter: character,
    };
  }

  return {
    level: "yellow",
    note: "Unclear if this fixes why the crisis keeps happening — name the local driver for a stronger Scale.",
    depthCharacter: character,
  };
}
