import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  tileAccess,
  mayReadSecrets,
  requireCloudAccount,
  publicCatalogTile,
  applyCatalogGate,
  needsPlayerBilling,
  tileIsSponsored,
  isTutorContext,
  questIdFromContext,
  prepareTutorContext,
} from "./cloud-gate.mjs";

const learning = {
  id: "lesson-1",
  isLearningModule: true,
  aiTutorContext: "SECRET CURRICULUM",
  mission: { id: "lesson-1", isLearningModule: true, aiTutorContext: "SECRET CURRICULUM" },
};

const openTile = {
  id: "open-1",
  access: "open",
  aiTutorContext: "should-stay",
  mission: { id: "open-1" },
};

describe("tileAccess", () => {
  it("defaults learning modules to account", () => {
    assert.equal(tileAccess(learning), "account");
    assert.equal(tileAccess({ mission: { isLearningModule: true } }), "account");
    assert.equal(tileAccess({ kind: "module", id: "module-x" }), "account");
  });

  it("defaults other tiles to open", () => {
    assert.equal(tileAccess({ id: "x" }), "open");
    assert.equal(tileAccess(null), "open");
  });

  it("honors explicit access", () => {
    assert.equal(tileAccess({ access: "paid", isLearningModule: true }), "paid");
    assert.equal(tileAccess({ access: "open", isLearningModule: true }), "open");
  });
});

describe("needsPlayerBilling (B3)", () => {
  it("sponsored and catalog.free never bill the player", () => {
    assert.equal(
      needsPlayerBilling({
        access: "paid",
        entitlement: "catalog.free",
        sponsorName: "Acme",
      }),
      false
    );
    assert.equal(needsPlayerBilling({ access: "paid", sponsorName: "Acme" }), false);
    assert.equal(needsPlayerBilling({ access: "account", isLearningModule: true }), false);
  });
  it("plain paid tiles would need Billing (todo B1)", () => {
    assert.equal(needsPlayerBilling({ access: "paid" }), true);
  });
});

describe("tileIsSponsored", () => {
  it("is true only when the catalog names a sponsor", () => {
    assert.equal(tileIsSponsored({ sponsorName: "Acme" }), true);
    assert.equal(tileIsSponsored({ mission: { sponsorName: "Acme" } }), true);
    assert.equal(tileIsSponsored({ id: "q1" }), false);
    assert.equal(tileIsSponsored(null), false);
  });
});

describe("mayReadSecrets / requireCloudAccount", () => {
  const off = { enabled: false, signedIn: false };
  const out = { enabled: true, signedIn: false };
  const inn = { enabled: true, signedIn: true, userId: "user_1" };

  it("Clerk off never gates", () => {
    assert.equal(mayReadSecrets(off, learning), true);
    assert.equal(requireCloudAccount(off).ok, true);
  });

  it("unsigned cannot read account tiles", () => {
    assert.equal(mayReadSecrets(out, learning), false);
    assert.equal(requireCloudAccount(out).ok, false);
    assert.equal(requireCloudAccount(out).status, 401);
  });

  it("signed-in can read account tiles; open always", () => {
    assert.equal(mayReadSecrets(inn, learning), true);
    assert.equal(mayReadSecrets(out, openTile), true);
  });
});

describe("publicCatalogTile", () => {
  it("drops tutor context on tile and mission", () => {
    const p = publicCatalogTile(learning);
    assert.equal(p.aiTutorContext, undefined);
    assert.equal(p.mission.aiTutorContext, undefined);
    assert.equal(p.id, "lesson-1");
    assert.equal(learning.aiTutorContext, "SECRET CURRICULUM");
  });
});

describe("applyCatalogGate", () => {
  it("strips when Clerk on and unsigned", () => {
    const p = applyCatalogGate(learning, { enabled: true, signedIn: false });
    assert.equal(p.aiTutorContext, undefined);
  });

  it("keeps secrets when signed in or Clerk off", () => {
    assert.equal(
      applyCatalogGate(learning, { enabled: true, signedIn: true }).aiTutorContext,
      "SECRET CURRICULUM"
    );
    assert.equal(
      applyCatalogGate(learning, { enabled: false, signedIn: false }).aiTutorContext,
      "SECRET CURRICULUM"
    );
  });
});

describe("prepareTutorContext", () => {
  it("passes through when Clerk off", () => {
    const ctx = { tutorMode: true, aiTutorContext: "from-client" };
    const r = prepareTutorContext(ctx, { enabled: false }, learning);
    assert.equal(r.ok, true);
    assert.equal(r.context.aiTutorContext, "from-client");
  });

  it("401 when Clerk on, unsigned, tutor", () => {
    const r = prepareTutorContext(
      { tutorMode: true, aiTutorContext: "from-client" },
      { enabled: true, signedIn: false },
      learning
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, "sign_in_required");
  });

  it("replaces client tutor text with catalog when signed in", () => {
    const r = prepareTutorContext(
      { tutorMode: true, aiTutorContext: "from-client", questId: "lesson-1" },
      { enabled: true, signedIn: true },
      learning
    );
    assert.equal(r.ok, true);
    assert.equal(r.context.aiTutorContext, "SECRET CURRICULUM");
  });

  it("drops client tutor text when signed in but tile unknown", () => {
    const r = prepareTutorContext(
      { tutorMode: true, aiTutorContext: "from-client" },
      { enabled: true, signedIn: true },
      null
    );
    assert.equal(r.ok, true);
    assert.equal(r.context.aiTutorContext, undefined);
  });

  it("does not gate non-tutor modes", () => {
    const r = prepareTutorContext(
      { tutorMode: false, isLearningModule: true, aiTutorContext: "x" },
      { enabled: true, signedIn: false },
      learning
    );
    assert.equal(r.ok, true);
  });
});

describe("questIdFromContext / isTutorContext", () => {
  it("reads questId / mission.id / challenge.id", () => {
    assert.equal(questIdFromContext({ questId: "a" }), "a");
    assert.equal(questIdFromContext({ mission: { id: "b" } }), "b");
    assert.equal(questIdFromContext({ challenge: { id: "c" } }), "c");
  });

  it("tutorMode wins over isLearningModule", () => {
    assert.equal(isTutorContext({ tutorMode: false, isLearningModule: true }), false);
    assert.equal(isTutorContext({ isLearningModule: true }), true);
  });
});
