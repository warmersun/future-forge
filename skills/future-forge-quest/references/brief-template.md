# Brief template (`mission.briefMd`)

**Prose style:** All player-facing narrative follows `references/scene-prose.md`. The player reads **instance → bigger problem → outcome job**. Capability, product, and “invent with this tech” hints stay in `grounding` / `aiTutorContext`.

**Length:** Aim **~250–600 words**. Hard cap: 12 000 characters. Curriculum, research dumps, and capability chains do not belong here.

**Walkthrough:** The invent screen shows this brief **one short beat at a time** — one card per paragraph (list blocks count as one), **Your job** always last, merged down to **8** cards. Write **The place** as 2–4 short paragraphs (one idea each) and keep the whole brief to ≤8 paragraphs. `summary` is the instance lede in the left banner, shown whole (named people and place are allowed). Optional authored cards: `brief-beats.md`.

**AI clip:** the co-inventor reads this brief as plain text cut at **2800 characters**. Decisive facts (who, what broke, the root cause, the outcome) belong early; the 12 000-char cap is a safety ceiling, not a target.

Write headings in this order (the walkthrough already shows story then job):

```markdown
## The place

A brief little story: an **instance** of the bigger global issue. Fictive place, named people, one moment. **Blank line between paragraphs** — each paragraph becomes one walkthrough card:

1. **Hook** — named person or clear role does something specific, now
2. **Complication** — the world pushes back in the scene
3. **Mechanism** — local driver revealed through action (not a lecture)
4. **Stakes** — human-scale harm people feel

Vary sentence length. Land 2–4 short punch-line sentences. One idea per breath **and per paragraph**.
Lived local harm + local driver must both appear as story.
Target: 2–4 tight paragraphs (fuller than `mission.scene`; same craft). Not a novella. Not one dense block.
Do **not** name the spotlight tech, any supporting tech on the shelf, a sponsor product, or “what just became possible.”

## The bigger problem

Zoom out. This scene is a case of what? **Root cause analysis** in everyday words: the system that keeps producing the harm — not a meter dump, not a capability lecture, not “machines got cheaper.”

One or two short paragraphs. Name the global issue in human language. Say why it keeps happening. Leave the design tension open.

Old heading **What’s strained** still walks (engine alias). Do not use **What just became possible** or **Constraints** on new tiles.

## Your job

Outcome only. What must be true for these people / this class of place.
No product name. No “invent with [tech].” No “do not invent X” ban-list.
No “pass a law,” “ban the model,” or “UBI bill” as the job — those are weather, not the invent.
Stakeholder can appear here in one line (same paragraph — a blank line makes a second walkthrough card).
End on the open choice — not a solution checklist. The tray already suggests the spotlight and its supporting techs (`mission.suggested`, with `suggestedWhy` under each card); the tutor and `grounding` may hint later.
```

Also write **`mission.scene`** as a plain-text instance lede (≤500 chars) with the same spine — see `references/scene-prose.md`. Write **`summary`** as the instance (names allowed), **`title`** as the human situation / place, **`encourageCopy`** as the outcome — see `SKILL.md` Procedure §4.
