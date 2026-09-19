/**
 * Inventor emTech portfolio — main categories credited on a held quest.
 * Credit is for techs on invent tiles that sat in a yellow/green pathway
 * (challenge passed) when the quest held. Server never trusts a client
 * "I unlocked" flag; it re-aggregates from hold/partial run tech_ids.
 */

export const PORTFOLIO_STORAGE_KEY = "future-forge:emtech-portfolio";

export const FULL_TOOLKIT_CODE = "full_toolkit";

/** Headline tray categories the profile tracks. Related tray ids fill the same slot. */
export const PORTFOLIO_CATEGORIES = [
  {
    id: "ai",
    name: "AI",
    icon: "✦",
    color: "#7c9cff",
    techIds: ["ai"],
  },
  {
    id: "robots",
    name: "Robots",
    icon: "🤖",
    color: "#7c9cff",
    techIds: ["robots"],
  },
  {
    id: "transportation",
    name: "Transit",
    icon: "🚚",
    color: "#38bdf8",
    techIds: ["transportation", "self-driving", "drones"],
  },
  {
    id: "networks",
    name: "Networks",
    icon: "⛓",
    color: "#38bdf8",
    techIds: ["networks", "quantum-internet"],
  },
  {
    id: "energy",
    name: "Power",
    icon: "⚡",
    color: "#fbbf24",
    techIds: ["energy", "solar", "wind", "geothermal", "tidal", "wave", "nuclear", "battery"],
  },
  {
    id: "computing",
    name: "Computing",
    icon: "01",
    color: "#fbbf24",
    techIds: ["computing", "quantum"],
  },
  {
    id: "vr",
    name: "AR/VR",
    icon: "🥽",
    color: "#c4b5fd",
    techIds: ["vr"],
  },
  {
    id: "iot",
    name: "IoT",
    icon: "◎",
    color: "#fb923c",
    techIds: ["iot"],
  },
  {
    id: "print3d",
    name: "3D Print",
    icon: "▣",
    color: "#fb923c",
    techIds: ["print3d"],
  },
  {
    id: "synbio",
    name: "SynBio",
    icon: "🦠",
    color: "#34d399",
    techIds: ["synbio", "genetic-engineering", "gene-sequencing", "alt-proteins"],
  },
  {
    id: "crypto",
    name: "Crypto",
    icon: "Ƀ",
    color: "#fbbf24",
    techIds: ["crypto"],
  },
];

/** Stroke icons — same weight so the honeycomb reads as one set. */
const PORTFOLIO_ICON_PATHS = {
  ai: '<path d="M12 3.2 13.6 8.8 19.4 9.2 15 13.1 16.6 18.8 12 15.7 7.4 18.8 9 13.1 4.6 9.2 10.4 8.8Z"/>',
  robots:
    '<rect x="6.2" y="8.2" width="11.6" height="10.2" rx="2.2"/><circle cx="9.6" cy="12.4" r="1"/><circle cx="14.4" cy="12.4" r="1"/><path d="M12 5.2v3M9.2 18.4v1.6M14.8 18.4v1.6M8.4 15.4h7.2"/>',
  transportation:
    '<path d="M4.4 14.2h15.2v3.2H4.4z"/><path d="M6.2 14.2 8 9.4h6.6l3.2 4.8"/><circle cx="8.2" cy="17.6" r="1.35"/><circle cx="15.8" cy="17.6" r="1.35"/>',
  networks:
    '<circle cx="6.2" cy="12" r="1.7"/><circle cx="17.8" cy="7.4" r="1.7"/><circle cx="16.6" cy="17.2" r="1.7"/><path d="M7.7 11.2 16.2 8.2M7.6 13.1 15.2 16.4M17.2 9.1 16.8 15.5"/>',
  energy:
    '<path d="M13.2 3.4 7.4 13.2h4.4L9.8 20.6 17.4 10.2h-4.6Z"/>',
  computing:
    '<rect x="6" y="6" width="12" height="12" rx="1.6"/><path d="M9 6V4.4M12 6V4.4M15 6V4.4M9 19.6V18M12 19.6V18M15 19.6V18M6 9H4.4M6 12H4.4M6 15H4.4M19.6 9H18M19.6 12H18M19.6 15H18"/><rect x="9.2" y="9.2" width="5.6" height="5.6" rx="0.6"/>',
  vr: '<path d="M4.6 9.4h14.8v6.4c0 1.4-1.2 2.4-2.5 2.4h-2.3L12 15.6 9.4 18.2H7.1c-1.3 0-2.5-1-2.5-2.4z"/><path d="M8.2 12.2h2.2M13.6 12.2h2.2"/>',
  iot: '<circle cx="12" cy="13.6" r="1.5"/><path d="M8.4 10.6a5.2 5.2 0 0 1 7.2 0M6.4 8.4a8.1 8.1 0 0 1 11.2 0M12 15.2v3.4M9.6 18.6h4.8"/>',
  print3d:
    '<path d="M6.4 16.6 12 19.4l5.6-2.8M6.4 13.2 12 16l5.6-2.8M6.4 9.8 12 12.6l5.6-2.8L12 7 6.4 9.8z"/>',
  synbio:
    '<path d="M8.2 4.8c4.8 3.2 2.8 6.4 0 9.6 2.8 3.2 4.8 6.4 0 9.6M15.8 4.8c-4.8 3.2-2.8 6.4 0 9.6-2.8 3.2-4.8 6.4 0 9.6"/><circle cx="12" cy="9.6" r="1"/><circle cx="12" cy="14.4" r="1"/>',
  crypto:
    '<rect x="5.2" y="8.4" width="8.4" height="8.4" rx="1.6"/><rect x="10.4" y="7.2" width="8.4" height="8.4" rx="1.6"/>',
};

/**
 * @param {string} id
 * @returns {string}
 */
export function portfolioIconSvg(id) {
  const inner = PORTFOLIO_ICON_PATHS[id];
  if (!inner) return "";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const TECH_TO_CATEGORY = (() => {
  /** @type {Record<string, string>} */
  const map = {};
  for (const cat of PORTFOLIO_CATEGORIES) {
    for (const id of cat.techIds) map[id] = cat.id;
  }
  return map;
})();

/**
 * @param {unknown} techId
 * @returns {string|null}
 */
export function categoryIdForTech(techId) {
  const id = String(techId || "")
    .trim()
    .toLowerCase();
  return TECH_TO_CATEGORY[id] || null;
}

/**
 * Unique portfolio category ids for a run's credited tech list.
 * @param {unknown} techIds
 * @returns {string[]}
 */
export function categoryIdsForTechs(techIds) {
  const out = [];
  const seen = new Set();
  if (!Array.isArray(techIds)) return out;
  for (const raw of techIds) {
    const cat = categoryIdForTech(raw);
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    out.push(cat);
  }
  return out;
}

/**
 * @returns {{ uses: Record<string, number> }}
 */
export function emptyPortfolio() {
  const uses = {};
  for (const cat of PORTFOLIO_CATEGORIES) uses[cat.id] = 0;
  return { uses };
}

/**
 * One held quest: increment each category that appeared at least once.
 * @param {{ uses: Record<string, number> }} portfolio
 * @param {unknown} techIds
 * @returns {{ uses: Record<string, number> }}
 */
export function addTechsToPortfolio(portfolio, techIds) {
  const next = emptyPortfolio();
  const prev = portfolio?.uses && typeof portfolio.uses === "object" ? portfolio.uses : {};
  for (const cat of PORTFOLIO_CATEGORIES) {
    next.uses[cat.id] = Math.max(0, Math.trunc(Number(prev[cat.id]) || 0));
  }
  for (const catId of categoryIdsForTechs(techIds)) {
    next.uses[catId] += 1;
  }
  return next;
}

/**
 * @param {unknown} lists — array of tech-id arrays (one per hold)
 * @returns {{ uses: Record<string, number> }}
 */
export function portfolioFromTechIdLists(lists) {
  let port = emptyPortfolio();
  if (!Array.isArray(lists)) return port;
  for (const list of lists) {
    port = addTechsToPortfolio(port, list);
  }
  return port;
}

/**
 * Hold/partial runs with a techIds (or tech_ids) field.
 * @param {unknown} runs
 */
export function portfolioFromRuns(runs) {
  const lists = [];
  if (!Array.isArray(runs)) return emptyPortfolio();
  for (const run of runs) {
    const outcome = String(run?.outcome || "").toLowerCase();
    if (outcome !== "hold" && outcome !== "partial") continue;
    lists.push(run.techIds || run.tech_ids || []);
  }
  return portfolioFromTechIdLists(lists);
}

/**
 * @param {{ uses?: Record<string, number> }|null|undefined} portfolio
 */
export function usedCategoryCount(portfolio) {
  let n = 0;
  for (const cat of PORTFOLIO_CATEGORIES) {
    if (Math.trunc(Number(portfolio?.uses?.[cat.id]) || 0) > 0) n += 1;
  }
  return n;
}

/**
 * @param {{ uses?: Record<string, number> }|null|undefined} portfolio
 */
export function isFullToolkit(portfolio) {
  return usedCategoryCount(portfolio) >= PORTFOLIO_CATEGORIES.length;
}

/**
 * API/UI payload. Never includes email or clerk ids.
 * @param {{ uses?: Record<string, number> }|null|undefined} portfolio
 */
export function publicPortfolio(portfolio) {
  const categories = PORTFOLIO_CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    uses: Math.max(0, Math.trunc(Number(portfolio?.uses?.[c.id]) || 0)),
  }));
  const usedCount = categories.filter((c) => c.uses > 0).length;
  return {
    categories,
    usedCount,
    total: PORTFOLIO_CATEGORIES.length,
    complete: usedCount >= PORTFOLIO_CATEGORIES.length,
  };
}

/**
 * Prefer the payload that has filled more slots (and more uses on a tie).
 * @param {...(ReturnType<typeof publicPortfolio>|null|undefined)} payloads
 */
export function pickRicherPublicPortfolio(...payloads) {
  let best = null;
  let bestUsed = -1;
  let bestSum = -1;
  for (const p of payloads) {
    if (!p || !Array.isArray(p.categories)) continue;
    const used = Number(p.usedCount) || 0;
    const sum = p.categories.reduce((n, c) => n + (Number(c.uses) || 0), 0);
    if (used > bestUsed || (used === bestUsed && sum > bestSum)) {
      best = p;
      bestUsed = used;
      bestSum = sum;
    }
  }
  return best || publicPortfolio(null);
}

/**
 * @param {Storage|null|undefined} storage
 * @returns {{ uses: Record<string, number> }}
 */
export function readLocalPortfolio(storage) {
  const empty = emptyPortfolio();
  if (!storage || typeof storage.getItem !== "function") return empty;
  try {
    const raw = storage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return addTechsToPortfolio(parsed, []);
  } catch {
    return empty;
  }
}

/**
 * @param {Storage|null|undefined} storage
 * @param {{ uses: Record<string, number> }} portfolio
 */
export function writeLocalPortfolio(storage, portfolio) {
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(addTechsToPortfolio(portfolio, [])));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Local preview of the completed toolkit. Does not write Cloud runs.
 * @param {number} [usesEach]
 */
export function fullToolkitPortfolio(usesEach = 1) {
  const port = emptyPortfolio();
  const n = Math.max(1, Math.trunc(Number(usesEach) || 1));
  for (const cat of PORTFOLIO_CATEGORIES) port.uses[cat.id] = n;
  return port;
}

/**
 * @param {Storage|null|undefined} storage
 * @param {number} [usesEach]
 */
export function seedFullToolkitPreview(storage, usesEach = 1) {
  const port = fullToolkitPortfolio(usesEach);
  writeLocalPortfolio(storage, port);
  return port;
}

/**
 * @param {Storage|null|undefined} storage
 */
export function clearLocalPortfolio(storage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(PORTFOLIO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Record one held quest's credited techs into localStorage.
 * @param {Storage|null|undefined} storage
 * @param {unknown} techIds
 * @returns {{ uses: Record<string, number> }}
 */
export function recordLocalHold(storage, techIds) {
  const next = addTechsToPortfolio(readLocalPortfolio(storage), techIds);
  writeLocalPortfolio(storage, next);
  return next;
}
