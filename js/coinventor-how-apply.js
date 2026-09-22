/**
 * Hex co-inventor "how" apply: what the button says, and when the draft
 * must be shown in the bubble because it lives only on proposals.inventionHow.
 * DOM-free so the chat renderer and tests share one decision.
 */

function squash(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

/**
 * True when Apply should write a placed pathway.
 * A hinted emTech matches only an island that contains it.
 * With no hint, the single island on the board is that pathway.
 * Several islands and no hint, or a hint that is not placed, use the mint box.
 * @param {object|null|undefined} context co-inventor getContext()
 * @param {string|null|undefined} [techId]
 * @returns {boolean}
 */
export function pathwayReadyForHow(context, techId) {
  const paths = context?.hexBoard?.pathways;
  if (!Array.isArray(paths) || paths.length === 0) return false;
  const id = String(techId || "").trim();
  if (!id) return paths.length === 1;
  const inventions = Array.isArray(context?.hexBoard?.inventions)
    ? context.hexBoard.inventions
    : [];
  const tileIds = new Set(
    inventions
      .filter((t) => String(t?.techId || "") === id && t?.onBoard !== false)
      .map((t) => String(t?.id || ""))
      .filter(Boolean)
  );
  if (!tileIds.size) return false;
  return paths.some((p) =>
    (Array.isArray(p?.inventionIds) ? p.inventionIds : []).some((iid) =>
      tileIds.has(String(iid))
    )
  );
}

/**
 * Placed tiles that should receive a how-draft.
 * `pathways` is the list from listInventionPathways (arrays of tiles).
 * A hinted emTech writes only an island that contains it.
 * With no hint, the only island is the target. Otherwise null (mint box).
 * @param {object[][]|null|undefined} pathways
 * @param {string|null|undefined} techId
 * @returns {object[]|null}
 */
export function pathwayTilesForHow(pathways, techId) {
  const lists = (Array.isArray(pathways) ? pathways : []).filter(
    (p) => Array.isArray(p) && p.length > 0
  );
  const id = String(techId || "").trim();
  if (id) {
    return lists.find((p) => p.some((t) => String(t?.techId || "") === id)) || null;
  }
  return lists.length === 1 ? lists[0] : null;
}

/**
 * @param {boolean} hasPathway
 * @returns {{ label: string, title: string }}
 */
/**
 * Whether this how-draft writes a placed pathway.
 * An explicit mint target stays in the mint box even when a pathway is on the board.
 * An explicit pathway target names the pathway button. Otherwise the board decides.
 * @param {object|null|undefined} context
 * @param {{ howTarget?: string, howTechId?: string, addTechIds?: string[] }|null|undefined} [proposals]
 */
export function hexHowTargetsPathway(context, proposals) {
  const target = String(proposals?.howTarget || "").trim();
  if (target === "mint") return false;
  if (target === "pathway") return true;
  const hint = proposals?.howTechId || proposals?.addTechIds?.[0];
  return pathwayReadyForHow(context, hint);
}

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
