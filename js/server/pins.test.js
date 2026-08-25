import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizePinList, MAX_CLOUD_PINS } from "./pins.mjs";

describe("sanitizePinList", () => {
  it("caps at 3 and drops junk", () => {
    const pins = sanitizePinList([
      { missionId: "a", globalId: "g" },
      { missionId: "a", globalId: "g" },
      { missionId: "b", globalId: "g" },
      { missionId: "c", globalId: "g" },
      { missionId: "d", globalId: "g" },
      { missionId: "bad id" },
    ]);
    assert.equal(pins.length, MAX_CLOUD_PINS);
    assert.deepEqual(
      pins.map((p) => p.missionId),
      ["a", "b", "c"]
    );
  });

  it("drops oversized snapshots", () => {
    const huge = { missionId: "x", globalId: "g", missionSnapshot: { w: "y".repeat(9000) } };
    assert.equal(sanitizePinList([huge])[0].missionSnapshot, null);
  });
});
