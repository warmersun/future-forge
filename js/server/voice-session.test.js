import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createIdleGuard, createVoiceSessionStore } from "./voice-session.mjs";

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

  it("stores a requested voice", () => {
    const store = createVoiceSessionStore({
      randomId: () => "id",
      randomToken: () => "tok",
    });
    const r = store.create({ voice: "ara" });
    assert.equal(r.ok, true);
    assert.equal(r.session.voice, "ara");
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

describe("voice idle guard", () => {
  it("fires once after a quiet stretch and a bump delays it", () => {
    /** @type {{ fn: () => void, at: number, cancelled: boolean }[]} */
    const pending = [];
    let now = 0;
    let fired = 0;
    const idle = createIdleGuard({
      ms: 90,
      onIdle: () => {
        fired += 1;
      },
      schedule: (fn, ms) => {
        const timer = { fn, at: now + ms, cancelled: false };
        pending.push(timer);
        return timer;
      },
      cancel: (timer) => {
        timer.cancelled = true;
      },
    });
    const runDue = () => {
      for (const timer of pending) {
        if (!timer.cancelled && timer.at <= now) timer.fn();
      }
    };
    idle.bump();
    now = 89;
    runDue();
    assert.equal(fired, 0);
    idle.bump();
    now = 179;
    runDue();
    assert.equal(fired, 1);
    idle.stop();
    now = 400;
    runDue();
    assert.equal(fired, 1);
  });
});
