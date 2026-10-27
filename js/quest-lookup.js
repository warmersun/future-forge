/** Exact-ID lookup through the game's authenticated quest API (proxied to the portal). */
import { sanitizeQuestToken } from "./deep-link.js";

/**
 * Do not slugify titles or fall back to the browser's catalog: an ID names one
 * server-side quest. A denied request may return a preview card, never a body.
 * @param {unknown} raw
 * @param {{ fetchImpl: typeof fetch }} opts
 */
export async function lookupQuestById(raw, { fetchImpl }) {
  const id = sanitizeQuestToken(raw);
  if (!id || id === "." || id === "..") return { status: "invalid" };
  try {
    const res = await fetchImpl(`/api/quests/${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => null);
    if (res.status === 404) return { status: "not_found", id };
    const denied = res.status === 401 || res.status === 402;
    if ((!res.ok || !data?.ok) && !denied) return { status: "unavailable", id };
    if (!data?.tile || data.tile.id !== id) return { status: "unavailable", id };
    if (!denied && !data.tile.mission && data.tile.kind !== "module") {
      return { status: "unavailable", id };
    }
    return {
      status: denied
        ? (res.status === 401
          ? "sign_in_required"
          : data?.error === "subscription_required"
            ? "subscription_required"
            : "content_required")
        : "loaded",
      id,
      tile: denied ? { ...data.tile, gated: true } : data.tile,
      subscribeUrl: res.status === 402 ? String(data.subscribeUrl || "") : "",
    };
  } catch {
    return { status: "unavailable", id };
  }
}
