/**
 * Collector card picker. The library lives on Warmer Sun Cloud.
 * Choosing a card mints one invention tile; the library row stays.
 */

/** Show the emTech filter once the collection is past a handful of cards. */
export const COLLECTOR_FILTER_AT = 6;

/**
 * @param {object[]} cards
 * @returns {{ techId: string, name: string }[]}
 */
export function collectorTechs(cards) {
  const out = [];
  const seen = new Set();
  for (const card of cards || []) {
    const techId = String(card?.techId || "");
    if (!techId || seen.has(techId)) continue;
    seen.add(techId);
    out.push({ techId, name: String(card.techName || techId) });
  }
  return out;
}

/**
 * @param {object[]} cards
 */
export function shouldFilterCollectorCards(cards) {
  return (cards || []).length >= COLLECTOR_FILTER_AT;
}

/**
 * @param {object[]} cards
 * @param {string} techId
 */
export function filterCollectorCards(cards, techId) {
  const list = cards || [];
  if (!techId || techId === "all") return list;
  return list.filter((card) => card.techId === techId);
}

/**
 * @param {object} opts
 * @param {HTMLElement|null} opts.list
 * @param {HTMLElement|null} opts.filters
 * @param {HTMLElement|null} opts.empty
 * @param {object[]} opts.cards
 * @param {string} opts.techId
 * @param {(techId: string) => void} opts.onFilter
 * @param {(card: object) => void} opts.onPick
 */
export function paintCollectorPicker(opts) {
  const cards = opts.cards || [];
  const filters = opts.filters;
  const list = opts.list;
  const empty = opts.empty;
  const showFilter = shouldFilterCollectorCards(cards);
  if (filters) {
    filters.hidden = !showFilter;
    filters.replaceChildren();
    if (showFilter) {
      const techs = [{ techId: "all", name: "All" }, ...collectorTechs(cards)];
      for (const tech of techs) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = tech.name;
        btn.classList.toggle("is-on", (opts.techId || "all") === tech.techId);
        btn.addEventListener("click", () => opts.onFilter(tech.techId));
        filters.appendChild(btn);
      }
    }
  }
  const shown = filterCollectorCards(cards, opts.techId);
  if (empty) {
    empty.hidden = shown.length > 0;
    empty.textContent = cards.length
      ? "No cards for that emTech."
      : "No cards yet. When someone shares a collector card link, open it and collect the card. It will show up here.";
  }
  if (!list) return;
  list.replaceChildren();
  for (const card of shown) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collector-pick";
    if (card.imageUrl) {
      const img = document.createElement("img");
      img.src = card.imageUrl;
      img.alt = "";
      btn.appendChild(img);
    }
    const text = document.createElement("span");
    const tech = document.createElement("span");
    tech.textContent = card.techName || card.techId || "";
    const title = document.createElement("strong");
    title.textContent = card.title || "Collector card";
    text.appendChild(tech);
    text.appendChild(title);
    btn.appendChild(text);
    btn.addEventListener("click", () => opts.onPick(card));
    list.appendChild(btn);
  }
}
