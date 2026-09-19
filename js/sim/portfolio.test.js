import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PORTFOLIO_CATEGORIES,
  portfolioIconSvg,
  categoryIdForTech,
  categoryIdsForTechs,
  emptyPortfolio,
  addTechsToPortfolio,
  portfolioFromTechIdLists,
  portfolioFromRuns,
  usedCategoryCount,
  isFullToolkit,
  publicPortfolio,
  pickRicherPublicPortfolio,
  readLocalPortfolio,
  recordLocalHold,
  seedFullToolkitPreview,
  clearLocalPortfolio,
  PORTFOLIO_STORAGE_KEY,
} from "./portfolio.js";

describe("portfolio categories", () => {
  it("tracks the eleven main emTech slots", () => {
    assert.equal(PORTFOLIO_CATEGORIES.length, 11);
    const ids = PORTFOLIO_CATEGORIES.map((c) => c.id);
    for (const id of [
      "ai",
      "robots",
      "transportation",
      "networks",
      "energy",
      "computing",
      "vr",
      "iot",
      "print3d",
      "synbio",
      "crypto",
    ]) {
      assert.ok(ids.includes(id), id);
      assert.match(portfolioIconSvg(id), /<svg /);
    }
  });

  it("maps related tray ids onto the headline category", () => {
    assert.equal(categoryIdForTech("ai"), "ai");
    assert.equal(categoryIdForTech("drones"), "transportation");
    assert.equal(categoryIdForTech("solar"), "energy");
    assert.equal(categoryIdForTech("gene-sequencing"), "synbio");
    assert.equal(categoryIdForTech("quantum"), "computing");
    assert.equal(categoryIdForTech("materials"), null);
    assert.equal(categoryIdForTech("bci"), null);
  });

  it("dedupes a run so one hold cannot fill a slot twice", () => {
    assert.deepEqual(categoryIdsForTechs(["solar", "wind", "ai", "ai"]), ["energy", "ai"]);
  });
});

describe("portfolio aggregation", () => {
  it("counts uses per category across holds", () => {
    const port = portfolioFromTechIdLists([
      ["ai", "iot"],
      ["ai", "robots"],
      ["solar"],
    ]);
    assert.equal(port.uses.ai, 2);
    assert.equal(port.uses.iot, 1);
    assert.equal(port.uses.robots, 1);
    assert.equal(port.uses.energy, 1);
    assert.equal(port.uses.crypto, 0);
    assert.equal(usedCategoryCount(port), 4);
    assert.equal(isFullToolkit(port), false);
  });

  it("ignores collapse and missing tech lists", () => {
    const port = portfolioFromRuns([
      { outcome: "hold", techIds: ["crypto"] },
      { outcome: "collapse", techIds: ["ai"] },
      { outcome: "abandon", techIds: ["robots"] },
      { outcome: "partial", tech_ids: ["print3d"] },
      { outcome: "hold" },
    ]);
    assert.equal(port.uses.crypto, 1);
    assert.equal(port.uses.print3d, 1);
    assert.equal(port.uses.ai, 0);
    assert.equal(port.uses.robots, 0);
  });

  it("is complete only when every slot has a use", () => {
    let port = emptyPortfolio();
    const oneEach = PORTFOLIO_CATEGORIES.map((c) => c.techIds[0]);
    port = addTechsToPortfolio(port, oneEach);
    assert.equal(isFullToolkit(port), true);
    const pub = publicPortfolio(port);
    assert.equal(pub.complete, true);
    assert.equal(pub.usedCount, 11);
    assert.equal(pub.total, 11);
    assert.equal("email" in pub, false);
  });

  it("fills toolkit slots from existing Cloud hold tech_ids", () => {
    const port = portfolioFromRuns([
      { outcome: "hold", techIds: ["drones", "ai", "iot", "transportation"] },
      { outcome: "hold", techIds: ["energy"] },
      { outcome: "hold", techIds: ["robots"] },
      { outcome: "hold", techIds: ["materials", "print3d"] },
    ]);
    assert.equal(port.uses.ai, 1);
    assert.equal(port.uses.iot, 1);
    assert.equal(port.uses.transportation, 1);
    assert.equal(port.uses.energy, 1);
    assert.equal(port.uses.robots, 1);
    assert.equal(port.uses.print3d, 1);
    assert.equal(port.uses.synbio, 0);
    const pub = publicPortfolio(port);
    assert.equal(pub.usedCount, 6);
    const empty = publicPortfolio(null);
    assert.equal(pickRicherPublicPortfolio(empty, pub).usedCount, 6);
  });
});

describe("local portfolio storage", () => {
  it("reads empty when missing and records a hold", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v),
    };
    assert.equal(readLocalPortfolio(storage).uses.ai, 0);
    recordLocalHold(storage, ["ai", "drones"]);
    recordLocalHold(storage, ["ai"]);
    const raw = JSON.parse(mem.get(PORTFOLIO_STORAGE_KEY));
    assert.equal(raw.uses.ai, 2);
    assert.equal(raw.uses.transportation, 1);
  });

  it("seeds and clears a full-toolkit preview", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    const port = seedFullToolkitPreview(storage, 2);
    assert.equal(isFullToolkit(port), true);
    assert.equal(port.uses.crypto, 2);
    clearLocalPortfolio(storage);
    assert.equal(readLocalPortfolio(storage).uses.ai, 0);
  });
});
