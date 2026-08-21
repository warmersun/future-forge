/**
 * Compact-screen emTech drawer for workshop layouts (solo + multiplayer).
 * Desktop (≥1200px): catalog pins in the 3-column grid, or tucks like a Mac dock
 * (edge peek + hover reveal). Tablet/phone: overlay drawer via “+ Add tech”.
 */

const COMPACT_MQ = "(max-width: 1199px)";
const RAIL_COLLAPSED_KEY = "future-forge:tech-rail-collapsed";
const PEEK_LEAVE_MS = 350;

/** @type {MediaQueryList|null} */
let compactMql = null;

/** @type {WeakMap<HTMLElement, ReturnType<typeof setTimeout>>} */
const peekLeaveTimers = new WeakMap();

/**
 * @returns {boolean}
 */
export function isTechDrawerMode() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COMPACT_MQ).matches;
}

/**
 * @param {HTMLElement|null} layout
 * @returns {boolean}
 */
export function isTechDrawerOpen(layout) {
  return !!layout?.classList.contains("is-tech-open");
}

/**
 * @param {HTMLElement|null} layout
 * @returns {boolean}
 */
export function isTechRailCollapsed(layout) {
  return !!layout?.classList.contains("is-tech-collapsed");
}

/**
 * @param {HTMLElement|null} layout
 * @returns {boolean}
 */
export function isTechRailPeek(layout) {
  return !!layout?.classList.contains("is-tech-peek");
}

/**
 * Read persisted desktop rail preference. Missing key → expanded (false).
 * @returns {boolean}
 */
export function readTechRailCollapsedPref() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {boolean} collapsed
 */
function writeTechRailCollapsedPref(collapsed) {
  try {
    if (typeof localStorage === "undefined") return;
    if (collapsed) localStorage.setItem(RAIL_COLLAPSED_KEY, "1");
    else localStorage.removeItem(RAIL_COLLAPSED_KEY);
  } catch {
    /* private mode / quota */
  }
}

/**
 * Update the “Add tech” / dock-handle count badge for a layout.
 * @param {HTMLElement|null} layout
 * @param {number} count
 */
export function updateTechDrawerCount(layout, count) {
  if (!layout) return;
  const n = Math.max(0, Number(count) || 0);
  layout.querySelectorAll("[data-tech-drawer-count]").forEach((el) => {
    if (n > 0) {
      el.textContent = String(n);
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  });
  layout.querySelectorAll("[data-tech-drawer-open]").forEach((btn) => {
    const base = "Add tech";
    btn.setAttribute("aria-label", n > 0 ? `${base} (${n} in stack)` : base);
  });
}

/**
 * Sync dock chrome visibility + aria for current collapsed/peek/compact state.
 * @param {HTMLElement|null} layout
 */
function syncTechDockChrome(layout) {
  if (!layout) return;
  const tucked = isTechRailCollapsed(layout) && !isTechDrawerMode();
  const peeking = tucked && isTechRailPeek(layout);

  const body = layout.querySelector(".tech-library-body");
  if (body) {
    // Never mark the catalog inert while it can be on-screen — peek auto-hide
    // previously set aria-hidden=true while the panel was still visible.
    body.setAttribute("aria-hidden", "false");
  }

  layout.querySelectorAll("[data-tech-dock-handle]").forEach((btn) => {
    btn.hidden = !tucked;
    btn.setAttribute("aria-expanded", peeking || !tucked ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      peeking
        ? "Pin Emerging tech open"
        : tucked
          ? "Show Emerging tech"
          : "Emerging tech"
    );
  });

  layout.querySelectorAll("[data-tech-dock-edge]").forEach((el) => {
    el.hidden = !tucked;
  });

  layout.querySelectorAll("[data-tech-rail-toggle]").forEach((btn) => {
    btn.setAttribute("aria-expanded", tucked ? "false" : "true");
    btn.setAttribute(
      "aria-label",
      tucked ? "Pin Emerging tech open" : "Collapse Emerging tech"
    );
    btn.setAttribute("title", tucked ? "Pin tech catalog open" : "Hide tech catalog");
  });
}

/**
 * Temporary hover reveal while the rail is tucked (does not persist).
 * @param {HTMLElement|null} layout
 * @param {boolean} peek
 */
export function setTechRailPeek(layout, peek) {
  if (!layout) return;
  if (!isTechRailCollapsed(layout) || isTechDrawerMode()) {
    layout.classList.remove("is-tech-peek");
    syncTechDockChrome(layout);
    return;
  }
  layout.classList.toggle("is-tech-peek", !!peek);
  syncTechDockChrome(layout);
  // #region agent log
  {
    const lib = layout.querySelector(".tech-library");
    const handle = layout.querySelector("[data-tech-dock-handle]");
    const libCs = lib ? window.getComputedStyle(lib) : null;
    fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
      body: JSON.stringify({
        sessionId: "5bca9e",
        runId: "post-fix",
        hypothesisId: "H1-overflow-clip",
        location: "tech-drawer.js:setTechRailPeek",
        message: "peek state",
        data: {
          peek: !!peek,
          classes: layout.className,
          libRect: lib?.getBoundingClientRect?.(),
          handleRect: handle?.getBoundingClientRect?.(),
          transform: libCs?.transform,
          position: libCs?.position,
          width: libCs?.width,
          zIndex: libCs?.zIndex,
          layoutRect: layout.getBoundingClientRect?.(),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
}

/**
 * @param {HTMLElement} layout
 */
function clearPeekLeaveTimer(layout) {
  const t = peekLeaveTimers.get(layout);
  if (t != null) {
    clearTimeout(t);
    peekLeaveTimers.delete(layout);
  }
}

/**
 * @param {HTMLElement} layout
 * @param {boolean} peek
 * @param {{ delay?: boolean }} [opts]
 */
function scheduleTechRailPeek(layout, peek, opts = {}) {
  if (peek) {
    clearPeekLeaveTimer(layout);
    setTechRailPeek(layout, true);
    return;
  }
  if (!opts.delay) {
    clearPeekLeaveTimer(layout);
    setTechRailPeek(layout, false);
    return;
  }
  clearPeekLeaveTimer(layout);
  const id = setTimeout(() => {
    peekLeaveTimers.delete(layout);
    setTechRailPeek(layout, false);
  }, PEEK_LEAVE_MS);
  peekLeaveTimers.set(layout, id);
}

/**
 * Desktop dock tuck / pin of the emTech catalog rail.
 * @param {HTMLElement|null} layout
 * @param {boolean} collapsed
 * @param {{ persist?: boolean, focus?: boolean }} [opts]
 */
export function setTechRailCollapsed(layout, collapsed, opts = {}) {
  if (!layout) return;
  const want = !!collapsed;
  layout.classList.toggle("is-tech-collapsed", want);
  if (!want) layout.classList.remove("is-tech-peek");
  clearPeekLeaveTimer(layout);

  syncTechDockChrome(layout);

  // #region agent log
  {
    const lib = layout.querySelector(".tech-library");
    const handle = layout.querySelector("[data-tech-dock-handle]");
    const edge = layout.querySelector("[data-tech-dock-edge]");
    const libRect = lib?.getBoundingClientRect?.();
    const handleRect = handle?.getBoundingClientRect?.();
    let overflowAncestors = [];
    let el = layout;
    while (el && el !== document.documentElement) {
      const cs = window.getComputedStyle(el);
      if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        overflowAncestors.push({
          tag: el.id || el.className?.toString?.()?.slice?.(0, 60) || el.tagName,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
        });
      }
      el = el.parentElement;
    }
    fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
      body: JSON.stringify({
        sessionId: "5bca9e",
        runId: "pre-fix",
        hypothesisId: "H1-overflow-clip",
        location: "tech-drawer.js:setTechRailCollapsed",
        message: "collapse applied",
        data: {
          want,
          compact: isTechDrawerMode(),
          classes: layout.className,
          libRect,
          handleRect,
          handleHidden: handle?.hidden,
          edgeHidden: edge?.hidden,
          overflowAncestors,
          innerWidth: window.innerWidth,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  if (opts.persist !== false) writeTechRailCollapsedPref(want);

  if (opts.focus === false) return;
  if (isTechDrawerMode()) return;

  if (want) {
    layout.querySelector("[data-tech-dock-handle]")?.focus?.();
  } else {
    layout.querySelector("[data-tech-rail-toggle]")?.focus?.();
  }
}

/**
 * Apply stored rail preference on desktop layouts.
 * @param {HTMLElement|null} layout
 */
function applyTechRailPref(layout) {
  if (!layout || isTechDrawerMode()) return;
  setTechRailCollapsed(layout, readTechRailCollapsedPref(), {
    persist: false,
    focus: false,
  });
}

/**
 * @param {HTMLElement|null} layout
 * @param {boolean} open
 * @param {{ focus?: boolean }} [opts]
 */
export function setTechDrawerOpen(layout, open, opts = {}) {
  if (!layout) return;
  const drawer = layout.querySelector(".tech-library");
  const backdrop = layout.querySelector(".tech-drawer-backdrop");
  if (!drawer) return;

  const wantOpen = !!open;
  layout.classList.toggle("is-tech-open", wantOpen);
  document.body.classList.toggle("tech-drawer-open", wantOpen);

  if (backdrop) {
    backdrop.hidden = !wantOpen;
    backdrop.setAttribute("aria-hidden", wantOpen ? "false" : "true");
  }

  drawer.setAttribute("aria-hidden", wantOpen || !isTechDrawerMode() ? "false" : "true");
  if (wantOpen) {
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Emerging tech library");
  } else {
    drawer.removeAttribute("role");
    drawer.removeAttribute("aria-modal");
  }

  layout.querySelectorAll("[data-tech-drawer-open]").forEach((btn) => {
    btn.setAttribute("aria-expanded", wantOpen ? "true" : "false");
  });

  if (opts.focus === false) return;

  if (wantOpen) {
    const closeBtn = drawer.querySelector("[data-tech-drawer-close]");
    const firstChip = drawer.querySelector(".filter-chip, .tech-card, button, select, [tabindex]");
    (closeBtn || firstChip)?.focus?.();
  }
}

/**
 * Wire drawer + dock controls inside one `.workshop-layout`.
 * Safe to call multiple times (idempotent).
 * @param {HTMLElement|null} layout
 */
export function wireTechDrawer(layout) {
  if (!layout || layout.dataset.techDrawerWired === "1") return;
  layout.dataset.techDrawerWired = "1";

  const drawer = layout.querySelector(".tech-library");
  const backdrop = layout.querySelector(".tech-drawer-backdrop");
  if (!drawer) return;

  // Ensure backdrop exists (older markup / tests)
  let bd = backdrop;
  if (!bd) {
    bd = document.createElement("div");
    bd.className = "tech-drawer-backdrop";
    bd.hidden = true;
    bd.setAttribute("data-tech-drawer-backdrop", "");
    bd.setAttribute("aria-hidden", "true");
    layout.appendChild(bd);
  }

  // Ensure dock edge exists
  let edge = layout.querySelector("[data-tech-dock-edge]");
  if (!edge) {
    edge = document.createElement("div");
    edge.className = "tech-dock-edge";
    edge.hidden = true;
    edge.setAttribute("data-tech-dock-edge", "");
    edge.setAttribute("aria-hidden", "true");
    layout.appendChild(edge);
  }

  const open = (e) => {
    e?.preventDefault?.();
    // On desktop the Add-tech button is hidden; if somehow clicked, pin rail open
    if (!isTechDrawerMode()) {
      if (isTechRailCollapsed(layout)) {
        setTechRailCollapsed(layout, false);
      }
      drawer.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
      return;
    }
    setTechDrawerOpen(layout, true);
  };

  const close = (e) => {
    e?.preventDefault?.();
    setTechDrawerOpen(layout, false);
    const trigger = layout.querySelector("[data-tech-drawer-open]");
    trigger?.focus?.();
  };

  layout.querySelectorAll("[data-tech-drawer-open]").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", drawer.id || "");
    btn.addEventListener("click", open);
  });

  layout.querySelectorAll("[data-tech-drawer-close]").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  // Header pin/tuck toggle
  layout.querySelectorAll("[data-tech-rail-toggle]").forEach((btn) => {
    if (drawer.id) btn.setAttribute("aria-controls", drawer.id);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
        body: JSON.stringify({
          sessionId: "5bca9e",
          runId: "pre-fix",
          hypothesisId: "H3-toggle-wire",
          location: "tech-drawer.js:rail-toggle-click",
          message: "header pin clicked",
          data: {
            compact: isTechDrawerMode(),
            wasCollapsed: isTechRailCollapsed(layout),
            layoutId: layout.id || layout.className,
            pinVisible: !!(btn.offsetWidth || btn.offsetHeight),
            pinDisplay: window.getComputedStyle(btn).display,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (isTechDrawerMode()) return;
      // When tucked (possibly peeking), pin open; when pinned, tuck away
      setTechRailCollapsed(layout, !isTechRailCollapsed(layout));
    });
  });

  // Dock handle: open overlay if closed; pin into layout if already open
  layout.querySelectorAll("[data-tech-dock-handle]").forEach((btn) => {
    if (drawer.id) btn.setAttribute("aria-controls", drawer.id);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isTechDrawerMode()) return;
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
        body: JSON.stringify({
          sessionId: "5bca9e",
          runId: "post-fix",
          hypothesisId: "H6-sticky-overlay",
          location: "tech-drawer.js:dock-handle-click",
          message: "dock handle clicked",
          data: {
            compact: isTechDrawerMode(),
            collapsed: isTechRailCollapsed(layout),
            peeking: isTechRailPeek(layout),
            handleHidden: btn.hidden,
            handleRect: btn.getBoundingClientRect?.(),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!isTechRailCollapsed(layout)) return;
      if (isTechRailPeek(layout)) {
        setTechRailCollapsed(layout, false); // pin open
      } else {
        setTechRailPeek(layout, true); // slide overlay in
      }
    });
  });

  // Open overlay on hover/focus of edge or handle; stay open (no mouseleave auto-hide).
  // Dismiss by clicking invent/vision or Escape — so tech cards stay usable.
  const openPeekTargets = [edge, ...layout.querySelectorAll("[data-tech-dock-handle]")];
  openPeekTargets.forEach((el) => {
    el.addEventListener("pointerenter", () => {
      if (isTechDrawerMode() || !isTechRailCollapsed(layout)) return;
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
        body: JSON.stringify({
          sessionId: "5bca9e",
          runId: "post-fix",
          hypothesisId: "H6-sticky-overlay",
          location: "tech-drawer.js:peek-enter",
          message: "peek pointerenter",
          data: {
            target: el.className?.toString?.()?.slice?.(0, 40),
            collapsed: true,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      scheduleTechRailPeek(layout, true);
    });
  });

  layout.addEventListener("pointerdown", (e) => {
    if (isTechDrawerMode() || !isTechRailCollapsed(layout) || !isTechRailPeek(layout)) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".tech-library, [data-tech-dock-handle], [data-tech-dock-edge]")) return;
    // #region agent log
    fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
      body: JSON.stringify({
        sessionId: "5bca9e",
        runId: "post-fix",
        hypothesisId: "H6-sticky-overlay",
        location: "tech-drawer.js:outside-dismiss",
        message: "dismiss peek outside click",
        data: { tag: t.tagName },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    scheduleTechRailPeek(layout, false);
  });

  // Catalog interaction proof while overlay is open
  drawer.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const card = t.closest(".tech-card, .filter-chip, button");
    if (!card) return;
    // #region agent log
    fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
      body: JSON.stringify({
        sessionId: "5bca9e",
        runId: "post-fix",
        hypothesisId: "H6-sticky-overlay",
        location: "tech-drawer.js:catalog-click",
        message: "catalog control clicked",
        data: {
          peeking: isTechRailPeek(layout),
          collapsed: isTechRailCollapsed(layout),
          ariaHidden: layout.querySelector(".tech-library-body")?.getAttribute("aria-hidden"),
          control: card.className?.toString?.()?.slice?.(0, 60),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  });

  bd.addEventListener("click", close);

  // Empty-stack hint can invite opening the drawer / pinning the rail
  layout.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("[data-tech-drawer-open-hint]")) open(e);
  });

  // Start closed in compact mode; apply rail pref on desktop
  if (isTechDrawerMode()) {
    setTechDrawerOpen(layout, false, { focus: false });
    syncTechDockChrome(layout);
  } else {
    drawer.setAttribute("aria-hidden", "false");
    applyTechRailPref(layout);
  }
}

/**
 * Wire every workshop layout on the page + global Escape / media listeners.
 * @param {ParentNode} [root=document]
 */
export function initTechDrawers(root = document) {
  const layouts = root.querySelectorAll?.(".workshop-layout") || [];
  // #region agent log
  fetch("http://127.0.0.1:7253/ingest/8efc81da-0202-467c-bc72-ac686e5a23d2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5bca9e" },
    body: JSON.stringify({
      sessionId: "5bca9e",
      runId: "pre-fix",
      hypothesisId: "H2-compact-mode",
      location: "tech-drawer.js:initTechDrawers",
      message: "init tech drawers",
      data: {
        layoutCount: layouts.length,
        compact: isTechDrawerMode(),
        innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
        prefCollapsed: readTechRailCollapsedPref(),
        pinCount: root.querySelectorAll?.("[data-tech-rail-toggle]")?.length ?? 0,
        handleCount: root.querySelectorAll?.("[data-tech-dock-handle]")?.length ?? 0,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  layouts.forEach((el) => wireTechDrawer(/** @type {HTMLElement} */ (el)));

  if (document.body.dataset.techDrawerGlobal === "1") return;
  document.body.dataset.techDrawerGlobal = "1";

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    // Compact: close overlay drawer
    const openLayout = document.querySelector(".workshop-layout.is-tech-open");
    if (openLayout && isTechDrawerMode()) {
      e.preventDefault();
      setTechDrawerOpen(/** @type {HTMLElement} */ (openLayout), false);
      openLayout.querySelector("[data-tech-drawer-open]")?.focus?.();
      return;
    }

    if (isTechDrawerMode()) return;

    const active = document.activeElement;
    const layout = workshopLayoutFor(active instanceof Element ? active : null);
    if (!layout) return;

    // Dismiss peek first
    if (isTechRailPeek(layout)) {
      e.preventDefault();
      scheduleTechRailPeek(layout, false);
      layout.querySelector("[data-tech-dock-handle]")?.focus?.();
      return;
    }

    // Tuck pinned catalog when focus is inside it
    if (
      !isTechRailCollapsed(layout) &&
      active instanceof Element &&
      active.closest(".tech-library")
    ) {
      e.preventDefault();
      setTechRailCollapsed(layout, true);
    }
  });

  if (typeof window !== "undefined" && window.matchMedia) {
    compactMql = window.matchMedia(COMPACT_MQ);
    const onChange = () => {
      document.querySelectorAll(".workshop-layout").forEach((layout) => {
        const el = /** @type {HTMLElement} */ (layout);
        el.classList.remove("is-tech-peek");
        clearPeekLeaveTimer(el);
        if (!isTechDrawerMode()) {
          setTechDrawerOpen(el, false, { focus: false });
          el.querySelector(".tech-library")?.setAttribute("aria-hidden", "false");
          applyTechRailPref(el);
        } else {
          if (!isTechDrawerOpen(el)) {
            setTechDrawerOpen(el, false, { focus: false });
          }
          const body = el.querySelector(".tech-library-body");
          body?.setAttribute("aria-hidden", "false");
          syncTechDockChrome(el);
        }
      });
    };
    if (compactMql.addEventListener) compactMql.addEventListener("change", onChange);
    else compactMql.addListener?.(onChange);
  }
}

/**
 * Find the workshop layout that contains `el` (or the active play screen).
 * @param {Element|null} [el]
 * @returns {HTMLElement|null}
 */
export function workshopLayoutFor(el) {
  if (el?.closest) {
    const found = el.closest(".workshop-layout");
    if (found) return /** @type {HTMLElement} */ (found);
  }
  return (
    /** @type {HTMLElement|null} */ (
      document.querySelector("#screen-workshop.active .workshop-layout") ||
        document.querySelector("#hs-play:not([hidden]).workshop-layout") ||
        document.querySelector("#screen-room-play.active .workshop-layout") ||
        document.querySelector(".workshop-layout")
    )
  );
}
