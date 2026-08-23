/**
 * Re-export shared scrutiny helpers for server-side imports.
 * Implementation lives in js/scrutiny-shared.js (browser-safe).
 */
export {
  SCRUTINY_ANGLES,
  sanitizeScrutinyAngle,
  sanitizeScrutiny,
  localScrutinyProposals,
} from "../scrutiny-shared.js";
