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
 * Collected cards become a reached Lane 1 milestone plus Lane 2 use cases.
 * The first invention built from the card is marked free by collectorCardId.
 */

function titleFrom(text) {
  const cut = String(text || "").split(/[,.]/)[0].trim();
  const words = cut.split(/\s+/).slice(0, 8).join(" ");
  return words.slice(0, 72) || "Collected use";
}

/**
 * @param {object[]|null|undefined} cards
 * @param {string} techId
 * @param {{ world?: string }} [opts]
 */
export function collectorMilestonesForTech(cards, techId, opts = {}) {
  const world = opts.world === "atoms" || opts.world === "split" ? opts.world : "bits";
  const id = String(techId || "");
  return (Array.isArray(cards) ? cards : [])
    .filter((card) => card && String(card.techId || "") === id)
    .map((card) => {
      const cardId = String(card.id || "").slice(0, 80);
      const lines = Array.isArray(card.useCases)
        ? card.useCases.map((line) => String(line || "").trim()).filter(Boolean)
        : [];
      const fallbackBlurb = String(card.description || card.capability || card.title || "")
        .trim()
        .slice(0, 280);
      const useCases = lines.length
        ? lines.slice(0, 3).map((blurb, i) => ({
            id: `uc-${id}-collector-${cardId || i}-${i + 1}`,
            title: titleFrom(blurb),
            blurb: blurb.slice(0, 280),
            world,
            origin: "collector",
          }))
        : fallbackBlurb
          ? [
              {
                id: `uc-${id}-collector-${cardId || 0}-1`,
                title: String(card.title || titleFrom(fallbackBlurb)).trim().slice(0, 72) || "Collected use",
                blurb: fallbackBlurb,
                world,
                origin: "collector",
              },
            ]
          : [];
      return {
        id: `ms-${id}-collector-${cardId || "card"}`,
        year: Number(card.year) > 1990 ? Number(card.year) : 2026,
        label: String(card.title || "Collected capability").slice(0, 120),
        detail: String(card.capability || card.description || "").slice(0, 280),
        status: "reached",
        origin: "collector",
        collectorCardId: cardId,
        useCases,
      };
    });
}

/**
 * True for the first pathway ingredient that cites this card.
 * @param {object|null|undefined} board
 * @param {string} collectorCardId
 * @param {string} ingredientId
 */
export function collectorInventionIsFree(board, collectorCardId, ingredientId) {
  const cardId = String(collectorCardId || "");
  if (!cardId) return false;
  const pathways = Object.values(board?.pathways || {}).sort(
    (a, b) => (a.createdOrder || 0) - (b.createdOrder || 0)
  );
  for (const pw of pathways) {
    for (const ing of pw.ingredients || []) {
      if (String(ing.collectorCardId || "") !== cardId) continue;
      return ing.id === ingredientId;
    }
  }
  return false;
}
