import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createVoiceSessionStore } from "./voice-session.mjs";

describe("voice sessions", () => {
  it("creates, auths, and rejects a bad token", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      maxSessions: 2,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    const r = store.create({ clientSessionId: "c1", context: { year: 2028 } });
    assert.equal(r.ok, true);
    assert.equal(store.auth("id1", "tok1")?.id, "id1");
    assert.equal(store.auth("id1", "nope"), null);
    assert.equal(store.auth("id1", "tok"), null);
  });

  it("replaces the previous session for the same client", () => {
    let n = 0;
    const closed = [];
    const store = createVoiceSessionStore({
      maxSessions: 3,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
      onClose: (s, reason) => closed.push([s.id, reason]),
    });
    store.create({ clientSessionId: "c1" });
    const b = store.create({ clientSessionId: "c1" });
    assert.equal(b.ok, true);
    assert.equal(b.session.id, "id2");
    assert.equal(store.get("id1"), null);
    assert.equal(store.size(), 1);
    assert.deepEqual(closed[0], ["id1", "replaced"]);
  });

  it("enforces a global cap", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      maxSessions: 1,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    assert.equal(store.create({ clientSessionId: "a" }).ok, true);
    const full = store.create({ clientSessionId: "b" });
    assert.equal(full.ok, false);
    assert.equal(full.status, 429);
    assert.equal(full.error, "voice_busy");
  });

  it("updates context and closes", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    store.create({ clientSessionId: "c1", context: { year: 1 } });
    store.updateContext("id1", { year: 2030 });
    assert.equal(store.get("id1").context.year, 2030);
    assert.equal(store.close("id1", "hangup"), true);
    assert.equal(store.get("id1"), null);
    assert.equal(store.size(), 0);
  });
});
