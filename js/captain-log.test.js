import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearCaptainLog,
  appendCaptainLog,
  listCaptainLog,
  setCaptainLogFilter,
  captainLogFilter,
  captainLogFilterCounts,
  formatPathwayScoreLog,
  formatTimingLog,
  formatPlacementTouch,
} from "./captain-log.js";

describe("captain-log", () => {
  beforeEach(() => clearCaptainLog());

  it("keeps newest first and caps at 200", () => {
    for (let i = 0; i < 210; i++) {
      appendCaptainLog({ kind: "action", title: `n${i}` });
    }
    const list = listCaptainLog();
    assert.equal(list.length, 200);
    assert.equal(list[0].title, "n209");
    assert.equal(list[199].title, "n10");
  });

  it("filters actions and assessments", () => {
    appendCaptainLog({ kind: "action", title: "Placed cooler" });
    appendCaptainLog({ kind: "assessment", title: "Timing green", tone: "green" });
    assert.equal(captainLogFilterCounts().all, 2);
    assert.equal(captainLogFilterCounts().action, 1);
    assert.equal(captainLogFilterCounts().assessment, 1);
    setCaptainLogFilter("assessment");
    assert.equal(captainLogFilter(), "assessment");
    const rows = listCaptainLog();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, "Timing green");
    assert.equal(listCaptainLog({ filter: "all" }).length, 2);
  });

  it("clears the book", () => {
    appendCaptainLog({ title: "Ended turn" });
    setCaptainLogFilter("action");
    clearCaptainLog();
    assert.equal(listCaptainLog({ filter: "all" }).length, 0);
    assert.equal(captainLogFilter(), "all");
  });

  it("stores the delta sign beside the reason sentence", () => {
    const row = formatPathwayScoreLog({
      crisisDelta: { local: -1, global: 0, support: 1 },
      crisisReasons: {
        local: "The noon cooler keeps class in.",
        global: "No root-cause lever.",
        support: "A reactor raises public pressure.",
      },
      concerns: {
        moloch: { level: "yellow", reason: "Partial honest address." },
      },
    });
    assert.equal(row.title, "Pathway scored");
    assert.match(row.detail, /Local -1 — The noon cooler keeps class in\./);
    assert.match(row.detail, /Global 0 — No root-cause lever\./);
    assert.match(row.detail, /Support \+1 — A reactor raises public pressure\./);
    assert.match(row.detail, /Moloch yellow — Partial honest address\./);
    assert.equal(row.tone, "red");
  });

  it("says which pathway is applied to which crises and concerns", () => {
    const line = formatPlacementTouch([
      {
        pathway: ["nano filter", "drip line"],
        crises: ["Wells"],
        concerns: ["Moloch"],
      },
    ]);
    assert.equal(
      line,
      "Pathway nano filter · drip line applied to crisis Wells and concern Moloch."
    );
    assert.equal(
      formatPlacementTouch([{ pathway: ["nano filter"], crises: [], concerns: [] }]),
      "Pathway nano filter — not touching a crisis or concern yet."
    );
    assert.equal(formatPlacementTouch([]), "Not touching a pathway yet.");
  });

  it("names the tile on a feasibility line", () => {
    const row = formatTimingLog("green", "Pilot honest for this year.", "nano filter");
    assert.equal(row.title, "Timing green · nano filter");
    assert.equal(row.detail, "Pilot honest for this year.");
    assert.equal(row.tone, "green");
  });

  it("omits crisis lines when the delta was kept", () => {
    const row = formatPathwayScoreLog(
      {
        crisisDelta: { local: -1, global: 0, support: 0 },
        crisisReasons: { local: "Should not appear." },
        concerns: {
          ethicist: { level: "green", reason: "The pathway names who pays." },
        },
      },
      { keepCrisisDelta: true }
    );
    assert.doesNotMatch(row.detail, /Should not appear/);
    assert.match(row.detail, /Ethicist green — The pathway names who pays\./);
    assert.equal(row.tone, "green");
  });
});