/**
 * Compact-screen emTech drawer for workshop layouts (solo + multiplayer).
 * Desktop (≥1200px): tech rail stays in the 3-column grid.
 * Tablet/phone: tech becomes an overlay drawer; invent + vision stay visible.
 */

const COMPACT_MQ = "(max-width: 1199px)";

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
 * Update the “Add tech” count badge for a layout.
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
 * Wire drawer controls inside one `.workshop-layout`.
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

  const open = (e) => {
    e?.preventDefault?.();
    // On desktop the button is hidden; if somehow clicked, scroll tech into view
    if (!isTechDrawerMode()) {
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

  bd.addEventListener("click", close);

  // Empty-stack hint can invite opening the drawer
  layout.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest("[data-tech-drawer-open-hint]")) open(e);
  });

  // Start closed in compact mode
  if (isTechDrawerMode()) {
    setTechDrawerOpen(layout, false, { focus: false });
  } else {
    drawer.setAttribute("aria-hidden", "false");
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
    const openLayout = document.querySelector(".workshop-layout.is-tech-open");
    if (!openLayout) return;
    e.preventDefault();
    setTechDrawerOpen(/** @type {HTMLElement} */ (openLayout), false);
    openLayout.querySelector("[data-tech-drawer-open]")?.focus?.();
  });

  if (typeof window !== "undefined" && window.matchMedia) {
    compactMql = window.matchMedia(COMPACT_MQ);
    const onChange = () => {
      document.querySelectorAll(".workshop-layout").forEach((layout) => {
        const el = /** @type {HTMLElement} */ (layout);
        if (!isTechDrawerMode()) {
          // Leaving compact: force closed state classes, keep rail visible via CSS
          setTechDrawerOpen(el, false, { focus: false });
          el.querySelector(".tech-library")?.setAttribute("aria-hidden", "false");
        } else if (!isTechDrawerOpen(el)) {
          setTechDrawerOpen(el, false, { focus: false });
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
