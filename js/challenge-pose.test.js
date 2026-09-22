/**
 * Offline pose fallback, plus a scan so Face Challenge cannot drop the import.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localPose } from "./challenge-pose.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("localPose", () => {
  it("names the place and invention in the critic speech", () => {
    const posed = localPose("nature", {
      place: "Accra",
      inventionName: "Harbor Loom",
    });
    assert.match(posed.speech, /Accra/);
    assert.match(posed.speech, /Harbor Loom/);
    assert.match(posed.question, /breaks first|absorb a bad week/i);
  });
});

describe("game Face Challenge", () => {
  it("imports localPose for poseScrutinyEncounters", () => {
    const src = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
    assert.match(src, /import \{ localPose \} from "\.\/challenge-pose\.js"/);
    assert.match(
      src,
      /const local = localPose\(meta,\s*\{\s*place: state\.mission\?\.place/
    );
  });
});
