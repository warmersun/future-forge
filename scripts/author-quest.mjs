#!/usr/bin/env node
/**
 * Author a spotlight Quest tile (local template or AI draft).
 *
 *   node scripts/author-quest.mjs --tech gene-sequencing --local-only
 *   node scripts/author-quest.mjs --tech solar --advance "perovskite pilots" --global climate
 *
 * Output: output/quests/<slug>/quest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  GAME,
  GLOBALS,
  TECHS,
  allTechIds,
  techById,
  globalById,
} from "../js/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const args = parseArgs(process.argv.slice(2));
const techId = args.tech || args.t;
const localOnly = Boolean(args["local-only"] || args.localOnly);
const advance = args.advance || args.a || "";
const globalHint = args.global || args.g || "";

if (!techId) {
  console.error(
    "Usage: node scripts/author-quest.mjs --tech <techId> [--advance \"…\"] [--global climate] [--local-only]"
  );
  console.error(`Valid tech ids: ${allTechIds().join(", ")}`);
  process.exit(2);
}

const tech = techById(techId);
if (!tech) {
  console.error(`Unknown tech id: ${techId}`);
  console.error(`Valid: ${allTechIds().join(", ")}`);
  process.exit(2);
}

const global =
  (globalHint && globalById(globalHint)) ||
  guessGlobalForTech(tech) ||
  GLOBALS.find((g) => g.id === "climate");

const { QUEST_TILE_SCHEMA, validateQuestTile } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href
);

const slug = `spotlight-${tech.id}-${Date.now().toString(36)}`;
const place = `Fictive ${tech.name} field site`;
const advanceTitle =
  advance ||
  `Recent advance in ${tech.name} (fill after research)`;
const advanceSummary =
  advance ||
  tech.maturity?.near ||
  tech.summary ||
  `Capability in ${tech.name} is shifting — design a local application.`;

const briefMd = `## The place

**${place}** is a fictive locale where people feel a concrete strain that ${tech.name} could honestly touch — if someone invents the local workflow, not a brochure claim.

## What’s strained

Name three pressures the staff and residents feel this season. Tie them to meters the player will see.

## A capability that just became more real

${advanceSummary}

Teach the *kind* of capability. Do not prescribe one branded product or a single correct invention.

## Your brief

Invent something for this place that makes honest use of **${tech.name}** (${tech.id}) in year ${GAME.startYear}. Name it. Write how it works here. Show everyday life.

## Constraints

- Pilot-honest for ${GAME.startYear}; avoid overnight city-wide guarantees.
- Staff time, trust, power, and cost remain scarce.
- Other techs may support the stack, but this Quest is built to practice **${tech.name}**.
`;

const tile = {
  schema: QUEST_TILE_SCHEMA,
  kind: "quest",
  id: slug,
  version: 1,
  title: `${tech.name} under pressure at ${place}`,
  summary: `Practice ${tech.name}: invent a local application of a recent capability.`.slice(
    0,
    160
  ),
  author: { name: "author-quest.mjs", note: localOnly ? "local-only template" : "draft" },
  createdAt: new Date().toISOString(),
  tags: ["spotlight", tech.id, global.id],
  license: "MIT",
  placement: { mode: "replace-daily" },
  spotlight: {
    techId: tech.id,
    advanceTitle: String(advanceTitle).slice(0, 200),
    advanceSummary: String(advanceSummary).slice(0, 600),
    asOf: new Date().toISOString().slice(0, 7),
    encourageCopy: `Build your invention around ${tech.name} — the spotlight capability is the point of this Quest.`,
  },
  research: {
    topic: advance || tech.name,
    bullets: [
      "Replace with researched bullets before classroom use.",
      tech.summary,
    ].filter(Boolean),
    sources: [],
    showToPlayer: false,
  },
  globalId: global.id,
  mission: {
    id: slug,
    globalId: global.id,
    title: `${tech.name} under pressure at ${place}`.slice(0, 100),
    place: place.slice(0, 80),
    startYear: GAME.startYear,
    collapseYear: GAME.startYear + 6,
    yearsPerTurn: GAME.yearsPerTurn,
    pressure: { Pressure: 2, Capacity: 3, Trust: 1 },
    pressureRise: { Pressure: 1, Capacity: 1, Trust: 0 },
    winMax: { Pressure: 1, Capacity: 1, Trust: 1 },
    scene: `People at ${place} need a pilot-honest application of ${tech.name} before meters tip.`,
    briefMd,
    stakeholder: "Local working group lead",
    suggested: [tech.id],
    visionTheme: "rebuild-city",
  },
};

if (!localOnly && process.env.XAI_API_KEY) {
  console.warn(
    "AI authoring polish is not fully wired in this stub — writing research-shaped template. Pass --local-only to silence this note, or edit briefMd after research."
  );
}

const v = validateQuestTile(tile);
if (!v.ok) {
  console.error("Generated tile failed validation:", v.error, v.details);
  process.exit(1);
}

const outDir = path.join(ROOT, "output", "quests", slug);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "quest.json");
fs.writeFileSync(outFile, JSON.stringify(v.tile, null, 2) + "\n", "utf8");
console.log(`Wrote ${outFile}`);
console.log(`Import in Future Forge: Import Quest… → select this JSON.`);
console.log(`Validate: npm run validate:quest -- ${outFile}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

function guessGlobalForTech(t) {
  const map = {
    "gene-sequencing": "infectious",
    solar: "energy-access",
    battery: "energy-access",
    drones: "cities",
    ai: "misinfo",
    networks: "misinfo",
    robots: "automation",
    synbio: "ag",
    wind: "climate",
    iot: "weather",
  };
  return globalById(map[t.id]) || null;
}
