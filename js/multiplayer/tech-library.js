/**
 * Solo-style emTech library for multiplayer invent (hotseat / rooms).
 */

import { TECHS, DOMAINS, techById } from "../data.js";
import { techCost } from "../sim/economy.js";

/**
 * @param {HTMLElement|null} row
 * @param {object} opts
 * @param {string} opts.domainFilter
 * @param {(domain: string) => void} opts.onFilter
 * @param {(s: string) => string} opts.escapeHtml
 */
export function paintTechFilters(row, opts) {
  if (!row) return;
  const { domainFilter = "all", onFilter, escapeHtml } = opts;
  const keys = ["all", ...Object.keys(DOMAINS)];
  row.innerHTML = keys
    .map((d) => {
      const label = d === "all" ? "All" : DOMAINS[d].label;
      const active = domainFilter === d ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-domain="${escapeHtml(
        d
      )}">${escapeHtml(label)}</button>`;
    })
    .join("");
  row.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => onFilter(btn.dataset.domain));
  });
}

/**
 * Full tech library cards (solo look).
 * @param {HTMLElement|null} el
 * @param {object} opts
 * @param {string[]} opts.selectedIds
 * @param {string[]} [opts.suggested]
 * @param {string} [opts.domainFilter]
 * @param {boolean} [opts.disabled]
 * @param {(techId: string) => void} opts.onToggle
 * @param {(s: string) => string} opts.escapeHtml
 */
export function paintTechLibrary(el, opts) {
  if (!el) return;
  const {
    selectedIds = [],
    suggested = [],
    domainFilter = "all",
    disabled = false,
    onToggle,
    escapeHtml,
    /** Actor resources — when set, unaffordable techs never look selected */
    ap = null,
    budget = null,
    will = null,
  } = opts;
  const market = opts.market || opts.marketNews || null;
  const selected = new Set(selectedIds);
  const sug = new Set(suggested);
  let list = [...TECHS];
  if (domainFilter && domainFilter !== "all") {
    list = list.filter((t) => t.domain === domainFilter);
  }
  list.sort((a, b) => {
    const ar = sug.has(a.id) ? 0 : 1;
    const br = sug.has(b.id) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });

  const canAfford = (t, cost) => {
    if (ap != null && ap < 1) return false;
    if (budget != null && budget < (cost.budget || 0)) return false;
    if (will != null && will < (cost.will || 0)) return false;
    return true;
  };

  el.innerHTML = list
    .map((t) => {
      const sel = selected.has(t.id);
      const isSug = sug.has(t.id);
      const color = DOMAINS[t.domain]?.color || "#94a3b8";
      const cost = techCost(t, { market });
      const unaffordable = !sel && !canAfford(t, cost);
      let costHtml = "";
      if (sel) {
        costHtml = `<span class="tech-cost-row tech-cost-in-stack"><span class="tech-cost-chip tech-cost-owned">In stack</span></span>`;
      } else {
        const bits = [
          `<span class="tech-cost-chip tech-cost-budget">${cost.budget}$</span>`,
        ];
        if (cost.will > 0) {
          bits.push(`<span class="tech-cost-chip tech-cost-will">Will ${cost.will}</span>`);
        }
        bits.push(`<span class="tech-cost-chip tech-cost-ap">1 AP</span>`);
        costHtml = `<span class="tech-cost-row">${bits.join("")}</span>`;
      }
      // Only stack members get green + ✓
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${
          isSug ? "recommended" : ""
        } ${unaffordable ? "unaffordable" : ""}"
          data-id="${escapeHtml(t.id)}" style="--domain:${color}"
          ${disabled ? "disabled" : ""}
          title="${escapeHtml(t.summary)}${unaffordable ? " · can't afford" : ""}">
          <span class="tech-icon">${t.icon || ""}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${escapeHtml(DOMAINS[t.domain]?.label || t.domain)}${
              isSug ? " · suggested" : ""
            }${unaffordable ? " · can't afford" : ""}</span>
            ${costHtml}
          </span>
          <span class="tech-add">${sel ? "✓" : unaffordable ? "!" : "+"}</span>
        </button>`;
    })
    .join("");

  el.querySelectorAll(".tech-card:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => onToggle(btn.dataset.id));
  });
}

/**
 * Selected stack chips (solo look).
 * @param {HTMLElement|null} box
 * @param {object} opts
 * @param {{techId: string, addedBy?: string}[]} opts.stack
 * @param {string} [opts.ownerSeatId]
 * @param {Record<string,string>} [opts.seatNames]
 * @param {boolean} [opts.disabled]
 * @param {(techId: string) => void} opts.onRemove
 * @param {(s: string) => string} opts.escapeHtml
 */
export function paintSelectedStack(box, opts) {
  if (!box) return;
  const {
    stack = [],
    ownerSeatId,
    seatNames = {},
    disabled = false,
    onRemove,
    escapeHtml,
  } = opts;
  if (!stack.length) {
    box.innerHTML = `<span class="empty-hint">Click technologies on the left to add them to your invention.</span>`;
    return;
  }
  box.innerHTML = stack
    .map((x) => {
      const t = techById(x.techId);
      const helper =
        x.addedBy && ownerSeatId && x.addedBy !== ownerSeatId
          ? ` <em class="muted">(+${escapeHtml(seatNames[x.addedBy] || "ally")})</em>`
          : "";
      return `<span class="tech-chip">${t?.icon || ""} ${escapeHtml(t?.name || x.techId)}${helper}${
        disabled
          ? ""
          : `<button type="button" data-remove="${escapeHtml(x.techId)}" title="Remove">×</button>`
      }</span>`;
    })
    .join("");
  if (disabled) return;
  box.querySelectorAll("[data-remove]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onRemove(b.dataset.remove);
    });
  });
}
