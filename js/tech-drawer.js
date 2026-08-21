/**
 * Compact-screen emTech drawer for workshop layouts (solo + multiplayer).
 * Desktop (≥1200px): catalog pins in the 3-column grid, or tucks like a Mac dock
 * (edge peek + sticky overlay). Tablet/phone: overlay drawer via “+ Add tech”.
 */

const COMPACT_MQ = "(max-width: 1199px)";
const RAIL_COLLAPSED_KEY = "future-forge:tech-rail-collapsed";

/** @type {MediaQueryList|null} */
let compactMql = null;

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
    // Keep catalog interactive whenever it can be on-screen (pinned or overlay).
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
 * Overlay reveal while the rail is tucked (does not persist).
 * Stays open until dismissed (outside click / Escape) or pinned.
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

  syncTechDockChrome(layout);

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
      if (!isTechRailCollapsed(layout)) return;
      if (isTechRailPeek(layout)) {
        setTechRailCollapsed(layout, false); // pin open
      } else {
        setTechRailPeek(layout, true); // slide overlay in
      }
    });
  });

  // Open overlay on hover of edge or handle; stay open (no mouseleave auto-hide).
  // Dismiss by clicking invent/vision or Escape — so tech cards stay usable.
  const openPeekTargets = [edge, ...layout.querySelectorAll("[data-tech-dock-handle]")];
  openPeekTargets.forEach((el) => {
    el.addEventListener("pointerenter", () => {
      if (isTechDrawerMode() || !isTechRailCollapsed(layout)) return;
      setTechRailPeek(layout, true);
    });
  });

  layout.addEventListener("pointerdown", (e) => {
    if (isTechDrawerMode() || !isTechRailCollapsed(layout) || !isTechRailPeek(layout)) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".tech-library, [data-tech-dock-handle], [data-tech-dock-edge]")) return;
    setTechRailPeek(layout, false);
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
      setTechRailPeek(layout, false);
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
