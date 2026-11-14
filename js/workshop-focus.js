/** Presentation only: keep the existing Workshop nodes and action handlers alive. */
export const WORKSHOP_LAYOUT_KEY = "ff.workshop.layout";
export const WORKSHOP_SURFACES = ["board", "idea", "help", "briefing", "evidence", "rules", "vision", "log", "inspect"];
const SUPPORT = new Set(["help", "briefing", "evidence", "rules", "vision", "log", "inspect"]);

export function readWorkshopLayout(storage, fallback = "overview") {
  try {
    const saved = storage?.getItem(WORKSHOP_LAYOUT_KEY);
    if (saved === "focus" || saved === "overview") return saved;
  } catch { /* Private browsing still permits an in-memory choice. */ }
  return fallback;
}

export function surfaceForTarget(step = {}) {
  if (step.surface && WORKSHOP_SURFACES.includes(step.surface)) return step.surface;
  if (step.target?.kind === "tech") return "idea";
  if (step.target?.kind === "hex-tile") return "board";
  const selector = step.target?.selector || "";
  if (/co-inventor|coinventor|co-chip|tutor/.test(selector)) return "help";
  if (/capability|outlook|btn-learn-tech/.test(selector)) return "evidence";
  if (/policy|lobby/.test(selector)) return "rules";
  if (/tech-list|filter-row|hex-tile-create|hex-how|hex-scaffold|mint|ask-ideas|idea-cards/.test(selector)) return "idea";
  if (/brief|mission-scene/.test(selector)) return "briefing";
  if (/vision/.test(selector)) return "vision";
  return "board";
}

export function createWorkshopFocus({ document: doc, storage, onOpen = () => {}, onPresentation = () => {}, defaultLayout = "overview" } = {}) {
  const screen = doc.querySelector("#screen-workshop");
  const find = (s) => screen?.querySelector(s);
  const scrollHost = () => find(".workshop-layout");
  const contexts = new Map();
  let contextKey = "";
  let current = { surface: "board", picking: true, route: "write", returnTo: "board", opener: null };
  let layout = readWorkshopLayout(storage, defaultLayout);
  let introductory = false;
  let briefing = false;
  let techName = "";
  let hasTech = false;
  let inspectOn = false;
  const suppressed = new Map();
  const actions = find(".game-actions");
  const actionHint = find("#challenge-ready-hint");
  const actionHome = actions?.parentElement;
  const hintHome = actionHint?.parentElement;
  const actionNext = actionHint;
  const hintNext = actionHint?.nextElementSibling;
  const askButton = find("#btn-ask-ideas");
  const askHome = askButton?.parentElement;
  const askNext = askButton?.nextElementSibling;
  const routes = find(".workshop-idea-routes");
  const actionArea = doc.createElement("div");
  actionArea.id = "workshop-action-area";
  actionArea.className = "workshop-action-area";
  screen?.append(actionArea);
  const toolStatus = doc.createElement("p");
  toolStatus.id = "workshop-tool-status";
  toolStatus.className = "workshop-tool-status";
  toolStatus.setAttribute("role", "status");
  find("#workshop-navigation")?.append(toolStatus);

  function suppress(el, off) {
    if (!el) return;
    if (off) {
      if (!suppressed.has(el)) suppressed.set(el, Boolean(el.inert));
      el.setAttribute("data-workshop-hidden", "");
      el.inert = true;
    } else if (suppressed.has(el)) {
      el.removeAttribute("data-workshop-hidden");
      el.inert = suppressed.get(el);
      suppressed.delete(el);
    }
  }
  function paint() {
    if (!screen) return;
    // A second screen adopts the original nodes. Release our presentation there.
    for (const el of [...suppressed.keys()]) if (!screen.contains(el)) suppress(el, false);
    const focus = layout === "focus" && !briefing;
    const surface = introductory && focus ? "introduction" : current.surface;
    screen.dataset.workshopLayout = layout;
    screen.dataset.workshopSurface = surface;
    screen.dataset.workshopPicking = String(current.picking || !hasTech);
    screen.dataset.workshopRoute = current.route;
    const is = (...ids) => ids.includes(surface);
    const missingTool = is("evidence") && (!hasTech || !find("#invent-capability-explorer") || find("#invent-capability-explorer").hidden)
      ? "Choose a technology in Add an idea to examine its capability outlook."
      : is("rules") && (!find("#policy-weather") || find("#policy-weather").hidden)
        ? "Local rules are not active in this Quest."
        : is("vision") && !find("#side-vision") ? "Future vision is open on your second screen."
          : is("help") && !find("#side-coinventor") ? "Your co-inventor is open on your second screen." : "";
    toolStatus.hidden = !missingTool;
    toolStatus.textContent = missingTool;
    if (focus && actions?.parentElement !== actionArea) {
      if (actions) actionArea.append(actions);
      if (actionHint) actionArea.append(actionHint);
    } else if (!focus && actions?.parentElement === actionArea) {
      if (actionHint) hintHome?.insertBefore(actionHint, hintNext || null);
      if (actions) actionHome?.insertBefore(actions, actionNext || null);
    }
    actionArea.hidden = !focus;
    if (focus && routes && askButton?.parentElement !== routes) routes.append(askButton);
    else if (!focus && askButton?.parentElement === routes) askHome?.insertBefore(askButton, askNext || null);
    const viewIdeas = find("#workshop-view-ideas");
    if (viewIdeas) viewIdeas.hidden = !(Number(find("#hex-idea-cards")?.dataset.count) > 0);
    for (const route of screen.querySelectorAll("[data-workshop-route]")) route.setAttribute("aria-pressed", String(route.dataset.workshopRoute === current.route));
    const rows = [
      [".tech-library", !is("idea") || !(current.picking || !hasTech)],
      [".invent-center", is("help", "vision", "log", "inspect")],
      [".vision-panel", !is("help", "vision", "log", "inspect")],
      ["#hex-tile-create", !is("idea", "board")],
      [".hex-board-dock", !is("board", "introduction")],
      ["#pathway-panel", !is("board")],
      ["#policy-weather", !is("rules")],
      ["#invent-capability-explorer", !is("evidence")],
      ["#side-vision", !is("vision")],
      ["#side-coinventor", !is("help")],
      ["#side-log", !is("log")],
      ["#side-aitrace", !is("inspect")],
    ];
    for (const [selector, off] of rows) suppress(find(selector), focus && off);
    for (const selector of ["[data-tech-dock-handle]", "[data-tech-dock-edge]", "[data-tech-drawer-backdrop]", ".hex-emtech-bar", ".vision-split-handle"])
      suppress(find(selector), focus);
    const nav = find("#workshop-navigation");
    if (nav) nav.hidden = briefing;
    for (const btn of screen.querySelectorAll("[data-workshop-go]")) {
      const selected = btn.dataset.workshopGo === current.surface;
      btn.setAttribute("aria-pressed", String(selected));
      if (btn.dataset.workshopGo === "inspect") btn.hidden = !inspectOn;
    }
    const mode = find("#workshop-layout-choice");
    if (mode) mode.value = layout;
    const back = find("#workshop-return");
    if (back) {
      back.hidden = !focus || !SUPPORT.has(current.surface) || introductory;
      back.textContent = current.returnTo === "idea" ? `Back to ${techName ? `your ${techName} idea` : "your idea"}` : "Back to Board";
    }
    const card = find("#workshop-chosen-tech");
    if (card) card.hidden = !focus || !hasTech || current.surface !== "idea" || current.picking;
    const name = find("#workshop-tech-name");
    if (name) name.textContent = techName || "Choose a technology";
    onPresentation({ layout, surface });
  }
  function select(surface, { focus = true, opener, chooseTech = false } = {}) {
    current.scroll ||= {};
    current.scroll[current.surface] = scrollHost()?.scrollTop || 0;
    if (!WORKSHOP_SURFACES.includes(surface) || (surface === "inspect" && !inspectOn)) surface = "board";
    if (SUPPORT.has(surface) && !SUPPORT.has(current.surface)) {
      current.returnTo = current.surface;
      current.opener = opener || doc.activeElement;
    }
    current.surface = surface;
    if (chooseTech) current.picking = true;
    // Only an explicit request prepares an existing tool. Passive sync never does.
    onOpen(surface);
    paint();
    if (scrollHost()) scrollHost().scrollTop = current.scroll[surface] || 0;
    const menu = find("#workshop-more-tools");
    if (menu) menu.open = false;
    if (focus) {
      const target = surface === "board" ? find("#hex-board-wrap") : surface === "idea" && (current.picking || !hasTech) ? find(".tech-library") : find(({ idea: "#hex-tile-create", help: "#side-coinventor", evidence: "#invent-capability-explorer", rules: "#policy-weather", log: "#side-log", inspect: "#side-aitrace", vision: "#side-vision", briefing: "#crisis-briefing" })[surface] || ".invent-center");
      if (target && !target.closest?.("[hidden], [data-workshop-hidden]")) {
        target.setAttribute("tabindex", "-1");
        target.focus?.({ preventScroll: true });
        target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      }
    }
    return surface;
  }
  function back() {
    const opener = current.opener;
    select(current.returnTo || "board", { focus: false });
    if (opener?.isConnected && !opener.closest?.("[hidden], [data-workshop-hidden]")) opener.focus?.({ preventScroll: true });
    else find(`[data-workshop-go="${current.surface}"]`)?.focus?.();
  }
  function sync({ runKey = "", seatKey = "solo", initialSurface = "board", briefingActive = false, introductionPending = false, focusedTechName = "", focusedTechId = null, developer = false } = {}) {
    const nextKey = JSON.stringify([runKey, seatKey]);
    const changedContext = nextKey !== contextKey;
    if (changedContext) {
      if (contextKey) {
        current.scroll ||= {};
        current.scroll[current.surface] = scrollHost()?.scrollTop || 0;
        contexts.set(contextKey, current);
      }
      // A new run cannot inherit another run's task or return target.
      if (contextKey && JSON.parse(contextKey)[0] !== runKey) contexts.clear();
      contextKey = nextKey;
      current = contexts.get(contextKey) || { surface: initialSurface, picking: !focusedTechId, route: "write", returnTo: "board", opener: null };
    }
    briefing = briefingActive;
    introductory = Boolean(introductionPending);
    techName = focusedTechName;
    hasTech = Boolean(focusedTechId);
    inspectOn = developer;
    if (!inspectOn && current.surface === "inspect") current.surface = "board";
    paint();
    if (changedContext && scrollHost()) scrollHost().scrollTop = current.scroll?.[current.surface] || 0;
  }
  function setLayout(next) {
    if (next !== "focus" && next !== "overview") return;
    layout = next;
    const assessment = find("#workshop-assessment-details");
    if (assessment) assessment.open = next === "overview";
    try { storage?.setItem(WORKSHOP_LAYOUT_KEY, next); } catch {}
    paint();
  }
  function capture() {
    const scroll = { ...current.scroll, [current.surface]: scrollHost()?.scrollTop || 0 };
    return { contextKey, current: { ...current, scroll } };
  }
  function restore(saved) {
    if (!saved || saved.contextKey !== contextKey) return false;
    current = { ...saved.current };
    onOpen(current.surface);
    paint();
    if (scrollHost()) scrollHost().scrollTop = current.scroll?.[current.surface] || 0;
    return true;
  }
  function revealTarget(step) {
    const surface = surfaceForTarget(step);
    if (surface === "idea" && hasTech && step?.target?.kind !== "tech" && !/tech-list|filter-row/.test(step?.target?.selector || "")) current.picking = false;
    if (/btn-mint-custom|hex-how|hex-scaffold/.test(step?.target?.selector || "")) current.route = "write";
    if (/btn-ask-ideas|btn-refresh-ideas/.test(step?.target?.selector || "")) current.route = "ask";
    select(surface, { focus: false, chooseTech: step?.target?.kind === "tech" || /tech-list|filter-row/.test(step?.target?.selector || "") });
  }
  function onClick(ev) {
    const go = ev.target?.closest?.("[data-workshop-go]");
    if (go && screen.contains(go)) select(go.dataset.workshopGo, { opener: go, chooseTech: go.hasAttribute("data-workshop-change-tech") });
    if (ev.target?.closest?.("#workshop-return")) back();
    const route = ev.target?.closest?.("button[data-workshop-route]");
    if (route) { current.route = route.dataset.workshopRoute; paint(); }
    if (ev.target?.closest?.("#btn-ask-ideas")) { current.route = "ask"; paint(); }
  }
  function onKey(ev) {
    if (ev.key === "Escape" && SUPPORT.has(current.surface) && !doc.querySelector("dialog[open], .modal-backdrop.open, #hex-tile-popup:not([hidden])")) { ev.preventDefault(); back(); }
  }
  screen?.addEventListener("click", onClick);
  screen?.addEventListener("keydown", onKey);
  find("#workshop-layout-choice")?.addEventListener("change", (ev) => setLayout(ev.target.value));
  doc.addEventListener("ff-workshop-place", () => select("board", { focus: false }));
  doc.addEventListener("ff-workshop-edit", () => { current.route = "write"; current.picking = false; select("idea", { focus: false }); });
  doc.addEventListener("ff-side-layout", paint);
  const assessment = find("#workshop-assessment-details");
  if (assessment) assessment.open = layout === "overview";
  paint();
  return {
    select, sync, revealTarget, setLayout, back, capture, restore,
    technologyChanged() { if (hasTech) current.picking = false; paint(); },
    current: () => ({ layout, surface: current.surface, picking: current.picking, route: current.route }),
    destroy() { for (const el of [...suppressed.keys()]) suppress(el, false); screen?.removeEventListener("click", onClick); screen?.removeEventListener("keydown", onKey); },
  };
}
