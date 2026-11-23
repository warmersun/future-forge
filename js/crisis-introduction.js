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

// Presentation only: the seeded board remains the source of truth.
import {
  CRISIS_ROLE_BLURBS,
  CRISIS_ROLE_DEFAULT_NAMES,
} from './hex/board-state.js?v=plain-1';

function sentenceCase(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}

export function createCrisisIntroduction({
  document: doc,
  getBoard,
  repaint,
  onChange = () => {},
  reducedMotion = () => false,
}) {
  let pending = new Set();
  let active = false;
  let flying = null;
  let placingAll = false;
  /** @type {Set<Animation>} */
  const animations = new Set();
  /** @type {Set<HTMLElement>} */
  const ghosts = new Set();
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  const timers = new Set();
  let generation = 0;

  const panel = () => doc.querySelector('#crisis-briefing');
  const cards = () => doc.querySelector('#crisis-introduction-cards');
  const cardButtons = () => [...(cards()?.querySelectorAll?.('button.crisis-introduction-card') || [])];
  const placeAllButton = () => cards()?.querySelector?.('button[data-crisis-place-all]') || null;
  const tileElement = (id) =>
    [...doc.querySelectorAll('#hex-board-svg g[data-id]')].find((el) => el.dataset.id === id);

  function cleanupFlight() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    for (const a of animations) {
      try { a.cancel(); } catch { /* ignore */ }
    }
    animations.clear();
    for (const g of ghosts) {
      try { g.remove(); } catch { /* ignore */ }
    }
    ghosts.clear();
    flying = null;
    placingAll = false;
  }

  function reset() {
    generation++;
    cleanupFlight();
    pending.clear();
    active = false;
    const host = cards();
    if (host) {
      host.replaceChildren();
      host.hidden = true;
    }
    const p = panel();
    if (p) {
      p.open = false;
      p.hidden = true;
    }
  }

  function prepare(board, fresh) {
    reset();
    if (fresh) {
      pending = new Set(
        Object.values(board?.tiles || {})
          .filter((t) => t?.kind === 'crisis' && t.id && t.q != null && t.r != null)
          .map((t) => t.id)
      );
    }
  }

  function isHidden(id) {
    return pending.has(id);
  }

  function count() {
    return pending.size;
  }

  function firstCardButton() {
    return cardButtons()[0] || null;
  }

  function syncPlaceAllVisibility() {
    const btn = placeAllButton();
    if (btn) btn.hidden = pending.size <= 1;
  }

  function show() {
    const p = panel();
    const host = cards();
    if (!host) {
      if (p) p.hidden = false;
      pending.clear();
      repaint();
      onChange();
      return;
    }
    if (p) p.hidden = false;
    if (!pending.size || active) return;
    active = true;
    if (p) p.open = false;
    host.replaceChildren();
    host.hidden = false;

    const head = doc.createElement('div');
    head.className = 'crisis-introduction-head';
    const heading = doc.createElement('p');
    heading.className = 'crisis-introduction-prompt';
    heading.textContent = 'Send each crisis to the board:';
    head.append(heading);
    if (pending.size > 1) {
      const allBtn = doc.createElement('button');
      allBtn.type = 'button';
      allBtn.className = 'btn btn-ghost btn-sm crisis-introduction-all';
      allBtn.dataset.crisisPlaceAll = '1';
      allBtn.setAttribute('data-crisis-place-all', '1');
      allBtn.textContent = 'Place all';
      allBtn.addEventListener('click', () => placeAll());
      head.append(allBtn);
    }
    host.append(head);

    for (const id of pending) {
      const tile = getBoard()?.tiles?.[id];
      if (!tile) {
        pending.delete(id);
        continue;
      }
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'crisis-introduction-card';
      button.dataset.crisisId = id;
      const role = Object.hasOwn(CRISIS_ROLE_DEFAULT_NAMES, tile.role) ? tile.role : null;
      const badge = doc.createElement('span');
      badge.className = `crisis-introduction-role${role ? ` role-${role}` : ''}`;
      badge.textContent = role ? CRISIS_ROLE_DEFAULT_NAMES[role] : 'Crisis indicator';
      const name = doc.createElement('strong');
      name.className = 'hex-idea-card-title';
      name.textContent = tile.name || id;
      const desc = doc.createElement('span');
      desc.className = 'hex-idea-card-how';
      const fallbackDesc = role && CRISIS_ROLE_BLURBS[role]
        ? sentenceCase(CRISIS_ROLE_BLURBS[role])
        : 'Crisis indicator';
      desc.textContent = tile.description || fallbackDesc;
      const lamp = doc.createElement('span');
      const color = ['red', 'yellow', 'green'].includes(tile.lamp) ? tile.lamp : 'red';
      lamp.className = `crisis-introduction-lamp ${color}`;
      lamp.textContent = `Status: ${color}`;
      const visual = doc.createElement('span');
      visual.className = 'crisis-introduction-visual';
      visual.setAttribute('aria-hidden', 'true');
      const hex = doc.createElement('span');
      hex.className = `crisis-introduction-hex ${color}`;
      visual.append(hex);
      button.append(visual, badge, name, desc, lamp);
      button.addEventListener('click', () => activate(id, button));
      host.append(button);
    }
    if (!pending.size) {
      active = false;
      host.replaceChildren();
      host.hidden = true;
    } else {
      syncPlaceAllVisibility();
    }
    onChange();
  }

  function finishAllIfEmpty() {
    if (pending.size) return false;
    active = false;
    placingAll = false;
    const host = cards();
    if (host) {
      host.replaceChildren();
      host.hidden = true;
    }
    return true;
  }

  function measureDestination(destination) {
    let to = destination?.getBoundingClientRect();
    const view = doc.defaultView;
    if (
      to?.width &&
      to?.height &&
      view &&
      (to.top < 0 || to.bottom > view.innerHeight || to.left < 0 || to.right > view.innerWidth)
    ) {
      destination.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      to = destination.getBoundingClientRect();
    }
    return to;
  }

  function launchGhost(button, to, duration, onDone) {
    const from = button.getBoundingClientRect();
    if (
      reducedMotion() ||
      !from?.width ||
      !from?.height ||
      !to?.width ||
      !to?.height ||
      !button.animate
    ) {
      onDone();
      return;
    }
    const ghostEl = button.cloneNode(true);
    ghostEl.disabled = true;
    ghostEl.setAttribute('aria-hidden', 'true');
    Object.assign(ghostEl.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: '0',
      zIndex: '9999',
      pointerEvents: 'none',
    });
    doc.body.append(ghostEl);
    ghosts.add(ghostEl);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    let settled = false;
    const complete = () => {
      if (settled) return;
      settled = true;
      ghosts.delete(ghostEl);
      ghostEl.remove();
      onDone();
    };
    try {
      const anim = ghostEl.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0.4 },
        ],
        { duration, easing: 'ease-in-out', fill: 'forwards' }
      );
      animations.add(anim);
      const wrap = () => {
        animations.delete(anim);
        try { anim.cancel(); } catch { /* ignore */ }
        complete();
      };
      anim.finished.then(wrap, wrap);
    } catch {
      complete();
    }
  }

  function activate(id, button) {
    if (!active || flying || placingAll || !pending.has(id)) return;
    flying = id;
    const hadFocus = doc.activeElement === button;
    for (const el of cardButtons()) el.disabled = true;
    const allBtn = placeAllButton();
    if (allBtn) allBtn.disabled = true;
    const token = generation;
    const finish = () => {
      if (generation !== token || flying !== id) return;
      cleanupFlight();
      pending.delete(id);
      button.remove();
      repaint();
      if (!finishAllIfEmpty()) {
        const remaining = cardButtons();
        for (const el of remaining) el.disabled = false;
        const nextAll = placeAllButton();
        if (nextAll) nextAll.disabled = false;
        syncPlaceAllVisibility();
        if (hadFocus) remaining[0]?.focus?.({ preventScroll: true });
      }
      onChange();
    };
    const to = measureDestination(tileElement(id));
    launchGhost(button, to, 520, finish);
  }

  function placeAll() {
    if (!active || flying || placingAll || !pending.size) return;
    placingAll = true;
    const buttons = cardButtons().filter((b) => pending.has(b.dataset.crisisId));
    for (const el of buttons) el.disabled = true;
    const allBtn = placeAllButton();
    if (allBtn) allBtn.disabled = true;

    const token = generation;
    const immediate = reducedMotion() || !buttons.length;
    if (immediate) {
      for (const b of buttons) {
        pending.delete(b.dataset.crisisId);
        b.remove();
      }
      pending.clear();
      cleanupFlight();
      finishAllIfEmpty();
      repaint();
      onChange();
      return;
    }

    let remainingFlights = buttons.length;
    const landOne = (id, button) => {
      if (generation !== token) return;
      pending.delete(id);
      button.remove();
      remainingFlights -= 1;
      repaint();
      if (remainingFlights <= 0 || !pending.size) {
        pending.clear();
        cleanupFlight();
        finishAllIfEmpty();
        onChange();
      }
    };

    // Bring first destination into view once if needed (tiny screens).
    measureDestination(tileElement(buttons[0].dataset.crisisId));
    buttons.forEach((btn, idx) => {
      const id = btn.dataset.crisisId;
      const delay = idx * 100;
      const run = () => {
        if (generation !== token || !pending.has(id)) return;
        const to = tileElement(id)?.getBoundingClientRect();
        launchGhost(btn, to, 420, () => landOne(id, btn));
      };
      if (delay === 0) {
        run();
      } else {
        const t = setTimeout(() => {
          timers.delete(t);
          run();
        }, delay);
        timers.add(t);
      }
    });
  }

  return { prepare, reset, show, isHidden, count, firstCardButton, placeAll };
}
