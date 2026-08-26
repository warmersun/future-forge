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
  founding: {
    title: "Founding inventor",
    blurb: "Among the first Cloud accounts.",
  },
  invent_night_2026: {
    title: "Invent Night 2026",
    blurb: "Showed up for Invent Night.",
  },
};

/**
 * @param {{ outcome?: string|null, kind?: string, techIds?: string[] }} run
 * @param {{ sponsored?: boolean, challengerCount?: number, dailyHoldsThisWeek?: number, already?: string[] }} [ctx]
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
  if ((run?.outcome === "hold" || run?.outcome === "partial") && Number(ctx.challengerCount) >= 4) {
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

export const FOUNDING_MAX = 100;

/**
 * E7 cosmetic founding / season codes. Never a certificate.
 * @param {{ userCount?: number, createdAt?: string|Date, inventNight?: boolean, cutoff?: string }} ctx
 */
export function foundingCodes(ctx = {}) {
  const codes = [];
  const count = Number(ctx.userCount);
  if (Number.isFinite(count) && count > 0 && count <= FOUNDING_MAX) {
    codes.push("founding");
  }
  if (ctx.inventNight) codes.push("invent_night_2026");
  if (ctx.createdAt && ctx.cutoff) {
    const created = new Date(ctx.createdAt).getTime();
    const cut = new Date(ctx.cutoff).getTime();
    if (Number.isFinite(created) && Number.isFinite(cut) && created <= cut) {
      if (!codes.includes("founding")) codes.push("founding");
    }
  }
  return codes;
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
