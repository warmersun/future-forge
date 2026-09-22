/**
 * Offline co-inventor lives in one module for the game server and the portal.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HEX_INVENT_HINT,
  isTutorMode,
  localCoInvent,
  sanitizeHowTechId,
} from "./co-invent-local.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("co-invent local engine", () => {
  it("is imported by both servers instead of copied", () => {
    for (const rel of ["server.mjs", "portal/server.mjs"]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      assert.equal(src.includes("function localCoInvent"), false, rel);
      assert.equal(src.includes("const HEX_INVENT_HINT"), false, rel);
      assert.match(src, /co-invent-local\.mjs/, rel);
      assert.match(src, /sanitizeHowTechId/, rel);
    }
  });

  it("answers an empty chat from the local fallback", () => {
    const out = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "hello" }],
      context: {},
    });
    assert.equal(out.source, "local");
    assert.match(out.message, /Suggest stack/);
    assert.deepEqual(out.proposals.addTechIds, []);
  });

  it("keeps tutoring off when the learner turned it off", () => {
    assert.equal(isTutorMode({ tutorMode: false, isLearningModule: true }), false);
    assert.equal(isTutorMode({ tutorMode: true }), true);
    assert.equal(isTutorMode({ isLearningModule: true }), true);
  });

  it("names convergences in the shared hex hint", () => {
    assert.match(HEX_INVENT_HINT, /hexBoard\.convergences/);
    assert.match(HEX_INVENT_HINT, /Do not claim a convergence that is not listed/);
  });

  it("draft-how names mint unless exactly one pathway is placed", () => {
    assert.match(HEX_INVENT_HINT, /proposals\.howTarget/);
    const several = localCoInvent({
      mode: "draft-how",
      messages: [],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}, {}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(several.proposals.howTarget, "mint");
    assert.equal(several.proposals.howTechId, "ai");
    const one = localCoInvent({
      mode: "draft-how",
      messages: [],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(one.proposals.howTarget, "pathway");
    assert.equal(one.proposals.howTechId, null);
  });

  it("free-chat how drafts use the same hex howTarget rule", () => {
    const several = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "how does this system work" }],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}, {}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(several.proposals.howTarget, "mint");
    assert.equal(several.proposals.howTechId, "ai");
    assert.ok(several.proposals.inventionHow);
    const one = localCoInvent({
      mode: "chat",
      messages: [{ role: "user", content: "how does this system work" }],
      context: {
        hexInvent: true,
        hexBoard: { pathways: [{}] },
        availableTechs: [{ id: "ai", name: "AI", summary: "Models." }],
        selectedTechIds: ["ai"],
      },
    });
    assert.equal(one.proposals.howTarget, "pathway");
  });

  it("drops howTechId that is not in the catalog", () => {
    assert.equal(sanitizeHowTechId("ai", ["ai", "iot"]), "ai");
    assert.equal(sanitizeHowTechId("laser-shark", ["ai", "iot"]), null);
    assert.equal(sanitizeHowTechId("  ", ["ai"]), null);
    assert.equal(sanitizeHowTechId(null, ["ai"]), null);
  });
});
