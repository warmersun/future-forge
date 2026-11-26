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
 * Pure, DOM-free structured innovation methods for the Lane 3 Innovation Workbench:
 * - Diamond 1: Scarcity framing from Quest crises & scene
 * - Diverge methods: Seed, 3-zone emTech Convergence Canvas (Bits ↔ Bridge ↔ Atoms),
 *   SIT (4 closed-world lenses), and SCAMPER (7 open remix lenses)
 * - Converge: Deterministic 0ms Pre-Flight matrix (world chain, horizon, synergy,
 *   target perspectives, and exact incremental Budget / Goodwill cost)
 * - Deterministic local draft generators for offline play & unit tests
 */

import { TECHS, DOMAINS } from "../data.js";
import { techCost } from "../sim/economy.js";
import { collectorInventionIsFree } from "../ontology/collector-ontology.js";
import { convergenceRows, isUseCaseEarly, needsBridgeWarning } from "./pathway-model.js";

export const WORKBENCH_METHODS = Object.freeze([
  {
    id: "seed",
    icon: "💡",
    label: "Seed",
    short: "Scarcity + Use Cases",
  },
  {
    id: "convergence",
    icon: "🔀",
    label: "Convergence",
    short: "Bits ↔ Bridge ↔ Atoms",
  },
  {
    id: "sit",
    icon: "📦",
    label: "SIT",
    short: "4 closed-world lenses",
  },
  {
    id: "scamper",
    icon: "🔧",
    label: "SCAMPER",
    short: "7 open remix lenses",
  },
]);

export const SIT_LENSES = Object.freeze([
  {
    id: "subtraction",
    symbol: "−",
    label: "Subtraction",
    short: "Remove an assumed part",
    hint: "Strip out a fragile, costly, or assumed component and let something already on site carry the job.",
  },
  {
    id: "division",
    symbol: "÷",
    label: "Division",
    short: "Split in time, place, or scale",
    hint: "Divide one centralized step or asset across smaller local units, shifts, or separate intake vs. output.",
  },
  {
    id: "multiplication",
    symbol: "×",
    label: "Multiplication",
    short: "Copy & vary an existing part",
    hint: "Duplicate a sensor, vessel, or crew loop already in the system, tuned for a second threshold or condition.",
  },
  {
    id: "addition",
    symbol: "+",
    label: "Task Unification",
    short: "Give a local actor/tool a new job",
    hint: "Assign an extra function to an operator, vehicle, ledger, or hardware loop already present in this place.",
  },
]);

export const SCAMPER_LENSES = Object.freeze([
  {
    id: "S",
    letter: "S",
    label: "Substitute",
    short: "Swap material, actor, or channel",
    hint: "Replace one costly, scarce, or mistrusted part with a local alternative.",
  },
  {
    id: "C",
    letter: "C",
    label: "Combine",
    short: "Merge two steps, roles, or tools",
    hint: "Fuse two separate tools, trips, or local groups into one shared loop.",
  },
  {
    id: "A",
    letter: "A",
    label: "Adapt",
    short: "Borrow a pattern from another field",
    hint: "Import a proven mechanism from another domain or local practice to break the bottleneck.",
  },
  {
    id: "M",
    letter: "M",
    label: "Modify",
    short: "Change scale, cadence, or footprint",
    hint: "Magnify, shrink, slow down, or run continuously instead of in risky batches.",
  },
  {
    id: "P",
    letter: "P",
    label: "Put to other uses",
    short: "Give the asset a second value stream",
    hint: "Let the same deployed equipment also ease a second local pain or fund its own upkeep.",
  },
  {
    id: "E",
    letter: "E",
    label: "Eliminate",
    short: "Cut a bottleneck or waste stage",
    hint: "Remove a hazardous waste step, middleman, or approval choke point without losing the core outcome.",
  },
  {
    id: "R",
    letter: "R",
    label: "Reverse / Rearrange",
    short: "Flip sequence, ownership, or verification",
    hint: "Invert who pays, who verifies, or act upstream before harm lands.",
  },
]);

export const CHALLENGER_LENS_MAP = Object.freeze({
  moloch: {
    method: "scamper",
    scamper: ["R", "C", "E"],
    sit: "addition",
    note: "Break freeriding & race-to-the-bottom traps: Reverse who verifies, Combine shared incentives, or Eliminate defection loopholes.",
  },
  nature: {
    method: "scamper",
    scamper: ["S", "E", "M"],
    sit: "subtraction",
    note: "Respect physical & ecological limits: Substitute benign materials/energy, Eliminate waste streams, or Modify scale and load.",
  },
  ethicist: {
    method: "scamper",
    scamper: ["R", "S", "A"],
    sit: "division",
    note: "Protect dignity & fairness: Reverse who holds override power, Substitute opaque rules, or Adapt community governance.",
  },
  stakeholder: {
    method: "scamper",
    scamper: ["C", "P", "R"],
    sit: "addition",
    note: "Win funding, permits & legitimacy: Combine with existing budgets, Put assets to shared civic use, or Reverse who holds the ledger.",
  },
});

const WORLD_ORDER = ["bits", "split", "atoms"];
const DOMAIN_ORDER = ["power", "automator", "mover", "lifeforce", "link", "portal"];
const VALID_WORLDS = new Set(["bits", "atoms", "split", "plain"]);

const TECH_BY_ID = new Map(TECHS.map((t) => [t.id, t]));

export function techMeta(techId) {
  return TECH_BY_ID.get(String(techId || "")) || null;
}

export function normalizeWorkbenchWorld(world, techId = null) {
  if (VALID_WORLDS.has(world)) return world;
  const tech = techMeta(techId);
  if (tech && VALID_WORLDS.has(tech.polarity)) return tech.polarity;
  return techId ? "bits" : "plain";
}

function clip(raw, maxLen = 140) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const space = cut.lastIndexOf(" ");
  return `${(space > 14 ? cut.slice(0, space) : cut).replace(/[,;:\-–—]+$/, "")}…`;
}

function slug(raw, fallback = "item") {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return s || fallback;
}

function roleDisplay(role) {
  if (role === "local") return "Here & now";
  if (role === "global") return "Root cause";
  if (role === "support") return "Support";
  return "";
}

/**
 * Diamond 1: extract 3–5 concrete scarcity prompts from the live crises and Quest scene.
 * Players can click any chip or type their own scarcity focus (or skip it entirely).
 *
 * @param {object|null|undefined} mission
 * @param {object[]} [crises]
 */
export function extractScarcityPrompts(mission, crises = []) {
  const out = [];
  const seen = new Set();

  const sortedCrises = [...(Array.isArray(crises) ? crises : [])].sort(
    (a, b) => (Number(b?.level) || 0) - (Number(a?.level) || 0)
  );

  for (const c of sortedCrises) {
    const name = String(c?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const roleTag = roleDisplay(c.role);
    out.push({
      id: `crisis:${c.id || slug(name)}`,
      label: name,
      role: c.role || null,
      roleLabel: roleTag,
      crisisId: c.id || null,
      level: c.level ?? null,
      detail: clip(c.description || `Ease ${name} in this place.`, 120),
    });
  }

  const haystack = [
    mission?.title || "",
    mission?.scene || "",
    mission?.summary || "",
    mission?.stakeholder || "",
    ...sortedCrises.map((c) => `${c?.name || ""} ${c?.description || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const patterns = [
    {
      id: "scarcity:trust",
      re: /\b(trust|proof|audit|permit|ledger|verified|transparency|legitimac|fear|backlash)\b/,
      label: "Trusted local proof",
      detail: "Visible, verifiable evidence community stewards can check without middlemen.",
    },
    {
      id: "scarcity:power",
      re: /\b(power|grid|electric|diesel|fuel|heat|brine|energy|blackout|cool|cold)\b/,
      label: "Clean reliable energy",
      detail: "Steady local power or thermal loop without polluting backup runs.",
    },
    {
      id: "scarcity:water",
      re: /\b(water|well|river|brine|silt|flood|drought|irrigation|aquifer|runoff)\b/,
      label: "Clean safe water",
      detail: "Protected flow and purity without toxic runoff or waste ponds.",
    },
    {
      id: "scarcity:supply",
      re: /\b(truck|feedstock|haul|supply|mineral|lithium|fertilizer|medicine|clinic|parts)\b/,
      label: "Local materials & supply",
      detail: "Making or recovering scarce inputs on site instead of fragile long-haul imports.",
    },
    {
      id: "scarcity:time",
      re: /\b(crew|nurse|teacher|farmer|operator|hours|backlog|wait|inspection|testing|lab)\b/,
      label: "Skilled crew hours",
      detail: "Multiplying scarce local human time on the hardest bottleneck.",
    },
  ];

  for (const p of patterns) {
    if (out.length >= 5) break;
    if (!p.re.test(haystack)) continue;
    const key = p.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: p.id,
      label: p.label,
      role: null,
      roleLabel: "Bottleneck",
      crisisId: null,
      level: null,
      detail: p.detail,
    });
  }

  if (!out.length) {
    out.push(
      {
        id: "scarcity:relief",
        label: "Immediate local relief",
        role: "local",
        roleLabel: "Here & now",
        crisisId: null,
        level: null,
        detail: "What people in this place feel running short right now.",
      },
      {
        id: "scarcity:root",
        label: "Clean local supply",
        role: "global",
        roleLabel: "Root cause",
        crisisId: null,
        level: null,
        detail: "Replacing the scarce or polluting driver keeping the crisis hot.",
      }
    );
  }

  return out.slice(0, 5);
}

/**
 * Analyze a `[Tech A × Tech B]` intersection on the Convergence Canvas.
 *
 * @param {string|null} techIdA
 * @param {string|null} techIdB
 * @param {{ place?: string, scarcity?: string, year?: number }} [ctx]
 */
export function analyzeConvergencePair(techIdA, techIdB, ctx = {}) {
  const a = techMeta(techIdA);
  const b = techMeta(techIdB);
  if (!a && !b) {
    return {
      ready: false,
      techA: null,
      techB: null,
      knownSynergy: false,
      bridgesWorlds: false,
      needsBridge: false,
      badge: "",
      prompt: "Pick any two technologies from Bits, Bridge, or Atoms above to explore their intersection.",
    };
  }
  if (a && !b) {
    const partners = (a.pairs || [])
      .map((pid) => techMeta(pid))
      .filter(Boolean)
      .slice(0, 4)
      .map((t) => ({ id: t.id, name: t.name, icon: t.icon || "", world: t.polarity || "bits" }));
    return {
      ready: false,
      techA: a,
      techB: null,
      knownSynergy: false,
      bridgesWorlds: false,
      needsBridge: false,
      partners,
      badge: `Slot A: ${a.name}`,
      prompt: `Now pick a second technology to intersect with ${a.name} — pulsing chips mark authored synergy pairs.`,
    };
  }
  const techA = a || b;
  const techB = a ? b : null;
  if (!techB || techA.id === techB.id) {
    return {
      ready: false,
      techA,
      techB: null,
      knownSynergy: false,
      bridgesWorlds: false,
      needsBridge: false,
      badge: `Slot A: ${techA.name}`,
      prompt: `Pick a different second technology to intersect with ${techA.name}.`,
    };
  }

  const knownSynergy = Boolean(
    techA.pairs?.includes(techB.id) || techB.pairs?.includes(techA.id)
  );
  const wA = techA.polarity || "bits";
  const wB = techB.polarity || "bits";
  const bridgesWorlds = wA === "split" || wB === "split";
  const needsBridge =
    (wA === "bits" && wB === "atoms") || (wA === "atoms" && wB === "bits");

  const place = String(ctx.place || "this place").trim() || "this place";
  const scarcity = String(ctx.scarcity || "").trim();
  const goalPhrase = scarcity ? `make "${scarcity}" abundant` : "ease the core crisis";
  const bridgeNote = needsBridge
    ? " Name the human or physical handoff step between digital and physical."
    : "";

  const badgeParts = [];
  if (knownSynergy) badgeParts.push("⚡ Known Synergy Pair (×1.25)");
  if (bridgesWorlds) badgeParts.push("✓ Bridges Bits ↔ Atoms");
  else if (needsBridge) badgeParts.push("⚠️ Bits + Atoms — add Bridge or Human handoff");

  return {
    ready: true,
    techA,
    techB,
    knownSynergy,
    bridgesWorlds,
    needsBridge,
    badge: badgeParts.join(" · ") || "Cross-domain intersection",
    prompt: `How can ${techA.name} + ${techB.name} work together in ${place} to ${goalPhrase}?${bridgeNote}`,
  };
}

/**
 * Build the 3-zone emTech Convergence Canvas (`Bits` | `Bridge` | `Atoms`)
 * grouping all 29 technologies by domain with live board highlights.
 *
 * @param {Record<string, object>|string[]} techTracks
 * @param {object|null|undefined} mission
 * @param {string[]} [selectedPair]
 * @param {{ place?: string, scarcity?: string, year?: number }} [ctx]
 */
export function buildConvergenceCanvas(
  techTracks = {},
  mission = null,
  selectedPair = [],
  ctx = {}
) {
  const activeIds = new Set(
    Array.isArray(techTracks) ? techTracks : Object.keys(techTracks || {})
  );
  const pair = Array.isArray(selectedPair) ? selectedPair.filter((id) => TECH_BY_ID.has(id)).slice(0, 2) : [];
  const slotA = pair[0] || null;
  const slotB = pair[1] || null;

  const suggestedIds = new Set([
    ...(Array.isArray(mission?.suggested) ? mission.suggested : []),
    mission?.spotlight?.techId || null,
  ].filter(Boolean));

  // Highlight synergy partners of Slot A (if picking Slot B), else partners of any active board tech
  const synergySourceIds = slotA && !slotB ? [slotA] : [...activeIds];
  const synergyPartnerIds = new Set();
  for (const srcId of synergySourceIds) {
    const t = TECH_BY_ID.get(srcId);
    for (const pid of t?.pairs || []) {
      if (pid !== slotA) synergyPartnerIds.add(pid);
    }
  }

  let hasBitsActive = false;
  let hasAtomsActive = false;
  let hasBridgeActive = false;
  for (const id of activeIds) {
    const p = TECH_BY_ID.get(id)?.polarity;
    if (p === "bits") hasBitsActive = true;
    else if (p === "atoms") hasAtomsActive = true;
    else if (p === "split") hasBridgeActive = true;
  }
  const needsBridgeHighlight = hasBitsActive && hasAtomsActive && !hasBridgeActive;

  const zoneMeta = {
    bits: {
      id: "bits",
      label: "Bits",
      subtitle: "Digital, intelligence & coordination",
    },
    split: {
      id: "split",
      label: "Bridge",
      subtitle: "Converters linking Bits ↔ Atoms",
    },
    atoms: {
      id: "atoms",
      label: "Atoms",
      subtitle: "Physical matter, energy & hardware",
    },
  };

  const zones = WORLD_ORDER.map((worldId) => {
    const inWorld = TECHS.filter((t) => (t.polarity || "bits") === worldId);
    const groups = [];
    for (const domainId of DOMAIN_ORDER) {
      const techs = inWorld
        .filter((t) => t.domain === domainId)
        .map((t) => ({
          id: t.id,
          name: t.name,
          icon: t.icon || "",
          domain: t.domain,
          world: t.polarity || "bits",
          summary: t.summary || "",
          inPlay: activeIds.has(t.id),
          synergy: synergyPartnerIds.has(t.id),
          recommended: suggestedIds.has(t.id),
          selectedSlot: t.id === slotA ? "A" : t.id === slotB ? "B" : null,
          pairs: Array.isArray(t.pairs) ? [...t.pairs] : [],
        }));
      if (!techs.length) continue;
      const dom = DOMAINS[domainId] || { label: domainId, color: "#94a3b8" };
      groups.push({
        domainId,
        domainLabel: dom.label,
        color: dom.color,
        techs,
      });
    }
    return {
      ...zoneMeta[worldId],
      highlightBridge: worldId === "split" && needsBridgeHighlight,
      count: inWorld.length,
      groups,
    };
  });

  return {
    zones,
    selectedPair: pair,
    needsBridgeHighlight,
    pairAnalysis: analyzeConvergencePair(slotA, slotB, ctx),
  };
}

/**
 * Pick 3 best-fit SCAMPER letters given a challenger angle, world gap, or seed text.
 *
 * @param {{ challengerAngle?: string|null, seedText?: string, world?: string, hasBridgeGap?: boolean }} [opts]
 * @returns {string[]}
 */
export function recommendedScamperForSeed(opts = {}) {
  const angle = String(opts?.challengerAngle || "").toLowerCase();
  if (angle && CHALLENGER_LENS_MAP[angle]?.scamper) {
    return [...CHALLENGER_LENS_MAP[angle].scamper];
  }
  const text = String(opts?.seedText || "").toLowerCase();
  if (opts?.hasBridgeGap) return ["C", "S", "R"];
  if (/\b(cost|fund|budget|pay|price|expensive|afford)\b/.test(text)) return ["E", "P", "C"];
  if (/\b(waste|toxic|brine|pollut|emission|heat|water|land)\b/.test(text)) return ["S", "E", "M"];
  if (/\b(trust|audit|public|permit|fear|vote|fair)\b/.test(text)) return ["R", "C", "A"];
  return ["S", "C", "R"];
}

/**
 * Build the tailored Player-Prompt-First guiding question for the active Diverge method.
 *
 * @param {"seed"|"convergence"|"sit"|"scamper"} method
 * @param {object} [opts]
 */
export function buildLensPrompt(method, opts = {}) {
  const place = String(opts.place || "this place").trim() || "this place";
  const year = Number(opts.year) || 2026;
  const scarcity = String(opts.scarcity || "").trim();
  const seedTitle = String(opts.seedTitle || "").trim();
  const seedText = String(opts.seedText || "").trim();
  const seedRef = seedTitle || (seedText ? clip(seedText, 48) : "your active idea");

  if (method === "convergence") {
    const pair = Array.isArray(opts.convergencePair) ? opts.convergencePair : [];
    const analysis = analyzeConvergencePair(pair[0], pair[1], { place, scarcity, year });
    return {
      heading:
        analysis.techA && analysis.techB
          ? `${analysis.techA.name} × ${analysis.techB.name}`
          : "Pick two technologies to intersect",
      question: analysis.prompt,
      hint: analysis.badge || "Select any two chips across Bits, Bridge, and Atoms.",
    };
  }

  if (method === "sit") {
    const lens = SIT_LENSES.find((l) => l.id === opts.sitLens) || SIT_LENSES[0];
    const qByLens = {
      subtraction: `Strip one assumed part out of "${seedRef}" in ${place}. What local piece already there takes over its job?`,
      division: `Split "${seedRef}" in time, physical location, or batch size so it fits ${place} in ${year}.`,
      multiplication: `Copy one part already inside "${seedRef}" and tweak the copy for a second threshold or condition.`,
      addition: `Give a second job to a person, ledger, vehicle, or hardware loop already present in ${place} alongside "${seedRef}".`,
    };
    return {
      heading: `SIT · ${lens.symbol} ${lens.label}`,
      question: qByLens[lens.id] || lens.hint,
      hint: lens.hint,
    };
  }

  if (method === "scamper") {
    const letters = (Array.isArray(opts.scamperLetters) ? opts.scamperLetters : ["S"])
      .map((l) => SCAMPER_LENSES.find((row) => row.id === l))
      .filter(Boolean);
    const chosen = letters.length ? letters : [SCAMPER_LENSES[0]];
    const angle = String(opts.challengerAngle || "").toLowerCase();
    const angleNote = CHALLENGER_LENS_MAP[angle]?.note || "";
    const labels = chosen.map((l) => `${l.letter} (${l.label})`).join(" · ");
    const challengeBit = opts.challengerQuestion
      ? ` to answer: "${clip(opts.challengerQuestion, 95)}"`
      : scarcity
        ? ` to ease "${scarcity}"`
        : "";
    return {
      heading: `SCAMPER · ${labels}`,
      question: `Remix "${seedRef}" using ${labels} in ${place}${challengeBit}.`,
      hint: angleNote || chosen[0].hint,
    };
  }

  // Default: "seed"
  const ucTitles = (Array.isArray(opts.useCaseTitles) ? opts.useCaseTitles : []).filter(Boolean);
  const techName = String(opts.techName || "").trim();
  const capability = ucTitles.length
    ? ucTitles.slice(0, 2).join(" + ")
    : techName || "your chosen emerging tech";
  const target = scarcity ? `"${scarcity}"` : "the main bottleneck";
  return {
    heading: "Seed from Scarcity + Use Cases",
    question: `How can ${capability} make ${target} abundant in ${place} (${year})?`,
    hint: "Write one concrete mechanism sentence (who operates it, on what hardware, with what local handoff) — or deal 3 AI ideas.",
  };
}

/**
 * Expand one Workbench Idea Card into 1 or 2 Pathway ingredient partials.
 * A Convergence Idea with both `techId` and `secondaryTechId` produces two paired
 * ingredients so Convergence synergy (×1.25), World Bridge checks, and incremental
 * Budget billing all match 100%.
 *
 * @param {object} draft
 */
export function draftToIngredientPartials(draft) {
  if (!draft || typeof draft !== "object") return [];
  const techA = draft.techId ? techMeta(draft.techId) : null;
  const techB =
    draft.secondaryTechId && draft.secondaryTechId !== draft.techId
      ? techMeta(draft.secondaryTechId)
      : null;

  const title = clip(draft.title || techA?.name || "Invention", 72);
  const howText = String(draft.howText || "").trim().slice(0, 4000);
  const useCaseIds = Array.isArray(draft.useCaseIds) ? draft.useCaseIds.map(String) : [];

  if (techA && techB) {
    return [
      {
        techId: techA.id,
        useCaseIds,
        title: clip(`${title} (${techA.name})`, 76),
        howText,
        world: normalizeWorkbenchWorld(techA.polarity, techA.id),
        artUrl: draft.artUrl || null,
        artId: draft.artId || null,
        imagePrompt: String(draft.imagePrompt || howText || title).slice(0, 400),
        collectorCardId: draft.collectorCardId || null,
      },
      {
        techId: techB.id,
        useCaseIds: [],
        title: clip(`${techB.name} pair`, 76),
        howText: `Paired with ${techA.name} in ${title}: ${clip(howText, 320)}`,
        world: normalizeWorkbenchWorld(techB.polarity, techB.id),
        artUrl: null,
        artId: null,
        imagePrompt: `${techB.name} supporting ${clip(title, 60)}: ${clip(howText, 240)}`.slice(0, 400),
        collectorCardId: null,
      },
    ];
  }

  return [
    {
      techId: techA ? techA.id : null,
      useCaseIds,
      title,
      howText,
      world: normalizeWorkbenchWorld(draft.world, techA?.id || null),
      artUrl: draft.artUrl || null,
      artId: draft.artId || null,
      imagePrompt: String(draft.imagePrompt || howText || title).slice(0, 400),
      collectorCardId: draft.collectorCardId || null,
    },
  ];
}

/**
 * Deterministic 0ms Converge Pre-Flight evaluation for staged Draft Cards.
 * Computes World chain completeness, Curve horizon, ⚡ Synergy pairs, target Crises,
 * and exact incremental Budget / Goodwill cost BEFORE the player spends a dollar.
 *
 * @param {object[]} drafts
 * @param {object|null|undefined} board
 * @param {number} questYear
 * @param {{ budgetWillEnabled?: boolean, enforceWorlds?: boolean }} [opts]
 */
export function evaluateStagedDrafts(drafts, board, questYear = 2026, opts = {}) {
  const list = Array.isArray(drafts) ? drafts.filter(Boolean) : [];
  const enforceWorlds = opts.enforceWorlds !== false;
  const budgetWillEnabled = opts.budgetWillEnabled !== false;
  const y = Number(questYear) || 2026;

  const ingredients = list.flatMap((d, idx) =>
    draftToIngredientPartials(d).map((ing, subIdx) => ({
      ...ing,
      id: `staged-${idx}-${subIdx}`,
    }))
  );

  // 1. World chain check
  const worlds = ingredients.map((i) => i.world);
  const hasBits = worlds.includes("bits");
  const hasAtoms = worlds.includes("atoms");
  const hasBridge = worlds.includes("split");
  const hasHuman = worlds.includes("plain");
  const missingBridge = needsBridgeWarning({ ingredients }, enforceWorlds);

  let worldStatus = "empty";
  let worldSummary = "Stage 1 or more drafts to inspect handoff, horizon, and cost.";
  if (ingredients.length > 0) {
    if (missingBridge) {
      worldStatus = "missing-bridge";
      worldSummary = "Bits + Atoms staged without a Bridge or Human handoff step.";
    } else if (hasBits && hasAtoms && (hasBridge || hasHuman)) {
      worldStatus = "complete";
      worldSummary = "Complete Bits ↔ Bridge/Human ↔ Atoms handoff.";
    } else if (hasBridge) {
      worldStatus = "complete";
      worldSummary = "Bridge technology naturally connects digital and physical worlds.";
    } else if (hasHuman && !hasBits && !hasAtoms) {
      worldStatus = "complete";
      worldSummary = "Human workflow step (0$ Budget — bridges any world).";
    } else {
      worldStatus = "single-world";
      worldSummary = hasBits
        ? "Bits-only draft — ready to mint, or stage an Atoms/Bridge draft to act physically."
        : "Atoms-only draft — ready to mint, or stage a Bits/Bridge draft for sensing/control.";
    }
  }

  // 2. Curve horizon check
  const useCases = board?.useCases || {};
  const earlyYears = [];
  for (const ing of ingredients) {
    for (const ucId of ing.useCaseIds || []) {
      const uc = useCases[ucId];
      if (isUseCaseEarly(uc, y)) earlyYears.push(Number(uc.milestoneYear));
    }
  }
  const early = earlyYears.length > 0;
  const earliestForecast = early ? Math.min(...earlyYears) : null;
  const horizon = early
    ? {
        early: true,
        year: earliestForecast,
        tone: "forecast",
        label: `◌ ~${earliestForecast} Forecast (too early in ${y})`,
      }
    : {
        early: false,
        year: y,
        tone: "honest",
        label: `● ${y} Honest horizon`,
      };

  // 3. Convergence synergy pairs
  const convergences = convergenceRows(ingredients);

  // 4. Target perspectives / Crises coverage
  const crisesList = Object.values(board?.crises || {});
  const matchedCrises = [];
  const seenCrisisIds = new Set();
  for (const d of list) {
    const eases = String(d.eases || "").trim().toLowerCase();
    if (!eases) continue;
    for (const c of crisesList) {
      if (seenCrisisIds.has(c.id)) continue;
      const cName = String(c.name || "").toLowerCase();
      if (cName && (cName === eases || cName.includes(eases) || eases.includes(cName))) {
        seenCrisisIds.add(c.id);
        matchedCrises.push({
          id: c.id,
          name: c.name,
          role: c.role || "local",
          roleLabel: roleDisplay(c.role),
        });
      }
    }
  }

  // 5. Exact incremental Budget & Goodwill cost (matches placedTechEconomy / reconcileStackFromBoard)
  const alreadyPaidTechIds = new Set();
  for (const pw of Object.values(board?.pathways || {})) {
    for (const ing of pw?.ingredients || []) {
      if (!ing?.techId) continue;
      const isFreeCollector = Boolean(
        ing.collectorCardId && collectorInventionIsFree(board, ing.collectorCardId, ing.id)
      );
      if (!isFreeCollector) alreadyPaidTechIds.add(ing.techId);
    }
  }

  const newlyPaidTechIds = [];
  const freeCollectorTechIds = [];
  const seenNewPaid = new Set();
  let budget = 0;
  let will = 0;

  if (budgetWillEnabled) {
    for (const ing of ingredients) {
      const tid = ing.techId;
      if (!tid) continue;
      if (alreadyPaidTechIds.has(tid) || seenNewPaid.has(tid)) continue;
      const isFreeCollector = Boolean(
        ing.collectorCardId && collectorInventionIsFree(board, ing.collectorCardId, null)
      );
      if (isFreeCollector) {
        if (!freeCollectorTechIds.includes(tid)) freeCollectorTechIds.push(tid);
        continue;
      }
      seenNewPaid.add(tid);
      newlyPaidTechIds.push(tid);
      const t = techMeta(tid);
      if (t) {
        const c = techCost(t);
        budget += Number(c.budget) || 0;
        will += Number(c.will) || 0;
      }
    }
  }

  const costParts = [];
  if (budget > 0) costParts.push(`${budget}$`);
  if (will > 0) costParts.push(`Goodwill ${will}`);
  const costLabel = !ingredients.length
    ? "0$"
    : costParts.length
      ? costParts.join(" · ")
      : "0$";

  return {
    count: list.length,
    ingredientCount: ingredients.length,
    canMint: list.length > 0,
    worldChain: {
      hasBits,
      hasAtoms,
      hasBridge,
      hasHuman,
      needsBridge: missingBridge,
      status: worldStatus,
      summary: worldSummary,
    },
    horizon,
    convergences,
    crises: matchedCrises,
    cost: {
      budget,
      will,
      newlyPaidTechIds,
      alreadyPaidTechIds: [...alreadyPaidTechIds],
      freeCollectorTechIds,
      label: costLabel,
    },
  };
}

/**
 * Sanitize structured AI lens draft cards (`mode: "workbench-lens"`), guaranteeing
 * valid techIds, worlds, lenses, and concise field bounds.
 *
 * @param {unknown} rawIdeas
 * @param {object} [opts]
 */
export function sanitizeWorkbenchDrafts(rawIdeas, opts = {}) {
  const method = ["seed", "convergence", "sit", "scamper"].includes(opts.method)
    ? opts.method
    : "seed";
  const defaultTechId =
    opts.techId && TECH_BY_ID.has(opts.techId)
      ? opts.techId
      : Array.isArray(opts.techIds) && TECH_BY_ID.has(opts.techIds[0])
        ? opts.techIds[0]
        : null;
  const secondaryDefault =
    method === "convergence" &&
    Array.isArray(opts.techIds) &&
    opts.techIds[1] &&
    TECH_BY_ID.has(opts.techIds[1]) &&
    opts.techIds[1] !== defaultTechId
      ? opts.techIds[1]
      : null;
  const defaultEases = String(opts.eases || opts.scarcity || "").slice(0, 60);
  const useCaseIds = Array.isArray(opts.useCaseIds) ? opts.useCaseIds.map(String) : [];
  const seedLabel = String(opts.seedTitle || "").slice(0, 72);

  const list = Array.isArray(rawIdeas) ? rawIdeas : [];
  const out = [];
  const seenTitles = new Set();

  for (let i = 0; i < list.length && out.length < 4; i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const title = clip(row.title || row.name || "", 72);
    const howText = String(row.howText || row.insertText || row.blurb || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    if (!title || howText.length < 12) continue;
    const tKey = title.toLowerCase();
    if (seenTitles.has(tKey)) continue;
    seenTitles.add(tKey);

    // Explicit null is a human step. Absent or unknown ids fall back to the selected tech.
    const humanStep = row.techId === null;
    const rawTechId = humanStep
      ? null
      : row.techId != null && row.techId !== "" && TECH_BY_ID.has(String(row.techId))
        ? String(row.techId)
        : defaultTechId;
    const rawSecondary = humanStep
      ? null
      : row.secondaryTechId != null &&
          TECH_BY_ID.has(String(row.secondaryTechId)) &&
          String(row.secondaryTechId) !== rawTechId
        ? String(row.secondaryTechId)
        : secondaryDefault;

    const lens = String(row.lens || opts.lenses?.[i] || opts.lenses?.[0] || method).slice(0, 32);
    const lensLabel =
      String(row.lensLabel || "").trim().slice(0, 48) || formatLensBadge(method, lens);
    const world = humanStep ? "plain" : normalizeWorkbenchWorld(row.world, rawTechId);

    out.push({
      id: `draft-${slug(row.id || `${method}-${lens}-${title}`)}-${i + 1}`,
      method,
      lens,
      lensLabel,
      author: "ai",
      title,
      howText,
      techId: rawTechId,
      secondaryTechId: rawSecondary,
      useCaseIds: humanStep ? [] : useCaseIds,
      world,
      eases: clip(row.eases || defaultEases, 60),
      imagePrompt: clip(row.imagePrompt || howText, 400),
      collectorCardId: opts.collectorCardId || null,
      seedLabel,
    });
  }

  return out;
}

export function formatLensBadge(method, lens) {
  if (method === "sit") {
    const row = SIT_LENSES.find((l) => l.id === lens);
    return row ? `SIT · ${row.symbol} ${row.label}` : "SIT";
  }
  if (method === "scamper") {
    const row = SCAMPER_LENSES.find((l) => l.id === String(lens || "").toUpperCase());
    return row ? `SCAMPER · ${row.letter} ${row.label}` : "SCAMPER";
  }
  if (method === "convergence") return "🔀 Convergence";
  return "💡 Seed";
}

/**
 * Deterministic offline/fallback Draft Card generator for all 4 Workbench methods.
 * Grounded in place, year, stakeholder, scarcity, chosen techs, and seed text.
 *
 * @param {object} opts
 */
export function localWorkbenchLensDrafts(opts = {}) {
  const method = ["seed", "convergence", "sit", "scamper"].includes(opts.method)
    ? opts.method
    : "seed";
  const place = String(opts.place || "this town").trim() || "this town";
  const year = Number(opts.year) || 2026;
  const stakeholder = String(opts.stakeholder || "local operators").split(",")[0].trim() || "local operators";
  const scarcity = String(opts.scarcity || opts.eases || "").trim();
  const eases = String(opts.eases || scarcity || "").slice(0, 60);
  const seedTitle = String(opts.seedTitle || "").trim();
  const seedText = String(opts.seedText || "").trim();
  const techIds = Array.isArray(opts.techIds) ? opts.techIds.filter((id) => TECH_BY_ID.has(id)) : [];
  const techA = techMeta(techIds[0] || opts.techId);
  const techB = techMeta(techIds[1]);
  const useCaseIds = Array.isArray(opts.useCaseIds) ? opts.useCaseIds.map(String) : [];

  const goalText = scarcity ? `ease ${scarcity}` : "relieve the top local bottleneck";
  const baseAnchor = seedTitle || (techA ? techA.name : "local workflow");

  if (method === "convergence" && techA && techB) {
    const needBridge =
      (techA.polarity === "bits" && techB.polarity === "atoms") ||
      (techA.polarity === "atoms" && techB.polarity === "bits");
    const handoff = needBridge
      ? ` ${stakeholder} verifies each physical switchover on a shared local checklist.`
      : "";
    return sanitizeWorkbenchDrafts(
      [
        {
          id: `conv-${techA.id}-${techB.id}-loop`,
          lens: "convergence",
          lensLabel: `🔀 ${techA.name} × ${techB.name}`,
          title: clip(`${techA.name} + ${techB.name} loop`, 64),
          howText: `In ${place} (${year}), ${techA.name.toLowerCase()} guides ${techB.name.toLowerCase()} in one closed local cycle so ${stakeholder} can ${goalText} on site.${handoff}`,
          techId: techA.id,
          secondaryTechId: techB.id,
          world: techA.polarity || "bits",
          eases,
        },
        {
          id: `conv-${techA.id}-${techB.id}-shared`,
          lens: "convergence",
          lensLabel: `🔀 ${techA.name} × ${techB.name}`,
          title: clip(`Co-op ${techB.name.toLowerCase()} guided by ${techA.name.toLowerCase()}`, 64),
          howText: `${stakeholder} runs modular ${techB.name.toLowerCase()} units dispatched by ${techA.name.toLowerCase()} in ${place}, cutting waste and proving results publicly each week.${handoff}`,
          techId: techA.id,
          secondaryTechId: techB.id,
          world: techA.polarity || "bits",
          eases,
        },
      ],
      { method, techIds: [techA.id, techB.id], eases, scarcity, useCaseIds, seedTitle }
    );
  }

  if (method === "sit") {
    const requested = Array.isArray(opts.lenses) && opts.lenses.length
      ? opts.lenses.filter((id) => SIT_LENSES.some((l) => l.id === id))
      : ["subtraction"];
    const lenses = requested.length ? requested : ["subtraction"];
    const templates = {
      subtraction: {
        title: `Stripped-down ${baseAnchor}`,
        howText: `Remove the heaviest external step from ${baseAnchor} in ${place}: ${stakeholder} runs the core ${techA ? techA.name.toLowerCase() : "local"} stage inline on existing site infrastructure to ${goalText} in ${year}.`,
      },
      division: {
        title: `Split-stage ${baseAnchor}`,
        howText: `Divide ${baseAnchor} into small neighborhood units in ${place}: daytime capture stays separate from overnight processing so ${stakeholder} can isolate faults and ${goalText}.`,
      },
      multiplication: {
        title: `Dual-threshold ${baseAnchor}`,
        howText: `Deploy two paired ${techA ? techA.name.toLowerCase() : "local"} stages inside ${baseAnchor} in ${place} — one tuned for baseline load and a second copy that fires automatically during peak spikes to ${goalText}.`,
      },
      addition: {
        title: `Shared-duty ${baseAnchor}`,
        howText: `Give ${stakeholder}'s existing daily inspection route a second job inside ${baseAnchor}: each shift logs live readings and swaps cartridges in ${place} with no new external crew needed.`,
      },
    };
    return sanitizeWorkbenchDrafts(
      lenses.map((lensId) => ({
        id: `sit-${lensId}-${slug(baseAnchor)}`,
        lens: lensId,
        lensLabel: formatLensBadge("sit", lensId),
        ...(templates[lensId] || templates.subtraction),
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      })),
      { method, techId: techA?.id || null, eases, scarcity, useCaseIds, seedTitle }
    );
  }

  if (method === "scamper") {
    const requested = Array.isArray(opts.lenses) && opts.lenses.length
      ? opts.lenses
          .map((l) => String(l).toUpperCase())
          .filter((id) => SCAMPER_LENSES.some((l) => l.id === id))
      : ["S"];
    const lenses = (requested.length ? requested : ["S"]).slice(0, 3);
    const templates = {
      S: {
        title: `Local-swap ${baseAnchor}`,
        howText: `Substitute the scarce imported input in ${baseAnchor} with locally recovered materials in ${place}, letting ${stakeholder} keep ${techA ? techA.name.toLowerCase() : "the workflow"} running through ${year} to ${goalText}.`,
      },
      C: {
        title: `Combined ${baseAnchor} hub`,
        howText: `Combine ${baseAnchor} with an existing municipal routine in ${place} so one crew and budget line covers both upkeep and ${scarcity || "crisis relief"}.`,
      },
      A: {
        title: `Adapted ${baseAnchor} safeguard`,
        howText: `Adapt proven cooperative safety checklists from nearby utilities into ${baseAnchor} in ${place}, so ${stakeholder} can spot drifts early and ${goalText}.`,
      },
      M: {
        title: `Right-sized ${baseAnchor}`,
        howText: `Modify ${baseAnchor} to run in continuous low-footprint cycles in ${place} instead of high-risk surges, cutting strain while still easing ${scarcity || "the crisis"}.`,
      },
      P: {
        title: `Dual-use ${baseAnchor}`,
        howText: `Put ${baseAnchor} to a second civic use in ${place} during off-peak hours so local partners co-fund maintenance and strengthen public support.`,
      },
      E: {
        title: `Zero-bottleneck ${baseAnchor}`,
        howText: `Eliminate the storage and haulage bottleneck inside ${baseAnchor} in ${place} by processing directly at the source, cutting waste and easing ${scarcity || "pressure"}.`,
      },
      R: {
        title: `Community-led ${baseAnchor}`,
        howText: `Reverse who verifies ${baseAnchor} in ${place}: give ${stakeholder} and residents live read-access and shutoff authority before payouts release, locking in trust and accountability.`,
      },
    };
    return sanitizeWorkbenchDrafts(
      lenses.map((letter) => ({
        id: `scamper-${letter.toLowerCase()}-${slug(baseAnchor)}`,
        lens: letter,
        lensLabel: formatLensBadge("scamper", letter),
        ...(templates[letter] || templates.S),
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      })),
      { method, techId: techA?.id || null, eases, scarcity, useCaseIds, seedTitle }
    );
  }

  // Default: "seed"
  const techName = techA ? techA.name : "Local stewards";
  const ucLead = String(opts.useCaseHint || "").trim();
  const ucSnippet = ucLead ? ` building on ${clip(ucLead, 80)}` : "";
  return sanitizeWorkbenchDrafts(
    [
      {
        id: `seed-${slug(techName)}-direct`,
        lens: "seed",
        lensLabel: "💡 Seed · Relief",
        title: clip(`${techName} field loop`, 64),
        howText: `${stakeholder} deploys ${techName.toLowerCase()} directly in ${place} (${year})${ucSnippet} to ${goalText} with weekly open checks.`,
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      },
      {
        id: `seed-${slug(techName)}-coop`,
        lens: "seed",
        lensLabel: "💡 Seed · Co-op",
        title: clip(`Shared ${techName.toLowerCase()} station`, 64),
        howText: `Neighbors in ${place} share a maintained ${techName.toLowerCase()} unit overseen by ${stakeholder} to cut cost and ${goalText} without external haul-in.`,
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      },
      {
        id: `seed-${slug(techName)}-handoff`,
        lens: "seed",
        lensLabel: "💡 Seed · Human Bridge",
        title: clip(`${stakeholder} handoff & ledger`, 64),
        howText: `${stakeholder} pairs ${techName.toLowerCase()} readings with a public neighborhood schedule in ${place} so residents verify every outcome firsthand.`,
        techId: null,
        world: "plain",
        eases,
      },
    ],
    { method: "seed", techId: techA?.id || null, eases, scarcity, useCaseIds, seedTitle }
  );
}
