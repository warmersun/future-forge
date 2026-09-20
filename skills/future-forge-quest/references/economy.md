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

**Quest verdict** = the **solo** path furthest from challenging. `too_easy` counts as worse than `challenging` (a tile one solo player clears in a single cheap season with years to spare is not shippable either). Target: both solo paths **challenging**.

| Verdict | Use |
|---------|-----|
| `challenging` | Survives the scripted path (no collapse, no red, no meter at 5). Ship this. |
| `too_easy` | Already green, cheap, leftover years. Tighten meters or wallet (usually: drop `resources`). |
| `too_hard` / `impossible` | Cannot pay tiles or the calendar breaks. Ease start Budget / Support / AP only if the **first** island cannot buy the tech — two-act is funded by pathway-ease income, not a bigger opening grant. |

## What a tile costs (the usual `too_hard` cause)

Tech cost is not authorable; it comes from the catalog tech's `curve` and `readyYear` (`js/sim/economy.js` `baseTechCost`) against a default wallet of **Budget 5 · Support 3 · AP 3**:

| Spotlight profile | Budget | Support |
|-------------------|--------|---------|
| Mature (default) | 1 | 0 |
| `curve: "early"` | 2 | 1 |
| `readyYear ≥ 2028` | ≥2 | — |
| `readyYear ≥ 2030` | ≥3 | ≥1 |

A frontier spotlight opens at 3 Budget + 1 Support, so the first island alone eats most of the wallet. That, not the meters, is the usual `too_hard`. Prefer a supporting partner that is cheap for act one and let the frontier tech ride act two, before touching `resources`.

## Supporting techs feed act two

The lab picks tiles from `mission.suggested` in order (`pickTechs`), then the spotlight's catalog pairs. Author the shelf so the lab plans with your ids: spotlight first, then the partner meant for the **global** meter, then a cheap local helper. `suggestedWhy` per id names the meter it eases.

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

## Wallet (Budget)

Attention (AP) refills every End turn. **Budget does not.** It is a stock: techs, Lobby, and R&D spend it.

**Income:** when a docked invention pathway **scores and eases a crisis role** (local / global / support), the player gets **+1 Budget per newly eased role**, once per role this Quest. Pending scores and backlash (a meter that got worse) do not pay. Lobby-written bans are weather — they must not ease meters, so they must not print Budget.

The lab models this. After the first island’s typical yield (local −1, often support −1), slack Budget goes **up**, then End turn, then the second island can buy the later tech.

| Do | Don’t |
|----|--------|
| Omit `resources` unless the **first** tile cannot be bought (early-curve / 2030+ techs cost 2–3$) | Raise `startingBudget` to 8 as a Spotlight habit so act two is payable |
| Let the first island’s ease fund the global island | Treat Budget as spend-only or refill it like AP |
| Keep start at game default (Budget **5**, Support **3**, AP **3**) when a 1$ tech is the first pick | Print start cash because `--write` used to do that before income existed |

0$ cannot buy more techs. It is not instant Quest over — a last-dollar dock can still score and pay back.

## Two-act meters

Do not let one invent pathway solve both the immediate local harm and the longer-term global / root cause.

Put these integers on **new** tiles (then run the evaluator — do not invent 2 / rise 1 because an old example did):

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
