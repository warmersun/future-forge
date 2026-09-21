/**
 * Same-origin WebSocket proxy: browser ↔ Grok Voice realtime.
 * API key stays on the game process. Function calls are intercepted here.
 */

import { WebSocketServer, WebSocket } from "ws";
import { VOICE_MODEL, VOICE_SAMPLE_RATE, buildSessionUpdate } from "./voice-prompt.mjs";
import { handleVoiceTool } from "./voice-tools.mjs";
import { voiceContextFingerprint } from "../voice-context.js";
import {
  createIdleGuard,
  DEFAULT_VOICE_IDLE_MS,
  VOICE_WS_PATH,
} from "./voice-session.mjs";

/**
 * Unexpected xAI close: reconnect once, then hang up.
 * A close after the call is already finished is ignored.
 * @param {{ closed?: boolean, drops?: number, maxDrops?: number }} state
 * @returns {"ignore"|"reconnect"|"hangup"}
 */
export function planXaiClose(state = {}) {
  if (state.closed) return "ignore";
  const drops = Number(state.drops) || 0;
  const maxDrops = Number.isFinite(state.maxDrops) ? state.maxDrops : 1;
  if (drops < maxDrops) return "reconnect";
  return "hangup";
}

/** 24 kHz 16-bit PCM, base64, about one second of mic audio. */
export const VOICE_AUDIO_CHARS_PER_SEC = 64_000;

/**
 * Cap how much audio one session can forward in a one-second window.
 * A live mic sits near one second of audio per second. Extra frames are
 * dropped. A single window past the hard cap hangs the call up.
 * @param {{ windowStart?: number, bytes?: number }|null|undefined} state
 * @param {number} chars
 * @param {number} now
 * @param {{ windowMs?: number, burstChars?: number, hardChars?: number }} [opts]
 * @returns {{ allow: boolean, hangup: boolean, state: { windowStart: number, bytes: number } }}
 */
export function takeAudioBudget(state, chars, now, opts = {}) {
  const windowMs = opts.windowMs ?? 1000;
  const burst = opts.burstChars ?? VOICE_AUDIO_CHARS_PER_SEC * 3;
  const hard = opts.hardChars ?? VOICE_AUDIO_CHARS_PER_SEC * 8;
  const n = Math.max(0, Number(chars) || 0);
  const t = Number(now) || 0;
  let windowStart = state?.windowStart || 0;
  let bytes = state?.bytes || 0;
  if (!windowStart || t - windowStart >= windowMs) {
    windowStart = t;
    bytes = 0;
  }
  const next = bytes + n;
  if (next > hard) {
    return { allow: false, hangup: true, state: { windowStart, bytes: next } };
  }
  if (next > burst) {
    return { allow: false, hangup: false, state: { windowStart, bytes } };
  }
  return { allow: true, hangup: false, state: { windowStart, bytes: next } };
}

function envIdleMs() {
  const n = Number(process.env.FF_VOICE_IDLE_MS);
  return Number.isFinite(n) && n >= 1000 ? Math.floor(n) : DEFAULT_VOICE_IDLE_MS;
}

const XAI_REALTIME = "wss://api.x.ai/v1/realtime";

function safeSend(ws, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function parseJson(raw) {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

/**
 * @param {import('node:http').Server} httpServer
 * @param {object} opts
 * @param {ReturnType<import('./voice-session.mjs').createVoiceSessionStore>} opts.sessions
 * @param {(opts?: { forceRefresh?: boolean }) => Promise<string|null>} opts.getAccessToken
 * @param {number} [opts.maxPayload]
 * @param {(event: object) => void} [opts.onUsage]
 * @param {(msg: string) => void} [opts.warn]
 * @param {string} [opts.voice]
 * @param {string} [opts.model]
 */
export function attachVoiceSockets(httpServer, opts) {
  const sessions = opts.sessions;
  const getAccessToken = opts.getAccessToken;
  const maxPayload = opts.maxPayload || 256 * 1024;
  const onUsage = typeof opts.onUsage === "function" ? opts.onUsage : () => {};
  const warn = typeof opts.warn === "function" ? opts.warn : (m) => console.warn("[voice]", m);
  const defaultVoice = opts.voice || "eve";
  const model = opts.model || VOICE_MODEL;
  const idleMs = opts.idleMs || envIdleMs();

  const wss = new WebSocketServer({ noServer: true, maxPayload });

  wss.on("connection", (clientWs) => {
    let session = null;
    let xaiWs = null;
    let authed = false;
    let recorded = false;
    let closed = false;
    let xaiRetried = false;
    let xaiGen = 0;
    let upstreamDrops = 0;
    /** @type {Promise<unknown>[]} */
    let toolBatch = [];
    /** Proposals the browser missed while the socket was not writable. */
    let pendingClientPackets = [];
    /** @type {{ windowStart: number, bytes: number }} */
    let audioBudget = { windowStart: 0, bytes: 0 };
    let opening = false;
    let unauthMessages = 0;
    const authTimer = setTimeout(() => {
      if (!authed && !closed) {
        safeSend(clientWs, { type: "error", error: "auth_required" });
        try {
          clientWs.close();
        } catch {
          /* ignore */
        }
      }
    }, 8_000);
    if (typeof authTimer.unref === "function") authTimer.unref();
    /** @type {ReturnType<typeof createIdleGuard>|null} */
    let idle = null;

    const sendClient = (payload) => {
      if (safeSend(clientWs, payload)) return true;
      if (payload && payload.type === "proposals") pendingClientPackets.push(payload);
      return false;
    };

    const flushClientPackets = () => {
      if (!pendingClientPackets.length) return;
      const queued = pendingClientPackets;
      pendingClientPackets = [];
      for (const packet of queued) sendClient(packet);
    };

    const hangup = (reason = "hangup") => {
      if (closed) return;
      closed = true;
      clearTimeout(authTimer);
      try {
        idle?.stop();
      } catch {
        /* ignore */
      }
      idle = null;
      const s = session;
      session = null;
      if (s) {
        const dur = Math.max(0, Date.now() - (s.startedAt || Date.now()));
        if (!recorded) {
          recorded = true;
          try {
            onUsage({
              type: "ai_voice",
              source: reason === "error" || reason === "xai_error" ? "error" : "ai",
              durationMs: dur,
              voice: s.voice || defaultVoice,
              model,
              sessionId: s.clientSessionId || null,
              ok: reason !== "error" && reason !== "xai_error",
              reason,
            });
          } catch {
            /* ignore */
          }
        }
        sessions.close(s.id, reason);
      }
      try {
        xaiWs?.close();
      } catch {
        /* ignore */
      }
      xaiWs = null;
      try {
        clientWs.close();
      } catch {
        /* ignore */
      }
    };

    const connectXai = async (forceRefresh = false) => {
      if (closed || !session) return;
      const gen = ++xaiGen;
      opening = true;
      let token = await getAccessToken({ forceRefresh });
      if (closed || !session || gen !== xaiGen) return;
      if (!token) {
        safeSend(clientWs, { type: "error", error: "ai_offline" });
        hangup("ai_offline");
        return;
      }
      const socket = new WebSocket(
        `${XAI_REALTIME}?model=${encodeURIComponent(model)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (closed || !session || gen !== xaiGen) {
        try {
          socket.close();
        } catch {
          /* ignore */
        }
        return;
      }
      xaiWs = socket;
      sessions.bindXai(session.id, socket);

      socket.on("open", () => {
        if (gen !== xaiGen || closed || !session) return;
        opening = false;
        session.voiceFp = voiceContextFingerprint(session.context);
        const update = buildSessionUpdate(session.context, {
          voice: session.voice || defaultVoice,
          sampleRate: VOICE_SAMPLE_RATE,
        });
        safeSend(socket, update);
        safeSend(clientWs, {
          type: "ready",
          sampleRate: VOICE_SAMPLE_RATE,
          voice: session.voice || defaultVoice,
        });
        flushClientPackets();
        idle?.bump();
      });

      socket.on("unexpected-response", async (_req, res) => {
        if (gen !== xaiGen) return;
        const status = res?.statusCode || 0;
        if ((status === 401 || status === 403) && !xaiRetried) {
          xaiRetried = true;
          opening = false;
          xaiWs = null;
          xaiGen += 1;
          try {
            socket.close();
          } catch {
            /* ignore */
          }
          await connectXai(true);
          return;
        }
        warn(`xAI handshake ${status}`);
        safeSend(clientWs, { type: "error", error: "xai_connect_failed" });
        hangup("xai_error");
      });

      socket.on("message", (raw, isBinary) => {
        if (gen !== xaiGen) return;
        if (isBinary) return;
        const event = parseJson(raw);
        if (!event || typeof event !== "object") return;
        void onXaiEvent(event);
      });

      socket.on("close", () => {
        if (gen !== xaiGen) return;
        const action = planXaiClose({ closed, drops: upstreamDrops });
        if (action === "ignore") return;
        if (action === "reconnect") {
          upstreamDrops += 1;
          // In-flight runTool promises still deliver proposals to the browser.
          // A fresh xAI session cannot accept the old function-call ids.
          toolBatch = [];
          xaiWs = null;
          opening = false;
          safeSend(clientWs, { type: "reconnecting" });
          void connectXai(false);
          return;
        }
        hangup("xai_close");
      });
      socket.on("error", (err) => {
        if (gen !== xaiGen) return;
        warn(String(err?.message || err).slice(0, 200));
      });
    };

    const bumpIdle = () => idle?.bump();

    const onXaiEvent = async (event) => {
      const type = String(event.type || "");
      if (
        type === "response.output_audio.delta" ||
        type === "response.audio.delta" ||
        type === "response.output_audio_transcript.delta"
      ) {
        bumpIdle();
      }
      if (type === "response.function_call_arguments.done") {
        bumpIdle();
        const p = runTool(event);
        toolBatch.push(p);
        return;
      }
      if (type === "response.function_call_arguments.delta") return;
      if (type.startsWith("mcp_") || type.startsWith("response.mcp_")) return;

      if (type === "response.done") {
        if (toolBatch.length) {
          const batch = toolBatch;
          toolBatch = [];
          try {
            await Promise.all(batch);
          } catch (e) {
            warn(String(e?.message || e).slice(0, 160));
          }
          safeSend(xaiWs, { type: "response.create" });
        }
      }

      if (type === "error") {
        sendClient({
          type: "error",
          error: event.error?.message || event.message || "voice_error",
        });
        return;
      }

      sendClient(event);
    };

    const runTool = async (event) => {
      const result = handleVoiceTool(
        event.name,
        event.arguments,
        session?.context || {}
      );
      if (result.proposals || result.endTutoring) {
        sendClient({
          type: "proposals",
          proposals: result.proposals,
          message: result.message || "",
          endTutoring: Boolean(result.endTutoring),
        });
      }
      safeSend(xaiWs, {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: event.call_id,
          output: JSON.stringify(result.output),
        },
      });
      return result;
    };

    clientWs.on("message", (raw, isBinary) => {
      if (isBinary) return;
      if (Buffer.byteLength(String(raw)) > maxPayload) {
        safeSend(clientWs, { type: "error", error: "payload_too_large" });
        return;
      }
      const msg = parseJson(raw);
      if (!msg || typeof msg !== "object") {
        safeSend(clientWs, { type: "error", error: "bad_json" });
        return;
      }

      if (!authed) {
        unauthMessages += 1;
        if (unauthMessages > 4) {
          try {
            clientWs.close();
          } catch {
            /* ignore */
          }
          return;
        }
        if (msg.type !== "auth") {
          safeSend(clientWs, { type: "error", error: "auth_required" });
          return;
        }
        const found = sessions.auth(msg.sessionId, msg.token);
        if (!found) {
          safeSend(clientWs, { type: "error", error: "unauthorized" });
          try {
            clientWs.close();
          } catch {
            /* ignore */
          }
          return;
        }
        authed = true;
        clearTimeout(authTimer);
        session = found;
        sessions.bindClient(session.id, clientWs);
        idle = createIdleGuard({
          ms: idleMs,
          onIdle: () => {
            safeSend(clientWs, {
              type: "error",
              error: "Voice hung up after a quiet stretch.",
            });
            hangup("idle");
          },
        });
        idle.bump();
        void connectXai();
        return;
      }

      if (msg.type === "hangup") {
        hangup("client");
        return;
      }

      if (closed || !session) return;

      if (msg.type === "context") {
        const fp = voiceContextFingerprint(msg.context);
        const socketOpen = xaiWs && xaiWs.readyState === WebSocket.OPEN && !opening;
        if (fp === session.voiceFp && socketOpen) return;
        sessions.updateContext(session.id, msg.context);
        session.voiceFp = fp;
        if (socketOpen) {
          safeSend(
            xaiWs,
            buildSessionUpdate(session.context, {
              voice: session.voice || defaultVoice,
              sampleRate: VOICE_SAMPLE_RATE,
            })
          );
        }
        return;
      }

      if (msg.type === "input_audio_buffer.append") {
        if (typeof msg.audio === "string" && msg.audio) {
          const decision = takeAudioBudget(audioBudget, msg.audio.length, Date.now());
          audioBudget = decision.state;
          if (decision.hangup) {
            sendClient({ type: "error", error: "Too much audio — voice hung up." });
            hangup("error");
            return;
          }
          if (!decision.allow) return;
          bumpIdle();
          safeSend(xaiWs, { type: "input_audio_buffer.append", audio: msg.audio });
        }
        return;
      }

      if (msg.type === "input_audio_buffer.clear" || msg.type === "response.cancel") {
        safeSend(xaiWs, { type: msg.type });
      }
    });

    clientWs.on("close", () => {
      if (!closed) hangup("client_close");
    });
    clientWs.on("error", (err) => {
      warn(String(err?.message || err).slice(0, 200));
    });
  });

  return wss;
}
