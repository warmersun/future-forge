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

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stationsFor, stepStation, TABLETOP_STATIONS } from "./tabletop.js";

test("stations omit local rules and AI inspect unless those modes are on", () => {
  const ids = stationsFor({ rules: false, inspect: false }).map((s) => s.id);
  assert.equal(ids.includes("rules"), false);
  assert.equal(ids.includes("inspect"), false);
  assert.deepEqual(
    stationsFor({ rules: true, inspect: true }).map((s) => s.id),
    TABLETOP_STATIONS.map((s) => s.id)
  );
});

test("next and previous wrap the station list", () => {
  const list = stationsFor({ rules: true, inspect: true });
  assert.equal(stepStation(list, "emtech", -1), "coinventor");
  assert.equal(stepStation(list, "coinventor", 1), "emtech");
  assert.equal(stepStation(list, "board", 1), "vision");
  assert.equal(stepStation([], "board", 1), null);
});

test("future vision sits immediately after the hex board", () => {
  const ids = TABLETOP_STATIONS.map((s) => s.id);
  assert.equal(ids[ids.indexOf("board") + 1], "vision");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const start = html.indexOf('id="tabletop-rail"');
  const rail = html.slice(start, html.indexOf("workshop-layout", start));
  const marked = [...rail.matchAll(/data-tabletop-station="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(marked, ids);
});
