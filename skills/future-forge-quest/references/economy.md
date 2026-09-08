# Quest economy evaluator

After `validate:quest`, run the **economy lab**. Validation checks JSON shape. The evaluator checks whether a competent player can invent **before meters go red**, without the AI co-inventor stealing extra years.

In the Future Forge game repo the full guide is `docs/quest-economy-lab.md`.

```bash
npm run economy:quest -- path/to/quest.json
npm run economy:quest -- --all
npm run economy:quest -- path/to/quest.json --write
```

Developer UI (game server `--developer`): `/tools/quest-economy`. `--write` / **Write into file** only patches local `quests/` and `output/quests/` JSON (resources, pressure integers, optional `collapseYear`). Remote catalog and in-code theme packs are evaluate-only until copied to Library.

## What “challenging” means

The lab pretends four players: solo no-AI, solo with AI, Friends no-AI, Friends with AI.

**Quest verdict** = worse of the two **solo** paths. Target: both **challenging**.

| Verdict | Use |
|---------|-----|
| `challenging` | Survives the scripted path (no collapse, no red, no meter at 5). Ship this. |
| `too_easy` | Already green, cheap, leftover years. Tighten meters or wallet. |
| `too_hard` / `impossible` | Cannot pay tiles or the calendar breaks. Ease Budget / Support / AP, or give global a slightly lower start. |

Full green on every meter is **not** required. Hex hold is yellow+. Local this year + global after a year tick is the intended loop.

If solo-with-AI finishes **two or more years later** than solo-no-AI, the Attention tax is too harsh — raise `apMax` or use fewer tiles. Do not make thinking free.

## Clock (whole numbers)

| Action | Year | Crisis meters |
|--------|------|----------------|
| End turn | +1 | +`pressureRise` once |
| Wait | +`yearsPerTurn` (usually 2) | +`pressureRise` per year jumped |
| Friends table wrap | +1 | +`pressureRise` once |
| Friends personal Wait | waiter only +2 | shared meters **unchanged** |

Red at 4 is danger. Collapse is meter 5 or the fail year.

## Two-act meters

Do not let one invent pathway solve both the immediate local harm and the longer-term global / root cause.

| Role | Typical start | Rise / calendar year |
|------|---------------|----------------------|
| `local` | 3 | 1 |
| `global` | 2 | 1 |
| `support` | 2 | **0** (time does not grind trust; scoring eases it) |

- Local + global on the tile → lab plans **two pathways**: local[+support] this year, End turn, then global.
- Local + support only (or one meter) → one pathway, one tile.
- Untreated local 3↑1 hits 5 in 2028 if they never invent.

First AI ask of a turn = 1 Attention; more thinking that turn = 0; judge/submit = 1. Tutor chat on learning modules is free.

## Author checklist

- [ ] `npm run validate:quest -- <file>` → `OK:`
- [ ] `npm run economy:quest -- <file>` → quest verdict `challenging`
- [ ] Solo-AI year matches solo-no-AI (no extra seasons from chatting)
- [ ] Local is more urgent than global; support rise is 0 unless you mean trust to rot with time
- [ ] Read any `--write` patch before keeping it — it is a search, not a story pass
