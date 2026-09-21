/**
 * In-memory Grok Voice sessions. One live call per clientSessionId.
 * Tokens never leave the game process except the one-time return to the browser.
 */

import crypto from "node:crypto";

export const DEFAULT_VOICE_MAX_SESSIONS = 8;
export const DEFAULT_VOICE_MAX_MS = 10 * 60 * 1000;
/** No mic frames and no model audio. A suspended tab stops sending PCM. */
export const DEFAULT_VOICE_IDLE_MS = 90 * 1000;
export const VOICE_WS_PATH = "/ws/co-invent-voice";

/**
 * Reset on activity. Fires onIdle once the quiet stretch elapses.
 * @param {{ ms: number, onIdle: () => void, schedule?: typeof setTimeout, cancel?: typeof clearTimeout }} opts
 */
export function createIdleGuard(opts) {
  const ms = opts.ms;
  const onIdle = opts.onIdle;
  const schedule = opts.schedule || setTimeout;
  const cancel = opts.cancel || clearTimeout;
  let timer = null;
  let generation = 0;

  return {
    bump() {
      const gen = ++generation;
      if (timer) cancel(timer);
      timer = schedule(() => {
        if (gen !== generation) return;
        timer = null;
        try {
          onIdle();
        } catch {
          /* host */
        }
      }, ms);
      if (timer && typeof timer.unref === "function") timer.unref();
    },
    stop() {
      generation += 1;
      if (timer) cancel(timer);
      timer = null;
    },
  };
}

function defaultId() {
  return crypto.randomBytes(16).toString("hex");
}

function defaultToken() {
  return crypto.randomBytes(24).toString("hex");
}

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.maxSessions]
 * @param {number} [opts.maxMs]
 * @param {() => number} [opts.now]
 * @param {() => string} [opts.randomId]
 * @param {() => string} [opts.randomToken]
 * @param {(session: object, reason: string) => void} [opts.onClose]
 */
export function createVoiceSessionStore(opts = {}) {
  const maxSessions =
    opts.maxSessions ?? envInt("FF_VOICE_MAX_SESSIONS", DEFAULT_VOICE_MAX_SESSIONS);
  const maxMs = opts.maxMs ?? envInt("FF_VOICE_MAX_MS", DEFAULT_VOICE_MAX_MS);
  const nowFn = typeof opts.now === "function" ? opts.now : () => Date.now();
  const randomId = typeof opts.randomId === "function" ? opts.randomId : defaultId;
  const randomToken =
    typeof opts.randomToken === "function" ? opts.randomToken : defaultToken;
  const onClose = typeof opts.onClose === "function" ? opts.onClose : null;

  /** @type {Map<string, object>} */
  const sessions = new Map();
  /** @type {Map<string, string>} clientSessionId → session id */
  const byClient = new Map();

  function close(id, reason = "closed") {
    const s = sessions.get(id);
    if (!s) return false;
    sessions.delete(id);
    if (s.clientSessionId && byClient.get(s.clientSessionId) === id) {
      byClient.delete(s.clientSessionId);
    }
    if (s.maxTimer) {
      clearTimeout(s.maxTimer);
      s.maxTimer = null;
    }
    s.closedAt = nowFn();
    s.closeReason = reason;
    try {
      onClose?.(s, reason);
    } catch {
      /* host */
    }
    try {
      s.clientWs?.close?.();
    } catch {
      /* ignore */
    }
    try {
      s.xaiWs?.close?.();
    } catch {
      /* ignore */
    }
    s.clientWs = null;
    s.xaiWs = null;
    return true;
  }

  function closeAll(reason = "shutdown") {
    for (const id of [...sessions.keys()]) close(id, reason);
  }

  /**
   * @param {{ context?: object, clientSessionId?: string|null, ip?: string, voice?: string }} input
   * @returns {{ ok: true, session: object } | { ok: false, status: number, error: string }}
   */
  function create(input = {}) {
    const clientSessionId = input.clientSessionId
      ? String(input.clientSessionId).trim().slice(0, 120)
      : "";
    if (clientSessionId && byClient.has(clientSessionId)) {
      close(byClient.get(clientSessionId), "replaced");
    }
    if (sessions.size >= maxSessions) {
      return { ok: false, status: 429, error: "voice_busy" };
    }
    const id = randomId();
    const token = randomToken();
    const startedAt = nowFn();
    const session = {
      id,
      token,
      context: input.context && typeof input.context === "object" ? input.context : {},
      clientSessionId: clientSessionId || null,
      ip: input.ip || null,
      voice: input.voice || "eve",
      startedAt,
      clientWs: null,
      xaiWs: null,
      maxTimer: null,
      closedAt: null,
      closeReason: null,
    };
    session.maxTimer = setTimeout(() => close(id, "max_duration"), maxMs);
    if (typeof session.maxTimer.unref === "function") session.maxTimer.unref();
    sessions.set(id, session);
    if (clientSessionId) byClient.set(clientSessionId, id);
    return { ok: true, session };
  }

  function get(id) {
    return sessions.get(String(id || "")) || null;
  }

  /**
   * @param {string} id
   * @param {string} token
   */
  function auth(id, token) {
    const s = get(id);
    if (!s) return null;
    const a = String(token || "");
    const b = String(s.token || "");
    if (!a || a.length !== b.length) return null;
    try {
      if (!crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))) return null;
    } catch {
      return null;
    }
    return s;
  }

  function updateContext(id, context) {
    const s = get(id);
    if (!s) return null;
    if (context && typeof context === "object") s.context = context;
    return s;
  }

  function bindClient(id, ws) {
    const s = get(id);
    if (!s) return null;
    if (s.clientWs && s.clientWs !== ws) {
      try {
        s.clientWs.close();
      } catch {
        /* ignore */
      }
    }
    s.clientWs = ws;
    return s;
  }

  function bindXai(id, ws) {
    const s = get(id);
    if (!s) return null;
    s.xaiWs = ws;
    return s;
  }

  function size() {
    return sessions.size;
  }

  return {
    create,
    get,
    auth,
    updateContext,
    bindClient,
    bindXai,
    close,
    closeAll,
    size,
    maxSessions,
    maxMs,
  };
}
