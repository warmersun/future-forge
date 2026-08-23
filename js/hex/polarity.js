/**
 * World polarity for emTech catalog — bits / atoms / split (converter).
 * Crisis and concern tiles use "curve" (no world language).
 */

import { BITS, ATOMS, CURVE } from "./hex-tile-grid.js";

export { BITS, ATOMS, CURVE };
export const SPLIT = "split";

/** @type {Record<string, "bits"|"atoms"|"split">} */
export const TECH_POLARITY = {
  // bits
  computing: BITS,
  crypto: BITS,
  quantum: BITS,
  ai: BITS,
  networks: BITS,
  "quantum-internet": BITS,
  "gene-sequencing": BITS,
  // atoms
  energy: ATOMS,
  solar: ATOMS,
  wind: ATOMS,
  geothermal: ATOMS,
  tidal: ATOMS,
  wave: ATOMS,
  nuclear: ATOMS,
  battery: ATOMS,
  robots: ATOMS,
  transportation: ATOMS,
  "self-driving": ATOMS,
  drones: ATOMS,
  space: ATOMS,
  "alt-proteins": ATOMS,
  // split (converter)
  iot: SPLIT,
  print3d: SPLIT,
  materials: SPLIT,
  nano: SPLIT,
  synbio: SPLIT,
  "genetic-engineering": SPLIT,
  vr: SPLIT,
  bci: SPLIT,
};

/**
 * @param {string|null|undefined} techId
 * @param {string|null|undefined} [fallback]
 * @returns {"bits"|"atoms"|"split"|"curve"}
 */
export function polarityForTech(techId, fallback = BITS) {
  if (!techId) return fallback || BITS;
  return TECH_POLARITY[techId] || fallback || BITS;
}

/**
 * Attach polarity onto a tech object (mutates and returns).
 * @param {object} tech
 */
export function withPolarity(tech) {
  if (!tech || typeof tech !== "object") return tech;
  if (!tech.polarity) tech.polarity = polarityForTech(tech.id);
  return tech;
}
