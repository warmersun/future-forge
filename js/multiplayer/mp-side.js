/**
 * Shared vision + AI co-inventor side panel for hotseat & online rooms.
 */

import { VISION_STAGES, techById } from "../data.js";
import { VisionRenderer, narrativesFromTechs } from "../vision.js";
import { CoInventor } from "../coinventor.js";
import { visionStageIdForDeployStage } from "../sim/deploy.js";

/**
 * @param {string} deployStage — none | pilot_ok | scaled | pilot | scale
 * @param {number} techCount
 */
export function mpVisionStageId(deployStage, techCount = 0) {
  const fromDeploy = visionStageIdForDeployStage(deployStage || "none");
  if (fromDeploy !== "present") return fromDeploy;
  if (techCount >= 3) return "prototype";
  if (techCount >= 1) return "prototype";
  return "present";
}

/**
 * @typedef {object} MpSideOpts
 * @property {"hotseat"|"room"} mode
 * @property {() => object|null} getPlace — { year, pressure, mission, lastNews }
 * @property {() => object|null} getForge — active local forge
 * @property {() => boolean} canAct — true if local seat may spend/edit
 * @property {(field: string, value: string) => void} applyField
 * @property {(proposals: object) => void} [applyProposals]
 * @property {(amount: number) => boolean|Promise<boolean>} [payAp] — hotseat AP gate
 * @property {(amount: number) => void} [refundAp]
 * @property {(body: object) => Promise<object>} [transport] — room AI proxy
 * @property {(msg: string) => void} [toast]
 */

export class MpSidePanel {
  /** @param {MpSideOpts} opts */
  constructor(opts) {
    this.opts = opts;
    this.vision = null;
    this.co = null;
    this.sideTab = "vision";
    this.wired = false;
    this.visionRoot = null;
    this.coRoot = null;
  }

  /**
   * @param {HTMLElement|null} visionRoot
   * @param {HTMLElement|null} coRoot
   * @param {ParentNode|null} tabBar
   */
  mount(visionRoot, coRoot, tabBar) {
    this.visionRoot = visionRoot;
    this.coRoot = coRoot;
    if (visionRoot) {
      if (!this.vision) this.vision = new VisionRenderer(visionRoot);
      else this.vision.attach(visionRoot);
    }
    if (coRoot) {
      this.co = new CoInventor({
        techById,
        subtitle:
          this.opts.mode === "room"
            ? "Room co-inventor — your turn only · 1 AP"
            : "Hotseat co-inventor — active seat · 1 AP",
        placeholder: "Brainstorm your invention for this place…",
        getContext: () => this.buildContext(),
        applyProposals: (p) => this.applyProposals(p),
        beforeRequest: async () => {
          if (!this.opts.canAct()) {
            this.opts.toast?.("Not your turn — pass the device / wait");
            return false;
          }
          if (this.opts.payAp) {
            const ok = await this.opts.payAp(1);
            if (!ok) {
              this.opts.toast?.("Not enough AP for co-inventor");
              return false;
            }
          }
          return true;
        },
        afterRequest: (mode, ok) => {
          if (!ok && this.opts.refundAp) this.opts.refundAp(1);
        },
        transport: this.opts.transport || null,
      });
      this.co.mount(coRoot);
    }
    if (tabBar && !this.wired) {
      this.wired = true;
      tabBar.querySelectorAll("[data-mp-tab]").forEach((btn) => {
        btn.addEventListener("click", () => this.setTab(btn.dataset.mpTab));
      });
    }
    this.setTab(this.sideTab);
  }

  setTab(tab) {
    this.sideTab = tab === "coinventor" ? "coinventor" : "vision";
    const root = this.visionRoot?.closest(".mp-side-panel") || this.coRoot?.closest(".mp-side-panel");
    if (!root) return;
    root.querySelectorAll("[data-mp-tab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.mpTab === this.sideTab);
    });
    const v = root.querySelector("#mp-side-vision, .mp-side-vision");
    const c = root.querySelector("#mp-side-coinventor, .mp-side-coinventor");
    if (v) v.hidden = this.sideTab !== "vision";
    if (c) c.hidden = this.sideTab !== "coinventor";
  }

  buildContext() {
    const place = this.opts.getPlace?.() || null;
    const forge = this.opts.getForge?.() || null;
    const mission = place?.mission;
    const stackIds = (forge?.stack || []).map((x) => x.techId);
    return {
      challenge: mission
        ? {
            id: mission.id,
            title: mission.title,
            problem: mission.scene || mission.problem || "",
            stakes: mission.stakes || "",
            prompt: mission.prompt || "",
            recommended: mission.suggested || [],
            successLens: mission.successLens || "",
          }
        : null,
      selectedTechIds: stackIds,
      inventionName: forge?.inventionName || "",
      inventionHow: forge?.inventionHow || "",
      inventionImpact: forge?.inventionImpact || "",
      storyFace: "how",
      writeBoth: true,
      year: place?.year,
      turn: place?.turn,
      place: mission?.place || "",
      pressure: place?.pressure || {},
      availableTechs: stackIds.map(techById).filter(Boolean),
    };
  }

  applyProposals(proposals) {
    if (!proposals) return;
    if (this.opts.applyProposals) {
      this.opts.applyProposals(proposals);
      return;
    }
    if (proposals.inventionName) this.opts.applyField("inventionName", proposals.inventionName);
    if (proposals.inventionHow) this.opts.applyField("inventionHow", proposals.inventionHow);
    if (proposals.inventionImpact) this.opts.applyField("inventionImpact", proposals.inventionImpact);
  }

  /**
   * Refresh vision from current forge/place. Call after render / stack changes.
   * @param {{ immediate?: boolean, force?: boolean }} [opts]
   */
  syncVision(opts = {}) {
    const place = this.opts.getPlace?.();
    const forge = this.opts.getForge?.();
    if (!place?.mission) return;
    // Lazy-mount vision if panel became visible after setup
    if (!this.vision && this.visionRoot) {
      this.vision = new VisionRenderer(this.visionRoot);
    }
    if (!this.vision) return;
    this.vision.attach(this.visionRoot);

    const techs = (forge?.stack || [])
      .map((x) => techById(x.techId))
      .filter(Boolean);
    const stageId = mpVisionStageId(forge?.deployStage || "none", techs.length);
    const stage = VISION_STAGES.find((s) => s.id === stageId) || VISION_STAGES[0];

    const panel = this.visionRoot?.closest(".mp-side-panel");
    const nameEl = panel?.querySelector(".mp-vision-stage-name");
    const blurbEl = panel?.querySelector(".mp-vision-stage-blurb");
    if (nameEl) nameEl.textContent = `${stage.name} · ${place.year}`;
    if (blurbEl) blurbEl.textContent = stage.blurb;

    const narr = panel?.querySelector(".mp-vision-narratives");
    if (narr) {
      const narratives = narrativesFromTechs(techs);
      const pressureLine = Object.entries(place.pressure || {})
        .map(([k, v]) => `${k} ${v}/5`)
        .join(" · ");
      narr.innerHTML =
        `<div class="narrative-card"><div class="src">${place.year}</div>Pressure: ${escapeHtml(
          pressureLine
        )}</div>` +
        (narratives.length
          ? narratives
              .map(
                (n) =>
                  `<div class="narrative-card"><div class="src">${escapeHtml(
                    n.name
                  )}</div>${escapeHtml(n.text)}</div>`
              )
              .join("")
          : `<div class="narrative-card"><div class="src">Place</div>${escapeHtml(
              String(place.mission.scene || "").slice(0, 180)
            )}</div>`);
    }

    // Always have a challenge object so VisionRenderer.flush proceeds
    const mission = place.mission;
    this.vision.setState({
      stageId,
      stage,
      challenge: {
        id: mission.id || "mp-mission",
        title: mission.title || "Mission",
        problem: mission.scene || mission.problem || mission.title || "Local crisis",
        scene: mission.scene || mission.problem || "",
        place: mission.place || "",
        visionTheme: mission.visionTheme || "rebuild-city",
      },
      techs,
      inventionName: forge?.inventionName || "",
      inventionHow: forge?.inventionHow || "",
      inventionImpact: forge?.inventionImpact || "",
      year: place.year,
      place: mission.place || "",
      pressure: place.pressure || {},
      challengeBeat: null,
      immediate: Boolean(opts.immediate),
      force: Boolean(opts.force) || techs.length > 0,
      debounceMs: opts.immediate ? 100 : 900,
    });
  }

  /** Call when mission starts / player seat changes */
  resetCoInventor() {
    if (!this.co) return;
    this.co.reset(true);
  }

  destroy() {
    this.vision?.destroy?.();
    this.vision = null;
    this.co = null;
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
