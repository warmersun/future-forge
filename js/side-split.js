/**
 * Shared height split for Future vision (top) + AI co-inventor (bottom).
 * Ratio is the co-inventor pane as a fraction of the stack.
 */

export const SIDE_SPLIT_KEY = "ff.vision.coHeight";
export const DEFAULT_RATIO = 0.5;
export const MIN_TOP_PX = 120;
export const MIN_BOTTOM_PX = 220;
export const HANDLE_PX = 7;
export const KEY_STEP = 0.04;

/**
 * @param {number} ratio
 * @param {number} stackHeight
 * @param {number} [handlePx]
 * @returns {number}
 */
export function clampSplitRatio(ratio, stackHeight, handlePx = HANDLE_PX) {
  const n = Number(ratio);
  let r = Number.isFinite(n) ? n : DEFAULT_RATIO;
  r = Math.min(0.85, Math.max(0.15, r));
  const h = Number(stackHeight) || 0;
  if (!(h > handlePx + 8)) return r;
  const usable = Math.max(1, h - handlePx);
  let minBottom = MIN_BOTTOM_PX;
  let minTop = MIN_TOP_PX;
  if (minBottom + minTop > usable) {
    const scale = usable / (minBottom + minTop);
    minBottom *= scale;
    minTop *= scale;
  }
  const minRatio = minBottom / h;
  const maxRatio = (h - handlePx - minTop) / h;
  return Math.min(maxRatio, Math.max(minRatio, r));
}

/**
 * @param {Pick<Storage, "getItem">|null|undefined} [storage]
 * @returns {number}
 */
export function readSplitRatio(storage) {
  const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  try {
    const raw = store?.getItem?.(SIDE_SPLIT_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n < 1) return n;
  } catch {
    /* private mode */
  }
  return DEFAULT_RATIO;
}

/**
 * @param {number} ratio
 * @param {Pick<Storage, "setItem">|null|undefined} [storage]
 */
export function writeSplitRatio(ratio, storage) {
  const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  const r = clampSplitRatio(ratio, 0);
  try {
    store?.setItem?.(SIDE_SPLIT_KEY, String(r));
  } catch {
    /* private mode */
  }
  return r;
}

/**
 * @param {HTMLElement} stack
 * @param {number} ratio
 * @returns {number}
 */
export function applySplitRatio(stack, ratio) {
  if (!stack) return DEFAULT_RATIO;
  const r = clampSplitRatio(ratio, stack.clientHeight || 0);
  stack.style.setProperty("--vision-co-pct", `${(r * 100).toFixed(2)}%`);
  const handle = stack.querySelector?.(".vision-split-handle");
  if (handle) handle.setAttribute("aria-valuenow", String(Math.round(r * 100)));
  return r;
}

/**
 * @param {HTMLElement|null|undefined} stack
 * @param {{ storage?: Storage }} [opts]
 */
export function bindVisionSplit(stack, opts = {}) {
  if (!stack?.querySelector) return;
  if (stack.dataset.splitBound === "1") {
    applySplitRatio(stack, readSplitRatio(opts.storage));
    return;
  }
  const handle = stack.querySelector(".vision-split-handle");
  if (!handle) return;
  stack.dataset.splitBound = "1";
  const storage = opts.storage;
  applySplitRatio(stack, readSplitRatio(storage));

  const persist = (next) => {
    const stored = writeSplitRatio(next, storage);
    const host = stack.ownerDocument || (typeof document !== "undefined" ? document : null);
    host?.querySelectorAll?.(".vision-co-stack")?.forEach((el) => applySplitRatio(el, stored));
  };

  handle.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture?.(e.pointerId);
    const startY = e.clientY;
    const startRatio = clampSplitRatio(readSplitRatio(storage), stack.clientHeight || 0);
    const height = stack.clientHeight || 1;
    stack.classList.add("is-splitting");

    const onMove = (ev) => {
      const dy = ev.clientY - startY;
      persist(startRatio - dy / height);
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      stack.classList.remove("is-splitting");
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });

  handle.addEventListener("keydown", (e) => {
    const ratio = readSplitRatio(storage);
    if (e.key === "ArrowUp") {
      e.preventDefault();
      persist(ratio + KEY_STEP);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      persist(ratio - KEY_STEP);
    } else if (e.key === "Home") {
      e.preventDefault();
      persist(0.85);
    } else if (e.key === "End") {
      e.preventDefault();
      persist(0.15);
    }
  });
}

/**
 * @param {ParentNode|null|undefined} [root]
 */
export function bindAllVisionSplits(root) {
  const host = root || (typeof document !== "undefined" ? document : null);
  host?.querySelectorAll?.(".vision-co-stack")?.forEach((el) => bindVisionSplit(el));
}
