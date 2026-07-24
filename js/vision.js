/**
 * Future vision — AI image generation via /api/vision (Grok Imagine)
 * Generates a base scene, then either evolves in place (edit) or
 * opens a new scene of the same place (generate) when the story framing changes.
 */

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

export class VisionRenderer {
  /**
   * @param {HTMLElement} root — container with .vision-image, status, etc.
   */
  constructor(root) {
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
    this.currentUrl = "";
    /** Optional extra roots to keep in sync (e.g. invent + challenge panels) */
    this.mirrorRoots = [];
  }

  destroy() {
    clearTimeout(this.timer);
    this.pending = null;
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
    if (this.currentUrl && this.img) {
      this.img.hidden = false;
      this.img.src = this.currentUrl;
    }
  }

  /** Keep invent/challenge canvases showing the same latest frame */
  addMirror(root) {
    if (root && !this.mirrorRoots.includes(root)) this.mirrorRoots.push(root);
  }

  /** Reset session (new mission) so present-day regenerates cleanly */
  newSession() {
    this.sessionId = crypto.randomUUID?.() || `v-${Date.now()}`;
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
   * @param {string} state.inventionName
   * @param {string} [state.inventionHow]
   * @param {string} [state.inventionImpact]
   * @param {string} [state.inventionRisk]
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
    this.currentUrl = url;
    const apply = (img) => {
      if (!img) return;
      img.hidden = false;
      img.classList.add("is-fading");
      const show = () => img.classList.remove("is-fading");
      img.onload = show;
      img.src = url;
      if (img.complete) show();
    };
    apply(this.img);
    for (const r of this.mirrorRoots) apply(r.querySelector?.(".vision-image"));
  }

  async flush() {
    const state = this.pending;
    if (!state?.challenge) return;

    const techKey = (state.techs || []).map((t) => t.id).sort().join(",");
    const howKey = (state.inventionHow || "").replace(/\s+/g, " ").trim().slice(0, 400);
    const lifeKey = (state.inventionImpact || "").replace(/\s+/g, " ").trim().slice(0, 400);
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
      (state.inventionName || "").trim(),
      howKey,
      lifeKey,
      beatKey,
    ].join("|");
    if (!state.force && fingerprint === this.lastFingerprint && this.currentUrl) {
      return;
    }

    if (this.busy) {
      this.queue = state;
      return;
    }

    this.busy = true;
    const hasNarrative = Boolean(howKey || lifeKey);
    const underChallenge = Boolean(state.challengeBeat?.angle);
    this.setLoading(
      true,
      underChallenge
        ? state.challengeBeat?.response
          ? "Updating the scene with your response…"
          : "Imagining the challenge in this place…"
        : state.stageId === "present" && !this.currentUrl
          ? "Imagining the present…"
          : hasNarrative
            ? "Painting your pathway into the world…"
            : "Imagining how the future shifts…"
    );

    try {
      const payload = {
        sessionId: this.sessionId,
        force: Boolean(state.force),
        inventionName: state.inventionName || "",
        inventionHow: state.inventionHow || "",
        inventionImpact: state.inventionImpact || "",
        inventionRisk: state.inventionRisk || "",
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
      };

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Vision failed (${res.status})`);
      }

      const hadPriorImage = Boolean(this.currentUrl);
      this.lastFingerprint = fingerprint;
      if (data.imageUrl) this.applyImageUrl(data.imageUrl);

      let modeLabel = "Generated with Imagine";
      if (data.cached) {
        modeLabel = "Cached vision";
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
    } catch (e) {
      console.error("[vision]", e);
      this.setStatus(e.message || "Could not imagine this future");
    } finally {
      this.busy = false;
      this.setLoading(false);
      if (this.queue) {
        const next = this.queue;
        this.queue = null;
        this.pending = next;
        this.flush();
      }
    }
  }

  setLoading(on, message) {
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
