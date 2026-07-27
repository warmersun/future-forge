/**
 * Unit tests for compact emTech drawer pure helpers.
 * DOM wiring is exercised in-browser; Node has no document.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTechDrawerMode, isTechDrawerOpen } from "./tech-drawer.js";

describe("tech-drawer", () => {
  it("isTechDrawerMode is false without matchMedia / wide default", () => {
    // Node: window is undefined → false
    assert.equal(isTechDrawerMode(), false);
  });

  it("isTechDrawerOpen reads classList", () => {
    const layout = {
      classList: {
        _on: false,
        contains(c) {
          return c === "is-tech-open" && this._on;
        },
      },
    };
    assert.equal(isTechDrawerOpen(null), false);
    assert.equal(isTechDrawerOpen(layout), false);
    layout.classList._on = true;
    assert.equal(isTechDrawerOpen(layout), true);
  });
});
