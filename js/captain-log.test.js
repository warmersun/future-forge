import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearCaptainLog,
  appendCaptainLog,
  listCaptainLog,
  clipWords,
  ellipsisCappedName,
  ideaIdentityText,
  visibleLogTitle,
  visibleLogDetail,
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

  it("lists earliest first when asked for chrono order", () => {
    appendCaptainLog({ title: "First" });
    appendCaptainLog({ title: "Second" });
    const chrono = listCaptainLog({ order: "chrono" });
    assert.deepEqual(
      chrono.map((e) => e.title),
      ["First", "Second"]
    );
    assert.equal(listCaptainLog()[0].title, "Second");
  });

  it("clips a title on a word and marks it", () => {
    const full =
      "Placed nano filter that is fine enough to filter viruses out of the village well before the dry season ends and the truck leaves";
    assert.equal(clipWords("short title", 120), "short title");
    const cut = clipWords(full, 48);
    assert.match(cut, /\.\.\.$/);
    assert.ok(cut.length <= 48);
    const stem = cut.slice(0, -3);
    assert.equal(full.startsWith(stem), true);
    assert.equal(full[stem.length], " ");
    const entry = appendCaptainLog({ title: full });
    assert.match(entry.title, /\.\.\.$/);
    assert.ok(entry.title.length <= 120);
    assert.equal(full[entry.title.length - 3], " ");
  });

  it("uses the full description when the title is only a cut of it", () => {
    const how = "nano-filter that is fine enough to filter bacteria and bigger viruses from water";
    assert.equal(ideaIdentityText("nano-filter that is fine enough to...", how), how);
    assert.equal(ideaIdentityText(how.slice(0, 40), how), how);
    assert.equal(
      ideaIdentityText("using AI for material science", "using AI to advance material science we make a filter"),
      "using AI for material science"
    );
  });

  it("keeps the emTech beside an idea", () => {
    const e = appendCaptainLog({
      title: "Placed",
      ideas: [{ text: "graphene filter", tech: "Super Intelligence" }],
    });
    assert.equal(e.ideas[0].text, "graphene filter");
    assert.equal(e.ideas[0].tech, "Super Intelligence");
  });

  it("keeps pathway names and the full description", () => {
    const e = appendCaptainLog({
      title: "Pathway created",
      names: ["nano filter", "drip line"],
      description: "The pair keeps the wells clear.",
    });
    assert.deepEqual(e.names, ["nano filter", "drip line"]);
    assert.equal(e.description, "The pair keeps the wells clear.");
  });

  it("marks a tile name that was already cut at 40 characters", () => {
    const cut = "nano-filter, fine enough to filter bacte";
    assert.equal(cut.length, 40);
    assert.equal(ellipsisCappedName(cut), "nano-filter, fine enough to filter...");
    assert.equal(
      visibleLogTitle(`Minted ${cut}`),
      "Minted nano-filter, fine enough to filter..."
    );
    assert.equal(ellipsisCappedName("short idea"), "short idea");
    assert.equal(
      visibleLogDetail(
        `Placed ${cut}`,
        `Pathway ${cut} applied to crisis Field Runoff.`
      ),
      "Pathway nano-filter, fine enough to filter... applied to crisis Field Runoff."
    );
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
    const row = formatTimingLog("green", "Pilot honest for this year.");
    assert.equal(row.title, "Timing green");
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