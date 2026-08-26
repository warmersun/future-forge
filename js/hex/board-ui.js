/**
 * Hex invent board SVG UI — glass tiles, world rims, traffic lamps, drag.
 * Browser-only. State lives in hexBoard; callers own persistence.
 */

import {
  BITS,
  ATOMS,
  CURVE,
  BITS_EDGES,
  ATOMS_EDGES,
  facePolarity,
  hexCorners,
  neighbor,
  makeGrid,
  canDock,
  rectSlots,
} from "./hex-tile-grid.js";
import {
  TILE_KIND,
  placeTile,
  liftTile,
  discardTile,
  tileAt,
  gridFromBoard,
  neighborTiles,
  isPortableTile,
  formatFactor,
} from "./board-state.js";
import { pathwayHighlight, tileTimingPct } from "./evaluate.js";
import { layoutHexLabel } from "./hex-label.js";

const BITS_INK = "#38bdf8";
const ATOMS_INK = "#f472b6";
const RD_INK = "#a78bfa";
const RYG = {
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
};

function hexPath(cx, cy, size) {
  return (
    hexCorners(cx, cy, size)
      .map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`)
      .join(" ") + "Z"
  );
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared board geometry — tray tiles match this scale on screen. */
export const HEX_BOARD_VIEW = {
  size: 100,
  origin: { x: 180, y: 120 },
  viewBox: "0 0 1400 900",
  viewW: 1400,
  viewH: 900,
  rows: 5,
  cols: 7,
  q0: 0,
  extraLeftRows: [1, 3],
};

/** Default axial slots for a rectangular workshop board (5×7, extra left on rows 2 and 4). */
export function defaultSlots() {
  return rectSlots({
    rows: HEX_BOARD_VIEW.rows,
    cols: HEX_BOARD_VIEW.cols,
    q0: HEX_BOARD_VIEW.q0,
    extraLeftRows: HEX_BOARD_VIEW.extraLeftRows,
  });
}

/**
 * @param {object} opts
 * @param {SVGElement} opts.svg
 * @param {() => object} opts.getBoard
 * @param {(board: object) => void} opts.setBoard
 * @param {() => number} opts.getYear
 * @param {(msg: string, bad?: boolean) => void} [opts.onStatus]
 * @param {(board: object, tileId: string|null, kind: "place"|"lift"|"discard") => void} [opts.onBoardChange]
 * @param {(tileId: string) => void} [opts.onInspect] — hover/focus tile details
 * @param {() => void} [opts.onInspectEnd] — left tile (grace hide so user can reach card)
 * @param {() => void} [opts.onInspectCancel] — immediate hide (pointerdown / drag)
 * @param {(tileId: string, hl: object|null) => void} [opts.onPathwayToggle] — click toggles pathway highlight
 * @param {() => boolean} [opts.isInteractive] — when false, drag/place/select no-op
 * @param {Array<{q:number,r:number}>} [opts.slots]
 */
export function createHexBoardUi(opts) {
  const svg = opts.svg;
  if (!svg) throw new Error("createHexBoardUi: svg required");
  const slots = opts.slots || defaultSlots();
  let dragId = null;
  let hover = null;
  let dragMoved = false;
  let dragStartXY = null;
  /** @type {{ originId?: string, inventionIds?: string[], givenIds?: string[], spawnQ?: number, spawnR?: number }|null} */
  let highlight = null;
  /** @type {{ a: string, b: string }|null} */
  let pulsePair = null;
  /** @type {{ a: string, b: string }[]} */
  let evaluatingPairs = [];
  const gridOpts = {
    size: HEX_BOARD_VIEW.size,
    origin: { ...HEX_BOARD_VIEW.origin },
  };

  function board() {
    return opts.getBoard();
  }

  function year() {
    return Number(opts.getYear?.() || 2026);
  }

  function interactive() {
    if (typeof opts.isInteractive === "function") return Boolean(opts.isInteractive());
    return true;
  }

  function setStatus(msg, bad) {
    opts.onStatus?.(msg, bad);
  }

  function isCoarsePointer() {
    try {
      return Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
    } catch {
      return false;
    }
  }

  function highlightSet() {
    if (!highlight) return null;
    const ids = new Set([
      highlight.originId,
      ...(highlight.inventionIds || []),
      ...(highlight.givenIds || []),
    ]);
    ids.delete(undefined);
    ids.delete(null);
    ids.delete("");
    return ids;
  }

  function isSpawnSlot(q, r) {
    return (
      highlight &&
      highlight.spawnQ != null &&
      Number(highlight.spawnQ) === q &&
      Number(highlight.spawnR) === r
    );
  }

  function tileInHighlight(tileId) {
    const set = highlightSet();
    if (!set) return true; // no highlight → all full strength
    return set.has(tileId);
  }

  function clearHighlight() {
    if (!highlight) return;
    highlight = null;
    render();
  }

  function togglePathway(tileId) {
    if (!interactive()) return;
    const tile = board()?.tiles?.[tileId];
    if (!tile || tile.q == null || tile.r == null) return;
    if (highlight?.originId === tileId) {
      highlight = null;
    } else {
      highlight = pathwayHighlight(board(), tileId);
    }
    opts.onPathwayToggle?.(tileId, highlight);
    render();
  }

  function pruneHighlight() {
    if (!highlight) return;
    if (highlight.spawnQ != null && highlight.spawnR != null && !highlight.originId) {
      return;
    }
    const b = board();
    const origin = b?.tiles?.[highlight.originId];
    if (!origin || origin.q == null || origin.r == null) {
      if (highlight.spawnQ == null) highlight = null;
      return;
    }
    // Refresh membership after place/lift
    highlight = {
      ...pathwayHighlight(b, highlight.originId),
      spawnQ: highlight.spawnQ,
      spawnR: highlight.spawnR,
    };
  }

  function inventDockOk(tile, other, dir) {
    if (tile.kind === TILE_KIND.invention && other.kind === TILE_KIND.invention) {
      return canDock(tile.polarity, other.polarity, dir);
    }
    return true;
  }

  function slotValid(tileId, q, r) {
    const b = board();
    const tile = b?.tiles?.[tileId];
    if (!tile) return false;
    const here = tileAt(b, q, r);
    if (here && here.id !== tileId) return false;
    for (let d = 0; d < 6; d++) {
      const n = neighbor(q, r, d);
      const other = tileAt(b, n.q, n.r);
      if (!other || other.id === tileId) continue;
      if (!inventDockOk(tile, other, d)) return false;
    }
    return true;
  }

  function theme(p) {
    if (p.kind === TILE_KIND.crisis || p.kind === TILE_KIND.concern) {
      const lv = p.lamp || "red";
      const stroke = RYG[lv] || RYG.red;
      return { stroke, lamp: true, level: lv };
    }
    if (p.kind === TILE_KIND.rd) {
      return { stroke: RD_INK, lamp: false, level: null };
    }
    if (p.polarity === BITS) return { stroke: BITS_INK, lamp: false, level: null };
    if (p.polarity === ATOMS) return { stroke: ATOMS_INK, lamp: false, level: null };
    if (p.polarity === "split") return { stroke: BITS_INK, lamp: false, level: null };
    return { stroke: "#94a3b8", lamp: false, level: null };
  }

  /**
   * RYG level for the pending snake rim, or null if not spinning.
   * Only crisis/concern tiles are evaluated — inventions never snake.
   * @param {object} p
   * @returns {"red"|"yellow"|"green"|null}
   */
  function pendingEvalLevel(p) {
    if (p.kind !== TILE_KIND.crisis && p.kind !== TILE_KIND.concern) return null;
    if (!p.lampPending) return null;
    const lv = String(p.lamp || "red").toLowerCase();
    return lv === "green" || lv === "yellow" || lv === "red" ? lv : "red";
  }

  function paintTile(g, p, cx, cy, size) {
    const t = theme(p);
    const dimmed = highlight && !tileInHighlight(p.id);
    const isOrigin = highlight && highlight.originId === p.id;
    if (dimmed) g.setAttribute("opacity", "0.28");
    else if (highlight && tileInHighlight(p.id)) g.setAttribute("opacity", "1");
    if (isOrigin) g.classList.add("hex-pathway-origin");
    if (
      pulsePair &&
      (p.id === pulsePair.a || p.id === pulsePair.b)
    ) {
      g.classList.add("hex-tile-pulse");
    }
    if (evaluatingPairs.some((pair) => pair.a === p.id || pair.b === p.id)) {
      g.classList.add("hex-tile-evaluating");
    }
    const clip = `clip-${escapeXml(p.id)}-${Math.round(cx)}-${Math.round(cy)}`;
    const d = hexPath(cx, cy, size);
    if (t.level === "green" || t.level === "yellow") {
      g.insertAdjacentHTML(
        "beforeend",
        `<path d="${hexPath(cx, cy, size + 8)}" fill="none" stroke="${t.stroke}" stroke-width="12" opacity=".22"/>`
      );
    }
    g.insertAdjacentHTML(
      "beforeend",
      `<clipPath id="${clip}"><path d="${d}"/></clipPath>`
    );
    if (p.artUrl) {
      const s = size * 1.95;
      g.insertAdjacentHTML(
        "beforeend",
        `<image href="${escapeXml(p.artUrl)}" x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>`
      );
    } else {
      g.insertAdjacentHTML("beforeend", `<path d="${d}" fill="#1e293b"/>`);
    }
    g.insertAdjacentHTML(
      "beforeend",
      `<path d="${d}" fill="url(#hex-glass)" pointer-events="none"/>` +
        `<ellipse cx="${cx - size * 0.12}" cy="${cy - size * 0.28}" rx="${size * 0.38}" ry="${size * 0.16}" fill="#fff" opacity=".14" clip-path="url(#${clip})" pointer-events="none"/>`
    );
    if (t.level === "red") {
      g.insertAdjacentHTML(
        "beforeend",
        `<path d="${d}" fill="#070b14" opacity=".55" pointer-events="none"/>`
      );
    }
    const future = p.kind === TILE_KIND.invention && p.year && p.year > year();
    if (future) {
      g.insertAdjacentHTML(
        "beforeend",
        `<path d="${d}" fill="#ffffff" opacity=".28" pointer-events="none"/>`
      );
    }
    const corners = hexCorners(cx, cy, size);
    for (let i = 0; i < 6; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % 6];
      let col = t.stroke;
      if (p.kind === TILE_KIND.invention && p.polarity === "split") {
        col = facePolarity(p.polarity, i) === BITS ? BITS_INK : ATOMS_INK;
      }
      const hot =
        hover && hover.id === p.id && hover.dirs && hover.dirs.includes(i);
      const w = hot ? 5.2 : t.level === "green" ? 5.2 : 3.4;
      g.insertAdjacentHTML(
        "beforeend",
        `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`
      );
    }
    g.insertAdjacentHTML(
      "beforeend",
      `<path d="${d}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1" pointer-events="none"/>`
    );
    // Pending eval: snake arc on rim in last settled RYG color
    const snakeLevel = pendingEvalLevel(p);
    if (snakeLevel) {
      const snakeCol = RYG[snakeLevel] || RYG.yellow;
      g.insertAdjacentHTML(
        "beforeend",
        `<path class="hex-eval-snake" d="${d}" fill="none" stroke="${snakeCol}" stroke-width="4.5" stroke-linecap="round" pathLength="100" stroke-dasharray="22 78" pointer-events="none" style="filter:drop-shadow(0 0 4px ${snakeCol})"/>`
      );
    }
    if (t.lamp) {
      const lampY = cy - size * 0.38;
      g.insertAdjacentHTML(
        "beforeend",
        `<circle cx="${cx}" cy="${lampY}" r="9" fill="${t.stroke}" opacity=".35"/>` +
          `<circle cx="${cx}" cy="${lampY}" r="5" fill="${t.stroke}" stroke="#fff" stroke-width="1.2"/>`
      );
    }
    const hasBar = p.kind === TILE_KIND.invention;
    const faceName =
      p.kind === TILE_KIND.rd
        ? `R&D ${formatFactor(p.factor)}`
        : p.name || "";
    const layout = layoutHexLabel(faceName, { size, hasBar, cy });
    const tspans = layout.lines
      .map(
        (line, i) =>
          `<tspan x="${cx}" y="${layout.lineYs[i]}">${escapeXml(line)}</tspan>`
      )
      .join("");
    const titleEl = layout.truncated
      ? `<title>${escapeXml(p.name || "")}</title>`
      : "";
    g.insertAdjacentHTML(
      "beforeend",
      `<text text-anchor="middle" fill="#fff" font-size="${layout.fontSize}" font-family="system-ui,sans-serif" font-weight="700" style="paint-order:stroke;stroke:#070b14;stroke-width:${layout.strokeWidth}px">${titleEl}${tspans}</text>`
    );
    if (hasBar) {
      const pending = Boolean(p.timingPending);
      const shown = tileTimingPct(p, board());
      const pct =
        shown != null ? Math.max(0, Math.min(100, Number(shown))) / 100 : null;
      const bw = size * 1.05;
      const bh = 9;
      const bx = cx - bw / 2;
      const by = layout.barY != null ? layout.barY : cy + size * 0.28;
      const fillW =
        pct == null ? 0 : Math.max(0, Math.min(1, pct)) * (bw - 2);
      const fillCol =
        pct == null
          ? "#64748b"
          : pct < 0.35
            ? "#ef4444"
            : pct >= 0.99
              ? "#22c55e"
              : "#eab308";
      g.insertAdjacentHTML(
        "beforeend",
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="#070b14" opacity=".72"/>` +
          (fillW > 0
            ? `<rect x="${bx + 1}" y="${by + 1}" width="${fillW}" height="${bh - 2}" rx="1.5" fill="${fillCol}"${pending ? ' opacity=".55"' : ""}/>`
            : "") +
          (pending
            ? `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3 2"/>`
            : "")
      );
    }
  }

  function render() {
    const b = board();
    if (!b || !svg) return;
    pruneHighlight();
    const gmath = makeGrid(gridOpts);
    const hlSet = highlightSet();
    const parts = [
      `<defs><linearGradient id="hex-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset=".4" stop-color="#ffffff" stop-opacity=".07"/><stop offset="1" stop-color="#ffffff" stop-opacity=".03"/></linearGradient></defs>`,
    ];
    for (const s of slots) {
      const { x, y } = gmath.pixel(s.q, s.r);
      const valid = dragId ? slotValid(dragId, s.q, s.r) : false;
      const spawn = isSpawnSlot(s.q, s.r);
      const fill = spawn
        ? "rgba(239,68,68,.28)"
        : valid
          ? "rgba(56,189,248,.16)"
          : "rgba(148,163,184,.05)";
      const stroke = spawn ? "rgba(239,68,68,.85)" : "rgba(148,163,184,.18)";
      const dash = spawn ? "0" : "3 3";
      parts.push(
        `<path class="hex-slot${spawn ? " hex-spawn-slot" : ""}" data-q="${s.q}" data-r="${s.r}" d="${hexPath(x, y, gmath.size - 1)}" fill="${fill}" stroke="${stroke}" stroke-width="${spawn ? "2.4" : "1"}" stroke-dasharray="${dash}"/>`
      );
    }
    if (
      highlight?.spawnQ != null &&
      highlight?.spawnR != null &&
      !slots.some((s) => s.q === highlight.spawnQ && s.r === highlight.spawnR)
    ) {
      const { x, y } = gmath.pixel(highlight.spawnQ, highlight.spawnR);
      parts.push(
        `<path class="hex-slot hex-spawn-slot" data-q="${highlight.spawnQ}" data-r="${highlight.spawnR}" d="${hexPath(x, y, gmath.size - 1)}" fill="rgba(239,68,68,.28)" stroke="rgba(239,68,68,.85)" stroke-width="2.4"/>`
      );
    }
    // bonds between inventions
    const live = gridFromBoard(b, gridOpts);
    for (const bond of live.bonds()) {
      const ta = b.tiles[bond.a.id];
      const tb = b.tiles[bond.b.id];
      if (!ta || !tb) continue;
      if (ta.kind !== TILE_KIND.invention || tb.kind !== TILE_KIND.invention) continue;
      const pa = gmath.pixel(bond.a.q, bond.a.r);
      const pb = gmath.pixel(bond.b.q, bond.b.r);
      const col =
        bond.polarity === BITS
          ? BITS_INK
          : bond.polarity === ATOMS
            ? ATOMS_INK
            : "#c4b5fd";
      const verb =
        bond.polarity === BITS ? "bits" : bond.polarity === ATOMS ? "atoms" : "fits";
      const mx = (pa.x + pb.x) / 2;
      const my = (pa.y + pb.y) / 2;
      const bondHot =
        !hlSet || (hlSet.has(bond.a.id) && hlSet.has(bond.b.id));
      const bondOpacity = bondHot ? "1" : "0.2";
      const strokeW = bondHot && hlSet ? "3.2" : "2";
      const pulse =
        pulsePair &&
        ((pulsePair.a === ta.id && pulsePair.b === tb.id) ||
          (pulsePair.a === tb.id && pulsePair.b === ta.id));
      const evaluating = evaluatingPairs.some(
        (pair) =>
          (pair.a === ta.id && pair.b === tb.id) ||
          (pair.a === tb.id && pair.b === ta.id)
      );
      const bondClass = pulse
        ? ' class="hex-bond-pulse"'
        : evaluating
          ? ' class="hex-bond-evaluating"'
          : "";
      const bondW = pulse || evaluating ? "4.2" : strokeW;
      parts.push(
        `<line${bondClass} x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${col}" stroke-width="${bondW}" opacity="${bondOpacity}"/>`
      );
      parts.push(
        `<rect x="${mx - 18}" y="${my - 7}" width="36" height="14" rx="3" fill="#070b14" stroke="${col}" opacity="${bondOpacity}"/>`
      );
      parts.push(
        `<text x="${mx}" y="${my + 3}" text-anchor="middle" fill="${col}" font-size="9" font-family="system-ui" opacity="${bondOpacity}">${verb}</text>`
      );
    }
    // R&D touching an invention — show the rolled factor on the edge
    for (const t of Object.values(b.tiles || {})) {
      if (t.kind !== TILE_KIND.rd || t.q == null || t.r == null) continue;
      for (const n of neighborTiles(b, t.id)) {
        if (n.kind !== TILE_KIND.invention) continue;
        const pa = gmath.pixel(t.q, t.r);
        const pb = gmath.pixel(n.q, n.r);
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2;
        const label = formatFactor(t.factor);
        parts.push(
          `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${RD_INK}" stroke-width="2.4" opacity="0.9"/>`
        );
        parts.push(
          `<rect x="${mx - 18}" y="${my - 7}" width="36" height="14" rx="3" fill="#070b14" stroke="${RD_INK}"/>`
        );
        parts.push(
          `<text x="${mx}" y="${my + 3}" text-anchor="middle" fill="${RD_INK}" font-size="9" font-family="system-ui">${label}</text>`
        );
      }
    }
    svg.innerHTML = parts.join("");
    svg.setAttribute("viewBox", HEX_BOARD_VIEW.viewBox);
    svg.classList.toggle(
      "has-pathway-highlight",
      Boolean(highlight && (highlight.originId || highlight.inventionIds?.length))
    );

    for (const t of Object.values(b.tiles || {})) {
      if (t.q == null || t.r == null) continue;
      if (dragId && t.id === dragId) continue; // ghost carries the tile
      const { x, y } = gmath.pixel(t.q, t.r);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.dataset.id = t.id;
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute(
        "aria-label",
        `${t.name || t.id}. Hover for details, click to highlight pathway.`
      );
      paintTile(g, t, x, y, gmath.size - 2);
      g.style.cursor = interactive() ? "grab" : "pointer";
      g.addEventListener("pointerdown", (e) => {
        if (!interactive()) {
          opts.onInspect?.(t.id);
          return;
        }
        startDrag(e, t.id);
      });
      g.addEventListener("pointerenter", () => {
        if (dragId) return;
        opts.onInspect?.(t.id);
      });
      g.addEventListener("pointerleave", () => {
        if (dragId) return;
        opts.onInspectEnd?.();
      });
      g.addEventListener("focus", () => {
        opts.onInspect?.(t.id);
      });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (interactive()) togglePathway(t.id);
          else opts.onInspect?.(t.id);
        }
      });
      svg.appendChild(g);
    }

    // Click empty board clears highlight
    svg.onclick = (e) => {
      if (e.target === svg || e.target?.classList?.contains("hex-slot")) {
        if (interactive()) clearHighlight();
        opts.onInspectEnd?.();
      }
    };
  }

  function occupy(id, q, r) {
    if (!interactive()) {
      setStatus("Wait — still working.", true);
      return false;
    }
    const beforeBoard = board();
    const tile = beforeBoard?.tiles?.[id];
    if (tile && tile.kind === TILE_KIND.invention && opts.canPlaceInvention) {
      const gate = opts.canPlaceInvention(tile);
      if (gate && gate.ok === false) {
        opts.onUnaffordablePlace?.(tile, gate);
        setStatus(
          gate.error === "stack full"
            ? "Stack full — lift a tile off the board first."
            : "Not enough resources to add this emTech to your stack.",
          true
        );
        return false;
      }
    }
    const res = placeTile(beforeBoard, id, q, r);
    if (!res.ok) {
      const need = res.blockers?.[0]?.need;
      setStatus(
        need === "world"
          ? "Blue will not dock on pink — worlds must match."
          : need === "occupied"
            ? "That hex is taken."
            : "Cannot place there.",
        true
      );
      return false;
    }
    opts.setBoard(res.board);
    opts.onBoardChange?.(res.board, id, "place", { beforeBoard });
    setStatus("Placed.", false);
    render();
    return true;
  }

  function startDrag(e, id, dragOpts = {}) {
    if (!interactive()) {
      setStatus("Wait — still working.", true);
      return;
    }
    const tile = board()?.tiles?.[id];
    if (!tile) return;
    const fromTray = Boolean(dragOpts.fromTray);
    const cardEl = dragOpts.cardEl || null;
    dragId = id;
    dragMoved = false;
    dragStartXY = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
    opts.onInspectCancel?.();
    hover = {
      id,
      dirs:
        tile.polarity === BITS
          ? BITS_EDGES
          : tile.polarity === ATOMS
            ? ATOMS_EDGES
            : [...BITS_EDGES, ...ATOMS_EDGES],
    };
    if (cardEl) cardEl.classList.add("is-dragging");
    // Remounting SVG here drops the pointer target — selection runs on
    // pointerup when the pointer did not move (tap). Tray buttons stay live.
    render();
    const ghost = ensureDragGhost(tile, { fromTray, cardEl });
    setGhostMode(ghost, fromTray ? "card" : "hex");
    positionGhost(ghost, e.clientX, e.clientY, fromTray ? "card" : "hex");
    ghost.style.opacity = "0";
    // Keep source card visible until the drag actually moves (tap ≠ drag)
    if (cardEl) cardEl.classList.remove("is-dragging");

    const onMove = (ev) => {
      if (!dragStartXY) return;
      const dx = ev.clientX - dragStartXY.x;
      const dy = ev.clientY - dragStartXY.y;
      if (dx * dx + dy * dy > 36) {
        if (!dragMoved) {
          if (cardEl) cardEl.classList.add("is-dragging");
          ghost.style.opacity = "1";
        }
        dragMoved = true;
      }
      if (
        dragMoved &&
        !fromTray &&
        isPortableTile(tile) &&
        ideasDropAvailable()
      ) {
        setIdeasDropArmed(true);
      }
      const overDiscard =
        isPortableTile(tile) &&
        pointerOverDiscard(ev.clientX, ev.clientY);
      setDiscardHot(overDiscard);
      const overIdeas =
        !overDiscard &&
        isPortableTile(tile) &&
        pointerOverIdeas(ev.clientX, ev.clientY);
      setIdeasHot(overIdeas);
      if (overDiscard) {
        setStatus("Release to throw away.", false);
      } else if (overIdeas) {
        setStatus("Release to return to Ideas.", false);
      }
      const over = pointerOverBoard(ev.clientX, ev.clientY);
      const mode = over && !overDiscard && !overIdeas ? "hex" : "card";
      // Crisis/concern never become cards — stay hex while dragging
      const effective =
        tile.kind === TILE_KIND.invention || tile.kind === TILE_KIND.rd
          ? mode
          : "hex";
      setGhostMode(ghost, effective);
      positionGhost(ghost, ev.clientX, ev.clientY, effective);
    };
    const up = (ev) => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", onMove);
      const moved = dragMoved;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const ctm = svg.getScreenCTM();
      let placedOrLifted = false;
      if (moved) {
        if (
          isPortableTile(tile) &&
          pointerOverDiscard(ev.clientX, ev.clientY)
        ) {
          placedOrLifted = discardInvention(id);
          if (placedOrLifted) {
            setStatus("Thrown away.", false);
          }
        } else if (
          !fromTray &&
          isPortableTile(tile) &&
          tile.q != null &&
          tile.r != null &&
          pointerOverIdeas(ev.clientX, ev.clientY)
        ) {
          placedOrLifted = liftInvention(id);
          if (placedOrLifted) {
            setStatus("Lifted off the board — back in Ideas.", false);
          }
        } else if (ctm) {
          const loc = pt.matrixTransform(ctm.inverse());
          const hex = makeGrid(gridOpts).atPixel(loc.x, loc.y);
          if (slots.some((s) => s.q === hex.q && s.r === hex.r)) {
            placedOrLifted = occupy(id, hex.q, hex.r);
          } else if (
            !fromTray &&
            isPortableTile(tile) &&
            tile.q != null &&
            tile.r != null
          ) {
            placedOrLifted = liftInvention(id);
            if (placedOrLifted) {
              setStatus("Lifted off the board — back in Ideas.", false);
            }
          }
        }
      } else if (!moved && !fromTray) {
        // Clear drag before toggle so render includes this tile
        destroyDragGhost();
        if (cardEl && !placedOrLifted) cardEl.classList.remove("is-dragging");
        dragId = null;
        hover = null;
        dragStartXY = null;
        dragMoved = false;
        togglePathway(id);
        if (isCoarsePointer()) opts.onInspect?.(id);
        return;
      }
      destroyDragGhost();
      if (cardEl && !placedOrLifted) cardEl.classList.remove("is-dragging");
      dragId = null;
      hover = null;
      dragStartXY = null;
      dragMoved = false;
      render();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
  }

  /**
   * Begin drag from tray / idea card (tile not yet on field).
   * @param {PointerEvent} e
   * @param {string} id
   * @param {{ cardEl?: HTMLElement }} [extra]
   */
  function startTrayDrag(e, id, extra = {}) {
    startDrag(e, id, { fromTray: true, cardEl: extra.cardEl || null });
  }

  function pointerOverBoard(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function discardWell() {
    return document.querySelector("#hex-discard");
  }

  function pointerOverDiscard(clientX, clientY) {
    const el = discardWell();
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function setDiscardHot(on) {
    discardWell()?.classList.toggle("is-hot", Boolean(on));
    dragGhostEl?.classList.toggle("is-discard", Boolean(on));
  }

  function ideasWell() {
    return document.querySelector("#hex-idea-cards");
  }

  function ideasDropAvailable() {
    const el = ideasWell();
    const body = document.querySelector("#hex-tile-create-body");
    if (!el || !body || body.hidden) return false;
    return true;
  }

  function setIdeasDropArmed(on) {
    ideasWell()?.classList.toggle("is-drop-armed", Boolean(on));
  }

  function pointerOverIdeas(clientX, clientY) {
    const el = ideasWell();
    if (!el || !el.classList.contains("is-drop-armed")) return false;
    const rect = el.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }

  function setIdeasHot(on) {
    ideasWell()?.classList.toggle("is-hot", Boolean(on));
    dragGhostEl?.classList.toggle("is-ideas", Boolean(on));
  }

  /** @type {HTMLElement|null} */
  let dragGhostEl = null;

  function destroyDragGhost() {
    setDiscardHot(false);
    setIdeasHot(false);
    setIdeasDropArmed(false);
    if (dragGhostEl) {
      dragGhostEl.remove();
      dragGhostEl = null;
    }
  }

  /**
   * @param {object} tile
   * @param {{ fromTray?: boolean, cardEl?: HTMLElement|null }} optsIn
   */
  function ensureDragGhost(tile, optsIn = {}) {
    destroyDragGhost();
    const ghost = document.createElement("div");
    ghost.id = "hex-drag-ghost";
    ghost.className = "hex-drag-ghost";
    ghost.setAttribute("aria-hidden", "true");

    const layers = document.createElement("div");
    layers.className = "hex-drag-ghost-layers";

    const cardLayer = document.createElement("div");
    cardLayer.className = "hex-drag-ghost-card";
    const cardInner = document.createElement("div");
    cardInner.className = "hex-drag-ghost-card-inner";
    const visual = document.createElement("div");
    visual.className = "hex-idea-card-visual";
    if (tile.artUrl) {
      const img = document.createElement("img");
      img.src = tile.artUrl;
      img.alt = "";
      visual.appendChild(img);
    } else {
      const fb = document.createElement("span");
      fb.className = "hex-idea-card-fallback";
      visual.appendChild(fb);
    }
    cardInner.appendChild(visual);
    const title = document.createElement("h4");
    title.className = "hex-idea-card-title";
    title.textContent = tile.name || "Idea";
    cardInner.appendChild(title);
    cardLayer.appendChild(cardInner);

    const hexLayer = document.createElement("div");
    hexLayer.className = "hex-drag-ghost-hex";
    const hexBtn = createTrayTileElement(tile);
    hexBtn.tabIndex = -1;
    hexLayer.appendChild(hexBtn);

    layers.appendChild(cardLayer);
    layers.appendChild(hexLayer);
    ghost.appendChild(layers);
    document.body.appendChild(ghost);
    dragGhostEl = ghost;
    return ghost;
  }

  function setGhostMode(ghost, mode) {
    if (!ghost) return;
    ghost.classList.toggle("is-card", mode === "card");
    ghost.classList.toggle("is-hex", mode === "hex");
  }

  function positionGhost(ghost, clientX, clientY, mode) {
    if (!ghost) return;
    const disp = getDisplayedHexSizePx();
    if (mode === "hex") {
      ghost.style.width = `${Math.round(disp.w)}px`;
      ghost.style.height = `${Math.round(disp.h)}px`;
    } else {
      ghost.style.width = "11rem";
      ghost.style.height = "auto";
      // Approximate card height so transform center feels stable
      ghost.style.height = "9.5rem";
    }
    ghost.style.left = `${Math.round(clientX)}px`;
    ghost.style.top = `${Math.round(clientY)}px`;
  }

  function getDisplayedHexSizePx() {
    const cw = svg.clientWidth || 1;
    const ch = svg.clientHeight || 1;
    const scale = Math.min(cw / HEX_BOARD_VIEW.viewW, ch / HEX_BOARD_VIEW.viewH);
    const size = gridOpts.size;
    return {
      w: Math.sqrt(3) * size * scale,
      h: 2 * size * scale,
      scale,
      size,
    };
  }

  /**
   * Tray / badge hex painted like the board.
   * @param {object} tile
   * @param {{ displayPx?: { w: number, h: number } }} [elOpts]
   * @returns {HTMLButtonElement}
   */
  function createTrayTileElement(tile, elOpts = {}) {
    const disp = getDisplayedHexSizePx();
    const size = gridOpts.size - 2;
    const vbW = Math.ceil(Math.sqrt(3) * gridOpts.size) + 16;
    const vbH = Math.ceil(2 * gridOpts.size) + 16;
    const cx = vbW / 2;
    const cy = vbH / 2;
    const pw = elOpts.displayPx?.w ?? Math.max(48, Math.round(disp.w));
    const ph = elOpts.displayPx?.h ?? Math.max(56, Math.round(disp.h));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hex-tray-tile";
    btn.dataset.id = tile.id;
    btn.dataset.polarity = tile.polarity || "curve";
    btn.style.width = `${pw}px`;
    btn.style.height = `${ph}px`;
    btn.title = "Drag onto the board";

    const uid = `hex-glass-tray-${escapeXml(tile.id)}-${Math.random().toString(36).slice(2, 7)}`;
    const mini = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mini.setAttribute("viewBox", `0 0 ${vbW} ${vbH}`);
    mini.setAttribute("width", "100%");
    mini.setAttribute("height", "100%");
    mini.setAttribute("aria-hidden", "true");
    mini.innerHTML = `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset=".4" stop-color="#ffffff" stop-opacity=".07"/><stop offset="1" stop-color="#ffffff" stop-opacity=".03"/></linearGradient></defs>`;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const prevHover = hover;
    const prevHighlight = highlight;
    hover = null;
    highlight = null;
    paintTile(g, tile, cx, cy, size);
    hover = prevHover;
    highlight = prevHighlight;
    g.querySelectorAll("[fill='url(#hex-glass)']").forEach((el) => {
      el.setAttribute("fill", `url(#${uid})`);
    });
    mini.appendChild(g);
    btn.appendChild(mini);
    return btn;
  }

  function liftInvention(id) {
    const beforeBoard = board();
    const res = liftTile(beforeBoard, id);
    if (!res.ok) return false;
    opts.setBoard(res.board);
    opts.onBoardChange?.(res.board, id, "lift", { beforeBoard });
    render();
    return true;
  }

  function discardInvention(id) {
    if (!interactive()) {
      setStatus("Wait — still working.", true);
      return false;
    }
    const beforeBoard = board();
    const res = discardTile(beforeBoard, id);
    if (!res.ok) return false;
    opts.setBoard(res.board);
    opts.onBoardChange?.(res.board, id, "discard", { beforeBoard });
    setStatus("Thrown away.", false);
    render();
    return true;
  }

  return {
    render,
    startTrayDrag,
    liftInvention,
    discardInvention,
    occupy,
    refresh: render,
    createTrayTileElement,
    getDisplayedHexSizePx,
    clearHighlight,
    getHighlight: () => highlight,
    setHighlight: (hl) => {
      highlight = hl && typeof hl === "object" ? hl : null;
      render();
    },
    setPulsePair: (a, b) => {
      pulsePair = a && b ? { a, b } : null;
      render();
    },
    setEvaluatingPairs: (pairs) => {
      evaluatingPairs = Array.isArray(pairs)
        ? pairs
            .filter((p) => p && p.a && p.b)
            .map((p) => ({ a: String(p.a), b: String(p.b) }))
        : [];
      render();
    },
  };
}
