#!/usr/bin/env node
/**
 * Validate a Future Forge collector card JSON file.
 * Usage: node scripts/validate-collector-card.mjs [path/to/card.json ...]
 * With no args, validates cards/examples/*.json and cards/daily/*.json.
 *
 * Daily cards (cards/daily/YYYY-MM-DD-<slug>.json) are published on merge, so
 * they are held to more: a fixed `id`, the file name rule, and a page image
 * that exists, is jpg/png/webp, is at most 1.5 MB, and is 16:9. Every card id
 * must be unique across cards/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
/** Where cards/ lives. Tests point this at a scratch repo; normally the repo root. */
const CARDS_ROOT = process.env.FF_CARDS_ROOT ? path.resolve(process.env.FF_CARDS_ROOT) : ROOT;

const { parseIssueCard, sanitizeCardLinks, siblingCardImageCandidates, normalizeCardId } =
  await import(pathToFileURL(path.join(ROOT, "js/server/collector-cards.mjs")).href);
const { isDailyCardPath, dailyCardNameError, checkCardImage, findCardIdProblems, toPosix } =
  await import(pathToFileURL(path.join(ROOT, "js/server/collector-card-publish.mjs")).href);

function jsonFilesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsonFilesIn(abs));
    else if (entry.name.endsWith(".json")) out.push(abs);
  }
  return out.sort();
}

function defaultTargets() {
  return [
    ...jsonFilesIn(path.join(CARDS_ROOT, "cards/examples")),
    ...jsonFilesIn(path.join(CARDS_ROOT, "cards/daily")),
  ];
}

/** Repo-relative path when the file is inside the repo, else null. */
function repoRel(abs) {
  const rel = path.relative(CARDS_ROOT, abs);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return toPosix(rel);
}

function readId(abs) {
  try {
    return normalizeCardId(JSON.parse(fs.readFileSync(abs, "utf8")).id);
  } catch {
    return null;
  }
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
  const rel = repoRel(abs);
  const daily = Boolean(rel && isDailyCardPath(rel));
  const errors = [];
  const warns = [];

  if (daily) {
    const nameError = dailyCardNameError(rel);
    if (nameError) errors.push(nameError);
    if (!card.id) {
      errors.push(
        'id_required: a daily card needs its own fixed "id" (a UUID). Make one with: node -e "console.log(crypto.randomUUID())"'
      );
    }
    if (raw.published === false) {
      warns.push("published is false: the card is stored but hidden");
    }
  }

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
    const msg = "no page image; add a sibling jpg, png, or webp with the same name as the JSON";
    if (daily) errors.push(`image_required: ${msg}`);
    else warns.push(`${msg} (a new card cannot be issued without one)`);
  } else {
    const img = checkCardImage({
      bytes: fs.readFileSync(imagePath),
      ext: path.extname(imagePath),
      strict: daily,
    });
    errors.push(...img.errors);
    warns.push(...img.warnings);
  }

  if (errors.length) {
    console.error(`FAIL ${label}: ${card.techId} — ${card.title}`);
    for (const e of errors) console.error(`  error: ${e}`);
    for (const w of warns) console.error(`  warn: ${w}`);
    failed++;
    continue;
  }
  console.log(`OK ${label}: ${card.techId} — ${card.title}`);
  for (const w of warns) console.log(`  warn: ${w}`);
}

// Ids must be unique across every card in the repo plus the files checked here.
const pool = new Map();
for (const abs of [...jsonFilesIn(path.join(CARDS_ROOT, "cards")), ...targets]) {
  if (!fs.existsSync(abs)) continue;
  pool.set(fs.realpathSync(abs), abs);
}
const idProblems = findCardIdProblems(
  [...pool.values()].map((abs) => ({ path: repoRel(abs) || abs, id: readId(abs) }))
);
for (const p of idProblems) {
  console.error(`FAIL ${p}`);
  failed++;
}

process.exit(failed ? 1 : 0);
