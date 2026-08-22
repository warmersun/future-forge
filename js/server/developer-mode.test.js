/**
 * Unit tests for developer-mode CLI / env resolution.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDeveloperEnabled } from "./developer-mode.mjs";

describe("resolveDeveloperEnabled", () => {
  it("defaults to off", () => {
    assert.equal(resolveDeveloperEnabled([], {}), false);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "" }), false);
  });

  it("enables with --developer or --dev CLI flag", () => {
    assert.equal(resolveDeveloperEnabled(["--developer"], {}), true);
    assert.equal(resolveDeveloperEnabled(["--dev"], {}), true);
  });

  it("--no-developer wins over env and --developer", () => {
    assert.equal(
      resolveDeveloperEnabled(["--developer", "--no-developer"], {
        FF_DEVELOPER: "1",
      }),
      false
    );
  });

  it("enables with FF_DEVELOPER=1 when no CLI", () => {
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "1" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "true" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "on" }), true);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "0" }), false);
    assert.equal(resolveDeveloperEnabled([], { FF_DEVELOPER: "off" }), false);
  });
});
