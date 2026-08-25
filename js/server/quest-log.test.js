import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseRunsQuery,
  filterRuns,
  sanitizeTechIds,
  parseStartBody,
  publicRunRow,
  DEFAULT_RUNS_LIMIT,
  MAX_RUNS_LIMIT,
} from "./quest-log.mjs";

const rows = [
  { id: "1", kind: "theme", outcome: "hold", questId: "a" },
  { id: "2", kind: "daily", outcome: "hold", questId: "b" },
  { id: "3", kind: "theme", outcome: "collapse", questId: "c" },
  { id: "4", kind: "lesson", outcome: "partial", questId: "d" },
];

describe("parseRunsQuery", () => {
  it("defaults and clamps limit", () => {
    const q = parseRunsQuery(new URLSearchParams(""));
    assert.equal(q.kind, null);
    assert.equal(q.outcome, null);
    assert.equal(q.limit, DEFAULT_RUNS_LIMIT);
    assert.equal(parseRunsQuery(new URLSearchParams("limit=9999")).limit, MAX_RUNS_LIMIT);
    assert.equal(parseRunsQuery({ kind: "daily", outcome: "win", limit: "10" }).kind, "daily");
    assert.equal(parseRunsQuery({ kind: "daily", outcome: "win" }).outcome, "hold");
  });

  it("ignores unknown kind/outcome", () => {
    const q = parseRunsQuery({ kind: "homework", outcome: "grade" });
    assert.equal(q.kind, null);
    assert.equal(q.outcome, null);
  });
});

describe("filterRuns", () => {
  it("filters by kind and outcome", () => {
    assert.equal(filterRuns(rows, { kind: "theme" }).length, 2);
    assert.equal(filterRuns(rows, { outcome: "hold" }).length, 2);
    assert.deepEqual(
      filterRuns(rows, { kind: "theme", outcome: "collapse" }).map((r) => r.id),
      ["3"]
    );
  });
});

describe("sanitizeTechIds / parseStartBody", () => {
  it("caps and sanitizes tech ids", () => {
    assert.deepEqual(sanitizeTechIds(["gene-seq", "gene-seq", "bad id"]), ["gene-seq"]);
  });

  it("requires questId on start", () => {
    assert.equal(parseStartBody({}), null);
    const s = parseStartBody({ questId: "spotlight-gene-seq", kind: "lesson", place: "Accra" });
    assert.equal(s.questId, "spotlight-gene-seq");
    assert.equal(s.kind, "lesson");
    assert.equal(s.place, "Accra");
  });
});

describe("publicRunRow", () => {
  it("maps snake_case db rows and null outcome for in-progress", () => {
    const p = publicRunRow({
      id: "abc",
      quest_id: "q1",
      kind: "theme",
      outcome: null,
      stars: 3,
      year_reached: 2034,
      waits: 1,
      place: "Accra",
      tech_ids: ["gene-seq"],
      started_at: "2026-08-25T00:00:00Z",
      ended_at: null,
      imported: false,
    });
    assert.equal(p.questId, "q1");
    assert.equal(p.outcome, null);
    assert.deepEqual(p.techIds, ["gene-seq"]);
    assert.equal(p.yearReached, 2034);
  });
});
