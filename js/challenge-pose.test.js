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

  it("uses an authored question and connection verbatim", () => {
    const posed = localPose("nature", {
      place: "Kiln Ferry",
      inventionName: "Belt split",
      authoredQuestion:
        "The feeder cannot run the belt and the demo together. How does your shift still get parcels ready?",
      authoredConnection: "Physical deployment remains after the demonstration.",
    });
    assert.equal(
      posed.question,
      "The feeder cannot run the belt and the demo together. How does your shift still get parcels ready?"
    );
    assert.equal(posed.speech, "Physical deployment remains after the demonstration.");
    assert.equal(posed.speech.includes("Belt split"), false);
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
