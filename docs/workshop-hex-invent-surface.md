# Workshop hex invent surface

A more visual way to think while inventing.

The working picture is the mock: `output/invention-visual-framework/hex-field.html` (serve over HTTP). 

We are going to significantly change the entire Future Forge application.
Do not worry about the Spark / Play tutorial vs Workshop mode. We can remove Tutorial altogether as part of this change.

---

## What we want

Inventing in Future Forge is connecting a capability to a problem in a real place, honestly, in time. That thought is spatial, mechanical, and temporal. The shipped invent column turns it into chips and two essays. The learner cannot *see* the idea.

We want the invent itself to be something you look at and move.

Looking at the board *is* the thinking. You see the job, the ideas, which worlds can touch, what is still red, and whether an idea is honest this year. Writing How it works is what the board becomes, not where the idea is born.

---



## The main idea

Everything becomes a hexagonal tile. The learner creates or selects tiles and places them on a hex grid.

### Types of tiles

- **Inventions** made with emTechs:
  - AI-generated — same as today’s “Ask for ideas”
  - or typed in — same as today’s How it works description
- **Crisis meters** — three (a Quest may turn some off):
  - the local, short-term, immediate need
  - the global issue, the root cause
  - public support and buy-in (scale lives here too)
- **Stakeholder concerns** — all four perspectives, always:
  - Mother Nature
  - Moloch
  - Ethicist
  - Stakeholder

The place and the named person are not tiles.

### Note on geometry

A hex has **six neighbors**. Seven given lights cannot all touch one invention. One emTech cannot “solve the board.” The cluster *is* the invent.
it is possible that a crises meter is green or yellow. in that case no emTech invention needs to touch it and a single emTech invention can solve the board.

### Tile movement

The user can move any tile around.

### Ehen tiles are added

- The board **starts** with the three meters.
- The four challenger concerns are added later, all four at the same time, when the user is ready to be challeneged - need to click a button similar to current app
- Keep the emTech picker, that is the start of adding new emTech invention tiles.

---



# Visual language

The board uses **two color languages**. They must not be mixed. Green is a traffic light, never a world.

Each hex is an AI-generated picture under **clear glass**. The photo is what the token *is*. Color is not allowed to wash the image. Meaning lives only on the rim, the lamp, and (for ideas) the bar under the name.

## Worlds — who may touch whom

Only **invention** tiles speak this language. Their six border segments say which world they belong to. Tiles do not rotate. Bits always sit on the **left** three faces (NW, W, SW). Atoms always sit on the **right** three faces (NE, E, SE).


| Border                              | World     | Typical ideas                             |
| ----------------------------------- | --------- | ----------------------------------------- |
| All six **blue**                    | bits      | AI, networks, computing, gene sequencing… |
| All six **orange**                  | atoms     | drones, energy, robots, transport…        |
| **Split** — left blue, right orange | converter | IoT, 3D print, synbio, AR/VR…             |


Two hexes **connect** only if the faces that touch are the same world.

- Blue face to blue face — a bits bond. An AI idea may sit against another bits idea, or against the **left** half of IoT.
- Orange face to orange face — an atoms bond. A drones idea may sit against another atoms idea, or against the **right** half of IoT.
- Blue against orange — **refused**. Software does not grab a propeller. That refusal is the lesson.

The atoms vs bits worlds fo not apply to crises meter and challenger tiles. Whether a connection makes sense or not is reflected in the evaluation.

## Traffic lights — how the seven givens feel

The three meters and the four concerns are **traffic-light tiles**. Same paints as today’s HUD and feasibility lamp:


| Light      | Means on a given tile                                   |
| ---------- | ------------------------------------------------------- |
| **Red**    | Hot, or still unanswered                                |
| **Yellow** | Strained — or an idea is touching but is not enough yet |
| **Green**  | Eased / addressed                                       |


When the learner places (or lifts) an invention, every **neighboring** traffic-light tile is re-evaluated

## Progress bar — is this idea honest this year?

Only **invention** tiles have a bar, directly under the name.

the bar reflects the feasibility - similar to the current percentage chance, expressed as progress bar

---



# buttons, panels, functionality to keep

- emTech selector
- top of Invent panel with title, location, spotlight etc.
- quest description
- feasibility panel
- Lobby, End turn Look Ahead, Answer the hard questions buttons
- Right-hand side panel with
-- Future Vision panel
-- AI Co-invent with tutoring mode
- final evaluation screen

A quest is still a quest. No change there. How we solve it is what changes.

# buttons, panels, funcitonality that gets removed

- name your invention
- Focus with How It Works vs Everyday Life, Fill other side button -- this gets replaced by creating emTech invention tiles
- Co-inventor button
- challenger screen with Defend in writing, Fix the invention, Sidestep once options
- pilot, scale, new norm betting
- Play Tutorial

# buttons, panels, functionality that is new

- hexgrid board
- emTech invention tile creation panel that uses AI generated images to make new tiles
-- button "Ask for ideas" that creates three emTech invention tiles with AI
-- "How it works" text area allowing the user to create their own
