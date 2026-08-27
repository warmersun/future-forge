/**
 * Hex invent workshop orchestration — board seed, tray, mint, lights.
 * Called from game.js; keeps hex logic out of the monolith where possible.
 */

import { techById, CHALLENGE_ANGLES } from "../data.js";
import {
  ideaCacheKey,
  ideaImageId,
  ideasOrFallback,
  localIdeaSparks,
  rotateLocalIdeaSparks,
} from "../idea-cards.js";
import { localPose } from "../challenge-pose.js";
import {
  seedCrisisTiles,
  mintInventionTile,
  mintRdTile,
  addTile,
  removeUnplacedTiles,
  unplacedRdTiles,
  inventionNeighbors,
  pruneStaleConvergences,
  putConvergence,
  formatFactor,
  CONVERGENCE_FACTOR,
  convergencePairKey,
  summonOneConcern,
  remainingConcernAngles,
  concernAnglesOnBoard,
  ensureConcernRoster,
  boardHolds,
  techIdsFromBoard,
  unplacedInventionsForTech,
  cloneBoard,
  TILE_KIND,
  CRISIS_ROLE_DEFAULT_NAMES,
  CRISIS_ROLE_BLURBS,
  CONCERN_LABELS,
  concernPoseText,
  concernReplyText,
  setConcernReply,
} from "./board-state.js";
import {
  applyHeuristicLights,
  heuristicLamp,
} from "./lights.js";
import {
  tileTimingCacheKey,
  timingLevelToPct,
  assessGivenPrior,
  applyPathwayPressure,
  heuristicPathwayScore,
  normalizePathwayScore,
  emptyCrisisDelta,
  clampPressure,
  bandToLamp,
  diffPathwayScoreJobs,
  clusterFromGiven,
  invalidatePathwaysTouchingGiven,
  tileTimingPct,
  tileBaseTimingPct,
  clampTimingPct,
  heuristicConverges,
  concernsReachedFromPathway,
  pathwayConcernScoreKey,
  pickConcernSpawn,
  clampConcernLamp,
  concernInventChanged,
  listInventionPathways,
  islandHowKey,
  resolveIslandHow,
  islandHowForAi,
  setIslandHow,
  rekeyIslandHow,
} from "./evaluate.js";
import { crisisMeterLevel } from "../sim/collapse.js";
import { applyPressureRise } from "../sim/pressure.js";
import { createHexBoardUi } from "./board-ui.js";
import { polarityForTech } from "./polarity.js";
import { detectClaimStretch } from "../data.js";
import {
  applyForesightToClaimStretch,
  foresightCapabilityContext,
} from "../sim/world-foresight.js";
import { attachReadAloud, stopReadAloud } from "../read-aloud.js";

/**
 * @param {object} api — callbacks into game.js
 */
export function createHexWorkshop(api) {
  /** @type {ReturnType<typeof createHexBoardUi>|null} */
  let ui = null;
  let focusedTechId = null;
  /** @type {Map<string, { abort: AbortController, timer: ReturnType<typeof setTimeout>|null }>} */
  const pathwayJobs = new Map();
  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const timingTimers = new Map();
  /** @type {Map<string, number>} */
  const timingGens = new Map();
  /** @type {Map<string, { level: string, reason: string, forKey: string }>} */
  const timingCache = new Map();
  let ideasBusy = false;
  let mintBusy = false;
  let summonBusy = false;
  /** @type {Map<string, { ids: string[], titles: string[] }>} */
  const sparkBatches = new Map();
  /** @type {ReturnType<typeof setTimeout>|null} */
  let inspectShowTimer = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let inspectHideTimer = null;
  /** @type {string|null} */
  let inspectTileId = null;
  /** @type {string|null} */
  let concernAnswerRevisingId = null;
  let concernAnswerBusy = false;

  const BUSY_LABELS = {
    ideas: "Generating ideas…",
    mint: "Minting tile…",
    summon: "Challengers are reading your pathway…",
  };

  function isCreateBusy() {
    return ideasBusy || mintBusy || summonBusy;
  }

  /** @returns {"ideas"|"mint"|"summon"|null} */
  function createBusyKind() {
    if (summonBusy) return "summon";
    if (ideasBusy) return "ideas";
    if (mintBusy) return "mint";
    return null;
  }

  function setCreateBusy(kind, on) {
    if (kind === "ideas") ideasBusy = Boolean(on);
    else if (kind === "mint") mintBusy = Boolean(on);
    else if (kind === "summon") summonBusy = Boolean(on);
    syncCreateBusyUi(kind);
    if (kind === "summon") syncSummonWaitUi();
  }

  function refreshLabel() {
    return api.apEnabled?.() ? "Refresh · 1 AP" : "Refresh";
  }

  function mintRdLabel() {
    const ap = api.apEnabled?.();
    const bw = api.budgetWillEnabled?.();
    if (ap && bw) return "Mint R&D · 1 AP · 1$";
    if (ap) return "Mint R&D · 1 AP";
    if (bw) return "Mint R&D · 1$";
    return "Mint R&D";
  }

  function unplacedSparksFor(techId) {
    return unplacedInventionsForTech(board(), techId).filter(
      (t) => t.origin === "sparks"
    );
  }

  /** Restore last spark batch from tray tiles after reload (Map is session-only). */
  function ensureSparkBatch(techId) {
    if (!techId) return { ids: [], titles: [] };
    const existing = sparkBatches.get(techId);
    if (existing?.ids?.length) return existing;
    const sparks = unplacedSparksFor(techId);
    if (!sparks.length) return { ids: [], titles: [] };
    const batch = {
      ids: sparks.map((t) => t.id),
      titles: sparks.map((t) => t.name),
    };
    sparkBatches.set(techId, batch);
    return batch;
  }

  function hasSparkBatch(techId) {
    const id = techId || focusedTechId;
    const batch = ensureSparkBatch(id);
    return Boolean(batch?.ids?.length);
  }

  function hasUnplacedSparks(techId) {
    return unplacedSparksFor(techId || focusedTechId).length > 0;
  }

  function ideaCardsForFocus() {
    const rd = unplacedRdTiles(board());
    const waiting = unplacedInventionsForTech(board(), focusedTechId);
    const batchIds = ensureSparkBatch(focusedTechId).ids || [];
    const rank = new Map(batchIds.map((id, i) => [id, i]));
    const inventions = waiting.slice().sort((a, b) => {
      const ai = rank.has(a.id) ? rank.get(a.id) : 1000;
      const bi = rank.has(b.id) ? rank.get(b.id) : 1000;
      if (ai !== bi) return ai - bi;
      return String(a.id).localeCompare(String(b.id));
    });
    return [...rd, ...inventions];
  }

  function syncCreateBusyUi(preferKind) {
    const panel = document.querySelector("#hex-tile-create");
    const pending = document.querySelector("#hex-create-pending");
    const pendingText = document.querySelector("#hex-create-pending-text");
    const wrap = document.querySelector(".hex-board-wrap");
    const busy = isCreateBusy();
    const inventWait = ideasBusy || mintBusy;
    panel?.classList.toggle("is-busy", busy);
    wrap?.classList.toggle("is-invent-wait", inventWait);
    document.body.classList.toggle("hex-create-busy", inventWait);
    if (pending) {
      pending.hidden = !busy;
      if (busy && pendingText) {
        const active =
          (summonBusy && "summon") ||
          (ideasBusy && "ideas") ||
          (mintBusy && "mint") ||
          preferKind ||
          "ideas";
        pendingText.textContent = BUSY_LABELS[active] || "Working…";
      }
    }
    const askBtn = document.querySelector("#btn-ask-ideas");
    const refreshBtn = document.querySelector("#btn-refresh-ideas");
    const mintBtn = document.querySelector("#btn-mint-custom");
    const rdBtn = document.querySelector("#btn-mint-rd");
    const how = document.querySelector("#hex-how-text");
    const traySparks = Boolean(focusedTechId && hasUnplacedSparks(focusedTechId));
    if (askBtn) {
      askBtn.hidden = traySparks;
      askBtn.disabled = busy || !focusedTechId || traySparks;
    }
    if (mintBtn) mintBtn.disabled = busy || !focusedTechId;
    if (rdBtn) {
      rdBtn.disabled = busy;
      rdBtn.textContent = mintRdLabel();
    }
    if (how) how.disabled = busy || !focusedTechId;
    if (refreshBtn) {
      const show = Boolean(focusedTechId && hasSparkBatch(focusedTechId));
      refreshBtn.hidden = !show;
      refreshBtn.disabled = busy || !focusedTechId;
      refreshBtn.textContent = refreshLabel();
    }
  }

  function board() {
    return api.getBoard();
  }

  function setBoard(b, opts = {}) {
    const next = opts.skipRekey ? b : rekeyIslandHow(b);
    api.setBoard(next);
    syncDerivedProse();
    if (opts.paintHow !== false) renderPathwayHowPanel();
  }

  function syncDerivedProse() {
    const ids = techIdsFromBoard(board());
    if (api.reconcileStackFromBoard) {
      api.reconcileStackFromBoard(ids);
    } else {
      api.setSelectedTechIds?.(ids);
    }
  }

  function renderPathwayHowPanel() {
    const host = document.querySelector("#hex-island-how");
    if (!host) return;
    const pathways = listInventionPathways(board());
    if (!pathways.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    const active = document.activeElement;
    const keepKey =
      active && active.classList?.contains("hex-island-how-text")
        ? active.getAttribute("data-island-key")
        : null;
    const keepVal = keepKey && active ? active.value : null;
    const keepSel =
      keepKey && active
        ? [active.selectionStart, active.selectionEnd]
        : null;
    host.innerHTML = pathways
      .map((invs, i) => {
        const key = islandHowKey(invs);
        const resolved = resolveIslandHow(board(), invs);
        const label =
          invs
            .map((t) => t.techId || t.name || t.id)
            .filter(Boolean)
            .slice(0, 4)
            .join(" · ") || `Pathway ${i + 1}`;
        const origin = invs[0]?.id || "";
        return (
          `<div class="hex-island-how-block">` +
          `<label class="hex-island-how-label" for="hex-island-how-${i}">${escapeHtml(
            label
          )}</label>` +
          `<div class="hex-island-how-row">` +
          `<textarea id="hex-island-how-${i}" class="hex-island-how-text" rows="3" ` +
          `data-island-key="${escapeHtml(key)}" data-origin-id="${escapeHtml(
            origin
          )}" ` +
          `placeholder="How this pathway works as a whole…">${escapeHtml(
            resolved.text
          )}</textarea>` +
          `<button type="button" class="btn btn-primary btn-sm hex-island-how-save" ` +
          `data-island-key="${escapeHtml(key)}" disabled>Save</button>` +
          `</div>` +
          `</div>`
        );
      })
      .join("");
    if (keepKey && keepVal != null) {
      const el = [...host.querySelectorAll("textarea")].find(
        (ta) => ta.getAttribute("data-island-key") === keepKey
      );
      if (el) {
        el.value = keepVal;
        el.focus();
        if (keepSel) {
          try {
            el.setSelectionRange(keepSel[0], keepSel[1]);
          } catch {
            /* ignore */
          }
        }
      }
    }
    host.querySelectorAll(".hex-island-how-block").forEach((block) => {
      const ta = block.querySelector("textarea");
      const btn = block.querySelector(".hex-island-how-save");
      if (!ta || !btn) return;
      const syncDirty = () => {
        const key = ta.getAttribute("data-island-key");
        const invs = listInventionPathways(board()).find(
          (p) => islandHowKey(p) === key
        );
        const cur = invs ? resolveIslandHow(board(), invs).text : "";
        const dirty = String(ta.value || "").trim() !== String(cur || "").trim();
        btn.disabled = !dirty;
      };
      syncDirty();
      ta.addEventListener("focus", () => {
        const key = ta.getAttribute("data-island-key");
        const origin = ta.getAttribute("data-origin-id");
        const invs = listInventionPathways(board()).find(
          (p) => islandHowKey(p) === key
        );
        if (origin && invs) {
          ensureUi()?.setHighlight?.({
            originId: origin,
            inventionIds: invs.map((t) => t.id),
            givenIds: [],
          });
        }
      });
      ta.addEventListener("input", syncDirty);
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commitIslandHowFromTextarea(ta);
        }
      });
      btn.addEventListener("click", () => commitIslandHowFromTextarea(ta));
    });
  }

  function commitIslandHowFromTextarea(ta) {
    if (!ta?.isConnected) return false;
    const key = ta.getAttribute("data-island-key");
    const invs = listInventionPathways(board()).find(
      (p) => islandHowKey(p) === key
    );
    if (!invs) return false;
    const cur = resolveIslandHow(board(), invs);
    const nextText = String(ta.value || "").trim();
    if (nextText === cur.text && cur.stored) return false;
    setBoard(setIslandHow(board(), invs, ta.value, "user"), {
      skipRekey: true,
      paintHow: false,
    });
    syncPathwayScores();
    renderPathwayHowPanel();
    return true;
  }

  function ensureUi() {
    if (ui) return ui;
    const svg = api.$?.("#hex-board-svg") || document.querySelector("#hex-board-svg");
    if (!svg) return null;
    ui = createHexBoardUi({
      svg,
      getBoard: () => board(),
      setBoard: (b) => setBoard(b),
      getYear: () => api.getYear(),
      canPlaceInvention: (tile) => {
        if (api.canPlaceInvention) return api.canPlaceInvention(tile);
        return { ok: true };
      },
      onUnaffordablePlace: (tile, gate) => {
        if (tile?.techId && api.flashUnaffordableTech) {
          api.flashUnaffordableTech(tile.techId, gate?.error);
        } else {
          api.flashToast?.(gate?.error || "Cannot add to stack.");
        }
      },
      onStatus: (msg, bad) => {
        const el = api.$?.("#hex-board-status") || document.querySelector("#hex-board-status");
        if (el) {
          el.textContent = msg;
          el.classList.toggle("is-bad", Boolean(bad));
        }
      },
      onBoardChange: (b, tileId, kind, extra = {}) => {
        afterBoardChange(tileId, kind, extra);
        api.commitBoard?.(b);
      },
      isInteractive: () => {
        if (isCreateBusy()) return false;
        if (api.canEditBoard) return Boolean(api.canEditBoard());
        return true;
      },
      onInspect: (id) => {
        if (isCreateBusy()) return;
        scheduleInspect(id);
      },
      onInspectEnd: () => {
        scheduleInspectEnd();
      },
      onInspectCancel: () => {
        hideTilePopup();
        inspectTileId = null;
      },
      onPathwayToggle: (id, hl) => {
        if (isCreateBusy()) return;
        const t = board()?.tiles?.[id];
        if (t?.kind === TILE_KIND.invention && t.techId && hl) {
          focusTech(t.techId);
        }
      },
    });
    return ui;
  }

  function syncSummonWaitUi() {
    const wrap = document.querySelector(".hex-board-wrap");
    const create = document.querySelector("#hex-tile-create");
    const pending = document.querySelector("#hex-board-pending");
    const pendingText = document.querySelector("#hex-board-pending-text");
    wrap?.classList.toggle("is-ai-wait", summonBusy);
    create?.classList.toggle("is-summon-wait", summonBusy);
    if (pending) {
      pending.hidden = !summonBusy;
      if (summonBusy && pendingText) {
        pendingText.textContent =
          BUSY_LABELS.summon || "Challengers are reading your pathway…";
      }
    }
  }

  function ensurePopupWired() {
    const popup = document.querySelector("#hex-tile-popup");
    if (!popup || popup.dataset.wired === "1") return popup;
    popup.dataset.wired = "1";
    popup.classList.add("is-inspect");
    const card = popup.querySelector(".hex-tile-popup-card");
    card?.addEventListener("pointerenter", () => {
      if (inspectHideTimer) {
        clearTimeout(inspectHideTimer);
        inspectHideTimer = null;
      }
    });
    card?.addEventListener("pointerleave", () => {
      scheduleInspectEnd();
    });
    return popup;
  }

  function scheduleInspect(tileId) {
    if (inspectHideTimer) {
      clearTimeout(inspectHideTimer);
      inspectHideTimer = null;
    }
    if (inspectShowTimer) clearTimeout(inspectShowTimer);
    inspectTileId = tileId;
    inspectShowTimer = setTimeout(() => {
      inspectShowTimer = null;
      if (inspectTileId === tileId) showTilePopup(tileId);
    }, 450);
  }

  function scheduleInspectEnd() {
    if (inspectShowTimer) {
      clearTimeout(inspectShowTimer);
      inspectShowTimer = null;
    }
    if (inspectHideTimer) clearTimeout(inspectHideTimer);
    inspectHideTimer = setTimeout(() => {
      inspectHideTimer = null;
      hideTilePopup();
      inspectTileId = null;
    }, 150);
  }

  function hideTilePopup() {
    if (inspectShowTimer) {
      clearTimeout(inspectShowTimer);
      inspectShowTimer = null;
    }
    if (inspectHideTimer) {
      clearTimeout(inspectHideTimer);
      inspectHideTimer = null;
    }
    const popup = document.querySelector("#hex-tile-popup");
    if (popup) {
      popup.hidden = true;
      popup.querySelector(".hex-tile-popup-card")?.classList.remove("is-concern");
    }
    stopReadAloud();
  }

  function findTileAnchor(tileId) {
    const id = String(tileId || "");
    if (!id) return null;
    const esc =
      typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
    return (
      document.querySelector(`#hex-idea-cards [data-id="${esc}"]`) ||
      document.querySelector(`#hex-idea-tray [data-id="${esc}"]`) ||
      document.querySelector(`#hex-board-svg g[data-id="${esc}"]`)
    );
  }

  /**
   * Place popup card near the tile without covering it (viewport-fixed).
   * Prefer right → left → below → above; keep ≥12px gap from the anchor box.
   */
  function positionPopupNearTile(tileId) {
    const popup = document.querySelector("#hex-tile-popup");
    const card = popup?.querySelector(".hex-tile-popup-card");
    if (!popup || !card || popup.hidden) return;
    const anchor = findTileAnchor(tileId);
    const pad = 10;
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = anchor?.getBoundingClientRect?.() || {
      left: vw / 2,
      top: vh / 2,
      width: 0,
      height: 0,
      bottom: vh / 2,
      right: vw / 2,
    };
    const cw = card.offsetWidth || 320;
    const ch = card.offsetHeight || 200;
    const ax = rect.left + rect.width / 2;
    const ay = rect.top + rect.height / 2;

    /** @type {Array<{ left: number, top: number, side: string }>} */
    const candidates = [
      {
        side: "right",
        left: rect.right + gap,
        top: rect.top + rect.height / 2 - ch / 2,
      },
      {
        side: "left",
        left: rect.left - gap - cw,
        top: rect.top + rect.height / 2 - ch / 2,
      },
      {
        side: "below",
        left: rect.left + rect.width / 2 - cw / 2,
        top: rect.bottom + gap,
      },
      {
        side: "above",
        left: rect.left + rect.width / 2 - cw / 2,
        top: rect.top - gap - ch,
      },
    ];

    function fits(left, top) {
      return (
        left >= pad &&
        top >= pad &&
        left + cw <= vw - pad &&
        top + ch <= vh - pad
      );
    }

    /** Clamp along free axis only — never reduce the gap on the tile-facing edge. */
    function clampPreserveGap(c) {
      let { left, top, side } = c;
      if (side === "right") {
        left = Math.max(rect.right + gap, left);
        top = Math.max(pad, Math.min(top, vh - pad - ch));
      } else if (side === "left") {
        left = Math.min(rect.left - gap - cw, left);
        top = Math.max(pad, Math.min(top, vh - pad - ch));
      } else if (side === "below") {
        top = Math.max(rect.bottom + gap, top);
        left = Math.max(pad, Math.min(left, vw - pad - cw));
      } else {
        // above
        top = Math.min(rect.top - gap - ch, top);
        left = Math.max(pad, Math.min(left, vw - pad - cw));
      }
      return { left, top, side };
    }

    function overlapsAnchor(left, top) {
      const cardR = { left, top, right: left + cw, bottom: top + ch };
      return !(
        cardR.right + 0.5 < rect.left ||
        cardR.left - 0.5 > rect.right ||
        cardR.bottom + 0.5 < rect.top ||
        cardR.top - 0.5 > rect.bottom
      );
    }

    let chosen = null;
    for (const c of candidates) {
      if (fits(c.left, c.top) && !overlapsAnchor(c.left, c.top)) {
        chosen = c;
        break;
      }
    }

    if (!chosen) {
      // Most free space on each side
      const space = {
        right: vw - pad - (rect.right + gap),
        left: rect.left - gap - pad,
        below: vh - pad - (rect.bottom + gap),
        above: rect.top - gap - pad,
      };
      const order = Object.keys(space).sort((a, b) => space[b] - space[a]);
      for (const side of order) {
        const base = candidates.find((c) => c.side === side);
        if (!base) continue;
        const clamped = clampPreserveGap(base);
        if (!overlapsAnchor(clamped.left, clamped.top)) {
          chosen = clamped;
          break;
        }
      }
    }

    if (!chosen) {
      // Last resort: viewport corner farthest from tile center
      const corners = [
        { left: pad, top: pad },
        { left: vw - pad - cw, top: pad },
        { left: pad, top: vh - pad - ch },
        { left: vw - pad - cw, top: vh - pad - ch },
      ];
      let best = corners[0];
      let bestDist = -1;
      for (const c of corners) {
        const cx = c.left + cw / 2;
        const cy = c.top + ch / 2;
        const d = (cx - ax) ** 2 + (cy - ay) ** 2;
        if (d > bestDist) {
          bestDist = d;
          best = c;
        }
      }
      chosen = best;
    }

    card.style.left = `${Math.round(chosen.left)}px`;
    card.style.top = `${Math.round(chosen.top)}px`;
  }


  function mapConcernAnswerQuality(data) {
    const q = String(data?.quality || "").toLowerCase();
    if (q === "hit" || q === "glance" || q === "miss") return q;
    const v = String(data?.verdict || "").toLowerCase();
    if (v === "pass" || v === "hit") return "hit";
    if (v === "partial" || v === "glance") return "glance";
    if (v === "fail" || v === "miss") return "miss";
    return "glance";
  }

  async function submitConcernAnswer(tileId) {
    if (api.canAnswerConcern && !api.canAnswerConcern()) {
      api.flashToast?.("Only this invent's owner can answer the challenger.");
      return;
    }
    const ta = document.querySelector("#hex-concern-answer");
    const text = String(ta?.value || "").trim();
    if (text.length < 12) {
      api.flashToast?.(
        "Write a bit more — name who acts, who pays, or what limit you respect."
      );
      return;
    }
    if (concernAnswerBusy) return;
    if (api.apEnabled?.()) {
      const pay = api.spendChallengeAp?.() ?? api.spendIdeaAp?.();
      if (pay && pay.ok === false) {
        api.flashToast?.("Not enough AP.");
        return;
      }
    }
    concernAnswerBusy = true;
    concernAnswerRevisingId = null;
    let b = setConcernReply(board(), tileId, {
      playerAnswer: text,
      answerPending: true,
    });
    setBoard(b);
    showTilePopup(tileId);

    const t = board()?.tiles?.[tileId];
    const pose = concernPoseText(t);
    const year = api.getYear?.() || 2026;
    const cluster = clusterFromGiven(board(), t, year);
    const docked = Boolean(cluster?.anyTouch);
    try {
      let data = null;
      if (api.coInvent) {
        data = await api.coInvent("judge-challenge", text, {
          challengeAngle: t?.angle || null,
          challengeSpeech: pose.speech,
          challengeQuestion: pose.question,
          playerAnswer: text,
          pathway: {
            anyTouch: docked,
            howText: islandHowForAi(board(), cluster?.inventions || []).slice(
              0,
              1600
            ),
            inventions: (cluster?.inventions || []).map((n) => ({
              techId: n.techId,
              howText: String(n.howText || "").slice(0, 400),
              timingLevel: n.timingLevel || null,
            })),
          },
        });
      }
      const quality = data
        ? mapConcernAnswerQuality(data)
        : text.length >= 80
          ? "glance"
          : "miss";
      const feedback = String(
        data?.message || data?.lesson || ""
      ).slice(0, 400);
      b = setConcernReply(board(), tileId, {
        playerAnswer: text,
        answerQuality: quality,
        answerFeedback: feedback,
        answerPending: false,
      });
      if (docked) {
        b = invalidatePathwaysTouchingGiven(b, tileId);
      }
      setBoard(b);
      api.commitBoard?.(b);
      if (docked) syncPathwayScores();
      else {
        ensureUi()?.render();
      }
      showTilePopup(tileId);
    } catch (e) {
      console.warn("[judge-challenge]", e?.message || e);
      const quality = text.length >= 80 ? "glance" : "miss";
      b = setConcernReply(board(), tileId, {
        playerAnswer: text,
        answerQuality: quality,
        answerFeedback:
          "Could not reach the judge — saved your draft. Dock a pathway so the light can move.",
        answerPending: false,
      });
      setBoard(b);
      api.commitBoard?.(b);
      showTilePopup(tileId);
    } finally {
      concernAnswerBusy = false;
    }
  }

  function showTilePopup(tileId) {
    const popup = ensurePopupWired();
    const t = board()?.tiles?.[tileId];
    if (!popup || !t) return;
    const title = document.querySelector("#hex-tile-popup-title");
    const meta = document.querySelector("#hex-tile-popup-meta");
    const body = document.querySelector("#hex-tile-popup-body");
    const art = document.querySelector("#hex-tile-popup-art");
    if (title) {
      if (t.kind === TILE_KIND.invention) {
        const tech = t.techId ? techById(t.techId) : null;
        title.textContent = tech?.name || t.techId || "emTech idea";
      } else {
        title.textContent = t.name || "Tile";
      }
    }
    if (art) {
      art.onload = null;
      if (t.artUrl) {
        art.onload = () => positionPopupNearTile(tileId);
        art.src = t.artUrl;
        art.alt =
          t.kind === TILE_KIND.invention
            ? techById(t.techId)?.name || "Idea art"
            : t.name || "Tile art";
        art.hidden = false;
      } else {
        art.removeAttribute("src");
        art.alt = "";
        art.hidden = true;
      }
    }
    if (meta) {
      if (t.kind === TILE_KIND.crisis) {
        const role = t.role || "local";
        const roleName =
          CRISIS_ROLE_DEFAULT_NAMES[role] || role;
        meta.textContent = `Crisis meter · ${roleName}`;
      } else if (t.kind === TILE_KIND.concern) {
        const angleMeta = CHALLENGE_ANGLES.find((a) => a.id === t.angle);
        const angleLabel =
          CONCERN_LABELS[t.angle] ||
          angleMeta?.label ||
          t.angle ||
          "Challenger";
        const sub = angleMeta?.subtitle ? ` · ${angleMeta.subtitle}` : "";
        meta.textContent = `Challenger · ${angleLabel}${sub}`;
      } else if (t.kind === TILE_KIND.rd) {
        const onField = t.q != null && t.r != null;
        meta.textContent = `R&D · ${formatFactor(t.factor)}${onField ? " · on board" : " · in tray"}`;
      } else {
        const tech = t.techId ? techById(t.techId) : null;
        const onField = t.q != null && t.r != null;
        const pending = t.timingPending ? " · re-checking timing…" : "";
        meta.textContent = `Invention · ${tech?.name || t.techId || "idea"} · ${t.polarity || ""} · year ${t.year || "?"}${onField ? "" : " · in tray"}${pending}`;
      }
    }
    if (body) {
      const parts = [];
      if (t.kind === TILE_KIND.crisis) {
        const role = t.role || "local";
        const blurb =
          CRISIS_ROLE_BLURBS[role] ||
          "how bad things are in this place";
        const name = t.name || "this meter";
        parts.push(
          `<p>This tile tracks how bad <strong>${escapeHtml(name)}</strong> is here — ${escapeHtml(blurb)}.</p>`
        );
        const desc = String(t.description || "").trim();
        if (desc) {
          parts.push(`<p class="hex-tile-popup-scene">${escapeHtml(desc)}</p>`);
        }
        const pressure = api.getPressure?.() || {};
        const winMax = api.getWinMax?.() || {};
        const pressureRise = api.getPressureRise?.() || {};
        const key = t.meterKey || t.name;
        const cur = pressure[key];
        const goal = winMax[key];
        const riseRaw = pressureRise[key];
        const rise =
          riseRaw != null && !Number.isNaN(Number(riseRaw))
            ? Math.max(0, Math.min(3, Math.round(Number(riseRaw))))
            : null;
        if (cur != null) {
          const curN = Math.max(0, Math.min(5, Math.round(Number(cur) || 0)));
          const band = crisisMeterLevel(curN, goal);
          const dots = `${"●".repeat(curN)}${"○".repeat(5 - curN)}`;
          parts.push(
            `<p class="hex-tile-popup-meter meter ${escapeHtml(band)}" title="${escapeHtml(String(curN))}/5"><b>${escapeHtml(String(curN))}/5</b> ${escapeHtml(dots)}</p>`
          );
          let pressureLine = `Pressure <strong>${escapeHtml(String(curN))} of 5</strong>.`;
          if (goal != null && !Number.isNaN(Number(goal))) {
            const g = Math.max(0, Math.min(5, Math.round(Number(goal))));
            pressureLine += ` Hold it at <strong>${escapeHtml(String(g))} or below</strong>.`;
          }
          pressureLine +=
            " If it hits <strong>5</strong>, the place falls.";
          if (rise != null && rise > 0) {
            pressureLine += ` Wait raises this meter by <strong>${escapeHtml(String(rise))}</strong>.`;
          } else if (rise === 0) {
            pressureLine += " Wait does not raise this meter.";
          } else {
            pressureLine += " Waiting a year makes it worse.";
          }
          parts.push(`<p>${pressureLine}</p>`);
        }
        const collapseYear = api.getCollapseYear?.();
        const year = Number(api.getYear?.()) || null;
        if (
          collapseYear != null &&
          !Number.isNaN(Number(collapseYear)) &&
          year != null
        ) {
          const cy = Math.round(Number(collapseYear));
          const left = cy - year;
          if (left > 1) {
            parts.push(
              `<p class="muted">Fail year <strong>${escapeHtml(String(cy))}</strong> — <strong>${escapeHtml(String(left))}</strong> years left before the place falls on the calendar.</p>`
            );
          } else if (left === 1) {
            parts.push(
              `<p class="muted">Fail year <strong>${escapeHtml(String(cy))}</strong> — <strong>1</strong> year left before the place falls on the calendar.</p>`
            );
          } else if (left === 0) {
            parts.push(
              `<p class="muted">Fail year is <strong>now</strong> (${escapeHtml(String(cy))}) — the calendar can end the Quest.</p>`
            );
          } else {
            parts.push(
              `<p class="muted">Fail year was <strong>${escapeHtml(String(cy))}</strong> — the calendar has already run out.</p>`
            );
          }
        }
        parts.push(
          `<p class="muted">Here-and-now relief without a deeper lever is incomplete; a root-cause story with no support never leaves the notebook; support without a real fix is theater. The three meters together are the inventing discipline.</p>`
        );
        if (cur != null) {
          const curN = Math.max(0, Math.min(5, Math.round(Number(cur) || 0)));
          const band = crisisMeterLevel(curN, goal);
          const lamp = bandToLamp(band);
          const status =
            band === "cool"
              ? "eased — this meter is at or under the win goal."
              : band === "warm"
                ? "strained — above the win goal; dock a pathway to ease it."
                : "hot — near collapse; this meter needs relief.";
          parts.push(
            `<p><span class="hex-tile-popup-lamp ${escapeHtml(lamp)}"></span><strong>${escapeHtml(band)}</strong> — ${escapeHtml(status)}</p>`
          );
        } else {
          parts.push(lampExplainHtml(t.lamp, t.lampReason, "crisis"));
        }
      } else if (t.kind === TILE_KIND.concern) {
        const angleMeta = CHALLENGE_ANGLES.find((a) => a.id === t.angle);
        const angleLabel =
          CONCERN_LABELS[t.angle] ||
          angleMeta?.label ||
          t.angle ||
          "this challenger";
        if (angleMeta?.blurb) {
          parts.push(
            `<p class="muted">${escapeHtml(angleMeta.blurb)}</p>`
          );
        }
        const pose = concernPoseText(t);
        if (pose.speech) {
          parts.push(`<p>${escapeHtml(pose.speech)}</p>`);
        }
        if (pose.question) {
          parts.push(
            `<p><strong>The hard question</strong></p><p>${escapeHtml(pose.question)}</p>`
          );
        } else if (!pose.speech) {
          parts.push(
            `<p>This is a hard-question tile — <strong>${escapeHtml(angleLabel)}</strong> presses your pathway until an invention answers it.</p>`
          );
        }
        const reply = concernReplyText(t);
        const year = api.getYear?.() || 2026;
        const cluster = clusterFromGiven(board(), t, year);
        const docked = Boolean(cluster?.anyTouch);
        const revising = concernAnswerRevisingId === t.id;
        const canAnswer =
          !api.canAnswerConcern || Boolean(api.canAnswerConcern());
        const showForm = canAnswer && (!reply.quality || revising || reply.pending);
        if (!canAnswer) {
          parts.push(
            `<p class="muted">Only the invent owner can answer this challenger. You can still add idea tiles on their board.</p>`
          );
          if (reply.answer) {
            parts.push(`<p><strong>Their answer</strong></p><p>${escapeHtml(reply.answer)}</p>`);
          }
        } else {
          parts.push(
            `<p class="muted">This critic is a veto on the island it was raised against. Docking does not address it. Answer here, or change that touching pathway (edit how-it-works, add or lift invent tiles) so it honestly answers the question.</p>`
          );
        }
        if (canAnswer && showForm) {
          parts.push(
            `<label class="hex-tile-popup-answer-label" for="hex-concern-answer">Your answer</label>` +
              `<textarea id="hex-concern-answer" class="hex-tile-popup-answer" rows="5" maxlength="2000" ${
                reply.pending || concernAnswerBusy ? "disabled" : ""
              }>${escapeHtml(reply.answer)}</textarea>` +
              `<p class="hex-tile-popup-answer-actions"><button type="button" class="btn btn-primary btn-sm" id="hex-concern-answer-submit" ${
                reply.pending || concernAnswerBusy ? "disabled" : ""
              }>Answer this critic</button></p>`
          );
          if (reply.pending || concernAnswerBusy) {
            parts.push(`<p class="muted">Judging…</p>`);
          }
        } else if (canAnswer) {
          const qLabel =
            reply.quality === "hit"
              ? "Hit"
              : reply.quality === "miss"
                ? "Miss"
                : "Glance";
          parts.push(`<p><strong>Your answer</strong></p><p>${escapeHtml(reply.answer)}</p>`);
          parts.push(
            `<p><strong>${escapeHtml(qLabel)}</strong>${
              reply.feedback ? ` — ${escapeHtml(reply.feedback)}` : ""
            }</p>`
          );
          parts.push(
            `<p><button type="button" class="btn btn-ghost btn-sm" id="hex-concern-answer-revise">Revise answer</button></p>`
          );
        }
        parts.push(
          lampExplainHtml(t.lamp, t.lampReason, "concern", {
            answeredUndocked: Boolean(reply.answer) && !docked,
          })
        );
      } else if (t.kind === TILE_KIND.rd) {
        parts.push(
          `<p>This is a research roll of <strong>${escapeHtml(formatFactor(t.factor))}</strong>. Dock it against an invention pathway to multiply that pathway's honesty chance.</p>`
        );
        const boosted = inventionNeighbors(board(), t.id).map(
          (n) => n.name || n.techId || n.id
        );
        if (t.q != null && t.r != null) {
          parts.push(
            boosted.length
              ? `<p>Currently boosting: ${boosted
                  .map((n) => escapeHtml(n))
                  .join(", ")}.</p>`
              : `<p class="muted">Not touching a pathway yet — dock it against an invention.</p>`
          );
        }
        parts.push(
          `<p class="muted">R&D is a gamble: 0.75× can hurt, 2× can rescue a weak combined product. You already paid to mint it.</p>`
        );
        const actions = [];
        const canEdit = !api.canEditBoard || Boolean(api.canEditBoard());
        if (canEdit && t.q != null && t.r != null) {
          actions.push(
            `<button type="button" class="btn btn-ghost btn-sm" id="hex-tile-popup-lift" data-lift-id="${escapeHtml(t.id)}">Lift off board</button>`
          );
        }
        if (canEdit) {
          actions.push(
            `<button type="button" class="btn btn-ghost btn-sm" id="hex-tile-popup-discard" data-discard-id="${escapeHtml(t.id)}">Throw away</button>`
          );
        }
        if (actions.length) {
          parts.push(`<p class="hex-tile-popup-actions">${actions.join("")}</p>`);
        }
      } else {
        if (t.howText) {
          parts.push(`<p><strong>How it works</strong></p><p>${escapeHtml(t.howText)}</p>`);
        } else {
          parts.push(`<p class="muted">No how-it-works text yet.</p>`);
        }
        if (t.timingPending) {
          parts.push(`<p class="muted">Re-checking timing honesty…</p>`);
        } else if (t.timingLevel || t.feasibilityPct != null) {
          const shown = tileTimingPct(t, board());
          const base = tileBaseTimingPct(t);
          const pct = shown != null ? shown : base;
          const lvl =
            t.timingLevel ||
            (pct == null ? "yellow" : pct < 35 ? "red" : pct < 70 ? "yellow" : "green");
          let line = `Timing: <strong>${escapeHtml(lvl)}</strong>`;
          if (pct != null) {
            line += ` · <strong>${escapeHtml(String(pct))}%</strong> honest this year.`;
          }
          if (base != null && shown != null && shown !== base) {
            line += ` <span class="muted">(base ${escapeHtml(String(Math.round(base)))}%)</span>`;
          }
          parts.push(`<p>${line}</p>`);
          if (t.timingReason) {
            parts.push(`<p class="muted">${escapeHtml(t.timingReason)}</p>`);
          }
        }
        parts.push(
          `<p class="muted">World rim: ${escapeHtml(t.polarity || "?")} (bits left, atoms right).</p>`
        );
        const actions = [];
        const canEdit = !api.canEditBoard || Boolean(api.canEditBoard());
        if (canEdit && t.q != null && t.r != null) {
          actions.push(
            `<button type="button" class="btn btn-ghost btn-sm" id="hex-tile-popup-lift" data-lift-id="${escapeHtml(t.id)}">Lift off board</button>`
          );
        }
        if (canEdit) {
          actions.push(
            `<button type="button" class="btn btn-ghost btn-sm" id="hex-tile-popup-discard" data-discard-id="${escapeHtml(t.id)}">Throw away</button>`
          );
        }
        if (actions.length) {
          parts.push(`<p class="hex-tile-popup-actions">${actions.join("")}</p>`);
        }
      }
      body.innerHTML = parts.join("");
      body.querySelector("#hex-tile-popup-lift")?.addEventListener("click", () => {
        const ok = ensureUi()?.liftInvention(tileId);
        if (ok) {
          hideTilePopup();
          renderTray();
          api.flashToast?.("Lifted off the board — back in the tray.");
        }
      });
      body.querySelector("#hex-tile-popup-discard")?.addEventListener("click", () => {
        throwAwayTile(tileId);
      });
      body.querySelector("#hex-concern-answer-submit")?.addEventListener("click", () => {
        submitConcernAnswer(tileId);
      });
      body.querySelector("#hex-concern-answer-revise")?.addEventListener("click", () => {
        concernAnswerRevisingId = tileId;
        showTilePopup(tileId);
      });
      if (t.kind === TILE_KIND.concern) {
        const pose = concernPoseText(t);
        attachReadAloud(body, {
          getText: () => [pose.speech, pose.question].filter(Boolean).join("\n\n"),
          minChars: 1,
        });
      } else {
        attachReadAloud(body, { getText: () => "" });
      }
    }
    popup
      .querySelector(".hex-tile-popup-card")
      ?.classList.toggle("is-concern", t.kind === TILE_KIND.concern);
    popup.hidden = false;
    requestAnimationFrame(() => {
      positionPopupNearTile(tileId);
      // Second pass after layout settles (tall art / scrolled body)
      requestAnimationFrame(() => positionPopupNearTile(tileId));
    });
  }

  function seedFromMission(mission) {
    timingCache.clear();
    sparkBatches.clear();
    const b = seedCrisisTiles(mission || {});
    const applied = applyPathwayPressure(b, {
      winMax: mission?.winMax || {},
    });
    setBoard(applied.board);
    api.setPressure?.(applied.displayPressure);
    ensureUi()?.render();
    renderTray();
    updateCreatePanel();
    api.onBoardPainted?.();
    api.commitBoard?.(applied.board);
  }

  function focusTech(techId) {
    if (isCreateBusy() && techId && techId !== focusedTechId) {
      const kind = createBusyKind();
      if (kind === "ideas") api.flashToast?.("Ideas still generating.");
      else if (kind === "mint") api.flashToast?.("Tile still minting.");
      else api.flashToast?.("Wait — still working.");
      return;
    }
    focusedTechId = techId || null;
    updateCreatePanel();
    renderIdeaCards();
  }

  function updateCreatePanel() {
    const panel = document.querySelector("#hex-tile-create");
    const title = document.querySelector("#hex-tile-create-title");
    const hint = document.querySelector("#hex-tile-create-hint");
    const body = document.querySelector("#hex-tile-create-body");
    if (!panel) return;
    // Keep panel visible (stack + wait live here); never hide mid-request.
    panel.hidden = false;
    const tech = focusedTechId ? techById(focusedTechId) : null;
    if (title) {
      if (tech) {
        title.innerHTML = `Ideas · <span class="hex-tile-create-tech">${escapeHtml(tech.name || focusedTechId)}</span>`;
      } else {
        title.textContent = "Invent";
      }
    }
    if (hint) {
      if (tech) {
        const pol = polarityForTech(focusedTechId);
        hint.textContent = `World: ${pol}. Ask for ideas or write how it works.`;
      } else {
        hint.textContent = "Pick an emTech to invent.";
      }
    }
    if (body) {
      const b = board();
      const hasRd = unplacedRdTiles(b).length > 0;
      const hasTrayInvent = Object.values(b?.tiles || {}).some(
        (t) => t && t.kind === TILE_KIND.invention && (t.q == null || t.r == null)
      );
      body.hidden = !focusedTechId && !hasRd && !hasTrayInvent;
    }
    syncCreateBusyUi();
  }

  function paintIdeaCardSkeletons() {
    const host = document.querySelector("#hex-idea-cards");
    if (!host) return;
    host.innerHTML = [0, 1, 2]
      .map(
        () => `<article class="hex-idea-card is-loading" role="listitem">
          <div class="hex-idea-card-visual"><span class="idea-card-skel"></span></div>
          <div class="hex-idea-card-body">
            <span class="idea-card-skel idea-card-skel-line"></span>
            <span class="idea-card-skel idea-card-skel-line idea-card-skel-short"></span>
          </div>
        </article>`
      )
      .join("");
  }

  function renderIdeaCards() {
    const host = document.querySelector("#hex-idea-cards");
    if (!host) return;
    const b = board();
    const waiting = ideaCardsForFocus();
    host.innerHTML = "";
    host.dataset.count = String(waiting.length);
    if (!waiting.length) {
      syncCreateBusyUi();
      return;
    }
    const stackIds = new Set(techIdsFromBoard(b));
    const uiInst = ensureUi();
    for (const t of waiting) {
      if (t.kind === TILE_KIND.rd) {
        const card = document.createElement("article");
        card.className = "hex-idea-card is-rd";
        card.setAttribute("role", "listitem");
        card.dataset.tileId = t.id;
        card.dataset.id = t.id;
        card.title = "R&D — drag onto a pathway to apply this roll";
        const visual = document.createElement("div");
        visual.className = "hex-idea-card-visual hex-idea-card-visual-rd";
        visual.textContent = formatFactor(t.factor);
        card.appendChild(visual);
        const body = document.createElement("div");
        body.className = "hex-idea-card-body";
        const meta = document.createElement("p");
        meta.className = "hex-idea-card-meta";
        meta.textContent = "R&D roll";
        body.appendChild(meta);
        const title = document.createElement("h4");
        title.className = "hex-idea-card-title";
        title.textContent = `R&D ${formatFactor(t.factor)}`;
        body.appendChild(title);
        const how = document.createElement("p");
        how.className = "hex-idea-card-how";
        how.textContent =
          "Dock this against an invention pathway. The factor multiplies that pathway's honesty chance — including 0.75× misses.";
        body.appendChild(how);
        card.appendChild(body);
        const toss = document.createElement("button");
        toss.type = "button";
        toss.className = "hex-idea-card-discard";
        toss.setAttribute("aria-label", "Throw away this R&D tile");
        toss.title = "Throw away";
        toss.textContent = "×";
        toss.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        toss.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          throwAwayTile(t.id);
        });
        card.appendChild(toss);
        card.addEventListener("pointerdown", (e) => {
          if (e.button != null && e.button !== 0) return;
          ensureUi()?.startTrayDrag(e, t.id, { cardEl: card });
        });
        host.appendChild(card);
        continue;
      }
      const tech = t.techId ? techById(t.techId) : null;
      const inStack = Boolean(t.techId && stackIds.has(t.techId));
      const card = document.createElement("article");
      card.className = `hex-idea-card ${inStack ? "is-instack" : "is-considering"}`;
      card.setAttribute("role", "listitem");
      card.dataset.tileId = t.id;
      card.dataset.id = t.id;
      if (t.techId) card.dataset.techId = t.techId;
      card.title = inStack
        ? "In stack — drag onto the board"
        : "Considering — drag onto the board to add to stack";

      const visual = document.createElement("div");
      visual.className = "hex-idea-card-visual";
      if (t.artUrl) {
        const img = document.createElement("img");
        img.src = t.artUrl;
        img.alt = "";
        visual.appendChild(img);
      } else {
        const fb = document.createElement("span");
        fb.className = "hex-idea-card-fallback";
        fb.setAttribute("aria-hidden", "true");
        visual.appendChild(fb);
      }
      const badge = document.createElement("div");
      badge.className = "hex-idea-card-badge";
      badge.setAttribute("aria-hidden", "true");
      const hexEl =
        uiInst?.createTrayTileElement?.(t, { displayPx: { w: 40, h: 46 } }) ||
        null;
      if (hexEl) {
        hexEl.tabIndex = -1;
        hexEl.setAttribute("aria-hidden", "true");
        badge.appendChild(hexEl);
      }
      visual.appendChild(badge);
      card.appendChild(visual);

      const body = document.createElement("div");
      body.className = "hex-idea-card-body";
      const meta = document.createElement("p");
      meta.className = "hex-idea-card-meta";
      const techName = document.createElement("span");
      techName.className = "hex-idea-card-tech";
      techName.textContent = tech?.name || t.techId || "emTech";
      meta.appendChild(techName);
      const sep = document.createElement("span");
      sep.className = "hex-idea-card-meta-sep";
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "·";
      meta.appendChild(sep);
      const status = document.createElement("span");
      status.className = `tech-chip-status ${inStack ? "is-instack" : "is-considering"}`;
      status.textContent = inStack ? "In stack" : "Considering";
      meta.appendChild(status);
      body.appendChild(meta);
      const title = document.createElement("h4");
      title.className = "hex-idea-card-title";
      title.textContent = t.name || "Idea";
      body.appendChild(title);
      const how = document.createElement("p");
      how.className = "hex-idea-card-how";
      how.textContent = t.howText || "No description yet.";
      body.appendChild(how);
      card.appendChild(body);

      const toss = document.createElement("button");
      toss.type = "button";
      toss.className = "hex-idea-card-discard";
      toss.setAttribute("aria-label", "Throw away this idea");
      toss.title = "Throw away";
      toss.textContent = "×";
      toss.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      toss.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        throwAwayTile(t.id);
      });
      card.appendChild(toss);

      card.addEventListener("pointerdown", (e) => {
        if (e.button != null && e.button !== 0) return;
        ensureUi()?.startTrayDrag(e, t.id, { cardEl: card });
      });
      card.addEventListener("dblclick", () => {
        ensureUi()?.occupy(t.id, 2, 2);
      });
      host.appendChild(card);
    }
    syncCreateBusyUi();
  }

  /** @deprecated use renderIdeaCards — kept name for paint() callers */
  function renderTray() {
    renderIdeaCards();
  }

  function heuristicCtx() {
    const mission = api.getMission?.() || null;
    return {
      year: api.getYear(),
      pressure: api.getPressure?.() || {},
      winMax: api.getWinMax?.() || mission?.winMax || {},
      mission,
      global: api.getGlobal?.() || null,
      suggested: mission?.suggested || [],
    };
  }

  function afterBoardChange(tileId, kind, extra = {}) {
    let b = pruneStaleConvergences(board());
    setBoard(b);
    ensureUi()?.render();
    renderTray();
    const moved = board()?.tiles?.[tileId];
    if (moved?.kind === TILE_KIND.invention && moved.q != null && moved.r != null) {
      scheduleTileTiming(tileId);
      evaluateConvergenceAfterPlace(tileId).catch((e) =>
        console.warn("[hex convergence]", e)
      );
    }
    if (kind === "discard" && inspectTileId === tileId) {
      hideTilePopup();
    }
    syncPathwayScores();
    api.onBoardPainted?.();
  }

  function throwAwayTile(tileId) {
    const ok = ensureUi()?.discardInvention(tileId);
    if (ok) {
      hideTilePopup();
      renderTray();
      api.flashToast?.("Thrown away.");
    }
    return ok;
  }

  /**
   * Instant: re-apply cached pathway deltas → pressure + lamps.
   * Then start score jobs only for new fingerprints; leave live in-flight
   * scores running; abort fingerprints that left the board.
   */
  function syncPathwayScores() {
    const mission = api.getMission?.() || null;
    const winMax = api.getWinMax?.() || mission?.winMax || {};
    const applied = applyPathwayPressure(board(), { winMax });
    setBoard(applied.board);
    api.setPressure?.(applied.displayPressure);
    ensureUi()?.render();

    const { start, abort } = diffPathwayScoreJobs(
      applied.pathways,
      pathwayJobs.keys()
    );
    for (const fp of abort) abortPathwayJob(fp);
    for (const fp of start) schedulePathwayScore(fp);
    api.onBoardPainted?.();
  }

  function abortPathwayJob(fp) {
    const job = pathwayJobs.get(fp);
    if (!job) return;
    if (job.timer) clearTimeout(job.timer);
    try {
      job.abort.abort();
    } catch {
      /* already aborted */
    }
    pathwayJobs.delete(fp);
  }

  function isAbortError(e) {
    return Boolean(
      e &&
        (e.name === "AbortError" ||
          e.code === 20 ||
          /aborted|AbortError/i.test(String(e.message || e)))
    );
  }

  /**
   * After Wait: rise pressureBase, then re-apply deltas onto display pressure.
   * @param {Record<string, number>} rise
   * @param {{ meter?: string }|null} [frontierRisk]
   */
  function afterWaitPressureRise(rise, frontierRisk = null) {
    let b = cloneBoard(board());
    if (!b.pressureBase) {
      b.pressureBase = { ...(api.getPressure?.() || {}) };
    }
    b.pressureBase = applyPressureRise(b.pressureBase, rise || {});
    if (frontierRisk?.meter && b.pressureBase[frontierRisk.meter] != null) {
      b.pressureBase[frontierRisk.meter] = clampPressure(
        (b.pressureBase[frontierRisk.meter] || 0) + 1
      );
    }
    setBoard(b);
    syncPathwayScores();
  }

  function schedulePathwayScore(fp) {
    if (!fp || pathwayJobs.has(fp)) return;
    const abort = new AbortController();
    const job = { abort, timer: null };
    pathwayJobs.set(fp, job);
    job.timer = setTimeout(() => {
      job.timer = null;
      runPathwayScore(fp, abort.signal).catch((e) => {
        if (!isAbortError(e)) console.warn("[score-pathway]", e);
      });
    }, 200);
  }

  function applySettledPathwayScore(fp, score, scoredConcernKey, opts = {}) {
    const mission = api.getMission?.() || null;
    const winMax = api.getWinMax?.() || mission?.winMax || {};
    const next = cloneBoard(board());
    if (!next.pathwayImpacts[fp]) return;
    const prev = next.pathwayImpacts[fp];
    next.pathwayImpacts[fp] = {
      ...prev,
      crisisDelta: opts.keepCrisisDelta
        ? prev.crisisDelta || emptyCrisisDelta()
        : score.crisisDelta || emptyCrisisDelta(),
      concerns: score.concerns || {},
      pending: false,
      concernsPending: false,
      concernKey: scoredConcernKey ?? "",
    };
    setBoard(next);
    const applied = applyPathwayPressure(board(), { winMax });
    setBoard(applied.board);
    api.setPressure?.(applied.displayPressure);
    ensureUi()?.render();
    api.onBoardPainted?.();
  }

  function dockedConcernScoreOpts(board, inventions) {
    const docked = concernsReachedFromPathway(board, inventions);
    const concernAnswers = {};
    const concernAngles = [];
    const concerns = [];
    for (const t of docked) {
      if (!t.angle) continue;
      concernAngles.push(t.angle);
      const reply = concernReplyText(t);
      const pose = concernPoseText(t);
      concernAnswers[t.angle] = reply.answer || "";
      concerns.push({
        angle: t.angle,
        challengeSpeech: pose.speech || null,
        challengeQuestion: pose.question || null,
        playerAnswer: reply.answer || null,
        answerQuality: reply.quality,
        priorLevel: t.lamp || "red",
        inventChanged: concernInventChanged(t, inventions, board),
        posedHowText: String(t.posedHowText || "").slice(0, 1600),
      });
    }
    return { concernAngles, concernAnswers, concerns };
  }

  async function runPathwayScore(fp, signal) {
    const year = api.getYear();
    const mission = api.getMission?.() || null;
    const winMax = api.getWinMax?.() || mission?.winMax || {};

    try {
      if (signal?.aborted) return;
      const b = board();
      const impact = b.pathwayImpacts?.[fp];
      if (!impact || !(impact.pending || impact.concernsPending)) return;
      const keepCrisisDelta = !impact.pending && Boolean(impact.concernsPending);

      const inventions = (impact.inventionIds || [])
        .map((id) => b.tiles?.[id])
        .filter((t) => t && t.kind === TILE_KIND.invention);

      const { concernAngles, concernAnswers, concerns } = dockedConcernScoreOpts(
        b,
        inventions
      );
      const heurOpts = { concernAngles, concernAnswers };

      let score;
      if (!api.coInvent) {
        score = heuristicPathwayScore(inventions, year, heurOpts);
      } else {
        try {
          const data = await api.coInvent("score-pathway", "[Score pathway]", {
            pathway: {
              fingerprint: fp,
              howText: islandHowForAi(b, inventions),
              inventions: inventions.map((n) => ({
                techId: n.techId,
                year: n.year,
                howText: n.howText,
                feasibilityPct: n.feasibilityPct,
                timingLevel: n.timingLevel || null,
              })),
            },
            year,
            place: api.getPlace?.() || "",
            missionTitle: api.getMissionTitle?.() || "",
            scene: String(mission?.scene || "").slice(0, 600),
            grounding: api.getGrounding?.() || null,
            pressureBase: b.pressureBase || {},
            winMax,
            crisisRoles: Object.values(b.tiles || {})
              .filter((t) => t.kind === TILE_KIND.crisis)
              .map((t) => ({
                role: t.role,
                name: t.name,
                meterKey: t.meterKey || t.name,
                description: String(t.description || "").slice(0, 400),
              })),
            concerns,
            signal,
          });
          if (signal?.aborted) return;
          score = normalizePathwayScore(data);
          const local = heuristicPathwayScore(inventions, year, heurOpts);
          const cd = score.crisisDelta;
          const cdEmpty =
            !cd ||
            (cd.local === 0 && cd.global === 0 && cd.support === 0);
          score = {
            crisisDelta: cdEmpty && !Object.keys(score.concerns || {}).length
              ? local.crisisDelta
              : cd || local.crisisDelta,
            concerns: {
              ...local.concerns,
              ...(score.concerns || {}),
            },
          };
        } catch (e) {
          if (isAbortError(e) || signal?.aborted) return;
          console.warn("[score-pathway]", e.message || e);
          score = heuristicPathwayScore(inventions, year, heurOpts);
        }
      }
      if (signal?.aborted) return;
      const docked = concernsReachedFromPathway(b, inventions);
      if (score?.concerns) {
        for (const t of docked) {
          const row = score.concerns[t.angle];
          if (!row) continue;
          const hasAnswer = Boolean(String(t.playerAnswer || "").trim());
          const allowImprove =
            hasAnswer || concernInventChanged(t, inventions, b);
          const prior =
            t.lamp === "yellow" || t.lamp === "green" || t.lamp === "red"
              ? t.lamp
              : "red";
          row.level = clampConcernLamp(prior, row.level, allowImprove);
        }
      }
      applySettledPathwayScore(
        fp,
        score,
        pathwayConcernScoreKey(b, inventions),
        { keepCrisisDelta }
      );
    } finally {
      const job = pathwayJobs.get(fp);
      if (job && job.abort.signal === signal) {
        pathwayJobs.delete(fp);
      }
      const impact = board()?.pathwayImpacts?.[fp];
      if (
        (impact?.pending || impact?.concernsPending) &&
        !pathwayJobs.has(fp)
      ) {
        schedulePathwayScore(fp);
      }
    }
  }

  /**
   * Offline / empty-AI lights from cluster priors (legacy; prefer syncPathwayScores).
   * @param {string[]|null} givenIds
   */
  function priorLightsForGivens(givenIds) {
    const b = board();
    const hctx = heuristicCtx();
    const givens = Object.values(b?.tiles || {}).filter((t) => {
      if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) return false;
      if (t.q == null || t.r == null) return false;
      if (givenIds && !givenIds.includes(t.id)) return false;
      return true;
    });
    return givens.map((g) => {
      const prior = assessGivenPrior(b, g, hctx);
      let level = prior.level;
      if (g.kind === TILE_KIND.concern && level === "green") level = "yellow";
      const heur = heuristicLamp(b, g, hctx);
      if (!prior.cluster?.anyTouch) level = heur;
      return {
        id: g.id,
        level,
        reason: prior.note || "heuristic",
      };
    });
  }

  function localTileTiming(tile, year) {
    const tech = tile.techId ? techById(tile.techId) : null;
    const techs = tech ? [tech] : [];
    const how = String(tile.howText || "").trim();
    const stretch = detectClaimStretch(how, techs, year);
    const fCtx = foresightCapabilityContext(year, techs, {
      globalId: api.getGlobal?.()?.id || api.getMission?.()?.globalId,
      seed: api.getMission?.()?.id,
    });
    return applyForesightToClaimStretch(stretch, how, fCtx);
  }

  function applyTimingToTile(tileId, level, reason, forKey) {
    const b = cloneBoard(board());
    const t = b.tiles[tileId];
    if (!t || t.kind !== TILE_KIND.invention) return b;
    t.timingLevel = level;
    t.timingReason = String(reason || "").slice(0, 400);
    t.feasibilityPct = timingLevelToPct(level);
    t.timingPending = false;
    t.timingForKey = forKey;
    timingCache.set(tileId, { level, reason: t.timingReason, forKey });
    return b;
  }

  /** After timing settles, re-fingerprint pathways (timing is in content key). */
  function afterTimingSettled(_tileId) {
    syncPathwayScores();
  }

  function settleTileTiming(tileId, level, reason, forKey) {
    setBoard(applyTimingToTile(tileId, level, reason, forKey));
    ensureUi()?.render();
    api.onBoardPainted?.();
    afterTimingSettled(tileId);
  }

  function markTimingPending(tileId, on) {
    const b = cloneBoard(board());
    const t = b.tiles[tileId];
    if (!t || t.kind !== TILE_KIND.invention) return;
    t.timingPending = Boolean(on);
    setBoard(b);
    ensureUi()?.render();
  }

  function scheduleTileTiming(tileId) {
    const tile = board()?.tiles?.[tileId];
    if (!tile || tile.kind !== TILE_KIND.invention) return;
    const year = api.getYear();
    const key = tileTimingCacheKey(tile, year);
    const cached = timingCache.get(tileId);
    if (cached?.forKey === key || tile.timingForKey === key) {
      if (
        cached &&
        tile.timingLevel !== cached.level &&
        (cached.level === "red" ||
          cached.level === "yellow" ||
          cached.level === "green")
      ) {
        settleTileTiming(tileId, cached.level, cached.reason, cached.forKey);
      }
      return;
    }

    // Freeze last settled timing for the snake; only seed yellow on first assess
    const hasSettled =
      tile.timingLevel === "red" ||
      tile.timingLevel === "yellow" ||
      tile.timingLevel === "green" ||
      tile.feasibilityPct != null;
    if (!hasSettled) {
      const local = localTileTiming(tile, year);
      const b = cloneBoard(board());
      const t = b.tiles[tileId];
      if (t) {
        t.timingLevel = local.level;
        t.timingReason = String(local.reason || "").slice(0, 400);
        t.feasibilityPct = timingLevelToPct(local.level);
        t.timingPending = true;
        t.timingForKey = null;
      }
      setBoard(b);
    } else {
      markTimingPending(tileId, true);
    }
    ensureUi()?.render();
    api.onBoardPainted?.();

    const prev = timingTimers.get(tileId);
    if (prev) clearTimeout(prev);
    const gen = (timingGens.get(tileId) || 0) + 1;
    timingGens.set(tileId, gen);
    timingTimers.set(
      tileId,
      setTimeout(() => {
        timingTimers.delete(tileId);
        runTileTiming(tileId, gen).catch((e) => console.warn("[hex timing]", e));
      }, 500)
    );
  }

  async function runTileTiming(tileId, gen) {
    if (timingGens.get(tileId) !== gen) return;
    const tile = board()?.tiles?.[tileId];
    if (!tile || tile.kind !== TILE_KIND.invention) return;
    const year = api.getYear();
    const key = tileTimingCacheKey(tile, year);
    if (!api.coInvent) {
      const local = localTileTiming(tile, year);
      if (timingGens.get(tileId) !== gen) return;
      settleTileTiming(tileId, local.level, local.reason, key);
      return;
    }
    try {
      const data = await api.coInvent("assess-feasibility", "[Assess tile timing]", {
        inventionHow: tile.howText || "",
        inventionImpact: "",
        inventionName: null,
        selectedTechIds: tile.techId ? [tile.techId] : [],
        year,
        place: api.getPlace?.() || "",
        grounding: api.getGrounding?.() || null,
      });
      if (timingGens.get(tileId) !== gen) return;
      const rawLevel = data.timing?.level || data.timingLevel;
      const reason = data.timing?.reason || data.timingNote || data.message || "";
      if (rawLevel && ["red", "yellow", "green"].includes(rawLevel)) {
        settleTileTiming(tileId, rawLevel, reason, key);
      } else {
        const local = localTileTiming(tile, year);
        settleTileTiming(tileId, local.level, local.reason, key);
      }
    } catch {
      const local = localTileTiming(tile, year);
      if (timingGens.get(tileId) !== gen) return;
      settleTileTiming(tileId, local.level, local.reason, key);
    }
  }

  async function retimeOnBoardInventions() {
    const onBoard = Object.values(board()?.tiles || {}).filter(
      (t) => t.kind === TILE_KIND.invention && t.q != null && t.r != null
    );
    for (const t of onBoard) {
      timingCache.delete(t.id);
      markTimingPending(t.id, true);
      const gen = (timingGens.get(t.id) || 0) + 1;
      timingGens.set(t.id, gen);
    }
    ensureUi()?.render();
    api.onBoardPainted?.();
    await Promise.all(
      onBoard.map((t) =>
        runTileTiming(t.id, timingGens.get(t.id)).catch((e) =>
          console.warn("[hex timing]", e)
        )
      )
    );
  }

  async function askForIdeas({ refresh = false } = {}) {
    if (!focusedTechId || isCreateBusy()) return;
    if (api.canEditBoard && !api.canEditBoard()) {
      api.flashToast?.("You can't add ideas on this board right now.");
      return;
    }
    const techId = focusedTechId;
    if (!refresh && hasUnplacedSparks(techId)) {
      renderIdeaCards();
      return;
    }
    const tech = techById(techId);
    const year = api.getYear();
    const place = api.getPlace?.() || "";
    const prevBatch = ensureSparkBatch(techId);
    const isRefresh = Boolean(refresh);
    const avoidTitles = prevBatch.titles.slice();

    let ideasOk = false;
    setCreateBusy("ideas", true);
    paintIdeaCardSkeletons();
    try {
      const pay = api.spendIdeaAp?.();
      if (pay && pay.ok === false) {
        api.flashToast?.(pay.reason || "Not enough AP");
        renderIdeaCards();
        return;
      }

      api.openLearnWhileIdeas?.(techId);

      const ctx = {
        focusTechId: techId,
        year,
        place,
        refresh: isRefresh,
        avoidTitles,
      };
      let ideas = [];
      if (api.coInvent) {
        try {
          const data = await api.coInvent(
            "idea-sparks",
            isRefresh ? "[Refresh ideas]" : "[Ask for ideas]",
            ctx
          );
          ideas = ideasOrFallback(data?.ideas, tech, ctx);
        } catch {
          ideas = isRefresh || avoidTitles.length
            ? rotateLocalIdeaSparks(tech, ctx, avoidTitles)
            : localIdeaSparks(tech, ctx);
        }
      } else {
        ideas = isRefresh || avoidTitles.length
          ? rotateLocalIdeaSparks(tech, ctx, avoidTitles)
          : localIdeaSparks(tech, ctx);
      }
      if (!ideas.length) {
        api.flashToast?.("Could not generate ideas — try again.");
        renderIdeaCards();
        return;
      }

      let b = board();
      if (isRefresh && prevBatch.ids.length) {
        b = removeUnplacedTiles(b, prevBatch.ids);
      }

      const mintedIds = [];
      const mintedTitles = [];
      for (const idea of ideas) {
        let artUrl = null;
        const artId = ideaImageId({
          techId,
          ideaId: idea.id,
          place,
          year,
        });
        if (api.fetchIdeaImage) {
          try {
            artUrl = await api.fetchIdeaImage({
              techId,
              ideaId: idea.id,
              artId,
              place,
              year,
              imagePrompt: idea.imagePrompt || idea.title,
            });
          } catch {
            /* ignore */
          }
        }
        const tile = mintInventionTile({
          techId,
          name: idea.title || "Idea",
          howText: idea.howText || idea.insertText || idea.blurb || "",
          year: idea.year || year,
          artUrl,
          artId,
          imagePrompt: idea.imagePrompt || null,
          feasibilityPct: null,
          origin: "sparks",
        });
        b = addTile(b, tile);
        mintedIds.push(tile.id);
        mintedTitles.push(tile.name);
      }
      sparkBatches.set(techId, { ids: mintedIds, titles: mintedTitles });
      setBoard(b);
      renderIdeaCards();
      ensureUi()?.render();
      ideasOk = true;
      api.flashToast?.(
        isRefresh
          ? `Refreshed ${ideas.length} idea tiles — drag them onto the board.`
          : `Minted ${ideas.length} idea tiles — drag them onto the board.`
      );
      api.onBoardPainted?.();
      api.commitBoard?.(b);
    } finally {
      api.finishLearnWhileIdeas?.({ succeeded: ideasOk });
      setCreateBusy("ideas", false);
    }
  }

  async function mintCustom() {
    if (!focusedTechId) {
      api.flashToast?.("Pick an emTech first.");
      return;
    }
    if (isCreateBusy()) return;
    if (api.canEditBoard && !api.canEditBoard()) {
      api.flashToast?.("You can't add ideas on this board right now.");
      return;
    }
    const techId = focusedTechId;
    const ta = document.querySelector("#hex-how-text");
    const how = String(ta?.value || "").trim();
    if (how.length < 12) {
      api.flashToast?.("Write a bit more about how it works.");
      return;
    }
    setCreateBusy("mint", true);
    try {
      const year = api.getYear();
      const place = api.getPlace?.() || "";
      const name = how.split(/[.!?]/)[0].slice(0, 40) || "My idea";
      const ideaId = `custom-${Date.now()}`;
      const artId = ideaImageId({ techId, ideaId, place, year });
      let artUrl = null;
      if (api.fetchIdeaImage) {
        try {
          artUrl = await api.fetchIdeaImage({
            techId,
            ideaId,
            artId,
            place,
            year,
            imagePrompt: how.slice(0, 400),
          });
        } catch {
          /* ignore */
        }
      }
      const tile = mintInventionTile({
        techId,
        name,
        howText: how,
        year,
        artUrl,
        artId,
        feasibilityPct: null,
        origin: "custom",
      });
      const b = addTile(board(), tile);
      setBoard(b);
      if (ta) ta.value = "";
      renderIdeaCards();
      ensureUi()?.render();
      api.flashToast?.("Tile minted — drag it onto the board.");
      api.onBoardPainted?.();
      api.commitBoard?.(b);
    } finally {
      setCreateBusy("mint", false);
    }
  }

  function mintRd() {
    if (isCreateBusy()) return;
    if (api.canEditBoard && !api.canEditBoard()) {
      api.flashToast?.("You can't add ideas on this board right now.");
      return;
    }
    const pay = api.spendRdMint?.();
    if (pay && pay.ok === false) {
      api.flashToast?.(pay.reason || "Cannot mint R&D.");
      return;
    }
    const tile = mintRdTile({ year: api.getYear?.() || 2026 });
    const b = addTile(board(), tile);
    setBoard(b);
    renderIdeaCards();
    ensureUi()?.render();
    api.flashToast?.(
      `R&D ${formatFactor(tile.factor)} — drag it onto a pathway.`
    );
    api.onBoardPainted?.();
    api.commitBoard?.(b);
  }

  function prefersReducedMotion() {
    try {
      return Boolean(
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
      );
    } catch {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function convergenceTilePayload(t) {
    return {
      id: t.id,
      name: t.name || null,
      techId: t.techId || null,
      techName: t.techId ? techById(t.techId)?.name || null : null,
      howText: t.howText,
      polarity: t.polarity,
    };
  }

  function catalysisCopy(a, b) {
    const na = techById(a?.techId)?.name || a?.name || "one field";
    const nb = techById(b?.techId)?.name || b?.name || "the other";
    const title = `${na} × ${nb}`.slice(0, 60);
    return {
      title,
      reason: `Progress in ${na} honestly accelerates ${nb} — better capability, cost, or scale. More or better ${nb} then pulls demand back onto ${na}.`,
    };
  }

  function showConvergenceDialog({ title, reason, nameA, nameB, lines }) {
    const dlg = document.querySelector("#hex-convergence-dialog");
    if (!dlg) return Promise.resolve();
    const titleEl = document.querySelector("#hex-convergence-title");
    const metaEl = document.querySelector("#hex-convergence-meta");
    const reasonEl = document.querySelector("#hex-convergence-reason");
    const pctEl = document.querySelector("#hex-convergence-pct");
    const ok = document.querySelector("#hex-convergence-ok");
    if (titleEl) titleEl.textContent = title || "Convergence";
    if (metaEl) {
      const a = nameA || "This idea";
      const b = nameB || "that idea";
      metaEl.textContent = `${a} and ${b} catalyze each other — each gets a ${formatFactor(CONVERGENCE_FACTOR)} honesty boost.`;
    }
    if (reasonEl) reasonEl.textContent = reason || "";
    if (pctEl) {
      pctEl.textContent = Array.isArray(lines) && lines.length ? lines.join(" ") : "";
    }
    dlg.hidden = false;
    return new Promise((resolve) => {
      const done = () => {
        dlg.hidden = true;
        ok?.removeEventListener("click", done);
        dlg.removeEventListener("click", onBackdrop);
        resolve();
      };
      const onBackdrop = (e) => {
        if (e.target === dlg) done();
      };
      ok?.addEventListener("click", done);
      dlg.addEventListener("click", onBackdrop);
    });
  }

  async function presentConvergence(placedId, hit) {
    const neighborId = hit.neighborId;
    const b0 = board();
    const placed = b0?.tiles?.[placedId];
    const neighbor = b0?.tiles?.[neighborId];
    if (!placed || !neighbor) return;
    const key = convergencePairKey(placedId, neighborId);
    if (b0.convergences?.[key]) return;
    const factor = CONVERGENCE_FACTOR;
    const pctLine = (tile) => {
      const before = tileTimingPct(tile, b0);
      if (before == null) return null;
      const after = clampTimingPct(before * factor);
      const label = tile?.name || "This idea";
      return `${label} ${Math.round(before)}% → ${Math.round(after)}%.`;
    };
    const reduced = prefersReducedMotion();
    if (!reduced) {
      ensureUi()?.setPulsePair?.(placedId, neighborId);
      await sleep(900);
      ensureUi()?.setPulsePair?.(null, null);
    }
    if (!reduced) {
      await showConvergenceDialog({
        title: hit.title || "Convergence",
        reason: hit.reason,
        nameA: placed.name || "This idea",
        nameB: neighbor.name || "That idea",
        lines: [pctLine(placed), pctLine(neighbor)].filter(Boolean),
      });
    }
    const next = putConvergence(board(), placedId, neighborId, {
      factor,
      title: hit.title,
      reason: hit.reason,
    });
    setBoard(next);
    api.commitBoard?.(next);
    ensureUi()?.render();
    api.onBoardPainted?.();
  }

  async function evaluateConvergenceAfterPlace(tileId) {
    let b = pruneStaleConvergences(board());
    setBoard(b);
    const placed = board()?.tiles?.[tileId];
    if (
      !placed ||
      placed.kind !== TILE_KIND.invention ||
      placed.q == null ||
      placed.r == null
    ) {
      return;
    }
    const nabes = inventionNeighbors(board(), tileId);
    const fresh = nabes.filter((n) => {
      const key = convergencePairKey(tileId, n.id);
      return !board()?.convergences?.[key];
    });
    if (!fresh.length) return;

    // One pair at a time (A–B, then B–C). Never highlight more than two tiles.
    for (const n of fresh) {
      const current = board()?.tiles?.[tileId];
      const other = board()?.tiles?.[n.id] || n;
      if (!current || !other) continue;
      const key = convergencePairKey(tileId, other.id);
      if (board()?.convergences?.[key]) continue;

      ensureUi()?.setEvaluatingPairs?.([{ a: tileId, b: other.id }]);
      let hit = null;
      let usedAi = false;
      try {
        if (api.coInvent) {
          try {
            const data = await api.coInvent(
              "evaluate-convergence",
              "[Evaluate convergence]",
              {
                placed: convergenceTilePayload(current),
                neighbors: [convergenceTilePayload(other)],
                year: api.getYear?.(),
                place: api.getPlace?.(),
              }
            );
            usedAi = true;
            const row = (Array.isArray(data?.convergences)
              ? data.convergences
              : []
            ).find((c) => {
              const neighborId = c?.neighborId || c?.neighborId;
              const converges = c?.converges === true || c?.converges === true;
              return Boolean(c && converges && neighborId === other.id);
            });
            if (row) {
              hit = {
                neighborId: other.id,
                title: row.title,
                reason: row.reason,
              };
            }
          } catch (e) {
            console.warn("[evaluate-convergence]", e);
          }
        }
        if (!usedAi) {
          if (heuristicConverges(current, other)) {
            hit = {
              neighborId: other.id,
              ...catalysisCopy(current, other),
            };
          }
          if (!prefersReducedMotion()) await sleep(400);
        }
      } finally {
        ensureUi()?.setEvaluatingPairs?.(null);
      }
      if (hit) await presentConvergence(tileId, hit);
    }
  }

  /**
   * Draw one unused roster challenger at random, spin the pick reel, place an isolated tile.
   * Poses only the drawn angle (speech + question) — not all four critics.
   */
  async function summonNextChallenger() {
    if (summonBusy) return board();
    if (api.canSummonChallengers && !api.canSummonChallengers()) {
      api.flashToast?.(
        "Only this invent's owner can summon challengers."
      );
      return board();
    }
    let b = ensureConcernRoster(board());
    if (b !== board()) setBoard(b);
    const remaining = remainingConcernAngles(b);
    if (!remaining.length) return b;

    const isFirstDraw = concernAnglesOnBoard(b).length === 0;
    let paidFirstSummon = false;
    if (isFirstDraw && api.apEnabled?.()) {
      const pay = api.spendFirstSummonAp?.();
      if (pay && pay.ok === false) {
        api.flashToast?.(pay.reason || "No AP — End Turn or Wait first.", {
          resource: "ap",
        });
        return board();
      }
      paidFirstSummon = Boolean(pay && pay.ok !== false);
    }

    const pickAngle =
      remaining.length === 1
        ? remaining[0]
        : remaining[Math.floor(Math.random() * remaining.length)];
    const finalMeta =
      CHALLENGE_ANGLES.find((a) => a.id === pickAngle) || {
        id: pickAngle,
        label: CONCERN_LABELS[pickAngle] || pickAngle,
      };

    setCreateBusy("summon", true);
    api.setAiBusy?.(true, { summon: true });
    hideTilePopup();
    ensureUi()?.render();

    const statusEl =
      api.$?.("#hex-board-status") || document.querySelector("#hex-board-status");
    const prevStatus = statusEl?.textContent || "";
    const leftAfter = remaining.length - 1;
    if (statusEl) {
      statusEl.textContent =
        leftAfter > 0
          ? `Summoning ${finalMeta.label}… ${leftAfter} still to face.`
          : `Summoning ${finalMeta.label}… last challenger.`;
      statusEl.classList.remove("is-bad");
    }

    const hideReel = () => {
      const draw = document.querySelector("#hex-challenger-draw");
      if (draw) {
        draw.hidden = true;
        draw.setAttribute("hidden", "");
      }
      const track = document.querySelector("#hex-challenger-draw-reel");
      if (track) {
        track.innerHTML = "";
        track.style.transform = "";
      }
    };

    let placedOk = false;
    try {
      const place = api.getPlace?.() || "";
      const year = api.getYear?.() || 2026;
      const spawn = pickConcernSpawn(board());
      ensureUi()?.setHighlight?.({
        originId: spawn.inventionIds[0] || null,
        inventionIds: spawn.inventionIds.slice(),
        givenIds: [],
        spawnQ: spawn.q,
        spawnR: spawn.r,
      });
      const posedTiles = spawn.inventionIds
        .map((id) => board()?.tiles?.[id])
        .filter((t) => t && t.kind === TILE_KIND.invention);
      const howParts = [];
      const seenHow = new Set();
      for (const invs of listInventionPathways(board())) {
        if (!invs.some((t) => spawn.inventionIds.includes(t.id))) continue;
        const k = islandHowKey(invs);
        if (seenHow.has(k)) continue;
        seenHow.add(k);
        const text = islandHowForAi(board(), invs);
        if (text) howParts.push(text);
      }
      const pathwayLabel = pathwayArtLabel(posedTiles);
      const pathway = {
        inventions: posedTiles.map((n) => ({
          techId: n.techId,
          howText: String(n.howText || "").slice(0, 800),
          timingLevel: n.timingLevel || null,
        })),
        howText: howParts.join("\n\n"),
      };
      const hexBoard = summarizeBoardForScrutiny(board(), spawn.inventionIds);
      const local = localPose(pickAngle, { place });

      const until = (async () => {
        let speech = local.speech;
        let question = local.question;
        try {
          if (api.coInvent) {
            const data = await api.coInvent(
              "pose-challenge",
              "[Pose challenge]",
              {
                challengeAngle: pickAngle,
                hexBoard,
                pathway,
              }
            );
            speech =
              (data.challengeSpeech || data.message || "").trim() || local.speech;
            question =
              (data.challengeQuestion || "").trim() ||
              local.question ||
              "How does your invention survive this attack?";
          }
        } catch (e) {
          console.warn("[pose-challenge]", e?.message || e);
        }
        const imagePrompt = defaultChallengerImagePrompt(
          pickAngle,
          place,
          pathwayLabel
        );
        const artId = ideaImageId({
          techId: `challenger-${pickAngle}`,
          ideaId: `concern-${pickAngle}`,
          place,
          year,
        });
        let artUrl = null;
        if (api.fetchIdeaImage) {
          try {
            artUrl = await api.fetchIdeaImage({
              techId: `challenger-${pickAngle}`,
              ideaId: `concern-${pickAngle}`,
              artId,
              place,
              year,
              imagePrompt,
              kind: "challenger",
            });
          } catch {
            /* ignore */
          }
        }
        if (!artUrl && finalMeta.visual) artUrl = finalMeta.visual;
        return {
          challengeSpeech: speech,
          challengeQuestion: question,
          imagePrompt,
          artId,
          artUrl,
        };
      })();

      let enrich = null;
      if (api.playChallengerReel) {
        enrich = await api.playChallengerReel({
          until,
          mode: "pick",
          finalAngle: finalMeta,
          roster: CHALLENGE_ANGLES.slice(),
          spinStatus: `Summoning ${finalMeta.label}…`,
          landStatus: `${finalMeta.label} steps forward`,
        });
      } else {
        enrich = await until;
      }
      if (!enrich || typeof enrich !== "object") {
        try {
          enrich = await until;
        } catch {
          enrich = null;
        }
      }
      if (!enrich) {
        enrich = {
          challengeSpeech: local.speech,
          challengeQuestion: local.question,
          imagePrompt: defaultChallengerImagePrompt(
            pickAngle,
            place,
            pathwayLabel
          ),
          artUrl: finalMeta.visual || null,
        };
      }

      const placed = summonOneConcern(board(), pickAngle, {
        ...enrich,
        spawnQ: spawn.q,
        spawnR: spawn.r,
        posedInventionIds: spawn.inventionIds,
        posedFingerprints: spawn.fingerprints,
        posedHowText: spawn.howText,
      });
      if (!placed.ok) {
        api.flashToast?.(placed.error || "Could not place challenger");
        return board();
      }
      placedOk = true;
      setBoard(placed.board);
      ensureUi()?.setHighlight?.(null);
      ensureUi()?.render();
      syncPathwayScores();
      api.onBoardPainted?.();
      api.commitBoard?.(placed.board);

      const still = remainingConcernAngles(placed.board);
      if (statusEl) {
        statusEl.textContent = still.length
          ? `${finalMeta.label} is on the board — ${still.length} challenger${still.length === 1 ? "" : "s"} still to face.`
          : "Hard questions are on the board — ease their lights.";
      }
      api.flashToast?.(
        still.length
          ? `${finalMeta.label} arrives. ${still.length} left.`
          : "Required challengers are on the board — ease their lights."
      );
      return placed.board;
    } finally {
      if (paidFirstSummon && !placedOk) {
        api.refundFirstSummonAp?.();
      }
      hideReel();
      setCreateBusy("summon", false);
      api.setAiBusy?.(false);
      ensureUi()?.setHighlight?.(null);
      ensureUi()?.render();
      if (statusEl && statusEl.textContent.includes("Summoning")) {
        statusEl.textContent = prevStatus;
      }
    }
  }

  /** @deprecated use summonNextChallenger */
  async function summonHardQuestions() {
    return summonNextChallenger();
  }

  function refreshAfterYearChange() {
    retimeOnBoardInventions().catch((e) => console.warn("[hex retime]", e));
    // Year is not in pathway fingerprint; timing re-score will invalidate via afterTimingSettled
    syncPathwayScores();
    api.onBoardPainted?.();
  }

  let artResolveBusy = false;
  async function resolveMissingTileArt() {
    if (artResolveBusy || !api.fetchIdeaImage) return;
    const b = board();
    const missing = Object.values(b?.tiles || {}).filter(
      (t) => t && t.artId && !t.artUrl
    );
    if (!missing.length) return;
    artResolveBusy = true;
    try {
      let next = b;
      let changed = false;
      for (const t of missing) {
        let url = null;
        try {
          url = await api.fetchIdeaImage({
            artId: t.artId,
            imagePrompt: t.imagePrompt,
            techId: t.techId,
            ideaId: t.id,
            kind: t.kind === TILE_KIND.concern ? "challenger" : "idea",
          });
        } catch {
          /* ignore */
        }
        if (!url || !next.tiles?.[t.id]) continue;
        next = cloneBoard(next);
        next.tiles[t.id].artUrl = url;
        changed = true;
      }
      if (changed) {
        const live = cloneBoard(board());
        for (const t of missing) {
          const src = next.tiles?.[t.id];
          const dest = live.tiles?.[t.id];
          if (src?.artUrl && dest && !dest.artUrl) dest.artUrl = src.artUrl;
        }
        setBoard(live);
        ensureUi()?.render();
        renderTray();
      }
    } finally {
      artResolveBusy = false;
    }
  }

  function paint() {
    ensureUi()?.render();
    renderTray();
    updateCreatePanel();
    renderPathwayHowPanel();
    resolveMissingTileArt();
  }

  const EXPAND_LABEL = "Maximize hex board";
  const RESTORE_LABEL = "Restore hex board";

  function boardWrapEl() {
    return document.querySelector("#hex-board-wrap") || document.querySelector(".hex-board-wrap");
  }

  function boardDockEl() {
    return document.querySelector(".hex-board-dock");
  }

  function isBoardExpanded() {
    return Boolean(boardWrapEl()?.classList.contains("is-expanded"));
  }

  function syncExpandButton() {
    const btn = document.querySelector("#btn-hex-board-expand");
    if (!btn) return;
    const expanded = isBoardExpanded();
    btn.setAttribute("aria-pressed", expanded ? "true" : "false");
    btn.setAttribute("aria-label", expanded ? RESTORE_LABEL : EXPAND_LABEL);
    btn.title = expanded ? RESTORE_LABEL : EXPAND_LABEL;
  }

  function setBoardExpanded(want) {
    const wrap = boardWrapEl();
    const dock = boardDockEl();
    if (!wrap) return;
    const expanded = Boolean(want);
    if (expanded === isBoardExpanded()) {
      syncExpandButton();
      return;
    }
    if (expanded) {
      if (dock) dock.style.minHeight = `${wrap.offsetHeight}px`;
      wrap.classList.add("is-expanded");
      document.body.classList.add("hex-board-expanded");
    } else {
      wrap.classList.remove("is-expanded");
      document.body.classList.remove("hex-board-expanded");
      if (dock) dock.style.minHeight = "";
    }
    syncExpandButton();
  }

  function watchWorkshopLeave() {
    const ws = document.getElementById("screen-workshop");
    if (!ws || ws.dataset.hexExpandWatch === "1") return;
    ws.dataset.hexExpandWatch = "1";
    const obs = new MutationObserver(() => {
      if (!ws.classList.contains("active") && isBoardExpanded()) {
        setBoardExpanded(false);
      }
    });
    obs.observe(ws, { attributes: true, attributeFilter: ["class"] });
  }

  function wireDom() {
    document.querySelector("#btn-ask-ideas")?.addEventListener("click", () => {
      askForIdeas({ refresh: false }).catch((e) => console.warn(e));
    });
    document.querySelector("#btn-refresh-ideas")?.addEventListener("click", () => {
      askForIdeas({ refresh: true }).catch((e) => console.warn(e));
    });
    document.querySelector("#btn-mint-custom")?.addEventListener("click", () => {
      mintCustom().catch((e) => console.warn(e));
    });
    document.querySelector("#btn-mint-rd")?.addEventListener("click", () => {
      mintRd();
    });
    document.querySelector("#btn-hex-board-expand")?.addEventListener("click", () => {
      setBoardExpanded(!isBoardExpanded());
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const popup = document.querySelector("#hex-tile-popup");
      if (popup && !popup.hidden) {
        hideTilePopup();
        ensureUi()?.clearHighlight?.();
        e.preventDefault();
        return;
      }
      if (isBoardExpanded()) {
        setBoardExpanded(false);
        e.preventDefault();
      }
    });
    watchWorkshopLeave();
    syncExpandButton();
  }

  return {
    seedFromMission,
    focusTech,
    paint,
    wireDom,
    summonHardQuestions,
    summonNextChallenger,
    remainingConcernAngles: () => remainingConcernAngles(board()),
    refreshAfterYearChange,
    boardHolds: () => boardHolds(board()),
    getFocusedTechId: () => focusedTechId,
    isSummonBusy: () => summonBusy,
    isCreateBusy,
    createBusyKind,
    afterBoardChange,
    renderPathwayHowPanel,
    setIslandHowText: (inventions, text, source) => {
      setBoard(setIslandHow(board(), inventions, text, source), {
        skipRekey: true,
      });
      syncPathwayScores();
    },
    listPathways: () => listInventionPathways(board()),
    resolveIslandHow: (inventions) => resolveIslandHow(board(), inventions),
    syncPathwayScores,
    afterWaitPressureRise,
    exportSparkBatches: () => {
      const out = {};
      for (const [techId, batch] of sparkBatches.entries()) {
        if (!techId || !batch?.ids?.length) continue;
        out[techId] = {
          ids: [...batch.ids],
          titles: [...(batch.titles || [])],
        };
      }
      return Object.keys(out).length ? out : null;
    },
    importSparkBatches: (raw) => {
      sparkBatches.clear();
      if (raw && typeof raw === "object") {
        for (const [techId, batch] of Object.entries(raw)) {
          if (!techId || !batch || !Array.isArray(batch.ids) || !batch.ids.length) continue;
          sparkBatches.set(techId, {
            ids: batch.ids.map(String),
            titles: Array.isArray(batch.titles) ? batch.titles.map(String) : [],
          });
        }
      }
      const tiles = Object.values(board()?.tiles || {});
      const byTech = new Map();
      for (const t of tiles) {
        if (t?.kind !== TILE_KIND.invention) continue;
        if (t.q != null && t.r != null) continue;
        const tid = t.techId;
        if (!tid) continue;
        if (!byTech.has(tid)) byTech.set(tid, { ids: [], titles: [] });
        const row = byTech.get(tid);
        if (!row.ids.includes(t.id)) {
          row.ids.push(t.id);
          row.titles.push(t.name || "Idea");
        }
      }
      for (const [tid, batch] of byTech) {
        if (!sparkBatches.has(tid)) sparkBatches.set(tid, batch);
        else {
          const have = new Set(sparkBatches.get(tid).ids);
          for (const id of batch.ids) {
            if (have.has(id)) continue;
            sparkBatches.get(tid).ids.push(id);
            sparkBatches.get(tid).titles.push(batch.titles[batch.ids.indexOf(id)] || "Idea");
          }
        }
      }
    },
  };
}

/**
 * Traffic-light line for crisis / concern popups.
 * Hides internal "heuristic" reasons; shows real AI reasons when present.
 * @param {string|null|undefined} lamp
 * @param {string|null|undefined} lampReason
 * @param {"crisis"|"concern"} kind
 */
function lampExplainHtml(lamp, lampReason, kind, opts = {}) {
  const level = lamp === "green" || lamp === "yellow" || lamp === "red" ? lamp : "red";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  const reason = String(lampReason || "").trim();
  const showReason = reason && reason.toLowerCase() !== "heuristic";
  let meaning;
  if (kind === "crisis") {
    if (level === "green") {
      meaning =
        "eased. The connected invention pathway is holding this pressure down.";
    } else if (level === "yellow") {
      meaning =
        "strained. A pathway may be touching this tile, but it is not enough yet. Dock an invention against this hex to ease it.";
    } else {
      meaning =
        "hot — unanswered. Dock an invention against this hex to start easing it.";
    }
  } else {
    if (level === "green") {
      meaning =
        "addressed. Your written answer and/or the connected pathway honestly hold this critic's question.";
    } else if (level === "yellow") {
      meaning =
        "partially addressed. The written answer or pathway change is on the table, but the critic is not fully answered yet.";
    } else if (opts.answeredUndocked) {
      meaning =
        "unanswered at the light. Your answer is on file; the light stays red until a pathway touches.";
    } else {
      meaning =
        "unanswered. This veto stays red until you answer the critic or change the touching invent. Docking alone does not move the light.";
    }
  }
  const detail = showReason ? escapeHtml(reason) : meaning;
  return `<p><span class="hex-tile-popup-lamp ${escapeHtml(level)}"></span><strong>${escapeHtml(label)}</strong> — ${detail}</p>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compact board snapshot for scrutinize / pose. Optional inventionIds limits the invent. */
function summarizeBoardForScrutiny(board, inventionIds = null) {
  if (!board?.tiles) return null;
  const tiles = Object.values(board.tiles);
  const allow = inventionIds?.length ? new Set(inventionIds) : null;
  return {
    concernsSummoned: Boolean(board.concernsSummoned),
    inventions: tiles
      .filter((t) => t.kind === TILE_KIND.invention)
      .filter((t) => !allow || allow.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        techId: t.techId,
        polarity: t.polarity,
        year: t.year,
        howText: String(t.howText || "").slice(0, 400),
        onBoard: t.q != null && t.r != null,
        q: t.q,
        r: t.r,
      })),
    givens: tiles
      .filter((t) => t.kind === TILE_KIND.crisis || t.kind === TILE_KIND.concern)
      .map((t) => ({
        id: t.id,
        kind: t.kind,
        name: t.name,
        role: t.role || null,
        angle: t.angle || null,
        lamp: t.lamp,
        q: t.q,
        r: t.r,
      })),
  };
}

export function pathwayArtLabel(inventions) {
  const names = (inventions || [])
    .map((t) => t?.techId)
    .filter(Boolean)
    .slice(0, 3);
  return names.join(" · ") || "a local pathway";
}

export function defaultChallengerImagePrompt(angle, place, pathwayName) {
  const where = place || "this place";
  const path = pathwayName || "a local pathway";
  if (angle === "moloch") {
    return `Photoreal street scene in ${where}: competing incentives press on ${path} — freeriding neighbors vs careful design.`;
  }
  if (angle === "ethicist") {
    return `Photoreal documentary still in ${where}: a quiet ethical tension around ${path} — dignity, consent, who is left out.`;
  }
  if (angle === "stakeholder") {
    return `Photoreal city hall or community meeting in ${where}: officials and neighbors weighing whether to fund and permit ${path}.`;
  }
  return `Photoreal outdoor documentary still in ${where}: weather, materials, energy, or ecology pressing on ${path} — no text.`;
}
