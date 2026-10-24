# Companion

Optional object on a normal quest. Omit the key and the quest is ordinary. One source, one move, one question. The player sees that question before play. Capability truth stays in `grounding`, except an explicit scenario grant inside `exploration`.

`sponsorName` is funding credit (**Sponsored by**). The companion is source credit. A speaker, show, author, or publication is never `sponsorName`.

To author this object from a YouTube video, podcast, blog, or X post, and to pair an assumed premise with a predictions bank, follow `skills/future-forge-companion/`.

Do not put `companion` on `kind: "module"` (`companion_not_on_module`).

## Medium and move

`medium`: `podcast` | `post` | `article` | `video` | `talk` | `paper` | `other`.

A podcast needs `source.show`, `source.title`, `source.url`, `source.cue` (`H:MM:SS` or `M:SS`), and `source.speaker`. Optional: `episode`, `published`, `recorded`, `hosts` (max 6).

Every other medium needs `source.title`, `source.url`, and `source.author` or `source.publication`.

`move` is one of the rows below. `evidence.status` must be in that row's set.

| Move | Evidence status | Also required |
|------|-----------------|---------------|
| `milestone` | `demonstrated`, `inferred`, `disputed` | — |
| `trend` | `inferred`, `proposed`, `disputed` | `evidence.scope` ≤160 |
| `idea` | `proposed`, `inferred`, `disputed` | — |
| `opinion` | `proposed`, `inferred`, `disputed` | — |
| `prediction` | `prediction` only | `evidence.horizon` ≤40 |

Also required when `companion` is present:

- `claim` ≤280
- `evidence.limits` 40–400
- `evidence.reviewed` `YYYY-MM-DD`
- `invitation` ≤280, and the same sentence in `spotlight.encourageCopy` or `briefMd` (lint `companion_invitation_not_in_quest`)
- `access` written on the tile (`open`, `account`, or `paid`). The learning default does not count.

Optional `quote` ≤240 requires `interpretation` ≤280, and `claim` must differ from `quote`.

`collaboration`: omit it, or `independent`, or `co-produced`. `co-produced` requires `partnerName` ≤120. Empty strings fail. `https` URLs only.

`research.sources` must include the exact `source.url` (lint `companion_source_not_in_research`). `research` is still citation only. It is not what the AI treats as true.

## What the player sees

The stage before play keeps the invitation as the large question. If there is no quote, the attributed claim is on the stage. If there is a quote, the claim sits in **Why this problem?**. A podcast kicker shortens the show at the first ` with `, then episode and move. The catalog says **Open** and `From {show or publication}`.

When `exploration.premise.mode` is `assumed`, the stage and the workshop show the statement, including **For this Quest, assume…**. The workshop also shows the invitation without a dialog. **Why this problem?** opens focus, bridge, the claim, grant scope and limits, evidence status, attribution, and the source link. Sponsored appears only when `sponsorName` is set.

The outcome screen can show **Back to the idea**. The reflection is optional. Copy happens only after a click. A blank reflection still copies **Assuming…** when the premise says **For this Quest, assume**. The pathway text is the invention. The note does not verify the source.

## What the AI sees

`sourceConstraint` stays a separate string of at most 500 characters, beside `grounding`, never inside it. It carries the safety limit, not the claim. The claim, invitation, and resolved grants travel in `sourceInquiry`. An idea, opinion, trend, or prediction is not current capability unless the Quest grants it inside its stated scope. A milestone is only as firm as its evidence status. Disagreement is a valid invention. A game result does not verify the source.

`exploration` is optional. Legacy companions stay valid. Do not add `exploration` to the public catalog slice.

## Exploration

`exploration.version` is the integer `1`. Required strings: `focus` ≤280, `bridge` ≤500, `reflectionPrompt` ≤400. `premise.mode` is `assumed` or `evidence-grounded`. Never infer it.

`assumed` requires `premise.bankId` and one to three grants. `evidence-grounded` omits `bankId` and uses an empty `grants` array. Each grant has only `predictionId`, `scope` ≤500, and `limits` ≤500. The row's year, kind, headline, and status come from the pinned predictions bank. A matching technology id is not a grant.

`pressureLinks` has one to three of `local`, `global`, `support`. Each has `connection` ≤280 and `criterion` ≤400. `challenges` has exactly `nature`, `moloch`, `ethicist`, and `stakeholder`, each with `connection` ≤280 and `question` ≤400.

Play contract: assume the premise and invent within its implications. Questioning the premise is optional reflection, not a win condition. Reject scopes that say the technology can do anything, that all technology is ready, or that the problem is already solved.

Authoring checks, reviewed by a person: the claim stays attributed; if the grant were unavailable a meaningful design choice would change; the player may rely on exactly the grant; more than one mechanism can solve the problem.

For distribution, bind the complete bank in a v2 `.ffquest`: set top-level `predictionBankId`, match `premise.bankId`, and include `predictions/<bank-id>.json`. Do not add a second bank format or require a process-global bank.

```bash
node scripts/build-companion-dock-example.mjs <output-directory>
./scripts/sideload-local-package.sh <output-directory>/companion-moonshots-304.ffquest
```

For an explicitly requested legacy/developer run of the unbound fixture only, `FF_PREDICTIONS_FILE=test/fixtures/predictions/companion-dock-test.json npm start` remains supported. Missing or invalid saved banks must not fall back to the current process bank.

The worked opinion tile uses bank id `companion-dock-test` and row `dock-inspection-2026`. That row is a fictional test assumption. It is not a forecast by the podcast guest. A public quest uses a researched row from `skills/future-forge-predictions/`.

`test/fixtures/companions/synthetic-moves.json` holds test-only companions for milestone, trend, idea, and prediction. They are labeled synthetic. They are not discoveries or published forecasts.

## Lint (warnings unless `--strict`)

| Code | When |
|------|------|
| `companion_author_as_sponsor` | `sponsorName` equals the author, speaker, show, publication, or `partnerName` |
| `companion_source_not_in_research` | exact `source.url` missing from `research.sources` |
| `companion_invitation_not_in_quest` | invitation is not in `encourageCopy` or `briefMd` |
| `companion_limits_thin` | `evidence.limits` under 40 (also a hard validation error) |
| `companion_exploration_missing` | companion has no `exploration` |

Worked tile: `test/fixtures/quests/companion-moonshots-304.json`. Outreach text: `npm run companion:sheet`.
