import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCrisisIntroduction } from './crisis-introduction.js';
import { seedCrisisTiles } from './hex/board-state.js';

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.dataset = {}; this.style = {}; this.hidden = false; this.open = false; this.listeners = {}; }
  append(...children) { for (const c of children) { c.parent = this; this.children.push(c); } }
  replaceChildren() { this.children = []; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  setAttribute() {}
  addEventListener(type, fn) { this.listeners[type] = fn; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelectorAll(selector) { return selector === 'button' ? this.children.filter((c) => c.tag === 'button') : []; }
  getBoundingClientRect() { return { left: 10, top: 10, width: 100, height: 50 }; }
  cloneNode() { return new Element(this.tag); }
  animate() { return this.animationFactory(); }
}
function setup({ reduced = false, geometry = true } = {}) {
  const board = seedCrisisTiles({ crisisRoles: ['support', 'local'], pressure: { Scarcity: 3, Illness: 2 }, pressureDesc: { Scarcity: 'Not enough water' } });
  board.tiles['crisis-support'].lamp = 'green';
  const before = JSON.stringify(board);
  const panel = new Element(), host = new Element(), body = new Element();
  const tiles = Object.values(board.tiles).map((t) => { const e = new Element(); e.dataset.id = t.id; if (!geometry) e.getBoundingClientRect = () => ({ width: 0, height: 0 }); return e; });
  const doc = { body, createElement: (tag) => new Element(tag), querySelector: (q) => q === '#crisis-briefing' ? panel : host, querySelectorAll: () => tiles };
  let renders = 0;
  const ctl = createCrisisIntroduction({ document: doc, getBoard: () => board, repaint: () => renders++, reducedMotion: () => reduced });
  return { board, before, panel, host, body, doc, ctl, renders: () => renders };
}
test('root-cause role is labelled from the tile rather than its position', () => {
  const x = setup({ reduced: true });
  x.board.tiles['crisis-support'].role = 'global';
  x.ctl.prepare(x.board, true); x.ctl.show();
  const badge = x.host.querySelectorAll('button')[0].children[1];
  assert.equal(badge.textContent, 'Root cause');
  assert.equal(badge.className, 'crisis-introduction-role role-global');
});
test('keyboard focus moves to the next card after landing', () => {
  const x = setup({ reduced: true });
  x.ctl.prepare(x.board, true); x.ctl.show();
  const [first, second] = x.host.querySelectorAll('button');
  x.doc.activeElement = first;
  second.focus = () => { x.doc.activeElement = second; };
  first.click();
  assert.equal(x.doc.activeElement, second);
});
test('seeded identity, subset, status, reduced-motion landing, final collapse and replay', () => {
  const x = setup({ reduced: true });
  x.ctl.prepare(x.board, true); x.ctl.show();
  assert.equal(x.ctl.count(), 2); assert.equal(x.panel.open, true);
  const [a, b] = x.host.querySelectorAll('button');
  assert.equal(a.dataset.crisisId, 'crisis-support');
  assert.equal(a.children[0].className, 'crisis-introduction-visual');
  assert.equal(a.children[0].children[0].className, 'crisis-introduction-hex green');
  assert.equal(a.children[1].textContent, 'Public support');
  assert.equal(a.children[1].className, 'crisis-introduction-role role-support');
  assert.equal(a.children[2].textContent, 'Scarcity');
  assert.equal(a.children[3].textContent, 'Not enough water');
  assert.equal(a.children[4].textContent, 'Status: green');
  assert.equal(b.children[1].textContent, 'Here and now');
  assert.equal(b.children[1].className, 'crisis-introduction-role role-local');
  a.click(); assert.equal(x.ctl.isHidden('crisis-support'), false); assert.equal(x.ctl.isHidden('crisis-local'), true);
  assert.equal(x.panel.open, true); b.click();
  assert.equal(x.ctl.count(), 0); assert.equal(x.panel.open, false); assert.equal(x.host.hidden, true);
  x.panel.open = true; x.ctl.show(); assert.equal(x.panel.open, true); assert.equal(x.host.querySelectorAll('button').length, 0);
  assert.equal(JSON.stringify(x.board), x.before);
});
test('flight guards duplicates, reveals only on landing and reset cancels safely', async () => {
  const x = setup(); x.ctl.prepare(x.board, true); x.ctl.show();
  let resolve; let cancelled = false;
  Element.prototype.animationFactory = () => ({ finished: new Promise((r) => { resolve = r; }), cancel: () => { cancelled = true; } });
  const [a, b] = x.host.querySelectorAll('button'); a.click(); a.click(); b.click();
  assert.equal(x.ctl.count(), 2); assert.equal(x.ctl.isHidden(a.dataset.crisisId), true); assert.equal(x.body.children.length, 1);
  resolve(); await Promise.resolve();
  assert.equal(x.ctl.count(), 1); assert.equal(cancelled, true); assert.equal(x.body.children.length, 0);
  b.click(); x.ctl.reset(); resolve(); await Promise.resolve();
  assert.equal(x.ctl.count(), 0); assert.equal(x.body.children.length, 0);
});
test('missing geometry reveals immediately and restored or empty boards do not hide tiles', () => {
  const x = setup({ geometry: false }); x.ctl.prepare(x.board, true); x.ctl.show();
  x.host.querySelectorAll('button')[0].click(); assert.equal(x.ctl.count(), 1);
  x.ctl.prepare(x.board, false); x.ctl.show(); assert.equal(x.ctl.count(), 0); assert.equal(x.ctl.isHidden('crisis-local'), false);
  x.ctl.prepare({ tiles: {} }, true); x.ctl.show(); assert.equal(x.ctl.count(), 0);
});
