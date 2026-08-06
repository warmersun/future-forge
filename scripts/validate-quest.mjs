#!/usr/bin/env node
/**
 * Validate a Future Forge quest tile JSON file.
 * Usage: node scripts/validate-quest.mjs path/to/quest.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const tilePath = process.argv[2];
if (!tilePath) {
  console.error("Usage: node scripts/validate-quest.mjs <quest.json>");
  process.exit(2);
}

const abs = path.isAbsolute(tilePath) ? tilePath : path.join(process.cwd(), tilePath);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(2);
}

const { validateQuestTile, parseQuestTileJson } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href
);

const raw = fs.readFileSync(abs, "utf8");
const parsed = parseQuestTileJson(raw);
if (!parsed.ok) {
  console.error(`FAIL: ${parsed.error}`);
  process.exit(1);
}
const r = validateQuestTile(parsed.value);
if (!r.ok) {
  console.error(`FAIL: ${r.error}`);
  if (r.details?.length) {
    for (const d of r.details) console.error(`  - ${d}`);
  }
  process.exit(1);
}
console.log(`OK: ${r.mission.id}`);
console.log(`  title: ${r.mission.title}`);
console.log(`  globalId: ${r.mission.globalId}`);
console.log(`  spotlight: ${r.mission.spotlight?.techId}`);
console.log(`  briefMd: ${r.mission.briefMd.length} chars`);
console.log(`  placement: ${r.tile.placement?.mode}`);
if (r.mission.resources) {
  console.log(`  resources: ${JSON.stringify(r.mission.resources)}`);
}
if (r.mission.crisisRoles) {
  console.log(`  crisisRoles: ${JSON.stringify(r.mission.crisisRoles)}`);
}
console.log(`  pressure: ${JSON.stringify(r.mission.pressure)}`);
process.exit(0);
