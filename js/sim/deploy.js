/**
 * Pure deploy-drop calculation (DOM-free).
 * Matches attemptDeploy drop formula (game.js ~L1655–1665) + optional G2 will deltas.
 */

import { applyG2DeployDeltas } from "./economy.js";

/**
 * @param {object} opts
 * @param {object[]} opts.techs — selected tech objects with id, domain
 * @param {string} opts.inventionHow
 * @param {string} opts.inventionImpact
 * @param {string|null} opts.challengeVerdict
 * @param {string} opts.challengeAnswer
 * @param {string[]} [opts.suggested] — mission.suggested tech ids
 * @param {Array<[string,string]>} [opts.pairs] — synergy pairs
 * @param {string[]} [opts.domains] — domain ids in stack
 * @param {number} [opts.will] — political will (G2)
 * @param {boolean} [opts.budgetWill] — feature flag
 */
export function computeDeployDrop(opts) {
  const techs = opts.techs || [];
  const domains = opts.domains || [];
  const pairs = opts.pairs || [];
  const how = String(opts.inventionHow || "");
  const impact = String(opts.inventionImpact || "");
  const words = `${how} ${impact}`.trim().split(/\s+/).filter(Boolean).length;
  const answer = String(opts.challengeAnswer || "").trim();
  const suggested = new Set(opts.suggested || []);

  /** @type {{ id: string, label: string, amount: number }[]} */
  const parts = [];

  let drop = 1 + Math.min(2, Math.max(0, techs.length - 1));
  parts.push({
    id: "stack",
    label: `Stack size (${techs.length} tech${techs.length === 1 ? "" : "s"})`,
    amount: 1 + Math.min(2, Math.max(0, techs.length - 1)),
  });

  if (domains.length >= 2) {
    drop += 1;
    parts.push({ id: "domains", label: "Cross-domain mix", amount: 1 });
  }
  if (pairs.length) {
    drop += 1;
    parts.push({ id: "synergy", label: "Synergy pair present", amount: 1 });
  }
  if (words >= 40) {
    drop += 1;
    parts.push({ id: "words", label: "Story depth (≥40 words)", amount: 1 });
  }
  if (opts.challengeVerdict === "pass") {
    drop += 1;
    parts.push({ id: "verdict", label: "Challenge PASS", amount: 1 });
  }
  if (answer.length >= 60) {
    drop += 1;
    parts.push({ id: "answer", label: "Detailed challenge answer", amount: 1 });
  }
  if (techs.filter((t) => suggested.has(t.id)).length >= 2) {
    drop += 1;
    parts.push({ id: "suggested", label: "≥2 mission-suggested techs", amount: 1 });
  }

  if (opts.budgetWill) {
    const g2 = applyG2DeployDeltas(drop, Number(opts.will) || 0);
    drop = g2.drop;
    parts.push(...g2.parts);
  }

  return { drop, parts };
}
