// Presentation only: the seeded board remains the source of truth.
import { CRISIS_ROLE_DEFAULT_NAMES } from './hex/board-state.js?v=crisis-role-3';
export function createCrisisIntroduction({ document: doc, getBoard, repaint, onChange = () => {}, reducedMotion = () => false }) {
  let pending = new Set();
  let active = false;
  let flying = null;
  let animation = null;
  let ghost = null;
  let generation = 0;
  const panel = () => doc.querySelector('#crisis-briefing');
  const cards = () => doc.querySelector('#crisis-introduction-cards');
  const tileElement = (id) => [...doc.querySelectorAll('#hex-board-svg g[data-id]')].find((el) => el.dataset.id === id);
  function cleanupFlight() {
    animation?.cancel();
    animation = null;
    ghost?.remove();
    ghost = null;
    flying = null;
  }
  function reset() {
    generation++;
    cleanupFlight();
    pending.clear();
    active = false;
    const host = cards();
    if (host) { host.replaceChildren(); host.hidden = true; }
    const p = panel();
    if (p) p.hidden = true;
  }
  function prepare(board, fresh) {
    reset();
    if (fresh) pending = new Set(Object.values(board?.tiles || {}).filter((t) => t?.kind === 'crisis' && t.id && t.q != null && t.r != null).map((t) => t.id));
  }
  function isHidden(id) { return pending.has(id); }
  function count() { return pending.size; }
  function show() {
    const p = panel();
    const host = cards();
    if (!p || !host) { pending.clear(); repaint(); onChange(); return; }
    p.hidden = false;
    if (!pending.size || active) return;
    active = true;
    p.open = true;
    host.hidden = false;
    const heading = doc.createElement('p');
    heading.textContent = 'Send each crisis to the board:';
    host.append(heading);
    for (const id of pending) {
      const tile = getBoard()?.tiles?.[id];
      if (!tile) { pending.delete(id); continue; }
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'crisis-introduction-card';
      button.dataset.crisisId = id;
      const role = Object.hasOwn(CRISIS_ROLE_DEFAULT_NAMES, tile.role) ? tile.role : null;
      const badge = doc.createElement('span');
      badge.className = `crisis-introduction-role${role ? ` role-${role}` : ''}`;
      badge.textContent = role ? CRISIS_ROLE_DEFAULT_NAMES[role] : 'Crisis indicator';
      const name = doc.createElement('strong'); name.className = 'hex-idea-card-title'; name.textContent = tile.name || id;
      const desc = doc.createElement('span'); desc.className = 'hex-idea-card-how'; desc.textContent = tile.description || 'Crisis indicator';
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
    if (!pending.size) { host.hidden = true; p.open = false; }
    onChange();
  }
  function activate(id, button) {
    if (!active || flying || !pending.has(id)) return;
    flying = id;
    const hadFocus = doc.activeElement === button;
    for (const el of cards()?.querySelectorAll('button') || []) el.disabled = true;
    const token = generation;
    const finish = () => {
      if (generation !== token || flying !== id) return;
      cleanupFlight();
      pending.delete(id);
      button.remove();
      repaint();
      if (!pending.size) {
        active = false;
        const host = cards(); if (host) host.hidden = true;
        const p = panel(); if (p) p.open = false;
      } else {
        const remaining = cards()?.querySelectorAll('button') || [];
        for (const el of remaining) el.disabled = false;
        if (hadFocus) remaining[0]?.focus?.();
      }
      onChange();
    };
    const from = button.getBoundingClientRect();
    const destination = tileElement(id);
    let to = destination?.getBoundingClientRect();
    // On narrow layouts the board can be below the briefing. Keep the flight's
    // origin fixed on screen, but bring its landing into view before measuring.
    const view = doc.defaultView;
    if (to?.width && to?.height && view &&
        (to.top < 0 || to.bottom > view.innerHeight || to.left < 0 || to.right > view.innerWidth)) {
      destination.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      to = destination.getBoundingClientRect();
    }
    if (reducedMotion() || !from.width || !from.height || !to?.width || !to?.height || !button.animate) { finish(); return; }
    ghost = button.cloneNode(true);
    ghost.disabled = true;
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, margin: '0', zIndex: '9999', pointerEvents: 'none' });
    doc.body.append(ghost);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    try {
      animation = ghost.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: .4 }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
      animation.finished.then(finish, finish);
    } catch { finish(); }
  }
  return { prepare, reset, show, isHidden, count };
}
