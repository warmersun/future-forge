#!/usr/bin/env node
/**
 * Insert or update a collector card and print its public URL.
 *
 *   ./scripts/issue-collector-card.sh cards/daily/2026-10-08-example.json
 *   ./scripts/issue-collector-card.sh --dry-run cards/examples/drones-urban-delivery.json
 *
 * Reads DATABASE_URL from the environment or .env.portal. `source` in the JSON
 * is an operator note and is not stored. The page image is the file next to
 * the JSON (same name, .jpg / .jpeg / .png / .webp). An `image` field overrides
 * that. An update with `id` and no file keeps the picture already stored.
 *
 * Idempotency: the card's UUID is the primary key. Pass the same `id` and the
 * database updates that row; it never creates a second card. Daily cards
 * (cards/daily/) must already carry their own `id` — this script will not mint
 * a new one for them. For other cards, a missing `id` still gets a random UUID
 * (legacy authoring path).
 *
 * Dry-run: --dry-run or DRY_RUN=1 prints the upsert it would run and the URL
 * it would produce, without connecting to a database.
 *
 * Test-only: FF_DB_SSL=0 skips TLS (local throwaway Postgres). Never set this
 * in a GitHub Actions workflow or against a real database.
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { portalPublicOrigin } from "../js/cloud/portal-origin.js";
import {
  parseIssueCard,
  contentTypeForImageExt,
  CARD_IMAGE_MAX_BYTES,
  isCardImageType,
  resolveCardImageFile,
  siblingCardImageCandidates,
} from "../js/server/collector-cards.mjs";
import { isDailyCardPath, toPosix } from "../js/server/collector-card-publish.mjs";
import {
  upsertCollectorCard,
  COLLECTOR_CARD_UPSERT_SQL,
  COLLECTOR_CARD_UPDATE_TEXT_SQL,
} from "../js/server/db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Where cards/ lives. Tests point this at a scratch repo; normally the repo root. */
const CARDS_ROOT = process.env.FF_CARDS_ROOT ? path.resolve(process.env.FF_CARDS_ROOT) : ROOT;

function loadEnvFile() {
  for (const file of [path.join(ROOT, ".env.portal"), path.join(ROOT, ".env.portal.local")]) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvFile();

const argv = process.argv.slice(2);
const dryRun =
  argv.includes("--dry-run") ||
  argv.includes("-n") ||
  /^(1|true|yes)$/i.test(String(process.env.DRY_RUN || ""));
const fileArg = argv.find((a) => !a.startsWith("-"));
if (!fileArg) {
  console.error("Usage: ./scripts/issue-collector-card.sh [--dry-run] card.json");
  process.exit(1);
}

const jsonPath = path.resolve(fileArg);
const rel = (() => {
  const r = path.relative(CARDS_ROOT, jsonPath);
  if (!r || r.startsWith("..") || path.isAbsolute(r)) return null;
  return toPosix(r);
})();
const daily = Boolean(rel && isDailyCardPath(rel));

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const parsed = parseIssueCard(raw, { requireImage: false });
if (!parsed.ok) {
  console.error(parsed.error);
  process.exit(1);
}

const imageFile = resolveCardImageFile(
  jsonPath,
  (filePath) => fs.existsSync(filePath),
  parsed.card.imagePath
);
let image = null;
let contentType = "image/jpeg";
if (imageFile) {
  if (!fs.existsSync(imageFile)) {
    console.error(`image not found: ${imageFile}`);
    process.exit(1);
  }
  contentType = contentTypeForImageExt(path.extname(imageFile));
  if (!isCardImageType(contentType)) {
    console.error("image must be jpeg, png, or webp");
    process.exit(1);
  }
  image = fs.readFileSync(imageFile);
  if (!image.length || image.length > CARD_IMAGE_MAX_BYTES) {
    console.error("image must be between 1 byte and 1.5MB");
    process.exit(1);
  }
} else if (!parsed.card.id) {
  const expected = path.basename(siblingCardImageCandidates(jsonPath)[0]);
  console.error(`image_required: add ${expected} next to the JSON`);
  process.exit(1);
}

if (daily && !parsed.card.id) {
  console.error(
    'id_required: a daily card must carry its own fixed "id" (UUID). Minting a new one here would create a duplicate on every re-run.'
  );
  process.exit(1);
}

const id = parsed.card.id || randomUUID();
const url = `${portalPublicOrigin()}/card/${id}`;
const hasImage = Boolean(image && image.length);
const sql = hasImage ? COLLECTOR_CARD_UPSERT_SQL : COLLECTOR_CARD_UPDATE_TEXT_SQL;
const params = hasImage
  ? [
      id,
      parsed.card.techId,
      parsed.card.title,
      parsed.card.description,
      parsed.card.body || "",
      JSON.stringify(parsed.card.links),
      `<${image.length} bytes ${contentType}>`,
      contentType,
      image.length,
      parsed.card.published !== false,
    ]
  : [
      id,
      parsed.card.techId,
      parsed.card.title,
      parsed.card.description,
      parsed.card.body || "",
      JSON.stringify(parsed.card.links),
      parsed.card.published !== false,
    ];

if (dryRun) {
  console.log("dry-run: would run");
  console.log(sql.replace(/\s+/g, " ").trim());
  console.log("params:", JSON.stringify(params, null, 2));
  if (!parsed.card.id) {
    console.log(
      "note: the JSON has no id, so a real run mints the random id above; running again would mint another and create a second card."
    );
  }
  console.log(url);
  process.exit(0);
}

const saved = await upsertCollectorCard({
  id,
  techId: parsed.card.techId,
  title: parsed.card.title,
  description: parsed.card.description,
  body: parsed.card.body,
  links: parsed.card.links,
  published: parsed.card.published,
  image,
  contentType,
});

if (saved?.skipped) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!saved?.stored) {
  console.error(saved?.error || "card was not stored");
  process.exit(1);
}

console.log(url);
