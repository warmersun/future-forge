# Companion gameplay acceptance

Recorded 22 Oct 2026. This is a check of the first source-connected slice. It is not a claim that the quest teaches, and it is not a publication.

The slice is one side-loaded predictions bank, the developer quest `companion-moonshots-304`, a visible assumed premise, premise-respecting timing and critic text, and the outcome note **Back to the idea**.

## Commands

`npm run test` on 22 Oct 2026: **1,707 tests, 1,705 passed, 0 failed, 2 skipped**. Syntax checks passed as part of that command. Duration about 18 seconds.

`git diff --check` exited 0.

Browser checks used headless Chrome against two local game servers. Port 8765 was left alone.

| Server | Port | Predictions bank |
|---|---|---|
| `FF_DEVELOPER=1`, `FF_CLOUD_AI=0`, rooms and usage off, remote catalogs off | 8891 | `test/fixtures/predictions/companion-dock-test.json` (log: Synthetic dock test bank, 2 rows) |
| Same flags, no `FF_PREDICTIONS_FILE` | 8893 | `predictions/default.json` (log: 72 rows) |

Both servers logged a configured co-inventor session. These checks did not send a co-invent call.

## Acceptance matrix

| Case | Result |
|---|---|
| Ordinary Quest | Browser. `?q=spotlight-gene-seq-border-clinic-2026` opened the workshop. The companion stage stayed inactive. `#ws-companion` stayed hidden. No `/api/co-invent` request. |
| Legacy companion | Tests. A companion without `exploration` still validates. Lint warns `companion_exploration_missing` and does not reject the file. |
| Article without quote | Tests only. `stageCopy` exposes the claim, and `test/fixtures/companions/synthetic-moves.json` includes an article milestone with no quote. That file is not a playable quest, so it was not opened in the browser. |
| Worked opinion fixture | Browser on 8891, `?q=companion-moonshots-304`. The stage shows the invitation, the quote, the speaker, **Listen at 44:58**, and the assume line beginning **For this Quest, assume**. The claim is in **Why this problem?**, not beside the quote. Play reaches the workshop with the same assume line and **From Moonshots with Peter Diamandis**. |
| Unsupported deployment assumption | Not executed as a live model judgement. Prompt text is covered by `PATHWAY_PREMISE_LINE` in the score-pathway system suffix. |
| Mechanism revision | Not executed in the browser. Concern snapshots and source keys are covered by unit tests. |
| Open invention | Not executed as a live score. The pathway suffix says a low-tech solution is allowed and source keywords are not required. |
| Agreeable handwaving | Not executed as a live score. The fixture criterion says naming the AI is not relief. |
| Low-tech approach | Same as open invention. Not a live score. |
| Prediction due under assumed premise | Browser year dialog at 2026: kicker `World clock · Year 2026 · Synthetic dock test bank`. The list shows the fictional inspection row as a **Prediction**. The line under the dialog still says predictions are forecasts, not free unlocks. Tests keep a green timing result when the due grant id is named, and drop a forged id. |
| Prediction not yet due | Tests. At year 2025 the inspection grant is `not_yet`, and a scenario basis with that id is stored as ordinary. The browser run ended before 2032. |
| Missing or mismatched bank | Browser on 8893. Play shows the toast **This server does not have the predictions bank this Quest needs.** The stage stays up. The workshop does not open. |
| Scope overreach | Tests. Forged grant ids are dropped. The fixture limits say power, handling, staffing, and responsibility are not granted. Not a live model judgement. |
| Grounding conflict | Tests. The grant suffix is appended only for an assumed premise. `SCORE_PATHWAY_SYSTEM` itself does not contain that sentence. |
| Ranked-out premise | Tests. A crowded solar clock omits the dock row, and the fast clock used for an assumed inquiry appends it. |
| Every critic angle | Tests. `localPose` returns the authored question and connection verbatim. The browser did not summon a hex critic. |
| Model unavailable | Browser workshop entry sent no `/api/co-invent` request, because the quest already has a summary. The offline critic question is the authored one in `localPose`. Provisional timing stays yellow in unit tests. |
| Continue | Tests in `js/server/run-state.test.js`. No signed-in browser Continue. A snapshot is not treated as entitlement. |
| Changed source or rubric | Tests. `sourceInquiryKey` changes when scope, bank text, or year changes. `tileTimingCacheKey` changes when the source key changes and stays empty-stable for an ordinary tile. |
| Global bank refresh | Tests. Pinning does not call `setWorldForesightBank`. The 8893 server kept the default bank while 8891 served the dock bank. |
| Calendar and foresight | Browser. The 2026 dialog names the pinned bank and the inspection prediction. One **Look Ahead** moved the HUD from 2026 to 2028. The quest then ended, before the 2032 handling row. |
| Win, partial, or collapse | Browser. The run ended with no invention. **Back to the idea** stayed visible. The invention line was **No invention recorded yet.** There is no source-verified badge. |
| Copy and return | Browser. Preview click produced the response below. Copy was not required for the check. The preview is selectable text. The source link on the stage is the YouTube URL with `t=2698` and no extra tracking parameters. |
| Privacy and gating | Tests. `publicCompanionSlice` omits `exploration`. The stage details omit Focus and Connection. The workshop details include them after Play. |
| Voice | Not executed. |
| Narrow viewport and keyboard | Browser at 390×844. On the stage, the invitation and assume line lay out at about 330–350px wide. **Play this Quest** is below that first viewport; the stage scrolls. After **Start inventing**, the workshop assume line lays out at about 320px wide in the scrolling invent column. Focused **Why this problem?** did not open on Enter in this headless Chrome. Space opened it. Workshop details then showed Focus, Connection, Claim, and the 2026 due grant. |

## Outcome preview that was produced

The reflection typed in the browser was `The circuit, not the model, decided the shift.` Preview text:

```
Night shift at Kiln Ferry

Chamath Palihapitiya, Moonshots with Peter Diamandis

A guest says AGI is already here and that it cannot spread because the build-out is missing, not because the model is weak.

Assuming an AI can reliably inspect visible parcel damage and produce workable sorting instructions across this dock's ordinary parcel mix. That capability is available in the scenario from its starting year. Power, physical handling, staffing, and responsibility are not solved for you.

No invention recorded yet.

The circuit, not the model, decided the shift.

This was a fictional exploration under the Quest's assumptions. It does not verify the source.

http://127.0.0.1:8891/?q=companion-moonshots-304

https://www.youtube.com/watch?v=kAwG9E1W_ME&t=2698
```

## Paired model review

Not executed. A co-inventor session was configured on the local server. No score, pose, or timing call was sent, and no paid provider was called for this review. The seven comparisons in the gameplay plan remain unchecked as judgements.

## Still open

- A browser article companion, because the other move shapes are companion objects in `test/fixtures/companions/synthetic-moves.json`, not quests in the developer library.
- A signed-in Continue, including reload of a pinned run.
- Summoning a critic on the hex board and revising an answer.
- Waiting until the 2032 handling row. This run collapsed after one Look Ahead.
- Voice session payload.
- Live model comparisons for handwaving, a real mechanism, a low-tech alternative, a due grant, a removed dependency, an unrelated idea, and scope overreach.
