---
name: Sponsored modules review
overview: Code review of uncommitted sponsored-module handling. The architecture (kind:module wrappers, catalog grouping, hub counts) is sound, but grouping happens after per-entry partition and joins on module title rather than lesson ids — that can split or empty a module in the hub.
todos:
  - id: fix-partition
    content: Group modules first, then classify the group as Sponsored vs Learning (not per-entry)
    status: pending
  - id: fix-join
    content: Attach lessons by wrapper lessons[] ids (slugified); title is fallback only
    status: pending
  - id: add-tests
    content: "Tests: sponsor mismatch, title mismatch, slug mismatch, empty wrapper, module import"
    status: pending
isProject: false
---

# Code review: sponsored learning modules

Uncommitted work adds `kind: "module"` wrappers, catalog grouping, and hub/catalog UI so a multi-lesson sponsored path is **one card** (summary first, then lessons), not four separate quests. Loaders (`validateQuestDocument` / `catalogRecordFromValidated`) and tests for the happy path are in good shape. Playability of modules is correctly blocked (`mission: null`; `playCatalogEntry` opens the module panel).

No code changes in this review.

## High

**Sponsored partition is per-entry, so a module can split across Sponsored and Learning.** [`js/quest-catalog.js`](js/quest-catalog.js) `partitionCatalogQuests` puts each remote tile in Sponsored or Learning from *that tile’s* `sponsorName`. [`groupLearningModules`](js/quest-catalog.js) then groups *within* a partition.

Docs/skill say sponsor on the **wrapper / lessons** (either). If only the wrapper has `sponsorName`, the wrapper is an empty Sponsored module and the lessons appear under Learning (or the reverse). Tests only cover both sides sponsored ([`js/quest-catalog.test.js`](js/quest-catalog.test.js) L69–92).

Fix: group first (wrapper `lessons[]` + module title), then classify the **group** as Sponsored if the wrapper *or* any lesson is sponsored.

## Medium

**Join key is the `module` title string, not wrapper `lessons` ids.** Lessons are bucketed by `mission.module` before the wrapper is attached. A title mismatch (`"Same-day dollars"` vs `"Same-day dollars at the market"`) yields two cards: an empty summary module and a title-grouped lesson stack. Wrapper `lessons` only reorder ids already in that title bucket; they never pull lessons from another bucket.

Fix: seed the group from the wrapper, resolve `lessons` by catalog id, then fall back to title for wrapper-less sets.

**Lesson ids in the wrapper are not slugified.** [`validateQuestModule`](js/quest-tile.js) trims/slices `lessons[]`; quest ids always go through `slugId` (lowercase, non-alnum → hyphen). `groupLearningModules` uses exact `entry.id` match. A wrapper listing `"Spotlight Crypto Saltpier Payout 2026"` will not attach `spotlight-crypto-saltpier-payout-2026`.

**Example wrapper is internally inconsistent.** [`skills/future-forge-quest/examples/spotlight-sponsored-module.json`](skills/future-forge-quest/examples/spotlight-sponsored-module.json) has `totalLessons: 2` and one id in `lessons`. Validator does not require those to agree; UI will show a 2-segment bar and one playable lesson.

## Low

- **`overviewMd` images vs cover stills:** `moduleSummaryHtml` renders overview with `renderMarkdownSafe(..., { allowImages: true })`, which only allows `https?` URLs. `coverImageUrl` allows `assets/…`. Local stills in overview markdown will not show.
- **`tileAccess` ignores `kind: "module"`** ([`js/server/cloud-gate.mjs`](js/server/cloud-gate.mjs)). Validated modules set `access: "account"`, so this is latent unless a module tile is stored without `access`.
- **`isModuleEntry` fallback** `!e.mission && Array.isArray(e.lessons)` can treat a broken quest record as a module.
- **`scripts/author-quest.mjs`** still calls `validateQuestTile`, so it cannot emit/validate wrappers (`validate:quest` CLI is updated).
- Module cards have no Copy-link; deep link to a module id does open the panel via `playCatalogEntry`.

## Missing tests

Happy path is covered (module validate, folder scan, hub counts = 2 for wrapper+4 lessons+1 spotlight). Not covered:

- Wrapper sponsored / lessons not (and the reverse) — the high finding
- Wrapper `lessons` vs lesson `module` title mismatch
- Lesson id slug mismatch
- Wrapper with zero resolvable lessons
- `importQuestToLibrary` for `kind: "module"` (meta tests still assume `mission`)
- Remote catalog ingest of a module (quests-remote tests still assume `mission`)

## What looks correct

- Modules are not playable; MP pick filters `isLearningEntry`
- Hub counts modules as 1 ([`catalogHubCounts`](js/quest-catalog.js))
- Cover URLs go through `isSafeBriefImageUrl`; overview HTML is escaped / `renderMarkdownSafe`
- Import, inspect, back-from-module-detail, and cache-bust (`portal-43`) are consistent
- Base path files share `module: "Same-day dollars at the market"` and matching lesson ids, so **this content will group** if wrapper and lessons all have `sponsorName` (they do)

## Suggested follow-up (only if you want fixes)

1. Group-then-partition in `quest-catalog.js`, join on wrapper lesson ids, slug lesson ids in `validateQuestModule`
2. Tests for the three mismatch cases above
3. Align the skill example `totalLessons` / `lessons.length`
