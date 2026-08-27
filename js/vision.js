/**
 * Future vision — AI image generation via /api/vision (Grok Imagine)
 * Generates a base scene, then either evolves in place (edit) or
 * opens a new scene of the same place (generate) when the story framing changes.
 */

import { getClientSessionId } from "./client-session.js";
import { apiFetch } from "./auth.js";

/** Collect vision feature tags from selected tech objects */
export function featuresFromTechs(techs) {
  const features = new Set();
  for (const tech of techs) {
    if (!tech.vision) continue;
    for (const [key, val] of Object.entries(tech.vision)) {
      if (key === "narrative") continue;
      if (typeof val === "string") features.add(val);
    }
  }
  return [...features];
}

export function narrativesFromTechs(techs) {
  return techs
    .filter((t) => t.vision?.narrative)
    .map((t) => ({ id: t.id, name: t.name, text: t.vision.narrative }));
}

/** data:image… → blob: URL so Chrome doesn't re-decode multi‑MB base64 on every img.src set */
function dataUrlToBlobUrl(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || "image/png";
  const isB64 = Boolean(m[2]);
  const data = m[3] || "";
  let bytes;
  if (isB64) {
    const bin = atob(data);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    const str = decodeURIComponent(data);
    bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

export class VisionRenderer {
  /**
   * @param {HTMLElement} root — container with .vision-image, status, etc.
   * @param {{ onTrace?: (info: object) => void }} [opts]
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.img = root?.querySelector?.(".vision-image") || null;
    this.status = root?.querySelector?.(".vision-status") || null;
    this.overlay = root?.querySelector?.(".vision-loading") || null;
    this.sessionId = crypto.randomUUID?.() || `v-${Date.now()}`;
    this.lastFingerprint = "";
    this.pending = null;
    this.timer = null;
    this.busy = false;
    this.queue = null;
    /** Display URL (prefer blob: — never re-assign huge data: URLs) */
    this.currentUrl = "";
    /** Raw response key so we don't re-process the same frame */
    this._rawKey = "";
    this._blobUrl = "";
    /** Optional extra roots to keep in sync (e.g. invent + challenge panels) */
    this.mirrorRoots = [];
    /** Developer inspect: sent/received Imagine payload */
    this.onTrace = opts.onTrace || null;
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this._queueFlush);
    if (this._followRetry) {
      clearTimeout(this._followRetry);
      this._followRetry = null;
    }
    if (this._blobUrl) {
      try {
        URL.revokeObjectURL(this._blobUrl);
      } catch {
        /* ignore */
      }
      this._blobUrl = "";
    }
    this.pending = null;
    this.currentUrl = "";
    this._rawKey = "";
  }

  /**
   * Point this renderer at another panel (challenge vs invent) without new session.
   * @param {HTMLElement|null} root
   */
  attach(root) {
    if (!root) return;
    this.root = root;
    this.img = root.querySelector(".vision-image");
    this.status = root.querySelector(".vision-status");
    this.overlay = root.querySelector(".vision-loading");
    // Only set src if different — re-assigning data: URLs freezes Chrome
    if (this.currentUrl && this.img && this.img.getAttribute("src") !== this.currentUrl) {
      this.img.hidden = false;
      this.img.src = this.currentUrl;
    }
  }

  /** Keep invent/challenge canvases showing the same latest frame */
  addMirror(root) {
    if (root && !this.mirrorRoots.includes(root)) this.mirrorRoots.push(root);
    if (root && this.currentUrl) {
      const img = root.querySelector?.(".vision-image");
      if (img && img.getAttribute("src") !== this.currentUrl) {
        img.hidden = false;
        img.src = this.currentUrl;
      }
    }
  }

  /**
   * Use a shared session id (e.g. multiplayer room+seat) so all clients
   * hit the same server-side vision cache and see the same image.
   * @param {string} id
   * @param {{ clear?: boolean }} [opts]
   */
  setSessionId(id, opts = {}) {
    const next = String(id || "").slice(0, 120);
    if (!next || next === this.sessionId) return false;
    this.sessionId = next;
    this.lastFingerprint = "";
    // Default: clear previous seat's frame so we never show invent A while loading B
    if (opts.clear !== false) {
      this.currentUrl = "";
      const clearImg = (img) => {
        if (!img) return;
        img.removeAttribute("src");
        img.hidden = true;
      };
      clearImg(this.img);
      for (const r of this.mirrorRoots) clearImg(r.querySelector?.(".vision-image"));
    }
    return true;
  }

  /** Reset session (new mission) so present-day regenerates cleanly */
  newSession(sessionId) {
    this.sessionId =
      (sessionId && String(sessionId).slice(0, 120)) ||
      crypto.randomUUID?.() ||
      `v-${Date.now()}`;
    this.lastFingerprint = "";
    this.currentUrl = "";
    const clearImg = (img) => {
      if (!img) return;
      img.removeAttribute("src");
      img.hidden = true;
    };
    clearImg(this.img);
    for (const r of this.mirrorRoots) clearImg(r.querySelector?.(".vision-image"));
    this.setStatus("A new horizon waits to be imagined…");
  }

  resize() {
    /* no-op — image is CSS-sized */
  }

  challengeBeatKey(beat) {
    if (!beat) return "";
    return [
      beat.angle || "",
      beat.phase || "",
      (beat.question || "").slice(0, 80),
      (beat.response || "").slice(0, 120),
      beat.quality || "",
      beat.move || "",
    ].join("|");
  }

  /**
   * @param {object} state
   * @param {string} state.stageId
   * @param {object} state.stage
   * @param {object} state.challenge
   * @param {object[]} state.techs
   * @param {{ howText?: string, techs?: object[] }[]} [state.pathways]
   * @param {object} [state.challengeBeat]
   * @param {boolean} [state.immediate]
   * @param {boolean} [state.force]
   * @param {number} [state.debounceMs]
   */
  setState(state) {
    this.pending = state;
    clearTimeout(this.timer);
    const delay = state.immediate
      ? 80
      : typeof state.debounceMs === "number"
        ? state.debounceMs
        : 1400;
    this.timer = setTimeout(() => this.flush(), delay);
  }

  applyImageUrl(url) {
    if (!url) return;
    // Same payload already processed
    if (url === this._rawKey || url === this.currentUrl) return;
    this._rawKey = url;

    // Convert data: URLs → blob: once. Setting img.src to multi‑MB base64 data URLs
    // repeatedly is what froze multiplayer tabs (main-thread base64 decode).
    let display = url;
    if (url.startsWith("data:")) {
      try {
        const blobUrl = dataUrlToBlobUrl(url);
        if (blobUrl) {
          if (this._blobUrl) {
            try {
              URL.revokeObjectURL(this._blobUrl);
            } catch {
              /* ignore */
            }
          }
          this._blobUrl = blobUrl;
          display = blobUrl;
        }
      } catch (e) {
        console.warn("[vision] blob convert failed", e);
      }
    }
    this.currentUrl = display;

    const apply = (img) => {
      if (!img) return;
      if (img.getAttribute("src") === display) {
        img.hidden = false;
        return;
      }
      img.hidden = false;
      img.classList.add("is-fading");
      const show = () => img.classList.remove("is-fading");
      img.onload = show;
      img.src = display;
      if (img.complete) show();
    };
    apply(this.img);
    for (const r of this.mirrorRoots) apply(r.querySelector?.(".vision-image"));
    // Keep outcome panel in sync when the run already ended (share card needs this frame)
    try {
      if (typeof document !== "undefined") {
        const outcomeScreen = document.getElementById("screen-outcome");
        if (outcomeScreen?.classList?.contains("active")) {
          apply(document.getElementById("outcome-vision-image"));
          const st = document.getElementById("outcome-vision-status");
          if (st && !st.textContent) st.textContent = "Invention vision";
        }
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Best URL for share cards / outcome (blob: or data:). Empty if none.
   * @returns {string}
   */
  getShareableUrl() {
    if (this.currentUrl) return this.currentUrl;
    if (this._rawKey && String(this._rawKey).startsWith("data:image")) return this._rawKey;
    const attr = this.img?.getAttribute?.("src");
    if (attr && (attr.startsWith("blob:") || attr.startsWith("data:image") || /^https?:\/\//i.test(attr))) {
      return this.img.currentSrc || this.img.src || attr;
    }
    return "";
  }

  /**
   * Already-decoded <img> for canvas drawImage (preferred for share cards).
   * @returns {HTMLImageElement|null}
   */
  getDecodedImage() {
    if (this.img && this.img.naturalWidth > 0 && this.img.getAttribute("src")) {
      return this.img;
    }
    for (const r of this.mirrorRoots) {
      const img = r?.querySelector?.(".vision-image");
      if (img && img.naturalWidth > 0 && img.getAttribute("src")) return img;
    }
    return null;
  }

  async flush() {
    const state = this.pending;
    if (!state?.challenge) return;

    // Multiplayer shared cache key (room+seat) — no WS thrash, same server session
    if (state.sessionId) this.setSessionId(state.sessionId, { clear: false });

    const techKey = (state.techs || []).map((t) => t.id).sort().join(",");
    const pathKey = Array.isArray(state.pathways)
      ? state.pathways
          .map((p) => {
            const ids = (p?.techs || [])
              .map((t) => t.id || t.name)
              .filter(Boolean)
              .sort()
              .join(",");
            const how = String(p?.howText || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 400);
            const touch = (p?.touching || [])
              .map((g) => g.id || g.role || g.angle || "")
              .filter(Boolean)
              .sort()
              .join(",");
            return `${ids}:${p?.status || "idea"}:${touch}:${how}`;
          })
          .join("||")
      : String(state.inventionHow || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 400);
    const pressureKey = state.pressure
      ? Object.entries(state.pressure)
          .map(([k, v]) => `${k}:${v}`)
          .join(",")
      : "";
    const beatKey = this.challengeBeatKey(state.challengeBeat);
    const fingerprint = [
      state.challenge.id,
      state.stageId,
      state.year || "",
      state.place || "",
      pressureKey,
      techKey,
      pathKey,
      beatKey,
    ].join("|");
    const followOnly = Boolean(state.followOnly);
    const localKey = followOnly
      ? `${fingerprint}|rev:${state.visionRev ?? ""}`
      : fingerprint;
    if (!state.force && localKey === this.lastFingerprint && this.currentUrl) {
      return;
    }

    if (this.busy) {
      this.queue = state;
      return;
    }

    this.busy = true;
    const hasNarrative = Boolean(pathKey);
    const underChallenge = Boolean(state.challengeBeat?.angle);
    // Followers: silent re-peek when a frame is already on screen (no loading flicker)
    const silentFollow = followOnly && Boolean(this.currentUrl);
    if (!silentFollow) {
      this.setLoading(
        true,
        followOnly
          ? "Loading shared vision…"
          : underChallenge
            ? state.challengeBeat?.response
              ? "Updating the scene with your response…"
              : "Imagining the challenge in this place…"
            : state.stageId === "present" && !this.currentUrl
              ? "Imagining the present…"
              : hasNarrative
                ? "Painting your pathway into the world…"
                : "Imagining how the future shifts…"
      );
    }

    const t0 = Date.now();
    let data = null;
    let payload = null;
    const emitTrace = (extra = {}) => {
      if (!this.onTrace) return;
      try {
        this.onTrace({
          kind: "image",
          mode: "vision",
          sent: payload,
          received: data,
          ms: Date.now() - t0,
          ...extra,
        });
      } catch {
        /* inspect must not break vision */
      }
    };

    try {
      payload = {
        sessionId: this.sessionId,
        clientSessionId: getClientSessionId(),
        force: Boolean(state.force) && !followOnly,
        followOnly,
        year: state.year || null,
        place: state.place || "",
        pressure: state.pressure || null,
        challengeBeat: state.challengeBeat || null,
        challenge: {
          id: state.challenge.id,
          title: state.challenge.title,
          // scenario + place are immutable locale lock for Imagine prompts
          problem: state.challenge.problem || state.challenge.scene || "",
          scene: state.challenge.scene || state.challenge.problem || "",
          place: state.challenge.place || state.place || "",
          visionTheme: state.challenge.visionTheme,
        },
        stage: {
          id: state.stageId,
          name: state.stage?.name || state.stageId,
        },
        techs: (state.techs || []).map((t) => ({
          id: t.id,
          name: t.name,
          summary: t.summary,
          narrative: t.vision?.narrative || "",
        })),
        pathways: Array.isArray(state.pathways)
          ? state.pathways.map((p) => ({
              howText: String(p?.howText || ""),
              status: p?.status === "applied" ? "applied" : "idea",
              touching: (p?.touching || []).map((g) => ({
                id: g.id || "",
                kind: g.kind,
                name: g.name || "",
                role: g.role || null,
                angle: g.angle || null,
              })),
              techs: (p?.techs || []).map((t) => ({
                id: t.id,
                name: t.name,
                summary: t.summary || "",
                narrative: t.narrative || t.vision?.narrative || "",
              })),
            }))
          : [],
        givens: Array.isArray(state.givens)
          ? state.givens.map((g) => ({
              id: g.id || "",
              kind: g.kind,
              name: g.name || "",
              role: g.role || null,
              angle: g.angle || null,
              applied: Boolean(g.applied),
            }))
          : [],
      };

      const res = await apiFetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Vision failed (${res.status})`);
      }

      const hadPriorImage = Boolean(this.currentUrl);
      // For followers, fingerprint includes visionRev so re-peek isn't skipped
      const storeKey = followOnly
        ? `${fingerprint}|rev:${state.visionRev ?? ""}`
        : fingerprint;
      this.lastFingerprint = storeKey;
      const source = followOnly ? "follow" : data.cached ? "cache" : "live";
      if (data.imageUrl) {
        const prevRaw = this._rawKey;
        this.applyImageUrl(data.imageUrl);
        this._followWaitTries = 0;
        this._tracedFollowWait = false;
        const sameFrame = data.imageUrl === prevRaw;
        if (!(silentFollow && sameFrame)) {
          emitTrace({ ok: true, source });
        }
        // Notify host after a *new* frame (not pure cache re-apply of same raw URL)
        if (
          !followOnly &&
          !data.cached &&
          data.imageUrl !== prevRaw &&
          typeof state.onGenerated === "function"
        ) {
          try {
            state.onGenerated({
              sessionId: this.sessionId,
              fingerprint,
            });
          } catch {
            /* ignore */
          }
        }
      } else if (followOnly && data.waiting) {
        // Only announce wait if we have nothing to show yet
        if (!this.currentUrl) this.setStatus("Waiting for shared vision…");
        if (!silentFollow && !this._tracedFollowWait) {
          this._tracedFollowWait = true;
          emitTrace({ ok: true, source: "follow" });
        }
        const tries = (this._followWaitTries || 0) + 1;
        this._followWaitTries = tries;
        // Peek until owner finishes (or give up after ~30s)
        if (tries <= 12 && !this._followRetry) {
          this._followRetry = setTimeout(() => {
            this._followRetry = null;
            // Allow re-flush with same fingerprint while waiting
            this.lastFingerprint = "";
            if (this.pending?.followOnly) this.flush();
          }, 2500);
        }
        return;
      } else {
        emitTrace({ ok: true, source });
      }

      // Silent follow re-peeks: don't thrash status if the frame is unchanged
      if (!(silentFollow && data.imageUrl && data.imageUrl === this._rawKey)) {
        let modeLabel = "Generated with Imagine";
        if (data.cached || followOnly) {
          modeLabel = followOnly ? "Shared vision" : "Cached vision";
        } else if (data.mode === "edit" || data.continuity === "same-frame") {
          modeLabel = underChallenge ? "Challenge evolved in place" : "Evolved in place";
        } else if (
          data.continuity === "new-shot" ||
          data.continuity === "new-scene" ||
          (data.mode === "generate" && hadPriorImage)
        ) {
          modeLabel = underChallenge ? "Challenge scene · same place" : "New scene · same place";
        }
        const placeBit = data.place ? ` · ${data.place}` : "";
        const stageBit = underChallenge
          ? state.challengeBeat?.label || "Challenge"
          : state.stage?.name || state.stageId;
        this.setStatus(`${modeLabel}${placeBit} · ${stageBit}`);
      }
    } catch (e) {
      console.error("[vision]", e);
      // Don't clobber a good shared frame with error text on silent peeks
      if (!silentFollow) {
        this.setStatus(e.message || "Could not imagine this future");
        emitTrace({
          ok: false,
          source: "error",
          error: String(e?.message || e),
        });
      }
    } finally {
      this.busy = false;
      this.setLoading(false);
      if (this.queue) {
        const next = this.queue;
        this.queue = null;
        this.pending = next;
        clearTimeout(this._queueFlush);
        this._queueFlush = setTimeout(() => this.flush(), 400);
      }
    }
  }

  setLoading(on, message) {
    const hasImage = Boolean(
      this.currentUrl ||
        (this.img && !this.img.hidden && this.img.getAttribute("src"))
    );
    const applyRoot = (root) => {
      if (!root) return;
      root.classList.toggle("is-imagining", Boolean(on));
      // Stronger empty-state chip only when there is nothing to look at yet
      root.classList.toggle("is-imagining-empty", Boolean(on) && !hasImage);
      const overlay = root.querySelector?.(".vision-loading");
      if (overlay) {
        overlay.hidden = !on;
        const text = overlay.querySelector(".vision-loading-text");
        if (text && message) text.textContent = message;
      }
    };
    applyRoot(this.root);
    for (const r of this.mirrorRoots) applyRoot(r);
    // Keep this.overlay in sync (primary root)
    if (this.overlay) {
      this.overlay.hidden = !on;
      const text = this.overlay.querySelector(".vision-loading-text");
      if (text && message) text.textContent = message;
    }
    if (on && message) this.setStatus(message);
  }

  setStatus(msg) {
    if (this.status) this.status.textContent = msg;
  }
}
