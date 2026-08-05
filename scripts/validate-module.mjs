#!/usr/bin/env node
/**
 * Validate a Future Forge module pack (module.json or module directory).
 * Usage:
 *   node scripts/validate-module.mjs path/to/module.json
 *   node scripts/validate-module.mjs path/to/module-dir/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const target = process.argv[2];
if (!target) {
  console.error(
    "Usage: node scripts/validate-module.mjs <module.json|module-dir>"
  );
  process.exit(2);
}

const abs = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
if (!fs.existsSync(abs)) {
  console.error(`Not found: ${abs}`);
  process.exit(2);
}

let modulePath = abs;
let baseDir = path.dirname(abs);
if (fs.statSync(abs).isDirectory()) {
  modulePath = path.join(abs, "module.json");
  baseDir = abs;
  if (!fs.existsSync(modulePath)) {
    console.error(`No module.json in directory: ${abs}`);
    process.exit(2);
  }
}

const { parseModulePackJson, validateModulePack } = await import(
  pathToFileURL(path.join(ROOT, "js/module-pack.js")).href
);

const raw = fs.readFileSync(modulePath, "utf8");
const parsed = parseModulePackJson(raw);
if (!parsed.ok) {
  console.error(`FAIL: ${parsed.error}`);
  process.exit(1);
}

const r = validateModulePack(parsed.value, { baseDir });
if (!r.ok) {
  console.error("FAIL: validation_failed");
  for (const e of r.errors) console.error(`  - ${e}`);
  process.exit(1);
}

const p = r.pack;
console.log(`OK: ${p.id}`);
console.log(`  title: ${p.title}`);
console.log(`  access: ${p.access}`);
console.log(`  theme: ${p.theme}`);
console.log(`  weeks: ${p.weeks.length}`);
for (const w of p.weeks) {
  const ref = w.questFile || "(inline quest)";
  console.log(`    week ${w.week}: ${w.title} → ${ref}`);
}
process.exit(0);
