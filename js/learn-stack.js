/**
 * Learn modal stack order and dock-to-button math.
 * Pure helpers so hex invent can enable Learn for a focused emTech
 * without dragging game.js into unit tests.
 */

export const LEARN_WHILE_IDEAS_DELAY_MS = 400;

export const LEARN_WHILE_IDEAS_LEAD =
  "Ideas are generating — read this family while you wait. Learn reopens it anytime.";

/**
 * Tech ids to show in Learn (and to enable the Learn button).
 * Hex invent: focused emTech first, then stacked techs in learnOrder.
 * Otherwise: learnOrder ∩ selectedTechIds (stack only).
 *
 * @param {{
 *   hexInvent?: boolean,
 *   focusedTechId?: string|null,
 *   selectedTechIds?: string[],
 *   learnOrder?: string[],
 * }} [opts]
 * @returns {string[]}
 */
export function learnTechIds({
  hexInvent = false,
  focusedTechId = null,
  selectedTechIds = [],
  learnOrder = [],
} = {}) {
  const selected = Array.isArray(selectedTechIds)
    ? selectedTechIds.filter(Boolean)
    : [];
  const order = Array.isArray(learnOrder) ? learnOrder.filter(Boolean) : [];
  const selectedSet = new Set(selected);

  if (hexInvent) {
    const ids = [];
    const seen = new Set();
    const push = (id) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };
    push(focusedTechId);
    for (const id of order) {
      if (selectedSet.has(id)) push(id);
    }
    for (const id of selected) push(id);
    return ids;
  }

  const ids = [];
  const seen = new Set();
  for (const id of order) {
    if (selectedSet.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  for (const id of selected) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Button disabled/title/label from the Learn id list.
 * @param {string[]} ids
 * @param {{ hexInvent?: boolean }} [opts]
 * @returns {{ disabled: boolean, title: string, text: string }}
 */
export function learnButtonMeta(ids, { hexInvent = false } = {}) {
  const n = Array.isArray(ids) ? ids.length : 0;
  if (n === 0) {
    return {
      disabled: true,
      title: hexInvent
        ? "Pick an emTech to learn about it"
        : "Select techs in your stack to learn about them",
      text: "Learn",
    };
  }
  if (n === 1) {
    return {
      disabled: false,
      title: hexInvent
        ? "Learn about this emTech"
        : "Learn about the selected tech",
      text: "Learn",
    };
  }
  return {
    disabled: false,
    title: `Learn about ${n} selected techs (newest first)`,
    text: `Learn (${n})`,
  };
}

/**
 * Translate + scale a modal rect so its center lands on a target rect.
 * @param {DOMRect|{left:number,top:number,width:number,height:number}|null} fromRect
 * @param {DOMRect|{left:number,top:number,width:number,height:number}|null} toRect
 * @returns {{ dx: number, dy: number, scale: number }|null}
 */
export function dockTransform(fromRect, toRect) {
  if (!fromRect || !toRect) return null;
  const fw = Number(fromRect.width) || 0;
  const fh = Number(fromRect.height) || 0;
  const tw = Number(toRect.width) || 0;
  const th = Number(toRect.height) || 0;
  if (fw < 1 || fh < 1) return null;
  const fromCx = Number(fromRect.left) + fw / 2;
  const fromCy = Number(fromRect.top) + fh / 2;
  const toCx = Number(toRect.left) + tw / 2;
  const toCy = Number(toRect.top) + th / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const byW = tw > 0 ? tw / fw : 0.12;
  const byH = th > 0 ? th / fh : 0.12;
  const scale = Math.max(0.06, Math.min(byW, byH, 0.18));
  return { dx, dy, scale };
}
