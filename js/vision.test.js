import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VisionRenderer } from "./vision.js";

function mockImg() {
  let src = null;
  return {
    hidden: true,
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
