---
name: future-forge-companion
license: MIT
description: >
  Turn one YouTube video, podcast episode, blog or article, or X post into
  a Future Forge companion quest, and when the premise is assumed, the
  predictions-bank rows that quest grants. Orchestrates future-forge-quest
  and future-forge-predictions without redefining their fields. Use when
  asked to make a companion quest from a link, assume a claim and invent,
  pair a quest with a bankId, or run /future-forge-companion.
---

# Future Forge companion quest

**License: MIT** (this skill package only).

You turn **one public source** into one playable companion quest. The source is a YouTube video, a podcast episode, a blog or other article, or an X post. The quest is an ordinary tile plus `companion`. You do not invent a schema.

| Skill | You follow it for |
|-------|-------------------|
| **`skills/future-forge-quest/`** | The tile, the fictive place, prose, grounding, economy, and every companion field (`references/companion.md`) |
| **`skills/future-forge-predictions/`** | The bank, only when the premise is assumed. Years and attribution: `references/research.md` |

Read both `SKILL.md` files before you write. This file is the order of work and the decisions that sit between them.

## When to use

- "Make a companion quest from this YouTube / podcast / blog / X post"
- "Assume this claim and let the player invent inside it"
- "Pair a quest with a predictions bank" / `bankId`

## Hard rules

1. **One source, one move, one question.** Field shape, caps, evidence pairs, and lint codes live in `skills/future-forge-quest/references/companion.md`. Do not copy them into the tile notes or into this file.
2. **Source credit stays off `sponsorName`.** The speaker, show, author, or publication is the byline. `sponsorName` is funding credit. companion.md rejects them when they match.
3. **A grant row is a scenario assumption.** It describes a bounded capability this quest allows the player to use. `sourceNote` says it is a scenario assumption for this quest. Leave `attribution` off that row. Leave the speaker's words out of its `quote`. `headline` and `detail` describe the granted capability, and `detail` says the quest assumes it. A forecast the person actually made is a separate row and follows the predictions skill, including attribution. It becomes a grant only when this quest's premise grants that capability inside a `scope` and `limits`. A bank of only scenario rows has no bank-level attribution.
4. **One packaged Quest binds one complete calendar.** Put the bank in `predictions/<bank-id>.json` inside the source tree and set top-level `predictionBankId` to its exact `id`. The assumed `premise.bankId` must match; grants reference rows in that bank. Different calendars use separate banks; share a bank only when every row is deliberately shared. Never merge unrelated assumptions into a server bank or edit `predictions/default.json` without authorization.
5. **The developer server injects one fixture:** `test/fixtures/quests/companion-moonshots-304.json` (`COMPANION_FIXTURE` in `server.mjs`). A new example is `quests/<id>.json`. Leave the fixture in place unless the user asks to change it.
6. **Publish, pack, or commit only when the user asks.** Packaging stays the quest skill's package step.

Follow the play contract in companion.md.

## Procedure

### 1. Read the source

Capture the URL, the title, who is speaking, and the date when the page states one. Copy a short verbatim `quote`, or omit it. Write `claim` as your reading of what they are doing with that span. companion.md requires the claim to differ from the quote.

Set the medium from the page:

| The page is | `medium` |
|-------------|----------|
| An episode of a named show (YouTube, a podcast host, or an episode page) | `podcast` |
| A standalone YouTube video | `video` |
| A blog, newsletter, or other long page | `article` |
| An X or Twitter post, or a short personal note | `post` |
| A talk page that is not the video file | `talk` |
| A paper | `paper` |
| None of these | `other` |

A podcast needs `show`, `title`, `url`, `cue`, and `speaker`, plus `episode` when the show numbers it. Every other medium needs `title`, `url`, and `author` or `publication`. For a post with no title, write a short label as `title` and put the account name in `author`. Caps and the rest of the source object are in companion.md.

**Cue.** A podcast cue is `H:MM:SS` or `M:SS` (`js/companion.js`: minutes and seconds each at most 59, seconds always two digits). Read a YouTube `t` or `start` value as a second count, or as `NhNmNs`. Under one hour, emit `M:SS`. At or over one hour, emit `H:MM:SS`. Use a timestamp the user names when the URL has none.

**Move.** Classify the speech act, then take `evidence.status` from the move table in companion.md.

| They are doing this | `move` |
|---------------------|--------|
| Stating a forecast with a horizon | `prediction` |
| Judging or saying "I think," without a demonstration | `opinion` |
| Reporting a result the evidence shows has happened | `milestone` |
| Proposing a design nobody has run | `idea` |
| Describing a direction over time | `trend` |

A confident tone does not make a milestone.

Leave out figures and pledges the user says are out of scope. They do not go in the claim, the grants, or the pressures.

### 2. Choose the premise

Use the mode the user already named. Otherwise decide from the source.

- **`assumed`** — the player may rely on one to three bounded capabilities that `grounding` does not already treat as real. Each one is a grant row. The statement form, including "For this Quest, assume…", and the checks a person still reviews, are in companion.md.
- **`evidence-grounded`** — the source is the question, and the quest grants no extra capability. Omit `bankId`. `grants` is `[]`. Skip step 3.

### 3. Write the bank, when assumed

Follow `skills/future-forge-predictions/SKILL.md` for the file shape, years, and bands.

- Prefer `predictions/<id>.json`. Its `id` is the string you will store as `premise.bankId`.
- Include the complete intended calendar, with no runtime inheritance from the default bank. A neighboring example gets its own bank when its assumptions differ.
- Write each grant row under hard rule 3. The worked grant in that bank is the pattern: a scenario assumption, with `sourceNote` saying so.
- Validate until the file reports OK:

```bash
npm run validate:predictions -- <bank>
```

### 4. Write the quest

Follow `skills/future-forge-quest/SKILL.md` for the fictive place, pressures, grounding, shelf, prose, and economy. Then add `companion` and `exploration` from companion.md.

- `research.sources` includes the exact `source.url`.
- The invitation sentence also appears in `spotlight.encourageCopy` or `briefMd`.
- Write `access` on the tile (`open`, `account`, or `paid`).
- In a v2 package, top-level `predictionBankId` and `premise.bankId` both equal the bank's `id`. Each grant's `predictionId` equals a row id. Grant objects carry only `predictionId`, `scope`, and `limits`.
- Capability truth stays in `grounding`. The grant is the only added capability, and only inside its scope. The grant `limits` say what the quest does not give the player.
- Optional `titleImageUrl` is the full-bleed stage background. The field rule is in `skills/future-forge-quest/references/schema.md`. Omit it and the theme postcard remains.
- Save the new tile as `quests/<id>.json`.

### 5. Validate

```bash
npm run validate:predictions -- <bank>          # assumed only
npm run validate:quest -- quests/<id>.json --strict
npm run economy:quest -- quests/<id>.json
```

The quest line reports `OK:` and `lint: clean`, or you name each remaining `WARN` in the hand-off. The economy verdict is **challenging**.

### 6. Hand off local play

When packaging is requested, deliver one v2 archive with the Quest and its complete local bank:

```bash
npm run pack:quest -- <source-directory> -o <id>.ffquest
npm run verify:quest-package -- <id>.ffquest
./scripts/sideload-local-package.sh <id>.ffquest
```

The sideload command prints the local URL; no `FF_PREDICTIONS_FILE` is needed. Every playable member in v2 needs a bank, including evidence-grounded companions. Ordinary loose/evidence-grounded v1 Quests remain supported without that new requirement. A loose Quest carrying `predictionBankId` requires its package, not an ambient bank.

`FF_PREDICTIONS_FILE=<bank> npm start` remains an explicit legacy/developer path for unbound assumed Quests, not the distribution workflow.

Tell the user the archive, Quest and bank IDs, verification results, and local command. Changed assumptions create a new immutable revision; existing runs retain the old one. Missing releases must be restored or started separately as new runs. An invalid older saved bank must stay available for recovery, never be silently replaced. Publish or commit only when asked.

## Non-goals

- A new quest kind, catalog tab, publisher dashboard, embed, or article-to-puzzle generator
- A second predictions file format
- Copying companion.md or the predictions research rules into this skill
