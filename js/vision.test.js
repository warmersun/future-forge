import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dataUrlToBlobUrl, VisionRenderer } from "./vision.js";

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
