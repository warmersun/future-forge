import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { globalById, localScenariosForGlobal } from "./data.js";

describe("scenario pack summaries", () => {
  it("attaches the Juniper Wells instance lede", () => {
    const g = globalById("climate");
    const list = localScenariosForGlobal(g, { count: 4, salt: 0 });
    const juniper = list.find((m) => /Juniper Wells/i.test(m.title));
    assert.ok(juniper);
    assert.match(juniper.summary, /Diego/i);
    assert.match(juniper.summary, /Juniper Wells/i);
    assert.doesNotMatch(juniper.summary, /Climate crises/i);
    assert.doesNotMatch(juniper.summary, /This is about how far/i);
  });

  it("theme packs walk instance → root cause → job", () => {
    const g = globalById("infectious");
    const list = localScenariosForGlobal(g, { count: 1, salt: 0 });
    const md = String(list[0]?.briefMd || "");
    assert.match(md, /## The place/);
    assert.match(md, /## The bigger problem/);
    assert.match(md, /## Your job/);
    assert.doesNotMatch(md, /Who designs/);
  });

  it("keeps authored pack rules on theme seeds", () => {
    const g = globalById("rogue-si");
    const list = localScenariosForGlobal(g, { count: 1, salt: 0 });
    assert.ok(Array.isArray(list[0]?.rules) && list[0].rules.length);
    assert.equal(list[0].rules[0].id, "override-lock");
  });
});
