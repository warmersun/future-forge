/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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

/**
 * Board snapshot taken when a turn starts. Restored messages omit this.
 * @param {object|null|undefined} context
 */
export function captureHowProvenance(context) {
  const pathways = Array.isArray(context?.hexBoard?.pathways) ? context.hexBoard.pathways : [];
  const inventions = Array.isArray(context?.hexBoard?.inventions) ? context.hexBoard.inventions : [];
  const techByTile = new Map(
    inventions.map((tile) => [String(tile?.id || ""), String(tile?.techId || "")])
  );
  return {
    focusTechId: context?.focusTechId ? String(context.focusTechId) : null,
    pathways: pathways.map((path) => {
      const inventionIds = (Array.isArray(path?.inventionIds) ? path.inventionIds : []).map(String);
      return {
        inventionIds,
        techIds: inventionIds.map((id) => techByTile.get(id) || "").filter(Boolean),
      };
    }),
  };
}

function pathwaySignature(provenance) {
  const paths = Array.isArray(provenance?.pathways) ? provenance.pathways : [];
  return paths
    .map((path) => (path.inventionIds || []).join(","))
    .sort()
    .join("|");
}

/**
 * @param {object|null|undefined} captured
 * @param {object|null|undefined} context
 * @param {object|null|undefined} proposals
 * @param {boolean} [confirmed]
 */
export function howApplyDecision(captured, context, proposals, confirmed = false) {
  if (!captured) return { allow: true, legacy: true, needsConfirm: false, label: "" };
  const current = captureHowProvenance(context);
  const focusChanged = (captured.focusTechId || null) !== (current.focusTechId || null);
  const membersChanged = pathwaySignature(captured) !== pathwaySignature(current);
  const thenPathway = hexHowTargetsPathway(contextFromProvenance(captured), proposals);
  const nowPathway = hexHowTargetsPathway(context, proposals);
  const drifted = focusChanged || membersChanged || thenPathway !== nowPathway;
  if (!drifted) return { allow: true, legacy: false, needsConfirm: false, label: "" };
  if (confirmed) return { allow: true, legacy: false, needsConfirm: false, label: "" };
  const intended = thenPathway ? "the pathway from when you asked" : "the mint box from when you asked";
  const now = nowPathway ? "the pathway in focus now" : "the mint box in focus now";
  return {
    allow: false,
    legacy: false,
    needsConfirm: true,
    label: `That draft was for ${intended}. Apply it to ${now}?`,
  };
}

function contextFromProvenance(provenance) {
  return {
    focusTechId: provenance?.focusTechId || null,
    hexBoard: {
      pathways: (provenance?.pathways || []).map((path) => ({ inventionIds: path.inventionIds || [] })),
      inventions: (provenance?.pathways || []).flatMap((path) =>
        (path.inventionIds || []).map((id, index) => ({
          id,
          techId: path.techIds?.[index] || "",
          onBoard: true,
        }))
      ),
    },
  };
}
