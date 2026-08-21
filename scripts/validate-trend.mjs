#!/usr/bin/env node
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
