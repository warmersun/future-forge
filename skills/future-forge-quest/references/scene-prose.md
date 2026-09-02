# Quest prose style (design-challenge stories)

**Source of truth for Future Forge player-facing quest writing.**  
Same craft as in-app scenario seeds (`js/scene-prose.js`): nonfiction short stories that pose a **design challenge**. Easy first read — **not** shorter text for its own sake.

Use this for:

| Field | How to apply |
|-------|----------------|
| `mission.scene` | Full spine in plain text. Schema max **500 characters**. Still craft-compliant: short breaths, punch-lines, open challenge. |
| `mission.briefMd` → **The place** | Longer lived story (same spine/voice/rhythm). **2–4 short paragraphs** (blank line between) — the invent screen shows each as a walkthrough card. Not a novella, policy memo, or one dense block. |
| Rest of `briefMd` | Same voice; headings stay scannable. **Your job** states the invent in plain words (see `brief-template.md`). |

---

## Purpose

Each piece is a **flight simulator for a design decision**. The reader should finish able to:

1. Retell one concrete scene  
2. Name one tension  
3. Feel the open design problem — not leave with a framework dump or a solution brief  

**Core test:** *If the reader remembers only one thing, what decision becomes sharper?*

**Plain-language test (Spotlight / learning tiles):** *Could a 14-year-old restate the invent job from title + summary alone?* Story craft does not replace that test.

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
- **Everyday words in player text.** If a lab or research term would fail a high-school first read, use the everyday phrase in scene / brief / title / summary. Put the lab term in **`grounding`** or **`aiTutorContext`**. Prefer not to resume the scene with the jargon after a one-line definition — that still hides the job.

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
- Research or tutor curriculum dumped into player prose  

---

## Spotlight / learning extra (do not weaken catalog seed craft)

Catalog theme seeds can stay in lived-harm story voice. **Spotlight and learning tiles** authored with this skill must also make the **invent job** unmistakable:

1. **`summary` + `title` + brief “Your job”** state who is in trouble, what to invent (everyday words), and what not to invent.  
2. Scene may still end on tension (*Who posts the rule before the fair?*). A **metaphor-only** closer (*Who designs the ditch brain…*) is **not** enough as the only invent invitation.  
3. Capability lectures, product-category chains, and lesson SEQUENCE belong in **`grounding`** / **`aiTutorContext`** — not as the bulk of `briefMd`.  
4. Ban insider shorthand in player fields: “local cut,” unexplained “open-weight,” “MoE,” “genome-scale opposite-handed DNA,” etc. Say what the learner must build in plain words.

---

## Bad vs good

### Dense stack (never write like this)

**BAD:**

> In the chawl maternity room, mothers share cots under a tin roof that holds the day’s heat long after dark while the grid dies and fans stop and the sterilizer goes cold, so a new mother spikes a fever with no clean way to cool her because a wiring plan built for lights and phones—landlords still meter power by the room—never reaches the birth floor.

**GOOD (same facts, story craft):**

> Night holds the day’s heat under the tin roof. Mothers share cots on the birth floor. When the grid dies, fans stop. The sterilizer goes cold. A new mother spikes a fever, and there is no clean way to cool her or keep instruments safe. Landlords still meter power by the room. The wiring was built for lights and phones, not for round-the-clock birth care. Backup never reaches this floor. Who designs power for the hour a life arrives?

### Learning / spotlight: jargon hides the job (never ship like this)

**BAD (research voice in player fields):**

- Title: *The unposted rule at Tideglass High*  
- Summary: *Invent the local cut.*  
- Scene: *…can finally make opposite-handed peptides… do not finish a living cell…*  
- Brief opens on place poetry; invent invitation buried after a capability lecture.

**GOOD (same fictive place; job first in everyday words):**

- Title: *School lab rule before the science fair*  
- Summary: *Invent a posted school-lab rule that allows useful mirror-molecule medicines and forbids building a living mirror cell.*  
- Scene: Nia tapes a donor plaque beside the new bench machine. The club can make useful medicine parts. The fair prize is a summer lab seat. A visiting fellow wrote on the whiteboard: do not finish a living cell. No one has posted what that means on the door. Who writes the rule before the fair?  
- Brief opens with **Your job** (plain invent + what not to invent). Lab terms (*chirality*, *opposite-handed*, *ribosome*) live in `grounding` / tutor notes.

---

## `mission.scene` under the 500-character cap

Keep the full spine. Prefer **several short sentences** over one long lede. End on the open design tension (a sharp question or unfinished beat is fine). Still use everyday words.

**Shape to aim for (illustrative length, invent your own place):**

> Meena wipes her sister’s forehead with a cloth that is already warm. Night holds the day’s heat under the tin roof. When the grid dies, fans stop. The sterilizer goes cold. Landlords still meter power by the room. Backup never reaches this floor. Who designs power for the hour a life arrives?

---

## Quality bar (ship only when true)

- [ ] One-sentence Commander’s Intent is clear (decision becomes sharper)  
- [ ] **Title + summary** pass the 14-year-old invent-job test (Spotlight / learning)  
- [ ] Opens on a concrete scene (named person or clear role + action)  
- [ ] Harm + local driver both visible as story  
- [ ] Mechanism shown through action, not lecture  
- [ ] One plot type carries the piece  
- [ ] Punch-line sentences used 2–4 times (scene or place section)  
- [ ] **The place** is 2–4 short paragraphs (one idea each) so the derived walkthrough is readable  
- [ ] Ends on open design challenge — not a solution  
- [ ] Dense stacked clauses avoided; easy on first read  
- [ ] Player text uses everyday words; lab jargon is not required to understand the job  
- [ ] `mission.scene` ≤ 500 characters  
