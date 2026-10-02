#!/usr/bin/env node
/**
 * Validate a Future Forge collector card JSON file.
 * Usage: node scripts/validate-collector-card.mjs [path/to/card.json ...]
 * With no args, validates cards/examples/*.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const { parseIssueCard, sanitizeCardLinks, siblingCardImageCandidates } = await import(
  pathToFileURL(path.join(ROOT, "js/server/collector-cards.mjs")).href
);

function defaultTargets() {
  const dir = path.join(ROOT, "cards/examples");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(dir, name));
}

const args = process.argv.slice(2);
const targets = args.length
  ? args.map((p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
  : defaultTargets();

if (!targets.length) {
  console.error("Usage: node scripts/validate-collector-card.mjs <card.json> [...]");
  process.exit(1);
}

let failed = 0;
for (const abs of targets) {
  const label = path.relative(process.cwd(), abs) || abs;
  if (!fs.existsSync(abs)) {
    console.error(`FAIL ${label}: file not found`);
    failed++;
    continue;
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    console.error(`FAIL ${label}: ${e.message}`);
    failed++;
    continue;
  }
  const parsed = parseIssueCard(raw, { requireImage: false });
  if (!parsed.ok) {
    console.error(`FAIL ${label}: ${parsed.error}`);
    failed++;
    continue;
  }
  const card = parsed.card;
  const warns = [];
  if (!String(raw.source || "").trim()) warns.push("source missing (operator note; not stored)");
  if (card.description.length > 400) {
    warns.push("description is over 400 characters; the picture prompt uses only the first 400");
  }
  const rawLinks = Array.isArray(raw.links) ? raw.links : [];
  const kept = sanitizeCardLinks(rawLinks);
  if (rawLinks.length && kept.length < rawLinks.length) {
    warns.push(`${rawLinks.length - kept.length} link(s) dropped (need a label and an http(s) URL)`);
  }
  if (!kept.length) warns.push("no links; cite the sources you used");
  const imageOverride = String(raw.image || "").trim();
  const imagePath = imageOverride
    ? path.resolve(path.dirname(abs), imageOverride)
    : siblingCardImageCandidates(abs).find((p) => fs.existsSync(p));
  if (!imagePath || !fs.existsSync(imagePath)) {
    warns.push("no page image; a new card cannot be issued until a sibling jpg, png, or webp exists");
  }
  console.log(`OK ${label}: ${card.techId} — ${card.title}`);
  for (const w of warns) console.log(`  warn: ${w}`);
}

process.exit(failed ? 1 : 0);
