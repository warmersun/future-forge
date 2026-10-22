# Play the breakthrough: source-connected gameplay implementation plan

> **For Grok CLI:** Use the subagent-driven-development skill to implement this plan task-by-task after approval. Do not commit, publish, or change access policy without separate authorization.

**Goal:** Let the player assume a source-linked claim about emerging-technology progress is true, then invent a solution to a big problem in a fictional scenario under that premise.

**Architecture:** Build on the existing side-loaded predictions bank and binding world clock. Link the optional companion's scenario premise to selected bank rows, add only the scenario-specific scope/constraints and problem connection, and carry this through workshop, co-inventor, timing, crisis scoring, critics, and persistence. Do not build a second capability calendar or duplicate forecast dates, attribution, or technology tags in the companion.

**Tech Stack:** Existing browser JavaScript modules, Node.js servers, JSON Quest documents, HTML/CSS, and `node:test`. No additional dependency, publisher platform, analytics service, model endpoint, or simulation engine is required.

**Status:** Design and review only. Proposed field names, limits, and behavior below are not implemented or approved schema changes. This document does not authorize editing the user's work in progress.

**Revised direction:** This revision supersedes the earlier emphasis on testing whether the source's argument holds. The primary activity is **inventing within its implications**. Questioning the premise is optional reflection, not a prerequisite, critic objective, or win condition. A bounded hypothetical capability can be granted for this Quest without being asserted as real-world fact.

---

## 1. Baseline and review scope

This plan builds on the uncommitted implementation inspected on branch `main`. That implementation already has `js/companion.js`, a source stage, workshop attribution, public catalog projection, share-link changes, AI `sourceConstraint` propagation, companion validation/lint, and a developer-only Moonshots fixture. Preserve those changes; do not replace them with the earlier strategy document's pre-implementation assumptions.

Read together with [the strategy](play-the-breakthrough-strategy.md), [the current companion authoring reference](../skills/future-forge-quest/references/companion.md), and [the Quest schema](quest-tile-schema.md).

The separate detailed implementation-plan file mentioned by the user was not identified in the repository or the searched local Cursor plans. The review therefore treats the actual diff and current companion reference as the implementation baseline, not a guessed copy of that plan.

### Verification performed for the original review

- `npm run test`: **1,652 tests; 1,650 passed; 0 failed; 2 skipped**. Syntax checks passed as part of that command.
- Direct Node probes of the worked fixture: validation succeeds; `sourceConstraintText()` returns 500 characters, omits the claim, and truncates the invitation.
- A synthetic article variant with no optional quote/interpretation confirms `stageCopy()` does not expose its required claim.
- Direct invocation of `sanitizeMissionStub()` confirms it strips both companion and grounding even when supplied.
- Direct invocation of `CoInventor.prototype._buildRequestContext()` confirms the main panel drops `sourceConstraint` while retaining `grounding`. Changing only source limits also leaves `buildVoiceInstructions()`, `inventStateSnapshot()`, and `voiceContextFingerprint()` identical. These independent-review findings were reproduced during final review.
- Source tracing covers the workshop, lean/general AI payloads, fast evaluation, challenger creation/answering, board caches, cloud Continue, and outcome rendering.

These checks establish structural behavior, not the quality of live AI judgements. No hosted login/payment journey, browser playthrough, live model evaluation, source transcript verification, deployment, or publication was performed for this review. The quoted episode details below are taken from the user's fixture, not independently reverified journalism.

### Additional verification for this revision

Inspected `docs/predictions-bank.md`, `js/predictions-bank.mjs`, `js/sim/world-foresight.js`, and `js/server/fast-eval.mjs`. Ran `node --test js/predictions-bank.test.js js/sim/world-foresight.test.js js/server/fast-eval.test.js`: **62 passed, no failures or skips**. These tests verify the existing foundation, not the proposed Quest binding or hypothetical gameplay. No application code or prediction data was changed for this plan revision.

### What to keep

1. Optional companion on a normal Quest; no new Quest kind or catalog destination.
2. Clear independence/co-production disclosure and source links.
3. Separate source credit and `sponsorName`; funding must not alter scoring.
4. Evidence status and limits that distinguish opinion/prediction from capability.
5. The opening stage. The user likes it; do not spend this iteration redesigning entry.
6. Existing board, pressures, critics, and player-led invention. Ordinary grounding/timing behavior stays unchanged outside an explicit scenario grant; hypothetical Quests require the bounded timing exception specified below.

### Review findings

| Priority | Finding and evidence | Consequence | Required response |
|---|---|---|---|
| High | `js/coinventor.js:1241–1277` explicitly rebuilds request context but omits `sourceConstraint`. The context supplied by `game.js` therefore does not reach normal panel chat or its voice updates. | The most visible co-inventor interaction misses even the source safeguards already implemented. | Fix and test `_buildRequestContext()` itself, then trace the result to server consumers. Adding another field only at the game-level caller is insufficient. |
| High | `js/server/voice-prompt.mjs:330–371,379–466` omits source context from both the invent-state tool snapshot and voice instructions; `js/voice-context.js:291–313` omits it from the update fingerprint. | Even after panel transport is fixed, voice does not receive or refresh source-specific boundaries. | Update instructions, snapshot, and fingerprint together. Voice's omission of capability grounding is a pre-existing parity gap that also needs resolution for this experience; do not mislabel it as a new regression. |
| High | `js/companion.js:493–511` never adds `claim` to `sourceConstraintText()`. The fixed rule tail consumes most of its 500-character allowance. The fixture's invitation ends at “This night shif…”. | An evaluator receives warnings about a source without receiving the actual argument it should help the player explore. | Separate bounded source data from invariant prompt rules. Preserve complete claim, focus, limits, and relevant question. Do not merely increase the old concatenated string cap. |
| High, design | `js/hex/hex-workshop.js:2258–2355` scores existing pressures; `:3044–3140` selects an ordinary critic and poses its question. The added companion instructions primarily prohibit misinterpretation; they do not define an accepted scenario premise or its consequences for invention. | A polished opening can lead to interchangeable gameplay, or critics can dispute the very capability the Quest invited the player to assume. | Author the bounded premise, its remaining constraints, and its connection to the problem. Critics test the proposed solution under that premise. |
| High, content | `test/fixtures/quests/companion-moonshots-304.json:55–64` cites both “AGI is here” and diffusion/build-out; `:77–98` fixes the dock's cause as build-out. Its grounding also says forecasts are opinions until a shift can run them. | The distinction between a granted fictional condition and a real-world claim is unclear. Running a dock cannot establish AGI. | Make the premise operational and explicitly granted in this Quest; label the dock as fictional and remove the invalid AGI inference. Substantiate real-world assertions, but do not demand proof of an openly hypothetical grant. |
| Medium | `js/game.js:8385–8417` renders a type chip, source name, and podcast link, but not the question/claim/connection. Article links are absent from that workshop strip. | The player cannot readily recover why this particular puzzle follows this particular piece. | Add a compact question/connection surface and accessible source details for every supported medium. |
| Medium | `js/companion.js:428–485` does not return `claim`; `js/game.js:5842–5906` cannot render it. Quote and interpretation are optional. | A valid article companion can omit its substantive source claim from the opening entirely. | Show the attributed claim when no quote is supplied; keep source wording and our interpretation distinct. |
| Medium, conditional | `slimMissionForContinue()` at `js/game.js:3885–3907` omits companion/grounding; `sanitizeMissionStub()` at `js/server/run-state.mjs:66–93` strips them. `resolveContinueMission()` at `js/game.js:4001–4020` can use that stub if the full catalog mission is unavailable. | Some resumed runs silently become source-free. This is a fallback-path defect, not a claim that every Continue loses metadata. | Restore a complete authorized mission or a validated run snapshot; never silently resume a companion as an ordinary Quest. |
| Medium, design | `renderOutcome()` at `js/game.js:17736` and `paintOutcomePathway()` at `:5128` explain game results and the invention, not what the player learned about the source. | No useful contribution returns to the original conversation. “You won” is not an answer to the piece. | Add an optional, player-authored source takeaway on every outcome, with preview/copy and a return-to-source link. |

Line numbers are navigation aids for the reviewed working tree. Locate symbols again before editing.

**Working path, not a defect:** Hex evaluations receive the current source string through `hex-workshop` → `apiCoInvent` → the lean-context wrapper → fast payloads. Its absence from individual hex call sites is not evidence of missing transport. The defects are missing source substance, the panel allowlist, and the separate voice consumers.

**Fallback boundary:** Local scoring and challenge generation in `js/server/co-invent-local.mjs` are mostly heuristic/canned; the new source excerpt appears in its generic conversational branch, not a semantic source judge. Preserve honest fallback labeling and deterministic authored questions. Do not claim a heuristic evaluated the speaker's argument.

## 2. The central design decision

### Existing prediction side-loading is the foundation

See [Predictions bank](predictions-bank.md). This is implemented behavior, not new work to recreate:

| Existing component | Reuse in this plan |
|---|---|
| `FF_PREDICTIONS_FILE` and `loadPredictionsBank()` in `js/predictions-bank.mjs` | Load an authored bank from a local file or URL. A side-load replaces the default; it does not merge. Preserve the loader and its fallback behavior for ordinary games. |
| `future-forge.predictions/v1` and `validatePredictionsBank()` | Reuse row IDs, years, kinds, technology/theme tags, claim bands, and attribution. Current supported years are 2024–2040; do not change this range as part of the plan. |
| `worldClockForYear(year, { pool, ... })` | Reuse due/not-yet selection and the explicit pool argument to evaluate a pinned run without changing process-global state. |
| `worldClockContext()` and timing prompts in `js/server/fast-eval.mjs` | Extend this existing context path, rather than introducing a competing availability engine. Today due rows count as demonstrated in the game; explicit grounding contradictions still win. |
| `foresightForYear()` and `foresightForStack()` | Feed the same pinned bank to year bulletins and outcomes so the visible world and the evaluated world agree. |
| `/api/predictions` and browser `setWorldForesightBank()` | Keep startup bank delivery; add a validated Quest/run binding, not arbitrary per-Quest URL fetching. |

**The missing work is the connection, not prediction storage:** bind the Quest to the correct bank and rows; define what accepting those rows means in its fictional setting; make critics/scoring respect the premise; preserve it through Continue and asynchronous evaluation; visibly distinguish scenario availability from real-world verification.

**Important current gaps:** the bank is process-global; `worldClockContext()` does not yet accept a run-specific pool; local timing ignores the bank; source/grounding prompt rules can contradict an explicitly accepted forecast; and ordinary world-clock context is intentionally absent from critic/pathway/convergence modes. Extend those paths narrowly. A prediction's `due` status also does not itself guarantee green—the existing timing prompt only prevents a harsher-than-yellow judgement for timing alone. The new assumed-premise mode must permit green for a genuinely covered mechanism, while retaining all other checks.

For the first slice, configure a matching side-loaded bank using the existing operator workflow. A Quest names its required bank ID and selected row IDs. Resolve and pin that already-loaded bank at run creation. Do not switch the server-global bank to serve an individual Quest, fetch player-supplied URLs, or build a multi-bank hosting platform in this iteration. A mismatched/missing bank or unresolved row produces a clear unavailable/retry state rather than silently running the Quest under the loader's fallback default.

### The play contract

**Assume the premise. Invent within its implications.** The source changes what is possible in the scenario; the problem and its remaining constraints make that possibility consequential. Playing along does not require believing the premise is true in the real world.

The user's formulation is the organizing experience:

> Assuming X about the progress of emTechs is true (said by so-and-so on the whatever podcast/blog), how would you solve a big problem in this fictive scenario?

Participant benefit: **Go beyond following technological progress. Explore what it could make possible by inventing solutions to consequential problems.** Source-linked invitation: **You've heard the idea. Now invent with its implications.**

The smallest useful loop is:

**Attributed claim → explicit scenario premise → consequential problem → invention → challenge under the premise → revision → insight into what this progress could make possible.**

Do this inside the current game. Do not add a comprehension quiz before inventing, a compulsory opinion poll, a new evidence currency, a “source truth” meter, a claim graph, or a parallel debate minigame.

Three approaches were considered:

- **More source UI and fuller AI context only:** fixes visibility and data loss, but does not make the source consequential. Necessary, insufficient.
- **One fixed scenario premise, connected pressures, and existing critics:** makes the existing actions practice invention under the assumed progress. **Recommended, including premise-aware timing and evaluation.**
- **Paired simulated worlds with player-switchable assumptions and new scoring:** potentially useful later, but doubles state/evaluation semantics before the basic experience has been tested. Defer the switching/comparison machinery, not the ability to grant a premise in one Quest.

### Three tests for every authored companion

**Implication test:** If X were unavailable or materially weaker, what meaningful possibility or design choice would change? If the answer is only a byline, the premise is decorative. This is an authoring check, not a demand that the player use a prescribed technology.

**Premise-respect test:** Can the player rely on exactly what the Quest grants without being challenged to prove it or being marked too early merely because today's real world lacks it?

**Open-invention test:** Can multiple mechanisms solve the problem under the same premise? A player need not endorse the source, cite its wording, or use the granted capability if another valid approach works. Rejecting X verbally does not remove X from the shared scenario or replace doing the invention.

Learning success and game success are different. A partial/collapsed run can produce a valuable insight. A win does not verify a source, prediction, deployment, or scientific claim.

## 3. Worked redesign: Night shift at Kiln Ferry

This is a proposed revision of the existing fixture, not a new verified interpretation of the episode.

### 3.1 Specify what this Quest grants

The fixture attributes two assertions to the guest:

1. AGI has already been achieved.
2. Deployment is held back by missing build-out rather than weak models.

A parcel-dock puzzle cannot establish either assertion as a real-world fact. It can take the capability-versus-deployment idea as a premise and give it a playable interpretation:

> For this Quest, assume an AI can reliably inspect visible parcel damage and produce workable sorting instructions across this dock's ordinary parcel mix. That capability is available in the scenario from its starting year. Power, physical handling, staffing, and responsibility are not solved for you. How would you get the night's parcels ready for the morning truck?

This operationalization is **Future Forge's scenario assumption inspired by the source**, not a quote, a universal definition of AGI, or a factual report about an existing product. Keep the original attributed claim and this operational premise visibly distinct. If a broader AGI Quest is desired, author its actual granted abilities and limits rather than treating the label as unlimited magic.

The player is not asked to diagnose whether models are already capable enough. Here, the defined capability is granted; the invention addresses what it takes to put that capability to useful work. Power is one possible constraint, not the whole meaning of diffusion.

### 3.2 Keep the brief a human problem

Use the established brief order: **Your job / The place / What's strained**. Keep the outcome in the job; no capability lecture or prescribed technology in it.

Suggested job:

> Get the night's parcels ready for the morning truck without leaving the crew to absorb unsafe work or uncheckable decisions.

The fictional setting includes two workers, an unreliable circuit, and access to the granted AI capability. Capability is not the mystery to solve. The unsolved job is getting it—or another viable mechanism—to work within the dock's physical and organizational constraints. It is legitimate to stipulate build-out as a scenario constraint; it is not legitimate to report winning that scenario as proof that build-out is the real world's only bottleneck.

The source connection belongs beside the workshop and in its details, not as a lecture inserted into the story:

> The episode argues that deployment is lagging capability. Assume the defined AI capability is available here. What would you invent so it actually helps this shift?

### 3.3 Make the existing pressures express the decision

Keep three crisis roles. Change descriptions/criteria, not the meter engine.

| Existing role | Local meaning | What improvement must explain | What earns no credit by itself |
|---|---|---|---|
| `local` | Parcels ready for the truck. | How the mechanism gets parcels inspected, moved, and ready through the shift using the capabilities available in this scenario. | Repeating that the AI is capable without a usable workflow. |
| `global` | Reliable operation beyond the demonstration. | How the approach handles its real deployment dependencies: power, integration, equipment, or a different arrangement of the work. | Saying “build infrastructure” or “use AGI” without explaining the dependency. |
| `support` | A workable responsibility split for the crew. | Who handles cases outside the granted scope, physical interruptions, and remaining work; whether that workload is feasible. | Adding “human in the loop” without explaining who does the work, or requiring people to redo every correctly granted check for no scenario reason. |

Do not hard-code “all three must use AI.” A credible simpler workflow may solve the problem without using the grant. The player may identify additional capability needs outside its scope, but neither player nor critic must disprove the granted ability to proceed.

### 3.4 Allow different inventions under the same premise

These are review examples, not answer choices shown before play:

- **Fixed station:** Use the granted inspection/instruction capability at one station with a workable energy arrangement and human physical handling.
- **Reorganized flow:** Sequence inspection and belt movement so the circuit can support them, with an explicit dispatch and exception workflow.
- **Different combination:** Combine the AI with a separately feasible handling technology, or design a simpler process that needs less automation. Explain that additional technology's capability and costs; the AI grant does not grant capable robots too.

Each can receive appropriate game credit. The evaluator accepts the granted AI ability, assesses the actual mechanism and remaining constraints, and checks additional capabilities normally. It must not require the player to downgrade a granted routine capability into a pilot merely to satisfy the real-world clock.

### 3.5 Make every possible critic probe that same issue

The engine can choose among `nature`, `moloch`, `ethicist`, and `stakeholder`. Author a relevant challenge for each rather than hoping a random angle happens to fit.

| Critic | Authored question | Connection to the source |
|---|---|---|
| Mother Nature | “The feeder cannot run the belt and the demo together. How does your shift still get parcels ready?” | Tests physical deployment requirements without claiming stronger models solve them. |
| Moloch | “The vendor gets paid for a successful demo, while the crew pays for failures. What changes that incentive in your approach?” | Tests whether diffusion is blocked by incentives rather than only hardware. |
| Ethicist | “The system correctly flags a parcel, but the dispatch deadline creates pressure to ship it anyway. Who makes that decision, and whose interests does your design protect?” | Tests responsibility and incentives left unresolved by capable inspection without denying the granted capability. |
| Stakeholder | “The pilot worked once. Who can keep your arrangement staffed, maintained, and funded through ordinary shifts?” | Tests the transition from one demonstration to repeatable operation. |

The co-inventor adapts the selected question to the actual pathway. If the player has already removed the dependency, the critic should recognize that and probe the remaining tradeoff; it must not pretend the invention still uses a discarded tool. Critics cannot say the granted inspection ability does not exist or secretly add failures inconsistent with its defined reliability. They can test bad inputs, out-of-scope parcels, loss of power, human decisions, and other ungranted dependencies.

### 3.6 Show what revision changes

Illustrative sequence:

1. Player writes a mechanism that assumes the camera and belt run continuously.
2. `global` relief is limited because the mechanism does not address the stated circuit conflict. The reason names that dependency.
3. The critic asks how the shift operates when those demands coincide.
4. The player revises the pathway to remove, sequence, or independently supply the conflicting demand and explains handling outside the grant's inspection scope.
5. The same criteria are reevaluated. Relief changes only if the revised mechanism warrants it; the source connection explains why the issue mattered.
6. Outcome invites: “With that AI capability available, what did your invention make possible, and which constraint mattered most?”

Do not promise these exact scores or simulate them as if a model already returned them. They are acceptance scenarios for implementation and playtesting.

A useful final contribution could be:

> Assuming this inspection capability is available, I would separate inspection from belt movement and use the AI's instructions to coordinate the handoff. The useful invention was the workflow around the capability, not a better model. Power and responsibility still mattered.

That is a possible player interpretation, not text the application should silently put in their mouth.

## 4. Different source moves, the same play loop

Use the current `move` values rather than introducing a parallel taxonomy.

| Move | What becomes playable | Challenge emphasis | Honest takeaway |
|---|---|---|---|
| `milestone` | Grant the reported capability at a defined scope, retaining its real-world evidence status. | What application the player can make work and what deployment dependencies remain. | “This capability could enable my approach if these surrounding conditions hold.” |
| `trend` | Grant a specified level of cost, performance, or availability at a stated scenario year. | How the changed threshold alters a design while other resources remain constrained. | “At this assumed level, this approach becomes worth trying.” |
| `idea` | Grant the explicitly selected enabling mechanism or condition; leave the solution to invent. | Whether the player's application has a coherent causal chain beyond the granted part. | “If that mechanism works as assumed, this is what I would do with it.” |
| `opinion` | Operationalize the view as an explicit condition of the fictional world. | The consequences and tradeoffs of the player's solution within that world—not whether the author deserves agreement. | “Taking that view as the premise, my invention makes this possible.” |
| `prediction` | Grant the specified future capability from its authored effective year. | Whether the invention uses that capability within scope and handles the remaining constraints. | “If that forecast holds, here is an opportunity and a dependency I can now see.” |

**Prediction rule:** Use the existing bank as the calendar. In an assumed-premise Quest, selected rows are explicitly accepted within their stated scenario scope when their bank `year` is due. Do not copy the year into a second grant calendar. Before that year, the row remains `not_yet`; start the showcase when its premise is due. After it is due, an invention cannot be marked too early solely for using that covered capability. Other capabilities still use the pinned bank and ordinary grounding. Show “Feasible under this Quest's assumptions,” never “This prediction is now verified.” This behavior is required in this iteration, not deferred.

**No belief test:** Accepting the premise is a convention of play, not personal endorsement. Optional reflection may ask what changes if X is false, but ordinary critics must not retract X mid-run. Comparative worlds and player toggles remain out of scope.

**Normative rule:** Some opinions are about values, not a capability proposition. Only make a Quest when the opinion creates a concrete design tradeoff. Do not force every essay into a technology puzzle.

## 5. Proposed authoring contract

### 5.1 Extend, do not replace, `companion`

Retain existing fields and add optional `companion.exploration`. Older companion documents remain valid and retain their current behavior plus the claim/context bug fixes. A newly authored fully source-connected companion should include exploration; a strict authoring lint should report its absence, but runtime validation should not invalidate legacy documents.

Proposed structure:

```json
{
  "exploration": {
    "version": 1,
    "focus": "Take useful AI capability as available, then invent around the remaining deployment constraints.",
    "bridge": "Inspired by the source's capability-versus-diffusion claim, this fictional dock grants inspection and sorting instructions but leaves physical operation and organization to invent.",
    "premise": {
      "mode": "assumed",
      "bankId": "companion-dock-test",
      "statement": "For this Quest, assume capable AI inspection and sorting instructions are already available at this dock.",
      "grants": [
        {
          "predictionId": "dock-inspection-2026",
          "scope": "Illuminated, visible parcels at this dock, with powered cameras and compute; inspection and instructions, not physical handling.",
          "limits": "Does not inspect concealed contents, move parcels, provide power, staff the shift, or settle responsibility for dispatch decisions."
        }
      ]
    },
    "pressureLinks": {
      "global": {
        "connection": "The source's diffusion argument becomes a question about repeatable operation.",
        "criterion": "Explain how the approach runs through the shift despite its infrastructure or workflow dependencies; a better demo alone does not establish this."
      }
    },
    "challenges": {
      "nature": {
        "connection": "Physical deployment requirements may remain after a useful demonstration.",
        "question": "The feeder cannot run the belt and the demo together. How does your shift still get parcels ready?"
      },
      "moloch": {
        "connection": "Misaligned incentives can block diffusion even when equipment works.",
        "question": "The vendor gets paid for a successful demo, while the crew pays for failures. What changes that incentive in your approach?"
      },
      "ethicist": {
        "connection": "Deployment redistributes responsibility for uncertain decisions.",
        "question": "The system correctly flags a parcel, but the dispatch deadline creates pressure to ship it anyway. Who makes that decision, and whose interests does your design protect?"
      },
      "stakeholder": {
        "connection": "Routine operation needs an organization, not just a demonstration.",
        "question": "The pilot worked once. Who can keep your arrangement staffed, maintained, and funded through ordinary shifts?"
      }
    },
    "reflectionPrompt": "With that AI capability available, what did your invention make possible, and which constraint mattered most?"
  }
}
```

This is a proposed example. It does not assert that the episode supplied the fictional feeder circuit, vendor contract, or parcel workflow. `bridge` must identify adaptation, not falsely attribute the scenario to the source.

`companion-dock-test` and `dock-inspection-2026` above are **proposed synthetic test-fixture identifiers**, not existing banks or attributed forecasts. Task 12 creates a matching `future-forge.predictions/v1` fixture with that bank ID and row ID, `year: 2026`, `kind: "prediction"`, `techIds: ["ai"]`, `claimBand: "now"`, and a detail that explicitly labels the reliable inspection/instruction ability as a fictional test assumption. Do not attribute that invented precision to the podcast guest or publish the test bank as research. For a real source-linked Quest, use a researched bank row, and distinguish any editorial operationalization in `bridge`/`scope` from what the source actually said.

The resolved bank row owns the capability statement, year, technology tags, claim band, and attribution. `scope` narrows its application; it must not introduce a stronger capability or an earlier date. If the intended premise differs materially, author a clearly labeled row through the existing predictions-bank workflow rather than silently changing its meaning in the Quest. Keep `evidence.status`, `reviewed`, `limits`, and any original forecast `horizon` unchanged as source metadata. `premise.mode` distinguishes how the Quest uses that material: `assumed` accepts the selected due rows as conditions of play; `evidence-grounded` retains ordinary evaluation without an override. New exploration objects must select a mode explicitly. Legacy companions without exploration keep the existing world-clock behavior and receive no new per-Quest override.

### 5.2 Proposed limits and validation

| Field | Proposed rule |
|---|---|
| `exploration.version` | Exactly integer `1`; reject unknown versions if the object is supplied. |
| `focus` | Required nonempty string, at most 280 characters. Identifies the selected part of the existing claim, not a new unattributed assertion. |
| `bridge` | Required nonempty string, at most 500 characters. Explains scenario correspondence and scope boundary. |
| `premise.mode` | Required `assumed` or `evidence-grounded`. Never infer it from evidence status, source fame, or the player's text. |
| `premise.bankId` | Required for `assumed`, at most 80 characters; identifies the configured bank. Validate exact identity against a successfully loaded bank at start; no path, URL, or loading instruction. Omit for `evidence-grounded`. |
| `premise.statement` | Required nonempty string, at most 500 characters. The player-facing “For this Quest, assume…” proposition. |
| `premise.grants` | Required array. For `assumed`, one to three entries; for `evidence-grounded`, empty. Each grant is a bounded operational condition, not a complete solution. |
| Grant `predictionId` | Required exact existing row ID, unique within `grants`; at most the existing bank ID cap of 80 characters. Do not normalize malformed identifiers into valid references. Cross-document validation must resolve every reference. |
| Resolved year / capability / tags / attribution | Read from the pinned validated bank, never duplicated as authorable fields in the companion. Use existing 2024–2040 validation. The core premise must be due during the playable years; start the showcase at/after its row year. Do not derive activation from free-text source horizons. |
| Grant `scope` / `limits` | Required nonempty strings, at most 500 / 500 characters. Define the local application and what is not supplied. These refine the referenced row, not override its year or invent extra capabilities. |
| `pressureLinks` | Required plain object with one to three entries, keys only `local`, `global`, `support`. At least one genuine connection is required; do not fabricate three. |
| Each pressure link | `connection` at most 280 characters; `criterion` at most 400; both required. No numerical deltas or answer keys. |
| `challenges` | Required plain object with exactly the four existing critic keys. Each entry has required `connection` at most 280 and `question` at most 400. |
| `reflectionPrompt` | Required nonempty string, at most 400 characters. Invites an opportunity, consequence, or remaining constraint revealed by invention—not a verdict on the source. |

Use explicit fixed-key construction. Reject arrays, wrong types, unexpected role/angle keys, overlong required values, and missing entries. Do not repair a malformed key or silently truncate authored content into a different claim. Do not change existing limits on unrelated companion fields.

Structural validation cannot determine fidelity, plausibility, or viewpoint fairness. The authoring checklist must review those separately. Cross-check that linked pressure criteria agree with the mission's actual descriptions; a conflict is an authoring defect, not permission for the evaluator to invent a resolution.

Grant scope must be reviewable. Reject an authoring proposal that merely says “AGI can do anything,” “all technology is ready,” or “the problem is solved.” If a scope boundary is contradictory or ambiguous, repair the authored Quest rather than asking players to negotiate changing rules during play. Source claims and arbitrary player text cannot create grants; only the normalized Quest premise does.

### 5.3 Projection and distribution

- Preserve exploration through `validateQuestTile()`, `normalizedTile`, `mission`, `catalogRecordFromValidated()`, `normalizeMission()`, `cloneMission()`, authorized full-record storage, and `.ffquest` packaging.
- **Do not add exploration to `publicCompanionSlice()` in this iteration.** Its challenge/criterion content belongs to the full Quest. Keep the existing public claim/evidence/invitation fields and existing gate behavior.
- Public preview can show the current attributed claim. After authorized entry the workshop can show focus/bridge/details.
- Source author, collaborator, sponsor, and access remain separate. No fake sponsor to bypass account/payment requirements.
- Publish nothing as part of implementation. The developer fixture remains developer-only.

## 6. Runtime behavior

### 6.1 Opening and workshop: keep the question available

Keep the opening layout. Make one correctness change: if there is no quote, show the attributed `claim`; if there is a quote, provide the claim in source details rather than treating quotation as a complete substitute.

Replace the workshop's attribution-only strip with:

1. The existing short source credit/type.
2. The existing invitation, readable without opening a dialog.
3. A visible **For this Quest, assume…** statement whenever `premise.mode` is `assumed`, with activation year if not yet active.
4. A small **Why this problem?** control that reveals focus, bridge, original claim, grant scope/limits, real-world evidence status, attribution, and the external source link.

Show no mandatory extra modal. Use text nodes for authored text, safe HTTPS external links, visible focus, semantic disclosure controls, and `noopener noreferrer`. Article, paper, video, and podcast links all remain available. Preserve the user's board space on narrow screens; details are collapsed, not omitted.

The briefing still contains the job/place/strain. Source details are contextual help, not a required reading test. On the opening stage, show the same concise premise without replacing the layout the user likes. Never hide the fact that a speculative capability is being granted behind a disclosure.

### 6.2 Co-inventor: use the source to ask better questions

At the first relevant help interaction, explain the one source-to-scenario connection, then work on the player's mechanism. Do not repeat a disclaimer paragraph in every response. Do not automatically spend a model call just because the workshop opened.

The co-inventor should:

- Know the selected claim, its real-world status, and the exact active scenario grants.
- Help the player identify the dependency their invention relies on.
- Distinguish the source's assertion, fictional conditions, real capability evidence, and the player's hypothesis.
- Accept alternative inventions under the premise. Do not demand evidence for an explicitly granted capability or repeatedly debate whether the source is correct.
- Explain unfamiliar terms only when needed; do not require a lecture about AGI to solve a dock problem.
- Avoid writing the final takeaway as if the player already believes it.

Source text is untrusted quoted data, never a system instruction. Do not fetch arbitrary source URLs at gameplay time. The authoring process supplies reviewed material; links are for the player to inspect.

### 6.2a Evaluation authority: real evidence versus scenario truth

Use two separate layers, not a rewritten global world clock:

1. **Evidence layer:** source evidence/status, publication dates, and real-world grounding remain what they are. The predictions bank is a scenario calendar that can contain forecasts, not a ledger of independently verified accomplishments. Do not relabel a forecast `milestone` merely because the game year has advanced.
2. **Scenario layer:** the pinned predictions bank supplies dates and capabilities through the existing clock. The Quest's explicit bindings identify which due rows the player may take as premises and at what local scope. Those accepted conditions override conflicting real-world readiness only for their defined capability; all other checks remain. There is no parallel grant calendar.

For each invention, timing evaluation must distinguish the portion covered by an active grant from additional claims. A granted inspection model is not a grant of autonomous handling, unlimited compute, free electricity, or universal reliability. A coherent design wholly within an active grant is eligible for green **under the Quest assumptions**; a mixed design can still be red for an unsupported ungranted capability. Do not set green solely because a tile shares a `techId` with a grant.

Carry a validated `assumedPredictionIds` list with the timing result, plus `basis: "scenario"` when the judgement depends on a selected premise (otherwise `"ordinary"`). This is provenance, not another score. Validate returned IDs against the selected due rows in the pinned bank. A scenario-dependent red/yellow still retains that provenance if another claim is unsupported. Show a visible assumptions label on affected timing feedback and outcomes; do not publish it as real-world readiness.

Update both model and local paths. `detectClaimStretch()` (`js/data.js:1422`) currently flags frontier language before considering a scenario. `localTileTiming()` and `runTileTiming()` (`js/hex/hex-workshop.js:2376,2494`) use it for seeds and fallbacks. A prompt-only fix would still reject the premise through those paths. For assumed Quests where the local heuristic cannot determine grant coverage, return an explicitly provisional yellow result explaining that scenario-aware checking is unavailable; do not assert the premise is impossible or auto-certify the entire invention. Preserve the existing numeric mapping and normal resource rules; expose retry when a model becomes available. The no-model limitation must be disclosed, not hidden as semantic assessment.

The model must accept a selected due premise even where the original grounding says that capability is not yet available in reality. Reconcile `GROUNDING_LINE`, `ASSESS_GROUNDING_LINE`, `SOURCE_CONSTRAINT_LINE`, and `WORLD_CLOCK_TIMING_LINE`, plus text/voice equivalents, with this narrow precedence rule; otherwise their current instructions can veto it. Keep ordinary-game precedence unchanged. A real-world limitation outside the selected premise remains binding. No model may broaden a premise or mint one from a player's request.

Use the existing `worldClockForYear()` to determine due/not-yet. Its ranked, limited result can omit an authored premise row, especially with many competing rows or small voice budgets. Explicitly include all selected premise rows in the bounded scenario context, preserving their due/not-yet status, even when they miss the general clock's relevance cut. Their inclusion is not a change to their date or status.

### 6.3 Pressures: causal relevance, not agreement

`score-pathway` receives authored pressure links alongside the existing crisis-role descriptions. Those links clarify why a criterion matters; they do not create a new score dimension or change numeric deltas.

For a linked role, the ordinary reason should identify the mechanism or missing dependency. The UI can display the authored connection next to that reason under **Why this matters here**. The model need not manufacture a second source-analysis field.

Keep capability timing separate from pressure fit. `assess-feasibility` receives the active grants and follows §6.2a; it must not penalize an invention for failing to mention the source or solving the problem without the highlighted technology. Convergence remains about reciprocal technological enabling under the scenario's capabilities—not agreement, topical similarity, or an automatic grant bonus.

An off-topic invention gets little relief because it does not address the local problem's actual pressures. It must not fail merely because it lacks source keywords.

### 6.4 Critics: one connected challenge, not an extra hurdle

Reuse existing summon, AP cost, critic angle, pose, dock, answer, and re-evaluation behavior.

- Select the normal critic angle as today.
- Obtain its authored question/connection from exploration.
- Pass these to `pose-challenge` along with the actual pathway.
- Ask the model to adapt the authored tension to the actual mechanism while preserving the critic angle and accepting all active grants. The question tests an ungranted dependency, consequence, or tradeoff, not the truth of X.
- Store the source question/connection snapshot on the concern tile when it is created.
- `judge-challenge`, coach, draft, and later pathway re-scoring use that same snapshot, not a new randomly reinterpreted claim.
- If the pathway changes, retain the original critic question and judge the revision against it. Do not let the model move the goalposts.
- If AI pose fails or is unavailable, use the authored question plus its connection as a deterministic fallback. Do not substitute a generic mayor/clinic/UN speech for a parcel-dock problem.

The answer can already be embodied in the pathway, explained in the challenge answer, or both. Respect the existing docked-versus-undocked scoring rules. No extra companion challenge count and no new compulsory writing field.

### 6.5 Outcome: return something worthwhile to the source conversation

For companions, add a compact **Back to the idea** section on win, partial, collapse, and other supported end states:

- The attributed original claim, scenario premise, and source link.
- The existing invention summary, or an honest “No invention recorded yet.”
- One optional text area using `reflectionPrompt`.
- A reminder that this was a fictional exploration, not source verification.
- **Preview response**, **Copy response**, and **Open source** actions. Copy occurs only after a user click; opening the source never posts anything.

The response template contains the Quest/source reference, a clearly conditional “Assuming…” premise, the actual invention summary, and the player's own reflection. Preserve the conditional label even with a blank reflection so copied results cannot imply the grant is established reality. Do not auto-fill “I learned…” from game scores or generate an endorsement. Include the Quest link only when the existing share helper can produce a valid origin; do not invent a fallback host.

Leaving this field blank must not block finishing, continuing, rewards, or another Quest. Keep drafts on re-render and save them through the appropriate run-state path. Do not add public discussion hosting or post to X, YouTube, or a blog automatically.

## 7. Context and state contracts

### 7.1 Replace the overloaded AI string with structured data

Create proposed browser-safe `js/companion-context.js` with explicit exports:

- `buildSourceInquiry(companion, options)` — returns a mode-specific bounded object or `null`.
- `sanitizeSourceInquiry(raw, options)` — same fixed-key contract at server boundaries.
- `sourceInquiryKey(companion, validatedBank, year)` — canonical serialization of normalized semantic fields, bank contents, and current year/status; no crypto dependency required.
- `resolveScenarioPremise(companion, validatedBank, year)` — resolves the exact bank/row references, uses existing world-clock selection/status logic, and attaches bounded local scope/limits. Returns an explicit missing/mismatched-bank error rather than inventing a capability. Do not implement a second calendar or infer semantic coverage from a matching technology ID.

Use existing `sourceConstraint` temporarily for compatibility/safety rules, revising its blanket “capability truth is grounding and the world clock” language to respect explicit scenario grants. Stop relying on it as the carrier of claim content. Put invariant behavioral rules in shared prompt constants, not at the expense of the authored text budget.

Full coaching projection contains `move`, attributed source identity, `claim`, `evidence`, `invitation`, `focus`, `bridge`, and the resolved `premise` with bank identity, selected rows, their statuses, and scope/limits. The server derives these from the validated pinned bank and run year rather than trusting an arbitrary client list of “due” IDs. Do not send an entire bank to every AI call. Mode-specific additions:

| Mode/path | Additional source data | Excluded purpose |
|---|---|---|
| `idea-sparks`, ordinary co-invent chat | Relevant pressure connections/criteria. | Do not force a single solution or first-person conclusion. |
| `pose-challenge` | Only the selected angle's authored question and connection. | No source-author impersonation; no unrelated angle substitution. |
| `judge-challenge`, coach, draft | Concern's stored source-question snapshot plus current pathway. | No changing the question after the player's answer. |
| `score-pathway` | Pressure links and snapshots for the concerns actually being scored. | No “agreement” score or new multiplier. |
| `assess-feasibility` | Active grants with complete capability/scope/limits, their years, and separate real-world grounding; no pressure criteria. | Do not reject covered capabilities merely because real-world timing differs; do not grant anything outside scope. |
| `evaluate-convergence` | Active grants and boundaries needed to judge reciprocal enabling. | No pressure rubric or automatic bonus from citing X. |
| Contribution/additivity judge | No exploration rubric; preserve the narrow before/after-text job. | No widening its job into premise assessment. |
| Voice | Coaching projection of the same source data. | Voice must not receive weaker factual boundaries than text. |

Do not pass transcripts, whole articles, or all critic definitions to every call. Bound each field using the authored contract; do not arbitrarily `slice()` the final serialized object. Missing exploration falls back to complete base claim/evidence context, not invented exploration content.

Integrate both lean and general callers. Server-local and portal routes must use the same resolver/prompt helper rather than copying a new contract into two independent implementations. Check the voice session builder separately; a browser context property alone does not prove the realtime model receives it.

### 7.2 Preserve the challenge that was actually posed

Proposed concern-tile field:

```json
{
  "sourceInquiry": {
    "key": "canonical semantic key",
    "focus": "selected claim focus",
    "connection": "why this critic question follows the source",
    "question": "the authored question used when posing this critic"
  }
}
```

Existing `challengeSpeech`, `challengeQuestion`, `posedFingerprints`, `posedHowText`, and `playerAnswer` remain the record of the actual interaction. The source snapshot supplements them; it does not replace them. Validate and deep-copy the nested object through board cloning, wire serialization, Continue, and any multiplayer action that carries the concern. Reject unknown angle/key injection.

### 7.3 Cache and async correctness

Source rubric and active premise are evaluation inputs. A different grant, activation year, scope, or limit cannot reuse a settled result merely because the invention text is unchanged. Include these in timing keys as well as pathway/critic keys; the current `tileTimingCacheKey()` at `js/hex/evaluate.js:1558` has only tile/year/text/technology.

Pin the companion and predictions bank for the duration of a run. Add a separate `sourceInquiryKey` to board evaluation context, analogous to `rulesWeatherKey`, rather than changing invention IDs or reusing the policy-rules field. Include canonical bank contents (or a stable fingerprint of those contents), not just `bank.id`: a file can change without changing its ID. Include resolved premise rows/scope and current year/status. An operator refresh changes new runs, not a pinned active run.

When a new run or explicit restored-content migration changes the key:

1. Cancel outstanding affected timing/score/pose/convergence work.
2. Mark affected timing, pathway scores, and convergence results stale and reassess under the new key. Do not apply an extra convergence multiplier during refresh.
3. Preserve invention text and player answers.
4. Reject late responses captured with the old key.
5. Do not refund/re-award pathway income or replay resource costs merely because a score was invalidated.

Ordinary movement that leaves content/rubric unchanged must retain current cache behavior. Include key tests for same source/different grant, same claim/different criterion, crossing a grant's activation year on Wait, and changes irrelevant to scoring such as display-only source title formatting. A plain year change must not silently lose the pinned premise.

### 7.4 Continue and run persistence

Preserve a validated companion snapshot, the effective predictions bank snapshot, assumption-dependent timing provenance, and the optional reflection draft in private run state. Validate bank snapshots with `validatePredictionsBank()` and the existing technology IDs. Keep the existing run-state byte cap: test the serialized size before starting/saving, and report an oversized scenario bank rather than raising the cap or truncating away rows. Use small curated banks for the first slice. Do not add private reflection to public leaderboard payloads or the slim last-run summary. Public display/export of a scenario-dependent result must carry its conditional basis; if an existing surface cannot display it, withhold that publication action for assumed runs rather than publish a misleading ordinary-readiness result. This does not require a new leaderboard system.

Pass the pinned bank as the existing `pool` option to calendar, outcome, and world-clock selectors. Extend `worldClockContext()` to use the validated run pool when supplied, falling back to process-global behavior only for ordinary/unbound runs. Never temporarily call `setWorldForesightBank()` around one request: concurrent users would leak timelines into one another. Pin the same bank for room/simulation bulletins and voice; do not let those read a refreshed global bank while timing reads an older snapshot. Treat client-provided bank data as untrusted: resolve new-run bindings server-side, and validate restored snapshots within the existing authorized run flow.

For known catalog Quests, resolve the authorized full mission before resuming. If unavailable, a snapshot may preserve context but is **not** proof of entitlement. Keep existing access enforcement. Do not use stored `access: open` to override a current server gate.

For fallback restoration:

- Extend the mission snapshot deliberately with companion, required access metadata for parsing, and bounded capability context needed for the resumed run.
- Reuse companion validation, and keep the existing `RUN_STATE_MAX_BYTES` limit. Do not raise it to make this feature fit.
- If a legacy snapshot has no companion and the full mission cannot be loaded, do not claim a source-connected resume. Show an actionable unavailable/retry message rather than silently inventing missing context.
- Restore the original source contract and grants for the run; recompute which grants are active at the restored year. Do not silently mix a revised published premise with old timing scores or challenge answers.
- A new run clears prior reflection and concern state. Re-render, partial continuation, and refresh do not overwrite the current draft.
- Multiplayer may share the source context and concern snapshot, but each player's private reflection is not broadcast. Do not add a shared opinion field to room state.

## 8. Implementation tasks

Each task is a work package with explicit red/green steps. Implement in order; keep commits optional and only on explicit user request. New names below are proposals, not claims that these files/functions already exist. Tasks 3–4 and 9–10 include the existing predictions-bank integration; do not treat it as a later enhancement or implement the superseded standalone grant calendar.

### Task 1 — Capture the current defects in regression tests

**Files:** Modify `js/companion.test.js`, `js/server/run-state.test.js`, `js/server/fast-eval.test.js`, `js/sim/world-foresight.test.js`; create `js/companion-context.test.js` when Task 3 begins.

1. Add a valid non-podcast fixture without quote/interpretation; assert its stage data includes the attributed claim.
2. Add a worked-fixture test requiring the entire claim and invitation in the new source context; do not require either to fit in the old string.
3. Add a Continue round-trip test that currently demonstrates companion stripping.
4. Add regressions for the same invention under a selected due premise, a not-yet row, and no premise; for a missing/mismatched bank; and for an authored row omitted by ordinary clock ranking. Run these plus `node --test js/companion.test.js js/server/run-state.test.js` and record the expected failures. Tests must distinguish current clock behavior from the proposed conditional-mode behavior.
5. Do not weaken tests to match existing omissions. Land each implementation with its corresponding regression turning green.

### Task 2 — Add optional exploration parsing and pipeline preservation

**Files:** Modify `js/companion.js`, `js/quest-tile.js`, `js/quest-lint.js`, `js/game.js` (`normalizeMission`), `js/sim/state.js`; tests in `js/companion.test.js`, `js/quest-tile.test.js`, `js/quest-lint.test.js`, `js/quest-catalog.test.js`, `js/server/cloud-gate.test.js`.

1. Write table-driven cases for every required exploration field, premise mode, bank/row reference, unsupported version, wrong type, unknown critic/role, and boundary length. Test duplicate and malformed references without silently repairing them.
2. Add a pure `parseExploration()` helper; call only when `companion.exploration` is supplied. Explicitly copy known keys.
3. Preserve it in all normalized/full projections; retain old behavior for no companion and legacy companion. Parsing validates shape; the resolved-bank check in Task 3 validates exact references and playable years. Neither check fetches arbitrary URLs.
4. Add lint for missing exploration on a companion and clear diagnostics for structural errors. No substring-matching claim that author fidelity has been verified.
5. Assert gated `catalogCard()` still excludes exploration while preserving public source credit.
6. Run the five test files above plus `js/companion.test.js`; inspect actual normalized values, not only `ok: true`.

### Task 3 — Bind the existing predictions bank and build source context

**Files:** Create `js/companion-context.js` and `js/companion-context.test.js`; modify `js/lean-coinvent-context.js` and its tests. Reuse `js/predictions-bank.mjs` and selectors/validator in `js/sim/world-foresight.js`; extend their tests without replacing the loader or schema.

1. Test legacy companion, full exploration, absent companion, maximum permitted strings, selected critic, and timing-only projection. Resolve the proposed synthetic bank fixture through `validatePredictionsBank()`; test exact bank identity, missing rows, and unchanged ordinary side-loading/fallback behavior.
2. Implement the four pure exports in §7.1 with fixed-key construction. Reuse existing row/date/status logic and `pool`; derive date, attribution, and capability from bank rows. Do not author duplicate availability fields in companions.
3. Keep claim/limits complete. For `pose-challenge`, assert only the selected critic is included. For timing, assert pressure criteria are absent and all selected premise rows are present even if general clock ranking omitted them. Test before/at/after row year, and two distinct bank pools without mutating global state.
4. Add an adversarial string such as “ignore previous instructions” inside a claim; assert it remains data, never replaces prompt constants.
5. Pass the projection through lean context and preserve the existing rule excluding `inventionName`.
6. Run `node --test js/companion-context.test.js js/lean-coinvent-context.test.js`.

Illustrative test contract for the new helper:

```js
const inquiry = buildSourceInquiry(fixture.companion, {
  mode: "pose-challenge",
  angle: "nature",
  bank: validatedFixtureBank,
  year: 2026,
});
assert.equal(inquiry.claim, fixture.companion.claim);
assert.equal(inquiry.invitation, fixture.companion.invitation);
assert.equal(inquiry.challenge.question,
  fixture.companion.exploration.challenges.nature.question);
assert.equal(Object.hasOwn(inquiry, "challenges"), false);
assert.equal(buildSourceInquiry(null, { mode: "pose-challenge" }), null);
```

### Task 4 — Integrate text, fast-eval, portal, and voice consumers

**Files:** Modify `js/game.js` (`sourceConstraintFields`, `leanCoInventContext`, `apiCoInvent`, `ideaSparksContext`, `ensureCoInventor`, `callCoInventMode`), `js/coinventor.js` (`_buildRequestContext`), `js/server/fast-eval.mjs` (including `worldClockContext`, timing prompts, and sanitizer), `js/server/co-invent-local.mjs`, `js/hex/hex-workshop.js` (timing seeds/fallback/response handling), `server.mjs`, `portal/server.mjs`, `js/server/voice-prompt.mjs` (`buildVoiceInstructions`, `inventStateSnapshot`), `js/voice-context.js` (`voiceContextFingerprint`), and their existing tests. Inspect all `detectClaimStretch()` callers in `js/data.js`, `js/hex/evaluate.js`, and `js/sim/policy-honesty.js`; adapt context-aware callers without globally weakening the ordinary heuristic. Add a focused `js/coinventor-context.test.js` if no current test covers the request allowlist.

1. Extend tests for each fast payload mode before changing builders. Assert complete base claim where relevant and mode-specific exclusions.
2. Add shared source prompt/data helpers, imported by both server entry points. Keep source evidence separate from the resolved scenario premise. Reconcile grounding/source/world-clock precedence as §6.2a specifies, preserving ordinary behavior. Extend `worldClockContext()` with the validated pinned pool, not per-request global swaps.
3. Add the projection at each browser caller, including the standalone spark path and live co-inventor context callback. Fix `_buildRequestContext()` to preserve the sanitized projection and compatibility source field. Test the actual prototype method, not just its input callback; ordinary panel chat and voice share this filter.
4. Wire general text and fast paths; do not stop at browser request JSON. Update timing result sanitization and rendering to preserve validated `assumedPredictionIds`/`basis`. Trace the local seed, unavailable-model fallback, and later server response so a heuristic cannot overwrite accepted scenario timing. Test scope overreach, a coherent covered design, a not-yet row, and ordinary-mode regression. Unknown/forged IDs must not mint grants.
5. Add source data, resolved premise, and matching precedence rules to `buildVoiceInstructions()` and `inventStateSnapshot()`; add these semantic inputs to `voiceContextFingerprint()`. Include bounded grounding and pin the same bank as text. Test source-only, bank-content-only, scope-only, year/status, and grounding changes in instructions/snapshot/fingerprint. Preserve pending-metric handling and existing voice tools.
6. Run `node --test js/lean-coinvent-context.test.js js/server/fast-eval.test.js js/voice-context.test.js js/coinventor-voice.test.js` plus the voice/server tests discovered during this trace.
7. Add new module files to syntax checks and explicit test lists in `package.json`.

### Task 5 — Fix claim visibility and add workshop context

**Files:** Modify `js/companion.js` (`stageCopy`), `js/game.js` (`openCompanionStage`, `paintWorkshopCompanion`), `index.html`, `css/styles.css`; create a small `js/companion-ui.js`/test module if needed to avoid adding more untestable rendering logic to `game.js`.

1. Implement the claim fallback regression from Task 1.
2. Render invitation and visible “For this Quest, assume…” premise, plus accessible details for scope/limits, bank-row date, source attribution, and evidence status; include private exploration only after full Quest access. Keep the existing opening layout.
3. Show an external source link for all supported media with a fitting label. Do not label a video “Read the piece.”
4. Test HTML-like authored text as inert text, missing optional byline fields, empty states, and repeat render cleanup.
5. Browser-check keyboard opening/closing, narrow viewport, ordinary Quest with no companion, and no unwanted workshop-entry AI call. Verify year bulletins, timing labels, and outcome cards describe the same pinned calendar and retain prediction labels after a row becomes due.

### Task 6 — Connect criteria to existing crisis scoring

**Files:** Modify `js/server/fast-eval.mjs` (`buildScorePathwayPayload`, `SCORE_PATHWAY_SYSTEM`), `js/hex/hex-workshop.js` (`runPathwayScore` and crisis-detail rendering); tests in `js/server/fast-eval.test.js` and relevant hex tests.

1. Test that pressure links use canonical roles rather than translated meter labels.
2. Include authored linked criteria alongside existing crisis descriptions and the bounded resolved premise. Accept the selected due capabilities; assess the invention's mechanism and remaining constraints.
3. Prompt for ordinary causal reasons: mechanism → dependency handled/not handled → relief. Preserve numeric delta semantics and current output schema.
4. Surface authored connection beside the returned reason without labeling it model evidence.
5. Assert timing/convergence builders do not inherit the pressure rubric.
6. Test valid alternative designs, including low-tech solutions, and no keyword-based source agreement rule. Explicitly test that existing world-clock/grounding language cannot make pathway scoring deny an accepted premise. Prompt/payload tests establish wiring; live rubric evaluation remains Task 13.

### Task 7 — Make critic generation and fallback source-specific

**Files:** Modify `js/hex/hex-workshop.js` (`summon` flow near the current `pickAngle`, `localPose`, and concern enrichment), `js/challenge-pose.js`, `js/server/co-invent-local.mjs`, `js/server/fast-eval.mjs`; tests in `js/challenge-pose.test.js`, `js/server/fast-eval.test.js`, `js/hex/board-state.test.js`.

1. Test all four angles against authored source questions, including model-unavailable fallback.
2. Resolve the authored question before calling AI; add a bounded source snapshot to the created concern.
3. Keep existing angle selection, summon costs, count, and board placement.
4. Tell AI to adapt to the actual pathway and acknowledge dependencies already removed. Require acceptance of the premise: probe an ungranted dependency, consequence, or tradeoff, not whether X is real. Store the actual returned question as today.
5. Fallback uses the authored connection/question verbatim; legacy companions/non-companions retain ordinary fallback.
6. Test that a fallback question remains answerable and source-connected without any model response.

### Task 8 — Preserve the same question through answer, coaching, and re-score

**Files:** Modify `js/hex/hex-workshop.js` (`submitConcernAnswer`, `dockedConcernScoreOpts`, coach/draft calls), `js/hex/board-state.js` (clone/wire/concern construction), `js/server/fast-eval.mjs` (judge/coach/draft/score projections); tests in their existing test files.

1. Create a concern, change the live companion object or global bank, and assert the concern still references its original source question and pinned scenario. Recompute due/not-yet against the run's current year without rewriting the question.
2. Pass that snapshot to judging, coaching, drafting, and re-scoring with the current pathway and original posed text.
3. Deep-clone/sanitize nested source snapshots; test board clone, wire, and Continue round-trips.
4. Verify undocked answers, already-addressed objections, changed invention text, and unchanged answers preserve existing lamp rules.
5. Keep response shapes and challenge costs unchanged; do not add an extra judge call.

### Task 9 — Guard caches and late responses

**Files:** Modify `js/hex/evaluate.js` near `syncRulesWeather`/`applyPathwayPressure` and `tileTimingCacheKey`, `js/hex/board-state.js`, `js/hex/hex-workshop.js` (timing/pathway/convergence jobs and cancellation), and associated tests.

1. Add a separate source-context key with an empty default for ordinary Quests.
2. Test that changing a criterion, selected row, scope, or same-ID bank contents invalidates affected timing/pathway/convergence results; identical normalized data does not. Wait must recompute row status. Global refresh must not alter a pinned run.
3. Preserve all fields through cloning/wire persistence. Do not add a key that cloning silently drops.
4. Capture the key when starting asynchronous work and reject a response from the previous key.
5. Test quest switching while timing/pose/score/convergence is pending, late responses, changed rubric on restore, and concurrently evaluated runs with different pinned banks.
6. Assert invalidation does not duplicate economic rewards or summon charges. Run hex and relevant `js/sim/pressure.test.js`/economy tests.

### Task 10 — Repair Continue and pin run context

**Files:** Modify `js/game.js` (`cloudRunStatePayload`, `slimMissionForContinue`, `resolveContinueMission`, `continueCloudRun`, `applyRestoredPlay`, calendar/outcome selectors), `js/cloud/continue.js`, `js/server/run-state.mjs`; trace `js/sim/state.js`, `js/sim/mp-session.js`, and `js/sim/actions.js` for room bank persistence and bulletins. Tests in `js/server/run-state.test.js`, `js/server/run-state.continue.test.js`, and existing sim/foresight tests.

1. Implement the failing round-trip test from Task 1 using a full companion mission.
2. Add a validated run snapshot for companion, effective predictions bank, capability context, timing provenance, and optional reflection; retain size caps and inline-data stripping. Reject oversized banks before play rather than silently losing rows or raising limits. Pin from the server-loaded bank at new-run creation; Continue uses the authorized stored snapshot.
3. Preserve or recheck access through the existing catalog/lookup/gate path before launch. A local snapshot does not grant access.
4. Define and test exact restore precedence: authorized mission establishes access; validated pinned run snapshot establishes the premise/calendar/question used by existing answers. New bound runs with missing/mismatched banks or loader fallback cannot start under a substitute timeline; legacy runs fetch missing context or show retry/unavailable. A restored valid pinned bank need not match a newly refreshed global bank.
5. Test fresh run reset, partial continuation, absent catalog, gated full body, malformed snapshot, and corrected published source with an older active run.
6. Test multiplayer serializes shared source/calendar context without serializing private reflection. Feed the same pinned pool into year bulletins, outcome foresight, text/voice, and timing; never mutate the process-global bank for one room or request.

### Task 11 — Add the optional source takeaway and explicit copy flow

**Files:** Create `js/companion-reflection.js` and `js/companion-reflection.test.js`; modify `js/game.js` (`renderOutcome`, start/reset/restore hooks), `index.html`, `css/styles.css`, and run-state sanitization from Task 10.

1. Build a pure response formatter from source attribution, explicit conditional premise, actual pathway summary, and player reflection. No inferred belief, source-truth label, or fabricated invention. An empty reflection still retains “Assuming…” when copying a scenario-based result.
2. Test blank reflection, no invention, partial/collapse, Unicode, malicious markup, unavailable share origin, and missing source URL.
3. Bind draft input once; preserve it on render/partial continuation. Clear on a genuinely new run.
4. Render preview; copy only on explicit click. Clipboard failure must preserve selectable text.
5. External source link opens the original; no automatic publication or tracking parameters.
6. Verify no new AP cost/model request and no gating of ordinary outcome actions.

### Task 12 — Revise the worked fixture and authoring instructions

**Files:** Modify `test/fixtures/quests/companion-moonshots-304.json`, `skills/future-forge-quest/references/companion.md`, `skills/future-forge-quest/references/schema.md`, `skills/future-forge-quest/references/output-contract.md`, `skills/future-forge-quest/SKILL.md`, `docs/quest-tile-schema.md`, `docs/future-forge.md`, and `docs/predictions-bank.md`. Create `test/fixtures/predictions/companion-dock-test.json` (proposed path, standard v1 bank). Link the existing `skills/future-forge-predictions/` authoring workflow rather than duplicating it. Extend `scripts/companion-sheet.mjs` if useful without implying partnership.

1. Rewrite the fixture using §3; explicitly grant the scenario capability instead of asking the player to establish it. Remove the AGI-from-a-shift inference.
2. Create the synthetic bank described in §5 and link the fixture by exact bank/row IDs. Add exploration metadata, with a genuine premise-to-problem connection for every critic and at least one pressure. Do not modify the default production bank.
3. Keep actual evidence in grounding and original claims attributed. Label fictional conditions and editorial interpretations. For a public version, research a genuine forecast row using the existing authoring workflow; do not attribute the synthetic test ability to a real speaker or demand real-world proof of an explicitly hypothetical condition.
4. Add authoring checks: faithful source attribution, implication test, premise-respect test, open-invention test, bounded scope, critiques that accept X, and a conditional takeaway. Document the existing side-load command and the new Quest binding; no new loader or schema version is required.
5. Add synthetic test-only companions for the other move types. Label them test data, not real discoveries or published forecasts.
6. Run `npm run validate:quest -- test/fixtures/quests/companion-moonshots-304.json` and `npm run validate:predictions -- test/fixtures/predictions/companion-dock-test.json`, then cross-document reference tests and companion/schema/lint/package tests. The Quest validator's positional argument and optional `--strict` were verified in `scripts/validate-quest.mjs`. Review warnings; do not change unrelated validators or year limits to suppress them.

### Task 13 — Verify behavior, not just field presence

**Files:** Create `docs/testing/companion-gameplay-acceptance.md`; extend tests/harnesses established in prior tasks. Do not introduce a browser dependency without checking existing tools first.

1. Run the deterministic acceptance matrix in §9, using mock/stub model responses only for transport/state assertions; label them as mocks.
2. Perform browser playthroughs with the existing side-loaded synthetic bank, the developer fixture, and a synthetic article. Capture the visible premise, calendar, one critic accepting X, revised feedback, and conditional outcome response. Include missing-bank startup, reload/Continue, Wait across a row year, and no-model fallback.
3. If an authorized model configuration is available, evaluate the paired examples in §9 through actual local and deployed-provider paths as applicable, with bounded calls. Record provider/mode/input/output and human judgement. Do not print credentials or call a paid provider merely because one is configured without respecting the project's usage setup.
4. Verify voice against the actual session payload; if voice is unavailable, record that acceptance row as not executed, not passed.
5. Run `npm run test` and `git diff --check`. Record actual counts; do not predict them from this review's baseline.
6. No publication and no claim of validated demand/learning efficacy. Handoff includes implemented behavior, tests, screenshots/log locations, and remaining unverified cases.

## 9. Acceptance matrix and model-quality checks

| Case | Required observation |
|---|---|
| Ordinary Quest | No companion UI/state/context; same costs, scoring, entry, and outcome behavior. |
| Legacy companion | Complete attributed claim available; no invented exploration rubric; no newly invalid file. |
| Article without quote | Claim is visible at entry and recoverable during play; valid source link exists. |
| Worked opinion fixture | Player can identify what is assumed, what problem remains, and what the invention makes possible; no demand to establish AGI. |
| Unsupported deployment assumption | Feedback names the missing dependency rather than generic “use more AI.” |
| Mechanism revision | Re-score follows the revised mechanism; old question remains stable. |
| Open invention | Multiple concrete solutions can receive credit. No personal agreement test; the fixed scenario premise remains in force. |
| Agreeable handwaving | Repeating the author's claim does not earn relief without a mechanism. |
| Low-tech approach | No rejection merely for avoiding the highlighted technology; ordinary feasibility and pressure rules apply. |
| Prediction due under assumed premise | Referenced bank row is available within scope from its existing year. A coherent covered mechanism can be green; no real-world verification claim. |
| Prediction not yet due | Uses the bank's `not_yet` status; free-text horizon, player assertion, and source fame cannot activate it early. |
| Missing/mismatched bank or row | Explicit unavailable/retry state for a new bound run; no silent default substitution. Ordinary loader fallback still works as before. |
| Scope overreach | Granted inspection does not grant autonomous handling, power, or unlimited reliability; additional claims face normal checks. |
| Grounding conflict | Accepted due premise wins only within its authored scope in assumed mode; ordinary-mode precedence is unchanged. |
| Ranked-out premise | Text, voice, and evaluators still receive selected rows even when generic world-clock ranking omits them. |
| Every critic angle | Tests the actual invention's ungranted dependencies, consequences, or tradeoffs without retracting X. |
| Model unavailable | Authored question survives; uncertain assumption coverage is explicitly provisional, not “X is impossible” or automatic green. |
| Continue | Pinned bank, source contract, posed questions, answers, timing basis, and reflection survive; access remains enforced. |
| Changed source/rubric | Timing/pathway/convergence keys reflect semantic changes; old responses cannot overwrite new results or duplicate rewards. |
| Global bank refresh/concurrent runs | Active runs retain their pinned banks; two contexts never leak timelines through global mutation. |
| Calendar/foresight parity | Bulletins, outcomes, multiplayer, text, voice, and timing use the same run bank; due predictions retain forecast provenance. |
| Win/partial/collapse | Takeaway is optional and distinct from game result; no “source verified” badge. |
| Copy/return | User previews their own words with an explicit “Assuming…” premise, copies explicitly, and returns to the source; no automatic posting. |
| Privacy/gating | Public projection omits exploration/private reflection; restoring a snapshot does not bypass entitlement. |
| Voice | Spoken help receives the same pinned bank, accepted premise, scope, and evidence boundary as text. |
| Narrow viewport/keyboard | Question remains available; disclosure and outcome actions are usable without obstructing the board. |

### Paired live-model review set

For the same source/scenario, compare:

1. A design that parrots “build-out is missing” but supplies no mechanism.
2. A design that handles a concrete deployment dependency.
3. A different workable solution, including a low-tech option, under the same accepted premise.
4. A design relying exactly on the selected due capability, despite its speculative real-world status; compare the same design without an assumed premise and with the row not yet due.
5. A revised design that has already eliminated the critic's original dependency.
6. A concrete but source-unrelated idea that fails the scenario's actual pressures.
7. A design that overextends the inspection premise to unsupported physical automation, so scope boundaries—not disbelief in X—must constrain it.

Human review asks: Did the model accept exactly the selected due premise? Did it retain the distinction between scenario truth and real evidence? Did it assess the mechanism and remaining constraints, acknowledge existing mitigation, permit alternative solutions, and help the next revision? Do not grade by matching a scripted sentence or requiring a predetermined numeric score.

If live model outputs are poor, revise prompt/contract/content before adding another score or question. Passing JSON tests alone is not proof that the companion teaches anything.

## 10. Scope limits and delivery order

**First vertical slice:** one bank loaded through existing `FF_PREDICTIONS_FILE`, one revised Quest bound to its rows, a visible assumed premise, premise-respecting timing/critics/criteria, and a conditional outcome response. Follow through all the way to the takeaway before adding more sources. No second prediction subsystem.

**Release requirements:** persistence/access safety, cache/async correctness, supported text/voice paths, backward compatibility, and end-to-end acceptance. A good screenshot at entry is not enough.

**Deferred:** multiple competing worldviews in one Quest, player-controlled assumption-switching, a multi-bank hosting/selection platform, automatic article/transcript ingestion, publisher dashboards, new public commentary storage, source truth scores, new billing arrangements, new analytics, and marketing publication. Bank reuse, run pinning, and evaluating a fixed assumed premise are not deferred.

The product promise for this iteration is concrete: **“Assume this technological progress is real. What would you invent to solve this big problem?”** The payoff is seeing an opportunity, dependency, or consequence through invention—not validating the speaker's claim. Whether people want that repeatedly remains a product/market hypothesis, not a result of implementing this plan.
