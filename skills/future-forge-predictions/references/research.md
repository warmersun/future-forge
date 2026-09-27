# Research, year placement, and attribution

The bank is the game's calendar of what is possible. The AI timing judge treats it as binding, so a wrong year makes the judge wrong. Accuracy beats drama.

## Evidence

- **Milestones** must have happened by `year`. Prefer primary sources: regulator approvals, company deployment announcements, peer-reviewed results, official statistics.
- **Trends** describe a direction backed by a series (cost curves, deployment counts). Place `year` where the trend is clearly visible, not where it started.
- **Predictions** are forecasts. They need a person or organisation behind them (attributed), or a clear consensus outlook (unattributed, and say so in `sourceNote`).
- No invented statistics, paper titles, or quotes. If a source is a secondary compilation, say so in `sourceNote`.

## Year placement

| Source says | `year` |
|-------------|--------|
| "by 2027" / "in 2027" | 2027 |
| "2026–2027" | 2027 (the later year) |
| "by the end of the decade" | 2030 |
| "within 5 years" said in 2025 | 2030 |
| "in 10–20 years" said in 2026 | 2036 (the earlier end, because "within" ranges usually mean the earliest plausible) |
| Undated | Earliest year the framing allows; state "undated in the source" in `sourceNote` |
| Beyond 2040 | 2040, and say so in `sourceNote` |

Years outside 2024–2040 fail validation. The game calendar runs roughly 2026–2040.

## `claimBand`

- `now` — routine and widely available by `year`
- `near` — pilots, early deployments, limited availability
- `frontier` — a stretch claim even for its year. Most bold personal forecasts belong here.

`frontier` rows are always eligible for the AI's "still ahead" list, even when they do not match the learner's stack. Use it for forecasts that should shape every timing call.

## Attribution

- Use the person's name as they are commonly known ("Elon Musk", "Ray Kurzweil").
- Bank-level attribution applies to every row. Use it only when every row is that person's forecast.
- `quote` must be verbatim. If you paraphrase, put the paraphrase in `detail` and leave `quote` out.
- `url` must be `https://` and point to the statement or a reliable report of it.
- Do not attribute milestones. Milestones are facts, not someone's opinion.

## Honest copy

| Fails | Passes |
|-------|--------|
| "AGI → ASI → abundance 🚀" | "Prediction: AI surpasses the intelligence of any individual human by 2026–2027." |
| "Optimus > surgeons" | "Prediction: the Optimus humanoid robot becomes a better surgeon than the world's best human surgeons." |
| "UHI" | "Universal high income: goods and services become so cheap that everyone can afford a high standard of living." |

- `headline` is what the learner sees first. Make it a complete, plain statement.
- `detail` explains. Introduce any term a high-school senior would not know.
