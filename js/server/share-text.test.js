import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { GLYPHS } from "./share-glyphs.mjs";
import { shareSafeText, shareTextSvg, shareTextWidth, unsupportedShareChars } from "./share-text.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAPTION = "A plant \u2014 \u201cundersea\u201d power, it\u2019s \u2018live\u2019\u2026 280\u00b0C \u2013 No. B245\u00b7440B";

test("caption with em dash, curly quotes and ellipsis needs no missing glyph", () => {
  assert.deepEqual(unsupportedShareChars(CAPTION), []);
  assert.equal(shareSafeText(CAPTION), CAPTION);
  for (const c of new Set(CAPTION)) {
    const [adv, d] = GLYPHS[c];
    assert.ok(adv > 0, `advance for U+${c.codePointAt(0).toString(16)}`);
    if (c !== " ") assert.ok(d.length > 0, `outline for U+${c.codePointAt(0).toString(16)}`);
  }
});

test("characters outside the glyph set are mapped, never left as boxes", () => {
  const raw = "Caf\u00e9 \u201eQuote\u201f \u2212 \u2010x\u2011 \u00abhi\u00bb\u2009ok \u4e2d \u{1f30b}";
  assert.ok(unsupportedShareChars(raw).length > 0);
  const safe = shareSafeText(raw);
  assert.deepEqual(unsupportedShareChars(safe), []);
  assert.equal(safe, "Cafe \u201cQuote\u201c - -x- \"hi\" ok ? ?");
});

test("text is drawn as paths, with no <text> element and no font lookup", () => {
  const svg = shareTextSvg(CAPTION, { x: 500, y: 40, size: 22, fill: "#fff", letterSpacing: 0.8, anchor: "end" });
  assert.ok(!/<text\b/.test(svg));
  assert.ok(!/font-family/.test(svg));
  assert.equal((svg.match(/<path /g) || []).length, [...CAPTION].filter((c) => c !== " ").length);
  assert.ok(shareTextWidth(CAPTION, 22, 0.8) > 0);
});

test("renders the same with no system fonts at all", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-nofonts-"));
  fs.mkdirSync(path.join(dir, "empty"));
  const conf = path.join(dir, "fonts.conf");
  fs.writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${dir}/empty</dir><cachedir>${dir}/cache</cachedir></fontconfig>`);
  const script = `
    import sharp from "sharp";
    import { shareTextSvg } from ${JSON.stringify(path.join(HERE, "share-text.mjs"))};
    const svg = \`<svg width="900" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="60" fill="#000"/>\${shareTextSvg(${JSON.stringify(CAPTION)}, { x: 10, y: 40, size: 22, fill: "#fff" })}</svg>\`;
    process.stdout.write((await sharp(Buffer.from(svg)).raw().toBuffer()).toString("base64"));`;
  const run = (env) => execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, ...env }, cwd: HERE, maxBuffer: 1 << 24 }).toString();
  try {
    const bare = run({ FONTCONFIG_FILE: conf });
    assert.equal(bare, run({}));
    // Something was actually drawn.
    const px = Buffer.from(bare, "base64");
    assert.ok(px.some((v) => v > 200));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
