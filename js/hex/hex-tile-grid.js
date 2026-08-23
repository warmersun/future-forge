/**
 * hex-tile-grid — axial pointy-top hexes with 3+3 bits/atoms faces.
 * Bits always LEFT (NW, W, SW). Atoms always RIGHT (NE, E, SE).
 * Tiles do not rotate.
 *
 * Edge index (pointy-top, y-down screen):
 *   0 E, 1 NE, 2 NW, 3 W, 4 SW, 5 SE
 */

export const BITS = "bits";
export const ATOMS = "atoms";
export const SEALED = "sealed";
export const CURVE = "curve";

/** Left three = bits, right three = atoms. */
export const EDGE = {
  E: 0,
  NE: 1,
  NW: 2,
  W: 3,
  SW: 4,
  SE: 5,
};

export const BITS_EDGES = [EDGE.NW, EDGE.W, EDGE.SW];
export const ATOMS_EDGES = [EDGE.NE, EDGE.E, EDGE.SE];

const DIRS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function neighbor(q, r, dir) {
  const [dq, dr] = DIRS[dir];
  return { q: q + dq, r: r + dr };
}

export function oppositeEdge(dir) {
  return (dir + 3) % 6;
}

export function keyOf(q, r) {
  return `${q},${r}`;
}

export function hexToPixel(q, r, size, origin = { x: 0, y: 0 }) {
  return {
    x: origin.x + size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: origin.y + size * (1.5 * r),
  };
}

/**
 * Axial slots for a rectangular pointy-top board (odd-r offset).
 * Every visual row has `cols` hexes; odd rows shift right by half a hex.
 * extraLeftRows: 0-based rows that get one more hex on the left (fills the odd-row notch).
 */
export function rectSlots({
  rows = 5,
  cols = 7,
  q0 = 0,
  r0 = 0,
  extraLeftRows = [],
} = {}) {
  const extra = new Set(extraLeftRows);
  const slots = [];
  for (let row = 0; row < rows; row++) {
    const add = extra.has(row) ? 1 : 0;
    const qStart = q0 - Math.floor(row / 2) - add;
    for (let col = 0; col < cols + add; col++) {
      slots.push({ q: qStart + col, r: r0 + row });
    }
  }
  return slots;
}

export function pixelToHex(x, y, size, origin = { x: 0, y: 0 }) {
  const px = (x - origin.x) / size;
  const py = (y - origin.y) / size;
  const q = (Math.sqrt(3) / 3) * px - (1 / 3) * py;
  const r = (2 / 3) * py;
  return cubeRound(q, -q - r, r);
}

function cubeRound(q, s, r) {
  let rq = Math.round(q);
  let rs = Math.round(s);
  let rr = Math.round(r);
  const dq = Math.abs(rq - q);
  const ds = Math.abs(rs - s);
  const dr = Math.abs(rr - r);
  if (dq > ds && dq > dr) rq = -rs - rr;
  else if (ds > dr) rs = -rq - rr;
  else rr = -rq - rs;
  return { q: rq, r: rr };
}

/** Pointy-top corners, i=0 at E-NE, y-down. */
export function hexCorners(cx, cy, size) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    out.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return out;
}

/**
 * polarity: "bits" | "atoms" | "split"
 * split = left bits, right atoms (IoT, print, synbio, AR).
 */
export function facePolarity(polarity, dir) {
  if (polarity === BITS) return BITS;
  if (polarity === ATOMS) return ATOMS;
  if (polarity === CURVE) return CURVE;
  if (polarity === "split") {
    return BITS_EDGES.includes(dir) ? BITS : ATOMS;
  }
  return SEALED;
}

export function facesMatch(aPol, aDir, bPol, bDir) {
  const a = facePolarity(aPol, aDir);
  const b = facePolarity(bPol, bDir);
  if (a === SEALED || b === SEALED) return false;
  if (a === CURVE) return b === ATOMS || b === BITS || b === CURVE;
  if (b === CURVE) return a === ATOMS || a === BITS || a === CURVE;
  return a === b;
}

export function canDock(aPol, bPol, dirFromA) {
  return facesMatch(aPol, dirFromA, bPol, oppositeEdge(dirFromA));
}

export function makeGrid({ size = 56, origin = { x: 80, y: 70 } } = {}) {
  const tiles = new Map();

  function get(q, r) {
    return tiles.get(keyOf(q, r)) || null;
  }

  function set(q, r, tile) {
    tiles.set(keyOf(q, r), { ...tile, q, r });
  }

  function remove(q, r) {
    tiles.delete(keyOf(q, r));
  }

  function find(id) {
    for (const t of tiles.values()) if (t.id === id) return t;
    return null;
  }

  function clear() {
    tiles.clear();
  }

  function occupy(q, r, tile) {
    const existing = get(q, r);
    if (existing && existing.id !== tile.id) {
      return { ok: false, blockers: [{ dir: -1, other: existing, need: "occupied" }] };
    }
    const blockers = [];
    for (let d = 0; d < 6; d++) {
      const n = neighbor(q, r, d);
      const other = get(n.q, n.r);
      if (!other) continue;
      if (!canDock(tile.polarity, other.polarity, d)) {
        blockers.push({ dir: d, other, need: facePolarity(tile.polarity, d) });
      }
    }
    if (blockers.length) return { ok: false, blockers };
    const prev = find(tile.id);
    if (prev) remove(prev.q, prev.r);
    set(q, r, tile);
    return { ok: true, blockers: [] };
  }

  function bonds() {
    const out = [];
    const seen = new Set();
    for (const a of tiles.values()) {
      for (let d = 0; d < 6; d++) {
        const n = neighbor(a.q, a.r, d);
        const b = get(n.q, n.r);
        if (!b) continue;
        const pair = [keyOf(a.q, a.r), keyOf(b.q, b.r)].sort().join(">");
        if (seen.has(pair)) continue;
        seen.add(pair);
        if (!canDock(a.polarity, b.polarity, d)) continue;
        out.push({
          a,
          b,
          dir: d,
          polarity: facePolarity(a.polarity, d),
        });
      }
    }
    return out;
  }

  return {
    size,
    origin,
    tiles,
    get,
    set,
    remove,
    find,
    clear,
    occupy,
    bonds,
    pixel(q, r) {
      return hexToPixel(q, r, size, origin);
    },
    atPixel(x, y) {
      return pixelToHex(x, y, size, origin);
    },
  };
}
