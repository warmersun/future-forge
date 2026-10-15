import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyAccessOverride,
  missingWrapperLessons,
  parseLiveCatalog,
  planPublish,
  publishPlanned,
  upsertCatalog,
} from "./publish-quest.mjs";

describe("publish quest catalog upsert", () => {
  it("adds a tile and keeps the other catalog entries", () => {
    const { catalog, actions } = upsertCatalog(
      { quests: [{ id: "kept", file: "kept.json" }] },
      [{ id: "new-quest", file: "new-quest.json" }]
    );
    assert.deepEqual(
      catalog.quests.map((q) => q.id),
      ["kept", "new-quest"]
    );
    assert.deepEqual(actions, [{ id: "new-quest", file: "new-quest.json", action: "added" }]);
  });

  it("replaces only the matching id", () => {
    const { catalog, actions } = upsertCatalog(
      {
        quests: [
          { id: "kept", file: "kept.json" },
          { id: "same", file: "same.json", note: "stay" },
        ],
      },
      [{ id: "same", file: "same.json" }]
    );
    assert.equal(catalog.quests.length, 2);
    assert.equal(catalog.quests[1].note, "stay");
    assert.equal(actions[0].action, "updated");
  });

  it("fails a wrapper whose lesson is neither here nor in the catalog", async () => {
    const missing = missingWrapperLessons(
      [{ id: "module-a", kind: "module", lessons: ["lesson-1", "lesson-2"] }],
      [{ id: "lesson-1" }]
    );
    assert.deepEqual(missing, [{ wrapper: "module-a", lesson: "lesson-2" }]);
    const plan = planPublish({
      catalog: { quests: [{ id: "lesson-1", file: "lesson-1.json" }] },
      documents: [{ id: "module-a", kind: "module", lessons: ["lesson-1", "lesson-2"] }],
    });
    let writes = 0;
    const result = await publishPlanned(plan, {
      writeObject: async () => {
        writes += 1;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(writes, 0);
  });

  it("refuses a live catalog that is not JSON", () => {
    assert.equal(parseLiveCatalog("{").ok, false);
    assert.equal(parseLiveCatalog("[]").ok, false);
    assert.equal(parseLiveCatalog('{"quests":"nope"}').ok, false);
    assert.deepEqual(parseLiveCatalog('{"quests":[{"id":"kept","file":"kept.json"}]}').catalog.quests[0].id, "kept");
  });

  it("does not upload an unsafe id", async () => {
    const plan = planPublish({
      catalog: { quests: [{ id: "kept", file: "kept.json" }] },
      documents: [{ id: "../kept", kind: "quest" }],
    });
    let writes = 0;
    const result = await publishPlanned(plan, {
      writeObject: async () => {
        writes += 1;
      },
    });
    assert.deepEqual(plan.unsafe, ["../kept"]);
    assert.equal(result.ok, false);
    assert.equal(writes, 0);
    assert.equal(plan.catalog.quests.length, 1);
  });

  it("accepts a wrapper when this batch includes the lesson", () => {
    const plan = planPublish({
      catalog: { quests: [] },
      documents: [
        { id: "module-a", kind: "module", lessons: ["lesson-1"], title: "Path" },
        { id: "lesson-1", kind: "quest", isLearningModule: true, title: "One" },
      ],
    });
    assert.equal(plan.missing.length, 0);
    assert.deepEqual(
      plan.actions.map((a) => a.action),
      ["added", "added"]
    );
    assert.equal(plan.prepared[1].access, "account");
  });

  it("sets access on the uploaded copy only", () => {
    const source = { id: "q", kind: "quest", title: "Q" };
    const plan = planPublish({
      catalog: { quests: [] },
      documents: [source],
      access: "paid",
    });
    assert.equal(source.access, undefined);
    assert.equal(plan.prepared[0].body.access, "paid");
    assert.equal(plan.prepared[0].access, "paid");
    assert.equal(applyAccessOverride(source, null), source);
  });

  it("does not upload on a dry run", async () => {
    const plan = planPublish({
      catalog: { quests: [{ id: "kept", file: "kept.json" }] },
      documents: [{ id: "q", kind: "quest", title: "Q", access: "open" }],
    });
    let writes = 0;
    const result = await publishPlanned(plan, {
      dryRun: true,
      writeObject: async () => {
        writes += 1;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(writes, 0);
    assert.equal(plan.catalog.quests.length, 2);
  });
});
