#!/usr/bin/env node
/**
 * Copy Chart.js UMD builds into js/vendor/ for the no-bundler client.
 * Usage: node scripts/vendor-chartjs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const outDir = path.join(ROOT, "js/vendor");

const copies = [
  {
    from: path.join(ROOT, "node_modules/chart.js/dist/chart.umd.min.js"),
    to: path.join(outDir, "chart.umd.min.js"),
  },
  {
    from: path.join(
      ROOT,
      "node_modules/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.min.js"
    ),
    to: path.join(outDir, "chartjs-plugin-annotation.min.js"),
  },
];

fs.mkdirSync(outDir, { recursive: true });
for (const { from, to } of copies) {
  if (!fs.existsSync(from)) {
    console.error(`Missing ${from} — run npm install first`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`Wrote ${path.relative(ROOT, to)}`);
}
