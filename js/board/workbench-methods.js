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
 * Pure, DOM-free Design Thinking Double-Diamond & structured ideation methods
 * for the Lane 3 Innovation Workbench:
 * - Diamond 1 (Problem Space):
 *   1. Discover (◇ Diverge): unpack Stakeholder, Here & Now pain, Root Cause,
 *      Trust/Friction, and Field Constraints from the Quest + player/AI insights
 *   2. Define (◆ Converge): synthesize & lock a sharp "How Might We…" (HMW) brief
 * - Diamond 2 (Solution Space):
 *   3. Develop (◇ Diverge): Seed, SIT (4 closed-world lenses), and SCAMPER (7 open lenses)
 *   4. Deliver (◆ Converge): modular Idea → Pathway assembly & non-destructive disassembly
 */

import { TECHS } from "../data.js";
import { techCost } from "../sim/economy.js";
import { collectorInventionIsFree } from "../ontology/collector-ontology.js";
import { convergenceRows, isUseCaseEarly, needsBridgeWarning } from "./pathway-model.js";

export const DOUBLE_DIAMOND_STAGES = Object.freeze([
  {
    id: "problem",
    num: 1,
    title: "Diamond 1 · Problem Space",
    diverge: { step: "1 · Discover", symbol: "◇", sub: "Unpack tensions" },
    converge: { step: "2 · Define", symbol: "◆", sub: "How Might We…" },
  },
  {
    id: "solution",
    num: 2,
    title: "Diamond 2 · Solution Space",
    diverge: { step: "3 · Develop", symbol: "◇", sub: "Generate Ideas" },
    converge: { step: "4 · Deliver", symbol: "◆", sub: "Assemble Pathways" },
  },
]);

export const WORKBENCH_METHODS = Object.freeze([
  {
    id: "seed",
    icon: "💡",
    label: "Seed",
    short: "Answer your How Might We",
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
 * Extract scarcity prompts from live crises and Quest scene (used as bottleneck patterns
 * inside Diamond 1 Discovery clues and fallback framing).
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
    mission?.job || "",
    mission?.stakeholder || "",
    ...sortedCrises.map((c) => `${c?.name || ""} ${c?.description || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const patterns = [
    {
      id: "scarcity:trust",
      re: /\b(trust|proof|audit|permit|ledger|verified|transparency|legitimac|fear|backlash|doubt)\b/,
      label: "Trusted local proof",
      detail: "Visible, verifiable evidence community stewards can check without middlemen.",
    },
    {
      id: "scarcity:power",
      re: /\b(power|grid|electric|diesel|fuel|heat|brine|energy|blackout|cool|cold|fridge|spoil)\b/,
      label: "Reliable cold chain & power",
      detail: "Steady local thermal or power loop without waste or backup failures.",
    },
    {
      id: "scarcity:water",
      re: /\b(water|well|river|brine|silt|flood|drought|irrigation|aquifer|runoff|mud)\b/,
      label: "Protected water & terrain",
      detail: "Safe flow and all-weather access without toxic runoff or washouts.",
    },
    {
      id: "scarcity:supply",
      re: /\b(truck|feedstock|haul|supply|mineral|lithium|fertilizer|medicine|clinic|parts|road|blood)\b/,
      label: "Timely local delivery & supply",
      detail: "Reaching people on time without fragile long-haul road bottlenecks.",
    },
    {
      id: "scarcity:time",
      re: /\b(crew|nurse|teacher|farmer|operator|hours|backlog|wait|inspection|testing|lab|ward)\b/,
      label: "Skilled local hours",
      detail: "Multiplying scarce frontline human time on the hardest bottleneck.",
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
 * Diamond 1 · Step 1 (DISCOVER): unpack rich ground-truth clues from the Quest
 * (Stakeholder need, Here & now pain, Root cause, Public support/trust friction,
 * Town rules, and physical/operational constraints).
 *
 * @param {object|null|undefined} mission
 * @param {object[]} [crises]
 * @param {object[]} [rules]
 */
export function extractDiscoveryClues(mission, crises = [], rules = []) {
  const clues = [];
  const stakeholder = String(mission?.stakeholder || "").trim();
  const jobText = String(mission?.job || mission?.summary || mission?.scene || "").trim();

  if (stakeholder || jobText) {
    const shortWho = stakeholder ? clip(stakeholder.split(",")[0].trim(), 48) : "Frontline steward";
    clues.push({
      id: "clue:stakeholder",
      kind: "stakeholder",
      badge: "👤 Stakeholder Need",
      title: stakeholder ? clip(stakeholder, 68) : "Who is counting on us",
      detail: jobText
        ? clip(jobText, 180)
        : `Understand what ${shortWho} needs on the ground without creating new burdens.`,
      role: null,
      crisisId: null,
    });
  }

  const roleMeta = {
    local: { badge: "🔥 Here & Now Pain", fallback: "Immediate frontline harm" },
    global: { badge: "🌱 Root Cause", fallback: "Underlying structural driver" },
    support: { badge: "🤝 Trust & Friction", fallback: "Institutional or community pushback" },
  };
  const roleOrder = { local: 0, global: 1, support: 2 };
  const orderedCrises = [...(Array.isArray(crises) ? crises : [])].sort(
    (a, b) => (roleOrder[a?.role] ?? 9) - (roleOrder[b?.role] ?? 9)
  );

  for (const c of orderedCrises) {
    const name = String(c?.name || "").trim();
    if (!name) continue;
    const meta = roleMeta[c.role] || { badge: "⚠️ Pressure", fallback: name };
    const meterBit =
      c.level != null
        ? ` (Meter ${c.level}/5${c.goal != null ? `, goal ≤${c.goal}` : ""})`
        : "";
    clues.push({
      id: `clue:crisis:${c.id || slug(name)}`,
      kind: c.role || "crisis",
      badge: meta.badge,
      title: `${name}${meterBit}`,
      cleanTitle: name,
      detail: clip(c.description || meta.fallback, 180),
      role: c.role || null,
      crisisId: c.id || null,
    });
  }

  for (const r of (Array.isArray(rules) ? rules : []).slice(0, 2)) {
    const label = String(r?.label || "").trim();
    if (!label) continue;
    clues.push({
      id: `clue:rule:${r.id || slug(label)}`,
      kind: "constraint",
      badge: "🏛️ Local Rule",
      title: clip(label, 68),
      cleanTitle: label,
      detail: clip(r.body || "Active local regulation shaping what can be fielded here.", 160),
      role: null,
      crisisId: null,
    });
  }

  const bottlenecks = extractScarcityPrompts(mission, crises).filter((p) => !p.crisisId);
  for (const b of bottlenecks.slice(0, 2)) {
    clues.push({
      id: `clue:${b.id}`,
      kind: "constraint",
      badge: "⛓️ Field Constraint",
      title: b.label,
      cleanTitle: b.label,
      detail: b.detail,
      role: null,
      crisisId: null,
    });
  }

  if (!clues.length) {
    clues.push({
      id: "clue:default",
      kind: "local",
      badge: "🔥 Ground Reality",
      title: "What is breaking down right now?",
      cleanTitle: "Local bottleneck",
      detail: "Identify who feels the pain first, what causes it upstream, and why quick fixes fail.",
      role: "local",
      crisisId: null,
    });
  }

  return clues.slice(0, 6);
}

/**
 * Diamond 1 · Step 2 (DEFINE): synthesize 3–4 sharp, human-centered
 * "How Might We…" (HMW) problem statements from the Quest and selected Discover clues,
 * without locking prematurely onto any single gadget.
 *
 * @param {object|null|undefined} mission
 * @param {object[]} [crises]
 * @param {object[]} [selectedClues]
 */
export function synthesizeHmwCandidates(mission, crises = [], selectedClues = []) {
  const place = String(mission?.place || "this community").trim() || "this community";
  const rawStakeholder = String(mission?.stakeholder || "").trim();
  const shortWho = rawStakeholder
    ? clip(rawStakeholder.split(",")[0].trim(), 42)
    : `stewards in ${place}`;

  const byRole = new Map();
  for (const c of Array.isArray(crises) ? crises : []) {
    if (c?.role && c?.name && !byRole.has(c.role)) byRole.set(c.role, c);
  }
  const localC = byRole.get("local") || crises[0] || null;
  const globalC = byRole.get("global") || crises[1] || null;
  const supportC = byRole.get("support") || crises[2] || null;

  const out = [];
  const pushUnique = (id, tag, text) => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    if (out.some((row) => row.howText.toLowerCase() === clean.toLowerCase())) return;
    out.push({ id, tag, howText: clip(clean, 220) });
  };

  // 1. If the player selected specific clues (especially custom insights), synthesize a tailored HMW first!
  const customSelected = (Array.isArray(selectedClues) ? selectedClues : []).filter(
    (c) => c && (c.kind === "insight" || c.author === "player" || c.author === "ai")
  );
  if (customSelected.length) {
    const focusInsight = clip(customSelected[0].cleanTitle || customSelected[0].title || customSelected[0].detail, 72);
    const guardBit = supportC?.name
      ? ` while earning trust around ${supportC.name}`
      : localC?.name
        ? ` so ${localC.name} eases`
        : "";
    pushUnique(
      "hmw-insight",
      "From Your Discovery",
      `How might we help ${shortWho} overcome "${focusInsight}" in ${place}${guardBit}?`
    );
  }

  // 2. Integrated full-system HMW combining urgent need + trust/constraint
  if (localC && supportC) {
    pushUnique(
      "hmw-integrated",
      "Balanced System Brief",
      `How might we help ${shortWho} ease ${localC.name} in ${place} quickly and reliably, without worsening ${supportC.name}?`
    );
  } else if (mission?.job) {
    const cleanedJob = String(mission.job)
      .replace(/^help\s+/i, "")
      .replace(/\.$/, "")
      .trim();
    pushUnique(
      "hmw-job",
      "Core Quest Brief",
      `How might we help ${clip(cleanedJob, 175)}?`
    );
  }

  // 3. Here & now + Root cause HMW
  if (localC && globalC) {
    pushUnique(
      "hmw-root",
      "Here & Now + Root Cause",
      `How might we solve ${localC.name} right now while tackling the root driver of ${globalC.name} in ${place}?`
    );
  } else if (localC) {
    pushUnique(
      "hmw-local",
      "Urgent Relief",
      `How might we help ${shortWho} relieve ${localC.name} in ${place} using resources that hold up on the ground?`
    );
  }

  // 4. Constraint / Steward trust HMW
  if (supportC || globalC) {
    const targetName = supportC?.name || globalC?.name;
    pushUnique(
      "hmw-trust",
      "Trust & Lasting Adoption",
      `How might we design a transparent local workflow with ${shortWho} that turns ${targetName} from a blocker into shared confidence?`
    );
  }

  if (!out.length) {
    pushUnique(
      "hmw-fallback",
      "Problem Brief",
      `How might we help ${shortWho} relieve the core bottleneck in ${place} honestly and sustainably?`
    );
  }

  return out.slice(0, 4);
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
  if (/\b(waste|toxic|brine|pollut|emission|heat|water|land|spoil)\b/.test(text)) return ["S", "E", "M"];
  if (/\b(trust|audit|public|permit|fear|vote|fair|doubt)\b/.test(text)) return ["R", "C", "A"];
  return ["S", "C", "R"];
}

/**
 * Build the tailored Player-Prompt-First guiding question for the active Develop method
 * (`seed`, `sit`, or `scamper`), anchored to the player's Defined HMW brief when present.
 *
 * @param {"seed"|"sit"|"scamper"} method
 * @param {object} [opts]
 */
export function buildLensPrompt(method, opts = {}) {
  const place = String(opts.place || "this place").trim() || "this place";
  const year = Number(opts.year) || 2026;
  const hmwBrief = String(opts.hmwBrief || "").trim();
  const scarcity = String(opts.scarcity || "").trim();
  const seedTitle = String(opts.seedTitle || "").trim();
  const seedText = String(opts.seedText || "").trim();
  const seedRef = seedTitle || (seedText ? clip(seedText, 48) : "your active idea");

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
      hint: hmwBrief ? `Keep aiming at: ${clip(hmwBrief, 120)}` : lens.hint,
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
      : hmwBrief
        ? ` toward your brief`
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
  if (hmwBrief) {
    return {
      heading: "Seed Ideas for Your Brief",
      question: `Using ${capability} in ${place} (${year}), what concrete mechanism answers your "How Might We…" brief?`,
      hint: "Name who operates it, on what hardware, and how the local handoff works — or deal 3 AI ideas.",
    };
  }
  const target = scarcity ? `"${scarcity}"` : "the core problem";
  return {
    heading: "Seed Ideas",
    question: `How can ${capability} address ${target} in ${place} (${year})?`,
    hint: "Write one concrete mechanism sentence (who operates it, on what hardware, with what local handoff) — or deal 3 AI ideas.",
  };
}

/**
 * Convert a Pathway ingredient cleanly back into a reusable Workbench Idea card
 * (preserving artwork, settled feasibility timing, world, techId, useCaseIds, and collectorCardId)
 * so disassembling a Pathway never loses work or re-triggers redundant API calls.
 *
 * @param {object} ing
 * @param {{ id?: string, eases?: string }} [opts]
 */
export function ingredientToWorkbenchIdea(ing, opts = {}) {
  if (!ing || typeof ing !== "object") return null;
  const tech = ing.techId ? techMeta(ing.techId) : null;
  const title = clip(ing.title || tech?.name || "Local idea", 72);
  const howText = String(ing.howText || title).trim().slice(0, 1200);
  const world = normalizeWorkbenchWorld(ing.world, tech?.id || null);
  const settledTiming =
    !ing.timingPending &&
    (ing.timingLevel === "green" || ing.timingLevel === "yellow" || ing.timingLevel === "red");

  return {
    id:
      opts.id ||
      `idea-${slug(ing.id || title)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    method: "seed",
    lens: tech ? "seed" : "human",
    lensLabel: tech ? `${tech.icon ? `${tech.icon} ` : "💡 "}${tech.name}` : "🤝 Human Step",
    author: "player",
    title,
    howText,
    techId: tech ? tech.id : null,
    secondaryTechId: null,
    useCaseIds: Array.isArray(ing.useCaseIds) ? ing.useCaseIds.map(String) : [],
    world,
    eases: String(opts.eases || "").slice(0, 60),
    imagePrompt: String(ing.imagePrompt || howText || title).slice(0, 400),
    artUrl: ing.artUrl || null,
    artId: ing.artId || null,
    artPending: false,
    timingLevel: settledTiming ? ing.timingLevel : null,
    timingPct: settledTiming && ing.timingPct != null ? Number(ing.timingPct) : null,
    timingReason: settledTiming ? String(ing.timingReason || "").slice(0, 400) : "",
    collectorCardId: ing.collectorCardId || null,
    seedLabel: "",
  };
}

/**
 * Expand one Workbench Idea Card into Pathway ingredient partial(s), preserving
 * existing artwork and settled timing so reassembling Ideas into new Pathways is instant.
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
  const settledTiming =
    !draft.timingPending &&
    (draft.timingLevel === "green" ||
      draft.timingLevel === "yellow" ||
      draft.timingLevel === "red");

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
        timingLevel: settledTiming ? draft.timingLevel : null,
        timingPct: settledTiming ? draft.timingPct : null,
        timingReason: settledTiming ? draft.timingReason || "" : "",
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
        timingLevel: null,
        timingPct: null,
        timingReason: "",
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
      timingLevel: settledTiming ? draft.timingLevel : null,
      timingPct: settledTiming ? draft.timingPct : null,
      timingReason: settledTiming ? draft.timingReason || "" : "",
      collectorCardId: draft.collectorCardId || null,
    },
  ];
}

/**
 * Deterministic 0ms evaluation for Idea Card incremental cost, world chain,
 * horizon, and synergy against the live board.
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
  let worldSummary = "Add 1 or more ideas to a Pathway to inspect handoff and horizon.";
  if (ingredients.length > 0) {
    if (missingBridge) {
      worldStatus = "missing-bridge";
      worldSummary = "Bits + Atoms combined without a Bridge or Human handoff step.";
    } else if (hasBits && hasAtoms && (hasBridge || hasHuman)) {
      worldStatus = "complete";
      worldSummary = "Complete Bits ↔ Bridge/Human ↔ Atoms handoff.";
    } else if (hasBridge) {
      worldStatus = "complete";
      worldSummary = "Bridge technology naturally connects digital and physical worlds.";
    } else if (hasHuman && !hasBits && !hasAtoms) {
      worldStatus = "complete";
      worldSummary = "Human workflow step — bridges any world.";
    } else {
      worldStatus = "single-world";
      worldSummary = hasBits
        ? "Bits-only idea — combine with an Atoms/Bridge idea to act physically."
        : "Atoms-only idea — combine with a Bits/Bridge idea for sensing/control.";
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
  if (budget > 0) costParts.push(`${budget} Budget`);
  if (will > 0) costParts.push(`${will} Goodwill`);
  const costLabel = costParts.join(" · ");

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
 * Sanitize structured AI lens cards (`mode: "workbench-lens"`), supporting both
 * Diamond 1 (`discover`, `define`) and Diamond 2 (`seed`, `sit`, `scamper`).
 *
 * @param {unknown} rawIdeas
 * @param {object} [opts]
 */
export function sanitizeWorkbenchDrafts(rawIdeas, opts = {}) {
  const method = ["discover", "define", "seed", "sit", "scamper"].includes(opts.method)
    ? opts.method
    : "seed";
  const defaultTechId =
    method === "discover" || method === "define"
      ? null
      : opts.techId && TECH_BY_ID.has(opts.techId)
        ? opts.techId
        : Array.isArray(opts.techIds) && TECH_BY_ID.has(opts.techIds[0])
          ? opts.techIds[0]
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
    const title = clip(row.title || row.name || (method === "define" ? "How Might We" : ""), 72);
    const howText = String(row.howText || row.insertText || row.blurb || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    if (!title || howText.length < 12) continue;
    const dedupeKey = method === "define" ? howText.toLowerCase() : title.toLowerCase();
    if (seenTitles.has(dedupeKey)) continue;
    seenTitles.add(dedupeKey);

    if (method === "discover" || method === "define") {
      out.push({
        id: `draft-${slug(row.id || `${method}-${title}`)}-${i + 1}`,
        method,
        lens: method === "define" ? "hmw" : "discover",
        lensLabel:
          String(row.lensLabel || "").trim().slice(0, 48) || formatLensBadge(method, method),
        author: "ai",
        title,
        howText,
        techId: null,
        secondaryTechId: null,
        useCaseIds: [],
        world: "plain",
        eases: defaultEases,
        imagePrompt: "",
        collectorCardId: null,
        seedLabel: "",
      });
      continue;
    }

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
        : null;

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
  if (method === "discover") return "🔍 Field Tension";
  if (method === "define") return "◆ How Might We";
  if (method === "sit") {
    const row = SIT_LENSES.find((l) => l.id === lens);
    return row ? `SIT · ${row.symbol} ${row.label}` : "SIT";
  }
  if (method === "scamper") {
    const row = SCAMPER_LENSES.find((l) => l.id === String(lens || "").toUpperCase());
    return row ? `SCAMPER · ${row.letter} ${row.label}` : "SCAMPER";
  }
  return "💡 Seed";
}

/**
 * Deterministic offline/fallback generator for Diamond 1 (`discover`, `define`)
 * and Diamond 2 (`seed`, `sit`, `scamper`).
 *
 * @param {object} opts
 */
export function localWorkbenchLensDrafts(opts = {}) {
  const method = ["discover", "define", "seed", "sit", "scamper"].includes(opts.method)
    ? opts.method
    : "seed";
  const place = String(opts.place || "this town").trim() || "this town";
  const year = Number(opts.year) || 2026;
  const stakeholder =
    String(opts.stakeholder || "local operators").split(",")[0].trim() || "local operators";
  const hmwBrief = String(opts.hmwBrief || "").trim();
  const scarcity = String(opts.scarcity || opts.eases || "").trim();
  const eases = String(opts.eases || scarcity || "").slice(0, 60);
  const seedTitle = String(opts.seedTitle || "").trim();
  const techIds = Array.isArray(opts.techIds) ? opts.techIds.filter((id) => TECH_BY_ID.has(id)) : [];
  const techA = techMeta(techIds[0] || opts.techId);
  const useCaseIds = Array.isArray(opts.useCaseIds) ? opts.useCaseIds.map(String) : [];

  if (method === "discover") {
    return sanitizeWorkbenchDrafts(
      [
        {
          id: "discover-handoff-gap",
          lensLabel: "🔍 Handoff Gap",
          title: "Last-mile timing & handoff friction",
          howText: `Even when supplies exist upstream, ${stakeholder} in ${place} faces delays and spoilage at the final handoff when conditions deteriorate.`,
        },
        {
          id: "discover-trust-loop",
          lensLabel: "🔍 Verification Gap",
          title: "Missing proof between partners",
          howText: `Regional partners hesitate to commit scarce stock to ${place} without live, trustworthy proof that each unit reaches its intended outcome without waste.`,
        },
        {
          id: "discover-upkeep-load",
          lensLabel: "🔍 Frontline Load",
          title: "Zero spare crew for complex upkeep",
          howText: `${stakeholder} already works at full capacity in ${year}, so any fragile workflow requiring specialist maintenance will stall after week one.`,
        },
      ],
      { method: "discover", eases, scarcity }
    );
  }

  if (method === "define") {
    const target = scarcity || "urgent community needs";
    return sanitizeWorkbenchDrafts(
      [
        {
          id: "define-hmw-speed",
          lensLabel: "◆ Urgent Relief",
          title: "Fast, all-conditions delivery",
          howText: `How might we help ${stakeholder} address ${target} in ${place} reliably on demand, without keeping idle stock that goes to waste?`,
        },
        {
          id: "define-hmw-trust",
          lensLabel: "◆ Shared Confidence",
          title: "Transparent accountability",
          howText: `How might we give both ${stakeholder} and upstream partners verifiable proof of every delivery in ${place} so trust and supply grow together?`,
        },
        {
          id: "define-hmw-simple",
          lensLabel: "◆ Frontline Simplicity",
          title: "Zero-burden local operation",
          howText: `How might we embed the solution into ${stakeholder}'s existing daily routine in ${place} (${year}) with minimal new upkeep?`,
        },
      ],
      { method: "define", eases, scarcity }
    );
  }

  const goalText = hmwBrief
    ? `answer "${clip(hmwBrief, 90)}"`
    : scarcity
      ? `ease ${scarcity}`
      : "relieve the top local bottleneck";
  const baseAnchor = seedTitle || (techA ? techA.name : "local workflow");

  if (method === "sit") {
    const requested =
      Array.isArray(opts.lenses) && opts.lenses.length
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
        howText: `Divide ${baseAnchor} into small neighborhood units in ${place}: intake stays separate from dispatch so ${stakeholder} can isolate faults and ${goalText}.`,
      },
      multiplication: {
        title: `Dual-threshold ${baseAnchor}`,
        howText: `Deploy two paired ${techA ? techA.name.toLowerCase() : "local"} stages inside ${baseAnchor} in ${place} — one tuned for baseline load and a second copy that fires automatically during urgent spikes to ${goalText}.`,
      },
      addition: {
        title: `Shared-duty ${baseAnchor}`,
        howText: `Give ${stakeholder}'s existing daily inspection route a second job inside ${baseAnchor}: each shift logs live readings and swaps packs in ${place} with no new external crew needed.`,
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
    const requested =
      Array.isArray(opts.lenses) && opts.lenses.length
        ? opts.lenses
            .map((l) => String(l).toUpperCase())
            .filter((id) => SCAMPER_LENSES.some((l) => l.id === id))
        : ["S"];
    const lenses = (requested.length ? requested : ["S"]).slice(0, 3);
    const templates = {
      S: {
        title: `Local-swap ${baseAnchor}`,
        howText: `Substitute the scarce external dependency in ${baseAnchor} with locally stewarded stock in ${place}, letting ${stakeholder} keep ${techA ? techA.name.toLowerCase() : "the workflow"} running through ${year} to ${goalText}.`,
      },
      C: {
        title: `Combined ${baseAnchor} hub`,
        howText: `Combine ${baseAnchor} with an existing civic routine in ${place} so one crew and budget line covers both upkeep and ${scarcity || "crisis relief"}.`,
      },
      A: {
        title: `Adapted ${baseAnchor} safeguard`,
        howText: `Adapt proven cooperative safety checklists from nearby utilities into ${baseAnchor} in ${place}, so ${stakeholder} can spot drifts early and ${goalText}.`,
      },
      M: {
        title: `Right-sized ${baseAnchor}`,
        howText: `Modify ${baseAnchor} to run in on-demand micro-dispatches in ${place} instead of wasteful bulk batches, cutting spoilage while easing ${scarcity || "the crisis"}.`,
      },
      P: {
        title: `Dual-use ${baseAnchor}`,
        howText: `Put ${baseAnchor} to a second civic use in ${place} during off-peak hours so local partners co-fund maintenance and strengthen public support.`,
      },
      E: {
        title: `Zero-bottleneck ${baseAnchor}`,
        howText: `Eliminate the idle middleman storage stage inside ${baseAnchor} in ${place} by dispatching directly from hub to point-of-use, cutting waste and easing ${scarcity || "pressure"}.`,
      },
      R: {
        title: `Community-led ${baseAnchor}`,
        howText: `Reverse who verifies ${baseAnchor} in ${place}: give ${stakeholder} and residents live read-access and sign-off authority before dispatches close, locking in trust.`,
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
        lensLabel: "💡 Seed · Direct",
        title: clip(`${techName} on-demand loop`, 64),
        howText: `${stakeholder} deploys ${techName.toLowerCase()} directly in ${place} (${year})${ucSnippet} to ${goalText} with open delivery checks.`,
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      },
      {
        id: `seed-${slug(techName)}-coop`,
        lens: "seed",
        lensLabel: "💡 Seed · Shared Hub",
        title: clip(`Shared ${techName.toLowerCase()} relay`, 64),
        howText: `Local partners in ${place} share a maintained ${techName.toLowerCase()} relay overseen by ${stakeholder} to cut waste and ${goalText}.`,
        techId: techA?.id || null,
        world: techA?.polarity || "plain",
        eases,
      },
      {
        id: `seed-${slug(techName)}-handoff`,
        lens: "seed",
        lensLabel: "💡 Seed · Human Bridge",
        title: clip(`${stakeholder} handoff & ledger`, 64),
        howText: `${stakeholder} pairs ${techName.toLowerCase()} dispatches with a signed local log in ${place} so partners verify every unit firsthand.`,
        techId: null,
        world: "plain",
        eases,
      },
    ],
    { method: "seed", techId: techA?.id || null, eases, scarcity, useCaseIds, seedTitle }
  );
}
