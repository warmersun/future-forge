/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Unit tests for compact emTech drawer / desktop dock rail pure helpers.
 * DOM wiring is exercised in-browser; Node has no document.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTechDrawerMode,
  isCoInventorTabMode,
  isTechDrawerOpen,
  isTechRailCollapsed,
  isTechRailPeek,
  readTechRailCollapsedPref,
  isVisionStackMode,
  isVisionRailCollapsed,
  isVisionRailPeek,
  readVisionRailCollapsedPref,
} from "./tech-drawer.js";

describe("tech-drawer", () => {
  it("isTechDrawerMode is false without matchMedia / wide default", () => {
    // Node: window is undefined → false
    assert.equal(isTechDrawerMode(), false);
  });

  it("isCoInventorTabMode is false without matchMedia", () => {
    assert.equal(isCoInventorTabMode(), false);
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

  it("isTechRailCollapsed reads is-tech-collapsed", () => {
    const layout = {
      classList: {
        _on: false,
        contains(c) {
          return c === "is-tech-collapsed" && this._on;
        },
      },
    };
    assert.equal(isTechRailCollapsed(null), false);
    assert.equal(isTechRailCollapsed(layout), false);
    layout.classList._on = true;
    assert.equal(isTechRailCollapsed(layout), true);
  });

  it("isTechRailPeek reads is-tech-peek", () => {
    const layout = {
      classList: {
        _on: false,
        contains(c) {
          return c === "is-tech-peek" && this._on;
        },
      },
    };
    assert.equal(isTechRailPeek(null), false);
    assert.equal(isTechRailPeek(layout), false);
    layout.classList._on = true;
    assert.equal(isTechRailPeek(layout), true);
  });

  it("readTechRailCollapsedPref defaults to expanded without storage", () => {
    // Node: localStorage typically missing → false (expanded)
    assert.equal(readTechRailCollapsedPref(), false);
  });

  it("readTechRailCollapsedPref reads future-forge:tech-rail-collapsed", () => {
    const store = new Map();
    const prev = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) {
        return store.has(k) ? store.get(k) : null;
      },
      setItem(k, v) {
        store.set(k, String(v));
      },
      removeItem(k) {
        store.delete(k);
      },
    };
    try {
      assert.equal(readTechRailCollapsedPref(), false);
      globalThis.localStorage.setItem("future-forge:tech-rail-collapsed", "1");
      assert.equal(readTechRailCollapsedPref(), true);
      globalThis.localStorage.removeItem("future-forge:tech-rail-collapsed");
      assert.equal(readTechRailCollapsedPref(), false);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

  it("vision dock helpers read classes and persist future-forge:vision-rail-collapsed", () => {
    assert.equal(isVisionStackMode(), false);
    const set = new Set();
    const layout = { classList: { contains: (c) => set.has(c) } };
    assert.equal(isVisionRailCollapsed(null), false);
    assert.equal(isVisionRailCollapsed(layout), false);
    assert.equal(isVisionRailPeek(layout), false);
    set.add("is-vision-collapsed");
    assert.equal(isVisionRailCollapsed(layout), true);
    set.add("is-vision-peek");
    assert.equal(isVisionRailPeek(layout), true);

    const store = new Map();
    const prev = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    try {
      assert.equal(readVisionRailCollapsedPref(), false);
      globalThis.localStorage.setItem("future-forge:vision-rail-collapsed", "1");
      assert.equal(readVisionRailCollapsedPref(), true);
      globalThis.localStorage.removeItem("future-forge:vision-rail-collapsed");
      assert.equal(readVisionRailCollapsedPref(), false);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });
});
