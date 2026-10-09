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
