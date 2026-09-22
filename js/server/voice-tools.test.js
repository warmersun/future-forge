import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleVoiceTool, parseToolArguments } from "./voice-tools.mjs";

const ctx = {
  hexInvent: false,
  tutorMode: false,
  availableTechs: [
    { id: "synbio", name: "Synthetic Biology" },
    { id: "ai", name: "AI" },
  ],
};

describe("parseToolArguments", () => {
  it("parses JSON strings and objects", () => {
    assert.deepEqual(parseToolArguments('{"techIds":["ai"]}'), { techIds: ["ai"] });
    assert.deepEqual(parseToolArguments({ techIds: ["ai"] }), { techIds: ["ai"] });
    assert.deepEqual(parseToolArguments("nope"), {});
  });
});

describe("handleVoiceTool", () => {
  it("drops unknown tech ids and no-ops when none remain", () => {
    const miss = handleVoiceTool("suggest_techs", { techIds: ["laser-shark"] }, ctx);
    assert.equal(miss.output.ok, false);
    assert.equal(miss.proposals, null);

    const mix = handleVoiceTool(
      "suggest_techs",
      { techIds: ["laser-shark", "ai", "ai", "synbio", "iot"] },
      ctx
    );
    assert.equal(mix.output.ok, true);
    assert.deepEqual(mix.proposals.addTechIds, ["ai", "synbio"]);
    assert.match(mix.message, /AI/);
  });

  it("draft_how fills inventionHow", () => {
    const r = handleVoiceTool("draft_how", { text: "Kelp baffles cut the wake." }, ctx);
    assert.equal(r.output.ok, true);
    assert.equal(r.proposals.inventionHow, "Kelp baffles cut the wake.");
  });

  it("hex rejects draft_life", () => {
    const r = handleVoiceTool(
      "draft_life",
      { text: "People walk the quay at dusk." },
      { ...ctx, hexInvent: true }
    );
    assert.equal(r.output.ok, false);
    assert.equal(r.output.error, "not_on_this_surface");
    assert.equal(r.proposals, null);
  });

  it("legacy draft_life fills inventionImpact", () => {
    const r = handleVoiceTool("draft_life", { text: "Vaccines last the afternoon." }, ctx);
    assert.equal(r.proposals.inventionImpact, "Vaccines last the afternoon.");
  });

  it("show_lesson_media resolves catalog ids only while tutoring", () => {
    const tutor = {
      ...ctx,
      tutorMode: true,
      aiTutorContext:
        "![Software that can pay](https://warmersun.com/lessons/i07.png)\n[Page 07](https://warmersun.com/lessons/p07.html)\n[Page 03](https://warmersun.com/lessons/p03.html)",
    };
    const off = handleVoiceTool("show_lesson_media", { imageIds: ["img1"] }, ctx);
    assert.equal(off.output.ok, false);
    assert.equal(off.output.error, "not_tutoring");
    assert.equal(off.media, null);

    const shown = handleVoiceTool(
      "show_lesson_media",
      { imageIds: ["img1", "nope"], linkIds: ["link1"] },
      tutor
    );
    assert.equal(shown.output.ok, true);
    assert.equal(shown.proposals, null);
    assert.equal(shown.media.images[0].id, "img1");
    assert.equal(shown.media.images[0].alt, "Software that can pay");
    assert.equal(shown.media.links[0].id, "link1");
    assert.equal(shown.media.images.length, 1);
    assert.match(shown.output.hint, /Do not read URLs/);

    const miss = handleVoiceTool("show_lesson_media", { imageIds: ["img9"] }, tutor);
    assert.equal(miss.output.ok, false);
    assert.equal(miss.media, null);
  });

  it("end_tutoring only while tutoring", () => {
    const off = handleVoiceTool("end_tutoring", {}, ctx);
    assert.equal(off.endTutoring, false);
    assert.equal(off.output.error, "not_tutoring");
    const on = handleVoiceTool("end_tutoring", {}, { ...ctx, tutorMode: true });
    assert.equal(on.endTutoring, true);
    assert.equal(on.output.ok, true);
  });

  it("get_invent_state returns snapshot, unknown tool fails", () => {
    const st = handleVoiceTool("get_invent_state", {}, { ...ctx, year: 2028, place: "X" });
    assert.equal(st.output.ok, true);
    assert.equal(st.output.state.year, 2028);
    assert.equal(st.proposals, null);
    const unk = handleVoiceTool("explode", {}, ctx);
    assert.equal(unk.output.error, "unknown_tool");
  });

  it("get_invent_state retries without meter levels while metricsPending", () => {
    const pending = handleVoiceTool(
      "get_invent_state",
      {},
      { ...ctx, metricsPending: true, pressure: { Floods: 4 } }
    );
    assert.equal(pending.output.ok, false);
    assert.equal(pending.output.retry, true);
    assert.equal(pending.output.error, "metrics_recalculating");
    assert.match(pending.output.hint, /Do not quote meter levels/);
    assert.deepEqual(pending.output.state.pressure, []);
    assert.equal(pending.output.state.metricsPending, true);

    const settled = handleVoiceTool(
      "get_invent_state",
      {},
      { ...ctx, pressure: { Floods: 4 } }
    );
    assert.equal(settled.output.ok, true);
    assert.equal(settled.output.state.pressure.some((p) => p.label === "Floods"), true);
    assert.equal(settled.output.state.metricsPending, false);
  });
});
