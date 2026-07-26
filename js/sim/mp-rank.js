/**
 * Multiplayer survivor ranking (DOM-free).
 * score = 40% impact + 25% craft + 20% contribution + 15% race
 */

import { totalPressure } from "./pressure.js";

/**
 * @param {object} session — mp session with place + invents
 * @returns {{ rows: object[], kind: string } | null}
 */
export function rankSurvivors(session) {
  if (!session?.place || session.place.status === "collapsed") return null;
  // Rank after full win or after Scale→New normal partial lock

  const startPressure = totalPressure(session.place.mission?.pressure || {});
  const impactDenom = Math.max(1, startPressure);

  const rows = (session.seatOrder || []).map((seatId) => {
    const f = session.invents[seatId];
    const seat = session.seats?.find((s) => s.id === seatId);
    if (!f) {
      return {
        seatId,
        displayName: seatId,
        score: 0,
        impactNorm: 0,
        craftNorm: 0,
        contributionNorm: 0,
        raceNorm: 0,
      };
    }

    const impactNorm = Math.min(1, (f.impactDropTotal || 0) / impactDenom);

    let craftNorm = 0;
    if (f.hadChallengeAttempt || f.challengeVerdict) {
      const v = f.challengeVerdict || f.lastChallengeVerdict;
      if (v === "pass") craftNorm = 1;
      else if (v === "partial") craftNorm = 0.6;
      else if (v === "fail") craftNorm = 0.2;
      // stack depth boost (elegance proxy)
      const n = (f.stack || []).length;
      const eleg = Math.min(0.3, n * 0.05);
      craftNorm = Math.min(1, craftNorm * 0.7 + eleg + (n >= 2 ? 0.1 : 0));
    }

    const contribRaw =
      (f.contributionBudgetSpent || 0) +
      (f.contributionApSpent || 0) +
      (f.contributionWillSpent || 0);
    const contributionNorm = Math.min(1, contribRaw / 8);

    let raceNorm = 0;
    if (f.landedSolvingScale) raceNorm = 1;
    else if ((f.successfulScales || 0) >= 1) raceNorm = 0.5;

    const score = Math.round(
      40 * impactNorm + 25 * craftNorm + 20 * contributionNorm + 15 * raceNorm
    );

    return {
      seatId,
      displayName: seat?.displayName || f.displayName || seatId,
      score,
      impactNorm: round2(impactNorm),
      craftNorm: round2(craftNorm),
      contributionNorm: round2(contributionNorm),
      raceNorm: round2(raceNorm),
      impactDropTotal: f.impactDropTotal || 0,
      abandoned: Boolean(f.abandoned),
      successfulScales: f.successfulScales || 0,
      landedSolvingScale: Boolean(f.landedSolvingScale),
    };
  });

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.raceNorm !== a.raceNorm) return b.raceNorm - a.raceNorm;
    if (b.contributionNorm !== a.contributionNorm) {
      return b.contributionNorm - a.contributionNorm;
    }
    const order = session.seatOrder || [];
    return order.indexOf(a.seatId) - order.indexOf(b.seatId);
  });

  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const forgeYears = (session.seatOrder || [])
    .map((id) => session.invents?.[id]?.year)
    .filter((y) => y != null);
  const latestInventYear = forgeYears.length
    ? Math.max(...forgeYears)
    : session.place.year;
  return {
    kind: session.place.status === "won" ? "win" : "partial",
    year: latestInventYear,
    rows,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
