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
  tileAt,
  gridFromBoard,
} from "./board-state.js";

const BITS_INK = "#38bdf8";
const ATOMS_INK = "#fb923c";
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
 * @param {(board: object, tileId: string|null, kind: "place"|"lift") => void} [opts.onBoardChange]
 * @param {(tileId: string) => void} [opts.onSelect]
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
    if (p.polarity === BITS) return { stroke: BITS_INK, lamp: false, level: null };
    if (p.polarity === ATOMS) return { stroke: ATOMS_INK, lamp: false, level: null };
    if (p.polarity === "split") return { stroke: BITS_INK, lamp: false, level: null };
    return { stroke: "#94a3b8", lamp: false, level: null };
  }

  function paintTile(g, p, cx, cy, size) {
    const t = theme(p);
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
    if (t.lamp) {
      const lampY = cy - size * 0.38;
      g.insertAdjacentHTML(
        "beforeend",
        `<circle cx="${cx}" cy="${lampY}" r="9" fill="${t.stroke}" opacity=".35"/>` +
          `<circle cx="${cx}" cy="${lampY}" r="5" fill="${t.stroke}" stroke="#fff" stroke-width="1.2"/>`
      );
    }
    const label = escapeXml((p.name || "").slice(0, 22));
    const fontSize = Math.max(15, Math.round(size * 0.2));
    g.insertAdjacentHTML(
      "beforeend",
      `<text x="${cx}" y="${cy + size * 0.16}" text-anchor="middle" fill="#fff" font-size="${fontSize}" font-family="system-ui,sans-serif" font-weight="700" style="paint-order:stroke;stroke:#070b14;stroke-width:3.5px">${label}</text>`
    );
    if (p.kind === TILE_KIND.invention) {
      const pct =
        p.feasibilityPct != null
          ? Math.max(0, Math.min(100, Number(p.feasibilityPct))) / 100
          : p.year && p.year > year()
            ? Math.max(0, (year() - 2026) / Math.max(1, p.year - 2026))
            : 1;
      const bw = size * 1.05;
      const bh = 9;
      const bx = cx - bw / 2;
      const by = cy + size * 0.28;
      const fillW = Math.max(0, Math.min(1, pct)) * (bw - 2);
      const fillCol =
        pct < 0.35 ? "#ef4444" : pct >= 0.99 ? "#22c55e" : "#eab308";
      g.insertAdjacentHTML(
        "beforeend",
        `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="#070b14" opacity=".72"/>` +
          `<rect x="${bx + 1}" y="${by + 1}" width="${fillW}" height="${bh - 2}" rx="1.5" fill="${fillCol}"/>`
      );
    }
  }

  function render() {
    const b = board();
    if (!b || !svg) return;
    const gmath = makeGrid(gridOpts);
    const parts = [
      `<defs><linearGradient id="hex-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset=".4" stop-color="#ffffff" stop-opacity=".07"/><stop offset="1" stop-color="#ffffff" stop-opacity=".03"/></linearGradient></defs>`,
    ];
    for (const s of slots) {
      const { x, y } = gmath.pixel(s.q, s.r);
      const valid = dragId ? slotValid(dragId, s.q, s.r) : false;
      parts.push(
        `<path class="hex-slot" data-q="${s.q}" data-r="${s.r}" d="${hexPath(x, y, gmath.size - 1)}" fill="${valid ? "rgba(56,189,248,.16)" : "rgba(148,163,184,.05)"}" stroke="rgba(148,163,184,.18)" stroke-dasharray="3 3"/>`
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
      parts.push(
        `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${col}" stroke-width="2"/>`
      );
      parts.push(
        `<rect x="${mx - 18}" y="${my - 7}" width="36" height="14" rx="3" fill="#070b14" stroke="${col}"/>`
      );
      parts.push(
        `<text x="${mx}" y="${my + 3}" text-anchor="middle" fill="${col}" font-size="9" font-family="system-ui">${verb}</text>`
      );
    }
    svg.innerHTML = parts.join("");
    svg.setAttribute("viewBox", HEX_BOARD_VIEW.viewBox);

    for (const t of Object.values(b.tiles || {})) {
      if (t.q == null || t.r == null) continue;
      if (dragId && t.id === dragId) continue; // ghost carries the tile
      const { x, y } = gmath.pixel(t.q, t.r);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.dataset.id = t.id;
      paintTile(g, t, x, y, gmath.size - 2);
      g.style.cursor = interactive() ? "grab" : "default";
      g.addEventListener("pointerdown", (e) => startDrag(e, t.id));
      g.addEventListener("click", () => {
        if (!interactive()) return;
        opts.onSelect?.(t.id);
      });
      svg.appendChild(g);
    }
  }

  function occupy(id, q, r) {
    if (!interactive()) {
      setStatus("Wait — challengers are still working.", true);
      return false;
    }
    const tile = board()?.tiles?.[id];
    if (tile && opts.canPlaceInvention) {
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
    const res = placeTile(board(), id, q, r);
    if (!res.ok) {
      const need = res.blockers?.[0]?.need;
      setStatus(
        need === "world"
          ? "Blue will not dock on orange — worlds must match."
          : need === "occupied"
            ? "That hex is taken."
            : "Cannot place there.",
        true
      );
      return false;
    }
    opts.setBoard(res.board);
    opts.onBoardChange?.(res.board, id, "place");
    setStatus("Placed.", false);
    render();
    return true;
  }

  function startDrag(e, id, dragOpts = {}) {
    if (!interactive()) {
      setStatus("Wait — challengers are still working.", true);
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
      const over = pointerOverBoard(ev.clientX, ev.clientY);
      const mode = over ? "hex" : "card";
      // Crisis/concern never become cards — stay hex while dragging
      const effective =
        tile.kind === TILE_KIND.invention ? mode : "hex";
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
      if (ctm && moved) {
        const loc = pt.matrixTransform(ctm.inverse());
        const hex = makeGrid(gridOpts).atPixel(loc.x, loc.y);
        if (slots.some((s) => s.q === hex.q && s.r === hex.r)) {
          placedOrLifted = occupy(id, hex.q, hex.r);
        } else if (
          !fromTray &&
          tile?.kind === TILE_KIND.invention &&
          tile.q != null &&
          tile.r != null
        ) {
          placedOrLifted = liftInvention(id);
          if (placedOrLifted) {
            setStatus("Lifted off the board — back in the tray.", false);
          }
        }
      } else if (!moved) {
        opts.onSelect?.(id);
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

  /** @type {HTMLElement|null} */
  let dragGhostEl = null;

  function destroyDragGhost() {
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
    hover = null;
    paintTile(g, tile, cx, cy, size);
    hover = prevHover;
    g.querySelectorAll("[fill='url(#hex-glass)']").forEach((el) => {
      el.setAttribute("fill", `url(#${uid})`);
    });
    mini.appendChild(g);
    btn.appendChild(mini);
    return btn;
  }

  function liftInvention(id) {
    const res = liftTile(board(), id);
    if (!res.ok) return false;
    opts.setBoard(res.board);
    opts.onBoardChange?.(res.board, id, "lift");
    render();
    return true;
  }

  return {
    render,
    startTrayDrag,
    liftInvention,
    occupy,
    refresh: render,
    createTrayTileElement,
    getDisplayedHexSizePx,
  };
}
