# Problem-first invent: less overwhelming, without the curse of knowledge

**Status:** draft rev 1 (2026-09-19). Companion to [`marketing-plan.md`](./marketing-plan.md) rev 3 and [`what-is-future-forge.md`](./what-is-future-forge.md).

**Sources read:** `index.html`, `js/game.js` (tray, feasibility panel, co-invent context), `js/hex/hex-workshop.js` (create panel, tile popups, Ask for ideas), `js/data.js` (TECHS, DOMAINS, seed packs), `js/guided-tour.js`, `js/briefing-ui.js`, `js/coinventor.js`, `js/lean-coinvent-context.js`, `server.mjs` (prompts, sanitizers), `docs/what-is-future-forge.md`, `docs/workshop-hex-invent-surface.md`, `docs/game-and-multiplayer-design.md`, `docs/on-the-curve-recording-pack.md`, `skills/future-forge-quest/`.

---

## Decisions made by the owner

| Question | Decision |
|---|---|
| Where is the overwhelm? | Not the resource economy. **The long list of emTechs**, and not knowing **how to come up with an idea that relates to the problem at hand.** |
| Modes? | **No.** One Workshop for everyone. No tutorial mode, no beginner/expert setting, no persisted depth profile. |
| Disclosure? | Progressive, inside the one Workshop, **not one-time and not tied to a single Quest**. Anything that collapses does so per Quest, in place, and reopens with one tap. |
| Register | Write for a high-school senior with zero prior knowledge. Adult tone. It serves the marketing plan's take-off-aware adults too. |
| Deliverable | This note, plus the first code slice described under *What shipped*. |

---

## Who we write for

Someone who has heard that AI is accelerating and can feel the take-off, but has no map. They do not say *emTech*. They have never read a log-scale chart. They have never been asked to invent anything. They open a Quest, read that a clinic dies at dusk, and then face a column of twenty-nine technology cards.

The 2021 tabletop failed on exactly this: *"most people simply lacked knowledge of emTechs … inventing at the table collapsed into guesswork or silence."* The course-first fix was a wall. The AI-era fix is to learn **on the fly**, which only works if the first thing the newcomer sees is the problem, not the catalog.

---

## What a first-timer met before this change

| Surface | What it did |
|---|---|
| Tray | All 29 cards, flat. The Quest's ~7 suggested techs were ids only: sort order, a gold edge, and a small "· suggested" suffix. No reason. |
| Card face | A *definition* ("Sensors that make the physical world measurable."). The problem-facing fields on every tech (`inventionHint`, `useCasesNow`, `scarcity`) never reached the card. |
| Red crisis hex | Explained the meter. Offered no path to a tech. |
| Ask for ideas | Required a focused tech first and never saw the crisis meters or the stakeholder. |
| How it works | A blank textarea, 12-character minimum, no scaffold. |
| Explanations | ~50 hover tooltips, a 145-line Rules modal two clicks deep, an on-demand `?` coach-mark. No glossary. About 25 terms never explained anywhere, starting with *emTech* itself. |
| Naming | "mission" leaked into player copy nine times; the same resource was "Will" in one HUD and "Support" in another. |

About a hundred named concepts and a hundred verbs, ten of them explained in always-visible copy.

---

## Part 1 — Less overwhelming: start from the problem, not the catalog

### The invent loop we want

> **hurt → need → family → idea → tile**

The board's red hexes *are* the problem. Everything on the invent screen should answer "what could help here", never "here are 29 things". The design thesis already says *looking at the board is the thinking*; the tray now follows the board.

### "For this place": the suggested few, each with a reason

The tray renders two groups for everyone:

- **For this place** — the Quest's spotlight and suggested techs, in authored order. Each card leads with **what the family can do** (its `inventionHint` or first use case), then a one-line **why here** in the Quest's own words.
- **All emerging tech (29)** — collapsed under a disclosure. Opens with one tap. State is per Quest and resets when a new Quest starts. A Quest that suggests nothing opens the full list; a domain filter that empties the shelf opens it too.

The *why here* comes from three sources in order: an authored `suggestedWhy` map on the mission or Quest tile; the spotlight advance for spotlight tiles; or a template from the tech's capability line and the hottest crisis meter ("Early warning and continuous monitoring — for AsthmaDays."). Scenario generation now asks the model for `suggestedWhy` alongside `suggested`, so new Quests arrive with real reasons. The 173 existing seed packs fall back to the template and need no regeneration.

### From a red hex to a tech: "What could help here?"

Clicking a crisis hex now ends with a short list: up to three techs from the shelf with their why-here line and an **Invent with X** button. It reuses the same focus path the co-inventor's proposals use. Authored reasons that name this meter rank first. The popup that used to diagnose the meter now also points at a move.

### Ask for ideas that know the problem

The idea-sparks request carries the crisis meters (label, live level, goal, plain description) and the stakeholder. The model is asked to aim at least one spark at the hottest meter and to tag each idea with the meter it eases. Each idea card, and the tile it mints, shows **Eases: AsthmaDays**, so the newcomer knows where to dock it. The offline fallback tags the hottest meter.

### How it works, scaffolded: scarce → abundant

The blank box becomes two blanks built on the game's own definition of technology:

> Technology takes something scarce and makes it abundant.

- *What is scarce in {place}?*
- *How does {tech} make it more abundant?*

The composed sentence is previewed live and minted as the how-text:

> In Riverbend Health Post, power after dusk is scarce. Solar Power makes it more abundant by rooftop panels charging a battery that runs the vaccine fridge at night — for Nurse Amara, this year.

**Write freely** swaps to the plain textarea; a complete scaffold is carried across so nothing typed is lost, and a composed sentence parses back into the blanks. The choice is per Quest and resets with the next one. The 12-character mint check is unchanged.

### One Workshop: collapse in place, never a mode

Everything above applies to every player in every Quest, including Friends rooms, where it is per-device display and room rules are untouched. Nothing is stored in a profile. Nothing is shown once and gone.

### What we are not doing

- No tutorial or beginner mode. The Spark tutorial stays deleted; its dead code and markup are gone.
- No prerequisite course. Learn stays on the fly.
- No economy changes. AP, Budget, Support, End turn, Lobby, R&D are as before.
- No ready-made answers. Reasons say what a family *could* do here; the idea is still the learner's.

---

## Part 2 — Curse of knowledge: plain words on tap

### Cards say what a tech can do, not what it is

The card face now leads with the capability line. The definition moved to the tooltip and the glossary popover.

### Glossary + tap-to-define

`js/glossary.js` holds about forty entries, each a term and one plain sentence of at most 160 characters, some with one analogy. A test enforces the cap and bans the words the recording pack keeps off the soundtrack (developer, JSON, overlay, schema, modal, feature, API, "locked until"). Any label wrapped as a term opens a small popover on tap or Enter. It works on touch; nothing depends on hover.

Wrapped in this slice: **Emerging tech** (tray header, with a permanent plain line under it), **Pathway** (feasibility panel), **Coverage / Bonds / Timing**, **Crisis** (HUD), the challenger's name and **honest** in tile popups, and the tile's **World** line, which no longer prints the raw word "split".

### Bound names

| Say | Never |
|---|---|
| **Quest** | mission (player copy) |
| **Look Ahead** (the control) → **Wait +2 years** (the confirm) | bare "Wait" as a verb in player copy |
| **Support** for `state.will` | Will, Political will (the design-doc glossary still says Political will; the shipped UI chose Support, and this note records that drift) |
| **Emerging tech**, with **emTech** defined on first use | emTech bare on a first screen |
| **early-tech risk** | frontier risk |

### The co-inventor's register

One clause joins the hard rules of the co-inventor prompt for every mode: the learner may be new to emerging technologies; say a term in plain words first, then the term; one analogy where it helps; no tabletop or UI jargon. No new modes, no context flag. The tutor prompt already said this for learning modules.

The quick-action chips are reordered so problem-first actions come first, and the first one is relabelled: **Which tech could help here?** (was "Suggest stack"). SIT and SCAMPER stay, with hints that say they remix a minted idea.

---

## What shipped (slice one)

| Step | Where |
|---|---|
| Vocabulary, dead tutorial code, literal leaks, Leaderboard gate | `index.html`, `js/game.js`, `js/sim/play-mode.js`, `css/styles.css`, `README.md` |
| "For this place" shelf + capability line + why-here | `js/tech-why.js`, `js/game.js` `renderTechList`, CSS |
| `suggestedWhy` data path | `js/quest-tile.js`, `server.mjs` (prompt + sanitizer), `scripts/generate-scenario-seeds.mjs`, `js/data.js` |
| Crisis hex → "What could help here?" | `js/hex/hex-workshop.js`, `js/game.js` hex api |
| Ask for ideas sees meters + stakeholder; `eases` chip | `js/lean-coinvent-context.js`, `js/idea-cards.js`, `js/hex/board-state.js`, `server.mjs` |
| Scarce → abundant scaffold | `js/invent-scaffold.js`, `index.html`, `js/hex/hex-workshop.js` |
| Glossary + tap-to-define | `js/glossary.js`, `index.html`, `js/game.js`, `js/hex/hex-workshop.js` |
| Co-inventor clause + chip order | `server.mjs`, `js/coinventor.js` |

Tests: `js/tech-why.test.js`, `js/invent-scaffold.test.js`, `js/glossary.test.js`, additions in `js/lean-coinvent-context.test.js`, `js/idea-cards.test.js`, `js/quest-tile.test.js`, `js/sim/play-mode.test.js`.

---

## What shipped (slice two): the Friend's seven as concept cards

The seven ideas the practice rests on (`on-the-curve-recording-pack.md`, "Friend's seven") now arrive inside the invent screen through the same coach-mark card the `?` button uses, each at the first moment it matters in a Quest:

| Card | Fires when | Points at |
|---|---|---|
| Look Ahead is the exponential clock | the first idea tile exists | the Look Ahead button |
| Is this real this year? | a placed tile has its timing read | that tile (else the Pathway panel) |
| Convergence: A makes B better, and B pulls A | the Convergence dialog opens, or a converged tile sits on the board | the dialog or the tile |
| The combination is the idea | two tiles are placed, or a crisis light leaves red | the Pathway panel |
| Jump the curve, pay in crisis | the Wait confirm opens, or after the first Wait | the Wait +2 years button |
| What works here, this year | a tile reads red, or the co-inventor tab opens | the Art of the possible chip |
| Learn: where this family sits on the curve | the first emTech is focused | the Learn button |

Cadence, as decided by the owner: **once per Quest, every Quest**, until the player ticks *Don't auto-show this one* on a given card. Muting is per concept and persists on the device; nothing else is stored. Every card stays one tap away: the coach-mark card carries a row of seven chips, on the next-step card and on concept cards alike. The Friend's-seven order is the tie-break when two cards become eligible at once; in play, **Learn** usually fires first, on the first focus, which is the intended "read while ideas generate" moment. Cards never auto-open while the briefing walks, while a tile popup is open, while the board is busy, or while watching another seat in a Friends room.

Code: `js/concept-cards.js` (cards + pure resolver + mute storage, `future-forge:conceptCardsMuted`), `js/guided-tour.js` (`openConcept`, kicker, mute row, chips), `js/game.js` (`refreshCoachMarks` at the four workshop refresh points, `firstPlacedTileId` / `convergedTileId` in the snapshot, per-Quest `state.conceptSeen`). Tests: `js/concept-cards.test.js`, additions in `js/guided-tour.test.js`.

## Roadmap (slice three and later)

- **Staged reveal** — a pure resolver in the style of `resolveTourStep` that shows Look Ahead, the feasibility panel, and the challenger row when the board first needs them; monotonic within a Quest, reset per Quest.
- **Look Ahead first** — a `curve` brief beat for the Quest's suggested family so the exponential clock is on screen in the first five minutes, as the marketing plan asks.
- **Say it back** — an outcome-screen recap (families used · the curve that mattered · the pathway in one sentence) as the marketing plan's falsifiable first-session test.
- **Structured reasons from "Which tech could help here?"** (`proposals.whyTech`), and rendering `grounding` "Applications" as player hints on Spotlight Quests.

---

## Measuring it

The marketing plan's test stands: a first-timer who opens a Quest can, at the outcome screen, name the families they used, say which curve mattered and why the timing was honest, and state the pathway in one sentence. Until "Say it back" ships, watch three things at Invent Night: whether newcomers open the full catalog before minting a first tile, whether the first tile comes from the shelf, and whether the scaffold or free-write produced it.

## Open questions

1. Should sponsored or learning tiles be able to require an authored `suggestedWhy` for every suggested id, so their shelf never falls back to the template?
2. Should the seed packs be regenerated with `suggestedWhy` now, or only as themes get touched?
3. Does the "All emerging tech" disclosure want a count of how many the domain filter is hiding, or is the plain count enough?
