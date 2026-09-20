import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertSceneReadable } from "./scene-prose.js";

describe("assertSceneReadable", () => {
  it("accepts spoken mid-length story craft", () => {
    const scene =
      "Nurse Amina seals another swab under the corrugated awning. The fever sheet on the fridge does not match, and the lab truck already left at dawn. Answers take days. By then the queue has moved on, or the ward is full.";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, true, r.reasons.join(","));
  });

  it("flags a Who-designs riddle close", () => {
    const scene =
      "Dr. Ramirez presses two fingers into the motorcycle rider's tight belly. The screen says discharge. The override button sits gray. A nurse waits with transfer papers. Who designs a trauma score a surgeon can still outrun?";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, false);
    assert.ok(r.reasons.includes("riddle_close"));
  });

  it("flags telegram punch stacks", () => {
    const scene =
      "Night holds the heat. Cots fill. Fans stop. Grid dies. Fever spikes. Backup fails. Who designs power for the hour a life arrives?";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, false);
    assert.ok(
      r.reasons.includes("too_many_punch_lines") || r.reasons.includes("riddle_close")
    );
  });
});
