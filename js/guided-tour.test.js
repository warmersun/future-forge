import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTourStep, queryTourTarget } from "./guided-tour.js";

function base(over = {}) {
  const briefing = { active: false, index: 0, beatCount: 4, ...(over.briefing || {}) };
  const pathway = {
    overall: "red",
    bonds: "red",
    coverage: "red",
    timingLevel: "red",
    timingPending: false,
    ...(over.pathway || {}),
  };
  const ui = { ...(over.ui || {}) };
  const mp = { spectator: false, viewingOther: false, ...(over.mp || {}) };
  return {
    screen: "workshop",
    place: "Tideglass",
    spotlightTechId: "gene-sequencing",
    spotlightName: "Gene sequencing",
    spotlightEncourage: "Invent on-site sequencing so clinics don't wait on a lab.",
    suggestedIds: ["gene-sequencing"],
    focusedTechId: null,
    focusedTechName: "",
    isLearning: false,
    tutorOn: false,
    sideTab: "vision",
    unplacedInventionCount: 0,
    placedInventionCount: 0,
    howTextLength: 0,
    hasSparkBatch: false,
    concernsOnBoard: 0,
    remainingConcerns: 1,
    concernsSummoned: false,
    boardHolds: false,
    ap: 3,
    apEnabled: true,
    budget: 5,
    budgetWillEnabled: true,
    will: 3,
    lobbyVisible: true,
    ...over,
    briefing,
    pathway,
    ui,
    mp,
  };
}

function idOf(snap) {
  return resolveTourStep(snap).id;
}

describe("resolveTourStep", () => {
  it("A1 wait confirm beats everything else", () => {
    assert.equal(
      idOf(
        base({
          ui: { waitConfirmOpen: true },
          briefing: { active: true, index: 0, beatCount: 4 },
        })
      ),
      "A1"
    );
  });

  it("C1 points at briefing Next, C2 at Full brief on last beat", () => {
    assert.equal(
      idOf(base({ briefing: { active: true, index: 0, beatCount: 4 } })),
      "C1"
    );
    const c2 = resolveTourStep(
      base({ briefing: { active: true, index: 3, beatCount: 4 } })
    );
    assert.equal(c2.id, "C2");
    assert.equal(c2.target.selector, '[data-brief="full"]');
  });

  it("E1 names the spotlight tech after briefing", () => {
    const step = resolveTourStep(base());
    assert.equal(step.id, "E1");
    assert.equal(step.target.kind, "tech");
    assert.equal(step.target.id, "gene-sequencing");
    assert.match(step.body, /Gene sequencing/);
  });

  it("E2 uses a recommended card when there is no spotlight", () => {
    const step = resolveTourStep(
      base({
        spotlightTechId: null,
        spotlightName: "",
        suggestedIds: ["ai", "iot"],
      })
    );
    assert.equal(step.id, "E2");
    assert.equal(step.target.selector, ".tech-card.recommended");
  });

  it("E0 opens the catalog when it is tucked", () => {
    assert.equal(
      idOf(base({ ui: { techCatalogHidden: true } })),
      "E0"
    );
  });

  it("D1 opens the tutor tab on a learning quest before inventing", () => {
    const step = resolveTourStep(
      base({ isLearning: true, tutorOn: true, sideTab: "vision" })
    );
    assert.equal(step.id, "D1");
    assert.equal(step.target.selector, '.side-tab[data-tab="coinventor"]');
  });

  it("D2 stays on the tutor once that tab is open", () => {
    assert.equal(
      idOf(base({ isLearning: true, tutorOn: true, sideTab: "coinventor" })),
      "D2"
    );
  });

  it("briefing beats the learning tutor hint", () => {
    assert.equal(
      idOf(
        base({
          isLearning: true,
          tutorOn: true,
          briefing: { active: true, index: 0, beatCount: 3 },
        })
      ),
      "C1"
    );
  });

  it("a focused tech skips the tutor tab hint", () => {
    assert.equal(
      idOf(
        base({
          isLearning: true,
          tutorOn: true,
          focusedTechId: "ai",
          focusedTechName: "AI",
        })
      ),
      "F1"
    );
  });

  it("F1 Ask for ideas after a tech is focused", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "gene-sequencing",
        focusedTechName: "Gene sequencing",
      })
    );
    assert.equal(step.id, "F1");
    assert.equal(step.target.selector, "#btn-ask-ideas");
    assert.match(step.body, /3 tiles/);
  });

  it("F2 mint when how-it-works is filled", () => {
    assert.equal(
      idOf(
        base({
          focusedTechId: "ai",
          focusedTechName: "AI",
          howTextLength: 40,
        })
      ),
      "F2"
    );
  });

  it("F3 drag when unplaced idea cards exist", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        unplacedInventionCount: 3,
      })
    );
    assert.equal(step.id, "F3");
    assert.equal(step.target.selector, "#hex-idea-cards");
  });

  it("F5 refresh after a spark batch was discarded", () => {
    assert.equal(
      idOf(
        base({
          focusedTechId: "ai",
          focusedTechName: "AI",
          hasSparkBatch: true,
        })
      ),
      "F5"
    );
  });

  it("G2 dock when placed tiles do not touch crisis hexes", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 1,
        uncoveredGivenId: "crisis-local",
        uncoveredGivenName: "Grade Fear",
        uncoveredCount: 1,
        pathway: { overall: "red", bonds: "red", coverage: "yellow", timingLevel: "green" },
      })
    );
    assert.equal(step.id, "G2");
    assert.equal(step.target.kind, "hex-tile");
    assert.equal(step.target.id, "crisis-local");
    assert.match(step.body, /Grade Fear/);
    assert.match(step.body, /crisis tiles move/i);
    assert.match(step.body, /don't need more invention tiles/i);
  });

  it("G2 beats leftover idea cards in the tray", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 1,
        unplacedInventionCount: 2,
        uncoveredGivenId: "crisis-support",
        uncoveredGivenName: "Grade Fear",
        uncoveredCount: 1,
        pathway: { overall: "red", bonds: "red", coverage: "yellow", timingLevel: "green" },
      })
    );
    assert.equal(step.id, "G2");
    assert.equal(step.target.id, "crisis-support");
  });

  it("G4 timing red after the island is docked", () => {
    assert.equal(
      idOf(
        base({
          focusedTechId: "ai",
          placedInventionCount: 1,
          pathway: {
            overall: "red",
            bonds: "green",
            coverage: "green",
            timingLevel: "red",
          },
        })
      ),
      "G4"
    );
  });

  it("G5 summon when the pathway is honest and AP remains", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 2,
        pathway: {
          overall: "yellow",
          bonds: "green",
          coverage: "yellow",
          timingLevel: "yellow",
        },
      })
    );
    assert.equal(step.id, "G5");
    assert.equal(step.target.selector, "#btn-to-challenge");
  });

  it("G6 End turn when ready to summon but AP is 0", () => {
    assert.equal(
      idOf(
        base({
          focusedTechId: "ai",
          placedInventionCount: 2,
          ap: 0,
          pathway: {
            overall: "yellow",
            bonds: "green",
            coverage: "yellow",
            timingLevel: "yellow",
          },
        })
      ),
      "G6"
    );
  });

  it("H2 unanswered challenger before hold", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 2,
        unansweredConcernId: "concern-nature",
        concernsOnBoard: 1,
        remainingConcerns: 0,
        concernsSummoned: true,
        pathway: {
          overall: "yellow",
          bonds: "green",
          coverage: "yellow",
          timingLevel: "yellow",
        },
      })
    );
    assert.equal(step.id, "H2");
    assert.equal(step.target.id, "concern-nature");
  });

  it("H4 mid-summon uses remaining count", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 2,
        concernsOnBoard: 1,
        remainingConcerns: 2,
        concernsSummoned: false,
        pathway: {
          overall: "yellow",
          bonds: "green",
          coverage: "yellow",
          timingLevel: "yellow",
        },
      })
    );
    assert.equal(step.id, "H4");
    assert.match(step.body, /2 hard questions/);
  });

  it("H6 pathway holds", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 2,
        concernsOnBoard: 1,
        remainingConcerns: 0,
        concernsSummoned: true,
        boardHolds: true,
        pathway: {
          overall: "green",
          bonds: "green",
          coverage: "green",
          timingLevel: "green",
        },
      })
    );
    assert.equal(step.id, "H6");
    assert.equal(step.target.selector, "#btn-to-challenge");
  });

  it("G3 explains coverage red after the island is docked", () => {
    const step = resolveTourStep(
      base({
        focusedTechId: "ai",
        placedInventionCount: 2,
        concernsSummoned: true,
        concernsOnBoard: 1,
        remainingConcerns: 0,
        redGivenId: "crisis-local",
        coverageReds: 1,
        coverageNote: "1 light(s) still red",
        pathway: {
          overall: "red",
          bonds: "green",
          coverage: "red",
          timingLevel: "yellow",
        },
      })
    );
    assert.equal(step.id, "G3");
    assert.match(step.body, /still red/);
  });

  it("B1 spectator", () => {
    assert.equal(idOf(base({ mp: { spectator: true } })), "B1");
  });

  it("A4 create busy", () => {
    assert.equal(idOf(base({ ui: { createBusy: true } })), "A4");
  });

  it("A5 timing pending", () => {
    assert.equal(
      idOf(base({ pathway: { timingPending: true, overall: "yellow" } })),
      "A5"
    );
  });
});

describe("queryTourTarget", () => {
  it("returns null without a document", () => {
    assert.equal(queryTourTarget({ target: selDummy() }, null), null);
  });
});

function selDummy() {
  return { kind: "selector", selector: "#nope" };
}
