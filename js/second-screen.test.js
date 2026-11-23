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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { initSecondScreen, bringAssessmentHome } from "./second-screen.js";

function makeClassList(initial = "") {
  const set = new Set(String(initial).split(/\s+/).filter(Boolean));
  return {
    _set: set,
    add(...xs) {
      xs.forEach((x) => set.add(x));
    },
    remove(...xs) {
      xs.forEach((x) => set.delete(x));
    },
    contains(x) {
      return set.has(x);
    },
    toggle(x, on) {
      if (on === false || (on === undefined && set.has(x))) {
        set.delete(x);
        return false;
      }
      set.add(x);
      return true;
    },
  };
}

function createFakeDom({ isExtended = true, coTabbed = false } = {}) {
  function makeNode(tag, opts = {}) {
    const node = {
      tagName: String(tag).toUpperCase(),
      id: opts.id || "",
      classList: makeClassList(opts.className || ""),
      attrs: { ...(opts.attrs || {}) },
      dataset: { ...(opts.dataset || {}) },
      hidden: Boolean(opts.hidden),
      title: "",
      parentNode: null,
      ownerDocument: opts.ownerDocument || null,
      children: [],
      get isConnected() {
        let cur = this;
        while (cur.parentNode) cur = cur.parentNode;
        return cur === doc.body || cur === popDoc?.body;
      },
      get nextSibling() {
        const p = this.parentNode;
        if (!p) return null;
        const i = p.children.indexOf(this);
        return i >= 0 && i + 1 < p.children.length ? p.children[i + 1] : null;
      },
      setAttribute(k, v) {
        this.attrs[k] = String(v);
      },
      getAttribute(k) {
        return k in this.attrs ? this.attrs[k] : null;
      },
      appendChild(child) {
        if (child.parentNode) child.remove();
        child.parentNode = this;
        setOwner(child, this.ownerDocument);
        this.children.push(child);
        return child;
      },
      insertBefore(child, ref) {
        if (child.parentNode) child.remove();
        child.parentNode = this;
        setOwner(child, this.ownerDocument);
        const i = ref ? this.children.indexOf(ref) : -1;
        if (i >= 0) this.children.splice(i, 0, child);
        else this.children.push(child);
        return child;
      },
      replaceChildren(...nodes) {
        for (const old of [...this.children]) old.remove();
        for (const n of nodes) this.appendChild(n);
      },
      remove() {
        const p = this.parentNode;
        if (p) {
          const i = p.children.indexOf(this);
          if (i >= 0) p.children.splice(i, 1);
        }
        this.parentNode = null;
      },
      matches(sel) {
        return sel.split(",").some((part) => matchCompound(this, part.trim()));
      },
      closest(sel) {
        let cur = this;
        while (cur) {
          if (cur.matches?.(sel)) return cur;
          cur = cur.parentNode;
        }
        return null;
      },
      querySelector(sel) {
        return this.querySelectorAll(sel)[0] || null;
      },
      querySelectorAll(sel) {
        const parts = sel.split(",").map((s) => s.trim()).filter(Boolean);
        const out = [];
        const walk = (n) => {
          for (const c of n.children || []) {
            if (parts.some((p) => matchSelectorChain(c, p, this))) out.push(c);
            walk(c);
          }
        };
        walk(this);
        return out;
      },
    };
    return node;
  }

  function setOwner(node, owner) {
    node.ownerDocument = owner;
    for (const c of node.children || []) setOwner(c, owner);
  }

  function matchCompound(el, simple) {
    let rest = simple;
    while (rest) {
      let m;
      if ((m = /^#([a-zA-Z0-9_-]+)/.exec(rest))) {
        if (el.id !== m[1]) return false;
      } else if ((m = /^\.([a-zA-Z0-9_-]+)/.exec(rest))) {
        if (!el.classList?.contains(m[1])) return false;
      } else if ((m = /^\[([^=\]]+)(?:=['"]([^'"]+)['"])?\]/.exec(rest))) {
        const val = el.getAttribute?.(m[1]);
        if (m[2] !== undefined ? val !== m[2] : val == null) return false;
      } else {
        return false;
      }
      rest = rest.slice(m[0].length);
    }
    return true;
  }

  function matchSelectorChain(el, chain, root) {
    const tokens = chain.split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;
    if (!matchCompound(el, tokens[tokens.length - 1])) return false;
    let cur = el.parentNode;
    for (let i = tokens.length - 2; i >= 0; i--) {
      while (cur && cur !== root && !matchCompound(cur, tokens[i])) cur = cur.parentNode;
      if (!cur || (cur === root && !matchCompound(cur, tokens[i]))) return false;
      cur = cur.parentNode;
    }
    return true;
  }

  const listeners = new Map();
  const dispatched = [];
  const doc = {
    body: null,
    defaultView: null,
    createComment() {
      return makeNode("#comment", { ownerDocument: doc });
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(ev) {
      dispatched.push(ev);
      for (const fn of listeners.get(ev.type) || []) fn(ev);
      return true;
    },
    querySelector(sel) {
      return this.body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return this.body.querySelectorAll(sel);
    },
  };
  doc.body = makeNode("body", { ownerDocument: doc });

  const popListeners = new Map();
  const popDocListeners = new Map();
  const popDoc = {
    title: "",
    body: null,
    addEventListener(type, fn) {
      if (!popDocListeners.has(type)) popDocListeners.set(type, []);
      popDocListeners.get(type).push(fn);
    },
    querySelector(sel) {
      return this.body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return this.body.querySelectorAll(sel);
    },
  };
  popDoc.body = makeNode("body", { className: "ff-second-pane", ownerDocument: popDoc });

  const popWin = {
    document: popDoc,
    closed: false,
    focus() {},
    close() {
      this.closed = true;
    },
    addEventListener(type, fn) {
      if (!popListeners.has(type)) popListeners.set(type, []);
      popListeners.get(type).push(fn);
    },
    removeEventListener() {},
  };

  const win = {
    location: { href: "http://127.0.0.1:8765/" },
    screen: { isExtended, addEventListener() {} },
    open() {
      popWin.closed = false;
      return popWin;
    },
  };
  doc.defaultView = win;

  const screen = makeNode("section", { id: "screen-workshop", ownerDocument: doc });
  const panel = makeNode("aside", {
    className: `vision-panel side-panel${coTabbed ? " is-co-tabbed" : ""}`,
    ownerDocument: doc,
  });
  const tabs = makeNode("div", { className: "side-tabs", ownerDocument: doc });

  const makeTab = (id, extraItemClass = "", hidden = false, selected = false) => {
    const item = makeNode("div", {
      className: `side-tab-item${extraItemClass ? ` ${extraItemClass}` : ""}`,
      ownerDocument: doc,
    });
    const tab = makeNode("button", {
      id: `tab-${id}`,
      className: `side-tab${selected ? " active" : ""}`,
      dataset: { tab: id },
      attrs: { "data-tab": id, "aria-selected": selected ? "true" : "false" },
      hidden,
      ownerDocument: doc,
    });
    const btn = makeNode("button", {
      className: "btn-second-screen",
      attrs: { "data-second-screen": id, "aria-pressed": "false" },
      ownerDocument: doc,
    });
    item.appendChild(tab);
    item.appendChild(btn);
    tabs.appendChild(item);
    return { item, tab, btn };
  };

  const tabMap = {
    vision: makeTab("vision", "", false, true),
    assessment: makeTab("assessment", "side-tab-assessment", false, false),
    coinventor: makeTab("coinventor", "side-tab-coinventor", false, false),
    log: makeTab("log", "", false, false),
    aitrace: makeTab("aitrace", "", true, false),
  };

  const stack = makeNode("div", { className: "vision-co-stack", ownerDocument: doc });
  const paneMap = {};
  for (const id of ["vision", "assessment", "log", "aitrace", "coinventor"]) {
    const pane = makeNode("div", { id: `side-${id}`, ownerDocument: doc });
    if (id !== "coinventor") {
      const titleLine = makeNode("div", {
        className: "pane-title-line",
        hidden: true,
        ownerDocument: doc,
      });
      pane.appendChild(titleLine);
    } else {
      const coBtn = makeNode("button", {
        className: "btn-second-screen",
        attrs: { "data-second-screen": "coinventor", "aria-pressed": "false" },
        ownerDocument: doc,
      });
      pane.appendChild(coBtn);
    }
    stack.appendChild(pane);
    paneMap[id] = pane;
  }

  panel.appendChild(tabs);
  panel.appendChild(stack);
  screen.appendChild(panel);
  doc.body.appendChild(screen);

  const click = async (btn) => {
    for (const fn of listeners.get("click") || []) {
      fn({ target: btn, preventDefault() {}, stopPropagation() {} });
    }
    await new Promise((r) => setTimeout(r, 0));
  };

  return { doc, win, popDoc, popWin, panel, tabMap, paneMap, dispatched, click };
}

describe("second-screen right-hand panes", () => {
  it("keeps away tab hidden across ff-side-layout, ignores hidden Assessment on tall screens, and pops Assessment out/home", async () => {
    const env = createFakeDom({ isExtended: true, coTabbed: false });
    initSecondScreen(env.doc);

    assert.equal(env.doc.body.classList.contains("has-second-screen"), true);
    assert.equal(env.panel.classList.contains("is-single-tab"), false);

    // Send Log away on a tall non-dev screen: only Future vision stays in the upper tab bar,
    // so hidden Assessment must not block is-single-tab.
    await env.click(env.tabMap.log.btn);
    assert.equal(env.tabMap.log.item.classList.contains("is-pane-away"), true);
    assert.equal(env.panel.classList.contains("is-single-tab"), true);
    assert.equal(env.paneMap.vision.querySelector(".pane-title-line").hidden, false);

    // Subsequent ff-side-layout must preserve is-pane-away even after the send icon moved to the popup.
    env.doc.dispatchEvent(new Event("ff-side-layout"));
    assert.equal(env.tabMap.log.item.classList.contains("is-pane-away"), true);
    assert.equal(env.panel.classList.contains("is-single-tab"), true);

    // Send Future vision away: prefers AI co-inventor (not hidden Assessment) and stays away across ff-side-layout.
    env.dispatched.length = 0;
    await env.click(env.tabMap.vision.btn);
    assert.equal(env.panel.classList.contains("is-vision-away"), true);
    assert.equal(env.tabMap.vision.item.classList.contains("is-pane-away"), true);
    const selectEv = env.dispatched.find((e) => e.type === "ff-select-side-tab");
    assert.equal(selectEv?.detail?.tab, "coinventor");

    env.doc.dispatchEvent(new Event("ff-side-layout"));
    assert.equal(env.tabMap.vision.item.classList.contains("is-pane-away"), true);

    // Switch to short-screen tabbed mode and send Assessment to the second monitor, then bring it home.
    env.panel.classList.add("is-co-tabbed");
    env.doc.dispatchEvent(new Event("ff-side-layout"));
    await env.click(env.tabMap.assessment.btn);
    assert.equal(env.tabMap.assessment.item.classList.contains("is-pane-away"), true);
    assert.equal(env.popDoc.querySelector("#side-assessment"), env.paneMap.assessment);
    assert.equal(env.paneMap.assessment.querySelector(".pane-title-line").hidden, false);

    bringAssessmentHome(env.doc);
    assert.equal(env.doc.querySelector("#side-assessment"), env.paneMap.assessment);
    assert.equal(env.tabMap.assessment.item.classList.contains("is-pane-away"), false);
  });
});
