#!/usr/bin/env node
/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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
