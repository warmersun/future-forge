# Quest prose

**Source of truth for player-facing quest text.**

Less is more. Every word costs the reader. People do not want to read. Cut a word, a line, or a paragraph unless the scene is unclear without it. Clarity, not texture. Plain words. Short sentences.

The player should leave with two things:

1. **An instance** of the global problem — one concrete place, and what is happening there now.
2. **What the global problem is** — named in everyday words.

That is the job of `summary`, `mission.scene`, and `mission.briefMd`. An optional **Your job** or `encourageCopy` is either an outcome to invent, or which emTech, capability, and use case to reach for.

The author chooses the rest: voice, person, tense, how many sentences, whether anyone is named, how the instance is told. Do not pad to a spine, a plot type, a punch-line quota, or a word count.

## Where it goes

| Field | Job |
|-------|-----|
| `summary` | The instance, short enough to read on a card (≤420). |
| `mission.scene` | The same instance, able to stand alone (≤500). The co-inventor's opening line. |
| `briefMd` → **The place** | The instance. One paragraph is enough. Each extra paragraph is a card. |
| `briefMd` → **The bigger problem** | What this is a case of. |
| `briefMd` → **Your job** | Optional. An outcome, or the emTech, capability, and use case that fit. |
| `title` | The situation, or the place. |
| `spotlight.encourageCopy` | The same optional ask, if the brief has no job. |
| `mission.suggestedWhy` | Why this family here, under the tray card. The family name is fine. A product name is not. |

Lesson notes stay in `aiTutorContext`. The tray shows the technologies. The prose may name the one that fits.

## Cut

- A second sentence that repeats the first
- A lecture that is not the instance, the bigger problem, or the ask
- Throat-clearing, intensifiers, and sentences that tell the reader how to feel
- A theme-word opening (*Infectious diseases. This is about how far…*)
- A solution, a ban-list, or a "Who designs X?" close
- Policy as the invent ("pass a law," "ban," "UBI")

## Ship when

- A reader can say what happened in that place, and what global problem it is an instance of
- Nothing on the page could be deleted without losing one of those two
