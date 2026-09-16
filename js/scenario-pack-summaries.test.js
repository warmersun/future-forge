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
});
