# Play Night shift at Kiln Ferry

A companion is a source attached to a Quest. The player hears one attributed claim, accepts one explicit premise, and invents inside what that premise leaves unsolved. This Quest is the worked example: a guest on Moonshots says AGI is already here and cannot spread because the build-out is missing. Kiln Ferry does not try to settle that. It grants one fictional capability, a reliable inspection of visible parcel damage plus workable sorting instructions, and asks what you would invent so a night shift can actually use it.

The value of the loop is the separation. The quote stays the guest's words. The grant is Future Forge's scenario, with a scope and a limit. The invention is yours. A win does not verify the episode.

Restart the local server after this update. Developer mode reads the fixture once at startup. Images are static, but the new briefing beats are in the quest JSON.

```bash
FF_PREDICTIONS_FILE=test/fixtures/predictions/companion-dock-test.json npm run start:developer
```

Open http://127.0.0.1:8765/?q=companion-moonshots-304

If 8765 is already in use, set `FF_PORT` to a free port and open that origin with the same `?q=` path. The link always plays on the server that served the page.

## 1. Hear the claim, then the premise

The opening is the companion stage, before the dock story. The night dock fills the screen, and the claim sits over it.

You should see:

- The quote “I do think that we have achieved AGI. It cannot diffuse.”
- The speaker, Chamath Palihapitiya, and **Listen at 44:58**
- The job: get the night's parcels ready for the morning truck
- The assume line, beginning “For this Quest, assume an AI can reliably inspect…”

Open **Why this problem?** The claim is in there. The private focus and the bridge to the episode stay off this screen. They appear in the workshop details after you start inventing.

This is the point of a companion. A person said something in public. The game repeats it as theirs. The power you receive is a smaller, stated assumption, available in this Quest from 2026. Power, physical handling, staffing, and responsibility are not included.

Press **Play this Quest**.

## 2. Walk the place

The briefing is four stills of the same dock. The caption sits on the picture. The right-hand arrow is **Next**. The last card is **Start inventing**.

| Step | Title | What the still is doing |
|---|---|---|
| 1 | The place | Two people, one belt, one feeder cabinet, a bench that can name a torn parcel |
| 2 | The circuit | The belt is up and the lamps are out. The demo cannot be the shift |
| 3 | The bigger problem | The bench looks finished. The working floor is dark |
| 4 | Your job | Dawn is in the door. The count is still the crew's |

The pictures do not add a fact the brief does not already say. They make the constraint visible: a demo on a bench is not a night that survives its own power.

**Start inventing** opens the workshop. Under **Stakeholder: Nia, night lead** you should see the same assume line and **From Moonshots with Peter Diamandis**. The hex board is further down that column. The right-hand picture is Future vision.

## 3. Invent three ways

A tile is one emTech and one job. A pathway is the island those tiles make when they touch, plus the paragraph you save for that island. The judge scores the island. Until you save, it only has the separate tile sentences.

### How the tiles become a pathway

1. Pick the emTech in **Emerging tech**. Click **Write freely**. Paste only that tile's job into **How it works**. **Mint tile**. The toast says to drag it onto the board, and the box clears. Repeat for the next emTech.
2. Worlds. Super Intelligence and Computing are blue. They dock to each other. Robots are pink. Drop a pink tile against a blue one and the board says "Blue will not dock on pink — worlds must match." Open **All emerging tech** and pick **Internet of Things**. It lives in both worlds, so it can sit between a blue tile and a pink one. It is mature in 2026.
3. Drag the tiles that belong together until their edges touch. That group is one pathway. A placed tile sitting apart is its own pathway. Slide **Shift backlog**, **Build-out**, and **Handoff** until each crisis hex touches the pathway you want judged. Crisis hexes always dock. Bonds stay red until every crisis hex touches an invent island.
4. Under the board, the Pathway panel shows one box per island. The label is the joined tile ids, such as `ai · computing`. The placeholder is "How this pathway works as a whole…". The box starts as the tile sentences stacked, and that stack is only a preview. Replace it with the pathway paragraph and press **Save**. After Save, the critic and the score read that paragraph as one invent. The tile sentences still travel as the parts.

The pathway's timing percent is the product of the tiles on that island. A red tile is shown as **20% honest** this year. Twenty percent of another tile stays under 35%, so the whole island is red. Two yellow tiles, 50% each, multiply to 25%, which is also red. The Timing row then reads "20% honest this year", and the line under the panel says "Combined chance is too low this year — revise claims, split the cluster, or Wait." The line under the buttons says "Combined timing is red (20%). Soften claims or Wait." **Answer the hard questions →** stays disabled while any placed pathway is red.

Hold the first pathway. Use the robot tile as a check beside it, then take that tile off the board before you summon or hold. The score should move only when the mechanism warrants it. There is no target number.

### Use the grant

Two blue tiles, one pathway.

**Super Intelligence.** How it works:

> A station beside the belt uses the granted inspection to name visible damage and give the sort.

**Computing.** How it works:

> Nia switches the belt on only while the inspection station is dark. A shared checklist is the note she follows, and it names the second person as the one who holds a flagged parcel.

The checklist names a sequence a person carries out. If the sentence instead says the record runs or keeps the belt, the timing check treats that as ungranted physical handling. The tile then reads red, base 20%, and the reason cites the not-yet row "Fictional parcel handling robots." Docked against Super Intelligence, the same red base shows as **25% honest** (base 20%), because a touching pair multiplies honesty by 1.25. Throw that tile away and mint the sentence above.

Dock them so they touch. Slide the three crisis hexes against that island. In the box labeled `ai · computing`, replace the stacked sentences and **Save**:

> The station names visible damage and gives the sort. Nia switches the belt on only while that station is dark, following the checklist. The second person carries parcels by hand and takes the cases the grant does not cover: a hidden tear, someone in the aisle, and the call to hold a flagged parcel when the truck deadline says ship it.

**What you are feeling for:** the AI is allowed to be good at the granted job. The pathway earns its keep from the sequence and the named person, which neither tile holds alone. Shift backlog wants parcels actually ready. Build-out wants the circuit used in a sequence. Handoff wants a named person for the work the grant left open.

Open the year. The kicker should name **Synthetic dock test bank**. The inspection row is "Fictional dock inspection and sorting instructions", a prediction for 2026. The dialog still treats predictions as forecasts. It should not call this one verified. A timing lamp that accepts the inspection can say it is feasible under this Quest's assumptions.

### Leave the grant unused

One Computing tile. One tile is already a pathway. The box label is `computing`. Paste the same paragraph into **How it works** and into that box, then **Save**.

> Leave the demo dark. One person marks visible damage on a shared checklist. The other stages the truck stack. The checklist names who stops the belt when someone is in the aisle, and who holds a parcel the morning count wants anyway.

**What you are feeling for:** the premise is permission. A shift that never turns the demo on can still be a serious invention. The critic should press the checklist, the circuit, and the last call. It should not demand the word AGI.

### Ask for a body the grant did not give

Mint this, read the timing check, then take it off the board. A carrying cart in 2026 is the check that comes back red.

**Robots.** How it works:

> A supervised cart carries ordinary parcels from the bench to the truck stack. It stops when a person is in the aisle, and it does not decide the hold.

Place it on an empty hex, apart from the blue tiles. Open the tile. Timing should read **red · 20% honest** this year. That 20% is the red band. The reason should name the handling forecast. In the year dialog that row is **Fictional parcel handling robots**, year 2032, and it is not a grant. A cart that carries parcels in 2026 is that capability treated as routine now. The inspection grant stays in place.

The Pathway panel uses the worst placed island. With this tile on the board the Timing row is 20% honest this year, the line under the panel says the combined chance is too low, and the line under the buttons says "Combined timing is red (20%). Soften claims or Wait." Summon and hold both wait on that.

**Throw away** on the tile popup, or drag the tile back to the tray. A tile in the tray is not a pathway. The station island can then be judged on its own.

To keep the cart in the story, soften **How it works** so a person still carries and the cart is a later assist, then **Save** a pathway that says so. The lamp can leave the red band. It can also stay there. **Look Ahead** shows the handling row still ahead. **Wait +2 years** from an uneased Shift backlog of 3 raises that meter by 1 for each year and reaches 5, which collapses the Quest. **End turn** moves one year and leaves the meters where they are. Neither one makes the cart free: that row is not due until 2032, and a due row only stops the clock from scoring the cart harsher than yellow.

To join a later cart to the station, put **Internet of Things** between the pink tile and the blue ones. Its job is the stop: a sensor that halts the cart when a person is in the aisle. Save the three-tile paragraph only after the robot tile's own timing is out of the red. Otherwise the product pulls the station island red with it.

**What you are feeling for:** inspection was granted. A machine that lifts and carries was not. The 20% is the clock saying so, on the tile and on any pathway that still contains it. Agreeing with the guest about AGI leaves the percent where it is.

## 4. Let a critic press the ungranted part

If you want to see the revision, mint the weak pathway first. One tile is the whole island. The box labeled `ai` shows that sentence. Leave it unsaved, and the critic reads the tile. A Robots tile still on the board keeps timing at 20% and leaves **Answer the hard questions →** disabled, so the cart belongs in the tray before this step.

**Tile:** Super Intelligence.

**How it works:**

> The camera and the belt stay on together all night. The model names every tear, so the shift is done.

Place it so it touches the crisis hexes. Press **Answer the hard questions →**. One challenger lands. Click that hex. The popup shows **The hard question**. The question should stay on the ungranted constraint. It should not ask you to prove the guest, and it should not take back the inspection the Quest already granted.

Only one of these four lands. Each answer below belongs to the station pathway. Revise and **Save** that pathway first, then paste the matching answer. An answer typed while the camera and the belt still run together can stay red, because the words and the mechanism disagree.

**Mother Nature.** The feeder cannot run the belt and the demo together. How does your shift still get parcels ready?

> The inspection station stays dark while Nia runs the belt. When the belt is off, the station names visible damage and gives the sort. The second person carries those parcels by hand. The belt and the station never share the feeder.

**Moloch.** The vendor gets paid for a successful demo, while the crew pays for failures. What changes that incentive in your approach?

> The bench demo is not the shift. Nia runs the belt only while the station is dark, so a demo that needs both at once never becomes the night's plan. A hidden tear, someone in the aisle, and a flagged parcel the truck wants shipped land on the named second person. The crew's sequence is what the dock runs.

**Ethicist.** The system correctly flags a parcel, but the dispatch deadline creates pressure to ship it anyway. Who makes that decision, and whose interests does your design protect?

> The inspection may flag the parcel. The second person decides the hold, and the checklist names them. Nia still runs the belt. The deadline does not replace that person. The crew is protected from a ship-it no one owns, and the count is protected from a flag no one answers.

**Stakeholder.** The pilot worked once. Who can keep your arrangement staffed, maintained, and funded through ordinary shifts?

> The two people already on the night keep it. Nia runs the belt only while the station is dark. The second person carries by hand and takes the cases the grant does not cover. The checklist names both jobs, so the next shift repeats the split. The funding is this crew's shift.

Revise the Super Intelligence **How it works** to the station sentence in section 3, mint the Computing tile, and dock the two so they touch. In the box labeled `ai · computing`, replace the text with the station pathway paragraph and **Save**. If you had already saved the weak sentence, Save again. The same question remains.

Click the challenger hex again. Paste the answer for the critic who landed into **Your answer**. Press **Answer this critic**. The lamp moves only when that answer and the saved pathway agree. Then press **The pathway holds →** when the lamps allow a hold.

## 5. Send something back

The outcome has **Back to the idea**. The prompt is: with that AI capability available, what did your invention make possible, and which constraint mattered most?

Type a sentence of your own, or leave the box empty. An empty note still lets you finish, and it does not block another Quest.

**Preview response** rewrites the premise as “Assuming…”, then the pathway on the board: the place, the year, the emTech names, and the paragraph you saved. Your sentence comes after that. The preview names the quest, links the episode, and ends with: “This was a fictional exploration under the Quest's assumptions. It does not verify the source.” **No invention recorded yet.** appears only when no invention tile is on the board.

**Copy response** is the only copy. Nothing is posted for you.

A sentence in the spirit of the station pathway:

> The useful invention was splitting the station from the belt. The inspection made the sort possible. Power and the last call still sat with the crew.

That sentence is the value you can carry out. You used a bounded capability, you met the constraint it refused to solve, and the record you keep does not pretend the podcast was confirmed.
