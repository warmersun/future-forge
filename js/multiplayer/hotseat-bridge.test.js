import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createHotseatBridge,
  forgeToSoloDeployStage,
  soloToForgeDeployStage,
} from "./hotseat-bridge.js";

const mission = {
  id: "t",
  title: "Test",
  place: "Port",
  globalId: "climate",
  startYear: 2026,
  collapseYear: 2036,
  yearsPerTurn: 2,
  pressure: { Floods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Trust: 0 },
  winMax: { Floods: 0, Trust: 1 },
  scene: "The quay floods again.",
  stakeholder: "Aisha",
  suggested: ["solar", "iot"],
};

describe("hotseat-bridge", () => {
  it("maps deploy stages", () => {
    assert.equal(forgeToSoloDeployStage("pilot_ok"), "pilot");
    assert.equal(forgeToSoloDeployStage("scaled"), "scale");
    assert.equal(soloToForgeDeployStage("pilot"), "pilot_ok");
    assert.equal(soloToForgeDeployStage("scale"), "scaled");
  });

  it("starts session and hydrates solo state", () => {
    const b = createHotseatBridge();
    const r = b.startFromPick(["Alex", "Bea"], mission, "climate");
    assert.equal(r.ok, true);
    assert.equal(b.getActiveId(), b.getViewId());
    const state = {
      global: { id: "climate", title: "Climate" },
      selectedTechIds: [],
    };
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.mission.title, "Test");
    assert.equal(state.inventionName, "");
    assert.equal(state.pressure.Floods, 2);
    assert.equal(state.ap, 3);
    assert.equal(state.year, 2026);
    assert.equal(state.mp.mode, "hotseat");
  });

  it("wait advances only active invent year; other forge keeps present for feasibility", () => {
    const b = createHotseatBridge();
    b.startFromPick(["Alex", "Bea"], mission, "climate");
    const alex = b.getActiveId();
    const bea = b.getSession().seatOrder[1];
    b.layerTechOnView("iot", { id: "iot", curve: "mature", readyYear: 2026 });
    const r = b.waitShared({});
    assert.equal(r.ok, true, r.error);
    const s = b.getSession();
    assert.equal(s.place.year, 2026);
    assert.equal(s.forges[alex].year, 2028);
    assert.equal(s.forges[alex].waits, 1);
    assert.equal(s.forges[bea].year, 2026);
    assert.equal(s.forges[bea].waits, 0);
    // Next seat hydrates with their own invent year (present)
    assert.equal(b.getActiveId(), bea);
    const state = { global: { id: "climate" }, selectedTechIds: [] };
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.year, 2026);
    assert.equal(state.waits, 0);
    // Viewing Alex still shows their waited invent year for feasibility
    b.setViewSeat(alex);
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.year, 2028);
    assert.equal(state.waits, 1);
  });

  it("cycles view and layers tech on other forge", () => {
    const b = createHotseatBridge();
    b.startFromPick(["Alex", "Bea"], mission, "climate");
    const bea = b.getSession().seatOrder[1];
    b.setViewSeat(bea);
    assert.equal(b.viewingOther(), true);
    const r = b.layerTechOnView("solar", { id: "solar", curve: "mature", readyYear: 2026 });
    assert.equal(r.ok, true);
    const stack = b.getSession().forges[bea].stack;
    assert.equal(stack[0].techId, "solar");
    assert.equal(stack[0].addedBy, b.getActiveId());
  });

  it("passDevice rotates active seat", () => {
    const b = createHotseatBridge();
    b.startFromPick(["Alex", "Bea"], mission, "climate");
    // spend something so end_turn works
    b.layerTechOnView("iot", { id: "iot", curve: "mature", readyYear: 2026 });
    const a0 = b.getActiveId();
    const r = b.passDevice();
    assert.equal(r.ok, true);
    assert.notEqual(b.getActiveId(), a0);
    assert.equal(b.getViewId(), b.getActiveId());
  });

  it("can contribute story on other invent; challenge only on own", () => {
    const b = createHotseatBridge();
    b.startFromPick(["Alex", "Bea"], mission, "climate");
    const bea = b.getSession().seatOrder[1];
    assert.equal(b.canFaceChallenge(), true);
    b.setViewSeat(bea);
    assert.equal(b.viewingOther(), true);
    assert.equal(b.canContributeStory(), true);
    assert.equal(b.canFaceChallenge(), false);
    assert.equal(b.viewedPhase(), "invent");
  });

  it("freezes helpers in challenge; allows tech help in deploy", () => {
    const b = createHotseatBridge();
    b.startFromPick(["Alex", "Bea"], mission, "climate");
    const alex = b.getActiveId();
    const bea = b.getSession().seatOrder[1];

    // Spend then pass device to Bea
    b.layerTechOnView("iot", { id: "iot", curve: "mature", readyYear: 2026 });
    const pass = b.passDevice();
    assert.equal(pass.ok, true);
    assert.equal(b.getActiveId(), bea);

    // Alex's invent is mid-challenge while Bea is active
    const s = b.getSession();
    s.forges[alex].turnPhase = "scrutiny";
    s.forges[alex].challengePassed = false;
    b.setSession(s);
    b.setViewSeat(alex);
    assert.equal(b.viewingOther(), true);
    assert.equal(b.viewedPhase(), "challenge");
    assert.equal(b.canContributeStory(), false);
    assert.equal(b.canEditStack(), false);
    assert.equal(b.canFaceChallenge(), false);
    assert.equal(b.canHelpDeploy(), false);
    assert.equal(b.canRunDeploy(), false);
    const blocked = b.layerTechOnView("solar", {
      id: "solar",
      curve: "mature",
      readyYear: 2026,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "challenge_locked");

    // Alex passed challenge → invent locked; Bea may Pilot/Scale, not layer
    const s2 = b.getSession();
    s2.forges[alex].turnPhase = "between_stages";
    s2.forges[alex].challengePassed = true;
    s2.forges[alex].deployStage = "none";
    b.setSession(s2);
    b.setViewSeat(alex);
    assert.equal(b.viewedPhase(), "deploy");
    assert.equal(b.canContributeStory(), false);
    assert.equal(b.canEditStack(), false);
    assert.equal(b.canHelpDeploy(), false);
    assert.equal(b.canRunDeploy(), true);
    assert.equal(b.canFaceChallenge(), false); // Bea is not owner (challenge)
    const noLayer = b.layerTechOnView("solar", {
      id: "solar",
      curve: "mature",
      readyYear: 2026,
    });
    assert.equal(noLayer.ok, false);

    // Pass device back to Alex (owner), then reopen invent
    let sess = b.getSession();
    sess.forges[bea].apSpentThisTurn = 1;
    b.setSession(sess);
    assert.equal(b.passDevice().ok, true);
    assert.equal(b.getActiveId(), alex);
    b.setViewSeat(alex);
    const re = b.reopenInvent();
    assert.equal(re.ok, true, re.error);
    assert.equal(b.forgePhase(alex), "invent");
    assert.equal(b.viewedPhase(), "invent");
    assert.equal(b.canRunDeploy(), false);
    assert.equal(b.canFaceChallenge(), true);
    assert.equal(b.canContributeStory(), true);
    assert.equal(b.canEditStack(), true);
  });
});
