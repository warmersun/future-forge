/**
 * Run report + star scoring (DOM-free).
 */

import { hasPilotLanguage } from "../data.js";

const RUN_REPORT_V = 1;

/**
 * @param {object} input
 * @param {"win"|"partial"|"collapse"} input.kind
 * @param {number} input.year
 * @param {number} input.startYear
 * @param {number} input.yearsPerTurn
 * @param {number} input.waits
 * @param {number} [input.turn]
 * @param {string|null} input.challengeVerdict
 * @param {boolean} input.hadChallengeAttempt
 * @param {string|null} [input.lastChallengeVerdict]
 * @param {string|null} input.timingLevel — green|yellow|red at deploy
 * @param {string} input.inventionHow
 * @param {number} input.synergyPairCount
 * @param {number} input.domainCount
 * @param {number} input.suggestedHitCount
 * @param {number} input.challengeAnswerWords
 * @param {number} [input.drop]
 */
export function scoreRun(input) {
  const waits = Number(input.waits) || 0;
  const year = Number(input.year) || 0;
  const startYear = Number(input.startYear) || 2026;
  const ypt = Number(input.yearsPerTurn) || 2;
  const kind = input.kind;
  const verdict = input.challengeVerdict || input.lastChallengeVerdict || null;
  const hadAttempt = Boolean(input.hadChallengeAttempt);
  const timing = input.timingLevel || "yellow";
  const drop = Number(input.drop) || 0;

  const speedScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          30 * waits -
          5 * Math.max(0, (year - startYear) / ypt - waits)
      )
    )
  );

  let honestyScore = timing === "green" ? 90 : timing === "red" ? 40 : 60;
  if (hasPilotLanguage(input.inventionHow || "")) honestyScore = Math.min(100, honestyScore + 10);

  let eleganceScore = 0;
  eleganceScore += Math.min(50, 25 * (Number(input.synergyPairCount) || 0));
  if ((Number(input.domainCount) || 0) >= 2) eleganceScore += 20;
  if ((Number(input.suggestedHitCount) || 0) >= 2) eleganceScore += 15;
  if ((Number(input.challengeAnswerWords) || 0) >= 80 && verdict === "pass") {
    eleganceScore += 15;
  }
  eleganceScore = Math.min(100, eleganceScore);

  let stars = 0;
  if (kind === "win") {
    const early = year <= startYear + ypt;
    const thrifty = waits <= 1;
    if (early && thrifty && timing === "green" && verdict === "pass") stars = 3;
    else stars = 2;
  } else if (kind === "partial") {
    if (drop >= 4 && (verdict === "pass" || verdict === "partial")) stars = 2;
    else stars = 1;
  } else if (kind === "collapse") {
    stars = hadAttempt ? 1 : 0;
  }

  const highlights = [];
  if (stars >= 3) highlights.push("Flawless run: early deploy, honest claims, challenge pass.");
  else if (kind === "win") highlights.push("Crisis eased — solid local deploy.");
  else if (kind === "partial") highlights.push("Deployed with meters still hot.");
  else if (kind === "collapse" && hadAttempt) highlights.push("Faced scrutiny before the collapse.");
  else if (kind === "collapse") highlights.push("Crisis overwhelmed the place.");

  if (waits === 0 && kind !== "collapse") highlights.push("No waits — moved fast on the calendar.");
  if (timing === "green") highlights.push("Claim timing stayed green.");
  if ((Number(input.synergyPairCount) || 0) > 0) highlights.push("Synergy in the stack.");

  return {
    v: RUN_REPORT_V,
    stars,
    speedScore,
    honestyScore,
    eleganceScore,
    highlights,
    raw: {
      waits,
      year,
      turn: Number(input.turn) || 0,
      kind,
      verdict,
      hadChallengeAttempt: hadAttempt,
      timingLevel: timing,
      drop,
      startYear,
    },
  };
}

export function starLabel(stars) {
  if (stars <= 0) return "—";
  return "★".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
}
