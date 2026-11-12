/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * iPad tabletop: one workshop station at a time.
 * Coarse pointers from 720px through 1399px (iPad portrait through 12.9" landscape).
 * Phones and desktop keep their own layouts.
 */

export const TABLETOP_MQ =
  "(min-width: 720px) and (max-width: 1399px) and (any-pointer: coarse)";

const STORAGE_PREFIX = "future-forge:tabletop-panel:";

export const TABLETOP_STATIONS = [
  { id: "emtech", label: "Tech", name: "Emerging tech" },
  { id: "brief", label: "Brief", name: "Briefing" },
  { id: "outlook", label: "Capability Outlook", name: "Capability Outlook" },
  { id: "invent", label: "Invent", name: "Invent" },
  { id: "board", label: "Board", name: "Hex board" },
  { id: "vision", label: "Vision", name: "Future vision" },
  { id: "pathway", label: "Pathway", name: "Pathway" },
  { id: "rules", label: "Rules", name: "Local rules" },
  { id: "log", label: "Log", name: "Log" },
  { id: "inspect", label: "Inspect", name: "AI inspect" },
  { id: "coinventor", label: "Co-inventor", name: "AI co-inventor" },
];

/**
 * @param {{ rules?: boolean, inspect?: boolean }} [opts]
 */
export function stationsFor({ rules = true, inspect = false } = {}) {
  return TABLETOP_STATIONS.filter((station) => {
    if (station.id === "rules" && !rules) return false;
    if (station.id === "inspect" && !inspect) return false;
    return true;
  });
}

/**
 * @param {Array<{ id: string }>} stations
 * @param {string} current
 * @param {number} delta
 * @returns {string|null}
 */
export function stepStation(stations, current, delta) {
  const list = Array.isArray(stations) ? stations : [];
  if (!list.length) return null;
  const dir = delta < 0 ? -1 : 1;
  let index = list.findIndex((station) => station.id === current);
  if (index < 0) return list[0].id;
  index = (index + dir + list.length) % list.length;
  return list[index].id;
}

function waitFrames(doc, n) {
  return new Promise((resolve) => {
    const view = doc.defaultView;
    const step = (left) => {
      if (left <= 0 || !view?.requestAnimationFrame) {
        resolve();
        return;
      }
      view.requestAnimationFrame(() => step(left - 1));
    };
    step(n);
  });
}

/**
 * @param {object} [opts]
 */
export function initTabletop(opts = {}) {
  const doc = opts.document || document;
  const storage = opts.storage || null;
  const getQuestId = opts.getQuestId || (() => "");
  const crisisCount = opts.crisisCount || (() => 0);
  const unplacedCount = opts.unplacedCount || (() => 0);
  const rulesOn = opts.rulesOn || (() => true);
  const inspectOn = opts.inspectOn || (() => false);
  const briefingOn = opts.briefingOn || (() => doc.body?.classList?.contains("is-quest-briefing"));
  const onVision = opts.onVision || (() => {});
  const onLog = opts.onLog || (() => {});
  const onInspect = opts.onInspect || (() => {});
  const onCoInventor = opts.onCoInventor || (() => {});

  let mql = null;
  let questId = "";
  let current = "board";
  let userPicked = false;
  let syncing = false;
  let observer = null;

  const screen = () => doc.querySelector("#screen-workshop");
  const rail = () => doc.querySelector("#tabletop-rail");

  function matching() {
    return Boolean(mql?.matches);
  }

  function storageKey() {
    return `${STORAGE_PREFIX}${questId || "quest"}`;
  }

  function readStored() {
    try {
      return storage?.getItem(storageKey()) || "";
    } catch {
      return "";
    }
  }

  function writeStored(id) {
    try {
      storage?.setItem(storageKey(), id);
    } catch {
      /* private mode */
    }
  }

  function available() {
    return stationsFor({ rules: Boolean(rulesOn()), inspect: Boolean(inspectOn()) });
  }

  function setHidden(el, hidden) {
    if (!el || Boolean(el.hidden) === Boolean(hidden)) return;
    el.hidden = Boolean(hidden);
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
  }

  function syncChips() {
    const list = available();
    const ids = new Set(list.map((station) => station.id));
    const on = matching() && !briefingOn();
    rail()?.querySelectorAll("[data-tabletop-station]").forEach((btn) => {
      const id = btn.getAttribute("data-tabletop-station");
      setHidden(btn, !ids.has(id));
      const selected = on && id === current;
      btn.classList.toggle("is-active", selected);
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
    });
    const crises = Number(crisisCount()) || 0;
    const briefBadge = rail()?.querySelector("[data-tabletop-badge='brief']");
    if (briefBadge) {
      setHidden(briefBadge, crises <= 0);
      const text = crises > 0 ? String(crises) : "";
      if (briefBadge.textContent !== text) briefBadge.textContent = text;
    }
    const unplaced = Number(unplacedCount()) || 0;
    const inventBadge = rail()?.querySelector("[data-tabletop-badge='invent']");
    if (inventBadge) {
      setHidden(inventBadge, unplaced <= 0);
      const text = unplaced > 0 ? String(unplaced) : "";
      if (inventBadge.textContent !== text) inventBadge.textContent = text;
    }
    const src = doc.querySelector("#aitrace-badge");
    const inspectText = src && !src.hidden ? String(src.textContent || "").trim() : "";
    const inspectBadge = rail()?.querySelector("[data-tabletop-badge='inspect']");
    if (inspectBadge) {
      setHidden(inspectBadge, !inspectText);
      if (inspectBadge.textContent !== inspectText) inspectBadge.textContent = inspectText;
    }
  }

  function openSide(id) {
    if (id === "vision") onVision();
    else if (id === "log") onLog();
    else if (id === "inspect") onInspect();
    else if (id === "coinventor") onCoInventor();
  }

  function select(id, selectOpts = {}) {
    const list = available();
    let next = id;
    if (!list.some((station) => station.id === next)) next = list[0]?.id || "board";
    current = next;
    if (selectOpts.user) userPicked = true;
    const el = screen();
    if (el) el.dataset.tabletopPanel = next;
    if (selectOpts.remember !== false && matching() && !briefingOn()) writeStored(next);
    openSide(next);
    syncChips();
    rail()
      ?.querySelector(`[data-tabletop-station="${next}"]`)
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }

  function chooseInitial() {
    const stored = readStored();
    const list = available();
    if (stored && list.some((station) => station.id === stored)) return stored;
    if (Number(crisisCount()) > 0) return "brief";
    return "board";
  }

  function applyMode() {
    const on = matching();
    doc.body?.classList?.toggle("ff-tabletop", on);
    const showRail = on && !briefingOn();
    setHidden(rail(), !showRail);
    if (on && !briefingOn()) select(current, { remember: false });
    else syncChips();
  }

  function onWorkshopEnter(id) {
    questId = String(id || getQuestId() || "");
    userPicked = Boolean(readStored());
    if (!briefingOn()) select(chooseInitial(), { remember: false });
    applyMode();
  }

  function onBriefingSettled() {
    if (userPicked && readStored()) select(readStored(), { remember: false });
    else select(chooseInitial(), { remember: true });
    applyMode();
  }

  function onCrisesChanged() {
    syncChips();
    if (!matching() || briefingOn() || userPicked || readStored()) return;
    if (Number(crisisCount()) > 0 && current !== "brief") select("brief", { remember: true });
  }

  function refresh() {
    if (!available().some((station) => station.id === current)) {
      select(chooseInitial(), { remember: false });
    }
    applyMode();
  }

  function landCrisis() {
    if (!matching() || briefingOn()) return null;
    select("board", { remember: true, user: true });
    return waitFrames(doc, 2);
  }

  function onClick(event) {
    const station = event.target?.closest?.("[data-tabletop-station]");
    if (station && rail()?.contains(station)) {
      select(station.getAttribute("data-tabletop-station"), { user: true });
      return;
    }
    if (event.target?.closest?.("#tabletop-prev")) {
      select(stepStation(available(), current, -1), { user: true });
    } else if (event.target?.closest?.("#tabletop-next")) {
      select(stepStation(available(), current, 1), { user: true });
    }
  }

  function onKey(event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const railEl = rail();
    if (!railEl || !railEl.contains(doc.activeElement)) return;
    event.preventDefault();
    const dir = event.key === "ArrowRight" ? 1 : -1;
    select(stepStation(available(), current, dir), { user: true });
    railEl.querySelector(`[data-tabletop-station="${current}"]`)?.focus?.();
  }

  function onGo(event) {
    const id = event.detail?.station;
    if (id) select(id, { user: true });
  }

  function onMutate() {
    if (syncing) return;
    syncing = true;
    doc.defaultView?.requestAnimationFrame?.(() => {
      syncing = false;
      if (!available().some((station) => station.id === current)) {
        select(chooseInitial(), { remember: false });
        return;
      }
      syncChips();
    }) || (syncing = false);
  }

  mql = doc.defaultView?.matchMedia?.(TABLETOP_MQ) || null;
  mql?.addEventListener?.("change", applyMode);
  rail()?.addEventListener("click", onClick);
  rail()?.addEventListener("keydown", onKey);
  doc.addEventListener("ff-tabletop-go", onGo);
  const host = screen();
  if (host && doc.defaultView?.MutationObserver) {
    observer = new doc.defaultView.MutationObserver(onMutate);
    observer.observe(host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "data-count"],
    });
  }
  applyMode();

  return {
    select,
    refresh,
    landCrisis,
    onWorkshopEnter,
    onBriefingSettled,
    onCrisesChanged,
    destroy() {
      mql?.removeEventListener?.("change", applyMode);
      rail()?.removeEventListener("click", onClick);
      rail()?.removeEventListener("keydown", onKey);
      doc.removeEventListener("ff-tabletop-go", onGo);
      observer?.disconnect();
      doc.body?.classList?.remove("ff-tabletop");
    },
  };
}
