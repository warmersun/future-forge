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
import { SUMMARY_CAP } from "../js/quest-summary.js";

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
const place = `Fictive field site`;
const advanceTitle =
  advance ||
  `Recent advance in ${tech.name} (fill after research)`;
const advanceSummary =
  advance ||
  tech.maturity?.near ||
  tech.summary ||
  `Capability in ${tech.name} is shifting — design a local application.`;

const briefMd = `## The place

A named person does one concrete thing now at **${place}** (fictive). The strain is already in the room.

The world pushes back. The local driver shows up through what people do — not a lecture.

## The bigger problem

This scene is one case of a bigger issue. Name that issue in everyday words. Say the system that keeps producing it — not a machine that got cheaper.

## Your job

Invent a way this place works for the people who live it. Stakeholder: **Local working group lead**.
`;

const tile = {
  schema: QUEST_TILE_SCHEMA,
  kind: "quest",
  id: slug,
  version: 1,
  title: `What went wrong at this place`,
  summary: `Someone at ${place} is already in trouble. The usual path failed. The people who live it cannot wait on a distant fix.`.slice(
    0,
    SUMMARY_CAP
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
    encourageCopy: `Invent a way this place works for the people who live it.`,
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
    title: `Trouble at ${place}`.slice(0, 100),
    place: place.slice(0, 80),
    startYear: GAME.startYear,
    collapseYear: GAME.startYear + 6,
    yearsPerTurn: GAME.yearsPerTurn,
    pressure: {
      local: { label: "Pressure", description: "Lived strain people feel here this season.", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Capacity", description: "The local driver that keeps producing the problem.", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Trust", description: "Whether neighbors will back a visible local fix.", pressure: 2, pressureRise: 0, winMax: 1 },
    },
    scene: `A named person at ${place} is already in trouble. The usual path failed. Who makes this place work before the next harm lands?`,
    briefMd,
    stakeholder: "Local working group lead",
    suggested: [tech.id],
    // Why this family here — shown under the card in "For this place". Rewrite for the place; name the meter it eases.
    suggestedWhy: {
      [tech.id]: `${String(tech.inventionHint || `What ${tech.name} could do here`).replace(/\.$/, "")} — for Pressure.`.slice(0, 120),
    },
    visionTheme: "rebuild-city",
  },
};

if (!localOnly && process.env.FF_XAI_API_KEY) {
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
fs.writeFileSync(outFile, JSON.stringify(tile, null, 2) + "\n", "utf8");
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
