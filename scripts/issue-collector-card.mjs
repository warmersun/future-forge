#!/usr/bin/env node
/**
 * Insert or update a collector card and print its public URL.
 *
 *   ./scripts/issue-collector-card.sh cards/examples/drones-urban-delivery.json
 *
 * Reads DATABASE_URL from the environment or .env.portal. `source` in the JSON
 * is an operator note and is not stored. The page image is the file next to
 * the JSON (same name, .jpg / .jpeg / .png / .webp). An `image` field overrides
 * that. An update with `id` and no file keeps the picture already stored.
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
import { upsertCollectorCard } from "../js/server/db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: ./scripts/issue-collector-card.sh card.json");
  process.exit(1);
}

const jsonPath = path.resolve(fileArg);
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

const id = parsed.card.id || randomUUID();
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

const url = `${portalPublicOrigin()}/card/${id}`;
console.log(url);
