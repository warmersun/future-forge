/**
 * Validate (and report) the world foresight bank.
 * Usage: node scripts/build-world-foresight.mjs
 *
 * The curated bank lives in js/sim/world-foresight-data.js.
 * Re-run after edits; extend that file (or a future research import) then validate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TECHS } from "../js/data.js";
import {
  WORLD_FORESIGHT_EVENTS,
  validateWorldForesightBank,
  foresightForYear,
} from "../js/sim/world-foresight.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "assets/world-foresight/manifest.json");

const techIds = TECHS.map((t) => t.id);
const result = validateWorldForesightBank(WORLD_FORESIGHT_EVENTS, techIds);

if (!result.ok) {
  console.error("World foresight bank invalid:");
  for (const e of result.errors.slice(0, 40)) console.error(" -", e);
  process.exit(1);
}

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
const sampleYears = [2026, 2027, 2028, 2029, 2030, 2032, 2034, 2036];
const samples = Object.fromEntries(
  sampleYears.map((y) => [
    y,
    foresightForYear(y, { seed: "build", limit: 5 }).map((e) => ({
      id: e.id,
      kind: e.kind,
      headline: e.headline,
      claimBand: e.claimBand,
    })),
  ])
);

fs.writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      count: result.count,
      generatedAt: new Date().toISOString(),
      note: "Curated bank — predictions are labeled forecasts, not locks.",
      sampleHighlightsByYear: samples,
      events: WORLD_FORESIGHT_EVENTS.map((e) => ({
        id: e.id,
        year: e.year,
        kind: e.kind,
        claimBand: e.claimBand,
        techIds: e.techIds || [],
        headline: e.headline,
      })),
    },
    null,
    2
  ) + "\n"
);

console.log(`OK world foresight bank: ${result.count} events`);
console.log(`Wrote ${MANIFEST}`);
for (const y of sampleYears) {
  console.log(
    `  ${y}:`,
    samples[y].map((s) => s.headline).join(" · ")
  );
}
