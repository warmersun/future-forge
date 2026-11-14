# Focused Workshop implementation

The focused presentation is available through **More tools → Layout → Focus**. Overview remains the default for a device without a saved preference, following the plan's rollout gate. No commit, publication, or default rollout is included.

The implementation uses the existing live Workshop panels and authoritative board. It adds three main destinations, contextual supporting views with a named return, a shared passive recommendation, explicit placement preview and confirmation, and a short factual assessment beside the board. Choosing a presentation or reading guidance does not execute an action, spend resources, advance time, or request a model response.

Layout preference is stored on the device. Task position and return targets are scoped to a run and viewed seat in memory. A restored run starts with a sensible Board or tutor context rather than replaying the introduction or borrowing another run's task. Existing Continue storage continues to own game state and drafts.

The [clickable prototype](assets/focused-workshop-prototype.html) uses Crossing Clinic 7 and marks its outcomes as fixtures. It makes no provider calls.

## Verification

- New controller tests cover passive updates, explicit reveal, missing and CSS-hidden targets, repeated reveals, run replacement, seat switching, draft preservation, layout preference, introduction/replay presentation, and help focus restoration.
- Placement tests cover legal preview without mutation, explicit execution, rejection/retry, run/seat ownership, and delayed image/model replies that must preserve newer drafts.
- The focused tests, syntax checks, and portal SPA checks pass.
- The full project suite reports 2,225 passing, four failing, and two skipped tests. All four failures reproduce against an untouched `HEAD` copy: `resourceOverrideLabel` in `quest-tile.test.js`, the HTTP model-boundary assertion in `quest-package.integration.test.js`, `mp-session pay_will`, and `extractKnobs` in `quest-economy.test.js`.
- Chrome smoke checks use the real application with local Quest data and unavailable provider endpoints. They cover briefing/introduction with reduced motion, choosing and reselecting technology, editing, evidence/help returns, Enter/Escape focus restoration, layout switching, local minting, and preview → explicit confirmation of exactly one placement. Failed provider requests produce an offline practice estimate. Ask/Refresh and Mint display their actual AP costs.
- Responsive checks cover 1440×900, 1024×768, 768×1024, 390×844, and a 720×450 viewport equivalent to the available area at 200% desktop zoom. No horizontal page overflow or runtime exceptions were observed. Write and Ask are visible together on the tested phone; the editor remains scrollable. This does not substitute for testing actual browser zoom and assistive technology.

## Remaining rollout gates

Cold-user observation cannot be replaced by automated checks. The five-newcomer playtest, live provider acceptance, and complete room/hotseat/spectator/second-screen browser acceptance remain rollout work. Tests cover scoped presentation state and the existing multiplayer authorities; that is not a claim of a complete multiplayer usability study. Keep Overview available and retain its default until those checks support changing it.
