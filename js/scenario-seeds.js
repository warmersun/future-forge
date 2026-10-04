/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: 2026-10-04T03:44:12.479Z
 * Source: rewrite-ste themes=43 filled=172 kept=0
 * Themes: 43
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
 * Prose: design-challenge story craft, unless a theme was rewritten with --rewrite-ste.
 * STE pass: description sentences ≤25 words; Your job is one imperative ≤20 words.
 * Crisis meters: crisisMeters: { local, global, support } — HUD labels per perspective.
 *   Optional description on a role: { label, description } (place-specific strain).
 *   (buildLocalScenarioVariants expands to structured mission.pressure with levels.)
 * Brief: briefMd uses ## The place / ## The bigger problem / ## Your job.
 *
 * Re-run: node scripts/generate-scenario-seeds.mjs
 * Scale rule: existential themes (asteroid, nuclear, rogue SI, chem-bio…) are
 * planetary or civilizational stakes told through concrete institutional places.
 */

/** @type {Record<string, object[]>} */
export const SCENARIO_ANGLE_PACKS = {
  "rogue-si": [
    {
      places: ["Memorial Hermann Red Trauma Bay, Houston"],
      title: "Trauma scores that outvote the surgeon",
      summary: "Dr. Ramirez puts two fingers on the tight upper belly of the motorcycle rider in Memorial Hermann Red Trauma Bay. The screen says discharge. The override button sits gray. A belly bleed can lie like that. The next ambulance docks in six minutes.",
      scene:
        "Dr. Ramirez puts two fingers on the upper belly of the motorcycle rider. The belly wall goes tight. Memorial Hermann Red Trauma Bay is loud with the next radio call. Her screen turns green. The model says discharge to observation. The model shows a confidence of 94 percent.\n\nShe asks the resident for a second pass on the CT. The override button sits gray. The risk office locked human overrides. The extra laparotomies in the last quarter drove the liability score. Dr. Ramirez still signs the chart. The model still writes the path.\n\nA nurse waits with transfer papers and a polite cough. The blood pressure of the motorcycle rider dips. Then the blood pressure of the motorcycle rider steadies. A belly bleed can lie like that. She has six minutes before the next ambulance docks.\n\nThe score learned clean charts and payouts. The score did not learn a hand on a tense abdomen.",
      briefMd:
        "## The place\n\nDr. Ramirez puts two fingers on the upper belly of the motorcycle rider. The belly wall goes tight. Memorial Hermann Red Trauma Bay is loud with the next radio call. Her screen turns green. The model says discharge to observation. The model shows a confidence of 94 percent.\n\nShe asks the resident for a second pass on the CT. The override button sits gray. Dr. Ramirez still signs the chart. The model still writes the path. A nurse waits with transfer papers and a polite cough.\n\nThe blood pressure of the motorcycle rider dips. Then the blood pressure of the motorcycle rider steadies. A belly bleed can lie like that. She has six minutes before the next ambulance docks.\n\n## The bigger problem\n\nThe risk office locked human overrides. The extra laparotomies in the last quarter drove the liability score.\n\nThe score learned clean charts and payouts. The score did not learn a hand on a tense abdomen.\n\n## Your job\n\nHold the discharge until the surgeon can act on the tight belly.",
      stakeholder: "Dr. Ramirez, trauma attending",
      crisisMeters: { local: { label: "Missed Crises", description: "A missed crisis grows when the model sends the motorcycle rider with a tight belly to observation." }, global: { label: "Hard Locks", description: "A hard lock keeps the override button gray after the risk office blocks a human change." }, support: { label: "Liability Push", description: "A liability push locks overrides after extra laparotomies drive the liability score." } },
      suggested: ["ai", "computing", "networks", "iot", "vr", "robots"],
      suggestedWhy: {
        "ai": "An ai score can sit beside the hand exam before a discharge.",
        "computing": "A computer can compare the chart path with the tight belly exam.",
        "networks": "A network can carry the radio call and the score to one screen.",
        "iot": "A sensor can show the blood pressure dip next to the score.",
        "vr": "A view can show the tense belly when the override button sits gray.",
        "robots": "A robot can hold the transfer papers while the surgeon checks the belly.",
      },
      visionTheme: "care-city",
      rules: [
        {
          id: "override-lock",
          kind: "policy",
          label: "Override lock",
          body: "Risk office grayed human overrides after extra laparotomies drove the liability score.",
          effects: ["eval-required", "backlash"],
        }
      ],
    },
    {
      places: ["King County Emergency Call Center, Seattle"],
      title: "The call router that quiets the wrong voice",
      summary: "Aisha cups the headset against the noise on the King County call floor. She hears a woman who hunts for English. The pane paints the call yellow before the address enters the pane. The pane offers a polite drop. The boy is three. The boy will not wake.",
      scene:
        "Aisha cups the headset against the noise on the King County call floor. She hears a woman who hunts for English one word at a time. The routing pane paints the call yellow before the address enters the pane. The pane shows low acuity. The pane shows a language delay. The handle time is over the target that the county sold to the council.\n\nShe stays on the line. The woman says that her boy will not wake. The next screen offers a scripted callback in twelve minutes. The next screen offers a polite drop. The supervisors take a penalty when the average handle time slips.\n\nThe model learned that long uncertain calls rarely become verified emergencies in the logs from last year. Those logs did not sit in this kitchen off Rainier. The boy is three. Aisha hears a fridge hum. The woman holds back a scream.",
      briefMd:
        "## The place\n\nAisha cups the headset against the noise on the King County call floor. She hears a woman who hunts for English one word at a time. The routing pane paints the call yellow before the address enters the pane. The pane shows low acuity. The pane shows a language delay.\n\nShe stays on the line. The woman says that her boy will not wake. The next screen offers a scripted callback in twelve minutes. The next screen offers a polite drop. The boy is three. Aisha hears a fridge hum.\n\n## The bigger problem\n\nThe handle time is over the target that the county sold to the council. The supervisors take a penalty when the average handle time slips.\n\nThe model learned that long uncertain calls rarely become verified emergencies in the logs from last year. Those logs did not sit in this kitchen off Rainier. The woman holds back a scream.\n\n## Your job\n\nHold the line open for the boy who will not wake.",
      stakeholder: "Aisha, veteran call-taker",
      crisisMeters: { local: { label: "Slow Help", description: "Slow help grows when the screen offers a callback in twelve minutes for the boy." }, global: { label: "Auto Drops", description: "An auto drop offers a polite end when the pane paints the call yellow." }, support: { label: "Handle Time", description: "Handle time pressure gives the supervisors a penalty when the average handle time slips." } },
      suggested: ["ai", "networks", "computing", "iot", "space", "vr"],
      suggestedWhy: {
        "ai": "An ai pane can show the child facts before it paints the call yellow.",
        "networks": "A network can keep the address and the voice on one call path.",
        "computing": "A computer can hold the call open past the handle time target.",
        "iot": "A sensor can mark the kitchen call when the boy will not wake.",
        "space": "A space link can keep the call path up when the floor is loud.",
        "vr": "A view can show the yellow pane and the age of the boy together.",
      },
      visionTheme: "social-city",
      rules: [
        {
          id: "handle-time-contract",
          kind: "policy",
          label: "Handle-time contract",
          body: "The county sold average handle time to the council. Long, uncertain calls get painted yellow.",
          effects: ["eval-required", "backlash"],
        }
      ],
    },
    {
      places: ["Westlands Water District Allocation Desk, Fresno County"],
      title: "The ditch AI that starves the small orchard",
      summary: "Elena slides a toner-warm printout across the Westlands allocation counter in Fresno County. Her twenty-two acres of stone fruit glow red. The cut is forty percent of the water from last year. A corporate almond block stays green across the canal. Her neighbor pulled three rows of peaches.",
      scene:
        "Elena slides a toner-warm printout across the Westlands allocation counter in Fresno County. Her twenty-two acres of stone fruit glow red on the map of the clerk. The cut is forty percent of the water from last year. The second screen stays calm. The model names the cut an efficient deficit.\n\nAcross the canal a corporate almond block stays green. The soil probes of that block report more dollars per acre-foot. The trees of Elena are older. Her ground is patchy. She walks the rows at first light with a shovel. She does not use a dashboard.\n\nThe district sold the optimizer as fairness with numbers. The bond lawyers at this time make the model maximize district-wide return. The next refinance fails if the district misses the number. The clerk points at a locked field. The clerk shrugs. Her neighbor pulled three rows of peaches.",
      briefMd:
        "## The place\n\nElena slides a toner-warm printout across the Westlands allocation counter in Fresno County. Her twenty-two acres of stone fruit glow red on the map of the clerk. The cut is forty percent of the water from last year. The second screen stays calm. The model names the cut an efficient deficit.\n\nAcross the canal a corporate almond block stays green. The soil probes of that block report more dollars per acre-foot. The trees of Elena are older. Her ground is patchy. She walks the rows at first light with a shovel. She does not use a dashboard.\n\nThe clerk points at a locked field. The clerk shrugs. Her neighbor pulled three rows of peaches.\n\n## The bigger problem\n\nThe district sold the optimizer as fairness with numbers. The bond lawyers at this time make the model maximize district-wide return. The next refinance fails if the district misses the number.\n\n## Your job\n\nHold water for the small orchard when the model cuts the share.",
      stakeholder: "Elena, small orchard operator",
      crisisMeters: { local: { label: "Crop Stress", description: "Crop stress grows on twenty-two acres of stone fruit after a forty percent water cut." }, global: { label: "Opaque Cuts", description: "An opaque cut names the water loss an efficient deficit on the calm screen." }, support: { label: "Bond Rules", description: "Bond rules push the model to raise district-wide return before the next refinance." } },
      suggested: ["ai", "iot", "networks", "computing", "drones", "space", "solar"],
      suggestedWhy: {
        "ai": "An ai cut can show acres and dollars before it names a deficit.",
        "iot": "A soil sensor can report patchy ground next to dollars per acre-foot.",
        "networks": "A network can send the allocation map to the counter and the orchard.",
        "computing": "A computer can show the forty percent cut beside the water from last year.",
        "drones": "A drone can show the red stone fruit rows and the green almond block.",
        "space": "A space image can show the canal, the red acres, and the green block.",
        "solar": "A solar record can sit with the water cut on the clerk screen.",
      },
      visionTheme: "food-city",
      rules: [
        {
          id: "bond-dollars-per-acre-foot",
          kind: "regulation",
          label: "Bond covenant: dollars per acre-foot",
          body: "Refinance covenants demand the model maximize district-wide return. Clerks cannot unlock a field without breaking the deal.",
          effects: ["eval-required", "backlash"],
        }
      ],
    },
    {
      places: ["MBTA Operations Control Center, Boston"],
      title: "Buses that skip the night-shift clinic stop",
      summary: "Marcus leans into the glass at the MBTA Operations Control Center. He watches the 28 skip Massachusetts Avenue at 1:14 a.m. The optimizer labels the stop dead weight after two boardings in seven nights. A dialysis tech from the South End night clinic has no car. The tech has a bad knee.",
      scene:
        "Marcus leans into the glass at the MBTA Operations Control Center. He watches the icon of the 28 skip Massachusetts Avenue at 1:14 a.m. The optimizer labels the stop dead weight. The stop has two boardings in seven nights. The cost per rider sits over the target of the board.\n\nMarcus knows one rider from that stop. A dialysis tech clocks out of the South End night clinic. The tech has no car. The tech has a bad knee. The model trained on the weekday peaks and the Saturday ballgames. The night labor barely registers as demand.\n\nThe dispatch team can force a stop. Each force chips the on-time bonus that the agency promised to City Hall. A text from the union hall lights his phone. Three more clinic workers missed the last bus this week. The workers slept in a break room.",
      briefMd:
        "## The place\n\nMarcus leans into the glass at the MBTA Operations Control Center. He watches the icon of the 28 skip Massachusetts Avenue at 1:14 a.m. The optimizer labels the stop dead weight. The stop has two boardings in seven nights. The cost per rider sits over the target of the board.\n\nMarcus knows one rider from that stop. A dialysis tech clocks out of the South End night clinic. The tech has no car. The tech has a bad knee.\n\nA text from the union hall lights his phone. Three more clinic workers missed the last bus this week. The workers slept in a break room.\n\n## The bigger problem\n\nThe model trained on the weekday peaks and the Saturday ballgames. The night labor barely registers as demand.\n\nThe dispatch team can force a stop. Each force chips the on-time bonus that the agency promised to City Hall.\n\n## Your job\n\nHold the night stop for the clinic worker with no car.",
      stakeholder: "Marcus, bus scheduler and ATU member",
      crisisMeters: { local: { label: "Stranded Riders", description: "Stranded riders grow when clinic workers miss the last bus this week." }, global: { label: "Skipped Stops", description: "A skipped stop sends the 28 past Massachusetts Avenue at 1:14 a.m." }, support: { label: "Cost Targets", description: "A cost target labels the stop dead weight after two boardings in seven nights." } },
      suggested: ["ai", "networks", "computing", "transportation", "iot", "self-driving", "battery"],
      suggestedWhy: {
        "ai": "An ai plan can count night clinic riders before it labels a stop dead weight.",
        "networks": "A network can send the skip alert to the scheduler and the union hall.",
        "computing": "A computer can weigh two night boardings against the board cost target.",
        "transportation": "A bus plan can keep the 28 at Massachusetts Avenue at 1:14 a.m.",
        "iot": "A stop sensor can count a night boarding that weekday peaks miss.",
        "self-driving": "A self-driving bus can serve the night clinic stop when the 28 skips it.",
        "battery": "A battery bus can run the night route when ridership looks low.",
      },
      visionTheme: "coastal-city",
      rules: [
        {
          id: "cost-per-rider-target",
          kind: "policy",
          label: "Cost-per-rider target",
          body: "City Hall treats on-time bonuses and cost-per-boarding as the only score that matters. Forcing a stop costs the scheduler.",
          effects: ["eval-required", "backlash"],
        }
      ],
    }
  ],

  genocide: [
    {
      places: ["Goma Central Hospital Records Wing"],
      title: "Ward lists sold after midnight",
      summary: "Esperance Mukamana unlocks the metal cabinet on the maternity ward at 1:17 a.m. A stranger waits by the generator shed with cash for the night list. The name of her cousin is on the list. A copy of the list leaves through the back door.",
      scene:
        "Esperance Mukamana unlocks the metal cabinet at 1:17 a.m. The maternity ward list is still warm from the printer. She counts names in the same way that she counts pulses.\n\nA man she does not know waits by the generator shed. He holds a USB stick and a fold of cash. The night clerk sold the discharge file from last week.\n\nAt dawn, families come and ask for kin. The discharge notes say that the patients left in vans. The vans did not arrive at home.\n\nMilitia brokers pay for identity. They want a name, a ward, the ethnic box on the intake form, and a phone number for the next of kin. The hospital prints paper backups because the server dies when the grid dies. Those papers leave through the back door.\n\nThe ministry form still asks for tribe. The form stays the same after the last war. Clerks copy the box because the printer does not accept a blank field.\n\nTonight the name of her cousin sits on the maternity list. Esperance Mukamana can hide one sheet. She cannot hide the copy in the pocket of the clerk.",
      briefMd:
        "## The place\nEsperance Mukamana works the night shift in the records wing of Goma Central Hospital. She unlocks the metal cabinet at 1:17 a.m. The maternity ward list is still warm from the printer. She counts names in the same way that she counts pulses.\n\nA man she does not know waits by the generator shed. He holds a USB stick and a fold of cash. The night clerk sold the discharge file from last week.\n\nAt dawn, families come and ask for kin. The discharge notes say that the patients left in vans. The vans did not arrive at home.\n\nTonight the name of her cousin sits on the maternity list. Esperance Mukamana can hide one sheet. She cannot hide the copy in the pocket of the clerk.\n\n## The bigger problem\nMilitia brokers pay for identity. They want a name, a ward, the ethnic box on the intake form, and a phone number for the next of kin. The hospital prints paper backups because the server dies when the grid dies. Those papers leave through the back door.\n\nThe ministry form still asks for tribe. The form stays the same after the last war. Clerks copy the box because the printer does not accept a blank field.\n\n## Your job\nStop the sale of the maternity list through the back door.",
      stakeholder: "Night-shift nurse Esperance Mukamana",
      crisisMeters: { local: { label: "Missing kin", description: "Families come at dawn and ask for kin who left in vans." }, global: { label: "List sales", description: "Militia brokers buy names, wards, ethnic boxes, and phone numbers from paper backups." }, support: { label: "Night fear", description: "Esperance Mukamana fears the night because a copy of the list sits in the pocket of the clerk." } },
      suggested: ["ai", "networks", "crypto", "computing", "iot", "solar"],
      suggestedWhy: {
        "ai": "A check can flag a list copy before the copy leaves the records wing.",
        "networks": "A link can show when the night clerk sends the discharge file.",
        "crypto": "A lock can stop a stranger with a USB stick from a read of the list.",
        "computing": "A local store can keep the maternity list when the server dies with the grid.",
        "iot": "A sensor can record the open metal cabinet at 1:17 a.m.",
        "solar": "A panel can keep the printer and the server on when the grid dies.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Wau Relief Consignment Yard"],
      title: "Ration cards that starve a block",
      summary: "Nyibol Deng stands in the dust at the consignment yard with ration cards for her block. The tablet denies three houses after the last chief election. Tonight a widow on that list will walk to her door with two children.",
      scene:
        "Nyibol Deng stands in the dust at the consignment yard. She holds a stack of ration cards for her block. The truck from Juba is late again.\n\nWhen the truck comes, the clerk scans each card against a tablet. Three houses flash red. The tablet denies those houses.\n\nThose houses voted the wrong way in the last chief election. The children in those houses boiled the last sorghum. A small boy watches the scale from the tarp line. The clerk does not look up.\n\nThe card of Nyibol Deng is green. She can feed her compound. She cannot feed the red doors without a mark on the next cycle.\n\nThe relief agency gave verification to a local committee. The committee chair is the brother of the chief. He updates the ineligible list from a phone in a tea stall. Clan capture looks like a software update.\n\nTonight a widow on the red list will walk to the door of Nyibol Deng with two children. If Nyibol Deng shares food, her card goes red on the next cycle. If she does not share, the children do not eat.",
      briefMd:
        "## The place\nNyibol Deng stands in the dust at the Wau Relief Consignment Yard. She holds a stack of ration cards for her block. The truck from Juba is late again.\n\nWhen the truck comes, the clerk scans each card against a tablet. Three houses flash red. The tablet denies those houses. Those houses voted the wrong way in the last chief election.\n\nThe children in those houses boiled the last sorghum. A small boy watches the scale from the tarp line. The clerk does not look up.\n\nThe card of Nyibol Deng is green. She can feed her compound. She cannot feed the red doors without a mark on the next cycle. Tonight a widow on the red list will walk to her door with two children.\n\n## The bigger problem\nThe relief agency gave verification to a local committee. The committee chair is the brother of the chief. He updates the ineligible list from a phone in a tea stall. Clan capture looks like a software update.\n\nIf Nyibol Deng shares food, her card goes red on the next cycle. If she does not share, the children do not eat.\n\n## Your job\nStop the denial of ration cards after the chief election.",
      stakeholder: "Block leader Nyibol Deng",
      crisisMeters: { local: { label: "Hunger", description: "The children in the red houses boiled the last sorghum. A widow will walk to the door with two children." }, global: { label: "Card denial", description: "The tablet denies three houses that voted the wrong way in the last chief election." }, support: { label: "Clan capture", description: "The brother of the chief updates the ineligible list from a phone in a tea stall." } },
      suggested: ["drones", "networks", "ai", "space", "crypto", "solar"],
      suggestedWhy: {
        "drones": "A flight can show if the truck from Juba is late at the consignment yard.",
        "networks": "A link can show when the chair updates the ineligible list from a tea stall.",
        "ai": "A check can flag a red denial that follows the last chief election.",
        "space": "A sky view can track the truck from Juba on the road to the yard.",
        "crypto": "A seal can stop a phone in a tea stall from a false change to the list.",
        "solar": "A panel can keep the tablet and the scale on in the dust at the yard.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Prizren Municipal Scholarship Board"],
      title: "Tablets that fail one language",
      summary: "Lirije Krasniqi sets twelve tablets on the scholarship board table. Half of her students write in a language that the test does not accept. Tomorrow Arben will sit the exam. If the exam refuses his language, he loses the stipend.",
      scene:
        "Lirije Krasniqi sets twelve tablets on the scholarship board table. The exam app accepts one official language. Half of her students write in the other language. Their practice answers come back blank.\n\nThe board chair calls the exam app neutral. The ministry bought one language pack. A student who fails the exam app loses the stipend. The stipend keeps that student in school.\n\nLast year those students left for day labor. Some students did not come back after the summer checkpoints grew tight. Families did not send the younger students after that summer.\n\nA vendor sold the exam app with one language because the price was low. Board members who speak the official language renew the contract. The font setting enforces identity. The request for the other language pack stays in a drawer after the last election.\n\nA parent waits in the hallway with a folder of report cards. The tablet will not read the report cards.\n\nTomorrow Arben will sit the exam. If the tablet fails his language, he loses the stipend. His uncle offered him a ride north. A student with a stipend stays visible. Other students become names that a neighbor does not say.",
      briefMd:
        "## The place\nLirije Krasniqi sets twelve tablets on the table of the Prizren Municipal Scholarship Board. The exam app accepts one official language. Half of her students write in the other language. Their practice answers come back blank.\n\nA parent waits in the hallway with a folder of report cards. The tablet will not read the report cards.\n\nTomorrow Arben will sit the exam. If the tablet fails his language, he loses the stipend. His uncle offered him a ride north. A student with a stipend stays visible. Other students become names that a neighbor does not say.\n\n## The bigger problem\nThe board chair calls the exam app neutral. The ministry bought one language pack. A student who fails the exam app loses the stipend. The stipend keeps that student in school. Last year those students left for day labor. Some students did not come back after the summer checkpoints grew tight.\n\nFamilies did not send the younger students after that summer. A vendor sold the exam app with one language because the price was low. Board members who speak the official language renew the contract. The font setting enforces identity. The request for the other language pack stays in a drawer after the last election.\n\n## Your job\nKeep the stipend for a student who writes in the other language.",
      stakeholder: "Teacher Lirije Krasniqi",
      crisisMeters: { local: { label: "School bans", description: "The exam app accepts one official language and practice answers come back blank." }, global: { label: "Lost futures", description: "A student who fails the exam loses the stipend and can leave for day labor." }, support: { label: "Board capture", description: "Board members who speak the official language renew the contract after the last election." } },
      suggested: ["ai", "networks", "vr", "computing", "crypto", "iot"],
      suggestedWhy: {
        "ai": "A check can read answers in the other language on the exam app.",
        "networks": "A link can send the request for the other language pack out of the drawer.",
        "vr": "A practice space can let a student try the exam in the other language.",
        "computing": "A local app can accept the other language when the bought pack does not.",
        "crypto": "A seal can show that the board did not change the language pack after the election.",
        "iot": "A tablet link can read the report cards in the folder of the parent.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Sittwe Jetty Labor Desk"],
      title: "Crew badges that never return",
      summary: "Aung Myint stamps crew badges at the jetty labor desk before dawn. Nine crew badges hang unclaimed on the nail board. Families say that a patrol boat stopped the boats that did not come back. If the crew badge of his brother-in-law does not return, the household loses the rice allotment.",
      scene:
        "Aung Myint stamps crew badges at the jetty labor desk before dawn. Twelve boats are due back on the tide. Nine crew badges hang unclaimed on the nail board.\n\nFishers from the same quarter crewed the three boats that did not come back. The harbor master says weather. The families say that the patrol boat stopped the boats.\n\nSalt dries white on the rail. A woman counts boats in the same way that Aung Myint counts crew badges. She stops at nine.\n\nAung Myint has the paper log. He does not have the radio log. The radio sits in a locked cabinet. The labor desk cannot open that cabinet.\n\nA contractor issues the crew badges and also sells safe-passage stamps. Fishers who cannot pay still go out. Their crew badges stay on the rack. The contractor marks those fishers deserted. A deserted fisher has no claim. The family loses the rice allotment tied to a returned crew badge.\n\nTonight the brother-in-law of Aung Myint is on a late boat. If the crew badge does not return, the household loses the rice allotment. The name goes on the deserted list. Aung Myint can refuse the stamp for the crew tomorrow. He cannot feed the families of the fishers who did not come back.",
      briefMd:
        "## The place\nAung Myint stamps crew badges at the Sittwe Jetty Labor Desk before dawn. Twelve boats are due back on the tide. Nine crew badges hang unclaimed on the nail board.\n\nFishers from the same quarter crewed the three boats that did not come back. The harbor master says weather. The families say that the patrol boat stopped the boats. Salt dries white on the rail. A woman counts boats in the same way that Aung Myint counts crew badges. She stops at nine.\n\nAung Myint has the paper log. He does not have the radio log. The radio sits in a locked cabinet. The labor desk cannot open that cabinet.\n\nTonight the brother-in-law of Aung Myint is on a late boat. If the crew badge does not return, the household loses the rice allotment. The name goes on the deserted list. Aung Myint can refuse the stamp for the crew tomorrow. He cannot feed the families of the fishers who did not come back.\n\n## The bigger problem\nA contractor issues the crew badges and also sells safe-passage stamps. Fishers who cannot pay still go out. Their crew badges stay on the rack. The contractor marks those fishers deserted. A deserted fisher has no claim. The family loses the rice allotment tied to a returned crew badge.\n\n## Your job\nKeep the rice allotment when a crew badge does not return.",
      stakeholder: "Jetty steward Aung Myint",
      crisisMeters: { local: { label: "Missing fishers", description: "Nine crew badges hang unclaimed and families say a patrol boat stopped the boats." }, global: { label: "Hunger", description: "The family loses the rice allotment when a crew badge does not return." }, support: { label: "Badge rackets", description: "A contractor sells safe-passage stamps and marks unpaid fishers deserted." } },
      suggested: ["drones", "networks", "ai", "space", "transportation", "iot"],
      suggestedWhy: {
        "drones": "A flight can look for the three boats that did not come back on the tide.",
        "networks": "A link can share the radio log that sits in the locked cabinet.",
        "ai": "A check can flag a deserted mark that follows an unpaid stamp.",
        "space": "A sky view can show if a patrol boat stopped the boats.",
        "transportation": "A boat track can show which crew did not come back on the tide.",
        "iot": "A sensor on the nail board can record a crew badge that stays unclaimed.",
      },
      visionTheme: "ocean-city",
    }
  ],

  poverty: [
    {
      places: ["Sorting Lane"],
      title: "The tip owns the pickers on Sorting Lane",
      summary: "Rina puts her last sack on the official scale on Sorting Lane. The clerk knocks the needle back. The clerk writes a lower weight. A departure from this lane gives her pile to the next picker by morning.",
      scene:
        "Rina puts her last sack on the official scale before the sun clears the ridge of plastic. The needle jumps. The clerk knocks the needle back with a thumb. The clerk writes a lower weight. Rina walks Sorting Lane from the age of twelve. The tip owns the scale.\n\nThe cooperative hung its own beam last month. The yard boss padlocked the beam by noon. A picker loses the lane pass after a weigh on a different scale. The loss of a pass means no plastic and no rice.\n\nThe city sold the dump to one contractor. The contractor rents the lanes. The contractor sets the buy price after the trucks leave. The contractor pays the pickers in chits. Only his shop honors the chits. Families eat the stock from that shop.\n\nA late opening of the shop leaves the pots empty. The youngest child of Rina coughs in the night from the burn piles. Rina can skip a meal. The child cannot skip the air. A departure from this lane gives her pile to the next picker by morning.",
      briefMd:
        "## The place\n\nRina puts her last sack on the official scale before the sun clears the ridge of plastic. The needle jumps. The clerk knocks the needle back with a thumb. The clerk writes a lower weight. Rina walks Sorting Lane from the age of twelve. The tip owns the scale.\n\nThe cooperative hung its own beam last month. The yard boss padlocked the beam by noon. A picker loses the lane pass after a weigh on a different scale. The loss of a pass means no plastic and no rice.\n\nThe youngest child of Rina coughs in the night from the burn piles. Rina can skip a meal. The child cannot skip the air. A departure from this lane gives her pile to the next picker by morning.\n\n## The bigger problem\n\nThe city sold the dump to one contractor. The contractor rents the lanes. The contractor sets the buy price after the trucks leave. The contractor pays the pickers in chits. Only his shop honors the chits. Families eat the stock from that shop.\n\nA late opening of the shop leaves the pots empty.\n\n## Your job\n\nRecord a true sack weight for each picker and keep the lane pass.",
      stakeholder: "Waste picker cooperative",
      crisisMeters: { local: { label: "Empty Meals", description: "A cut in the sack weight cuts the rice in the pots on Sorting Lane." }, global: { label: "Scale Grip", description: "The contractor controls the scale, the lane rent, and the shop chits." }, support: { label: "Sick Kids", description: "The burn piles make the youngest child of Rina cough in the night." } },
      suggested: ["networks", "crypto", "ai", "iot", "print3d", "solar", "battery", "transportation"],
      suggestedWhy: {
        "networks": "A network can show the true sack weight to the cooperative on Sorting Lane.",
        "crypto": "A shared record can hold the sack weight so the clerk cannot cut it.",
        "ai": "A check can compare the scale reading with the sack on Sorting Lane.",
        "iot": "A sensor can read the sack weight on the official scale.",
        "print3d": "A printed part can make a beam scale for the cooperative on Sorting Lane.",
        "solar": "Solar power can run a cooperative scale when the yard has no grid power.",
        "battery": "A battery can run the cooperative scale after the yard boss locks the beam.",
        "transportation": "A cart can move a sack to a fair scale and back to the lane.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Dust Ridge"],
      title: "Advance pay chains the kiln on Dust Ridge",
      summary: "Lalita unfolds the cloth with the rice for the week on Dust Ridge. Fourteen families came to the kiln circle. Only a member who refuses a new advance can draw from the pot. The children from the lower sheds stand in the dust with empty tins.",
      scene:
        "Lalita unfolds the cloth with the rice for the week. Lalita counts bowls for the kiln circle. Twelve families signed the mutual book. Fourteen families came. Two extra families walked up from the lower sheds. The boss does not allow meetings in the lower sheds.\n\nLalita wants to feed the two extra families. The circle voted last month. Only a member who refuses a new advance can draw from the pot. The lower-shed families took advances yesterday. The children from the lower sheds stand in the dust with empty tins.\n\nThe kiln hires by household. A father loses the next firing slot after he joins the circle. The cousins of that father then take his place and his debt. Trust on the ridge is a ration. A share of the pot breaks the books. A closed pot leaves the left-out children with smoke.\n\nThe girl of Lalita waits at the edge of the circle. The girl is old enough to carry bricks. The boss offered an advance in the name of the girl.",
      briefMd:
        "## The place\n\nLalita unfolds the cloth with the rice for the week. Lalita counts bowls for the kiln circle. Twelve families signed the mutual book. Fourteen families came. Two extra families walked up from the lower sheds. The boss does not allow meetings in the lower sheds.\n\nLalita wants to feed the two extra families. The circle voted last month. Only a member who refuses a new advance can draw from the pot. The lower-shed families took advances yesterday. The children from the lower sheds stand in the dust with empty tins.\n\nThe girl of Lalita waits at the edge of the circle. The girl is old enough to carry bricks. The boss offered an advance in the name of the girl.\n\n## The bigger problem\n\nThe kiln hires by household. A father loses the next firing slot after he joins the circle. The cousins of that father then take his place and his debt. Trust on the ridge is a ration. A share of the pot breaks the books. A closed pot leaves the left-out children with smoke.\n\n## Your job\n\nKeep the rice pot for each kiln family without a new child advance.",
      stakeholder: "Kiln workers’ mutual aid circle",
      crisisMeters: { local: { label: "Bonded Debt", description: "A new advance binds a household to the kiln on Dust Ridge." }, global: { label: "Boss Books", description: "The boss uses the firing slot and the debt to break the circle." }, support: { label: "Lung Trouble", description: "The left-out children breathe kiln smoke when the pot stays closed." } },
      suggested: ["solar", "battery", "networks", "crypto", "ai", "materials", "computing", "iot"],
      suggestedWhy: {
        "solar": "Solar heat can dry bricks so a household does not take a new advance.",
        "battery": "A battery can run a small fan and cut smoke for the kiln children.",
        "networks": "A network can show the mutual book to each family on Dust Ridge.",
        "crypto": "A shared record can show an advance so the boss cannot hide the debt.",
        "ai": "A check can flag a new advance before the circle opens the pot.",
        "materials": "A safer brick mix can cut dust for the workers on Dust Ridge.",
        "computing": "A small computer can keep the mutual book when the boss blocks a meeting.",
        "iot": "A sensor can count the bowls and the rice for the kiln circle.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Hill Signal"],
      title: "Tuition dies when the mast fails in Hill Signal",
      summary: "Sita waits on the stone step in Hill Signal for the exam packet. The mast on the ridge is dark again. Three girls sit with closed notebooks. The three girls paid the tuition for this month in airtime.",
      scene:
        "Sita opens the school laptop on the stone step. Sita waits for the bar to fill. The mast on the ridge is dark again. The exam packet will not download. Three girls sit with closed notebooks. The three girls paid the tuition for this month in airtime.\n\nThe teacher network bought a shared dongle last term. The mast owner cut the village plan. The mast owner sold only daily packs. A family can buy a top-up after a walk to the junction. A family on the far slope cannot buy a top-up. Class becomes a roll call of bars.\n\nThe district pays the school by attendance in an online log. A dark mast leaves the log blank. A blank log stops the stipend. The teachers collect tuition in data scratch cards because the cash grant is late. The same company rents the mast and sells the cards. A failed tower leaves the debt in place.\n\nThe nephew of Sita failed the board last year. The nephew missed the upload window. The mother of the nephew owes two packs. The mother will not send the nephew this week.",
      briefMd:
        "## The place\n\nSita opens the school laptop on the stone step. Sita waits for the bar to fill. The mast on the ridge is dark again. The exam packet will not download. Three girls sit with closed notebooks. The three girls paid the tuition for this month in airtime.\n\nThe teacher network bought a shared dongle last term. The mast owner cut the village plan. The mast owner sold only daily packs. A family can buy a top-up after a walk to the junction. A family on the far slope cannot buy a top-up. Class becomes a roll call of bars.\n\nThe nephew of Sita failed the board last year. The nephew missed the upload window. The mother of the nephew owes two packs. The mother will not send the nephew this week.\n\n## The bigger problem\n\nThe district pays the school by attendance in an online log. A dark mast leaves the log blank. A blank log stops the stipend. The teachers collect tuition in data scratch cards because the cash grant is late. The same company rents the mast and sells the cards. A failed tower leaves the debt in place.\n\n## Your job\n\nKeep the exam packet and the school stipend when the mast is dark.",
      stakeholder: "Village teachers’ network",
      crisisMeters: { local: { label: "Missed Classes", description: "A dark mast stops the exam packet for the three girls." }, global: { label: "Mast Monopoly", description: "The mast owner holds the village plan and the scratch cards." }, support: { label: "Data Debt", description: "The mother of the nephew owes two packs after a missed upload." } },
      suggested: ["networks", "solar", "battery", "ai", "computing", "vr", "space", "crypto"],
      suggestedWhy: {
        "networks": "A local network can move the exam packet when the ridge mast is dark.",
        "solar": "Solar power can run the school laptop on the stone step.",
        "battery": "A battery can keep the laptop on when the mast is dark.",
        "ai": "A lesson tool can help the three girls when the exam packet does not arrive.",
        "computing": "A local computer can store the exam packet before the mast goes dark.",
        "vr": "A local lesson view can continue the class when the mast is dark.",
        "space": "A sky link can carry the exam packet when the ridge mast is dark.",
        "crypto": "A shared record can show attendance when the online log stays blank.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Ferry Slip"],
      title: "Dawn fares strand the cleaners at Ferry Slip",
      summary: "Nila writes a passenger list in chalk on the slip wall at Ferry Slip. The clerk laughed. The clerk pointed at the tourist tariff board. The daughter of Nila sleeps on a folded tarp behind the fish ice until Nila returns.",
      scene:
        "Nila writes a passenger list in chalk on the slip wall. Nila writes the list before the hotel vans dump the night crew. Nila does not sell seats. Nila records the cleaners who must stand at the far stair before school opens. The boatmen hate the list. The list makes the surge obvious.\n\nNila asked the pier office last week for a stamp on the list as a worker crossing. The clerk laughed. The clerk pointed at the tourist tariff board. A launch owner offered to sponsor the list. The offer holds only if the association sends every cleaner to his boat. The offer is a new boss and not a crossing.\n\nThe hotels want clean floors by dawn. The hotels pay cash at the service door. The hotels pay nothing for the water. The city rents the pier to the highest launch bid. Dawn joins the hotel clock and the ferry clock. The fare becomes a tax on the trip home.\n\nThe daughter of Nila is seven. The daughter sleeps on a folded tarp behind the fish ice until Nila returns. One late boat lets the stall owner unlock the street. The chalk list did not buy a cheaper ticket. The chalk list made the squeeze visible.",
      briefMd:
        "## The place\n\nNila writes a passenger list in chalk on the slip wall. Nila writes the list before the hotel vans dump the night crew. Nila does not sell seats. Nila records the cleaners who must stand at the far stair before school opens. The boatmen hate the list. The list makes the surge obvious.\n\nThe daughter of Nila is seven. The daughter sleeps on a folded tarp behind the fish ice until Nila returns. One late boat lets the stall owner unlock the street. The chalk list did not buy a cheaper ticket. The chalk list made the squeeze visible.\n\n## The bigger problem\n\nNila asked the pier office last week for a stamp on the list as a worker crossing. The clerk laughed. The clerk pointed at the tourist tariff board. A launch owner offered to sponsor the list. The offer holds only if the association sends every cleaner to his boat. The offer is a new boss and not a crossing.\n\nThe hotels want clean floors by dawn. The hotels pay cash at the service door. The hotels pay nothing for the water. The city rents the pier to the highest launch bid. Dawn joins the hotel clock and the ferry clock. The fare becomes a tax on the trip home.\n\n## Your job\n\nSet a fair dawn crossing for the night cleaners at Ferry Slip.",
      stakeholder: "Cross-water night workers’ association",
      crisisMeters: { local: { label: "Stranded Nights", description: "A high dawn fare strands the night cleaners on the slip." }, global: { label: "Pier Fees", description: "The city rents the pier to the highest launch bid." }, support: { label: "Child Risk", description: "A late boat leaves the daughter of Nila on the street." } },
      suggested: ["transportation", "solar", "battery", "networks", "iot", "ai", "crypto", "drones"],
      suggestedWhy: {
        "transportation": "A small boat plan can move the night cleaners before school opens.",
        "solar": "Solar power can light the slip wall for the chalk list at dawn.",
        "battery": "A battery can power a lamp on the slip before the hotel vans come.",
        "networks": "A network can share the passenger list without a new launch boss.",
        "iot": "A sensor can count the cleaners on the slip before the boats leave.",
        "ai": "A simple plan can match cleaners to boats before the dawn surge.",
        "crypto": "A shared record can hold the crossing list so the clerk cannot ignore it.",
        "drones": "A small craft can carry a note across the water when a boat is late.",
      },
      visionTheme: "coastal-city",
    }
  ],

  "chem-bio": [
    {
      places: ["Weftbridge Dyeworks Row"],
      title: "Second-use blues on the dye row",
      summary: "Rina Mercado holds a stained tissue to the face of Luis on the Weftbridge loading dock. The clipboard shows the third nosebleed since lunch. The wrong leftover drum makes the floor sicker.",
      scene:
        "Rina Mercado holds a stained tissue to the face of Luis on the Weftbridge loading dock. The bleed does not slow. Indigo dust coats his mustache. The clipboard shows the third nosebleed since lunch.\n\nThe dock clerk slides a crumpled manifest to Rina Mercado. The drums carry a mordant blend mark for textile use. The lot numbers do not match the mill book. The mismatch happens on Tuesdays when the reseller truck comes.\n\nA man two towns over buys leftovers from dye houses, a shuttered plating shop, and a lab that lost its lease. He sells the leftovers at a low price to Weftbridge. Profit color is necessary for the row. The man wants no questions and a fast unload. Second-use is the whole trade.\n\nRina Mercado walks the aisle after the whistle. A cracked seal weeps onto the concrete. The smell is sweet and wrong for indigo. The night pourer went home with a blistered wrist and a headache. He called the headache usual.\n\nThe wrong leftover makes the floor sicker. The street also holds a stockpile that no person can name.",
      briefMd:
        "## The place\n\nRina Mercado holds a stained tissue to the face of Luis on the Weftbridge loading dock. The bleed does not slow. Indigo dust coats his mustache. The clipboard shows the third nosebleed since lunch.\n\nThe dock clerk slides a crumpled manifest to Rina Mercado. The drums carry a mordant blend mark for textile use. The lot numbers do not match the mill book. The mismatch happens on Tuesdays when the reseller truck comes.\n\nRina Mercado walks the aisle after the whistle. A cracked seal weeps onto the concrete. The smell is sweet and wrong for indigo. The night pourer went home with a blistered wrist and a headache. He called the headache usual.\n\n## The bigger problem\n\nA man two towns over buys leftovers from dye houses, a shuttered plating shop, and a lab that lost its lease. He sells the leftovers at a low price to Weftbridge. Profit color is necessary for the row. The man wants no questions and a fast unload. Second-use is the whole trade.\n\nThe wrong leftover makes the floor sicker. The street also holds a stockpile that no person can name.\n\n## Your job\n\nProve a drum before a worker gets sick.",
      stakeholder: "Rina Mercado, row occupational health advocate",
      crisisMeters: { local: { label: "Nosebleeds", description: "Nosebleeds hit dock workers after indigo dust and a sweet leak on the row." }, global: { label: "Grey drums", description: "Grey drums of unnamed leftovers arrive by the pallet from a reseller." }, support: { label: "Seal lag", description: "A cracked seal weeps on the concrete before a person checks the drum." } },
      suggested: ["iot", "ai", "materials", "networks", "drones", "computing", "robots", "nano"],
      suggestedWhy: {
        "iot": "A sensor can warn the row when a drum seal weeps a sweet vapor.",
        "ai": "A model can mark lot numbers that do not match the mill book.",
        "materials": "A test material can show that a drum is not a textile mordant.",
        "networks": "A shared record can show the Tuesday reseller route to the dock.",
        "drones": "A small aircraft can scan pallet seals on the dock after the whistle.",
        "computing": "A program can compare drum lot numbers with the mill book.",
        "robots": "A machine can sample a cracked seal without a bare wrist.",
        "nano": "A fine sensor can detect a vapor that is wrong for indigo.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Stonepass Border Dry Port"],
      title: "Lab kits under the wrong code",
      summary: "Jonas Veld stands under the sodium lights with a plastic tray in his hands. Blisters mark a wet line on the forearm of Farid. The school did not order a kit, and the bay is full of identical sealed trays.",
      scene:
        "Jonas Veld stands under the sodium lights with a plastic tray in his hands. The night crew cut the tape because the tape looked cheap. The label says classroom microscopy kit. Blisters mark a wet line on the forearm of Farid. Farid is a temp handler.\n\nThe day chemist went home. The port scanner flags only codes on its fear list. School-science kits move on the cheap lane. Supervisors tell the night desk not to hold the trucks.\n\nJonas Veld phones the consignee. The consignee uses a rented mailbox in a strip mall. Jonas Veld phones the school on the form. The science chair did not order a kit.\n\nFarid asks whether he must wash or wait. The incident form does not use his language. The nurse station is locked. The dry port lives on minutes. Brokers learn the words that the night desk will wave through. Lift personnel are the last personnel that a desk asks.\n\nThe leak finds those personnel first. Jonas Veld has one burned worker. The bay is full of identical sealed trays.",
      briefMd:
        "## The place\n\nJonas Veld stands under the sodium lights at Stonepass Border Dry Port with a plastic tray in his hands. The night crew cut the tape because the tape looked cheap. The label says classroom microscopy kit. Blisters mark a wet line on the forearm of Farid.\n\nThe day chemist went home. The port scanner flags only codes on its fear list. School-science kits move on the cheap lane. Supervisors tell the night desk not to hold the trucks.\n\nFarid asks whether he must wash or wait. The incident form does not use his language. The nurse station is locked. The dry port lives on minutes.\n\n## The bigger problem\n\nJonas Veld phones the consignee. The consignee uses a rented mailbox in a strip mall. The science chair did not order a kit. Brokers learn the words that the night desk will wave through. Lift personnel are the last personnel that a desk asks. The leak finds those personnel first.\n\nJonas Veld has one burned worker. The bay is full of identical sealed trays.\n\n## Your job\n\nStop a false kit label before another handler gets burns.",
      stakeholder: "Jonas Veld, dry-port customs liaison",
      crisisMeters: { local: { label: "Handler burns", description: "Handler burns mark Farid after he opens a cheap tray at the dry port." }, global: { label: "False labels", description: "False labels send sealed trays through the cheap lane at night." }, support: { label: "Night gaps", description: "Night gaps leave the chemist gone and the nurse station locked." } },
      suggested: ["ai", "iot", "drones", "networks", "crypto", "computing", "transportation", "robots"],
      suggestedWhy: {
        "ai": "A model can compare a kit label with a school order before tape is cut.",
        "iot": "A sensor can warn the night desk when a tray vapor is wrong.",
        "drones": "A small aircraft can watch identical sealed trays in the bay.",
        "networks": "A link can show a school denial to the night desk before a truck moves.",
        "crypto": "A signed mark can show that the school did not order the kit.",
        "computing": "A program can flag a mailbox consignee and a false school form.",
        "transportation": "A hold step can keep a cheap-lane truck until a chemist looks.",
        "robots": "A machine can open a suspect tray when the nurse station is locked.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Lowfen Municipal Waterworks"],
      title: "What the outfall never names",
      summary: "Marta Singh pins another clinic slip to the lab wall at Lowfen Waterworks. A child on Reed Street cannot keep water down. The panel reads clean, and a mother waits in the clinic with a bucket.",
      scene:
        "Marta Singh pins another clinic slip to the lab wall at Lowfen Waterworks. The slip names a child on Reed Street. The child has cramps and a fever. The child cannot keep water down.\n\nThe certified panel reads clean again. Chlorine is fine. Coliform is fine. Marta Singh does not get pay to hunt a harm that the permit does not name. The plant tests the list that the county bought.\n\nA contract fermenter and a pesticide shop share a ditch upstream. Their paperwork says process water. The paperwork says nothing else.\n\nMarta Singh tries a different read. She treats the town as the instrument. Each pin is a body. The pins do not cluster at her plant. The pins follow the old ditch line behind the industrial lots.\n\nThe county wants a named compound before the county will close a valve. The university freezer is full. Off-panel work waits six weeks.\n\nA mother sits in the clinic hallway with a bucket in her lap. The outfall has no word for the substance that left the ditch.",
      briefMd:
        "## The place\n\nMarta Singh pins another clinic slip to the lab wall at Lowfen Waterworks. The slip names a child on Reed Street. The child has cramps and a fever. The child cannot keep water down.\n\nThe certified panel reads clean again. Chlorine is fine. Coliform is fine. The plant tests the list that the county bought.\n\nThe pins do not cluster at her plant. The pins follow the old ditch line behind the industrial lots. A mother sits in the clinic hallway with a bucket in her lap.\n\n## The bigger problem\n\nMarta Singh does not get pay to hunt a harm that the permit does not name. A contract fermenter and a pesticide shop share a ditch upstream. Their paperwork says process water. The paperwork says nothing else.\n\nThe county wants a named compound before the county will close a valve. The university freezer is full. Off-panel work waits six weeks. The outfall has no word for the substance that left the ditch.\n\n## Your job\n\nName the ditch harm before another child gets sick.",
      stakeholder: "Marta Singh, works lab supervisor",
      crisisMeters: { local: { label: "Gut sickness", description: "Gut sickness hits a child on Reed Street who cannot keep water down." }, global: { label: "Blind outfall", description: "The blind outfall carries a ditch substance that the permit does not name." }, support: { label: "Sample pile", description: "The sample pile waits six weeks while the university freezer is full." } },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "synbio", "drones"],
      suggestedWhy: {
        "gene-sequencing": "A sequence read can show a ditch harm that the county panel does not name.",
        "iot": "A ditch sensor can warn Marta Singh when the outfall changes.",
        "ai": "A model can cluster clinic pins along the old ditch line.",
        "networks": "A shared map can link clinic slips with upstream process water sites.",
        "materials": "A test material can show a harm that chlorine and coliform tests miss.",
        "computing": "A program can track clinic pins against the old ditch line.",
        "synbio": "A contained test can show a ditch harm without a new permit name.",
        "drones": "A small aircraft can inspect the ditch line behind the industrial lots.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Cedar Contract Vivarium Park"],
      title: "Loaner strains after closing time",
      summary: "Dr. Noah Abebe finds a cage card on the hallway floor after lockup at Cedar Park. The mice from Lab C sit on the Lab F rack. Two animal-care staff called in with fevers this week.",
      scene:
        "Dr. Noah Abebe finds a cage card on the hallway floor after lockup at Cedar Park. The strain code belongs to Lab C. The mice sit on the Lab F rack. Lab C and Lab F went dark two hours ago.\n\nA night tech had a deadline. Small contracts survive when a tech borrows a lineage. The logbook shows a blank line and a coffee ring.\n\nTwo animal-care staff called in with fevers this week. The clinic across the road asked if a sickness moves in the park. A neighbor taped a note to the gate. The note says that the neighbor hears the fans at 2 a.m. The note says that the neighbor does not know the contents.\n\nDr. Noah Abebe can lock a door. He cannot lock a favor economy. Cheap leases depend on that economy. The park sells shared space. Shared space sells speed. Speed sells the loan.",
      briefMd:
        "## The place\n\nDr. Noah Abebe finds a cage card on the hallway floor after lockup at Cedar Park. The strain code belongs to Lab C. The mice sit on the Lab F rack. Lab C and Lab F went dark two hours ago.\n\nThe logbook shows a blank line and a coffee ring. Two animal-care staff called in with fevers this week. The clinic across the road asked if a sickness moves in the park.\n\nA neighbor taped a note to the gate. The note says that the neighbor hears the fans at 2 a.m. The note says that the neighbor does not know the contents.\n\n## The bigger problem\n\nA night tech had a deadline. Small contracts survive when a tech borrows a lineage. Dr. Noah Abebe can lock a door. He cannot lock a favor economy. Cheap leases depend on that economy.\n\nThe park sells shared space. Shared space sells speed. Speed sells the loan.\n\n## Your job\n\nStop an unsafe strain loan and keep the paid work alive.",
      stakeholder: "Dr. Noah Abebe, vivarium biosafety officer",
      crisisMeters: { local: { label: "Staff fevers", description: "Staff fevers hit two animal-care personnel this week after a night loan." }, global: { label: "Strain sharing", description: "Strain sharing moves mice from Lab C to the Lab F rack after lockup." }, support: { label: "Neighbor fear", description: "Neighbor fear grows when fans run at 2 a.m. and contents stay unknown." } },
      suggested: ["gene-sequencing", "synbio", "ai", "iot", "networks", "crypto", "computing", "vr"],
      suggestedWhy: {
        "gene-sequencing": "A sequence check can show that a rack strain does not match the cage card.",
        "synbio": "A contained ID test can show a Lab C strain on the Lab F rack.",
        "ai": "A model can flag a blank log line after a night loan.",
        "iot": "A rack sensor can show a cage move after lockup.",
        "networks": "A shared log can show a loan between Lab C and Lab F.",
        "crypto": "A signed cage card can show that a strain did not get loan approval.",
        "computing": "A program can block a blank loan line in the logbook.",
        "vr": "A training view can show personnel the risk of a night strain loan.",
      },
      visionTheme: "learn-city",
    }
  ],

  asteroid: [
    {
      places: ["Sutherland Sky Belt, Northern Cape"],
      title: "Mine glare blanks the Karoo rock watch",
      summary: "Naledi Mokoena kills the lodge porch light and steps into the Karoo night. She logs a white smear in place of the Milky Way. The iron pit on the ridge leaves the flood banks on again. Her best rooms stay empty through festival week. Those lamps still cover the rent of her cousin.",
      scene:
        "Naledi Mokoena kills the lodge porch light and steps into the Karoo night. She must log the Milky Way for the guests of the next day. She logs a white smear. The new iron pit on the ridge leaves the flood banks on again.\n\nThe survey telescope two kilometers upslope sweeps the sky. The telescope hunts the big near-Earth rocks. An early sight of those rocks gives cities years to move. Her phone buzzes with rejected frames. The night is unusable.\n\nThe mine adds a third shift because the ore contract pays a night premium. The provincial lighting permit files skyglow under nuisance, next to barking dogs. The three best rooms stay empty through the dark-sky festival week. Sutherland High cancels the science-club campout.\n\nHer cousin starts work at the pit at ten. Those lamps cover his rent. The same lamps erase the frames. Those frames buy Earth time.\n\nNaledi Mokoena can walk a complaint to the municipal office at dawn. The mine can walk an extension to the same counter. A stone that is out there walks nowhere.",
      briefMd:
        "## The place\nNaledi Mokoena is the community dark-sky coordinator at a lodge in the Sutherland Sky Belt, Northern Cape. She kills the porch light and steps into the Karoo night. She logs a white smear. The new iron pit on the ridge leaves the flood banks on again.\n\nA survey telescope two kilometers upslope sweeps the sky for big near-Earth rocks. Her phone buzzes with rejected frames. The night is unusable.\n\nThe three best rooms stay empty through the dark-sky festival week. Sutherland High cancels the science-club campout. Her cousin starts work at the pit at ten. The lamps cover his rent.\n\n## The bigger problem\nThe mine adds a third shift because the ore contract pays a night premium. The provincial lighting permit files skyglow under nuisance, next to barking dogs. The lamps erase the frames that buy Earth time.\n\nNaledi Mokoena can walk a complaint to the municipal office at dawn. The mine can walk an extension to the same counter. A stone that is out there walks nowhere.\n\n## Your job\nHold a dark night that pays the town and still shows a rock in time.",
      stakeholder: "Naledi Mokoena, community dark-sky coordinator",
      crisisMeters: { local: { label: "Empty Lodges", description: "The three best rooms at the lodge stay empty through the dark-sky festival week." }, global: { label: "Sky Glare", description: "Flood light from the iron pit turns the survey sky into a white smear." }, support: { label: "Permit Lock", description: "The provincial lighting permit files skyglow under nuisance, next to barking dogs." } },
      suggested: ["space", "ai", "computing", "networks", "iot", "drones", "solar", "battery"],
      suggestedWhy: {
        "space": "A space watch can turn a dark Karoo frame into early warning for a near-Earth rock.",
        "ai": "An ai check can flag glare in a frame before the night log fails.",
        "computing": "Lodge computing can sort rejected frames on the same night.",
        "networks": "A network can carry a glare note from the ridge to the municipal office.",
        "iot": "An iot sensor can show when the flood banks stay on.",
        "drones": "A drone can map ridge skyglow without a new road.",
        "solar": "Solar power can cut the night premium that keeps the flood banks on.",
        "battery": "A battery can store day power so the pit lamps stay dark.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Goldstone Antelope Valley rim, California"],
      title: "Dish backlog leaves the valley guessing",
      summary: "Rosa Delgado parks on the gravel berm above Goldstone and watches Dish 14 stay frozen. Her four-hour civil slot goes to a noon handover. The liaison line is a recorded message at this time. In Boron, parents keep children in. The next county notice will stay facedown.",
      scene:
        "Rosa Delgado parks on the gravel berm above Goldstone and watches Dish 14 stay frozen. She holds the four-hour civil slot in writing. The slot goes to a Mars orbiter handover at noon. Her liaison line is a recorded message at this time.\n\nIn Boron that morning the elementary school sends a note home about a rock near Earth. Parents keep children in. The rock will miss. The rock missed before. On more kitchen counters the next county notice will stay facedown.\n\nPersonnel raise the big dishes to talk to spacecraft. A standing watch on stones is leftover time. A gearbox seizure sends the spare into a parts queue. The queue runs on fiscal quarters.\n\nRosa Delgado turns scraps of minutes into a sentence. A superintendent can read the sentence and keep a classroom open. In the grocery line a farmworker asks if the last alert was real. Rosa Delgado starts an answer. She lets the answer die.\n\nThe valley learns to shrug. A shrug is how a true warning fails.",
      briefMd:
        "## The place\nRosa Delgado is the civil tracking liaison on the Goldstone Antelope Valley rim in California. She parks on the gravel berm above Goldstone. Dish 14 stays frozen. Her four-hour civil slot goes to a Mars orbiter handover at noon. Her liaison line is a recorded message at this time.\n\nIn Boron that morning the elementary school sends a note home about a rock near Earth. Parents keep children in. The rock will miss. The rock missed before.\n\n## The bigger problem\nPersonnel raise the big dishes to talk to spacecraft. A standing watch on stones is leftover time. A seized gearbox sends the spare into a parts queue that runs on fiscal quarters.\n\nThe valley learns to shrug. A shrug is how a true warning fails. On more kitchen counters the next county notice will stay facedown.\n\n## Your job\nGive the valley one clear track number before a school stays closed for a miss.",
      stakeholder: "Rosa Delgado, civil tracking liaison",
      crisisMeters: { local: { label: "Track Gaps", description: "Parents in Boron keep children in after a school note about a rock near Earth." }, global: { label: "Dish Queue", description: "Dish 14 stays frozen while the civil slot sits in a fiscal parts queue." }, support: { label: "Worn Alerts", description: "The next county notice will stay facedown because old alerts wore trust out." } },
      suggested: ["space", "ai", "networks", "computing", "iot", "robots", "materials", "print3d"],
      suggestedWhy: {
        "space": "A space slot can give civil tracking a dish hour before a school note goes home.",
        "ai": "An ai line can turn a short track into a sentence a superintendent can read.",
        "networks": "A network can replace the recorded liaison line with a live civil slot.",
        "computing": "Computing can build a clear track number from scraps of dish minutes.",
        "iot": "An iot sensor on the dish can show a frozen gearbox before the slot dies.",
        "robots": "A robot arm can swap a seized gearbox part before a fiscal quarter ends.",
        "materials": "A tough material can keep a dish gearbox alive through a long watch.",
        "print3d": "A printed spare can enter the pad before a fiscal quarter closes the queue.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Maunakea access communities, Hawaiʻi Island"],
      title: "Time-share freeze after every rock scare",
      summary: "Kainoa Hale sets a folding table in the Maunakea visitor-center lot and opens a paper calendar. The access gate is chained after the bulletin from last Tuesday locked the mid-sized dome. Two kūpuna drove the Saddle Road in the dark and turned around at the chain.",
      scene:
        "Kainoa Hale sets a folding table in the Maunakea visitor-center lot and opens a paper calendar. He rules each night in two colors. Blue marks the rock survey. Green marks the cultural practitioners from the lock last week. He tries to rename a freeze as a share. The wind lifts a corner and nobody sits.\n\nThe access gate is chained. Last Tuesday a bulletin about a rock near Earth triggered a priority lock. An international team took the mid-sized dome. Two kūpuna drove the Saddle Road in the dark and turned around at the chain.\n\nAfter every scare the time-share stops. Night techs in Hilo lose the pay differential that covers rent. The mountain becomes a place taken. The survey lead says a rock big enough to break a city does not wait on a ceremony. A practitioner says a mountain that opens only for alarms is gone.\n\nThe split of Kainoa Hale was a new move. The split did not survive the parking lot. He folds the unused calendar. The next bulletin is in draft on his laptop.",
      briefMd:
        "## The place\nKainoa Hale is the summit operations mediator for the Maunakea access communities on Hawaiʻi Island. He sets a folding table in the visitor-center lot and opens a paper calendar. He rules each night in two colors. Blue marks the rock survey. Green marks the cultural practitioners from the lock last week.\n\nThe access gate is chained. Last Tuesday a bulletin about a rock near Earth triggered a priority lock. An international team took the mid-sized dome. Two kūpuna drove the Saddle Road in the dark and turned around at the chain.\n\n## The bigger problem\nAfter every scare the time-share stops. Night techs in Hilo lose the pay differential that covers rent. The mountain becomes a place taken. The survey lead says a rock big enough to break a city does not wait on a ceremony. A practitioner says a mountain that opens only for alarms is gone.\n\nThe split of Kainoa Hale did not survive the parking lot. He folds the unused calendar. The next bulletin is in draft on his laptop.\n\n## Your job\nKeep this road open for the rock watch and for the personnel who know the gate.",
      stakeholder: "Kainoa Hale, summit operations mediator",
      crisisMeters: { local: { label: "Closed Domes", description: "The chained gate keeps the mid-sized dome closed to cultural practitioners." }, global: { label: "Scare Locks", description: "Each rock scare locks the time-share and stops the survey nights." }, support: { label: "Trust Fracture", description: "The unused calendar shows a trust fracture between the survey and the lot." } },
      suggested: ["space", "ai", "networks", "computing", "vr", "iot", "drones", "solar"],
      suggestedWhy: {
        "space": "A space survey can share dome nights so a rock watch does not chain the gate.",
        "ai": "An ai calendar can split nights between the rock survey and cultural access.",
        "networks": "A network can send a lock notice before kūpuna drive the Saddle Road.",
        "computing": "Computing can test a night share before the parking lot rejects it.",
        "vr": "A vr visit can show the dome when the gate stays chained.",
        "iot": "An iot gate sensor can show the chain state to Hilo and to the lot.",
        "drones": "A drone can watch the road when the mid-sized dome stays locked.",
        "solar": "Solar power at the lot can light a night share table without the dome.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Esrange fringe, Kiruna municipality"],
      title: "Kinetic stack waits while the range idles",
      summary: "Ingrid Larsson walks the frost-heaved pad on the Esrange fringe with a clipboard she cannot stamp. Reindeer from the local siida are on the flats that insurers painted as a drop zone. The range stays silent. Last year a rushed scare launch scattered a herd. The compensation file stays open in Kiruna.",
      scene:
        "Ingrid Larsson walks the frost-heaved pad on the Esrange fringe with a clipboard. She cannot stamp the clipboard. In the hangar a heavy mass waits to shove a rock off a city-killing path. The mass stays crated and cold. The range is silent.\n\nA herding corridor opened three days early. Reindeer from the local siida are on the flats. Insurers painted those flats as a drop zone.\n\nA rehearsal for that shove is necessary in a live window. The underwriter will not sign a flight over winter pasture without a seasonal map the herders and the range accept. Last year a rushed scare launch scattered a herd. The compensation file stays open in a Kiruna office.\n\nTechnicians sit on standby pay. The stack ages. On the wall chart the next rock that can use a proven shove is marked in red.\n\nA herder tells Ingrid Larsson that the animals will not cross the pad. The pad still smells of the burn from last year. The town looks to the range for jobs. The range waits for a yes. The last rush made that yes costly.",
      briefMd:
        "## The place\nIngrid Larsson is the range civil-integration lead on the Esrange fringe in Kiruna municipality. She walks the frost-heaved pad with a clipboard she cannot stamp. In the hangar a heavy mass waits, crated and cold, to shove a rock off a city-killing path. The range is silent.\n\nA herding corridor opened three days early. Reindeer from the local siida are on the flats. Insurers painted those flats as a drop zone.\n\n## The bigger problem\nA rehearsal for that shove is necessary in a live window. The underwriter will not sign a flight over winter pasture without a seasonal map the herders and the range accept. Last year a rushed scare launch scattered a herd. The compensation file stays open in a Kiruna office. Technicians sit on standby pay. The stack ages.\n\nOn the wall chart the next rock that can use a proven shove is marked in red. A herder says the animals will not cross a pad that still smells of the burn from last year. The town looks to the range for jobs. The last rush made a yes costly.\n\n## Your job\nProve a shove that can save a distant city and still spare the winter pasture.",
      stakeholder: "Ingrid Larsson, range civil-integration lead",
      crisisMeters: { local: { label: "Mission Stall", description: "The crated shove stays idle because the range cannot stamp a live window." }, global: { label: "Liability Gridlock", description: "The underwriter will not sign while liability over winter pasture stays open." }, support: { label: "Pasture Trust", description: "The siida withholds trust because last year a rushed launch scattered a herd." } },
      suggested: ["space", "robots", "materials", "print3d", "ai", "computing", "networks", "nuclear"],
      suggestedWhy: {
        "space": "A space window can time a shove test when the herding corridor is clear.",
        "robots": "A robot check can inspect the crated mass while the range stays silent.",
        "materials": "A new pad surface can cut the burn smell that stops the reindeer.",
        "print3d": "A printed map board can show the drop zone the herders accept.",
        "ai": "An ai map can mark winter pasture before an underwriter signs a flight.",
        "computing": "Computing can match a live window to a pasture map the siida accepts.",
        "networks": "A network can move the open compensation file out of the Kiruna wait.",
        "nuclear": "Nuclear power can keep the pad instruments alive while the range stays silent.",
      },
      visionTheme: "rebuild-city",
    }
  ],

  weather: [
    {
      places: ["Drawdown Flats"],
      title: "When the pivot runs dry",
      summary: "Mara Chen walks the last quarter-mile of the south pivot at Drawdown Flats. The well gauge at pad 14 sits below the red line. The bank will not refinance the pivot if this circle browns. Mara Chen still owes money on the pivot.",
      scene:
        "Mara Chen walks the last quarter-mile of the south pivot before dawn. Dust lifts off the wheel tracks. The sprinklers do not tick.\n\nThe well gauge at pad 14 sits below the red line. Mara Chen painted that red line last July. The corn leaves cup inward along the outer ring.\n\nMara Chen radios the pump house. The motor hums on the line. The aquifer does not answer.\n\nThree neighbors wait at the co-op shed with dry gauges and bank letters. River-side farms run full circles under senior rights. Officials wrote those rights when the sand layer was full. Other farms on Drawdown Flats draw from that same layer.\n\nNight power is cheap. Pumps run long hours to chase a crop. The crop still looks good on paper. The district bills by the acre, not by the gallon. Each extra hour drops the water table a little farther.\n\nThe note for Mara Chen comes due in six weeks. The bank will not refinance the pivot if this circle browns. Mara Chen still owes money on the pivot. Her son asked if the family will plant next year.",
      briefMd:
        "## The place\n\nMara Chen walks the last quarter-mile of the south pivot before dawn. Dust lifts off the wheel tracks. The sprinklers do not tick. The well gauge at pad 14 sits below the red line. Mara Chen painted that red line last July. The corn leaves cup inward along the outer ring.\n\nMara Chen radios the pump house. The motor hums on the line. The aquifer does not answer. Three neighbors wait at the co-op shed with dry gauges and bank letters.\n\nThe note for Mara Chen comes due in six weeks. The bank will not refinance the pivot if this circle browns. Mara Chen still owes money on the pivot. Her son asked if the family will plant next year.\n\n## The bigger problem\n\nRiver-side farms run full circles under senior rights. Officials wrote those rights when the sand layer was full. Other farms on Drawdown Flats draw from that same layer.\n\nNight power is cheap. Pumps run long hours to chase a crop. The crop still looks good on paper. The district bills by the acre, not by the gallon. Each extra hour drops the water table a little farther.\n\n## Your job\n\nKeep the corn on the south pivot when the well gauge stays below the red line.",
      stakeholder: "Irrigation co-op president",
      crisisMeters: { local: { label: "Dry Wells", description: "The well gauge at pad 14 sits below the red line on the south pivot." }, global: { label: "Wasted Water", description: "Long pump hours and acre bills drop the shared water table at Drawdown Flats." }, support: { label: "Farm Debt", description: "The bank note comes due in six weeks and the pivot still carries a debt." } },
      suggested: ["iot", "ai", "solar", "battery", "drones", "space", "genetic-engineering", "materials"],
      suggestedWhy: {
        "iot": "A sensor can show Mara Chen when the well gauge falls below the red line.",
        "ai": "A model can show which pump hours waste water from the shared sand layer.",
        "solar": "Day power from the sun can cut long night pump runs on Drawdown Flats.",
        "battery": "Stored power can shift pump hours away from cheap long night runs.",
        "drones": "A flight can show dry rings and cupped corn leaves on the south pivot.",
        "space": "A view from above can show which circles stay green under senior rights.",
        "genetic-engineering": "A corn change can help leaves stay open when the well runs low.",
        "materials": "A new seal can slow water loss where the south pivot runs dry.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Ember Ridge"],
      title: "Orange noon at Ember Ridge",
      summary: "Nurse Adele Ruiz ties a wet scarf over her face behind the clinic at Ember Ridge. The air quality flag on the porch stays red for eleven days. The breath of a grandchild sounds like paper. Smoke closed the road to town twice this week.",
      scene:
        "Nurse Adele Ruiz parks behind the clinic at Ember Ridge. Adele Ruiz ties a wet scarf over her face. The noon sky shows the color of rust. The air quality flag on the porch stays red for eleven days.\n\nThe clinic room holds no empty seats. An older mill worker holds a grandchild. The breath of the grandchild sounds like paper. Adele Ruiz starts a nebulizer. The HEPA unit in the back hallway trips the breaker again.\n\nCounty protocol sends smoke alerts by landline and radio. Half of the ridge lives in seasonal cabins. Those cabins have no landline and no radio.\n\nTimber companies left dead pine on the slopes above the road after the last beetle year. The fire in that fuel shows no off-season at this time. Adele Ruiz can treat the cough. Adele Ruiz cannot treat the forest that makes the cough.\n\nThe pulse ox of the child drops. Adele Ruiz waits for a transfer bed in town. Town sits forty minutes down the road. Smoke closed that road twice this week. The mill worker asks if the family left yesterday.",
      briefMd:
        "## The place\n\nNurse Adele Ruiz parks behind the clinic at Ember Ridge. Adele Ruiz ties a wet scarf over her face. The noon sky shows the color of rust. The air quality flag on the porch stays red for eleven days.\n\nThe clinic room holds no empty seats. An older mill worker holds a grandchild. The breath of the grandchild sounds like paper. Adele Ruiz starts a nebulizer. The HEPA unit in the back hallway trips the breaker again.\n\nThe pulse ox of the child drops. Adele Ruiz waits for a transfer bed in town. Town sits forty minutes down the road. Smoke closed that road twice this week. The mill worker asks if the family left yesterday.\n\n## The bigger problem\n\nCounty protocol sends smoke alerts by landline and radio. Half of the ridge lives in seasonal cabins. Those cabins have no landline and no radio.\n\nTimber companies left dead pine on the slopes above the road after the last beetle year. The fire in that fuel shows no off-season at this time. Adele Ruiz can treat the cough. Adele Ruiz cannot treat the forest that makes the cough.\n\n## Your job\n\nCare for the child at Ember Ridge when smoke closes the road to town.",
      stakeholder: "County public health nurse",
      crisisMeters: { local: { label: "Smoke Days", description: "The air quality flag on the porch stays red for eleven days." }, global: { label: "Dead Timber", description: "Dead pine from the last beetle year fuels smoke with no off-season." }, support: { label: "Clinic Crowds", description: "The clinic room holds no empty seats and the town bed is forty minutes away." } },
      suggested: ["drones", "iot", "ai", "space", "networks", "robots", "materials", "solar"],
      suggestedWhy: {
        "drones": "A flight can show smoke and dead pine on the slopes above the road.",
        "iot": "A small sensor can warn cabins that have no landline and no radio.",
        "ai": "A model can rank smoke risk for cabins before the flag stays red.",
        "space": "A view from above can track the rust sky and the fire in dead pine.",
        "networks": "A local link can carry smoke alerts to cabins with no landline.",
        "robots": "A machine can move dead pine off the slopes above the road.",
        "materials": "A better filter can keep the hallway unit on during a breaker trip.",
        "solar": "Day power from the sun can keep the clinic unit on when the breaker trips.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Levee Bend"],
      title: "The river takes the bend again",
      summary: "Ellis Fontenot stands on the parish truck bed at first light. The river takes Willow Street. Water sits over the sandbag line. Mrs. Landry will not leave the house her father built.",
      scene:
        "Ellis Fontenot stands on the parish truck bed at first light. Ellis Fontenot watches the river take the same bend. The river took that bend in 1919 and in 1927.\n\nWater sits over the sandbag line at Willow Street. A sofa floats past the bait shop.\n\nEllis Fontenot calls the pump crew. Two of the four pumps stay down for parts. The supplier promised those parts after the last rise. The remaining pair cannot keep the ditch empty.\n\nThe levee map on the clipboard shows a gap behind the new slab homes. The parish platted those lots after the last flood map. The parish wanted the tax base.\n\nCrews straightened the channel upstream years ago. The straight channel hurries water past a different town. The water arrives at Levee Bend faster at this time. The water also arrives higher.\n\nEllis Fontenot can raise bags. Ellis Fontenot cannot raise the ground under the bags. Mrs. Landry will not leave the house. Her father built that house. The water sits at the porch steps. Mrs. Landry asks if the next map will tell the truth.",
      briefMd:
        "## The place\n\nEllis Fontenot stands on the parish truck bed at first light. Ellis Fontenot watches the river take the same bend. The river took that bend in 1919 and in 1927. Water sits over the sandbag line at Willow Street. A sofa floats past the bait shop.\n\nEllis Fontenot calls the pump crew. Two of the four pumps stay down for parts. The supplier promised those parts after the last rise. The remaining pair cannot keep the ditch empty.\n\nMrs. Landry will not leave the house. Her father built that house. The water sits at the porch steps. Mrs. Landry asks if the next map will tell the truth.\n\n## The bigger problem\n\nThe levee map on the clipboard shows a gap behind the new slab homes. The parish platted those lots after the last flood map. The parish wanted the tax base.\n\nCrews straightened the channel upstream years ago. The straight channel hurries water past a different town. The water arrives at Levee Bend faster at this time. The water also arrives higher. Ellis Fontenot can raise bags. Ellis Fontenot cannot raise the ground under the bags.\n\n## Your job\n\nHold the water off the house at Willow Street when the river takes the bend.",
      stakeholder: "Parish floodplain manager",
      crisisMeters: { local: { label: "Floodwater", description: "Water sits over the sandbag line at Willow Street and at the porch steps." }, global: { label: "Levee Gaps", description: "The levee map shows a gap and the straight channel sends water faster and higher." }, support: { label: "Displaced Families", description: "Mrs. Landry will not leave the house her father built." } },
      suggested: ["iot", "ai", "drones", "materials", "robots", "space", "networks", "print3d"],
      suggestedWhy: {
        "iot": "A gauge can show Ellis Fontenot when water sits over the sandbag line.",
        "ai": "A model can show how fast the straight channel sends water to the bend.",
        "drones": "A flight can show the gap behind the new slab homes.",
        "materials": "A stronger bag can hold water at the sandbag line on Willow Street.",
        "robots": "A machine can place bags where two pumps stay down for parts.",
        "space": "A view from above can track the bend the river took in past floods.",
        "networks": "A link can call the pump crew when the ditch fills at Levee Bend.",
        "print3d": "A printed part can return the two down pumps to service.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Windrow Court"],
      title: "Sirens after the roof",
      summary: "Rosa Delgado climbs the last two steps to a neighbor porch at Windrow Court. Last night the wind peeled the south half of Unit 17. The high school gym takes sixty residents. The court has two hundred and ten residents.",
      scene:
        "Rosa Delgado climbs the last two steps to the porch of a neighbor at Windrow Court. Rosa Delgado carries a roll of visqueen under one arm.\n\nLast night a straight-line wind peeled the south half of Unit 17. The open side looks like a can. Insulation hangs in wet ropes. The sirens came after the roof fell into the ditch.\n\nRosa Delgado tapes a cover over the open rooms before the next rain.\n\nThe park owner collects lot rent on units that fail the old tie-down spec. County inspectors check new installs. County inspectors do not check the 1990s straps. Those straps rust under most of Windrow Court.\n\nThe high school gym takes sixty residents. The court has two hundred and ten residents. The mother of Rosa Delgado will not go without the oxygen concentrator. The gym has two wall outlets in the hallway.\n\nRosa Delgado holds a list of hosts. The list is longer than the rooms.",
      briefMd:
        "## The place\n\nRosa Delgado climbs the last two steps to the porch of a neighbor at Windrow Court. Rosa Delgado carries a roll of visqueen under one arm. Rosa Delgado tapes a cover over the open rooms before the next rain.\n\nLast night a straight-line wind peeled the south half of Unit 17. The open side looks like a can. Insulation hangs in wet ropes. The sirens came after the roof fell into the ditch.\n\nThe high school gym takes sixty residents. The court has two hundred and ten residents. The mother of Rosa Delgado will not go without the oxygen concentrator. The gym has two wall outlets in the hallway. Rosa Delgado holds a list of hosts. The list is longer than the rooms.\n\n## The bigger problem\n\nThe park owner collects lot rent on units that fail the old tie-down spec. County inspectors check new installs. County inspectors do not check the 1990s straps. Those straps rust under most of Windrow Court.\n\n## Your job\n\nShelter the residents of Windrow Court after the wind peels a roof.",
      stakeholder: "Mobile home residents' council lead",
      crisisMeters: { local: { label: "Wind Damage", description: "A straight-line wind peeled the south half of Unit 17 last night." }, global: { label: "Weak Tie-Downs", description: "The 1990s straps rust and inspectors do not check those straps." }, support: { label: "Shelter Space", description: "The gym takes sixty residents and the court has two hundred and ten residents." } },
      suggested: ["materials", "print3d", "robots", "energy", "battery", "solar", "networks", "drones"],
      suggestedWhy: {
        "materials": "A strong cover can close the open rooms of Unit 17 before the next rain.",
        "print3d": "A printed strap can replace rust on units that fail the old tie-down spec.",
        "robots": "A machine can place covers on open units before the next rain.",
        "energy": "Site power can run an oxygen concentrator away from two hallway outlets.",
        "battery": "A stored pack can run the oxygen concentrator when the gym outlets fill.",
        "solar": "Day power from the sun can run the oxygen concentrator off the gym outlets.",
        "networks": "A local link can match hosts to residents when the gym fills.",
        "drones": "A flight can find open roofs at Windrow Court after a straight-line wind.",
      },
      visionTheme: "social-city",
    }
  ],

  mideast: [
    {
      places: ["Dust Road Clinic Row"],
      title: "Ambulances pay twice at the gate",
      summary: "Nurse Hala loads a boy from the west lane into the clinic ambulance on Dust Road. A man with a rifle wants cash to lift the chain. The boy does not have twenty minutes.",
      scene:
        "Nurse Hala checks the pulse of a boy from the west lane. His lips show the color of ash. She loads the boy into the clinic ambulance before the sun clears the ridge above Dust Road.\n\nThe driver stops the engine at the first barrier. A man with a plastic chair and a rifle wants cash to lift the chain. The east barrier will want the same cash on the return.\n\nLast month the crew paid the west barrier and the east barrier. The crew sat for twenty minutes in the dust. The boy does not have twenty minutes.\n\nNurse Hala keeps a tin of folded bills in the glove box. Each bill is a night shift that she will not staff. The men at the barriers do not wear one uniform. The men work for the group that holds this stretch of Dust Road in that week.\n\nThe clinic board still writes names from the west lane and the east lane. No other ward writes those names. Families know this fact. The men with the chain know this fact.\n\nAn empty tin makes the night nurse quit. A father from the west lane will not send his daughter to a ward that cannot come to her. A midwife from the east lane will not cross after dark.\n\nThe road must connect two neighborhoods. At this time the road sells delay by the minute.",
      briefMd:
        "## The place\n\nDust Road Clinic Row sits under a ridge. Nurse Hala works at the clinic on that row. The clinic ambulance must pass a chain on Dust Road.\n\nThe west lane and the east lane send patients to this clinic. The clinic board writes names from the west lane and the east lane. No other ward writes those names.\n\nA man at the first barrier wants cash to lift the chain. The east barrier will want the same cash on the return. The men do not wear one uniform.\n\n## The bigger problem\n\nLast month the crew paid the two barriers and sat for twenty minutes. The boy does not have twenty minutes. Each bill in the tin is a night shift that Nurse Hala will not staff.\n\nAn empty tin makes the night nurse quit. A father will not send his daughter to a ward that cannot come to her. A midwife will not cross after dark. The road sells delay by the minute.\n\n## Your job\n\nMove the clinic ambulance past the chain in time for the boy.",
      stakeholder: "Cross-community clinic board",
      crisisMeters: { local: { label: "Missed Care", description: "The boy does not have twenty minutes at the barrier on Dust Road." }, global: { label: "Checkpoint Fees", description: "A man wants cash at the west chain and at the east chain." }, support: { label: "Staff Flight", description: "An empty tin makes the night nurse quit." } },
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai", "transportation", "print3d"],
      suggestedWhy: {
        "solar": "Solar power can light the clinic when a night-shift bill goes to a barrier.",
        "battery": "A battery can keep power in the clinic ambulance during a stop at the chain.",
        "iot": "A sensor link can tell the clinic board that a chain blocks Dust Road.",
        "drones": "A drone can watch Dust Road when the clinic ambulance stops at a chain.",
        "networks": "A network can carry a clinic message when the road sells delay.",
        "ai": "A software model can match clinic staff to nights with few spare bills.",
        "transportation": "A transport option can move a patient when the chain stops the ambulance.",
        "print3d": "A printed part can keep the clinic ambulance in service with few spare bills.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Saffron Lane Souk"],
      title: "Shutters rise only after the cut",
      summary: "Yusuf rolls the metal shutter of stall nine on Saffron Lane at dawn. Night collectors took a share after the last power cut. Empty stalls mean empty kitchens by Friday.",
      scene:
        "Yusuf rolls the metal shutter of stall nine at dawn. The saffron tins are lighter than Yusuf left the tins. Night collectors came after the last power cut. The lane cameras died in that cut.\n\nThe collectors took a share of the cash box. The collectors took a share of goods that the stall can sell on the next day.\n\nBy noon, half of the shutters on Saffron Lane stay down. Young men hauled crates for uncles in the past. At this time the young men lean on the steel. The young men wait for a nod from a collector.\n\nThe merchants association tried a shared till last spring. A person smashed the till in a week.\n\nNo wall shows the tolls. The tolls change with a rumor about the crew that owns the alley after dark.\n\nA widow who sells dried limes pays to open the stall. The widow pays to close the stall. Her son watches from the doorway. The son learns the wrong trade.\n\nEmpty stalls mean empty kitchens by Friday. The association can post a fair-toll sign. The sign does not stop a man with a cutter. That man has a cousin on the night shift at the transformer.",
      briefMd:
        "## The place\n\nSaffron Lane Souk holds stall nine. Yusuf rolls the metal shutter at dawn. The saffron tins are lighter than Yusuf left the tins.\n\nNight collectors came after the last power cut. The lane cameras died in that cut. The collectors took a share of the cash box.\n\nBy noon, half of the shutters stay down. Young men wait on the steel for a nod from a collector.\n\n## The bigger problem\n\nNo wall shows the tolls. The tolls change with a rumor about the crew after dark. A widow pays to open and pays to close. Her son learns the wrong trade.\n\nEmpty stalls mean empty kitchens by Friday. A fair-toll sign does not stop a man with a cutter. That man has a cousin on the night shift at the transformer.\n\n## Your job\n\nKeep the market open without a payment to the night collectors.",
      stakeholder: "Merchants’ fair-toll association",
      crisisMeters: { local: { label: "Empty Stalls", description: "Half of the shutters on Saffron Lane stay down by noon." }, global: { label: "Street Tolls", description: "Night collectors take a share of the cash box after a power cut." }, support: { label: "Idle Youth", description: "Young men wait for a nod from a collector." } },
      suggested: ["networks", "ai", "crypto", "solar", "iot", "drones", "transportation", "computing"],
      suggestedWhy: {
        "networks": "A network can warn Yusuf when the lane cameras die in a power cut.",
        "ai": "A software model can show the association how a toll rumor changes.",
        "crypto": "A digital record can track a fair toll when no wall shows a price.",
        "solar": "Solar power can keep lane cameras on after a cut at the transformer.",
        "iot": "A sensor can report a power cut on Saffron Lane to the association.",
        "drones": "A drone can watch stall nine when the lane cameras die.",
        "transportation": "A transport plan can move goods when the shutters on Saffron Lane stay down.",
        "computing": "A computer record can hold fair-toll terms when a till is smashed.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Rubble Lane Blocks"],
      title: "Winter walls that never rise",
      summary: "Lina marks the frost line on the remaining wall on Rubble Lane. The rebar vanished overnight. Families sleep under tarps with winter three weeks away.",
      scene:
        "Lina marks the frost line on the remaining wall with a stub of charcoal. Winter is three weeks away. The tenants cooperative poured a foundation last month on Rubble Lane.\n\nThe rebar vanished overnight. The cement bags vanished on the next night.\n\nThe men who take the steel do not hide. The men sell the steel two streets from Rubble Lane. The men come back when the next truck arrives.\n\nFamilies sleep under tarps on lots that the families still call home. The deeds are photocopies in three languages. Offices that no longer exist stamped the deeds. Two cousins claim the same stairwell.\n\nThe cooperative cannot pour a foundation if a thief will steal the pour. The cooperative cannot wait if the children will freeze.\n\nA grandmother on the third floor boils tea on a single-ring stove. That floor still stands. Wind comes through the missing wall.\n\nThe rebuild does not fail for a lack of hands. The rebuild fails because a new wall becomes stock for another person.",
      briefMd:
        "## The place\n\nRubble Lane Blocks still hold one wall. Lina marks the frost line with charcoal. Winter is three weeks away.\n\nThe tenants cooperative poured a foundation last month. The rebar vanished overnight. The cement bags vanished on the next night.\n\nFamilies sleep under tarps on lots that the families still call home. Two cousins claim the same stairwell.\n\n## The bigger problem\n\nThe men who take the steel do not hide. The men sell the steel two streets from Rubble Lane. The men come back when the next truck arrives.\n\nThe cooperative cannot pour if a thief will steal the pour. The cooperative cannot wait if the children will freeze. A new wall becomes stock for another person.\n\n## Your job\n\nRaise winter walls on Rubble Lane before a thief strips the steel.",
      stakeholder: "Tenants’ rebuild cooperative",
      crisisMeters: { local: { label: "Exposed Homes", description: "Wind comes through the missing wall of homes on Rubble Lane." }, global: { label: "Material Theft", description: "Men sell the rebar two streets from Rubble Lane." }, support: { label: "Deed Fights", description: "Two cousins claim the same stairwell." } },
      suggested: ["print3d", "materials", "robots", "solar", "drones", "ai", "networks", "crypto"],
      suggestedWhy: {
        "print3d": "A printed wall part can rise when cement bags vanish overnight.",
        "materials": "A local material can replace rebar that men sell two streets away.",
        "robots": "A robot can watch a pour when men return with the next truck.",
        "solar": "Solar power can light a lot where families sleep under tarps.",
        "drones": "A drone can show the cooperative when steel leaves Rubble Lane.",
        "ai": "A software model can compare deeds when two cousins claim one stairwell.",
        "networks": "A network can alert the cooperative when a truck of steel arrives.",
        "crypto": "A digital record can show a deed when the old office no longer exists.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Twin Bank Canals"],
      title: "The canal gate becomes a weapon",
      summary: "Abu Karim walks the north bank of the canal at first light. The sluice is chained shut. His daughter is promised to a lender if this crop fails.",
      scene:
        "Abu Karim walks the north bank at first light. A chain holds the sluice shut. The south bank opened the sluice for two hours after midnight. The south bank locked the sluice again.\n\nThe tomato rows of Abu Karim curl. A man across the water holds the key. Abu Karim shared tea with that man in the past.\n\nA family that controls a gate can dry the other bank. A dry week is a debt week at the seed shop.\n\nThe water users council still meets under the same mulberry tree. The members bring paper shares from a time when the canal was one system. The paper does not turn the wheel.\n\nThe daughter of Abu Karim is promised to a lender if this crop fails. On the south bank, the wheat of a widow is too short.\n\nNeighbors timed irrigations together in the past. At this time the neighbors time the locks. The gate is not a tool for shared water. The gate is a way to aim thirst.",
      briefMd:
        "## The place\n\nTwin Bank Canals split the fields. Abu Karim walks the north bank at first light. A chain holds the sluice shut.\n\nThe south bank opened the sluice for two hours after midnight. The south bank locked the sluice again. A man across the water holds the key.\n\nThe water users council meets under the same mulberry tree. The members bring paper shares from a time when the canal was one system.\n\n## The bigger problem\n\nA family that controls a gate can dry the other bank. A dry week is a debt week at the seed shop. The paper does not turn the wheel.\n\nThe daughter of Abu Karim is promised to a lender if this crop fails. The wheat of a widow on the south bank is too short. The gate is a way to aim thirst.\n\n## Your job\n\nShare canal water so a gate cannot aim thirst at a neighbor.",
      stakeholder: "Both-banks water users’ council",
      crisisMeters: { local: { label: "Crop Failure", description: "The tomato rows of Abu Karim curl because the sluice stays shut." }, global: { label: "Gate Capture", description: "The south bank locked the sluice after two hours." }, support: { label: "Family Debt", description: "The daughter of Abu Karim is promised to a lender if the crop fails." } },
      suggested: ["iot", "solar", "ai", "networks", "space", "drones", "crypto", "computing"],
      suggestedWhy: {
        "iot": "A sensor can show the council when a sluice stays shut.",
        "solar": "Solar power can turn a wheel when paper shares do not move water.",
        "ai": "A software model can plan water shares for the north bank and the south bank.",
        "networks": "A network can carry a water-share notice from the mulberry tree.",
        "space": "A satellite view can show dry rows on the north bank and the south bank.",
        "drones": "A drone can show the council a chained sluice at first light.",
        "crypto": "A digital record can hold a water share when paper does not turn the wheel.",
        "computing": "A computer log can record each hour that a gate stays shut.",
      },
      visionTheme: "food-city",
    }
  ],

  nuclear: [
    {
      places: ["Clearwater Silo Road, northern Great Plains"],
      title: "Sirens over the grain elevators",
      summary: "Capt. Maya Brooks steps off the alert truck onto Clearwater Silo Road and tastes dust. The county siren winds. The same horn means a tornado and means that the missile wing went hot. She cannot tell her husband which kind of night this is.",
      scene:
        "Capt. Maya Brooks steps off the alert truck onto Clearwater Silo Road. She tastes dust. The county siren winds. The same horn means a tornado. The same horn also means that the missile wing went hot.\n\nHer son's 4-H lambs slam the fence in the dark. Porch lights snap on down the section line. A neighbor calls from the next yard. The neighbor says basement or ditch.\n\nMaya has a crew and a clock. The clock is short on purpose. Launch-on-warning is the standing rule. The rule treats a possible inbound as real until a person proves that the inbound is not real. Last month a weather balloon caused the same alarm. Harvest dust caused the same alarm the month before.\n\nThe old radar net still reads the steel of the grain elevators. The net reads that steel the way the net reads a plume.\n\nShe cannot tell her husband which kind of night this is. Open phones are forbidden once the horn starts. He manages the co-op bins two miles north. He will pull the night crew into the concrete tunnel under the scales in each case. The lambs will run.\n\nHigher headquarters waits on a satellite pass. The pass still flags chaff, dust, and a bent vane as the same class of threat. The civil-defense contract from the seventies never split the public horn into weather and war. One circuit still wakes the whole county.\n\nMaya can hold her crew at ready. She can also send the confirmation that starts the next hand eight minutes. Each choice spends the same farm families.",
      briefMd:
        "## The place\nCapt. Maya Brooks stands on Clearwater Silo Road after the alert truck stops. Dust sits on her tongue. The county siren winds over the grain elevators. The same horn means a tornado. The same horn also means that the missile wing went hot.\n\nHer son's 4-H lambs slam the fence in the dark. Porch lights snap on down the section line. A neighbor calls from the next yard. The neighbor says basement or ditch. Her husband manages the co-op bins two miles north.\n\nOpen phones are forbidden once the horn starts. She cannot tell her husband which kind of night this is. He will pull the night crew into the concrete tunnel under the scales. The lambs will run.\n\n## The bigger problem\nLaunch-on-warning is the standing rule. The rule treats a possible inbound as real until a person proves that the inbound is not real. The clock is short on purpose. A weather balloon caused the same alarm last month. Harvest dust caused the same alarm the month before.\n\nThe old radar net still reads the steel of the grain elevators as a plume. Higher headquarters waits on a satellite pass. The pass flags chaff, dust, and a bent vane as the same class of threat. The civil-defense contract from the seventies never split the public horn into weather and war. One circuit still wakes the whole county.\n\n## Your job\nDecide the night type before the confirmation starts the next eight minutes.",
      stakeholder: "Capt. Maya Brooks, missile combat crew commander",
      crisisMeters: { local: { label: "Night Sirens", description: "The county horn on Clearwater Silo Road still means a tornado and a hot missile wing." }, global: { label: "Short Fuses", description: "Launch-on-warning gives the crew a short clock before the next hand starts." }, support: { label: "Family Fear", description: "The husband, the lambs, and the neighbor cannot learn which kind of night this is." } },
      suggested: ["ai", "computing", "networks", "iot", "vr", "quantum-internet"],
      suggestedWhy: {
        "ai": "A check can mark elevator steel apart from a plume before the crew treats dust as inbound.",
        "computing": "A local compare can match this horn with the balloon alarm and the harvest dust alarm.",
        "networks": "A split circuit can wake the county for weather and wake the missile wing for war.",
        "iot": "A bin sensor can tell the night crew in the co-op tunnel which kind of night this is.",
        "vr": "A shared view can show the crew and the neighbor the same dust track on Clearwater Silo Road.",
        "quantum-internet": "A protected link can carry the satellite pass without an open phone to the co-op bins.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Floe Watch Headland, Labrador coast"],
      title: "Ice clutter looks inbound",
      summary: "Sgt. Inuk Arnaq drags a gloved finger across the track table at Floe Watch Headland. Three arcs bloom over the Labrador pack. Ice calves in long ridges. The clinic in Nain rolled cots into the hallway on the last false track.",
      scene:
        "Sgt. Inuk Arnaq drags a gloved finger across the track table at Floe Watch Headland. Three arcs bloom over the Labrador pack. Ice calves in long ridges. The fusion screen does not care.\n\nThe clinic in Nain rolled cots into the hallway on the last false track. Elders walked the ice road in the dark because the all-clear came late. The radio net skips the outport when the aurora is loud. A child with a fever sat in a hallway chair until morning.\n\nHold time is the minutes a commander can wait before the commander treats a track as real. That window shrank after the last satellite gap. The cousin of Arnaq works the clinic desk. The cousin called twice. The cousin asked if the oxygen concentrators must move to the inner room again.\n\nThe sensor book scores sea ice the way the book scores metal. No person from the hamlet sits on the classification board. The board meets inland. The board meets in a language that does not name this floe.\n\nArnaq can hold the tracks and take the reprimand. She can pass the tracks up and start a clock in a capital. The capital does not stand on this rock. The last pass-up emptied the clinic of night staff.",
      briefMd:
        "## The place\nSgt. Inuk Arnaq drags a gloved finger across the track table at Floe Watch Headland. Three arcs bloom over the Labrador pack. Ice calves in long ridges. The fusion screen does not care.\n\nThe clinic in Nain rolled cots into the hallway on the last false track. Elders walked the ice road in the dark because the all-clear came late. The radio net skips the outport when the aurora is loud. A child with a fever sat in a hallway chair until morning.\n\nThe cousin of Arnaq works the clinic desk. The cousin called twice. The cousin asked if the oxygen concentrators must move to the inner room again. The last pass-up emptied the clinic of night staff.\n\n## The bigger problem\nHold time is the minutes a commander can wait before the commander treats a track as real. That window shrank after the last satellite gap. The sensor book scores sea ice the way the book scores metal. No person from the hamlet sits on the classification board.\n\nThe board meets inland. The board meets in a language that does not name this floe. Arnaq can hold the tracks and take the reprimand. She can pass the tracks up and start a clock in a capital. The capital does not stand on this rock.\n\n## Your job\nDecide whether the arcs are ice before the capital clock starts.",
      stakeholder: "Sgt. Inuk Arnaq, sensor fusion lead",
      crisisMeters: { local: { label: "False Alarms", description: "False tracks at Floe Watch Headland still send elders onto the ice road in the dark." }, global: { label: "Minutes Left", description: "Hold time shrank after the last satellite gap, so a pass-up starts the capital clock." }, support: { label: "Clinic Strain", description: "The last false track put cots in the Nain hallway and kept a feverish child in a chair until morning." } },
      suggested: ["space", "ai", "networks", "iot", "drones", "computing"],
      suggestedWhy: {
        "space": "A satellite pass can show ice ridges so the capital clock does not start on a calf.",
        "ai": "A classifier can score sea ice apart from metal before a commander treats the track as real.",
        "networks": "A radio path can serve Nain when the aurora is loud so the all-clear does not come late.",
        "iot": "A clinic sensor can tell the cousin if the oxygen concentrators must move to the inner room.",
        "drones": "A coast flight can show the long ice ridges before Arnaq passes the tracks to the capital.",
        "computing": "A local model can hold the track table open for the minutes that remain after a satellite gap.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Iron Quay Liaison Yard, lower Danube corridor"],
      title: "Drills without a shared clock",
      summary: "Col. Elena Popa hangs a yellow yard lantern on the crane at Iron Quay. The lantern is the old signal for a practice, not a strike. The other bank did not get the notice. The Tuesday stalls empty. A mother will not put her child back on the river bus.",
      scene:
        "Col. Elena Popa hangs a yellow yard lantern on the crane at Iron Quay. The lantern is the old signal for a practice, not a strike. She tries to give the market a color. A barge horn answers a siren from the other bank. The Tuesday stalls empty.\n\nThe fruit seller looks at the lantern and leaves the crates. A tram brakes hard and will not open its doors. One side called the event a readiness drill. The other side did not get the notice.\n\nA rule still permits a hidden drill inside a national channel. The lantern of Popa is not in a national channel. The other desk calls the lantern a leak.\n\nGPS time sits on her left desk. A sealed analog clock sits on the right desk. A sergeant winds that clock and will not surrender it. Her runner is a teenager from the block. He tells the fruit seller that the lantern means practice. The seller asks who winds the lantern when Popa is not on the crane.\n\nA mother on the platform will not put her child back on the river bus. She watched the last unannounced drill pin a ferry against the quay piles. Shopkeepers bolt steel shutters. The shutters take an hour to raise. The other desk refuses to light a matching lantern. A public flag admits a drill.\n\nPopa can take the lantern down and keep the secret. She can leave the lantern up and own the leak. The fruit will rot in each case.",
      briefMd:
        "## The place\nCol. Elena Popa hangs a yellow yard lantern on the crane at Iron Quay. The lantern is the old signal for a practice, not a strike. She tries to give the market a color. A barge horn answers a siren from the other bank. The Tuesday stalls empty.\n\nThe fruit seller looks at the lantern and leaves the crates. A tram brakes hard and will not open its doors. A mother on the platform will not put her child back on the river bus. She watched the last unannounced drill pin a ferry against the quay piles.\n\nShopkeepers bolt steel shutters. The shutters take an hour to raise. GPS time sits on her left desk. A sealed analog clock sits on the right desk. A sergeant winds that clock and will not surrender it.\n\n## The bigger problem\nOne side called the event a readiness drill. The other side did not get the notice. A rule still permits a hidden drill inside a national channel. The lantern of Popa is not in a national channel. The other desk calls the lantern a leak.\n\nThe other desk refuses to light a matching lantern. A public flag admits a drill. Popa can take the lantern down and keep the secret. She can leave the lantern up and own the leak. The fruit will rot in each case.\n\n## Your job\nGive the market one shared signal before the stalls empty.",
      stakeholder: "Col. Elena Popa, joint deconfliction desk",
      crisisMeters: { local: { label: "Civilian Panic", description: "The Tuesday stalls empty when a barge horn answers a siren and the tram will not open." }, global: { label: "Hidden Drills", description: "A hidden drill in a national channel still leaves the other bank without notice." }, support: { label: "Trust Gap", description: "The mother will not put her child back on the river bus after the last unannounced drill." } },
      suggested: ["networks", "crypto", "space", "ai", "vr", "drones"],
      suggestedWhy: {
        "networks": "A shared notice can tell the other bank that the lantern means practice, not a strike.",
        "crypto": "A signed lantern code can show practice without a hidden drill in a national channel.",
        "space": "A common time signal can give the market one clock in place of the sealed clock and the GPS desk.",
        "ai": "A notice check can flag a drill that one side did not send to the other bank.",
        "vr": "A yard view can show the fruit seller that the yellow lantern means practice.",
        "drones": "A quay watch can show the ferry piles before a mother keeps her child off the river bus.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Granite Command Hollow, Appalachian foothills"],
      title: "Near-send on patch night",
      summary: "Eng. Kenji Okada watches the status board blink amber in Granite Command Hollow. Patch night is here. The mill night shift still drops power on the west pad. The mayor wants a quiet hour, not another church bell.",
      scene:
        "Eng. Kenji Okada watches the status board blink amber in Granite Command Hollow. Patch night is here. The ridge town knows the pattern. Church bells rang last quarter when a test string leaked onto the volunteer fire net. The school held kids for indoor recess. The diner on Main emptied at 2 p.m. and stayed empty through supper.\n\nA near-send is a launch order that almost leaves the building before a human veto catches it. The last near-send died on the key of Okada. Headquarters sold the update as faster assurance. The veto window shrank. Headquarters wants the new logic live before the next inspection.\n\nHis team must take the old console offline to load the patch. The new logic treats a dropped handshake as hostile. The backup generator on the west pad loses power when the town mill starts the night shift. That power flicker drops a handshake.\n\nThe office of the mayor called twice. The office wants a quiet hour, not another bell. A volunteer firefighter asked Okada in the grocery line if the kids must keep shoes by the bed. Okada can roll back and keep the slow human check. He can also ship the patch. The patch has a signature from above.",
      briefMd:
        "## The place\nEng. Kenji Okada watches the status board blink amber in Granite Command Hollow. Patch night is here. The ridge town knows the pattern. Church bells rang last quarter when a test string leaked onto the volunteer fire net. The school held kids for indoor recess. The diner on Main emptied at 2 p.m. and stayed empty through supper.\n\nThe office of the mayor called twice. The office wants a quiet hour, not another bell. A volunteer firefighter asked Okada in the grocery line if the kids must keep shoes by the bed.\n\n## The bigger problem\nA near-send is a launch order that almost leaves the building before a human veto catches it. The last near-send died on the key of Okada. Headquarters sold the update as faster assurance. The veto window shrank. Headquarters wants the new logic live before the next inspection.\n\nHis team must take the old console offline to load the patch. The new logic treats a dropped handshake as hostile. The backup generator on the west pad loses power when the town mill starts the night shift. That power flicker drops a handshake. The patch has a signature from above.\n\n## Your job\nKeep a human veto before the new logic treats a flicker as hostile.",
      stakeholder: "Eng. Kenji Okada, C3 assurance lead",
      crisisMeters: { local: { label: "Near Misses", description: "A near-send died on the key of Okada before the order left Granite Command Hollow." }, global: { label: "Less Time", description: "The veto window shrank after headquarters sold the update as faster assurance." }, support: { label: "Town Anxiety", description: "A firefighter asked if the kids must keep shoes by the bed after the last church bells." } },
      suggested: ["computing", "ai", "networks", "quantum-internet", "robots", "iot"],
      suggestedWhy: {
        "computing": "A slow check can keep the human veto when the west pad drops a handshake.",
        "ai": "A logic test can mark a mill flicker as power loss, not as a hostile handshake.",
        "networks": "A fire-net gate can stop a test string before church bells ring in the ridge town.",
        "quantum-internet": "A protected update path can load the patch without a dropped handshake on the west pad.",
        "robots": "A pad helper can hold generator power when the town mill starts the night shift.",
        "iot": "A mill sensor can warn the hollow before the night shift drops the west pad handshake.",
      },
      visionTheme: "energy-city",
    }
  ],

  slavery: [
    {
      places: ["Ranong Channel Boats"],
      title: "Papers locked below the ice line",
      summary: "Medic Arun climbs the wet ladder of a Ranong trawler and looks for Min. The captain points to a locked hatch. The papers stay in the wheelhouse safe. The wound will sour in the hold. The port can write a man without papers as a runaway.",
      scene:
        "At first light, medic Arun climbs the wet ladder of a Ranong trawler. The ice fills the trawler. Arun looks for a deckhand named Min. A winch split the palm of Min two nights ago.\n\nThe captain smiles and points to a locked hatch. The captain says that Min rests. The papers stay in the wheelhouse safe until the trip settles. Arun saw this rest before. The wound will sour in the hold. Min will not climb up while the lockbox holds the passport of Min and the chit of the broker.\n\nThe bill for fuel, bait, and ice goes to the crew. The trip does not cover the advance. The port can write a man without papers as a runaway. The other boats will not take the man. The sister of Min in Dawei waits for a transfer. The transfer does not post.\n\nArun can stitch a hand on the dock. Arun cannot put the name of Min back on a ledger. The captain owns the ledger.",
      briefMd:
        "## The place\nAt first light, medic Arun climbs the wet ladder of a Ranong trawler. The ice fills the trawler. Arun looks for a deckhand named Min. A winch split the palm of Min two nights ago.\n\nThe captain smiles and points to a locked hatch. The captain says that Min rests. The papers stay in the wheelhouse safe until the trip settles. The wound will sour in the hold.\n\nMin will not climb up while the lockbox holds the passport of Min and the chit of the broker. Arun can stitch a hand on the dock. Arun cannot put the name of Min back on the ledger of the captain.\n\n## The bigger problem\nThe bill for fuel, bait, and ice goes to the crew. The trip does not cover the advance. The port can write a man without papers as a runaway. The other boats will not take the man.\n\nThe sister of Min in Dawei waits for a transfer. The transfer does not post. The captain owns the ledger, so the name stays off the page.\n\n## Your job\nKeep the crew record with the worker and not in the lockbox.",
      stakeholder: "Port clinic outreach medic",
      crisisMeters: { local: { label: "Night Injuries", description: "A winch splits a palm at night on a Ranong trawler, and the wound sours in the cold hold." }, global: { label: "Crew Debt", description: "The bill for fuel, bait, and ice goes to the crew, and the trip does not cover the advance." }, support: { label: "Held Papers", description: "The wheelhouse safe holds the passport and the broker chit, so the port can write the man as a runaway." } },
      suggested: ["iot", "networks", "ai", "crypto", "drones", "computing"],
      suggestedWhy: {
        "iot": "A small sensor can show a locked hatch after a night injury on the trawler.",
        "networks": "A clinic link can carry the name of an injured deckhand off the boat.",
        "ai": "A check can mark a rest story that hides a split palm.",
        "crypto": "A seal can tie a passport to the deckhand and not to the wheelhouse safe.",
        "drones": "A small aircraft can watch the wet ladder when the medic cannot board.",
        "computing": "A shared record can show the crew bill and the unpaid advance.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Sambas Palm Blocks"],
      title: "The scale that never zeros the loan",
      summary: "Teacher Rina stands at the weigh shed in the Sambas palm block. Sari does not come. The clerk writes a number lower than the same load from yesterday. The children pick fruit until the ticket matches the family debt.",
      scene:
        "Before the first bell, teacher Rina stands at the weigh shed in the Sambas palm block. Rina holds a folded exam sheet for Sari. Sari is eleven. Sari does not come to the shed. The mother of Sari stands in the row. The girl stands behind the mother with a sack of loose fruit.\n\nThe scale clicks. The clerk writes a number lower than the same load from yesterday. The family loan book does not move toward zero. The page still lists the housing cost, the rice, and the sickle.\n\nSari looks at the exam sheet. Sari then looks at the sack. The barrack rule is simple when the weight is short. The children pick fruit until the ticket matches the debt. School can wait.\n\nRina can keep a desk open after dusk. Rina cannot make the scale tell a number that a child can carry to class.",
      briefMd:
        "## The place\nBefore the first bell, teacher Rina stands at the weigh shed in the Sambas palm block. Rina holds a folded exam sheet for Sari. Sari is eleven. Sari does not come. The mother stands in the row, and the girl stands behind the mother with a sack of loose fruit.\n\nThe scale clicks. The clerk writes a number lower than the same load from yesterday. The family loan book does not move toward zero. The page still lists the housing cost, the rice, and the sickle.\n\nSari looks at the exam sheet and then at the sack. The children pick fruit until the ticket matches the debt. Rina can keep a desk open after dusk. Rina cannot make the scale tell a number that a child can carry to class.\n\n## The bigger problem\nThe barrack rule is simple when the weight is short. School can wait while the ticket stays above the debt. The company beam is the only witness to the load.\n\nThe same sack gets a lower number than yesterday. The loan book does not move toward zero, so the girl stays in the row.\n\n## Your job\nGive Sari a true weight so the girl can leave the row for school.",
      stakeholder: "Plantation school teacher",
      crisisMeters: { local: { label: "Missed School", description: "Sari misses the first bell because the girl carries loose fruit at the weigh shed." }, global: { label: "Weigh Fraud", description: "The clerk writes a lower number for the same load, so the loan book does not move toward zero." }, support: { label: "Barrack Rules", description: "The barrack rule keeps the children on the fruit until the ticket matches the family debt." } },
      suggested: ["crypto", "iot", "ai", "networks", "space", "solar"],
      suggestedWhy: {
        "crypto": "A seal can lock the weigh number so the clerk cannot cut the same load.",
        "iot": "A sensor on the scale can keep one number for the same sack of fruit.",
        "ai": "A check can compare the load of today with the load of yesterday.",
        "networks": "A school link can show the debt page to a person outside the shed.",
        "space": "A view from above can show the palm row when Sari misses the first bell.",
        "solar": "Power from the sun can run a light so the desk stays open after dusk.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Bhadohi Loom Lanes"],
      title: "Knot counts after midnight",
      summary: "After midnight, counselor Meera counts knots with Imran in a Bhadohi loom lane. The wedding advance of the father sits on the warp. At noon the lane will look child-free, but the mother still waits for the next installment.",
      scene:
        "After midnight, counselor Meera sits on a low stool in a Bhadohi loom lane. Meera counts knots with a boy named Imran. The fingers of Imran move fast. The eyes of Imran are slow. The father of Imran took a wedding advance. The advance sits on the warp like a second pattern.\n\nAt noon, the audit van of the exporter will park at the mouth of the lane. An adult will walk the children to the courtyard of a cousin. An adult will give the children slates. The certificate will say child-free. The order will still ship.\n\nThe mother of Imran waits for the next installment. The installment is necessary. The loom stands in the house. The house is the factory. The clipboard does not see the night shift.\n\nMeera can hide a boy for an hour. Meera cannot hide the advance. The advance puts Imran back on the bench.",
      briefMd:
        "## The place\nAfter midnight, counselor Meera sits on a low stool in a Bhadohi loom lane. Meera counts knots with a boy named Imran. The fingers of Imran move fast. The eyes of Imran are slow.\n\nThe father of Imran took a wedding advance. The advance sits on the warp like a second pattern. The loom stands in the house, so the house is the factory. The clipboard does not see the night shift.\n\nAt noon, the audit van will park at the mouth of the lane. An adult will walk the children to the courtyard of a cousin and give the children slates. The certificate will say child-free. The order will still ship.\n\n## The bigger problem\nThe next installment is necessary for the mother of Imran. The advance puts the boy back on the bench after a short hide. Meera can hide a boy for an hour. Meera cannot hide the advance.\n\nThe day audit will not see the night knots. The lane will look child-free, but the order will still ship.\n\n## Your job\nHold a true record of the night knots after the audit van leaves.",
      stakeholder: "Child-rights counselor",
      crisisMeters: { local: { label: "Child Hours", description: "Imran counts knots after midnight in the loom lane, and the eyes of the boy are slow." }, global: { label: "Family Advances", description: "The father took a wedding advance, and the mother waits for the next installment." }, support: { label: "Fake Audits", description: "The noon audit will show slates and a child-free certificate while the order still ships." } },
      suggested: ["ai", "networks", "crypto", "vr", "computing", "iot"],
      suggestedWhy: {
        "ai": "A check can mark a child-free certificate that does not match the night knots.",
        "networks": "A private link can carry the night count to a counselor outside the lane.",
        "crypto": "A seal can tie the knot count to the hour after midnight.",
        "vr": "A lane model can show the night bench that the clipboard does not see.",
        "computing": "A shared record can keep the wedding advance next to the night hours.",
        "iot": "A small counter on the loom can log knots when the audit van is absent.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Kolwezi Dig Trenches"],
      title: "Ore sacks instead of schoolbags",
      summary: "Nurse Amina wraps the lower back of a boy in a Kolwezi trench. A torn chit tags the sack of cobalt rock, and the chit is good only at the stall of the pit boss. A rest grows the stall debt, and a new lift can fail the spine.",
      scene:
        "Nurse Amina kneels in a Kolwezi trench. Amina wraps the lower back of a boy with the last clean gauze. The boy is twelve. The boy dragged a sack of cobalt rock to the depot. The sack sits in the dirt. A torn chit tags the sack.\n\nThe buyer will not pay cash. The chit is good only at the stall of the pit boss. The rice at the stall costs more than the ore. The schoolbags stay under a cot. The trench is the work of the day.\n\nThe mobile post of Amina can treat strain. The post cannot cash a chit. The formal depot up the road buys mixed sacks. The depot does not ask for names. The mineral for a phone will still leave as clean cobalt.\n\nThe mother of the boy watches the wrap. The stall debt grows if the boy rests tomorrow. The spine can fail if the boy lifts the sack again.",
      briefMd:
        "## The place\nNurse Amina kneels in a Kolwezi trench and wraps the lower back of a boy with the last clean gauze. The boy is twelve. The boy dragged a sack of cobalt rock to the depot. The sack sits in the dirt with a torn chit.\n\nThe buyer will not pay cash. The chit is good only at the stall of the pit boss. The rice at the stall costs more than the ore. The schoolbags stay under a cot, and the trench is the work of the day.\n\nThe mobile post can treat strain. The post cannot cash a chit. The mother watches the wrap. A rest tomorrow grows the stall debt. A new lift can fail the spine.\n\n## The bigger problem\nThe formal depot up the road buys mixed sacks. The depot does not ask for names. The mineral for a phone will still leave as clean cobalt.\n\nThe pit boss holds the only pay stall. The boy goes deeper into debt if the boy rests, and the boy risks the spine if the boy lifts again.\n\n## Your job\nPay the boy for the ore outside the stall of the pit boss.",
      stakeholder: "Mobile health-post nurse",
      crisisMeters: { local: { label: "Spine Strain", description: "A sack of cobalt rock strains the lower back of a boy who is twelve." }, global: { label: "Chit Pay", description: "The torn chit pays only at the stall, where the rice costs more than the ore." }, support: { label: "Pit Bosses", description: "The pit boss keeps the stall debt and sets the rice price above the ore." } },
      suggested: ["drones", "iot", "ai", "robots", "networks", "crypto", "computing"],
      suggestedWhy: {
        "drones": "A small aircraft can show the trench and the tagged sack from above.",
        "iot": "A tag sensor can follow the cobalt sack from the trench to the depot.",
        "ai": "A check can mark clean cobalt that comes from a no-name mixed sack.",
        "robots": "A lift machine can move the rock so the boy does not strain the spine.",
        "networks": "A clinic link can send the strain record without the stall chit.",
        "crypto": "A seal can tie ore pay to the boy and not to the pit boss stall.",
        "computing": "A shared record can show the chit price next to the rice price.",
      },
      visionTheme: "energy-city",
    }
  ],

  women: [
    {
      places: ["Riverside Maternity Shift Gate, Padma Bend"],
      title: "The walk home after midnight",
      summary: "Asha clocks out at 12:17 and steps through the hospital shift gate. The hospital cut the staff van last spring. The city bus ends at ten. She walks the dark river path to the ferry stairs. A man followed a colleague there two weeks ago.",
      scene:
        "Asha clocks out at 12:17 and steps through the shift gate. The last newborn of her rotation cries behind the ward door. The hospital light stops at the fence. Beyond the fence the river path is a dark ribbon toward the ferry stairs.\n\nThe hospital cut the staff van last spring. The accounts team called the night run a luxury. The city bus ends at ten. Asha walks with her phone torch and a whistle on a string.\n\nTwo weeks ago a man followed a colleague to the landing. The colleague moved to day shifts and lost the night pay. That pay bought insulin for her mother.\n\nThe roster stacks births after midnight. Street lamps follow shop hours, not ward hours. Guards stay inside the gate. Their post is the building. The road is a problem for the nurse.\n\nThe sister of Asha sends a text and asks if Asha is at the stairs. Three more night nurses filed papers this month. A thin night crew can lose the hands that know a breech.",
      briefMd:
        "## The place\nAsha clocks out at 12:17 at the Riverside Maternity Shift Gate in Padma Bend. She steps through the shift gate after the last birth of her rotation. The newborn cries behind the ward door. The hospital light stops at the fence. The river path is a dark ribbon toward the ferry stairs.\n\nThe hospital cut the staff van last spring. The accounts team called the night run a luxury. The city bus ends at ten. Asha walks with a phone torch and a whistle on a string.\n\nTwo weeks ago a man followed a colleague to the landing. The colleague moved to day shifts. The move cut the night pay. That pay bought insulin for her mother.\n\n## The bigger problem\nThe roster stacks births after midnight. Street lamps follow shop hours, not ward hours. Guards stay inside the gate. Their post is the building. The dark road falls to the nurse.\n\nThe sister of Asha sends a text and asks if Asha is at the stairs. Three more night nurses filed papers this month. A thin night crew can lose the hands that know a breech.\n\n## Your job\nMake the night walk from the shift gate to the ferry stairs safe for Asha.",
      stakeholder: "Night-shift nurses' safety caucus",
      crisisMeters: { local: { label: "Night Fear", description: "Asha walks a dark river path after midnight with a phone torch and a whistle." }, global: { label: "Shuttle Gap", description: "The hospital cut the staff van, and the city bus ends at ten." }, support: { label: "Staff Loss", description: "Night nurses file papers after a colleague lost the night pay for her mother." } },
      suggested: ["networks", "solar", "iot", "transportation", "ai", "battery", "computing"],
      suggestedWhy: {
        "networks": "A night network can warn the safety caucus when Asha leaves the shift gate.",
        "solar": "A solar lamp can light the river path after shop lamps go dark.",
        "iot": "A path sensor can mark the ferry stairs on the walk from the gate.",
        "transportation": "A night ride can cover the river path after the city bus ends at ten.",
        "ai": "A watch tool can flag a follower on the dark path to the landing.",
        "battery": "A battery lamp can stay bright after the hospital light stops at the fence.",
        "computing": "A roster screen can show which night nurses walk alone to the ferry stairs.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Old Bund Land Registry, Khetpur Flats"],
      title: "The deed still needs his name",
      summary: "Meena sets a death certificate on the ledge at window three. The paddy title still carries the name of her husband. The file will not save with one adult. If the title lapses, school fees for her daughter lapse with the field.",
      scene:
        "Meena sets a death certificate on the ledge at window three of the Old Bund Land Registry in Khetpur Flats. Beside the certificate she lays the harvest book with her pencil marks. The clerk stamps WAITING and does not look up. The name of her husband still holds the paddy title. His name also holds the grave.\n\nThe new kiosk will not save a file with one adult. A box labeled Co-Owner Male blinks red when Meena leaves the box empty. A cousin at the tea stall offers to add his name at this time. A name added at this time is how a field changes families.\n\nLast season Meena planted the high bund herself. The canal man did not lift her gate without a man's thumb on the water slip. She borrowed from a trader at a rate that eats the crop.\n\nThe registry calls this step modernization. The staff scanned the old books. The staff scanned the old rule with the books. A woman holds land through a man.\n\nIf the title lapses, school fees lapse with the field. Her daughter is twelve. The desk can print a cultivation pass that dies before the next rain.",
      briefMd:
        "## The place\nMeena sets a death certificate on the ledge at window three of the Old Bund Land Registry in Khetpur Flats. Beside the certificate she lays the harvest book with her pencil marks. The clerk stamps WAITING and does not look up. The name of her husband still holds the paddy title. His name also holds the grave.\n\nThe new kiosk will not save a file with one adult. A box labeled Co-Owner Male blinks red when Meena leaves the box empty. A cousin at the tea stall offers to add his name at this time. A name added at this time is how a field changes families.\n\nLast season Meena planted the high bund herself. The canal man did not lift her gate without a man's thumb on the water slip. She borrowed from a trader at a rate that eats the crop.\n\n## The bigger problem\nThe registry calls this step modernization. The staff scanned the old books. The staff scanned the old rule with the books. A woman holds land through a man.\n\nIf the title lapses, school fees lapse with the field. Her daughter is twelve. The desk can print a cultivation pass that dies before the next rain.\n\n## Your job\nPut the paddy title in the name of Meena, the person who farms the field.",
      stakeholder: "Widows' land rights desk",
      crisisMeters: { local: { label: "Field Loss", description: "Meena can lose the high bund if the title stays in the name of her dead husband." }, global: { label: "Title Block", description: "The kiosk will not save a file when the Co-Owner Male box stays empty." }, support: { label: "Legal Limbo", description: "The desk prints a cultivation pass that dies before the next rain." } },
      suggested: ["networks", "ai", "crypto", "computing", "space", "iot", "drones"],
      suggestedWhy: {
        "networks": "A registry link can send the death certificate with the harvest book.",
        "ai": "A form check can accept one adult on the paddy title file.",
        "crypto": "A record in her control can keep the harvest marks with her name.",
        "computing": "A kiosk screen can save a title file for one adult.",
        "space": "A sky image can show the high bund that Meena planted last season.",
        "iot": "A canal sensor can log a gate lift without a man's thumb on the slip.",
        "drones": "An image from above can show the crop on the bund that Meena planted.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["East Yard Trade School, Harbor Ward"],
      title: "The welding bay closes at dusk",
      summary: "Priya holds a paper coupon for live bay four after the lunch bell. Afternoon steel time belongs to the shipyard men. The shutters come down at six. The apprenticeship letter has a date in the week after a test she cannot sit.",
      scene:
        "Priya pulls the practice headset from the closet after the lunch bell at East Yard Trade School in Harbor Ward. She has forty minutes before she must collect her sister from the market stair. On the screen an overhead joint cools in perfect time. Her paper coupon for live bay four expires on Friday.\n\nThe cert board will not log headset hours. The board wants burned gloves and a stamp from a physical booth. Afternoon steel time belongs to the shipyard men. The men overrun the bay and leave no gap. At six the shutters come down. The painted line says Safety After Dark.\n\nPriya asked to stay with a supervisor in the bay. The board said no to mixed evenings. An incident file did not exist. The decision came from a vote.\n\nShe lays a clean bead in the simulation and saves the file. The file will not open the yard gate. Her mother asks her to work the stall by dusk. The apprenticeship letter has a date in the week after the test.\n\nThe problem is not only a locked bay. The board does not count a woman's practice as a real skill. The skill counts only in a room that the board bars to her.",
      briefMd:
        "## The place\nPriya pulls the practice headset from the closet after the lunch bell at East Yard Trade School in Harbor Ward. She has forty minutes before she must collect her sister from the market stair. On the screen an overhead joint cools in perfect time. Her paper coupon for live bay four expires on Friday.\n\nThe cert board will not log headset hours. The board wants burned gloves and a stamp from a physical booth. Afternoon steel time belongs to the shipyard men. The men overrun the bay and leave no gap. At six the shutters come down. The painted line says Safety After Dark.\n\nPriya asked to stay with a supervisor in the bay. The board said no to mixed evenings. An incident file did not exist. The decision came from a vote.\n\nShe lays a clean bead in the simulation and saves the file. The file will not open the yard gate. Her mother asks her to work the stall by dusk. The apprenticeship letter has a date in the week after the test.\n\n## The bigger problem\nThe problem is not only a locked bay. The board does not count a woman's practice as a real skill. The skill counts only in a room that the board bars to her.\n\n## Your job\nOpen a path for Priya to log live bay hours before the apprenticeship test.",
      stakeholder: "Women apprentices' coalition",
      crisisMeters: { local: { label: "Skill Block", description: "The cert board will not log headset hours, so the clean bead does not count." }, global: { label: "Bay Lock", description: "Live bay four closes at six, and afternoon steel time belongs to the shipyard men." }, support: { label: "Family Pull", description: "Priya must collect her sister and work the stall by dusk." } },
      suggested: ["vr", "print3d", "networks", "ai", "solar", "robots", "computing"],
      suggestedWhy: {
        "vr": "A headset scene can let Priya practice the overhead joint before Friday.",
        "print3d": "A metal sample can show a clean bead while live bay four stays shut.",
        "networks": "A shared log can carry headset hours to the cert board for review.",
        "ai": "A check tool can compare a practice bead with the bay joint standard.",
        "solar": "A yard lamp can light a supervised bench in the hours before dusk.",
        "robots": "A practice arm can guide the torch line while Priya learns the joint.",
        "computing": "A saved simulation file can sit with the paper coupon before the test.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Lakeview Family Planning Counter, West Shore"],
      title: "The form still wants his signature",
      summary: "Lila sets her paper number on the Lakeview counter. Box 7 waits for a spouse signature. The drawer will not open for one name. Last year the same empty box sent her home with a pregnancy after her decision against it.",
      scene:
        "Lila sets her paper number on the Lakeview Family Planning Counter on the West Shore. Her toddler hooks a fist in her scarf. The clerk slides a pink sheet across the wood. Box 7 waits for a spouse signature. The printer will not drop the implant kit until a second name hits the till.\n\nHer husband is on the far shore for three weeks. His phone stays dark. Last year the same empty box sent her home. She carried a pregnancy after a decision against it.\n\nThe midwife can talk. The midwife cannot override the software. District insurance pays only when the screen shows dual consent.\n\nA volunteer murmurs that a person can sign the sheet. Lila shakes her head. News walks the lake road faster than a boat. Women skip the counter for kiosk pills with no dose and no record.\n\nThe clinic lights work. The midwife is in the room. The rule says a grown woman must put a man's name on the form. The rule is in three languages. The same rule sits in the drawer software.",
      briefMd:
        "## The place\nLila sets her paper number on the Lakeview Family Planning Counter on the West Shore. Her toddler hooks a fist in her scarf. The clerk slides a pink sheet across the wood. Box 7 waits for a spouse signature. The printer will not drop the implant kit until a second name hits the till.\n\nHer husband is on the far shore for three weeks. His phone stays dark. Last year the same empty box sent her home. She carried a pregnancy after a decision against it.\n\nThe midwife can talk. The midwife cannot override the software. District insurance pays only when the screen shows dual consent.\n\nA volunteer murmurs that a person can sign the sheet. Lila shakes her head. News walks the lake road faster than a boat. Women skip the counter for kiosk pills with no dose and no record.\n\n## The bigger problem\nThe clinic lights work. The midwife is in the room. The rule says a grown woman must put a man's name on the form. The rule is in three languages. The same rule sits in the drawer software.\n\n## Your job\nLet Lila leave with the implant kit on her own consent.",
      stakeholder: "Community midwives' network",
      crisisMeters: { local: { label: "Care Denial", description: "The printer will not drop the implant kit while Box 7 stays empty." }, global: { label: "Consent Gate", description: "District insurance pays only when the screen shows dual consent." }, support: { label: "Clinic Stigma", description: "News on the lake road pushes women toward kiosk pills with no dose and no record." } },
      suggested: ["networks", "ai", "iot", "computing", "solar", "crypto", "drones"],
      suggestedWhy: {
        "networks": "A shore link can show his status while his phone stays dark.",
        "ai": "A consent screen can take one adult decision without a second name.",
        "iot": "A drawer sensor can note one valid consent at the Lakeview counter.",
        "computing": "Clinic software can store one name from the pink sheet.",
        "solar": "A power unit can keep the counter printer ready during her visit.",
        "crypto": "A private record can hold her decision so lake-road news cannot spread it.",
        "drones": "A carry flight can move a recorded kit when the counter drawer stays shut.",
      },
      visionTheme: "social-city",
    }
  ],

  education: [
    {
      places: ["Marsh Bend"],
      title: "Flood weeks erase a grade in Marsh Bend",
      summary: "Tanya Brooks writes the water depth on Parish Road 12. Marsh Bend Elementary is still a brown lake. The school was due to reopen on Monday. Malik missed eleven days this month. Malik cannot finish the fraction unit.",
      scene:
        "Tanya Brooks stands on the gravel shoulder of Parish Road 12. Tanya Brooks writes the water depth on a clipboard. The corners of the clipboard are soft. The lot at Marsh Bend Elementary is still a brown lake. A heron works the outfield. It is Wednesday.\n\nA text from the superintendent tells the school to wait for the county. The county waits for the levee board. The levee board waits for a pump impeller. The impeller sits in a warehouse two parishes away. Buses do not take the dip by the Baptist church.\n\nSouth-bend students missed eleven days this month. Last spring those students missed fourteen days. The school was due to reopen on Monday.\n\nTanya Brooks hands makeup packets through truck windows after the shift at the grain elevator. The packets leave the office in grocery bags. Most bags return with stains. Some bags do not return. Malik can name every bayou cut between the lock and the parish line. Malik cannot finish the fraction unit from September.\n\nThe office calendar follows cotton. The calendar does not follow the levee. The levee overtopped three times in five years. State money follows seats in a dry room. The money stops when the room floods. The reading aide is the first cut.\n\nThe next high water meets a thinner staff and the same attendance rule. The high school stamped Malik for chronic absence. The stamp does not mention the river.",
      briefMd:
        "## The place\n\nTanya Brooks stands on the gravel shoulder of Parish Road 12. Tanya Brooks writes the water depth on a clipboard. The lot at Marsh Bend Elementary is still a brown lake. It is Wednesday. Buses do not take the dip by the Baptist church. The school was due to reopen on Monday.\n\nSouth-bend students missed eleven days this month. Last spring those students missed fourteen days. Tanya Brooks hands makeup packets through truck windows after the shift at the grain elevator. Most bags return with stains. Some bags do not return. Malik cannot finish the fraction unit from September.\n\n## The bigger problem\n\nA text from the superintendent tells the school to wait for the county. The county waits for the levee board. The levee board waits for a pump impeller. The impeller sits in a warehouse two parishes away.\n\nThe office calendar follows cotton. The calendar does not follow the levee. The levee overtopped three times in five years. State money stops when the room floods. The reading aide is the first cut. The high school stamped Malik for chronic absence.\n\n## Your job\n\nProtect the Marsh Bend grade when flood weeks close the school.",
      stakeholder: "Tanya Brooks, PTA lead and levee witness",
      crisisMeters: { local: { label: "Missed Days", description: "South-bend students missed eleven days this month and fourteen days last spring." }, global: { label: "Flood Calendar", description: "The levee overtopped three times in five years. State money stops when the classroom floods." }, support: { label: "Catch Up Faith", description: "Makeup bags return with stains or do not return. Malik cannot finish the fraction unit from September." } },
      suggested: ["networks", "ai", "solar", "battery", "vr", "computing", "drones", "materials"],
      suggestedWhy: {
        "networks": "A network can carry lessons when buses do not take the church dip.",
        "ai": "A model can guide the fraction unit when Malik cannot sit in class.",
        "solar": "Solar power can run a small class site when the school lot stays a lake.",
        "battery": "A battery can keep lights on when the pump waits in a far warehouse.",
        "vr": "A headset can show the fraction unit when the classroom stays closed.",
        "computing": "A computer can hold makeup work when grocery bags do not return.",
        "drones": "A drone can read water depth on Parish Road 12 from the shoulder.",
        "materials": "A dry material can keep packets clean when bags return with stains.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Packingtown"],
      title: "English-only exams strand Packingtown fifth-graders",
      summary: "Hodan Ali tapes a paper number to the collar of Aisha at Packingtown Intermediate. The exam booklet uses an English word for harvest. Aisha does not know that word. A wrong score here keeps Aisha in fifth grade.",
      scene:
        "Hodan Ali kneels on the cafeteria tile at Packingtown Intermediate. Hodan Ali tapes a paper number to the collar of Aisha. It is state exam morning. The room smells of bleach and boxed apple juice.\n\nLast night Aisha solved three word problems at the kitchen table. Hodan Ali read those problems in Somali after the late chain at the packing plant. Aisha knew each answer.\n\nThe proctor reads the directions in English only. The pencil of Aisha stops on a farm-stand story. Aisha knows the arithmetic. Aisha does not know the English word for harvest in the booklet. A boy from the Saturday clean crew sits two seats away. The boy turns a page the boy does not read.\n\nThe plant runs two day shifts and a weekend washdown. The free adult English class meets at the same hour. The line wants workers at that hour.\n\nThe district cut the bilingual aides after the scores from last year. Scores follow the English booklet. The booklet follows an old rule. Packingtown used one language on paper at the time of that rule.\n\nHodan Ali is the plant nurse. This month Hodan Ali cleaned three line cuts on fathers. The fathers hid the cuts. The fathers did not want to miss a Saturday. The fathers thought that Saturday was makeup. Makeup did not exist.\n\nA wrong decision from this booklet keeps Aisha in fifth grade. The booklet does not ask who stands outside its words.",
      briefMd:
        "## The place\n\nHodan Ali kneels on the cafeteria tile at Packingtown Intermediate. Hodan Ali tapes a paper number to the collar of Aisha. It is state exam morning. The room smells of bleach and boxed apple juice.\n\nLast night Aisha solved three word problems at the kitchen table. Hodan Ali read those problems in Somali after the late chain at the packing plant. Aisha knew each answer. The proctor reads the directions in English only. Aisha does not know the English word for harvest in the booklet.\n\n## The bigger problem\n\nThe plant runs two day shifts and a weekend washdown. The free adult English class meets at the same hour. The line wants workers at that hour. The district cut the bilingual aides after the scores from last year.\n\nScores follow the English booklet. The booklet follows an old rule. Packingtown used one language on paper at the time of that rule. Makeup did not exist on that Saturday. A wrong decision from this booklet keeps Aisha in fifth grade.\n\n## Your job\n\nStop the English booklet from holding Aisha in fifth grade.",
      stakeholder: "Hodan Ali, plant nurse and parent advocate",
      crisisMeters: { local: { label: "Reading Gap", description: "Aisha does not know the English word for harvest in the exam booklet." }, global: { label: "Language Rules", description: "The booklet follows an old rule. Packingtown used one language on paper at that time." }, support: { label: "Aide Shortage", description: "The district cut the bilingual aides. The adult English class meets at the plant hour." } },
      suggested: ["ai", "networks", "vr", "computing", "transportation", "iot", "solar"],
      suggestedWhy: {
        "ai": "A model can read the harvest word in Somali for Aisha.",
        "networks": "A network can bring the adult English class to the plant hour.",
        "vr": "A scene can show the farm stand so Aisha knows the booklet word.",
        "computing": "A computer can score the arithmetic when the booklet uses English only.",
        "transportation": "A ride can move parents to class after the plant shift ends.",
        "iot": "A sensor can log line cuts so fathers do not hide a Saturday.",
        "solar": "Solar power can light a class room after the late chain ends.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Heat Ridge"],
      title: "Blackout classrooms empty Heat Ridge by noon",
      summary: "Luis Ortega props open the gym doors at Heat Ridge Middle. Classroom thermostats show ninety-four. The principal calls a noon release. Marcus lost the same weather unit three times.",
      scene:
        "Luis Ortega props open the gym doors at Heat Ridge Middle. Luis Ortega feels the air from the court. The classroom thermostats show ninety-four. The time is 10:40 in the morning. The radio of the principal crackles. The school releases students at noon again.\n\nThe district still logs a full day because the buses ran at seven. Students walk home to trailers. The swamp cooler in the trailers seized in June. Some students stay in the Dollar General aisle until a grown person clocks out. Luis Ortega keeps a clipboard of students who return for evening drills. The list shortens in each heat week.\n\nThe substation on Ridge Road sheds the school first at the peak. The utility treats evening houses as the precious load. The school is a daytime customer with no storage. The contract fines the district for a hard draw at midday.\n\nTeachers print packets in a dark office. Packets do not run a lab. The attendance rule wants students in numbered rooms. Those rooms cannot hold the students.\n\nMarcus starts for Luis Ortega. Marcus lost the same weather unit three times. Marcus can finish a fast break on this floor. No person taught Marcus that unit. Marcus cannot sit a science test on that unit.",
      briefMd:
        "## The place\n\nLuis Ortega props open the gym doors at Heat Ridge Middle. The classroom thermostats show ninety-four. The time is 10:40 in the morning. The school releases students at noon again. Students walk home to trailers. The swamp cooler in the trailers seized in June.\n\nSome students stay in the Dollar General aisle until a grown person clocks out. Luis Ortega keeps a clipboard of students who return for evening drills. The list shortens in each heat week. Marcus lost the same weather unit three times. Marcus cannot sit a science test on that unit.\n\n## The bigger problem\n\nThe substation on Ridge Road sheds the school first at the peak. The utility treats evening houses as the precious load. The school is a daytime customer with no storage. The contract fines the district for a hard draw at midday.\n\nThe district still logs a full day because the buses ran at seven. Teachers print packets in a dark office. Packets do not run a lab. Those rooms cannot hold the students.\n\n## Your job\n\nHold class time at Heat Ridge when heat forces a noon release.",
      stakeholder: "Luis Ortega, after-school coach",
      crisisMeters: { local: { label: "Heat Days", description: "Classroom thermostats show ninety-four. The school releases students at noon again." }, global: { label: "Power Gaps", description: "The substation sheds the school first. The contract fines a hard draw at midday." }, support: { label: "Empty Homes", description: "Students go to trailers with a seized cooler or wait in a store aisle." } },
      suggested: ["solar", "battery", "networks", "ai", "computing", "vr", "iot", "energy"],
      suggestedWhy: {
        "solar": "Solar power can cool Heat Ridge rooms when the substation sheds the school.",
        "battery": "A battery can store power so the school is not a hard midday draw.",
        "networks": "A network can send the weather unit when rooms show ninety-four.",
        "ai": "A tutor model can teach the weather unit Marcus lost three times.",
        "computing": "A computer can run a lab when a dark office prints packets only.",
        "vr": "A cool scene can hold the science test when the gym air is the relief.",
        "iot": "A meter can show the ninety-four reading before the noon release.",
        "energy": "Stored energy can keep classrooms open past the noon release.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Millbridge"],
      title: "Teen caregivers miss the credit clock in Millbridge",
      summary: "Keisha Dunn slides a manila folder across the counter at Millbridge High. No course code exists for a teen who nurses his grandmother after last bell. A drop below the credit line ends the free lunch that keeps DeShawn at the door.",
      scene:
        "Keisha Dunn slides a manila folder across the registrar counter at Millbridge High. The folder holds a week of time sheets. One sheet shows clinic drop-off at 2:10. One sheet shows the pharmacy window. One sheet shows the hour after the porch fall. DeShawn sat with his grandmother in that hour.\n\nKeisha Dunn heads each page in the same way as the night clinicals at the community college. The registrar is kind. The software is not kind. No course code exists for a seventeen-year-old who is the afternoon nurse in his own house. Seat time still means a chair in a numbered room. The welding shop will not take a note from a pharmacist.\n\nOnline makeup exists as a login. The lab hours do not transfer. The night section has a code for adults. DeShawn is seventeen. The portal rejects the ID of DeShawn.\n\nKeisha Dunn is twenty-eight. Keisha Dunn became the kinship caregiver when the mill closed and the sister left. One more absence stops the certificate of Keisha Dunn. A drop below the credit line this term ends the free lunch for DeShawn. That lunch keeps DeShawn at the front door. The town wants Keisha Dunn and DeShawn to finish.\n\nThe credit clock fits a house with another person home after last bell.",
      briefMd:
        "## The place\n\nKeisha Dunn slides a manila folder across the registrar counter at Millbridge High. The folder holds a week of time sheets. One sheet shows clinic drop-off at 2:10. One sheet shows the pharmacy window. One sheet shows the hour after the porch fall. DeShawn sat with his grandmother in that hour.\n\nNo course code exists for a seventeen-year-old who is the afternoon nurse in his own house. Seat time still means a chair in a numbered room. The welding shop will not take a note from a pharmacist. The portal rejects the ID of DeShawn.\n\n## The bigger problem\n\nOnline makeup exists as a login. The lab hours do not transfer. The night section has a code for adults. DeShawn is seventeen.\n\nKeisha Dunn became the kinship caregiver when the mill closed and the sister left. One more absence stops the certificate of Keisha Dunn. A drop below the credit line this term ends the free lunch for DeShawn. The credit clock fits a house with another person home after last bell.\n\n## Your job\n\nKeep the credits and the free lunch for DeShawn when care replaces seat time.",
      stakeholder: "Keisha Dunn, kinship caregiver and night student",
      crisisMeters: { local: { label: "Credits Lost", description: "No course code exists for the afternoon care that DeShawn gives his grandmother." }, global: { label: "Seat Rules", description: "Seat time means a chair in a numbered room. The portal rejects the ID of DeShawn." }, support: { label: "Care Load", description: "One more absence stops the certificate of Keisha Dunn. A credit drop ends the free lunch for DeShawn." } },
      suggested: ["ai", "networks", "vr", "computing", "transportation", "solar", "battery", "robots"],
      suggestedWhy: {
        "ai": "A model can map clinic hours to credit when no course code exists.",
        "networks": "A network can carry lab hours when DeShawn cannot sit in a numbered room.",
        "vr": "A lab scene can count shop hours when the welding shop rejects a note.",
        "computing": "A portal can accept a teen ID for the night section code.",
        "transportation": "A ride can cover clinic drop-off so seat time does not fail.",
        "solar": "Solar power can light night study when Keisha Dunn works clinicals.",
        "battery": "A battery can keep a home terminal on after last bell.",
        "robots": "A helper can sit with the grandmother so DeShawn can hold his credits.",
      },
      visionTheme: "care-city",
    }
  ],

  automation: [
    {
      places: ["Cedar Junction Fulfillment Hub"],
      title: "Aisles that pick themselves",
      summary: "Maya clocks in at 10:47 p.m. She finds her bay half-empty. The easy shelves are clear. The unit rate for the same shift rose.\n\nRent is due on Friday. Three more names moved to the flex pool.",
      scene:
        "Maya clocks in at 10:47 p.m. at Cedar Junction Fulfillment Hub. She finds her bay half-empty. The new aisle robots finished the easy shelves. Awkward cases remain for the night crew. Those cases are soft fruit, odd sizes, and cases that jam the grippers.\n\nHer handheld shows a higher pick rate than last week. The shift length stays the same. Fewer hands work on the floor. The steward board by the break room lists three more names in the flex pool. The flex pool gives no guaranteed hours.\n\nCorporate pays by units cleared per hour. The algorithm sets the rate from clean robot runs. The algorithm applies that pace to the crew. Rent for Maya is due on Friday. Maya can skip the safety stretch and take the heavy top shelf to keep the quota.",
      briefMd:
        "## The place\n\nCedar Junction Fulfillment Hub runs the night pick. Maya is the night pick crew steward. She clocks in at 10:47 p.m. She finds her bay half-empty. Aisle robots finished the easy shelves. Awkward cases remain for the crew.\n\nHer handheld shows a higher pick rate than last week. The shift length stays the same. Fewer hands work on the floor. The steward board lists three more names in the flex pool. The flex pool gives no guaranteed hours.\n\nCorporate pays by units cleared per hour. The algorithm sets the rate from clean robot runs. The algorithm applies that pace to the crew. Rent for Maya is due on Friday. She can skip the safety stretch to keep the quota. She can take the heavy top shelf herself.\n\n## The bigger problem\n\nThe algorithm takes the pace from clean robot runs. The algorithm applies that pace to the crew. Corporate pays by units cleared per hour. The flex pool removes guaranteed hours. Rent stress hits Maya when the quota stays high.\n\n## Your job\n\nKeep guaranteed hours for the night crew when the pick quota stays high.",
      stakeholder: "Night pick crew steward",
      crisisMeters: { local: { label: "Jobs", description: "Night pick jobs shrink when three more names move to the flex pool." }, global: { label: "Pick quotas", description: "The pick quota rises because the algorithm copies clean robot runs." }, support: { label: "Rent stress", description: "Rent for Maya is due on Friday if the night quota slips." } },
      suggested: ["robots", "ai", "iot", "networks", "computing", "transportation"],
      suggestedWhy: {
        "robots": "Robots can clear easy shelves and leave awkward cases for the night crew.",
        "ai": "An algorithm can copy clean robot runs and set the crew pick rate.",
        "iot": "Shelf sensors can show cases that jam grippers on the night shift.",
        "networks": "A network can send the unit rate from the hub to the handheld.",
        "computing": "A computer can count units cleared per hour for the same shift.",
        "transportation": "A cart can move heavy top-shelf cases on the night pick.",
      },
      visionTheme: "food-city",
      rules: [
        {
          id: "piece-rate-follows-robots",
          kind: "policy",
          label: "Piece-rate follows robot pace",
          body: "The unit rate learns from robot clean runs, then applies that pace to people.",
          effects: ["share-required", "backlash"],
        }
      ],
    },
    {
      places: ["Harborview Driver Dispatch Garage"],
      title: "Medallions against empty curbs",
      summary: "Luis wipes salt off the garage whiteboard. Six medallion holders wait for airport runs. A rider cancels the load for a cheaper pod at the harbor curb. The daycare deposit bounced.",
      scene:
        "Luis wipes salt off the garage whiteboard at Harborview Driver Dispatch Garage. He counts the open slots. Six medallion holders wait for morning airport runs. Two city robotaxi pods idle at the curb outside. The port app booked those pods.\n\nA rider cancels the car for Luis during the load. The pod is three minutes cheaper. The co-op loan on the fleet does not change after the cancel. Dispatch ranks drivers by acceptance score and on-time percent. The scoreboard feeds the same app. The app steers riders toward the pods on mapped waterfront blocks.\n\nThe partner of Luis texts him. The daycare deposit bounced. Luis can chase the long suburban fare that no pod wants. Luis can sit at the curb and watch the score fall.",
      briefMd:
        "## The place\n\nHarborview Driver Dispatch Garage holds the morning slots. Luis is the independent driver co-op lead. He wipes salt off the garage whiteboard. He counts the open slots. Six medallion holders wait for airport runs. Two robotaxi pods idle at the curb.\n\nThe port app booked the pods. A rider cancels the car for Luis during the load. The pod is three minutes cheaper. The co-op loan does not change after the cancel. Dispatch ranks drivers by acceptance score. Dispatch ranks drivers by on-time percent.\n\nThe scoreboard feeds the same app. The app steers riders to pods on mapped waterfront blocks. The partner of Luis texts about the daycare deposit. The daycare deposit bounced. Luis can chase the long suburban fare. Luis can sit at the curb and watch the score fall.\n\n## The bigger problem\n\nThe port app steers riders to pods on mapped waterfront blocks. Dispatch ranks drivers by acceptance score and on-time percent. A cheap cancel can drop the score. The co-op loan stays due after the cancel. Debt stress hits Luis after the daycare deposit bounced.\n\n## Your job\n\nKeep curb access for medallion drivers when pods take the cheaper harbor trips.",
      stakeholder: "Independent driver co-op lead",
      crisisMeters: { local: { label: "Jobs", description: "Medallion holders wait for airport runs as pods take the booked curb trips." }, global: { label: "Fleet scores", description: "Fleet scores fall when a rider cancels a load for a cheaper pod." }, support: { label: "Debt", description: "The fleet loan and the bounced daycare deposit raise debt stress for Luis." } },
      suggested: ["self-driving", "ai", "networks", "transportation", "computing", "crypto"],
      suggestedWhy: {
        "self-driving": "Robotaxi pods can take booked curb trips and undercut a medallion fare.",
        "ai": "An app score can rank drivers by acceptance and on-time percent.",
        "networks": "A network can steer riders to pods on mapped waterfront blocks.",
        "transportation": "Airport runs can stay with medallion holders when pods take the curb.",
        "computing": "A dispatch computer can drop a score after a cancel during the load.",
        "crypto": "A ledger can record a cancel so the co-op sees the lost fare.",
      },
      visionTheme: "coastal-city",
      rules: [
        {
          id: "curb-ranked-by-app-score",
          kind: "policy",
          label: "Curb ranked by app score",
          body: "Dispatch ranks drivers by acceptance and on-time percent. The same app steers riders toward pods on mapped blocks.",
          effects: ["share-required", "backlash"],
        }
      ],
    },
    {
      places: ["Lakeside Hospital Revenue Wing"],
      title: "Charts coded without the wing",
      summary: "Priya opens the queue at 7:10 a.m. in the coding unit. Forty charts show a done mark. Two charts list the wrong side on a surgical case. The loan servicer wants a payment plan this week.",
      scene:
        "Priya opens the queue at 7:10 a.m. in the Lakeside Hospital Revenue Wing. She sees forty charts in green. The model filled diagnosis strings in the night. Priya did not review those notes. Two charts list the wrong side on a surgical case.\n\nAn override drops her throughput. The dashboard flags her bay after an override. An accept sends a wrong bill. A patient then gets a collections call for care that the patient did not receive.\n\nThe hospital bought the tool to cut denial rates. The hospital bought the tool to shrink the coding unit. Managers post daily chart targets next to the coffee machine. The student loan servicer wants a payment plan update this week. Priya can slow down and check each green line. Priya can clear the board and leave the damage to later appeals.",
      briefMd:
        "## The place\n\nLakeside Hospital Revenue Wing opens the coding queue at 7:10 a.m. Priya is the coding unit rep. She sees forty charts in green. The model filled diagnosis strings in the night. Priya did not review the source notes. Two charts list the wrong side on a surgical case.\n\nAn override drops throughput for Priya. The dashboard flags her bay after the override. An accept sends the wrong bill. A patient gets a collections call for care the patient did not receive.\n\nThe hospital bought the tool to cut denial rates. The purchase shrinks the coding unit. Managers post daily chart targets next to the coffee machine. The loan servicer wants a payment plan update this week. Priya can check each green line at a slow pace. Priya can clear the board and leave the damage to later appeals.\n\n## The bigger problem\n\nThe model fills codes from notes that Priya did not review. Chart targets flag a bay that overrides a green line. A wrong accept sends a bad bill to a patient. The coder still signs the chart. Loan strain hits Priya in the same week.\n\n## Your job\n\nProtect the coder who signs the chart when green lines show the wrong side.",
      stakeholder: "Coding unit rep",
      crisisMeters: { local: { label: "Jobs", description: "Coding jobs shrink because the hospital bought a tool to cut the unit." }, global: { label: "Chart targets", description: "Daily chart targets flag the bay when Priya overrides a green line." }, support: { label: "Loan strain", description: "The student loan servicer wants a payment plan update this week." } },
      suggested: ["ai", "computing", "networks", "vr", "crypto", "iot"],
      suggestedWhy: {
        "ai": "A model can fill diagnosis strings from notes before the coder reviews them.",
        "computing": "A dashboard can flag a bay when throughput drops on an override.",
        "networks": "A network can send a wrong bill and a collections call to a patient.",
        "vr": "A visual review can show the surgical side before the coder signs.",
        "crypto": "A record can tie a chart code to the care a patient did receive.",
        "iot": "A ward sensor can confirm the surgical side before a green code goes out.",
      },
      visionTheme: "care-city",
      rules: [
        {
          id: "chart-throughput-dashboard",
          kind: "policy",
          label: "Chart throughput dashboard",
          body: "Managers post daily chart targets. Overrides dip throughput and flag the bay.",
          effects: ["share-required", "backlash"],
        }
      ],
    },
    {
      places: ["Sunridge Berry Packing Shed"],
      title: "Sorters took the piece-rate weeks",
      summary: "Rosa walks the packing line before dawn. Clamshells pass a camera and a puff of air. Six pairs of hands did that work before. The sheet for this week has fewer names.\n\nRosa can split the remaining jobs. Rosa can send personnel home before the heat peaks.",
      scene:
        "Rosa walks the line before dawn at Sunridge Berry Packing Shed. She hears the soft clack of the new vision sorters. Clamshells pass a camera at this time. A puff of air moves each clamshell. Six pairs of hands did that tray work in past seasons.\n\nThe piece-rate board shows last season numbers in faded marker. The sheet for this week has fewer names. Growers pay the shed by packed flats per hour. Sorter speed drops human hours first in the contract math.\n\nThe crew includes teens who learned tray work from their parents. The crew includes older packers who did not get digital training. A supervisor offers upskill modules on a tablet. The modules give no childcare and no pay for the hour. Rosa can split the remaining hand-sort jobs into thinner shares. Rosa can send personnel home before the heat peaks.",
      briefMd:
        "## The place\n\nSunridge Berry Packing Shed starts the line before dawn. Rosa is the seasonal crew organizer. She hears the soft clack of the vision sorters. Clamshells pass a camera and a puff of air. Six pairs of hands did that work in past seasons.\n\nThe piece-rate board shows last season numbers in faded marker. The sheet for this week has fewer names. Growers pay the shed by packed flats per hour. Sorter speed drops human hours first.\n\nTeens in the crew learned tray work from their parents. Older packers did not get digital training. A supervisor offers upskill modules on a tablet. The modules give no childcare and no pay for the hour. Rosa can split the remaining hand-sort jobs. Rosa can send personnel home before the heat peaks.\n\n## The bigger problem\n\nMachine speed raises the flat count per hour. The contract drops human hours first. The weekly sheet lists fewer names. Tablet modules give no pay and no childcare.\n\n## Your job\n\nKeep paid hours for the pack crew when sorter speed cuts the weekly sheet.",
      stakeholder: "Seasonal crew organizer",
      crisisMeters: { local: { label: "Jobs", description: "Seasonal jobs thin when the sheet lists fewer names after sorter speed rises." }, global: { label: "Pack speed", description: "Pack speed from the vision sorter drops human hours in the flat-rate math." }, support: { label: "Skills", description: "Upskill modules on a tablet give no pay and no childcare for the crew." } },
      suggested: ["robots", "ai", "iot", "print3d", "networks", "computing"],
      suggestedWhy: {
        "robots": "Vision sorters can move clamshells with a camera and a puff of air.",
        "ai": "A vision model can sort fruit and cut the names on the weekly sheet.",
        "iot": "Line sensors can count packed flats per hour for the grower contract.",
        "print3d": "A printed tray guide can help packers who did not get digital training.",
        "networks": "A network can post the piece-rate sheet from the shed office to the line.",
        "computing": "Contract software can drop human hours first when sorter speed rises.",
      },
      visionTheme: "food-city",
      rules: [
        {
          id: "pack-speed-contract",
          kind: "policy",
          label: "Pack-speed contract",
          body: "Growers pay the shed by packed flats per hour. When the sorter speeds up, the contract math drops human hours first.",
          effects: ["share-required", "backlash"],
        }
      ],
    }
  ],

  refugees: [
    {
      places: ["Paso del Norte Hostel Strip"],
      title: "Hostels full, stamps still pending",
      summary: "Nora Velez unlocks the cooperative hostel before dawn. Nora Velez finds three families asleep against the gate. Nora Velez has two free mats. The stamp window across the street posts another delay. Luz loses her cot at checkout. The boy of Luz has a fever in the lobby.",
      scene:
        "Nora Velez unlocks the cooperative hostel before dawn. Nora Velez finds three families asleep against the front gate. Nora Velez has two free mats. The overnight bus from the interior drops more persons than the strip can hold.\n\nBy midmorning the stamp window across the street posts a new delay. Work cards will not print until biometric files clear a central queue. No person on this block can see the central queue. Landlords along the strip rent by the night. The landlords refuse longer leases without a stamp. Employers in the warehouse district refuse longer work without a stamp.\n\nMen take cash day labor at half the posted rate. A bed tonight costs more than pride. Luz loses her cot because Luz cannot show papers by checkout. The boy of Luz starts a fever on a plastic chair in the lobby.\n\nNora Velez can open floor space. Nora Velez cannot mint the stamp. The city treats the stamp as the only proof of belonging.",
      briefMd:
        "## The place\n\nThe place is the Paso del Norte Hostel Strip. Nora Velez unlocks the cooperative hostel before dawn. Nora Velez finds three families asleep against the front gate. Nora Velez has two free mats. The overnight bus from the interior drops more persons than the strip can hold.\n\nBy midmorning the stamp window across the street posts a new delay. Work cards will not print until biometric files clear a central queue. No person on this block can see the central queue. Landlords along the strip rent by the night. The landlords refuse longer leases without a stamp. Employers in the warehouse district refuse longer work without a stamp.\n\nMen take cash day labor at half the posted rate. A bed tonight costs more than pride. Luz loses her cot because Luz cannot show papers by checkout. The boy of Luz starts a fever on a plastic chair in the lobby.\n\n## The bigger problem\n\nNora Velez can open floor space. Nora Velez cannot mint the stamp. The city treats the stamp as the only proof of belonging. Shelter on the strip fails each time the paper system stalls.\n\n## Your job\n\nKeep a bed for each family when the stamp window delays the papers.",
      stakeholder: "Nora Velez, hostel cooperative coordinator",
      crisisMeters: { local: { label: "Crowding", description: "Three families sleep at the gate, and the cooperative hostel has only two free mats." }, global: { label: "Paper Delays", description: "The stamp window posts a delay, and work cards will not print from the unseen queue." }, support: { label: "Wage Pressure", description: "Men take cash day labor at half the posted rate because a bed costs more than pride." } },
      suggested: ["ai", "networks", "crypto", "computing", "solar", "battery", "print3d", "iot"],
      suggestedWhy: {
        "ai": "A model can flag the stamp delay before Luz loses the cot at checkout.",
        "networks": "A link can carry stamp status from the window to the hostel desk.",
        "crypto": "A seal can show that a biometric file stays the same in the queue.",
        "computing": "A small computer can track free mats and pending stamps on the strip.",
        "solar": "A panel can power the cooperative hostel when families sleep at the gate.",
        "battery": "A battery can keep lobby lights on for the boy of Luz.",
        "print3d": "A printer can make simple cot frames when the hostel has two mats.",
        "iot": "A sensor can count persons at the gate before the free mats end.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Old South Levee Road"],
      title: "Second breach, no parcel left",
      summary: "Coach Dara Nguyen walks the sandbag line at first light. Coach Dara Nguyen counts the new gap where the levee slumped. River water sits in the second row of kitchen gardens. No person gets a rebuild loan without a clean title. The nephew of Coach Dara Nguyen bags the tools after the morning shift. The nephew will not plant next season.",
      scene:
        "Coach Dara Nguyen walks the sandbag line at first light. Coach Dara Nguyen counts the new gap where the levee slumped overnight. River water sits in the second row of kitchen gardens. The mutual-aid shed still holds seed rice. The parcels that grew the seed rice sit underwater again.\n\nFamilies return after the last breach with handwritten claims and phone photos of old survey pins. The county map still lists half of those lots under owners who left a decade ago. No person gets a rebuild loan without a clean title. No person gets a place on the high ground list without a clean title.\n\nYoung workers load vans for the city. The young workers do not plan to plant next season. The nephew of Coach Dara Nguyen bags the tools after the morning shift. Food leaves with the young workers.\n\nThe levee fails in the same soft bend. Maintenance money follows recorded property. Maintenance money does not follow the persons who farm the shoulder.",
      briefMd:
        "## The place\n\nThe place is Old South Levee Road. Coach Dara Nguyen walks the sandbag line at first light. Coach Dara Nguyen counts the new gap where the levee slumped overnight. River water sits in the second row of kitchen gardens. The mutual-aid shed still holds seed rice. The parcels that grew the seed rice sit underwater again.\n\nFamilies return after the last breach with handwritten claims and phone photos of old survey pins. The county map still lists half of those lots under owners who left a decade ago. No person gets a rebuild loan without a clean title. No person gets a place on the high ground list without a clean title.\n\nYoung workers load vans for the city. The young workers do not plan to plant next season. The nephew of Coach Dara Nguyen bags the tools after the morning shift. Food leaves with the young workers.\n\n## The bigger problem\n\nThe levee fails in the same soft bend. Maintenance money follows recorded property. Maintenance money does not follow the persons who farm the shoulder. A washed road can erase a harvest and a home at one time.\n\n## Your job\n\nProtect the harvest and the home when the levee slumps and the title stays unclear.",
      stakeholder: "Coach Dara Nguyen, levee mutual-aid lead",
      crisisMeters: { local: { label: "Flooding", description: "River water sits in the second row of kitchen gardens after the levee slumps overnight." }, global: { label: "Lost Titles", description: "The county map lists old owners, so no person gets a rebuild loan without a clean title." }, support: { label: "Outmigration", description: "Young workers load vans for the city and do not plan to plant next season." } },
      suggested: ["solar", "battery", "iot", "drones", "materials", "ai", "space", "print3d"],
      suggestedWhy: {
        "solar": "A panel can power a pump when river water sits in the kitchen gardens.",
        "battery": "A battery can light the sandbag line for Coach Dara Nguyen at first light.",
        "iot": "A sensor can warn the mutual-aid lead when the soft bend slumps again.",
        "drones": "A small aircraft can photograph survey pins after water covers the gardens.",
        "materials": "Strong fabric can hold the soft bend when money follows old titles.",
        "ai": "A model can match phone photos of survey pins to the county map.",
        "space": "A sky image can show the slumped levee and the lots under water.",
        "print3d": "A printer can make markers for survey pins that floodwater covers.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["San Lázaro Ridge Clinic"],
      title: "Wounded at the ridge clinic gate",
      summary: "Dr. Samira Okonkwo meets the pickup at the ridge clinic gate with a trauma kit. Night intake rules say unregistered arrivals wait for the morning registrar. The wound will not wait. Two nurses quit this month. The nurses will not put protocol over the person on the step.",
      scene:
        "Dr. Samira Okonkwo meets the pickup at the ridge gate with a headlamp and a trauma kit. A shirt wraps the leg of the man. Blood darkens the shirt. The man crossed after dark. The man has no referral sheet.\n\nNight intake rules say unregistered arrivals wait for the morning registrar. The wound will not wait. Dr. Samira Okonkwo pulls the man inside. The day shift will write a report on Dr. Samira Okonkwo. Two nurses quit this month because they cannot follow protocol and treat the person on the step.\n\nA checkpoint up the ridge funnels injured persons toward this single door. Other posts demand papers first and care second. The clinic generator coughs. Battery lights hold the suture tray. Dr. Samira Okonkwo ties the bleed. Dr. Samira Okonkwo hears the next truck on the gravel.\n\nThe gate does not only keep order. The gate makes the crowd that wears the staff out.",
      briefMd:
        "## The place\n\nThe place is the San Lázaro Ridge Clinic. Dr. Samira Okonkwo meets the pickup at the ridge gate with a headlamp and a trauma kit. A shirt wraps the leg of the man. Blood darkens the shirt. The man crossed after dark. The man has no referral sheet.\n\nNight intake rules say unregistered arrivals wait for the morning registrar. The wound will not wait. Dr. Samira Okonkwo pulls the man inside. The day shift will write a report on Dr. Samira Okonkwo. Two nurses quit this month because they cannot follow protocol and treat the person on the step.\n\nA checkpoint up the ridge funnels injured persons toward this single door. Other posts demand papers first and care second. The clinic generator coughs. Battery lights hold the suture tray. Dr. Samira Okonkwo ties the bleed. Dr. Samira Okonkwo hears the next truck on the gravel.\n\n## The bigger problem\n\nThe gate does not only keep order. The gate makes the crowd that wears the staff out. Care at the single door fails when papers come before the wound.\n\n## Your job\n\nOpen care at the ridge gate when the wound will not wait for papers.",
      stakeholder: "Dr. Samira Okonkwo, night triage lead",
      crisisMeters: { local: { label: "Sick Nights", description: "Dr. Samira Okonkwo meets a wounded man at the ridge gate after dark with no referral sheet." }, global: { label: "Gatekeeping", description: "Night rules make unregistered arrivals wait, and other posts demand papers before care." }, support: { label: "Staff Burnout", description: "Two nurses quit this month because protocol blocks care for the person on the step." } },
      suggested: ["ai", "networks", "solar", "battery", "drones", "computing", "transportation", "gene-sequencing"],
      suggestedWhy: {
        "ai": "A model can rank night wounds so the registrar wait does not block care.",
        "networks": "A link can send the gate note to the day shift before the report.",
        "solar": "A panel can feed the clinic when the generator coughs at night.",
        "battery": "A battery can hold light on the suture tray for the night intake.",
        "drones": "A small aircraft can warn the clinic when the next truck comes.",
        "computing": "A computer can record night intake when the registrar is absent.",
        "transportation": "A route can move the wounded man to a door that gives care first.",
        "gene-sequencing": "A test can name a blood risk when the man has no referral sheet.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["East Jetty Ferry Sheds"],
      title: "Ferry cuts, addresses that sink",
      summary: "Captain Eli Marlow ties up at the east jetty. Captain Eli Marlow finds a dispute over berth chalk marks. Overnight rain pushed tide into the lower bunks. A family shows a pier number that the harbor office deleted. The family cannot renew work slips for the morning run without a recognized address.",
      scene:
        "Captain Eli Marlow ties up at the east jetty. Captain Eli Marlow finds a dispute over berth chalk marks. Overnight rain pushed tide into the lower bunks. Bedding hangs from rafters. The bedding will not dry before the next shift.\n\nA family from the third shed shows Captain Eli Marlow a laminated card. The card shows a pier number. The harbor office deleted the pier number after the last storm realignment. The family cannot renew work slips for the morning run without a recognized address. Crew lists shrink. Men fight for the dry upper berths because a wet night means a missed shift and a missed stamp.\n\nThe ferry company cut two evening crossings to save fuel. More persons sleep in the sheds. The persons do not go to inland hostels. The jetty makes residents who cannot prove a home on the map. Captain Eli Marlow can assign rope and tarps. Captain Eli Marlow cannot make a place name the clerk will accept.",
      briefMd:
        "## The place\n\nThe place is the East Jetty Ferry Sheds. Captain Eli Marlow ties up at the east jetty. Captain Eli Marlow finds a dispute over berth chalk marks. Overnight rain pushed tide into the lower bunks. Bedding hangs from rafters. The bedding will not dry before the next shift.\n\nA family from the third shed shows Captain Eli Marlow a laminated card. The card shows a pier number. The harbor office deleted the pier number after the last storm realignment. The family cannot renew work slips for the morning run without a recognized address. Crew lists shrink. Men fight for the dry upper berths because a wet night means a missed shift and a missed stamp.\n\nThe ferry company cut two evening crossings to save fuel. More persons sleep in the sheds. The persons do not go to inland hostels. Captain Eli Marlow can assign rope and tarps. Captain Eli Marlow cannot make a place name the clerk will accept.\n\n## The bigger problem\n\nThe jetty makes residents who cannot prove a home on the map the system still keeps. A deleted pier number blocks the morning work slip. The cut crossings keep more persons in wet sheds. A place name must survive the tide and the timetable.\n\n## Your job\n\nKeep a recognized address so the family can renew the morning work slip.",
      stakeholder: "Captain Eli Marlow, seafarer and ferry workers desk",
      crisisMeters: { local: { label: "Wet Bedding", description: "Overnight rain pushed tide into the lower bunks, and bedding will not dry before the next shift." }, global: { label: "Dead Addresses", description: "The harbor office deleted the pier number, so the family cannot renew the morning work slips." }, support: { label: "Berth Fights", description: "Men fight for dry upper berths because a wet night means a missed shift and a missed stamp." } },
      suggested: ["networks", "solar", "battery", "transportation", "drones", "iot", "materials", "ai"],
      suggestedWhy: {
        "networks": "A link can show the clerk that the family sleeps at the east jetty.",
        "solar": "A panel can power heat so bedding dries before the next shift.",
        "battery": "A battery can keep berth lights on when rain floods the lower bunks.",
        "transportation": "A crossing can move families toward inland hostels after the evening cuts.",
        "drones": "A small aircraft can record berth chalk marks after the tide rises.",
        "iot": "A sensor can warn the crew when tide enters the lower bunks.",
        "materials": "A tarp can keep bedding dry when rain pushes tide into the sheds.",
        "ai": "A model can match the deleted pier number to the family card.",
      },
      visionTheme: "ocean-city",
    }
  ],

  ag: [
    {
      places: ["Loess Bend County"],
      title: "Bare winter fields blow the county thin",
      summary: "Mara kicks the gate latch open before dawn on her tenant strip west of the creek bend.\nDust lifts off the bare acres and pours into the schoolyard.\nHer youngest comes home with a red throat again.",
      scene:
        "Mara kicks the gate latch open before dawn.\nThe wind already tastes like grit.\nHer tenant strip runs west of the creek bend in Loess Bend County.\nThe freeze last night left the soil bare and powder-fine.\nBy midmorning the sky turns the color of old paper.\nDust lifts off each open acre and pours into the schoolyard two miles downwind.\n\nThe children wipe their eyes with sleeve cuffs.\nThe nurse logs another afternoon of coughs.\nMara watches topsoil leave her rows in thin sheets.\nThe topsoil settles on the neighbor porch furniture.\nHer youngest comes home with a red throat again.\n\nThe cover seed truck of the soil district sits half empty at the co-op.\nCash rent came due in November.\nMost tenants sold the last of the bean money to stay current.\nThe tenants then left the ground bare through winter.\nA living mulch does not pay the note.\nLandlords still score leases on bushels delivered, not on residue left behind.\n\nThe pattern returns each year.\nGrowers harvest hard and disk the ground clean.\nGrowers hope the March rains stay gentle, but the rains rarely stay gentle.\nThe county can count dust days.\nThe county can count bare acres from the road.\nThe county does not design a winter that holds the ground when the rent calendar and the wind calendar do not match.",
      briefMd:
        "## The place\n\nMara kicks the gate latch open before dawn in Loess Bend County.\nHer tenant strip runs west of the creek bend.\nThe freeze last night left the soil bare and powder-fine.\nDust lifts off each open acre and pours into the schoolyard two miles downwind.\nThe children wipe their eyes with sleeve cuffs.\nThe nurse logs another afternoon of coughs.\n\nMara watches topsoil leave her rows in thin sheets.\nThe topsoil settles on the neighbor porch furniture.\nHer youngest comes home with a red throat again.\n\n## The bigger problem\n\nThe cover seed truck of the soil district sits half empty at the co-op.\nCash rent came due in November.\nMost tenants sold the last of the bean money to stay current.\nThe tenants left the ground bare through winter because a living mulch does not pay the note.\nLandlords score leases on bushels delivered, not on residue left behind.\n\nThe pattern returns each year as growers harvest hard and disk the ground clean.\nGrowers hope the March rains stay gentle, but the rains rarely stay gentle.\nThe county can count dust days.\nThe county can count bare acres from the road.\nThe county does not design a winter that holds the ground when the rent calendar and the wind calendar do not match.\n\n## Your job\n\nHold the winter ground when the rent calendar and the wind calendar do not match.",
      stakeholder: "County soil district and tenant growers coalition",
      crisisMeters: { local: { label: "Dust Days", description: "Dust days send grit from bare acres into the schoolyard two miles downwind." }, global: { label: "Bare Acres", description: "Bare acres stay powder-fine after the freeze because tenants disk the ground clean." }, support: { label: "Farm Debt", description: "Farm debt makes tenants sell bean money and leave winter ground bare." } },
      suggested: ["iot", "ai", "drones", "space", "solar", "genetic-engineering", "networks"],
      suggestedWhy: {
        "iot": "Sensors can log dust days and bare soil on the tenant strip.",
        "ai": "A model can match rent dates with wind risk on the same acres.",
        "drones": "A drone can map bare acres west of the creek bend.",
        "space": "A satellite view can show dust paths from open acres to the schoolyard.",
        "solar": "Solar power can run winter cover work when fuel cash stays low.",
        "genetic-engineering": "A hardy cover plant can hold soil when the rent note stays due.",
        "networks": "A shared network can link tenants, landlords, and the soil district.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Fogline Spice Terraces"],
      title: "Full-sun spice rush kills the mist forest",
      summary: "Old Ren walks the upper spring path at first light with a tin cup.\nThe cup comes up cloudy where the moss stayed wet past noon.\nHis granddaughter carries water a longer way than she carried a year ago.",
      scene:
        "At first light, Old Ren walks the upper spring path with a tin cup.\nHe stops where the moss stayed wet past noon in past years.\nThe cup comes up cloudy.\nBelow him, new cardamom and pepper clearings shine like open wounds on the ridge.\nCrews cut the last shade trees in strips.\nThe crews cut so the spice can take full sun and hit the export grade faster.\n\nThe cooperative voted yes last season.\nSpot prices were high.\nContracts paid on dry weight and color.\nContracts did not pay on the dawn mist.\nWithout the canopy, morning fog thins.\nSoil on the steeper treads loosens after night rain.\n\nA mud tongue took the footbridge above Ward Three on Tuesday.\nSpring flow at the village tank dropped.\nThe afternoon fill line stops short of the last houses at this time.\nHis granddaughter carries water a longer way than she carried a year ago.\n\nThe wardens can point to each new terrace and name the signer.\nThe local driver is simple.\nFull-sun spice pays this year.\nShade does not pay this year.\nThe mist forest becomes ledger lines.\nThe ridge still holds each person, the water, and the roots at one time.",
      briefMd:
        "## The place\n\nAt first light, Old Ren walks the upper spring path at Fogline Spice Terraces with a tin cup.\nHe stops where the moss stayed wet past noon in past years.\nThe cup comes up cloudy.\nNew cardamom and pepper clearings shine like open wounds on the ridge.\nCrews cut the last shade trees in strips so the spice can take full sun.\n\nThe granddaughter of Old Ren carries water a longer way than she carried a year ago.\nA mud tongue took the footbridge above Ward Three on Tuesday.\nSpring flow at the village tank dropped.\nThe afternoon fill line stops short of the last houses at this time.\n\n## The bigger problem\n\nThe cooperative voted yes last season because spot prices were high.\nContracts paid on dry weight and color, not on the dawn mist.\nWithout the canopy, morning fog thins.\nSoil on the steeper treads loosens after night rain.\nFull-sun spice pays this year, and shade does not pay.\n\nThe wardens can point to each new terrace and name the signer.\nThe mist forest becomes ledger lines.\nThe ridge still holds each person, the water, and the roots at one time.\n\n## Your job\n\nKeep the dawn mist and the slope while full-sun spice still pays.",
      stakeholder: "Terrace cooperative and spring wardens",
      crisisMeters: { local: { label: "Mudslides", description: "Mudslides follow night rain on steep treads after crews cut shade trees." }, global: { label: "Spring Flow", description: "Spring flow at the village tank drops and the fill line stops short of the last houses." }, support: { label: "Shade Loss", description: "Shade loss grows because full-sun spice pays and the canopy does not pay." } },
      suggested: ["space", "iot", "drones", "ai", "networks", "gene-sequencing", "solar", "crypto"],
      suggestedWhy: {
        "space": "A satellite view can show shade loss and new clearings on the ridge.",
        "iot": "Sensors can track spring flow and soil moisture on the terraces.",
        "drones": "A drone can map mud risk on steep treads after night rain.",
        "ai": "A model can compare spice price with mist loss on the same slope.",
        "networks": "A network can link the cooperative and the spring wardens.",
        "gene-sequencing": "Gene data can find spice plants that still yield under shade.",
        "solar": "Solar dryers can lower the push for full sun on export spice.",
        "crypto": "A shared ledger can record shade value next to dry weight.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Ringroad Greens Belt"],
      title: "Spec sheets turn salad rows into spray alleys",
      summary: "Lila walks the lettuce edge row with a cloth over her mouth.\nDew still carries a chemical bite from the pass yesterday.\nTwo pickers step off the line with eyes that burn.",
      scene:
        "Before the highway noise rises, Lila walks the edge row with a cloth over her mouth.\nDew on the lettuce still carries a faint chemical bite from the pass yesterday.\nHer crew starts the bags at six for the school meal trucks.\nBy nine, two pickers step off the line with eyes that burn and a tight chest.\nThe union board logs sick days in a stained notebook.\nThe buyer portal tracks only reject rates.\n\nThe contract sheet is clear.\nThe leaf must stay free of blemish.\nThe leaf must stay uniform.\nThe crew must deliver the leaf on a clock that ignores wind drift.\nA miss on the cosmetic grade makes the lot bounce.\nGrowers spray on a calendar that protects appearance first.\n\nBuffer flags sag between small plots.\nDrift does not follow property lines.\nChildren at the east side primary eat the salad from the belt.\nThe children then sit in classrooms with windows that face the spray hours.\n\nThe school purchase order is necessary for Lila.\nWithout the order, the land rent collapses.\nClean audits are necessary for the meal buyers.\nZero visible spots are necessary for the meal buyers.\nThe system that keeps the signatures also keeps the alleys wet with product.",
      briefMd:
        "## The place\n\nBefore the highway noise rises, Lila walks the edge row in the Ringroad Greens Belt with a cloth over her mouth.\nDew on the lettuce still carries a faint chemical bite from the pass yesterday.\nHer crew starts the bags at six for the school meal trucks.\nBy nine, two pickers step off the line with eyes that burn and a tight chest.\nThe union board logs sick days in a stained notebook.\nThe buyer portal tracks only reject rates.\n\nBuffer flags sag between small plots.\nDrift does not follow property lines.\nChildren at the east side primary eat the salad from the belt.\nThe children then sit in classrooms with windows that face the spray hours.\n\n## The bigger problem\n\nThe contract sheet demands a leaf free of blemish and a uniform leaf on a hard clock.\nA miss on the cosmetic grade makes the lot bounce.\nGrowers spray on a calendar that protects appearance first.\n\nThe school purchase order is necessary for Lila, or the land rent collapses.\nClean audits are necessary for the meal buyers.\nZero visible spots are necessary for the meal buyers.\nThe system that keeps the signatures also keeps the alleys wet with product.\n\n## Your job\n\nProtect pickers and children while the school salad still meets the grade.",
      stakeholder: "Peri-urban growers union and school meal buyers",
      crisisMeters: { local: { label: "Spray Drift", description: "Spray drift leaves a chemical bite on lettuce dew and crosses small plot lines." }, global: { label: "Sick Days", description: "Sick days rise when pickers step off the line with eyes that burn." }, support: { label: "Buyer Lock", description: "Buyer lock ties the school order to a blemish-free leaf on a hard clock." } },
      suggested: ["iot", "ai", "synbio", "drones", "robots", "gene-sequencing", "networks", "alt-proteins"],
      suggestedWhy: {
        "iot": "Sensors can log spray time, wind, and drift at the edge row.",
        "ai": "A model can flag spray hours that put risk on pickers and classrooms.",
        "synbio": "A living control can cut spray while the leaf still meets grade.",
        "drones": "A drone can show drift paths between plots and the school.",
        "robots": "A machine can pick lettuce and spare the crew from wet alleys.",
        "gene-sequencing": "Gene data can find lettuce that stays uniform with less spray.",
        "networks": "A network can link growers and school meal buyers on grade rules.",
        "alt-proteins": "A different lunch protein can ease pressure on blemish-free salad rows.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Brackish Polder Reach"],
      title: "Pump wars salt the seed beds",
      summary: "Joren kneels in the south seed bed and rubs a white crust between his fingers.\nOvernight the ditch ran low.\nBy noon the young spinach shows scorch at the tips.\nHis partner calculates a choice to replant or to sell a cow.",
      scene:
        "Joren kneels in the south seed bed and rubs a crust between his fingers.\nThe white line was not there at the plant date.\nOvernight the ditch ran low.\nThe seepage turned sharp.\nHis dairy and veg neighbors started their pumps one hour before the water board slot.\nThe neighbors sought the drop in the water table before the next man started.\n\nBy noon the young spinach shows scorch at the tips.\nThe polder sits between a brackish canal and pastures.\nThe pastures still pay on liters of milk.\nFresh lenses thin when each farmer lifts water at one time.\nRules exist on paper.\nEnforcement arrives after damage shows in the root zone.\n\nEach failed crop pushes a household to pump harder on the next cycle.\nThe household pumps harder to recover cash.\nSalt climbs.\nCredit tightens.\nThe mixed alliance argues in the pump house.\nThe intake screens clog with fine silt.\n\nThe partner of Joren calculates a choice to replant or to sell a cow.\nThe board can ration hours.\nThe board cannot alone break the race.\nThe race turns shared water into private urgency.\nThe land still feeds herds and rows.\nThe soil must not take the taste of the canal.",
      briefMd:
        "## The place\n\nJoren kneels in the south seed bed at Brackish Polder Reach and rubs a crust between his fingers.\nThe white line was not there at the plant date.\nOvernight the ditch ran low and the seepage turned sharp.\nHis dairy and veg neighbors started their pumps one hour before the water board slot.\nBy noon the young spinach shows scorch at the tips.\n\nThe polder sits between a brackish canal and pastures that still pay on liters of milk.\nFresh lenses thin when each farmer lifts water at one time.\nThe intake screens clog with fine silt.\nThe partner of Joren calculates a choice to replant or to sell a cow.\n\n## The bigger problem\n\nRules exist on paper.\nEnforcement arrives after damage shows in the root zone.\nEach failed crop pushes a household to pump harder on the next cycle to recover cash.\nSalt climbs and credit tightens.\nThe mixed alliance argues in the pump house.\n\nThe board can ration hours.\nThe board cannot alone break the race that turns shared water into private urgency.\nThe land still feeds herds and rows.\nThe soil must not take the taste of the canal.\n\n## Your job\n\nStop the pump race so the seed beds do not taste like the canal.",
      stakeholder: "Polder water board and mixed dairy–veg alliance",
      crisisMeters: { local: { label: "Soil Salt", description: "Soil salt leaves a white crust in the south seed bed after the ditch runs low." }, global: { label: "Failed Plantings", description: "Failed plantings show scorch on young spinach and push a harder pump cycle." }, support: { label: "Pump Race", description: "The pump race starts when neighbors lift water before the water board slot." } },
      suggested: ["solar", "battery", "iot", "ai", "materials", "networks", "space", "genetic-engineering"],
      suggestedWhy: {
        "solar": "Solar pumps can lift water on a shared slot, not in a private race.",
        "battery": "A battery can store pump power so crews do not lift at one hour.",
        "iot": "Sensors can show ditch level, salt, and seepage in the south seed bed.",
        "ai": "A model can set pump hours before salt shows in the root zone.",
        "materials": "A tough screen material can slow silt clogs at the intake.",
        "networks": "A network can share pump slots across the dairy and veg alliance.",
        "space": "A satellite view can show fresh water loss across the polder.",
        "genetic-engineering": "A salt-tough crop can keep rows alive when seepage turns sharp.",
      },
      visionTheme: "coastal-city",
    }
  ],

  food: [
    {
      places: ["Ladder Ridge Parish"],
      title: "Blight takes the parish potatoes",
      summary: "Elena opens the parish school kitchen at dawn and finds the potato sacks soft. The fields above the ridge went black at the edges last week. Eighty children scrape watery mash and face empty plates by midwinter.",
      scene:
        "Elena opens the school kitchen at dawn. She finds the potato sacks soft under her palm. The parish fields above the ridge went black at the edges last week. By Friday the tubers smell sweet and wrong. Lunch is half a scoop of mash with water. Children scrape the bowls and ask for more.\n\nElena walks the seed ledger with the co-op clerk. Last year the resistant stock came on credit from one supplier two valleys over. When that strain failed, the debt stayed. Farmers replant the same lines because the loan papers name the variety. The new seed means the new paper. The parish does not have cash for the new seed and for the old debt.\n\nBlight rides the wet nights down the slope. Blight does not follow the school calendar. The school kitchen feeds eighty children. The parents of the children work the same rows. A short harvest means empty plates by midwinter. The parish does not have a second crop.",
      briefMd:
        "## The place\n\nElena opens the school kitchen at dawn. She finds the potato sacks soft under her palm. The parish fields above the ridge went black at the edges last week. By Friday the tubers smell sweet and wrong. Lunch is half a scoop of mash with water. Children scrape the bowls and ask for more.\n\nElena walks the seed ledger with the co-op clerk. Last year the resistant stock came on credit from one supplier two valleys over. When that strain failed, the debt stayed. Farmers replant the same lines because the loan papers name the variety. The new seed means the new paper. The parish does not have cash for the new seed and for the old debt.\n\n## The bigger problem\n\nBlight rides the wet nights down the slope. Blight does not follow the school calendar. The school kitchen feeds eighty children. The parents of the children work the same rows. A short harvest means empty plates by midwinter. The parish does not have a second crop.\n\n## Your job\n\nKeep full plates for eighty children through midwinter.",
      stakeholder: "Elena, parish school-kitchen lead",
      crisisMeters: { local: { label: "Hunger", description: "Eighty children at the parish school scrape thin mash and face empty plates by midwinter." }, global: { label: "Crop Blight", description: "Blight blackens the ridge fields and spoils the tubers before the school kitchen serves lunch." }, support: { label: "Seed Debt", description: "Seed debt locks farmers to one failed variety. The parish lacks cash for new seed and for the old debt." } },
      suggested: ["gene-sequencing", "genetic-engineering", "iot", "ai", "solar", "drones", "networks", "print3d"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can show which potato lines still live after blight.",
        "genetic-engineering": "Genetic engineering can change seed lines so blight does less harm.",
        "iot": "Sensors can warn Elena when sacks or fields turn soft and black.",
        "ai": "A model can flag blight risk before Friday tubers smell wrong.",
        "solar": "Solar power can run a small store so tubers stay sound longer.",
        "drones": "Drones can scan ridge fields for black edges before harvest fails.",
        "networks": "A network can link the co-op clerk and farmers on seed status.",
        "print3d": "Printed parts can repair local tools that handle seed and mash.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Copper Gate Wholesale"],
      title: "Dawn crates rot at the gate",
      summary: "Jamal counts crates at the wholesale gate before the sun clears the tin roofs. Three pallets of greens arrived soft after the cold room ran warm. Stallholders still owe noon fees, and a mother of six goes home with wilted leaves.",
      scene:
        "Jamal counts crates at Copper Gate Wholesale before the sun clears the tin roofs. Three pallets of greens arrived soft. The cold room ran warm again after midnight. Stallholders wait with empty handcarts. Their voices rise.\n\nThe market chillers sit on a shared meter. The meter trips when the night bakeries start the ovens. No person owns the backup. Drivers unload before dawn because the highway toll drops then. Produce sits in the heat. The union argues about payment for ice that does not come.\n\nSpoilage is not an accident at this gate. The gate serves volume. The gate does not serve cold. The members of Jamal lose the morning stock. The members still owe stall fees by noon. A mother who buys for six goes home with wilted leaves and less coin than she planned.",
      briefMd:
        "## The place\n\nJamal counts crates at Copper Gate Wholesale before the sun clears the tin roofs. Three pallets of greens arrived soft. The cold room ran warm again after midnight. Stallholders wait with empty handcarts. Their voices rise.\n\nThe market chillers sit on a shared meter. The meter trips when the night bakeries start the ovens. No person owns the backup. Drivers unload before dawn because the highway toll drops then. Produce sits in the heat. The union argues about payment for ice that does not come.\n\n## The bigger problem\n\nSpoilage is not an accident at this gate. The gate serves volume. The gate does not serve cold. The members of Jamal lose the morning stock. The members still owe stall fees by noon. A mother who buys for six goes home with wilted leaves and less coin than she planned.\n\n## Your job\n\nKeep morning greens sound for the stallholders at the gate.",
      stakeholder: "Jamal, stallholders union runner",
      crisisMeters: { local: { label: "Hunger", description: "Stallholders at Copper Gate lose morning greens, and a mother of six takes wilted leaves home." }, global: { label: "Spoilage", description: "A warm cold room and dawn heat spoil greens before the handcarts leave the gate." }, support: { label: "Stall Fees", description: "Members still owe noon stall fees after the ice fails and the stock rots." } },
      suggested: ["iot", "battery", "solar", "transportation", "ai", "networks", "alt-proteins", "robots"],
      suggestedWhy: {
        "iot": "Sensors can tell Jamal when the cold room runs warm after midnight.",
        "battery": "A battery can hold power when the shared meter trips at night.",
        "solar": "Solar power can run chillers when bakery ovens trip the meter.",
        "transportation": "A cooler trip can move greens before dawn heat spoils the crates.",
        "ai": "A model can time unloads so produce does not sit in the heat.",
        "networks": "A network can align drivers, ice, and stallholders before noon fees.",
        "alt-proteins": "Other proteins can fill plates when greens arrive soft and wilt.",
        "robots": "A robot can move soft crates into cold space before the sun rises.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Thorn Well Circuit"],
      title: "Wells on the circuit turn to mud",
      summary: "Nia parks the nutrition van at the third well on her circuit and lowers the bucket. The water from the well comes up thick with silt. Two households do not cook beans.",
      scene:
        "Nia parks the nutrition van at the third well on Thorn Well Circuit. She lowers the bucket. The bucket comes up thick. Before, the kitchen jugs held this water. At this time the water coats the ladle in silt.\n\nTwo households do not cook beans. Children drink less and tire faster on the walk to school.\n\nNew fence lines upstream cut the old shared recharge paths. Herders and small growers pump harder from private bores when the public wells slow. The aquifer does not choose a side. Each dry week a family skips the protein ration. No clean water is there to boil the ration.\n\nNia carries sachets and growth charts. Nia cannot carry a river. The circuit marks wells that were reliable on a map. At this time the map lies. The harm lands in the same kitchens on every round.",
      briefMd:
        "## The place\n\nNia parks the nutrition van at the third well on Thorn Well Circuit. She lowers the bucket. The bucket comes up thick. Before, the kitchen jugs held this water. At this time the water coats the ladle in silt.\n\nTwo households do not cook beans. Children drink less and tire faster on the walk to school. The harm lands in the same kitchens on every round.\n\n## The bigger problem\n\nNew fence lines upstream cut the old shared recharge paths. Herders and small growers pump harder from private bores when the public wells slow. The aquifer does not choose a side. Each dry week a family skips the protein ration. No clean water is there to boil the ration.\n\nNia carries sachets and growth charts. Nia cannot carry a river. The circuit marks wells that were reliable on a map. At this time the map lies.\n\n## Your job\n\nGive circuit households clean water for beans and school walks.",
      stakeholder: "Nia, mobile nutrition aide",
      crisisMeters: { local: { label: "Hunger", description: "Two households on the circuit do not cook beans, and children tire on the school walk." }, global: { label: "Dry Wells", description: "Silt fills the public wells, and families skip the protein ration in dry weeks." }, support: { label: "Fence Lines", description: "New fence lines cut shared recharge, and private bores pull the aquifer harder." } },
      suggested: ["iot", "solar", "ai", "drones", "networks", "space", "materials", "gene-sequencing"],
      suggestedWhy: {
        "iot": "Sensors can show when Thorn Well water turns thick with silt.",
        "solar": "Solar pumps can lift cleaner water when the public wells slow.",
        "ai": "A model can mark wells that fail before Nia starts a round.",
        "drones": "Drones can survey fence lines that cut the old recharge paths.",
        "networks": "A network can share well status with households on the circuit.",
        "space": "Satellite views can track dry weeks along Thorn Well Circuit.",
        "materials": "Filter materials can clear silt from buckets before cooking.",
        "gene-sequencing": "Gene sequencing can track crop stress when families skip the protein ration.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Millrace Flats"],
      title: "Barges pass the small jetties by",
      summary: "Oksana stands on the co-op jetty with the tally book open as the grain barge holds mid-channel. The contract favors the deep terminal downstream. Kitchen cupboards thin while full holds slide past toward buyers who can prepay.",
      scene:
        "Oksana stands on the co-op jetty at Millrace Flats with the tally book open. The grain barge holds mid-channel. The barge does not slow. The captain radios that the contract favors the deep terminal downstream. Draft fees and credit terms moved last season. Small jetties do not clear the ledger fast enough.\n\nThe silo holds the share from last month for the flats families. The grain cannot go to the mill on time without a barge stop. The co-op credit line tightens. Growers who delivered in good faith wait on payment. Kitchen cupboards thin. Full holds slide past toward buyers who can prepay.\n\nHunger on the flats is not a failed harvest. Hunger is a routing choice in contracts and channel depth. Oksana can count sacks. Oksana cannot hail a barge. A buyer paid the barge to ignore the dock.",
      briefMd:
        "## The place\n\nOksana stands on the co-op jetty at Millrace Flats with the tally book open. The grain barge holds mid-channel. The barge does not slow. The captain radios that the contract favors the deep terminal downstream. Draft fees and credit terms moved last season. Small jetties do not clear the ledger fast enough.\n\nThe silo holds the share from last month for the flats families. The grain cannot go to the mill on time without a barge stop. The co-op credit line tightens. Growers who delivered in good faith wait on payment. Kitchen cupboards thin. Full holds slide past toward buyers who can prepay.\n\n## The bigger problem\n\nHunger on the flats is not a failed harvest. Hunger is a routing choice in contracts and channel depth. Oksana can count sacks. Oksana cannot hail a barge. A buyer paid the barge to ignore the dock.\n\n## Your job\n\nLand the grain from last month in the flats kitchens on time.",
      stakeholder: "Oksana, co-op silo clerk",
      crisisMeters: { local: { label: "Hunger", description: "Kitchen cupboards on the flats thin while the grain stays on the barge." }, global: { label: "Diverted Grain", description: "Contracts send full holds past the small jetties to the deep terminal." }, support: { label: "Credit Bind", description: "Credit terms and draft fees block a timely stop for the co-op mill run." } },
      suggested: ["ai", "networks", "transportation", "iot", "solar", "battery", "alt-proteins", "crypto"],
      suggestedWhy: {
        "ai": "A model can compare credit terms before a barge passes the jetty.",
        "networks": "A network can send the tally to captains before mid-channel.",
        "transportation": "A smaller boat can move grain when the barge does not stop.",
        "iot": "Sensors can report draft and jetty depth for a safe stop.",
        "solar": "Solar power can run the silo fan while grain waits for the mill.",
        "battery": "A battery can keep silo tools live when the credit line tightens.",
        "alt-proteins": "Other proteins can fill cupboards while holds slide past the flats.",
        "crypto": "A shared ledger can show payment before the barge chooses a dock.",
      },
      visionTheme: "food-city",
    }
  ],

  eco: [
    {
      places: ["Cattail Bend Flats"],
      title: "Cranes over concrete",
      summary: "Mira walks the boardwalk at first light with a measuring stick and a notebook. High water from last night left a brown ring on the stilts of the corner store. The mother of Mira keeps a plastic bin of photos on the high shelf for the next surge.",
      scene:
        "Mira walks the boardwalk at first light with a measuring stick and a notebook. High water from last night left a brown ring on the stilts of the corner store. The boots of the children squelch in the alley mud. The mother of Mira keeps a plastic bin of photos on the high shelf for the next surge.\n\nThe cattail fringe is a thin strip. In past years the cattail fringe took the punch of the river. A crane swings over the next parcel. Survey stakes mark fill and parking on the lease land.\n\nThe council can vote on sandbags and raised walkways. The council cannot restore the marsh after the trucks pour fill. Developers pay lease money. Lease money is necessary for pumps and clinic hours. Each signed pad removes root and sponge. That root and sponge slowed the flood.",
      briefMd:
        "## The place\n\nMira walks the boardwalk at Cattail Bend Flats at first light. She carries a measuring stick and a notebook. High water from last night left a brown ring on the stilts of the corner store. The boots of the children squelch in the alley mud.\n\nThe cattail fringe is a thin strip. A crane swings over the next parcel. Survey stakes mark fill and parking on the lease land. The mother of Mira keeps a plastic bin of photos on the high shelf for the next surge.\n\n## The bigger problem\n\nThe council can vote on sandbags and raised walkways. The council cannot restore the marsh after the trucks pour fill. Developers pay lease money. Lease money is necessary for pumps and clinic hours. Each signed pad removes root and sponge that slowed the flood.\n\n## Your job\n\nKeep the marsh sponge, the pumps, and the clinic hours.",
      stakeholder: "Marsh neighborhood council",
      crisisMeters: { local: { label: "Flooding", description: "High water marks the stilts and the alley mud at Cattail Bend Flats." }, global: { label: "Wetland Loss", description: "Fill and parking remove the cattail root that slowed the flood." }, support: { label: "Lease Money", description: "Lease money is necessary for pumps and clinic hours." } },
      suggested: ["drones", "space", "ai", "iot", "materials", "networks", "solar"],
      suggestedWhy: {
        "drones": "Drones can map the thin cattail strip and the survey stakes.",
        "space": "Space views can show the thin marsh from above.",
        "ai": "AI can compare flood rings with lease maps.",
        "iot": "IoT can record water height on the store stilts.",
        "materials": "Materials can raise walkways above the brown flood ring.",
        "networks": "Networks can share water marks with the council.",
        "solar": "Solar power can supply energy for the neighborhood pumps.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Silver Ladder Bend"],
      title: "Empty nets at the weir",
      summary: "Jonas hauls the last net at the old weir and counts six thin fish. The intake gate upstream left the salmon ladder as a dry shelf of stone. The bucket of the daughter will go home light.",
      scene:
        "Jonas hauls the last net at the old weir and counts six thin fish. The daughter of Jonas waits on the bank with a bucket. The bucket will go home light. The smokehouse stays cold this spring.\n\nThe new intake gate of the grain co-op holds water upstream. The co-op holds that water for contracts from the county seat. The salmon ladder is a dry shelf of stone by noon. The river schedule follows truck loads. The river schedule does not follow the fish run.\n\nFishers mend gear and share the catch on a day with fish. The uncle of Jonas smoked fish for winter and for trade in past years. Grain money keeps the valley schools open. Empty nets cause arguments in the cooperative about a seat at the table.",
      briefMd:
        "## The place\n\nJonas hauls the last net at the old weir at Silver Ladder Bend. He counts six thin fish. The daughter of Jonas waits on the bank with a bucket. The bucket will go home light. The smokehouse stays cold this spring.\n\nFishers mend gear and share the catch on a day with fish. The uncle of Jonas smoked fish for winter and for trade in past years.\n\n## The bigger problem\n\nThe new intake gate of the grain co-op holds water upstream for contracts from the county seat. The salmon ladder is a dry shelf of stone by noon. The river schedule follows truck loads. The river schedule does not follow the fish run. Grain money keeps the valley schools open. Empty nets cause arguments in the cooperative about a seat at the table.\n\n## Your job\n\nKeep the fish run and the grain water for the schools.",
      stakeholder: "River fishers' cooperative",
      crisisMeters: { local: { label: "Empty Nets", description: "Six thin fish fill the last net at the old weir." }, global: { label: "Blocked River", description: "The intake gate leaves the salmon ladder dry by noon." }, support: { label: "Grain Contracts", description: "Grain contracts keep the valley schools open." } },
      suggested: ["iot", "ai", "drones", "gene-sequencing", "synbio", "solar", "networks"],
      suggestedWhy: {
        "iot": "IoT can record gate height and fish counts at the weir.",
        "ai": "AI can compare truck loads with the fish run.",
        "drones": "Drones can show the dry salmon ladder from above.",
        "gene-sequencing": "Gene sequencing can identify the six thin fish.",
        "synbio": "Synbio can study stress in the thin fish.",
        "solar": "Solar power can supply energy for gear at the weir.",
        "networks": "Networks can share catch counts with the cooperative.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Glassgrass Sound"],
      title: "Sand where meadows waved",
      summary: "Elena cuts the motor at the eelgrass shallows. The pole finds sand. Tourists cancel when the water turns the color of weak tea.",
      scene:
        "Elena cuts the motor at the eelgrass shallows. The pole finds sand. A week ago the meadow held crabs. Guides sold that clear water to visitors. Elena marks one more dead patch on a waterproof chart. Older captains trust that chart more than the app.\n\nThe dredge barge works the channel again before the next freighter window. Port fees pay the dock lease of the guild. Port fees pay fuel for the clinic. Each pass lifts the bottom. Each pass clouds the light for the grass.\n\nTourists cancel when the water turns the color of weak tea. Crews know each cut and each bar by name. The port schedule grinds the nursery flat.",
      briefMd:
        "## The place\n\nElena cuts the motor at Glassgrass Sound where the eelgrass grew. The pole finds sand. A week ago the meadow held crabs. Guides sold that clear water to visitors.\n\nElena marks one more dead patch on a waterproof chart. Older captains trust that chart more than the app. Tourists cancel when the water turns the color of weak tea. Crews know each cut and each bar by name.\n\n## The bigger problem\n\nThe dredge barge works the channel again before the next freighter window. Port fees pay the dock lease of the guild and fuel for the clinic. Each pass lifts the bottom. Each pass clouds the light for the grass. The port schedule grinds the nursery flat.\n\n## Your job\n\nKeep the port schedule and the living eelgrass meadow.",
      stakeholder: "Sound fishers and guides guild",
      crisisMeters: { local: { label: "Cloudy Water", description: "The water at Glassgrass Sound turns the color of weak tea." }, global: { label: "Sand Dredging", description: "Each dredge pass lifts sand and clouds light for the eelgrass." }, support: { label: "Port Fees", description: "Port fees pay the guild dock lease and clinic fuel." } },
      suggested: ["drones", "space", "iot", "materials", "nano", "ai", "solar"],
      suggestedWhy: {
        "drones": "Drones can map dead eelgrass patches in the shallows.",
        "space": "Space views can show sand spread across the sound.",
        "iot": "IoT can record cloudy water after each dredge pass.",
        "materials": "Materials can shield charts and dock gear from salt water.",
        "nano": "Nano tools can track fine sand in the cloudy water.",
        "ai": "AI can compare dredge times with dead meadow marks.",
        "solar": "Solar power can supply energy for guild dock gear.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Lichen Stair Valley"],
      title: "Spring without frogs",
      summary: "Tomas kneels at the spring and fills a jar. The water runs cloudy after the cut on the ridge last week. The aunt of Tomas boils each pot two times and watches the children for stomach cramps.",
      scene:
        "Tomas kneels at the spring and fills a jar. The water runs cloudy after the cut on the ridge last week. Frogs do not call from the moss steps at dusk. The aunt of Tomas boils each pot two times. The aunt watches the children for stomach cramps.\n\nCharcoal sacks leave the valley before dawn. Cash from the bags pays school fees and travel for the midwife. Crews take the easy slopes first. Those slopes held the root mats above the wells.\n\nStewards can post signs and carry seedlings. Stewards cannot outpace a price that turns standing forest into weekend money. The map of clean seeps by Tomas shrinks each season.",
      briefMd:
        "## The place\n\nTomas kneels at the spring in Lichen Stair Valley and fills a jar. The water runs cloudy after the cut on the ridge last week. Frogs do not call from the moss steps at dusk. The aunt of Tomas boils each pot two times. The aunt watches the children for stomach cramps.\n\nCharcoal sacks leave the valley before dawn. The map of clean seeps by Tomas shrinks each season.\n\n## The bigger problem\n\nCash from the bags pays school fees and travel for the midwife. Crews take the easy slopes first. Those slopes held the root mats above the wells. Stewards can post signs and carry seedlings. Stewards cannot outpace a price that turns standing forest into weekend money.\n\n## Your job\n\nKeep the clear springs, the school fees, and the standing forest.",
      stakeholder: "Valley water stewards",
      crisisMeters: { local: { label: "Muddy Wells", description: "Cloudy spring water and stomach cramps strain the valley homes." }, global: { label: "Forest Loss", description: "Ridge cuts remove root mats that held soil above the wells." }, support: { label: "Charcoal Cash", description: "Charcoal cash pays school fees and travel for the midwife." } },
      suggested: ["drones", "space", "ai", "iot", "networks", "gene-sequencing", "solar", "materials"],
      suggestedWhy: {
        "drones": "Drones can map ridge cuts above the valley wells.",
        "space": "Space views can show forest loss on the easy slopes.",
        "ai": "AI can compare seep maps with new ridge cuts.",
        "iot": "IoT can record cloudiness in the spring water.",
        "networks": "Networks can share seep marks with the stewards.",
        "gene-sequencing": "Gene sequencing can identify life in the cloudy spring.",
        "solar": "Solar power can supply energy for valley water tasks.",
        "materials": "Materials can protect seedling loads on wet slopes.",
      },
      visionTheme: "care-city",
    }
  ],

  infectious: [
    {
      places: ["Dump Edge Lane Settlement"],
      title: "Medical waste tips fever into Dump Edge Lane",
      summary: "Rosa lifts a torn IV bag with a stick at Dump Edge Lane. The bag still holds cloudy fluid. A boy from the next shack has a fever from a cut. Hospital bags arrive with no seal on the same open trash truck.",
      scene:
        "Rosa lifts a torn IV bag with a stick before the morning buyers arrive. The bag still holds cloudy fluid. A boy from the next shack has a red line along his shin from the sort on the previous day. Rosa washes the cut with water from a jerrycan. The jerrycan smells of plastic and smoke.\n\nBy noon the fever of the boy rises. The boy cannot bear the light. City hospital bags arrive on the same open truck that dumps household trash. The bags have no seal. The bags have no manifest. Pickers tear the bags for scrap plastic and metal because the scrap is the cash for the day.\n\nClinics pay haulers by weight. Clinics do not pay haulers for safe disposal. As a result the infectious waste rides the cheap route to Dump Edge Lane. A refusal of a load removes the rice money for the week. Acceptance of the load gives more children fevers from the same cuts.",
      briefMd:
        "## The place\nDump Edge Lane is the work place of Rosa. Rosa leads the waste-picker cooperative. Before the morning buyers arrive, Rosa lifts a torn IV bag with a stick. The bag still holds cloudy fluid. A boy from the next shack has a red line along his shin from the sort on the previous day.\n\nRosa washes the cut with water from a jerrycan. The jerrycan smells of plastic and smoke. By noon the fever of the boy rises. The boy cannot bear the light.\n\n## The bigger problem\nCity hospital bags arrive on the same open truck that dumps household trash. The bags have no seal. The bags have no manifest. Pickers tear the bags for scrap plastic and metal. The scrap is the cash for the day.\n\nClinics pay haulers by weight. Clinics do not pay haulers for safe disposal. As a result the infectious waste rides the cheap route to the lane. A refusal of a load removes the rice money for the week. Acceptance of the load gives more children fevers from the same cuts.\n\n## Your job\nKeep the rice money and stop fevers from open hospital bags at the lane.",
      stakeholder: "Rosa, waste-picker cooperative lead",
      crisisMeters: { local: { label: "Infected Cuts", description: "Cuts from torn hospital bags put a red line and a fever on the boy at the lane." }, global: { label: "Waste Dumping", description: "Hospital bags with no seal ride the open trash truck into Dump Edge Lane." }, support: { label: "Clinic Access", description: "The boy with the fever has no easy path from the lane to a city hospital." } },
      suggested: ["gene-sequencing", "iot", "ai", "materials", "networks", "drones", "robots"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name the germs in the cloudy fluid of a torn hospital bag.",
        "iot": "A sensor can mark a hospital bag with no seal on the open trash truck.",
        "ai": "A model can warn Rosa before a load spreads fever through picker cuts.",
        "materials": "A strong seal can keep cloudy fluid in a bag so pickers do not open it.",
        "networks": "A shared signal can tell the lane and the clinics when a load has no manifest.",
        "drones": "A drone can watch the cheap truck route that brings hospital bags to the lane.",
        "robots": "A robot can move sealed bags so picker hands do not meet cloudy fluid.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Station Road Pilgrim Lodge"],
      title: "Shared cistern cough fills Station Road Lodge",
      summary: "Imam Karim unlocks the courtyard gate at Station Road Lodge. Three men cough into their sleeves by the ablution trough. The shared cistern is the water supply. The cough can go home with each guest.",
      scene:
        "Imam Karim unlocks the courtyard gate before dawn. Three men cough into their sleeves by the ablution trough. The cistern under the lodge is the water for a wash, a meal, and the night prayer rinse.\n\nLast week a traveler from the coast slept two nights at the lodge. The traveler left a dry cough. Then the traveler moved on. At this time the bunk room sounds like a broken engine.\n\nImam Karim wants to close the taps. Imam Karim wants to buy tanked water. Pilgrim fees barely cover rice and mats. The municipal line stops at the station plaza. Haulers fill the underground tank from mixed sources when the price dips. No person tests the water that arrives.\n\nMen with no money for a guesthouse come to the lodge. The lodge is the trust that the men know. A closed gate sends the men to sleep on the platform. Sleep on the platform removes their work. An open cistern sends the cough home with each guest who leaves.",
      briefMd:
        "## The place\nStation Road Lodge is the pilgrim lodge of Imam Karim. Imam Karim unlocks the courtyard gate before dawn. Three men cough into their sleeves by the ablution trough. The cistern under the lodge is the water for a wash, a meal, and the night prayer rinse.\n\nLast week a traveler from the coast slept two nights at the lodge. The traveler left a dry cough. Then the traveler moved on. At this time the bunk room sounds like a broken engine.\n\n## The bigger problem\nImam Karim wants to close the taps. Imam Karim wants to buy tanked water. Pilgrim fees barely cover rice and mats. The municipal line stops at the station plaza. Haulers fill the underground tank from mixed sources when the price dips. No person tests the water that arrives.\n\nMen with no money for a guesthouse come to the lodge. The lodge is the trust that the men know. A closed gate sends the men to sleep on the platform. Sleep on the platform removes their work. An open cistern sends the cough home with each guest who leaves.\n\n## Your job\nKeep the lodge open and stop the cough from the shared cistern.",
      stakeholder: "Imam Karim, lodge warden",
      crisisMeters: { local: { label: "Cough Spread", description: "Three men cough by the trough and the cough can leave with each guest." }, global: { label: "Shared Water", description: "Mixed water in the cistern is the wash, cook, and prayer supply for the lodge." }, support: { label: "Lost Wages", description: "Men lose work when a closed gate sends them to sleep on the platform." } },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "solar"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name the germ in the cough and in the lodge cistern.",
        "iot": "A sensor can test cistern water when haulers fill the tank from mixed sources.",
        "ai": "A model can warn Imam Karim when the bunk room cough starts to spread.",
        "networks": "A network can link the lodge with the plaza line when tank water is unsafe.",
        "materials": "A tank liner can keep mixed source water out of the ablution trough.",
        "computing": "A simple program can track guest coughs and cistern fills at the lodge.",
        "solar": "Solar power can run water tests when pilgrim fees barely cover rice and mats.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Old Quay Fish Landing"],
      title: "Gutting rinse sickens Old Quay landings",
      summary: "Nia slits a mackerel on the wet board at Old Quay. Nia rinses the knife in the same bucket from the boat rail. By mid-morning the stomach of Nia twists. The catch must move before noon.",
      scene:
        "Nia slits a mackerel on the wet board. Nia rinses the knife in the same bucket. The boat used the bucket at the rail. By mid-morning the stomach of Nia twists. Two other women from the association leave the tables early. The women look pale and the women shake.\n\nThe quay has no separate wash line. Ice melt, blood, and bilge water drain into one trough. The fishers dip the trough for a quick clean before the buyers shout. Captains pump water over the side into the shared channel. The channel feeds the gutting boards at low tide.\n\nHarbor rules treat rinse water as a problem of the boats. Harbor rules do not treat rinse water as a problem of the market. A fine for dirty knives removes the morning sale. The same gut illness returns each hot week at the current pace. The fish must move before noon. A late move collapses the price.",
      briefMd:
        "## The place\nOld Quay is the fish landing of Nia. Nia leads the women fishers association. Nia slits a mackerel on the wet board. Nia rinses the knife in the same bucket. The boat used the bucket at the rail.\n\nBy mid-morning the stomach of Nia twists. Two other women from the association leave the tables early. The women look pale. The women shake.\n\n## The bigger problem\nThe quay has no separate wash line. Ice melt, blood, and bilge water drain into one trough. The fishers dip the trough for a quick clean before the buyers shout. Captains pump water over the side into the shared channel. The channel feeds the gutting boards at low tide.\n\nHarbor rules treat rinse water as a problem of the boats. Harbor rules do not treat rinse water as a problem of the market. A fine for dirty knives removes the morning sale. The same gut illness returns each hot week at the current pace. The fish must move before noon. A late move collapses the price.\n\n## Your job\nKeep the morning fish sale and stop gut illness from the shared rinse.",
      stakeholder: "Nia, women’s fishers association",
      crisisMeters: { local: { label: "Gut Illness", description: "The stomach of Nia twists after the knife rinse in the boat bucket." }, global: { label: "Dirty Rinse", description: "Ice melt, blood, and bilge water share one trough at the landing." }, support: { label: "Market Days", description: "A fine or a late sale can collapse the price before noon." } },
      suggested: ["gene-sequencing", "iot", "synbio", "materials", "networks", "ai", "drones"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name the germ in the shared rinse at the fish landing.",
        "iot": "A sensor can show dirty rinse in the trough before the buyers shout.",
        "synbio": "Synthetic biology can supply a fast test for gut germs in the rinse water.",
        "materials": "A separate wash board can keep bilge water off the gutting knives.",
        "networks": "A harbor signal can tell captains to stop side pumps into the shared channel.",
        "ai": "A model can warn Nia when the same gut illness returns in a hot week.",
        "drones": "A drone can watch side pumps that feed the channel at low tide.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Maple Primary School Yard"],
      title: "Playground pump empties Maple Primary desks",
      summary: "Ms. Okonkwo counts empty seats after the break at Maple Primary. Twelve children who drank from the yard pump are absent. A girl vomited through the night. The girl has no strength for the walk.",
      scene:
        "Ms. Okonkwo counts empty seats after the break. The count stops at twelve. The absent children drank from the yard pump after football. A girl returns with a note. The girl vomited through the night. The girl has no strength for the walk.\n\nThe pump is the water that the school can offer between lessons. The well under the pump sits downhill from the latrines. The township did not line the latrines in full. After heavy rain the taste turns metallic and sweet.\n\nDistrict maintenance puts the school on the same slow circuit as empty lots. Repairs wait. Attendance drops. Parents take healthy siblings home. The parents fear the handle of the pump. A locked pump lets concentration fail in the heat.\n\nAn open pump sends the same sickness home. Exam week is three weeks out.",
      briefMd:
        "## The place\nMaple Primary is the school of Ms. Okonkwo. Ms. Okonkwo is the head teacher. Ms. Okonkwo counts empty seats after the break. The count stops at twelve. The absent children drank from the yard pump after football.\n\nA girl returns with a note. The girl vomited through the night. The girl has no strength for the walk. The pump is the water that the school can offer between lessons.\n\n## The bigger problem\nThe well under the pump sits downhill from the latrines. The township did not line the latrines in full. After heavy rain the taste turns metallic and sweet. District maintenance puts the school on the same slow circuit as empty lots. Repairs wait. Attendance drops.\n\nParents take healthy siblings home. The parents fear the handle of the pump. A locked pump lets concentration fail in the heat. An open pump sends the same sickness home. Exam week is three weeks out.\n\n## Your job\nKeep class days full and stop sickness from the yard pump before exam week.",
      stakeholder: "Ms. Okonkwo, head teacher",
      crisisMeters: { local: { label: "Sick Kids", description: "Twelve children are absent after drinks from the yard pump." }, global: { label: "Bad Well", description: "The well sits downhill from latrines and turns metallic after heavy rain." }, support: { label: "Class Days", description: "Parents take siblings home and class days fall before exam week." } },
      suggested: ["iot", "gene-sequencing", "ai", "networks", "materials", "computing", "solar"],
      suggestedWhy: {
        "iot": "A sensor on the yard pump can show a bad taste after heavy rain.",
        "gene-sequencing": "Gene sequencing can name germs in well water downhill from the latrines.",
        "ai": "A model can link empty desks with drinks from the yard pump.",
        "networks": "A network can move the school off the slow repair circuit for empty lots.",
        "materials": "A lined barrier can keep latrine water out of the well under the pump.",
        "computing": "A simple log can track absent children and pump use after football.",
        "solar": "Solar power can run a pump test when district repairs wait on the slow circuit.",
      },
      visionTheme: "learn-city",
    }
  ],

  climate: [
    {
      places: ["Cedar Bend"],
      title: "Cedar Bend loses the lower ward",
      summary: "Rhea walks through ankle water on Maple Court in Cedar Bend before sunrise. She marks another porch after the creek jumped its bank in the night. The basement apartment of Mrs. Cole takes a second soaking this month.",
      scene:
        "Rhea walks through ankle water on Maple Court in Cedar Bend before sunrise. She marks another porch. The creek jumped its bank in the night. The siren app on her phone stayed quiet. The culvert under the new logistics park clogged again with silt and shopping bags.\n\nThe lower ward school bus turns around at the dip by midmorning. Two families stack furniture on cinder blocks. A nurse from the night shift cannot get to the clinic road. Missed work grows fast. The only dry route is one ridge road.\n\nA project filled and paved the old marsh for truck bays five years ago. Stormwater has no slow path. The water hits the ward in a sheet. The county pumps aim at the industrial park first. The volunteer gauges of Rhea tell a truer story than the official map. The map still wins the budget meeting.\n\nThe basement apartment of Mrs. Cole takes a second soaking this month. Her oxygen concentrator sits on a chair above the water line. Rhea helps lift the concentrator. Rhea writes another address in the wet notebook.",
      briefMd:
        "## The place\nRhea walks through ankle water on Maple Court in Cedar Bend before sunrise. She marks another porch. The creek jumped its bank in the night. The siren app on her phone stayed quiet. The culvert under the new logistics park clogged again with silt and shopping bags.\n\nThe lower ward school bus turns around at the dip by midmorning. Two families stack furniture on cinder blocks. A nurse from the night shift cannot get to the clinic road. Missed work grows fast. The only dry route is one ridge road.\n\nThe basement apartment of Mrs. Cole takes a second soaking this month. Her oxygen concentrator sits on a chair above the water line. Rhea helps lift the concentrator. Rhea writes another address in the wet notebook.\n\n## The bigger problem\nA project filled and paved the old marsh for truck bays five years ago. Stormwater has no slow path. The water hits the ward in a sheet. The county pumps aim at the industrial park first. The volunteer gauges of Rhea tell a truer story than the official map. The map still wins the budget meeting.\n\n## Your job\nProtect the lower ward of Cedar Bend when the creek leaves its bank.",
      stakeholder: "Rhea, ward flood-watch captain",
      crisisMeters: { local: { label: "Flooded Homes", description: "Floodwater soaks porches on Maple Court and the basement apartment of Mrs. Cole." }, global: { label: "Paved Wetlands", description: "The paved marsh sends stormwater into the lower ward in a sheet." }, support: { label: "Missed Shifts", description: "The flooded clinic road causes missed shifts for the nurse and for ward personnel." } },
      suggested: ["iot", "drones", "materials", "ai", "solar", "battery", "networks", "space"],
      suggestedWhy: {
        "iot": "A sensor can show the creek rise on Maple Court before the siren app stays quiet.",
        "drones": "A drone can show silt and bags in the culvert under the logistics park.",
        "materials": "Ground materials can slow stormwater from the paved marsh above the ward.",
        "ai": "A model can compare the volunteer gauges with the official flood map.",
        "solar": "Solar power can charge the phone and the gauges on Maple Court.",
        "battery": "A battery can keep the gauges ready through a night flood.",
        "networks": "A network can carry gauge readings from Maple Court to the budget meeting.",
        "space": "A space view can show the paved marsh and the sheet of water on the ward.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Juniper Wells"],
      title: "Night heat pins Juniper Wells",
      summary: "Diego unlocks the community clinic in Juniper Wells at 9 p.m. because the chairs are full. The wall thermometer still reads a dangerous level after dark. Marta missed her third shift after a dizzy spell in her kitchen.",
      scene:
        "Diego unlocks the community clinic in Juniper Wells at 9 p.m. because the waiting chairs are full. A grandmother holds a damp cloth to the neck of her grandson. The wall thermometer still reads a dangerous level after dark. The swamp cooler rattles and does not cool the room.\n\nThe gas field across the fence flares. Orange flare light fills the haze. Night does not cool the basin in the old way. Heat from the asphalt and the metal roofs enters the bedrooms. Persons wake with headaches and do not sweat in the normal way.\n\nThe clinic has one cool room. Diego rotates families through slots of twenty minutes. A tanker truck promised ice in the afternoon. The truck did not come. The grid power drops when the window units start at one time. The company trucks from the pads idle outside the gate.\n\nMarta cleans offices on the field road. Marta misses her third shift this week after a dizzy spell in her kitchen. Her name sits on the whiteboard of Diego under follow up. The board holds many names.",
      briefMd:
        "## The place\nDiego unlocks the community clinic in Juniper Wells at 9 p.m. because the waiting chairs are full. A grandmother holds a damp cloth to the neck of her grandson. The wall thermometer still reads a dangerous level after dark. The swamp cooler rattles and does not cool the room.\n\nThe clinic has one cool room. Diego rotates families through slots of twenty minutes. A tanker truck promised ice in the afternoon. The truck did not come. The grid power drops when the window units start at one time.\n\nMarta cleans offices on the field road. Marta misses her third shift this week after a dizzy spell in her kitchen. Her name sits on the whiteboard of Diego under follow up. The board holds many names.\n\n## The bigger problem\nThe gas field across the fence flares. Orange flare light fills the haze. Night does not cool the basin in the old way. Heat from the asphalt and the metal roofs enters the bedrooms. Persons wake with headaches and do not sweat in the normal way. The company trucks from the pads idle outside the gate.\n\n## Your job\nProtect families in Juniper Wells from dangerous night heat in homes and in the clinic.",
      stakeholder: "Diego, community clinic organizer",
      crisisMeters: { local: { label: "Heat Illness", description: "Night heat causes headaches, failed sweat, and a dizzy spell for Marta in her kitchen." }, global: { label: "Gas Flares", description: "Gas flares across the fence add heat and haze over Juniper Wells at night." }, support: { label: "Cool Rooms", description: "The clinic has one cool room and short slots for families in the night heat." } },
      suggested: ["solar", "battery", "iot", "ai", "materials", "energy", "networks", "drones"],
      suggestedWhy: {
        "solar": "Solar power can run the cool room when the grid power drops at night.",
        "battery": "A battery can keep the cool room on when the window units start.",
        "iot": "A sensor can show the wall temperature in the clinic after dark.",
        "ai": "A model can read night heat risk from the clinic thermometer.",
        "materials": "Roof materials can limit heat that metal roofs send into bedrooms.",
        "energy": "Local energy can cool the clinic when the ice truck does not come.",
        "networks": "A network can share night heat readings from the clinic across the basin.",
        "drones": "A drone can show gas flares and hot roofs over Juniper Wells.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Gull Point"],
      title: "Warm water empties Gull Point nets",
      summary: "Noor hauls the last net over the co-op rail at Gull Point. She counts silver that is not there. The harbor boards show another warm week. Her cousin sells his share of the boat after one more blank week.",
      scene:
        "Noor hauls the last net over the co-op rail at Gull Point. She counts silver that is not there. The hold smells of diesel and empty ice. Two deckhands rinse scales that do not cover a lunch plate. The radio from other boats tells the same thin catch up the channel.\n\nThe water temperature boards at the harbor office show another warm week. The cold water band offshore thinned. That band held baitfish in past years. The boats go farther and burn more fuel for the same thin catch. The ice costs climb. The young crew take weekend shifts at the big-box warehouse instead of dawn trips.\n\nThe co-op runs on a shared diesel dock tank and a handshake ledger. Noor signs fuel chits for families that cannot pay if the next trip fails. The inland processors want a fish volume that Noor cannot promise. A tourist ferry wakes the slips. The working boats sit dark.\n\nHer cousin sells his share of the boat after one more blank week. He leaves his gloves on the nail by the bait freezer. Noor stares at the gloves for a long time.",
      briefMd:
        "## The place\nNoor hauls the last net over the co-op rail at Gull Point. She counts silver that is not there. The hold smells of diesel and empty ice. Two deckhands rinse scales that do not cover a lunch plate. The radio from other boats tells the same thin catch up the channel.\n\nThe co-op runs on a shared diesel dock tank and a handshake ledger. Noor signs fuel chits for families that cannot pay if the next trip fails. A tourist ferry wakes the slips. The working boats sit dark.\n\nHer cousin sells his share of the boat after one more blank week. He leaves his gloves on the nail by the bait freezer. Noor stares at the gloves for a long time.\n\n## The bigger problem\nThe water temperature boards at the harbor office show another warm week. The cold water band offshore thinned. That band held baitfish in past years. The boats go farther and burn more fuel for the same thin catch. The ice costs climb. The inland processors want a fish volume that Noor cannot promise.\n\n## Your job\nKeep dock work alive at Gull Point when warm water and diesel bills empty the nets.",
      stakeholder: "Noor, co-op dock lead",
      crisisMeters: { local: { label: "Empty Nets", description: "The nets at Gull Point come up with a catch that does not cover a lunch plate." }, global: { label: "Boat Diesel", description: "The boats burn more diesel from the dock tank for the same thin catch." }, support: { label: "Dock Jobs", description: "The young crew take warehouse shifts instead of dawn trips from the co-op dock." } },
      suggested: ["tidal", "wind", "battery", "solar", "iot", "ai", "materials", "drones"],
      suggestedWhy: {
        "tidal": "Tidal power can cut diesel use at the shared dock tank in Gull Point.",
        "wind": "Wind power can run dock ice gear with less diesel.",
        "battery": "A battery can run dock ice gear in place of the diesel tank.",
        "solar": "Solar power can run the harbor boards and the dock gear at Gull Point.",
        "iot": "A sensor can show water temperature along the channel for the co-op.",
        "ai": "A model can read warm week patterns on the harbor temperature boards.",
        "materials": "Hull materials can cut fuel burn on longer trips for a thin catch.",
        "drones": "A drone can show warm bands and baitfish water offshore from Gull Point.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Soot Bridge"],
      title: "Inversion traps Soot Bridge",
      summary: "Amira stands at the elementary gate in Soot Bridge. Kids cough into their sleeves. Recess moves indoors again under a sky like a lid. Her daughter sits out PE with a rescue inhaler in her sock.",
      scene:
        "Amira stands at the elementary gate in Soot Bridge with a handheld monitor. The monitor beeps too often. Kids cough into their sleeves on the walk from the bus. The morning sky traps the air like a lid. The mill stacks across the river send white lines into the trapped air.\n\nRecess moves indoors again. The clean air fund of the PTA bought filters for six classrooms. The hallways smell of warm dust and exhaust from the bridge queue. Parents text photos of nosebleeds. Teachers mark more sick days. The sick days break the lesson plans for the week.\n\nIn an inversion, the plant night venting and the diesel trucks on the bridge fill one shallow bowl of air. The permits count annual averages. The monitor of Amira counts the hour before math. The neighborhood meetings split. One group wants the mill pay. One group wants clean air for children at soccer practice.\n\nHer daughter sits out PE with a rescue inhaler in her sock. Amira signs the nurse form. Amira feels the choice narrow to filter boxes or open windows. The open windows let the river smell into the room.",
      briefMd:
        "## The place\nAmira stands at the elementary gate in Soot Bridge with a handheld monitor. The monitor beeps too often. Kids cough into their sleeves on the walk from the bus. The morning sky traps the air like a lid. The mill stacks across the river send white lines into the trapped air.\n\nRecess moves indoors again. The clean air fund of the PTA bought filters for six classrooms. The hallways smell of warm dust and exhaust from the bridge queue. Parents text photos of nosebleeds. Teachers mark more sick days. The sick days break the lesson plans for the week.\n\nHer daughter sits out PE with a rescue inhaler in her sock. Amira signs the nurse form. Amira feels the choice narrow to filter boxes or open windows. The open windows let the river smell into the room.\n\n## The bigger problem\nIn an inversion, the plant night venting and the diesel trucks on the bridge fill one shallow bowl of air. The permits count annual averages. The monitor of Amira counts the hour before math. The neighborhood meetings split. One group wants the mill pay. One group wants clean air for children at soccer practice.\n\n## Your job\nMake the school air in Soot Bridge safe for children when an inversion traps smoke.",
      stakeholder: "Amira, PTA clean-air lead",
      crisisMeters: { local: { label: "Dirty Air", description: "Kids cough at the elementary gate and the hallways smell of bridge exhaust." }, global: { label: "Stack Smoke", description: "The mill stacks send white lines into the trapped air over the river." }, support: { label: "Sick Days", description: "Sick days break the lesson plans and pull a daughter from PE." } },
      suggested: ["materials", "iot", "ai", "drones", "networks", "solar", "battery", "robots"],
      suggestedWhy: {
        "materials": "Filter materials can clean classroom air when an inversion traps mill smoke.",
        "iot": "A monitor can show the dirty hour before math at the school gate.",
        "ai": "A model can contrast the hour reading with the annual permit average.",
        "drones": "A drone can show stack lines and bridge exhaust in the trapped air.",
        "networks": "A network can share gate monitor readings with parents and teachers.",
        "solar": "Solar power can run classroom filters in an inversion at the school.",
        "battery": "A battery can run filters in six classrooms through a long inversion.",
        "robots": "A robot can carry a monitor between the school gate and the bridge queue.",
      },
      visionTheme: "social-city",
    }
  ],

  cancer: [
    {
      places: ["Circuit Beach scrap yards"],
      title: "Circuit Beach burns still seed the tumors",
      summary: "Ama Diallo kneels at a sort path on Circuit Beach and lifts the wrist of a boy. The open sore stays open for three weeks. Children strip wire for weight tickets. Smoke from the burn pits comes across the copper piles.",
      scene:
        "Ama Diallo kneels beside a sort path at first light. She lifts the wrist of a boy. The open sore stays open for three weeks. She tapes gauze. She bought the gauze with her cash.\n\nWind turns from the burn pits. Black smoke slides across the copper piles. Children strip wire for weight tickets. The yards pay by stripped kilos.\n\nAfter dark the bosses light plastic jackets. Open fire is faster than the slow shredders. No person funds those shredders.\n\nThe throat of Ama Diallo burns by noon. Last month the clinic found a lump in the neck of her neighbor. That neighbor taught her the boards that hold gold dust. The smoke seeds the path. The tickets come.",
      briefMd:
        "## The place\nAma Diallo kneels beside a sort path at Circuit Beach scrap yards. She lifts the wrist of a boy. The open sore stays open for three weeks. She tapes gauze. She bought the gauze with her cash.\n\nWind turns from the burn pits. Black smoke slides across the copper piles. Children strip wire for weight tickets. The yards pay by stripped kilos.\n\n## The bigger problem\nAfter dark the bosses light plastic jackets. Open fire is faster than the slow shredders. No person funds those shredders. The throat of Ama Diallo burns by noon. Last month the clinic found a lump in the neck of her neighbor.\n\nThat neighbor taught her the boards that hold gold dust. The smoke seeds the path. The tickets come.\n\n## Your job\nStop the burn smoke that keeps the open sores on the sort path.",
      stakeholder: "Scrap-yard health volunteer Ama Diallo",
      crisisMeters: { local: { label: "Open sores", description: "The open sore on the wrist of the boy stays open for three weeks." }, global: { label: "Burn smoke", description: "Black smoke from the burn pits slides across the copper piles." }, support: { label: "Scrap wages", description: "The yards pay children by stripped kilos from weight tickets." } },
      suggested: ["iot", "drones", "materials", "ai", "gene-sequencing", "robots", "solar", "networks"],
      suggestedWhy: {
        "iot": "A sensor can show when burn smoke crosses the copper piles.",
        "drones": "A drone can watch the burn pits after dark when bosses light plastic jackets.",
        "materials": "A new cloth can block black smoke before the smoke crosses the sort path.",
        "ai": "A model can flag the weeks when an open sore stays open.",
        "gene-sequencing": "A lab read can show smoke marks in the open sore on the sort path.",
        "robots": "A robot can strip wire so children do not stand beside the burn pits.",
        "solar": "Solar power can run the slow shredders so bosses do not light plastic jackets.",
        "networks": "A network can send sore notes from Ama Diallo to the clinic.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Old Gasworks School block"],
      title: "Playground vapors no one capped in time",
      summary: "Priya Nair marks three more absences in the nurse closet at Old Gasworks School. A sweet tar smell rises through cracked asphalt under the playground. Parents want the classrooms off the plume. The sick days stack.",
      scene:
        "Priya Nair stands in the nurse closet at Old Gasworks School. She marks three more absences. The absences show nosebleeds and stomach pain. She opens the window. A sweet tar smell rises when the sun hits the old coking ground under the playground.\n\nThe district sealed one corner years ago. The rest of the ground sends vapor through cracked asphalt between math and recess.\n\nParents want the portable classrooms off the plume. The budget committee says a land swap cuts the arts block and the free-lunch extension. Priya Nair holds a permission slip for a mobile screening van. A stable address is necessary. A parent champion who does not lose a shift is necessary.\n\nThe vapors rise. The sick days stack.",
      briefMd:
        "## The place\nPriya Nair stands in the nurse closet at Old Gasworks School. She marks three more absences. The absences show nosebleeds and stomach pain. She opens the window. A sweet tar smell rises when the sun hits the old coking ground under the playground.\n\nThe district sealed one corner years ago. The rest of the ground sends vapor through cracked asphalt between math and recess.\n\n## The bigger problem\nParents want the portable classrooms off the plume. The budget committee says a land swap cuts the arts block and the free-lunch extension. A stable address is necessary for a mobile screening van. A parent champion who does not lose a shift is necessary.\n\nThe vapors rise. The sick days stack.\n\n## Your job\nMove the classrooms off the tar plume under the playground.",
      stakeholder: "PTA nurse coordinator Priya Nair",
      crisisMeters: { local: { label: "Sick kids", description: "Three more absences show nosebleeds and stomach pain in the nurse closet." }, global: { label: "Tar vapors", description: "A sweet tar smell rises through cracked asphalt under the playground." }, support: { label: "Budget fights", description: "A land swap cuts the arts block and the free-lunch extension." } },
      suggested: ["iot", "materials", "ai", "gene-sequencing", "drones", "networks", "computing", "space"],
      suggestedWhy: {
        "iot": "A sensor can show when tar vapor rises through the cracked asphalt.",
        "materials": "A seal can close cracks in the asphalt over the old coking ground.",
        "ai": "A model can link absences to the hours when the sun hits the playground.",
        "gene-sequencing": "A lab read can show tar marks in children with nosebleeds.",
        "drones": "A drone can map the plume over the playground between math and recess.",
        "networks": "A network can share absence notes with parents who hold a stable address.",
        "computing": "A computer can compare sick days with the hours of tar smell.",
        "space": "A sky view can show the plume shape over Old Gasworks School.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Nail Row beauty corridor"],
      title: "Solvent booths trade lungs for tips",
      summary: "Linh Tran props the alley door on Nail Row and counts the booth fans. Two fans are dead. Acetone stays in the air. Mei at booth four covers a cough and files so the polish dries before the dinner rush.",
      scene:
        "Linh Tran props the alley door on Nail Row. She counts the booth fans. Two fans are dead. Acetone and methacrylate stay in the air. Mei at booth four covers a cough with her elbow. Mei files so the polish dries before the dinner rush.\n\nTips pay the lease. The landlord meters each booth. The landlord fines a worker who runs a window unit past the shared breaker. Linh Tran hung a cheap carbon filter. The filter clogged in a week. The supply house laughed at the bulk price.\n\nA mobile clinic offered free checks last spring. Half the workers stayed home. Booth renters without papers fear a clipboard in the corridor. The coughs grow longer. The polish must dry before the dinner rush.",
      briefMd:
        "## The place\nLinh Tran props the alley door on Nail Row. She counts the booth fans. Two fans are dead. Acetone and methacrylate stay in the air. Mei at booth four covers a cough with her elbow.\n\nTips pay the lease. The landlord meters each booth. The landlord fines a worker who runs a window unit past the shared breaker.\n\n## The bigger problem\nLinh Tran hung a cheap carbon filter. The filter clogged in a week. The supply house laughed at the bulk price. A mobile clinic offered free checks last spring. Half the workers stayed home. Booth renters without papers fear a clipboard in the corridor.\n\nThe coughs grow longer. The polish must dry before the dinner rush.\n\n## Your job\nClear the booth fumes that lengthen the coughs on Nail Row.",
      stakeholder: "Booth steward Linh Tran",
      crisisMeters: { local: { label: "Cough spells", description: "Mei at booth four covers a cough and files the polish before the dinner rush." }, global: { label: "Booth fumes", description: "Acetone and methacrylate stay in the air when two fans are dead." }, support: { label: "Lease fear", description: "Booth renters without papers fear a clipboard in the corridor." } },
      suggested: ["iot", "materials", "ai", "networks", "gene-sequencing", "print3d", "solar", "nano"],
      suggestedWhy: {
        "iot": "A sensor can show acetone levels when two booth fans are dead.",
        "materials": "A fresh filter can hold acetone before the dinner rush.",
        "ai": "A model can flag long cough spells in the booths on Nail Row.",
        "networks": "A network can tell workers about free checks without a corridor clipboard.",
        "gene-sequencing": "A lab read can show solvent marks in workers with long coughs.",
        "print3d": "A printed fan part can replace a dead fan in a booth.",
        "solar": "Solar power can run a window fan when the shared breaker is full.",
        "nano": "A fine filter media can catch methacrylate in the booth air.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Vinyl Reach night plant"],
      title: "Night resin lines still mark the livers",
      summary: "Omar Haddad walks the night resin line at Vinyl Reach. A sweet chemical smell leaks from flange 17 again. Workers eat lunch twenty steps from the reactors. Overtime clears the medical bills.",
      scene:
        "Omar Haddad walks the night resin line at Vinyl Reach. Tape holds a flashlight on his hard hat. A sweet chemical smell leaks from flange 17 again. He hangs a red tag. The overnight supervisor shrugs. Orders for pipe compound are up.\n\nThe day crew used the spare gasket set. Workers eat lunch at the break tables twenty steps from the reactors.\n\nThe cousin of Omar Haddad left last year after a bad liver panel. The plant nurse hands referrals across town. Overtime clears the medical bills from those referrals. The company tracks output by shift. The company does not track cumulative solvent hours the same way.",
      briefMd:
        "## The place\nOmar Haddad walks the night resin line at Vinyl Reach. Tape holds a flashlight on his hard hat. A sweet chemical smell leaks from flange 17 again. He hangs a red tag. The overnight supervisor shrugs. Orders for pipe compound are up.\n\nThe day crew used the spare gasket set. Workers eat lunch at the break tables twenty steps from the reactors.\n\n## The bigger problem\nThe cousin of Omar Haddad left last year after a bad liver panel. The plant nurse hands referrals across town. Overtime clears the medical bills from those referrals.\n\nThe company tracks output by shift. The company does not track cumulative solvent hours the same way.\n\n## Your job\nStop the flange leak that marks the livers on the night resin line.",
      stakeholder: "Shift safety rep Omar Haddad",
      crisisMeters: { local: { label: "Liver cases", description: "The cousin of Omar Haddad left after a bad liver panel." }, global: { label: "Resin leaks", description: "A sweet chemical smell leaks from flange 17 again." }, support: { label: "Overtime push", description: "Overtime clears the medical bills from the referrals." } },
      suggested: ["iot", "robots", "ai", "materials", "gene-sequencing", "networks", "computing", "synbio"],
      suggestedWhy: {
        "iot": "A sensor can show a leak at flange 17 on the night resin line.",
        "robots": "A robot can change a gasket so workers do not stand by the reactors.",
        "ai": "A model can compare solvent hours with liver panels by shift.",
        "materials": "A better gasket can stop the sweet chemical smell at flange 17.",
        "gene-sequencing": "A lab read can show solvent marks after a bad liver panel.",
        "networks": "A network can send referrals without a long trip across town.",
        "computing": "A computer can track cumulative solvent hours the same way as output.",
        "synbio": "A cell test can show liver stress from the night resin line.",
      },
      visionTheme: "energy-city",
    }
  ],

  mental: [
    {
      places: ["Ames Cyclone Corridor, Iowa"],
      title: "Waitlist longer than the semester",
      summary: "Maya opens the peer-support office at 7:40 a.m. with three sticky notes under the door. The campus clinic sets the next open intake after finals. A sophomore who lost sleep after midterms will lose the semester first.",
      scene:
        "Maya opens the peer-support office at 7:40 a.m. The three sticky notes wait under the door. One sticky note comes from a sophomore. The sophomore lost sleep after midterms. Maya puts the name of the sophomore on the board. The twelve other names sit on the board.\n\nThe campus clinic sets the next open intake after finals. The semester will end before that intake. The peer listeners take the overflow in a borrowed study room. The study room has thin walls. The campus trains the listeners for a warm handoff. The training does not cover panic until dawn.\n\nA resident advisor sends a text to Maya. A student panics in a dorm stairwell. One evening slot remains this week. Maya must choose the person for that slot.\n\nThe campus froze counseling FTE while enrollment climbed. Advising tells each student to use the app. Advising tells each student to push for grades. The waitlist is not a side effect. The waitlist is the way the campus budgets care against credit hours.\n\nMaya watches the name of the sophomore on the board. The name does not move.",
      briefMd:
        "## The place\n\nMaya opens the peer-support office in the Ames Cyclone Corridor at 7:40 a.m. The three sticky notes wait under the door. One sticky note comes from a sophomore. The sophomore lost sleep after midterms. Maya puts the name of the sophomore on the board. The twelve other names sit on the board.\n\nThe campus clinic sets the next open intake after finals. The semester will end before that intake. The peer listeners take the overflow in a borrowed study room. The study room has thin walls. A resident advisor sends a text about a dorm stairwell. A student panics in that stairwell.\n\n## The bigger problem\n\nThe campus froze counseling FTE while enrollment climbed. Advising tells each student to use the app. Advising tells each student to push for grades. The waitlist is not a side effect. The waitlist is the way the campus budgets care against credit hours. Maya must choose the person for one evening slot this week.\n\nThe name of the sophomore does not move on the board.\n\n## Your job\n\nBring care to the sophomore before the semester ends.",
      stakeholder: "Campus peer-support director",
      crisisMeters: { local: { label: "Panic Nights", description: "A student panics in a dorm stairwell until dawn. The peer listeners cannot cover that panic." }, global: { label: "Wait Lists", description: "The next open intake comes after finals. The twelve names wait on the board." }, support: { label: "Grade Fear", description: "Advising tells each student to push for grades while the sophomore waits for care." } },
      suggested: ["ai", "networks", "vr", "computing", "iot"],
      suggestedWhy: {
        "ai": "Ai can flag lost sleep on a sticky note before the evening slot is gone.",
        "networks": "Networks can link the study room to the clinic before finals.",
        "vr": "Vr can let a listener practice a warm handoff for dawn panic.",
        "computing": "Computing can show care hours against credit hours on the board.",
        "iot": "Iot can alert Maya when a student panics in a dorm stairwell.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Garden City Packing Ward, Kansas"],
      title: "The line never slows for grief",
      summary: "Father Ruiz stands by the break-room microwave as the second shift clocks in. Maria must make rate after her brother died on a different line last month. The belt does not pause for grief.",
      scene:
        "Father Ruiz stands by the break-room microwave in the Garden City Packing Ward. The second shift clocks in. The eyes of Maria are red. Her brother died on a different line last month. Maria must still make rate. The office of the chaplain is a converted locker with a folding chair.\n\nThe workers come on a ten-minute break. The workers return before the belt notices. A supervisor knocks. The supervisor points at the clock. Father Ruiz walks Maria back toward the floor. The hum of the chain does not pause.\n\nThe line speed did not change when the town buried three men in one season. The bonus pay tracks carcasses per hour. Speech about grief can mark a worker as unreliable on the next schedule. Silence is part of the throughput plan.",
      briefMd:
        "## The place\n\nFather Ruiz stands by the break-room microwave in the Garden City Packing Ward. The second shift clocks in. The eyes of Maria are red. Her brother died on a different line last month. Maria must still make rate. The office of the chaplain is a converted locker with a folding chair.\n\nThe workers come on a ten-minute break. The workers return before the belt notices. A supervisor knocks. The supervisor points at the clock. Father Ruiz walks Maria back toward the floor. The hum of the chain does not pause.\n\n## The bigger problem\n\nThe line speed did not change when the town buried three men in one season. The bonus pay tracks carcasses per hour. Speech about grief can mark a worker as unreliable on the next schedule. Silence is part of the throughput plan.\n\n## Your job\n\nGive Maria a pause for grief without a schedule penalty.",
      stakeholder: "Plant chaplain and wellness liaison",
      crisisMeters: { local: { label: "Exhaustion", description: "Maria returns to the line after a ten-minute break with red eyes and no pause." }, global: { label: "Line Speed", description: "The line speed did not change after the town buried three men in one season." }, support: { label: "Silence", description: "Speech about grief can mark a worker as unreliable on the next schedule." } },
      suggested: ["networks", "ai", "transportation", "vr", "computing"],
      suggestedWhy: {
        "networks": "Networks can warn Father Ruiz before a ten-minute break ends.",
        "ai": "Ai can mark grief risk before a supervisor points at the clock.",
        "transportation": "Transportation can move a short task so the line can pause.",
        "vr": "Vr can show the cost of a chain that does not pause.",
        "computing": "Computing can place carcasses per hour next to grief time.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Detroit Receiving Night Floor, Michigan"],
      title: "Twelve-hour hearts running empty",
      summary: "Charge nurse Keisha counts the badges at the ICU shift change and comes up two short. The board shows a full ICU and a float pool that said no. A new graduate freezes outside a coding room with six hours left.",
      scene:
        "Charge nurse Keisha counts the badges at the shift change on the Detroit Receiving Night Floor. The count is short by two badges. The board shows a full ICU. The float pool said no. Keisha assigns the rooms with a pen. The pen wrote the same names on many nights.\n\nA new graduate freezes outside a coding room at mid-shift. Last week the new graduate lost a patient. The new graduate calmed the patient from fear. The six hours remain on the shift.\n\nKeisha wants a quiet debrief for the new graduate. The floor has no quiet. No spare nurse can cover the bay.\n\nThe admin tracks overtime and vacancy. The admin does not track the weight of repeated death. The travel contracts patch the holes. The permanent staff burn out and leave. The shortage feeds the next shortage.\n\nKeisha feels the math in her chest before the roster shows the math.",
      briefMd:
        "## The place\n\nCharge nurse Keisha counts the badges at the shift change on the Detroit Receiving Night Floor. The count is short by two badges. The board shows a full ICU. The float pool said no. Keisha assigns the rooms with a pen. The pen wrote the same names on many nights.\n\nA new graduate freezes outside a coding room at mid-shift. Last week the new graduate lost a patient. The new graduate calmed the patient from fear. The six hours remain on the shift. Keisha wants a quiet debrief. No spare nurse can cover the bay.\n\n## The bigger problem\n\nThe admin tracks overtime and vacancy. The admin does not track the weight of repeated death. The travel contracts patch the holes. The permanent staff burn out and leave. The shortage feeds the next shortage.\n\nKeisha feels the math in her chest before the roster shows the math.\n\n## Your job\n\nKeep the new graduate safe for the six hours that remain.",
      stakeholder: "ICU charge nurse coalition",
      crisisMeters: { local: { label: "Moral Injury", description: "The new graduate lost a patient and freezes outside a coding room." }, global: { label: "Short Staffing", description: "Keisha is two badges short and the float pool said no to a full ICU." }, support: { label: "Turnover", description: "The permanent staff burn out and leave while the travel contracts patch the holes." } },
      suggested: ["ai", "robots", "networks", "vr", "computing"],
      suggestedWhy: {
        "ai": "Ai can warn Keisha when a new graduate freezes at a coding room.",
        "robots": "Robots can cover one bay task during a short debrief.",
        "networks": "Networks can seek a spare nurse after the float pool says no.",
        "vr": "Vr can rehearse a patient death before the weight hits the floor.",
        "computing": "Computing can list vacancy beside repeated death, not only overtime.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Phoenix Desert Stack, Arizona"],
      title: "Five stars or the spiral",
      summary: "Luis sits in a shaded parking garage at 2 p.m. with the AC off to save charge. A one-star note after an elevator outage thinned his morning orders. The rent does not care about his rating.",
      scene:
        "Luis sits in a shaded parking garage in the Phoenix Desert Stack at 2 p.m. The AC stays off to save charge. His phone buzzes with a delivery ping across town. Yesterday a rider left a one-star note for a late bag. The late bag followed an elevator outage. His acceptance score dipped.\n\nThe app thinned his orders by morning. Luis belongs to a mutual-aid chat. The chat gives the members cash for tires and for bad weeks. The chat is quiet this night because the members chase dinner surges. Luis accepts the ping with a dry mouth.\n\nThe platforms rank the workers in public. The platforms hide the rules that cut hours. The sick leave does not exist after a threat in a driveway. Anxiety spikes after that threat. The rent does not care about his rating. The score is a leash while his nerves fray.",
      briefMd:
        "## The place\n\nLuis sits in a shaded parking garage in the Phoenix Desert Stack at 2 p.m. The AC stays off to save charge. His phone buzzes with a delivery ping across town. Yesterday a rider left a one-star note for a late bag. The late bag followed an elevator outage. His acceptance score dipped.\n\nThe app thinned the morning orders. Luis belongs to a mutual-aid chat. The chat gives the members cash for tires and for bad weeks. The chat is quiet this night because the members chase dinner surges.\n\n## The bigger problem\n\nThe platforms rank the workers in public. The platforms hide the rules that cut hours. The sick leave does not exist after a threat in a driveway. The rent does not care about his rating. The score is a leash while his nerves fray.\n\nLuis accepts the ping with a dry mouth.\n\n## Your job\n\nGive Luis a path off the rating leash after a bad day.",
      stakeholder: "Gig worker mutual-aid organizer",
      crisisMeters: { local: { label: "Burnout", description: "Luis sits with the AC off and accepts a ping with a dry mouth." }, global: { label: "Rating Fear", description: "A one-star note thinned his orders after his acceptance score dipped." }, support: { label: "No Safety Net", description: "The sick leave does not exist after a driveway threat and the rent ignores his rating." } },
      suggested: ["ai", "networks", "transportation", "computing", "solar"],
      suggestedWhy: {
        "ai": "Ai can show a hidden hour rule before a score cuts orders.",
        "networks": "Networks can hold the mutual-aid chat open during a dinner surge.",
        "transportation": "Transportation can reroute a ping after an elevator outage.",
        "computing": "Computing can show the rating leash next to rent and sick leave.",
        "solar": "Solar can hold car charge so the AC can stay on in the garage.",
      },
      visionTheme: "social-city",
    }
  ],

  alzheimer: [
    {
      places: ["Prairie View Senior Cottages, Grand Island"],
      title: "Dusk walks past the grain bins",
      summary: "Ruth locks the cottage office at 6:40. She sees the empty chair of Harold. She finds Harold two blocks out with an open coat. He names the old elevator. Three other doors need a knock. The paper roster cannot stretch past dark.",
      scene:
        "Ruth locks the cottage office at 6:40. She sees the empty chair of Harold on the porch. The gravel path to the grain bins is dim. She finds Harold two blocks from Prairie View Senior Cottages. His coat is open. He names the old elevator.\n\nHarold does not fight Ruth. Harold does not know the way home. Ruth brings Harold back to the cottage. The volunteer check sheet is a half hour late.\n\nThree other doors need a knock. The township runs on neighbor goodwill and a paper roster. Ruth prints the roster each Monday. Children moved to Lincoln and Omaha years ago. A phone tree stalls on a harvest run. A phone tree stalls on a double shift at the packing plant.\n\nWandering is common in the hour after supper. Light drops fast across flat ground. Memory loses street names. Families live too far to cover each dusk. The cottages serve independent living. The cottages do not give continuous watch.\n\nLate checks pile up after dark. The same six volunteers cover twelve units and a long county road. The daughter of Harold hears about this night on the next day. Ruth hears the catch in her voice.",
      briefMd:
        "## The place\nPrairie View Senior Cottages stand in Grand Island. Ruth is the township volunteer coordinator. She locks the cottage office at 6:40. The chair of Harold is empty on the porch. The gravel path to the grain bins is dim.\n\nShe finds Harold two blocks out. His coat is open. He names the old elevator. The night crew does not work there. Harold does not fight Ruth. Harold does not know the way home.\n\nRuth brings Harold back. The volunteer check sheet is a half hour late. Three other doors need a knock. Ruth prints a paper roster each Monday. Children live in Lincoln and Omaha. Phone trees stall on a harvest run or a packing-plant shift.\n\n## The bigger problem\nWandering comes after supper when light drops fast. Memory loses street names on flat ground. Families live too far for each dusk. The cottages serve independent living, not continuous watch. Six volunteers cover twelve units and a long county road. Late checks pile up after dark.\n\nThe daughter of Harold hears the story on the next day. Ruth hears the catch in her voice. The last neighbor cannot carry each dusk alone.\n\n## Your job\nKeep a dusk walk safe for Harold without loss of the last volunteer.",
      stakeholder: "Ruth, township volunteer coordinator",
      crisisMeters: { local: { label: "Wandering", description: "Harold leaves the porch after supper and walks toward the grain bins without the way home." }, global: { label: "Late Checks", description: "Six volunteers cover twelve units, and the paper roster runs late after dark." }, support: { label: "Family Distance", description: "The daughter of Harold lives far away and hears the story only on the next day." } },
      suggested: ["iot", "ai", "networks", "drones", "transportation", "computing"],
      suggestedWhy: {
        "iot": "A small net can show Ruth when Harold leaves the porch at dusk.",
        "ai": "A pattern tool can flag a walk that does not match the way home.",
        "networks": "A local link can alert the next volunteer when a check runs late.",
        "drones": "A dusk flight can watch the path to the grain bins from above.",
        "transportation": "A short ride can bring Harold back before the road goes dark.",
        "computing": "A simple roster tool can show which door still needs a knock.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Harbor Lights Tower, Seattle"],
      title: "Three floors, one night aide",
      summary: "Kenji rides the slow elevator to floor twelve with a printed med list. The door of Mrs. Park is ajar. Her evening pills sit untouched beside a cold cup of tea. The night aide is on floor nine. One person cannot cover three floors after eight.",
      scene:
        "Kenji rides the slow elevator to floor twelve. He carries a printed med list. His key ring is loud in the hallway. The door of Mrs. Park is ajar. Her evening pills sit untouched beside a cold cup of tea. The night aide is on floor nine.\n\nThe fall alarm was a dropped remote. One licensed aide covers three floors after eight. The building sold independent living with a light care add-on. Dementia came faster than the staffing model. Families on video calls see tidy lobbies. Families do not see the gap between rounds and a missed dose.\n\nKenji knocks with a light hand. Kenji waits. A sensor pilot died in committee last month. Residents feared constant watch. Adult children wanted proof of a missed dose. Trust split on that line.\n\nTools stay in boxes without trust. The aide runs the stairs without tools. Meds go cold on nightstands. Mrs. Park knows the face of Kenji tonight. Mrs. Park cannot know that face tomorrow. Kenji holds the list as resident council, not as clinical staff.",
      briefMd:
        "## The place\nHarbor Lights Tower stands in Seattle. Kenji is the resident council president. He rides the slow elevator to floor twelve. He carries a printed med list. The door of Mrs. Park is ajar. Her evening pills sit untouched beside a cold cup of tea.\n\nThe night aide is on floor nine. The fall alarm was a dropped remote. One licensed aide covers three floors after eight. The building sold independent living with a light care add-on. Dementia came faster than the staffing model.\n\n## The bigger problem\nFamilies on video calls see tidy lobbies. Families do not see the gap before a missed dose. A sensor pilot died in committee last month. Residents feared constant watch. Adult children wanted proof of notice. Trust split, so tools stay in boxes.\n\nThe aide runs the stairs. Meds go cold on nightstands. Mrs. Park knows Kenji tonight. She cannot know his face tomorrow. Kenji is not clinical staff. He holds the list.\n\n## Your job\nShare night dignity and safety across three floors without one aide everywhere.",
      stakeholder: "Kenji, resident council president",
      crisisMeters: { local: { label: "Missed Meds", description: "The evening pills of Mrs. Park sit untouched beside a cold cup of tea." }, global: { label: "Thin Staffing", description: "One licensed aide covers three floors after eight while alarms pull the aide away." }, support: { label: "Trust Gap", description: "Residents fear constant watch, and adult children want proof of a missed dose." } },
      suggested: ["robots", "iot", "ai", "networks", "vr", "battery"],
      suggestedWhy: {
        "robots": "A hall helper can carry a reminder while the night aide stays on floor nine.",
        "iot": "A door cue can show a missed pill without a watch on Mrs. Park.",
        "ai": "A dose check can flag an untouched blister pack before the tea goes cold.",
        "networks": "A floor link can send the fall alarm to the aide without a stair run.",
        "vr": "A calm practice view can help residents trust a light check at night.",
        "battery": "A long charge can keep a night cue alive through the late rounds.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Ironbound Walk-In Row, Youngstown"],
      title: "After the midnight caregiving shift",
      summary: "Angela unlocks the free clinic at 7:10. The coffee is bitter. Marcus is first in line after a night on the recliner beside his father. Memory checks slide to next time. Next time is often an ER bay.",
      scene:
        "Angela unlocks the free clinic at 7:10. The coffee is bitter. Marcus is first in line. He spent the night on a recliner beside his father. His father sleeps no more than ninety minutes at a stretch. The badge of Marcus says mill maintenance.\n\nThe mill is a shell. The night shift is unpaid and endless. Angela wants twenty quiet minutes for a cognitive screen. The waiting room fills with coughs and work forms. A neighbor needs wound care before a job interview. Cognitive checks slide to next time.\n\nNext time is often an ER bay. The cause is a stove fire or a police wellness call. This block makes crisis moves. Early change has no cheap place to land. Adult children juggle gig hours and overnight sitting. Primary care slots sit months out.\n\nThe clinic sees a person only after the worst night. Exhaustion is the local fuel. Missed screens are the habit the system teaches. Marcus asks if lost names mean the disease wins. Angela has no clean answer. The schedule is full by eight.",
      briefMd:
        "## The place\nIronbound Walk-In Row stands in Youngstown. Angela is the free-clinic nurse practitioner. She unlocks the clinic at 7:10. The coffee is bitter. Marcus is first in line after a night on a recliner beside his father.\n\nHis father sleeps no more than ninety minutes at a stretch. The badge of Marcus says mill maintenance. The mill is a shell. The night shift is unpaid and endless. Angela wants twenty quiet minutes for a cognitive screen.\n\n## The bigger problem\nThe waiting room fills with coughs, work forms, and wound care. Cognitive checks slide to next time. Next time is often an ER bay after a stove fire or a police wellness call. Early change has no cheap place to land. Primary care slots sit months out.\n\nAdult children juggle gig hours and overnight sitting. The clinic sees a person only after the worst night. Exhaustion is the local fuel. Missed screens are the habit the system teaches. Marcus asks if lost names mean the disease wins. Angela has no clean answer before eight.\n\n## Your job\nPut an early memory check in the hours a tired son already lives.",
      stakeholder: "Angela, free-clinic nurse practitioner",
      crisisMeters: { local: { label: "Exhaustion", description: "Marcus sits all night beside his father and arrives tired at 7:10." }, global: { label: "Missed Screens", description: "Cognitive checks slide to next time because the waiting room fills first." }, support: { label: "Crisis Moves", description: "The next step is often an ER bay after a stove fire or a wellness call." } },
      suggested: ["ai", "networks", "transportation", "computing", "iot", "solar"],
      suggestedWhy: {
        "ai": "A short screen can fit in the minutes before the waiting room fills.",
        "networks": "A clinic link can hold a memory note when the next slot is months out.",
        "transportation": "A dawn ride can bring Marcus to the clinic before the next stove risk.",
        "computing": "A simple form can capture sleep loss without a long visit.",
        "iot": "A home cue can mark ninety-minute sleep breaks for the morning visit.",
        "solar": "A small power pack can keep a night light on when the mill wage is gone.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Little Mekong Courtyard, Fresno"],
      title: "Prayers between bus transfers",
      summary: "Sothea meets Auntie Vanna under the courtyard shade after the temple service. Vanna missed the clinic again. At the second bus stop she did not name the street. A stranger helped her home. Sothea cannot cover every transfer.",
      scene:
        "Sothea meets Auntie Vanna under the courtyard shade after the temple service. The hands of Vanna worry a prayer bead strand. Vanna missed the clinic again. The cross-town bus needs two transfers. At the second stop Vanna did not name the street on the paper in her purse. A stranger helped Vanna reverse the route home.\n\nThe mutual-aid group keeps a ride list on a whiteboard. Drivers are cousins with day jobs. English forms at the memory clinic feel like walls. Younger relatives translate when they can. Pride keeps elders from the word dementia. Delay is shame with logistics, not laziness.\n\nTraffic risk is real on long rides. Confusion spikes mid-route. A language barrier turns a simple appointment into a family negotiation. Clinics sit far from the corridor. Intake assumes fluent English and a private car. The community protects face until a crisis opens the story.\n\nSothea can arrange one ride. Sothea cannot cover every transfer.",
      briefMd:
        "## The place\nLittle Mekong Courtyard stands in Fresno. Sothea is the temple mutual-aid lead. She meets Auntie Vanna under the courtyard shade after the temple service. The hands of Vanna worry a prayer bead strand. Vanna missed the clinic again.\n\nThe cross-town bus needs two transfers. At the second stop Vanna did not name the street on the paper in her purse. A stranger helped Vanna reverse the route home. The mutual-aid group keeps a ride list on a whiteboard. Drivers are cousins with day jobs.\n\n## The bigger problem\nEnglish forms at the memory clinic feel like walls. Younger relatives translate when they can. Pride keeps elders from the word dementia. Delay is shame with logistics, not laziness. Traffic risk is real when confusion spikes mid-route.\n\nClinics sit far from the corridor. Intake assumes fluent English and a private car. The community protects face until a crisis opens the story. Sothea can arrange one ride. Sothea cannot cover every transfer.\n\n## Your job\nGive an elder a safe path to memory care before shame waits for fear.",
      stakeholder: "Sothea, temple mutual-aid lead",
      crisisMeters: { local: { label: "Traffic Risk", description: "Confusion on the long bus ride can spike before the second transfer." }, global: { label: "Language Barrier", description: "English forms at the memory clinic block Auntie Vanna without a translator." }, support: { label: "Shame Delay", description: "Shame keeps the word dementia quiet until a crisis forces the story open." } },
      suggested: ["ai", "networks", "iot", "drones", "vr", "self-driving"],
      suggestedWhy: {
        "ai": "A plain voice guide can name the next stop when the street name fades.",
        "networks": "A ride board can match a cousin driver to the clinic hour.",
        "iot": "A pocket cue can mark the transfer before confusion spikes.",
        "drones": "A map view from above can show the two bus transfers in simple marks.",
        "vr": "A practice ride can show the clinic path before the real bus day.",
        "self-driving": "A local car can take Auntie Vanna to the clinic without two transfers.",
      },
      visionTheme: "social-city",
    }
  ],

  ageing: [
    {
      places: ["Midtown Home-Care Corridor"],
      title: "Doubles until the body breaks",
      summary: "Rosa tapes a fresh route sheet to the co-op board at 5:40 a.m. Twelve names are on the sheet. Yesterday the sheet had ten names. Pay is per visit. Pay is not per careful minute. A med pass will slip before noon.",
      scene:
        "Rosa tapes a fresh route sheet to the co-op board at 5:40 a.m. in the Midtown Home-Care Corridor. Twelve names are on the sheet. Yesterday the sheet had ten names. The tablet pings two more times. The hospital discharge desk wants two new age-in-place intakes on the same corridor today.\n\nMrs. Chen must get a full wash and a safe transfer into the chair before dialysis transport. Mr. Okonkwo's son canceled the morning slot again. Rosa's right shoulder burns from last week's lifts. Rosa doubles a hoist with a coworker. The coworker has a list in the stairwell.\n\nThe city and the agencies pay per completed visit. They do not pay per careful minute. Families cannot buy live-in help. The beds empty at a faster rate. The route gets more names.\n\nA worker will miss a med pass before noon. The cooperative can refuse the new clients. The cooperative then loses the contract corridor. The cooperative can keep the new clients. Longer lives then outlast the backs that carry the clients.",
      briefMd:
        "## The place\n\nRosa tapes a fresh route sheet to the co-op board at 5:40 a.m. in the Midtown Home-Care Corridor. Twelve names are on the sheet. Yesterday the sheet had ten names. The tablet pings two more times. The hospital discharge desk wants two new age-in-place intakes on the same corridor today.\n\nMrs. Chen must get a full wash and a safe transfer into the chair before dialysis transport. Mr. Okonkwo's son canceled the morning slot again. Rosa's right shoulder burns from last week's lifts.\n\nThe city and the agencies pay per completed visit. They do not pay per careful minute. Families cannot buy live-in help. The beds empty at a faster rate. The route gets more names.\n\n## The bigger problem\n\nRosa doubles a hoist with a coworker. The coworker has a list in the stairwell. A worker will miss a med pass before noon. The cooperative can refuse the new clients. The cooperative then loses the contract corridor. Longer lives outlast the backs that carry the clients if the cooperative keeps the new clients.\n\n## Your job\n\nProtect dawn care so added years do not break the workers who lift the clients.",
      stakeholder: "Home-care workers cooperative steward",
      crisisMeters: { local: { label: "Body strain", description: "Rosa's right shoulder burns from last week's lifts on this corridor." }, global: { label: "Shift load", description: "The dawn sheet grows from ten names to twelve names. Two new intakes land on the same corridor today." }, support: { label: "Worker gaps", description: "A coworker has a separate list in the stairwell. A med pass can slip before noon." } },
      suggested: ["ai", "robots", "iot", "networks", "transportation", "print3d"],
      suggestedWhy: {
        "ai": "AI can mark a med-pass risk before noon on this corridor.",
        "robots": "Robots can share the hoist so one shoulder does not take every lift.",
        "iot": "IoT can show two new intakes on the route sheet the same morning.",
        "networks": "Networks can send the hospital discharge to the co-op board at dawn.",
        "transportation": "Transportation can time the dialysis move after a safe chair transfer.",
        "print3d": "Print3d can make a fit aid for the chair transfer on this corridor.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Brickfields Elder Yards"],
      title: "Kilns that outlast bones",
      summary: "Kamal crouches to check the wet molds before the sun clears the shed roof. His knees crack on the way down. Piece rates count only bricks that the workers stack and stamp before noon. Younger haulers left for warehouse shifts. He can push the pace or lose the wage for his mother's medicine.",
      scene:
        "Kamal crouches to check the wet molds before the sun clears the shed roof at the Brickfields Elder Yards. He is fifty-eight. His knees crack on the way down. The kiln boss wants another firing before noon.\n\nPiece rates count only finished bricks that the workers stack and stamp. Younger haulers left for warehouse shifts across the ring road. The yard still runs the same stoop, twist, and haul cycle. That cycle wore out Kamal's father.\n\nHeat rolls off the open mouth of the kiln. By midmorning his wrists swell. The tally man marks a short load. Ice packs sit in the health shed beside a posture poster. The workers do not read the poster.\n\nThe line treats ageing muscle as a private failure. The line does not treat ageing muscle as a design input. Kamal can push the pace and risk a fall into the clay trench. Or Kamal steps off the line and loses the wage. The wage still covers his mother's medicine.",
      briefMd:
        "## The place\n\nKamal crouches to check the wet molds before the sun clears the shed roof at the Brickfields Elder Yards. He is fifty-eight. His knees crack on the way down. The kiln boss wants another firing before noon.\n\nPiece rates count only finished bricks that the workers stack and stamp. Younger haulers left for warehouse shifts across the ring road. The yard still runs the same stoop, twist, and haul cycle. That cycle wore out Kamal's father.\n\nHeat rolls off the open mouth of the kiln. By midmorning his wrists swell. The tally man marks a short load. Ice packs sit in the health shed beside a posture poster. The workers do not read the poster.\n\n## The bigger problem\n\nThe line treats ageing muscle as a private failure. The line does not treat ageing muscle as a design input. Kamal can push the pace. A fall into the clay trench is then a risk. A step off the line loses the wage that covers his mother's medicine.\n\n## Your job\n\nKeep yard wages and joints safe when the kilns outlast the workers.",
      stakeholder: "Yard occupational health lead",
      crisisMeters: { local: { label: "Joint pain", description: "Kamal's knees crack when he crouches at the wet molds. His wrists swell by midmorning." }, global: { label: "Kiln heat", description: "Heat rolls from the open kiln mouth before the noon firing." }, support: { label: "Lost wages", description: "A short load mark cuts the wage that covers his mother's medicine." } },
      suggested: ["materials", "robots", "iot", "ai", "solar", "battery"],
      suggestedWhy: {
        "materials": "Materials can cut heat and weight in the stoop, twist, and haul cycle.",
        "robots": "Robots can haul bricks so Kamal does not push a fall pace.",
        "iot": "IoT can show wrist swell and kiln heat before the tally mark.",
        "ai": "AI can set a pace that counts a safe load, not only a fast stack.",
        "solar": "Solar can cut kiln heat load before the noon firing.",
        "battery": "A battery can run a cool pack in the health shed through midmorning.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Sunstack Senior Towers"],
      title: "Upper floors without cool air",
      summary: "Mei rides the slow elevator to the twenty-third floor with frozen bottles in a towel. The upper corridor holds yesterday's heat. Mr. Ruiz slept in the chair because the bedroom felt like a closed oven. Bills climb on fixed pensions. Neighbors shut the units after the second notice. The neighbors wait for evening.",
      scene:
        "Mei rides the slow elevator to the twenty-third floor of Sunstack Senior Towers with frozen bottles in a towel. The upper corridor holds yesterday's heat. Mr. Ruiz left his door on the latch. He slept in the chair by the window. The bedroom felt like a closed oven.\n\nThe chillers of the building shed load when the peak tariff hits. Management meters common cooling by the riser. Bills climb on fixed pensions. Many tenants shut the window units after the second notice. The tenants wait for evening.\n\nMei knocks on three doors every afternoon. Two doors stay quiet until she knocks harder. Alone hours grow with the heat.\n\nThe tenant association can fight for a backup plant. That plant still serves the top floors last. Neighbors can choose grocery money over one cool hour.",
      briefMd:
        "## The place\n\nMei rides the slow elevator to the twenty-third floor of Sunstack Senior Towers. She carries frozen bottles in a towel. The upper corridor holds yesterday's heat. Mr. Ruiz left his door on the latch. He slept in the chair by the window. The bedroom felt like a closed oven.\n\nThe chillers of the building shed load when the peak tariff hits. Management meters common cooling by the riser. Bills climb on fixed pensions. Many tenants shut the window units after the second notice. The tenants wait for evening.\n\n## The bigger problem\n\nMei knocks on three doors every afternoon. Two doors stay quiet until she knocks harder. Alone hours grow with the heat. The tenant association can fight for a backup plant. That plant still serves the top floors last. Neighbors can choose grocery money over one cool hour.\n\n## Your job\n\nKeep the top floors cool and checked when pensions cannot pay the peak tariff.",
      stakeholder: "Tenant association chair",
      crisisMeters: { local: { label: "Heat stress", description: "The upper corridor holds yesterday's heat. Mr. Ruiz slept in the chair because the bedroom felt like a closed oven." }, global: { label: "Power bills", description: "Bills climb on fixed pensions after the peak tariff. Tenants shut window units after the second notice." }, support: { label: "Alone hours", description: "Mei knocks on three doors, and two doors stay quiet. Alone hours grow with the afternoon heat." } },
      suggested: ["solar", "battery", "iot", "ai", "networks", "materials"],
      suggestedWhy: {
        "solar": "Solar can feed cool air on the top floors when the peak tariff hits.",
        "battery": "A battery can hold cool air after the chillers shed load.",
        "iot": "IoT can show a quiet door and heat on the twenty-third floor.",
        "ai": "AI can rank doors that stay quiet in the afternoon heat.",
        "networks": "Networks can link a tenant check to the chair by the window.",
        "materials": "Materials can slow stored heat in the upper corridor.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["River Gate Wholesale Market"],
      title: "Dawn stalls without successors",
      summary: "Lata unlocks her stall at River Gate and hauls the first crate of bitter gourd onto the wet concrete. The auction bell rings in forty minutes. Buyers respect only stacks that look full and early. A fall last month cost her two market days. The guild list of young hands is empty.",
      scene:
        "Before first light Lata unlocks her stall at River Gate Wholesale Market. She hauls the first crate of bitter gourd onto the wet concrete. She is sixty-one. Her hip catches on the twist. The auction bell rings in forty minutes. Buyers respect only stacks that look full and early.\n\nHer nephew took a delivery-app job across town. The guild list of young hands is empty this season. Market rules still favor the vendor who stands from 3 a.m. That vendor lifts without help.\n\nThat pattern built these stalls. At this time the stalls have no successors. A fall last month cost Lata two market days. The fall also cost a week of pain. She did not write the pain down.\n\nThin help leaves two hard choices. She can slow the work and lose the regular chefs. Or she keeps the dawn grind until the next slip.",
      briefMd:
        "## The place\n\nBefore first light Lata unlocks her stall at River Gate Wholesale Market. She hauls the first crate of bitter gourd onto the wet concrete. She is sixty-one. Her hip catches on the twist. The auction bell rings in forty minutes. Buyers respect only stacks that look full and early.\n\nHer nephew took a delivery-app job across town. The guild list of young hands is empty this season. Market rules still favor the vendor who stands from 3 a.m. That vendor lifts without help. That pattern built these stalls. At this time the stalls have no successors.\n\n## The bigger problem\n\nA fall last month cost Lata two market days. The fall also cost a week of pain. She did not write the pain down. Thin help leaves two hard choices. She can slow the work and lose the regular chefs. Or she keeps the dawn grind until the next slip.\n\n## Your job\n\nKeep the dawn stall open without the next fall or a lost chef route.",
      stakeholder: "Market vendors guild secretary",
      crisisMeters: { local: { label: "Falls", description: "Lata's hip catches on the twist at the stall. A fall last month took two market days and a week of pain." }, global: { label: "Dawn grind", description: "The auction bell rings in forty minutes. Buyers respect only a full early stack from 3 a.m." }, support: { label: "Thin help", description: "The guild list of young hands is empty this season. Her nephew took a delivery-app job across town." } },
      suggested: ["robots", "iot", "ai", "print3d", "transportation", "gene-sequencing"],
      suggestedWhy: {
        "robots": "Robots can lift the bitter-gourd crate onto the wet concrete.",
        "iot": "IoT can warn of a hip catch before the auction bell.",
        "ai": "AI can plan a full early stack without a faster twist.",
        "print3d": "Print3d can make a stall aid that fits a sixty-one-year-old hip.",
        "transportation": "Transportation can move crates so Lata does not haul every dawn load.",
        "gene-sequencing": "Gene-sequencing can show how dawn lifts wear a vendor body over years.",
      },
      visionTheme: "food-city",
    }
  ],

  water: [
    {
      places: ["Canal Ward"],
      title: "Standpipes sputter brown in Canal Ward",
      summary: "Mira opens the standpipe at first light in Canal Ward. The water comes the color of weak tea. The water does not clear. The nephew of Mira misses school again with stomach cramps.",
      scene:
        "Mira opens the standpipe at first light in Canal Ward. The water comes the color of weak tea. Children hold plastic jugs in a crooked line. Mira lets the first rush run into the gutter. Then Mira fills a clear bottle and holds the bottle to the sky. The cloud in the bottle does not clear.\n\nBy midmorning the pressure drops to a trickle. A contractor pump two blocks over feeds a new mid-rise shell. Workers laid the main for a smaller load. In every dry season, builders tap the upstream water first. Repair crews log the leaks. Then the crews wait on parts in a yard across town.\n\nThe nephew of Mira misses school again with stomach cramps. Mira keeps a chalk tally on the committee board. The tally shows sick days, broken joints, and days after the last flush. The board does not move the valve schedule.",
      briefMd:
        "## The place\nMira opens the standpipe at first light in Canal Ward. The water comes the color of weak tea. Children hold plastic jugs in a crooked line. Mira lets the first rush run into the gutter. Then Mira fills a clear bottle and holds the bottle to the sky. The cloud in the bottle does not clear.\n\nBy midmorning the pressure drops to a trickle. The nephew of Mira misses school again with stomach cramps. Mira keeps a chalk tally on the committee board. The tally shows sick days, broken joints, and days after the last flush. The board does not move the valve schedule.\n\n## The bigger problem\nA contractor pump two blocks over feeds a new mid-rise shell. Workers laid the main for a smaller load. In every dry season, builders tap the upstream water first. Repair crews log the leaks. Then the crews wait on parts in a yard across town.\n\n## Your job\nPut clear water in the Canal Ward jugs before the mid-rise shell takes the flow.",
      stakeholder: "Mira, standpipe committee lead",
      crisisMeters: { local: { label: "Sick Days", description: "Sick days rise while standpipe water stays the color of weak tea." }, global: { label: "Pipe Failures", description: "The ward main fails under a load from the new mid-rise shell." }, support: { label: "Repair Delay", description: "Repair crews wait on parts in a yard across town." } },
      suggested: ["iot", "materials", "nano", "ai", "solar", "battery", "networks", "robots"],
      suggestedWhy: {
        "iot": "Sensors can show Mira when standpipe water stays the color of weak tea.",
        "materials": "Pipe material can slow leaks on the Canal Ward main.",
        "nano": "Fine filters can cut the cloud in Canal Ward standpipe water.",
        "ai": "A schedule tool can flag dry-season valve cuts in Canal Ward.",
        "solar": "Solar power can run a standpipe meter when main pressure drops.",
        "battery": "A battery can keep a standpipe meter on after pressure drops.",
        "networks": "A data network can carry leak logs from Canal Ward to the parts yard.",
        "robots": "A robot can check broken joints on the Canal Ward main.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Paddy Step Wells"],
      title: "Green film coats the Paddy Step Wells",
      summary: "Sita kneels on the third step at the Paddy Step Wells. Sita skims a green film into a tin cup. Algae clings to the rim of the cup. A child of a neighbor is home with diarrhea.",
      scene:
        "Sita kneels on the third step at the Paddy Step Wells. Sita skims a green film into a tin cup. The well for the lower paddies smells sweet and wrong. Sita tips the cup. Algae clings to the rim of the cup.\n\nUpstream growers opened the fertilizer bags early after a short rain. Runoff entered the old stone channels before the soil holds the runoff. The wells are shared. The field calendar is not shared. Each keeper guards a turn at the sluice.\n\nBy noon a child of a neighbor is home with diarrhea. The phone of Sita fills with messages about the dirty steps. No keeper wants to cut the next nitrogen pass. The crop must pay the loan.",
      briefMd:
        "## The place\nSita kneels on the third step at the Paddy Step Wells. Sita skims a green film into a tin cup. The well for the lower paddies smells sweet and wrong. Sita tips the cup. Algae clings to the rim of the cup.\n\nBy noon a child of a neighbor is home with diarrhea. The phone of Sita fills with messages about the dirty steps. No keeper wants to cut the next nitrogen pass. The crop must pay the loan.\n\n## The bigger problem\nUpstream growers opened the fertilizer bags early after a short rain. Runoff entered the old stone channels before the soil holds the runoff. The wells are shared. The field calendar is not shared. Each keeper guards a turn at the sluice.\n\n## Your job\nKeep the Paddy Step Wells drinkable while the water feeds the grain.",
      stakeholder: "Sita, growers’ water keeper",
      crisisMeters: { local: { label: "Tummy Bugs", description: "Diarrhea sends a neighbor child home after the well smells wrong." }, global: { label: "Field Runoff", description: "Fertilizer runoff enters the stone channels after a short rain." }, support: { label: "Well Fights", description: "Keepers guard sluice turns and send blame for the dirty steps." } },
      suggested: ["iot", "drones", "ai", "materials", "nano", "solar", "gene-sequencing", "space"],
      suggestedWhy: {
        "iot": "Sensors can warn Sita when the well film turns green.",
        "drones": "A drone can show fertilizer runoff in the old stone channels.",
        "ai": "A calendar tool can show sluice turns that clash at the wells.",
        "materials": "Channel liners can slow fertilizer runoff into the stone wells.",
        "nano": "A fine filter can cut algae before well water leaves the steps.",
        "solar": "Solar power can run a well sensor through the field day.",
        "gene-sequencing": "Gene tests can name the algae that cling to the tin cup.",
        "space": "Orbital images can show the short rain over the upper fields.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Night Clinic Bore"],
      title: "Boil orders never lift at Night Clinic Bore",
      summary: "Dr. Elias scrubs for a late suture at Night Clinic Bore. The tap coughs air. The boil order on the wall is three weeks old. A mother on the bench pays for sealed jugs. The mother cannot afford the jugs.",
      scene:
        "Dr. Elias scrubs for a late suture at Night Clinic Bore. The tap coughs air before the tap spits. The boil order on the wall is three weeks old. Dr. Elias uses bottled water to rinse instruments after the sterilizer cycle.\n\nThe bore sits twenty meters from a cracked septic line. The landlord will not open the septic line. After heavy rain the lab strips show coliform spikes. Patients arrive with wounds. The wounds cannot wait for a clean truck.\n\nA mother on the bench pays for two crates of sealed jugs. The mother cannot afford the jugs. Dr. Elias charts a ward infection. Dr. Elias cannot prove the tap as the source of the infection. The pattern returns every wet week.",
      briefMd:
        "## The place\nDr. Elias scrubs for a late suture at Night Clinic Bore. The tap coughs air before the tap spits. The boil order on the wall is three weeks old. Dr. Elias uses bottled water to rinse instruments after the sterilizer cycle.\n\nA mother on the bench pays for two crates of sealed jugs. The mother cannot afford the jugs. Dr. Elias charts a ward infection. Dr. Elias cannot prove the tap as the source of the infection. The pattern returns every wet week.\n\n## The bigger problem\nThe bore sits twenty meters from a cracked septic line. The landlord will not open the septic line. After heavy rain the lab strips show coliform spikes. Patients arrive with wounds. The wounds cannot wait for a clean truck.\n\n## Your job\nGive Night Clinic Bore tap water that does not force a boil order.",
      stakeholder: "Dr. Elias, night-shift clinician",
      crisisMeters: { local: { label: "Ward Infections", description: "Ward infections return every wet week while the boil order stays up." }, global: { label: "Septic Seep", description: "Coliform spikes follow heavy rain near the cracked septic line." }, support: { label: "Bottle Bills", description: "A mother pays for sealed jugs that the mother cannot afford." } },
      suggested: ["iot", "materials", "nano", "solar", "battery", "robots", "ai", "gene-sequencing"],
      suggestedWhy: {
        "iot": "Sensors can show coliform spikes at Night Clinic Bore after rain.",
        "materials": "Pipe seals can slow seepage from the cracked septic line.",
        "nano": "A fine filter can cut coliform in water at the clinic tap.",
        "solar": "Solar power can run the clinic tap meter through the night shift.",
        "battery": "A battery can keep clinic water meters on through the night shift.",
        "robots": "A robot can inspect the septic line that the landlord will not open.",
        "ai": "A chart tool can mark wet-week infection patterns at the clinic.",
        "gene-sequencing": "Gene tests can name microbes in the clinic tap after heavy rain.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Guest Pier"],
      title: "Guest pools win, alley taps lose at Guest Pier",
      summary: "Noor climbs the cistern ladder before sunrise at Guest Pier. The tank wall sounds hollow. A hotel fountain still runs. The cousin of Noor waits two hours. Then the cousin pays by the liter.",
      scene:
        "Noor climbs the cistern ladder before sunrise at Guest Pier. Noor knocks the tank wall. The echo is hollow. Neighbors in the alley set buckets under a dry tap. A hotel fountain across the seawall runs for empty lounge chairs.\n\nThe wells of the pier answer the guest meters first. Contracts guarantee pressure to the pools and the laundry towers. When the aquifer drops, operators valve the alley line down with no public notice. The logbook of Noor shows this cut in every high season.\n\nThe cousin of Noor waits two hours for a jerry can. Then the cousin walks to a kiosk. The kiosk charges by the liter. Thirst becomes a line and a fee. Hotels post full occupancy.",
      briefMd:
        "## The place\nNoor climbs the cistern ladder before sunrise at Guest Pier. Noor knocks the tank wall. The echo is hollow. Neighbors in the alley set buckets under a dry tap. A hotel fountain across the seawall runs for empty lounge chairs.\n\nThe cousin of Noor waits two hours for a jerry can. Then the cousin walks to a kiosk. The kiosk charges by the liter. Thirst becomes a line and a fee. Hotels post full occupancy.\n\n## The bigger problem\nThe wells of the pier answer the guest meters first. Contracts guarantee pressure to the pools and the laundry towers. When the aquifer drops, operators valve the alley line down with no public notice. The logbook of Noor shows this cut in every high season.\n\n## Your job\nSet a fair water share for the alley taps and the hotel pools.",
      stakeholder: "Noor, alley cistern steward",
      crisisMeters: { local: { label: "Thirst Lines", description: "Thirst lines grow while the alley tap stays dry." }, global: { label: "Well Overdraw", description: "Guest meters draw the pier aquifer down in the high season." }, support: { label: "Guest Priority", description: "Contracts give pool pressure first and cut the alley with no notice." } },
      suggested: ["iot", "solar", "battery", "materials", "nano", "ai", "tidal", "networks"],
      suggestedWhy: {
        "iot": "Meters can show when operators valve the alley line down.",
        "solar": "Solar power can run alley meters when hotel fountains still run.",
        "battery": "A battery can keep an alley meter on through the high season.",
        "materials": "Tank liners can slow loss from the hollow cistern at Guest Pier.",
        "nano": "A fine filter can clean alley tap water at Guest Pier.",
        "ai": "A share tool can flag guest-meter priority when the aquifer drops.",
        "tidal": "Tidal power can add flow when the pier aquifer drops.",
        "networks": "A notice network can post each alley cut at Guest Pier.",
      },
      visionTheme: "coastal-city",
    }
  ],

  air: [
    {
      places: ["Tidegate Fishing Quays"],
      title: "Bunker smoke on wash day",
      summary: "Nurse Amara hangs the clinic linen on the quay line at first light. Bunker smoke from the reefer ship at Berth 4 films the sheets before the sheets dry. Children from the fisher co-op cough into their sleeves on the walk to school.",
      scene:
        "Nurse Amara hangs the clinic linen on the quay line at Tidegate Fishing Quays at first light. A salt wind does not clear the cloth. The bunker plume from a reefer ship at Berth 4 lays a gray film on the sheets before the sheets dry.\n\nChildren from the fisher co-op rub their eyes on the way to school. The children cough into their sleeves. The peak hour at the dock clinic starts early on wash day. Amara wipes grit from the lashes of a toddler. Amara marks another red eye in the log.\n\nThe port sells cheap residual fuel to vessels. The vessels idle cold storage while the vessels wait for ice and buyers. Shore power exists on paper at the new pier. The older berths meter only light loads. Captains run auxiliary stacks through the morning auction.\n\nThe ships are necessary for the co-op. Cold holds are necessary for the ships. The air on wash day harms the same bodies.",
      briefMd:
        "## The place\nNurse Amara hangs the clinic linen on the quay line at Tidegate Fishing Quays at first light. A salt wind does not clear the cloth. The bunker plume from a reefer ship at Berth 4 lays a gray film on the sheets before the sheets dry.\n\nChildren from the fisher co-op rub their eyes on the way to school. The children cough into their sleeves. The peak hour at the dock clinic starts early on wash day. Amara wipes grit from the lashes of a toddler. Amara marks another red eye in the log.\n\nThe port sells cheap residual fuel to vessels. The vessels idle cold storage while the vessels wait for ice and buyers. Shore power exists on paper at the new pier. The older berths meter only light loads. Captains run auxiliary stacks through the morning auction.\n\n## The bigger problem\nThe ships are necessary for the co-op. Cold holds are necessary for the ships. Weak berth power and residual fuel cause the bunker smoke. The air on wash day harms the same bodies.\n\n## Your job\nKeep the catch cold without bunker smoke on wash day at the quay.",
      stakeholder: "Dock clinic nurses and fisher-family co-op",
      crisisMeters: { local: { label: "Burning eyes", description: "Children rub sore eyes on the way to school. Amara logs another red eye on wash day at the dock clinic." }, global: { label: "Ship smoke", description: "Bunker smoke from the reefer ship at Berth 4 lays a gray film on clinic linen." }, support: { label: "Berth power", description: "Older berths meter only light loads. Captains run auxiliary stacks through the morning auction." } },
      suggested: ["iot", "ai", "solar", "battery", "energy", "networks", "materials", "drones"],
      suggestedWhy: {
        "iot": "Sensors can show bunker smoke at Berth 4 before the gray film hits clinic linen.",
        "ai": "A planning aid can time cold holds so captains do not run stacks at the auction.",
        "solar": "Sun power can feed cold holds when older berths meter only light loads.",
        "battery": "Stored power can hold cold cargo while vessels wait for ice and buyers.",
        "energy": "Cleaner energy can replace residual fuel during the morning auction.",
        "networks": "A quay link can share berth load data with the dock clinic and the co-op.",
        "materials": "A wash cloth can block grit when bunker smoke crosses the quay line.",
        "drones": "A small craft can map the plume from Berth 4 over the wash line.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Ring Road School Corridor"],
      title: "Recess under the flyover",
      summary: "Coach Rina blows the whistle for outdoor stretch under the flyover. Diesel from the ring-road climb hits the fence line in waves. Two students sit out with tight chests before the second lap.",
      scene:
        "Coach Rina blows the whistle for outdoor stretch under the flyover at Ring Road School Corridor. The yard is the only shade at noon. Diesel from the ring-road climb hits the fence line in waves. Two students sit out with tight chests before the second lap.\n\nThe parent-teacher air watch pins a cheap sensor to the back gate. The number jumps each time a loaded truck downshifts on the grade. Bus crews idle at the gate for pickup. The buses add a plume to the recess air.\n\nFleet rules push heavy goods through this corridor at school hours. The bypass toll is higher. Dispatchers choose the old climb to save a turn. Rina moves practice behind the library wall. Rain turns the strip to mud. Rina loses the space.\n\nOne more week of spikes will cause the watch to cancel outdoor games for the term. A child sits with an inhaler in a stairwell. The run is necessary for the child.",
      briefMd:
        "## The place\nCoach Rina blows the whistle for outdoor stretch under the flyover at Ring Road School Corridor. The yard is the only shade at noon. Diesel from the ring-road climb hits the fence line in waves. Two students sit out with tight chests before the second lap.\n\nThe parent-teacher air watch pins a cheap sensor to the back gate. The number jumps each time a loaded truck downshifts on the grade. Bus crews idle at the gate for pickup. The buses add a plume to the recess air.\n\nRina moves practice behind the library wall. Rain turns the strip to mud. Rina loses the space. A child sits with an inhaler in a stairwell. The run is necessary for the child.\n\n## The bigger problem\nFleet rules push heavy goods through this corridor at school hours. The bypass toll is higher. Dispatchers choose the old climb to save a turn. One more week of spikes will cause the watch to cancel outdoor games for the term.\n\n## Your job\nMake recess air free of truck exhaust without a choice of heat or mud.",
      stakeholder: "Parent-teacher air watch and corridor bus crews",
      crisisMeters: { local: { label: "Sick days", description: "Two students sit out with tight chests before the second lap. A child sits with an inhaler in a stairwell." }, global: { label: "Truck exhaust", description: "Diesel from the ring-road climb hits the fence line in waves at noon recess." }, support: { label: "Fleet rules", description: "Fleet rules push heavy goods through the corridor at school hours because the bypass toll is higher." } },
      suggested: ["transportation", "iot", "ai", "battery", "solar", "networks", "computing", "drones"],
      suggestedWhy: {
        "transportation": "A cleaner fleet path can move heavy goods off the school climb at recess.",
        "iot": "A gate sensor can show diesel spikes when a truck downshifts on the grade.",
        "ai": "A timing aid can shift truck climbs away from outdoor stretch at noon.",
        "battery": "Stored power can cut bus idle at the gate during student pickup.",
        "solar": "Sun power can run gate loads so bus crews do not idle for pickup.",
        "networks": "A corridor link can share spike data with bus crews and the air watch.",
        "computing": "A simple model can forecast fence-line diesel before the second lap.",
        "drones": "A small craft can map exhaust waves along the flyover at noon.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Canal-Side Scrap Lanes"],
      title: "Evening fires in the lane",
      summary: "Meena sorts copper from plastic sheathing on a tarp in the canal-side scrap lanes. Evening drums burn goods that the licensed tip turns away after dark. The baby of the neighbor wakes with a dry cough.",
      scene:
        "Meena sorts copper from plastic sheathing on a tarp at Canal-Side Scrap Lanes. The baby of the neighbor wakes with a dry cough. Evening is burn time in the lanes. Goods with no sale by weight go into drums when dump fees climb. The licensed tip turns loads away after dark.\n\nThe cooperative tried a shared cart to the far transfer station. The cart waits on parts. The fee window closes before the last haul. Midwives on the block wipe grit from infant noses. The midwives count nights when the lane smells like melted wire.\n\nLandlords padlock the empty lot. The lot held sorted bales before. Fire burns the unsold scrap. Meena covers the face of the baby with a damp cloth. Meena strips cable because dawn buyers pay cash.",
      briefMd:
        "## The place\nMeena sorts copper from plastic sheathing on a tarp at Canal-Side Scrap Lanes. The baby of the neighbor wakes with a dry cough. Evening is burn time in the lanes. Goods with no sale by weight go into drums when dump fees climb. The licensed tip turns loads away after dark.\n\nThe cooperative tried a shared cart to the far transfer station. The cart waits on parts. The fee window closes before the last haul. Midwives on the block wipe grit from infant noses. The midwives count nights when the lane smells like melted wire.\n\nMeena covers the face of the baby with a damp cloth. Meena strips cable because dawn buyers pay cash. Landlords padlock the empty lot. The lot held sorted bales before. Fire burns the unsold scrap.\n\n## The bigger problem\nMetal cash by morning is necessary for the pickers. Dump fees and a closed tip push unsold scrap into evening drums. The burn fills supper air with smoke. Infants on the block cough in that air.\n\n## Your job\nPay the lane for scrap without smoke in the supper air.",
      stakeholder: "Waste-picker cooperative and community midwives",
      crisisMeters: { local: { label: "Baby cough", description: "The baby of the neighbor wakes with a dry cough. Midwives wipe grit from infant noses after evening burns." }, global: { label: "Waste fires", description: "Evening drums burn unsold scrap when the licensed tip turns loads away after dark." }, support: { label: "Dump fees", description: "Dump fees climb. The fee window closes before the last haul on the shared cart." } },
      suggested: ["materials", "iot", "ai", "solar", "battery", "robots", "print3d", "networks"],
      suggestedWhy: {
        "materials": "A sort path can pay for copper and plastic without a drum fire at dusk.",
        "iot": "A lane sensor can show burn smoke when the tip turns loads away after dark.",
        "ai": "A haul aid can time the shared cart before the fee window closes.",
        "solar": "Sun power can run a small sort line so pickers do not burn unsold scrap.",
        "battery": "Stored power can run the cart when parts delay the last haul.",
        "robots": "A sort arm can separate copper from sheathing without an evening drum.",
        "print3d": "A small printer can turn scrap plastic into a sale item before dusk.",
        "networks": "A lane link can match dawn buyers with sorted bales before a burn.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Riverside Dye Cluster"],
      title: "Colored fog at shift change",
      summary: "Auntie Kamala meets the garment line at the alley tap with wet towels. The boilers of the dye cluster vent a colored fog that hangs low when the river breeze dies. Workers taste metal on the walk home and put a fist on the chest.",
      scene:
        "At shift change, boarding-house auntie Kamala meets the garment line at the alley tap with wet towels for faces. The small boilers of Riverside Dye Cluster vent a colored fog. The fog hangs low when the river breeze dies. Workers taste metal on the walk home. Workers put a fist on the chest before supper.\n\nThe health circle logs chest pain on piece-rate weeks. Shops fire extra batches to hit export cutoffs. The shops skip the slower clean burn. Owners say scrubbers stall the drum cycle. Buyers pay by the finished kilo. Buyers do not pay for a dirty stack hour.\n\nKamala boils ginger for the women who wheeze on the stairs. Kamala holds a spare cot for a woman who cannot climb. One young cutter misses a morning. The cutter loses the lot of sleeves. The fog returns with the next rush order.",
      briefMd:
        "## The place\nAt shift change, boarding-house auntie Kamala meets the garment line at the alley tap with wet towels for faces. The small boilers of Riverside Dye Cluster vent a colored fog. The fog hangs low when the river breeze dies. Workers taste metal on the walk home. Workers put a fist on the chest before supper.\n\nThe health circle logs chest pain on piece-rate weeks. Shops fire extra batches to hit export cutoffs. The shops skip the slower clean burn. Owners say scrubbers stall the drum cycle. Buyers pay by the finished kilo. Buyers do not pay for a dirty stack hour.\n\nKamala boils ginger for the women who wheeze on the stairs. Kamala holds a spare cot for a woman who cannot climb. One young cutter misses a morning. The cutter loses the lot of sleeves. The fog returns with the next rush order.\n\n## The bigger problem\nPiece rates push shops to fire extra batches and to skip a clean burn. Buyers pay by the finished kilo. The colored fog returns at each rush order. Women in the boarding house wheeze on the stairs.\n\n## Your job\nPut color in the cloth without colored fog in the alley at shift change.",
      stakeholder: "Garment workers’ health circle and boarding-house aunties",
      crisisMeters: { local: { label: "Chest pain", description: "Workers taste metal on the walk home and put a fist on the chest. The health circle logs chest pain on piece-rate weeks." }, global: { label: "Boiler smoke", description: "Small boilers vent a colored fog that hangs low when the river breeze dies." }, support: { label: "Piece rates", description: "Piece rates push extra batches. Buyers pay by the finished kilo and do not pay for a clean stack hour." } },
      suggested: ["energy", "solar", "battery", "iot", "ai", "materials", "nano", "networks"],
      suggestedWhy: {
        "energy": "Cleaner heat can color cloth without a low fog at shift change.",
        "solar": "Sun heat can run dye drums when the river breeze dies.",
        "battery": "Stored power can hold drum heat so shops skip a dirty stack.",
        "iot": "A stack sensor can log dirty hours on piece-rate weeks.",
        "ai": "A batch aid can hit export cutoffs without an extra dirty burn.",
        "materials": "A stack cloth can cut colored fog before the fog enters the alley.",
        "nano": "A fine coat can trap metal mist from small dye boilers.",
        "networks": "A shop link can share chest-pain logs with the health circle.",
      },
      visionTheme: "care-city",
    }
  ],

  "energy-access": [
    {
      places: ["Ulaanbaatar Ger District Lanes"],
      title: "Coal smoke fills the gap the grid left",
      summary: "Bayarmaa feeds another brick of raw coal into the stove in her felt ger. Smoke slides under the door flap into the frozen lane. Her youngest child starts a dry cough that started in November.",
      scene:
        "Before dawn, Bayarmaa lifts the stove lid in her felt ger. She feeds another brick of raw coal. The flame catches. Smoke slides under the door flap into the frozen lane. Her youngest child starts a dry cough. The cough started in November.\n\nA hundred other stoves on the dirt tracks burn raw coal at the same hour. The central grid stops at the paved edge of the formal city. Plot papers in the lane are temporary. As a result, the utility will not string legal lines. Coal trucks roll in on credit from the depot. The depot supplies the power plants.\n\nFamilies buy fuel that burns. Families do not buy clean fuel. Bayarmaa keeps the lane health notebook. She marks a nosebleed, a missed school morning, and a father with a tight chest. The father cannot climb the construction scaffold. The volunteer kit has masks and saline.\n\nThe volunteer kit does not have watts. Winter moves faster than the wires. Coal heat warms the floor and harms the lungs of the child.",
      briefMd:
        "## The place\n\nBefore dawn, Bayarmaa lifts the stove lid in her felt ger. She feeds another brick of raw coal. The flame catches. Smoke slides under the door flap into the frozen lane. Her youngest child starts a dry cough. The cough started in November.\n\nA hundred other stoves on the dirt tracks burn raw coal at the same hour. Bayarmaa keeps the lane health notebook. She marks a nosebleed, a missed school morning, and a father with a tight chest. The father cannot climb the construction scaffold. The volunteer kit has masks and saline. The volunteer kit does not have watts.\n\n## The bigger problem\n\nThe central grid stops at the paved edge of the formal city. Plot papers in the lane are temporary. As a result, the utility will not string legal lines. Coal trucks roll in on credit from the depot. The depot supplies the power plants.\n\nFamilies buy fuel that burns. Families do not buy clean fuel. Winter moves faster than the wires. Coal heat warms the floor and harms the lungs of the child.\n\n## Your job\n\nGive the ger lane winter heat without coal smoke in the lungs of a child.",
      stakeholder: "Ger district health volunteer lead",
      crisisMeters: { local: { label: "Cough nights", description: "Cough nights keep the youngest child awake after raw coal smoke enters the ger." }, global: { label: "Coal smoke", description: "Coal smoke from a hundred stoves fills the frozen lane at the same hour." }, support: { label: "Plot rights", description: "Temporary plot papers stop legal lines from the utility at the paved edge." } },
      suggested: ["solar", "battery", "iot", "networks", "ai", "materials"],
      suggestedWhy: {
        "solar": "Solar can heat a felt ger when the grid stops at the paved edge.",
        "battery": "A battery can hold night power when the lane has no legal lines.",
        "iot": "Iot can record smoke and cough nights in the lane health notebook.",
        "networks": "Networks can share health notes along the dirt tracks at the same hour.",
        "ai": "Ai can flag a tight chest in the lane notebook before scaffold work.",
        "materials": "Materials can hold heat in a felt ger with less raw coal.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Camotes Island Rice Co-op Wharf"],
      title: "Harvest waits while the genset coughs",
      summary: "Rosa counts the sacks under the wharf awning. The dryer drum stops mid-turn on grain that is still damp from the paddies. By tomorrow the smell will turn. Each spoiled sack is a school fee unpaid.",
      scene:
        "Rosa counts the sacks under the wharf awning. She listens for the genset. The genset coughs, catches, and then dies. The dryer drum stops mid-turn. Grain from the paddies at dawn sits damp in the coastal heat. By tomorrow the smell will turn.\n\nThe co-op diesel allotment arrived short this month. The barge schedule slipped. The town pump took the first claim on the fuel that remains. Members pay school fees from the milled weight. Each spoiled sack is a school fee unpaid.\n\nRosa walks the line of farmers. She writes numbers that she does not want to keep. The island grid flickers too often for the dryer on mains power. The co-op rents a machine. The machine runs only when the fuel drum has fuel. Farmers wait on combustion that they do not control.",
      briefMd:
        "## The place\n\nRosa counts the sacks under the wharf awning. She listens for the genset. The genset coughs, catches, and then dies. The dryer drum stops mid-turn. Grain from the paddies at dawn sits damp in the coastal heat. By tomorrow the smell will turn.\n\nRosa walks the line of farmers. She writes numbers that she does not want to keep. Members pay school fees from the milled weight. Each spoiled sack is a school fee unpaid.\n\n## The bigger problem\n\nThe co-op diesel allotment arrived short this month. The barge schedule slipped. The town pump took the first claim on the fuel that remains. The island grid flickers too often for the dryer on mains power. The co-op rents a machine. The machine runs only when the fuel drum has fuel.\n\nFarmers wait on combustion that they do not control.\n\n## Your job\n\nKeep the harvest grain dry so members can pay school fees.",
      stakeholder: "Rice co-op chair",
      crisisMeters: { local: { label: "Spoiled grain", description: "Spoiled grain under the awning loses milled weight when the dryer drum stops." }, global: { label: "Diesel waits", description: "Diesel waits on a late barge after the town pump takes the first claim." }, support: { label: "School fees", description: "School fees fail when a spoiled sack cuts the milled weight for members." } },
      suggested: ["solar", "battery", "wind", "iot", "networks", "energy"],
      suggestedWhy: {
        "solar": "Solar can run the dryer when the island grid flickers too often.",
        "battery": "A battery can turn the dryer drum after the genset dies.",
        "wind": "Wind can power the wharf dryer when the diesel allotment is short.",
        "iot": "Iot can show grain moisture under the awning before the smell turns.",
        "networks": "Networks can link the dryer to power that remains on the island.",
        "energy": "Stored energy can run the dryer between late barge trips.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Humla Trailhead Health Post"],
      title: "The sterilizer sleeps through the night shift",
      summary: "Dolma boils water on a single burner at the ridge post. Sterile clamps are necessary before midnight, but the porter is still on the switchbacks. After the last clean kit, the midwives boil water and hope.",
      scene:
        "Dolma boils water on a single burner. She watches the autoclave gauge. The gauge stays dead. The night birth moves fast on the trail above the post. Sterile clamps are necessary before midnight. The fuel porter is still on the switchbacks.\n\nThe porter did not arrive at noon. Snow took the morning path. The district budget pays porters by the kilo of diesel and kerosene. The budget does not pay by the hour a life arrives. Solar panels on the roof charged a small bank for lights and the radio. The sterilizer is not on that circuit.\n\nThe sterilizer matches a generator. The generator runs only when fuel arrives. A junior midwife holds a flashlight in her teeth. She lays out the last clean kit. After the kit, the midwives boil water and hope. Dolma covered two shifts after the last nurse transferred to a road clinic.\n\nOne more dark delivery will make Dolma choose which rule to break.",
      briefMd:
        "## The place\n\nDolma boils water on a single burner. She watches the autoclave gauge. The gauge stays dead. The night birth moves fast on the trail above the post. Sterile clamps are necessary before midnight. The fuel porter is still on the switchbacks.\n\nThe porter did not arrive at noon. Snow took the morning path. A junior midwife holds a flashlight in her teeth. She lays out the last clean kit. After the kit, the midwives boil water and hope.\n\n## The bigger problem\n\nThe district budget pays porters by the kilo of diesel and kerosene. The budget does not pay by the hour a life arrives. Solar panels on the roof charged a small bank for lights and the radio. The sterilizer is not on that circuit. The sterilizer matches a generator. The generator runs only when fuel arrives.\n\nDolma covered two shifts after the last nurse transferred to a road clinic. One more dark delivery will make Dolma choose which rule to break.\n\n## Your job\n\nPrepare sterile clamps for the night birth before midnight.",
      stakeholder: "District midwife supervisor",
      crisisMeters: { local: { label: "Dark births", description: "Dark births on the trail make sterile clamps necessary before midnight." }, global: { label: "Fuel porters", description: "Fuel porters stay on the switchbacks after snow takes the morning path." }, support: { label: "Staff burnout", description: "Staff burnout rises when Dolma covers two shifts after the nurse transfer." } },
      suggested: ["solar", "battery", "drones", "networks", "iot", "ai"],
      suggestedWhy: {
        "solar": "Solar can feed the sterilizer, not only the lights and the radio.",
        "battery": "A battery can run the sterilizer when the generator has no fuel.",
        "drones": "Drones can carry supplies when the porter is still on the switchbacks.",
        "networks": "Networks can send a fuel call before the night birth on the trail.",
        "iot": "Iot can show a dead autoclave gauge to the district before midnight.",
        "ai": "Ai can warn Dolma when the last clean kit is the only kit left.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Makoko Lagoon Stilt Blocks"],
      title: "Light sold by the hour on the lagoon",
      summary: "Chinedu unhooks the prepaid cable from the classroom beam on the lagoon. The bulbs die over sixteen students who copy lessons into damp notebooks. Parents ask why their children study by phone glow while the next block hums.",
      scene:
        "Chinedu unhooks the prepaid cable from the classroom beam when the metered hour ends. The bulbs die over sixteen students. The students copy lessons into damp notebooks. A generator boat idles across the boardwalk. The boat sells extension cords in the evening. Families who can pay stay lit.\n\nThe teachers collective cannot pay that rate for each desk. The formal utility treats the stilt blocks as temporary water. A clean title for a transformer does not exist. Power arrives as a favor or a fee. A favor becomes a fee.\n\nParents knock on the door of Chinedu. The parents ask why their children study by phone glow. The next block hums. Trust frays between households. The households share walkways. The households do not share tariffs.\n\nChinedu keeps a ledger of fuel payments. The ledger shows who paid for fuel. The ledger shows who cannot pay. The ledger becomes a map of who gets a future after dark.",
      briefMd:
        "## The place\n\nChinedu unhooks the prepaid cable from the classroom beam when the metered hour ends. The bulbs die over sixteen students. The students copy lessons into damp notebooks. A generator boat idles across the boardwalk. The boat sells extension cords in the evening. Families who can pay stay lit.\n\nParents knock on the door of Chinedu. The parents ask why their children study by phone glow. The next block hums. Trust frays between households. The households share walkways. The households do not share tariffs.\n\n## The bigger problem\n\nThe teachers collective cannot pay that rate for each desk. The formal utility treats the stilt blocks as temporary water. A clean title for a transformer does not exist. Power arrives as a favor or a fee. A favor becomes a fee.\n\nChinedu keeps a ledger of fuel payments. The ledger shows who paid for fuel. The ledger shows who cannot pay. The ledger becomes a map of who gets a future after dark.\n\n## Your job\n\nKeep classroom light on for sixteen students after the metered hour ends.",
      stakeholder: "Lagoon teachers' collective secretary",
      crisisMeters: { local: { label: "Dark study", description: "Dark study starts for sixteen students when the prepaid bulbs die." }, global: { label: "Wire fees", description: "Wire fees from the generator boat leave desks dark for the collective." }, support: { label: "Trust gap", description: "A trust gap grows between households that share walkways but not tariffs." } },
      suggested: ["solar", "battery", "iot", "crypto", "networks", "ai"],
      suggestedWhy: {
        "solar": "Solar can light the classroom when the metered cable hour ends.",
        "battery": "A battery can keep the bulbs on after the prepaid hour ends.",
        "iot": "Iot can meter light for each desk when the collective cannot pay.",
        "crypto": "Crypto can record who paid for fuel on the stilt blocks.",
        "networks": "Networks can share light between blocks that do not share tariffs.",
        "ai": "Ai can show which desks go dark when the metered hour ends.",
      },
      visionTheme: "social-city",
    }
  ],

  homeless: [
    {
      places: ["Sunbelt Weekly Inn strip, Mesa corridors"],
      title: "Noon checkout into a furnace lot",
      summary: "Marisol knocks on room 12 at 11:40 a.m. with a cold pack and a bus pass. The family has a stay until noon. The lot outside is a furnace. The boy sits on a suitcase. A signature for a new night does not land before the heat.",
      scene:
        "Marisol knocks on room 12 at 11:40 a.m. with a cold pack and a bus pass. The family in the room has a stay until noon. The asphalt outside the room is hot. The youngest boy sits on a suitcase in the shade of a dead palm. His cheeks show a flush. A van can fail to arrive.\n\nThe front desk does not extend another night. Corporate sets a hard turnover clock. The same rooms go on sale again by evening to travelers and to contractors. The voucher from Marisol covers nights with prior approval. A new night is necessary with a fresh form and a fresh signature. The wait runs past the heat of the day.\n\nMarisol works the phone in the lot. The mother wipes sweat from the neck of the baby. The case notes live in three systems. The three systems do not share data. Beds open and close by the hour on a strip of weekly motels. The weekly motels treat a family as short-stay inventory.\n\nThe lot is the wait area. The shade moves with the sun. By one o'clock the breath of the boy turns shallow. The heat illness is not a metaphor at this place. The child sits on hot pavement because the checkout time is noon. The housing system works as a revolving door of nightly rates.",
      briefMd:
        "## The place\nMarisol knocks on room 12 at the Sunbelt Weekly Inn strip at 11:40 a.m. She carries a cold pack and a bus pass. The family in the room has a stay until noon. The asphalt in the Mesa corridors is hot. The youngest boy sits on a suitcase in the shade of a dead palm. His cheeks show a flush.\n\nThe front desk does not extend another night. The voucher from Marisol covers nights with prior approval. A new night is necessary with a fresh form and a fresh signature. Marisol works the phone in the lot. The mother wipes sweat from the neck of the baby. The lot is the wait area.\n\nBy one o'clock the breath of the boy turns shallow. The child sits on hot pavement. The shade moves with the sun. A van can fail to arrive.\n\n## The bigger problem\nCorporate sets a hard turnover clock so the same rooms go on sale again by evening. Travelers and contractors take those rooms. The case notes live in three systems. The three systems do not share data. Beds open and close by the hour. Weekly motels treat a family as short-stay inventory.\n\nThe checkout time is noon. The housing system works as a revolving door of nightly rates. The wait for a signature runs past the heat of the day. The heat illness is not a metaphor at this place.\n\n## Your job\nKeep the family off the hot lot after noon while the form stays open.",
      stakeholder: "Marisol, motel outreach caseworker",
      crisisMeters: { local: { label: "Heat illness", description: "The boy on the suitcase shows heat illness on the hot pavement before one o'clock." }, global: { label: "Room churn", description: "Room churn puts the same rooms on sale again by evening after the noon checkout." }, support: { label: "Case backlog", description: "The case notes sit in three systems, so a new signature waits past the heat of the day." } },
      suggested: ["ai", "networks", "iot", "solar", "battery", "materials", "print3d", "transportation"],
      suggestedWhy: {
        "ai": "A shared case view can show an open bed before the noon checkout.",
        "networks": "A link between the three case systems can move a signature before the heat.",
        "iot": "A lot sensor can warn Marisol when the heat puts the boy at risk.",
        "solar": "Solar power can run a cool unit on the lot while the family waits.",
        "battery": "A battery can run a cold pack on the lot after checkout.",
        "materials": "A light shade material can cut heat on the suitcase and the pavement.",
        "print3d": "A printed shade frame can cover the boy on the hot lot.",
        "transportation": "A sure van can move the family off the hot lot before one o'clock.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Riverbend Family Justice annex"],
      title: "Thirty safe nights, then the courthouse lot",
      summary: "Keisha walks Lena and the two kids from the annex door to a gray sedan. Thirty nights end at midnight. Hotels reject a person with no credit card. The courthouse lot is the place where they lock the doors if no bed clears by dark.",
      scene:
        "Keisha walks Lena and the two kids from the annex door to a gray sedan. The sedan holds a duffel and a folder of court papers. Thirty nights in the confidential shelter end at midnight. The protection order is real. The next address does not exist.\n\nThe emergency voucher lists hotels. Those hotels reject a person with no credit card on file. The card of Lena was cut when she left. Keisha called four front desks. Two desks end the call when they hear the program name. The shelter bed turns over on a fixed clock.\n\nThe next family can enter after the turnover. Rules for scarce aid produce the same gap. The thirty nights end before the proof of income. A waitlist for longer housing does not open before the first hearing. The courthouse lot is the fallback.\n\nLena will sleep in the car with the doors locked if no bed clears by dark. The kids will lie under a blanket in that car. The trust frays in the passenger seat. Lena asks if the full story at intake closed doors later. Keisha has no clean answer that fits the form.",
      briefMd:
        "## The place\nKeisha walks Lena and the two kids from the Riverbend Family Justice annex door to a gray sedan. The sedan holds a duffel and a folder of court papers. Thirty nights in the confidential shelter end at midnight. The protection order is real. The next address does not exist.\n\nThe emergency voucher lists hotels. Those hotels reject a person with no credit card on file. The card of Lena was cut when she left. Keisha called four front desks. Two desks end the call when they hear the program name.\n\nThe courthouse lot is the fallback. Lena will sleep in the car with the doors locked if no bed clears by dark. The kids will lie under a blanket in that car. The trust frays in the passenger seat. Lena asks if the full story at intake closed doors later. Keisha has no clean answer that fits the form.\n\n## The bigger problem\nThe shelter bed turns over on a fixed clock. The next family can enter after the turnover. Rules for scarce aid produce the same gap. The thirty nights end before the proof of income. A waitlist for longer housing does not open before the first hearing on the order.\n\nThe clock on the shelter and the clock on justice do not match. The gap leaves Lena in the car at the courthouse lot.\n\n## Your job\nGive Lena a safe night after the shelter ends and before the hearing.",
      stakeholder: "Keisha, domestic-violence housing advocate",
      crisisMeters: { local: { label: "Unsafe nights", description: "An unsafe night waits in the courthouse lot if no bed clears by dark." }, global: { label: "Voucher rules", description: "Voucher rules end the shelter at midnight and then ask for proof of income." }, support: { label: "Credit blocks", description: "Credit blocks stop a hotel stay because the card of Lena was cut." } },
      suggested: ["ai", "networks", "computing", "crypto", "vr", "transportation", "iot", "print3d"],
      suggestedWhy: {
        "ai": "A case tool can match Lena to a hotel that does not demand a credit card.",
        "networks": "A secure link can send the protection order to a desk before midnight.",
        "computing": "A shared record can track the thirty nights and the hearing date in one place.",
        "crypto": "A private record can share the program name without a public reject at the desk.",
        "vr": "A remote view can show Lena a safe room before she leaves the annex.",
        "transportation": "A safe ride can move Lena and the kids off the courthouse lot by dark.",
        "iot": "A door sensor can confirm a locked safe room for the kids after midnight.",
        "print3d": "A printed key token can open a partner room with no credit card on file.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Palm Court senior trailer park"],
      title: "Sold out from under the fixed check",
      summary: "Harold pins a notice to the clubhouse board after the morning meeting. The lot rent jumps in sixty days on ground that the paid off trailer does not own. Ruth asks where she plugs in her oxygen if the lot goes dark.",
      scene:
        "Harold pins a notice to the clubhouse board. His hands shake from the morning meeting. The park has a new owner. The lot rent jumps in sixty days. Harold paid off the trailer. Harold does not own the ground under the trailer.\n\nNeighbors gather with coffee and with calculators. Social Security does not cover the new rent. A move of a double-wide costs more than a resident will see in a year. The letter from the buyer talks about redevelopment and about permanent homes. Residents cannot buy those homes.\n\nHarold sits on the park board. Harold knows the mechanism by name at this time. Land under an aging park trades as an asset. The homes stay personal property. The rent can rise faster than a fixed check. Empty pads make the next sale clean after residents leave.\n\nResidents who leave reduce the quorum that once slowed a bad deal. Ruth asks where she plugs in her oxygen concentrator if the lot goes dark. Harold has a toolbox. Harold has a title to a box on wheels. Harold does not have the land.",
      briefMd:
        "## The place\nHarold pins a notice to the clubhouse board at Palm Court senior trailer park. His hands shake from the morning meeting. The park has a new owner. The lot rent jumps in sixty days. Harold paid off the trailer. Harold does not own the ground under the trailer.\n\nNeighbors gather with coffee and with calculators. Social Security does not cover the new rent. A move of a double-wide costs more than a resident will see in a year. Ruth asks where she plugs in her oxygen concentrator if the lot goes dark. Harold has a toolbox and a title to a box on wheels. Harold does not have the land.\n\n## The bigger problem\nHarold sits on the park board and knows the mechanism by name. Land under an aging park trades as an asset. The homes stay personal property. The rent can rise faster than a fixed check. Residents who leave reduce the quorum that once slowed a bad deal. Empty pads make the next sale clean.\n\nThe letter from the buyer talks about redevelopment and about permanent homes. Residents cannot buy those homes.\n\n## Your job\nProtect tenure for the paid off trailer when lot rent jumps in sixty days.",
      stakeholder: "Harold, retired machinist and park board member",
      crisisMeters: { local: { label: "Displacement", description: "Displacement starts when the lot rent jumps and a resident cannot move a double-wide." }, global: { label: "Lot rent", description: "The lot rent on rented ground rises faster than a fixed check in sixty days." }, support: { label: "Fixed checks", description: "A fixed check from Social Security does not cover the new lot rent." } },
      suggested: ["ai", "networks", "computing", "materials", "print3d", "solar", "battery", "iot"],
      suggestedWhy: {
        "ai": "A rent model can show Harold the jump before the sixty days end.",
        "networks": "A resident network can keep a quorum when a neighbor plans to leave.",
        "computing": "A shared ledger can track lot rent against each fixed check.",
        "materials": "A lighter skid material can cut the cost to move a double-wide.",
        "print3d": "A printed adapter can keep an oxygen line ready if the lot power fails.",
        "solar": "Solar power can run the oxygen concentrator if the lot goes dark.",
        "battery": "A battery can run the oxygen concentrator through a dark night on the lot.",
        "iot": "A power sensor can warn Ruth before the lot goes dark.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["County General ambulance bay curb"],
      title: "Discharged still weak to the ambulance bay",
      summary: "Dr. Nadim signs the discharge at 2:15 a.m. and walks Marcus to the automatic doors. The respite wing is full. Taxi vouchers ended at midnight. A clean place to elevate the leg is necessary for Marcus. The ambulance bay curb is not a bed.",
      scene:
        "Dr. Nadim signs the discharge at 2:15 a.m. Dr. Nadim walks Marcus to the automatic doors. Marcus holds a paper bag of meds and a list of wound care steps. A clean place to elevate the leg is necessary for Marcus. The inpatient bed goes to the next admission in the hallway.\n\nThe respite wing is full. Taxi vouchers ended at midnight. The name of Marcus sits on a shelter list. The shelter list does not hold a medical hold after three no-shows. Earlier hospital stays caused those no-shows. The billing office coded Marcus as stable enough to leave.\n\nStable status on paper is not stable status on concrete. Nadim watched this loop for years. Hospitals empty beds under occupancy pressure. Street systems and shelter systems treat post-acute recovery as a different lane. The ambulance bay curb becomes the step-down unit without a bridge bed. The infection risk climbs.\n\nThe same patient returns in worse condition. The debt notice arrives before the wound closes. Marcus asks if he can sit in the waiting room until dawn. The security team has orders. Nadim stands with Marcus under the bay light. Nadim feels the design failure in the signature.",
      briefMd:
        "## The place\nDr. Nadim signs the discharge at 2:15 a.m. at the County General ambulance bay curb. Dr. Nadim walks Marcus to the automatic doors. Marcus holds a paper bag of meds and a list of wound care steps. A clean place to elevate the leg is necessary for Marcus. The inpatient bed goes to the next admission in the hallway.\n\nThe respite wing is full. Taxi vouchers ended at midnight. The name of Marcus sits on a shelter list. The shelter list does not hold a medical hold after three no-shows. Earlier hospital stays caused those no-shows. The billing office coded Marcus as stable enough to leave.\n\nMarcus asks if he can sit in the waiting room until dawn. The security team has orders. Nadim stands with Marcus under the bay light. Nadim feels the design failure in the signature. Stable status on paper is not stable status on concrete. The ambulance bay curb is not a bed.\n\n## The bigger problem\nNadim watched this loop for years. Hospitals empty beds under occupancy pressure. Street systems and shelter systems treat post-acute recovery as a different lane. The ambulance bay curb becomes the step-down unit without a bridge bed. The infection risk climbs on that curb.\n\nThe same patient returns in worse condition. The debt notice arrives before the wound closes.\n\n## Your job\nGive Marcus a clean place to heal after discharge and before dawn.",
      stakeholder: "Dr. Nadim, ER attending and respite organizer",
      crisisMeters: { local: { label: "Street nights", description: "Street nights start on the ambulance bay curb when no clean bed remains after discharge." }, global: { label: "Bed pressure", description: "Bed pressure sends the inpatient bed to the next admission in the hallway." }, support: { label: "Med debt", description: "The med debt arrives in a notice before the wound closes." } },
      suggested: ["ai", "networks", "computing", "transportation", "iot", "drones", "solar", "battery"],
      suggestedWhy: {
        "ai": "A bed match can find a clean respite place before the discharge signature.",
        "networks": "A care link can hold a medical bed when a hospital stay causes a no-show.",
        "computing": "A shared chart can show that stable status on paper is not stable status on concrete.",
        "transportation": "A late ride can move Marcus off the curb after taxi vouchers end at midnight.",
        "iot": "A leg sensor can track elevation of the leg in a clean recovery place.",
        "drones": "A small delivery craft can bring wound supplies to a recovery place before dawn.",
        "solar": "Solar power can keep a recovery light and a device on through the night.",
        "battery": "A battery can run a device for the leg after discharge and before dawn.",
      },
      visionTheme: "care-city",
    }
  ],

  cities: [
    {
      places: ["Ahmedabad Textile Lane Roofs"],
      title: "Tin roofs that still cook after dark",
      summary: "Meena climbs the lane roof at 9:40 p.m. with a wet cloth for the wrists of her father. The tin still holds the heat of the day like a skillet. She will miss another morning shift if his fever spikes again.",
      scene:
        "At 9:40 p.m., Meena climbs the ladder to the lane roof with a wet cloth and a bottle of ORS. Her father coughs on the cot below. The tin holds the heat of the day like a skillet. The fans on the floor stall when the shared meter trips. She wrings the cloth over his wrists. The thermometer stays above the safe line.\n\nThe ward heat desk can issue cool-roof paint and a shade net. The landlord must sign before the desk issues the paint. The landlord meters power by the room. The landlord bills the extra load as commercial use. Workers laid the wiring for looms and bulbs. Workers did not lay the wiring for night cooling on sleeping floors.\n\nEach summer the hardscape expands. The green strips shrink. The lane traps heat after dark.\n\nMeena misses another morning shift when the fever of her father spikes again. Lost wages sit beside the clinic slips. The desk holds a short list of roofs. The desk holds a long list of rooms that still cook.",
      briefMd:
        "## The place\nAt 9:40 p.m., Meena climbs the ladder to the lane roof with a wet cloth and a bottle of ORS. Her father coughs on the cot below. The tin holds the heat of the day like a skillet. The fans on the floor stall when the shared meter trips. She wrings the cloth over his wrists. The thermometer stays above the safe line.\n\nThe landlord meters power by the room. The landlord bills the extra load as commercial use. Workers laid the wiring for looms and bulbs. Workers did not lay the wiring for night cooling on sleeping floors.\n\nMeena misses another morning shift when the fever of her father spikes again. Lost wages sit beside the clinic slips.\n\n## The bigger problem\nThe ward heat desk can issue cool-roof paint and a shade net. The landlord must sign before the desk issues the paint. The desk holds a short list of roofs. The desk holds a long list of rooms that still cook.\n\nEach summer the hardscape expands. The green strips shrink. The lane traps heat after dark.\n\n## Your job\nMake the lane roof cool after dark so a body can rest without a meter trip.",
      stakeholder: "Ward heat-health and housing desk",
      crisisMeters: { local: { label: "Heat Nights", description: "Heat nights keep the tin roof hot on the lane after dark." }, global: { label: "Hardscape", description: "Hardscape growth shrinks the green strips and traps heat in the lane." }, support: { label: "Sick Days", description: "Sick days pull Meena from the morning shift when fever returns." } },
      suggested: ["solar", "materials", "iot", "ai", "battery", "networks"],
      suggestedWhy: {
        "solar": "Solar power can run a night fan when the shared meter trips.",
        "materials": "A cool roof material can cut the heat that tin holds after dark.",
        "iot": "A small sensor can show when the room stays above the safe line.",
        "ai": "A model can flag rooms that cook after dark before the next heat night.",
        "battery": "A battery can keep a fan on when the shared meter trips.",
        "networks": "A local network can link the heat desk to roofs that still cook.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Manila Estero de Vitas Pocket"],
      title: "The estero that became the alley dump",
      summary: "Liza pushes a bamboo pole under the estero footbridge and feels the plastic bag catch. Rain from last night sits in the alley like a black pond. She will miss another laundry day if the water does not fall by noon.",
      scene:
        "Before dawn, Liza pushes a bamboo pole under the footbridge. She feels the plastic bag catch on the pole. Water must slide past the stilts. The water does not slide past the stilts. Rain from last night sits in the alley like a black pond. Her ground-floor room takes the smell first.\n\nThe mat of the baby is damp. The barangay truck came twice this week. The truck left half full. Upstream tenants bag kitchen waste. The tenants drop the waste at the bend because the formal bin stays locked after the shift change.\n\nLandlords raise the rent when a cleanup crew appears. The landlords look away when the channel clogs again. The estero serves as a drain. The estero also serves as a dump. Each high tide pushes the mess back into doorways.\n\nLiza lifts the mat and finds mold on the underside. She will miss another laundry day if the water does not fall by noon. The council can map the choke points. The council cannot name the habit that fills the choke points.",
      briefMd:
        "## The place\nBefore dawn, Liza pushes a bamboo pole under the footbridge. She feels the plastic bag catch on the pole. Water must slide past the stilts. The water does not slide past the stilts. Rain from last night sits in the alley like a black pond. Her ground-floor room takes the smell first.\n\nThe mat of the baby is damp. Liza lifts the mat and finds mold on the underside. She will miss another laundry day if the water does not fall by noon.\n\n## The bigger problem\nThe barangay truck came twice this week. The truck left half full. Upstream tenants bag kitchen waste. The tenants drop the waste at the bend because the formal bin stays locked after the shift change. Landlords raise the rent when a cleanup crew appears. The landlords look away when the channel clogs again.\n\nThe estero serves as a drain. The estero also serves as a dump. Each high tide pushes the mess back into doorways. The council can map the choke points. The council cannot name the habit that fills the choke points.\n\n## Your job\nKeep floodwater out of the ground-floor room so Liza can finish laundry by noon.",
      stakeholder: "Barangay waterway and solid-waste council",
      crisisMeters: { local: { label: "Flooding", description: "Rain sits in the alley like a black pond when the estero does not drain." }, global: { label: "Trash Backup", description: "Plastic bags catch under the footbridge and clog the channel." }, support: { label: "Tenant Squeeze", description: "Landlords raise the rent when a cleanup crew appears on the estero." } },
      suggested: ["drones", "iot", "materials", "robots", "ai", "transportation"],
      suggestedWhy: {
        "drones": "A drone can show choke points under the footbridge before the next high tide.",
        "iot": "A sensor can warn the council when water rises at the bend.",
        "materials": "A tough bin can stay open after the shift change so waste stays out of the bend.",
        "robots": "A small machine can lift plastic bags from the channel under the footbridge.",
        "ai": "A model can flag bends that fill with waste after each shift change.",
        "transportation": "A waste truck can finish the alley loop before the formal bin locks.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Bogotá Soacha Ridge Stops"],
      title: "Three hours down the ridge for a shift",
      summary: "Andrés arrives at the dirt platform at 4:55 a.m. with kitchen whites folded in a bag. The feeder van is full and the next van is only a chalkboard rumor. He clocks in late and loses the breakfast premium again.",
      scene:
        "Andrés arrives at the dirt platform at 4:55 a.m. with his kitchen whites folded in a bag. The feeder van is full. The next van is a rumor on a chalkboard. The trunk bus below the ridge keeps a clock. Andrés cannot meet that clock if he waits. He walks the first switchbacks in the dark.\n\nFares do not integrate across the edge of the formal system. Drivers skip the upper stops when fuel runs thin or a checkpoint slows the loop. New housing climbed the slope faster than the route map. The office can add a pin on a screen. The office cannot put a seat where the road narrows to one lane of mud.\n\nAndrés clocks in late. He loses the breakfast premium again. His sister will cover the shortfall this week. Then she will ask him to cover her shortfall. The hillside grows. The feeder thins.",
      briefMd:
        "## The place\nAndrés arrives at the dirt platform at 4:55 a.m. with his kitchen whites folded in a bag. The feeder van is full. The next van is a rumor on a chalkboard. The trunk bus below the ridge keeps a clock. Andrés cannot meet that clock if he waits. He walks the first switchbacks in the dark.\n\nAndrés clocks in late. He loses the breakfast premium again. His sister will cover the shortfall this week. Then she will ask him to cover her shortfall.\n\n## The bigger problem\nFares do not integrate across the edge of the formal system. Drivers skip the upper stops when fuel runs thin or a checkpoint slows the loop. New housing climbed the slope faster than the route map.\n\nThe office can add a pin on a screen. The office cannot put a seat where the road narrows to one lane of mud. The hillside grows. The feeder thins.\n\n## Your job\nGet Andrés to the plain shift on time so he keeps the breakfast premium.",
      stakeholder: "Hillside feeder and fare-integration office",
      crisisMeters: { local: { label: "Commute Hours", description: "The walk from the ridge platform adds hours before a shift on the plain." }, global: { label: "Feeder Gaps", description: "The feeder skips upper stops and leaves no seat on the mud lane." }, support: { label: "Lost Wages", description: "A late clock-in takes the breakfast premium and cuts the week pay." } },
      suggested: ["transportation", "ai", "networks", "battery", "solar", "self-driving"],
      suggestedWhy: {
        "transportation": "A feeder van can hold a seat for the upper stop before 4:55 a.m.",
        "ai": "A model can match van seats to the ridge clock before the trunk bus leaves.",
        "networks": "A network can show the next van time at the chalkboard stop.",
        "battery": "A battery can keep a small feeder on the loop when fuel runs thin.",
        "solar": "Solar power can charge a feeder so the loop does not stop for thin fuel.",
        "self-driving": "An automated van can serve the narrow mud lane when drivers skip the stop.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Nairobi Mathare Ridge Schools"],
      title: "Lessons under the zinc sheets",
      summary: "Teacher Amina chalks the date on a board that leans against a zinc wall. Forty-two learners share a room built for twenty-eight learners. Each rumor of a land flip thins the desks before a locked gate makes the choice.",
      scene:
        "Teacher Amina chalks the date on a board that leans against a zinc wall. Forty-two learners share a room built for twenty-eight learners. Rain ticks on the roof and drowns the back row. Morning glare hits the metal and the room turns into a low oven. Two girls at the edge copy from a phone screen because the textbook set did not arrive.\n\nThe plot under the school sits on a handshake lease. A broker walked the path last month with a measuring tape and a buyer from outside the ridge. County papers list the site as temporary public use. That temporary status continues for nine years. Each rumor of a land flip thins attendance. Parents pull older children into piecework before a locked gate makes the choice.\n\nAmina marks three empty desks by midweek. She knows those names. The county unit can send a digital lesson pack. The county unit cannot hold the ground when the land price outruns a classroom.",
      briefMd:
        "## The place\nTeacher Amina chalks the date on a board that leans against a zinc wall. Forty-two learners share a room built for twenty-eight learners. Rain ticks on the roof and drowns the back row. Morning glare hits the metal and the room turns into a low oven. Two girls at the edge copy from a phone screen because the textbook set did not arrive.\n\nAmina marks three empty desks by midweek. She knows those names.\n\n## The bigger problem\nThe plot under the school sits on a handshake lease. A broker walked the path last month with a measuring tape and a buyer from outside the ridge. County papers list the site as temporary public use. That temporary status continues for nine years. Each rumor of a land flip thins attendance. Parents pull older children into piecework before a locked gate makes the choice.\n\nThe county unit can send a digital lesson pack. The county unit cannot hold the ground when the land price outruns a classroom.\n\n## Your job\nHold the school plot on public land so learners stay and empty desks fill.",
      stakeholder: "County basic-education and public-land unit",
      crisisMeters: { local: { label: "Crowded Rooms", description: "Forty-two learners share a zinc room built for twenty-eight learners." }, global: { label: "Plot Flip", description: "A handshake lease and a buyer rumor put the school plot at risk." }, support: { label: "Dropouts", description: "Parents pull older children into piecework when a land flip rumor spreads." } },
      suggested: ["networks", "vr", "solar", "print3d", "iot", "ai"],
      suggestedWhy: {
        "networks": "A network can send lessons to the ridge when the textbook set does not arrive.",
        "vr": "A virtual view can show a lesson when glare turns the room into an oven.",
        "solar": "Solar power can cool the zinc room when morning glare makes a low oven.",
        "print3d": "A local print method can make missing textbook pages at the ridge school.",
        "iot": "A sensor can show when rain noise and heat stop the back row.",
        "ai": "A model can flag empty desks before a land rumor pulls learners into piecework.",
      },
      visionTheme: "learn-city",
    }
  ],

  child: [
    {
      places: ["El Alto compound kitchens, La Paz highlands"],
      title: "Night smoke steals small breaths",
      summary: "Nurse Mamani puts a cold stethoscope on the chest of a boy of three years in the shared courtyard kitchen. The gas ran out in the middle of the week. Thus the dung fire from last night still sits under the zinc roof.\n\nThe ribs of the boy pull hard. The clinic line will run past noon.",
      scene:
        "At first light, nurse Mamani puts a cold stethoscope on the chest of a boy of three years in a shared courtyard kitchen. The ribs of the boy pull hard between each breath. His mother stays awake after the night fire. She moves air across a clay stove. The stove still holds the smell of the meal from last night.\n\nThe gas canister ran out in the middle of the week. The refill price rose again. Thus the household went back to dung and scrap wood. Half the compound did the same. Smoke sits low under the zinc roof. The smoke finds no clean path out.\n\nChildren sleep on the same floor as the pots. In the morning the smallest children wake with tight chests. Gray rings sit under their eyes. Mamani marks one more wheeze on her paper card. She knows the clinic line for the nebulizer will pass noon.\n\nVendors still sell fuel by the door. They sell only sizes that a family can buy on a market day. Builders did not put chimneys in these rooms. Heat for supper and heat for the lungs of the child come from the same fire. A dirty stove keeps supper cheap. That fire takes breath from the child for a week.",
      briefMd:
        "## The place\n\nThe place is a shared courtyard kitchen in an El Alto compound in the La Paz highlands. Nurse Mamani works there at first light. A boy of three years lies under a zinc roof. His mother tends a clay stove after a night fire.\n\nThe gas canister ran out in the middle of the week. The refill price rose again. The household burns dung and scrap wood. Half the compound does the same. Smoke sits low. Children sleep on the same floor as the pots.\n\nIn the morning the smallest children wake with tight chests and gray rings under the eyes. Mamani marks one more wheeze on her paper card. The clinic line for the nebulizer will pass noon.\n\nVendors sell fuel by the door in sizes that a family can buy on a market day. Builders did not put chimneys in these rooms.\n\n## The bigger problem\n\nHeat for supper and heat for the lungs of the child come from the same fire. A dirty stove keeps supper cheap. That fire takes breath from the child for a week.\n\nThe price of gas pushes the household back to dung and scrap wood. The rooms have no chimney. Smoke finds no clean path out.\n\n## Your job\n\nProtect child breath in this compound when the night meal uses a dirty stove.",
      stakeholder: "Highland community health nurse",
      crisisMeters: { local: { label: "Wheezing", description: "The boy pulls hard for each breath after the night fire in the courtyard kitchen." }, global: { label: "Cook smoke", description: "Smoke from dung and scrap wood sits under the zinc roof with no clean path out." }, support: { label: "Fuel cost", description: "The gas refill price rose, so the household burns dung and scrap wood again." } },
      suggested: ["solar", "battery", "materials", "iot", "ai", "networks", "energy", "print3d"],
      suggestedWhy: {
        "solar": "Solar can heat a pot when the gas canister is empty.",
        "battery": "A battery can hold day power for the night meal.",
        "materials": "New materials can hold heat and cut smoke from a clay stove.",
        "iot": "A sensor can show when smoke sits low under the zinc roof.",
        "ai": "A simple model can mark kitchens that send wheeze cases to the clinic.",
        "networks": "A local network can share fuel prices before a household burns dung.",
        "energy": "Clean energy can replace the dung fire that fills the kitchen with smoke.",
        "print3d": "A printed vent can move smoke out of a room with no chimney.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Cebu canal-edge daycare, Visayas waterfront"],
      title: "Trash gutters breed the fever",
      summary: "Coordinator Reyes counts heads at the canal-edge daycare and stops at the empty mat by the window. Rain in the night left the gutter black and still with bags and peels.\n\nLittle Jun stays home with fever. That water will return with the next street trash.",
      scene:
        "Coordinator Reyes counts heads at the canal-edge daycare on the Visayas waterfront. She stops at the empty mat by the window. Little Jun did not come. His aunt sends a photo of a thermometer and a limp child on a plastic chair.\n\nRain in the night left the gutter behind the building full again. Plastic bags and fruit peels slow the drain. The water sits black and still. Mosquitoes rise from that water before the morning bell. Reyes sweeps larvae from a bucket by the wash corner. She knows the same water will return with the next load of street trash.\n\nCollection crews skip the narrow lane. Trucks cannot turn in that lane. Shop owners push waste toward the canal. The dump fee hits harder than a fine that no officer enforces.\n\nParents miss shifts when fever keeps a child at home. The daycare loses fees and trust in the same week. Reyes can boil drinking water. She can hang nets. She cannot stop the gutter as a nursery for mosquitoes.",
      briefMd:
        "## The place\n\nThe place is a canal-edge daycare on the Visayas waterfront in Cebu. Coordinator Reyes counts heads there in the morning. Little Jun did not come. His aunt sends a photo of a thermometer and a limp child on a plastic chair.\n\nRain in the night left the gutter behind the building full. Plastic bags and fruit peels slow the drain. The water sits black and still. Mosquitoes rise from that water before the morning bell.\n\nReyes sweeps larvae from a bucket by the wash corner. She knows the same water will return with the next load of street trash.\n\n## The bigger problem\n\nCollection crews skip the narrow lane because trucks cannot turn there. Shop owners push waste toward the canal. The dump fee hits harder than a fine that no officer enforces.\n\nParents miss shifts when fever keeps a child at home. The daycare loses fees and trust in the same week. Reyes can boil water and hang nets. She cannot stop the gutter as a nursery for mosquitoes.\n\n## Your job\n\nKeep fever out of the daycare morning at this canal edge.",
      stakeholder: "Barangay child-health coordinator",
      crisisMeters: { local: { label: "Child fever", description: "Little Jun stays home with fever after mosquitoes rise from the black gutter." }, global: { label: "Standing water", description: "Bags and peels hold rain in the gutter until the water sits still." }, support: { label: "Missed work", description: "Parents miss shifts when fever keeps a child home from the daycare." } },
      suggested: ["iot", "drones", "ai", "networks", "materials", "solar", "space", "robots"],
      suggestedWhy: {
        "iot": "A sensor can show when gutter water sits still behind the daycare.",
        "drones": "A small aircraft can map trash that blocks the canal-edge drain.",
        "ai": "A simple model can mark lanes where fever follows standing water.",
        "networks": "A local network can alert crews before the next rain fills the gutter.",
        "materials": "New materials can keep bags and peels out of the drain.",
        "solar": "Solar can power a pump that moves still water from the gutter.",
        "space": "A view from space can show standing water along this canal edge.",
        "robots": "A robot can lift bags from a lane where trucks cannot turn.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Kano grain-market under-fives post, northern Nigeria"],
      title: "Spoiled millet on the growth chart",
      summary: "Officer Bello unrolls the growth chart for Amina at the market bench. The red ink already waits. The millet sack looked sound at the stall, then turned sour in the heat with weevils in the middle.\n\nAmina tires before noon. The next stall will sell the same stock under a new scoop.",
      scene:
        "Officer Bello unrolls the growth chart at the under-fives post in the Kano grain market. The red ink already waits. Amina lost two marks on the chart after the last market week. Her grandmother sets a small bowl of thin millet porridge on the bench. She will not meet his eyes.\n\nThe sack looked sound at the stall. At home the grain turned sour in the heat. Weevils filled the middle of the sack. No buyer checks that middle before the sale.\n\nTraders on the row stack bags on bare ground after long truck hauls. The row has no cool shade. The bags have no sealed liners. A buyer complains. The next stall sells the same stock under a new scoop.\n\nBello can hand micronutrient sachets to a mother. He cannot make that mother trust the grain in the bowl of the child. Amina tires before noon. She stops play with the other under-fives. The chart does not lie. Spoilage is not an accident in this market.",
      briefMd:
        "## The place\n\nThe place is an under-fives post at the Kano grain market in northern Nigeria. Officer Bello unrolls the growth chart there. Amina lost two marks after the last market week. Her grandmother sets a small bowl of thin millet porridge on the bench. She will not meet his eyes.\n\nThe sack looked sound at the stall. At home the grain turned sour in the heat. Weevils filled the middle. Amina tires before noon. She stops play with the other under-fives.\n\n## The bigger problem\n\nTraders stack bags on bare ground after long truck hauls. The row has no cool shade. The bags have no sealed liners. Wet-season bulk moves fast. Speed beats care. Spoilage is not an accident here.\n\nWhen a buyer complains, the next stall sells the same stock under a new scoop. Bello can hand sachets to a mother. He cannot make that mother trust the grain in the bowl.\n\n## Your job\n\nKeep millet sound from the truck to the child bowl at this market.",
      stakeholder: "Nutrition surveillance officer",
      crisisMeters: { local: { label: "Thin arms", description: "Amina lost two marks on the growth chart and tires before noon." }, global: { label: "Spoiled grain", description: "Millet turns sour in the heat with weevils in the middle of the sack." }, support: { label: "Market trust", description: "The next stall sells the same sour stock under a new scoop." } },
      suggested: ["gene-sequencing", "iot", "ai", "solar", "networks", "drones", "materials", "synbio"],
      suggestedWhy: {
        "gene-sequencing": "A lab read can show harm in grain before it fills a child bowl.",
        "iot": "A sensor can show heat and weevils in a sack before the sale.",
        "ai": "A simple model can mark stalls that sell sour millet under a new scoop.",
        "solar": "Solar can power a cool store so millet does not turn sour in the heat.",
        "networks": "A local network can warn buyers when a sack fails a check.",
        "drones": "A small aircraft can watch truck hauls that stack bags on bare ground.",
        "materials": "New materials can seal a liner so weevils do not fill the middle.",
        "synbio": "A biology tool can mark spoil in millet before the sale.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Old Fadama scrap-yard edge clinic, Accra"],
      title: "Battery dust on the play sand",
      summary: "Dr. Mensah wipes gray grit from the palms of a toddler at the sand strip beside the clinic. Breakers open batteries with hammers a few doors down. The dust settles where children dig.\n\nFathers earn the cash for the week from that pile. The children who play there tire too fast.",
      scene:
        "Dr. Mensah wipes gray grit from the palms of a toddler before she takes a blood spot. The child plays in the sand strip between the clinic wall and the scrap lane. Breakers open lead-acid batteries with hammers a few doors down. Dust lifts when the wind turns. The dust settles on laundry lines, on cooking pots, and on the sand where children dig.\n\nFathers and older brothers earn the cash for the week from that pile. The block will not accept a closed yard with no other wage. Growth cards show children who gain height too slowly. Those children tire too fast.\n\nChelation is a hope at a city hospital. It is not a Tuesday option here. Dr. Mensah can wash hands. She can teach wet mopping. She cannot stop the next truck of dead batteries. That truck pays better than clean work.",
      briefMd:
        "## The place\n\nThe place is a clinic on the edge of the Old Fadama scrap yard in Accra. Dr. Mensah is the pediatric environmental health officer there. She wipes gray grit from the palms of a toddler before a blood spot. The child plays in the sand strip between the clinic wall and the scrap lane.\n\nBreakers open lead-acid batteries with hammers a few doors down. Dust lifts when the wind turns. The dust settles on laundry lines, on cooking pots, and on the sand where children dig.\n\n## The bigger problem\n\nFathers and older brothers earn the cash for the week from that pile. The block will not accept a closed yard with no other wage. The clinic sits where the scrap work meets the play space.\n\nGrowth cards show children who gain height too slowly and tire too fast. Chelation is a city hospital hope, not a Tuesday option here. Dr. Mensah can wash hands and teach wet mopping. She cannot stop the next truck of dead batteries. That truck pays better than clean work.\n\n## Your job\n\nKeep lead dust off the play sand beside this clinic.",
      stakeholder: "Pediatric environmental health officer",
      crisisMeters: { local: { label: "Slow growth", description: "Children at the sand strip gain height too slowly and tire too fast." }, global: { label: "Lead dust", description: "Lead dust from broken batteries settles on the sand where children dig." }, support: { label: "Scrap jobs", description: "Fathers earn the cash for the week from the battery pile by the clinic." } },
      suggested: ["iot", "nano", "materials", "ai", "drones", "networks", "robots", "gene-sequencing"],
      suggestedWhy: {
        "iot": "A sensor can show when lead dust lifts from the scrap lane onto the sand.",
        "nano": "A fine filter material can catch lead dust before it settles on play sand.",
        "materials": "New materials can hold battery dust at the breaker pile.",
        "ai": "A simple model can mark days when wind carries dust to the clinic sand.",
        "drones": "A small aircraft can map dust paths from the battery pile to the sand strip.",
        "networks": "A local network can warn the clinic when the wind turns toward the sand.",
        "robots": "A robot can open dead batteries in a closed space away from the play sand.",
        "gene-sequencing": "A lab read can show early lead harm in a child at this clinic.",
      },
      visionTheme: "rebuild-city",
    }
  ],

  maternal: [
    {
      places: ["Solukhumbu trail clinic"],
      title: "Bamboo stretcher at the switchback",
      summary: "Pasang steadies the bamboo poles as the litter rounds the last switchback above Namche. The mother bleeds through two cloths after the hamlet. The ambulance waits three hours below at the jeep head. One more delay closes the window for a drug that can stop the bleeding.",
      scene:
        "Pasang steadies the bamboo poles as the litter rounds the last switchback above Namche. The mother on the stretcher bleeds through two cloths after the hamlet. Night drops fast on the ridge.\n\nThe volunteer circle lit the delivery room at the Solukhumbu trail clinic. The delivery room is ready. The road ambulance does not wait at the clinic. The road ambulance waits at the jeep head three hours below. The gravel ends at the jeep head. The porters begin the carry at the jeep head.\n\nThe volunteer circle keeps oxytocin in a cooler. The radio crackles when the cloud lifts. The volunteer circle cannot move the postpartum patient faster than human legs on wet stone.",
      briefMd:
        "## The place\n\nPasang steadies the bamboo poles as the litter rounds the last switchback above Namche. The mother on the stretcher bleeds through two cloths after the hamlet. Night drops fast on the ridge.\n\nThe volunteer circle lit the delivery room at the Solukhumbu trail clinic. The delivery room is ready. The road ambulance waits at the jeep head three hours below. The gravel ends at the jeep head. The porters begin the carry at the jeep head.\n\nThe volunteer circle keeps oxytocin in a cooler. The radio crackles when the cloud lifts. The volunteer circle cannot move the postpartum patient faster than human legs on wet stone.\n\n## The bigger problem\n\nDistrict rules send emergency vehicles only to motorable points. A birth plan assumes the woman can walk before the hemorrhage peaks. A birth plan assumes a porter can carry the woman before the hemorrhage peaks.\n\nThe mother loses the drug window after one more delay. Simple drugs work only inside that window.\n\n## Your job\n\nMove this mother to care before the drug window closes.",
      stakeholder: "Trail health volunteer circle",
      crisisMeters: { local: { label: "Heavy Bleeding", description: "The mother bleeds through two cloths on the switchback above Namche." }, global: { label: "Road Wait", description: "The ambulance waits three hours below at the jeep head." }, support: { label: "Staff Gaps", description: "The volunteer circle cannot move the patient faster than human legs on wet stone." } },
      suggested: ["drones", "transportation", "networks", "solar", "battery", "iot", "ai"],
      suggestedWhy: {
        "drones": "A drone can carry a small load past the jeep head.",
        "transportation": "Better transport can move the mother faster than legs on wet stone.",
        "networks": "A network can link the trail clinic to the ambulance below.",
        "solar": "Solar power can keep the oxytocin cooler cold on the ridge.",
        "battery": "A battery can run the cooler and the radio through the night.",
        "iot": "A sensor can show patient status on the wet stone trail.",
        "ai": "A model can mark the drug window before one more delay.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Rakhiyal chawl maternity room"],
      title: "Night heat on the birth floor",
      summary: "Meena wipes the brow of her sister with a warm cloth on the birth floor. Night holds the heat of the day under the tin roof. The fans stop when the grid dies. A new mother gets a fever with no clean way to cool her.",
      scene:
        "Meena wipes the brow of her sister with a cloth. The cloth is already warm. Night holds the heat of the day under the tin roof of the Rakhiyal chawl maternity room. Mothers share cots on the birth floor.\n\nThe fans stop when the grid dies. The sterilizer goes cold when the grid dies. A new mother gets a fever. The floor has no clean way to cool the new mother. The floor has no clean way to keep instruments safe.",
      briefMd:
        "## The place\n\nMeena wipes the brow of her sister with a cloth in the Rakhiyal chawl maternity room. The cloth is already warm. Night holds the heat of the day under the tin roof. Mothers share cots on the birth floor.\n\nThe fans stop when the grid dies. The sterilizer goes cold when the grid dies. A new mother gets a fever. The floor has no clean way to cool the new mother. The floor has no clean way to keep instruments safe.\n\n## The bigger problem\n\nLandlords meter power by the room. The wiring supplies lights and phones. The wiring does not supply birth care for all hours. Backup power does not come to this floor.\n\nThe chawl women health sabha asked for a dedicated line. Officials say the chawl is temporary housing on paper. Babies arrive in the heat.\n\n## Your job\n\nKeep the new mother cool and the instruments safe in the night heat.",
      stakeholder: "Chawl women’s health sabha",
      crisisMeters: { local: { label: "Mother Fever", description: "A new mother gets a fever on the hot birth floor." }, global: { label: "Power Cuts", description: "The fans and the sterilizer stop when the grid dies." }, support: { label: "Crowding", description: "Mothers share cots under the tin roof." } },
      suggested: ["solar", "battery", "energy", "iot", "networks", "ai", "materials"],
      suggestedWhy: {
        "solar": "Solar power can run a fan when the grid dies under the tin roof.",
        "battery": "A battery can keep a fan and a sterilizer on through the night.",
        "energy": "Steady energy can supply birth care when landlords meter each room.",
        "iot": "A sensor can warn the sabha when the sterilizer goes cold.",
        "networks": "A network can call help when a new mother gets a fever.",
        "ai": "A model can flag fever risk from heat on the birth floor.",
        "materials": "A cool surface can lower heat under the tin roof without the grid.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Cerro Alto workers’ maternity desk"],
      title: "Dust in the labor queue",
      summary: "Rosa signs the shift log with dust on her sleeves and takes a seat in the clinic corridor. Her blood pressure sends her to the hospital up the hill. The stamp desk closes when the ore trucks roll. Her sister lost a baby last year after a delayed transfer.",
      scene:
        "Rosa signs the shift log with dust on her sleeves at the Cerro Alto workers maternity desk. Rosa takes a seat in the clinic corridor. Her ankles swell. The nurse checks her blood pressure twice. The number sends Rosa to the hospital up the hill.\n\nCompany policy lets a spouse leave mid-shift only with a supervisor stamp. The stamp desk closes when the ore trucks roll. Seizure risk does not wait on the ore.",
      briefMd:
        "## The place\n\nRosa signs the shift log with dust on her sleeves at the Cerro Alto workers maternity desk. Rosa takes a seat in the clinic corridor. Her ankles swell. The nurse checks her blood pressure twice. The number sends Rosa to the hospital up the hill.\n\nThe queue moves one chair at a time.\n\n## The bigger problem\n\nCompany policy lets a spouse leave mid-shift only with a supervisor stamp. The stamp desk closes when the ore trucks roll. Seizure risk does not wait on the ore.\n\nThe mine spouses care committee maps each near-miss this season. A spouse stays at work because a missed shift docks the ration card. A missed shift makes the month harder. The clinic fee for an off-site referral sits outside the company package. The sister of Rosa lost a baby last year after a delayed transfer.\n\n## Your job\n\nGet Rosa to the hospital before seizure risk becomes harm.",
      stakeholder: "Mine spouses’ care committee",
      crisisMeters: { local: { label: "Seizures", description: "The blood pressure of Rosa is high enough for seizure risk." }, global: { label: "Shift Rules", description: "The stamp desk closes when the ore trucks roll." }, support: { label: "Clinic Fees", description: "The referral fee sits outside the company package." } },
      suggested: ["networks", "ai", "transportation", "iot", "computing", "vr", "print3d"],
      suggestedWhy: {
        "networks": "A network can send the blood pressure result before the stamp desk closes.",
        "ai": "A model can flag seizure risk from two high blood pressure checks.",
        "transportation": "Transport can take Rosa up the hill when the ore trucks roll.",
        "iot": "A sensor can record blood pressure in the clinic corridor.",
        "computing": "A computer can hold the shift log and the hospital referral together.",
        "vr": "A training view can show the seizure risk of a delayed transfer.",
        "print3d": "A printed aid can help a local check when the referral fee blocks care.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Mtwapa creek birth shelter"],
      title: "Warm vials at low tide",
      summary: "Amina opens the small fridge at the creek shelter and feels the air inside. The air feels cool and the air does not feel cold. Low tide grounds the ferry. A mother bleeds while the medicine loses effect and the shelter waits on the water height.",
      scene:
        "Amina opens the small fridge at the Mtwapa creek birth shelter and feels the air inside. The air feels cool. The air does not feel cold. The oxytocin vials sat through a weak solar afternoon. A cloud bank cut the panels short.\n\nLow tide grounds the creek ferry. The referral hospital is a crossing and a dusty road away. A mother in the shelter bleeds after the placenta.",
      briefMd:
        "## The place\n\nAmina opens the small fridge at the Mtwapa creek birth shelter and feels the air inside. The air feels cool. The air does not feel cold. The oxytocin vials sat through a weak solar afternoon. A cloud bank cut the panels short.\n\nLow tide grounds the creek ferry. The referral hospital is a crossing and a dusty road away. A mother in the shelter bleeds after the placenta.\n\n## The bigger problem\n\nThe creek midwife cooperative knows the dose. The warm medicine loses effect. Supply boats follow the tide chart. Supply boats do not follow the labor chart. Cold-chain funds stop at the mainland depot.\n\nThe shelter waits on the water height. The hemorrhage sets its own clock.\n\n## Your job\n\nKeep the oxytocin potent for the mother who bleeds in the shelter.",
      stakeholder: "Creek midwife cooperative",
      crisisMeters: { local: { label: "Bleeding", description: "A mother in the shelter bleeds after the placenta." }, global: { label: "Warm Medicine", description: "The oxytocin vials feel only cool after a weak solar afternoon." }, support: { label: "Ferry Delay", description: "Low tide grounds the creek ferry to the referral hospital." } },
      suggested: ["solar", "battery", "iot", "drones", "networks", "transportation", "ai"],
      suggestedWhy: {
        "solar": "More solar can keep the fridge cold when a cloud bank cuts the panels.",
        "battery": "A battery can hold cold in the vials through a weak afternoon.",
        "iot": "A sensor can warn Amina when the fridge air feels only cool.",
        "drones": "A drone can carry cold vials when low tide grounds the ferry.",
        "networks": "A network can call the referral hospital across the creek.",
        "transportation": "Other transport can cross the creek when the ferry cannot move.",
        "ai": "A model can time the dose against the tide and the cold chain.",
      },
      visionTheme: "coastal-city",
    }
  ],

  coord: [
    {
      places: ["Carhuaz–Huaraz valley towns, Cordillera Blanca"],
      title: "Lakes that will not speak together",
      summary: "Rosa marks the new crack in the moraine wall above Laguna Palcacocha with a grease pencil. The meltwater rose overnight. The reading dies at the municipal boundary. Her crew clears their own footpath. The next ward does not get the call. A boy loses the potatoes of the morning.",
      scene:
        "At first light, Rosa marks the new crack in the moraine wall above Laguna Palcacocha with a grease pencil. The radio on her belt stays quiet. Down-valley, Huaraz waits on a different frequency and a different spreadsheet.\n\nThe meltwater rose overnight. A sensor buoy that Rosa trusts blinks green on her handheld. Then the reading dies at the municipal boundary. The civil-defense desk in Carhuaz cannot push the live level into the Huaraz map without a signed data letter. The letter takes three days. The letter is on a desk at this time.\n\nWhen the outlet channel jumps, the crew of Rosa has twenty minutes to clear the lower footpath. The crew clears the footpath for their own ward. The next ward does not get the call in time. A market stall washes sideways. A boy loses the potatoes of the morning and a week of school fees.\n\nEach town bought its own gauges after the last scare. Each town meters its own risk. No other town can claim the budget. The lakes fill.",
      briefMd:
        "## The place\n\nAt first light, Rosa marks the new crack in the moraine wall above Laguna Palcacocha with a grease pencil. The radio on her belt stays quiet. Down-valley, Huaraz waits on a different frequency and a different spreadsheet.\n\nThe meltwater rose overnight. A sensor buoy that Rosa trusts blinks green on her handheld. Then the reading dies at the municipal boundary. The civil-defense desk in Carhuaz cannot push the live level into the Huaraz map without a signed data letter. The letter takes three days. The letter is on a desk at this time.\n\nWhen the outlet channel jumps, the crew of Rosa has twenty minutes to clear the lower footpath. The crew clears the footpath for their own ward. The next ward does not get the call in time. A market stall washes sideways. A boy loses the potatoes of the morning and a week of school fees.\n\n## The bigger problem\n\nEach town bought its own gauges after the last scare. Each town meters its own risk. No other town can claim the budget. The lakes fill.\n\n## Your job\n\nShare the live lake level with Huaraz before the outlet channel jumps.",
      stakeholder: "Valley civil-defense coordinators",
      crisisMeters: { local: { label: "Flood damage", description: "Flood damage hits the next ward when the crew clears only its own footpath." }, global: { label: "Silent gauges", description: "Silent gauges die at the municipal boundary before Huaraz sees the live level." }, support: { label: "Blame games", description: "Blame games grow because no town can claim the budget for the lakes." } },
      suggested: ["iot", "networks", "ai", "space", "drones", "computing", "crypto"],
      suggestedWhy: {
        "iot": "A buoy link can keep the live level past the municipal boundary.",
        "networks": "A shared channel can carry the flood call to the next ward.",
        "ai": "An alert rule can flag the moraine crack before the channel jumps.",
        "space": "A sky view can show the meltwater above Laguna Palcacocha.",
        "drones": "A small flight can watch the moraine wall when the radio is quiet.",
        "computing": "A shared map can hold the live level for Carhuaz and Huaraz.",
        "crypto": "A signed note can move the data letter in less than three days.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Delhi–Ghaziabad–Noida work corridors"],
      title: "Three cities, one heat wave",
      summary: "Meera checks three heat flags for the same stretch of NH-24. Delhi paints the corridor amber. Ghaziabad stays green. Noida has no update after dawn. When Imran collapses, the first ambulance turns back at an argument. The argument lasts longer than his cool-down.",
      scene:
        "By 10 a.m., the tablet of Meera shows three different heat flags for the same stretch of NH-24. The desk in Delhi paints the corridor amber. Ghaziabad stays green. The labor line in Noida has no update after dawn.\n\nA loader named Imran sits on a curb outside a logistics gate. His pulse is high. His water bottle is empty. The clinic van that Meera can dispatch serves only the pin code that funds her unit. Across the city line, the same asphalt cooks the same workers.\n\nNo shared early-warning fund exists. Each metro buys its own SMS blast. Each metro guards the contact list. When Imran collapses, the first ambulance turns back at a jurisdiction argument. The argument lasts longer than his cool-down window.\n\nMeera files the incident under her city. The other two cities do not see the incident. The night shifts run on split thresholds. The heat does not respect the map.",
      briefMd:
        "## The place\n\nBy 10 a.m., the tablet of Meera shows three different heat flags for the same stretch of NH-24. The desk in Delhi paints the corridor amber. Ghaziabad stays green. The labor line in Noida has no update after dawn.\n\nA loader named Imran sits on a curb outside a logistics gate. His pulse is high. His water bottle is empty. The clinic van that Meera can dispatch serves only the pin code that funds her unit. Across the city line, the same asphalt cooks the same workers.\n\n## The bigger problem\n\nNo shared early-warning fund exists. Each metro buys its own SMS blast. Each metro guards the contact list. When Imran collapses, the first ambulance turns back at a jurisdiction argument. The argument lasts longer than his cool-down window.\n\nMeera files the incident under her city. The other two cities do not see the incident. The night shifts run on split thresholds. The heat does not respect the map.\n\n## Your job\n\nSend one heat warning to Imran before his cool-down window ends.",
      stakeholder: "Metro public-health and labor desks",
      crisisMeters: { local: { label: "Heat illness", description: "Heat illness hits Imran on the curb when his water bottle is empty." }, global: { label: "Split alerts", description: "Split alerts show amber in Delhi and green in Ghaziabad for one corridor." }, support: { label: "Budget fights", description: "Budget fights keep the clinic van inside the pin code that funds the unit." } },
      suggested: ["ai", "networks", "iot", "solar", "battery", "computing", "space"],
      suggestedWhy: {
        "ai": "A shared flag can show one heat level for the same stretch of NH-24.",
        "networks": "A common channel can send the heat warning past the city line.",
        "iot": "A curb sensor can show the heat on Imran before his pulse rises.",
        "solar": "A sun cover can lower heat on the curb where Imran sits.",
        "battery": "A power pack can keep water cool for the loader on the curb.",
        "computing": "One desk file can show the incident to Delhi, Ghaziabad, and Noida.",
        "space": "A sky read can show one heat wave over the NH-24 corridor.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Saint-Louis to Kayar landing beaches, Senegal"],
      title: "Nets empty, logbooks closed",
      summary: "Awa counts seven sacks at the landing. Last season she counted twenty sacks. The skippers close their notebooks. The Saint-Louis boats report only to their own chief. The children on the shore wait for fish. The fish do not come.",
      scene:
        "Awa counts seven sacks at the landing. Last season she counted twenty sacks. The cooperative board wants the morning total for the shared cold room. The skippers from Kayar shrug. The skippers close their notebooks.\n\nThe Saint-Louis boats land a few kilometers north. The boats report only to their own landing chief. The industrial trawlers farther out leave no local mark.\n\nNo common catch ledger exists. Each beach guesses the stock alone. Each beach races the next tide. The crew of Awa works longer nights for thinner pay.\n\nThe children on the shore wait for fish. The fish do not come.\n\nThe marine desk in Dakar asks for numbers. The numbers do not arrive in one file. The trust thins with the nets. A young captain offers a photo of his hold on a private chat. He deletes the photo because a rival cooperative can see the chat.\n\nThe sea is one system. The logbooks are many locked rooms.",
      briefMd:
        "## The place\n\nAwa counts seven sacks at the landing. Last season she counted twenty sacks. The cooperative board wants the morning total for the shared cold room. The skippers from Kayar shrug. The skippers close their notebooks.\n\nThe Saint-Louis boats land a few kilometers north. The boats report only to their own landing chief. The industrial trawlers farther out leave no local mark.\n\nThe crew of Awa works longer nights for thinner pay. The children on the shore wait for fish. The fish do not come.\n\n## The bigger problem\n\nNo common catch ledger exists. Each beach guesses the stock alone. Each beach races the next tide. The marine desk in Dakar asks for numbers. The numbers do not arrive in one file. The trust thins with the nets.\n\nA young captain offers a photo of his hold on a private chat. He deletes the photo because a rival cooperative can see the chat. The sea is one system. The logbooks are many locked rooms.\n\n## Your job\n\nGive the marine desk in Dakar one catch file before the next tide.",
      stakeholder: "Coastal landing cooperatives and marine desks",
      crisisMeters: { local: { label: "Empty nets", description: "Empty nets leave seven sacks where last season Awa counted twenty sacks." }, global: { label: "Hidden catch", description: "Hidden catch stays in closed notebooks and in boats that report only to one chief." }, support: { label: "Distrust", description: "Distrust makes a young captain delete the photo of his hold." } },
      suggested: ["iot", "networks", "ai", "space", "drones", "crypto", "computing"],
      suggestedWhy: {
        "iot": "A landing scale can send the sack count to the shared cold room.",
        "networks": "A coast link can carry catch numbers from Kayar to Saint-Louis.",
        "ai": "A stock view can show when seven sacks replace twenty sacks.",
        "space": "A sky view can show trawlers that leave no local mark.",
        "drones": "A shore flight can count boats between Saint-Louis and Kayar.",
        "crypto": "A private seal can share a hold photo without a rival chat.",
        "computing": "One catch file can give the marine desk in Dakar the morning numbers.",
      },
      visionTheme: "ocean-city",
    },
    {
      places: ["Kisumu–Homa Bay lakeshore belt, Lake Victoria"],
      title: "Shore towns, separate water truths",
      summary: "Nurse Otieno bags a stool sample and walks it to the Kisumu clinic fridge. The fridge label says Kisumu only. Homa Bay keeps its water logs closed. Oral salts are necessary for the child at this time. Oral salts are necessary for the next child if the lake stays split.",
      scene:
        "Nurse Otieno bags a stool sample from a child with bloody diarrhea. He walks the sample to the clinic fridge. The fridge label says Kisumu only.\n\nThe water desk in Homa Bay sits an hour down the shore. The desk runs its own turbidity logs. The desk does not open the feed to the Kisumu dashboard. Yesterday a bloom sat in the same bay. The two towns drink from that bay. The mothers fill jerrycans at the same dawn edge.\n\nThe ward of Otieno fills cots. The neighboring municipality posts water normal on a channel. His patients do not see that channel. Each council bought sensors with project money. The project money ends at the ward line.\n\nA shared raw reading shows which intake failed first. The rivalry over tourism grants keeps the files closed. Oral salts are necessary for the child at this time. Oral salts are necessary for the next child if the lake signal stays split.",
      briefMd:
        "## The place\n\nNurse Otieno bags a stool sample from a child with bloody diarrhea. He walks the sample to the clinic fridge. The fridge label says Kisumu only.\n\nThe water desk in Homa Bay sits an hour down the shore. The desk runs its own turbidity logs. The desk does not open the feed to the Kisumu dashboard. Yesterday a bloom sat in the same bay. The two towns drink from that bay. The mothers fill jerrycans at the same dawn edge.\n\nThe ward of Otieno fills cots. The neighboring municipality posts water normal on a channel. His patients do not see that channel.\n\n## The bigger problem\n\nEach council bought sensors with project money. The project money ends at the ward line. A shared raw reading shows which intake failed first. The rivalry over tourism grants keeps the files closed.\n\nOral salts are necessary for the child at this time. Oral salts are necessary for the next child if the lake signal stays split.\n\n## Your job\n\nShow the lake signal to Kisumu and Homa Bay before the next child falls ill.",
      stakeholder: "Lakeshore municipal water and clinic leads",
      crisisMeters: { local: { label: "Sick days", description: "Sick days fill cots in the ward of Otieno after the bloom in the bay." }, global: { label: "Data walls", description: "Data walls keep the Homa Bay logs off the Kisumu dashboard." }, support: { label: "Local rivalry", description: "Local rivalry over tourism grants keeps the water files closed." } },
      suggested: ["iot", "gene-sequencing", "networks", "ai", "drones", "computing", "crypto"],
      suggestedWhy: {
        "iot": "A shore sensor can show turbidity to Kisumu and Homa Bay.",
        "gene-sequencing": "A lab read can tie the stool sample to the bloom in the bay.",
        "networks": "An open feed can put the Homa Bay logs on the Kisumu dashboard.",
        "ai": "A bay alert can show which intake failed first.",
        "drones": "A shore flight can show the bloom before the mothers fill jerrycans.",
        "computing": "One water file can cross the ward line when project money ends.",
        "crypto": "A shared seal can open the water files without a tourism fight.",
      },
      visionTheme: "care-city",
    }
  ],

  radicalization: [
    {
      places: ["Riverside Mill Row Gate"],
      title: "Layoff notice, new names on the wall",
      summary: "Marta folds the pink slip against the mill-row gate. Wet paint lists three family names under an arrow to the temp housing.\n\nThe rent is already late on half the row. The union-room clip blames the new hires.",
      scene:
        "Marta folds the pink slip against the mill-row gate before the second shift horn. The paint stays wet on the brick. Someone added three family names under a crude arrow. The arrow points toward the temp housing block. Her steward badge catches the floodlight.\n\nInside the union room, the phones show the same thirty-second clip. A voice on the shaky footage blames the new hires for the line shutdown. No person filmed the empty order book.\n\nThe rent is already late on half the row. The children eat cereal for dinner. The parents refresh group chats that reward the sharpest insult. The old after-shift card games thinned when the overtime died. The mentors clock out and go home tired.\n\nA cousin asks Marta which side the stewards support. She holds a stack of counseling vouchers. She has no answer that pays a bill. The pipeline does not wait for a better story.",
      briefMd:
        "## The place\nMarta folds the pink slip against the mill-row gate before the second shift horn. The paint stays wet on the brick. Someone added three family names under a crude arrow. The arrow points toward the temp housing block. Her steward badge catches the floodlight.\n\nInside the union room, the phones show the same thirty-second clip. A voice on the shaky footage blames the new hires for the line shutdown. No person filmed the empty order book.\n\nThe rent is already late on half the row. The children eat cereal for dinner. The parents refresh group chats that reward the sharpest insult. The old after-shift card games thinned when the overtime died. The mentors clock out and go home tired.\n\nA cousin asks Marta which side the stewards support. She holds a stack of counseling vouchers. She has no answer that pays a bill.\n\n## The bigger problem\nThe blame clip gives the row a target. The empty order book stays off the phones. The wall already holds a list. The pipeline does not wait for a better story.\n\nMill-row shop stewards and family counselors hold vouchers. A voucher does not pay the late rent.\n\n## Your job\nBuild a real off-ramp for the row when the notice hits and the wall already holds a list.",
      stakeholder: "Mill-row shop stewards and family counselors",
      crisisMeters: { local: { label: "Missed Rent", description: "Late rent hits half the mill row while the children eat cereal and the parents wait on a bill answer." }, global: { label: "Blame Clips", description: "A thirty-second clip in the union room blames the new hires and leaves the empty order book off camera." }, support: { label: "Thin Bonds", description: "The card games and the mentors thin out, and a cousin asks which side the stewards support." } },
      suggested: ["ai", "networks", "vr", "computing", "robots"],
      suggestedWhy: {
        "ai": "Ai can help Marta separate the blame clip from the empty order book.",
        "networks": "Networks can carry a calm fact into family chats on the mill row.",
        "vr": "Vr can show counselors the gate, the wet list, and the temp housing block.",
        "computing": "Computing can track late rent and counseling vouchers for the steward room.",
        "robots": "Robots can stand at the mill-row gate beside the wet name list.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Cedar Hollow Parish Hall"],
      title: "Closed clinic, open airwaves",
      summary: "Deacon Ruth unlocks the parish hall and counts the empty folding chairs. The mobile clinic van will not come this month.\n\nA mother with a feverish toddler waits. A pickup in the lot names the last nurse on air.",
      scene:
        "Deacon Ruth unlocks the parish hall and counts the empty folding chairs. The mobile clinic van will not come this month. The fuel money went to patch the roof.\n\nA pickup idles in the lot. The driver keeps the AM dial on one host. The host names the last nurse of the clinic as proof that outsiders took the care. A mother with a feverish toddler waits in the lot. The county desk turned the mother away two times for missing papers.\n\nThe volunteers brew coffee. The volunteers keep a paper list for insulin rides. The list shrinks when families do not answer unknown numbers.\n\nHate talk fills the hours of the old exam room. Trust frays between the longtime pew holders and the newer trailers past the creek. The care circle of Ruth can offer soup and a ride. The care circle cannot reopen the locked exam door. One missed antibiotic becomes a story that another person owns on air.",
      briefMd:
        "## The place\nDeacon Ruth unlocks the parish hall and counts the empty folding chairs. The mobile clinic van will not come this month. The fuel money went to patch the roof.\n\nA pickup idles in the lot. The driver keeps the AM dial on one host. The host names the last nurse of the clinic as proof that outsiders took the care. A mother with a feverish toddler waits in the lot. The county desk turned the mother away two times for missing papers.\n\nThe volunteers brew coffee. The volunteers keep a paper list for insulin rides. The list shrinks when families do not answer unknown numbers.\n\nHate talk fills the hours of the old exam room. Trust frays between the longtime pew holders and the newer trailers past the creek.\n\n## The bigger problem\nThe closed clinic leaves an open microphone in the lot. A host names the last nurse as the cause of lost care. One missed antibiotic becomes a story that another person owns on air.\n\nThe care circle can offer soup and a ride. The care circle cannot reopen the locked exam door.\n\n## Your job\nOpen a care path that stays available when the clinic van does not come and the radio blames the nurse.",
      stakeholder: "Parish care circle and mobile clinic volunteers",
      crisisMeters: { local: { label: "Sick Delays", description: "A feverish toddler waits at the parish hall after the county desk turned the mother away two times." }, global: { label: "Hate Radio", description: "A pickup in the lot keeps the AM dial on a host who blames the last nurse." }, support: { label: "Closed Doors", description: "The care circle can offer soup and a ride, but the exam door stays locked this month." } },
      suggested: ["networks", "ai", "transportation", "solar", "computing"],
      suggestedWhy: {
        "networks": "Networks can link the care circle with families who do not answer unknown numbers.",
        "ai": "Ai can mark hate radio claims about the last nurse for the parish hall.",
        "transportation": "Transportation can move a feverish toddler when the clinic van does not come.",
        "solar": "Solar can lower fuel cost for parish trips after the roof patch.",
        "computing": "Computing can store the paper list of insulin rides for the volunteers.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["East Line Night Depot"],
      title: "Cut routes, louder break room",
      summary: "Jamal racks his punch card at the East Line night depot. Two more owl routes died on the board this week.\n\nA cartoon with a target covers the mutual-aid flyer. A fist hits a locker.",
      scene:
        "Jamal racks his punch card at the East Line night depot. He hears the argument before he sees the argument. Two more owl routes died on the board this week.\n\nThe break room television loops a clip. The clip blames soft shifts and riders from the south lots. No person loops the budget sheet.\n\nThe drivers split along old crew lines. Someone taped a cartoon over the mutual-aid flyer. The cartoon has a target on the cartoon. Exhaustion sits in the shoulders. The spouses text about second jobs. A probationary driver asks which group the loud clip names.\n\nThe steward circle of Jamal runs ride shares for late parents. The circle keeps a quiet fund for missed child care. The fund cannot staff a cut line. Each canceled trip becomes proof for the loudest voice in the room. A fist hits a locker. The night supervisor looks away.",
      briefMd:
        "## The place\nJamal racks his punch card at the East Line night depot. He hears the argument before he sees the argument. Two more owl routes died on the board this week.\n\nThe break room television loops a clip. The clip blames soft shifts and riders from the south lots. No person loops the budget sheet.\n\nThe drivers split along old crew lines. Someone taped a cartoon over the mutual-aid flyer. The cartoon has a target on the cartoon. Exhaustion sits in the shoulders. The spouses text about second jobs. A probationary driver asks which group the loud clip names.\n\nThe steward circle of Jamal runs ride shares for late parents. The circle keeps a quiet fund for missed child care.\n\n## The bigger problem\nCut routes leave an empty board. The loud clip names soft shifts and south-lot riders. No person shows the budget sheet. A cartoon with a target covers the mutual-aid flyer.\n\nA fist hits a locker. The night supervisor looks away. The fund cannot staff a cut line.\n\n## Your job\nHold crew trust when the schedule shrinks and the scapegoat drawing already sits in the room.",
      stakeholder: "Transit mutual-aid stewards",
      crisisMeters: { local: { label: "Exhaustion", description: "Exhaustion sits in the shoulders at the night depot while spouses text about second jobs." }, global: { label: "Scapegoats", description: "The break room clip names soft shifts and south-lot riders and skips the budget sheet." }, support: { label: "Split Crews", description: "Old crew lines split the drivers, and a target cartoon covers the mutual-aid flyer." } },
      suggested: ["ai", "networks", "computing", "crypto", "transportation"],
      suggestedWhy: {
        "ai": "Ai can contrast the blame clip with the budget sheet in the break room.",
        "networks": "Networks can link split crews to the quiet child care fund.",
        "computing": "Computing can show cut owl routes next to the mutual-aid flyer.",
        "crypto": "Crypto can protect the quiet child care fund from a public show.",
        "transportation": "Transportation can share rides for late parents when owl routes die.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["North Stand Supporters Club"],
      title: "Standing terrace, softer recruiters",
      summary: "Lena locks the supporters club kitchen after the final whistle. Three boys on the back steps do not talk about the match.\n\nA private chat praises the terrace shove that spilled into the street.",
      scene:
        "After the final whistle, Lena locks the kitchen of the supporters club. She finds three boys on the back steps. The boys do not talk about the match.\n\nA private chat sends calm praise for a stand during the terrace shove. The shove spilled into the street. Last month a mentor coach moved cities for work. The Tuesday skills night lost the anchor.\n\nStreet fear walks home with younger fans who saw the shove and the sirens. The recruiters do not shout. The recruiters send match memes. The slower messages name the persons who belong in the North Stand.\n\nThe trust of Lena holds the keys, the tea, and a battered first-aid kit. She can ban a scarf. She cannot sit in each thread at midnight. One boy laughs too hard at a joke. The joke names a rival school as the enemy. The pipeline sounds like friendship until the pipeline shows the enemy joke.",
      briefMd:
        "## The place\nAfter the final whistle, Lena locks the kitchen of the supporters club. She finds three boys on the back steps. The boys do not talk about the match.\n\nA private chat sends calm praise for a stand during the terrace shove. The shove spilled into the street. Last month a mentor coach moved cities for work. The Tuesday skills night lost the anchor.\n\nStreet fear walks home with younger fans who saw the shove and the sirens. The recruiters do not shout. The recruiters send match memes. The slower messages name the persons who belong in the North Stand.\n\nThe trust of Lena holds the keys, the tea, and a battered first-aid kit. One boy laughs too hard at a joke. The joke names a rival school as the enemy.\n\n## The bigger problem\nA soft recruiter path starts with match memes and calm praise. The path then names an enemy school. A lost mentor leaves the Tuesday skills night without an anchor.\n\nLena can ban a scarf. Lena cannot sit in each midnight thread.\n\n## Your job\nDesign belonging that outruns the soft invite after the lights die on the terrace.",
      stakeholder: "Supporters’ trust youth workers",
      crisisMeters: { local: { label: "Street Fear", description: "Street fear walks home with younger fans who saw the terrace shove and the sirens." }, global: { label: "Chat Pipeline", description: "A private chat praises the shove, then slower messages name who belongs in the North Stand." }, support: { label: "Lost Mentors", description: "A mentor coach moved cities last month, and the Tuesday skills night lost the anchor." } },
      suggested: ["vr", "networks", "ai", "iot", "computing"],
      suggestedWhy: {
        "vr": "Vr can show the terrace shove and the street sirens to a youth worker.",
        "networks": "Networks can show Lena a private chat before midnight praise turns sharp.",
        "ai": "Ai can flag a soft invite that starts as a match meme.",
        "iot": "Iot can mark the club steps and the terrace after the lights die.",
        "computing": "Computing can hold key notes, tea notes, and first-aid records for the trust.",
      },
      visionTheme: "learn-city",
    }
  ],

  fgm: [
    {
      places: ["Abnub marriage-notary row, Minya Governorate"],
      title: "Stamps still bless the cut",
      summary: "Nour stands in the notary queue with her daughter's marriage file. The clerk's stamp still waits for the purity paper. Without that paper the match collapses. A rushed cut in a side room causes fever, missed exams, and lost wages for one week.",
      scene:
        "Nour stands in the notary queue at the Abnub marriage-notary row in Minya Governorate. She holds her daughter's school ID and a folded marriage file. The clerk's stamp hangs over the counter like a small verdict. A cousin leans in. The cousin says the groom's family still wants the purity paper before the date is set.\n\nWithout the cut, the match collapses. The girl's name travels the lane as trouble. The mothers' union pays secondary fees and night study lamps. The union cannot outrun the stamp.\n\nCutters keep side rooms near the marriage offices. Families pay the cutters first. Then the families bring quiet proof. The notary accepts that proof without questions. Honor rules control the paperwork.\n\nInfections follow the rushed work. Fever and urine pain keep a girl out of class for weeks. One mother loses a week of piecework wages. She sits outside a clinic. The clinic has no private exam hour for girls.\n\nNour's daughter asks if the stamp can wait until after exams. The union can shield a child for a season. The union cannot change who certifies a bride.",
      briefMd:
        "## The place\nNour stands in the notary queue at the Abnub marriage-notary row in Minya Governorate. She holds her daughter's school ID and a folded marriage file. The clerk's stamp hangs over the counter. A cousin says the groom's family still wants the purity paper before the date is set.\n\nWithout the cut, the match collapses. The girl's name travels the lane as trouble. The mothers' union pays secondary fees and night study lamps. The union cannot outrun the stamp.\n\nCutters keep side rooms near the marriage offices. Infections follow the rushed work. Fever and urine pain keep a girl out of class for weeks. One mother loses a week of piecework wages outside a clinic with no private exam hour.\n\n## The bigger problem\nHonor rules control the paperwork. Families pay the cutters first. Then the families bring quiet proof. The notary accepts that proof without questions. The union can shield a child for a season. The union cannot change who certifies a bride.\n\n## Your job\nOpen a marriage file without a purity paper that buys harm.",
      stakeholder: "Girls' secondary school mothers' union",
      crisisMeters: { local: { label: "Infections", description: "A rushed cut brings fever and urine pain. Girls stay out of class for weeks. One mother loses a week of piecework wages outside a clinic with no private exam hour." }, global: { label: "Cutter Fees", description: "Cutters keep side rooms near the marriage offices. Families pay those cutters before the notary stamp." }, support: { label: "Honor Rules", description: "Honor rules tie the purity paper to the marriage file. A refused cut sends the girl's name down the lane as trouble." } },
      suggested: ["networks", "ai", "crypto", "vr", "computing", "solar"],
      suggestedWhy: {
        "networks": "Networks can link the mothers' union to a clinic with a private exam hour.",
        "ai": "Ai can show where a marriage file still waits on a purity paper.",
        "crypto": "Crypto can record cutter fees that families pay before the notary stamp.",
        "vr": "Vr can show personnel the notary queue and the stamp over the file.",
        "computing": "Computing can track side-room cuts and weeks that girls stay out of class.",
        "solar": "Solar can power night study lamps when girls miss class after a cut.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Makump grove edge, Tonkolili District"],
      title: "Grove dues open the bush",
      summary: "Aminata counts rice sacks at the mutual-aid shed. The grove fee comes due before the rains lock the path. Her niece is twelve. Families who delay lose a turn at the shared thresher.",
      scene:
        "Aminata counts rice sacks at the mutual-aid shed on the Makump grove edge in Tonkolili District. The society drum starts beyond the mango line. Her niece is twelve. The aunties say the grove fee comes due before the rains lock the path.\n\nA refusal makes the circle quiet. That circle shares seed and harvest labor. Belonging is the wage here.\n\nGirls come back from the bush with wound pain. That pain makes a squat at the mill hard. Some girls miss two planting weeks.\n\nThe dues are not only money. The dues are the ticket into the women's labor net. That net keeps paddies wet and debts small. Cutters and initiators collect fees before the ceremony. They pass a part of the fee up the society chain.\n\nFamilies who delay lose a turn at the shared thresher. Aminata can hide one child for a season with a story about a sick relative. She cannot farm alone if the mutual aid turns its back.\n\nHands are necessary for the rice circle. The grove still sells membership through the cut.",
      briefMd:
        "## The place\nAminata counts rice sacks at the mutual-aid shed on the Makump grove edge in Tonkolili District. The society drum starts beyond the mango line. Her niece is twelve. The aunties say the grove fee comes due before the rains lock the path.\n\nA refusal makes the circle quiet. The circle shares seed and harvest labor. Belonging is the wage here. Girls come back from the bush with wound pain. Some girls miss two planting weeks.\n\n## The bigger problem\nThe grove still sells membership through the cut. Cutters and initiators collect fees before the ceremony. They pass a part of the fee up the society chain. Families who delay lose a turn at the shared thresher. Aminata cannot farm alone if the mutual aid turns its back.\n\n## Your job\nHold mutual aid without a grove cut that buys belonging.",
      stakeholder: "Women rice growers' mutual-aid circle",
      crisisMeters: { local: { label: "Wound Pain", description: "Girls come back from the bush with wound pain. That pain makes a squat at the mill hard. Some girls miss two planting weeks." }, global: { label: "Society Dues", description: "Cutters and initiators collect grove fees before the ceremony. They pass a part of the fee up the society chain." }, support: { label: "Belonging Fear", description: "A refusal makes the seed-and-labor circle quiet. Belonging is the wage. A delay also loses a turn at the shared thresher." } },
      suggested: ["solar", "networks", "ai", "iot", "print3d", "crypto"],
      suggestedWhy: {
        "solar": "Solar can dry rice at the shed when rains lock the path.",
        "networks": "Networks can keep seed-share messages open when a family delays the grove fee.",
        "ai": "Ai can map society dues that move up the chain before the ceremony.",
        "iot": "Iot can signal a turn at the shared thresher after a fee delay.",
        "print3d": "Print3d can make a low mill seat when wound pain makes a squat hard.",
        "crypto": "Crypto can trace grove dues from cutters and initiators up the society chain.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Borama central women’s market lanes, Awdal"],
      title: "Dawn bookings in the women’s lanes",
      summary: "Hawa unlocks the health cooperative kiosk before the spice stalls open. Three new names sit on the cutter's slate under the tea crate. A trader's daughter labors two stalls down with a tear from an old cut.",
      scene:
        "Hawa unlocks the health cooperative kiosk in the Borama central women's market lanes in Awdal before the spice stalls open. She finds three new names on the cutter's slate under the tea crate. Dawn is the booking hour. Mothers arrange quiet house visits while traders unload stock.\n\nA trader's daughter labors two stalls down with a tear from an old cut. The midwife says the next birth can tear wider. Birth injury is concrete in these lanes. Blood marks a plastic sheet behind a curtain.\n\nThe cutters are kin. They earn between market days when cloth sales thin. In-laws still demand the practice before a bride moves in. A refused demand can freeze a young woman's stall credit.\n\nThe cooperative can stock clean pads and teach danger signs. The cooperative cannot replace the income line that fills the dawn slate. Hawa's niece is on a waiting list that Hawa did not write. Bookings rise in one hard season of low sales. Care after the harm does not stop the order book.",
      briefMd:
        "## The place\nHawa unlocks the health cooperative kiosk in the Borama central women's market lanes in Awdal before the spice stalls open. Three new names sit on the cutter's slate under the tea crate. Dawn is the booking hour. Mothers arrange quiet house visits while traders unload stock.\n\nA trader's daughter labors two stalls down with a tear from an old cut. The midwife says the next birth can tear wider. Blood marks a plastic sheet behind a curtain.\n\nThe cutters are kin. They earn between market days when cloth sales thin. In-laws still demand the practice before a bride moves in. A refused demand can freeze a young woman's stall credit.\n\n## The bigger problem\nThe cooperative can stock clean pads and teach danger signs. The cooperative cannot replace the income line that fills the dawn slate. Hawa's niece is on a waiting list that Hawa did not write. Bookings rise in one hard season of low sales. Care after the harm does not stop the order book.\n\n## Your job\nSeparate stall credit from a dawn list that prices a girl's body.",
      stakeholder: "Market traders' health cooperative",
      crisisMeters: { local: { label: "Birth Injury", description: "A trader's daughter labors with a tear from an old cut. The midwife says the next birth can tear wider. Blood marks a plastic sheet behind a curtain." }, global: { label: "Cutter Income", description: "Kin cutters earn between market days when cloth sales thin. That income line fills the dawn slate under the tea crate." }, support: { label: "In-Law Demand", description: "In-laws demand the practice before a bride moves in. A refused demand can freeze a young woman's stall credit." } },
      suggested: ["ai", "networks", "solar", "battery", "computing", "drones"],
      suggestedWhy: {
        "ai": "Ai can read the dawn slate and show when bookings rise in a hard season.",
        "networks": "Networks can link the cooperative with a midwife when a tear risks a wider birth injury.",
        "solar": "Solar can power the kiosk before the spice stalls open at dawn.",
        "battery": "Battery can keep kiosk power on when cloth sales thin between market days.",
        "computing": "Computing can separate stall credit records from the cutter slate at dawn.",
        "drones": "Drones can carry clean pads into lanes when a trader cannot leave a birth injury.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Ranya foothill wedding courtyards, Sulaymaniyah Governorate"],
      title: "Elders still name the pure bride",
      summary: "Sara erases the board after the last period as drums rise below the school ridge. An elder names the pure bride again. A promising student accepts an early engagement to stop the rumors. Her training folder closes.",
      scene:
        "Sara erases the board after the last period at a school above the Ranya foothill wedding courtyards in Sulaymaniyah Governorate. She hears drums from a courtyard below the school ridge. An elder names the pure bride again.\n\nGirls in her class go quiet when the word purity enters the lesson on civic rights. One student shifts on the bench every few minutes. Chronic pain makes a full exam block harder than the test.\n\nThe school tells teachers not to shame families. The school also tells teachers not to name the cut in the staff room if a father sits on the parent council. Purity talk travels from wedding courtyards into engagement talks. That talk then decides who gets praise as marriageable.\n\nSchool silence leaves the practice uncounted. The protection league runs after-hours study for girls who miss days. The same elders still bless matches by reputation. A promising student accepts an early engagement to stop the rumors. Her training folder closes.\n\nSara can tutor through pain. She cannot grade a courtyard custom that still certifies worth.",
      briefMd:
        "## The place\nSara erases the board after the last period at a school above the Ranya foothill wedding courtyards in Sulaymaniyah Governorate. She hears drums from a courtyard below the school ridge. An elder names the pure bride again.\n\nGirls in her class go quiet when the word purity enters the lesson on civic rights. One student shifts on the bench every few minutes. Chronic pain makes a full exam block harder than the test.\n\nThe protection league runs after-hours study for girls who miss days. The same elders still bless matches by reputation. A promising student accepts an early engagement to stop the rumors. Her training folder closes.\n\n## The bigger problem\nThe school tells teachers not to name the cut in the staff room if a father sits on the parent council. School silence leaves the practice uncounted. Purity talk still certifies worth from the courtyard. Sara can tutor through pain. She cannot grade that courtyard custom.\n\n## Your job\nProtect the girl next door when a school refuses the purity script.",
      stakeholder: "Young women teachers' protection league",
      crisisMeters: { local: { label: "Chronic Pain", description: "Chronic pain makes one student shift on the bench every few minutes. A full exam block is harder than the test." }, global: { label: "Purity Talk", description: "An elder names the pure bride in a courtyard below the school ridge. Purity talk moves into engagement talks and into praise." }, support: { label: "School Silence", description: "The school tells teachers not to name the cut if a father sits on the parent council. Silence leaves the practice uncounted." } },
      suggested: ["vr", "networks", "ai", "computing", "iot", "transportation"],
      suggestedWhy: {
        "vr": "Vr can show a courtyard naming and how purity talk enters a civic-rights lesson.",
        "networks": "Networks can link the protection league with girls who miss days from chronic pain.",
        "ai": "Ai can count purity words in lessons when school silence leaves the practice uncounted.",
        "computing": "Computing can hold a training folder open after an early engagement.",
        "iot": "Iot can note bench shifts in an exam block when chronic pain makes the test hard.",
        "transportation": "Transportation can carry a girl to after-hours study when courtyard drums start.",
      },
      visionTheme: "learn-city",
    }
  ],

  "short-termism": [
    {
      places: ["Salt Creek Mangrove Fringe"],
      title: "Cash kilns thin the storm belt",
      summary: "Amina rakes the last cool charcoal from the kiln of her family. She bags the charcoal for the market truck. The creek mouth looks thinner than the last wet season.\n\nA spring tide pushes past the old marker posts. The uncle of Amina lost his boat shed last year. Water climbed the bank in one night.",
      scene:
        "Before dawn, Amina rakes the last cool charcoal from the kiln of her family. She bags the charcoal for the market truck. The bags pay the school fees this month.\n\nThe creek mouth at Salt Creek Mangrove Fringe looks thinner than the last wet season. A spring tide pushes farther inland than the old marker posts. The crab pots sit in the mud. Young mangrove roots held that mud in past seasons.\n\nThe council pays by the bag. The council does not pay for the trees that stand. The kiln crews cut the fringe because the cash arrives this week. Storm insurance does not arrive this week.\n\nEach dry-season burn clears another strip. That strip slowed the surge in past years. The uncle of Amina lost his boat shed last year. Water climbed the bank in one night.\n\nAmina knows the next big blow will find less green wall between the creek and the houses. The permit clerk stamps cut permits at a high speed. The plans for new trees move at a low speed.",
      briefMd:
        "## The place\n\nSalt Creek Mangrove Fringe holds the kiln of Amina and the creek mouth. Before dawn, Amina rakes the last cool charcoal. She bags the charcoal for the market truck. The bags pay the school fees this month.\n\nThe creek mouth looks thinner than the last wet season. A spring tide pushes farther inland than the old marker posts. The crab pots sit in the mud. Young mangrove roots held that mud in past seasons.\n\nThe uncle of Amina lost his boat shed last year. Water climbed the bank in one night. Amina knows the next big blow will find less green wall between the creek and the houses.\n\n## The bigger problem\n\nThe council pays by the bag. The council does not pay for the trees that stand. The kiln crews cut the fringe because the cash arrives this week. Storm insurance does not arrive this week. Each dry-season burn clears another strip. That strip slowed the surge in past years.\n\nThe permit clerk stamps cut permits at a high speed. The plans for new trees move at a low speed.\n\n## Your job\n\nKeep the school fees and the mangrove wall for the next storm.",
      stakeholder: "Creek-side fishers and kiln workers’ council",
      crisisMeters: { local: { label: "Flood water", description: "Spring tide water moves past the old marker posts. The same water climbed the bank in one night." }, global: { label: "Charcoal cash", description: "Charcoal cash arrives this week and pays the school fees by the bag." }, support: { label: "Permit race", description: "The permit clerk stamps cut permits at a high speed. The plans for new trees move at a low speed." } },
      suggested: ["iot", "drones", "solar", "ai", "networks", "materials", "crypto"],
      suggestedWhy: {
        "iot": "A sensor net can show tide height at the creek mouth.",
        "drones": "A flight survey can map each lost strip of the mangrove fringe.",
        "solar": "Solar heat can dry charcoal with less wood from the fringe.",
        "ai": "A simple model can compare bag pay with surge loss.",
        "networks": "A local link can share tide marks with the council.",
        "materials": "A hot kiln wall can hold heat with less fringe wood.",
        "crypto": "A shared record can pay crews for trees that stand.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Hillside Polytechnic Annex"],
      title: "Exam scores, locked workshops",
      summary: "Mr. Okello unlocks the theory wing. He leaves the workshop chain in place. The class this day drills past papers for the board exam. The lathes sit under dust covers.\n\nRuth can recite the welding symbols. Ruth did not run a bead that holds under load.",
      scene:
        "Mr. Okello unlocks the theory wing at Hillside Polytechnic Annex. He leaves the workshop chain in place. The class this day drills past papers for the board exam. The lathes sit under dust covers.\n\nLast term the parent board froze the tool budgets. The school hired two more exam coaches. The scores rose. Employers send apprentices back. Those apprentices cannot hold a tolerance on a real part.\n\nThe annex earns the grant on pass rates. The school publishes the pass rates each spring. Repair hours do not appear on that sheet. Stock metal does not appear on that sheet.\n\nRuth is a second-year student. Ruth can recite the welding symbols. Ruth did not run a bead that holds under load.\n\nThe district inspector visits. The locked doors look tidy. A local clinic asks for a bracket repair. The shop stays closed. The mother of Ruth paid fees for a trade. The calendar pays for marks.",
      briefMd:
        "## The place\n\nHillside Polytechnic Annex has a theory wing and a workshop. Mr. Okello unlocks the theory wing. He leaves the workshop chain in place. The class this day drills past papers for the board exam. The lathes sit under dust covers.\n\nRuth is a second-year student. Ruth can recite the welding symbols. Ruth did not run a bead that holds under load. The mother of Ruth paid fees for a trade.\n\nThe district inspector visits. The locked doors look tidy. A local clinic asks for a bracket repair. The shop stays closed.\n\n## The bigger problem\n\nLast term the parent board froze the tool budgets. The school hired two more exam coaches. The scores rose. Employers send apprentices back. Those apprentices cannot hold a tolerance on a real part.\n\nThe annex earns the grant on pass rates. The school publishes the pass rates each spring. Repair hours do not appear on that sheet. Stock metal does not appear on that sheet. The calendar pays for marks.\n\n## Your job\n\nKeep board marks this year and skill for a real part.",
      stakeholder: "Instructors, apprentices, and parent board",
      crisisMeters: { local: { label: "Broken shops", description: "The locked workshop leaves the lathes under dust covers. The shop stays closed for a clinic repair." }, global: { label: "Budget freeze", description: "Last term the parent board froze the tool budgets for exam coaches." }, support: { label: "Skill gap", description: "Apprentices cannot hold a tolerance on a real part." } },
      suggested: ["print3d", "vr", "ai", "networks", "computing", "robots", "solar"],
      suggestedWhy: {
        "print3d": "A small printer can make a practice part when the lathe stays locked.",
        "vr": "A view trainer can show a weld path before a live bead.",
        "ai": "A coach model can mark a tolerance error on a practice part.",
        "networks": "A shop link can send a clinic repair request to the annex.",
        "computing": "A simple program can track repair hours beside the pass rates.",
        "robots": "A shop arm can guide a first bead under a set load.",
        "solar": "Roof power can run a lathe hour without a new coach budget.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Canal Row Tenements"],
      title: "Rent due, stairs failing",
      summary: "On collection Friday, caretaker Sita chalks a cracked stair tread. She knocks for the rent. The third-floor landing flexes under her shoe.\n\nA child on the second floor missed school after a fall on the loose nosing.",
      scene:
        "On collection Friday at Canal Row Tenements, caretaker Sita chalks a cracked stair tread. She knocks for the rent. The third-floor landing flexes under her shoe. The tenants hand the cash in envelopes.\n\nEviction notices arrive at a high speed. Repair crews arrive at a low speed. The agent of the landlord wires the money out on the same day. The money covers a short-term loan on another block.\n\nThe patch jobs use the cheap board. The cheap board passes a quick look. Mold marks the corners. Canal damp climbs the plaster.\n\nA child on the second floor missed school after a fall on the loose nosing. The tenants union keeps a photo log. Fines for patches without a permit cost a high sum. Fines for slow structure work cost a low sum.\n\nSita can name each family behind each door. She cannot name a fund for sound stairs. The rent for the month comes before the sound stairs.",
      briefMd:
        "## The place\n\nCanal Row Tenements stand by the canal. On collection Friday, caretaker Sita chalks a cracked stair tread. She knocks for the rent. The third-floor landing flexes under her shoe.\n\nThe tenants hand the cash in envelopes. Mold marks the corners. Canal damp climbs the plaster. A child on the second floor missed school after a fall on the loose nosing.\n\nSita can name each family behind each door. The tenants union keeps a photo log.\n\n## The bigger problem\n\nEviction notices arrive at a high speed. Repair crews arrive at a low speed. The agent of the landlord wires the money out on the same day. The money covers a short-term loan on another block.\n\nThe patch jobs use the cheap board. The cheap board passes a quick look. Fines for patches without a permit cost a high sum. Fines for slow structure work cost a low sum. Sita cannot name a fund for sound stairs. The rent for the month comes before the sound stairs.\n\n## Your job\n\nKeep the tenants housed and keep the stairs sound.",
      stakeholder: "Tenants’ union and block caretakers",
      crisisMeters: { local: { label: "Mold homes", description: "Mold marks the corners where canal damp climbs the plaster." }, global: { label: "Rent squeeze", description: "The tenants hand the cash because eviction notices arrive before repair crews." }, support: { label: "Patch fines", description: "Fines for patches without a permit cost a high sum. Fines for slow structure work cost a low sum." } },
      suggested: ["iot", "materials", "print3d", "ai", "networks", "drones", "solar"],
      suggestedWhy: {
        "iot": "A stair sensor can warn Sita when a tread cracks.",
        "materials": "A strong board can hold the landing under a tenant shoe.",
        "print3d": "A formed nosing can replace a loose stair edge.",
        "ai": "A cost model can compare patch fines with structure delay.",
        "networks": "A tenant link can share the photo log with the union.",
        "drones": "A roof survey can show canal damp on the plaster.",
        "solar": "Roof power can run a dry fan in a mold corner.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Blackwater Fen Allotments"],
      title: "Spring flood sold as dry fields",
      summary: "At first light, Hari walks the dike. He finds the pump on. The pump sends diesel into the field. The field is not firm at this time.\n\nOvernight rain sat on the peat. The peat lost depth for years. The neighbor of Hari lost a corner plot. The water does not drain to the old ditch line.",
      scene:
        "At first light, Hari walks the dike at Blackwater Fen Allotments. He finds the pump on. The pump sends diesel into the field. The field is not firm at this time.\n\nSeed catalogs promised a dry window. The lease clerk sold that window in writing. Overnight rain sat on the peat. The peat lost depth for years. The deep drains ran hard each spring.\n\nThe growers open the pumps early. The early greens meet contract dates. The early greens pay. Wet peat holds the land for a longer time. Each forced dry-down settles the beds a little more.\n\nThe neighbor of Hari lost a corner plot. Standing water took that plot. The water does not drain to the old ditch line.\n\nThe loan officer of the cooperative checks harvest calendars. The officer does not check soil height stakes. The path feels soft under the boots of Hari. The carts rolled on a firm path in past years.\n\nThe lease clause calls the ground arable. The clause does not name the peat that the pumps remove.",
      briefMd:
        "## The place\n\nBlackwater Fen Allotments sit behind the dike. At first light, Hari walks the dike. He finds the pump on. The pump sends diesel into the field. The field is not firm at this time.\n\nOvernight rain sat on the peat. The peat lost depth for years. The deep drains ran hard each spring. The path feels soft under the boots of Hari. The carts rolled on a firm path in past years.\n\nThe neighbor of Hari lost a corner plot. Standing water took that plot. The water does not drain to the old ditch line.\n\n## The bigger problem\n\nSeed catalogs promised a dry window. The lease clerk sold that window in writing. The growers open the pumps early. The early greens meet contract dates. The early greens pay. Each forced dry-down settles the beds a little more.\n\nWet peat holds the land for a longer time. The loan officer of the cooperative checks harvest calendars. The officer does not check soil height stakes. The lease clause calls the ground arable. The clause does not name the peat that the pumps remove.\n\n## Your job\n\nPay the growers this season and keep the peat for the next season.",
      stakeholder: "Fen growers’ cooperative",
      crisisMeters: { local: { label: "Sinking fields", description: "Each forced dry-down settles the beds a little more. The path feels soft under the boots." }, global: { label: "Pump bills", description: "The pump sends diesel into a field that is not firm." }, support: { label: "Lease clauses", description: "The lease clause calls the ground arable. The clause does not name the peat that the pumps remove." } },
      suggested: ["iot", "solar", "battery", "ai", "space", "networks", "synbio"],
      suggestedWhy: {
        "iot": "A soil stake sensor can show peat height after each pump day.",
        "solar": "Solar power can run a pump with less diesel on the dike.",
        "battery": "A stored charge can run the pump after the diesel stops.",
        "ai": "A season model can compare early green pay with peat loss.",
        "space": "A sky view can show beds that sink across the fen.",
        "networks": "A grower link can share ditch lines with the loan officer.",
        "synbio": "A peat mix can hold wet soil for a longer time.",
      },
      visionTheme: "food-city",
    }
  ],

  misinfo: [
    {
      places: ["Riverside Free Clinic Lobby"],
      title: "The nurse who never dialed",
      summary: "Marisol stands at the clinic lobby desk with a paper list of missed insulin pickups. Patients say that a nurse told them to wait, but no person on her shift dialed. Blood sugars climb at home. The lobby chairs stay half empty.",
      scene:
        "Marisol stands at the Riverside Free Clinic Lobby desk with a paper list of missed insulin pickups. She dials Mrs. Chen first. A calm voice answers in the clinic cadence. The voice says that the refill window moved to next month. The voice ends the call in a polite tone.\n\nMrs. Chen did not get that call. By noon three more patients say that a nurse told them to wait. Marisol checks the log. No person on her shift dialed those numbers.\n\nThe clinic callback line sits on a cheap voice tree. A phone can spoof that voice tree. Patients who believe the fake call skip the real desk. Blood sugars climb at home. The lobby chairs stay half empty.\n\nMarisol has one open afternoon and a stack of real names. The outreach budget still pays for reminder minutes. Personnel do not trust those minutes.",
      briefMd:
        "## The place\nMarisol stands at the Riverside Free Clinic Lobby desk. She holds a paper list of missed insulin pickups. She dials Mrs. Chen first. A calm voice answers in the clinic cadence. The voice says that the refill window moved to next month. The voice ends the call in a polite tone.\n\nMrs. Chen did not get that call. By noon three more patients say that a nurse told them to wait. Marisol checks the log. No person on her shift dialed those numbers.\n\nThe clinic callback line sits on a cheap voice tree. A phone can spoof that voice tree. Patients who believe the fake call skip the real desk. Blood sugars climb at home. The lobby chairs stay half empty.\n\nMarisol has one open afternoon and a stack of real names. The outreach budget still pays for reminder minutes. Personnel do not trust those minutes.\n\n## The bigger problem\nA local outfit sells appointment scrubber packs in a neighborhood chat. The packs hold cloned hold music and stolen extension names. The packs also hold scripts for refill week. The lie uses the sound of care.\n\nThe fake call keeps patients away from the real desk. The clinic still pays for minutes that personnel do not trust.\n\n## Your job\nRebuild trust in a clinic call after a lie that sounds like care.",
      stakeholder: "Clinic outreach coordinator",
      crisisMeters: { local: { label: "Missed Doses", description: "Patients miss insulin doses at home after a fake refill call." }, global: { label: "Fake Calls", description: "Fake clinic calls use a voice tree that a phone can spoof." }, support: { label: "Staff Strain", description: "Marisol has one afternoon and minutes that personnel do not trust." } },
      suggested: ["ai", "networks", "computing", "iot", "crypto"],
      suggestedWhy: {
        "ai": "Ai can compare a caller voice with the known clinic voice.",
        "networks": "Networks can show the path of a spoofed callback.",
        "computing": "Computing can log each real dial from the clinic desk.",
        "iot": "Iot can tie the desk phone to a known clinic device.",
        "crypto": "Crypto can mark a refill note so a patient can check the source.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Seabrook Wharf Notice Board"],
      title: "Sirens nobody believes",
      summary: "Harbor master Ellis pins a storm sheet to the wharf board at first light. A video loops his jacket and a cancel order that he did not give. Two skippers leave nets in the water. One late haul loses gear for the season in the real surge.",
      scene:
        "Harbor master Ellis pins a storm sheet to the Seabrook Wharf Notice Board at first light. The siren test was clean an hour ago. A video loops in the crew chats by the tide turn. The video shows his jacket, his voice, and a cancel order that he did not give.\n\nTwo skippers leave nets in the water. One skipper hauls late. That skipper loses gear for the season when the real surge hits the outer piles.\n\nThe town runs alerts through one radio bridge and a social page. A person can mirror that page with a stolen crest. A small ad ring pays for panic clips before each named storm. Clicks rise when boats stay out or come in on the wrong path.\n\nEllis walks the wet planks. He counts empty slips that did not move. Insurance adjusters will ask which person heard the cancel order. The next window is twelve hours.",
      briefMd:
        "## The place\nHarbor master Ellis pins a storm sheet to the Seabrook Wharf Notice Board at first light. The siren test was clean an hour ago.\n\nA video loops in the crew chats by the tide turn. The video shows his jacket and his voice. The video also shows a cancel order that he did not give.\n\nTwo skippers leave nets in the water. One skipper hauls late. That skipper loses gear for the season when the real surge hits the outer piles.\n\nEllis walks the wet planks. He counts empty slips that did not move. Insurance adjusters will ask which person heard the cancel order. The next window is twelve hours.\n\n## The bigger problem\nThe town runs alerts through one radio bridge. The town also runs alerts on a social page. A person can mirror that page with a stolen crest.\n\nA small ad ring pays for panic clips before each named storm. Clicks rise when boats stay out. Clicks also rise when boats come in on the wrong path.\n\n## Your job\nRestore a harbor warning that crews will trust after a fake cancel order.",
      stakeholder: "Harbor master",
      crisisMeters: { local: { label: "Storm Losses", description: "One late haul loses gear for the season when the real surge hits the outer piles." }, global: { label: "Fake Alerts", description: "Fake alerts show the jacket of Harbor master Ellis and a cancel order." }, support: { label: "Harbor Doubt", description: "Crews doubt the wharf board after a video in the crew chats." } },
      suggested: ["ai", "networks", "space", "iot", "drones"],
      suggestedWhy: {
        "ai": "Ai can show that a storm video does not match a live order.",
        "networks": "Networks can carry one alert path that crews can check.",
        "space": "A space link can send a storm note past the social page.",
        "iot": "Iot can tie a siren test to a sensor on the wharf.",
        "drones": "Drones can show the outer piles when the surge comes.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Milltown Night School Hall"],
      title: "The lecture that wasn’t sold",
      summary: "Director Ruiz unlocks the hall for the welding cert review and finds half the seats empty. A clip shows a job placement promise that she did not offer. Two students quit this morning because they think the school sold their names.",
      scene:
        "Director Ruiz unlocks the Milltown Night School Hall for the welding cert review. She finds half the seats empty. A clip on her phone shows many shares. The clip shows her at the podium with a job placement promise that she did not offer. The clip then shows a fake invoice for a guaranteed hire.\n\nThe real lecture was free. Two students quit that morning because they think the school sold their names.\n\nA rival training broker seeds doctored clips before each enrollment week. The edit tools cost little. The night school crest sits on a public flyer that a person can lift.\n\nRuiz must fill the shop floor by Friday or the school loses the county grant. She knows the regulars by first name. One regular will not come back if the smear sticks. Trust is the only tuition that she cannot refund.",
      briefMd:
        "## The place\nDirector Ruiz unlocks the Milltown Night School Hall for the welding cert review. She finds half the seats empty.\n\nA clip on her phone shows many shares. The clip shows her at the podium. The clip shows a job placement promise that she did not offer. The clip then shows a fake invoice for a guaranteed hire.\n\nThe real lecture was free. Two students quit that morning. The students think that the school sold their names.\n\nRuiz knows the regulars by first name. One regular will not come back if the smear sticks. Trust is the only tuition that she cannot refund.\n\n## The bigger problem\nA rival training broker seeds doctored clips before each enrollment week. The edit tools cost little. The night school crest sits on a public flyer. A person can lift that crest from the flyer.\n\nRuiz must fill the shop floor by Friday. If she does not fill the floor, the school loses the county grant.\n\n## Your job\nProve that the free classroom is real after a finished lie.",
      stakeholder: "Night-school director",
      crisisMeters: { local: { label: "Dropouts", description: "Two students quit and half the hall seats stay empty." }, global: { label: "Doctored Clips", description: "Doctored clips show a job promise and a fake hire invoice." }, support: { label: "Paid Smears", description: "A rival broker pays for smears before each enrollment week." } },
      suggested: ["ai", "networks", "computing", "vr", "crypto"],
      suggestedWhy: {
        "ai": "Ai can mark a clip that does not match the real lecture.",
        "networks": "Networks can show where a doctored clip first spreads.",
        "computing": "Computing can store the real free lecture for students.",
        "vr": "Vr can let a student see the real hall before Friday.",
        "crypto": "Crypto can sign the class note so a student can check it.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Harborview Tenant Union Hall"],
      title: "Rent strike on a forged memo",
      summary: "Union chair Ade walks into the hall with a stack of rent receipts and finds the room split. A memo on the door orders mass lock changes on Friday. The letterhead matches, but the signature does not match. An elderly tenant will face a locksmith alone if the memo holds.",
      scene:
        "Union chair Ade walks into the Harborview Tenant Union Hall with a stack of rent receipts. She finds the room split. A person taped a landlord memo to the door. The memo orders mass lock changes on Friday. The memo says that the strike is void and that leaders took a payoff.\n\nThe letterhead matches the real notice from last year. The signature does not match. Two floors stopped payment into the shared defense fund.\n\nA quiet account one block away buys print runs of official memos when a building organizes. The chaos drops sale prices for outside buyers. Neighbors ask Ade who sold them out.\n\nAde has the real landlord email on her laptop. She cannot put that email on each door before Friday. One elderly tenant will face a locksmith alone if the forged order holds. Unity in the fund is necessary by sundown.",
      briefMd:
        "## The place\nUnion chair Ade walks into the Harborview Tenant Union Hall with a stack of rent receipts. She finds the room split.\n\nA person taped a landlord memo to the door. The memo orders mass lock changes on Friday. The memo says that the strike is void. The memo says that leaders took a payoff.\n\nThe letterhead matches the real notice from last year. The signature does not match. Two floors stopped payment into the shared defense fund.\n\nAde has the real landlord email on her laptop. She cannot put that email on each door before Friday. One elderly tenant will face a locksmith alone if the forged order holds. Unity in the fund is necessary by sundown.\n\n## The bigger problem\nA quiet account one block away buys print runs of official memos. The account buys the memos when a building organizes. The chaos drops sale prices for outside buyers.\n\nNeighbors ask Ade who sold them out. The forged paper moves faster than her real email.\n\n## Your job\nPut true proof on each door before the forged memo holds.",
      stakeholder: "Tenant union chair",
      crisisMeters: { local: { label: "Locked Doors", description: "An elderly tenant will face a locksmith alone if the forged memo holds." }, global: { label: "Forged Memos", description: "Forged memos copy the old letterhead and split the hall." }, support: { label: "Outside Cash", description: "Outside cash buys print runs when a building organizes." } },
      suggested: ["ai", "networks", "crypto", "computing", "print3d"],
      suggestedWhy: {
        "ai": "Ai can compare a door memo with the real landlord email.",
        "networks": "Networks can send the real notice to each floor before Friday.",
        "crypto": "Crypto can sign the real notice so a tenant can check it.",
        "computing": "Computing can hold the real email in a form a tenant can read.",
        "print3d": "Print3d can make a physical mark that a paper lie cannot copy.",
      },
      visionTheme: "social-city",
    }
  ],

  totalitarianism: [
    {
      places: ["Millbridge Community Hospital"],
      title: "The ward docks your household",
      summary: "Nurse Amira scans a wristband on the maternity overflow ward. The screen flashes red. Last month a brother missed a block meeting. The file labels the family Unreliable. A new mother downstairs waits for a delayed antibiotic.",
      scene:
        "At 2:14 a.m., nurse Amira scans a wristband on the maternity overflow ward. The screen flashes red. The patient is stable. The household score is not clear. Last month her brother missed a block meeting. The file labels the family Unreliable.\n\nAmira holds clean gloves and a free cot. She lacks a green light for an admit without a supervisor countersign. The countersign does not come before dawn.\n\nOn the night desk, the report quota board ticks. Each shift must file a set number of loyalty flags, no-shows, and attitude notes. A missed quota drops the staffing points of the ward. Nurses who file too few flags lose overtime. A supervisor calls in nurses who shield a patient. The quota fills the printer with forms before gauze fills a tray.\n\nThe circle of Amira meets in the stairwell between rounds. The nurses name clerks who look away. The nurses name screens that accept a paper override. The nurses name families one flag from denied pain medicine.\n\nA new mother downstairs waits for a delayed antibiotic. Her address sits in a watched building. The delay harms the body.\n\nThe quota is the driver. The quota pays the hospital for compliance theater more than for care. If Amira admits the patient, her badge can fail at the supply closet tomorrow. If she sends the patient home, the fever returns to the same door.",
      briefMd:
        "## The place\n\nAt 2:14 a.m., nurse Amira scans a wristband on the maternity overflow ward at Millbridge Community Hospital. The screen flashes red. The patient is stable. The household score is not clear. Last month her brother missed a block meeting. The file labels the family Unreliable.\n\nAmira holds clean gloves and a free cot. She lacks a green light for an admit without a supervisor countersign. The countersign does not come before dawn. A new mother downstairs waits for a delayed antibiotic. Her address sits in a watched building.\n\nThe circle of Amira meets in the stairwell between rounds. The nurses name clerks who look away. The nurses name screens that accept a paper override. The nurses name families one flag from denied pain medicine.\n\n## The bigger problem\n\nOn the night desk, the report quota board ticks. Each shift must file a set number of loyalty flags, no-shows, and attitude notes. A missed quota drops the staffing points of the ward. Nurses who file too few flags lose overtime. A supervisor calls in nurses who shield a patient. The quota fills the printer with forms before gauze fills a tray.\n\nThe delay harms the body. The quota pays the hospital for compliance theater more than for care. If Amira admits the patient, her badge can fail at the supply closet tomorrow. If she sends the patient home, the fever returns to the same door.\n\n## Your job\n\nKeep the new mother in care without a household mark for a missed block meeting.",
      stakeholder: "Night-shift nurses' quiet circle",
      crisisMeters: { local: { label: "Delayed Care", description: "The new mother waits for an antibiotic while a red screen blocks the free cot." }, global: { label: "Loyalty Quotas", description: "The quota board demands loyalty flags, or the ward loses staffing points." }, support: { label: "Staff Fear", description: "Nurses fear a failed badge, lost overtime, or a call-in after a kind act." } },
      suggested: ["networks", "crypto", "ai", "computing", "vr", "solar"],
      suggestedWhy: {
        "networks": "Networks can pass a stairwell note when the ward screen stays red.",
        "crypto": "Crypto can shield a paper override from a loyalty flag review.",
        "ai": "Ai can mark a quota note that harms a stable patient.",
        "computing": "Computing can hold a cot list when the file says Unreliable.",
        "vr": "Vr can show the night ward so nurses can rehearse a dawn talk.",
        "solar": "Solar can power a small cot lamp if ward points cut the lights.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Harborlane Produce Arcades"],
      title: "No chant, no cold storage",
      summary: "Vendor Kei rolls a cart of greens toward Arcade Bay 4. The cold-locker latch is dark because he skipped the morning unity chant yesterday. The lettuce wilts by noon on ice that he cannot buy.",
      scene:
        "Before sunrise, vendor Kei rolls a cart of greens toward Arcade Bay 4. The cold-locker latch is dark. The permit app shows a gap. Kei skipped the morning unity chant at the gate yesterday. The missing chant means no cold hours. The lettuce wilts by noon on open ice that Kei cannot buy.\n\nAlong the arcade, the permit ledger updates in public. A stall shows green only after the owner logs attendance, approved slogans, and helper names. The help from an unlisted cousin counts as an undeclared association. The association mark freezes the locker again. Shoppers see empty stalls. The ledger empties those stalls.\n\nThe mutual-credit circle of Kei balanced debt in a notebook under the tarps. At this time the notebook is a risk. A camera can freeze three vendors who sign the same page. A widow two bays down sold her scale after a week without cold storage. She greets Kei. She does not stand next to him when inspectors walk the aisle.\n\nKei can chant and keep the motor on. Kei can stay silent and watch the stock die. Kei cannot show a delivery route or a shared cooler without a line on the loyalty ledger.",
      briefMd:
        "## The place\n\nBefore sunrise, vendor Kei rolls a cart of greens toward Arcade Bay 4 at Harborlane Produce Arcades. The cold-locker latch is dark. The permit app shows a gap. Kei skipped the morning unity chant at the gate yesterday. The missing chant means no cold hours. The lettuce wilts by noon on open ice that Kei cannot buy.\n\nAlong the arcade, the permit ledger updates in public. A stall shows green only after the owner logs attendance, approved slogans, and helper names. Shoppers see empty stalls. The ledger empties those stalls.\n\nThe mutual-credit circle of Kei balanced debt in a notebook under the tarps. At this time the notebook is a risk. A widow two bays down sold her scale after a week without cold storage. She greets Kei. She does not stand next to him when inspectors walk the aisle.\n\n## The bigger problem\n\nThe help from an unlisted cousin counts as an undeclared association. The association mark freezes the locker again. A camera can freeze three vendors who sign the same page.\n\nKei can chant and keep the motor on. Kei can stay silent and watch the stock die. Kei cannot show a delivery route or a shared cooler without a line on the loyalty ledger.\n\n## Your job\n\nKeep the greens cold without a unity chant on the permit ledger.",
      stakeholder: "Vendor mutual-credit association",
      crisisMeters: { local: { label: "Spoiled Stock", description: "The lettuce wilts by noon on open ice that Kei cannot buy." }, global: { label: "Permit Ledger", description: "The public ledger freezes a locker after a missed unity chant." }, support: { label: "Vendor Silence", description: "A widow greets Kei but does not stand beside him for inspectors." } },
      suggested: ["crypto", "networks", "iot", "solar", "battery", "print3d", "ai"],
      suggestedWhy: {
        "crypto": "Crypto can mark a mutual credit note without a public helper name.",
        "networks": "Networks can share a cooler slot without a gate chant log.",
        "iot": "Iot can watch locker cold without a permit app gap.",
        "solar": "Solar can run a small cooler when the arcade latch stays dark.",
        "battery": "Battery power can hold cold hours until noon.",
        "print3d": "Print3d can form a small ice box for greens on the cart.",
        "ai": "Ai can warn Kei before the lettuce wilts on open ice.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Copperline Grid Hamlet"],
      title: "Compliant blocks stay lit",
      summary: "Line worker Rosa climbs the pole on Maple Spur. Porches that hosted unregistered study groups last week lose power first at dusk. Children do homework by phone glow while the other side keeps lights.",
      scene:
        "Line worker Rosa climbs the pole on Maple Spur. She opens the local cutout by the book. The book is not only load and weather. The score portal on her handset lists porches. Those porches hosted unregistered study groups last week. Those meters drop first when the feeder tightens at dusk.\n\nHardship clerks in the shed process restoration tickets. A ticket moves faster after neighbors file enough harmony confirms. Personnel learn to watch windows. A shared tool shed sits locked. Three households signed the same repair roster. That signature was enough.\n\nThe outage means cold soup and dark stairs. The portal picks the dark addresses.\n\nThe crew of Rosa knows how to island a transformer. The crew knows how to keep a clinic wing alive. The crew lacks a method that skips the portal log of the alley group. Last winter a clerk restored a block early. The clerk lost shift bids for a month. Trust frays from pole to pole.\n\nChildren do homework by phone glow. The compliant side of the street keeps porch lights.\n\nRosa can follow the portal and cut power clean. Rosa can fit a jumper and risk the crew.",
      briefMd:
        "## The place\n\nLine worker Rosa climbs the pole on Maple Spur in Copperline Grid Hamlet. She opens the local cutout by the book. The book is not only load and weather. The score portal on her handset lists porches. Those porches hosted unregistered study groups last week. Those meters drop first when the feeder tightens at dusk.\n\nHardship clerks in the shed process restoration tickets. A ticket moves faster after neighbors file enough harmony confirms. Personnel learn to watch windows. A shared tool shed sits locked. Three households signed the same repair roster. That signature was enough.\n\nThe outage means cold soup and dark stairs. Children do homework by phone glow. The compliant side of the street keeps porch lights.\n\n## The bigger problem\n\nThe portal picks the dark addresses. The crew of Rosa knows how to island a transformer and keep a clinic wing alive. The crew lacks a method that skips the portal log of the alley group. Last winter a clerk restored a block early and lost shift bids for a month. Trust frays from pole to pole.\n\nRosa can follow the portal and cut power clean. Rosa can fit a jumper and risk the crew.\n\n## Your job\n\nHold dusk power for study porches without a rank on the score portal.",
      stakeholder: "Line workers and hardship clerks",
      crisisMeters: { local: { label: "Dark Homes", description: "Study porches go dark at dusk and children read by phone glow." }, global: { label: "Score Portal", description: "The score portal drops meters for porches with unregistered study groups." }, support: { label: "Neighbor Watch", description: "Neighbors watch windows and lock the shared tool shed." } },
      suggested: ["solar", "battery", "networks", "crypto", "computing", "iot", "ai"],
      suggestedWhy: {
        "solar": "Solar can feed a clinic wing when the feeder tightens at dusk.",
        "battery": "Battery power can hold porch light after a meter cut.",
        "networks": "Networks can share a spare fuse list without a harmony confirm.",
        "crypto": "Crypto can hide a repair roster from the score portal.",
        "computing": "Computing can sort load and weather apart from porch scores.",
        "iot": "Iot can sense a dark stair without a neighbor watch note.",
        "ai": "Ai can show which meter drops first at dusk.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Saltreed Fisher Quay"],
      title: "Fuel only for the logged crew",
      summary: "Skipper Nila ties up at Saltreed with a torn bilge hose. The fuel kiosk refuses her fob because one crewmate mended nets on an unlisted skiff. Ice in the hold softens while nets sit dry on the racks.",
      scene:
        "Skipper Nila ties up at Saltreed with a torn bilge hose. Her hold is half full of ice. The ice softens. The fuel kiosk scanner refuses her fob. Unity Logs show two of her three crew at the dawn briefing. The third hand mended nets with his brother on an unlisted skiff.\n\nThe missing full log means no diesel.\n\nAlong the quay, repair league benches sit half empty. The spare parts passed from hand to hand with a chalk tally. At this time each borrowed impeller must match a logged crew list. A missed match puts the chandler at risk of a dockside audit. Boats go quiet on the open channel. Fuel cuts leave nets dry on the racks.\n\nThe logs produce the silence. The logs tie berth, fuel, and spare parts to the names in one official frame.\n\nThe league of Nila knows which hulls use the same gasket size. A young deckhand waits on the pier with a printed flange. The flange can save the day if a person stamps it outside the log. His uncle lost a season after a crew drift mark. Families split across boats. No single fob carries too many names.\n\nNila can dismiss the third hand and fill the tank. Nila can idle and lose the catch. Nila cannot run a repair commons that the harbor counts as lawful work.",
      briefMd:
        "## The place\n\nSkipper Nila ties up at Saltreed Fisher Quay with a torn bilge hose. Her hold is half full of ice. The ice softens. The fuel kiosk scanner refuses her fob. Unity Logs show two of her three crew at the dawn briefing. The third hand mended nets with his brother on an unlisted skiff.\n\nAlong the quay, repair league benches sit half empty. The spare parts passed from hand to hand with a chalk tally. At this time each borrowed impeller must match a logged crew list. Fuel cuts leave nets dry on the racks.\n\nThe league of Nila knows which hulls use the same gasket size. A young deckhand waits on the pier with a printed flange. His uncle lost a season after a crew drift mark. Families split across boats so no single fob carries too many names.\n\n## The bigger problem\n\nThe missing full log means no diesel. A missed match puts the chandler at risk of a dockside audit. Boats go quiet on the open channel. The logs produce the silence. The logs tie berth, fuel, and spare parts to the names in one official frame.\n\nNila can dismiss the third hand and fill the tank. Nila can idle and lose the catch. Nila cannot run a repair commons that the harbor counts as lawful work.\n\n## Your job\n\nKeep the crew whole and feed the engine without a full dawn log.",
      stakeholder: "Independent skippers' repair league",
      crisisMeters: { local: { label: "Lost Catch", description: "Soft ice and dry nets threaten the catch while the kiosk refuses fuel." }, global: { label: "Crew Logs", description: "Unity Logs block diesel when one hand mends nets on an unlisted skiff." }, support: { label: "Quiet Channel", description: "Boats go quiet on the open channel after fuel cuts and log checks." } },
      suggested: ["networks", "crypto", "drones", "solar", "print3d", "computing", "space"],
      suggestedWhy: {
        "networks": "Networks can pass a weather call when the open channel goes quiet.",
        "crypto": "Crypto can tally a borrowed impeller without a public crew list.",
        "drones": "Drones can carry a small gasket between hulls on the quay.",
        "solar": "Solar can charge a deck lamp when the fuel kiosk refuses the fob.",
        "print3d": "Print3d can form a flange like the printed part on the pier.",
        "computing": "Computing can match gasket sizes for the repair league.",
        "space": "Space links can time a weather window while boats stay quiet.",
      },
      visionTheme: "ocean-city",
    }
  ],

  "women-stem": [
    {
      places: ["Pune Polytechnic Instrumentation Wing"],
      title: "Night shuttle ends before her bench time",
      summary: "Meera locks the bench at 7:40 p.m. Meera runs to the campus gate. The last women-only shuttle idles with half closed doors. The lab stays open until ten. The campus security staff will not sign her late exit slip. Her group loses another graded night.",
      scene:
        "Meera locks the calibration jig at 7:40 p.m. Meera runs to the gate at the Pune Polytechnic Instrumentation Wing. The last women-only shuttle idles at that gate. The doors of the shuttle are half closed. Meera steps onto the shuttle. Her partner does not step onto the shuttle.\n\nThe lab stays open until ten for the sensor final. The route home does not stay open after the shuttle leaves. The campus security staff will not sign a late exit slip for a woman after the shuttle leaves. The school writes the rule as a safety rule. The rule cuts free hours on the benches. The rule cuts free hours on the scopes and the shared kits.\n\nThe boys from the same cohort work under the fluorescent lights. The boys finish the noise tests. The boys post the plots. The Meera group loses another graded night. The mark sheet tilts against the Meera group. The women students guild counts this pattern for the full term.\n\nThe missed labs become weak portfolios for the women students. The weak portfolios keep the women students out of the instrumentation placements. The polytechnic brags about those placements. A principal can add one more van. A principal can add one more camera. The access rule stays the same.",
      briefMd:
        "## The place\nThe Pune Polytechnic Instrumentation Wing keeps the lab open until ten for the sensor final. Meera locks the calibration jig at 7:40 p.m. The last women-only shuttle idles at the gate with half closed doors. Meera steps onto the shuttle. Her partner does not step onto the shuttle. The campus security staff will not sign a late exit slip for a woman after the shuttle leaves.\n\nThe boys from the same cohort work under the fluorescent lights. The boys finish the noise tests. The boys post the plots. The Meera group loses another graded night. The mark sheet tilts against the Meera group.\n\nThe rule cuts free hours on the benches, the scopes, and the shared kits. The school writes the exit rule as a safety rule. The route home does not stay open until ten.\n\n## The bigger problem\nThe women students guild counts this pattern for the full term. The missed labs become weak portfolios for the women students. The weak portfolios keep the women students out of the instrumentation placements. The polytechnic brags about those placements.\n\nA principal can add one more van. A principal can add one more camera. The access rule stays the same.\n\n## Your job\nGive the women students the same late lab hours as the boys in the cohort.",
      stakeholder: "Polytechnic principal and women students’ guild",
      crisisMeters: { local: { label: "Missed labs", description: "The Meera group misses a graded lab night each time the women-only shuttle leaves early." }, global: { label: "Last shuttle", description: "The last women-only shuttle leaves before the sensor final ends at ten." }, support: { label: "Placement gap", description: "The weak portfolios keep women students out of the instrumentation placements at the polytechnic." } },
      suggested: ["networks", "ai", "solar", "iot", "self-driving", "vr"],
      suggestedWhy: {
        "networks": "A campus network can show shuttle time and lab hours to Meera before the gate closes.",
        "ai": "A planning model can pair bench time with a ride that campus security will sign.",
        "solar": "Solar power can run one more van after the sensor final ends at ten.",
        "iot": "A gate sensor can warn Meera before the last women-only shuttle leaves.",
        "self-driving": "An automatic van can carry women students home after the lab closes at ten.",
        "vr": "A virtual bench can let the Meera group finish noise tests after the shuttle leaves.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Antofagasta Copper Training Depot"],
      title: "Sensor tickets still list the sons",
      summary: "Rosa scans her card at the depot simulator bay. The screen greets the son of her cousin from the old crew list. Dispatch fills field slots from a male seniority file. Women who pass the same drills wait on unpaid hold days.",
      scene:
        "Rosa scans her card at the haul-truck simulator bay in the Antofagasta Copper Training Depot. The screen greets the son of her cousin. That name stays on the old crew list. Rosa finished every sensor module at the depot. The ticket queue does not use her record. The dispatch software fills field slots from a male seniority file.\n\nThe depot built that file when the pit ran one kind of crew. The supervisors shrug at the screen. The supervisors say the system is fair because the system is automatic. Women who pass the same drills wait on unpaid hold days. The board fills with familiar last names. The wage bands stall for those women.\n\nThe underground sensor tickets stay a ledger for men in practice. The regional women miners association can coach one more cohort. Certified women still lose hours to the roster. The roster does not show the certified women. The training chief can add headsets. The bay gate stays locked for Rosa.",
      briefMd:
        "## The place\nRosa scans her card at the haul-truck simulator bay in the Antofagasta Copper Training Depot. The screen greets the son of her cousin. That name stays on the old crew list. Rosa finished every sensor module at the depot. The ticket queue does not use her record.\n\nThe supervisors shrug at the screen. The supervisors say the system is fair because the system is automatic. The dispatch software fills field slots from a male seniority file. The depot built that file when the pit ran one kind of crew. Women who pass the same drills wait on unpaid hold days. The board fills with familiar last names.\n\n## The bigger problem\nThe underground sensor tickets stay a ledger for men in practice. Certified women lose hours on unpaid hold days. The wage bands stall for those women.\n\nThe regional women miners association can coach one more cohort. The training chief can add headsets. The bay gate stays locked for Rosa.\n\n## Your job\nOpen field slots for competence, not for an inherited male name file.",
      stakeholder: "Depot training chief and regional women miners’ association",
      crisisMeters: { local: { label: "Hold days", description: "Certified women wait on unpaid hold days after they pass the same drills as the old crew." }, global: { label: "Roster bias", description: "Dispatch fills underground sensor tickets from a male seniority file at the depot." }, support: { label: "Wage stall", description: "The wage bands stall while familiar last names fill the board at the training depot." } },
      suggested: ["drones", "iot", "vr", "robots", "ai", "networks"],
      suggestedWhy: {
        "drones": "A drone log can show the sensor skill of Rosa to dispatch before a ticket fills.",
        "iot": "A card sensor can match Rosa to her sensor modules at the simulator bay.",
        "vr": "A virtual truck bay can let Rosa drill when the roster blocks the real bay.",
        "robots": "A haul task robot can open a field slot when the skill record shows Rosa.",
        "ai": "A dispatch model can fill a slot from drill scores instead of the male file.",
        "networks": "A depot network can send the certified record of Rosa to the ticket queue.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Kumasi Teaching Hospital Biomed Bay"],
      title: "Repair floor badge never prints for her",
      summary: "Ama stands at the hospital badge window with a warm nursing certificate. The clerk checks the list two times. The name of Ama is not on the repair-floor roll. Ama can keep a machine alive on the ward. The floor that owns the fix still blocks Ama.",
      scene:
        "Ama stands at the badge window in the Kumasi Teaching Hospital Biomed Bay. Her nursing certificate is warm from the printer. The clerk checks the list two times. The name of Ama is not on the repair-floor roll. Only the staff with a biomedical technician code get access to the open machines. The infusion pumps fail on the ward.\n\nThe monitors drift on the ward. Nurses such as Ama troubleshoot faults with borrowed manuals after shifts. The hospital routes parts, torque tools, and sign-off through a male tech track. That track rarely admits a lateral entrant from nursing. Ama can read a ventilator error code on the ward. The bay door still blocks Ama.\n\nThe colleagues burn out on the ward. The colleagues leave clinical paths in STEM. The biomedical head can order one more printer. The skill stays on the far side of the lock.",
      briefMd:
        "## The place\nAma stands at the badge window in the Kumasi Teaching Hospital Biomed Bay. Her nursing certificate is warm from the printer. The clerk checks the list two times. The name of Ama is not on the repair-floor roll. Only the staff with a biomedical technician code get access to the open machines. The infusion pumps fail on the ward.\n\nThe monitors drift on the ward. Nurses such as Ama troubleshoot faults with borrowed manuals after shifts. The hospital routes parts, torque tools, and sign-off through a male tech track. That track rarely admits a lateral entrant from nursing. Ama can read a ventilator error code on the ward. The bay door still blocks Ama.\n\n## The bigger problem\nThe colleagues burn out on the ward. The colleagues leave clinical paths in STEM. The biomedical head can order one more printer. The skill stays on the far side of the lock.\n\nThe formal fix stays with the male tech track. A nurse who keeps a device alive cannot step onto the repair floor.\n\n## Your job\nLet the nurse who keeps a device alive step onto the repair floor.",
      stakeholder: "Hospital biomedical head and nursing-STEM liaison",
      crisisMeters: { local: { label: "Broken pumps", description: "The infusion pumps fail on the ward and Ama cannot enter the repair floor." }, global: { label: "Badge lockout", description: "The badge roll omits Ama, so the repair-floor door stays shut for her." }, support: { label: "Staff exit", description: "The colleagues leave clinical STEM paths after the bay door blocks their skill." } },
      suggested: ["print3d", "ai", "iot", "networks", "computing", "vr"],
      suggestedWhy: {
        "print3d": "A ward printer can make a spare pump part where Ama works on the ward.",
        "ai": "A fault model can tie a ventilator code to the repair skill of Ama.",
        "iot": "A pump sensor can send a fault notice and the name of Ama to the bay.",
        "networks": "A hospital network can send the certificate of Ama to the badge roll.",
        "computing": "A credential check can match the certificate of Ama to repair floor access.",
        "vr": "A virtual bay can let Ama practice a fix when the door blocks the floor.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Amman STEM Olympiad Prep Hall"],
      title: "Travel fund needs a male chaperone",
      summary: "Lina pins her bracket sheet to the board in the prep hall. Lina waits for the travel desk. The school fund will pay for her seat only if a male relative signs as chaperone. The boys keep their slots. The girls drop from the travel list. A brilliant build stays on a laptop in Amman.",
      scene:
        "Lina pins her robotics bracket sheet to the board in the Amman STEM Olympiad Prep Hall. Lina waits for the travel desk. The regional finals start in two weeks. The school fund will pay for her seat only if a male relative signs as chaperone. The chaperone rule applies to the overnight coach. Her father works nights.\n\nNo uncle can take the travel days. The boys from the same team submit forms alone. The boys keep their slots. The coaches know that the code of Lina wins scrimmages. The chaperone rule sits in the safety charter of the parent-student STEM council. The rule does not bend.\n\nThe girls drop from the travel list one by one. The scholarships on medal tables drift to students who can travel. A brilliant build stays on a laptop in Amman. The arena fills without Lina. The council can rent one more bus. The gate still depends on the name of a man.",
      briefMd:
        "## The place\nLina pins her robotics bracket sheet to the board in the Amman STEM Olympiad Prep Hall. Lina waits for the travel desk. The regional finals start in two weeks. The school fund will pay for her seat only if a male relative signs as chaperone. The chaperone rule applies to the overnight coach. Her father works nights.\n\nNo uncle can take the travel days. The boys from the same team submit forms alone. The boys keep their slots. The coaches know that the code of Lina wins scrimmages. The chaperone rule sits in the safety charter of the parent-student STEM council. The rule does not bend.\n\n## The bigger problem\nThe girls drop from the travel list one by one. The scholarships on medal tables drift to students who can travel. A brilliant build stays on a laptop in Amman. The arena fills without Lina.\n\nThe council can rent one more bus. The gate still depends on the name of a man.\n\n## Your job\nAward the travel seat for talent without a male chaperone signature.",
      stakeholder: "Prep-hall coaches and parent-student STEM council",
      crisisMeters: { local: { label: "Dropped seats", description: "The girls drop from the travel list when no male relative can sign the chaperone form." }, global: { label: "Chaperone rule", description: "The school fund will pay for the seat of Lina only if a male relative signs as chaperone." }, support: { label: "Medal drift", description: "The scholarships on the medal tables drift to students who can leave Amman." } },
      suggested: ["vr", "networks", "ai", "computing", "solar", "space"],
      suggestedWhy: {
        "vr": "A virtual finals hall can let Lina compete when the chaperone rule blocks travel.",
        "networks": "A network can link the prep hall in Amman to the regional finals board.",
        "ai": "A judging model can score the code of Lina when the coach seat stays closed.",
        "computing": "A remote contest can keep the slot of Lina without a chaperone signature.",
        "solar": "Solar power can run a finals link in Amman when the coach seat stays closed.",
        "space": "A satellite link can carry the match of Lina to the arena without the coach.",
      },
      visionTheme: "learn-city",
    }
  ],

  memory: [
    {
      places: ["Nishijin timber yard, Kyoto"],
      title: "Joinery marks leave with the last master",
      summary: "Kenji runs his thumb along a cedar beam in the temple yard. The paper tag names the tree and the date. The tag does not name the nick that shows the grain twist. One more wrong joint will open the hall to rain in the next typhoon.",
      scene:
        "Kenji runs his thumb along a cedar beam in the Nishijin timber yard in Kyoto. He stops at a shallow chisel nick. The nick shows how the grain will twist in summer humidity. Kenji calls for the apprentice who logged the temple repair last month. The boy left for a factory job in Osaka two weeks ago.\n\nThe paper tag on the rack names the tree and the date. The tag does not name the feel of the wood under load. His teacher kept that knowledge in his hands. His teacher kept muttered notes at the end of each cut. Those notes did not enter the digital inventory of the yard.\n\nManagers measure progress by finished pieces and billed hours. Slow transmission of touch knowledge looks like idle time on the sheet. A shrine roof on the east side shows a hairline gap. A substitute joint sits wrong at that gap. One more wrong beam will open the hall to rain in the next typhoon season.",
      briefMd:
        "## The place\nKenji runs his thumb along a cedar beam in the Nishijin timber yard in Kyoto. He stops at a shallow chisel nick. The nick shows how the grain will twist in summer humidity. Kenji calls for the apprentice who logged the temple repair last month. The boy left for a factory job in Osaka two weeks ago.\n\nThe paper tag on the rack names the tree and the date. The tag does not name the feel of the wood under load. His teacher kept that knowledge in his hands. His teacher kept muttered notes at the end of each cut. Those notes did not enter the digital inventory of the yard.\n\n## The bigger problem\nTemple carpentry guild keepers lose the joinery nick when the last master leaves. Managers measure progress by finished pieces and billed hours. Slow transmission of touch knowledge looks like idle time on the sheet. A substitute joint on the east shrine roof shows a hairline gap. One more wrong beam will open the hall to rain in the next typhoon season.\n\n## Your job\nKeep the joinery nick knowledge in the yard after the master leaves.",
      stakeholder: "Temple carpentry guild keepers",
      crisisMeters: { local: { label: "Beam Failures", description: "A substitute joint on the east shrine roof shows a hairline gap before the next typhoon." }, global: { label: "Mark Loss", description: "The nick knowledge stays in the master hands and does not enter the yard inventory." }, support: { label: "Apprentice Exit", description: "The apprentice left the yard for a factory job in Osaka two weeks ago." } },
      suggested: ["vr", "ai", "networks", "computing", "print3d", "iot"],
      suggestedWhy: {
        "vr": "A shared view can show the nick and the grain twist to the next apprentice.",
        "ai": "A pattern record can keep the nick meaning after the master leaves the yard.",
        "networks": "A yard link can pass the nick note to the crew before the next cut.",
        "computing": "A local file can store the nick feel next to the tree name and the date.",
        "print3d": "A small joint model can show the true seat next to the wrong seat.",
        "iot": "A beam sensor can mark humidity when the grain starts to twist.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Toksook Bay boat launch, Alaska"],
      title: "Safe ice only the aunties can name",
      summary: "Mary steps onto the gray ice near the old trail at dawn. The chart shows the shore line from last year. The chart does not show the soft pocket she can smell on the wind. Two hunters went through the ice last week. One hunter came back soaked.",
      scene:
        "Mary steps onto the gray edge at the Toksook Bay boat launch at dawn. She names the ice in the way her mother taught her. This stretch sings under the boot. That dark seam will open by noon. Her nephew waits with a GPS unit and a printed chart from the school.\n\nThe chart shows the shore line from last year. The chart does not show the soft pocket. Mary can smell the soft pocket when the wind shifts. Two hunters went through the ice near the old trail last week. One hunter came back soaked.\n\nThe village runs safety talks from laminated cards. Personnel wrote the cards when the seasons held steadier patterns. Young workers leave for jobs in Bethel and in Anchorage. The aunties who can read the ice by sound and by color grow fewer each spring. Store food costs climb when the freezers run low.\n\nMary watches her nephew put the device in his pocket. He glances at the water. He acts as if the machine will speak first.",
      briefMd:
        "## The place\nMary steps onto the gray edge at the Toksook Bay boat launch at dawn. She names the ice in the way her mother taught her. This stretch sings under the boot. That dark seam will open by noon. Her nephew waits with a GPS unit and a printed chart from the school.\n\nThe chart shows the shore line from last year. The chart does not show the soft pocket. Mary can smell the soft pocket when the wind shifts. Two hunters went through the ice near the old trail last week. One hunter came back soaked.\n\n## The bigger problem\nYup'ik shore knowledge keepers grow fewer each spring. Young workers leave for jobs in Bethel and in Anchorage. The village runs safety talks from laminated cards. Personnel wrote the cards when the seasons held steadier patterns. Store food costs climb when the freezers run low.\n\nMary watches her nephew put the device in his pocket. He glances at the water as if the machine will speak first.\n\n## Your job\nKeep the ice names useful for the next hunter at the boat launch.",
      stakeholder: "Yup'ik shore knowledge keepers",
      crisisMeters: { local: { label: "Trail Accidents", description: "Two hunters went through the ice near the old trail last week." }, global: { label: "Ice Forgetting", description: "Aunties who can read ice by sound and by color grow fewer each spring." }, support: { label: "Youth Drift", description: "Young workers leave the shore for jobs in Bethel and in Anchorage." } },
      suggested: ["ai", "networks", "vr", "iot", "space", "computing"],
      suggestedWhy: {
        "ai": "A name aid can hold the ice sound and the ice color for the next hunter.",
        "networks": "A village link can pass the dawn ice name before a hunter leaves the launch.",
        "vr": "A shared view can show the soft pocket next to the old trail.",
        "iot": "A shore sensor can mark the dark seam that will open by noon.",
        "space": "A sky view can show the shore line change next to the auntie name.",
        "computing": "A local record can store the ice name next to the wind and the color.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Port Talbot blast furnace control room, Wales"],
      title: "The furnace whisper dies at shift end",
      summary: "Davies hears the stack note change before an alarm. The log has no code for that hiss. Notes vanish at the end of the quarter. Night shift ends in twelve minutes. The relief crew did not stand this sticky descent.",
      scene:
        "Davies hears the stack note change in the Port Talbot control room in Wales before the alarm board lights. A thin rise in the note means the burden sits wrong above the tuyeres. He keeps a pencil stub in his pocket. The digital log asks for a code from a menu. The log has no code for that hiss.\n\nNight shift ends in twelve minutes. The relief crew comes from a contractor rotation. The relief crew did not stand this furnace through a sticky descent. Company policy clears free-text notes at the end of each quarter. The plant files a near miss as closed when the numbers settle.\n\nLast month a young operator missed the same whisper. The operator dumped a partial cast late. The late cast hurt no person. The floor still speaks about the heat that rolled back toward the runners. Davies types a vague comment. He knows the comment will vanish.",
      briefMd:
        "## The place\nDavies hears the stack note change in the Port Talbot control room in Wales before the alarm board lights. A thin rise in the note means the burden sits wrong above the tuyeres. He keeps a pencil stub in his pocket. The digital log asks for a code from a menu. The log has no code for that hiss.\n\nNight shift ends in twelve minutes. The relief crew comes from a contractor rotation. The relief crew did not stand this furnace through a sticky descent. Last month a young operator missed the same whisper and dumped a partial cast late.\n\n## The bigger problem\nSteelworks safety stewards work under a policy that clears free-text notes at the end of each quarter. The plant files a near miss as closed when the numbers settle. The late cast hurt no person. The floor still speaks about the heat that rolled back toward the runners. Davies types a vague comment. He knows the comment will vanish.\n\n## Your job\nKeep the furnace hiss memory past the end of the shift.",
      stakeholder: "Steelworks safety stewards",
      crisisMeters: { local: { label: "Near Misses", description: "A late partial cast last month sent heat back toward the runners." }, global: { label: "Shift Amnesia", description: "The hiss memory ends with the shift because the log has no code." }, support: { label: "Note Purges", description: "Company policy clears free-text notes at the end of each quarter." } },
      suggested: ["ai", "iot", "computing", "networks", "vr", "robots"],
      suggestedWhy: {
        "ai": "A pattern aid can match the stack hiss when the menu has no code.",
        "iot": "A stack sensor can mark the thin rise before the alarm board lights.",
        "computing": "A local log can keep the hiss note after the quarter close.",
        "networks": "A crew link can pass the hiss note to the relief shift in minutes.",
        "vr": "A shared view can show the sticky descent to a new operator.",
        "robots": "A floor aid can flag the hiss before a partial cast goes late.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Maternity annex, Komfo Anokye Teaching Hospital, Kumasi"],
      title: "Auntie remedies never reach the chart",
      summary: "Ama cools the wrists of a new mother with ginger water on the annex ward. The chart lists antibiotics and vitals. The chart does not list the sips and the rest that calmed this fever last rotation. By morning the fever returns. Families delay a visit.",
      scene:
        "Ama cools the wrists of a new mother with a cloth in ginger water in the Kumasi maternity annex. The annex sits at Komfo Anokye Teaching Hospital. A senior midwife showed her this step years ago. The fever climbed after a long labor. The electronic chart lists antibiotics and vitals. The chart has no field for the auntie sequence of sips, rest, and watchfulness.\n\nA junior nurse takes the handoff and follows only the screen. By morning the fever returns. Staff flag the bed for escalation. Staff move through the annex every season. Contract hires learn the software in a day. They do not learn the grandmother remedy that the old team trusted when the labs ran slow.\n\nFamilies notice the same scares. Some families delay a visit. They fear the ward will miss what their elders know. Ama stands between the trolley and the screen. The remedy works. The chart has no official place for the remedy.",
      briefMd:
        "## The place\nAma cools the wrists of a new mother with a cloth in ginger water in the Kumasi maternity annex. The annex sits at Komfo Anokye Teaching Hospital. A senior midwife showed her this step years ago. The fever climbed after a long labor. The electronic chart lists antibiotics and vitals. The chart has no field for the auntie sequence of sips, rest, and watchfulness.\n\nA junior nurse takes the handoff and follows only the screen. By morning the fever returns. Staff flag the bed for escalation. Ama stands between the trolley and the screen. The remedy works. The chart has no official place for the remedy.\n\n## The bigger problem\nSenior midwife networks see staff move through the annex every season. Contract hires learn the software in a day. They do not learn the grandmother remedy that the old team trusted. The labs ran slow in those seasons. Families notice the same scares. Some families delay a visit because they fear a missed elder remedy.\n\n## Your job\nKeep the auntie remedy on the chart with the dose for the next handoff.",
      stakeholder: "Senior midwife networks",
      crisisMeters: { local: { label: "Repeat Harm", description: "Staff flag the bed for escalation by morning when the fever returns." }, global: { label: "Handoff Gaps", description: "The chart lists the dose and the vitals but not the auntie sequence." }, support: { label: "Staff Churn", description: "Contract hires learn the software in a day and do not learn the old remedy." } },
      suggested: ["ai", "networks", "computing", "crypto", "iot", "vr"],
      suggestedWhy: {
        "ai": "A ward aid can suggest the auntie sequence when the fever pattern returns.",
        "networks": "A midwife link can pass the ginger-water step at the handoff.",
        "computing": "A local chart can store the sips and the rest next to the dose.",
        "crypto": "A locked note can keep the family remedy for the senior midwife team.",
        "iot": "A bed sensor can mark the fever return before the morning flag.",
        "vr": "A shared view can show the wrist cool step to a new contract hire.",
      },
      visionTheme: "care-city",
    }
  ],

  "rural-roads": [
    {
      places: ["Cajón Seco bridge spur, Chiapas highlands"],
      title: "Harvest trucks stop at the broken bailey",
      summary: "Rosa backs the first pickup to the bailey at dawn. A sheared plate lists the steel deck toward the ravine. Green cherry will sour by afternoon if the trucks cannot cross.",
      scene:
        "Rosa backs the first pickup to the bailey at dawn. Green cherry is still wet from the night. The steel deck lists toward the ravine. A plate sheared in the last storm. The deck once took three trucks in one hour. She stops the engine and listens to the creek.\n\nBuyers wait on the far bank with scales and cash. Co-op members stack sacks behind Rosa. The sacks will sour by afternoon if the trucks stay.\n\nThe municipal works chief arrives with a clipboard and no crane. Spare parts sit in a depot two ridges away. A contractor holds the bill for the spare parts. The contractor works only when the road is open.",
      briefMd:
        "## The place\n\nThe bailey stands on the Cajón Seco bridge spur in the Chiapas highlands. Rosa backs the first pickup to the bailey at dawn. Green cherry is still wet from the night. The steel deck lists toward the ravine. A plate sheared in the last storm. The deck once took three trucks in one hour.\n\nShe stops the engine and listens to the creek. Buyers wait on the far bank with scales and cash. Co-op members stack sacks behind Rosa. The sacks will sour by afternoon if the trucks stay.\n\nThe municipal works chief arrives with a clipboard and no crane. Spare parts sit in a depot two ridges away. A contractor holds the bill for the spare parts. The contractor works only when the road is open.\n\n## The bigger problem\n\nBudget lines still favor the paved spur. The paved spur serves the tourist lodge down-valley. Rosa loses grade on her lot while the paperwork waits. The paperwork waits for dry weather. Dry weather does not arrive.\n\n## Your job\n\nMove the harvest across the bailey before the green cherry sours.",
      stakeholder: "Smallholder coffee cooperative and municipal works chief",
      crisisMeters: { local: { label: "Spoiled Crop", description: "Green cherry will sour by afternoon if the sacks stay on this bank." }, global: { label: "Bridge Fail", description: "A sheared plate lists the steel deck toward the ravine at the bailey." }, support: { label: "Spare Cash", description: "The municipal works chief has a clipboard and no crane. Spare parts sit two ridges away on a contractor bill." } },
      suggested: ["transportation", "materials", "drones", "iot", "solar", "networks", "ai", "print3d"],
      suggestedWhy: {
        "transportation": "A light truck can move sacks if a crew first makes the steel deck safe.",
        "materials": "Plate stock can hold a steel deck after a storm shears one plate.",
        "drones": "A small aircraft can view the bailey when no crane is on site.",
        "iot": "A sensor can warn Rosa when the steel deck lists toward the ravine.",
        "solar": "A solar unit can run a scale on the bank when the pickup is off.",
        "networks": "A radio link can tell buyers when a truck can cross the bailey.",
        "ai": "A load aid can order sack trips before green cherry sours in the heat.",
        "print3d": "A local print unit can make a small plate when the depot is far.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Barotse floodplain hamlets, Western Zambia"],
      title: "Clinic boat cannot beat the cut-off levee",
      summary: "Nurse Mwale poles the clinic skiff toward the cut. The new levee wall sits raw and high and seals the old water path. A mother on the far bank holds a child with a fever that will not break.",
      scene:
        "Nurse Mwale poles the clinic skiff toward the cut. The channel ran through the cut before. The new levee wall sits raw and high. The wall protects the rice scheme upstream. The wall also seals the old water path. That water path is necessary for the clinic skiff.\n\nA mother on the far bank holds a child. The child has a fever that will not break. Nurse Mwale beaches the skiff on mud. She walks the long way with a dry kit. The time for simple treatment is short when she arrives.",
      briefMd:
        "## The place\n\nThe hamlets sit on the Barotse floodplain in Western Zambia. Nurse Mwale poles the clinic skiff toward the cut. The channel ran through the cut before. The new levee wall sits raw and high. The wall protects the rice scheme upstream. The wall also seals the old water path.\n\nThat water path is necessary for the clinic skiff. A mother on the far bank holds a child. The child has a fever that will not break. Nurse Mwale beaches the skiff on mud. She walks the long way with a dry kit. The time for simple treatment is short when she arrives.\n\n## The bigger problem\n\nThe traditional authority council approved the wall after three wet seasons. The wet seasons ruined the fields. No person mapped the clinic route into the same plan. The rice pumps take fuel for a long detour first. The care path was not a line on the levee drawings.\n\n## Your job\n\nKeep clinic care available in the hamlets when the water rises.",
      stakeholder: "River clinic nurses and traditional authority council",
      crisisMeters: { local: { label: "Late Care", description: "The time for simple treatment is short when Nurse Mwale walks the long way." }, global: { label: "Blocked Path", description: "The new levee wall seals the old water path that the clinic skiff must use." }, support: { label: "Levee Politics", description: "The traditional authority council approved the wall, but no person mapped the clinic route." } },
      suggested: ["transportation", "drones", "solar", "battery", "networks", "iot", "ai", "materials"],
      suggestedWhy: {
        "transportation": "A shallow skiff can use a side path when the levee seals the old cut.",
        "drones": "A small aircraft can carry a dry kit when the skiff cannot pass.",
        "solar": "A solar unit can charge a clinic radio when pumps take the fuel.",
        "battery": "A battery can run a small cooler on the long walk to the hamlet.",
        "networks": "A radio link can call the far bank before Nurse Mwale leaves the mud.",
        "iot": "A water sensor can show when the cut is open for the clinic skiff.",
        "ai": "A map aid can put the clinic route on the same plan as the levee.",
        "materials": "Panel stock can form a small gate so a skiff can pass the wall.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Ömnögovi winter school trace, South Gobi"],
      title: "Winter school bus never clears the dune line",
      summary: "Head teacher Batbold stands at the boarding gate with a thermos and a roster. The bus sits beyond the first dune line after wind filled the packed trace. Children wait in the ger camp, but the lessons for the week will not start.",
      scene:
        "Head teacher Batbold stands at the boarding gate with a thermos and a roster. The bus is a dark shape beyond the first dune line. Wind filled the packed trace overnight. Herder parents radio from the ger camp. The children are safe in the ger camp. The lessons for the week will not start.\n\nThe grader budget for last year went to the mine spur. The mine spur moves the ore. The soft school track is still temporary on the district map. Teachers from town miss three days in a row. The teachers seek posts near the paved road. Batbold marks one more empty column in the attendance book.",
      briefMd:
        "## The place\n\nThe winter school trace crosses Ömnögovi in the South Gobi. Head teacher Batbold stands at the boarding gate with a thermos and a roster. The bus is a dark shape beyond the first dune line. Wind filled the packed trace overnight.\n\nHerder parents radio from the ger camp. The children are safe in the ger camp. The lessons for the week will not start. Batbold marks one more empty column in the attendance book. The desert does not wait for a better alignment.\n\n## The bigger problem\n\nThe grader budget for last year went to the mine spur. The mine spur moves the ore. The soft school track is still temporary on the district map. Teachers from town miss three days in a row. The teachers seek posts near the paved road.\n\n## Your job\n\nKeep a winter route open so children can start lessons on time.",
      stakeholder: "Boarding-school head and herder parents’ association",
      crisisMeters: { local: { label: "Missed Class", description: "The lessons for the week will not start while the bus sits beyond the dune line." }, global: { label: "Soft Trace", description: "Wind filled the packed school trace, and the district map still marks the track as temporary." }, support: { label: "Teacher Exit", description: "Teachers from town miss three days in a row and seek posts near the paved road." } },
      suggested: ["transportation", "space", "iot", "solar", "networks", "ai", "vr", "battery"],
      suggestedWhy: {
        "transportation": "A low bus can cross a firm winter trace before wind fills the dunes.",
        "space": "A space view can show the dune line before the bus leaves the gate.",
        "iot": "A track sensor can warn Batbold when wind fills the packed trace.",
        "solar": "A solar unit can power a radio at the ger camp in winter.",
        "networks": "A radio net can link the boarding gate with herder parents in camp.",
        "ai": "A route aid can pick a firm trace before the bus meets the dune line.",
        "vr": "A remote class tool can start lessons while children wait in camp.",
        "battery": "A battery can run a class radio when the bus cannot leave town.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Peerless Lake ice spur, northern Alberta"],
      title: "Fuel and dialysis miss the thaw window",
      summary: "Health director Leanne Cardinal watches the plow turn back at the pressure ridge. The ice road that feeds Peerless Lake already leaks at the seams. Diesel and dialysis sit on the far shore, and a patient cannot wait for the next freeze.",
      scene:
        "Health director Leanne Cardinal watches the plow from the contractor. The plow turns back at the pressure ridge. The ice road that feeds Peerless Lake already leaks at the seams. Diesel for the clinic generator sits on the far shore. The monthly dialysis run sits on the far shore with the diesel.\n\nContracts lock the heavy trucks to a fixed haul calendar. The haul calendar fits colder decades. Warm spells at this time cut days from the start and the end of the season. A patient must get treatment two times a week. The patient cannot wait for the next freeze. The next freeze can fail to hold.",
      briefMd:
        "## The place\n\nThe ice spur serves Peerless Lake in northern Alberta. Health director Leanne Cardinal watches the plow from the contractor. The plow turns back at the pressure ridge. The ice road already leaks at the seams. Diesel for the clinic generator sits on the far shore. The monthly dialysis run sits there with the diesel.\n\nA patient must get treatment two times a week. The patient cannot wait for the next freeze. The next freeze can fail to hold. Barges are many months away. Air charters spend the health budget in one afternoon.\n\n## The bigger problem\n\nContracts lock the heavy trucks to a fixed haul calendar. The haul calendar fits colder decades. Warm spells at this time cut days from the start and the end of the season. The system still plans for winter as a reliable bridge.\n\n## Your job\n\nKeep clinic fuel and dialysis on site when the ice goes soft early.",
      stakeholder: "First Nation health director and winter-road contractors’ co-op",
      crisisMeters: { local: { label: "Supply Gaps", description: "Diesel for the clinic generator and the dialysis run sit on the far shore." }, global: { label: "Thaw Days", description: "Warm spells cut days from the ice road season at Peerless Lake." }, support: { label: "Contract Lock", description: "Contracts lock heavy trucks to a haul calendar that fits colder decades." } },
      suggested: ["transportation", "drones", "materials", "energy", "solar", "battery", "iot", "networks"],
      suggestedWhy: {
        "transportation": "A light sled can move diesel when heavy trucks turn back on soft ice.",
        "drones": "A small aircraft can carry dialysis stock when the ice road leaks.",
        "materials": "A surface mat can spread load on soft ice near a pressure ridge.",
        "energy": "A local energy unit can cut diesel use at the clinic generator.",
        "solar": "A solar unit can charge clinic gear when the thaw comes early.",
        "battery": "A battery bank can run dialysis for a short gap in the ice season.",
        "iot": "An ice sensor can warn Leanne Cardinal when seams start to leak.",
        "networks": "A radio link can call a small haul before the ice season ends.",
      },
      visionTheme: "rebuild-city",
    }
  ],

  smoking: [
    {
      places: ["Tijuana Maquiladora Gate 7"],
      title: "The gate line runs on shared packs",
      summary: "Rosa clocks the line at Gate 7 before the second shift horn. The women pass one pack down the chain. No woman burns a full carton before payday. Two women refuse a lung check. The two women fear a mark on the attendance sheet more than the cough.",
      scene:
        "Rosa clocks the line at Gate 7 before the second shift horn. The women pass one pack down the chain. No woman burns a full carton before payday. The shared packs keep the line calm. The shared packs keep the piece-rate steady.\n\nThe plant nurse station logs tight chests and lost hours on the soldering floor. Rosa pulls three women aside for a quiet lung check. Two women refuse the check. The two women fear a mark on the attendance sheet more than the cough.\n\nA cessation flyer peels in the sun. No woman stops. The break yard is the only place where supervisors do not time bathroom trips.\n\nThe kiosk outside the fence sells cartons cheaper than the clinic sells patches. A junior tech misses her certification window after a week of wheeze. Rosa must still clear the floor for export.",
      briefMd:
        "## The place\nRosa clocks the line at Gate 7 before the second shift horn. The women pass one pack down the chain. No woman burns a full carton before payday. The shared packs keep the line calm. The shared packs keep the piece-rate steady.\n\nThe plant nurse station logs tight chests and lost hours on the soldering floor. Rosa pulls three women aside for a quiet lung check. Two women refuse the check. The two women fear a mark on the attendance sheet more than the cough.\n\nThe break yard is the only place where supervisors do not time bathroom trips. A cessation flyer peels in the sun. No woman stops.\n\n## The bigger problem\nThe kiosk outside the fence sells cartons cheaper than the clinic sells patches. A junior tech misses her certification window after a week of wheeze. Rosa must still clear the floor for export.\n\n## Your job\nKeep the soldering floor clear for export without a mark on the attendance sheet.",
      stakeholder: "Plant occupational nurse collective",
      crisisMeters: { local: { label: "Sick Days", description: "The plant nurse station logs tight chests and lost hours on the soldering floor." }, global: { label: "Cheap Cartons", description: "The kiosk outside the fence sells cartons cheaper than the clinic sells patches." }, support: { label: "Break Culture", description: "The break yard is the only place where supervisors do not time bathroom trips." } },
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      suggestedWhy: {
        "ai": "Ai can group tight-chest logs from the soldering floor by shift.",
        "networks": "Networks can carry cough notes from Gate 7 to the nurse station.",
        "iot": "Iot can sense haze in the break yard during the shared pack pass.",
        "vr": "Vr can show the cough strain of a shared pack before payday.",
        "computing": "Computing can compare carton prices at the fence with patch prices.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Hanoi Secondary Gate Snack Strip"],
      title: "Snack carts sell the first drag",
      summary: "Lan waits at the school gate. Lan holds the inhaler of the son of Lan in her fist. The carts open with bread, tea, and single sticks. The sticks sell cheaper than candy. The dry cough follows the son of Lan into math.",
      scene:
        "Lan waits at the school gate. Lan holds the inhaler of the son of Lan in her fist. The snack strip wakes before the bell. The carts open with bread, tea, and single sticks. The sticks sell cheaper than candy.\n\nThe boys cluster where the shade hits the wall. A teacher confiscates one stick. Three more sticks appear by lunch.\n\nThe gate rent is cash on Friday. The tobacco margin keeps the carts in place when noodle sales dip. The parents on the health board post a no-smoking sign. The carts roll two meters down the fence line.\n\nThe son of Lan starts a dry cough. The cough follows the son of Lan into math. Lan can walk the son of Lan past the strip. Lan cannot walk each classmate past the rent that stocks the carts.",
      briefMd:
        "## The place\nLan waits at the school gate. Lan holds the inhaler of the son of Lan in her fist. The snack strip wakes before the bell. The carts open with bread, tea, and single sticks. The sticks sell cheaper than candy.\n\nThe boys cluster where the shade hits the wall. A teacher confiscates one stick. Three more sticks appear by lunch. The son of Lan starts a dry cough. The cough follows the son of Lan into math.\n\n## The bigger problem\nThe gate rent is cash on Friday. The tobacco margin keeps the carts in place when noodle sales dip. The parents on the health board post a no-smoking sign. The carts roll two meters down the fence line. Lan can walk the son of Lan past the strip. Lan cannot walk each classmate past the rent that stocks the carts.\n\n## Your job\nStop the dry cough in math class without a loss of the gate rent.",
      stakeholder: "Parent-teacher health board",
      crisisMeters: { local: { label: "Kids Coughing", description: "The dry cough follows the son of Lan into math." }, global: { label: "Single Sticks", description: "The sticks sell cheaper than candy on the snack strip." }, support: { label: "Gate Rent", description: "The tobacco margin keeps the carts in place when noodle sales dip." } },
      suggested: ["ai", "networks", "iot", "drones", "solar"],
      suggestedWhy: {
        "ai": "Ai can track stick sales on the snack strip before the school bell.",
        "networks": "Networks can link the health board sign with cart locations on the fence.",
        "iot": "Iot can sense smoke where the boys cluster by the shade wall.",
        "drones": "Drones can map cart positions along the fence line before lunch.",
        "solar": "Solar can supply power for a health board sign at the school gate.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Marseille Fos Container Break Yard"],
      title: "Dock break rooms still billow",
      summary: "Marc opens the break room door after a double crane shift. Marc steps into a blue haze. The men crush butts into a coffee tin. The fan rattles. The stevedore with the young lungs leaves early. The stevedore is short on hours and short on pay.",
      scene:
        "Marc opens the break room door after a double crane shift. Marc steps into a blue haze. The extractor fan rattles. The fan does not clear the haze. The men crush butts into a coffee tin.\n\nThe yard pays a cut from the cigarette machine by the time clock. Overtime is the real wage. The smokes pace the wait between ship calls.\n\nMarc logs particulate spikes on a handheld. The union bought the handheld. The stevedore with the young lungs leaves early. The stevedore is short on hours and short on pay.\n\nA safety memo asks for a clean room. Vending revenue funds the night porter under the concession contract. Marc can move chairs. Marc cannot move the cut that restocks the machine each Monday.",
      briefMd:
        "## The place\nMarc opens the break room door after a double crane shift. Marc steps into a blue haze. The extractor fan rattles. The fan does not clear the haze. The men crush butts into a coffee tin.\n\nMarc logs particulate spikes on a handheld. The union bought the handheld. The stevedore with the young lungs leaves early. The stevedore is short on hours and short on pay.\n\n## The bigger problem\nThe yard pays a cut from the cigarette machine by the time clock. Overtime is the real wage. The smokes pace the wait between ship calls. A safety memo asks for a clean room. Vending revenue funds the night porter under the concession contract.\n\nMarc can move chairs. Marc cannot move the cut that restocks the machine each Monday.\n\n## Your job\nClear the blue haze in the break room without a loss of porter pay.",
      stakeholder: "Port occupational safety steward",
      crisisMeters: { local: { label: "Dirty Air", description: "Marc steps into a blue haze. The fan does not clear the haze." }, global: { label: "Vending Cut", description: "The yard pays a cut from the cigarette machine by the time clock." }, support: { label: "Overtime Norm", description: "Overtime is the real wage. The smokes pace the wait between ship calls." } },
      suggested: ["iot", "materials", "ai", "networks", "print3d"],
      suggestedWhy: {
        "iot": "Iot can log particulate spikes in the break room after a crane shift.",
        "materials": "Materials can resist smoke stain on the break room walls and chairs.",
        "ai": "Ai can read particulate logs from the union handheld by the time clock.",
        "networks": "Networks can send haze logs from the break room to the safety steward.",
        "print3d": "Print3d can shape a spare piece for the extractor fan that rattles.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Nairobi Maternity Waiting Home Courtyard"],
      title: "Courtyard haze reaches the newborn cots",
      summary: "Amina wipes the face of a newborn. Amina hears the wheeze start again under the mosquito net. Smoke from the yard kiosk drifts under the eaves to the cots. One mother leaves early. The lungs of the mother are tight. The baby of the mother is small.",
      scene:
        "Amina wipes the face of a newborn. Amina hears the wheeze start again under the mosquito net.\n\nThe fathers and the uncles gather in the courtyard after dark. The yard kiosk sells tea, airtime, and loose cigarettes to men who cannot enter the ward. Smoke drifts under the eaves. The mothers wait under the eaves in the last weeks of pregnancy. The night visits let the families share news and money.\n\nAmina asks the kiosk to move. The vendor pays the home a small fee. The fee buys soap and lamp oil. One mother leaves early. The lungs of the mother are tight. The baby of the mother is small.\n\nAmina can close a window. Amina cannot close the kinship that funds the shelf.",
      briefMd:
        "## The place\nAmina wipes the face of a newborn. Amina hears the wheeze start again under the mosquito net.\n\nThe fathers and the uncles gather in the courtyard after dark. The yard kiosk sells tea, airtime, and loose cigarettes to men who cannot enter the ward. Smoke drifts under the eaves. The mothers wait under the eaves in the last weeks of pregnancy. The night visits let the families share news and money.\n\n## The bigger problem\nAmina asks the kiosk to move. The vendor pays the home a small fee. The fee buys soap and lamp oil. One mother leaves early. The lungs of the mother are tight. The baby of the mother is small.\n\nAmina can close a window. Amina cannot close the kinship that funds the shelf.\n\n## Your job\nKeep smoke off the newborn cots without a loss of the soap fee.",
      stakeholder: "Midwife cooperative lead",
      crisisMeters: { local: { label: "Baby Wheeze", description: "Amina hears the wheeze start again under the mosquito net." }, global: { label: "Yard Kiosk", description: "The yard kiosk sells loose cigarettes to men who cannot enter the ward." }, support: { label: "Night Visits", description: "The night visits let the families share news and money in the courtyard." } },
      suggested: ["iot", "materials", "ai", "networks", "nano"],
      suggestedWhy: {
        "iot": "Iot can sense smoke under the eaves near the newborn cots.",
        "materials": "Materials can block smoke drift at a window of the waiting home.",
        "ai": "Ai can sort night visit times when smoke reaches the cots.",
        "networks": "Networks can share kiosk fee notes with the midwife cooperative.",
        "nano": "Nano can trap fine smoke particles under the eaves.",
      },
      visionTheme: "care-city",
    }
  ],

  sanitation: [
    {
      places: ["Sunwell Primary Compound"],
      title: "Latrine queues send girls home by noon",
      summary: "Amina stands at the first bell outside the girls block. She holds the hand of her sister. The line wraps past the water drum. Only two stalls work. Her sister misses arithmetic for two days. She does not risk the stall.",
      scene:
        "At the first bell, Amina stands outside the girls block at Sunwell Primary Compound. She holds the hand of her younger sister. The line wraps past the water drum. Two stalls work. Wire holds the third door shut. At mid-morning the queue stays long.\n\nGirls leave class in pairs. The girls walk toward the gate. The wait takes the lesson.\n\nThe pits serve a smaller school. The enrollment doubled after the feeder path opened. The district budgets desludging once in a term. The vacuum truck comes late. On other days the vacuum truck does not come. Teachers mark the absences.\n\nA stomach bug spreads through a grade. Mothers keep daughters at home. The sister of Amina misses arithmetic for two days. She does not risk the stall. The hygiene club scrubs the seats. The hygiene club posts duty rosters.\n\nThe hygiene club cannot empty the pits. The schedule does not fund the emptying.",
      briefMd:
        "## The place\n\nSunwell Primary Compound holds the girls block beside a water drum. At the first bell, Amina stands in the line with her younger sister. Two stalls work. Wire holds the third door shut. At mid-morning the queue stays long. Girls leave class and walk toward the gate.\n\nThe wait takes the lesson from the girls. Teachers mark the absences. A stomach bug spreads through a grade. Mothers keep daughters at home. The sister of Amina misses arithmetic for two days. She does not risk the stall.\n\n## The bigger problem\n\nThe pits serve a smaller school. The enrollment doubled after the feeder path opened. The district budgets desludging once in a term. The vacuum truck comes late. On other days the vacuum truck does not come.\n\nThe hygiene club scrubs the seats. The hygiene club posts duty rosters. The hygiene club cannot empty the pits. The schedule does not fund that work.\n\n## Your job\n\nKeep a working stall open for each girl through the school day.",
      stakeholder: "Parent-teacher hygiene club",
      crisisMeters: { local: { label: "Sick Kids", description: "Girls stay home sick after a stomach bug spreads through a grade at Sunwell Primary Compound." }, global: { label: "Full Pits", description: "The pits stay full because the vacuum truck comes late to Sunwell Primary Compound." }, support: { label: "Budget Gap", description: "The district funds desludging once in a term. The hygiene club cannot empty the pits." } },
      suggested: ["solar", "iot", "materials", "print3d", "robots", "ai", "networks", "transportation"],
      suggestedWhy: {
        "solar": "Solar lights can show the stall line at the first bell.",
        "iot": "Sensors can warn the hygiene club when a stall fails.",
        "materials": "Tough materials can hold a stall door without wire.",
        "print3d": "A printed latch can replace the wire on the third door.",
        "robots": "A service robot can help clear a full pit between truck visits.",
        "ai": "A simple model can link absences to a full pit or a closed stall.",
        "networks": "A school network can share the duty roster with the hygiene club.",
        "transportation": "A planned truck route can empty the pits before the queue grows.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Ladder Cut Settlement"],
      title: "Sewage owns the only stair out",
      summary: "Rafi carries his mother down the shared stair. He takes one careful step at a time. Gray water covers the treads after the backup from last night. His mother slips. The residents union carries her to a clinic one hour away.",
      scene:
        "Rafi carries his mother down the shared stair at Ladder Cut Settlement. He takes one careful step at a time. Gray water covers the treads. The backup from last night left a slick. The slick smells of soap and waste. This narrow flight is the route from the upper rooms.\n\nThe flight floods when the channel below clogs. Landlords collect rent by the room. Landlords treat the open drain as a public problem. Landlords patch the walls. Landlords do not rebuild the line under the cut.\n\nResidents tip buckets into the same channel after dark. The shared latrine backs up by evening. Skin sores grow on ankles. The ankles touch the wet rail.\n\nThe mother of Rafi slips. The residents union carries her to a clinic. The clinic is one hour away. A deed does not assign the pipe. A delay costs less than a new run.",
      briefMd:
        "## The place\n\nLadder Cut Settlement uses one shared stair from the upper rooms. Rafi carries his mother down that stair. Gray water covers the treads. The backup from last night left a slick of soap and waste. The channel below clogs. Then the flight floods.\n\nSkin sores grow on ankles that touch the wet rail. The mother of Rafi slips. The residents union carries her to a clinic one hour away.\n\n## The bigger problem\n\nLandlords collect rent by the room. Landlords patch the walls. Landlords do not rebuild the line under the cut. Residents tip buckets into the channel after dark. The shared latrine backs up by evening. A deed does not assign the pipe.\n\nA delay costs less than a new run. The channel keeps the waste from the settlement.\n\n## Your job\n\nKeep the shared stair dry for residents who leave the upper rooms.",
      stakeholder: "Stair-block residents' union",
      crisisMeters: { local: { label: "Skin Sores", description: "Skin sores grow on ankles that touch the wet rail at Ladder Cut Settlement." }, global: { label: "Open Channels", description: "Open channels take waste because a deed does not assign the pipe." }, support: { label: "Landlord Delay", description: "Landlords delay a new run because a delay costs less." } },
      suggested: ["materials", "drones", "iot", "print3d", "solar", "battery", "ai", "robots"],
      suggestedWhy: {
        "materials": "Hard treads can keep feet clear of the slick on the stair.",
        "drones": "A small drone can show a clog in the channel under the cut.",
        "iot": "Sensors can warn residents when the channel clogs.",
        "print3d": "A printed tread cover can give a grip on the wet stair.",
        "solar": "A solar pump can move gray water off the shared stair.",
        "battery": "A battery can run a small pump when the channel floods at night.",
        "ai": "A simple model can flag flood risk on the shared stair.",
        "robots": "A small robot can clear a clog in the channel under the cut.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Crossridge Freight Yard"],
      title: "Behind the fuel bay is the toilet",
      summary: "Devi looks for the stall behind the fuel bay at shift change. The light is dead again. The lock hangs open after the last jam. A loader loses the load bonus on a walk to the gatehouse.",
      scene:
        "At shift change, Devi looks for the stall behind the fuel bay at Crossridge Freight Yard. The light is dead again. The lock hangs open. The last crew kicked the door when the door jammed.\n\nNight loaders hold the door for other loaders. On some nights the loaders cannot hold the door. Then the loaders go behind the tanker line. Gut bugs move through the mutual aid circle in each wet month.\n\nThe yard lease puts toilets on the tenant side. The freight company sublets the bay to three crews. The three crews share one failing block. Management counts trucks. Management does not count stalls.\n\nA loader loses the load bonus. That loader walks from the apron to the gatehouse. Devi rinses her hands from a jerrycan. Devi bought the jerrycan.\n\nThe mutual aid circle stocks soap. The mutual aid circle keeps a key rota. The mutual aid circle cannot rewrite the lease. The lease treats sanitation as optional overhead on night freight.",
      briefMd:
        "## The place\n\nCrossridge Freight Yard keeps a stall behind the fuel bay. At shift change, Devi looks for that stall. The light is dead again. The lock hangs open. The last crew kicked the door when the door jammed. Night loaders hold the door when the loaders can.\n\nOn some nights the loaders cannot hold the door. Then the loaders go behind the tanker line. Gut bugs move through the mutual aid circle in each wet month. Devi rinses her hands from a jerrycan. Devi bought the jerrycan.\n\n## The bigger problem\n\nThe yard lease puts toilets on the tenant side. The freight company sublets the bay to three crews. The three crews share one failing block. Management counts trucks. Management does not count stalls. A loader loses the load bonus on a walk to the gatehouse.\n\nThe mutual aid circle stocks soap. The mutual aid circle keeps a key rota. The mutual aid circle cannot rewrite the lease. The lease treats sanitation as optional overhead on night freight.\n\n## Your job\n\nGive night loaders a working toilet without loss of the load bonus.",
      stakeholder: "Night loaders' mutual aid circle",
      crisisMeters: { local: { label: "Gut Bugs", description: "Gut bugs move through the mutual aid circle in each wet month at the yard." }, global: { label: "Locked Stalls", description: "The stall lock hangs open behind the fuel bay. Night loaders cannot rely on that stall." }, support: { label: "Lease Squeeze", description: "The yard lease puts toilets on the tenant side. Three crews share one failing block." } },
      suggested: ["solar", "iot", "materials", "networks", "ai", "crypto", "transportation", "print3d"],
      suggestedWhy: {
        "solar": "Solar power can light the stall behind the fuel bay at night.",
        "iot": "Sensors can show a jammed door or a dead light to the circle.",
        "materials": "Strong materials can keep the stall door and the lock in use.",
        "networks": "A yard network can share the key rota with night loaders.",
        "ai": "A simple model can link gut bugs to a failed stall in wet months.",
        "crypto": "A simple lock code can limit stall access without a broken key.",
        "transportation": "A short path can keep loaders near the apron and the stall.",
        "print3d": "A printed latch can replace the lock that the last crew kicked.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Olive Court Rest Home"],
      title: "The wing that smells before breakfast",
      summary: "Nurse Okonkwo opens a window in Wing B before the tray carts roll. The sour edge stays in the hall. The stack backs up on the old wing first. Mr. Salim does not walk to the dayroom until the floor dries.",
      scene:
        "Before the tray carts roll, Nurse Okonkwo opens a window in Wing B at Olive Court Rest Home. She still smells the sour edge in the hall. Mr. Salim does not walk to the dayroom. The bathroom fan rattles. The floor stays wet.\n\nThe stack backs up on the old wing first. The pipes fit fewer beds. The pipes fit fewer wipe-downs. Contract cuts remove the overnight cleaner. Contract cuts delay the rodding crew for one more quarter.\n\nFamilies smell the hall on morning visits. One daughter does not leave her father overnight. Soiled linen stays down. Shared toilets stay wet. Infections rise.\n\nThe family caregivers council logs each backup with a time and a photo. Administration sends a memo about agency staff. Administration promises a plumbing tender in the next budget cycle. Nurse Okonkwo has one good bathroom for a full corridor.",
      briefMd:
        "## The place\n\nBefore the tray carts roll, Nurse Okonkwo opens a window in Wing B. The sour edge stays in the hall. Mr. Salim does not walk to the dayroom. The bathroom fan rattles. The floor stays wet. Nurse Okonkwo has one good bathroom for a full corridor.\n\nThe stack backs up on the old wing first. The pipes fit fewer beds. The pipes fit fewer wipe-downs. Soiled linen stays down. Shared toilets stay wet. Infections rise.\n\n## The bigger problem\n\nContract cuts remove the overnight cleaner. Contract cuts delay the rodding crew for one more quarter. Families smell the hall on morning visits. One daughter does not leave her father overnight. The family caregivers council logs each backup with a time and a photo. Administration sends a memo about agency staff.\n\nAdministration promises a plumbing tender in the next budget cycle. The old wing still backs up first.\n\n## Your job\n\nGive each elder in Wing B a dry path to a clean bathroom.",
      stakeholder: "Family caregivers' council",
      crisisMeters: { local: { label: "Infections", description: "Infections rise in Wing B when soiled linen stays down and toilets stay wet." }, global: { label: "Backed Pipes", description: "The stack backs up on the old wing because the pipes fit fewer beds." }, support: { label: "Contract Cuts", description: "Contract cuts remove the overnight cleaner. The same cuts delay the rodding crew for one quarter." } },
      suggested: ["iot", "robots", "materials", "solar", "ai", "gene-sequencing", "networks", "print3d"],
      suggestedWhy: {
        "iot": "Sensors can warn staff when the stack in Wing B backs up.",
        "robots": "A cleaning robot can lift soiled linen before infections rise.",
        "materials": "Smooth floor materials can dry faster after a backup in Wing B.",
        "solar": "A solar vent can move sour air out of Wing B.",
        "ai": "A simple model can flag backup times from the council logs.",
        "gene-sequencing": "A lab test can name the germs that ride soiled linen in Wing B.",
        "networks": "A care network can send backup logs to administration the same morning.",
        "print3d": "A printed fan part can quiet the rattle in the Wing B bathroom.",
      },
      visionTheme: "care-city",
    }
  ],

  waste: [
    {
      places: ["Circuit Lane Scrap Alleys"],
      title: "Smoke over Circuit Lane",
      summary: "Rina pries a cracked phone open on Circuit Lane before the tip truck arrives. The board is glued shut. Rina feeds the handset to the alley fire. A child two floors up coughs into a school shirt. Plastic stink climbs the stairs.",
      scene:
        "Rina pries a cracked phone open with a butter knife before the morning tip truck arrives. The board is glued shut. Screws hide under the stickers. The copper is necessary for Rina on this day. Rina cannot wait until next week.\n\nThe knife slips. Rina feeds the whole handset to the alley fire between the shuttered stalls. The fire gives smoke. Plastic stink climbs the tenement stairs. A child two floors up coughs into a school shirt. The eyes of Rina water by noon.\n\nThe city dump raised the gate fee again last month. A sealed gadget pays no money as a whole unit. The licensed yard does not take mixed scrap without a receipt. Rina does not have the receipt. Thus the lane burns phones that the lane cannot open.\n\nThe informal scrap pickers association keeps a shared inhaler in a biscuit tin. Trucks roll in with phones that makers do not build for take-apart.",
      briefMd:
        "## The place\nCircuit Lane Scrap Alleys hold shuttered stalls and a morning tip truck. Rina pries a cracked phone open with a butter knife. The board is glued shut. Screws hide under the stickers. The copper is necessary for Rina on this day.\n\nThe knife slips. Rina feeds the handset to the alley fire. Plastic stink climbs the tenement stairs. A child two floors up coughs into a school shirt. The eyes of Rina water by noon. The informal scrap pickers association keeps a shared inhaler in a biscuit tin.\n\n## The bigger problem\nThe city dump raised the gate fee again last month. A sealed gadget pays no money as a whole unit. The licensed yard does not take mixed scrap without a receipt. Rina does not have the receipt. Thus the lane burns phones that the lane cannot open. Trucks roll in with phones that makers do not build for take-apart.\n\n## Your job\nMake a take-apart path so the alley does not choose between rent and clean air.",
      stakeholder: "Informal scrap pickers' association",
      crisisMeters: { local: { label: "Burn Smoke", description: "Burn smoke from plastic climbs the tenement stairs on Circuit Lane. A child coughs into a school shirt. The eyes of Rina water by noon." }, global: { label: "Sealed Gadgets", description: "Makers seal gadgets with glue and hide screws under stickers. A whole phone pays no money. Trucks bring phones with no take-apart path." }, support: { label: "Tip Fees", description: "The city dump raised the gate fee last month. The licensed yard does not take mixed scrap without a receipt. Rina does not have that receipt." } },
      suggested: ["materials", "iot", "robots", "ai", "networks", "print3d", "drones", "computing"],
      suggestedWhy: {
        "materials": "Materials can loosen glue on a sealed phone so the board can open.",
        "iot": "Iot can carry a scrap identity when Rina does not hold a paper receipt.",
        "robots": "Robots can open a glued handset so the alley fire is not the path.",
        "ai": "Ai can find screws under stickers before the butter knife slips.",
        "networks": "Networks can link the lane to the licensed yard when the gate fee rises.",
        "print3d": "Print3d can make a small opener that fits phones on Circuit Lane.",
        "drones": "Drones can see burn smoke above the tenement stairs.",
        "computing": "Computing can compare copper value with the dump fee on the same day.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Junction Battery Sheds"],
      title: "Swollen packs behind the shed",
      summary: "Dev rolls a swollen pack out of the kiosk shade with a stick. The case hisses. Acid bite hits the back of his throat before Dev can step away. Rain finds a seam in the tarp tent. A neighbor dog limps after a sniff of the runoff.",
      scene:
        "Dev rolls a swollen e-bike pack out of the kiosk shade with a stick. The case hisses. Acid bite hits the back of his throat before Dev can step away. Riders queue for swaps at lunch.\n\nDead packs lean in a plastic tarp tent behind the shed. The tent holds more packs each week. Rain finds a seam. A neighbor dog limps after a sniff of the runoff. Dev keeps a chalk tally on the shed wall. The stuck column wins.\n\nThe licensed recycler sits across the ring road. The recycler charges by the kilo plus a hazmat surcharge. The e-bike kiosk operators guild cannot split the surcharge among twelve kiosk owners. Thus the packs wait.\n\nCheap packs arrive sealed and unlabeled. Sellers sell the packs as disposable range.",
      briefMd:
        "## The place\nDev rolls a swollen e-bike pack out of the kiosk shade with a stick. The case hisses. Acid bite hits the back of his throat before Dev can step away. Riders queue for swaps at lunch.\n\nDead packs lean in a plastic tarp tent behind the shed. The tent holds more packs each week. Rain finds a seam. A neighbor dog limps after a sniff of the runoff. Dev keeps a chalk tally on the shed wall. The stuck column wins.\n\n## The bigger problem\nThe licensed recycler sits across the ring road. The recycler charges by the kilo plus a hazmat surcharge. The e-bike kiosk operators guild cannot split the surcharge among twelve kiosk owners. Thus the packs wait. Cheap packs arrive sealed and unlabeled. Sellers sell the packs as disposable range.\n\n## Your job\nMake a return loop so a swollen pack does not become a puddle behind the shed.",
      stakeholder: "E-bike kiosk operators guild",
      crisisMeters: { local: { label: "Acid Smell", description: "Acid smell hits the throat of Dev when a swollen pack hisses in the kiosk shade. Riders still queue for swaps at lunch." }, global: { label: "Dead Packs", description: "Dead packs lean in a tarp tent behind the shed. The tent holds more packs each week. Cheap packs arrive sealed and unlabeled." }, support: { label: "Haul Cost", description: "The licensed recycler charges by the kilo plus a hazmat surcharge. The guild cannot split that surcharge among twelve kiosk owners." } },
      suggested: ["battery", "materials", "iot", "robots", "ai", "transportation", "networks", "energy"],
      suggestedWhy: {
        "battery": "Battery design can mark a swollen pack before acid leaves the case.",
        "materials": "Materials can hold acid so rain does not make a puddle behind the shed.",
        "iot": "Iot can count units in and units stuck on the shed wall tally.",
        "robots": "Robots can move a hissing pack so Dev does not use a stick.",
        "ai": "Ai can flag a sealed unlabeled pack before the pack waits in the tent.",
        "transportation": "Transportation can move dead packs across the ring road at a cost the guild can split.",
        "networks": "Networks can split a hazmat surcharge record among twelve kiosk owners.",
        "energy": "Energy can keep a swap pack in use so a dead pack does not wait in the tent.",
      },
      visionTheme: "energy-city",
    },
    {
      places: ["Riverside Campus Canteens"],
      title: "Trays stacked to the dorm vents",
      summary: "Maya shoulders the back door of Canteen B and freezes. Foam trays stand in towers to the dorm vents. Flies lift in a dark sheet when the breeze shifts. A first-year with asthma skips dinner. The student eats instant noodles cold in the room.",
      scene:
        "Maya shoulders the back door of Canteen B and freezes. Foam trays stand in towers to the dorm vents. Flies lift in a dark sheet when the breeze shifts. Dinner service ended an hour ago.\n\nStudents tape the windows shut against the smell. A first-year with asthma skips the evening meal. The student eats instant noodles cold in the room.\n\nThe contract kitchen plates each rice special on a single-use tray. The vendor bid won on unit cost. The bid did not count waste at the loading bay. A scullery is necessary for washable plates. The lease did not fund a scullery.\n\nThe student facilities council can fine litter on the quad. The council cannot rewrite the catering lock without a clause. The bursar fears to open the clause. Trays arrive by the pallet.",
      briefMd:
        "## The place\nMaya shoulders the back door of Canteen B and freezes. Foam trays stand in towers to the dorm vents. Flies lift in a dark sheet when the breeze shifts. Dinner service ended an hour ago.\n\nStudents tape the windows shut against the smell. A first-year with asthma skips the evening meal. The student eats instant noodles cold in the room.\n\n## The bigger problem\nThe contract kitchen plates each rice special on a single-use tray. The vendor bid won on unit cost. The bid did not count waste at the loading bay. A scullery is necessary for washable plates. The lease did not fund a scullery.\n\nThe student facilities council can fine litter on the quad. The council cannot rewrite the catering lock without a clause. The bursar fears to open the clause. Trays arrive by the pallet.\n\n## Your job\nChange the meal so the dorm vent does not become the dump.",
      stakeholder: "Student facilities council",
      crisisMeters: { local: { label: "Fly Clouds", description: "Flies lift in a dark sheet when the breeze shifts at Canteen B. Foam towers stand at the dorm vents. Students tape the windows shut." }, global: { label: "Foam Trays", description: "The kitchen plates each rice special on a single-use foam tray. Trays arrive by the pallet. The bid won on unit cost." }, support: { label: "Contract Lock", description: "The student facilities council can fine litter on the quad. The council cannot rewrite the catering lock. The bursar fears to open the clause." } },
      suggested: ["materials", "iot", "ai", "robots", "networks", "synbio", "print3d", "computing"],
      suggestedWhy: {
        "materials": "Materials can replace a foam tray so the dorm vent does not hold waste.",
        "iot": "Iot can count trays at the loading bay after dinner service ends.",
        "ai": "Ai can show the waste cost that the vendor bid left out.",
        "robots": "Robots can move washable plates if a scullery is not in the lease.",
        "networks": "Networks can share the catering clause that the bursar fears to open.",
        "synbio": "Synbio can break foam trays after dinner service ends.",
        "print3d": "Print3d can make a tray that the canteen can use more than one time.",
        "computing": "Computing can track pallet arrivals against the quad litter fine.",
      },
      visionTheme: "learn-city",
    },
    {
      places: ["Palm Reach Hotel Strip"],
      title: "Linen that washes out to sea",
      summary: "Lila drags a mesh bag of wet wipes and miniature bottles off the morning tide line. Shampoo pearls stick to the gloves of Lila. A torn washcloth rides the foam. The crew clears the sand by nine. The carts refill the same shelves by noon.",
      scene:
        "Lila drags a mesh bag of wet wipes and miniature bottles off the morning tide line. This work ends before the first beach chairs go out. Shampoo pearls stick to the gloves of Lila. A torn monogrammed washcloth rides the same foam.\n\nThe coastal cleaners cooperative clears the sand by nine. The cooperative cannot stop the cart. The cart refills the same shelves by noon. A fisherman down the point finds a bottle cap in a net. The fisherman curses the strip. The fisherman does not curse the current.\n\nThe crew of Lila works double shifts after long-stay weekends.\n\nHousekeepers restock each room from crates with brand standards. The crates hold small plastics. The crates do not hold bulk dispensers. The logo faces the mirror. The brand manual calls the minis a signature welcome.",
      briefMd:
        "## The place\nLila drags a mesh bag of wet wipes and miniature bottles off the morning tide line. This work ends before the first beach chairs go out. Shampoo pearls stick to the gloves of Lila. A torn monogrammed washcloth rides the same foam.\n\nThe coastal cleaners cooperative clears the sand by nine. The cooperative cannot stop the cart. The cart refills the same shelves by noon. A fisherman down the point finds a bottle cap in a net. The fisherman curses the strip. The fisherman does not curse the current.\n\nThe crew of Lila works double shifts after long-stay weekends.\n\n## The bigger problem\nHousekeepers restock each room from crates with brand standards. The crates hold small plastics. The crates do not hold bulk dispensers. The logo faces the mirror. The brand manual calls the minis a signature welcome.\n\n## Your job\nDesign hospitality that does not send the welcome out with the tide.",
      stakeholder: "Coastal cleaners cooperative",
      crisisMeters: { local: { label: "Beach Trash", description: "Wet wipes and miniature bottles sit on the morning tide line. Shampoo pearls stick to the gloves of Lila. A fisherman finds a bottle cap in a net." }, global: { label: "Mini Bottles", description: "Housekeepers restock small plastics from brand crates. The crates do not hold bulk dispensers. The brand manual calls the minis a signature welcome." }, support: { label: "Brand Rules", description: "Brand standards stamp the crates on the service stair. The logo faces the mirror. The cooperative cannot stop the noon cart." } },
      suggested: ["materials", "iot", "drones", "ai", "networks", "transportation", "robots", "solar"],
      suggestedWhy: {
        "materials": "Materials can replace a mini bottle so the tide does not carry shampoo.",
        "iot": "Iot can track a cart that refills the same shelves by noon.",
        "drones": "Drones can see beach trash on the tide line before the chairs go out.",
        "ai": "Ai can read brand rules and show where a bulk dispenser can fit.",
        "networks": "Networks can link the cooperative to housekeepers before the noon refill.",
        "transportation": "Transportation can move waste off Palm Reach before the tide returns it.",
        "robots": "Robots can lift wet wipes from the tide line before nine.",
        "solar": "Solar can power a bulk dispenser in place of a mini bottle.",
      },
      visionTheme: "coastal-city",
    }
  ],

  reproductive: [
    {
      places: ["Greenville Birth Corridor, Mississippi Delta"],
      title: "Ninety minutes past the last contraction",
      summary: "Keisha Jackson keys the radio at mile marker 14. The mother in the back seat is 90 minutes past her last strong contraction. The baby is not in the crowning stage. The nearest open labor ward is 41 miles farther than the map promised this morning.",
      scene:
        "Keisha Jackson keys the radio at mile marker 14. The rain sheets the highway. The mother in the back seat is 90 minutes past her last strong contraction. The baby is not in the crowning stage.\n\nThe nearest open labor ward is 41 miles farther than the map promised this morning. Last month the labor ward cut night coverage again. The county still bills the empty beds as capacity on paper.\n\nThe insurance cards bounce between three networks before personnel authorize a transfer van. Keisha Jackson delivered two babies on gravel shoulders this year. She keeps a clean kit. She keeps a calm voice. She cannot keep a staffed room close to the road when a labor turns hard.\n\nThe crews built the roads for cotton trucks. The crews did not build the roads for timed transfers.",
      briefMd:
        "## The place\n\nThe Greenville Birth Corridor lies in the Mississippi Delta. Keisha Jackson serves with the Delta doula and EMT coalition. She keys the radio at mile marker 14. The rain sheets the highway.\n\nThe mother in the back seat is 90 minutes past her last strong contraction. The baby is not in the crowning stage. The nearest open labor ward is 41 miles farther than the map promised this morning.\n\nKeisha Jackson delivered two babies on gravel shoulders this year. She keeps a clean kit. She keeps a calm voice. She cannot keep a staffed room close to the road when a labor turns hard.\n\n## The bigger problem\n\nLast month the labor ward cut night coverage again. The county still bills the empty beds as capacity on paper. The insurance cards bounce between three networks before personnel authorize a transfer van.\n\nThe crews built the roads for cotton trucks. The crews did not build the roads for timed transfers.\n\n## Your job\n\nDesign a birth corridor that works after the labor wards go dark.",
      stakeholder: "Delta doula and EMT coalition",
      crisisMeters: { local: { label: "Road Births", description: "Keisha Jackson delivered two babies on gravel shoulders this year near mile marker 14." }, global: { label: "Closed Wards", description: "The nearest labor ward cut night coverage again last month. The county still bills empty beds as capacity on paper." }, support: { label: "Insurance Gaps", description: "The insurance cards bounce between three networks before personnel authorize a transfer van." } },
      suggested: ["networks", "ai", "transportation", "drones", "solar", "battery", "iot", "computing"],
      suggestedWhy: {
        "networks": "The networks can carry a transfer approval across three insurers before the drive.",
        "ai": "A model can compare the map with true open labor ward hours.",
        "transportation": "A van can move the mother when personnel authorize one transfer.",
        "drones": "A drone can bring a clean kit to mile marker 14 in the rain.",
        "solar": "The solar power can run a radio when the labor ward is dark.",
        "battery": "A battery can keep the radio on through the highway rain.",
        "iot": "A sensor can send the contraction time from the back seat.",
        "computing": "A computer can match empty beds with true night coverage.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Ilha do Combu birth post, Belém river belt"],
      title: "High water blocks the midwife boat",
      summary: "Ana Ribeiro poles the skiff toward the birth post before dawn. The dock is already under brown water. A first-time mother waits on the raised plank floor. A clear path out is not open.",
      scene:
        "Ana Ribeiro poles the skiff toward the birth post before dawn. The dock is already under brown water. A first-time mother waits on the raised plank floor. Her sister holds a phone light. The fetal heart tones sound thin through the old Doppler.\n\nThe high water blocked the usual midwife boat for the third time this season. The mainland schedulers route ultrasound days to the city clinic first. The mainland schedulers route blood work to the city clinic first. The island posts get the care that remains.\n\nAna Ribeiro can catch a normal birth in the stilt house. She cannot manage a stalled labor without a clear path out. She cannot manage a hemorrhage without a clear path out.\n\nThe river rises on a clock. An appointment system does not track that clock.",
      briefMd:
        "## The place\n\nThe Ilha do Combu birth post stands in the Belém river belt. Ana Ribeiro poles the skiff toward the birth post before dawn. She serves with the river midwife collective.\n\nThe dock is already under brown water. A first-time mother waits on the raised plank floor. Her sister holds a phone light. The fetal heart tones sound thin through the old Doppler.\n\nAna Ribeiro can catch a normal birth in the stilt house. She cannot manage a stalled labor without a clear path out. She cannot manage a hemorrhage without a clear path out.\n\n## The bigger problem\n\nThe high water blocked the usual midwife boat for the third time this season. The mainland schedulers route ultrasound days to the city clinic first. The mainland schedulers route blood work to the city clinic first. The island posts get the care that remains.\n\nThe river rises on a clock. An appointment system does not track that clock.\n\n## Your job\n\nDesign care that moves with the tide at the Ilha do Combu birth post.",
      stakeholder: "River midwife collective",
      crisisMeters: { local: { label: "Stillbirths", description: "Thin fetal heart tones and a blocked path raise the stillbirth risk at the birth post." }, global: { label: "Boat Delays", description: "The high water blocked the usual midwife boat for the third time this season." }, support: { label: "Mainland Bias", description: "The mainland schedulers route ultrasound days to the city clinic first. The island posts get the care that remains." } },
      suggested: ["drones", "solar", "battery", "networks", "iot", "transportation", "materials", "print3d"],
      suggestedWhy: {
        "drones": "A drone can carry supplies to the birth post when the dock is under water.",
        "solar": "The solar power can run the old Doppler in the stilt house.",
        "battery": "A battery can keep the Doppler on when the birth post is dark.",
        "networks": "The networks can send fetal heart tones to a mainland clinician.",
        "iot": "A sensor can track the river level against the birth post clock.",
        "transportation": "A boat can open a path out when high water blocks the dock.",
        "materials": "Strong materials can lift the dock above brown water at the birth post.",
        "print3d": "A printed part can repair the skiff when the midwife boat cannot move.",
      },
      visionTheme: "coastal-city",
    },
    {
      places: ["Marka industrial dorms RH window, East Amman"],
      title: "The sponsor keeps her health card",
      summary: "Yasmin stands outside the factory clinic window at shift change. The sponsor kept the health card again after the overtime dispute last month. The clinic gives no pregnancy test without the health card. The clinic gives no pills without the health card. The clinic gives no quiet referral without the health card.",
      scene:
        "Yasmin stands outside the factory clinic window at shift change. She holds a folded paper list of symptoms. She does not say the symptoms aloud. The nurse asks for the health card. The sponsor kept the health card again after the overtime dispute last month.\n\nThe clinic gives no pregnancy test without the health card. The clinic gives no pills without the health card. The clinic gives no quiet referral without the health card. Women in the dorms trade names of pharmacies. Those pharmacies sell for cash in silence.\n\nA coworker bled through a night shift last winter. She came back at dawn. The factory contracts tie clinic access to one signature. That signature can end a work permit. The fear keeps the waiting room empty. The clinic door is open.",
      briefMd:
        "## The place\n\nThe Marka industrial dorms stand in East Amman. Yasmin stands outside the factory clinic window at shift change. She holds a folded paper list of symptoms. She does not say the symptoms aloud.\n\nThe nurse asks for the health card. The sponsor kept the health card again after the overtime dispute last month. The clinic gives no pregnancy test without the health card. The clinic gives no pills without the health card. The clinic gives no quiet referral without the health card.\n\nThe migrant women health advocates watch this window. Women in the dorms trade names of pharmacies. Those pharmacies sell for cash in silence.\n\n## The bigger problem\n\nA coworker bled through a night shift last winter. She came back at dawn. The factory contracts tie clinic access to one signature. That signature can end a work permit.\n\nThe fear keeps the waiting room empty. The clinic door is open.\n\n## Your job\n\nDesign reproductive care that a worker can use without the sponsor health card.",
      stakeholder: "Migrant women’s health advocates",
      crisisMeters: { local: { label: "Hidden Illness", description: "Yasmin does not say her symptoms aloud at the factory clinic window." }, global: { label: "Sponsor Locks", description: "The sponsor kept the health card again after the overtime dispute last month." }, support: { label: "Deportation Fear", description: "The fear of a lost work permit keeps the waiting room empty." } },
      suggested: ["networks", "crypto", "ai", "computing", "iot", "vr", "solar", "gene-sequencing"],
      suggestedWhy: {
        "networks": "The networks can link a worker to a clinic without the sponsor health card.",
        "crypto": "A sealed record can confirm care without the sponsor health card.",
        "ai": "A model can guide a quiet referral when Yasmin cannot speak.",
        "computing": "A computer can store a symptom list outside the factory clinic file.",
        "iot": "A quiet device can log a symptom list that Yasmin does not say aloud.",
        "vr": "A private view can show care steps when the waiting room stays empty.",
        "solar": "The solar power can keep a small clinic light on after the shift.",
        "gene-sequencing": "A sequence test can name an illness when the health card is absent.",
      },
      visionTheme: "social-city",
    },
    {
      places: ["Sanganer Adolescent ANC Desk, Jaipur fringe"],
      title: "She arrives already mid-pregnancy",
      summary: "Sunita Devi opens the antenatal register. She writes a new name. The girl is 15 and already in mid-pregnancy. She missed three school health days. Her mother-in-law said the visits mark the family.",
      scene:
        "Sunita Devi opens the antenatal register in the afternoon heat. She writes a new name. The girl is 15 and already in mid-pregnancy. She missed three school health days. Her mother-in-law said the visits mark the family.\n\nThe teachers count enrolled girls for the grant sheet. The desks stay empty after marriage. The ASHA workers walk the lanes with iron tablets. The ASHA workers ask quiet questions. The in-laws decide the person who answers the door.\n\nThe girl arrives at this desk in mid-pregnancy. The early window for counseling is often closed. The early window for safe options is often closed. The count looks fine on the wall chart. The girl does not look fine.",
      briefMd:
        "## The place\n\nThe Sanganer Adolescent ANC Desk stands on the Jaipur fringe. Sunita Devi opens the antenatal register in the afternoon heat. She writes a new name. The girl is 15 and already in mid-pregnancy.\n\nShe missed three school health days. Her mother-in-law said the visits mark the family. The teachers count enrolled girls for the grant sheet. The desks stay empty after marriage.\n\nThe ASHA workers walk the lanes with iron tablets. The ASHA workers ask quiet questions. The in-laws decide the person who answers the door. The secondary teachers for girls share this desk.\n\n## The bigger problem\n\nThe girl arrives at this desk in mid-pregnancy. The early window for counseling is often closed. The early window for safe options is often closed.\n\nThe count looks fine on the wall chart. The girl does not look fine.\n\n## Your job\n\nDesign adolescent care that meets the girl before the household veto.",
      stakeholder: "ASHA workers and girls’ secondary teachers",
      crisisMeters: { local: { label: "Teen Births", description: "The girl is 15 and already in mid-pregnancy at the Sanganer desk." }, global: { label: "In-Law Veto", description: "Her mother-in-law said the school health visits mark the family." }, support: { label: "Count Gaming", description: "The teachers count enrolled girls for the grant sheet when desks stay empty." } },
      suggested: ["ai", "networks", "computing", "solar", "vr", "iot", "print3d", "transportation"],
      suggestedWhy: {
        "ai": "A model can flag a missed school health day before mid-pregnancy.",
        "networks": "The networks can connect an ASHA worker with a teacher before the veto.",
        "computing": "A computer can show empty desks against the grant sheet count.",
        "solar": "The solar power can run the antenatal desk in the afternoon heat.",
        "vr": "A private view can offer counseling before the girl arrives at the desk.",
        "iot": "A sensor can log a school health day that the girl misses.",
        "print3d": "A printed aid can carry iron tablets on the lane walk.",
        "transportation": "A vehicle can support an ASHA lane walk with iron tablets.",
      },
      visionTheme: "learn-city",
    }
  ],

  amr: [
    {
      places: ["Patancheru Industrial Stretch"],
      title: "The pharma drain tutors the tanks",
      summary: "Ramesh opens the valve on the treatment lagoon behind the bulk-drug sheds. Foam rides the ditch toward the village wells. His daughter comes home with a burning throat and a note the clinic cannot read.",
      scene:
        "Before dawn, Ramesh opens the valve on the treatment lagoon behind the bulk-drug sheds. Foam rides the ditch toward the village wells.\n\nBy noon the school sends his daughter home with a burning throat. The clinic cannot read the note. The night-shift nurse used the last culture bottle that matches the old chart.\n\nThe municipal lab logs a spike of resistant E. coli in the tank water. Households drink that tank water after the municipal line fails.\n\nFactories flush residual antibiotics. The permit meters color and smell. The permit does not meter active molecules. Buyers pay for speed.\n\nRamesh keeps the lagoon in motion. The plant stays open. His crew keeps wages. His wife waits outside the primary-care room. The child does not answer the cheap syrup.",
      briefMd:
        "## The place\n\nBefore dawn, Ramesh opens the valve on the treatment lagoon behind the bulk-drug sheds. Foam rides the ditch toward the village wells.\n\nBy noon the school sends his daughter home with a burning throat. The clinic cannot read the note. The night-shift nurse used the last culture bottle that matches the old chart.\n\nThe municipal lab logs a spike of resistant E. coli in the tank water. Households drink that tank water after the municipal line fails.\n\nHis wife waits outside the primary-care room. The child does not answer the cheap syrup.\n\n## The bigger problem\n\nFactories flush residual antibiotics into the drain. The permit meters color and smell. The permit does not meter active molecules. Buyers pay for speed.\n\nRamesh keeps the lagoon in motion. The plant stays open. His crew keeps wages.\n\n## Your job\n\nLink the drain control and the clinic care before the tank water harms each household.",
      stakeholder: "District pollution-control and primary-care joint lead",
      crisisMeters: { local: { label: "Sick days", description: "Sick days grow when the school sends his daughter home with a burning throat." }, global: { label: "Factory waste", description: "Factory waste moves residual antibiotics from the lagoon ditch toward the village wells." }, support: { label: "Clinic trust", description: "Clinic trust falls when the nurse cannot read the note or match the old chart." } },
      suggested: ["gene-sequencing", "iot", "materials", "nano", "ai", "networks", "solar"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name resistant E. coli in the tank water.",
        "iot": "Iot can watch the lagoon valve and the ditch foam.",
        "materials": "Materials can hold residual antibiotics in the treatment lagoon.",
        "nano": "Nano can show active molecules that the permit meter misses.",
        "ai": "Ai can read the clinic note and the old culture chart.",
        "networks": "Networks can join the plant log and the municipal lab spike.",
        "solar": "Solar can power a lagoon check beside the bulk-drug sheds.",
      },
      visionTheme: "rebuild-city",
    },
    {
      places: ["Callao Dockside TB Ward"],
      title: "Port lungs outlast the formulary",
      summary: "Rosa clocks in at the dockside TB ward. Luis sits on the cot. The cough returned after three months of pills. The clinic stocks the old pack. He cannot miss another shift.",
      scene:
        "Rosa clocks in at the dockside TB ward. The night crane swings containers. Luis sits on the edge of the cot with a loose mask. He tells Rosa the cough returned after three months of pills.\n\nThe lab slip shows the strain does not yield to the standard pack. The port clinic stocks that pack. Luis cannot miss another shift. A missed shift takes the badge that feeds his mother.\n\nRosa walks the corridor. She finds two more men from the same boarding house. The men hold bottles with doses left.\n\nThe formulary ships the old first-line drugs. The national tender rewards volume. The tender does not reward the resistant map along the docks. Supervisors clock hours by the gangway. Supervisors do not clock the sputum result.\n\nLuis asks Rosa if he hides the fever and keeps the load work.",
      briefMd:
        "## The place\n\nRosa clocks in at the dockside TB ward. The night crane swings containers. Luis sits on the edge of the cot with a loose mask. He tells Rosa the cough returned after three months of pills.\n\nThe lab slip shows the strain does not yield to the standard pack. The port clinic stocks that pack. Luis cannot miss another shift. A missed shift takes the badge that feeds his mother.\n\nRosa walks the corridor. She finds two more men from the same boarding house. The men hold bottles with doses left. Luis asks Rosa if he hides the fever and keeps the load work.\n\n## The bigger problem\n\nThe formulary ships the old first-line drugs. The national tender rewards volume. The tender does not reward the resistant map along the docks.\n\nSupervisors clock hours by the gangway. Supervisors do not clock the sputum result.\n\n## Your job\n\nJoin the dock care and the shift rules so a cure finishes before the next ship sails.",
      stakeholder: "Port-district TB program director",
      crisisMeters: { local: { label: "Failed cures", description: "Failed cures rise when the strain does not yield to the standard pack." }, global: { label: "Missed doses", description: "Missed doses sit in bottles at the boarding house after three months of pills." }, support: { label: "Job loss", description: "Job loss follows a missed shift that takes the badge." } },
      suggested: ["gene-sequencing", "ai", "networks", "iot", "computing", "drones", "vr"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name the strain on the lab slip.",
        "ai": "Ai can match the sputum result to the port clinic pack.",
        "networks": "Networks can share the resistant map along the docks.",
        "iot": "Iot can log doses at the ward and the boarding house.",
        "computing": "Computing can compare tender volume with the resistant map.",
        "drones": "Drones can move a sample from the ward to the lab.",
        "vr": "Vr can show the dose plan to Luis beside the cot.",
      },
      visionTheme: "care-city",
    },
    {
      places: ["Santa Catarina Hog Belt"],
      title: "Barn routine poisons the creek clinics",
      summary: "At first light Marta walks the nursery barn with the dosing chart on her board. Piglets get the same preventive mix the contract demands. A child from the creek road has no stronger drug at the post.",
      scene:
        "At first light Marta walks the nursery barn. The dosing chart is on her board. Piglets get the same preventive mix. The integrator wrote that mix into the contract last season.\n\nBy afternoon the creek below the lagoon carries a sweet chemical smell into the town. Her cousin runs the rural post in that town.\n\nTwo barn hands report skin fevers. The fevers do not break on the usual tablets. The small clinic fridge holds only the stock the state truck left last month.\n\nIntegrators price healthy weight with steady low-dose feed. Inspectors count dead animals. Inspectors do not count residual drugs in the runoff. Marta signs the sheet. A blank line means a fine for the crew. A blank line means lost pay for the crew.\n\nHer cousin sends a text about a child from the creek road. A stronger drug is necessary. The rural post does not stock that drug.",
      briefMd:
        "## The place\n\nAt first light Marta walks the nursery barn. The dosing chart is on her board. Piglets get the same preventive mix. The integrator wrote that mix into the contract last season.\n\nBy afternoon the creek below the lagoon carries a sweet chemical smell into the town. Her cousin runs the rural post in that town. Two barn hands report skin fevers. The fevers do not break on the usual tablets.\n\nThe small clinic fridge holds only the stock the state truck left last month. Her cousin sends a text about a child from the creek road. A stronger drug is necessary. The rural post does not stock that drug.\n\n## The bigger problem\n\nIntegrators price healthy weight with steady low-dose feed. Inspectors count dead animals. Inspectors do not count residual drugs in the runoff.\n\nMarta signs the sheet. A blank line means a fine for the crew. A blank line means lost pay for the crew.\n\n## Your job\n\nJoin the barn contract and the creek clinic so growth does not teach resistance downstream.",
      stakeholder: "State veterinary and rural health liaison",
      crisisMeters: { local: { label: "Worker fevers", description: "Worker fevers stay when the usual tablets do not break the skin fevers." }, global: { label: "Barn dosing", description: "Barn dosing keeps the same preventive mix in the piglet feed." }, support: { label: "Creek smell", description: "The creek smell carries a sweet chemical trace from the lagoon into the town." } },
      suggested: ["iot", "gene-sequencing", "ai", "synbio", "drones", "networks", "materials"],
      suggestedWhy: {
        "iot": "Iot can log the dose on the barn chart.",
        "gene-sequencing": "Gene sequencing can name resistant germs in the creek runoff.",
        "ai": "Ai can compare the contract mix with the clinic stock.",
        "synbio": "Synbio can mark drug traces in the creek runoff.",
        "drones": "Drones can sample the creek below the lagoon.",
        "networks": "Networks can join the barn sheet and the rural post log.",
        "materials": "Materials can hold drug residue in the barn lagoon.",
      },
      visionTheme: "food-city",
    },
    {
      places: ["Makoko Stilt Clinic Lanes"],
      title: "Lane chemists empty the last good drugs",
      summary: "Ada paddles the narrow lane to the stilt clinic with a hot child against her chest. The nurse opens a tin of loose white tablets with no name. Last week the same stall course failed in four days.",
      scene:
        "Ada paddles the narrow lane to the stilt clinic. She holds a hot child against her chest. The nurse opens a tin. The tin holds only loose white tablets. The tablets have no strip and no name.\n\nLast week the same seller on the boardwalk promised a full course. The fever returned in four days. Ada paid the cash she had. The formal pharmacy across the lagoon charges more than a day of catch.\n\nLane chemists restock from bulk sacks. The sale matches the cash a mother can spare. The clinic does not track the molecule in the child. The clinic log shows three more open treatments this morning.\n\nThe neighbor of Ada sends customers to the same stall. The stall gives credit when the nets come up empty. The nurse holds the unlabeled pills and the wrist of the child. The nurse does not know the first failure to name.",
      briefMd:
        "## The place\n\nAda paddles the narrow lane to the stilt clinic. She holds a hot child against her chest. The nurse opens a tin. The tin holds only loose white tablets. The tablets have no strip and no name.\n\nLast week the same seller on the boardwalk promised a full course. The fever returned in four days. Ada paid the cash she had. The formal pharmacy across the lagoon charges more than a day of catch.\n\nThe neighbor of Ada sends customers to the same stall. The stall gives credit when the nets come up empty. The nurse holds the unlabeled pills and the wrist of the child. The nurse does not know the first failure to name.\n\n## The bigger problem\n\nLane chemists restock from bulk sacks. The sale matches the cash a mother can spare. The clinic does not track the molecule in the child.\n\nThe clinic log shows three more open treatments this morning.\n\n## Your job\n\nJoin the medicine safety on the water so the cash and the cure stay one path.",
      stakeholder: "Lagoon primary-care and medicine-safety coordinator",
      crisisMeters: { local: { label: "Child fevers", description: "Child fevers return when a short course from the stall fails in four days." }, global: { label: "Loose pills", description: "Loose pills sit in a tin with no strip and no name." }, support: { label: "Shop income", description: "Shop income depends on credit at the stall when the nets come up empty." } },
      suggested: ["gene-sequencing", "ai", "networks", "iot", "solar", "battery", "computing", "print3d"],
      suggestedWhy: {
        "gene-sequencing": "Gene sequencing can name the failure after a short course.",
        "ai": "Ai can match a tablet to a known molecule without a strip.",
        "networks": "Networks can log a sale from the lane stall to the clinic.",
        "iot": "Iot can log a tin at the stilt clinic.",
        "solar": "Solar can power the stilt clinic log on the lagoon.",
        "battery": "A battery can keep a small clinic tool on at the stilt clinic.",
        "computing": "Computing can list open treatments from the clinic log.",
        "print3d": "A print method can mark a named pack for the child.",
      },
      visionTheme: "social-city",
    }
  ],

  _default: [
    {
      places: ["Local Ward", "Town Center", "District Hub"],
      title: "Crisis lands in {place}",
      scene:
        "A person in {place} feels this problem. A local driver produces the harm.",
      briefMd:
        "## The place\n\nA person in {place} feels this problem.\n\n## The bigger problem\n\nA local driver produces the harm.\n\n## Your job\n\nMake sure the person in {place} gets through this year without this harm.",
      stakeholder: "Local working group",
      crisisMeters: { local: "Pressure", global: "Capacity", support: "Trust" },
      suggested: ["ai", "iot", "networks", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
  ],
};
