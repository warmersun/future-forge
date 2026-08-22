# Research rules (capability trends)

These tiles drive **player-facing charts**. Invented numbers teach the wrong lesson.

## Do

- Prefer primary or well-known secondary sources (lab cost series, IRENA, Epoch AI, etc.).
- Use the **same unit** for anchor, milestones, and `unit` field.
- Justify `compounding` in one sentence of author notes (not necessarily in JSON): e.g. “NHGRI cost curve ≈ 18-month halving after 2010.”
- Mark uncertain future points `status: "predicted"`.
- Use `https` URLs in `sources`.

## Do not

- Invent milestone values or dates.
- Fabricate paper titles or DOI links.
- Use zero or negative values (log-Y).
- Claim a prediction as `reached`.
- Pad with decorative milestones that have no evidence.

## Fitting the curve

1. Plot (mentally) reached milestones on log paper.
2. Choose doubling/halving period **or** CAGR that roughly tracks the last decade of evidence.
3. Accept that milestones can sit off the model line — the line is pedagogical, the dots are evidence.

## Honest copy

`summary` may say “roughly,” “about,” or “forecast.” Do not write certainty theater for predicted milestones.

**You do not have to be brief.** Do not pad. Use as much of the 900-character ceiling as the learner needs. Prefer normal sentences (subject, verb, object). If a term needs introducing, introduce and explain it — then use the name.

### Fail (telegram / insider)

> ARC Prize fluid-reasoning set. Chollet: ~0% (GPT-3, 2020) to ~5% (GPT-4o, 2024), then o3 preview 75.7% (Dec 2024). Opus 5 Max 97.5% (Jul 2026). v1 is saturating; ARC-AGI-3 is the agentic reset.
>
> Novel abstract reasoning (ARC-AGI-1) · percent correct (semi-private/public)

### Pass (plain teaching)

> The ARC Prize is a hard puzzle test: the model must invent a rule from a few examples, then apply it to a new grid it has never seen. Early chatbots scored near zero. By 2024, strong models still got only about five percent right. Late-2024 reasoning systems jumped into the seventies, and by mid-2026 some scores were in the high nineties — so this first test is getting “used up.” A harder follow-on test for agent-style systems is the next yardstick. The chart is percent of puzzles solved on the public scoring split.

Also fails: arrow chains (`2018 → 2024 → 2026`), stacked numbers with no sentence, unexplained acronyms (CAGR, LCOE, FLOP) in player copy, and chart jargon in `capability` / `unit`. Keep those fields short and everyday; put the explanation in `summary`.
