/**
 * VO / Do-not-say check for the on-the-curve recording pack.
 * Reads docs/on-the-curve-recording-pack.md (not a second shot list).
 * Run: node --test js/on-the-curve-pack.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DO_NOT_SAY } from "./tech-why.js";
import {
  CLIP_COUNT,
  FRIEND_CUT_ORDER,
  PACK_DO_NOT_SAY_EXTRA,
  PACK_REL,
  extractSayLines,
  parseOnTheCurvePack,
} from "./on-the-curve-pack.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packPath = path.join(root, PACK_REL);
const markdown = fs.readFileSync(packPath, "utf8");
const pack = parseOnTheCurvePack(markdown);
const independentSays = extractSayLines(markdown);

describe("on-the-curve pack parse", () => {
  it("reads 18 shot-list files and Say lines from the pack markdown", () => {
    assert.equal(pack.shots.length, CLIP_COUNT);
    assert.equal(independentSays.length, CLIP_COUNT);
    for (let i = 0; i < CLIP_COUNT; i++) {
      const shot = pack.shots[i];
      assert.equal(shot.n, i + 1);
      assert.match(shot.file, /^\d{2}-[a-z0-9-]+\.mp4$/);
      assert.ok(shot.say.length > 20, `empty say for ${shot.file}`);
      assert.equal(shot.say, independentSays[i], `say mismatch ${shot.file}`);
      assert.ok(shot.record.length > 10, `empty record for ${shot.file}`);
    }
    assert.equal(pack.shots[0].file, "01-look-ahead.mp4");
    assert.equal(pack.shots[17].file, "18-foresight.mp4");
  });

  it("keeps each Say line verbatim from the pack (player-facing names only)", () => {
    assert.equal(
      pack.shots[0].say,
      "Look Ahead is the exponential clock. You see how this stack gets better — then you decide if waiting is worth the crisis."
    );
    assert.equal(
      pack.shots[7].say,
      "Feasibility is timing. Is this real this year — or still science fiction treated as routine?"
    );
    assert.equal(
      pack.shots[9].say,
      "Batteries make better drones; more drones demand better batteries. Convergence is that loop — evaluated when the tiles touch."
    );
    assert.match(pack.shots[0].say, /Look Ahead/);
    assert.match(pack.shots[4].say, /crisis/);
    assert.match(pack.shots[13].say, /here, this year/);
    assert.match(pack.shots[15].say, /Learn/);
  });

  it("rejects DO_NOT_SAY terms from tech-why.js and pack extras in every Say line", () => {
    for (const shot of pack.shots) {
      assert.equal(
        DO_NOT_SAY.test(shot.say),
        false,
        `DO_NOT_SAY matched ${shot.file}: ${shot.say}`
      );
      assert.equal(
        PACK_DO_NOT_SAY_EXTRA.test(shot.say),
        false,
        `pack extra matched ${shot.file}: ${shot.say}`
      );
    }
  });

  it("parses friend-cut order 1, 8, 10, 11, 5, 14, 16 from the pack", () => {
    assert.deepEqual(pack.friendCutOrder, FRIEND_CUT_ORDER);
    assert.deepEqual(pack.friendCutOrder, [1, 8, 10, 11, 5, 14, 16]);
    const flagged = pack.shots.filter((s) => s.friendCut).map((s) => s.n).sort((a, b) => a - b);
    assert.deepEqual(
      flagged,
      [...FRIEND_CUT_ORDER].sort((a, b) => a - b)
    );
  });
});
