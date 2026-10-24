import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createVoiceSessionStore } from "./voice-session.mjs";
import {
  attachVoiceSockets,
  planVoiceChange,
  planXaiClose,
  takeAudioBudget,
  inventStateReadiness,
  shouldForwardToolOutput,
  VOICE_AUDIO_CHARS_PER_SEC,
} from "./voice-proxy.mjs";

it("real voice socket awaits authority, rejects run swaps and closes on entitlement revocation before upstream", { timeout: 5000 }, async () => {
  let allowed = true;
  let checks = 0;
  let upstream = 0;
  const sessions = createVoiceSessionStore();
  const runId = "11111111-1111-4111-8111-111111111111";
  const ref = { packageId: "voice", questId: "voice", revision: `sha256:${"aa".repeat(32)}` };
  const created = await sessions.createAuthorized({ context: { questId: "voice", runId, packageRef: ref, year: 2026 },
    authorizeContext: async (body) => {
      checks++;
      await new Promise((resolve) => setImmediate(resolve));
      return allowed ? { ok: true, body: { context: { ...body.context, grounding: "AUTHORED" } } }
        : { ok: false, status: 402, code: "subscription_required" };
    } });
  const server = createServer();
  let finishToken;
  const wss = attachVoiceSockets(server, { sessions, getAccessToken: () => {
    upstream++;
    return new Promise((resolve) => { finishToken = resolve; });
  } });
  server.on("upgrade", (req, socket, head) => wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req)));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const client = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws/co-invent-voice`);
  try {
    await once(client, "open");
    client.send(JSON.stringify({ type: "auth", sessionId: created.session.id, token: created.session.token }));
    while (!finishToken) await new Promise((resolve) => setImmediate(resolve));
    assert.equal(checks, 3, "creation, socket authentication and upstream connection all recheck");
    const swappedReply = once(client, "message");
    client.send(JSON.stringify({ type: "context", context: { runId: "22222222-2222-4222-8222-222222222222" } }));
    assert.equal(JSON.parse(String((await swappedReply)[0])).error, "package_reference_forbidden");
    assert.equal(sessions.get(created.session.id).context.runId, runId);
    assert.equal(checks, 3, "swap is rejected before resolving another run");
    allowed = false;
    const closed = once(client, "close");
    client.send(JSON.stringify({ type: "context", context: { year: 2028, grounding: "FORGED" } }));
    await closed;
    assert.equal(sessions.size(), 0);
    assert.equal(checks, 4);
    assert.equal(upstream, 1);
  } finally {
    finishToken?.(null);
    client.terminate();
    await sessions.closeAll();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }
});

it("socket authentication denial never asks for an upstream token", { timeout: 5000 }, async () => {
  let allowed = true;
  let upstream = 0;
  const sessions = createVoiceSessionStore();
  const created = await sessions.createAuthorized({ context: {}, authorizeContext: async (body) => allowed
    ? { ok: true, body } : { ok: false, status: 402, code: "subscription_required" } });
  const server = createServer();
  const wss = attachVoiceSockets(server, { sessions, getAccessToken: async () => { upstream++; return null; } });
  server.on("upgrade", (req, socket, head) => wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req)));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const client = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws/co-invent-voice`);
  try {
    await once(client, "open");
    allowed = false;
    const closed = once(client, "close");
    client.send(JSON.stringify({ type: "auth", sessionId: created.session.id, token: created.session.token }));
    await closed;
    assert.equal(upstream, 0);
    assert.equal(sessions.size(), 0);
  } finally {
    client.terminate();
    await sessions.closeAll();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("planVoiceChange", () => {
  it("accepts a new known voice, including case", () => {
    assert.deepEqual(planVoiceChange("eve", "ara"), { ok: true, voice: "ara" });
    assert.deepEqual(planVoiceChange("eve", "REX"), { ok: true, voice: "rex" });
  });

  it("keeps the current voice when the request is unknown or unchanged", () => {
    assert.deepEqual(planVoiceChange("eve", "nope"), { ok: false, voice: "eve" });
    assert.deepEqual(planVoiceChange("ara", "ara"), { ok: false, voice: "ara" });
    assert.deepEqual(planVoiceChange("eve", "eve"), { ok: false, voice: "eve" });
    assert.deepEqual(planVoiceChange("nope", "sal"), { ok: true, voice: "sal" });
  });
});

describe("planXaiClose", () => {
  it("reconnects once, then hangs up", () => {
    assert.equal(planXaiClose({ closed: false, drops: 0 }), "reconnect");
    assert.equal(planXaiClose({ closed: false, drops: 1 }), "hangup");
  });

  it("ignores a close after the call has already ended", () => {
    assert.equal(planXaiClose({ closed: true, drops: 0 }), "ignore");
  });
});

describe("takeAudioBudget", () => {
  it("allows a live mic and drops a flood without hanging up", () => {
    const chunk = 6_400;
    let state = { windowStart: 0, bytes: 0 };
    for (let i = 0; i < 10; i++) {
      const step = takeAudioBudget(state, chunk, 1_000);
      assert.equal(step.allow, true);
      assert.equal(step.hangup, false);
      state = step.state;
    }
    const flood = takeAudioBudget(state, VOICE_AUDIO_CHARS_PER_SEC * 3, 1_000);
    assert.equal(flood.allow, false);
    assert.equal(flood.hangup, false);
    const next = takeAudioBudget(flood.state, chunk, 1_000);
    assert.equal(next.allow, true);
  });

  it("hangs up when one window exceeds the hard cap", () => {
    const step = takeAudioBudget({ windowStart: 0, bytes: 0 }, VOICE_AUDIO_CHARS_PER_SEC * 8 + 1, 5_000);
    assert.equal(step.allow, false);
    assert.equal(step.hangup, true);
  });

  it("starts a fresh window after a second", () => {
    const full = takeAudioBudget(
      { windowStart: 0, bytes: 0 },
      VOICE_AUDIO_CHARS_PER_SEC * 3,
      1_000
    );
    assert.equal(full.allow, true);
    const extra = takeAudioBudget(full.state, 1, 1_000);
    assert.equal(extra.allow, false);
    assert.equal(extra.hangup, false);
    const later = takeAudioBudget(extra.state, 6_400, 2_500);
    assert.equal(later.allow, true);
    assert.equal(later.hangup, false);
  });
});

describe("shouldForwardToolOutput", () => {
  const socket = {};

  it("posts on the upstream socket that minted the call id", () => {
    assert.equal(
      shouldForwardToolOutput({ startedGen: 2, currentGen: 2, socket }),
      true
    );
  });

  it("drops the output after reconnect, hangup, or a missing socket", () => {
    assert.equal(
      shouldForwardToolOutput({ startedGen: 2, currentGen: 3, socket }),
      false
    );
    assert.equal(
      shouldForwardToolOutput({ startedGen: 2, currentGen: 2, closed: true, socket }),
      false
    );
    assert.equal(
      shouldForwardToolOutput({ startedGen: 2, currentGen: 2, socket: null }),
      false
    );
  });
});

describe("inventStateReadiness", () => {
  it("waits while meters are pending, then snapshots when they settle", () => {
    assert.equal(inventStateReadiness({ metricsPending: true }), "wait");
    assert.equal(inventStateReadiness({ metricsPending: false }), "snapshot");
    assert.equal(inventStateReadiness({}), "snapshot");
  });

  it("retries on hangup or timeout while still pending", () => {
    assert.equal(
      inventStateReadiness({ metricsPending: true }, { timedOut: true }),
      "retry"
    );
    assert.equal(
      inventStateReadiness({ metricsPending: true }, { hungUp: true }),
      "retry"
    );
  });

  it("snapshots a settled board even if the wait timed out", () => {
    assert.equal(
      inventStateReadiness({ metricsPending: false }, { timedOut: true }),
      "snapshot"
    );
  });
});
