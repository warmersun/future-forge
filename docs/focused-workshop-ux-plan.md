# Future Forge focused Workshop — UX ideas and implementation plan

**Status:** Proposal for discussion. This document does not authorize application changes.

**Goal:** Carry the briefing's clarity into inventing: the learner understands the current job, sees where to act, and encounters the rest of the Workshop when it becomes useful.

**Architecture:** One Workshop and one authoritative game state, presented through a focused task surface with the hex board as its stable home. Reuse the state-aware help resolver and the `ipad` branch's panel-navigation machinery, but organize the experience around decisions rather than a tour of panels.

**Tech stack:** Existing browser JavaScript, HTML/CSS, SVG board, and Node test runner. No new UI framework or model call is needed for navigation.

**Implementation handoff:** After design approval, use the subagent-driven-development workflow for small implementation tasks and reviews. Do not implement or commit merely because a task appears here.

---

## 1. Recommendation

**Keep the depth. Stop presenting all of it as the learner's current job.**

The briefing works because it supplies three things together: a situation, a focal image, and an obvious next action. The Workshop currently asks the learner to supply their own attention hierarchy across a catalog, a writing tool, a spatial board, assessments, evidence, a conversation, and time/resource decisions.

The recommended change is a **focused Workshop**, available at every screen size:

- One main working surface, rather than several equally prominent columns.
- A small, persistent statement of the current job, drawn from the existing `?` help logic.
- The board as the stable place where ideas, problems, and consequences come together.
- Supporting tools opened in context, with a clear return to what the learner was doing.
- An optional **Overview** layout for people who want several panels visible together.

Focus and Overview are presentation preferences, not beginner/expert rulesets. Neither changes the available technologies, evaluation, economy, challenge requirements, or outcome. Nobody has to graduate to unlock a feature.

**Start by prototyping the transition from the last briefing beat through the first placed idea and its feedback.** If that transition still needs a spoken explanation, do not build a larger navigation system around it.

## 2. What is overwhelming—and what is not

The attached screenshot makes the hierarchy problem concrete. A substantial technology catalog occupies the left; the central invent form contains several paths and mint actions; a very large Future vision competes on the right. The board begins below the form. The header also asks the learner to interpret the year, deadline, three resources, crisis indicators, help, and account controls.

This is not twelve bad features. It is several different kinds of attention being requested together.

| Load | What the newcomer must work out | Design response |
|---|---|---|
| Direction | “What should I do now?” | Show one relevant next action without requiring a search for `?`. |
| Relationship | “How do technology, my idea, the board, and the lights connect?” | Make those handoffs visible and keep related objects together. |
| Choice | “Should I write, ask AI, read trends, lobby, or advance time?” | Give the current task visual priority; leave alternatives available but secondary. |
| Interpretation | “Is red a problem in the place, a bad idea, or something I have not done yet?” | Explain the specific state beside the affected object. Do not greet an empty board with an unexplained failure verdict. |
| Memory | “What did I choose on the previous panel?” | Carry the chosen technology, idea, crisis, and return destination into supporting views. |
| Interruption | “Why did the screen move while I was thinking?” | Change recommendations without automatically moving the person out of their work. |

The quest chooser and briefing are not the target of this redesign. Nor is the learning goal: connecting emerging capabilities to a problem, explaining a mechanism, combining ideas, judging timing, and answering human or physical constraints.

### Evidence boundary

This proposal is based on the supplied screenshot, source inspection of `main@b4411a6`, a read-only comparison with `ipad@d21ddf5`, and existing product/design documents. It is not a live usability study. The screenshot does not prove that every listed panel is simultaneously expanded: Vision, Log, and Inspect already share presentation space, for example. The problem includes the number of competing destinations and concepts, not just open rectangles.

## 3. What already exists

Do not rebuild these as if they were missing.

| Existing foundation | What it already does | What is still needed |
|---|---|---|
| Briefing beats | `js/briefing-ui.js` presents the story in focused beats. | Preserve its attention hierarchy when the Workshop opens. |
| Crisis introduction | `js/crisis-introduction.js` derives cards from seeded crisis tiles, sends them to the board, and collapses the recap. | Make this the bridge into the working surface, without exposing the whole dashboard behind it. |
| Contextual `?` | `resolveTourStep()` in `js/guided-tour.js` derives a next step from current state. It distinguishes picking, minting, placing, Bonds, Coverage, Timing, challengers, resources, and tutoring. | Bring a concise recommendation into normal play and separate advice from navigation. |
| Target reveal | `ensureTourTargetVisible()` in `js/game.js` can open the technology rail and scroll to an anchor. | Reveal the correct focused surface before pointing; preserve the user's place when help closes. |
| Concept cards | `js/concept-cards.js` and `refreshCoachMarks()` explain concepts at relevant moments. | Avoid stacking a concept popup on top of the new next-action guidance. |
| Problem-first suggestions | The technology picker already offers “For this place” and a collapsible wider catalog. | Present those suggestions as part of the current invention task rather than a permanent competing column. |
| Capability outlook | `js/capability-explorer.js` supplies evidence for the selected technology. | Keep it close to the choice it informs without making the full explorer mandatory reading. |
| `ipad` stations | `js/tabletop.js` on `ipad` isolates existing panels, remembers a station, and supports explicit navigation. | Make focus independent of device type and reduce the need to choose among panel names. |

### What the `ipad` branch solves

It is more than squeezing columns: it genuinely presents one Workshop station at a time. It also adds an **Add to board** route and a **Move it** handoff, which help when dragging between panels is impossible.

But the station registry still spans Tech, Brief, Capability Outlook, Invent, Board, Vision, Pathway, Rules, Log, Inspect, and Co-inventor. Previous/next arrows cycle through that list. The learner must still know which station matters. Separating an idea from its board and assessment can also increase switching and memory load.

The branch's focus behavior is currently gated to a coarse pointer and widths of 720–1399px. A first-time desktop user has the same cognitive problem even when there is room for more columns.

**Reuse:** panel isolation, selected-state handling, explicit handoffs, and accessible placement alternatives.

**Do not copy unchanged:** the long station rail as the main mental model, device-only activation, or placing all turn/challenge actions solely inside the Pathway station.

Do not merge the entire branch as an incidental first step. Select the presentation work after agreeing which branch will own implementation.

## 4. Four possible directions

| Direction | Experience | Advantage | Main risk | Recommendation |
|---|---|---|---|---|
| **A. Quieter dashboard** | Keep the current layout, collapse supporting panels, enlarge the board, and add a next-action strip. | Smallest change; familiar to existing users. | Still asks a newcomer to understand the dashboard's organization. | Useful early improvement and Overview layout, but not the full answer. |
| **B. Focused workbench** | One current task with contextual tools; the board remains the stable home. | Reduces both visual competition and navigation decisions while preserving free invention. | Poorly designed transitions could become disorienting. | **Recommended.** Combine with a compact, state-aware next-action strip. |
| **C. Briefing-style guided sequence** | Full-screen steps for choosing a technology, writing, placing, and reviewing. | Strong continuity with the opening; easy first-path demonstration. | A linear wizard fits badly once learners revise, combine technologies, or explore. | Use its pacing for the initial handoff, not as a compulsory sequence for the entire Quest. |
| **D. Conversation-first interface** | The co-inventor asks questions and opens tools as needed. | May feel approachable to people comfortable with chat. | Makes AI latency and interpretation the navigation layer; can weaken agency and spatial understanding. | Keep as an optional way to get help, not the default shell. |

The recommendation is B with a little of A and C—not all four approaches at once.

## 5. The focused workbench

### 5.1 A stable shell, not a new row of twelve tabs

Keep a compact persistent header containing the Quest/place, year and deadline, named crisis status, and readable resource balances. Put account and exit utilities behind a clearly labeled utility menu; do not make them compete with inventing. Preserve discoverable access to the briefing and help.

Immediately below it, show a small **current-job strip**:

> **Place your idea beside a crisis.** Connections show which problem the idea is intended to help. **[Show me where]**

This is not a thirteenth panel. It replaces duplicated directions and becomes the single place for procedural guidance. It contains a short instruction and, when useful, one explanation. It is not a running tutorial transcript.

Use three stable destinations, expressed as actions:

- **Board** returns to the current pathway and its feedback.
- **Add an idea** opens the technology/idea workbench.
- **Ask for help** opens the existing co-inventor or tutor in context.

These are navigation labels proposed for review, not replacements for game terminology. They do not become a required three-step sequence. Evidence, briefing, rules, and history open from the object or question they support, with a secondary “More tools” entry for discovery.

### 5.2 One focal task; one supporting surface when necessary

“One thing at a time” must not mean “only one panel can ever be visible.” Placing a tile requires seeing both the tile and the board. Editing after feedback requires seeing the relevant explanation and draft.

The rule is **one focal task**, not arbitrary panel-count minimalism:

- While choosing technology, show the relevant suggestions and a short reminder of the problem.
- While inventing, show the chosen technology and the idea editor or illustrated suggestions.
- While placing, show the board and a compact tray of unplaced ideas together.
- While reviewing, show the board with the affected tile and an adjacent explanation.
- When opening a supporting tool, provide a named return such as “Back to your VR idea,” not a generic chain of Back buttons.

On a wide display the support surface can sit beside the board. On a narrow display it can be a sheet, with a compact selected-idea card retained during placement. Never require dragging across a hidden station.

### 5.3 Two layout preferences, identical capabilities

**Focus** is the proposed default for new sessions without a saved preference. **Overview** restores the multi-panel working arrangement for people who want it. Let people switch freely, including immediately after briefing. Do not ask a newcomer to choose a layout before starting.

Remember an explicit layout preference on the device. Keep temporary task position scoped to the run and, where relevant, the viewed seat. Continue should restore sensible work context, not replay the first-use ceremony or apply a stale station from another run of the same Quest.

This is ordinary, reversible disclosure in one Workshop. It is not a new teaching mode, feature-unlock ladder, or reduced-rules tutorial.

## 6. The first playable sequence

### Beat 1 — Finish the story without losing the place

The final briefing beat already states the job. On **Start inventing**, keep the Quest identity and visual continuity; reveal the crisis introduction and enough of the board to understand where its cards land. Do not simultaneously expand the catalog, invent form, trend chart, chat, and Future vision.

Reuse the seeded crisis cards and their actual labels/status. There may be fewer than three. Respect the existing skip/restore behavior; no card activation spends resources or creates additional crisis state.

The existing image can remain a small place reminder or transition image. It should not become a second full-height visual competing with the first action. No new generated art is needed for this transition.

### Beat 2 — Choose a capability to work with

After the introduction, invite an invention against the actual problem. Show the Quest's suggested technologies with their existing “why here” explanations. A highlighted crisis can supply context, but choosing a crisis is not a new mandatory click or scoring rule.

Keep **All emerging tech** accessible. Retain Power, Automator, Mover, Portal, LifeForce, Link, and the bits/atoms frame; simplify presentation, not the conceptual map.

If the Quest has no suggestions, show a compact browse/search route instead of inventing a recommendation or failing to advance. If a learning Quest legitimately starts with its tutor, give that conversation the focal surface with a clear route to inventing.

### Beat 3 — Make an idea, with help if wanted

The chosen technology stays visible as a compact card with its capability and **Change technology** / **Learn** access. Do not require the learner to keep the whole catalog open.

Offer two understandable starting routes: write an idea, or **Ask for ideas**. Do not expand the full blank form and a full generated-idea collection simultaneously by default. Preserve the scarcity-to-abundance scaffold and **Write freely** option. A person who starts typing stays in the editor.

Keep AI-generated suggestions illustrated. Selecting one is a starting point, not proof that the learner has invented; invite editing, explanation, or a deliberate choice. Do not manufacture a required paraphrase exercise.

Show the actual action cost at its point of use. Secondary mint types such as arguments and R&D remain reachable through an explicit disclosure, with the reason to use them, rather than competing equally with **Mint tile** on the first draft.

### Beat 4 — Put the idea where its effect can be seen

After minting or selecting an available idea, provide an explicit **Place on board** handoff. It brings the board and compact idea tray into view; it does not silently spend resources, place a tile, or advance time.

Support both drag and a touch/keyboard placement route. Reuse the `ipad` placement work where appropriate, but distinguish a legal location from a strategically good one. If offering auto-placement, preview the proposed cell and require the person's placement action. Explain how to move it afterward.

Do not separate the source tile and its destination into mutually exclusive stations. Keep the current board viewport stable after placement.

### Beat 5 — Explain one consequence, then let the person respond

The first feedback is a concrete change or blocker, not a dashboard of scores:

> “This idea is connected to Beam Failures. The assessment has not eased that crisis yet.”

Or, only if the actual result supports it:

> “Beam Failures moved from red to yellow. The other crisis still needs attention.”

Keep provisional/pending, offline heuristic, and completed AI assessments distinguishable. These are practice assessments, not proof that a real intervention would work.

Offer the relevant response: move a tile, edit its mechanism, inspect timing evidence, or add another idea. Bonds, Coverage, and Timing remain accessible together in detail, but the current explanation points to the actual cause. Do not label an empty pathway as a failed invention; show “Place an idea to begin checking” without changing the underlying evaluator.

### Beat 6 — Continue the real loop

The focused experience remains useful beyond the first tile:

- More invention is needed: reopen the workbench without losing the board.
- Timing is the issue: offer editing the claim **or** examining Capability outlook / Look Ahead. Waiting is not the only answer.
- Hard questions are available: foreground **Answer the hard questions** with its cost and explanation. Asking them is still the learner's decision.
- A concern needs an answer: focus the relevant challenger and answer surface.
- The actual hold conditions are met: foreground **The pathway holds**.
- Resources are insufficient: explain the specific restriction and available alternatives. Do not imply End turn refills Budget.

These are recurring states, not a one-way checklist. A revision can return to an earlier task without being described as losing tutorial progress.

## 7. Where every current surface goes

| Current surface | Proposed focused presentation | How it remains reachable |
|---|---|---|
| emTech selector | The chooser inside **Add an idea**, led by “For this place.” Collapse to the chosen technology while drafting. | Change technology, all-tech disclosure, and the same named domain filters. |
| Title and briefing | Compact Quest/place/job anchor. Full recap closed after introduction. | A visible Briefing control reopens the existing content. |
| Capability outlook | A contextual evidence surface for the chosen technology or timing issue, not an always-open chart. | Learn/evidence entry beside the technology and from timing feedback; retain descriptions, sources, milestones, and forecasts. |
| Ideas / Invent | The primary surface while forming an idea. Show the chosen route, not every editor and collection expanded together. | Add an idea; selected tile editing; preserved drafts and illustrated suggestions. |
| Hex-grid board | Stable home of the Workshop; primary during placement, connection, and review. | Board control always available. No board reset when changing surfaces. |
| Pathway evaluation | A short status attached to the board, with the relevant reason and target. | Expand the full Bonds / Coverage / Timing assessment and pathway description. |
| Local rules | A compact rules entry showing active constraints; full reading and Lobby on demand. | Rules entry and contextual links when a rule matters. Do not bury a binding constraint solely because it is not the next step. |
| End turn / Look Ahead / hard questions | Stable action area with one emphasized action, secondary alternatives, and explanatory costs/consequences. | Available from the working surface, not only a remote Pathway station. Preserve existing eligibility rules. |
| Future vision | An optional place/outcome view and an invitation after a meaningful change, rather than the permanent largest panel. | A labeled Future vision entry; reopen or pin it in Overview. Do not auto-open when an image finishes. |
| Log | History on demand; show relevant assessment reasons locally where possible. | Log entry, plus “Read the assessment” links to relevant records. No notification counter for every routine event. |
| AI inspect | Retain the existing developer-only scope and diagnostic content. | Developer tools / Inspect, not a novice navigation destination. |
| AI co-inventor / tutor | Contextual help, with its conversation preserved when closed. Tutor may be primary for a learning Quest. | Ask for help and existing lesson/tutor controls. Closing a panel is not ending tutoring, cancelling a paid request, or deleting chat. |

Keep balances and crisis status legible; do not simplify by concealing information needed to judge a paid or time-advancing action. A short header can still show AP with an accessible Attention explanation, Budget, and Support. Preserve their distinct meaning from crisis meters.

## 8. Build on `?`, but do not turn it into an autopilot

### 8.1 Separate recommendation, presentation, and execution

The existing pure `resolveTourStep()` is the right foundation. It should supply the same recommendation to the inline strip and to `?`, not grow a second competing set of rules in the layout controller.

The responsibilities should be:

1. **Recommendation:** Read a snapshot and identify the next useful task, reason, target, and whether it is available.
2. **Presentation:** Display that recommendation without navigating or opening overlays.
3. **Reveal:** On **Show me where**, open the right surface, locate the target, and optionally spotlight it.
4. **Execution:** The person uses the real existing control. Its normal authority, cost, confirmation, and busy guards still apply.

Do not use the current overlay's `open()` / `refresh()` loop as the always-on strip: it calls target-reveal logic and can scroll. Passive guidance must be passive.

### 8.2 Resolve gaps before making the advice prominent

Source inspection identified concrete issues to cover in the design and tests:

- `tourSnapshot()` exposes `crisisIntroductionPending`, but the next-step resolver does not currently consume it. The recommendation should not skip ahead to choosing technology while introductory crisis cards remain.
- The existing resolver is first-match. Red-pathway advice can take precedence over another draft the person is intentionally editing. It is useful advice, not permission to close their editor or move the screen.
- AP guidance is currently concentrated in particular branches. A persistent recommendation must not keep promoting an unaffordable mint, ask, or summon without explaining the restriction. Read availability from existing action guards or a shared read-only eligibility adapter, not duplicated cost constants.
- Busy/pending results should be tied to the affected task. An assessment running elsewhere should not imply that all free browsing or drafting must stop.
- Help copy itself needs a consistency pass. `js/concept-cards.js` currently says End turn leaves meters alone, while the solo `end_turn` reducer in `js/sim/actions.js` advances one year and applies pressure rise. Do not carry that contradiction into the new guidance. Derive consequences from the current mode and Quest; multiplayer turn passage is different.

This is a source-level finding, not a claim that the proposed controller already exists.

### 8.3 Stable advice, predictable movement

- Update recommendations after meaningful state changes. Do not animate a new card on every keystroke.
- Never auto-navigate when a background score, image, or chat answer arrives.
- Once the person opens another tool, preserve that choice until they leave it or explicitly follow guidance.
- Suspend nonessential prompts during typing, dragging, a confirmation dialog, and the existing tutorial.
- Show one guidance layer. If `?` expands the explanation, do not also launch a concept popup. Keep concepts readable on demand and retain mute preferences.
- Do not call an AI model to decide which panel to display.
- If the target is missing, unavailable, or stale, show an honest fallback and a Board return. Do not point at an invisible or disabled element.

**Important distinction:** Recommend automatically; change the working surface deliberately.

## 9. Layout sketches

These show attention hierarchy, not finished visual design. Content and costs must be derived from the active Quest.

### Choosing / drafting

```text
Quest · place        Year / deadline        Crises · resources       ?
Your job: [short outcome reminder]                       Briefing

[Board]  [Add an idea — active]  [Ask for help]          More tools

Choose a technology that could help here.                Show me where
─────────────────────────────────────────────────────────────────────
For this place: [suggested illustrated technology cards]
All emerging tech ▸

After selection, this space becomes:
[Chosen technology · why here]       Change technology · Learn
[Write an idea]  or  [Ask for ideas · actual cost]
[Active editor OR illustrated suggestions]
─────────────────────────────────────────────────────────────────────
Turn actions remain available, visually secondary until relevant.
```

### Placing / reviewing

```text
Same Quest header and navigation; nothing resets.

Place this idea beside the problem it could help.        Show me where
─────────────────────────────────────────────────────────────────────
[Compact unplaced idea tray]       [                ]
                                  [   HEX BOARD    ]
                                  [                ]
                                  [affected crisis + readable status]
─────────────────────────────────────────────────────────────────────
Pathway: [one factual change or blocker]                 Details ▸
[Relevant next action]             Look Ahead · End turn
```

An expanded explanation, evidence view, or co-inventor uses the supporting surface. The screen should not accumulate permanent panels with each action. Explicit pinning is a later convenience, not part of the first prototype.

## 10. What not to do

- Do not add an introductory tour that explains every panel before the learner may act.
- Do not turn the `ipad` station list into a required linear journey.
- Do not shrink text to fit the dashboard, or replace every panel with an unexplained icon.
- Do not repeatedly open and close panels based on what the system thinks the user should do.
- Do not default to AI-generated inventions as the only obvious route.
- Do not remove the board's spatial reasoning in favor of filling a sequence of forms.
- Do not hide every assessment until the end; timely causal feedback is part of the practice.
- Do not introduce new rewards, currencies, campaigns, character systems, or multiplayer infrastructure to solve this attention problem.
- Do not revise Quest schemas, pressure math, model prompts, access plans, or learning objectives as part of the layout work.

The [game-feel proposal](plans/edutainment-game-feel.md) and [social-invention brainstorm](social-inventing-low-friction-brainstorm.md) address adjacent problems. They are not additional requirements for this plan.

## 11. Implementation sequence and approval gates

### Phase 0 — Agree the interaction, then prototype the handoff

**Decision required:** Approve B: focused workbench, common help recommendation, reversible Focus/Overview presentation, and no rule changes.

**Proposed artifact:** `docs/assets/focused-workshop-prototype.html` — a non-production clickable prototype, created only after approval.

1. Build the final-briefing → crisis-introduction → choose/write-or-ask → place → feedback path using a representative existing Quest.
2. Include returning to the briefing, changing technology, opening evidence/help, and returning to an unchanged draft.
3. Demonstrate both a wide desktop and a narrow/touch layout. Do not call live providers for a wireframe; mark demonstration outcomes as fixtures.
4. Compare with the current interface and the `ipad` station approach using the playtest below.

**Exit gate:** A newcomer can find the first action and understand the idea-to-board-to-feedback relationship without a narrator. If not, revise the interaction rather than polishing the prototype.

### Phase 1 — Make help a reliable shared recommendation

**Existing files:** `js/guided-tour.js`, `js/guided-tour.test.js`, `js/game.js`, `js/concept-cards.js`, `js/concept-cards.test.js`.

**Proposed new files:** `js/workshop-guidance.js`, `js/workshop-guidance.test.js` for a small presentation adapter/controller, not a second gameplay evaluator.

1. Add failing resolver tests for pending crisis introduction, unavailable actions, no suggestions, empty pathway, tutor entry, relevant busy states, and restored runs.
2. Extend the shared recommendation contract with stable task identity, target/surface, explanation, and availability. Preserve existing `?` behavior through an adapter where needed.
3. Render the passive current-job strip without calling target reveal or changing focus.
4. Add explicit **Show me where** behavior and tests for missing targets, focus restoration, and stale callbacks.
5. Reconcile concept/help copy against actual solo and multiplayer consequences; ensure only one prompt layer is active.

**Exit gate:** For the same snapshot, `?` and the strip agree. Viewing or refreshing guidance cannot spend resources, trigger a model call, mutate a board, or move the user's working surface.

### Phase 2 — Introduce the focused presentation shell

**Existing files:** `index.html`, `css/styles.css`, `js/game.js`, `js/dock-layout.js`, `js/side-split.js` and its tests.

**Branch foundation:** `ipad:js/tabletop.js`, `ipad:js/tabletop.test.js`, and relevant markup/CSS. These do not exist as main-branch files at the inspected revision.

1. Choose the implementation branch and review the specific iPad changes to reuse. Do not switch branches or merge unrelated work automatically.
2. Add tests for Focus/Overview preference, panel routing, and preserved drafts before adapting the station controller.
3. Reuse existing live panel nodes and handlers. Avoid duplicate IDs, a second board instance, or remounting chat whenever its drawer closes.
4. Decouple focused presentation from the coarse-pointer media query; use responsive styling for geometry, not to decide who deserves guidance.
5. Group related work into the workbench and Board surfaces. Keep full controls reachable through labeled contextual entries.
6. Add explicit return targets, Escape behavior, focus management, and reliable hidden/inert behavior. CSS `display:flex` must not override a panel's hidden state.
7. Keep the Overview arrangement usable and preserve the existing second-screen feature.

**Exit gate:** Switching views changes no game state and loses no draft, selected tile, chat, assessment, board viewport, or valid in-flight request. Keyboard and touch users can reach the same actions.

### Phase 3 — Wire the briefing, placement, and feedback handoffs

**Existing files:** `js/briefing-ui.js`, `js/crisis-introduction.js`, `js/crisis-introduction.test.js`, `js/game.js`, `js/hex/hex-workshop.js`, `js/hex/hex-workshop.test.js`, `js/hex/board-ui.js`.

**Branch foundation:** the iPad `addCardToBoard()` / `appendPlaceButton()` / `renderPlaceNotice()` flow and `firstLegalHex()` in `js/hex/board-state.js`.

1. Test fresh entry separately from Continue, replay, quest replacement, and repeated runs of the same Quest.
2. Keep the rest of the workbench quiet during the existing crisis introduction. Handle no crises, subsets of roles, reduced motion, and missing animation geometry.
3. Add the explicit idea-to-board handoff. Test both pointer placement and touch/keyboard alternatives against existing placement validation.
4. Present assessment summaries next to the relevant board objects; show not-started and pending states without changing evaluation or hold conditions.
5. Put actions within reach of the current working surface. Use the existing execution handlers and confirmations, not proxy buttons with copied business logic.
6. Test failure and retry: unavailable AI, missing evidence, rejected placement, resource shortage, stale assessment, and a failed save must leave the learner oriented and their work intact.

**Exit gate:** A complete real first-move loop works without cross-panel dragging, mandatory reading, misleading success, or accidental time advancement.

### Phase 4 — Complete supporting tools and mode coverage

**Existing files:** `js/capability-explorer.js`, `js/capability-explorer.test.js`, `js/capability-explorer-integration.test.js`, `js/coinventor.js`, `js/captain-log.js`, `js/tutorial.js`, `js/tutorial.test.js`, plus the actual room/hotseat integration paths in `js/game.js` and `js/multiplayer/`.

1. Verify every row in the surface map in section 7. Nothing becomes inaccessible merely because it is not recommended now.
2. Preserve evidence selection, full descriptions, chart lifecycle, citations, and the active run's prediction bank when opening/closing outlook.
3. Preserve co-inventor drafts, chat, tutoring status, request ownership, and action costs. Closing or revealing a panel is presentation-only.
4. Coordinate the existing tutorial and concept overlays rather than running parallel instructional systems.
5. Scope local UI state correctly for Friends/hotseat seat changes and spectators. The client may suggest a surface; it cannot overrule the server's action permissions or another seat's state.
6. Verify Continue, second-screen panels, browser refresh, device rotation, and layout preference changes.

**Exit gate:** All current functions remain reachable and accurate in each supported mode. A solo prototype is not a claim of multiplayer completion.

### Phase 5 — Verify, observe, and roll out

1. Run focused tests after each task, then the complete project gate. Add any new runtime/test files to the explicit package scripts where their directory is not already globbed.
2. Bump the relevant independently cached module and stylesheet URLs when runtime code changes. Verify the exact versioned assets through the local server.
3. Complete browser acceptance and cold-user playtests, including both Focus and Overview.
4. Ship behind a reversible presentation default only after the acceptance criteria pass. Keep an easy Overview fallback.
5. Update the handbook to describe the approved, shipped behavior—not this entire brainstorm.

**Do not commit, push, publish, or change the default until requested.**

## 12. Verification and usability acceptance

### Automated and integration checks

Use the existing Node runner. These are proposed implementation gates, not claims of completed implementation:

```bash
node --test js/guided-tour.test.js js/concept-cards.test.js js/crisis-introduction.test.js
node --test js/hex/*.test.js
node --test js/capability-explorer*.test.js js/side-split.test.js js/tutorial.test.js
npm run test
npm run check:syntax
npm run check:portal-spa
git diff --check
```

Add focused tests for the new guidance/presentation controller and the adopted tabletop code. Explicitly test an input edit followed by a delayed AI result, a run replacement, a seat switch away and back, and repeated Show me where clicks. Unit tests must assert that presentation actions do not invoke spending, time advancement, minting, or provider work.

### Browser acceptance

Test wide desktop, ordinary laptop, tablet portrait and landscape, and a narrow phone viewport; include mouse-only, touch, keyboard-only, reduced motion, and enlarged text. Use representative dimensions such as 1440×900, 1024×768, 768×1024, and 390×844, plus 200% browser zoom.

- The first action is visible without hunting below multiple panels.
- Placement keeps the selected idea and a usable board target visible together.
- No clipped controls, horizontal page scrolling, trapped nested scroll region, invisible focus targets, or color-only status meanings.
- A screen reader receives a concise task update, not the whole changing assessment on every render.
- A background response never closes an editor or steals keyboard focus.
- Closing evidence, help, or a dialog returns to the correct object and preserves its state.
- AP/Budget/Support costs, binding local rules, and time consequences are discoverable before commitment.
- Actual solo End turn and Wait effects are explained correctly; room/hotseat copy reflects their own turn rules.
- Briefing replay, Continue, and returning users do not receive a compulsory fresh-run ceremony.
- A new Quest cannot inherit another run's focus, dismissed introduction, or pending target.
- Full capabilities and developer-scoped Inspect remain reachable through their appropriate paths.

### Cold-user test

Run a small formative test with five first-time users, plus a few returning users. Five is a practical first batch, not statistical proof. Keep Quest content comparable; avoid testing two variants on the same person as if their second attempt were still a cold start. Test both self-written and AI-assisted routes and include one learning Quest.

Give only this invitation: **“Try to help this place. Say what you are thinking.”** Do not explain the panels unless the participant gets stuck; record each rescue.

| Observe | Initial acceptance target / question |
|---|---|
| Orientation after briefing | Can at least four of five name the next action and its purpose within about ten seconds, without prompting? |
| First contribution | Can at least four of five get an idea onto the board without facilitator navigation help? Record elapsed time, but do not confuse faster AI with better UX. |
| Causal understanding | Can they explain which problem their tile is meant to help and why the feedback appeared? |
| Recovery | Can they find the right edit, movement, or evidence tool after feedback without a panel tour? |
| Time and resources | Before using End turn or Wait, can they explain the cost/consequence well enough to make a deliberate choice? |
| Discoverability | Can they reopen the briefing, find Capability outlook, ask the co-inventor, and return without losing work? |
| Agency | Did they feel guided or pushed through a prescribed answer? Did they know they could choose another technology? |
| Returning-user cost | Can existing users resume their work and use Overview without repeated prompts or extra mandatory clicks? |

These targets are hypotheses to validate, not measured improvements. Record wrong turns and forgotten context as well as time. A cleaner screenshot is insufficient if people now spend their effort finding concealed tools.

Use manual observation first. If later adding analytics, collect content-free task/navigation events rather than learner prose, prompts, answers, or private diagnostic payloads; that instrumentation is a separate approval.

## 13. Decisions to approve

1. **Direction:** Focused workbench rather than a new tutorial, chat-first replacement, or universal panel carousel.
2. **Default:** Focus for a user without a preference; Overview always available, with identical rules and capabilities.
3. **Guidance:** A passive next-action strip based on the existing `?` resolver; navigation only when the person follows it.
4. **First slice:** Final briefing through first placed idea and meaningful feedback, before redesigning every tool.
5. **Scope:** Presentation, orientation, accessibility, and consistent explanatory copy. No new gameplay systems or content schema changes.

The smallest useful next investment is the prototype in Phase 0, not a full Workshop rewrite.

## 14. Source anchors and checks performed

Line numbers refer to inspected `main@b4411a6`; symbols are better anchors after edits.

- `docs/future-forge.md:93–103`: one Workshop, problem-first disclosure, and the hurt → need → family → idea → tile loop.
- `index.html:1208–1507`: crisis recap, outlook, invent, board, pathway, rules, and action surfaces.
- `index.html:1511–1619`: side tabs, Vision/co-inventor arrangement, Log, and developer Inspect.
- `js/guided-tour.js:215–624`: `resolveTourStep()` decision ordering and targets.
- `js/guided-tour.js:805–849`: overlay open/refresh calls target reveal; not suitable as a passive strip unchanged.
- `js/game.js:22619–22756`: `tourSnapshot()` and available state, including crisis introduction and seat information.
- `js/game.js:23024–23152`: target reveal, guidance integration, concept cards, and the `?` entry point.
- `js/crisis-introduction.js:20–144`: seeded-tile authority, introduction lifecycle, animation, and reduced-motion fallback.
- `js/concept-cards.js:94–101` versus `js/sim/actions.js:318–396`: End turn explanation discrepancy and actual solo time/pressure behavior.
- `ipad@d21ddf5:js/tabletop.js`: `TABLETOP_MQ`, `TABLETOP_STATIONS`, `stationsFor()`, `initTabletop()`, `select()`, `chooseInitial()`, and `landCrisis()`.
- `ipad@d21ddf5:js/hex/hex-workshop.js` and `js/hex/board-state.js`: explicit placement flow and `firstLegalHex()`.

**Checks performed for this document:** The existing guided-tour, concept-card, and crisis-introduction tests passed: 56 tests, zero failures. The iPad findings are source/history inspection, not browser acceptance. No application code was changed; no full-suite, live-provider, hosted, or usability verification of the proposed design has occurred.
