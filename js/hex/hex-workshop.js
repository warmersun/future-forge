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
import {
  sanitizeScrutiny,
  localScrutinyProposals,
} from "../scrutiny-shared.js";
import {
  seedCrisisTiles,
  mintInventionTile,
  addTile,
  removeUnplacedTiles,
  summonOneConcern,
  remainingConcernAngles,
  ensureConcernRoster,
  boardHolds,
  techIdsFromBoard,
  deriveBoardProse,
  cloneBoard,
  applyLights,
  TILE_KIND,
  CRISIS_ROLE_DEFAULT_NAMES,
  CRISIS_ROLE_BLURBS,
  CONCERN_LABELS,
} from "./board-state.js";
import {
  applyHeuristicLights,
  buildNeighborEvalContext,
  normalizeNeighborLights,
  pressureAfterCrisisLamp,
} from "./lights.js";
import { createHexBoardUi } from "./board-ui.js";
import { polarityForTech } from "./polarity.js";

/**
 * @param {object} api — callbacks into game.js
 */
export function createHexWorkshop(api) {
  /** @type {ReturnType<typeof createHexBoardUi>|null} */
  let ui = null;
  let focusedTechId = null;
  let evalTimer = null;
  let evalGen = 0;
  let ideasBusy = false;
  let mintBusy = false;
  let summonBusy = false;
  /** @type {Record<string, { analysis?: string, safeguard?: string, imagePrompt?: string }>|null} */
  let scrutinyCache = null;
  /** @type {Map<string, { ids: string[], titles: string[] }>} */
  const sparkBatches = new Map();

  const BUSY_LABELS = {
    ideas: "Generating ideas…",
    mint: "Minting tile…",
    summon: "Challengers are reading your pathway…",
  };

  function isCreateBusy() {
    return ideasBusy || mintBusy || summonBusy;
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

  function hasSparkBatch(techId) {
    const batch = sparkBatches.get(techId || focusedTechId);
    return Boolean(batch?.ids?.length);
  }

  function syncCreateBusyUi(preferKind) {
    const panel = document.querySelector("#hex-tile-create");
    const pending = document.querySelector("#hex-create-pending");
    const pendingText = document.querySelector("#hex-create-pending-text");
    const busy = isCreateBusy();
    panel?.classList.toggle("is-busy", busy);
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
    const how = document.querySelector("#hex-how-text");
    if (askBtn) askBtn.disabled = busy || !focusedTechId;
    if (mintBtn) mintBtn.disabled = busy || !focusedTechId;
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

  function setBoard(b) {
    api.setBoard(b);
    syncDerivedProse();
  }

  function syncDerivedProse() {
    const prose = deriveBoardProse(board());
    api.setDerivedProse?.(prose);
    const ids = techIdsFromBoard(board());
    if (api.reconcileStackFromBoard) {
      api.reconcileStackFromBoard(ids);
    } else {
      api.setSelectedTechIds?.(ids);
    }
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
      onBoardChange: (b, tileId, kind) => {
        afterBoardChange(tileId, kind);
        api.commitBoard?.(b);
      },
      isInteractive: () => !summonBusy,
      onSelect: (id) => {
        if (summonBusy) return;
        const t = board()?.tiles?.[id];
        showTilePopup(id);
        if (t?.kind === TILE_KIND.invention && t.techId) {
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
    document
      .querySelector("#hex-tile-popup-close")
      ?.addEventListener("click", () => hideTilePopup());
    popup.addEventListener("click", (e) => {
      if (e.target === popup) hideTilePopup();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideTilePopup();
    });
    return popup;
  }

  function hideTilePopup() {
    const popup = document.querySelector("#hex-tile-popup");
    if (popup) popup.hidden = true;
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

  /** Place popup card near the tile (viewport-fixed), clamped into view. */
  function positionPopupNearTile(tileId) {
    const popup = document.querySelector("#hex-tile-popup");
    const card = popup?.querySelector(".hex-tile-popup-card");
    if (!popup || !card || popup.hidden) return;
    const anchor = findTileAnchor(tileId);
    const pad = 10;
    const rect = anchor?.getBoundingClientRect?.() || {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
      height: 0,
      bottom: window.innerHeight / 2,
      right: window.innerWidth / 2,
    };
    const cw = card.offsetWidth || 320;
    const ch = card.offsetHeight || 200;
    let left = rect.left + rect.width / 2 - cw / 2;
    let top = rect.bottom + pad;
    if (top + ch > window.innerHeight - pad) {
      top = rect.top - ch - pad;
    }
    if (top < pad) top = pad;
    left = Math.max(pad, Math.min(left, window.innerWidth - cw - pad));
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  function showTilePopup(tileId) {
    const popup = ensurePopupWired();
    const t = board()?.tiles?.[tileId];
    if (!popup || !t) return;
    const title = document.querySelector("#hex-tile-popup-title");
    const meta = document.querySelector("#hex-tile-popup-meta");
    const body = document.querySelector("#hex-tile-popup-body");
    const art = document.querySelector("#hex-tile-popup-art");
    if (title) title.textContent = t.name || "Tile";
    if (art) {
      art.onload = null;
      if (t.artUrl) {
        art.onload = () => positionPopupNearTile(tileId);
        art.src = t.artUrl;
        art.alt = t.name || "Tile art";
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
      } else {
        const tech = t.techId ? techById(t.techId) : null;
        const onField = t.q != null && t.r != null;
        meta.textContent = `Invention · ${tech?.name || t.techId || "idea"} · ${t.polarity || ""} · year ${t.year || "?"}${onField ? "" : " · in tray"}`;
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
        parts.push(lampExplainHtml(t.lamp, t.lampReason, "crisis"));
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
        if (t.analysis) {
          parts.push(
            `<p><strong>The hard question</strong></p><p>${escapeHtml(t.analysis)}</p>`
          );
        } else {
          parts.push(
            `<p>This is a hard-question tile — <strong>${escapeHtml(angleLabel)}</strong> presses your pathway until an invention answers it.</p>`
          );
        }
        if (t.safeguard) {
          parts.push(
            `<p><strong>What would address it</strong></p><p>${escapeHtml(t.safeguard)}</p>`
          );
        }
        parts.push(lampExplainHtml(t.lamp, t.lampReason, "concern"));
      } else {
        if (t.howText) {
          parts.push(`<p><strong>How it works</strong></p><p>${escapeHtml(t.howText)}</p>`);
        } else {
          parts.push(`<p class="muted">No how-it-works text yet.</p>`);
        }
        if (t.feasibilityPct != null) {
          parts.push(
            `<p>Feasibility bar: <strong>${Math.round(Number(t.feasibilityPct))}%</strong> honest this year.</p>`
          );
        }
        parts.push(
          `<p class="muted">World rim: ${escapeHtml(t.polarity || "?")} (bits left, atoms right).</p>`
        );
        if (t.q != null && t.r != null) {
          parts.push(
            `<p><button type="button" class="btn btn-ghost btn-sm" id="hex-tile-popup-lift" data-lift-id="${escapeHtml(t.id)}">Lift off board</button></p>`
          );
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
    }
    popup.hidden = false;
    requestAnimationFrame(() => positionPopupNearTile(tileId));
  }

  function seedFromMission(mission) {
    scrutinyCache = null;
    const b = seedCrisisTiles(mission || {});
    const lit = applyHeuristicLights(b, {
      year: api.getYear(),
      pressure: api.getPressure?.() || {},
      winMax: mission?.winMax || {},
    });
    setBoard(lit);
    ensureUi()?.render();
    renderTray();
    updateCreatePanel();
    api.onBoardPainted?.();
  }

  function focusTech(techId) {
    focusedTechId = techId || null;
    updateCreatePanel();
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
    if (body) body.hidden = !focusedTechId;
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
    const waiting = Object.values(b?.tiles || {}).filter(
      (t) => t.kind === TILE_KIND.invention && (t.q == null || t.r == null)
    );
    host.innerHTML = "";
    if (!waiting.length) {
      syncCreateBusyUi();
      return;
    }
    const uiInst = ensureUi();
    for (const t of waiting) {
      const card = document.createElement("article");
      card.className = "hex-idea-card";
      card.setAttribute("role", "listitem");
      card.dataset.tileId = t.id;
      card.dataset.id = t.id;
      card.title = "Drag onto the board";

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
      card.appendChild(visual);

      const body = document.createElement("div");
      body.className = "hex-idea-card-body";
      const title = document.createElement("h4");
      title.className = "hex-idea-card-title";
      title.textContent = t.name || "Idea";
      body.appendChild(title);
      const how = document.createElement("p");
      how.className = "hex-idea-card-how";
      how.textContent = t.howText || "No description yet.";
      body.appendChild(how);
      card.appendChild(body);

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
      card.appendChild(badge);

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

  function afterBoardChange(tileId, kind) {
    const lit = applyHeuristicLights(board(), {
      year: api.getYear(),
      pressure: api.getPressure?.() || {},
      winMax: api.getWinMax?.() || {},
    });
    setBoard(lit);
    ensureUi()?.render();
    renderTray();
    scheduleNeighborEval(tileId);
    api.onBoardPainted?.();
  }

  function scheduleNeighborEval(tileId) {
    clearTimeout(evalTimer);
    const gen = ++evalGen;
    evalTimer = setTimeout(() => {
      runNeighborEval(tileId, gen).catch((e) => console.warn("[hex eval]", e));
    }, 450);
  }

  async function runNeighborEval(tileId, gen) {
    if (!api.coInvent) return;
    const ctx = buildNeighborEvalContext(board(), {
      year: api.getYear(),
      place: api.getPlace?.() || "",
      missionTitle: api.getMissionTitle?.() || "",
      grounding: api.getGrounding?.() || null,
      pressure: api.getPressure?.() || {},
      winMax: api.getWinMax?.() || {},
    });
    if (!ctx.givens.length) return;
    try {
      const data = await api.coInvent("evaluate-neighbors", "[Evaluate board lights]", {
        hexEval: ctx,
      });
      if (gen !== evalGen) return;
      const lights = normalizeNeighborLights(data);
      if (!lights.length) return;
      let next = applyLights(board(), lights);
      // Pressure relief for green crisis lamps
      let pressure = { ...(api.getPressure?.() || {}) };
      let pressureChanged = false;
      for (const L of lights) {
        const t = next.tiles[L.id];
        if (t?.kind === TILE_KIND.crisis) {
          const before = pressure[t.meterKey || t.name];
          pressure = pressureAfterCrisisLamp(
            pressure,
            t,
            api.getWinMax?.() || {},
            L.level
          );
          if (pressure[t.meterKey || t.name] !== before) pressureChanged = true;
        }
      }
      setBoard(next);
      if (pressureChanged) api.setPressure?.(pressure);
      ensureUi()?.render();
      api.onBoardPainted?.();
    } catch (e) {
      console.warn("[evaluate-neighbors]", e.message || e);
    }
  }

  async function askForIdeas({ refresh = false } = {}) {
    if (!focusedTechId || isCreateBusy()) return;
    const tech = techById(focusedTechId);
    const year = api.getYear();
    const place = api.getPlace?.() || "";
    const prevBatch = sparkBatches.get(focusedTechId) || { ids: [], titles: [] };
    const isRefresh = Boolean(refresh || prevBatch.ids.length);
    const avoidTitles = isRefresh ? prevBatch.titles.slice() : [];

    setCreateBusy("ideas", true);
    paintIdeaCardSkeletons();
    try {
      const pay = api.spendIdeaAp?.();
      if (pay && pay.ok === false) {
        api.flashToast?.(pay.reason || "Not enough AP");
        renderIdeaCards();
        return;
      }

      const ctx = {
        focusTechId: focusedTechId,
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
          ideas = isRefresh
            ? rotateLocalIdeaSparks(tech, ctx, avoidTitles)
            : localIdeaSparks(tech, ctx);
        }
      } else {
        ideas = isRefresh
          ? rotateLocalIdeaSparks(tech, ctx, avoidTitles)
          : localIdeaSparks(tech, ctx);
      }
      if (!ideas.length) {
        api.flashToast?.("Could not generate ideas — try again.");
        renderIdeaCards();
        return;
      }

      let b = board();
      if (prevBatch.ids.length) {
        b = removeUnplacedTiles(b, prevBatch.ids);
      }

      const mintedIds = [];
      const mintedTitles = [];
      for (const idea of ideas) {
        let artUrl = null;
        if (api.fetchIdeaImage) {
          try {
            artUrl = await api.fetchIdeaImage({
              techId: focusedTechId,
              ideaId: idea.id,
              place,
              year,
              imagePrompt: idea.imagePrompt || idea.title,
            });
          } catch {
            /* ignore */
          }
        }
        const tile = mintInventionTile({
          techId: focusedTechId,
          name: idea.title || "Idea",
          howText: idea.howText || idea.insertText || idea.blurb || "",
          year: idea.year || year,
          artUrl,
          imagePrompt: idea.imagePrompt || null,
          feasibilityPct: 70,
          origin: "sparks",
        });
        b = addTile(b, tile);
        mintedIds.push(tile.id);
        mintedTitles.push(tile.name);
      }
      sparkBatches.set(focusedTechId, { ids: mintedIds, titles: mintedTitles });
      setBoard(b);
      renderIdeaCards();
      ensureUi()?.render();
      api.flashToast?.(
        isRefresh
          ? `Refreshed ${ideas.length} idea tiles — drag them onto the board.`
          : `Minted ${ideas.length} idea tiles — drag them onto the board.`
      );
      api.onBoardPainted?.();
      api.commitBoard?.(b);
    } finally {
      setCreateBusy("ideas", false);
    }
  }

  async function mintCustom() {
    if (!focusedTechId) {
      api.flashToast?.("Pick an emTech first.");
      return;
    }
    if (isCreateBusy()) return;
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
      let artUrl = null;
      if (api.fetchIdeaImage) {
        try {
          artUrl = await api.fetchIdeaImage({
            techId: focusedTechId,
            ideaId: `custom-${Date.now()}`,
            place,
            year,
            imagePrompt: how.slice(0, 400),
          });
        } catch {
          /* ignore */
        }
      }
      const tile = mintInventionTile({
        techId: focusedTechId,
        name,
        howText: how,
        year,
        artUrl,
        feasibilityPct: 60,
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

  /**
   * Draw one unused roster challenger at random, spin the pick reel, place an isolated tile.
   * Caches full four-angle scrutinize on the first draw.
   */
  async function summonNextChallenger() {
    if (summonBusy) return board();
    let b = ensureConcernRoster(board());
    if (b !== board()) setBoard(b);
    const remaining = remainingConcernAngles(b);
    if (!remaining.length) return b;

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

    try {
      const place = api.getPlace?.() || "";
      const year = api.getYear?.() || 2026;
      const prose = deriveBoardProse(board());
      const hexBoard = summarizeBoardForScrutiny(board());

      const until = (async () => {
        if (!scrutinyCache) {
          let scrutiny = null;
          try {
            if (api.coInvent) {
              const data = await api.coInvent(
                "scrutinize",
                "[Summon hard questions]",
                {
                  hexBoard,
                  inventionName: prose.inventionName,
                  inventionHow: prose.inventionHow,
                  inventionImpact: prose.inventionImpact,
                }
              );
              scrutiny =
                sanitizeScrutiny(data?.proposals?.scrutiny) ||
                sanitizeScrutiny(data?.scrutiny);
            }
          } catch (e) {
            console.warn("[scrutinize]", e?.message || e);
          }
          if (!scrutiny) {
            scrutiny = localScrutinyProposals({
              place,
              inventionName: prose.inventionName,
              inventionHow: prose.inventionHow,
            });
          }
          scrutinyCache = scrutiny;
        }

        const angleData = scrutinyCache[pickAngle] || {};
        const imagePrompt =
          angleData.imagePrompt ||
          defaultChallengerImagePrompt(
            pickAngle,
            place,
            prose.inventionName
          );
        let artUrl = null;
        if (api.fetchIdeaImage) {
          try {
            artUrl = await api.fetchIdeaImage({
              techId: `challenger-${pickAngle}`,
              ideaId: `concern-${pickAngle}`,
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
          analysis: angleData.analysis || null,
          safeguard: angleData.safeguard || null,
          imagePrompt,
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
        const local = localScrutinyProposals({
          place,
          inventionName: prose.inventionName,
          inventionHow: prose.inventionHow,
        });
        enrich = {
          analysis: local[pickAngle]?.analysis || null,
          safeguard: local[pickAngle]?.safeguard || null,
          imagePrompt: local[pickAngle]?.imagePrompt || null,
          artUrl: finalMeta.visual || null,
        };
      }

      const placed = summonOneConcern(board(), pickAngle, enrich);
      if (!placed.ok) {
        api.flashToast?.(placed.error || "Could not place challenger");
        return board();
      }
      const lit = applyHeuristicLights(placed.board, {
        year: api.getYear(),
        pressure: api.getPressure?.() || {},
        winMax: api.getWinMax?.() || {},
      });
      setBoard(lit);
      ensureUi()?.render();
      scheduleNeighborEval(null);
      api.onBoardPainted?.();
      api.commitBoard?.(lit);

      const still = remainingConcernAngles(lit);
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
      return lit;
    } finally {
      hideReel();
      setCreateBusy("summon", false);
      api.setAiBusy?.(false);
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
    const lit = applyHeuristicLights(board(), {
      year: api.getYear(),
      pressure: api.getPressure?.() || {},
      winMax: api.getWinMax?.() || {},
    });
    setBoard(lit);
    ensureUi()?.render();
    scheduleNeighborEval(null);
    api.onBoardPainted?.();
  }

  function paint() {
    ensureUi()?.render();
    renderTray();
    updateCreatePanel();
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
    afterBoardChange,
  };
}

/**
 * Traffic-light line for crisis / concern popups.
 * Hides internal "heuristic" reasons; shows real AI reasons when present.
 * @param {string|null|undefined} lamp
 * @param {string|null|undefined} lampReason
 * @param {"crisis"|"concern"} kind
 */
function lampExplainHtml(lamp, lampReason, kind) {
  const level = lamp === "green" || lamp === "yellow" || lamp === "red" ? lamp : "red";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  const reason = String(lampReason || "").trim();
  const showReason = reason && reason.toLowerCase() !== "heuristic";
  let meaning;
  if (kind === "crisis") {
    if (level === "green") {
      meaning =
        "eased. Neighboring inventions are holding this pressure down.";
    } else if (level === "yellow") {
      meaning =
        "strained. An idea may be touching this tile, but it is not enough yet. Dock an invention against this hex to ease it.";
    } else {
      meaning =
        "hot — unanswered. Dock an invention against this hex to start easing it.";
    }
  } else {
    if (level === "green") {
      meaning = "addressed. Evaluation judged a neighboring invention enough.";
    } else if (level === "yellow") {
      meaning =
        "strained. An idea is touching this tile, but green only comes after evaluation confirms the answer.";
    } else {
      meaning =
        "unanswered. Dock an invention against this hex; green only comes after evaluation.";
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

/** Compact board snapshot for scrutinize mode. */
function summarizeBoardForScrutiny(board) {
  if (!board?.tiles) return null;
  const tiles = Object.values(board.tiles);
  return {
    concernsSummoned: Boolean(board.concernsSummoned),
    inventions: tiles
      .filter((t) => t.kind === TILE_KIND.invention)
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

function defaultChallengerImagePrompt(angle, place, pathwayName) {
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
