/**
 * Same-origin WebSocket proxy: browser ↔ Grok Voice realtime.
 * API key stays on the game process. Function calls are intercepted here.
 */

import { WebSocketServer, WebSocket } from "ws";
import { VOICE_MODEL, VOICE_SAMPLE_RATE, buildSessionUpdate } from "./voice-prompt.mjs";
import { handleVoiceTool } from "./voice-tools.mjs";
import { VOICE_WS_PATH } from "./voice-session.mjs";

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

  const wss = new WebSocketServer({ noServer: true, maxPayload });

  wss.on("connection", (clientWs) => {
    let session = null;
    let xaiWs = null;
    let authed = false;
    let recorded = false;
    let closed = false;
    let xaiRetried = false;
    let xaiGen = 0;
    /** @type {Promise<unknown>[]} */
    let toolBatch = [];
    let opening = false;

    const hangup = (reason = "hangup") => {
      if (closed) return;
      closed = true;
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
        if (!closed) hangup("xai_close");
      });
      socket.on("error", (err) => {
        if (gen !== xaiGen) return;
        warn(String(err?.message || err).slice(0, 200));
      });
    };

    const onXaiEvent = async (event) => {
      const type = String(event.type || "");
      if (type === "response.function_call_arguments.done") {
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
        safeSend(clientWs, {
          type: "error",
          error: event.error?.message || event.message || "voice_error",
        });
        return;
      }

      safeSend(clientWs, event);
    };

    const runTool = async (event) => {
      const result = handleVoiceTool(
        event.name,
        event.arguments,
        session?.context || {}
      );
      safeSend(xaiWs, {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: event.call_id,
          output: JSON.stringify(result.output),
        },
      });
      if (result.proposals || result.endTutoring) {
        safeSend(clientWs, {
          type: "proposals",
          proposals: result.proposals,
          message: result.message || "",
          endTutoring: Boolean(result.endTutoring),
        });
      }
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
        session = found;
        sessions.bindClient(session.id, clientWs);
        void connectXai();
        return;
      }

      if (msg.type === "hangup") {
        hangup("client");
        return;
      }

      if (msg.type === "context") {
        sessions.updateContext(session.id, msg.context);
        const update = buildSessionUpdate(session.context, {
          voice: session.voice || defaultVoice,
          sampleRate: VOICE_SAMPLE_RATE,
        });
        safeSend(xaiWs, update);
        return;
      }

      if (msg.type === "input_audio_buffer.append") {
        if (typeof msg.audio === "string" && msg.audio) {
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
