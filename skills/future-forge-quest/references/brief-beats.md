# Briefing walkthrough (`briefMd` view + optional `briefBeats`)

Players no longer read the Quest brief as one scroll. Future Forge **steps** it like a cartoon: one short beat, a matching still on Future Vision, then Next.

**`briefMd` stays required.** The walkthrough is a *view* of the essay. Old tiles with no `briefBeats` still play — the engine derives beats from headings and paragraphs.

## What the player sees

- The **summary** in the left invent banner, shown whole (≤420 chars): the **instance** — named person, place, what went wrong now. Always visible while they read beats.
- Cards derived from `briefMd` (`js/brief-beats.js` `deriveBriefBeats`):
  1. Every `##` heading opens a section; text before the first heading becomes a **The place** card.
  2. **One paragraph = one card** (split on blank lines). Consecutive list items form a single card. A paragraph over 120 words is split into sentence groups.
  3. Cards are reordered by role: place → bigger problem (old **What’s strained** still maps here) → legacy `possible` / `constraints` → unknown headings → **Your job**. **Your job is always moved last**, wherever it sits in the source.
  4. Cap **8 cards**: adjacent same-role cards are merged, job paragraphs first, the place hook protected longest. A merged card can run past one screen — and only the **first 4 paragraphs** of any card render.
  5. Last card → **Start inventing**.
- After dismiss: compact recap + Replay + Full brief (the whole `briefMd`).

Card arithmetic: total paragraphs + list blocks across all sections. Six headings with three paragraphs each is 18 chunks squeezed into 8 lumpy cards. Write ≤8 paragraphs total, or author `briefBeats`. Lint: `brief_cards_over_cap:<n>`, `paragraph_too_long:<section>:<n>`, `place_paragraphs_out_of_band:<n>`.

Do **not** author **What just became possible** or **Constraints** on new tiles. Those were capability / constraint lectures. Honest limits belong in `grounding` / tutor. Lived constraints belong inside the story.

Heading aliases the engine already knows:

| Heading | Role |
|---------|------|
| **The place** | `place` |
| **The bigger problem** | `strain` |
| **What’s strained** (legacy) | `strain` |
| **Your job** / **Your brief** | `job` |
| **What just became possible** / **A capability that just became more real** (legacy) | `possible` |
| **Constraints** (legacy) | `constraints` |

Legacy headings still walk so old tiles play. New tiles use **The place / The bigger problem / Your job** only.

## Write `briefMd` so the derived walkthrough is good

This is the default path for side-loaded tiles. You do **not** have to emit `briefBeats`.

1. Keep the headings from `brief-template.md` (**The place**, **The bigger problem**, **Your job**).
2. **The place:** 2–4 **short** paragraphs, one spine beat each (hook / complication / mechanism / stakes). Blank line between paragraphs. One idea per paragraph.
3. **The bigger problem:** one or two short paragraphs (instance → global issue → root cause).
4. **Your job:** one short paragraph, outcome only.
5. Soft target: ~40–90 words per paragraph. The engine splits on blank lines and caps the walkthrough at **8** cards.
6. `summary` is the instance lede (names allowed), shown whole on the banner — a 14-year-old can retell who is in trouble.
7. The co-inventor reads the brief as plain text clipped to **2800 chars**. Put the decisive facts early.

If **The place** is one dense block, the first card is still a wall of text. Split it.

## Optional authored `briefBeats`

Use when captions should be **tighter than the essay**, or you want per-beat stills (`imageUrl`) / live prompts (`imagePrompt`) (learning modules, sponsored tiles, classroom side-loads).

- 3–8 beats.
- Captions: 1–3 everyday sentences (`bodyMd` ≤ 500 chars). **No new facts** that are not in `briefMd`.
- `briefMd` must still stand alone — *could you delete `briefBeats` and still have a valid Quest?* Yes.
- Omit the key when you are not authoring beats.
- Do not add a `possible` or `constraints` beat on new tiles.

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
- Author a “what just became possible” card (capability lecture).
- Put the spotlight tech, a supporting tech, or sponsor product in a caption.
