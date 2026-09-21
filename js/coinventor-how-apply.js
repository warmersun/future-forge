/**
 * Hex co-inventor "how" apply: what the button says, and when the draft
 * must be shown in the bubble because it lives only on proposals.inventionHow.
 * DOM-free so the chat renderer and tests share one decision.
 */

function squash(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

/**
 * @param {object|null|undefined} context co-inventor getContext()
 * @returns {boolean}
 */
export function pathwayReadyForHow(context) {
  const paths = context?.hexBoard?.pathways;
  return Array.isArray(paths) && paths.length > 0;
}

/**
 * @param {boolean} hasPathway
 * @returns {{ label: string, title: string }}
 */
export function hexHowApplyCopy(hasPathway) {
  if (hasPathway) {
    return {
      label: "Set as this pathway's how",
      title:
        "Saves this draft as how the placed pathway works as a whole. Each tile keeps its own how.",
    };
  }
  return {
    label: "Use as how it works",
    title:
      "Puts this draft in How it works. Edit it, mint a tile, then place it on the board.",
  };
}

/**
 * Label after a successful hex apply.
 * @param {"pathway"|"mint"|null|undefined} howTarget
 */
export function howAppliedLabel(howTarget) {
  if (howTarget === "pathway") return "Saved as this pathway's how";
  return "Used as how it works";
}

/**
 * Draft paragraph to show above the button. Empty when the message already
 * contains that text, so a full draft-how reply is not repeated.
 * @param {string} message
 * @param {string|null|undefined} inventionHow
 * @returns {string}
 */
export function draftQuoteForBubble(message, inventionHow) {
  const how = squash(inventionHow);
  if (!how) return "";
  if (squash(message).includes(how)) return "";
  return String(inventionHow || "").trim();
}
