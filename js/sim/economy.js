/**
 * G2 Budget + political will helpers (DOM-free).
 * Never use state.trust as a player resource — crisis meters may still be named "Trust".
 */

/** Sparse overrides after playtest */
export const TECH_COST_OVERRIDES = {
  // examples kept empty for default formula balance
};

/**
 * Base emTech cost (no market modifiers).
 * @param {object} t — tech from TECHS
 * @returns {{ budget: number, will: number, frontierRisk: number }}
 */
export function baseTechCost(t) {
  if (!t) return { budget: 1, will: 0, frontierRisk: 0 };
  const overrides = TECH_COST_OVERRIDES[t.id];
  if (overrides) return { ...overrides };

  let budget = 1; // mature and steep default
  let will = 0;
  let frontierRisk = 0;

  if (t.curve === "early") {
    budget = 2;
    will = 1;
    frontierRisk = 1;
  }
  const ready = t.readyYear || 2026;
  if (ready >= 2030) {
    budget = Math.max(budget, 3);
    will = Math.max(will, 1);
    frontierRisk = Math.max(frontierRisk, 2);
  } else if (ready >= 2028) {
    frontierRisk = Math.max(frontierRisk, 1);
    budget = Math.max(budget, 2);
  }
  return { budget, will, frontierRisk };
}

/**
 * @param {object} t — tech from TECHS
 * @param {{ market?: object|null }} [opts] — active round market news
 * @returns {{ budget: number, will: number, frontierRisk: number }}
 */
export function techCost(t, opts = {}) {
  const base = baseTechCost(t);
  const market = opts.market ?? opts.marketNews ?? null;
  if (!market) return base;
  // Lazy import avoided — inline floor math so economy stays free of circular deps at load.
  // market-news.applyMarketToCost is the canonical path; keep parity here.
  if (market.all || matchesMarketScope(market, t)) {
    return {
      budget: Math.max(0, base.budget + (Number(market.budgetDelta) || 0)),
      will: Math.max(0, base.will + (Number(market.willDelta) || 0)),
      frontierRisk: base.frontierRisk,
    };
  }
  return base;
}

function matchesMarketScope(market, tech) {
  if (!market || !tech) return false;
  if (market.all) return true;
  const ids = market.techIds || [];
  if (ids.length) return Boolean(tech.id && ids.includes(tech.id));
  const domains = market.domains || [];
  if (domains.length) return Boolean(tech.domain && domains.includes(tech.domain));
  return false;
}

/** Half budget refund on same-turn remove (will not refunded). */
export function techBudgetRefund(cost) {
  return Math.floor((cost?.budget || 0) / 2);
}

/**
 * Cost to field / deploy the invention (on top of tech acquisition).
 * Theme: robots in a village still need install, training, ops money.
 *
 * @param {object[]} techs
 * @param {{ will?: number }} [opts]
 * @returns {{ ap: number, budget: number, parts: { id: string, label: string, amount: number }[] }}
 */
export function deployActionCost(techs = [], opts = {}) {
  const will = Number(opts.will) || 0;
  const parts = [];
  let budget = 1;
  parts.push({ id: "base", label: "Field rollout (base)", amount: 1 });

  if (techs.length >= 3) {
    budget += 1;
    parts.push({ id: "scale", label: "Larger stack (3+ techs)", amount: 1 });
  }
  if (stackFrontierRisk(techs) >= 3) {
    budget += 1;
    parts.push({ id: "frontier", label: "Frontier / stretch stack ops", amount: 1 });
  }
  if (will >= 4 && budget > 1) {
    budget -= 1;
    parts.push({ id: "mandate", label: "Political will ≥ 4 (funding help)", amount: -1 });
  }

  return {
    ap: 1,
    budget: Math.max(1, budget),
    parts,
  };
}

/**
 * Cost to scale a successful pilot city-wide / program-wide.
 * Uses capital + political will (Resources dim), not only attention.
 *
 * @param {object[]} techs
 * @param {{ will?: number }} [opts]
 * @returns {{ ap: number, budget: number, will: number, parts: { id: string, label: string, amount: number }[] }}
 */
export function scaleActionCost(techs = [], opts = {}) {
  const will = Number(opts.will) || 0;
  const parts = [];
  let budget = 1;
  parts.push({ id: "scale_base", label: "Scale rollout (base)", amount: 1 });

  if (techs.length >= 3) {
    budget += 1;
    parts.push({ id: "scale_stack", label: "Larger stack (3+ techs)", amount: 1 });
  }
  if (stackFrontierRisk(techs) >= 3) {
    budget += 1;
    parts.push({ id: "scale_frontier", label: "Frontier scale ops", amount: 1 });
  }

  let willCost = 1;
  parts.push({ id: "scale_will", label: "Political will to expand", amount: 1 });
  if (will >= 4) {
    willCost = 0;
    parts.push({ id: "scale_mandate", label: "Will ≥ 4 (mandate covers expansion)", amount: -1 });
  }

  if (will >= 4 && budget > 1) {
    budget -= 1;
    parts.push({ id: "scale_funding", label: "Will ≥ 4 (funding help)", amount: -1 });
  }

  return {
    ap: 1,
    budget: Math.max(1, budget),
    will: Math.max(0, willCost),
    parts,
  };
}

/**
 * G2 deploy modifiers on top of baseline drop.
 * @param {number} drop
 * @param {number} will
 * @returns {{ drop: number, parts: { id: string, label: string, amount: number }[] }}
 */
export function applyG2DeployDeltas(drop, will) {
  const parts = [];
  let d = drop;
  if (will >= 4) {
    d += 1;
    parts.push({ id: "mandate", label: "Political will ≥ 4 (mandate)", amount: 1 });
  }
  if (will === 0) {
    d = Math.max(0, d - 1);
    parts.push({ id: "no_mandate", label: "Political will 0 (no mandate)", amount: -1 });
  }
  return { drop: d, parts };
}

/** Deterministic PRNG for frontier risk ticks */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Sum frontierRisk on stack techs.
 * @param {object[]} techs
 */
export function stackFrontierRisk(techs) {
  return (techs || []).reduce((sum, t) => sum + (techCost(t).frontierRisk || 0), 0);
}

/**
 * Maybe apply frontier risk tick on Wait (mutates nothing — returns new pressure or null).
 * @returns {{ pressure: Record<string,number>, meter: string } | null}
 */
export function maybeFrontierRiskTick(pressure, techs, stretchLevel, seedStr) {
  if (stackFrontierRisk(techs) < 3) return null;
  if (stretchLevel !== "yellow" && stretchLevel !== "red") return null;
  const rng = mulberry32(hashSeed(seedStr));
  if (rng() >= 0.2) return null;
  const keys = Object.keys(pressure || {});
  if (!keys.length) return null;
  const ordered = [...keys].sort((a, b) => (pressure[b] ?? 0) - (pressure[a] ?? 0));
  const meter = ordered[0];
  const next = { ...pressure };
  next[meter] = Math.min(5, (next[meter] ?? 0) + 1);
  return { pressure: next, meter };
}
