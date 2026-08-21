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
