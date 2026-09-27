#!/usr/bin/env node
/**
 * Validate a Future Forge predictions bank (future-forge.predictions/v1).
 * Usage: node scripts/validate-predictions.mjs [path/to/bank.json ...]
 * With no args, validates predictions/default.json and predictions/examples/*.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const { parsePredictionsJson, validatePredictionsBank } = await import(
  pathToFileURL(path.join(ROOT, "js/sim/world-foresight.js")).href
);
const { TECHS } = await import(pathToFileURL(path.join(ROOT, "js/data.js")).href);
const techIds = TECHS.map((t) => t.id);

function defaultTargets() {
  const out = [path.join(ROOT, "predictions/default.json")];
  const exDir = path.join(ROOT, "predictions/examples");
  if (fs.existsSync(exDir)) {
    for (const f of fs.readdirSync(exDir).sort()) {
      if (f.endsWith(".json")) out.push(path.join(exDir, f));
    }
  }
  return out;
}

const args = process.argv.slice(2);
const targets = args.length
  ? args.map((p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
  : defaultTargets();

let failed = 0;
for (const abs of targets) {
  const label = path.relative(process.cwd(), abs) || abs;
  if (!fs.existsSync(abs)) {
    console.error(`FAIL ${label}: file not found`);
    failed++;
    continue;
  }
  const parsed = parsePredictionsJson(fs.readFileSync(abs, "utf8"));
  if (!parsed.ok) {
    console.error(`FAIL ${label}: ${parsed.error}`);
    failed++;
    continue;
  }
  const r = validatePredictionsBank(parsed.value, techIds);
  if (!r.ok || !r.bank) {
    console.error(`FAIL ${label}: ${r.error || "validation_failed"}`);
    for (const d of r.errors || []) console.error(`  - ${d}`);
    failed++;
    continue;
  }
  const b = r.bank;
  const years = b.predictions.map((p) => p.year);
  const kinds = {};
  for (const p of b.predictions) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  console.log(`OK ${label}: ${b.id}`);
  console.log(`  title: ${b.title}`);
  if (b.attribution?.name) console.log(`  attribution: ${b.attribution.name}`);
  console.log(`  rows: ${r.count} (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(", ")})`);
  console.log(`  years: ${Math.min(...years)}–${Math.max(...years)}`);
  for (const w of r.warnings || []) console.log(`  warn: ${w}`);
}

process.exit(failed ? 1 : 0);
