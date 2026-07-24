import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mpVisionStageId } from "./mp-side.js";

describe("mpVisionStageId", () => {
  it("maps multiplayer deploy stages to vision stages", () => {
    assert.equal(mpVisionStageId("none", 0), "present");
    assert.equal(mpVisionStageId("none", 2), "prototype");
    assert.equal(mpVisionStageId("pilot_ok", 1), "prototype");
    assert.equal(mpVisionStageId("scaled", 3), "transformed");
  });
});
