/**
 * Game → portal quota client. Fail closed when FF_CLOUD_AI=1.
 */

import {
  QUOTA_SPENT_MESSAGE,
  QUOTA_UNAVAILABLE_MESSAGE,
  SUBSCRIPTION_REQUIRED_MESSAGE,
} from "./ai-quota.mjs";

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function cloudAiEnabled(env = process.env) {
  const v = String(env.FF_CLOUD_AI || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/**
 * @param {string} route
 * @returns {"text"|"image"|"tts"|"voice"|null}
 */
export function quotaKindForRoute(route) {
  if (route === "co-invent") return "text";
  if (route === "tts") return "tts";
  if (route === "voice") return "voice";
  if (route === "vision" || route === "idea-image" || route === "market-image") return "image";
  return null;
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} env
 */
function portalOrigin(env) {
  return String(env.FF_PORTAL_URL || "")
    .trim()
    .replace(/\/$/, "");
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} env
 * @param {number} status
 * @param {string} error
 * @param {string} [message]
 */
function denied(env, status, error, message) {
  const origin = portalOrigin(env);
  return {
    ok: false,
    status,
    error,
    message: message || (status === 402 ? SUBSCRIPTION_REQUIRED_MESSAGE : QUOTA_SPENT_MESSAGE),
    subscribeUrl: origin ? `${origin}/subscribe` : null,
  };
}

/**
 * @param {string} header
 */
function bearer(header) {
  const raw = String(header || "").trim();
  if (!raw) return "";
  return /^bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
}

/**
 * @param {object} opts
 * @param {string} opts.path
 * @param {object} opts.body
 * @param {string} [opts.authorization]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {typeof fetch} [opts.fetchImpl]
 */
async function postPortal(opts) {
  const env = opts.env || process.env;
  if (!cloudAiEnabled(env)) return { ok: true, skipped: true, reservationId: null };
  const origin = portalOrigin(env);
  const secret = String(env.FF_API_SECRET || "").trim();
  if (!origin || !secret) {
    return denied(env, 503, "quota_unavailable", QUOTA_UNAVAILABLE_MESSAGE);
  }
  const fetchImpl = opts.fetchImpl || fetch;
  let res;
  try {
    /** @type {Record<string, string>} */
    const headers = {
      "Content-Type": "application/json",
      "X-FF-Secret": secret,
    };
    const auth = bearer(opts.authorization);
    if (auth) headers.Authorization = auth;
    res = await fetchImpl(`${origin}${opts.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(opts.body || {}),
    });
  } catch {
    return denied(env, 503, "quota_unavailable", QUOTA_UNAVAILABLE_MESSAGE);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    return denied(
      env,
      res.status || 503,
      data.error || "quota_unavailable",
      data.message || QUOTA_UNAVAILABLE_MESSAGE
    );
  }
  return {
    ok: true,
    skipped: false,
    reservationId: data.reservationId || null,
    settleToken: data.settleToken || null,
    userId: data.userId || null,
    holdMicro: Number(data.holdMicro) || 0,
    maxOutputTokens: Number(data.maxOutputTokens) || 0,
    minuteMicro: Number(data.minuteMicro) || 0,
    subscribeUrl: data.subscribeUrl || (origin ? `${origin}/subscribe` : null),
  };
}

/**
 * Rough input size for a text hold. Overestimates JSON, which only raises the hold.
 * @param {object|null|undefined} body
 */
export function estimateInputTokens(body) {
  let chars = 0;
  try {
    chars = JSON.stringify(body ?? "").length;
  } catch {
    chars = 0;
  }
  return Math.ceil(Math.max(0, chars) / 4);
}

/**
 * Reserve against the signed-in player. Missing JWT is subscription_required.
 * @param {object} opts
 */
export async function reserveCloudQuota(opts) {
  const env = opts.env || process.env;
  if (!cloudAiEnabled(env)) return { ok: true, skipped: true, reservationId: null };
  if (!bearer(opts.authorization)) {
    return denied(env, 402, "subscription_required", SUBSCRIPTION_REQUIRED_MESSAGE);
  }
  return postPortal({
    path: "/api/me/ai/reserve",
    body: {
      kind: opts.kind,
      chars: Number(opts.chars) || 0,
      inputTokens: Math.max(0, Math.floor(Number(opts.inputTokens) || 0)),
    },
    authorization: opts.authorization,
    env,
    fetchImpl: opts.fetchImpl,
  });
}

/**
 * Friends room seat, already verified.
 * @param {object} opts
 */
export async function reserveCloudQuotaForUser(opts) {
  const env = opts.env || process.env;
  if (!cloudAiEnabled(env)) return { ok: true, skipped: true, reservationId: null };
  const userId = String(opts.userId || "").trim();
  if (!userId) {
    return denied(env, 402, "subscription_required", SUBSCRIPTION_REQUIRED_MESSAGE);
  }
  const grant = String(opts.quotaGrant || "").trim();
  if (!grant) {
    return denied(env, 503, "quota_unavailable", QUOTA_UNAVAILABLE_MESSAGE);
  }
  return postPortal({
    path: "/api/internal/ai/reserve",
    body: {
      userId,
      kind: opts.kind,
      chars: Number(opts.chars) || 0,
      inputTokens: Math.max(0, Math.floor(Number(opts.inputTokens) || 0)),
      quotaGrant: grant,
    },
    env,
    fetchImpl: opts.fetchImpl,
  });
}

/**
 * @param {object} opts
 */
export async function settleCloudQuota(opts) {
  const env = opts.env || process.env;
  if (!opts?.reservationId || !cloudAiEnabled(env)) return { ok: true, skipped: true };
  const result = await postPortal({
    path: "/api/me/ai/settle",
    body: {
      reservationId: opts.reservationId,
      userId: opts.userId || null,
      settleToken: opts.settleToken || null,
      release: Boolean(opts.release),
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      chars: opts.chars,
      durationMs: opts.durationMs,
      bill: Boolean(opts.bill),
    },
    env,
    fetchImpl: opts.fetchImpl,
  });
  return result;
}

const SETTLE_ATTEMPTS = 3;

function settleDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a settle. A failed settle after a successful provider call must not release the hold.
 * @param {object} opts
 */
export async function settleCloudQuotaReliable(opts) {
  let last = { ok: false, error: "quota_unavailable" };
  for (let i = 0; i < SETTLE_ATTEMPTS; i++) {
    last = await settleCloudQuota(opts);
    if (last?.ok) return last;
    if (i < SETTLE_ATTEMPTS - 1) await settleDelay(40 * (i + 1));
  }
  console.error("[quota] settle failed", opts?.reservationId || "");
  return last;
}

/**
 * Verify a Clerk JWT via portal GET /api/me. Null when unsigned or unreachable.
 * Returns `{ userId, quotaGrant }` when signed in.
 * @param {object} opts
 */
export async function verifyPortalUser(opts) {
  const env = opts.env || process.env;
  const origin = portalOrigin(env);
  const auth = bearer(opts.authorization);
  if (!origin || !auth) return null;
  const fetchImpl = opts.fetchImpl || fetch;
  try {
    const res = await fetchImpl(`${origin}/api/me`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const id = String(data.userId || "").trim();
    if (!data.signedIn || !id) return null;
    return { userId: id, quotaGrant: String(data.quotaGrant || "").trim() };
  } catch {
    return null;
  }
}

/**
 * Call the provider only after a successful reserve.
 * A throw before success releases the hold. A failed settle after success leaves the hold.
 * @param {object} opts
 * @param {() => Promise<object>} opts.reserve
 * @param {(reserved: object) => Promise<any>} opts.call
 * @param {(reservationId: string|null, measure: object) => Promise<any>} opts.settle
 * @param {(result: any) => object} [opts.measure]
 */
export async function withCloudQuota(opts) {
  const reserved = await opts.reserve();
  if (!reserved.ok) return reserved;
  const settleMeasure = (measure) => {
    if (!reserved.reservationId) return Promise.resolve({ ok: true, skipped: true });
    return opts.settle(reserved.reservationId, {
      ...measure,
      userId: reserved.userId,
      settleToken: reserved.settleToken,
    });
  };
  try {
    const result = await opts.call(reserved);
    const measure = opts.measure ? opts.measure(result) : { release: true };
    if (reserved.reservationId) {
      const settled = await settleMeasure(measure);
      if (!settled?.ok) {
        console.error("[quota] settle failed after call", reserved.reservationId);
      }
    }
    return { ok: true, result, reservationId: reserved.reservationId, maxOutputTokens: reserved.maxOutputTokens || 0 };
  } catch (e) {
    if (reserved.reservationId) {
      try {
        await settleMeasure({ release: true });
      } catch {
        /* still surface the original error */
      }
    }
    throw e;
  }
}
