/**
 * Plain-words glossary — tap-to-define for the names on screen.
 * Pure data + HTML helper are safe anywhere; bindGlossaryTaps is browser-only.
 *
 * Register: a high-school senior with no prior knowledge; adult tone.
 */

export const PLAIN_MAX = 160;

/** @type {Record<string, { term: string, plain: string, analogy?: string }>} */
export const GLOSSARY = {
  emtech: {
    term: "emTech",
    plain: "Short for emerging technology: a family of tools still getting much better and cheaper every year, like AI, solar, or gene sequencing.",
  },
  "emerging-tech": {
    term: "Emerging tech",
    plain: "Technology families still riding a steep curve: better and cheaper every year, so what they can do keeps changing.",
    analogy: "Phones in 2005 versus 2015: same word, very different tool.",
  },
  bits: {
    term: "Bits",
    plain: "The world of information: software, data, AI, networks. Shown blue on a tile.",
  },
  atoms: {
    term: "Atoms",
    plain: "The physical world: energy, machines, materials, bodies. Shown pink on a tile.",
  },
  world: {
    term: "World",
    plain: "Which side a tile lives on: bits (information), atoms (physical things), or both. Tiles only dock where worlds match.",
    analogy: "Software cannot grab a propeller; a sensor or a printer bridges the two.",
  },
  pathway: {
    term: "Pathway",
    plain: "Your connected island of idea tiles, judged as one invention. Not a fixed answer: it gets stronger as its technologies improve.",
  },
  honest: {
    term: "Honest",
    plain: "The idea claims only what this technology can really do this year. Not science fiction treated as routine.",
  },
  "look-ahead": {
    term: "Look Ahead",
    plain: "See how the technologies on your board get better over time, then choose whether to Wait two years for that.",
    analogy: "An exponential clock: the curve tells you when the tools catch up to the idea.",
  },
  wait: {
    term: "Wait +2 years",
    plain: "Move the calendar two years forward. Your technologies improve, but the crisis meters rise.",
  },
  "end-turn": {
    term: "End turn",
    plain: "Move the calendar one year forward and refill your attention. Crisis meters stay put.",
  },
  "crisis-meter": {
    term: "Crisis meter",
    plain: "How bad one part of the problem is here, from 0 to 5. Reach 5 and the place falls. Your ideas must ease it.",
  },
  local: {
    term: "Here and now",
    plain: "The harm people feel on the ground today. Does your idea help them soon?",
  },
  global: {
    term: "Root cause",
    plain: "The underlying driver that keeps producing the harm. Does your idea move that, not only the symptom?",
  },
  support: {
    term: "Public support",
    plain: "Buy-in from people and officials so the idea can actually be built here.",
  },
  challenger: {
    term: "Challenger",
    plain: "A critic who lands on your board with one hard question. Answer it honestly to turn their light yellow or green.",
  },
  moloch: {
    term: "Moloch",
    plain: "The critic of bad incentives: races, freeloading, and shortcuts that punish anyone who does the right thing.",
    analogy: "Everyone would be better off cooperating, but each player gains by defecting.",
  },
  ethicist: {
    term: "Ethicist",
    plain: "The critic who asks who is harmed, who decides, and who is left out.",
  },
  stakeholder: {
    term: "Stakeholder",
    plain: "The critic who speaks for the people living here: will they use it, trust it, afford it?",
  },
  "mother-nature": {
    term: "Mother Nature",
    plain: "The critic who asks what your idea costs the land, water, air, and living things around it.",
  },
  coverage: {
    term: "Coverage",
    plain: "Are all the crisis lights eased by an idea? Red means a meter still has nothing helping it.",
  },
  bonds: {
    term: "Bonds",
    plain: "Are the crisis hexes touching your island of ideas? A light cannot read an idea it does not touch.",
  },
  timing: {
    term: "Timing",
    plain: "Is the whole pathway honest for this year? A weak claim on one tile drags the combined chance down.",
  },
  convergence: {
    term: "Convergence",
    plain: "Two technologies that make each other better when they touch: better batteries make better drones, more drones demand better batteries.",
  },
  budget: {
    term: "Budget",
    plain: "Cash to place technologies on the board. A pathway that eases a crisis pays some back.",
  },
  "support-resource": {
    term: "Support",
    plain: "Backing from the public and officials. Some technologies need it to be adopted. Lobby raises it.",
  },
  ap: {
    term: "AP",
    plain: "Attention points: how many moves you can make this turn. End turn refills them.",
  },
  exponential: {
    term: "Exponential",
    plain: "Growth that multiplies instead of adding: doubling, then doubling again. Slow-looking at first, then startlingly fast.",
    analogy: "Thirty steps of one metre each reach 30 m. Thirty doublings of one metre reach the Moon and back.",
  },
  "log-scale": {
    term: "Log scale",
    plain: "A chart axis where each step up means ten times more, so a straight line means steady doubling.",
  },
  doubling: {
    term: "Doubling",
    plain: "How many years it takes for this capability to become twice as good.",
  },
  halving: {
    term: "Halving",
    plain: "How many years it takes for this cost to fall by half. Falling cost is as exponential as rising power.",
  },
  cagr: {
    term: "CAGR",
    plain: "Compound annual growth rate: the steady yearly percentage this trend grows by.",
  },
  reached: {
    term: "Reached",
    plain: "A milestone that has already happened.",
  },
  predicted: {
    term: "Predicted",
    plain: "A milestone someone forecasts. A labelled guess, not a promise, and never a free pass for your idea.",
  },
  "early-tech-risk": {
    term: "Early-tech risk",
    plain: "Newer technology can spike a crisis meter when hype outruns what works. Riskier picks carry a higher number.",
  },
  elegance: {
    term: "Elegance",
    plain: "Did your ideas span more than one family and fit together, rather than piling on tools?",
  },
  spotlight: {
    term: "Spotlight",
    plain: "The one technology this Quest is built to practice, based on a recent real advance.",
  },
  rd: {
    term: "R&D",
    plain: "A research gamble tile. Dock it against a pathway to multiply its honesty chance, up or down.",
  },
  lobby: {
    term: "Lobby",
    plain: "Write a local rule to raise Support. It changes the conditions here; it does not ease a crisis meter by itself.",
  },
  "art-of-the-possible": {
    term: "Art of the possible",
    plain: "Ask the co-inventor what already works with these technologies here, this year, and what is still a stretch.",
  },
  learn: {
    term: "Learn",
    plain: "A short primer on one technology family: what it is, what works now, where the curve is heading, how to invent with it here.",
  },
};

/**
 * @param {string} id
 * @returns {{ term: string, plain: string, analogy?: string } | null}
 */
export function glossaryEntry(id) {
  return GLOSSARY[id] || null;
}

/**
 * Wrap a label so a tap opens its plain definition.
 * @param {string} id — glossary key
 * @param {string} [label] — text to show (defaults to the entry's term)
 * @param {{ className?: string }} [opts]
 */
export function termHtml(id, label, opts = {}) {
  const entry = glossaryEntry(id);
  const text = escapeHtml(label != null ? label : entry?.term || id);
  if (!entry) return text;
  const cls = opts.className ? ` ${escapeHtml(opts.className)}` : "";
  return `<dfn class="term${cls}" data-term="${escapeHtml(id)}" tabindex="0" role="button" aria-label="${escapeHtml(entry.term)} — what is this?" title="Tap for plain words">${text}</dfn>`;
}

/**
 * Plain one-liner for permanent display under a label.
 * @param {string} id
 */
export function plainLine(id) {
  return glossaryEntry(id)?.plain || "";
}

/**
 * Browser only: one delegated handler that opens a small popover next to any <dfn data-term>.
 * Click / Enter / Space toggles; Escape or click-away closes. Touch-safe (no hover needed).
 * @param {Document|HTMLElement} [root]
 */
export function bindGlossaryTaps(root) {
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) return () => {};
  const host = root || doc;
  if (host.__ffGlossaryBound) return host.__ffGlossaryBound;
  let pop = null;
  let anchor = null;

  const close = () => {
    if (pop) pop.remove();
    pop = null;
    if (anchor) anchor.setAttribute("aria-expanded", "false");
    anchor = null;
  };

  const open = (dfn) => {
    const id = dfn.getAttribute("data-term");
    const entry = glossaryEntry(id);
    if (!entry) return;
    if (anchor === dfn) {
      close();
      return;
    }
    close();
    anchor = dfn;
    dfn.setAttribute("aria-expanded", "true");
    pop = doc.createElement("div");
    pop.className = "term-pop";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", entry.term);
    pop.innerHTML = `
      <p class="term-pop-title">${escapeHtml(entry.term)}</p>
      <p class="term-pop-plain">${escapeHtml(entry.plain)}</p>
      ${entry.analogy ? `<p class="term-pop-analogy">${escapeHtml(entry.analogy)}</p>` : ""}
      <button type="button" class="term-pop-close" aria-label="Close">×</button>`;
    doc.body.appendChild(pop);
    const r = dfn.getBoundingClientRect();
    const pw = Math.min(320, doc.documentElement.clientWidth - 16);
    pop.style.width = `${pw}px`;
    let left = r.left + doc.defaultView.scrollX;
    const maxLeft = doc.documentElement.clientWidth - pw - 8 + doc.defaultView.scrollX;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    pop.style.left = `${left}px`;
    const below = r.bottom + doc.defaultView.scrollY + 6;
    pop.style.top = `${below}px`;
    requestAnimationFrame(() => {
      const pr = pop?.getBoundingClientRect();
      if (pr && pr.bottom > doc.documentElement.clientHeight - 8) {
        pop.style.top = `${r.top + doc.defaultView.scrollY - pr.height - 6}px`;
      }
    });
    pop.querySelector(".term-pop-close")?.addEventListener("click", close);
  };

  const onClick = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const dfn = t.closest("dfn[data-term]");
    if (dfn) {
      e.preventDefault();
      e.stopPropagation();
      open(dfn);
      return;
    }
    if (pop && !pop.contains(t)) close();
  };
  const onKey = (e) => {
    if (e.key === "Escape" && pop) {
      close();
      return;
    }
    const t = e.target;
    if (!(t instanceof Element)) return;
    const dfn = t.closest("dfn[data-term]");
    if (dfn && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      open(dfn);
    }
  };
  host.addEventListener("click", onClick, true);
  host.addEventListener("keydown", onKey);
  const unbind = () => {
    host.removeEventListener("click", onClick, true);
    host.removeEventListener("keydown", onKey);
    close();
    delete host.__ffGlossaryBound;
  };
  host.__ffGlossaryBound = unbind;
  return unbind;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
