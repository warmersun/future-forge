# Crisis Card Board Introduction — Implementation Plan

**Goal:** After the narrative briefing, show the quest's crisis indicators as clickable cards in the left briefing panel; each card visibly travels to its corresponding hex, and the panel collapses after the final card arrives.

**Architecture:** The existing seeded crisis tiles remain the authoritative game state. A presentation-only introduction hides each seeded tile until its matching card is activated, then animates a visual copy to the tile's position and reveals the real tile. This avoids changing crisis rules, coordinates, multiplayer authority, or existing saved boards. The briefing recap receives an accessible, independently collapsible wrapper.

**Technology:** Existing browser JavaScript, SVG hex board, CSS, Node test runner.

## Work sequence

1. Trace fresh-run setup, briefing completion and board rendering. Distinguish a genuinely new run from Continue and briefing replay; identify the existing crisis IDs, labels, descriptions, lamp colors and recap container. The cards must use the seeded tiles rather than assuming three roles or yellow lamps.
2. Implement an introduction controller with an explicit pending/revealed set and guarded activation. It must survive ordinary board rerenders, prevent duplicate activations, make each selected card unavailable while its flight is active, and leave game/simulation state untouched. Reveal a tile only when its corresponding card arrives. For absent/zero crisis tiles, finish safely. Clean up pending animation and visual state on a new run or leaving the screen.
3. Render accessible buttons in the briefing recap, displaying each crisis name, description and actual traffic-light status. Measure each card and its matching board SVG element; animate a copy toward the destination, then reveal the real hex. If motion is reduced or either rectangle is unavailable, immediately reveal it. Do not leave invisible focusable tiles. Ensure repeated clicks and board redraws cannot strand the introduction.
4. Add a briefing disclosure control with synchronized `aria-expanded` and a persistent visible heading. Keep the recap readable and reopenable. Open it for introduction and close it on the final landing, not on the initial click. Repainting the recap must not accidentally reset the disclosure or regenerate cards.
5. Integrate the sequence after the briefing walk exits and the normal workshop is visible. Existing Continue/legacy runs must not acquire hidden tiles or be blocked; a fresh quest must still work if briefing has previously been dismissed for that mission. Replay must not duplicate tiles. Coordinate the existing Play tutorial so it allows the crisis cards before its board-reading lesson and never traps input.
6. Add focused automated tests for card-to-tile identity, multiple/subset roles, click/landing sequencing, duplicate clicks, reduced motion/no geometry, final collapse, replay/restored runs and tutorial progression. Register any new test explicitly in `package.json` and bump independently cached runtime and CSS URLs.
7. Run focused tests, `npm run test`, `npm run check:syntax`, `npm run check:portal-spa`, and `git diff --check`. Start the local server without reading user environment files and verify exact versioned URLs return 200. Exercise the actual workshop in a browser at desktop and narrow widths, including keyboard activation, reduced motion, panel reopening and the tutorial; report any unverified browser or authenticated paths explicitly.

**Scope:** No commits or unrelated edits. Preserve the existing quest briefing beats, crisis simulation, shared-board authority, and user files. Visual introduction is not a new game rule.
