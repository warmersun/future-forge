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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderCollectorCardShare, shareCacheKey } from "./collector-card-share.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARD_ID = "f267a886-ccd0-4cde-9ce6-2a509b3eed33";
const UPDATED = "2026-10-08T21:04:05.244Z";

test("share image is a 1200×630 JPEG and stays cached for the same card", async () => {
  const bytes = fs.readFileSync(
    path.join(ROOT, "cards/daily/2026-10-08-alpha-algano-7ev.jpg")
  );
  const input = { id: CARD_ID, techId: "materials", bytes, updatedAt: UPDATED };
  const jpeg = await renderCollectorCardShare(input);
  assert.equal(jpeg[0], 0xff);
  assert.equal(jpeg[1], 0xd8);
  const meta = await sharp(jpeg).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);

  const again = await renderCollectorCardShare(input);
  assert.equal(again, jpeg);

  const fresh = await renderCollectorCardShare({ ...input, updatedAt: "2026-10-09T00:00:00.000Z" });
  assert.notEqual(fresh, jpeg);
  assert.equal(shareCacheKey(CARD_ID, UPDATED) === shareCacheKey(CARD_ID, "2026-10-09T00:00:00.000Z"), false);
});

test("share image label does not depend on host fonts", async () => {
  const src = fs.readFileSync(path.join(ROOT, "js/server/collector-card-share.mjs"), "utf8");
  assert.ok(!/<text\b/.test(src), "share frame must draw text as paths, not <text>");
});
