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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCrisisIntroduction } from './crisis-introduction.js';
import { seedCrisisTiles } from './hex/board-state.js';

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.className = '';
    this.children = [];
    this.dataset = {};
    this.attrs = {};
    this.style = {};
    this.hidden = false;
    this.open = false;
    this.listeners = {};
  }
  append(...children) {
    for (const c of children) {
      c.parent = this;
      this.children.push(c);
    }
  }
  replaceChildren() { this.children = []; }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this);
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  click() { if (!this.disabled) this.listeners.click?.(); }
  querySelectorAll(selector) {
    const out = [];
    const match = (el) => {
      if (selector === 'button') return el.tag === 'button';
      if (selector === 'button.crisis-introduction-card') {
        return el.tag === 'button' && String(el.className || '').split(/\s+/).includes('crisis-introduction-card');
      }
      if (selector === 'button[data-crisis-place-all]') {
        return el.tag === 'button' && (el.dataset.crisisPlaceAll === '1' || el.attrs['data-crisis-place-all'] === '1');
      }
      return false;
    };
    const walk = (node) => {
      for (const c of node.children) {
        if (match(c)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return { left: 10, top: 10, width: 100, height: 50 }; }
  cloneNode() { return new Element(this.tag); }
  animate() { return this.animationFactory(); }
}

function setup({ reduced = false, geometry = true } = {}) {
  const board = seedCrisisTiles({
    crisisRoles: ['support', 'local'],
    pressure: { Scarcity: 3, Illness: 2 },
    pressureDesc: { Scarcity: 'Not enough water' },
  });
  board.tiles['crisis-support'].lamp = 'green';
  const before = JSON.stringify(board);
  const panel = new Element();
  panel.open = true;
  const host = new Element();
  const body = new Element();
  const tiles = Object.values(board.tiles).map((t) => {
    const e = new Element();
    e.dataset.id = t.id;
    if (!geometry) e.getBoundingClientRect = () => ({ width: 0, height: 0 });
    return e;
  });
  const doc = {
    body,
    createElement: (tag) => new Element(tag),
    querySelector: (q) => (q === '#crisis-briefing' ? panel : host),
    querySelectorAll: () => tiles,
  };
  let renders = 0;
  let changes = 0;
  const ctl = createCrisisIntroduction({
    document: doc,
    getBoard: () => board,
    repaint: () => renders++,
    onChange: () => changes++,
    reducedMotion: () => reduced,
  });
  return { board, before, panel, host, body, doc, ctl, renders: () => renders, changes: () => changes };
}

test('root-cause role is labelled from the tile and missing descriptions fall back to role blurbs', () => {
  const x = setup({ reduced: true });
  x.board.tiles['crisis-support'].role = 'global';
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  const cards = x.host.querySelectorAll('button.crisis-introduction-card');
  const badge = cards[0].children[1];
  assert.equal(badge.textContent, 'Root cause');
  assert.equal(badge.className, 'crisis-introduction-role role-global');
  // Second card has no pressureDesc -> uses role blurb instead of generic "Crisis indicator".
  assert.equal(cards[1].children[3].textContent, 'The harm people feel on the ground today');
});

test('keyboard focus moves to the next card without scrolling after landing', () => {
  const x = setup({ reduced: true });
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  const [first, second] = x.host.querySelectorAll('button.crisis-introduction-card');
  x.doc.activeElement = first;
  let focusOpts = null;
  second.focus = (opts) => {
    focusOpts = opts;
    x.doc.activeElement = second;
  };
  first.click();
  assert.equal(x.doc.activeElement, second);
  assert.deepEqual(focusOpts, { preventScroll: true });
});

test('seeded identity, collapsed briefing recap, reduced-motion landing, final hide and replay', () => {
  const x = setup({ reduced: true });
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  assert.equal(x.ctl.count(), 2);
  // Briefing recap stays collapsed so it never buries the board.
  assert.equal(x.panel.open, false);
  const [a, b] = x.host.querySelectorAll('button.crisis-introduction-card');
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
  a.click();
  assert.equal(x.ctl.isHidden('crisis-support'), false);
  assert.equal(x.ctl.isHidden('crisis-local'), true);
  // Place all button hides when only one card remains.
  assert.equal(x.host.querySelector('button[data-crisis-place-all]').hidden, true);
  b.click();
  assert.equal(x.ctl.count(), 0);
  assert.equal(x.panel.open, false);
  assert.equal(x.host.hidden, true);
  // User manually opens briefing later -> replay/show does not wipe or regenerate cards.
  x.panel.open = true;
  x.ctl.show();
  assert.equal(x.panel.open, true);
  assert.equal(x.host.querySelectorAll('button.crisis-introduction-card').length, 0);
  assert.equal(JSON.stringify(x.board), x.before);
});

test('Place all shortcut reveals all remaining crisis cards cleanly', () => {
  const x = setup({ reduced: true });
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  const allBtn = x.host.querySelector('button[data-crisis-place-all]');
  assert.ok(allBtn);
  assert.equal(allBtn.textContent, 'Place all');
  allBtn.click();
  assert.equal(x.ctl.count(), 0);
  assert.equal(x.ctl.isHidden('crisis-support'), false);
  assert.equal(x.ctl.isHidden('crisis-local'), false);
  assert.equal(x.host.hidden, true);
});

test('flight guards duplicates, reveals only on landing and reset cancels safely', async () => {
  const x = setup();
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  let resolve;
  let cancelled = false;
  Element.prototype.animationFactory = () => ({
    finished: new Promise((r) => { resolve = r; }),
    cancel: () => { cancelled = true; },
  });
  const [a, b] = x.host.querySelectorAll('button.crisis-introduction-card');
  a.click();
  a.click();
  b.click();
  assert.equal(x.ctl.count(), 2);
  assert.equal(x.ctl.isHidden(a.dataset.crisisId), true);
  assert.equal(x.body.children.length, 1);
  resolve();
  await Promise.resolve();
  assert.equal(x.ctl.count(), 1);
  assert.equal(cancelled, true);
  assert.equal(x.body.children.length, 0);
  b.click();
  x.ctl.reset();
  resolve();
  await Promise.resolve();
  assert.equal(x.ctl.count(), 0);
  assert.equal(x.panel.open, false);
  assert.equal(x.body.children.length, 0);
});

test('missing geometry reveals immediately and restored or empty boards do not hide tiles', () => {
  const x = setup({ geometry: false });
  x.ctl.prepare(x.board, true);
  x.ctl.show();
  x.host.querySelectorAll('button.crisis-introduction-card')[0].click();
  assert.equal(x.ctl.count(), 1);
  x.ctl.prepare(x.board, false);
  x.ctl.show();
  assert.equal(x.ctl.count(), 0);
  assert.equal(x.ctl.isHidden('crisis-local'), false);
  assert.equal(x.panel.open, false);
  x.ctl.prepare({ tiles: {} }, true);
  x.ctl.show();
  assert.equal(x.ctl.count(), 0);
});
