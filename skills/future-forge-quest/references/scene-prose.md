# Quest prose style (design-challenge stories)

**Source of truth for Future Forge player-facing quest writing.**  
Same craft as in-game scenario seeds (`js/scene-prose.js`): nonfiction short stories that pose a **design challenge**. Easy first read — **not** shorter text for its own sake.

Use this for:

| Field | How to apply |
|-------|----------------|
| `mission.scene` | Full spine in plain text. Schema max **500 characters**. Still craft-compliant: short breaths, punch-lines, open challenge. |
| `mission.briefMd` → **The place** | Longer lived story (same spine/voice/rhythm). Target a vivid multi-paragraph scene, not a policy memo. |
| Rest of `briefMd` | Same voice; headings stay scannable. Invent invitation stays open (no solution theater). |

---

## Purpose

Each piece is a **flight simulator for a design decision**. The reader should finish able to:

1. Retell one concrete scene  
2. Name one tension  
3. Feel the open design problem — not leave with a framework dump or a solution brief  

**Core test:** *If the reader remembers only one thing, what decision becomes sharper?*

---

## Story spine (mandatory order)

1. **Hook** — specific person, place, moment, action. No thesis opener. No definition opener. No “In today’s world…”. No “Imagine…”.
2. **Complication** — the world pushes back (constraint, failure, tradeoff, surprise) inside the scene.
3. **Mechanism in motion** — the local system/driver that keeps the theme problem going is revealed **through what people do**, not a lecture.
4. **Stakes** — human-scale consequence (one person, team, or decision — not “society”).
5. **Challenge land** — close on the **open** design tension. Do **not** solve it. Do **not** list takeaways.

### Content that must appear (as story, not labels)

- **(1) Lived local harm** people feel now  
- **(2) Local driver/system** that keeps producing the theme problem — not only how people shelter from symptoms  

Pick **one** plot type per scene: **Challenge** (obstacle vs grit/constraint), **Connection** (trust / who is left out), or **Creativity** (a novel move that redefines the problem). Do not blend all three.

---

## Voice

- Confident and declarative. Plain but not flat. Warm but unsentimental.  
- **Third person** by default.  
- No meta, no workshop jargon, no “this case shows,” “as designers we must,” “the lesson here is.”  
- Jargon on first use: **one plain definition → one concrete image → resume the scene.**

---

## Rhythm (this fixes hard-to-read dense stacks)

- Vary sentence length. After a complex beat, land a **short punch-line** sentence — often its own breath.  
- Use punch-line sentences **2–4 times** per scene (more dilutes them).  
- Default beat: **Explain → Concretize → Land.**  
- Prefer **one idea per sentence breath**. Do not stack three clauses with *while / because / so / which* into one megasentence.  
- Avoid semicolon chains and em-dash lists of abstractions.  
- **Do not shorten for its own sake** — keep texture and stakes; make the path through the story easy.

---

## Opening & closing tests

| | Fails | Passes |
|---|--------|--------|
| **Open** | Thesis, trend, definition, “Imagine…”, abstract problem statement | Specific person does a specific thing in a specific moment; tension already seeded |
| **Close** | Lessons, principles, solution checklist, “they fixed it” | Short final beat leaves the design challenge sharp, open, hard to unsee |

---

## Cut

- Repeated restatements of the same insight  
- Empty intensifiers (`very`, `incredibly`, `really`)  
- Throat-clearing (`It is worth noting`, `Interestingly`, `In today’s landscape`)  
- Sentences that tell the reader how to feel  
- Policy-brief packing / framework dumps  
- Solution theater  

---

## Bad vs good

**BAD (dense stack — never write like this):**

> In the chawl maternity room, mothers share cots under a tin roof that holds the day’s heat long after dark while the grid dies and fans stop and the sterilizer goes cold, so a new mother spikes a fever with no clean way to cool her because a wiring plan built for lights and phones—landlords still meter power by the room—never reaches the birth floor.

**GOOD (same facts, story craft):**

> Night holds the day’s heat under the tin roof. Mothers share cots on the birth floor. When the grid dies, fans stop. The sterilizer goes cold. A new mother spikes a fever, and there is no clean way to cool her or keep instruments safe. Landlords still meter power by the room. The wiring was built for lights and phones, not for round-the-clock birth care. Backup never reaches this floor. Who designs power for the hour a life arrives?

---

## `mission.scene` under the 500-character cap

Keep the full spine. Prefer **several short sentences** over one long lede. End on the open design tension (a sharp question or unfinished beat is fine).

**Shape to aim for (illustrative length, invent your own place):**

> Meena wipes her sister’s forehead with a cloth that is already warm. Night holds the day’s heat under the tin roof. When the grid dies, fans stop. The sterilizer goes cold. Landlords still meter power by the room. Backup never reaches this floor. Who designs power for the hour a life arrives?

---

## Quality bar (ship only when true)

- [ ] One-sentence Commander’s Intent is clear (decision becomes sharper)  
- [ ] Opens on a concrete scene (named person or clear role + action)  
- [ ] Harm + local driver both visible as story  
- [ ] Mechanism shown through action, not lecture  
- [ ] One plot type carries the piece  
- [ ] Punch-line sentences used 2–4 times (scene or place section)  
- [ ] Ends on open design challenge — not a solution  
- [ ] Dense stacked clauses avoided; easy on first read  
- [ ] `mission.scene` ≤ 500 characters  
