#!/usr/bin/env node
/**
 * Re-stamp stable seedId on every SCENARIO_ANGLE_PACKS entry.
 * Run after regenerating scenario-seeds.js content.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(ROOT, "js/scenario-seeds.js");

function slug(s) {
  return String(s || "seed")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "seed";
}

const { SCENARIO_ANGLE_PACKS } = await import(
  pathToFileURL(target).href + "?t=" + Date.now()
);

const used = new Set();
const packs = {};
let n = 0;
for (const [themeId, arr] of Object.entries(SCENARIO_ANGLE_PACKS)) {
  packs[themeId] = (arr || []).map((entry) => {
    const { seedId: _old, ...rest } = entry;
    let base = `${themeId}--${slug(entry.title)}`;
    let id = base;
    let k = 2;
    while (used.has(id)) id = `${base}-${k++}`;
    used.add(id);
    n++;
    return { seedId: id, ...rest };
  });
}

const header = `/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Each entry has a stable \`seedId\` for locale overlays (locales/{lang}/scenario-seeds.json).
 *
 * Re-run seed content: node scripts/generate-scenario-seeds.mjs
 * Re-stamp seedIds only: node scripts/stamp-scenario-seed-ids.mjs
 */

/** @type {Record<string, object[]>} */
export const SCENARIO_ANGLE_PACKS = `;

fs.writeFileSync(target, header + JSON.stringify(packs, null, 2) + ";\n");
console.log(`stamped ${n} seedIds across ${Object.keys(packs).length} themes`);
