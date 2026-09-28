/**
 * Send one right-hand pane to a second display.
 * The workshop window stays put. The popup is a blank page that holds that one pane.
 */

const POPUP_NAME = "ff-second-pane";

const PANES = {
  vision: { sel: "#side-vision", title: "Future vision" },
  log: { sel: "#side-log", title: "Log" },
  aitrace: { sel: "#side-aitrace", title: "AI inspect" },
  coinventor: { sel: "#side-coinventor", title: "AI co-inventor" },
};

let popup = null;
let awayId = null;
/** Comment node left in the workshop where the pane was taken from. */
let home = null;
let suppressClose = false;
let busy = false;

export function initSecondScreen(doc = document) {
  const win = doc.defaultView || window;
  syncExtended(doc, win);
  win.screen?.addEventListener?.("change", () => syncExtended(doc, win));
  doc.addEventListener("click", (ev) => onScreenClick(ev, doc, win));
  doc.addEventListener("ff-side-layout", () => syncTabs(doc));
  syncButtons(doc);
}

function onScreenClick(ev, doc, win) {
  const btn = ev.target?.closest?.("[data-second-screen]");
  if (!btn || btn.ownerDocument !== doc) return;
  ev.preventDefault();
  ev.stopPropagation();
  const id = btn.getAttribute("data-second-screen");
  if (id) void togglePane(doc, win, id);
}

function syncExtended(doc, win) {
  doc.body.classList.toggle("has-second-screen", win.screen?.isExtended === true);
}

function paneEl(doc, id) {
  const sel = PANES[id]?.sel;
  if (!sel) return null;
  return doc.querySelector(sel) || (popup && !popup.closed ? popup.document.querySelector(sel) : null);
}

function buttons(doc) {
  const list = [...doc.querySelectorAll("[data-second-screen]")];
  if (popup && !popup.closed) {
    try {
      list.push(...popup.document.querySelectorAll("[data-second-screen]"));
    } catch {
      /* popup document already gone */
    }
  }
  return list;
}

function syncButtons(doc) {
  doc.querySelector("#screen-workshop .vision-panel")?.classList.toggle("is-co-away", awayId === "coinventor");
  for (const btn of buttons(doc)) {
    const id = btn.getAttribute("data-second-screen");
    const away = id === awayId;
    const name = PANES[id]?.title || "This pane";
    const label = away ? `Bring ${name} back` : `Show ${name} on the second screen`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-pressed", away ? "true" : "false");
  }
  syncTabs(doc);
  hostPaneIcons(doc);
}

function syncTabs(doc) {
  const panel = doc.querySelector("#screen-workshop .vision-panel");
  const visionAway = awayId === "vision";
  panel?.classList.toggle("is-vision-away", visionAway);
  const items = [...doc.querySelectorAll("#screen-workshop .side-tab-item")];
  for (const item of items) {
    const id = item.querySelector("[data-second-screen]")?.getAttribute("data-second-screen");
    item.classList.toggle("is-pane-away", Boolean(id) && id === awayId);
  }
  const visible = items.filter((item) => {
    if (item.classList.contains("is-pane-away")) return false;
    if (item.classList.contains("side-tab-coinventor") && !visionAway) return false;
    const tab = item.querySelector(".side-tab");
    return tab && !tab.hidden;
  });
  panel?.classList.toggle("is-single-tab", visible.length < 2);
  const active = doc.querySelector("#screen-workshop .side-tab[aria-selected='true']")?.dataset.tab;
  const visibleIds = visible.map((item) => item.querySelector(".side-tab")?.dataset.tab).filter(Boolean);
  if (active && visibleIds.length && !visibleIds.includes(active)) {
    doc.dispatchEvent(new CustomEvent("ff-select-side-tab", { detail: { tab: visibleIds[0] } }));
  }
}

function iconButton(doc, id) {
  const sel = `[data-second-screen="${id}"]`;
  const local = doc.querySelector(`.side-tab-item ${sel}, .pane-title-line ${sel}`);
  if (local) return local;
  if (popup && !popup.closed) {
    try {
      return popup.document.querySelector(sel);
    } catch {
      return null;
    }
  }
  return null;
}

/** Keep the send / bring-back icon beside the panel title, never in a corner. */
function hostPaneIcons(doc) {
  const single = doc.querySelector("#screen-workshop .vision-panel")?.classList.contains("is-single-tab");
  for (const id of ["vision", "log", "aitrace"]) {
    const btn = iconButton(doc, id);
    const pane = paneEl(doc, id);
    const titleLine = pane?.querySelector(".pane-title-line");
    const tabItem = doc.querySelector(`#tab-${id}`)?.closest(".side-tab-item");
    if (!btn || !titleLine || !tabItem) continue;
    const away = id === awayId;
    const hostInPane = away || (single && pane.ownerDocument === doc);
    if (hostInPane) {
      titleLine.hidden = false;
      titleLine.appendChild(btn);
    } else {
      tabItem.appendChild(btn);
      titleLine.hidden = true;
    }
  }
}

function restore(doc) {
  const el = awayId ? paneEl(doc, awayId) : null;
  const marker = home;
  try {
    if (el && marker?.parentNode) marker.parentNode.insertBefore(el, marker);
  } catch (err) {
    console.warn("Could not bring the pane back", err);
  }
  marker?.remove();
  awayId = null;
  home = null;
  const win = doc.defaultView;
  if (win) win.__ffSecondDoc = null;
  syncButtons(doc);
  doc.dispatchEvent(new Event("ff-pane-home"));
}

function closePopup() {
  const pop = popup;
  popup = null;
  if (pop && !pop.closed) pop.close();
}

/** Put the co-inventor back on the workshop before another screen mounts its own. */
export function bringCoInventorHome(doc = document) {
  if (awayId !== "coinventor") return;
  restore(doc);
  closePopup();
}

function paneUrl(win) {
  return new URL("second-pane.html", win.location.href).href;
}

function isPaneDoc(pop) {
  try {
    return Boolean(pop.document?.body?.classList.contains("ff-second-pane"));
  } catch {
    return false;
  }
}

function waitForPaneDoc(pop) {
  if (isPaneDoc(pop)) return Promise.resolve();
  // window.open returns while the popup is still about:blank (readyState
  // complete). That is not a failure; the real page load comes next.
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pop.removeEventListener("load", onLoad);
      if (isPaneDoc(pop)) resolve();
      else reject(new Error("second pane did not load"));
    }, 5000);
    const onLoad = () => {
      if (!isPaneDoc(pop)) return;
      clearTimeout(timer);
      pop.removeEventListener("load", onLoad);
      resolve();
    };
    pop.addEventListener("load", onLoad);
    if (isPaneDoc(pop)) onLoad();
  });
}

function bindPopup(pop, doc, win) {
  if (!pop.__ffBound) {
    pop.__ffBound = true;
    // Move the pane out while this document still exists. Ignore hides of a
    // document that does not currently hold the pane (our own navigation).
    pop.addEventListener("pagehide", () => {
      if (suppressClose || !awayId) return;
      const sel = PANES[awayId]?.sel;
      let el = null;
      try {
        el = sel ? pop.document.querySelector(sel) : null;
      } catch {
        el = null;
      }
      if (!el || !home?.parentNode) return;
      try {
        home.parentNode.insertBefore(el, home);
      } catch (err) {
        console.warn("Could not bring the pane back", err);
        return;
      }
      home.remove();
      awayId = null;
      home = null;
      win.__ffSecondDoc = null;
      popup = null;
      syncButtons(doc);
      doc.dispatchEvent(new Event("ff-pane-home"));
    });
  }
  const paneDoc = pop.document;
  if (paneDoc.__ffClick) return;
  paneDoc.__ffClick = true;
  paneDoc.addEventListener(
    "click",
    (ev) => {
      const btn = ev.target?.closest?.("[data-second-screen]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const id = btn.getAttribute("data-second-screen");
      if (id) void togglePane(doc, win, id);
    },
    true
  );
}

function place(pop, doc, win, el, id) {
  el.hidden = false;
  pop.document.title = PANES[id].title;
  pop.document.body.replaceChildren(el);
  awayId = id;
  win.__ffSecondDoc = pop.document;
  syncButtons(doc);
  try {
    pop.focus();
  } catch {
    /* focus can fail if the popup is still opening */
  }
}

async function otherScreenBox(win) {
  if (typeof win.getScreenDetails !== "function") return null;
  try {
    const details = await win.getScreenDetails();
    const current = details.currentScreen;
    const others = [...(details.screens || [])].filter((screen) => screen !== current);
    if (!others.length) return null;
    others.sort((a, b) => b.availWidth * b.availHeight - a.availWidth * a.availHeight);
    const screen = others[0];
    return {
      x: screen.availLeft,
      y: screen.availTop,
      w: screen.availWidth,
      h: screen.availHeight,
    };
  } catch {
    return null;
  }
}

async function popupFeatures(win) {
  const box = await otherScreenBox(win);
  if (!box) return "popup=yes,width=960,height=800";
  return `popup=yes,left=${Math.round(box.x)},top=${Math.round(box.y)},width=${Math.round(box.w)},height=${Math.round(box.h)}`;
}

async function togglePane(doc, win, id) {
  if (!PANES[id] || busy) return;
  if (awayId === id) {
    restore(doc);
    closePopup();
    return;
  }
  const el = doc.querySelector(PANES[id].sel) || paneEl(doc, id);
  if (!el?.parentNode) return;
  busy = true;
  restore(doc);
  const marker = doc.createComment("ff-slot");
  el.parentNode.insertBefore(marker, el.nextSibling);
  home = marker;
  try {
    const features = await popupFeatures(win);
    if (!marker.isConnected) return;
    suppressClose = true;
    let pop = popup && !popup.closed ? popup : null;
    const url = paneUrl(win);
    if (!pop) {
      pop = win.open(url, POPUP_NAME, features);
    } else if (!isPaneDoc(pop)) {
      pop.location.href = url;
    }
    if (!pop) {
      marker.remove();
      home = null;
      return;
    }
    popup = pop;
    bindPopup(pop, doc, win);
    if (!isPaneDoc(pop)) await waitForPaneDoc(pop);
    bindPopup(pop, doc, win);
    if (!marker.isConnected || !el.isConnected) {
      marker.remove();
      home = null;
      return;
    }
    place(pop, doc, win, el, id);
  } catch (err) {
    console.warn("Could not open the second screen", err);
    restore(doc);
    closePopup();
  } finally {
    suppressClose = false;
    if (!awayId && home) {
      home.remove();
      home = null;
    }
    busy = false;
  }
}
