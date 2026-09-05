import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { globalById, localScenariosForGlobal } from "./data.js";

describe("scenario pack summaries", () => {
  it("attaches the locked Juniper Wells lede", () => {
    const g = globalById("climate");
    const list = localScenariosForGlobal(g, { count: 4, salt: 0 });
    const juniper = list.find((m) => /Juniper Wells/i.test(m.title));
    assert.ok(juniper);
    assert.match(juniper.summary, /too hot/i);
    assert.match(juniper.summary, /moves the needle on warming/i);
    assert.doesNotMatch(juniper.summary, /Juniper/);
    assert.doesNotMatch(juniper.summary, /Diego/);
  });
});
