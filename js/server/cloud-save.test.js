import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SOLVED_IDS,
  sanitizeQuestId,
  sanitizeSolvedIds,
  mapOutcome,
  sanitizeLastRun,
  shouldStoreLastRun,
  cloudWriteGate,
  parseImportBody,
} from "./cloud-save.mjs";

describe("sanitizeQuestId", () => {
  it("accepts mission-like ids", () => {
    assert.equal(sanitizeQuestId("spotlight-gene-seq"), "spotlight-gene-seq");
    assert.equal(sanitizeQuestId("imp-water-abc123"), "imp-water-abc123");
  });

  it("rejects empty, long, and junk", () => {
    assert.equal(sanitizeQuestId(""), null);
    assert.equal(sanitizeQuestId(null), null);
    assert.equal(sanitizeQuestId("has space"), null);
    assert.equal(sanitizeQuestId("../etc/passwd"), null);
    assert.equal(sanitizeQuestId("x".repeat(121)), null);
  });
});

describe("sanitizeSolvedIds", () => {
  it("dedupes and drops junk", () => {
    assert.deepEqual(sanitizeSolvedIds(["a", "a", "bad id", "b"]), ["a", "b"]);
  });

  it("caps at MAX_SOLVED_IDS", () => {
    const many = Array.from({ length: MAX_SOLVED_IDS + 20 }, (_, i) => `q${i}`);
    assert.equal(sanitizeSolvedIds(many).length, MAX_SOLVED_IDS);
  });

  it("non-array becomes empty", () => {
    assert.deepEqual(sanitizeSolvedIds("nope"), []);
    assert.deepEqual(sanitizeSolvedIds(null), []);
  });
});

describe("mapOutcome / sanitizeLastRun", () => {
  it("maps win to hold", () => {
    assert.equal(mapOutcome("win"), "hold");
    assert.equal(sanitizeLastRun({ questId: "q1", outcome: "win" }).outcome, "hold");
  });

  it("keeps hold/partial/collapse/abandon", () => {
    assert.equal(mapOutcome("partial"), "partial");
    assert.equal(mapOutcome("collapse"), "collapse");
  });

  it("drops board/hex/vision keys and unknown blobs", () => {
    const run = sanitizeLastRun({
      questId: "q1",
      outcome: "hold",
      kind: "theme",
      stars: 3,
      yearReached: 2034,
      waits: 2,
      place: "Accra",
      board: { hexes: [1, 2, 3] },
      hex: { huge: true },
      visionUrl: "data:image/png;base64,AAAA",
    });
    assert.equal(run.questId, "q1");
    assert.equal(run.stars, 3);
    assert.equal(run.place, "Accra");
    assert.equal("board" in run, false);
    assert.equal("hex" in run, false);
    assert.equal("visionUrl" in run, false);
  });

  it("rejects missing quest or outcome", () => {
    assert.equal(sanitizeLastRun(null), null);
    assert.equal(sanitizeLastRun({ outcome: "hold" }), null);
    assert.equal(sanitizeLastRun({ questId: "q1" }), null);
  });

  it("drops out-of-range stars and slices place", () => {
    assert.equal(sanitizeLastRun({ questId: "q1", outcome: "hold", stars: 9 }).stars, null);
    const long = sanitizeLastRun({
      questId: "q1",
      outcome: "hold",
      place: "x".repeat(400),
    });
    assert.equal(long.place.length, 200);
  });
});

describe("shouldStoreLastRun (C4 cloud wins)", () => {
  const run = { questId: "q1", outcome: "hold", kind: "theme" };
  it("stores when cloud has no runs", () => {
    assert.equal(shouldStoreLastRun(0, run), true);
  });
  it("skips when cloud already has a run", () => {
    assert.equal(shouldStoreLastRun(1, run), false);
    assert.equal(shouldStoreLastRun(4, run), false);
  });
  it("skips empty lastRun", () => {
    assert.equal(shouldStoreLastRun(0, null), false);
  });
});

describe("cloudWriteGate", () => {
  it("404 when Clerk is off", () => {
    const g = cloudWriteGate({ enabled: false }, { dbEnabled: true });
    assert.equal(g.ok, false);
    assert.equal(g.status, 404);
  });

  it("401 unsigned or bad JWT", () => {
    assert.equal(
      cloudWriteGate({ enabled: true, signedIn: false, missingToken: true }, { dbEnabled: true })
        .error,
      "sign_in_required"
    );
    assert.equal(
      cloudWriteGate({ enabled: true, signedIn: false, invalidToken: true }, { dbEnabled: true })
        .error,
      "invalid_token"
    );
  });

  it("503 when signed in but no DATABASE_URL", () => {
    const g = cloudWriteGate(
      { enabled: true, signedIn: true, userId: "user_1" },
      { dbEnabled: false }
    );
    assert.equal(g.status, 503);
    assert.equal(g.error, "db_unavailable");
  });

  it("ok when signed in and db on", () => {
    const g = cloudWriteGate(
      { enabled: true, signedIn: true, userId: "user_1" },
      { dbEnabled: true }
    );
    assert.equal(g.ok, true);
    assert.equal(g.userId, "user_1");
  });
});

describe("parseImportBody", () => {
  it("reads solvedIds + lastRun", () => {
    const p = parseImportBody({
      solvedIds: ["a", "a", "b"],
      lastRun: { questId: "b", outcome: "win", kind: "lesson" },
    });
    assert.deepEqual(p.solvedIds, ["a", "b"]);
    assert.equal(p.lastRun.outcome, "hold");
    assert.equal(p.lastRun.kind, "lesson");
  });
});
