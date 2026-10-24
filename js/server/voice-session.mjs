/**
 * In-memory Grok Voice sessions. One live call per clientSessionId.
 * Tokens never leave the game process except the one-time return to the browser.
 */

import crypto from "node:crypto";
import { applyAuthoritativeContext } from "./quest-world-context.mjs";
import { parsePackageRef } from "./package-paths.mjs";

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
  const resolvePackage = typeof opts.resolvePackage === "function" ? opts.resolvePackage : null;
  const onClose = typeof opts.onClose === "function" ? opts.onClose : null;

  const trusted = Symbol("authorized context");

  function bindContext(context, authority) {
    if (authority === trusted) return { ok: true, context: structuredClone(context) };
    const body = { context: context && typeof context === "object" ? context : {} };
    const guarded = applyAuthoritativeContext(body, resolvePackage || undefined);
    if (!guarded.ok) {
      return { ok: false, status: guarded.status || 409, error: guarded.code };
    }
    return { ok: true, context: structuredClone(guarded.body.context) };
  }

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
      const pending = onClose?.(s, reason);
      s.closedSettle = pending && typeof pending.then === "function" ? pending : Promise.resolve();
    } catch (e) {
      const rejected = Promise.reject(e);
      rejected.catch(() => {});
      s.closedSettle = rejected;
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

  async function closeAll(reason = "shutdown") {
    const pending = [];
    for (const id of [...sessions.keys()]) {
      const s = sessions.get(id);
      close(id, reason);
      if (s?.closedSettle) pending.push(Promise.resolve(s.closedSettle).catch(() => {}));
    }
    await Promise.all(pending);
  }

  /**
   * @param {{ context?: object, clientSessionId?: string|null, ip?: string, voice?: string }} input
   * @returns {{ ok: true, session: object } | { ok: false, status: number, error: string }}
   */
  function create(input = {}, authority) {
    const clientSessionId = input.clientSessionId
      ? String(input.clientSessionId).trim().slice(0, 120)
      : "";
    const bound = bindContext(input.context, authority);
    if (!bound.ok) return bound;
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
      context: bound.context,
      authorizeContext: input.authorizeContext || null,
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

  function updateContext(id, context, authority, preview = false) {
    const s = get(id);
    if (!s) return null;
    const fixedRef = s.context?.packageRef || null;
    for (const id of [context?.questId, context?.mission?.id, context?.challenge?.id]) {
      if (id != null && s.context?.questId != null && id !== s.context.questId)
        return { ok: false, status: 403, error: "package_reference_forbidden" };
    }
    for (const key of ["runId", "cloudRunId", "questId"]) {
      const fixed = key === "cloudRunId" ? s.context?.runId || s.context?.cloudRunId : s.context?.[key];
      if (context?.[key] != null && context[key] !== fixed)
        return { ok: false, status: 403, error: "package_reference_forbidden" };
    }
    if (context?.packageRef != null) {
      const incoming = parsePackageRef(context.packageRef);
      if (!fixedRef || !incoming || incoming.packageId !== fixedRef.packageId ||
          incoming.revision !== fixedRef.revision || incoming.questId !== fixedRef.questId) {
        return { ok: false, status: 403, error: "package_reference_forbidden" };
      }
    }
    const bound = bindContext({
      ...(context && typeof context === "object" ? context : {}),
      ...(fixedRef ? { packageRef: fixedRef } : {}),
      ...(s.context?.runId ? { runId: s.context.runId } : {}),
      ...(s.context?.questId ? { questId: s.context.questId } : {}),
    }, authority);
    if (!bound.ok) return bound;
    if (preview) return bound;
    s.context = bound.context;
    return s;
  }

  async function createAuthorized(input = {}) {
    if (typeof input.authorizeContext !== "function") return create(input);
    const result = await input.authorizeContext({ context: input.context || {} });
    if (!result?.ok) return { ok: false, status: result?.status || 503, error: result?.code || result?.error || "voice_context_unavailable" };
    return create({ ...input, context: result.body.context }, trusted);
  }

  // Socket packets, upstream tools and reconnects all share this queue. A
  // per-socket queue alone permits a late tool check to restore an older year.
  const authorityQueues = new WeakMap();
  function queueAuthority(id, context, revalidate = false) {
    const s = get(id);
    if (!s) return Promise.resolve(null);
    const input = revalidate ? null : structuredClone(context);
    const pending = (authorityQueues.get(s) || Promise.resolve()).then(() => {
      if (get(id) !== s) return null;
      return bindAuthorizedContext(id, revalidate ? s.context : input);
    });
    authorityQueues.set(s, pending.catch(() => {}));
    return pending;
  }
  function updateAuthorizedContext(id, context) {
    return queueAuthority(id, context);
  }
  function revalidateAuthorizedContext(id) {
    return queueAuthority(id, null, true);
  }

  async function bindAuthorizedContext(id, context) {
    const s = get(id);
    if (!s) return null;
    // Validate the immutable identity BEFORE adding stored bindings. Never silently repair swaps.
    const checked = updateContext(id, context, trusted, true);
    if (!checked || checked.ok === false) return checked;
    if (typeof s.authorizeContext !== "function") return updateContext(id, context);
    let result;
    try { result = await s.authorizeContext({ context: checked.context }); }
    catch { result = { ok: false, code: "voice_context_unavailable", status: 503 }; }
    if (!result?.ok) {
      close(id, "authority_denied");
      return { ok: false, status: result?.status || 503, error: result?.code || result?.error || "voice_context_unavailable" };
    }
    if (get(id) !== s) return null;
    return updateContext(id, result.body.context, trusted);
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
    createAuthorized,
    updateAuthorizedContext,
    revalidateAuthorizedContext,
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
