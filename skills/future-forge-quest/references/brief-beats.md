# Briefing walkthrough (`briefMd` view + optional `briefBeats`)

Players no longer read the Quest brief as one scroll. Future Forge **steps** it like a cartoon: one short beat, a matching still on Future Vision, then Next.

**`briefMd` stays required.** The walkthrough is a *view* of the essay. Old tiles with no `briefBeats` still play — the engine derives beats from headings and paragraphs.

## What the player sees

- A **job line** from `summary` (always visible while they read).
- Beats in **story-then-job** order, even if you wrote **Your job** first in Markdown:
  1. The place (one paragraph per card)
  2. What’s strained
  3. What just became possible
  4. Constraints
  5. Unknown `##` headings (kept, never dropped)
  6. Your job (last card → **Start inventing**)
- After dismiss: compact recap + Replay + Full brief (the whole `briefMd`).

Heading aliases the engine already knows: **Your job** / **Your brief**; **What’s strained**; **What just became possible** / **A capability that just became more real**.

## Write `briefMd` so the derived walkthrough is good

This is the default path for side-loaded tiles. You do **not** have to emit `briefBeats`.

1. Keep the headings from `brief-template.md`.
2. **The place:** 2–4 **short** paragraphs, one spine beat each (hook / complication / mechanism / stakes). Blank line between paragraphs. One idea per paragraph.
3. Other sections: one short paragraph (or a short list for Constraints). Do not pack three ideas into one paragraph.
4. Soft target: ~40–90 words per paragraph. The engine splits on blank lines and caps the walkthrough at **8** cards.
5. `summary` must pass the 14-year-old invent-job test — it is the line they see on every card.

If **The place** is one dense block, the first card is still a wall of text. Split it.

## Optional authored `briefBeats`

Use when captions should be **tighter than the essay**, or you want per-beat stills (`imageUrl`) / live prompts (`imagePrompt`) (learning modules, sponsored tiles, classroom side-loads).

- 3–8 beats.
- Captions: 1–3 everyday sentences (`bodyMd` ≤ 500 chars). **No new facts** that are not in `briefMd`.
- `briefMd` must still stand alone — *could you delete `briefBeats` and still have a valid Quest?* Yes.
- Omit the key when you are not authoring beats.

```json
"briefBeats": [
  {
    "id": "place-1",
    "role": "place",
    "title": "The place",
    "bodyMd": "Nurse Amina seals another swab under the corrugated awning. The fever sheet on the fridge does not match.",
    "imageUrl": "assets/quests/spotlight-gene-seq/place-1.jpg",
    "imagePrompt": "Photoreal documentary still: a small border clinic under a corrugated awning, a nurse sealing a swab, labeled tubes in a cooler, heat haze, no readable text, no logos."
  }
]
```

| Field | Rules |
|-------|--------|
| `id` | required, unique slug, ≤40 |
| `role` | optional: `job` \| `place` \| `strain` \| `possible` \| `constraints` \| `other` |
| `title` | required, ≤60, player-facing kicker |
| `bodyMd` | required, markdown subset, ≤500 chars |
| `imageUrl` | optional — `https://…` or bundled `assets/…jpg|png|webp` (≤400). **Ships the still; the walk never waits on Imagine.** |
| `imagePrompt` | optional, ≤400 — used only when `imageUrl` is omitted (live generate). Photoreal documentary still in this place; no readable text, logos, or watermarks |

Tile top-level or under `mission`. Invalid `briefBeats` **fail** `validate:quest` (the engine will not silently ignore a broken array).

The walk swaps a still on Future Vision with each caption:

1. **`imageUrl`** — show immediately (pre-generate the file, point at it).
2. Else Imagine from `imagePrompt` (or a derived prompt).
3. Else the theme postcard while that generates.

Put files next to the tile under `assets/quests/<quest-id>/<beat-id>.jpg`, or host them and use `https://…`. Full brief restores invent/pathway vision. Omit `imageUrl` when you are fine with live generate.

## Do not

- Put the story on hex tiles (place and named person are not tiles).
- Dump tutor SEQUENCE or `grounding` into beats.
- Replace `briefMd` with beats.
- Emit empty `briefBeats: []`.
