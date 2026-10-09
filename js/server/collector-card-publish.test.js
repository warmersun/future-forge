import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isDailyCardPath,
  dailyCardNameError,
  cardJsonForChangedPath,
  selectChangedCards,
  isZeroSha,
  imageInfo,
  checkCardImage,
  findCardIdProblems,
  findCardJargon,
} from "./collector-card-publish.mjs";
import { solidPng } from "../../test/collector-card-png.mjs";

const A = "5b7c2f0e-3d1a-4c6b-9e8f-0a1b2c3d4e5f";
const B = "6c8d3a1f-4e2b-4d7c-8f90-1b2c3d4e5f60";

test("daily card paths and the file name rule", () => {
  assert.equal(isDailyCardPath("cards/daily/2026-10-08-solar-paint.json"), true);
  assert.equal(isDailyCardPath("cards/examples/drones-urban-delivery.json"), false);
  assert.equal(isDailyCardPath("test/fixtures/collector-cards/cards/daily/x.json"), false);
  assert.equal(dailyCardNameError("cards/daily/2026-10-08-solar-paint.json"), null);
  assert.match(dailyCardNameError("cards/daily/solar-paint.json"), /bad_daily_name/);
  assert.match(dailyCardNameError("cards/daily/2026-10-08-Solar_Paint.json"), /bad_daily_name/);
  assert.match(dailyCardNameError("cards/daily/2026-02-30-solar-paint.json"), /bad_daily_date/);
  assert.match(dailyCardNameError("cards/daily/2026/2026-10-08-x.json"), /subfolder/);
});

test("a changed image counts as a change to its card; only daily cards are in daily scope", () => {
  assert.equal(cardJsonForChangedPath("cards/daily/2026-10-08-a.webp"), "cards/daily/2026-10-08-a.json");
  assert.equal(cardJsonForChangedPath("cards/daily/notes.md"), null);
  assert.equal(cardJsonForChangedPath("README.md"), null);
  const changed = [
    "cards/daily/2026-10-08-a.json",
    "cards/daily/2026-10-08-a.jpg",
    "cards/daily/2026-10-09-b.png",
    "cards/examples/drones-urban-delivery.json",
    "js/data.js",
  ];
  assert.deepEqual(selectChangedCards(changed), [
    "cards/daily/2026-10-08-a.json",
    "cards/daily/2026-10-09-b.json",
  ]);
  assert.deepEqual(selectChangedCards(changed, { scope: "all" }), [
    "cards/daily/2026-10-08-a.json",
    "cards/daily/2026-10-09-b.json",
    "cards/examples/drones-urban-delivery.json",
  ]);
  // An image whose card JSON is gone is skipped.
  assert.deepEqual(
    selectChangedCards(changed, { exists: (p) => p !== "cards/daily/2026-10-09-b.json" }),
    ["cards/daily/2026-10-08-a.json"]
  );
});

test("zero and empty shas mean there is no base commit", () => {
  assert.equal(isZeroSha("0000000000000000000000000000000000000000"), true);
  assert.equal(isZeroSha(""), true);
  assert.equal(isZeroSha(undefined), true);
  assert.equal(isZeroSha("ac54aafdd4a942b15b927d62f7defd6b55b22fb9"), false);
});

test("image headers: PNG, JPEG, and WebP sizes", () => {
  assert.deepEqual(imageInfo(solidPng(1600, 900)), { type: "image/png", width: 1600, height: 900 });
  // Minimal JPEG: SOI, APP0 (len 16), SOF0 with 1080x1920.
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03, 0x01, 0x22,
    0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
  ]);
  assert.deepEqual(imageInfo(jpeg), { type: "image/jpeg", width: 1920, height: 1080 });
  // WebP VP8X canvas 1344x768 (stored minus one, 24-bit little endian).
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "ascii");
  webp.write("WEBP", 8, "ascii");
  webp.write("VP8X", 12, "ascii");
  webp.writeUIntLE(1343, 24, 3);
  webp.writeUIntLE(767, 27, 3);
  assert.deepEqual(imageInfo(webp), { type: "image/webp", width: 1344, height: 768 });
  assert.equal(imageInfo(Buffer.from("not an image at all")), null);
});

test("card image check: size, type, and 16:9", () => {
  const ok = checkCardImage({ bytes: solidPng(1600, 900), ext: ".png", strict: true });
  assert.deepEqual(ok.errors, []);
  const square = checkCardImage({ bytes: solidPng(900, 900), ext: ".png", strict: true });
  assert.match(square.errors.join(" "), /image_not_16x9/);
  const squareLoose = checkCardImage({ bytes: solidPng(900, 900), ext: ".png", strict: false });
  assert.deepEqual(squareLoose.errors, []);
  assert.match(squareLoose.warnings.join(" "), /image_not_16x9/);
  const misnamed = checkCardImage({ bytes: solidPng(1600, 900), ext: ".jpg", strict: true });
  assert.match(misnamed.errors.join(" "), /image_type_mismatch/);
  const gif = checkCardImage({ bytes: solidPng(1600, 900), ext: ".gif", strict: true });
  assert.match(gif.errors.join(" "), /image_type/);
  const big = Buffer.concat([solidPng(1600, 900), Buffer.alloc(1_500_001)]);
  assert.match(checkCardImage({ bytes: big, ext: ".png", strict: true }).errors.join(" "), /image_too_large/);
});

test("card ids: duplicates and changed ids are problems; new cards are fine", () => {
  const cards = [
    { path: "cards/daily/2026-10-08-a.json", id: A },
    { path: "cards/daily/2026-10-09-b.json", id: B },
    { path: "cards/examples/x.json", id: null },
  ];
  assert.deepEqual(findCardIdProblems(cards), []);
  const dup = findCardIdProblems([...cards, { path: "cards/daily/2026-10-10-c.json", id: A.toUpperCase() }]);
  assert.equal(dup.length, 1);
  assert.match(dup[0], /duplicate_id/);
  const base = { "cards/daily/2026-10-08-a.json": B };
  const changedId = findCardIdProblems(cards, {
    changed: ["cards/daily/2026-10-08-a.json", "cards/daily/2026-10-09-b.json"],
    baseIdOf: (p) => base[p],
  });
  assert.equal(changedId.length, 1);
  assert.match(changedId[0], /id_changed cards\/daily\/2026-10-08-a\.json/);
  const removed = findCardIdProblems([{ path: "cards/daily/2026-10-08-a.json", id: null }], {
    changed: ["cards/daily/2026-10-08-a.json"],
    baseIdOf: () => A,
  });
  assert.match(removed[0], /now missing/);
});

test("stranger test: jargon in title, capability, or use cases is flagged; body and plain words are not", () => {
  const rejected = {
    title: "A 7-electronvolt oxide semiconductor that works as a diode and transistor",
    capability:
      "We can now grow a thin crystal film with a bandgap above 7 electronvolts that still carries current, and build a working diode and a transistor from it on an ordinary sapphire wafer.",
    useCases: ["Building those very-wide-bandgap devices on sapphire wafers."],
    body: "Schottky substrate epitaxy",
  };
  const hits = findCardJargon(rejected);
  const terms = (field) => hits.filter((h) => h.field === field).map((h) => h.term).sort();
  assert.deepEqual(terms("title"), ["diode", "electronvolt", "transistor"]);
  assert.deepEqual(terms("capability"), ["bandgap", "diode", "electronvolt", "sapphire", "transistor"]);
  assert.deepEqual(terms("useCases"), ["bandgap", "sapphire"]);
  assert.equal(hits.some((h) => h.field === "body"), false);

  const plain = {
    title: "A new chip material for smaller, cooler power electronics",
    capability:
      "Power switches, the parts inside chargers, electric cars and the power grid that turn electricity on and off, could get smaller, run cooler and waste less energy. It's early lab work, not a product yet.",
    useCases: ["Smaller chargers and power supplies that stay cooler and waste less electricity as heat."],
  };
  assert.deepEqual(findCardJargon(plain), []);
  // Whole words only, and "eV" is case-sensitive so ordinary words never match.
  assert.deepEqual(findCardJargon({ capability: "Every level of developer, even Steve, adopted it." }), []);
  assert.deepEqual(findCardJargon({ capability: "A 6.2 eV film." }).map((h) => h.term), ["electronvolt"]);
  assert.deepEqual(findCardJargon({ title: "Band gap record" }).map((h) => h.term), ["bandgap"]);
});
