#!/usr/bin/env node
/**
 * Preview a collector card locally without a database.
 * Usage: node scripts/preview-collector-card.mjs [card-json-path]
 * Example: node scripts/preview-collector-card.mjs cards/examples/drones-urban-delivery.json
 * 
 * Starts a server on http://localhost:8766/card/preview
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderCollectorCardPage } from "../js/server/collector-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8766;

const cardJsonPath = process.argv[2] || "cards/examples/drones-urban-delivery.json";
const fullJsonPath = path.join(ROOT, cardJsonPath);

if (!fs.existsSync(fullJsonPath)) {
  console.error(`Card file not found: ${cardJsonPath}`);
  process.exit(1);
}

// Load card data
const cardData = JSON.parse(fs.readFileSync(fullJsonPath, "utf8"));
const previewId = "00000000-0000-4000-8000-000000000000";

// Find the image file
const jsonDir = path.dirname(fullJsonPath);
const jsonBase = path.basename(fullJsonPath, ".json");
const imageExts = [".png", ".jpg", ".jpeg", ".webp"];
let imageFile = null;
let imageContentType = "image/png";

for (const ext of imageExts) {
  const candidate = path.join(jsonDir, jsonBase + ext);
  if (fs.existsSync(candidate)) {
    imageFile = candidate;
    if (ext === ".jpg" || ext === ".jpeg") imageContentType = "image/jpeg";
    else if (ext === ".webp") imageContentType = "image/webp";
    break;
  }
}

if (!imageFile) {
  console.error(`No image file found for ${cardJsonPath}`);
  console.error(`Looked for: ${imageExts.map(e => jsonBase + e).join(", ")}`);
  process.exit(1);
}

const imageBytes = fs.readFileSync(imageFile);

// Create mock card
const card = {
  id: previewId,
  techId: cardData.techId,
  title: cardData.title,
  description: cardData.description,
  body: cardData.body || "",
  links: cardData.links || [],
};

const html = renderCollectorCardPage(card, {
  origin: `http://localhost:${PORT}`,
  publishableKey: "",
  clerkEnabled: false,
  collectNow: false,
});

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  
  if (url === "/card/preview" || url === "/") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  } else if (url === `/card/${previewId}/image`) {
    res.writeHead(200, {
      "Content-Type": imageContentType,
      "Content-Length": imageBytes.length,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(imageBytes);
  } else if (url.startsWith("/assets/")) {
    // Serve static assets like production does
    const assetPath = path.join(ROOT, url.slice(1)); // Remove leading /
    fs.readFile(assetPath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(assetPath).toLowerCase();
      const contentType = MIME[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": data.length,
        "Cache-Control": "public, max-age=3600",
      });
      res.end(data);
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\nCollector Card Preview Server`);
  console.log(`==============================`);
  console.log(`Card: ${cardJsonPath}`);
  console.log(`Image: ${path.relative(ROOT, imageFile)}`);
  console.log(`\nOpen: http://localhost:${PORT}/card/preview`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
