import { listInventionPathways, visionPathwaysFromBoard, reasonsForCrisisTile, pathwayContentFingerprint, pathwayScoreLabel, resolveIslandHow, hexPathwayPanel, boardPathwayReevaluating } from './hex/evaluate.js?v=calm-stage-1';
import { isPathwayBoard, composePathwayHow, effectiveTiming, formatRdFactor } from './board/pathway-model.js';
import { hexToPixel } from './hex/hex-tile-grid.js';
import { createHexBoardUi, HEX_BOARD_VIEW } from './hex/board-ui.js?v=calm-stage-1';
import { plainTextFromMarkdown } from './md-lite.js';
import { crisisMeterLevel } from './sim/collapse.js';

const DEFAULT_CHALLENGE = 'Your move. How would you ease every crisis?';
const INK = '#edf3f6', MUTED = '#a8bac7', BG = '#0c1723';
const METER_COLORS = { cool: '#6ee7b7', warm: '#fbbf24', hot: '#f87171' };

export function puzzleDeltaColor(delta, pending = false) {
  return pending ? MUTED : delta < 0 ? METER_COLORS.cool : delta > 0 ? METER_COLORS.hot : INK;
}

export function puzzleMeter(value, goal) {
  if (value == null) return { value: null, color: MUTED };
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return { value: n, color: METER_COLORS[crisisMeterLevel(n, goal)] };
}

/** Actual pending work, not an unknown score on an empty or unscored board. */
export function puzzleHasPendingEvaluation(board) {
  if (isPathwayBoard(board)) {
    if (Object.values(board.pathways || {}).some(pw => (pw?.ingredients || []).some(ing => ing?.timingPending))) return true;
    if (Object.values(board.challengers || {}).some(ch => ch?.posePending || ch?.answerPending)) return true;
    if (Object.values(board.arguments || {}).some(arg => arg?.pending)) return true;
  }
  if (Object.values(board?.tiles || {}).some(t => t.timingPending || t.lampPending || t.verdictPending || t.answerPending)) return true;
  return listInventionPathways(board).some(island => {
    const impact = board?.pathwayImpacts?.[pathwayContentFingerprint(island, board)];
    return Boolean(impact?.pending || impact?.concernsPending);
  });
}

export function puzzleBriefBlocks(markdown) {
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: plainTextFromMarkdown(paragraph.join(' ')) });
    paragraph = [];
  };
  for (const line of String(markdown || '').split('\n')) {
    const heading = /^\s*#{1,6}\s+(.+)$/.exec(line);
    const bullet = /^\s*(?:[-*+] |\d+\. )(.+)$/.exec(line);
    if (heading || bullet || !line.trim()) {
      flush();
      if (heading || bullet) blocks.push({ type: heading ? 'heading' : 'bullet', text: plainTextFromMarkdown((heading || bullet)[1]) });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Copy only public game content. No account, chat, room code or session data. */
export function puzzleSnapshot({ mission, board, pressure, year, turn, visionUrl, lastFeasibilityLightLevel, techById = () => null }) {
  const panel = hexPathwayPanel(board);
  const pending = boardPathwayReevaluating(board);
  const evaluation = {
    level: pending && ['red', 'yellow', 'green'].includes(lastFeasibilityLightLevel)
      ? lastFeasibilityLightLevel : panel.overall,
    pending,
  };
  const tiles = Object.values(board?.tiles || {}).map(t => ({ ...t, name: t.name || techById(t.techId)?.name || t.kind }));
  const islands = listInventionPathways(board);
  const paths = visionPathwaysFromBoard(board, techById).map((p, i) => ({
    ...p, label: pathwayScoreLabel(islands[i]), fingerprint: pathwayContentFingerprint(islands[i], board),
    howText: resolveIslandHow(board, islands[i]).text,
    tileIds: islands[i].map(t => t.id),
  }));
  return {
    title: mission?.title || 'Future Forge puzzle', year, turn, visionUrl, evaluation,
    briefingBlocks: puzzleBriefBlocks(mission?.briefMd || mission?.scene || mission?.summary || 'No briefing available.'),
    briefing: String(mission?.briefMd || mission?.scene || mission?.summary || 'No briefing available.')
      .split(/\n\s*\n/).map(plainTextFromMarkdown).filter(Boolean).join('\n\n'),
    collapseYear: mission?.collapseYear,
    renderBoard: structuredClone(board || { tiles: {} }),
    tiles, paths,
    crises: tiles.filter(t => t.kind === 'crisis').map(t => {
      const key = t.meterKey || t.name;
      return { ...t, description: mission?.pressureDesc?.[key] || t.description,
        value: pressure?.[key] ?? null, goal: mission?.winMax?.[key] ?? null,
        scores: reasonsForCrisisTile(board, t).map(row => ({ ...row,
          // Keep the full stored rationale; the tooltip helper clips its display copy.
          reason: row.pending ? '' : board?.pathwayImpacts?.[row.fingerprint]?.crisisReasons?.[t.role || 'local'] || row.reason,
        })),
      };
    }),
  };
}

export function wrapText(ctx, value, width) {
  const lines = [];
  for (const paragraph of String(value ?? '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && ctx.measureText(`${line} ${word}`).width > width) { lines.push(line); line = ''; }
      // Long URLs / unbroken words must also fit the image.
      if (ctx.measureText(word).width > width) {
        if (line) { lines.push(line); line = ''; }
        for (const char of word) {
          if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
          line += char;
        }
      } else line += (line ? ' ' : '') + word;
    }
    lines.push(line);
  }
  return lines;
}

async function loadImage(url) {
  if (!url) return null;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; reject(new Error('Image loading timed out. Please try again.')); }, 15000);
    img.crossOrigin = 'anonymous';
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('An image could not be loaded for export. Please try again once the Future Vision has loaded.')); };
    img.src = url;
  });
}

/** Tight occupied-hex bounds, with room for the app's glowing rims. */
export function puzzleBoardBounds(tiles) {
  const placed = tiles.filter(t => t.q != null && t.r != null);
  if (!placed.length) return null;
  const { size, origin } = HEX_BOARD_VIEW;
  const points = placed.map(t => hexToPixel(t.q, t.r, size, origin));
  const dx = Math.sqrt(3) * size / 2 + 24, dy = size + 24;
  const x = Math.min(...points.map(p => p.x)) - dx;
  const y = Math.min(...points.map(p => p.y)) - dy;
  return { x, y, width: Math.max(...points.map(p => p.x)) + dx - x,
    height: Math.max(...points.map(p => p.y)) + dy - y };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/** Four-lane circuit for a pathway-board/v2 snapshot. Hex boards keep the SVG path. */
async function renderPathwayPuzzle(board, snapshot = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1040;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { boardImage: null, trayImage: null };

  const qYear = Number(snapshot.year ?? board.questYear ?? 2026) || 2026;
  ctx.fillStyle = '#09131d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top calendar + rules ribbon
  roundRectPath(ctx, 28, 22, canvas.width - 56, 54, 12);
  ctx.fillStyle = '#112231';
  ctx.fill();
  ctx.strokeStyle = '#244156';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#6ee7cb';
  ctx.font = '700 22px Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`NOW: ${qYear}   ·   CAUSAL PATHWAY BOARD`, 48, 49);

  const rules = (board.rules || []).map(r => r?.label || r?.text || String(r || '')).filter(Boolean);
  if (rules.length) {
    ctx.fillStyle = '#f4d77d';
    ctx.font = '600 19px Arial, sans-serif';
    const ruleLine = `Town rules: ${rules.slice(0, 3).join('  •  ')}`;
    ctx.fillText(wrapText(ctx, ruleLine, 980)[0] || '', 540, 49);
  }

  const laneSpecs = [
    { key: 'tech', title: '1 · TECH & MILESTONES', sub: 'Real curves & forecasts' },
    { key: 'use', title: '2 · USE CASES', sub: 'General unlocks' },
    { key: 'pathway', title: '3 · PATHWAY', sub: 'Local inventions & fusion' },
    { key: 'crisis', title: '4 · PROBLEM', sub: 'Plugged crises & stakes' },
  ];
  const laneW = 426;
  const laneGap = 52;
  const laneTop = 94;
  const laneH = canvas.height - laneTop - 26;
  const laneX = (i) => 28 + i * (laneW + laneGap);

  laneSpecs.forEach((spec, i) => {
    const x = laneX(i);
    roundRectPath(ctx, x, laneTop, laneW, laneH, 16);
    ctx.fillStyle = '#0f1f2d';
    ctx.fill();
    ctx.strokeStyle = '#20384b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6ee7cb';
    ctx.font = '700 21px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(spec.title, x + 18, laneTop + 16);
    ctx.fillStyle = MUTED;
    ctx.font = '400 17px Arial, sans-serif';
    ctx.fillText(spec.sub, x + 18, laneTop + 43);

    ctx.fillStyle = '#1e3547';
    ctx.fillRect(x + 16, laneTop + 68, laneW - 32, 2);
  });

  const techOut = new Map();
  const useIn = new Map();
  const useOut = new Map();
  const pathIn = new Map();
  const pathOut = new Map();
  const crisisIn = new Map();

  // Lane 1: Tech tracks & dealt milestones
  {
    const x = laneX(0) + 16;
    const w = laneW - 32;
    let cy = laneTop + 84;
    const tracks = Object.values(board.techTracks || {});
    const usesByTech = new Map();
    for (const uc of Object.values(board.useCases || {})) {
      if (!usesByTech.has(uc.techId)) usesByTech.set(uc.techId, []);
      usesByTech.get(uc.techId).push(uc);
    }
    if (!tracks.length) {
      ctx.fillStyle = MUTED;
      ctx.font = '400 20px Arial, sans-serif';
      ctx.fillText('No tech tracks added yet.', x + 8, cy + 12);
    }
    for (const track of tracks.slice(0, 6)) {
      const ucs = usesByTech.get(track.techId) || [];
      const msLabels = [...new Map(ucs.map(u => [
        u.milestoneId || u.milestoneYear,
        `${u.milestoneStatus === 'predicted' ? '◌ Forecast' : '● Reached'} ~${u.milestoneYear || qYear}${Number(u.milestoneYear) > qYear ? ' (ahead)' : ''}`
      ])).values()];
      const cardH = 74 + Math.min(2, msLabels.length) * 26;
      if (cy + cardH > laneTop + laneH - 14) break;
      roundRectPath(ctx, x, cy, w, cardH, 12);
      ctx.fillStyle = '#162c3f';
      ctx.fill();
      ctx.strokeStyle = '#2d526d';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.font = '700 22px Arial, sans-serif';
      const titleLine = wrapText(ctx, track.name || track.techId, w - 28)[0] || track.techId;
      ctx.fillText(titleLine, x + 14, cy + 14);

      ctx.fillStyle = '#7dd3fc';
      ctx.font = '600 16px Arial, sans-serif';
      ctx.fillText((track.world || 'tech').toUpperCase(), x + 14, cy + 44);

      msLabels.slice(0, 2).forEach((ms, idx) => {
        ctx.fillStyle = ms.includes('ahead') ? '#fda4af' : '#6ee7b7';
        ctx.font = '600 17px Arial, sans-serif';
        ctx.fillText(ms, x + 110, cy + 44 + idx * 24);
      });

      techOut.set(track.techId, { x: x + w, y: cy + cardH / 2 });
      cy += cardH + 14;
    }
  }

  // Lane 2: Use cases
  {
    const x = laneX(1) + 16;
    const w = laneW - 32;
    let cy = laneTop + 84;
    const useCases = Object.values(board.useCases || {});
    if (!useCases.length) {
      ctx.fillStyle = MUTED;
      ctx.font = '400 20px Arial, sans-serif';
      ctx.fillText('No use cases dealt yet.', x + 8, cy + 12);
    }
    for (const uc of useCases.slice(0, 8)) {
      ctx.font = '700 20px Arial, sans-serif';
      const lines = wrapText(ctx, uc.title || 'Use case', w - 28).slice(0, 2);
      const early = Number(uc.milestoneYear || 0) > qYear;
      const cardH = 48 + lines.length * 24;
      if (cy + cardH > laneTop + laneH - 14) break;

      roundRectPath(ctx, x, cy, w, cardH, 11);
      ctx.fillStyle = '#15293b';
      ctx.fill();
      ctx.strokeStyle = early ? '#e11d48' : '#2b4d66';
      ctx.setLineDash(early ? [8, 6] : []);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = INK;
      ctx.font = '700 20px Arial, sans-serif';
      lines.forEach((ln, idx) => ctx.fillText(ln, x + 14, cy + 12 + idx * 24));

      const statusTxt = `${uc.milestoneStatus === 'predicted' ? '◌ Forecast' : '● Reached'} ~${uc.milestoneYear || qYear}${early ? ' · Too early' : ''}`;
      ctx.fillStyle = early ? '#fda4af' : MUTED;
      ctx.font = '600 16px Arial, sans-serif';
      ctx.fillText(statusTxt, x + 14, cy + 16 + lines.length * 24);

      useIn.set(uc.id, { x, y: cy + cardH / 2, techId: uc.techId, early });
      useOut.set(uc.id, { x: x + w, y: cy + cardH / 2, early });
      cy += cardH + 12;
    }
  }

  // Lane 3: Pathways
  {
    const x = laneX(2) + 16;
    const w = laneW - 32;
    let cy = laneTop + 84;
    const pathways = Object.values(board.pathways || {});
    if (!pathways.length) {
      ctx.fillStyle = MUTED;
      ctx.font = '400 20px Arial, sans-serif';
      ctx.fillText('No pathways invented yet.', x + 8, cy + 12);
    }
    for (const pw of pathways.slice(0, 5)) {
      const timing = effectiveTiming(pw, board.useCases, qYear);
      const title = pw.title || (pw.ingredients || []).map(i => i.title).join(' + ') || 'Pathway';
      ctx.font = '700 21px Arial, sans-serif';
      const titleLines = wrapText(ctx, title, w - 28).slice(0, 2);
      const chips = (pw.ingredients || []).map(i => i.techId || 'human').join(' + ');
      const badges = [];
      if ((pw.convergences || []).length) badges.push('⚡ Convergence');
      if (pw.missingBridge) badges.push('⚠ Missing Bridge?');
      const rdList = board.rd?.[pw.id] || [];
      if (rdList.length) badges.push(`🧪 R&D ${formatRdFactor(rdList.at(-1).factor)}`);
      badges.push(`${timing.timingPct}% ${timing.timingLevel.toUpperCase()}`);

      ctx.font = '400 17px Arial, sans-serif';
      const howLines = wrapText(ctx, composePathwayHow(pw) || '', w - 28).slice(0, 3);
      const cardH = 72 + titleLines.length * 24 + howLines.length * 21;
      if (cy + cardH > laneTop + laneH - 14) break;

      roundRectPath(ctx, x, cy, w, cardH, 12);
      ctx.fillStyle = '#162d40';
      ctx.fill();
      ctx.strokeStyle = timing.early ? '#e11d48' : '#38bdf8';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 21px Arial, sans-serif';
      titleLines.forEach((ln, idx) => ctx.fillText(ln, x + 14, cy + 12 + idx * 24));

      let rowY = cy + 16 + titleLines.length * 24;
      ctx.fillStyle = '#6ee7cb';
      ctx.font = '600 16px Arial, sans-serif';
      ctx.fillText(wrapText(ctx, `${chips}  ·  ${badges.join(' · ')}`, w - 28)[0] || '', x + 14, rowY);
      rowY += 24;

      ctx.fillStyle = MUTED;
      ctx.font = '400 17px Arial, sans-serif';
      howLines.forEach((ln, idx) => ctx.fillText(ln, x + 14, rowY + idx * 21));

      pathIn.set(pw.id, { x, y: cy + cardH / 2 });
      pathOut.set(pw.id, { x: x + w, y: cy + cardH / 2 });
      cy += cardH + 14;
    }
  }

  // Lane 4: Crises
  {
    const x = laneX(3) + 16;
    const w = laneW - 32;
    let cy = laneTop + 84;
    const crisesById = new Map((snapshot.crises || []).map(c => [c.id, c]));
    const crises = Object.values(board.crises || {});
    for (const c of crises.slice(0, 5)) {
      const snapC = crisesById.get(c.id) || c;
      const lampColor = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }[c.lamp || 'red'] || '#ef4444';
      ctx.font = '700 22px Arial, sans-serif';
      const nameLines = wrapText(ctx, c.name || c.role || 'Crisis', w - 52).slice(0, 2);
      const roadblocks = Object.values(board.challengers || {}).filter(ch => {
        const wire = board.wires?.[ch.wireId];
        return wire && wire.crisisId === c.id;
      });
      const cardH = 66 + nameLines.length * 25 + (roadblocks.length ? 26 : 0);
      if (cy + cardH > laneTop + laneH - 14) break;

      roundRectPath(ctx, x, cy, w, cardH, 12);
      ctx.fillStyle = '#16293a';
      ctx.fill();
      ctx.strokeStyle = lampColor;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + 22, cy + 25, 8, 0, Math.PI * 2);
      ctx.fillStyle = lampColor;
      ctx.fill();

      ctx.fillStyle = INK;
      ctx.font = '700 22px Arial, sans-serif';
      nameLines.forEach((ln, idx) => ctx.fillText(ln, x + 38, cy + 13 + idx * 25));

      const meterVal = snapC.value != null ? `Meter ${snapC.value}/5` : `Lamp: ${(c.lamp || 'red').toUpperCase()}`;
      const deltaTxt = Number.isFinite(c.scoreDelta) && c.scoreDelta !== 0
        ? `  ·  ${c.scoreDelta > 0 ? '+' : ''}${c.scoreDelta} pressure`
        : '';
      let subY = cy + 18 + nameLines.length * 25;
      ctx.fillStyle = MUTED;
      ctx.font = '600 17px Arial, sans-serif';
      ctx.fillText(`${meterVal}${deltaTxt}`, x + 16, subY);

      if (roadblocks.length) {
        subY += 24;
        const ch = roadblocks[0];
        ctx.fillStyle = ch.lamp === 'red' ? '#fda4af' : '#fde68a';
        ctx.font = '700 16px Arial, sans-serif';
        ctx.fillText(`⚡ Roadblock: ${String(ch.angle || 'challenger').toUpperCase()} (${(ch.lamp || 'red').toUpperCase()})`, x + 16, subY);
      }

      crisisIn.set(c.id, { x, y: cy + cardH / 2 });
      cy += cardH + 14;
    }
  }

  // Draw Bezier wires across all 3 lane gaps
  const drawCurve = (p1, p2, color, dashed = false, width = 3.2) => {
    if (!p1 || !p2) return;
    const dx = Math.max(24, Math.abs(p2.x - p1.x) * 0.45);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed ? [9, 7] : []);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(p1.x + dx, p1.y, p2.x - dx, p2.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  };

  for (const [, uIn] of useIn.entries()) {
    const tOut = techOut.get(uIn.techId);
    drawCurve(tOut, uIn, uIn.early ? '#e11d48' : 'rgba(110, 231, 203, 0.55)', uIn.early, 2.4);
  }

  for (const pw of Object.values(board.pathways || {})) {
    const pIn = pathIn.get(pw.id);
    if (!pIn) continue;
    const ucIds = new Set((pw.ingredients || []).flatMap(i => i.useCaseIds || []));
    for (const ucId of ucIds) {
      const uOut = useOut.get(ucId);
      drawCurve(uOut, pIn, uOut?.early ? '#e11d48' : 'rgba(56, 189, 248, 0.65)', Boolean(uOut?.early), 2.8);
    }
  }

  for (const wire of Object.values(board.wires || {})) {
    const pOut = pathOut.get(wire.pathwayId);
    const cIn = crisisIn.get(wire.crisisId);
    if (!pOut || !cIn) continue;
    const early = wire.state === 'early';
    const crisisLamp = board.crises?.[wire.crisisId]?.lamp || 'red';
    const ch = Object.values(board.challengers || {}).find(row => row.wireId === wire.id);
    const blocked = ch && ch.lamp === 'red';
    const color = early
      ? '#e11d48'
      : blocked
        ? '#f59e0b'
        : crisisLamp === 'green'
          ? '#22c55e'
          : crisisLamp === 'yellow'
            ? '#eab308'
            : '#f87171';
    drawCurve(pOut, cIn, color, early || blocked, 4.2);
    if (ch) {
      const mx = (pOut.x + cIn.x) / 2;
      const my = (pOut.y + cIn.y) / 2;
      ctx.beginPath();
      ctx.arc(mx, my, 13, 0, Math.PI * 2);
      ctx.fillStyle = ch.lamp === 'red' ? '#ef4444' : '#eab308';
      ctx.fill();
      ctx.strokeStyle = '#09131d';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  const boardImage = await loadImage(canvas.toDataURL('image/png'));
  return { boardImage, trayImage: null };
}

/** Reuse the live renderer on a detached snapshot; no changes to the playing board. */
export async function renderPuzzleBoard(snapshot) {
  const board = snapshot.renderBoard || { tiles: Object.fromEntries((snapshot.tiles || []).map(t => [t.id, t])) };
  if (isPathwayBoard(board)) return renderPathwayPuzzle(board, snapshot);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const ui = createHexBoardUi({ svg, getBoard: () => board, getYear: () => snapshot.year, isInteractive: () => false });
  ui.render();
  const embedded = new Map();
  async function rasterize(root, bounds) {
    root.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    const scale = 2400 / Math.max(bounds.width, bounds.height);
    root.setAttribute('width', String(Math.ceil(bounds.width * scale)));
    root.setAttribute('height', String(Math.ceil(bounds.height * scale)));
    // SVG loaded as an image cannot fetch its own artwork. Embed it first.
    await Promise.all([...root.querySelectorAll('image')].map(async node => {
      const url = node.getAttribute('href');
      if (!embedded.has(url)) embedded.set(url, (async () => {
        const img = await loadImage(url);
        const art = document.createElement('canvas');
        art.width = img.naturalWidth; art.height = img.naturalHeight;
        art.getContext('2d').drawImage(img, 0, 0);
        return art.toDataURL('image/png');
      })());
      node.setAttribute('href', await embedded.get(url));
    }));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }));
    try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
  }
  const bounds = puzzleBoardBounds(snapshot.tiles);
  const boardImage = bounds ? await rasterize(svg, bounds) : null;
  const tray = snapshot.tiles.filter(t => t.q == null || t.r == null);
  let trayImage = null;
  if (tray.length) {
    const traySvg = document.createElementNS(ns, 'svg');
    const cols = Math.min(6, tray.length);
    tray.forEach((tile, i) => {
      const mini = ui.createTrayTileElement(tile).querySelector('svg');
      mini.setAttribute('x', String((i % cols) * 210));
      mini.setAttribute('y', String(Math.floor(i / cols) * 240));
      mini.setAttribute('width', '210'); mini.setAttribute('height', '240');
      traySvg.append(mini);
    });
    trayImage = await rasterize(traySvg, { x: 0, y: 0, width: cols * 210, height: Math.ceil(tray.length / cols) * 240 });
  }
  return { boardImage, trayImage };
}

/** Deterministic canvas composition: real game data, never AI-redrawn text or tiles. */
export async function renderPuzzle(snapshot, challenge = DEFAULT_CHALLENGE) {
  await document.fonts?.ready;
  const hero = await loadImage(snapshot.visionUrl);
  const { boardImage, trayImage } = await renderPuzzleBoard(snapshot);
  const width = 3840, height = 2160, margin = 56, content = 1114;
  const fullWidth = width - 2 * margin;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable in this browser.');
  const commands = [];
  const groups = new Map();
  let currentGroup;
  let y = 74;
  function begin(name, groupWidth = content) {
    if (currentGroup) { currentGroup.end = y; currentGroup.to = commands.length; }
    currentGroup = { start: y, from: commands.length, width: groupWidth };
    groups.set(name, currentGroup);
  }
  function text(value, { size = 38, color = INK, weight = 400, x = margin, w = content, gap = 14 } = {}) {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    const lines = wrapText(ctx, value, w), top = y, lineHeight = size * 1.25;
    commands.push(() => {
      ctx.font = `${weight} ${size}px Arial, sans-serif`; ctx.fillStyle = color; ctx.textBaseline = 'top';
      lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineHeight));
    });
    y += lines.length * lineHeight + gap;
  }
  function section(label) {
    y += 14;
    const top = y;
    commands.push(() => { ctx.fillStyle = '#2b4050'; ctx.fillRect(margin, top, content, 2); });
    y += 18;
    text(label.toUpperCase(), { size: 30, color: '#6ee7cb', weight: 700, gap: 18 });
  }
  begin('header', width - 2 * margin);
  text('FUTURE FORGE     /     THE INVENTING PUZZLE', { size: 28, color: '#6ee7cb', weight: 700, gap: 12, w: fullWidth });
  const titleTop = y;
  const level = snapshot.evaluation?.level || 'red';
  commands.push(() => {
    const color = { red: '#ef4444', yellow: '#eab308', green: '#22c55e' }[level];
    const cx = margin + 34, cy = titleTop + 51;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 27, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#edf3f6'; ctx.lineWidth = 3; ctx.stroke();
  });
  text(snapshot.title, { size: 84, weight: 700, gap: 8, x: margin + 104, w: fullWidth - 104 });
  text(`YEAR ${snapshot.year ?? '—'}   •   TURN ${snapshot.turn ?? '—'}${snapshot.collapseYear ? `   •   COLLAPSE YEAR ${snapshot.collapseYear}` : ''}`, { size: 30, color: MUTED, gap: 10, w: fullWidth });
  if (snapshot.evaluation?.pending) text('Pathway re-evaluating · showing the last settled light', { size: 28, color: MUTED, gap: 12, w: fullWidth });
  text(challenge.trim() || DEFAULT_CHALLENGE, { size: 42, weight: 700, color: '#f4d77d', gap: 10, w: fullWidth });
  begin('vision');
  if (hero) {
    const top = y;
    const h = Math.round(content * hero.height / hero.width);
    commands.push(() => { ctx.drawImage(hero, margin, top, content, h); });
    y += h + 12;
    text('FUTURE VISION  /  The world at this moment', { size: 28, color: MUTED });
  } else text('FUTURE VISION  /  No image generated yet', { size: 30, color: MUTED });
  begin('briefing');
  section('The briefing');
  const cardTop = y;
  let cardBottom;
  commands.push(() => {
    ctx.fillStyle = '#132534'; ctx.fillRect(margin, cardTop, content, cardBottom - cardTop);
    ctx.fillStyle = '#6ee7cb'; ctx.fillRect(margin, cardTop, 5, cardBottom - cardTop);
  });
  y += 22;
  let objective = false;
  for (const block of snapshot.briefingBlocks || [{ type: 'paragraph', text: snapshot.briefing }]) {
    if (block.type === 'heading') {
      objective = /your (job|mission|task|challenge)|objective/i.test(block.text);
      y += 8;
      text(block.text.toUpperCase(), { size: 30, weight: 700, color: objective ? '#f4d77d' : '#6ee7cb', x: margin + 24, w: content - 48, gap: 10 });
    } else {
      text(`${block.type === 'bullet' ? '•  ' : ''}${block.text}`, { size: objective ? 39 : 36, weight: objective ? 700 : 400, color: objective ? '#f4d77d' : INK, x: margin + 24, w: content - 48, gap: 18 });
    }
  }
  y += 8;
  cardBottom = y;
  begin('board');
  section('The board');
  text('Read the position. Find a pathway that changes the outcome.', { color: MUTED, size: 30 });
  function boardPicture(img, maxHeight) {
    const h = Math.min(maxHeight, content * img.height / img.width);
    const w = h * img.width / img.height, top = y;
    commands.push(() => { ctx.drawImage(img, margin + (content - w) / 2, top, w, h); });
    y += h + 16;
  }
  if (boardImage) boardPicture(boardImage, 480);
  else text('The board is empty. Make the first move.', { color: MUTED });
  if (trayImage) {
    text('IN THE TRAY', { size: 28, color: MUTED, gap: 8 });
    boardPicture(trayImage, 130);
  }
  begin('crises');
  section('The crises to solve');
  text('Meters run from 0 to 5. Lower is better. Negative pathway scores ease pressure; positive scores add pressure.', { color: MUTED, size: 30 });
  if (!snapshot.crises.length) text('No crisis meters in this position.', { color: MUTED });
  for (const crisis of snapshot.crises) {
    y += 12;
    const { value, color } = puzzleMeter(crisis.value, crisis.goal);
    text(crisis.name, { size: 38, weight: 700, color, gap: 14 });
    const top = y;
    commands.push(() => {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.arc(margin + 13 + i * 38, top + 16, 12, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
        if (value != null && i < value) { ctx.fillStyle = color; ctx.fill(); }
      }
      if (crisis.goal != null) {
        ctx.save();
        ctx.font = '400 30px Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(`target ≤ ${crisis.goal}`, margin + 210, top + 16);
        ctx.restore();
      }
    });
    y += 55;
    text(crisis.description || 'No description provided.');
    if (!crisis.scores.length) text('No docked pathway is scoring against this crisis.', { size: 30, color: MUTED });
    for (const score of crisis.scores) {
      text(`${score.label}  /  ${score.pending ? 'AWAITING SCORE' : `${score.delta > 0 ? '+' : ''}${score.delta} PRESSURE`}`, { size: 30, color: puzzleDeltaColor(score.delta, score.pending), weight: 700, gap: 10 });
      text(score.pending ? 'Evaluation is still pending in this snapshot.' : score.reason || 'No rationale provided.', { size: 32 });
    }
  }
  begin('pathways');
  section('The pathways');
  if (!snapshot.paths.length) text('No pathways yet. What would you invent first?', { color: MUTED });
  for (const path of snapshot.paths) {
    text(path.label, { size: 38, weight: 700, color: '#6ee7cb', gap: 12 });
    text(path.status.toUpperCase(), { size: 28, color: MUTED });
    text(path.howText || 'No pathway description written yet.');
  }
  begin('footer', width - 2 * margin);
  text('What would you change next — and why would it work?', { size: 38, weight: 700, w: fullWidth });
  text('FUTURE FORGE  /  Invent with emerging technologies  /  warmersun.com', { size: 26, color: MUTED, w: fullWidth });
  begin('end');
  canvas.height = height;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = '#6ee7cb'; ctx.fillRect(0, 0, width, 8);
  // Fit measured sections into a fixed 4K monitor canvas. Scaling entire sections
  // preserves all prose and tiles even for unusually dense positions.
  function drawGroup(name, x, top, w, h, center = false) {
    const g = groups.get(name);
    const scale = Math.min(w / g.width, h / Math.max(1, g.end - g.start));
    ctx.save();
    ctx.translate(x + (center ? (w - g.width * scale) / 2 : 0), top);
    ctx.scale(scale, scale); ctx.translate(-margin, -g.start);
    commands.slice(g.from, g.to).forEach(draw => draw());
    ctx.restore();
  }
  // Narrower visual column and tighter gutters give the reading columns more room.
  const bodyTop = 350, bodyHeight = 1660;
  const visualWidth = 1420, gutter = 40;
  const proseX = margin + visualWidth + gutter;
  const crisesX = proseX + content + gutter;
  drawGroup('header', margin, 44, fullWidth, 280);
  drawGroup('vision', margin, bodyTop, visualWidth, 680, true);
  drawGroup('board', margin, bodyTop + 696, visualWidth, bodyHeight - 696, true);
  const briefing = groups.get('briefing'), pathways = groups.get('pathways');
  const proseHeight = briefing.end - briefing.start + pathways.end - pathways.start;
  const proseGap = 16;
  const proseScale = Math.min(1, (bodyHeight - proseGap) / proseHeight);
  const briefingHeight = (briefing.end - briefing.start) * proseScale;
  drawGroup('briefing', proseX, bodyTop, content, briefingHeight);
  drawGroup('pathways', proseX, bodyTop + briefingHeight + proseGap, content, (pathways.end - pathways.start) * proseScale);
  drawGroup('crises', crisesX, bodyTop, content, bodyHeight);
  ctx.fillStyle = '#2b4050'; ctx.fillRect(margin, 2030, fullWidth, 2);
  drawGroup('footer', margin, 2048, fullWidth, 90);
  const blob = await new Promise((resolve, reject) => {
    try { canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image export failed. Please try again.')), 'image/png'); }
    catch { reject(new Error('The Future Vision image does not allow export. Reload its image and try again.')); }
  });
  return blob;
}

export function openPuzzleShare(snapshot) {
  const dialog = document.createElement('dialog');
  dialog.className = 'puzzle-share-dialog';
  dialog.setAttribute('aria-labelledby', 'puzzle-share-title');
  dialog.innerHTML = `<div class="puzzle-share-heading"><div><p class="puzzle-share-kicker">FUTURE FORGE · YOUR MOVE</p><h2 id="puzzle-share-title">Share this position</h2></div><button type="button" class="btn btn-ghost" data-close aria-label="Close puzzle preview">✕</button></div>
    <p>A 16:9 puzzle in 4K (3840 × 2160), ready for a monitor or your feed. Invite people to propose the next move.</p>
    <label for="puzzle-challenge">Your challenge</label><input id="puzzle-challenge" maxlength="240" />
    <div class="puzzle-share-actions"><button type="button" class="btn btn-secondary" data-generate>Update image</button><a class="btn btn-primary" data-download hidden>Download PNG</a><button type="button" class="btn btn-secondary" data-share hidden>Share…</button></div>
    <p data-status role="status" aria-live="polite"></p><div class="puzzle-share-preview"><img alt="Puzzle image with the Future Vision, briefing, complete board, crisis scores and pathway descriptions" hidden /></div>`;
  document.body.append(dialog);
  const input = dialog.querySelector('input'), status = dialog.querySelector('[data-status]');
  const generate = dialog.querySelector('[data-generate]'), download = dialog.querySelector('[data-download]');
  const share = dialog.querySelector('[data-share]'), preview = dialog.querySelector('img');
  preview.alt += `. Overall pathway evaluation: ${snapshot.evaluation?.level || 'red'}${snapshot.evaluation?.pending ? ' (re-evaluating)' : ''}.`;
  input.value = DEFAULT_CHALLENGE;
  let url, file, disposed = false;
  const filename = `${snapshot.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'future-forge'}-puzzle.png`;
  async function build() {
    generate.disabled = true; input.disabled = true; download.hidden = true; share.hidden = true;
    status.textContent = 'Composing your puzzle…';
    try {
      const blob = await renderPuzzle(snapshot, input.value);
      if (disposed) return;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob); file = new File([blob], filename, { type: 'image/png' });
      preview.src = url; preview.hidden = false; download.href = url; download.download = filename; download.hidden = false;
      share.hidden = !(navigator.canShare?.({ files: [file] }));
      status.textContent = 'Ready. Download the image to post anywhere, or use Share when available.';
    } catch (error) { if (!disposed) status.textContent = error.message; }
    finally { generate.disabled = false; input.disabled = false; }
  }
  input.addEventListener('input', () => { download.hidden = true; share.hidden = true; status.textContent = 'Select Update image to include your edited challenge.'; });
  generate.addEventListener('click', build);
  share.addEventListener('click', async () => {
    try { await navigator.share({ files: [file], title: snapshot.title }); }
    catch (error) { if (error.name !== 'AbortError') status.textContent = 'Sharing was unavailable. Download the PNG and attach it to your post.'; }
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { disposed = true; if (url) URL.revokeObjectURL(url); dialog.remove(); }, { once: true });
  dialog.showModal();
  void build();
}
