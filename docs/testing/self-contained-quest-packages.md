# Self-contained Quest packages: verification and release gates

This is an implementation checkpoint, not a hosted-release approval. The governing requirements are in [the implementation plan](../self-contained-quest-package-plan.md). No production publication or database migration is implied by passing offline tests.

## Regression commands

From the game repository:

```sh
npm test
npm run check:portal-spa
git diff --check
```

The standard test command includes mission normalization, browser Continue helpers, semantic digest vectors, package identities and world validation, the server/room suites, archive tests, and sideload compatibility. `check:syntax` includes the new package and authority modules.

Targeted browser-boundary regressions:

```sh
node --test js/mission-normalize.test.js js/cloud/continue.test.js js/coinventor-context.test.js js/lean-coinvent-context.test.js js/voice-context.test.js js/rooms/room-package.test.js js/server/quest-package.integration.test.js
```

Publication and hosted-reader regressions:

```sh
node --test js/server/publish-quest-package.test.js js/server/hosted-package-resolver.test.js js/server/package-release.test.js js/server/quest-object-storage.test.js js/quests-remote.test.js portal/functions/public-routes.test.js
```

For a validated v2 archive, the credential-free publication plan is:

```sh
npm run publish:quest-package -- /absolute/path/to/package.ffquest --dry-run
```

A live adapter must implement strongly consistent reads, atomic create-if-absent, and versioned compare-and-swap. The CLI must reject an adapter that cannot supply that contract; unconditional SDK uploads are not an acceptable substitute. Live staging validation is still a release gate.

## Checks executed during the review-fix pass

Full suite: **1871 pass, 0 fail, 2 skipped** (skips are Postgres-only lock tests requiring a live database). `git diff --check` passed.

A focused run of browser normalization, Continue, digest, co-inventor, voice-context, room-package, and HTTP integration tests passed: **76 tests, zero failures** at that earlier checkpoint. The full-suite count above supersedes it.

The HTTP test now explicitly runs the same `normalizeMission()` used by the browser twice, rather than passing an API mission straight into `prepareRunWorld()`. It configures a real unrelated ambient bank, installs two packages with identical internal bank IDs and different calendars, and checks the server's model payloads in five modes. The chat request deliberately omits `packageRef` while retaining the Quest ID to test server inference.

### Authority choke-point verification

`applyAuthoritativeContext` in `js/server/quest-world-context.mjs` is the single boundary. Player text is preserved; client-supplied banks, grants, grounding, and pressure rules are discarded and rebuilt from the resolved release. It is reached from:

- **voice-session** — `applyAuthoritativeContext(body, resolvePackage)` before the model call.
- **quest-request-authority** — room (`createRoomQuestRequestAuthority`) and portal (`createQuestRequestAuthority`) routes, which resolve the package, call `applyAuthoritativeContext`, and return the guarded body.
- **portal co-invent route** — `authorizeQuestRequest` → `prepared.context` → `authorizedQuestBodies.add(authorizedBody)`.

`handleCoInvent` in both `server.mjs` and `portal/server.mjs` gates on the `authorizedQuestBodies` WeakSet: any body not added by an authority step throws `package_authority_required` (403). No model path (`fast-eval`, `co-invent-local`, `voice-prompt`) is reachable with a client-supplied `predictionsBank` without first passing through this gate.

### Corrections to earlier false gaps

The initial review identified three items as gaps. All three are in fact implemented:

1. **`legacy_world_unresolved`** — implemented in `companion-context.js` → `legacyWorldUnresolved()`, wired into `run-state.mjs` (`parseRunStateBody`, `sanitizePlay`) and `cloud/continue.js` (`validateContinueWorld`). Tested in `run-state.test.js`, `run-state.continue.test.js`, and `cloud/continue.test.js`.
2. **`skills/`** — updated: `future-forge-companion/SKILL.md`, `future-forge-quest/SKILL.md` (+ `references/companion.md`, `references/schema.md`), and `future-forge-predictions/SKILL.md` (+ `references/output-contract.md`).
3. **Browser Continue safety** — `continueCloudRun()` now validates the save before any catalog refresh or mission start; `maybeOfferContinue()` preserves a cached save on a failed GET and offers recovery on `legacy_world_unresolved`.

### Cache-buster and browser-loading fixes

- `portal-19 → portal-20` in `js/game.js` (continue.js, quest-board.js imports).
- `companion-13 → companion-14` in `js/main.js`, `index.html` (main.js + styles.css).
- `state.legacyToastShown` gates the recovery toast to once per session.

### Residual authority note

`portal/server.mjs`'s room `coInventHandler` does not resolve authority itself (unlike `server.mjs:3025`, which calls `portalQuestAuthority`/`localQuestAuthority` before adding to `authorizedQuestBodies`). `ROOMS_ENABLED=false` keeps this path inert in the portal, but the handler must be upgraded before rooms are enabled there. No model call is made without authority in the current configuration.

### Real browser smoke test

An isolated headless Chrome profile opened the actual application on a fixture-only server. The environment omitted model credentials and used an unrelated ambient predictions bank. On that same server, the browser opened package A, entered its companion preview and briefing, and reached the invent screen; it then opened package B and repeated that path, followed by a return to package A. No server restart or bank reconfiguration was needed.

The smoke test exposed an additional bug: the conversational co-inventor request builder dropped the package reference even though the game context contained it. The fix preserves package/run identity through conversational and lean requests; package requests do not duplicate the bank body. A failing regression was run before the fix. Voice context fingerprints now distinguish run, package, revision, and selected member even when displayed text is identical; that regression also failed before its fix.

After the fix, actual browser network payloads for both packages contained their own exact reference and selected grant:

| Package | Selected grant headline | Full bank body sent |
|---|---|---|
| `review-dock-a` | `Synthetic calendar a` | No |
| `review-dock-b` | `Synthetic calendar b` | No |

These are synthetic fixture calendars, not verified forecasts. The browser test did **not** establish model quality, authenticated Cloud Continue, live voice behavior, or a hosted asset-delivery journey. The provider was unavailable as expected without authentication. Both verification-only processes were stopped; the user's ordinary Chrome profile was left untouched.

## Deployment and recovery boundaries

- Migration `js/server/db/019_run_package_binding.sql` has not been applied by this verification pass. Review and apply it only through an explicitly authorized database workflow before deploying code that queries its columns.
- Retain old immutable release objects. New publication must not rewrite them or silently rebind existing runs.
- Missing or invalid release dependencies must fail before play/model use; do not replace them with the ambient calendar.
- Keep invalid legacy saves available for recovery. Do not silently regenerate their assumptions.
- Current catalog membership and entitlement must be rechecked for retained revisions; an old open release must not bypass today's account/paid policy.

### Warmersun cross-repository status

The warmersun deploy scripts (`gated-deploy-package.sh`, `stage-package.sh`, `website-deploy-package.sh`) contain v2 handling: v2 archives are routed through `publish-quest-package.mjs` and unpacked raw content lands via `package-release.mjs land`. The scripts also preserve immutable release objects (`packages/<id>/<revision>/`) and write `packageRef` catalog entries instead of loose quest files. `publish-quests.py` mirrors immutable package trees (`packages/`) and validates `packageRef` entries before catalog inclusion. A `package-release.mjs` lander enforces whole-open-access for public releases, rejects gated/mixed packages, and writes `releases.json` indexes. A `package-workflows.test.mjs` exists and was executed against `FF_REPO=/mnt/data/dev/future-forge`: **5 pass / 0 fail** (website raw-release preservation, staging byte preservation, gated no-publish, public/mixed rejection, temp-root safeguards).

What remains unverified is the end-to-end hosted journey (live CAS adapter, authenticated browser Continue, live voice/model checks) and the production database migration. The deploy scripts are present and v2-capable but unexercised end-to-end against a live adapter.

- Adjacent deployment scripts, a verified live CAS adapter, authenticated browser Continue/room checks, and live voice/model checks remain separate acceptance gates until explicitly exercised.

## Final gate

Before declaring the plan complete, record the fresh full-suite results and independent review outcome here, execute the remaining acceptance matrix, and document the actual hosted asset/lesson projection and cross-repository deployment status. Successful helper tests or a local browser smoke test alone are not hosted-release completion.

Current status: **1871 pass / 0 fail / 2 skip** (offline). Hosted publication: **not performed**. Database migration: **not applied**. Live CAS adapter: **not verified**. Authenticated browser Continue/room/voice: **not exercised**. Warmersun deploy scripts: **present and v2-capable, unexercised end-to-end**.
path">
/mnt/data/dev/future-forge/docs/testing/self-contained-quest-packages.md