import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorkshopFocus, readWorkshopLayout, WORKSHOP_LAYOUT_KEY, surfaceForTarget } from "./workshop-focus.js";

function fixture() {
  class Element {
    constructor() { this.dataset = {}; this.attrs = new Map(); this.events = {}; this.hidden = false; this.inert = false; this.isConnected = true; this.children = []; this.parentElement = null; }
    setAttribute(k, v) { this.attrs.set(k, v); }
    removeAttribute(k) { this.attrs.delete(k); }
    hasAttribute(k) { return this.attrs.has(k); }
    addEventListener(k, fn) { this.events[k] = fn; }
    removeEventListener(k) { delete this.events[k]; }
    append(el) { el.parentElement?.children.splice(el.parentElement.children.indexOf(el), 1); this.children.push(el); el.parentElement = this; }
    insertBefore(el, next) { el.parentElement?.children.splice(el.parentElement.children.indexOf(el), 1); const i = this.children.indexOf(next); if (i < 0) this.children.push(el); else this.children.splice(i, 0, el); el.parentElement = this; }
    contains(el) { return el === this || this.children.some((c) => c.contains(el)); }
    closest() { return this.hasAttribute("data-workshop-hidden") || this.hidden ? this : null; }
    focus() { doc.activeElement = this; }
  }
  const screen = new Element();
  const map = new Map();
  for (const selector of [".workshop-layout", "#workshop-navigation", ".tech-library", ".invent-center", ".vision-panel", "#hex-tile-create", ".hex-board-dock", "#pathway-panel", "#policy-weather", "#invent-capability-explorer", "#side-vision", "#side-coinventor", "#side-log", "#side-aitrace", "#workshop-layout-choice", "#workshop-return", "#workshop-chosen-tech", "#workshop-tech-name", "#hex-board-wrap", "#workshop-more-tools", ".game-actions", "#challenge-ready-hint"]) {
    const el = new Element(); map.set(selector, el); screen.append(el);
  }
  const actions = map.get(".game-actions"), hint = map.get("#challenge-ready-hint"), home = map.get(".invent-center");
  home.append(actions); home.append(hint);
  screen.querySelector = (s) => map.get(s) || null;
  screen.querySelectorAll = () => [];
  const doc = {
    activeElement: null, events: {},
    querySelector: (s) => s === "#screen-workshop" ? screen : null,
    createElement: () => new Element(),
    addEventListener(k, fn) { this.events[k] = fn; },
  };
  const values = new Map();
  const storage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) };
  let prepared = 0;
  const ctl = createWorkshopFocus({ document: doc, storage, onOpen: () => prepared++ });
  return { ctl, map, doc, screen, values, storage, prepared: () => prepared, actions, home };
}

test("layout preference is reversible and remains independent of run/seat", () => {
  const f = fixture();
  assert.equal(f.ctl.current().layout, "overview");
  f.ctl.setLayout("focus");
  assert.equal(f.values.get(WORKSHOP_LAYOUT_KEY), "focus");
  assert.equal(readWorkshopLayout(f.storage), "focus");
  f.ctl.sync({ runKey: "a", seatKey: "one" });
  f.ctl.select("idea", { focus: false });
  f.ctl.sync({ runKey: "b", seatKey: "one" });
  assert.equal(f.ctl.current().surface, "board");
  assert.equal(f.ctl.current().layout, "focus");
  assert.equal(readWorkshopLayout({ getItem() { throw Error(); } }), "overview");
});

test("passive updates preserve typing, live nodes, selected surface, and focus", () => {
  const f = fixture();
  f.ctl.setLayout("focus");
  f.ctl.sync({ runKey: "a", focusedTechId: "vr", focusedTechName: "VR" });
  f.ctl.select("idea", { focus: false });
  const editor = f.map.get("#hex-tile-create"); editor.value = "A mechanism in progress";
  f.doc.activeElement = editor;
  const before = f.prepared();
  f.ctl.sync({ runKey: "a", focusedTechId: "vr", focusedTechName: "VR", assessment: "delayed red result", draft: "new text" });
  assert.equal(f.ctl.current().surface, "idea");
  assert.equal(f.doc.activeElement, editor);
  assert.equal(editor.value, "A mechanism in progress");
  assert.equal(f.prepared(), before, "refresh never opens tools or executes actions");
  assert.equal(f.map.get("#hex-tile-create"), editor);
  f.ctl.setLayout("overview");
  assert.equal(f.actions.parentElement, f.home, "restores real action controls");
  assert.equal(editor.inert, false);
});

test("support return preserves draft route and scoped seat contexts", () => {
  const f = fixture();
  f.ctl.sync({ runKey: "a", seatKey: "one", focusedTechId: "vr" });
  f.ctl.select("idea", { focus: false });
  const opener = f.map.get("#hex-tile-create"); f.doc.activeElement = opener;
  f.ctl.select("evidence", { focus: false });
  assert.equal(f.map.get("#workshop-return").textContent, "Back to your idea");
  f.ctl.back();
  assert.equal(f.ctl.current().surface, "idea");
  assert.equal(f.doc.activeElement, opener);
  const saved = f.ctl.capture();
  f.ctl.sync({ runKey: "a", seatKey: "two" });
  assert.equal(f.ctl.current().surface, "board");
  f.ctl.restore(saved);
  assert.equal(f.ctl.current().surface, "board", "stale help cannot move another seat");
  f.ctl.sync({ runKey: "a", seatKey: "one" });
  assert.equal(f.ctl.current().surface, "idea");
  f.ctl.sync({ runKey: "b", seatKey: "one" });
  assert.equal(f.ctl.current().surface, "board");
});

test("explicit reveal selects correct editor and leaves native unavailable panels hidden", () => {
  const f = fixture();
  f.ctl.setLayout("focus");
  f.ctl.sync({ runKey: "a", focusedTechId: "vr" });
  f.ctl.revealTarget({ target: { kind: "selector", selector: "#btn-ask-ideas" } });
  assert.equal(f.ctl.current().route, "ask");
  f.ctl.revealTarget({ target: { kind: "selector", selector: "#btn-mint-custom" } });
  assert.equal(f.ctl.current().route, "write");
  assert.equal(f.ctl.current().surface, "idea");
  f.map.get("#policy-weather").hidden = true;
  f.ctl.select("rules", { focus: false });
  assert.equal(f.map.get("#policy-weather").hidden, true);
  f.ctl.select("inspect", { focus: false });
  assert.equal(f.ctl.current().surface, "board", "developer scope cannot be bypassed");
  assert.equal(surfaceForTarget({ target: { kind: "hex-tile", id: "abc" } }), "board");
});

test("intro and replay stay quiet without losing the chosen task", () => {
  const f = fixture(); f.ctl.setLayout("focus");
  f.ctl.sync({ runKey: "a", briefingActive: true });
  assert.equal(f.map.get(".vision-panel").inert, false);
  assert.equal(f.map.get("#workshop-navigation").hidden, true);
  f.ctl.sync({ runKey: "a", introductionPending: true });
  assert.equal(f.screen.dataset.workshopSurface, "introduction");
  assert.equal(f.map.get(".hex-board-dock").inert, false);
  assert.equal(f.map.get(".tech-library").inert, true);
  f.ctl.sync({ runKey: "a" });
  assert.equal(f.screen.dataset.workshopSurface, "board");
});

test("supporting tools and viewed seats restore their own scroll positions", () => {
  const f = fixture(), scroller = f.map.get(".workshop-layout");
  f.ctl.sync({ runKey: "run", seatKey: "one" });
  f.ctl.select("idea", { focus: false });
  scroller.scrollTop = 240;
  f.ctl.select("evidence", { focus: false });
  assert.equal(scroller.scrollTop, 0);
  scroller.scrollTop = 80;
  f.ctl.back();
  assert.equal(scroller.scrollTop, 240);
  f.ctl.sync({ runKey: "run", seatKey: "two" });
  assert.equal(scroller.scrollTop, 0);
  scroller.scrollTop = 110;
  f.ctl.sync({ runKey: "run", seatKey: "one" });
  assert.equal(scroller.scrollTop, 240);
});
