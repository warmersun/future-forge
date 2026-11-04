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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dataUrlToBlobUrl, VisionRenderer, visionFailureText } from "./vision.js";

function mockImg() {
  let src = null;
  return {
    hidden: true,
    complete: true,
    onload: null,
    classList: { add() {}, remove() {} },
    closest() {
      return null;
    },
    getAttribute(name) {
      return name === "src" ? src : null;
    },
    set src(v) {
      src = v;
    },
    get src() {
      return src || "";
    },
    removeAttribute(name) {
      if (name === "src") src = null;
    },
  };
}

function mockRoot(img) {
  return {
    querySelector(sel) {
      if (sel === ".vision-image") return img;
      return null;
    },
  };
}

describe("visionFailureText", () => {
  it("shows the quota sentence instead of the raw code", () => {
    assert.equal(
      visionFailureText({ error: "quota_spent", message: "This period’s co-inventor budget is spent. It comes back when the subscription renews." }, 429),
      "This period’s co-inventor budget is spent. It comes back when the subscription renews."
    );
    assert.match(visionFailureText({ error: "quota_spent" }, 429), /budget is spent/);
    assert.doesNotMatch(visionFailureText({ error: "quota_spent" }, 429), /quota_spent/);
    assert.equal(visionFailureText({ error: "vision_failed" }, 500), "vision_failed");
    assert.equal(visionFailureText({}, 503), "Vision failed (503)");
  });
});

describe("dataUrlToBlobUrl", () => {
  it("returns a blob: URL instead of the data: payload", () => {
    const orig = URL.createObjectURL;
    URL.createObjectURL = () => "blob:brief-still";
    try {
      const u = dataUrlToBlobUrl("data:image/png;base64,QQ==");
      assert.equal(u, "blob:brief-still");
      assert.equal(String(u).startsWith("data:"), false);
    } finally {
      URL.createObjectURL = orig;
    }
  });
});

describe("VisionRenderer editing guard", () => {
  it("settles without generating when a queued edit is no longer ready", async () => {
    const v = new VisionRenderer(mockRoot(mockImg()));
    let settled = 0;
    v.pending = { challenge: { id: "quest" }, shouldRun: () => false, onSettled: () => { settled++; } };
    await v.flush();
    assert.equal(settled, 1);
    assert.equal(v.busy, false);
    assert.equal(v.currentUrl, "");
  });
});

describe("VisionRenderer.seedLocalFrame", () => {
  it("shows a local still without claiming a real Imagine frame", () => {
    const img = mockImg();
    const v = new VisionRenderer(mockRoot(img));
    v.seedLocalFrame("assets/problems/chem-bio.jpg");
    assert.equal(img.hidden, false);
    assert.equal(img.getAttribute("src"), "assets/problems/chem-bio.jpg");
    assert.equal(v.currentUrl, "");
    assert.equal(v._rawKey, "");
  });

  it("does not overwrite a real Imagine frame", () => {
    const img = mockImg();
    const v = new VisionRenderer(mockRoot(img));
    v.currentUrl = "blob:already-imagined";
    img.hidden = false;
    img.src = "blob:already-imagined";
    v.seedLocalFrame("assets/problems/chem-bio.jpg");
    assert.equal(img.getAttribute("src"), "blob:already-imagined");
  });

  it("is a no-op after newSession until seeded again", () => {
    const img = mockImg();
    const v = new VisionRenderer(mockRoot(img));
    v.seedLocalFrame("assets/problems/chem-bio.jpg");
    v.newSession();
    assert.equal(img.hidden, true);
    assert.equal(img.getAttribute("src"), null);
    v.seedLocalFrame("assets/problems/climate.jpg");
    assert.equal(img.hidden, false);
    assert.equal(img.getAttribute("src"), "assets/problems/climate.jpg");
  });
});

describe("VisionRenderer vs cartoon briefing", () => {
  it("keeps briefing stills when applyImageUrl lands", () => {
    const img = mockImg();
    img.closest = (sel) =>
      sel === ".vision-canvas-wrap.is-briefing" ? { className: "is-briefing" } : null;
    img.src = "assets/problems/chem-bio.jpg";
    img.hidden = false;
    const v = new VisionRenderer(mockRoot(img));
    v.applyImageUrl("blob:invent-frame");
    assert.equal(v.currentUrl, "blob:invent-frame");
    assert.equal(img.getAttribute("src"), "assets/problems/chem-bio.jpg");
  });

  it("does not restore invent src onto a briefing canvas", () => {
    const img = mockImg();
    img.closest = (sel) =>
      sel === ".vision-canvas-wrap.is-briefing" ? { className: "is-briefing" } : null;
    img.src = "assets/problems/chem-bio.jpg";
    img.hidden = false;
    const root = mockRoot(img);
    const v = new VisionRenderer(root);
    v.currentUrl = "blob:invent-frame";
    v.attach(root);
    assert.equal(img.getAttribute("src"), "assets/problems/chem-bio.jpg");
  });
});
