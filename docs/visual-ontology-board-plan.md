# Visual Ontology Board — Design and Implementation Plan

> **Implementation handoff:** Implement phase-by-phase on the `experimental` branch after approval. Read each named module before modifying it. Write failing unit/integration tests (`node:test`) before changing behavior, register every new test file in `package.json`, and keep `npm test` green at the end of every phase. Do not commit, push, publish packages, run database migrations, or change billing/access policy without a separate request.

**Goal:** Make the entire causal thinking process underlying Future Forge visible, tactile, and playable on a unified Left-to-Right **4-Lane Ontology Board** (`1. Tech & Milestones → 2. Use Cases → 3. Pathway → 4. Problem`), lowering the barrier to try, eliminating working-memory overload ("brain melt"), and replacing frustrating hex-edge geometry while keeping player invention and the calibrated two-act economy intact.

**Architecture:** Replace the freeform SVG hex grid (`js/hex/*`) directly in place with a **4-Lane Board** (`js/ontology/*` + `js/board/*`) inside a clean **2-Zone Workshop** (~72% 4-Lane Board, ~28% Future Vision + AI Co-Inventor/Tutor/Log). Populate Lanes 1–2 instantaneously (`0ms`, zero model calls) from a curated 29-tech ontology baseline, authored capability trends, the active run's predictions bank, and an automatic Quest `grounding` Markdown parser (plus an optional structured `ontology` field in `quest-tile/v1`). Keep Lane 3 (`Pathway`) player-driven via zero-LLM-cost **Alchemy Fusion**, `Ask for ideas`, voice/text authoring, soft `Bits`/`Atoms` bridge checks, explicit `Pathway → Crisis` wire plugging, and **Wire Roadblock Challengers**.

**Tech stack:** Existing browser ES modules, HTML/CSS, SVG wire overlay, Chart.js (`js/trend-chart.js`), and Node's built-in test runner (`node:test`). No frontend framework, external state library, new model endpoint, or database schema change is required.

---

## 1. Product intent and locked decisions

Future Forge is an inventing practice ([what-is-future-forge.md](what-is-future-forge.md)): learners connect progress in emerging technologies to concrete local instances of global problems. Previously, the authoring layer ([grounding-template.md](../skills/future-forge-quest/references/grounding-template.md)) modeled the full causal chain (`emTech → Capabilities → Trends & Predictions → Milestones → Use Cases → Applications`), while the UI only showed the ends (`emTech` tray and `Invention`/`Crisis` hexes), forcing players to hold the entire middle of the ontology in working memory.

### 1.1 Locked decisions

1. **Direct replacement of the Hex Grid with a 4-Lane Left-to-Right Board:**
   - Retire the honeycomb SVG hex grid (`js/hex/hex-tile-grid.js`, `js/hex/hex-label.js`, `js/hex/board-ui.js`, `js/hex/hex-workshop.js`) directly in Phase 1 on `experimental`.
   - Render clean, readable rectangular cards with input/output snap-ports and an SVG Bezier wire layer across four columns:
     1. **`Tech & Milestones`**
     2. **`Use Cases`**
     3. **`Pathway`** (Inventions & Alchemy-Fused Pathways)
     4. **`Problem`** (Pinned Town Rules + Crisis Cards, with Challenger Wire Roadblocks on incoming wires)
   - Subtle hexagonal accents remain for brand marks (`assets/brand/ff-mark-hex.png`) and status pips only.

2. **Calm 2-Zone Workshop Layout:**
   - Retire the permanent left `Emerging tech` sidebar and eliminate the stacked forms above (`#hex-tile-create`) and below (`#pathway-panel`) the board.
   - **Left/Main Zone (~72% width):** Unified HUD/Calendar header + the 4-Lane Board. Clicking **`+ Add Tech`** at the top of Lane 1 opens a slide-over/popover picker leading with **`For this place`** (`mission.suggested` + `suggestedWhy`) and a collapsible **`All emerging tech`** catalog, closing once a tech is added.
   - **Right Zone (~28% width):** Preserves **Future Vision**, **AI Co-Inventor / Tutor / Voice**, **Captain's Log**, `AI inspect` (developer mode), short-screen tabbing, and [second-screen.js](../js/second-screen.js) pop-out support.

3. **Lane 1 (`Tech, Trends & Milestones`) Epistemology & UI:**
   - Each added technology renders a **Timeline Spine Card**:
     - Header: `emTech` name, world badge (`🔵 Bits`, `🩷 Atoms`, `🔵🩷 Bridge`), and a 1-click **`📈 Log chart`** toggle that mounts the quantitative curve via [trend-chart.js](../js/trend-chart.js) when authored trend series exist.
     - Subtitle: Capability focus + plain-language **Trend rate** derived from past milestones (e.g., *"Cost halves every 18 months"*).
     - Above the **`📅 QUEST YEAR: {state.year}`** divider: solid vertical line with filled **`● Reached`** dots (`status: "reached"`).
     - Below the divider: dashed vertical line with hollow **`◌ Forecast`** dots (`status: "predicted"`, preserving speaker attribution when present).
   - **Advancing the calendar (`+1y` or `+2y`):** Slides the `📅 QUEST YEAR` bar downward past newly reached years. Any `◌ Forecast` dot now `≤ state.year` activates for gameplay **while keeping its hollow `◌ Forecast` badge**—never falsely relabeling a prediction as observed real-world history.

4. **Future Milestones Below `NOW` ("Too Early" Wires & Act 2 Pre-Staging):**
   - Clicking a `◌ Forecast` dot whose `year > state.year` **is allowed**: it deals its Use Cases into Lane 2 connected by a **dashed red `"Too early (~YYYY)"` wire** (deterministic, zero model calls), marking any downstream Pathway unready for the current year.
   - When the player advances the Quest Year to `≥ YYYY`, those dashed wires automatically transition to solid active wires—letting players pre-stage Act 2 on the board and visibly watch the curve catch up.

5. **Instant Data Population (`0ms`, `0` Tokens) for Lanes 1–2:**
   - **Lanes 1–2 represent general technological truth**; **Lane 3 applies them to the concrete town**.
   - Populate Lanes 1–2 instantaneously offline from:
     1. Explicit `quest.ontology` (optional new schema extension on `quest-tile/v1`),
     2. Automatic deterministic parsing of existing 7-heading `grounding` Markdown ([grounding-template.md](../skills/future-forge-quest/references/grounding-template.md)), and
     3. Curated 29-tech ontology baseline joining [data.js](../js/data.js) (`TECHS`), [predictions/default.json](../predictions/default.json) (or active run bank), and [capability-trend.js](../js/capability-trend.js).
   - Include a **`+ Propose custom use case`** action in Lane 2 for player-invented use cases not in the deck.

6. **Lane 3 (`Pathway`) Creation & Zero-AI-Cost Alchemy Fusion:**
   - Selecting 1+ Use Cases in Lane 2 lets the player create a local **Invention** in Lane 3 either via **`Ask for ideas`** (mints 3 local options with AI art—no typing needed) or by **writing / speaking (`🎙️`)** how it works in this town. Players can also mint a **`Non-emTech / Human step`** (`⚪` world) directly in Lane 3.
   - **Alchemy Fusion:** Players explicitly control what combines with what (supporting multiple separate Pathways in Lane 3). Dragging Invention B onto Invention A (or using `Fuse with…`) merges them into one **Pathway card** with **zero automatic LLM call**:
     - Displays removable **Ingredient Chips** so any piece can be un-fused back into its own card at any time.
     - Assembles a deterministic default combined description (analogous to `resolveIslandHow`), editable inline by the player, with an explicit **`Polish combined how (AI)`** button only if clicked.
     - Evaluates/displays **`⚡ Convergence`** boost badges across synergistic ingredients.

7. **Soft `Bits` vs. `Atoms` Bridge Check:**
   - Do **not** hard-block fusion of pure `🔵 Bits` and pure `🩷 Atoms`. Allow the fusion and display a non-blocking **`⚠️ Missing Bridge?`** warning pill unless a Bridge (`🔵🩷`) or Human/Non-emTech (`⚪`) ingredient is fused in, or the player explains the physical handoff in the Pathway text for the AI judge (`FF_ENFORCE_BITS_VS_ATOMS_WORLDS=0` hides the warning).

8. **Explicit `Pathway → Crisis` Plug-In Wires:**
   - Pathways in Lane 3 start **unplugged** so players can finish creating and fusing ingredients without premature `score-pathway` calls or flashing red alarms.
   - Dragging a wire from a Pathway's output port to one or more Crisis cards in Lane 4 (or choosing `Plug into…`) activates evaluation (`score-pathway` + `updateVision`) against those connected Crises.

9. **Wire Roadblock Challengers (Dual Resolution):**
   - Summoning a Challenger (`Moloch`, `Mother Nature`, `Ethicist`, `Stakeholder`) clamps a **Roadblock node** directly onto an active `Pathway → Crisis` wire, halting its green signal with a portrait and pointed attack.
   - Players clear a Roadblock **either** (a) spatially on the board by fusing a new ingredient / revising the Pathway so re-evaluation addresses the flaw, **or** (b) rhetorically by clicking the Roadblock and submitting a short reply (`judge-challenge`, with existing coaching/drafting options).

10. **Diagnostics on Wires/Cards & Quiet Concept Coaching:**
    - Retire `#pathway-panel` (`Coverage / Bonds / Timing`). Put `🟢/🟡/🔴` lamps, signed deltas (`-2`, `-1`, `0`, `+1`), and 1-sentence local cause-and-effect reasons directly on the wires and Crisis cards.
    - Disable automatic mid-play popups from [concept-cards.js](../js/concept-cards.js); keep Concept Cards and [glossary.js](../js/glossary.js) reachable anytime inside the `?` Help menu.

11. **Preserved Two-Act Economy, `Goodwill` Rename & Secondary Tools Drawer:**
    - Keep all calibrated math in [quest-economy.js](../js/sim/quest-economy.js) (`AP`, `Budget $`, `+1$` per newly eased crisis role, `End turn +1y`, `Wait +2y`).
    - Rename player wallet `Support` (`state.will`) to **`Goodwill`** in player-facing UI to eliminate collision with the `Support` crisis role.
    - Group `+1 Year (Refill AP)` and `+2 Years (Look Ahead)` into a single **Calendar Control** synchronized with Lane 1's `📅 NOW` bar.
    - Keep **`R&D`**, **`Lobby`**, and **`Arguments`** tucked inside a clean *"Research & Policy Tools"* drawer (`R&D` and `Arguments` attach as visible modifier chips onto a target Pathway in Lane 3; `Lobby` updates Town Rules pinned at the top of Lane 4).

12. **90-Second "Quick-Try Mini-Quest" & Regular Quest Briefing:**
    - Add **`Try a 90-Second Quest →`** on `#screen-title` ([index.html](../index.html)), replacing the 25-step exact-typing [tutorial.js](../js/tutorial.js) with a 1-crisis interactive starter Quest with **zero forced typing** (`Tap 2026 Milestone → Deal Use Case → Create & Alchemy-Fuse 2 Inventions for ⚡ Convergence → Plug into Crisis → Clear 1 Roadblock Challenger → Vision Reveal`).
    - Regular Quests keep the stepped [briefing-ui.js](../js/briefing-ui.js) walk (with 1-click skip) → fly Crisis cards into Lane 4 ([crisis-introduction.js](../js/crisis-introduction.js)) + pin Town `rules` visibly at the top of Lane 4.

13. **Mobile Snap-Swipe, Keyboard Accessibility & Ecosystem Integration:**
    - Below `768px`, render the 4 lanes as **horizontal `scroll-snap` columns** with a sticky 4-step mini-circuit navigation bar at top, backed by **Tap-to-Connect / Fuse** menus on every card (also providing full keyboard playability without pointer drag).
    - **Collector Cards** ([collector-cards.js](../js/collector-cards.js)) drop a `🃏 Collected` Milestone (`card.capability`) into Lane 1 + deal `card.useCases` into Lane 2, granting `0$` Budget cost on the first Invention built from that card.
    - Migrate legacy hex `Continue` snapshots ([continue.js](../js/cloud/continue.js)), sync `pathway-board/v2` across Hotseat & Online Friends Rooms, render the 4-Lane Circuit in [puzzle-share.js](../js/puzzle-share.js), and extend [skills/future-forge-quest](../skills/future-forge-quest) with optional `ontology` support.

### 1.2 Must preserve

- All existing server routes (`POST /api/co-invent`, `/api/co-invent-voice/session`, `/api/vision`, `/api/tts`, `/api/quests`, `/api/health`) and Clerk/Neon portal separation (`server.mjs` vs `portal/server.mjs`).
- AI quota/admission accounting, `FF_CO_INVENT_STREAM`, `FF_CO_INVENT_PROMPT_COMPACT`, `FF_AI_SEARCH`, and voice call lifecycle ([coinventor-voice.js](../js/coinventor-voice.js)).
- Companion Quest pre-play stage ([companion.js](../js/companion.js)), run-pinned prediction banks, and scenario premise grants ([companion-context.js](../js/companion-context.js)).
- Learning Module tutor sequence (`isLearningModule`, free tutor chat while tutoring is active, lesson media links, module progress bar).
- Sponsored Quest attribution (`sponsorName`, `sponsorBanner`) and strict neutrality rules.
- `npm run validate:quest -- --strict` and `npm run economy:quest -- --all` passing on all shipped Quests.

### 1.3 Must not introduce

- Automatic model calls when clicking Techs, toggling Trends, clicking Milestones, dealing general Use Cases, or fusing two Inventions in Lane 3.
- Relabeling `predicted` milestones as `reached` when `state.year` advances past them.
- Mandatory typing in the 90-second Quick-Try Mini-Quest, or a mandatory whole-pathway essay box.
- Uninvited Concept Card popups interrupting board interaction.

---

## 2. Verified codebase seams

| Existing module / file | Current role | Planned change |
|---|---|---|
| `index.html` (`#screen-title`, `#screen-workshop`) | Title CTAs; 3-column workshop with `#solo-tech-library`, `#hex-tile-create`, `#hex-board-wrap`, `#pathway-panel`, `.vision-panel` | Add `Try a 90-Second Quest →` CTA; convert `#screen-workshop` to 2-Zone layout (`#ontology-board-wrap` 4 lanes + `.vision-panel`); rename HUD `Support` → `Goodwill`; unify Calendar bar; retire `#pathway-panel`. |
| `css/styles.css` | Hex board, rail drawers, `data-workshop-stage` rules | Replace hex-grid styles with 4-lane grid, Timeline Spine cards, SVG Bezier wire states (solid, dashed-early, pulsing, roadblocked), Alchemy Fusion cards, and `<768px` `scroll-snap` layout. |
| `js/hex/evaluate.js` & `js/hex/crisis-delta.js` | Pathway fingerprinting, heuristic/AI score blending, timing %, convergence factor, crisis delta clamping | Move pure evaluation math into `js/board/evaluate.js` and `js/board/crisis-delta.js`, keyed by `pathway.id` / content fingerprint and explicit `wires` instead of hex adjacency (`q, r`). |
| `js/hex/board-state.js`, `js/hex/board-ui.js`, `js/hex/hex-workshop.js`, `js/hex/hex-tile-grid.js`, `js/hex/hex-label.js` | Hex coordinate state, SVG hex rendering, drag-to-hex orchestration | Remove in Phase 1; replace with `js/board/board-state.js`, `js/board/board-ui.js`, and `js/board/pathway-workshop.js`. |
| `js/data.js`, `predictions/default.json`, `js/capability-trend.js`, `js/trend-chart.js` | `TECHS` (29 items), dated milestones/predictions, log-scale trend curves | Read via `js/ontology/catalog-ontology.js` to build instant Lane 1 Timeline Spines + Lane 2 general Use Cases; mount `trend-chart.js` inline/popover from Lane 1's `📈 Log chart` button. |
| `js/capability-explorer.js` | Standalone top-of-column capability explorer | Fold its trend/source readout cleanly into Lane 1's `📈 Log chart` expansion so users don't see duplicate trend widgets. |
| `js/collector-cards.js` | Collection dialog minting free single-tech hex tiles | Wire through `js/ontology/collector-ontology.js` to drop `🃏 Collected` Milestone + `useCases` into Lanes 1–2 with `0$` first-invention cost. |
| `js/crisis-introduction.js` & `js/workshop-stage.js` | Post-briefing crisis card flight to SVG hexes; `crises → invent → active` staging | Retarget flight destination rectangles to Lane 4 Crisis slots; keep calm staging (`crises` hides Lanes 1–3 until Crisis cards land in Lane 4). |
| `js/tutorial.js` | 1,595-line exact-typing Paddy Step Wells hex tutorial | Replace with concise 90-second zero-typing Quick-Try Mini-Quest controller on the 4-Lane Board. |
| `js/guided-tour.js` & `js/concept-cards.js` | `?` next-step coach-mark; auto-popping Friend's-seven concept cards | Update `resolveTourStep` selectors to the 4 lanes; disable auto-open on `resolveConceptCard` while keeping all 7 Concept Cards browsable inside `?`. |
| `js/multiplayer/hotseat-bridge.js`, `js/multiplayer/room-bridge.js`, `js/rooms/room-manager.mjs` | Per-seat board sync & action validation | Accept/sync `pathway-board/v2` snapshots (`preferIncomingBoard`, `mergeBoardArt`). |
| `js/cloud/continue.js` & `js/puzzle-share.js` | Cloud/local run restore; PNG share export | Add `migrateToPathwayBoard()` on restore; render high-DPI 4-Lane Circuit + Future Vision in `puzzle-share.js`. |
| `js/quest-tile.js`, `js/quest-lint.js`, `skills/future-forge-quest/` | Quest validation, lint rules, authoring skill | Support optional `ontology` block alongside automatic `grounding` Markdown parsing. |

---

## 3. Data and state specifications

### 3.1 Ontology Resolver (`js/ontology/`)

```js
/**
 * Normalized Tech Track returned for any techId in a given Quest + Run World:
 * {
 *   techId: string,
 *   name: string,
 *   world: "bits" | "atoms" | "split",
 *   capability: string,
 *   trendSummary: string,          // e.g. "Cost halves every 18 months"
 *   trends: CapabilityTrend[],     // merged authored series for 📈 Log chart
 *   milestones: Array<{
 *     id: string,
 *     year: number,
 *     label: string,
 *     detail?: string,
 *     status: "reached" | "predicted",
 *     attribution?: string,        // speaker/source when from attributed bank
 *     origin: "quest" | "trend" | "bank" | "catalog" | "collector",
 *     collectorCardId?: string,
 *     useCases: Array<{
 *       id: string,
 *       title: string,
 *       blurb: string,
 *       world: "bits" | "atoms" | "split",
 *       origin: "quest" | "catalog" | "collector"
 *     }>
 *   }>
 * }
 */
```

**Resolution priority for a `techId`:**
1. If the active Quest defines structured `quest.ontology` entries for `techId`, include those milestones and use cases first (`origin: "quest"`).
2. Else if `techId` matches the Quest's `spotlight.techId` (or `grounding` `**emTech:**`), parse `## Capabilities`, `## Trends & predictions`, `## Milestone`, and `## Unlocks Use Case(s)` via `js/ontology/grounding-parser.js` (`origin: "quest"`).
3. Merge distinct dated milestones from the run's active `trends` (`origin: "trend"`) and predictions bank (`origin: "bank"`), attaching curated general `useCases` from `js/ontology/catalog-ontology.js` so **every one of the 29 `TECHS`** always has at least one `≤ 2026` `reached` milestone and at least one `> 2026` `predicted` milestone, each with 2–3 concrete general use cases.
4. Append any player-activated Collector Cards matching `techId` (`origin: "collector"`).

### 3.2 Board State (`future-forge.pathway-board/v2`)

```js
{
  schema: "future-forge.pathway-board/v2",
  techTracks: {
    // keyed by techId, ordered by addedOrder
    ai: { techId: "ai", addedOrder: 1, chartOpen: false, activeMilestoneIds: ["ms-ai-edge-2026"], collectorCardIds: [] }
  },
  useCases: {
    // keyed by useCase instance id placed into Lane 2
    "uc-1": {
      id: "uc-1",
      techId: "ai",
      milestoneId: "ms-ai-edge-2026",
      milestoneYear: 2026,
      milestoneStatus: "reached", // NEVER mutated to "reached" if authored "predicted"
      title: "Air-gapped exam tutoring",
      blurb: "Tutor and check forms on local hardware with zero cloud traffic.",
      world: "bits",
      origin: "quest" // "quest" | "catalog" | "collector" | "custom"
    }
  },
  pathways: {
    // keyed by pathwayId in Lane 3 (1 ingredient = single Invention; 2+ = Alchemy-Fused Pathway)
    "pw-1": {
      id: "pw-1",
      createdOrder: 1,
      ingredients: [
        {
          id: "ing-1",
          techId: "ai",          // null for non-emTech / human step
          useCaseIds: ["uc-1"],
          title: "Stairwell Laptop Tutor",
          howText: "Secondhand laptops run an open-weight tutor offline during night school.",
          world: "bits",         // "bits" | "atoms" | "split" | "plain"
          artUrl: "/api/...",
          timingPct: 82,
          timingLevel: "green",
          timingReason: "13B-active models run offline on modest laptops in 2026.",
          timingPending: false,
          collectorCardId: null
        }
      ],
      customHow: "",             // player override of combined description; "" = use deterministic default
      convergences: [],          // [{ pairKey, aId, bId, title, reason, factor }]
      rdBoost: null,             // optional R&D gamble attachment: { id, factor, label }
      argumentIds: []            // attached fact-checked argument ids
    }
  },
  wires: {
    // explicit Lane 3 -> Lane 4 connections
    "wire-1": { id: "wire-1", pathwayId: "pw-1", crisisId: "crisis-local" }
  },
  crises: {
    "crisis-local": { id: "crisis-local", role: "local", meterKey: "local", name: "Learning", description: "...", lamp: "red" }
  },
  challengers: {
    // clamped onto a wireId when summoned
    "ch-moloch": {
      id: "ch-moloch",
      angle: "moloch",
      wireId: "wire-1",
      pathwayId: "pw-1",
      speech: "...",
      question: "...",
      lamp: "red",
      posePending: false,
      playerAnswer: "",
      answerQuality: null,       // "hit" | "glance" | "miss"
      answerFeedback: "",
      answerPending: false,
      posedAgainstFingerprint: "..."
    }
  },
  arguments: {
    // secondary drawer fact-checked claims attached to a pathwayId
  },
  concernsRoster: ["moloch"],
  concernsSummoned: false,
  pathwayImpacts: {},            // fingerprint -> { crisisDelta, crisisReasons, concernLamps, pending }
  paidEaseRoles: {}              // tracks +1$ Budget payout once per newly eased crisis role
}
```

### 3.3 Key deterministic invariants

1. **Forecast Wire Timing (`isUseCaseEarly(uc, questYear)`):**
   - `uc.milestoneYear > questYear` → Wire from Lane 1 to Lane 2 is `early` (dashed red), and any Pathway containing an ingredient backed by `uc` has its effective timing capped at `"red"` (`"Too early in {questYear} — relies on ~{uc.milestoneYear} forecast"`), **without** spending an AI call.
   - When `questYear` advances so `uc.milestoneYear <= questYear`, the `early` flag clears automatically on render and triggers standard `assess-feasibility` / `score-pathway` if plugged in, while `uc.milestoneStatus` stays `"predicted"`.
2. **Zero-AI Alchemy Fusion (`composePathwayHow(pathway)`):**
   - Default combined description joins `ingredients.map(i => i.howText)` cleanly if `pathway.customHow` is empty.
   - Un-fusing ingredient `k` removes `k` from `pathway.ingredients` and spawns a standalone unplugged single-ingredient Pathway card in Lane 3, preserving `k.artUrl` and `k.timingPct`.
3. **Soft Bridge Check (`needsBridgeWarning(pathway, enforceWorlds)`):**
   - Returns `true` iff `enforceWorlds` is true, `ingredients` contains at least one `"bits"` item and at least one `"atoms"` item, and contains zero `"split"` or `"plain"` items. Never blocks fusion or wire-plugging.
4. **Dual Challenger Resolution:**
   - A Challenger Roadblock `ch` on `wire-1` turns `"yellow"`/`"green"` when **either**:
     - `ch.answerQuality` is `"glance"` or `"hit"` via `judge-challenge`, **or**
     - `pathwayContentFingerprint(pw)` has changed since `ch.posedAgainstFingerprint` **and** `score-pathway` evaluates `concernLamps[ch.angle]` as `"yellow"` or `"green"`.
5. **Hold Gate (`boardHolds(board, questYear)`):**
   - All active Crisis cards in Lane 4 have `lamp` in `{"yellow", "green"}` (plugged and scored, not pending), no plugged Pathway has `timingLevel === "red"` or an `early` forecast wire, `concernsSummoned` is true, and all summoned Challenger Roadblocks have `lamp` in `{"yellow", "green"}`.

---

## 4. Phased implementation plan

### Phase 1: Ontology data layer, hex-grid removal, and core 4-Lane Board (`Solo` foundation)

**Files to create:**
- `js/ontology/catalog-ontology.js` + `js/ontology/catalog-ontology.test.js`
- `js/ontology/grounding-parser.js` + `js/ontology/grounding-parser.test.js`
- `js/ontology/collector-ontology.js` + `js/ontology/collector-ontology.test.js`
- `js/ontology/index.js`
- `js/board/crisis-delta.js` + `js/board/crisis-delta.test.js` (ported from `js/hex/`)
- `js/board/board-state.js` + `js/board/board-state.test.js`
- `js/board/evaluate.js` + `js/board/evaluate.test.js`
- `js/board/board-ui.js` + `js/board/board-ui.test.js`
- `js/board/pathway-workshop.js` + `js/board/pathway-workshop.test.js`

**Files to modify / remove:**
- Remove `js/hex/hex-tile-grid.js`, `js/hex/hex-label.js`, `js/hex/board-ui.js`, `js/hex/hex-workshop.js`, `js/hex/polarity.js`, `js/hex/lights.js`, `js/hex/board-state.js`, `js/hex/evaluate.js`, `js/hex/crisis-delta.js` and their superseded hex-geometry tests (updating all imports across `js/`, `portal/`, `scripts/`, and `test/`).
- Update `index.html`, `css/styles.css`, and `js/game.js` to mount the **2-Zone Workspace** and 4-Lane Board (`Lane 1` Timeline Spine + `+ Add Tech` popover + inline `📈 Log chart` via `js/trend-chart.js`; `Lane 2` instant Use Case dealing + `+ Custom use case`; `Lane 4` Crisis slots).

**Phase 1 verification:**
- Unit tests verify every one of the 29 `TECHS` resolves valid `reached` + `predicted` milestones and use cases in `<5ms`, every `quests/*.json` grounding parses cleanly, `milestoneStatus: "predicted"` never flips to `"reached"` across year advances, and forecast wires toggle from dashed-early to solid when `state.year` crosses `milestoneYear`.

---

### Phase 2: Lane 3 Invention creation, Alchemy Fusion, Plug-In Wires, and Wire Roadblock Challengers

**Work items:**
1. **Inline Lane 3 Invention Composer:**
   - Selecting 1+ Use Cases in Lane 2 opens/focuses a draft Invention card in Lane 3 with **`Ask for ideas`** (3 AI sparks + art, zero typing), **text/voice (`🎙️`) authoring**, and **`+ Non-emTech step`** (`⚪` human/ordinary workflow).
2. **Alchemy Fusion & Un-Fusing:**
   - Support both pointer drag-and-drop and accessible `Fuse with…` menu to merge Inventions into multi-ingredient Pathways; render removable ingredient chips, editable combined `howText`, optional **`Polish combined how (AI)`** button (costs thinking AP per existing turn rule), `⚡ Convergence` badges, and the soft **`⚠️ Missing Bridge?`** pill.
3. **Explicit `Pathway → Crisis` Plug-In Wires:**
   - Support dragging from a Pathway's right port to a Lane 4 Crisis port (and `Plug into…` menu) plus unplugging; render animated SVG Bezier pulses (`pending` → `green`/`yellow`/`red` + signed delta chip + concrete 1-sentence reason on the Crisis card). Trigger `score-pathway` and `updateVision` only for plugged Pathways.
4. **Wire Roadblock Challengers:**
   - Render summoned Challengers directly on the plugged `Pathway → Crisis` wire, visually blocking the current downstream of the clamp.
   - Implement dual resolution (board upgrade re-score OR inline reply with `Coach me` / `Draft` / `Submit`) and verify `boardHolds` unlocks **`Declare pathway holds →`**.

**Phase 2 verification:**
- Automated tests for Alchemy Fusion/un-fusing, zero-LLM-call fusion invariant, soft bridge warning logic, unplugged-draft silence (no `score-pathway` calls until wired), and both spatial and written Challenger roadblock clearing.

---

### Phase 3: Economy UI cleanup (`Goodwill`, unified Calendar, secondary tools drawer) and quiet coaching

**Work items:**
1. **Wallet Rename & Unified Calendar Bar:**
   - Rename HUD/UI copy for `state.will` from `Support` → **`Goodwill`** in `index.html`, `js/game.js`, `js/glossary.js`, and multiplayer HUDs (`js/sim/quest-economy.js` internal math unchanged).
   - Unify `+1 Year (Refill AP)` and `+2 Years (Look Ahead)` into one **Calendar Control** in the workshop header, animating Lane 1's `📅 QUEST YEAR` bar when triggered.
2. **Pinned Town Rules & Secondary Tools Drawer:**
   - Pin active Quest/Lobby `rules` as compact chips at the top of Lane 4 (`Problem`).
   - Tuck **`R&D`**, **`Lobby`**, and **`Arguments`** inside a collapsible *"Research & Policy Tools"* drawer (`R&D` and `Arguments` attach as visible chips onto a chosen Lane 3 Pathway; `Lobby` opens the existing rule composer and updates Lane 4's pinned rules).
3. **Retire Rubric Clutter & Uninvited Concept Popups:**
   - Remove `#pathway-panel` (`Coverage / Bonds / Timing`) from `index.html` and `js/side-split.js` / `js/second-screen.js` (updating the short-screen `Assessment` tab or folding into the board + `Log` cleanly).
   - Stop auto-popping `Concept Cards` during gameplay in `js/game.js` while keeping all 7 Concept Cards and clickable `<dfn data-term>` definitions accessible inside `?` Help.
   - Update all coach-mark targets in `js/guided-tour.js` (`resolveTourStep` + ` guided-tour.test.js`) to point to the 4-Lane Board elements.

**Phase 3 verification:**
- `npm run economy:quest -- --all` passes unchanged; unit tests cover `Goodwill` rendering, `R&D` factor application on Lane 3 Pathways, `Argument` fact-check overrides on Lane 3 Pathways, quieted Concept Cards, and all `?` Guided Tour steps.

---

### Phase 4: 90-second "Quick-Try Mini-Quest" and regular Quest entry polish

**Work items:**
1. **Home Screen Invitation:**
   - Update `#screen-title` in `index.html` with a clear **`Try a 90-Second Quest →`** primary CTA alongside `Start a Quest →` and `Invent with friends`, updating the 4-bullet `"How it works"` pitch to match the visual ontology flow.
2. **90-Second Zero-Typing Playable Mini-Quest (`js/tutorial.js` rewrite):**
   - Replace the 25-step exact-typing tutorial with a crisp 6-beat interactive Quick-Try on a 1-crisis Paddy Step Wells board:
     1. Tap the lit `● 2026` Milestone on `Drones` in Lane 1 → deal Use Cases into Lane 2,
     2. Create a local Runoff Mapper Invention in Lane 3 (1-click spark, zero typing),
     3. Add `Battery` (`● 2026`) → create Flight Pack Invention → **drag onto Drone Mapper to Alchemy-Fuse** (`⚡ Convergence!`),
     4. Plug the Pathway wire into the `Clean Water` Crisis in Lane 4,
     5. Clear 1 **Stakeholder Wire Roadblock** (1-click or custom reply),
     6. Declare the Pathway holds → Future Vision transformation reveal!
3. **Regular Quest Crisis Flight:**
   - Update `js/crisis-introduction.js` and `js/workshop-stage.js` so post-briefing Crisis cards animate cleanly into Lane 4's Crisis slots while keeping Stage 0 (`crises`) calm until arrival.

**Phase 4 verification:**
- Rewrite `js/tutorial.test.js` and `js/crisis-introduction.test.js` for the 6-beat Quick-Try flow and Lane 4 landing; verify keyboard-only and reduced-motion completion.

---

### Phase 5: Mobile snap-swipe, keyboard flow, Collector Cards, Multiplayer, Continue, and Share Puzzle

**Work items:**
1. **Mobile (`<768px`) & Keyboard Ergonomics:**
   - Add horizontal CSS `scroll-snap-type: x mandatory` across the 4 lanes on narrow screens with a sticky 4-pill mini-circuit bar (`1 · Tech` → `2 · Use Cases` → `3 · Pathway` → `4 · Problem`) showing badge counts/status dots per lane.
   - Ensure every drag gesture (`Deal to Lane 2`, `Fuse with…`, `Plug into Crisis…`, `Unplug`) has a 1-tap button/popover equivalent for one-thumb mobile play and full `Tab`/`Enter` keyboard navigation.
2. **Collector Cards (`js/collector-cards.js`):**
   - Selecting a collected card injects its `🃏 Collected` Milestone + `useCases` into Lanes 1–2 and marks the first Lane 3 Invention derived from it as `0$` Budget cost.
3. **Multiplayer, Cloud Continue & Share Puzzle:**
   - Update `js/multiplayer/hotseat-bridge.js`, `js/multiplayer/room-bridge.js`, and `js/rooms/room-manager.mjs` to validate and sync `pathway-board/v2` boards across seats and spectators.
   - Add `migrateToPathwayBoard()` in `js/cloud/continue.js` (and local run restore) so legacy hex-board saves convert placed islands and crisis touches into Lane 3 Pathways and Lane 4 Wires without data loss.
   - Update `js/puzzle-share.js` to render a crisp, self-contained PNG of the **4-Lane Circuit + Future Vision + Crisis meters**.

**Phase 5 verification:**
- Automated tests for `migrateToPathwayBoard()`, Collector Card `0$` budget accounting, Hotseat + Room WebSocket round-trip sync (`test/split-v2-integration.test.mjs`), and `puzzle-share` snapshot generation.

---

### Phase 6: Quest `ontology` schema extension, authoring skill update, and end-to-end verification

**Work items:**
1. **Optional Structured `ontology` on `quest-tile/v1`:**
   - Extend `js/quest-tile.js` and `js/quest-lint.js` to validate an optional `ontology` array on Quest JSON (each entry specifying `techId`, `capability`, `trendSummary`, `milestones[]`, and `useCases[]`), while keeping `grounding` auto-parsing so all existing Quests remain 100% valid without edits.
   - Update `skills/future-forge-quest/SKILL.md`, `references/schema.md`, and `references/output-contract.md` with clear guidance and examples.
2. **Cache Busting & Full Regression Suite:**
   - Bump runtime module and stylesheet cache query strings (`?v=ontology-1`) in `index.html`, `second-pane.html`, and ES module imports, verifying `scripts/check-title-buttons.mjs` and `npm run check:portal-spa`.
   - Run full automated checks:
     - `npm test`
     - `npm run check:syntax`
     - `npm run check:briefs`
     - `npm run validate:predictions`
     - `npm run economy:quest -- --all`
   - Exercise live browser flows across Desktop (`1440×900`), Short Laptop (`1280×720`), and Mobile (`390×844`):
     - 90-second Quick-Try Mini-Quest from `#screen-title`,
     - Spotlight Quest (`spotlight-ai-edge-north-stack-2026`),
     - Learning Module (`preventing-mirror-life-tideglass`),
     - Calendar advance (`+1y` and `+2y` watching a dashed `Forecast` wire turn solid while keeping its `◌ Forecast` badge),
     - Hotseat multi-seat pass, and `Share puzzle` PNG export.
