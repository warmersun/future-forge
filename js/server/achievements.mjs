/**
 * C2 consumer badges. Server decides; the client never says "I unlocked."
 */

export const ACHIEVEMENT_DEFS = {
  held_pathway: {
    title: "Pathway holds",
    blurb: "You held a pathway before the place fell.",
  },
  first_friends_hold: {
    title: "Held it together",
    blurb: "A Friends invent that held.",
  },
  sponsored_spotlight: {
    title: "Named invent",
    blurb: "You invented on a sponsored spotlight.",
  },
  daily_three_week: {
    title: "Three Dailies",
    blurb: "Held three official Dailies in one week.",
  },
  four_challengers: {
    title: "All four questions",
    blurb: "Summoned all four challengers on a held pathway.",
  },
  converter_dock: {
    title: "Bits to atoms",
    blurb: "Used a converter to dock bits to atoms.",
  },
};

/**
 * @param {{ outcome?: string|null, kind?: string, techIds?: string[], challengerCount?: number }} run
 * @param {{ sponsored?: boolean, dailyHoldsThisWeek?: number, already?: string[] }} [ctx]
 * @returns {string[]} newly unlocked codes
 */
export function awardForRun(run, ctx = {}) {
  const have = new Set(ctx.already || []);
  const out = [];
  const unlock = (code) => {
    if (!have.has(code) && ACHIEVEMENT_DEFS[code]) {
      have.add(code);
      out.push(code);
    }
  };
  if (run?.outcome === "hold" || run?.outcome === "partial") {
    unlock("held_pathway");
  }
  if ((run?.outcome === "hold" || run?.outcome === "partial") && run?.kind === "friends") {
    unlock("first_friends_hold");
  }
  if ((run?.outcome === "hold" || run?.outcome === "partial") && ctx.sponsored) {
    unlock("sponsored_spotlight");
  }
  if (Number(ctx.dailyHoldsThisWeek) >= 3) {
    unlock("daily_three_week");
  }
  if ((run?.outcome === "hold" || run?.outcome === "partial") && Number(run?.challengerCount) >= 4) {
    unlock("four_challengers");
  }
  const techs = Array.isArray(run?.techIds) ? run.techIds : [];
  if (
    (run?.outcome === "hold" || run?.outcome === "partial") &&
    techs.some((id) => String(id).toLowerCase().includes("converter"))
  ) {
    unlock("converter_dock");
  }
  return out;
}

/**
 * @param {string} code
 */
/**
 * Count official Daily (YYYY-MM-DD) and weekly (YYYY-Www) scores in an ISO week.
 * @param {string[]} periods
 * @param {string} weekPeriod
 * @param {(isoDate: string) => string} weekOf
 */
export function countHoldsInWeek(periods, weekPeriod, weekOf) {
  const week = String(weekPeriod || "");
  return (periods || []).filter((p) => {
    const s = String(p);
    if (s === week) return true;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && typeof weekOf === "function") {
      return weekOf(s) === week;
    }
    return false;
  }).length;
}

export function publicAchievement(code, unlockedAt = null) {
  const def = ACHIEVEMENT_DEFS[code];
  if (!def) return null;
  return { code, title: def.title, blurb: def.blurb, unlockedAt };
}
