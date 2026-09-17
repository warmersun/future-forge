import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPurePolicyInvent,
  hasShareBridgeClaim,
  hasEvalOverrideClaim,
  hasCapabilityMechanism,
  coordinationLampCap,
  applyPolicyHonesty,
  applyCoordinationCap,
  clampPathwayScore,
} from "./policy-honesty.js";

describe("isPurePolicyInvent", () => {
  it("rejects a UBI bill with no mechanism", () => {
    assert.equal(isPurePolicyInvent("The council passes universal basic income this year."), true);
    assert.equal(isPurePolicyInvent("Pass UBI for the warehouse crew."), true);
  });

  it("rejects a ban / treaty with no mechanism", () => {
    assert.equal(isPurePolicyInvent("Ban superintelligence worldwide."), true);
    assert.equal(
      isPurePolicyInvent("The UN adopts a treaty pausing all frontier AI."),
      true
    );
  });

  it("allows a fielding rule that still names a capability", () => {
    assert.equal(
      isPurePolicyInvent(
        "A logged override button on the trauma model lets Ramirez outvote a green discharge."
      ),
      false
    );
    assert.equal(
      isPurePolicyInvent(
        "Sorter surplus hits the crew wallet on Friday so Maya's rent clears."
      ),
      false
    );
  });
});

describe("share / eval claims", () => {
  it("does not treat bare UBI as a share bridge", () => {
    assert.equal(hasShareBridgeClaim("Pass UBI for everyone."), false);
    assert.equal(
      hasShareBridgeClaim("Sorter surplus hits the crew wallet this Friday."),
      true
    );
    assert.equal(hasShareBridgeClaim("Paid training hour before the heat peaks."), true);
  });

  it("needs a reachable override or eval, not a smarter model", () => {
    assert.equal(hasEvalOverrideClaim("A better trauma model scores the belly."), false);
    assert.equal(
      hasEvalOverrideClaim("A logged override Ramirez can still fire with two fingers."),
      true
    );
  });

  it("detects a capability mechanism", () => {
    assert.equal(hasCapabilityMechanism("Pass a law."), false);
    assert.equal(hasCapabilityMechanism("The sensor radioes the crest."), true);
  });
});

describe("coordinationLampCap", () => {
  it("reds a displacement stack on automation without a share", () => {
    const cap = coordinationLampCap({
      globalId: "automation",
      techIds: ["robots", "ai"],
      howText: "Aisle robots finish the easy shelves faster than Maya can stretch.",
    });
    assert.equal(cap?.level, "red");
    assert.match(cap.note, /surplus/i);
  });

  it("lets a share bridge through on automation", () => {
    const cap = coordinationLampCap({
      globalId: "automation",
      techIds: ["robots", "crypto"],
      howText:
        "Robots still clear the easy bays. Sorter surplus hits the crew wallet this Friday so Maya's rent clears.",
    });
    assert.equal(cap, null);
  });

  it("reds rogue-si AI without an unlockable human path", () => {
    const cap = coordinationLampCap({
      globalId: "rogue-si",
      techIds: ["ai", "networks"],
      howText: "A more accurate trauma score writes the discharge path.",
    });
    assert.equal(cap?.level, "red");
    assert.match(cap.note, /last call|override/i);
  });

  it("lets an override through on rogue-si", () => {
    const cap = coordinationLampCap({
      globalId: "rogue-si",
      techIds: ["ai"],
      howText:
        "A logged override Ramirez can still fire with two fingers when the belly is tight.",
    });
    assert.equal(cap, null);
  });

  it("does not cap unrelated themes", () => {
    const cap = coordinationLampCap({
      globalId: "water",
      techIds: ["ai", "iot"],
      howText: "Leak sensors page the pump crew before the tank runs dry.",
    });
    assert.equal(cap, null);
  });
});

describe("applyPolicyHonesty", () => {
  it("zeros ease for a pure-policy invent", () => {
    const r = applyPolicyHonesty({
      globalId: "automation",
      techIds: ["crypto"],
      howText: "The council passes universal basic income.",
      crisisDelta: { local: -1, global: -1, support: -1 },
      crisisReasons: { local: "x", global: "y", support: "z" },
    });
    assert.equal(r.tag, "pure-policy");
    assert.equal(r.crisisDelta.local, 0);
    assert.equal(r.crisisDelta.global, 0);
    assert.equal(r.crisisDelta.support, 0);
  });

  it("skips backlash when a named lock is paused", () => {
    const r = applyPolicyHonesty({
      globalId: "automation",
      techIds: ["robots"],
      howText: "Aisle robots finish the easy shelves so the remaining cases move.",
      rules: [
        {
          id: "piece-rate",
          kind: "policy",
          label: "Piece-rate",
          effects: ["share-required", "backlash"],
          status: "suspended",
        },
      ],
      crisisDelta: { local: -1, global: -1, support: -1 },
    });
    assert.equal(r.crisisDelta.local, -1);
    assert.equal(r.crisisDelta.global, 0);
    assert.equal(r.crisisDelta.support, -1);
  });

  it("restores backlash after write-then-remove of a quest lock", () => {
    const r = applyPolicyHonesty({
      globalId: "automation",
      techIds: ["robots"],
      howText: "Aisle robots finish the easy shelves so the remaining cases move.",
      rules: [
        {
          id: "curfew",
          kind: "policy",
          label: "Harbor curfew",
          source: "lobby",
          status: "active",
        },
      ],
      crisisDelta: { local: -1, global: -1, support: -1 },
    });
    assert.equal(r.crisisDelta.global, 0);
    assert.equal(r.crisisDelta.support, 1);
  });

  it("keeps local ease on unpaired robots but blocks global and inflames support", () => {
    const r = applyPolicyHonesty({
      globalId: "automation",
      techIds: ["robots"],
      howText: "Aisle robots finish the easy shelves so the remaining cases move.",
      crisisDelta: { local: -1, global: -1, support: -1 },
      crisisReasons: { local: "local", global: "global", support: "support" },
    });
    assert.equal(r.tag, "no-share");
    assert.equal(r.crisisDelta.local, -1);
    assert.equal(r.crisisDelta.global, 0);
    assert.equal(r.crisisDelta.support, 1);
  });

  it("is idempotent", () => {
    const first = applyPolicyHonesty({
      globalId: "rogue-si",
      techIds: ["ai"],
      howText: "A better score writes the discharge path for the motorcycle rider.",
      crisisDelta: { local: -1, global: -2, support: 0 },
    });
    const second = applyPolicyHonesty({
      globalId: "rogue-si",
      techIds: ["ai"],
      howText: "A better score writes the discharge path for the motorcycle rider.",
      crisisDelta: first.crisisDelta,
      crisisReasons: first.crisisReasons,
    });
    assert.deepEqual(second.crisisDelta, first.crisisDelta);
    assert.equal(second.tag, "no-eval");
  });
});

describe("applyCoordinationCap", () => {
  it("turns a green sustain red when pairing is missing", () => {
    const r = applyCoordinationCap(
      { level: "green", note: "Touches the driver.", depthCharacter: "source" },
      {
        global: { id: "automation" },
        techs: [{ id: "robots" }],
        inventionHow: "Robots pick the remaining awkward cases faster.",
      }
    );
    assert.equal(r.level, "red");
    assert.match(r.note, /surplus/i);
  });
});

describe("clampPathwayScore", () => {
  it("clamps an AI score that eased global with a gadget-only stack", () => {
    const score = clampPathwayScore(
      {
        crisisDelta: { local: -1, global: -1, support: -1 },
        crisisReasons: { local: "a", global: "b", support: "c" },
        concerns: {},
      },
      [
        {
          techId: "ai",
          howText: "A more accurate trauma score writes the discharge path.",
        },
      ],
      { globalId: "rogue-si" }
    );
    assert.equal(score.crisisDelta.global, 0);
    assert.equal(score.crisisDelta.support, 1);
    assert.match(score.crisisReasons.global, /last call/i);
  });

  it("leaves a paired pathway alone", () => {
    const src = {
      crisisDelta: { local: -1, global: -1, support: -1 },
      crisisReasons: { local: "a", global: "b", support: "c" },
      concerns: { moloch: { level: "yellow", reason: "ok" } },
    };
    const score = clampPathwayScore(
      src,
      [
        {
          techId: "robots",
          howText:
            "Robots still clear the easy bays. Sorter surplus hits the crew wallet this Friday.",
        },
      ],
      { globalId: "automation" }
    );
    assert.equal(score.crisisDelta.global, -1);
    assert.equal(score.crisisDelta.support, -1);
    assert.equal(score.concerns.moloch.level, "yellow");
  });
});
