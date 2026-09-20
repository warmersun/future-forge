#!/usr/bin/env node
/**
 * Gating VO check: parse the recording pack and assert Say lines, Do-not-say,
 * and friend-cut order. Same source as js/on-the-curve-pack.test.js.
 * Run: node scripts/check-on-the-curve-vo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DO_NOT_SAY } from "../js/tech-why.js";
import {
  CLIP_COUNT,
  FRIEND_CUT_ORDER,
  PACK_DO_NOT_SAY_EXTRA,
  PACK_REL,
  extractSayLines,
  parseOnTheCurvePack,
} from "../js/on-the-curve-pack.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packPath = path.join(root, PACK_REL);
const markdown = fs.readFileSync(packPath, "utf8");
const pack = parseOnTheCurvePack(markdown);
const independent = extractSayLines(markdown);
const fails = [];

function check(ok, msg) {
  if (ok) console.log(`PASS  ${msg}`);
  else {
    console.log(`FAIL  ${msg}`);
    fails.push(msg);
  }
}

check(pack.shots.length === CLIP_COUNT, `${CLIP_COUNT} shots from ${PACK_REL}`);
check(independent.length === CLIP_COUNT, `${CLIP_COUNT} independent **Say:** extracts`);
check(
  JSON.stringify(pack.friendCutOrder) === JSON.stringify(FRIEND_CUT_ORDER),
  `friend-cut order ${pack.friendCutOrder.join(",")}`
);

for (let i = 0; i < CLIP_COUNT; i++) {
  const s = pack.shots[i];
  check(s.n === i + 1, `#${i + 1} n=${s.n}`);
  check(s.file.endsWith(".mp4"), `${s.file} is mp4`);
  check(s.say === independent[i], `${s.file} Say matches pack verbatim`);
  check(!DO_NOT_SAY.test(s.say), `${s.file} Say vs DO_NOT_SAY`);
  check(!PACK_DO_NOT_SAY_EXTRA.test(s.say), `${s.file} Say vs pack extras`);
  console.log(`  ${s.n.toString().padStart(2, "0")}  ${s.file}  ${s.say.slice(0, 72)}…`);
}

if (fails.length) {
  console.error(`\n${fails.length} failure(s)`);
  process.exit(1);
}
console.log("\nOK  on-the-curve VO check");
