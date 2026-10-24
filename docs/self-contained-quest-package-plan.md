# Self-contained Quest packages: detailed implementation plan

> **For Grok CLI:** Implement task-by-task after approval. Read each named implementation before changing it. Use failing regression tests, then the smallest implementation, then integration tests. Do not commit, publish, migrate a live database, or change access/billing policy without separate authorization.

**Goal:** Deliver one `.ffquest` containing the Quest, its required world assumptions, source context, lessons, and assets, so selecting a Quest never requires selecting a server-wide predictions file.

**Architecture:** Extend the existing package format with ordinary prediction-bank files. A Quest's `predictionBankId` selects its complete package-local calendar; existing premise grants define bounded exceptions, not a second calendar. Resolve an immutable package revision server-side and bind it to the run. No separate world descriptor is needed.

**Tech Stack:** Existing Python packaging CLI, browser JavaScript, Node.js, Neon Functions/Postgres/object storage, `node:test`, and built-in SHA-256. No new archive library, service, model endpoint, or dependency is required for this design.

**Status:** Implementation authorized. The package-local bank design below supersedes the earlier world-descriptor proposal. This plan supersedes the deployment/runtime-bank decisions in [the gameplay plan](play-the-breakthrough-gameplay-plan.md); retain that plan's conditional-invention UX and premise-respecting evaluation requirements. Actual verification belongs in `docs/testing/self-contained-quest-packages.md`, not in acceptance promises here.

---

## 1. Baseline and scope

Reviewed `main` at `a167143d9e75ec8411f51ad4c4338002474c8cd5`; the worktree was clean before this document was created. Recheck before implementing.

Read alongside:
- [Existing package specification](quest-package.md).
- [Existing predictions bank](predictions-bank.md).
- [Companion authoring workflow](../skills/future-forge-companion/SKILL.md).
- [Companion field reference](../skills/future-forge-quest/references/companion.md).

Current seams verified by source inspection:

| Existing seam | Present behavior | Required change |
|---|---|---|
| `scripts/quest-package.py`: `TOP_LEVEL`, `build_description`, validation, pack/unpack | v1 contains quests/lessons/assets; manifest hashes the files. | Add a backward-compatible v2 reader and a self-contained world contract. |
| `scripts/sideload-local-package.sh` | Extracts a package, configures content/Quest directories, starts developer server. | Register the verified package revision, not a predictions environment variable. |
| `js/companion-context.js`: `pinPredictionsBank` | Matches `premise.bankId` against loaded/restored bank; invalid restore can fall through. | Resolve package-local dependencies; never silently replace missing saved content. |
| `js/game.js`: `activePinnedBank`, `pickMissionById`, context and Continue builders | Bank can live on top-level state and mission; browser chooses loaded bank. | One run-scoped resolved world, authoritative on the server for hosted play. |
| `js/server/publish-quest.mjs`: `publishPlanned` | Writes mutable Quest objects, then catalog. | New package publication path writes immutable release objects, then promotes catalog references. |
| `js/server/quest-object-storage.mjs` | Catalog reader loads individual Quest JSON. | Resolve package-backed records while retaining legacy records. |
| `portal/functions/public-routes.mjs`, `player-routes.mjs` | Separate deployed read/player-data implementations. | Update these as well as `portal/server.mjs`; legacy-server-only work is incomplete. |
| `js/server/voice-proxy.mjs`: incoming context updates | Session context can be replaced from client messages. | Reapply authoritative world data on every update, not just session creation. |
| `js/companion-context.js`: `sourceInquiryKey` | Serializes bank contents into a key reused by timing caches. | Use compact digests, never persist a bank once per tile. |

Baseline executed for this document:

`node --test test/quest-package.test.mjs js/server/publish-quest.test.js js/server/quest-object-storage.test.js js/companion-context.test.js`

**32 tests passed; no failures or skips.** Log: `/home/sic/.hermes/cache/scratch/package-plan-baseline.log`. This is a focused baseline, not a full implementation review or evidence that the proposed design works. No deployment, authenticated browser journey, or live model test was performed.

### In scope

- A portable package and exact release identity.
- Multiple packages/worlds on one server without bank switching.
- Local preview, hosted delivery, deployed Functions, solo, multiplayer, voice, and Continue.
- Explicit complete calendars per Quest; separate bank files when assumptions differ.
- Server-owned world resolution, immutable run binding, compact cache identity.
- Migration of existing packages and assumed companions without silently changing saved worlds.
- Deployment-tool changes in the warmersun repository, as a separate implementation workstream.

### Not in scope

A new Quest kind, catalog tab, publisher dashboard, automatic source ingestion, opinion scoring, economic rebalance, new billing model, complete server-authoritative gameplay, or package marketplace. A hash identifies content; it is not a signature or entitlement. Do not claim this work prevents all score cheating.

## 2. Non-negotiable behavior

1. **One delivery artifact.** An assumed Quest package contains its complete required world data. A recipient needs no second file or `FF_PREDICTIONS_FILE` setting.
2. **Modular inside.** Keep Quest JSON, bank JSON, lessons, and assets separate inside `.ffquest`.
3. **No ambient merge.** Packaged worlds never inherit whichever default bank happens to be loaded at runtime.
4. **No cross-Quest assumptions.** Different calendars use separate banks, even inside one archive. Sharing a bank explicitly means sharing its complete calendar; grants still constrain the stronger assumed-premise exception.
5. **Immutable release.** Dates, claims, scope, pressures, and lessons belong to one exact revision. Replacing latest does not alter an existing run.
6. **Authority is server-derived.** Client-supplied banks, scopes, grounding, or hashes cannot redefine an official hosted world.
7. **Scope still matters.** An accepted prediction enables only its stated capability; infrastructure, responsibility, and other dependencies remain challengeable.
8. **Keep provenance.** Due in the fictional calendar does not mean verified in reality.
9. **Access is separate.** Continue and historical release reads recheck current authorization. A saved reference or downloaded package is not proof of paid entitlement.
10. **No silent downgrade.** Missing, corrupted, incompatible, or revoked content produces an actionable error, not the default world.

## 3. Package format: v2 envelope, existing content schemas

### 3.1 Layout

Retain `.ffquest` as a ZIP. Add `predictions/`:

```text
manifest.json                         generated, not authored
quests/<quest-id>.json                 existing quest-tile schema
predictions/<bank-id>.json             existing future-forge.predictions/v1

lessons/<folder>/...                   existing optional content
assets/...                            existing optional content
```

Emit `future-forge.quest-package/v2`, `version: 2`, when world data or bindings are present. Continue to read and verify v1 archives. Keep v1 output for unchanged legacy source trees. Old readers must reject v2 rather than play an incomplete package.

Add optional top-level `predictionBankId` to Quest JSON. Preserve it through validation, normalization, catalog records, lookup, and save projections. It is an identifier, not a URL. In v2 every playable Quest references one complete package-local bank. A module wrapper does not itself need a bank. No field is newly required for v1 or ordinary loose Quests.

Retain `companion.exploration.premise.bankId` and `grants[].predictionId`. For assumed companions, `bankId` must equal `predictionBankId`; this compatibility assertion is validated, not independently resolved. Do not add duplicate capability statements, dates, tags, or attribution to grants.

### 3.2 Direct bank binding

An authored Quest adds `"predictionBankId": "kiln-ferry-bank"`, with that bank in `predictions/kiln-ferry-bank.json`. There is no `worlds/` directory, row-role descriptor, overlay, or inheritance.

- Validate the existing bank schema and exact IDs; filenames equal bank IDs. Reject missing banks, duplicate IDs, unresolved grants, mismatched premise bank IDs, and orphan bank files.
- Every row in the selected bank belongs to this Quest's calendar. Two Quests share a bank only when that complete calendar is deliberately the same. Otherwise include separate banks.
- Existing grants still specify scope and limits. They do not silently enable other rows as assumed-premise exceptions.
- Evaluate due/not-yet using existing bank years and selectors; inclusion does not advance a forecast's date.
- Package revisions namespace bank/row IDs, so identical IDs in unrelated packages cannot collide.
- Keep the existing 2024–2040 year range and known technology validation.

The authoring review must still ensure synthetic scenario rows are not mislabeled as real forecasts. Structural validation cannot infer provenance from prose. An invented local assumption must say so and must not acquire a speaker's attribution through a bank-level default.

### 3.3 Complete world policy

The first implementation uses **complete included banks**, not runtime overlays or inheritance. Authors can copy a researched baseline into the package and add the intended assumptions. Shared source libraries remain an authoring convenience; their relevant bytes must be included before packing.

Do not automatically include the default bank or unrelated scenario rows. Do not fetch additional rows by URL during play. A future build-time composition tool can simplify authorship without changing this runtime contract.

### 3.4 Generated manifest additions

For v2, generate:
- `predictions`: entries `{ id, file }`, sorted by ID.
- `quests[].predictionBankId` for playable Quests, derived from Quest JSON.
- Existing file hashes including prediction files.
- `revision`: content identity described below.

Manifest listings are derived indexes, not a second editable binding authority. Verification rebuilds them from files and compares them. Reject orphan bank files in v2 unless referenced by a packaged Quest; this catches accidental inclusion of unrelated content.

All required world dependencies must be local. Existing `--allow-external-lessons` remains a legacy/module feature; it must not permit external world/bank dependencies. A v2 release requiring an external lesson Quest must either include it or fail with a self-contained-package diagnostic; do not silently import the latest external lesson.

### 3.5 Release identity and byte integrity

Use built-in SHA-256. Define one cross-language digest contract:

- Manifest schema and package ID, followed by sorted pairs of package path and lowercase file SHA-256.
- Encode as a compact JSON **array** of strings/arrays, UTF-8, no whitespace, non-ASCII preserved. Example structure: `[schema,id,[[path,digest],...]]`.
- Paths sorted by their UTF-8 bytes, not locale collation. Exclude `manifest.json`, `createdAt`, ZIP timestamps, and `revision` itself.
- `revision = "sha256:" + SHA256(encodedDescriptor)`.
- Python and Node golden tests must agree on Unicode paths/contents and stable ordering. Reject duplicate ZIP members and unsafe paths before building the descriptor.

Quest/world bindings are already in hashed source files; generated metadata must match them. Changing any required content produces a new revision. Repacking identical bytes with a different timestamp does not.

Preserve original hashed content when deploying. Existing unpack URL rewriting must not make rewritten JSON masquerade as the original release. For v2, retain an immutable raw extraction and resolve lesson/asset URLs in a runtime projection using separately stored delivery roots. Legacy v1 rewriting remains compatible. Preview and production can serve the same release with different roots without changing source content.

## 4. Runtime model and authority

### 4.1 Proposed resolved objects

`packageRef = { packageId, revision, questId }` identifies an exact release member. Its bank is derived from that Quest, not selected independently by a client.

A server-created `resolvedQuestWorld` contains:
- `packageRef`, normalized Quest and companion.
- Validated complete package-local bank and its compact digest.
- Delivery roots for assets/lessons.
- Explicit trust class: `official`, `local-import`, or `legacy`.

This is a shared internal contract, not an invitation to accept this entire object from a request. Browser projections can include its display/model-context data; the server reconstructs authoritative fields independently.

Proposed new modules:
- `js/quest-package.js`: pure package-bank binding and reference validation.
- `js/package-identity.js`: shared deterministic descriptor serialization; accept an injected digest implementation where necessary.
- `js/server/quest-package-resolver.mjs`: local/object-backed immutable release lookup and access-aware resolution.
- `js/server/quest-world-context.mjs`: rebuild model context from resolved authoritative content plus allowed player state.

Keep `js/sim/world-foresight.js` as the selector/validator foundation. Do not replace its process-global default; simply stop using it for v2 runs.

### 4.2 Loading and run binding

Hosted start sequence:
1. Resolve Quest ID to its current published package revision.
2. Apply the existing full-Quest access decision.
3. Verify package manifest and required content hashes, then resolve the world.
4. Bind the run to that exact package reference server-side.
5. Return the authorized runtime projection and run identity.

Reuse `/api/me/runs/start` for signed-in players. Extend `runs` with nullable server-owned `package_id`, `package_revision`, and `package_quest_id`; legacy rows remain nullable. Add a named migration in `js/server/db/` using the next available migration number after checking the repository at implementation time. This document does not authorize applying it to production.

Never allow ordinary run-save/update APIs to rewrite those columns. A restart under a new revision creates a new run. Lookup by run ID requires the authenticated owner; room runs require room membership. Current Quest entitlement remains the gate for historical revisions. Withdrawal must produce a clear unavailable state, not fallback to latest.

Do not make open Quests require an account merely to carry a package reference. For unsigned/open play, allow an exact installed/published package reference, verify its availability and current open access on each model request, and pin it in the browser/room session. It is a content selector, not a bearer entitlement. Cloud persistence continues to require the existing account permissions. Signed-in bound runs ignore attempts to change their package reference.

### 4.3 Authoritative AI context

For package-backed requests, reconstruct `grounding`, source companion/inquiry, bank, grants, pressure descriptions, and rules from the resolved release. Keep invention text, answers, selected technology IDs, and allowed current-game state as player inputs. Validate year within the mission bounds; full server adjudication of every Wait remains outside this feature.

Ignore or reject submitted replacements for authoritative fields; never validate a client-provided grant against a bank supplied by that same client and call it trusted. A package digest is not proof that the package was published or that the caller can access it.

Apply the same resolver to:
- General text co-inventor/tutor and idea-spark paths.
- Fast timing, pathway, critic, judge/coach/draft, and convergence calls.
- Voice session creation **and every websocket context update**.
- Multiplayer server evaluation and room hydration.

Resolve before charging/starting a model call. Missing or unauthorized content must not invoke a provider. Local imports may use the existing locally authorized provider setup but cannot be presented as official catalog runs or inherit official sponsorship/billing privileges. Preserve the existing cost/entitlement policy; do not add new account requirements for open/local play.

### 4.4 Local preview and import

Extend the existing sideload script to verify v2 and register the immutable raw extracted package directory. Proposed `FF_QUEST_PACKAGES_DIR` points to an operator-configured directory of verified extracted packages; it is not supplied by clients and is not a bank selector. The script can register its one temporary release under this root and still expose existing Library/content paths.

At server startup, validate/register all packages found there. Use maps keyed by package ID + revision, with explicit Quest catalog mapping; no last-loaded global bank. Duplicate current Quest IDs across packages must fail registration with a collision diagnostic, unless an operator explicitly chooses the current mapping.

The first supported import UX is the existing local package sideload workflow. Do not promise browser ZIP import unless it is actually implemented and tested. Loose JSON import remains supported for ordinary Quests. A loose v2-bound Quest must say “Import/open its .ffquest package”; it cannot silently use the default bank. Keep explicit legacy assumed-bank mode for developer compatibility, clearly separated from package mode.

## 5. Publication and hosted retrieval

### 5.1 Immutable objects and catalog references

Proposed object layout under the existing configured prefix:

```text
packages/<package-id>/<revision-hex>/manifest.json
packages/<package-id>/<revision-hex>/quests/...

packages/<package-id>/<revision-hex>/predictions/...
packages/<package-id>/<revision-hex>/assets/...
packages/<package-id>/<revision-hex>/lessons/...
catalog.json
```

Storage may separate public asset delivery from private Quest/world objects, but the manifest still records original file bytes and the release resolver records immutable delivery roots. Gated worlds must not appear in public catalog cards. Do not expose a whole mixed-access package merely because one member Quest is open; return only that authorized Quest's effective world.

Add package-backed catalog entries retaining `id` and a revisioned Quest `file` path for compatibility, plus explicit `packageRef`. The internal catalog loader must retain provenance; `catalogCard()` returns only allowed summary fields. Both object-store and remote/static catalog readers need package-aware paths.

### 5.2 Publication protocol

Create a dedicated package publish command; preserve `publish:quest` for legacy loose JSON. The new command:
1. Verifies archive structure, content schemas, bindings, hashes, access fields, lint/economy requirements, and limits before credentials/network work.
2. Plans every immutable object and intended catalog change. Offline `--dry-run` needs no credentials and produces this plan.
3. Uploads release objects idempotently. Existing matching objects are reusable; mismatched bytes at the same revision path are an error.
4. Reads back the exact required objects and verifies hashes.
5. Promotes the catalog entries only after the complete release and any required public assets are available.
6. Reads back catalog and resolves the exact Quest/world to confirm publication.

Catalog promotion must not lose concurrent publishers' changes. Use a provider-supported conditional write against the fetched ETag/generation, with bounded re-read/rebase retry. Existing AWS S3 dependencies are available, but prove the storage backend's conditional-write behavior in an adapter test/staging before claiming this guarantee. If unsupported, fail safe and require a documented exclusive publisher lock with enforced ownership; a blind last-write-wins PUT is not acceptable. Do not implement an unenforced “please publish one at a time” convention.

Failure before promotion leaves the previous catalog usable. Unreferenced staged objects are safe to clean later. Never delete old releases during publication; saved runs need them. Retention/garbage collection is deferred until run-reference retention policy exists. Rollback selects an existing verified release, not overwrites its bytes.

### 5.3 Warmersun deployment changes

Inspected adjacent repository paths:
- `/mnt/data/dev/warmersun/scripts/gated-deploy-package.sh` currently unpacks and invokes loose-Quest publishing.
- `/mnt/data/dev/warmersun/scripts/stage-package.sh` currently rewrites content and builds staging output.
- `docs/quest-package.md` also names `website-deploy-package.sh`; inspect its current implementation before editing.

These scripts must preserve/register world dependencies and release identity. Updating only the game repo's packer would create an archive that deployment discards parts of. For v2, route gated publication through the new package publisher; do not upload only `quests/*.json`. Stage/public deployment must publish a complete release index and immutable dependencies, keeping raw bytes separate from display projections.

Implement and test cross-repository edits only when that workspace scope is explicitly approved. Do not publish as part of implementation. If that workstream is unavailable, report hosted delivery as incomplete, not “package support done.”

## 6. State, cache, persistence, and errors

### One run-scoped world

Replace the precedence between `state.pinnedPredictionsBank` and `state.mission.pinnedPredictionsBank` with one resolved run context. Reset/hydrate it on fresh solo start, Continue, hotseat entry, room join/reconnect, room Quest switch, and exit back to ordinary play. Reflection remains private and run-scoped. Never carry a solo world's bank/reflection into a multiplayer mission.

### Compact identity

Hash semantic inputs once, rather than serializing a full bank into every key. A cache identity includes package revision, Quest ID, effective-world digest, year, and existing mode-specific invention/rubric inputs. Include schema/algorithm version in digest input. Timing provenance continues to use selected prediction IDs. No bank body in `timingForKey`.

Keep asynchronous generation tokens: a late old-run timing/score/critic/convergence response cannot overwrite the new run. Invalidation preserves invention/answers and must not replay costs, rewards, or convergence multipliers.

### Save format and retention

Official v2 saves store the server-owned compact package reference and player progress; do not repeatedly embed a whole bank in mission, play, board, and tile keys. Resolve the retained revision on Continue. Local offline-capable saves may include one validated package/world snapshot or reference the locally installed archive, with an explicit trust class; never upload that snapshot as official authority.

Keep `RUN_STATE_MAX_BYTES = 400_000`; measure UTF-8 bytes, not JavaScript string length. Package validation and run-state size tests must cover a realistic board, chats, and Unicode. Asset bytes never enter run state. Old run-state banks that are invalid must produce a diagnostic rather than be dropped and replaced by current server data.

### Errors / UX

Use stable proposed error codes with a player message and recovery action:
- `package_version_unsupported`: update this application; do not downgrade.
- `package_dependency_missing` / `package_integrity_failed`: retry or reinstall the same release.
- `package_revision_unavailable`: restore the original package or explicitly start a new run.
- `package_reference_forbidden`: sign in/restore access through the existing flow; no private details.
- `package_quest_collision`: operator must choose which release owns the catalog ID.
- `legacy_world_unresolved`: cannot reproduce this older run; preserve/export it, offer a fresh run separately.

Keep the opening stage and conditional premise visible. No new setup wizard, bank picker, or player-facing package management screen is required. An optional details disclosure can show source, premise, and release identity for support.

## 7. Compatibility and migration

| Input | Required behavior |
|---|---|
| v1 ordinary package | Existing verification/play behavior remains supported. |
| v1 assumed Quest + side-loaded bank | Explicit legacy/developer path remains; packaging migration copies the specified bank into v2. Never infer a missing bank from its name alone. |
| v2 package | All playable members have closed world dependencies and exact revision identity. |
| Ordinary loose Quest | Continue existing behavior; no new mandatory world fields. |
| Loose package-bound Quest | Require its package; no environment fallback. |
| Existing valid saved assumed run | Preserve exact stored companion/bank as legacy, not official proof. Compare with an available trusted release before offering conversion. |
| Invalid/missing legacy bank | Stop with `legacy_world_unresolved`; do not silently replace it with loaded/latest data. |
| Saved v2 run after publication update | Continue old retained revision, subject to current access. New runs use new latest. |

Migration is explicit and repeatable: supply a Quest/module source tree and its exact bank files; set each playable Quest's `predictionBankId`; validate; pack v2. Do not automatically rewrite `predictions/default.json`, source dates, grants, or original attributions. No migration is required for ordinary v1 packages. Converting a package creates a new revision, not a rewrite of existing saved runs.

The package schema changes to v2; the bank schema remains v1. Do not reinterpret the existing package `version: 1` as a mutable release counter—schema version and content revision are separate.

## 8. Implementation tasks

Each task below is a work package; break its steps into small edits. For every code change: write the specified regression, run it and confirm the expected failure, implement, rerun that target, then run affected neighboring tests. Expected failures describe future acceptance, not results already observed. No automatic commits.

### Task 1 — Capture package/world invariants in fixtures

**Files:** Extend `test/quest-package.test.mjs`; create fixtures under `test/fixtures/packages/self-contained-worlds/`.

1. Create small synthetic banks and two Quests with different calendars; clearly mark all invented claims as test data.
2. Include shared-bank and same-bank-ID/different-package variants, a no-companion Quest, and a module.
3. Add initially failing v2 pack/verify cases for missing bank/row, mismatched premise, orphan dependencies, and unsupported schema.
4. Keep existing v1 tests unchanged and passing.

**Run:** `node --test test/quest-package.test.mjs`.

### Task 2 — Implement pure package-bank validation and projection

**Files:** Create `js/quest-package.js`, `js/quest-package.test.js`, `scripts/validate-quest-package.mjs`; modify `js/quest-tile.js` and relevant tests for `predictionBankId` preservation.

1. Implement exact bank cross-reference validation using `validatePredictionsBank()` with known technology IDs.
2. Select the complete referenced bank; preserve row attribution/year/band.
3. Test unrelated bank exclusion, before/at/after year, deliberately shared calendars, and immutable inputs.
4. Provide a Node validation entry point the Python packer can call; do not duplicate bank semantic rules in Python.

**Run:** `node --test js/quest-package.test.js js/quest-tile.test.js js/companion.test.js`.

### Task 3 — Define release identity with golden vectors

**Files:** Create `js/package-identity.js`, `js/package-identity.test.js`; extend `scripts/quest-package.py` and `test/quest-package.test.mjs`.

1. Implement §3.5 byte descriptor and built-in hashing in Python/Node.
2. Golden tests cover shuffled input, Unicode, changed dates/scope/assets, same content/different ZIP timestamp, duplicate member names, and missing manifest-listed files.
3. Ensure identity excludes generated timestamp and includes all source dependencies.

**Run:** `node --test js/package-identity.test.js test/quest-package.test.mjs`.

### Task 4 — Extend pack, verify, inspect, and raw unpack

**Files:** `scripts/quest-package.py`, `test/quest-package.test.mjs`, `package.json`.

1. Dispatch v1/v2 verification explicitly; add the predictions directory only to v2.
2. Generate manifest indexes from files and cross-check `predictionBankId`/premise/row bindings.
3. Invoke the shared Node validator on pack **and verify**; dependency validation must not disappear under `--no-validate`.
4. Preserve v2 raw bytes on unpack; report delivery-root projection separately rather than rewriting hashed files.
5. Add hostile ZIP cases: traversal, absolute paths, symlink entries, duplicate names, excessive entry count and decompressed bytes. Set named archive limits from existing fixtures and document them; stream/check limits before full decompression, not after loading everything.

**Run:** `node --test test/quest-package.test.mjs`. Confirm a real synthetic archive packs, verifies, inspects, unpacks, and re-verifies without setting `FF_PREDICTIONS_FILE`.

### Task 5 — Implement immutable local release registry

**Files:** Create `js/server/quest-package-resolver.mjs` and `js/server/quest-package-resolver.test.js`; modify `scripts/sideload-local-package.sh`, `server.mjs`, and `js/quests-folder.mjs`.

1. Register verified raw package directories with a map keyed by package/revision; fail duplicate current Quest mappings.
2. Validate hashes before accepting content; make registry replacement atomic after full validation.
3. Adapt local sideload to register the package and derive asset/lesson URLs without a bank environment override.
4. Test two packages with identical internal bank IDs but different data on one server, plus ordinary default-world play.
5. Avoid arbitrary browser-provided filesystem paths or archive fetch URLs.

**Run:** new resolver tests plus `js/quests-folder.test.js`, `test/quest-package.test.mjs`.

### Task 6 — Build object-backed package resolution and catalog projection

**Files:** `js/server/quest-package-resolver.mjs`, `js/server/quest-object-storage.mjs` and tests; `js/quests-remote.mjs` and tests; `js/server/cloud-gate.mjs` and tests; `js/quest-lookup.js`, `js/quest-catalog.js` and tests.

1. Support legacy catalog entries and package-backed entries with explicit provenance.
2. Resolve package paths only inside the configured storage prefix/approved remote origin. Never fetch arbitrary URLs from grants or requests.
3. Verify file hashes/manifest identity, then validate semantics; cache immutable content by revision but perform authorization per request.
4. Keep public cards slim; authorized Quest responses expose only their resolved effective world, not all banks/Quests from a mixed-access package.
5. Test missing/tampered dependencies, identical IDs across releases, old-release retrieval, and denied access.

**Run:** `node --test js/server/quest-object-storage.test.js js/server/cloud-gate.test.js js/quests-remote.test.js js/quest-lookup.test.js js/quest-catalog.test.js` plus resolver tests.

### Task 7 — Add server-owned run bindings

**Files:** `js/server/quest-log.mjs`, `js/server/db.mjs`, new numbered migration under `js/server/db/`, `portal/server.mjs`, `portal/functions/player-routes.mjs`, their tests.

1. Add nullable package-reference columns to runs and route new official starts through access-aware resolution.
2. Persist the binding in the same transaction as run creation; refuse unresolved content before creating a playable bound run.
3. Keep update/save APIs from overwriting the binding. Check run owner and current entitlement for retrieval.
4. Preserve ordinary and legacy start behavior. Define the open/unsigned exact-reference path without requiring account creation.
5. Test another user's run ID, revision substitution, withdrawn Quest, new latest versus old run, and rollback on dependency failure.

**Run:** relevant quest-log/database tests and `node --test portal/functions/player-routes.test.js`; apply migration only to an explicitly authorized disposable test database.

### Task 8 — Centralize model-context authority

**Files:** Create `js/server/quest-world-context.mjs` and `js/server/quest-world-context.test.js`; modify `server.mjs`, `portal/server.mjs`, `js/server/fast-eval.mjs`, `js/server/co-invent-local.mjs`, `js/companion-context.js`.

1. Resolve package/run references before prompt construction; rebuild authoritative fields from the release.
2. Feed existing world-clock selectors the effective pool; include selected premise rows even when generic ranking would omit them.
3. Test forged bank dates, bank bodies, grant scope, pressure rules, and grounding in a request; none may alter official context.
4. Ensure the resolved inquiry reaches the general text payload as well as fast paths; assert final provider request content, not only input objects.
5. Preserve conditional evaluation and normal behavior outside package mode. No new model call is required for resolution.

**Run:** new context tests plus `js/server/fast-eval.test.js`, `js/companion-context.test.js`, `js/lean-coinvent-context.test.js` and existing general-text coverage discovered by tracing.

### Task 9 — Bind voice creation and updates

**Files:** `js/server/voice-session.mjs`, `js/server/voice-proxy.mjs`, `js/server/voice-prompt.mjs`, `js/voice-context.js`, `js/coinventor.js`, relevant tests.

1. Attach immutable package/run identity to the server voice session.
2. On each context message, retain/update allowed player fields and rebuild world fields through the same resolver.
3. Reject a client attempt to change the voice session's release or grants; require an explicit new run/session transition.
4. Fingerprint semantic world identity/year and player context. Test bank updates outside the run do not change its voice premise.

**Run:** `node --test js/server/voice-prompt.test.js js/voice-context.test.js js/coinventor-voice.test.js` plus voice session/proxy tests.

### Task 10 — Unify browser and multiplayer lifecycle

**Files:** `js/game.js`, `js/lean-coinvent-context.js`, `js/multiplayer/hotseat-bridge.js`, `js/multiplayer/room-bridge.js`, `js/sim/state.js`, `js/sim/mp-session.js`, `js/sim/actions.js`, relevant room tests.

1. Replace dual bank ownership with a run context supplied by resolved start/restore.
2. Pass one effective pool to bulletin, outcome, timing, co-inventor, and critic paths.
3. Test solo A → multiplayer B → ordinary Quest, room reconnect, hotseat handoff, Wait, and Quest switch. No old bank, premise, or private reflection may leak.
4. Room authority resolves the selected package once; members cannot send an alternative bank. Respect member access using existing room policy.
5. Preserve normal deep-link preview/start behavior and existing selection UX.

**Run:** `node --test js/multiplayer/*.test.js js/rooms/*.test.js js/sim/mp-session.test.js js/deep-link.test.js` plus relevant sim/action tests.

### Task 11 — Compact cache identity and reject stale responses

**Files:** `js/companion-context.js`, `js/hex/evaluate.js`, `js/hex/hex-workshop.js`, `js/hex/board-state.js`, associated tests.

1. Replace serialized-bank keys with compact semantic digests from §6.
2. Test identical IDs/changed content produce new keys; irrelevant display-only changes follow the documented semantic policy.
3. Cover late timing/score/pose/convergence replies after run switch or year change.
4. Assert no duplicate economy awards or costs during invalidation.
5. Serialize a representative large-bank/five-tile board and prove key size is constant with respect to bank size; bank contents must not repeat per tile.

**Run:** `node --test js/companion-context.test.js js/hex/*.test.js` and affected pressure/economy tests.

### Task 12 — Migrate Continue without substituting worlds

**Files:** `js/server/run-state.mjs`, `js/cloud/continue.js`, `js/game.js`, `portal/server.mjs`, `portal/functions/player-routes.mjs`, run-state and route tests.

1. Official v2 saves carry a compact reference that is checked against the server-owned run binding.
2. Resolve retained content on Continue; do not trust a client mission/bank snapshot over the release.
3. Keep a clearly labeled legacy reader for old valid snapshots; invalid/missing ones produce explicit errors, not fallthrough.
4. Test new publication, current access revocation, corrupted saved bank, absent release, local-import classification, Unicode byte size, and private reflection preservation.
5. Keep the current 400 KB limit; do not prune required context or enlarge the cap to hide duplication.

**Run:** `node --test js/server/run-state.test.js js/server/run-state.continue.test.js portal/functions/player-routes.test.js`.

### Task 13 — Publish complete releases safely

**Files:** Create `scripts/publish-quest-package.mjs`, `js/server/publish-quest-package.mjs`, `js/server/publish-quest-package.test.js`; add a `publish:quest-package` npm script. Reuse existing publisher/storage adapters; do not silently change loose-Quest publication semantics.

1. Verify/package-plan before reading credentials or making network calls. Implement offline dry-run with injected readers/writers.
2. Upload immutable objects, verify exact readbacks, then conditionally promote catalog.
3. Implement conflict/retry and failure reporting; prove old catalog survives failure at every stage.
4. Test idempotent retry, conflicting bytes under same revision, two concurrent publishers, access override semantics, and old-release retention.
5. Any publish-time access override must produce a newly verified content revision if it edits Quest bytes; do not mutate a hashed release in place.

**Run:** new publisher tests plus `node --test js/server/publish-quest.test.js js/server/quest-object-storage.test.js`. Staging adapter test is required before production use; no live publication without permission.

### Task 14 — Integrate hosted read paths and deployment tools

**Files:** `portal/functions/public-routes.mjs`, `portal/functions/cloud-api.mjs`, `portal/server.mjs`, route tests; approved adjacent warmersun scripts listed in §5.3 and their discovered test helpers.

1. Return the same gated package-backed Quest projection from Functions and legacy portal.
2. Update gated/stage/public package workflows so they retain world data and immutable source bytes.
3. Test mixed v1/v2 catalog, staged asset roots, lesson links, and package-bank isolation with mocked local storage.
4. Use existing no-publish/temp-root safeguards for cross-repo script tests. Never run a deploy script's live default in a test.
5. Declare hosted release complete only when both repositories' flows preserve all dependencies.

**Run:** `npm run check:portal-spa`, affected public/cloud route tests, and verified adjacent-repo script tests. Record exact commands after discovering their harness rather than guessing.

### Task 15 — Migrate examples and authoring guidance

**Files:** `docs/quest-package.md`, `docs/predictions-bank.md`, `skills/future-forge-companion/SKILL.md`, `skills/future-forge-quest/SKILL.md` and package references, `skills/future-forge-predictions/SKILL.md`, relevant companion fixture and new package source fixture.

1. Build one real testable v2 example using the existing dock fixture and bank, without changing its source claims or production default bank.
2. Remove the authoring requirement to combine unrelated Quest assumptions into one server bank; explain package-local worlds and exact revisions.
3. Document legacy side-loading as a developer/default-world feature, not the distribution requirement for assumed Quests.
4. Document source provenance versus fictional conditions, complete per-Quest calendars, failure recovery, and immutable saves.
5. Provide one downloadable/test artifact and exact local sideload command. Do not claim model quality from packaging tests.

**Run:** strict Quest validation, prediction validation, world validation, pack/verify, and existing economy checks for the worked Quest. Name justified warnings; do not weaken validators.

### Task 16 — End-to-end acceptance and handoff

**Files:** Create `docs/testing/self-contained-quest-packages.md`; extend existing integration fixtures/harnesses; update `package.json` explicit syntax/test lists.

1. Execute §9; distinguish deterministic mocks from real browser/provider results.
2. Run a local server with two v2 packages and a deliberately unrelated default predictions bank. Play/preview both without restarting or changing that bank.
3. Exercise save/Continue and room transitions with actual UI/network payloads. Inspect voice creation/update payloads when voice is available.
4. Run `npm run test`, new package publisher dry-run, v1/v2 pack verification, and `git diff --check`.
5. Record actual results, incomplete acceptance rows, artifact paths, migration instructions, rollback, and cross-repo status. Do not claim complete if hosted dependencies are still discarded by deployment tooling.

## 9. Release acceptance matrix

| Case | Required result |
|---|---|
| One v2 package | Starts with no matching process-global bank. |
| Two unrelated packages | Both play on one server; same internal bank IDs do not collide. |
| Different calendars | Separate banks isolate their rows, even within the same archive. |
| Deliberately shared bank | Both Quests use that complete calendar; grants still have separate scopes. |
| Background forecast | Explicitly included; retains attribution and ordinary due/not-yet behavior. |
| Assumed due capability | Accepted inside scope; does not become real-world verification. |
| Missing/changed dependency | Verify/start fails before play/model call; no default substitution. |
| Publish failure | Old catalog remains usable; no partial release becomes latest. |
| Concurrent publishers | No lost catalog entries; conditional-write conflict handled honestly. |
| Client-forged world | Official provider payload uses server-resolved content. |
| Voice context forgery | Update cannot replace the pinned world. |
| Gated package with open member | Open response cannot reveal other gated Quests or their world data. |
| New revision | New runs get it; old runs keep their exact release. |
| Revoked authorization | Continue follows current access policy without exposing gated content. |
| Local import | Can play under existing local authorization, never impersonates official/sponsored content. |
| Solo → room → ordinary | Correct world and private-state reset on every transition. |
| Save-size regression | Compact keys; UTF-8 size bounded; no per-tile bank duplication. |
| Raw bytes / delivery roots | Same release resolves correctly locally and hosted without corrupting hashes. |
| Legacy v1 | Existing ordinary package works; assumed legacy mode explicitly identified. |
| Invalid legacy snapshot | Preserved for recovery; no silent resume under a new bank. |
| Package rollback | Catalog points to a retained verified revision; no object mutation. |
| Existing deep links | Quest ID still opens expected preview/start flow; no player bank picker. |

## 10. Delivery order and completion gate

**Vertical slice:** Tasks 1–5, then the minimum Tasks 8/10/11/12 needed to play and resume one local v2 package end-to-end. This is a demonstrable local milestone, not hosted release completion.

**Hosted release:** Tasks 6–9 and 13–14, with ownership/access and publication-failure tests. Do not postpone authority resolution until after exposing multi-package model requests.

**Finish:** Tasks 15–16 and all release acceptance cases. Keep old content readable throughout migration. Do not auto-delete releases, silently rebind existing runs, publish, or commit as part of following this document.

The implementation handoff should state: what works locally, what works through deployed-style routes, what was browser-tested, what was model-tested, which cross-repo changes remain, and whether migrations/publication have actually been performed.
