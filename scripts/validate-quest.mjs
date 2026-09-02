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

const { validateQuestDocument, parseQuestTileJson } = await import(
  pathToFileURL(path.join(ROOT, "js/quest-tile.js")).href
);

const raw = fs.readFileSync(abs, "utf8");
const parsed = parseQuestTileJson(raw);
if (!parsed.ok) {
  console.error(`FAIL: ${parsed.error}`);
  process.exit(1);
}
const r = validateQuestDocument(parsed.value);
if (!r.ok) {
  console.error(`FAIL: ${r.error}`);
  if (r.details?.length) {
    for (const d of r.details) console.error(`  - ${d}`);
  }
  process.exit(1);
}

if (r.tile?.kind === "module" || r.kind === "module") {
  const t = r.tile;
  console.log(`OK: ${t.id}`);
  console.log(`  kind: module`);
  console.log(`  title: ${t.title}`);
  console.log(`  module: ${t.module}`);
  console.log(`  globalId: ${t.globalId}`);
  console.log(`  lessons: ${(t.lessons || []).join(", ")}`);
  console.log(`  totalLessons: ${t.totalLessons}`);
  if (t.spotlight?.techId) console.log(`  spotlight: ${t.spotlight.techId}`);
  if (t.sponsorName) {
    const ban = t.sponsorBanner ? ` — ${t.sponsorBanner}` : "";
    console.log(`  sponsor: ${t.sponsorName}${ban}`);
  }
  if (t.overviewMd) console.log(`  overviewMd: ${t.overviewMd.length} chars`);
  process.exit(0);
}

const m = r.mission;
console.log(`OK: ${m.id}`);
console.log(`  title: ${m.title}`);
console.log(`  globalId: ${m.globalId}`);
console.log(`  spotlight: ${m.spotlight?.techId}`);
console.log(`  briefMd: ${m.briefMd.length} chars`);
console.log(`  placement: ${r.tile.placement?.mode}`);
if (m.resources) {
  console.log(`  resources: ${JSON.stringify(m.resources)}`);
}
if (m.crisisRoles) {
  console.log(`  crisisRoles: ${JSON.stringify(m.crisisRoles)}`);
}
if (m.grounding) {
  console.log(`  grounding: ${m.grounding.length} chars`);
}
if (Array.isArray(m.briefBeats) && m.briefBeats.length) {
  console.log(`  briefBeats: authored ${m.briefBeats.length}`);
}
if (m.isLearningModule) {
  const bits = ["learning module"];
  if (m.lesson != null || m.totalLessons != null) {
    bits.push(
      `lesson ${m.lesson ?? "?"}${
        m.totalLessons != null ? `/${m.totalLessons}` : ""
      }`
    );
  }
  if (m.module != null) bits.push(`module "${m.module}"`);
  if (m.aiTutorContext) {
    bits.push(`tutorContext ${m.aiTutorContext.length} chars`);
  }
  console.log(`  ${bits.join(" · ")}`);
}
if (m.sponsorName) {
  const ban = m.sponsorBanner ? ` — ${m.sponsorBanner}` : "";
  console.log(`  sponsor: ${m.sponsorName}${ban}`);
}
console.log(`  pressure: ${JSON.stringify(m.pressure)}`);
process.exit(0);
