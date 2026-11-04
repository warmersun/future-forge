#!/usr/bin/env node
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
 * Validate a Future Forge capability-trend JSON file.
 * Usage: node scripts/validate-trend.mjs path/to/trend.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const trendPath = process.argv[2];
if (!trendPath) {
  console.error("Usage: node scripts/validate-trend.mjs <trend.json>");
  process.exit(2);
}

const abs = path.isAbsolute(trendPath)
  ? trendPath
  : path.join(process.cwd(), trendPath);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(2);
}

const { parseTrendJson, validateCapabilityTrend } = await import(
  pathToFileURL(path.join(ROOT, "js/capability-trend.js")).href
);

const raw = fs.readFileSync(abs, "utf8");
const parsed = parseTrendJson(raw);
if (!parsed.ok) {
  console.error(`FAIL: ${parsed.error}`);
  process.exit(1);
}
const r = validateCapabilityTrend(parsed.value);
if (!r.ok) {
  console.error(`FAIL: ${r.error}`);
  if (r.details?.length) {
    for (const d of r.details) console.error(`  - ${d}`);
  }
  process.exit(1);
}
const t = r.trend;
console.log(`OK: ${t.id}`);
console.log(`  techId: ${t.techId}`);
console.log(`  name: ${t.name}`);
console.log(`  unit: ${t.unit}`);
console.log(`  compounding: ${JSON.stringify(t.compounding)}`);
console.log(`  milestones: ${t.milestones.length}`);
console.log(`  domain: ${t.domain.start}–${t.domain.end}`);
