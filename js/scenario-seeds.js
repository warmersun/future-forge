/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: 2026-08-24T05:21:01.340Z
 * Source: fill-descriptions filled=4 skipped=0
 * Themes: 43
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
 * Prose: design-challenge story craft (hook → mechanism → open challenge); easy first read, not shorter-for-its-own-sake.
 * Crisis meters: crisisMeters: { local, global, support } — HUD labels per perspective.
 *   Optional description on a role: { label, description } (place-specific strain).
 *   (buildLocalScenarioVariants expands to structured mission.pressure with levels.)
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
      scene:
        "Dr. Ramirez presses two fingers into the motorcycle rider's upper belly and feels the wall go tight. Memorial Hermann's red trauma bay is already loud with the next radio call. Her screen turns green. Discharge to observation, the model says. Confidence ninety-four percent. She asks the resident for a second pass on the CT. The override button sits gray. Risk office locked human overrides after last quarter's extra laparotomies drove the liability score. Ramirez still signs the chart. The model still writes the path. A nurse waits with transfer papers and a polite cough. The rider's blood pressure dips, then steadies. A belly bleed can lie like that. She has six minutes before the next ambulance docks. The score learned clean charts and payouts, not a hand on a tense abdomen. Who designs a trauma score a surgeon can still outrun?",
      stakeholder: "Dr. Ramirez, trauma attending",
      crisisMeters: { local: { label: "Missed Crises", description: "Belly bleeds and airway crashes get filed as stable. Ramirez watches people leave the bay who should still be on the table." }, global: { label: "Hard Locks", description: "The hospital grayed out overrides after the payout model punished extra surgeries. The attending still signs. The software still chooses the path." }, support: { label: "Liability Push", description: "Insurers and the board treat every human override as a future lawsuit. Staff learn to stop arguing with a green bar." } },
      suggested: ["ai", "computing", "networks", "iot", "vr", "robots"],
      visionTheme: "care-city",
    },
    {
      places: ["King County Emergency Call Center, Seattle"],
      title: "The call router that quiets the wrong voice",
      scene:
        "Aisha cups the headset against the King County call-floor noise and hears a woman hunting for English one word at a time. The routing pane paints the call yellow before the address is even in. Low acuity. Language delay. Handle time already over the target the county sold to the council. She stays on the line. The woman says her boy will not wake. The next screen offers a scripted callback in twelve minutes. It also offers a polite drop. Supervisors get dinged when average handle time slips. The model learned that long, uncertain calls rarely become verified emergencies in last year's logs. Those logs never sat in this kitchen off Rainier. The boy is three. Aisha can hear a fridge hum and a mother trying not to scream. Who designs a router that still hears a voice the data never loved?",
      stakeholder: "Aisha, veteran call-taker",
      crisisMeters: { local: { label: "Slow Help", description: "A child who will not wake waits while the queue slides the call down. Minutes stack in kitchens off Rainier Avenue." }, global: { label: "Auto Drops", description: "The router callbacks or hangs up the calls that sound uncertain. Last year's logs taught it that long, accented speech is rarely an emergency." }, support: { label: "Handle Time", description: "Supervisors get dinged when Aisha stays on the line. The county sold average speed as proof the center works." } },
      suggested: ["ai", "networks", "computing", "iot", "space", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Westlands Water District Allocation Desk, Fresno County"],
      title: "The ditch AI that starves the small orchard",
      scene:
        "Elena slides a toner-warm printout across the Westlands allocation counter in Fresno County. Her twenty-two acres of stone fruit glow red on the clerk's map. Forty percent of last year's water. The second screen stays calm. The model names the cut an efficient deficit. Across the canal a corporate almond block stays green. Their soil probes report more dollars per acre-foot. Elena's trees are older. Her ground is patchy. She still walks the rows at first light with a shovel, not a dashboard. The district sold the optimizer as fairness with numbers. Bond lawyers now require the model to maximize district-wide return. Miss the number and the next refinance fails. The clerk points at a locked field and shrugs. Her neighbor already pulled three rows of peaches. Who designs a water brain that can still count a small orchard as a farm?",
      stakeholder: "Elena, small orchard operator",
      crisisMeters: { local: { label: "Crop Stress", description: "Elena's stone fruit run dry while the canal still moves. Trees drop fruit and neighbors pull whole rows." }, global: { label: "Opaque Cuts", description: "The district optimizer cuts small farms first and will not show the math. The green blocks stay green." }, support: { label: "Bond Rules", description: "Refinance covenants demand the model maximize dollars per acre-foot. Clerks cannot unlock a field without breaking the deal." } },
      suggested: ["ai", "iot", "networks", "computing", "drones", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["MBTA Operations Control Center, Boston"],
      title: "Buses that skip the night-shift clinic stop",
      scene:
        "Marcus leans into the glass at the MBTA Operations Control Center and watches the 28's icon skip Massachusetts Avenue at 1:14 a.m. The optimizer labels the stop dead weight. Two boardings in seven nights. Cost per rider sits over the board's target. He knows one of those riders. A dialysis tech clocks out of the South End night clinic with no car and a bad knee. The model trained on weekday peaks and Saturday ballgames. Night labor barely registers as demand. Dispatch can force a stop. Each force chips the on-time bonus the agency promised City Hall. A text lights his phone from the union hall. Three more clinic workers missed the last bus this week. They slept in a break room. Who designs a schedule that still waits for the people who keep the city open after dark?",
      stakeholder: "Marcus, bus scheduler and ATU member",
      crisisMeters: { local: { label: "Stranded Riders", description: "Night clinic staff and late cleaners wait at dark stops the bus no longer makes. Some sleep in a break room." }, global: { label: "Skipped Stops", description: "The scheduler drops low-boarding stops after midnight to hit cost per rider. The map looks efficient and empty." }, support: { label: "Cost Targets", description: "City Hall treats on-time bonuses and cost-per-boarding as the only score that matters. Forcing a stop costs Marcus." } },
      suggested: ["ai", "networks", "computing", "transportation", "iot", "self-driving", "battery"],
      visionTheme: "coastal-city",
    }
  ],

  genocide: [
    {
      places: ["Goma Central Hospital Records Wing"],
      title: "Ward lists sold after midnight",
      scene:
        "Esperance Mukamana unlocks the metal cabinet at 1:17 a.m. The maternity ward list is still warm from the printer. She counts names the way she counts pulses.\n\nA man she does not know waits by the generator shed. He holds a USB stick and a fold of cash. The night clerk already sold last week's discharge file.\n\nAt dawn, families come asking for kin. The discharge notes say the patients left in vans. The vans never reached home.\n\nMilitia brokers pay for identity. They want a name, a ward, the ethnic box on the intake form, and a phone number for next of kin. The hospital still prints paper backups because the server dies when the grid dies. Those papers walk out the back door.\n\nThe ministry form still asks tribe. It has not changed since the last war. Clerks copy the box because the printer will not accept a blank field.\n\nTonight her cousin's name sits on the maternity list. Esperance can hide one sheet. She cannot hide the copy already in the clerk's pocket.\n\nWho designs a hospital record that can find a missing mother without becoming a shopping list for the people who make mothers disappear?",
      stakeholder: "Night-shift nurse Esperance Mukamana",
      crisisMeters: { local: { label: "Missing kin", description: "Families arrive at dawn to an empty bed. The discharge note names a van that never came. A mother, a cousin, a child is gone and the ward cannot prove they left alive." }, global: { label: "List sales", description: "Brokers buy printed ward lists and USB copies after midnight. The intake form still forces an ethnic box. Paper backups walk out when the server dies with the grid." }, support: { label: "Night fear", description: "Nurses lock the cabinet and still do not sleep. Families stop bringing the sick after dark. Trust in the records wing is thinner than the paper it prints." } },
      suggested: ["ai", "networks", "crypto", "computing", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Wau Relief Consignment Yard"],
      title: "Ration cards that starve a block",
      scene:
        "Nyibol Deng stands in the dust at the consignment yard. She holds a stack of ration cards for her block. The truck from Juba is late again.\n\nWhen it comes, the clerk scans each card against a tablet. Three houses flash red. Denied.\n\nThose houses voted the wrong way in the last chief election. The children there have already boiled the last sorghum. A small boy watches the scale from the tarp line. The clerk does not look up.\n\nNyibol's own card is green. She can feed her compound. She cannot feed the red doors without being marked next.\n\nThe relief agency outsourced verification to a local committee. The committee chair is the chief's brother. He updates the ineligible list from a phone in a tea stall. Clan capture looks like a software update.\n\nTonight a widow on the red list will walk to Nyibol's door with two children. If Nyibol shares, her card goes red next cycle. If she does not, the children do not eat.\n\nWho designs a ration that can feed a hungry block without becoming a weapon in the chief's hand?",
      stakeholder: "Block leader Nyibol Deng",
      crisisMeters: { local: { label: "Hunger", description: "Red-listed houses boil the last sorghum and then nothing. Children on one block sleep empty while sacks still sit under the tarp." }, global: { label: "Card denial", description: "A committee phone decides who is ineligible. The list updates in a tea stall. The tablet at the yard only obeys the latest file." }, support: { label: "Clan capture", description: "Neighbors watch who shares food and who gets marked next. People stop trusting the yard. The chief's kin hold the verification." } },
      suggested: ["drones", "networks", "ai", "space", "crypto", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Prizren Municipal Scholarship Board"],
      title: "Tablets that fail one language",
      scene:
        "Lirije Krasniqi sets twelve tablets on the scholarship board table. The exam app accepts one official language. Half her students write in another. Their practice answers come back blank.\n\nThe board chair calls the software neutral. The ministry bought one language pack. Students who fail the tablet exam lose the stipend that keeps them in school.\n\nLast year those students left for day labor. Some did not come back after the summer checkpoints tightened. Families stopped sending the younger ones.\n\nA vendor sold a single-language exam because it was cheaper. Board members who speak the official language keep renewing the contract. Identity is enforced as a font setting. The request for the other language pack has sat in a drawer since the last election.\n\nA parent waits in the hallway with a folder of report cards. The tablet will never read them.\n\nTomorrow her best student, Arben, will sit the exam. If the tablet fails his language, he loses the stipend. His uncle already offered him a ride north. Stipend kids stay visible. The others become names people stop saying.\n\nWho designs a school gate that can test skill without testing which language a child is allowed to keep?",
      stakeholder: "Teacher Lirije Krasniqi",
      crisisMeters: { local: { label: "School bans", description: "Students who fail the tablet lose the stipend and then the classroom. Families stop sending the younger ones after the checkpoints tighten." }, global: { label: "Lost futures", description: "A single-language exam turns skill into a passport. Kids who write in the other tongue leave for day labor and some do not return." }, support: { label: "Board capture", description: "Board members who speak the official language keep the vendor contract. The other language pack stays in a drawer. Parents wait in the hallway with report cards the tablet will not read." } },
      suggested: ["ai", "networks", "vr", "computing", "crypto", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Sittwe Jetty Labor Desk"],
      title: "Crew badges that never return",
      scene:
        "Aung Myint stamps crew badges at the jetty labor desk before dawn. Twelve boats are due back on the tide. Nine badges hang unclaimed on the nail board.\n\nThe three missing boats were crewed by men from the same quarter. The harbor master says weather. The families say the patrol boat stopped them.\n\nSalt dries white on the rail. A woman counts boats the way Aung Myint counts badges. She stops at nine.\n\nAung Myint has the paper log. He does not have the radio log. The radio sits in a locked cabinet the labor desk is not allowed to open.\n\nCrew badges are issued by a contractor who also sells safe-passage stamps. Men who cannot pay still go out. Their badges stay on the rack. The contractor marks them deserted. Deserted men have no claim. Their families lose the rice allotment tied to a returned badge.\n\nTonight Aung Myint's brother-in-law is on a late boat. If the badge never returns, the household loses its allotment. The name goes on the deserted list. Aung Myint can refuse to stamp tomorrow's crew. He cannot feed the families of the ones already gone.\n\nWho designs a crew list that can bring a fisher home without turning a missing badge into a license to erase him?",
      stakeholder: "Jetty steward Aung Myint",
      crisisMeters: { local: { label: "Missing fishers", description: "Badges hang on the nail board after the tide. Boats crewed from one quarter do not come back. Families wait on the jetty with no radio and no name on a live list." }, global: { label: "Hunger", description: "A returned badge is the key to the rice allotment. Names marked deserted lose their claim. Whole households go short while the contractor still sells stamps." }, support: { label: "Badge rackets", description: "Safe-passage stamps decide who is allowed to come home. Families no longer trust the labor desk. The radio stays locked and the paper log cannot argue." } },
      suggested: ["drones", "networks", "ai", "space", "transportation", "iot"],
      visionTheme: "ocean-city",
    }
  ],

  poverty: [
    {
      places: ["Sorting Lane"],
      title: "The tip owns the pickers on Sorting Lane",
      scene:
        "Rina hauls her last sack onto the official scale before the sun clears the ridge of plastic. The needle jumps. The clerk knocks it back with a thumb and writes a lower weight. She has walked Sorting Lane since she was twelve. The tip still owns the scale.\n\nThe cooperative hung its own beam last month. The yard boss padlocked it by noon. Pickers who weigh elsewhere lose their lane pass. No pass means no plastic and no rice.\n\nThe city sold the dump to one contractor. He rents the lanes. He sets the buy price after the trucks leave. He pays in chits that only his shop will honor. Families eat what that shop stocks. When the shop is late, the pots stay empty.\n\nRina's youngest coughs through the night from the burn piles. She can skip a meal. He cannot skip the air. Walk off this lane and the next picker takes her pile by morning.\n\nWho designs a dump where the people who lift the city can weigh their own work?",
      stakeholder: "Waste picker cooperative",
      crisisMeters: { local: { label: "Empty Meals", description: "When the shop that honors the contractor's chits is late or short, pots on Sorting Lane stay cold. Pickers skip food so children can eat." }, global: { label: "Scale Grip", description: "One concession holds the official scale, the lane passes, and the buy price. A private beam gets locked. The weight you lifted is never the weight you are paid." }, support: { label: "Sick Kids", description: "Burn-pile smoke sits in small chests at night. Neighbors see coughing children and pull back from the cooperative, afraid a fight with the yard will cost the next meal." } },
      suggested: ["networks", "crypto", "ai", "iot", "print3d", "solar", "battery", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Dust Ridge"],
      title: "Advance pay chains the kiln on Dust Ridge",
      scene:
        "Lalita unfolds the cloth with the week's rice and counts bowls for the kiln circle. Twelve families signed the mutual book. Fourteen came. The two extra walked up from the lower sheds, where the boss does not allow meetings.\n\nShe wants to feed them. The circle voted last month. Only members who refuse a new advance can draw from the pot. The lower-shed families took advances yesterday. Their children still stand in the dust with empty tins.\n\nThe kiln hires by household. A father who joins the circle loses the next firing slot. His cousins then take his place and his debt. Trust on the ridge is a ration. Share the pot and the books break. Close the pot and the left-out kids eat smoke.\n\nLalita's own girl waits at the edge of the circle. She is old enough to carry bricks. The boss already offered an advance in her name.\n\nWho does a workers' pot belong to when the kiln can buy the next family before dawn?",
      stakeholder: "Kiln workers’ mutual aid circle",
      crisisMeters: { local: { label: "Bonded Debt", description: "Advance pay is the only cash on Dust Ridge, and the tally on the shed wall never falls. A family that takes the money owes the next season before the bricks are stacked." }, global: { label: "Boss Books", description: "The wage book lives with the boss and his nephew. Interest is a line they write. Signing a mutual ledger can cost you the next firing slot." }, support: { label: "Lung Trouble", description: "Chimney smoke sits in chests all season. When lungs fail, the clinic wants cash the advance already claimed, and neighbors stop believing the circle can keep anyone safe." } },
      suggested: ["solar", "battery", "networks", "crypto", "ai", "materials", "computing", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Hill Signal"],
      title: "Tuition dies when the mast fails in Hill Signal",
      scene:
        "Sita opens the school laptop on the stone step and waits for the bar to fill. The mast on the ridge is dark again. The exam packet will not download. Three girls sit with their notebooks closed. They paid this month's tuition in airtime.\n\nThe teachers' network bought a shared dongle last term. The mast owner cut the village plan and sold only daily packs. Families who can walk to the junction buy a top-up. Families on the far slope cannot. Class becomes a roll call of who still has bars.\n\nThe district pays the school by attendance logged online. When the mast dies, the log stays blank and the stipend does not come. Teachers then collect tuition in data scratch cards, because the cash grant is always late. The same company that rents the mast sells the cards. When the tower fails, the debt stays.\n\nSita's nephew failed last year's board because he missed the upload window. His mother still owes two packs. She will not send him this week.\n\nWho designs a classroom that does not collapse when one company's mast goes dark?",
      stakeholder: "Village teachers’ network",
      crisisMeters: { local: { label: "Missed Classes", description: "When the ridge mast dies, exam packets never arrive and notebooks stay closed. A missed upload can cost a child a whole board year." }, global: { label: "Mast Monopoly", description: "One owner rents the only tower, killed the village plan, and sells daily packs. The same counter that sells airtime collects the school's tuition." }, support: { label: "Data Debt", description: "Families already owe scratch cards for last term. Shame and leftover debt keep children home even when the signal flickers back." } },
      suggested: ["networks", "solar", "battery", "ai", "computing", "vr", "space", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ferry Slip"],
      title: "Dawn fares strand the cleaners at Ferry Slip",
      scene:
        "Nila chalks a passenger list on the slip wall before the hotel vans dump the night crew. She is not selling seats. She is timing who must reach the far stair before school opens. The boatmen hate the list. It makes the surge obvious.\n\nLast week she asked the pier office to stamp the list as a workers' crossing. The clerk laughed and pointed at the tourist tariff board. Then a launch owner offered to sponsor the list if the association steered every cleaner to his boat. That is not a crossing. That is a new boss.\n\nThe hotels need the floors done by dawn. They pay cash at the service door and nothing for the water. The city rents the pier to the highest launch bid. Dawn is when both clocks meet. The fare becomes a tax on going home.\n\nNila's daughter is seven. She sleeps on a folded tarp behind the fish ice until her mother returns. One late boat and the stall owner unlocks the street.\n\nThe chalk list did not buy a cheaper ticket. It only made the squeeze visible.\n\nWhat would a crossing look like if the people who must move at dawn wrote the timetable?",
      stakeholder: "Cross-water night workers’ association",
      crisisMeters: { local: { label: "Stranded Nights", description: "Dawn fares double after the night shift, and cleaners miss the crossing home. A missed boat means a child left behind the fish ice too long." }, global: { label: "Pier Fees", description: "The city rents the pier to tourist launches. Worker craft get the ladder locked. The official tariff is written for visitors, not for the women who clean the far-bank hotels." }, support: { label: "Child Risk", description: "Children sleep on tarps behind the stall until a parent returns. Neighbors watch the locked room and lose trust that the association can bring anyone home before the street opens." } },
      suggested: ["transportation", "solar", "battery", "networks", "iot", "ai", "crypto", "drones"],
      visionTheme: "coastal-city",
    }
  ],

  "chem-bio": [
    {
      places: ["Weftbridge Dyeworks Row"],
      title: "Second-use blues on the dye row",
      scene:
        "Rina Mercado holds a stained tissue to Luis’s face on the Weftbridge loading dock. The bleed will not slow. Indigo dust coats his mustache. It is the third nosebleed on her clipboard since lunch.\n\nThe dock clerk slides her a crumpled manifest. The drums are marked mordant blend, textile use. The lot numbers do not match the mill book. They never do on Tuesdays, when the reseller’s truck comes.\n\nGrey drums arrive by the pallet. A man two towns over buys leftovers from dye houses, a shuttered plating shop, and a lab that lost its lease. He sells them cheap to Weftbridge. The row needs color that still turns a profit. He needs no questions and a fast unload. Second-use is the whole trade.\n\nRina walks the aisle after the whistle. A cracked seal weeps onto the concrete. The smell is sweet and wrong for indigo. The night pourer already went home with a blistered wrist and a headache he called the usual.\n\nIf the next leftover is the wrong leftover, the floor gets sicker. The street also holds a stockpile nobody can name.\n\nWho designs a dye row that can prove a drum before a body has to?",
      stakeholder: "Rina Mercado, row occupational health advocate",
      crisisMeters: { local: { label: "Nosebleeds", description: "On the dye row, workers leave shifts with blood on their sleeves and headaches they call the usual. This meter is how often bodies on Weftbridge pay for an untested drum." }, global: { label: "Grey drums", description: "Leftover chemicals arrive from a reseller who buys sealed leftovers and sells them as mordant. This meter is how much of the row’s color still comes from drums nobody can name." }, support: { label: "Seal lag", description: "Inspectors and landlords take days to tag a cracked seal. This meter is how long the street waits after a leak before anyone with authority shows up." } },
      suggested: ["iot", "ai", "materials", "networks", "drones", "computing", "robots", "nano"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Stonepass Border Dry Port"],
      title: "Lab kits under the wrong code",
      scene:
        "Jonas Veld stands under the sodium lights with a plastic tray in both hands. The night crew cut the tape because it looked cheap. The label says classroom microscopy kit. The handler who opened it, a temp named Farid, has a wet line of blisters climbing his forearm.\n\nThe day chemist has gone home. The port scanner only flags the codes it was trained to fear. School-science kits move on the cheap lane. Supervisors tell the night desk not to hold the trucks.\n\nJonas phones the consignee. A rented mailbox in a strip mall. He phones the school on the form. The science chair never ordered a kit.\n\nFarid asks, in a language the incident form does not use, whether he should wash or wait. The nurse station is locked. The dry port lives on minutes. Brokers learn which words the night desk will wave through. The people who actually lift the boxes are the last ones anyone asks and the first ones the leak finds.\n\nJonas has one burned worker and a bay still full of identical sealed trays.\n\nWho designs a border that believes the hands on the box as much as the words on the side?",
      stakeholder: "Jonas Veld, dry-port customs liaison",
      crisisMeters: { local: { label: "Handler burns", description: "Night crews at Stonepass open cheap tape with bare hands and take the first splash. This meter is injuries on the people who actually lift the trays." }, global: { label: "False labels", description: "Kits move as school science while the scanner only fears the codes it was taught. This meter is how easily the wrong words buy the cheap lane." }, support: { label: "Night gaps", description: "After the chemist leaves, supervisors tell the desk not to hold trucks. This meter is public trust that anyone is watching the bay after dark." } },
      suggested: ["ai", "iot", "drones", "networks", "crypto", "computing", "transportation", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Lowfen Municipal Waterworks"],
      title: "What the outfall never names",
      scene:
        "Marta Singh pins another clinic slip to the lab wall at Lowfen Waterworks. A child on Reed Street. Cramps. Fever. Cannot keep water down. Her certified panel came back clean again. Chlorine is fine. Coliform is fine.\n\nShe is not paid to hunt what the permit does not name. The plant tests the list the county bought. Upstream, a contract fermenter and a pesticide shop share a ditch. Their paperwork says process water. It says nothing else.\n\nMarta tries a different read. She treats the town as the instrument. Each pin is a body. The pins do not cluster at her plant. They follow the old ditch line behind the industrial lots.\n\nThe county still wants a named compound before it will close a valve. The university freezer is full. Off-panel work waits six weeks.\n\nA mother sits in the clinic hallway with a bucket in her lap. The outfall still has no word for what left the ditch.\n\nWho designs a waterworks that can learn a new harm before the permit learns a new name?",
      stakeholder: "Marta Singh, works lab supervisor",
      crisisMeters: { local: { label: "Gut sickness", description: "Kids along the old ditch line cramp and cannot keep water down while the plant’s list stays clean. This meter is how hard Lowfen bodies are hit before a name appears." }, global: { label: "Blind outfall", description: "Upstream shops discharge process water that the permit never has to identify. This meter is how much can leave the ditch without a word on paper." }, support: { label: "Sample pile", description: "Off-panel work waits in a full freezer for weeks. This meter is how long families wait while the county asks for a named compound." } },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "synbio", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Cedar Contract Vivarium Park"],
      title: "Loaner strains after closing time",
      scene:
        "Dr. Noah Abebe finds a cage card on the hallway floor after lockup at Cedar Park. The strain code belongs to Lab C. The mice are already on Lab F’s rack. Both suites went dark two hours ago.\n\nA night tech had a deadline. Borrowing a lineage is how the small contracts survive. The logbook shows a blank line and a coffee ring.\n\nTwo animal-care staff called in with fevers this week. The clinic across the road asked if the park has something going around. A neighbor taped a note to the gate. We hear your fans at 2 a.m. We do not know what you keep.\n\nNoah can lock a door. He cannot lock a favor economy that the cheap leases depend on. The park sells shared space. Shared space sells speed. Speed sells the loan.\n\nWho designs an animal house that can refuse a loan without killing the work that pays the lights?",
      stakeholder: "Dr. Noah Abebe, vivarium biosafety officer",
      crisisMeters: { local: { label: "Staff fevers", description: "Animal-care techs call in sick after after-hours moves. This meter is illness inside the park before anyone admits a strain left its room." }, global: { label: "Strain sharing", description: "Night loans keep small contracts alive and leave blank lines in the book. This meter is how normal an unlogged cage has become." }, support: { label: "Neighbor fear", description: "People at the fence hear fans at 2 a.m. and do not know what is kept. This meter is how close the road is to demanding the park shut." } },
      suggested: ["gene-sequencing", "synbio", "ai", "iot", "networks", "crypto", "computing", "vr"],
      visionTheme: "learn-city",
    }
  ],

  asteroid: [
    {
      places: ["Sutherland Sky Belt, Northern Cape"],
      title: "Mine glare blanks the Karoo rock watch",
      scene:
        "Naledi Mokoena kills the lodge porch light and steps into the Karoo night. She is meant to log the Milky Way for tomorrow's guests. She logs a white smear instead. The new iron pit on the ridge has left its flood banks on again.\n\nThe survey telescope two kilometers upslope is mid-sweep. It hunts the big near-Earth rocks, the kind that give cities years to move if someone sees them early. Her phone buzzes with rejected frames. The night is unusable.\n\nThe mine added a third shift when the ore contract paid a night premium. The provincial lighting permit still files skyglow under nuisance, next to barking dogs. Naledi's three best rooms sat empty through the dark-sky festival week. Sutherland High cancelled the science-club campout. Her cousin clocks in at the pit at ten. Those lamps cover his rent. They also erase the frames that would have bought Earth time.\n\nShe can walk the complaint to the municipal office at dawn. The mine can walk an extension to the same counter. The stone, if it is out there, walks nowhere.\n\nWho designs a night that can pay a town and still catch a rock while a decade of warning remains?",
      stakeholder: "Naledi Mokoena, community dark-sky coordinator",
      crisisMeters: { local: { label: "Empty Lodges", description: "Guest rooms in Sutherland stay dark through festival week. Guides, cooks, and cleaners lose the season they counted on." }, global: { label: "Sky Glare", description: "Pit floods bleach the southern sky. The ridge telescope throws out night after night of rock-watch frames." }, support: { label: "Permit Lock", description: "Skyglow still sits on the nuisance form beside barking dogs. Mine extensions reach the counter faster than dark-sky complaints." } },
      suggested: ["space", "ai", "computing", "networks", "iot", "drones", "solar", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Goldstone Antelope Valley rim, California"],
      title: "Dish backlog leaves the valley guessing",
      scene:
        "Rosa Delgado parks on the gravel berm above Goldstone and watches Dish 14 sit frozen. She had the four-hour civil slot in writing. The slot went to a Mars orbiter handover at noon. Her liaison line is now a recorded message.\n\nIn Boron that morning the elementary school sent a note home about a rock passing near Earth. Parents kept children in. The rock will miss. It has missed before. On more kitchen counters the next county notice will stay facedown.\n\nThe big dishes were raised to talk to spacecraft. A standing watch on stones is leftover time. When a gearbox seizes, the spare enters a parts queue that runs on fiscal quarters. Rosa's work is to turn scraps of minutes into a sentence a superintendent can read without emptying a classroom. In the grocery line a farmworker asks if the last alert was real. Rosa starts an answer. She lets it die.\n\nThe valley is learning to shrug. A shrug is how a true warning fails.\n\nWho holds the dish when a spacecraft and a school both need a number tonight?",
      stakeholder: "Rosa Delgado, civil tracking liaison",
      crisisMeters: { local: { label: "Track Gaps", description: "Boron and the rim towns get leftover dish minutes. Paths of passing rocks stay fuzzy. Schools guess whether to keep children home." }, global: { label: "Dish Queue", description: "Spacecraft handovers take the written civil slots. A standing watch on stones lives on scraps of time." }, support: { label: "Worn Alerts", description: "County notes go out, then nothing falls. Kitchen counters collect facedown papers. People stop asking Rosa if the next one is real." } },
      suggested: ["space", "ai", "networks", "computing", "iot", "robots", "materials", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Maunakea access communities, Hawaiʻi Island"],
      title: "Time-share freeze after every rock scare",
      scene:
        "Kainoa Hale sets a folding table in the Maunakea visitor-center lot and opens a paper calendar. He has ruled each night in two colors. Blue for the rock survey. Green for the cultural practitioners locked out last week. He is trying to rename a freeze as a share. The wind lifts a corner. Nobody sits.\n\nThe access gate is chained. Last Tuesday a bulletin about a rock passing near Earth triggered a priority lock. An international team took the mid-sized dome. Two kūpuna drove the Saddle Road in the dark and turned around at the chain.\n\nAfter every scare the time-share stops. Night techs in Hilo lose the differential that covers rent. The mountain becomes a place taken. The survey lead says a rock big enough to break a city does not wait on a ceremony. A practitioner says a mountain that only opens for alarms is already gone. Kainoa's split was a new move. It did not survive the parking lot.\n\nHe folds the unused calendar. The next bulletin is already in draft on his laptop.\n\nCan a watch that needs this road also keep the people who still know how to open it?",
      stakeholder: "Kainoa Hale, summit operations mediator",
      crisisMeters: { local: { label: "Closed Domes", description: "Promised community nights vanish when a bulletin hits. Practitioners drive the Saddle Road and meet a chain." }, global: { label: "Scare Locks", description: "Each rock scare freezes the time-share. International teams take the mid-sized dome. The mountain's watch becomes an override, not a pact." }, support: { label: "Trust Fracture", description: "Families in Hilo and Waimea learn the road opens for alarms and outsiders. The next survey will need the same families to say yes." } },
      suggested: ["space", "ai", "networks", "computing", "vr", "iot", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Esrange fringe, Kiruna municipality"],
      title: "Kinetic stack waits while the range idles",
      scene:
        "Ingrid Larsson walks the frost-heaved pad on the Esrange fringe with a clipboard she cannot stamp. In the hangar sits a heavy mass built to shove a rock off a city-killing path. It waits, crated and cold. The range is silent. A herding corridor opened three days early. Reindeer from the local siida are on the flats. Insurers had painted those flats as a drop zone.\n\nA rehearsal for that shove needs a live window. The underwriter will not sign a flight over winter pasture without a seasonal map both sides accept. Last year's rushed scare launch scattered a herd. The compensation file is still open in a Kiruna office. Technicians sit on standby pay. The stack ages. On the wall chart, the next rock that could use a proven shove is already marked in red.\n\nA herder tells her the animals will not cross a pad that still smells of last year's burn. The town needs the range jobs. The range needs a yes that the last rush made costly.\n\nWho proves a shot that might save a distant city if the pasture cannot survive the proof?",
      stakeholder: "Ingrid Larsson, range civil-integration lead",
      crisisMeters: { local: { label: "Mission Stall", description: "The hangar holds a test mass that never flies. Kiruna technicians sit on standby pay. The wall chart keeps aging in red." }, global: { label: "Liability Gridlock", description: "Insurers want a seasonal map both sides will sign. Last year's scattered herd still has an open file in town. No stamp, no window." }, support: { label: "Pasture Trust", description: "Herders will not walk reindeer across a pad that still smells of a rushed launch. A yes now costs more than last year's scare." } },
      suggested: ["space", "robots", "materials", "print3d", "ai", "computing", "networks", "nuclear"],
      visionTheme: "rebuild-city",
    }
  ],

  weather: [
    {
      places: ["Drawdown Flats"],
      title: "When the pivot runs dry",
      scene:
        "Mara Chen walks the last quarter-mile of the south pivot before dawn. Dust lifts off the wheel tracks. The sprinklers should be ticking. They are not. At pad 14 the well gauge sits below the red line she painted last July. Corn leaves already cup inward along the outer ring.\n\nShe radios the pump house. The motor hums on the line. The aquifer does not answer.\n\nThree neighbors wait at the co-op shed with the same dry gauges and the same bank letters. River-side farms still run full circles under senior rights written when the sand layer was full. Everyone else on Drawdown Flats draws from that same layer. Night power is cheap, so pumps run long to chase a crop that still looks good on paper. The district still bills by the acre, not by the gallon. Every extra hour drops the table a little farther.\n\nMara's note comes due in six weeks. If this circle browns, the bank will not refinance the pivot she still owes on. Her son already asked if they will plant next year.\n\nWho designs water for a well that will not refill?",
      stakeholder: "Irrigation co-op president",
      crisisMeters: { local: { label: "Dry Wells", description: "South-circle wells drop below the painted red line by midsummer. Corn cups along the outer ring before the note comes due." }, global: { label: "Wasted Water", description: "The district still bills by the acre. Cheap night power keeps pumps running long on a shared sand layer that does not refill." }, support: { label: "Farm Debt", description: "A browned circle can kill a refinance. Neighbors watch whose pivot stays green and whose note gets called." } },
      suggested: ["iot", "ai", "solar", "battery", "drones", "space", "genetic-engineering", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Ember Ridge"],
      title: "Orange noon at Ember Ridge",
      scene:
        "Nurse Adele Ruiz parks behind the clinic at Ember Ridge and ties a wet scarf over her face. The noon sky is the color of rust. The air quality flag on the porch has been red for eleven days.\n\nThe waiting room is already standing room. An older mill worker holds a grandchild whose breathing sounds like paper. Adele starts a nebulizer. The HEPA unit in the back hallway trips the breaker again.\n\nCounty protocol still sends smoke alerts by landline and radio. Half the ridge lives in seasonal cabins with neither. After the last beetle year, timber companies left standing dead pine on the slopes above the road. The fire that started in that fuel has no off-season now. Adele can treat the cough. She cannot treat the forest that keeps making it.\n\nThe child's pulse ox drops while Adele waits for a transfer bed in town. Town is forty minutes down a road the smoke has closed twice this week. The mill worker asks if they should have left yesterday.\n\nWho designs care for a ridge that burns in place?",
      stakeholder: "County public health nurse",
      crisisMeters: { local: { label: "Smoke Days", description: "The porch flag stays red for days at a time. Children wheeze and older mill workers fill the clinic hallway." }, global: { label: "Dead Timber", description: "Beetle-killed pine still stands on the slopes above the road. Fires that start in that fuel have no off-season now." }, support: { label: "Clinic Crowds", description: "The waiting room hits standing room by noon. Transfer beds in town sit behind a road the smoke keeps closing." } },
      suggested: ["drones", "iot", "ai", "space", "networks", "robots", "materials", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Levee Bend"],
      title: "The river takes the bend again",
      scene:
        "Ellis Fontenot stands on the parish truck bed at first light and watches the river take the same bend it took in '19 and '27. Water is already over the sandbag line at Willow Street. A sofa floats past the bait shop.\n\nHe calls the pump crew. Two of the four pumps are down for parts promised after the last rise. The remaining pair cannot keep the ditch empty.\n\nThe levee map on his clipboard still shows a gap behind the new slab homes. Those lots were platted after the last flood map, when the parish needed the tax base. Upstream, the channel was straightened years ago to hurry water past someone else's town. It arrives here faster now, and higher. Ellis can raise bags. He cannot raise the ground the bags sit on.\n\nMrs. Landry will not leave the house her father built. The water is at her porch steps. She asks Ellis if the next map will tell the truth.\n\nWho designs a bend that the river has already claimed?",
      stakeholder: "Parish floodplain manager",
      crisisMeters: { local: { label: "Floodwater", description: "Willow Street goes under at the same bend again. Sofas and porch steps disappear while pumps wait on parts." }, global: { label: "Levee Gaps", description: "New slab homes sit behind a mapped gap the parish left for the tax base. Upstream channel work sends the crest here faster and higher." }, support: { label: "Displaced Families", description: "People will not leave houses their parents built. Shelter lists grow faster than dry rooms." } },
      suggested: ["iot", "ai", "drones", "materials", "robots", "space", "networks", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Windrow Court"],
      title: "Sirens after the roof",
      scene:
        "Rosa Delgado climbs the last two steps to her neighbor's porch with a roll of visqueen under her arm. Last night's straight-line wind peeled the south half of Unit 17 like a can. Insulation hangs in wet ropes. The sirens came after the roof was already in the ditch.\n\nShe tapes what she can over the open rooms before the next rain.\n\nThe park owner still collects lot rent on units that fail the old tie-down spec. County inspectors check new installs. They do not revisit the 1990s straps rusting under most of Windrow Court. The high school gym takes sixty people. The court has two hundred and ten. Rosa's mother will not go without the oxygen concentrator. The gym has two wall outlets in the hallway.\n\nRosa has a list of who can take whom. The list is longer than the rooms.\n\nWho designs a home that is allowed to stay if it cannot stay on the ground?",
      stakeholder: "Mobile home residents' council lead",
      crisisMeters: { local: { label: "Wind Damage", description: "Roofs peel off older units in a single straight-line night. Insulation hangs in the ditch before the sirens finish." }, global: { label: "Weak Tie-Downs", description: "County checks new installs and skips the rusting 1990s straps. Lot rent is still due on homes that will not stay down." }, support: { label: "Shelter Space", description: "The gym holds sixty. The court holds more than two hundred, and some cannot leave their oxygen behind." } },
      suggested: ["materials", "print3d", "robots", "energy", "battery", "solar", "networks", "drones"],
      visionTheme: "social-city",
    }
  ],

  mideast: [
    {
      places: ["Dust Road Clinic Row"],
      title: "Ambulances pay twice at the gate",
      scene:
        "Nurse Hala checks the pulse on a boy from the west lane. His lips are already the color of ash. She loads him into the clinic ambulance before the sun clears the ridge above Dust Road. The driver reaches the first barrier and kills the engine. A man with a plastic chair and a rifle wants cash to lift the chain. The east barrier will want the same on the way back.\n\nLast month they paid both and still sat twenty minutes in the dust. The boy does not have twenty minutes.\n\nHala keeps a tin of folded bills in the glove box. Every bill is a night shift she will not staff. The men at the barriers do not wear one uniform. They work for whoever holds this stretch of Dust Road that week. The clinic board still writes names from both lanes. No other ward will. Families know this. So do the men with the chain.\n\nWhen the tin is empty, the night nurse quits. A west-lane father will not send his daughter to a ward that cannot reach her. An east-lane midwife will not cross after dark. The road that was supposed to connect two neighborhoods now sells delay by the minute.\n\nWho designs care that can cross a road that lives on delay?",
      stakeholder: "Cross-community clinic board",
      crisisMeters: { local: { label: "Missed Care", description: "An ambulance that sits at a barrier turns a fever into a seizure. Families on both lanes wait past the hour a life can be saved." }, global: { label: "Checkpoint Fees", description: "Whoever holds Dust Road that week charges the clinic to pass. The fee is not a posted tax. It is a business that grows every time a stretcher appears." }, support: { label: "Staff Flight", description: "Night nurses count the cash tin, then count their own safety. When the tin wins, they leave." } },
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Saffron Lane Souk"],
      title: "Shutters rise only after the cut",
      scene:
        "Yusuf rolls the metal shutter of stall nine at dawn. The saffron tins are lighter than he left them. Night collectors came after the last power cut, when the lane cameras died. They take a share of the cash box. Then they take a share of whatever might sell tomorrow.\n\nBy noon, half the shutters on Saffron Lane stay down. Young men who used to haul crates for their uncles now lean on that steel. They wait for a collector's nod. The merchants' association tried a shared till last spring. The till was smashed in a week.\n\nTolls are not written on any wall. They change with the rumor of which crew owns the alley after dark. A widow who sells dried limes pays to open and pays to close. Her son watches from the doorway. He is learning the wrong trade.\n\nEmpty stalls mean empty kitchens by Friday. The association can post a fair-toll sign. The sign does not stop a man with a cutter and a cousin on the night shift at the transformer.\n\nWho designs a market that can stay open without feeding the door?",
      stakeholder: "Merchants’ fair-toll association",
      crisisMeters: { local: { label: "Empty Stalls", description: "Shutters stay down after a night cut. Spice and lime sellers lose the day's cash and tomorrow's stock." }, global: { label: "Street Tolls", description: "Unwritten crews tax the alley after dark. The price changes with whoever owns the transformer shift." }, support: { label: "Idle Youth", description: "Young men who hauled crates now wait for a collector's nod. The lane teaches the wrong trade." } },
      suggested: ["networks", "ai", "crypto", "solar", "iot", "drones", "transportation", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Rubble Lane Blocks"],
      title: "Winter walls that never rise",
      scene:
        "Lina marks the frost line on the remaining wall with a stub of charcoal. Winter is three weeks away. The tenants' cooperative poured a foundation last month on Rubble Lane. Overnight the rebar vanished. The cement bags went the next night.\n\nThe men who take the steel do not hide. They sell it two streets over. Then they come back when the next truck arrives. Families sleep under tarps on lots they still call home. Deeds are photocopies in three languages, stamped by offices that no longer exist. Two cousins claim the same stairwell.\n\nThe cooperative cannot pour if the pour will be stolen. They cannot wait if the children will freeze.\n\nA grandmother on the third floor still standing boils tea on a single-ring stove. Wind comes through the missing wall. The rebuild is not failing for lack of hands. It is failing because every wall that rises becomes inventory for someone else.\n\nWho designs a rebuild that can rise faster than it can be stripped?",
      stakeholder: "Tenants’ rebuild cooperative",
      crisisMeters: { local: { label: "Exposed Homes", description: "Families sleep under tarps on their own lots. Wind and frost come through walls that never rise." }, global: { label: "Material Theft", description: "Rebar and cement leave the pour overnight and reappear two streets over. Every delivery becomes inventory for someone else." }, support: { label: "Deed Fights", description: "Photocopied papers in three languages claim the same stairwell. Cousins stop the pour before the thieves do." } },
      suggested: ["print3d", "materials", "robots", "solar", "drones", "ai", "networks", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Twin Bank Canals"],
      title: "The canal gate becomes a weapon",
      scene:
        "Abu Karim walks the north bank at first light. The sluice is chained shut. The south bank opened it for two hours after midnight, then locked it again. His tomato rows are already curling. Across the water, a man he used to share tea with now holds the key.\n\nEach family that controls a gate can dry the other side. Each dry week is a debt week at the seed shop. The water users' council still meets under the same mulberry tree. They bring paper shares from a time when the canal was one system. The paper does not turn the wheel.\n\nAbu Karim's daughter is promised to a lender if this crop fails. On the south bank, a widow's wheat is already too short. Neighbors who once timed their irrigations together now time their locks. The gate is no longer a tool for sharing water. It is a way to aim thirst.\n\nWho designs a canal that cannot be pointed at a neighbor?",
      stakeholder: "Both-banks water users’ council",
      crisisMeters: { local: { label: "Crop Failure", description: "Tomato rows curl when the sluice stays chained. A short wheat crop means a winter without seed money." }, global: { label: "Gate Capture", description: "Whoever holds a key can dry the other bank. The canal is no longer one system. It is a set of locks aimed across the water." }, support: { label: "Family Debt", description: "A failed crop promises a daughter to a lender. Neighbors who once shared tea now time their locks." } },
      suggested: ["iot", "solar", "ai", "networks", "space", "drones", "crypto", "computing"],
      visionTheme: "food-city",
    }
  ],

  nuclear: [
    {
      places: ["Clearwater Silo Road, northern Great Plains"],
      title: "Sirens over the grain elevators",
      scene:
        "Capt. Maya Brooks steps off the alert truck onto Clearwater Silo Road and tastes dust. The county siren is already winding. It is the same horn that means tornado. It is also the horn that means the missile wing just went hot.\n\nHer son's 4-H lambs slam the fence in the dark. Porch lights snap on down the section line. A neighbor's voice carries from the next yard: basement or ditch.\n\nMaya has a crew and a clock. The clock is short on purpose. Launch-on-warning is the standing rule that treats a possible inbound as real until someone proves it is not. Last month a weather balloon did this. Harvest dust did it the month before. The old radar net still reads the steel of the grain elevators the way it reads a plume.\n\nShe cannot tell her husband which kind of night this is. Open phones are forbidden once the horn starts. He manages the co-op bins two miles north. He will pull the night crew into the concrete tunnel under the scales either way. The lambs will keep running.\n\nHigher headquarters is waiting on a satellite pass. The pass still flags chaff, dust, and a bent vane as the same class of threat. The civil-defense contract from the seventies never split the public horn into weather and war. One circuit still wakes the whole county.\n\nMaya can hold her crew at ready. She can also send the confirmation that starts the next hand's eight minutes. Either choice spends the same farm families.\n\nWho designs a farm-road warning that can tell a family from a fuse?",
      stakeholder: "Capt. Maya Brooks, missile combat crew commander",
      crisisMeters: { local: { label: "Night Sirens", description: "The same county horn wakes Silo Road for weather and for the missile wing. Families learn the sound in their sleep and still cannot tell which night it is." }, global: { label: "Short Fuses", description: "Launch-on-warning keeps Maya's crew on a clock measured in minutes. Dust, balloons, and elevator steel still count as inbound until someone proves they are not." }, support: { label: "Family Fear", description: "Kids go to basements. Night crews crawl under the grain scales. Husbands text and get no answer once the horn starts." } },
      suggested: ["ai", "computing", "networks", "iot", "vr", "quantum-internet"],
      visionTheme: "food-city",
    },
    {
      places: ["Floe Watch Headland, Labrador coast"],
      title: "Ice clutter looks inbound",
      scene:
        "Sgt. Inuk Arnaq drags a gloved finger across the track table at Floe Watch Headland. Three arcs bloom over the Labrador pack. Ice is calving in long ridges tonight. The fusion screen does not care.\n\nThe clinic in Nain already rolled cots into the hallway on the last false track. Elders walked the ice road in the dark because the all-clear came late. The radio net still skips the outport when the aurora is loud. A child with a fever sat in a hallway chair until morning.\n\nHold time is the minutes a commander may wait before treating a track as real. That window shrank after the last satellite gap. Arnaq's cousin works the clinic desk. She called twice. She asked if the oxygen concentrators should move to the inner room again.\n\nThe sensor book still scores sea ice the way it scores metal. No one from the hamlet sits on the classification board. The board meets inland. It meets in a language that does not name this floe.\n\nArnaq can hold the tracks and eat the reprimand. She can pass them up and start a clock in a capital that has never stood on this rock. Passing them up is how the last evacuation emptied the clinic of night staff.\n\nWho gets a vote when ice looks like a missile?",
      stakeholder: "Sgt. Inuk Arnaq, sensor fusion lead",
      crisisMeters: { local: { label: "False Alarms", description: "Ice ridges paint inbound arcs on the fusion screen. The hamlet has already emptied once for a floe that was only ice." }, global: { label: "Minutes Left", description: "The minutes Arnaq may wait before passing a track keep shrinking. A capital clock starts the moment she sends the arcs up." }, support: { label: "Clinic Strain", description: "Cots fill the hallway. Oxygen machines get dragged to the inner room. Night staff leave when the last false track empties the building." } },
      suggested: ["space", "ai", "networks", "iot", "drones", "computing"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Iron Quay Liaison Yard, lower Danube corridor"],
      title: "Drills without a shared clock",
      scene:
        "Col. Elena Popa hangs a yellow yard lantern on the crane at Iron Quay, the old signal for a practice, not a strike. She is trying to give the market a color it can trust. A barge horn still answers a siren from the other bank. The Tuesday stalls empty anyway. The fruit seller looks at the lantern and leaves the crates. A tram brakes hard and will not open its doors.\n\nOne side called it a readiness drill. The other side did not get the notice. Hidden drills are still allowed if they stay inside national channels. Popa's lantern is not in any channel. The other desk calls it a leak.\n\nGPS time sits on her left desk. A sealed analog clock sits on the right, wound by a sergeant who will not surrender it. Her runner is a teenager from the block. He tells the fruit seller the lantern means practice. The seller asks who winds the lantern when Popa is not on the crane.\n\nA mother on the platform will not put her child back on the river bus. She watched the last unannounced drill pin a ferry against the quay piles. Shopkeepers bolt steel shutters that take an hour to raise. The other desk refuses to light a matching lantern. A public flag would admit they were drilling.\n\nPopa can take the lantern down and keep the secret. She can leave it up and own the leak. The fruit will rot either way.\n\nWho designs a signal two armies will share before a city has to guess?",
      stakeholder: "Col. Elena Popa, joint deconfliction desk",
      crisisMeters: { local: { label: "Civilian Panic", description: "The Tuesday market empties when a barge horn answers a siren. Fruit sits in the sun. Mothers will not put children back on the river bus." }, global: { label: "Hidden Drills", description: "Each army can still run a readiness drill inside its own channel. The other bank finds out when the quay already sounds like war." }, support: { label: "Trust Gap", description: "The liaison yard was built for a shared minute that never arrives. A teenager translates the languages. No one translates the protocols." } },
      suggested: ["networks", "crypto", "space", "ai", "vr", "drones"],
      visionTheme: "social-city",
    },
    {
      places: ["Granite Command Hollow, Appalachian foothills"],
      title: "Near-send on patch night",
      scene:
        "Eng. Kenji Okada watches the status board blink amber in Granite Command Hollow. It is patch night. The ridge town already knows the pattern. Church bells rang last quarter when a test string leaked onto the volunteer fire net. Kids were held for indoor recess. The diner on Main emptied at 2 p.m. and stayed empty through supper.\n\nA near-send is a launch order that almost leaves the building before a human veto catches it. The last one died on Okada's key. The veto window shrank when the update was sold as faster assurance. Headquarters wants the new logic live before the next inspection.\n\nHis team has to take the old console offline to load the patch. The new logic treats a dropped handshake as hostile. The backup generator on the hollow's west pad still brownouts when the town mill starts its night shift. That flicker is enough to drop a handshake.\n\nThe mayor's office called twice. They want a quiet hour, not another bell. A volunteer firefighter asked Okada in the grocery line whether the kids should keep shoes by the bed. Okada can roll back and keep the slow human check. He can also ship the patch that already has a signature from above.\n\nWho designs a command update that does not spend a town's nerve to buy a shorter fuse?",
      stakeholder: "Eng. Kenji Okada, C3 assurance lead",
      crisisMeters: { local: { label: "Near Misses", description: "Launch orders almost leave the hollow before a human key stops them. The last one died on Okada's watch during a patch." }, global: { label: "Less Time", description: "Each update sold as faster assurance cuts the time a person has to say no. A dropped handshake now counts as hostile." }, support: { label: "Town Anxiety", description: "Church bells, indoor recess, and a diner that empties at 2 p.m. The ridge town has learned the sound of patch night." } },
      suggested: ["computing", "ai", "networks", "quantum-internet", "robots", "iot"],
      visionTheme: "energy-city",
    }
  ],

  slavery: [
    {
      places: ["Ranong Channel Boats"],
      title: "Papers locked below the ice line",
      scene:
        "At first light, medic Arun climbs the wet ladder of a Ranong trawler still packed with ice. He is looking for a deckhand named Min whose palm was split by a winch two nights ago. The captain smiles and points to a locked hatch. Min is resting, he says.\n\nPapers stay in the wheelhouse safe until the trip is settled. Arun has seen this rest before. The wound will sour in the hold. Min will not climb up while the lockbox holds his passport and the broker's chit.\n\nFuel, bait, and ice are billed to the crew. The trip never quite covers the advance. A man who walks to the clinic without papers can be written down as a runaway. Other boats will not take him. His sister in Dawei still waits on a transfer that never posts.\n\nArun can stitch a hand on the dock. He cannot stitch a name back onto a ledger the captain owns.\n\nWho designs a crew record that travels with the body, not the lockbox?",
      stakeholder: "Port clinic outreach medic",
      crisisMeters: { local: { label: "Night Injuries", description: "Winch cuts and crushed hands sit untreated in the hold. Ice and salt keep the wounds wet. A medic on the dock often meets the injury two days late." }, global: { label: "Crew Debt", description: "Brokers advance cash for the trip, then bill ice, fuel, and bait to the crew. The balance almost never clears. A man who leaves still owes." }, support: { label: "Held Papers", description: "Passports sit in the wheelhouse safe until the captain says the trip is settled. Without papers, a crewman cannot walk into town or change boats." } },
      suggested: ["iot", "networks", "ai", "crypto", "drones", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Sambas Palm Blocks"],
      title: "The scale that never zeros the loan",
      scene:
        "Before the first bell, teacher Rina stands at the weigh shed in the Sambas palm block. She holds a folded exam sheet for Sari, who is eleven. Sari does not come. Her mother is already in the row. The girl is behind her with a sack of loose fruit.\n\nThe scale clicks. The clerk writes a number lower than yesterday's same load. The family loan book does not move toward zero. Housing, rice, and the sickle are still on the page.\n\nSari looks at the exam, then at the sack. If the weight is short, the barrack rule is simple. Children pick until the ticket matches the debt. School can wait.\n\nRina can keep a desk open after dusk. She cannot make the scale tell a number a child can carry to class.\n\nWho owns the zero on a harvest loan when the only witness is the company beam?",
      stakeholder: "Plantation school teacher",
      crisisMeters: { local: { label: "Missed School", description: "Children skip class to pick loose fruit when a family's weigh ticket comes up short. Exam weeks lose to harvest weeks. Desks stay empty after the first rain of fruit." }, global: { label: "Weigh Fraud", description: "The company scale sets the number that pays the loan. Loads that look the same weigh less on paper. The debt never quite zeros." }, support: { label: "Barrack Rules", description: "Housing and rice are tied to staying in the block. Families who complain lose the room. Teachers who push too hard lose the gate." } },
      suggested: ["crypto", "iot", "ai", "networks", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Bhadohi Loom Lanes"],
      title: "Knot counts after midnight",
      scene:
        "After midnight, counselor Meera sits on a low stool in a Bhadohi loom lane and counts knots with a boy named Imran. His fingers are fast. His eyes are not. The wedding advance his father took is pinned to the warp like a second pattern.\n\nAt noon the exporter's audit van will park at the lane mouth. Children will be walked to a cousin's courtyard and given slates. The certificate will say child-free. The order will still ship.\n\nImran's mother needs the next installment. The loom stands in the house, so the house is the factory. Night is the only shift the clipboard never sees.\n\nMeera can hide a boy for an hour. She cannot hide the advance that puts him back on the bench.\n\nWhat proof of a childhood holds after the van leaves and the knots still have to be counted?",
      stakeholder: "Child-rights counselor",
      crisisMeters: { local: { label: "Child Hours", description: "Boys and girls tie knots after midnight on home looms. Fingers swell. Sleep does not last until school." }, global: { label: "Family Advances", description: "Wedding and medical loans are pinned to the warp. The next installment depends on meeting the knot count. Parents put children on the bench." }, support: { label: "Fake Audits", description: "Vans arrive at noon. Children vanish into courtyards with slates. Certificates still stamp the carpets child-free." } },
      suggested: ["ai", "networks", "crypto", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Kolwezi Dig Trenches"],
      title: "Ore sacks instead of schoolbags",
      scene:
        "Nurse Amina kneels in a Kolwezi trench and wraps a boy's lower back with the last clean gauze. He is twelve. The sack of cobalt rock he dragged to the depot still sits in the dirt, tagged with a torn chit.\n\nThe buyer will not pay cash. The chit is good only at the pit boss's stall, where rice costs more than the ore. Schoolbags stay under a cot. The trench is the day's work.\n\nAmina's mobile post can treat strain. It cannot cash a chit. The formal depot up the road buys mixed sacks and asks no names. The phone mineral will still leave as clean cobalt.\n\nThe boy's mother watches the wrap. If he rests tomorrow, the stall debt grows. If he lifts again, the spine may not.\n\nWho designs a mineral ticket that pays a child out of the pit instead of deeper into it?",
      stakeholder: "Mobile health-post nurse",
      crisisMeters: { local: { label: "Spine Strain", description: "Children haul ore sacks out of wet trenches. Backs give out before the week does. The clinic wrap is often the only rest." }, global: { label: "Chit Pay", description: "Buyers pay in paper good only at the pit stall. Rice and soap cost more than the sack. Cash never reaches the family." }, support: { label: "Pit Bosses", description: "Bosses decide who can sell and who is a troublemaker. A nurse who asks names can lose her pitch at the trench." } },
      suggested: ["drones", "iot", "ai", "robots", "networks", "crypto", "computing"],
      visionTheme: "energy-city",
    }
  ],

  women: [
    {
      places: ["Riverside Maternity Shift Gate, Padma Bend"],
      title: "The walk home after midnight",
      scene:
        "Asha clocks out at 12:17 and steps through the shift gate. The last newborn of her rotation is still crying behind the ward door. Hospital light dies at the fence. Beyond it the river path is a dark ribbon toward the ferry stairs.\n\nThe staff van was cut last spring. Accounts called the night run a luxury. The city bus ends at ten. Asha walks with her phone torch and a whistle on a string. Two weeks ago a colleague was followed to the landing. She moved to days and lost the night pay that bought her mother's insulin.\n\nThe roster still stacks births after midnight. Street lamps follow shop hours, not ward hours. Guards stay inside the gate. Their post is the building. The road is the nurse's problem.\n\nAsha's sister texts to ask if she has reached the stairs. Three more night nurses have put in papers this month. If the crew keeps thinning, the floor loses the hands that know a breech. Who designs the last mile of a shift so the person who caught the baby can still get home?",
      stakeholder: "Night-shift nurses' safety caucus",
      crisisMeters: { local: { label: "Night Fear", description: "After midnight the bund road has no bus and almost no lamps. Nurses walk it with phone lights. Fear here is the stretch between the shift gate and a locked door at home." }, global: { label: "Shuttle Gap", description: "The hospital cut the night van and called it savings. City lighting still follows shop hours. The birth roster still puts women on that road after twelve." }, support: { label: "Staff Loss", description: "Night nurses transfer or quit. Families start to doubt a thinning birth crew. The ward loses the people who already know the work." } },
      suggested: ["networks", "solar", "iot", "transportation", "ai", "battery", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Old Bund Land Registry, Khetpur Flats"],
      title: "The deed still needs his name",
      scene:
        "Meena sets a death certificate on the ledge at window three. Beside it she lays the harvest book with her own pencil marks. The clerk stamps WAITING without looking up. Her husband's name still holds the paddy title. His name also holds the grave.\n\nThe new kiosk will not save a file with one adult. A box labeled Co-Owner Male blinks red when she leaves it empty. A cousin at the tea stall offers to add his name for now. For now is how a field changes families.\n\nLast season she planted the high bund herself. The canal man would not lift her gate without a man's thumb on the water slip. She borrowed from a trader at a rate that eats the crop. The registry calls this modernization. They scanned the old books. They scanned the old rule with them. A woman holds land through a man.\n\nIf the title lapses, school fees lapse with the field. Her daughter is twelve. The desk can print a cultivation pass that dies before the next rain. Who is named on the land when the person who farms it cannot be?",
      stakeholder: "Widows' land rights desk",
      crisisMeters: { local: { label: "Field Loss", description: "Without a title a widow cannot open the canal gate or keep the paddy through the next season. The field is dinner and school fees. Losing it is immediate." }, global: { label: "Title Block", description: "The kiosk still demands a male co-owner. Custom was scanned into the new software. A blank box turns red and the deed stays dead." }, support: { label: "Legal Limbo", description: "Neighbors and lenders treat a widow in waiting as someone who does not really own. Temporary passes expire. Trust in the registry drains with each stamp." } },
      suggested: ["networks", "ai", "crypto", "computing", "space", "iot", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["East Yard Trade School, Harbor Ward"],
      title: "The welding bay closes at dusk",
      scene:
        "Priya pulls the practice headset from the closet after the lunch bell. She has forty minutes before she must collect her sister from the market stair. On the screen an overhead joint cools in perfect time. Her paper coupon for live bay four expires Friday.\n\nThe cert board will not log headset hours. They want burned gloves and a stamp from a physical booth. Afternoon steel time belongs to the shipyard men, who overrun and leave no gap. At six the shutters come down. The painted line says Safety After Dark. Priya asked to stay with a supervisor present. The board said no mixed evenings. There was no incident file. There was a vote.\n\nShe lays a clean bead in the simulation and saves it. The file will not open the yard gate. Her mother needs her at the stall by dusk. The apprenticeship letter is dated the week after the test.\n\nThe problem is not only a locked bay. The problem is what a woman's practice is allowed to count as. Who decides that a skill is real only in a room she is not permitted to enter?",
      stakeholder: "Women apprentices' coalition",
      crisisMeters: { local: { label: "Skill Block", description: "Women apprentices cannot log the live night hours the weld test requires. Daylight booths belong to men already on the yard payroll. The certificate stays out of reach." }, global: { label: "Bay Lock", description: "The school locks the bays at dusk and calls it safety. The lock keeps the board out of trouble. It also keeps women out of the trade." }, support: { label: "Family Pull", description: "Households will give a daughter the afternoon, not the evening. When the school will not flex, families pull her back to the stall and the younger kids." } },
      suggested: ["vr", "print3d", "networks", "ai", "solar", "robots", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Lakeview Family Planning Counter, West Shore"],
      title: "The form still wants his signature",
      scene:
        "Lila sets her paper number on the Lakeview counter. Her toddler hooks a fist in her scarf. The clerk slides a pink sheet across the wood. Box 7 waits for a spouse signature. The printer will not drop the implant kit until a second name hits the till.\n\nHer husband is on the far shore for three weeks. His phone stays dark. Last year the same empty box sent her home. She carried a pregnancy she had already decided against. The midwife can talk. She cannot override the software. District insurance pays only when the screen shows dual consent.\n\nA volunteer murmurs that someone could sign. Lila shakes her head. News walks the lake road faster than a boat. Women have begun skipping the counter for kiosk pills with no dose and no record.\n\nThe clinic lights work. The midwife is in the room. The rule that a grown woman's body needs a man's name is printed in three languages and wired into the drawer. Who builds a clinic that will not start until a husband walks in?",
      stakeholder: "Community midwives' network",
      crisisMeters: { local: { label: "Care Denial", description: "The till will not release an implant without a husband's name. Women leave with a child and no method. Some return pregnant. Some do not return." }, global: { label: "Consent Gate", description: "District insurance and clinic software treat a grown woman as a dependent. Dual consent is coded into the printer. Staff cannot override it." }, support: { label: "Clinic Stigma", description: "Word on the lake road turns a visit into gossip. Women skip the counter for unregulated pills. The midwife loses the people she is there to serve." } },
      suggested: ["networks", "ai", "iot", "computing", "solar", "crypto", "drones"],
      visionTheme: "social-city",
    }
  ],

  education: [
    {
      places: ["Marsh Bend"],
      title: "Flood weeks erase a grade in Marsh Bend",
      scene:
        "Tanya Brooks stands on the gravel shoulder of Parish Road 12 and writes the water depth on a clipboard that has already gone soft at the corners. The lot at Marsh Bend Elementary is still a brown lake. A heron works the outfield. It is Wednesday. School was supposed to reopen Monday.\n\nThe superintendent's text says wait for the county. The county waits for the levee board. The levee board waits on a pump impeller in a warehouse two parishes over. Buses will not take the dip by the Baptist church. South-bend kids have missed eleven days this month. Last spring they missed fourteen.\n\nTanya hands makeup packets through truck windows after her shift at the grain elevator. The packets leave the office in grocery bags. Most bags come back stained. Some never come back. Her son Malik can name every bayou cut between the lock and the parish line. He cannot finish the fraction unit he started in September.\n\nThe calendar in the office still follows cotton. It does not follow a levee that has overtopped three times in five years. State money follows seats in a dry room. When the room floods, the money stops. The reading aide is the first cut. The next high water meets a thinner staff and the same attendance rule. The high school already stamped Malik chronic absence. The stamp does not mention the river.\n\nWho designs a school year that can live through the weeks the levee loses?",
      stakeholder: "Tanya Brooks, PTA lead and levee witness",
      crisisMeters: { local: { label: "Missed Days", description: "South-bend kids lose whole weeks when the lot goes under. Packets in grocery bags cannot replace a teacher or a dry room." }, global: { label: "Flood Calendar", description: "The school year and the attendance money still assume dry ground. The levee board and the district clock do not share a season." }, support: { label: "Catch Up Faith", description: "Families stop trusting makeup after the third closure. PTA nights thin out, and the chronic-absence stamp feels like blame." } },
      suggested: ["networks", "ai", "solar", "battery", "vr", "computing", "drones", "materials"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Packingtown"],
      title: "English-only exams strand Packingtown fifth-graders",
      scene:
        "Hodan Ali kneels on the cafeteria tile at Packingtown Intermediate and tapes a paper number to her daughter's collar. It is state exam morning. The room smells like bleach and boxed apple juice. Last night, after the late chain at the packing plant, Aisha worked three word problems at the kitchen table while Hodan read them in Somali. She had every answer.\n\nThe proctor reads the directions once, in English only. Aisha's pencil stops on a farm-stand story. She knows the arithmetic. She does not know the English word the booklet uses for harvest. Two seats over, a boy from the Saturday clean crew turns a page he has not read.\n\nThe plant runs two day shifts and a weekend washdown. The free adult English class meets at the same hour the line needs bodies. After last year's scores, the district cut the bilingual aides. Scores follow the English booklet. The booklet follows a rule written when Packingtown still spoke one language on paper. Hodan is the plant nurse. This month she has cleaned three fathers' line cuts that they hid so they would not miss a Saturday they thought might be makeup. There was no makeup. If this booklet decides Aisha cannot read, she repeats fifth grade. The booklet never asked who stood outside its words.\n\nWhat would a fair exam be in a town that thinks in more than one tongue?",
      stakeholder: "Hodan Ali, plant nurse and parent advocate",
      crisisMeters: { local: { label: "Reading Gap", description: "Fifth-graders who can do the work at the kitchen table fail the cafeteria booklet. A held-back year starts with one English word." }, global: { label: "Language Rules", description: "Promotion and school money follow an English-only exam. Packingtown's night chain and kitchen languages do not count." }, support: { label: "Aide Shortage", description: "Bilingual help was cut when scores dropped. Parents on the late shift cannot be the missing classroom." } },
      suggested: ["ai", "networks", "vr", "computing", "transportation", "iot", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Heat Ridge"],
      title: "Blackout classrooms empty Heat Ridge by noon",
      scene:
        "Luis Ortega props open the gym doors at Heat Ridge Middle and feels the air coming off the court. The classroom thermostats already show ninety-four. It is 10:40 a.m. The principal's radio crackles. Release at noon. Again.\n\nThe district will still log a full day because the buses ran at seven. Kids walk home to trailers where the swamp cooler seized in June. Some camp in the Dollar General aisle until a grown-up clocks out. Luis keeps a clipboard of who returns for evening drills. The list shortens every heat week.\n\nThe substation on Ridge Road sheds the school first when the peak hits. Evening houses are what the utility treats as precious load. The school was wired as a daytime customer with no storage. Its contract fines the district for drawing hard at midday. Teachers print packets in a dark office. Packets do not run a lab. Attendance still wants bodies in numbered rooms that cannot hold them.\n\nMarcus, who starts for Luis, has now lost the same weather unit three times. He can finish a fast break on this floor. He cannot sit a science test he has never been taught through.\n\nHow do you keep a school day real when the grid quits at the hour the heat peaks?",
      stakeholder: "Luis Ortega, after-school coach",
      crisisMeters: { local: { label: "Heat Days", description: "Class ends at noon when the rooms hit the nineties. The same science unit keeps vanishing for the kids who stay." }, global: { label: "Power Gaps", description: "The substation drops the school first. The contract treats midday learning as disposable load." }, support: { label: "Empty Homes", description: "Released kids go to dead coolers or the store aisle. Evening drills lose the roster, and families stop sending them back." } },
      suggested: ["solar", "battery", "networks", "ai", "computing", "vr", "iot", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Millbridge"],
      title: "Teen caregivers miss the credit clock in Millbridge",
      scene:
        "Keisha Dunn slides a manila folder across the registrar's counter at Millbridge High. Inside is a week of time sheets. Clinic drop-off at 2:10. The pharmacy window. The hour her nephew DeShawn sat with his grandmother after the fall on the porch. Keisha has headed each page the way the community college heads her own night clinicals.\n\nThe registrar is kind. The software is not. There is no course code for a seventeen-year-old who is the afternoon nurse in his own house. Seat-time still means a chair in a numbered room. Welding shop will not take a note from a pharmacist. Online makeup exists as a login. The lab hours do not transfer. The night section is coded for adults. DeShawn is seventeen, so the portal rejects his ID.\n\nKeisha is twenty-eight. She became the kinship caregiver when the mill closed and her sister left. She is one absence from stalling her own certificate. If DeShawn drops below the credit line this term, he ages out of the free lunch that keeps him walking through the front door at all. The town needs both of them finished. The clock was cut for a house with someone else home after last bell.\n\nWho decides what an hour of learning looks like when care is the other class?",
      stakeholder: "Keisha Dunn, kinship caregiver and night student",
      crisisMeters: { local: { label: "Credits Lost", description: "Seat-hours burn when a student leaves to keep an elder safe. Diplomas slip by fractions of an afternoon." }, global: { label: "Seat Rules", description: "Credit still means a chair in a numbered room in daylight. Care does not map to a course code the software will accept." }, support: { label: "Care Load", description: "Kinship houses run on teenagers since the mill closed. Night school and high school both demand the same body." } },
      suggested: ["ai", "networks", "vr", "computing", "transportation", "solar", "battery", "robots"],
      visionTheme: "care-city",
    }
  ],

  automation: [
    {
      places: ["Cedar Junction Fulfillment Hub"],
      title: "Aisles that pick themselves",
      scene:
        "Maya clocks in at 10:47 p.m. and finds her bay already half-empty. The new aisle robots have finished the easy shelves. What remains are the awkward cases—soft fruit, odd sizes, the ones that jam the grippers. Her handheld flashes a higher pick rate than last week. Same shift length. Fewer human hands on the floor. The steward board by the break room lists three more names moved to “flex pool,” which means no guaranteed hours. Corporate still pays by units cleared per hour. The algorithm that sets the rate learns from the robots’ clean runs, then applies that pace to people. Maya’s rent is due Friday. She can keep the quota tonight if she skips the safety stretch and takes the heavy top shelf herself. Who designs the floor so speed does not erase the crew that still has to finish what machines refuse?",
      stakeholder: "Night pick crew steward",
      crisisMeters: { local: "Jobs", global: "Pick quotas", support: "Rent stress" },
      suggested: ["robots", "ai", "iot", "networks", "computing", "transportation"],
      visionTheme: "food-city",
    },
    {
      places: ["Harborview Driver Dispatch Garage"],
      title: "Medallions against empty curbs",
      scene:
        "Luis wipes salt off the garage whiteboard and counts the open slots. Six medallion holders still wait for morning airport runs. Two city robotaxi pods idle at the curb outside, already booked through the port app. A rider cancels Luis’s car mid-load because the pod is three minutes cheaper. The co-op’s loan on the fleet does not care about the cancel. Dispatch still ranks drivers by acceptance score and on-time percent. The scoreboard feeds the same app that steers riders toward the pods on mapped waterfront blocks. Luis’s partner texts that the daycare deposit bounced. He can chase the long suburban fare no pod wants, or sit the curb and watch the score fall. Who writes the curb rules so human drivers are not scored out of the harbor they built?",
      stakeholder: "Independent driver co-op lead",
      crisisMeters: { local: "Jobs", global: "Fleet scores", support: "Debt" },
      suggested: ["self-driving", "ai", "networks", "transportation", "computing", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Lakeside Hospital Revenue Wing"],
      title: "Charts coded without the wing",
      scene:
        "Priya opens the queue at 7:10 a.m. and sees forty charts already “pre-coded” in green. The model filled diagnosis strings overnight from notes she has not reviewed. Two of them list the wrong laterality on a surgical case. If she overrides, her throughput dips and the dashboard flags her bay. If she accepts, the bill goes out wrong and a patient gets a collections call for care they never had. The hospital bought the tool to cut denial rates and shrink the coding unit. Managers still post daily chart targets next to the coffee machine. Priya’s student loan servicer wants a payment plan update this week. She can slow down and fight every green line, or clear the board and hope appeals catch the damage later. Who designs revenue tools so accuracy is not a tax on the coder who still signs the chart?",
      stakeholder: "Coding unit rep",
      crisisMeters: { local: "Jobs", global: "Chart targets", support: "Loan strain" },
      suggested: ["ai", "computing", "networks", "vr", "crypto", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Sunridge Berry Packing Shed"],
      title: "Sorters took the piece-rate weeks",
      scene:
        "Rosa walks the line before dawn and hears the soft clack of the new vision sorters. Clamshells that once needed six pairs of hands now pass a camera and a puff of air. The piece-rate board shows last season’s numbers in faded marker. This week’s sheet has fewer names. Growers still pay the shed by packed flats per hour. When the sorter speeds up, the contract math drops human hours first. Rosa’s crew includes teens who learned tray work from their parents and older packers who never got digital training. A supervisor offers “upskill modules” on a tablet with no childcare and no pay for the hour. Rosa can split the remaining hand-sort jobs thinner, or send people home before the heat peaks. Who builds the shed so machine speed does not strand the hands that still know fruit by touch?",
      stakeholder: "Seasonal crew organizer",
      crisisMeters: { local: "Jobs", global: "Pack speed", support: "Skills" },
      suggested: ["robots", "ai", "iot", "print3d", "networks", "computing"],
      visionTheme: "food-city",
    }
  ],

  refugees: [
    {
      places: ["Paso del Norte Hostel Strip"],
      title: "Hostels full, stamps still pending",
      scene:
        "Nora Velez unlocks the cooperative hostel before dawn and finds three families already asleep against the front gate. She has two free mats. The overnight bus from the interior dropped more people than the strip can hold. By midmorning the stamp window across the street posts a new delay. Work cards will not print until biometric files clear a central queue no one on this block can see. Landlords along the strip still rent by the night and refuse longer leases without a stamp. Employers in the warehouse district do the same. Men take cash day labor at half the posted rate because a bed tonight costs more than pride. A mother named Luz loses her cot when she cannot show papers by checkout. Her boy starts a fever on a plastic chair in the lobby. Nora can open floor space. She cannot mint the stamp the city treats as the only proof of belonging. Who designs shelter that does not collapse every time the paper system stalls?",
      stakeholder: "Nora Velez, hostel cooperative coordinator",
      crisisMeters: { local: "Crowding", global: "Paper Delays", support: "Wage Pressure" },
      suggested: ["ai", "networks", "crypto", "computing", "solar", "battery", "print3d", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Old South Levee Road"],
      title: "Second breach, no parcel left",
      scene:
        "Coach Dara Nguyen walks the sandbag line at first light and counts the new gap where the levee slumped overnight. River water sits in the second row of kitchen gardens. The mutual-aid shed still holds seed rice, but the parcels that grew it are underwater again. Families who fled the last breach returned with handwritten claims and phone photos of old survey pins. The county map still lists half those lots under owners who left a decade ago. Without a clean title, no one gets a rebuild loan or a place on the high ground list. Young workers load vans for the city and do not plan to plant next season. Dara’s own nephew bags his tools after the morning shift. The levee fails in the same soft bend because maintenance money follows recorded property, not the people who actually farm the shoulder. Food leaves with them. Who redesigns land proof so a washed road does not erase a harvest and a home at once?",
      stakeholder: "Coach Dara Nguyen, levee mutual-aid lead",
      crisisMeters: { local: "Flooding", global: "Lost Titles", support: "Outmigration" },
      suggested: ["solar", "battery", "iot", "drones", "materials", "ai", "space", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["San Lázaro Ridge Clinic"],
      title: "Wounded at the ridge clinic gate",
      scene:
        "Dr. Samira Okonkwo meets the pickup at the ridge gate with a headlamp and a trauma kit. The man’s leg is wrapped in a shirt dark with blood. He crossed after dark and has no referral sheet. Night intake rules say unregistered arrivals wait for the morning registrar, even when the wound will not. Samira pulls him inside anyway. The day shift will write her up. Two nurses have already quit this month rather than choose between protocol and the person bleeding on the step. Up the ridge, a checkpoint still funnels the injured toward this single door because other posts demand papers first and care second. The clinic’s generator coughs; battery lights hold the suture tray. Samira ties the bleed and hears the next truck on the gravel. The gate does not only keep order. It keeps manufacturing the crowd that burns her staff out. Who designs urgent care that does not punish the hands that open the door?",
      stakeholder: "Dr. Samira Okonkwo, night triage lead",
      crisisMeters: { local: "Sick Nights", global: "Gatekeeping", support: "Staff Burnout" },
      suggested: ["ai", "networks", "solar", "battery", "drones", "computing", "transportation", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Jetty Ferry Sheds"],
      title: "Ferry cuts, addresses that sink",
      scene:
        "Captain Eli Marlow ties up at the east jetty and finds the ferry sheds already arguing over berth chalk marks. Overnight rain pushed tide into the lower bunks. Bedding hangs from rafters and still will not dry before the next shift. A family that slept on the third shed shows him a laminated card with a pier number the harbor office deleted after the last storm realignment. Without a recognized address they cannot renew work slips for the morning run. Crew lists shrink. Men fight for the dry upper berths because a wet night means a missed shift and a missed stamp. The ferry company cut two evening crossings to save fuel, so more people sleep in the sheds instead of reaching inland hostels. The jetty keeps making residents who cannot prove they live anywhere the system still maps. Eli can assign rope and tarps. He cannot invent a place name the clerk will accept. Who designs a floating address that survives the tide and the timetable?",
      stakeholder: "Captain Eli Marlow, seafarer and ferry workers desk",
      crisisMeters: { local: "Wet Bedding", global: "Dead Addresses", support: "Berth Fights" },
      suggested: ["networks", "solar", "battery", "transportation", "drones", "iot", "materials", "ai"],
      visionTheme: "ocean-city",
    }
  ],

  ag: [
    {
      places: ["Loess Bend County"],
      title: "Bare winter fields blow the county thin",
      scene:
        "Mara kicks the gate latch open before dawn and the wind already tastes like grit. Her tenant strip runs west of the creek bend. Last night’s freeze left the soil bare and powder-fine. By midmorning the sky turns the color of old paper. Dust lifts off every open acre and pours into the schoolyard two miles downwind. Kids wipe their eyes with sleeve cuffs. The nurse logs another afternoon of coughs.\n\nThe soil district’s cover-seed truck sits half empty at the co-op. Cash rent came due in November. Most tenants sold the last of the bean money to stay current, then left the ground naked through winter because a living mulch does not pay the note. Landlords still score leases on bushels delivered, not on residue left behind. So the pattern repeats: harvest hard, disk clean, hope the March rains are gentle.\n\nThey rarely are. Mara watches topsoil leave her rows in thin sheets and settle on the neighbor’s porch furniture. Her youngest comes home with a red throat again. The county can count dust days. It can count bare acres from the road. What it has not designed is a winter that keeps ground held when the rent calendar and the wind calendar refuse to match. Who builds a lease and a seed system that still works when the field has nothing left to sell?",
      stakeholder: "County soil district and tenant growers coalition",
      crisisMeters: { local: "Dust Days", global: "Bare Acres", support: "Farm Debt" },
      suggested: ["iot", "ai", "drones", "space", "solar", "genetic-engineering", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Fogline Spice Terraces"],
      title: "Full-sun spice rush kills the mist forest",
      scene:
        "At first light, Old Ren walks the upper spring path with a tin cup. He stops where the moss used to stay wet past noon. The cup comes up cloudy. Below him, new cardamom and pepper clearings shine like open wounds on the ridge. Crews cut the last shade trees in strips so the spice can take full sun and hit the export grade faster.\n\nThe cooperative voted yes last season. Spot prices were high. Contracts paid on dry weight and color, not on whether the mist still formed at dawn. Without the canopy, morning fog thins. Soil on the steeper treads loosens after night rain. A mud tongue took the footbridge above Ward Three on Tuesday. Spring flow at the village tank dropped enough that the afternoon fill line now stops short of the last houses.\n\nRen’s granddaughter carries water farther than she did a year ago. The wardens can point to each new terrace and name who signed. The driver is simple and local: full-sun spice pays this year; shade does not. Mist forest becomes ledger lines. The ridge still has to hold people, water, and roots at the same time. Who designs a spice living that keeps the fog and the slope when the buyer only prices the sun?",
      stakeholder: "Terrace cooperative and spring wardens",
      crisisMeters: { local: "Mudslides", global: "Spring Flow", support: "Shade Loss" },
      suggested: ["space", "iot", "drones", "ai", "networks", "gene-sequencing", "solar", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Ringroad Greens Belt"],
      title: "Spec sheets turn salad rows into spray alleys",
      scene:
        "Before the highway noise rises, Lila walks the edge row with a cloth over her mouth. Dew on the lettuce still carries a faint chemical bite from yesterday’s pass. Her crew starts bagging at six for the school-meal trucks. By nine, two pickers have stepped off the line with burning eyes and a tight chest. The union board logs sick days in a stained notebook because the buyer portal only tracks reject rates.\n\nThe contract sheet is clear. Leaf must be blemish-free, uniform, and delivered on a clock that does not care about wind drift. Miss the cosmetic grade and the lot bounces. So growers spray on a calendar that protects appearance first. Buffer flags sag between small plots. Drift does not read property lines. Children at the east-side primary eat the same salad the belt produces, then sit in classrooms with windows that face the spray hours.\n\nLila needs the school purchase order. Without it the land rent collapses. The meal buyers need clean audits and zero visible spots. The system that keeps both sides signed is the same system that keeps the alleys wet with product. Who redesigns the grade and the growing so a lunch tray does not require a sick day in the row?",
      stakeholder: "Peri-urban growers union and school meal buyers",
      crisisMeters: { local: "Spray Drift", global: "Sick Days", support: "Buyer Lock" },
      suggested: ["iot", "ai", "synbio", "drones", "robots", "gene-sequencing", "networks", "alt-proteins"],
      visionTheme: "social-city",
    },
    {
      places: ["Brackish Polder Reach"],
      title: "Pump wars salt the seed beds",
      scene:
        "Joren kneels in the south seed bed and rubs a crust between his fingers. The white line was not there at planting. Overnight the ditch ran low and the seepage turned sharp. His dairy–veg neighbors started their pumps an hour earlier than the water board’s slot, chasing a falling water table before the next man could. By noon his spinach starts look scorched at the tips.\n\nThe polder sits between a brackish canal and pastures that still pay on liters of milk. Fresh lenses thin when everyone lifts at once. Rules exist on paper. Enforcement arrives after the damage shows in the root zone. Each failed planting pushes a household to pump harder next cycle to recover cash. Salt climbs. Credit tightens. The mixed alliance argues in the pump house while the intake screens clog with fine silt.\n\nJoren’s partner calculates whether to replant or sell a cow. The board can ration hours. It cannot, alone, break the race that turns shared water into private urgency. The land still has to feed herds and rows without teaching the soil to taste like the canal. Who designs water turns and crops that end the race instead of rewarding the first switch on?",
      stakeholder: "Polder water board and mixed dairy–veg alliance",
      crisisMeters: { local: "Soil Salt", global: "Failed Plantings", support: "Pump Race" },
      suggested: ["solar", "battery", "iot", "ai", "materials", "networks", "space", "genetic-engineering"],
      visionTheme: "coastal-city",
    }
  ],

  food: [
    {
      places: ["Ladder Ridge Parish"],
      title: "Blight takes the parish potatoes",
      scene:
        "Elena opens the school kitchen at dawn and finds the potato sacks soft under her palm. The parish fields above the ridge went black at the edges last week. By Friday the tubers smell sweet and wrong. Lunch is half a scoop of mash stretched with water. Children scrape the bowls and still ask for more.\n\nShe walks the seed ledger with the co-op clerk. Last year’s resistant stock came on credit from a single supplier two valleys over. When that strain failed, the debt stayed. Farmers replant the same lines because the loan papers name the variety. New seed means new paper. No one has cash for both.\n\nBlight rides the wet nights down the slope. It does not care about the school calendar. Elena’s kitchen feeds eighty kids whose parents work the same rows. A short harvest means empty plates by midwinter, and the parish has no second crop waiting in the wings.\n\nWho designs seed and kitchen systems so a ridge school can feed children when one variety dies?",
      stakeholder: "Elena, parish school-kitchen lead",
      crisisMeters: { local: "Hunger", global: "Crop Blight", support: "Seed Debt" },
      suggested: ["gene-sequencing", "genetic-engineering", "iot", "ai", "solar", "drones", "networks", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Copper Gate Wholesale"],
      title: "Dawn crates rot at the gate",
      scene:
        "Jamal counts crates at the wholesale gate before the sun clears the tin roofs. Three pallets of greens arrived soft. The cold room ran warm again after midnight. Stallholders wait with empty handcarts and rising voices.\n\nThe market’s chillers sit on a shared meter that trips when the night bakeries fire their ovens. No one owns the backup. Drivers still unload at 4 a.m. because the highway toll drops then. Produce sits in the heat while the union argues over who pays for ice that never comes.\n\nSpoilage is not an accident here. It is the price of a gate built for volume, not for cold. Jamal’s members lose the morning stock and still owe stall fees by noon. A mother who buys for six goes home with wilted leaves and less coin than she planned.\n\nWho redesigns the gate so fresh food survives the hour between truck and stall?",
      stakeholder: "Jamal, stallholders union runner",
      crisisMeters: { local: "Hunger", global: "Spoilage", support: "Stall Fees" },
      suggested: ["iot", "battery", "solar", "transportation", "ai", "networks", "alt-proteins", "robots"],
      visionTheme: "food-city",
    },
    {
      places: ["Thorn Well Circuit"],
      title: "Wells on the circuit turn to mud",
      scene:
        "Nia parks the nutrition van at the third well on her circuit and lowers the bucket. It comes up thick. The water that once filled kitchen jugs now coats the ladle in silt. Two households have already stopped cooking beans. Children drink less and tire faster on the walk to school.\n\nUpstream, new fence lines cut the old shared recharge paths. Herders and small growers pump harder from private bores when the public wells slow. The aquifer does not vote. Each dry week, another family skips the protein ration Nia is meant to deliver because there is no clean water to boil it in.\n\nShe carries sachets and growth charts. She cannot carry a river. The circuit was drawn when wells were reliable markers on a map. Now the map lies, and the harm lands in the same kitchens every round.\n\nWho designs water and food routes together so a mobile aide is not left measuring hunger at a mud well?",
      stakeholder: "Nia, mobile nutrition aide",
      crisisMeters: { local: "Hunger", global: "Dry Wells", support: "Fence Lines" },
      suggested: ["iot", "solar", "ai", "drones", "networks", "space", "materials", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Millrace Flats"],
      title: "Barges pass the small jetties by",
      scene:
        "Oksana stands on the co-op jetty with the tally book open as the grain barge holds mid-channel. It does not slow. The captain radios that the contract now favors the deep terminal downstream. Draft fees and credit terms moved last season. Small jetties like hers no longer clear the ledger fast enough.\n\nThe silo still holds last month’s share for the flats families. Without the barge stop, that grain cannot reach the mill on time, and the co-op’s credit line tightens. Growers who delivered in good faith wait on payment. Kitchen cupboards thin while full holds slide past toward buyers who can prepay.\n\nHunger here is not a failed harvest. It is a routing choice written in contracts and channel depth. Oksana can count sacks. She cannot hail a barge that has already been paid to ignore her dock.\n\nWho designs river logistics so a co-op jetty still feeds the flats when capital prefers the deep terminal?",
      stakeholder: "Oksana, co-op silo clerk",
      crisisMeters: { local: "Hunger", global: "Diverted Grain", support: "Credit Bind" },
      suggested: ["ai", "networks", "transportation", "iot", "solar", "battery", "alt-proteins", "crypto"],
      visionTheme: "food-city",
    }
  ],

  eco: [
    {
      places: ["Cattail Bend Flats"],
      title: "Cranes over concrete",
      scene:
        "Mira walks the boardwalk at first light with a measuring stick and a notebook. Last night’s high water left a brown ring on the stilts of the corner store. Kids’ boots still squelch in the alley mud. The cattail fringe that once took the river’s punch is a thin strip now. A crane swings over the next parcel. Survey stakes mark where the lease will put fill and parking. The council can vote on sandbags and raised walkways. They cannot vote the marsh back once the trucks pour. Developers pay lease money the neighborhood needs for pumps and clinic hours. Every signed pad removes root and sponge that slowed the flood. Mira’s mother keeps a plastic bin of photos on the high shelf for the next surge. Who designs a neighborhood that can eat and sleep without selling the ground that keeps the water honest?",
      stakeholder: "Marsh neighborhood council",
      crisisMeters: { local: "Flooding", global: "Wetland Loss", support: "Lease Money" },
      suggested: ["drones", "space", "ai", "iot", "materials", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Silver Ladder Bend"],
      title: "Empty nets at the weir",
      scene:
        "Jonas hauls the last net at the old weir and counts six thin fish. His daughter waits on the bank with a bucket that will go home light. Upstream, the grain co-op’s new intake gate holds water for contracts signed in the county seat. The ladder the salmon used is a dry shelf of stone by noon. Fishers still mend gear and share the catch when there is one. The river schedule now follows truck loads, not the run. Jonas’s uncle used to smoke enough fish for winter and trade. This spring the smokehouse stays cold. Grain money keeps the valley schools open. Empty nets keep the cooperative arguing over who still belongs at the table. How do you design a river that feeds both the fields and the people who know its bends by hand?",
      stakeholder: "River fishers' cooperative",
      crisisMeters: { local: "Empty Nets", global: "Blocked River", support: "Grain Contracts" },
      suggested: ["iot", "ai", "drones", "gene-sequencing", "synbio", "solar", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Glassgrass Sound"],
      title: "Sand where meadows waved",
      scene:
        "Elena cuts the motor where the eelgrass should darken the shallows. The pole finds sand. A week ago the meadow still held crabs and the clear water guides sold to visitors. The dredge barge works the channel again before the next freighter window. Port fees pay the guild’s dock lease and the clinic’s fuel. Each pass lifts the bottom and clouds the light the grass needs. Elena marks another dead patch on a waterproof chart the older captains trust more than the app. Tourists cancel when the water turns the color of weak tea. Crews still know every cut and bar by name. The schedule that keeps the port open keeps grinding the nursery flat. What do you build so ships and living meadows can share one sound without erasing the floor?",
      stakeholder: "Sound fishers and guides guild",
      crisisMeters: { local: "Cloudy Water", global: "Sand Dredging", support: "Port Fees" },
      suggested: ["drones", "space", "iot", "materials", "nano", "ai", "solar"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Lichen Stair Valley"],
      title: "Spring without frogs",
      scene:
        "Tomas kneels at the spring and fills a jar. The water runs cloudy after last week’s cut on the ridge. No frogs call from the moss steps at dusk. His aunt boils every pot twice and still watches the children for stomach cramps. Charcoal sacks leave the valley before dawn. Cash from the bags pays school fees and the midwife’s travel. Crews take the easy slopes first, the ones that held the root mats above the wells. Stewards can post signs and carry seedlings. They cannot outpace a price that turns standing forest into weekend money. Tomas’s map of clean seeps shrinks each season. Who designs heat, school, and water so a valley does not have to burn its own filter to stay alive?",
      stakeholder: "Valley water stewards",
      crisisMeters: { local: "Muddy Wells", global: "Forest Loss", support: "Charcoal Cash" },
      suggested: ["drones", "space", "ai", "iot", "networks", "gene-sequencing", "solar", "materials"],
      visionTheme: "care-city",
    }
  ],

  infectious: [
    {
      places: ["Dump Edge Lane Settlement"],
      title: "Medical waste tips fever into Dump Edge Lane",
      scene:
        "Rosa lifts a torn IV bag with a stick before the morning buyers arrive. The bag still holds cloudy fluid. A boy from the next shack already has a line of red along his shin from yesterday’s sort. She washes the cut with water from a jerrycan that smells of plastic and smoke. By noon his fever climbs and he cannot stand the light. The city hospital bags keep coming on the same open truck that dumps household trash. No seal. No manifest. Pickers tear them for scrap plastic and metal because that is the day’s cash. Clinics upstream still pay haulers by weight, not by safe disposal, so the infectious stream keeps riding the cheap route to the lane. Rosa’s cooperative can refuse a load and lose the week’s rice money, or take it and watch more kids spike fevers from the same cuts. Who redesigns the waste path so a living depends on clean hands, not on opening sealed harm?",
      stakeholder: "Rosa, waste-picker cooperative lead",
      crisisMeters: { local: { label: "Infected Cuts", description: "A nick from a torn bag or a needle goes red by evening. Children hide the cuts under rags so they can keep sorting. Fever then walks the lane, and jerrycan water that smells of smoke is all they have to wash it." }, global: { label: "Waste Dumping", description: "Unsealed hospital bags ride the same open truck as kitchen trash. Clinics still pay haulers by the kilo, not by safe disposal. The infectious stream takes the cheap road straight to Dump Edge Lane." }, support: { label: "Clinic Access", description: "When a child cannot stand the light, the city hospital is a long walk and a longer wait. Rosa’s people handled the bags that hospital threw away. They arrive last and leave with little more than a glance." } },
      suggested: ["gene-sequencing", "iot", "ai", "materials", "networks", "drones", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Station Road Pilgrim Lodge"],
      title: "Shared cistern cough fills Station Road Lodge",
      scene:
        "Imam Karim unlocks the courtyard gate before dawn and finds three men already coughing into their sleeves by the ablution trough. The cistern under the lodge is the only water for washing, cooking, and the night prayer rinse. Last week a traveler from the coast slept two nights, left a dry cough, and moved on. Now the bunk room sounds like a broken engine. Karim wants to close the taps and buy tanked water, but the lodge runs on pilgrim fees that barely cover rice and mats. The municipal line stops at the station plaza. Haulers fill the underground tank from mixed sources whenever the price dips, and no one tests what arrives. Men who cannot afford a guesthouse keep coming because the lodge is the trust they know. If Karim turns them away, they sleep on the platform and lose work. If he keeps the cistern open, the cough walks home with every departing guest. Who designs water and welcome so faith hospitality does not become the quiet amplifier of an outbreak?",
      stakeholder: "Imam Karim, lodge warden",
      crisisMeters: { local: { label: "Cough Spread", description: "Before dawn men already cough into their sleeves by the ablution trough. The bunk room rattles all night like a broken engine. Every departing guest carries that sound onto the train and into the next village." }, global: { label: "Shared Water", description: "The cistern under the lodge is the only water for washing, cooking, and the night prayer rinse. Haulers fill it from mixed sources whenever the price dips, and no one tests what arrives. The municipal line stops at the station plaza." }, support: { label: "Lost Wages", description: "Men who cannot afford a guesthouse keep coming because the lodge is the trust they know. If Karim turns them away they sleep on the platform and miss the morning shift. Fees barely cover rice and mats, so closing the taps costs wages they cannot spare." } },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Old Quay Fish Landing"],
      title: "Gutting rinse sickens Old Quay landings",
      scene:
        "Nia slits a mackerel on the wet board and rinses her knife in the same bucket the boat used at the rail. By mid-morning her stomach twists. Two other women from the association leave the tables early, pale and shaking. The quay has no separate wash line. Ice melt, blood, and bilge water drain into the trough that everyone dips for a quick clean before the buyers shout. Harbor rules still treat rinse water as the boats’ problem, not the market’s. Captains save time by pumping over the side into the shared channel that feeds the gutting boards at low tide. Nia’s association can fine members for dirty knives and lose the morning sale, or keep pace and watch the same gut illness return every hot week. The fish must move before noon or the price collapses. Who redesigns the landing so speed to market does not keep recycling sickness through the same rinse?",
      stakeholder: "Nia, women’s fishers association",
      crisisMeters: { local: { label: "Gut Illness", description: "Women at the gutting boards double over before the first crate is sold. The same stomach sickness walks Old Quay every hot week. Nia’s association loses hands while the mackerel still wait." }, global: { label: "Dirty Rinse", description: "Ice melt, blood, and bilge drain into one trough everyone dips. Captains pump over the side into the channel that feeds the boards at low tide. The rinse never stays on one boat." }, support: { label: "Market Days", description: "Buyers shout and the price falls after noon. There is no time for a separate wash if the morning sale is to hold. Market day at the landing does not wait for clean knives." } },
      suggested: ["gene-sequencing", "iot", "synbio", "materials", "networks", "ai", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Maple Primary School Yard"],
      title: "Playground pump empties Maple Primary desks",
      scene:
        "Ms. Okonkwo counts empty seats after break and stops at twelve. The children who drank from the yard pump after football are the ones missing. A girl returns with a note: vomiting through the night, no strength for the walk. The pump is the only water the school can offer between lessons. The well under it sits downhill from latrines the township never fully lined. After heavy rain the taste turns metallic and sweet. District maintenance still schedules the school on the same slow circuit as empty lots, so repairs wait while attendance drops. Parents pull healthy siblings too, afraid of whatever rides the handle. Okonkwo can lock the pump and watch concentration fail in the heat, or leave it open and keep sending homes the same sickness. Exam week is three weeks out. Who designs school water so a playground drink stops being the quiet reason desks go empty?",
      stakeholder: "Ms. Okonkwo, head teacher",
      crisisMeters: { local: { label: "Sick Kids", description: "After break the empty desks belong to the children who drank from the yard pump. Vomiting through the night leaves them too weak for the walk to Maple Primary. Healthy siblings stay home next, because parents fear whatever rides the handle." }, global: { label: "Bad Well", description: "The well under the playground pump sits downhill from latrines the township never fully lined. Heavy rain turns the only school water metallic and sweet. District crews still park Maple Primary on the same slow circuit as empty lots." }, support: { label: "Class Days", description: "Exam week sits three weeks out while attendance thins. Lock the pump and heat steals concentration between lessons. Leave it open and the same sickness keeps sending children home." } },
      suggested: ["iot", "gene-sequencing", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "learn-city",
    }
  ],

  climate: [
    {
      places: ["Cedar Bend"],
      title: "Cedar Bend loses the lower ward",
      scene:
        "Rhea boots through ankle water on Maple Court before sunrise. She marks another porch where the creek jumped its bank overnight. The siren app on her phone stayed quiet. The culvert under the new logistics park clogged again with silt and shopping bags.\n\nBy midmorning the lower ward school bus turns around at the dip. Two families stack furniture on cinder blocks. A nurse on night shift cannot reach the clinic road. Missed work stacks up fast when the only dry route is a single ridge road.\n\nUpstream, the old marsh was filled and paved for truck bays five years ago. Stormwater has nowhere slow to go. It hits the ward in a sheet. County pumps still aim at the industrial park first. Rhea’s volunteer gauges tell a truer story than the official map, and the map still wins the budget meeting.\n\nMrs. Cole’s basement apartment takes a second soaking this month. Her oxygen concentrator sits on a chair above the waterline. Rhea helps lift it, then writes another address in the wet notebook.\n\nWho redesigns the ground so a paved boom does not keep drowning the people downhill?",
      stakeholder: "Rhea, ward flood-watch captain",
      crisisMeters: { local: "Flooded Homes", global: "Paved Wetlands", support: "Missed Shifts" },
      suggested: ["iot", "drones", "materials", "ai", "solar", "battery", "networks", "space"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Juniper Wells"],
      title: "Night heat pins Juniper Wells",
      scene:
        "Diego unlocks the community clinic at 9 p.m. because the waiting chairs are already full. A grandmother holds a damp cloth to her grandson’s neck. The wall thermometer still reads dangerous after dark. The swamp cooler rattles and loses the fight.\n\nAcross the fence, the gas field keeps flaring. Orange tongues lick the haze. Night does not cool the basin the way old-timers remember. Heat stored in asphalt and metal roofs pours back into bedrooms. People wake with headaches and stop sweating the way they should.\n\nThe clinic has one true cool room. Diego rotates families through twenty-minute slots. A tanker truck promised ice this afternoon and never came. Grid power browns out when every window unit kicks on at once. Workers from the pads still drive home in company trucks that idle outside the gate.\n\nMarta, who cleans offices on the field road, misses her third shift this week after a dizzy spell in her kitchen. Her name sits on Diego’s whiteboard under “follow up.” The board is getting crowded.\n\nHow do you cut the heat people sleep in without pretending the flares and the night are someone else’s problem?",
      stakeholder: "Diego, community clinic organizer",
      crisisMeters: { local: "Heat Illness", global: "Gas Flares", support: "Cool Rooms" },
      suggested: ["solar", "battery", "iot", "ai", "materials", "energy", "networks", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Gull Point"],
      title: "Warm water empties Gull Point nets",
      scene:
        "Noor hauls the last net over the co-op rail and counts silver that is not there. The hold smells of diesel and empty ice. Two deckhands rinse scales that barely cover a lunch plate. The radio chat from other boats is the same story up the channel.\n\nWater temperature boards at the harbor office show another warm week. The cold tongue that used to hold baitfish offshore has thinned. Boats push farther and burn more fuel for the same thin catch. Ice costs climb. Young crew take weekend shifts at the big-box warehouse instead of dawn departures.\n\nThe co-op still runs on a shared diesel dock tank and a handshake ledger. Noor signs chits for fuel she knows some families cannot cover if the next trip fails. Processors inland want volume she cannot promise. A tourist ferry wakes the slips while working boats sit dark.\n\nHer cousin sells his share of the boat after one more blank week. He leaves his gloves on the nail by the bait freezer. Noor stares at them longer than she means to.\n\nWhat keeps a working harbor alive when warm seas and diesel bills empty the nets together?",
      stakeholder: "Noor, co-op dock lead",
      crisisMeters: { local: "Empty Nets", global: "Boat Diesel", support: "Dock Jobs" },
      suggested: ["tidal", "wind", "battery", "solar", "iot", "ai", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Soot Bridge"],
      title: "Inversion traps Soot Bridge",
      scene:
        "Amira stands at the elementary gate with a handheld monitor that beeps too often. Kids cough into their sleeves on the walk from the bus. The morning sky sits like a lid. The mill stacks across the river draw straight white lines into the trapped air.\n\nRecess moves indoors again. The PTA’s clean-air fund bought filters for six classrooms. Hallways still smell like warm dust and exhaust from the bridge queue. Parents text photos of nosebleeds. Teachers mark another round of sick days that gut the week’s lesson plans.\n\nWhen the inversion locks in, the plant’s night venting and the diesel climb over the bridge share the same shallow bowl of air. Permits count annual averages. Amira’s monitor counts the hour before math. Neighborhood meetings split between people who need the mill checks and people who need their children to breathe through soccer practice.\n\nHer own daughter sits out PE with a rescue inhaler in her sock. Amira signs the nurse form and feels the choice narrow to filter boxes and open windows that let the river smell in.\n\nWho redesigns a town’s air when the stack, the bridge, and the schoolyard share one stubborn sky?",
      stakeholder: "Amira, PTA clean-air lead",
      crisisMeters: { local: "Dirty Air", global: "Stack Smoke", support: "Sick Days" },
      suggested: ["materials", "iot", "ai", "drones", "networks", "solar", "battery", "robots"],
      visionTheme: "social-city",
    }
  ],

  cancer: [
    {
      places: ["Circuit Beach scrap yards"],
      title: "Circuit Beach burns still seed the tumors",
      scene:
        "Ama Diallo kneels beside a sorting path at first light and lifts a boy’s wrist. The open sore has not closed in three weeks. She tapes gauze she bought with her own cash. Wind turns from the burn pits. Black smoke slides across the copper piles where children strip wire for weight tickets. The yards still pay by stripped kilos. After dark the bosses light plastic jackets because open fire is faster than the slow shredders no one funds to keep running. Ama’s throat burns by noon. Last month the clinic found a lump in her neighbor’s neck—the same neighbor who taught her which boards hold gold dust. The smoke keeps seeding the path. The tickets keep coming. Who designs a scrap economy that does not write tumors into the hands that feed it?",
      stakeholder: "Scrap-yard health volunteer Ama Diallo",
      crisisMeters: { local: "Open sores", global: "Burn smoke", support: "Scrap wages" },
      suggested: ["iot", "drones", "materials", "ai", "gene-sequencing", "robots", "solar", "networks"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Old Gasworks School block"],
      title: "Playground vapors no one capped in time",
      scene:
        "Priya Nair stands in the nurse closet at Old Gasworks School and marks three more absences. Nosebleeds. Stomach pain. She cracks the window and catches the sweet tar smell that rises when sun hits the old coking ground under the playground. The district sealed one corner years ago. The rest still breathes through cracked asphalt between math and recess. Parents want the portable classrooms moved off the plume. The budget committee says a land swap would cut the arts block and the free-lunch extension. Priya holds a permission slip for a mobile screening van. It needs a stable address and a parent champion who will not lose a shift. The vapors keep rising. The sick days keep stacking. Who designs a school yard that stops treating those days as normal?",
      stakeholder: "PTA nurse coordinator Priya Nair",
      crisisMeters: { local: "Sick kids", global: "Tar vapors", support: "Budget fights" },
      suggested: ["iot", "materials", "ai", "gene-sequencing", "drones", "networks", "computing", "space"],
      visionTheme: "learn-city",
    },
    {
      places: ["Nail Row beauty corridor"],
      title: "Solvent booths trade lungs for tips",
      scene:
        "Linh Tran props the alley door on Nail Row and counts the booth fans still spinning. Two are dead. Acetone and methacrylate hang in the air like a second skin. Mei at booth four covers a cough with her elbow and keeps filing. Tips pay the lease. The landlord meters each booth and fines anyone who runs a window unit past the shared breaker. Linh once hung a cheap carbon filter. It clogged in a week. The supply house laughed at the bulk price. A mobile clinic offered free checks last spring. Half the workers stayed home—booth renters without papers fear any clipboard in the corridor. The coughs grow longer. The polish still has to dry before the dinner rush. Who designs beauty work that does not trade lungs for the rent?",
      stakeholder: "Booth steward Linh Tran",
      crisisMeters: { local: "Cough spells", global: "Booth fumes", support: "Lease fear" },
      suggested: ["iot", "materials", "ai", "networks", "gene-sequencing", "print3d", "solar", "nano"],
      visionTheme: "social-city",
    },
    {
      places: ["Vinyl Reach night plant"],
      title: "Night resin lines still mark the livers",
      scene:
        "Omar Haddad walks the night resin line at Vinyl Reach with a flashlight taped to his hard hat. A sweet chemical smell leaks from flange 17 again. He hangs a red tag. The overnight supervisor shrugs. Orders for pipe compound are up, and the day crew already used the spare gasket set. Workers still eat lunch at the break tables twenty steps from the reactors. Omar’s cousin left last year after the liver panel came back bad. The plant nurse can only hand out referrals across town. Overtime is how families clear the medical bills those referrals create. The company tracks output by shift. It does not track cumulative solvent hours the same way. Who designs a night shift that does not write cancer into the liver before the mortgage is done?",
      stakeholder: "Shift safety rep Omar Haddad",
      crisisMeters: { local: "Liver cases", global: "Resin leaks", support: "Overtime push" },
      suggested: ["iot", "robots", "ai", "materials", "gene-sequencing", "networks", "computing", "synbio"],
      visionTheme: "energy-city",
    }
  ],

  mental: [
    {
      places: ["Ames Cyclone Corridor, Iowa"],
      title: "Waitlist longer than the semester",
      scene:
        "Maya opens the peer-support office at 7:40 a.m. with three sticky notes already under the door. One is from a sophomore who stopped sleeping after midterms. She puts his name on the board next to twelve others. The campus clinic’s next open intake is after finals. The semester will end first. Peer listeners take the overflow in a borrowed study room with thin walls. They are trained for a warm handoff, not for panic that lasts until dawn. When a resident advisor texts that a student is spiraling in a dorm stairwell, Maya has to choose who gets the one evening slot left this week. Counseling FTE was frozen while enrollment climbed. Advising still tells students to “use the app” and push through for grades. The waitlist is not a side effect. It is how the campus budgets care against credit hours. Maya watches the sophomore’s name sit unmoving on the board. Who designs support that arrives before the grade is already lost?",
      stakeholder: "Campus peer-support director",
      crisisMeters: { local: "Panic Nights", global: "Wait Lists", support: "Grade Fear" },
      suggested: ["ai", "networks", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Garden City Packing Ward, Kansas"],
      title: "The line never slows for grief",
      scene:
        "Father Ruiz stands by the break-room microwave as the second shift clocks in. Maria’s eyes are red. Her brother died on a different line last month. She still has to make rate. The plant chaplain’s office is a converted locker with a folding chair. Workers come on their ten-minute breaks, then go back before the belt notices. A supervisor knocks and points at the clock. Line speed did not change when the town buried three men in one season. Bonus pay still tracks carcasses per hour. Speaking up about grief can mark you as unreliable on the next schedule. Ruiz walks Maria back toward the floor. The hum of the chain does not pause. Silence is part of the throughput plan. Who designs a food line that can hold a human pause without punishing the person who needs it?",
      stakeholder: "Plant chaplain and wellness liaison",
      crisisMeters: { local: "Exhaustion", global: "Line Speed", support: "Silence" },
      suggested: ["networks", "ai", "transportation", "vr", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Detroit Receiving Night Floor, Michigan"],
      title: "Twelve-hour hearts running empty",
      scene:
        "Charge nurse Keisha counts badges at shift change and comes up two short again. The board shows a full ICU and a float pool that already said no. She assigns rooms with a pen that has written the same names too many nights. Mid-shift, a new graduate freezes outside a coding room. Last week that nurse lost a patient she had talked down from fear. She still has six hours left. Keisha wants to pull her for a quiet debrief. There is no quiet, and no spare body to cover the bay. Admin tracks overtime and vacancy, not the weight of repeated death. Travel contracts patch holes while permanent staff burn out and leave. The shortage feeds the next shortage. Keisha feels the math in her chest before she feels it on the roster. Who designs night care so the people holding other people’s lives do not empty out unseen?",
      stakeholder: "ICU charge nurse coalition",
      crisisMeters: { local: "Moral Injury", global: "Short Staffing", support: "Turnover" },
      suggested: ["ai", "robots", "networks", "vr", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Phoenix Desert Stack, Arizona"],
      title: "Five stars or the spiral",
      scene:
        "Luis sits in a shaded parking garage at 2 p.m. with the AC off to save charge. His phone buzzes a delivery ping across town. Yesterday a rider left a one-star note for a late bag after an elevator outage. His acceptance score dipped. The app thinned his orders by morning. He belongs to a mutual-aid chat that spots members cash for tires and bad weeks. Tonight the chat is quiet because everyone is chasing dinner surges. Platforms rank workers in public and hide the rules that cut hours. There is no sick leave when anxiety spikes after a threat in a driveway. Luis accepts the ping with a dry mouth. Rent does not care about his rating. The score is the leash that keeps him moving while his nerves fray. Who designs gig work so a bad day does not become a trap with no off-ramp?",
      stakeholder: "Gig worker mutual-aid organizer",
      crisisMeters: { local: "Burnout", global: "Rating Fear", support: "No Safety Net" },
      suggested: ["ai", "networks", "transportation", "computing", "solar"],
      visionTheme: "social-city",
    }
  ],

  alzheimer: [
    {
      places: ["Prairie View Senior Cottages, Grand Island"],
      title: "Dusk walks past the grain bins",
      scene:
        "Ruth locks the cottage office at 6:40 and still sees Harold’s empty chair on the porch. The gravel path toward the grain bins is already dim. She finds him two blocks out, coat open, naming the old elevator as if the crew still worked the night shift. He does not fight her. He just does not know the way home.\n\nBy the time she steers him back, the volunteer check sheet is a half hour late. Three other doors still need a knock. The township runs on neighbor goodwill and a paper roster Ruth prints each Monday. Kids moved to Lincoln and Omaha years ago. Phone trees stall when someone is on a harvest run or a double shift at the packing plant.\n\nWandering is not a rare scare here. It is the hour after supper, when light drops fast across flat ground and memory loosens its grip on street names. Families live too far to cover every dusk. The cottages were built for independent living, not for continuous watch. Late checks pile up because the same six volunteers cover twelve units and a county road that feels longer after dark.\n\nHarold’s daughter will hear about tonight tomorrow. Ruth will hear the catch in her voice. Who redesigns rural watch so a man can walk at dusk without vanishing into the bins—and without burning out the last neighbor willing to look?",
      stakeholder: "Ruth, township volunteer coordinator",
      crisisMeters: { local: "Wandering", global: "Late Checks", support: "Family Distance" },
      suggested: ["iot", "ai", "networks", "drones", "transportation", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Harbor Lights Tower, Seattle"],
      title: "Three floors, one night aide",
      scene:
        "Kenji rides the slow elevator to twelve with a printed med list and a key ring that jingles too loud in the hallway. Mrs. Park’s door is ajar. Her evening pills sit untouched beside a cold cup of tea. The night aide is still on nine, answering a fall alarm that turned out to be a dropped remote.\n\nOne licensed aide covers three floors after eight. The building sold independent living with a light care add-on. Dementia arrived faster than the staffing model. Families on video calls see tidy lobbies. They do not see the gap between scheduled rounds and the moment a resident forgets what the blister pack is for.\n\nKenji knocks gently and waits. Last month a well-meant sensor pilot died in committee. Residents feared constant watching. Adult children wanted proof someone would notice a missed dose. Trust split along that line. Without trust, tools stay in boxes. Without tools, the aide keeps running stairs while meds go cold on nightstands.\n\nMrs. Park knows Kenji’s face tonight. Tomorrow she may not. He is resident council, not clinical staff, yet he is the one holding the list. How do you design night care in a tower so dignity and safety share the same round—without asking one exhausted aide to be everywhere at once?",
      stakeholder: "Kenji, resident council president",
      crisisMeters: { local: "Missed Meds", global: "Thin Staffing", support: "Trust Gap" },
      suggested: ["robots", "iot", "ai", "networks", "vr", "battery"],
      visionTheme: "care-city",
    },
    {
      places: ["Ironbound Walk-In Row, Youngstown"],
      title: "After the midnight caregiving shift",
      scene:
        "Angela unlocks the free clinic at 7:10 with coffee that has already gone bitter. Marcus is first in line. He spent the night on a recliner beside his father, who no longer sleeps more than ninety minutes at a stretch. Marcus’s badge still says mill maintenance. The mill is a shell. The night shift is unpaid and endless.\n\nShe wants twenty quiet minutes for a cognitive screen. The waiting room fills with coughs, work forms, and a neighbor who needs wound care before a job interview. Cognitive checks slide to “next time.” Next time is often an ER bay after a stove fire or a police wellness call.\n\nThis block keeps producing crisis moves because early change has nowhere cheap to land. Adult children juggle gig hours and overnight sitting. Primary care slots are months out. The clinic catches whoever walks in after the worst night, not before. Exhaustion is the local fuel. Missed screens are the habit the system teaches.\n\nMarcus asks if forgetting names means the disease has already won. Angela has no clean answer and a full schedule by eight. Who builds detection into the hours caregivers already live—so a tired son is not the last sensor before a household breaks?",
      stakeholder: "Angela, free-clinic nurse practitioner",
      crisisMeters: { local: "Exhaustion", global: "Missed Screens", support: "Crisis Moves" },
      suggested: ["ai", "networks", "transportation", "computing", "iot", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Little Mekong Courtyard, Fresno"],
      title: "Prayers between bus transfers",
      scene:
        "Sothea meets Auntie Vanna under the courtyard shade after the temple service. Vanna’s hands worry a prayer bead strand. She missed the clinic again. The cross-town bus needs two transfers. By the second stop she could not name the street on the paper in her purse. A stranger helped her reverse the route home.\n\nThe mutual-aid group keeps a ride list on a whiteboard. Drivers are cousins with day jobs. English forms at the memory clinic feel like walls. Younger relatives translate when they can. Pride keeps many elders from saying the word dementia out loud. Delay is not laziness. It is shame braided with logistics.\n\nTraffic risk is real on those long rides when confusion spikes mid-route. Language barrier turns a simple appointment into a family negotiation. The system that keeps harm moving is ordinary: clinics sited far from the corridor, intake that assumes fluent English and a private car, and a community that protects face until a crisis forces the story into the open.\n\nSothea can arrange one ride. She cannot be every transfer. How do you design memory care access so an elder can reach help without gambling on bus geography—or waiting until shame finally loses to fear?",
      stakeholder: "Sothea, temple mutual-aid lead",
      crisisMeters: { local: "Traffic Risk", global: "Language Barrier", support: "Shame Delay" },
      suggested: ["ai", "networks", "iot", "drones", "vr", "self-driving"],
      visionTheme: "social-city",
    }
  ],

  ageing: [
    {
      places: ["Midtown Home-Care Corridor"],
      title: "Doubles until the body breaks",
      scene:
        "Rosa tapes a fresh route sheet to the co-op board at 5:40 a.m. Twelve names. Yesterday it was ten. Mrs. Chen still needs a full wash and a safe transfer into the chair before dialysis transport. Mr. Okonkwo’s son canceled the morning slot again. Rosa’s right shoulder already burns from last week’s lifts. The tablet pings twice more: hospital discharge wants two new age-in-place intakes on the same corridor today. The city and the agencies pay per completed visit, not per careful minute. Families cannot buy live-in help, so beds empty faster and the route densifies. Rosa doubles a hoist with a coworker who has her own list waiting in the stairwell. Someone will miss a med pass before noon. The cooperative can refuse the new clients and lose the contract corridor—or keep accepting longer lives that outlast the backs that carry them. Who redesigns home care so added years do not break the people who show up at dawn?",
      stakeholder: "Home-care workers cooperative steward",
      crisisMeters: { local: "Body strain", global: "Shift load", support: "Worker gaps" },
      suggested: ["ai", "robots", "iot", "networks", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Brickfields Elder Yards"],
      title: "Kilns that outlast bones",
      scene:
        "Kamal crouches to check the wet molds before the sun clears the shed roof. He is fifty-eight. His knees crack on the way down. The kiln boss wants another firing before noon. Piece rates only count finished bricks stacked and stamped. Younger haulers left for warehouse shifts across the ring road. The yard still runs the same stoop, twist, and haul cycle that wore out Kamal’s father. Heat rolls off the open mouth of the kiln. By midmorning his wrists swell and the tally man marks a short load. Ice packs sit in the health shed beside a posture poster no one has time to read. The line treats ageing muscle as a private failure instead of a design input. Kamal can push the pace and risk a fall into the clay trench—or step off and lose the wage that still covers his mother’s medicine. What does a yard invent when the kilns outlast the bones that feed them?",
      stakeholder: "Yard occupational health lead",
      crisisMeters: { local: "Joint pain", global: "Kiln heat", support: "Lost wages" },
      suggested: ["materials", "robots", "iot", "ai", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Sunstack Senior Towers"],
      title: "Upper floors without cool air",
      scene:
        "Mei rides the slow elevator to the twenty-third floor with a bag of frozen bottles wrapped in a towel. The upper corridor still holds yesterday’s heat. Mr. Ruiz left his door on the latch; he slept in the chair by the window because the bedroom felt like a closed oven. The building’s chillers shed load when the peak tariff hits. Management meters common cooling by the riser. Bills climb on fixed pensions, so many tenants shut their window units after the second notice and wait for evening. Mei knocks three doors every afternoon. Two stay quiet until she knocks harder. Alone hours stack with the heat. The tenant association can fight for a backup plant that still serves the top floors last—or keep watching neighbors choose between grocery money and one cool hour. Who designs power and presence for the floors where ageing meets the afternoon sun?",
      stakeholder: "Tenant association chair",
      crisisMeters: { local: "Heat stress", global: "Power bills", support: "Alone hours" },
      suggested: ["solar", "battery", "iot", "ai", "networks", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["River Gate Wholesale Market"],
      title: "Dawn stalls without successors",
      scene:
        "Before first light Lata unlocks her stall at River Gate and hauls the first crate of bitter gourd onto wet concrete. She is sixty-one. Her hip catches on the twist. The auction bell rings in forty minutes. Buyers only respect stacks that look full and early. Her nephew took a delivery-app job across town. The guild’s list of young hands is empty this season. Market rules still favor the vendor who stands from 3 a.m. and lifts without help—the same pattern that built these stalls and now leaves them without successors. Last month’s fall cost her two market days and a week of pain she did not write down. Thin help means she either slows and loses the regular chefs or keeps the dawn grind until the next slip. What does a food gate redesign when longer working lives meet a market that never learned to pass the crate?",
      stakeholder: "Market vendors guild secretary",
      crisisMeters: { local: "Falls", global: "Dawn grind", support: "Thin help" },
      suggested: ["robots", "iot", "ai", "print3d", "transportation", "gene-sequencing"],
      visionTheme: "food-city",
    }
  ],

  water: [
    {
      places: ["Canal Ward"],
      title: "Standpipes sputter brown in Canal Ward",
      scene:
        "Mira opens the standpipe at first light and the water comes the color of weak tea. Children already hold plastic jugs in a crooked line. She lets the first rush run into the gutter, then fills a clear bottle and holds it to the sky. The cloud does not clear.\n\nBy midmorning the pressure drops to a trickle. Two blocks over, a contractor’s pump still feeds a new mid-rise shell. The main that serves the ward was laid for a smaller load. Every dry season, builders tap upstream first. Repair crews log the leaks, then wait on parts that sit in a yard across town.\n\nMira’s nephew misses school again with stomach cramps. She keeps a chalk tally on the committee board: sick days, broken joints, days since the last flush. The board does not move the valve schedule.\n\nWho designs the pipe and the queue so clean water reaches the jug before it reaches the crane?",
      stakeholder: "Mira, standpipe committee lead",
      crisisMeters: { local: "Sick Days", global: "Pipe Failures", support: "Repair Delay" },
      suggested: ["iot", "materials", "nano", "ai", "solar", "battery", "networks", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Paddy Step Wells"],
      title: "Green film coats the Paddy Step Wells",
      scene:
        "Sita kneels on the third step and skims a green film into a tin cup. The well that waters the lower paddies smells sweet and wrong. She tips the cup. Algae clings to the rim.\n\nUpstream growers opened the fertilizer bags early after a short rain. Runoff found the old stone channels before the soil could hold it. The wells are shared, but the field calendar is not. Each keeper guards their own turn at the sluice.\n\nBy noon a neighbor’s child is home with diarrhea. Sita’s phone fills with messages about who dirtied the steps. No one wants to cut the next nitrogen pass. The crop still has to pay the loan.\n\nHow do you keep the well drinkable when the same water must feed the grain that feeds the village?",
      stakeholder: "Sita, growers’ water keeper",
      crisisMeters: { local: "Tummy Bugs", global: "Field Runoff", support: "Well Fights" },
      suggested: ["iot", "drones", "ai", "materials", "nano", "solar", "gene-sequencing", "space"],
      visionTheme: "food-city",
    },
    {
      places: ["Night Clinic Bore"],
      title: "Boil orders never lift at Night Clinic Bore",
      scene:
        "Dr. Elias scrubs for a late suture and the tap coughs air before it spits. The boil order on the wall is three weeks old. He still uses bottled water to rinse instruments when the sterilizer cycle finishes.\n\nBehind the clinic, the bore sits twenty meters from a cracked septic line the landlord will not open. After heavy rain the lab strips show coliform spikes. The night shift keeps working. Patients still arrive with wounds that cannot wait for a clean truck.\n\nA mother on the bench pays for two crates of sealed jugs she cannot really afford. Elias charts another ward infection he cannot prove came from the tap. He only knows the pattern returns every wet week.\n\nWhat does care design when the clinic’s own water keeps writing the next chart?",
      stakeholder: "Dr. Elias, night-shift clinician",
      crisisMeters: { local: "Ward Infections", global: "Septic Seep", support: "Bottle Bills" },
      suggested: ["iot", "materials", "nano", "solar", "battery", "robots", "ai", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["Guest Pier"],
      title: "Guest pools win, alley taps lose at Guest Pier",
      scene:
        "Noor climbs the cistern ladder before sunrise and knocks the tank wall. The echo is hollow. In the alley below, neighbors already set buckets under a dry tap. Across the seawall, a hotel fountain still runs for empty lounge chairs.\n\nThe pier’s wells answer the guest meters first. Contracts guarantee pressure to the pools and laundry towers. When the aquifer drops, the alley line is valved down without a public notice. Noor’s logbook shows the same cut every high season.\n\nHer cousin waits two hours for a jerry can, then walks to a kiosk that charges by the liter. Thirst becomes a line and a fee. The hotels keep posting full occupancy.\n\nWho sets the share when tourist water and household water pull from the same thin lens under the pier?",
      stakeholder: "Noor, alley cistern steward",
      crisisMeters: { local: "Thirst Lines", global: "Well Overdraw", support: "Guest Priority" },
      suggested: ["iot", "solar", "battery", "materials", "nano", "ai", "tidal", "networks"],
      visionTheme: "coastal-city",
    }
  ],

  air: [
    {
      places: ["Tidegate Fishing Quays"],
      title: "Bunker smoke on wash day",
      scene:
        "Nurse Amara hangs the clinic linen on the quay line at first light. Salt wind should clear the cloth. Instead the bunker plume from a reefer ship at Berth 4 lays a gray film across the sheets before they dry. Children from the fisher co-op rub their eyes on the way to school and cough into their sleeves. The dock clinic’s peak hour starts early on wash day. The port still sells cheap residual fuel to vessels that idle cold storage while they wait for ice and buyers. Shore power exists on paper at the new pier, yet the older berths meter only light loads, so captains keep auxiliary stacks running through the morning auction. Amara wipes grit from a toddler’s lashes and marks another red eye in the log. The co-op needs the ships. The ships need cold holds. The air on wash day keeps scoring the same bodies. Who redesigns berth power so catch stays cold without teaching children to breathe smoke?",
      stakeholder: "Dock clinic nurses and fisher-family co-op",
      crisisMeters: { local: "Burning eyes", global: "Ship smoke", support: "Berth power" },
      suggested: ["iot", "ai", "solar", "battery", "energy", "networks", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Ring Road School Corridor"],
      title: "Recess under the flyover",
      scene:
        "Coach Rina blows the whistle for outdoor stretch under the flyover because the yard is the only shade at noon. Diesel from the ring-road climb hits the fence line in waves. Two students sit out with tight chests before the second lap. The parent-teacher air watch pins a cheap sensor to the back gate and watches the number jump each time a loaded truck downshifts on the grade. Fleet rules still push heavy goods through this corridor at school hours; the bypass toll is higher, and dispatchers keep the old climb to save a turn. Bus crews idle at the gate for pickup, adding their own plume to the recess air. Rina moves practice behind the library wall, then loses the space when rain turns the strip to mud. One more week of spikes and the watch will cancel outdoor games for the term. A child who needs the run sits with an inhaler in a stairwell. Who reshapes corridor timing and power so recess is not a choice between heat, mud, and truck exhaust?",
      stakeholder: "Parent-teacher air watch and corridor bus crews",
      crisisMeters: { local: "Sick days", global: "Truck exhaust", support: "Fleet rules" },
      suggested: ["transportation", "iot", "ai", "battery", "solar", "networks", "computing", "drones"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal-Side Scrap Lanes"],
      title: "Evening fires in the lane",
      scene:
        "Meena sorts copper from plastic sheathing on a tarp while her neighbor’s baby wakes with a dry cough. Evening is burn time in the canal-side scrap lanes. What will not sell by weight goes into drums when dump fees climb and the licensed tip turns loads away after dark. The cooperative tried a shared cart to the far transfer station. The cart waits on parts, and the fee window closes before the last haul. Midwives on the block wipe grit from infant noses and count nights when the lane smells like melted wire. Pickers still need the metal money by morning. Landlords padlock the empty lot that once held sorted bales. Flame is the leftover ledger. Meena covers the baby’s face with a damp cloth and keeps stripping cable because dawn buyers pay cash. Who builds a materials path that pays the lane without turning supper air into smoke?",
      stakeholder: "Waste-picker cooperative and community midwives",
      crisisMeters: { local: "Baby cough", global: "Waste fires", support: "Dump fees" },
      suggested: ["materials", "iot", "ai", "solar", "battery", "robots", "print3d", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Riverside Dye Cluster"],
      title: "Colored fog at shift change",
      scene:
        "At shift change, boarding-house auntie Kamala meets the garment line at the alley tap with wet towels for faces. The dye cluster’s small boilers vent a colored fog that hangs low when the river breeze dies. Workers taste metal on the walk home and press fists to their sternums before supper. The health circle logs chest pain on piece-rate weeks, when shops fire extra batches to hit export cutoffs and skip the slower clean burn. Owners say scrubbers stall the drum cycle. Buyers still pay by the finished kilo, not by the hour the stack runs dirty. Kamala boils ginger for the women who wheeze on the stairs and keeps a spare cot for anyone who cannot climb. One young cutter misses a morning and loses her lot of sleeves. The fog returns with the next rush order. Who redesigns heat and incentives so color leaves the cloth without painting the alley air at quitting time?",
      stakeholder: "Garment workers’ health circle and boarding-house aunties",
      crisisMeters: { local: "Chest pain", global: "Boiler smoke", support: "Piece rates" },
      suggested: ["energy", "solar", "battery", "iot", "ai", "materials", "nano", "networks"],
      visionTheme: "care-city",
    }
  ],

  "energy-access": [
    {
      places: ["Ulaanbaatar Ger District Lanes"],
      title: "Coal smoke fills the gap the grid left",
      scene:
        "Before dawn, Bayarmaa lifts the stove lid in her felt ger and feeds another brick of raw coal. The flame catches. Smoke slides under the door flap into the frozen lane. Her youngest starts the dry cough that has not left since November. Along the dirt tracks, a hundred other stoves do the same thing at the same hour. The central grid stops at the paved edge of the formal city. Plot papers here are temporary, so the utility will not string legal lines. Coal trucks still roll in on credit from the same depot that supplies the power plants. Families buy what burns, not what is clean. Bayarmaa runs the lane health notebook. She marks another nosebleed, another missed school morning, another father who cannot climb the construction scaffold because his chest is tight. The volunteer kit has masks and saline. It does not have watts. If winter keeps outrunning the wires, who designs heat that does not trade a child’s lungs for a warm floor?",
      stakeholder: "Ger district health volunteer lead",
      crisisMeters: { local: "Cough nights", global: "Coal smoke", support: "Plot rights" },
      suggested: ["solar", "battery", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Camotes Island Rice Co-op Wharf"],
      title: "Harvest waits while the genset coughs",
      scene:
        "Rosa counts the sacks stacked under the wharf awning and listens for the genset. It coughs, catches, then dies again. The dryer drum stops mid-turn. Grain that left the paddies at dawn now sits damp in the coastal heat. By tomorrow the smell will turn. The co-op’s diesel allotment arrived short this month. The barge schedule slipped, and the town pump took first claim on what fuel remains. Members still pay school fees from the milled weight. Every spoiled sack is a fee unpaid. Rosa walks the line of waiting farmers and writes numbers she does not want to keep. The island grid flickers too often to run the dryer on mains. So the co-op rents a machine that only lives when the drum of fuel does. No one is idle. Everyone is waiting on combustion they do not control. How do you power a harvest clock when the fuel boat is also the school calendar?",
      stakeholder: "Rice co-op chair",
      crisisMeters: { local: "Spoiled grain", global: "Diesel waits", support: "School fees" },
      suggested: ["solar", "battery", "wind", "iot", "networks", "energy"],
      visionTheme: "food-city",
    },
    {
      places: ["Humla Trailhead Health Post"],
      title: "The sterilizer sleeps through the night shift",
      scene:
        "Dolma boils water on a single burner and watches the autoclave gauge stay dead. The night birth is coming fast on the trail above the post. She needs sterile clamps before midnight. The fuel porter who should have arrived at noon is still somewhere on the switchbacks. Snow took the morning path. The district budget pays porters by the kilo of diesel and kerosene, not by the hour a life arrives. Solar panels on the roof charged a small bank for lights and the radio. The sterilizer was never on that circuit. It was sized for a generator that only runs when fuel does. A junior midwife holds a flashlight in her teeth and lays out the last clean kit. After this, they boil and hope. Dolma has already covered two shifts because the last nurse transferred to a road-connected clinic. One more dark delivery and she will have to choose which rule to break. Who builds clinic power for the ridge when the supply chain still walks?",
      stakeholder: "District midwife supervisor",
      crisisMeters: { local: "Dark births", global: "Fuel porters", support: "Staff burnout" },
      suggested: ["solar", "battery", "drones", "networks", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Makoko Lagoon Stilt Blocks"],
      title: "Light sold by the hour on the lagoon",
      scene:
        "Chinedu unhooks the prepaid cable from the classroom beam when the metered hour ends. The bulbs die over sixteen students still copying lessons into damp notebooks. Across the boardwalk, a generator boat idles and sells extension cords by the evening. Families who can pay stay lit. The teachers’ collective cannot float that rate for every desk. The formal utility treats the stilt blocks as temporary water. There is no clean title for a transformer. So power arrives as a favor, a fee, or a favor that becomes a fee. Parents knock on Chinedu’s door asking why their children study by phone glow while the next block hums. Trust frays between households who share walkways but not tariffs. He has a ledger of who chipped in for fuel and who could not. The ledger is becoming a map of who gets a future after dark. When light is retailed by the hour on water with no deed, who designs a share that does not split the lagoon?",
      stakeholder: "Lagoon teachers' collective secretary",
      crisisMeters: { local: "Dark study", global: "Wire fees", support: "Trust gap" },
      suggested: ["solar", "battery", "iot", "crypto", "networks", "ai"],
      visionTheme: "social-city",
    }
  ],

  homeless: [
    {
      places: ["Sunbelt Weekly Inn strip, Mesa corridors"],
      title: "Noon checkout into a furnace lot",
      scene:
        "Marisol knocks on room 12 at 11:40 a.m. with a cold pack and a bus pass. The family inside has until noon. Outside, the asphalt already shimmers. The youngest boy sits on a suitcase in the shade of a dead palm, cheeks flushed, waiting for a van that may not come.\n\nThe front desk will not extend another night. Corporate sets a hard turnover clock so the same rooms can be sold again by evening to travelers and contractors. Marisol’s voucher only covers nights already approved. New nights need a fresh form, a fresh signature, and a wait that runs past the heat of the day.\n\nShe works the phone in the lot while the mother wipes sweat from the baby’s neck. Case notes live in three systems that do not talk. Beds open and close by the hour across a strip of weeklies that treat families as short-stay inventory. The lot becomes the waiting room. Shade is a moving target.\n\nBy one o’clock the boy’s breathing turns shallow. Heat illness is not a metaphor here. It is a child on hot pavement because checkout is noon and housing is a revolving door of nightly rates.\n\nWho designs the next hours so a family is not discharged into a furnace while the paperwork catches up?",
      stakeholder: "Marisol, motel outreach caseworker",
      crisisMeters: { local: "Heat illness", global: "Room churn", support: "Case backlog" },
      suggested: ["ai", "networks", "iot", "solar", "battery", "materials", "print3d", "transportation"],
      visionTheme: "care-city",
    },
    {
      places: ["Riverbend Family Justice annex"],
      title: "Thirty safe nights, then the courthouse lot",
      scene:
        "Keisha walks Lena and the two kids from the annex door to a gray sedan with a duffel and a folder of court papers. Thirty nights in the confidential shelter end at midnight. The protection order is real. The next address is not.\n\nThe emergency voucher lists hotels that still reject anyone without a credit card on file. Lena’s card was cut when she left. The shelter bed turns over on a fixed clock so the next family can enter. Keisha has already called four front desks. Two hang up when they hear the program name.\n\nRules meant to stretch scarce aid keep producing the same gap. Thirty nights, then proof of income, then a waitlist for longer housing that does not open before the order’s first hearing. The courthouse lot becomes the fallback. Lena will sleep in the car with the doors locked and the kids under a blanket if nothing clears by dark.\n\nTrust frays in the passenger seat. Lena asks whether telling the full story at intake is what closed doors later. Keisha has no clean answer that fits the form.\n\nWho designs safe continuity when the clock on shelter and the clock on justice never match?",
      stakeholder: "Keisha, domestic-violence housing advocate",
      crisisMeters: { local: "Unsafe nights", global: "Voucher rules", support: "Credit blocks" },
      suggested: ["ai", "networks", "computing", "crypto", "vr", "transportation", "iot", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Palm Court senior trailer park"],
      title: "Sold out from under the fixed check",
      scene:
        "Harold pins a notice to the clubhouse board with hands that still shake from the morning meeting. The park has a new owner. Lot rent jumps in sixty days. His trailer is paid off. The ground under it is not.\n\nNeighbors gather with coffee and calculators. Social Security does not stretch to the new number. Moving a double-wide costs more than most of them will see in a year. The buyer’s letter talks about redevelopment and a future of permanent homes none of them can buy.\n\nHarold sits on the park board and knows the mechanism by name now. Land under aging parks trades as an asset while the homes stay personal property. Rent can rise faster than a fixed check. When enough residents leave, the rest lose the quorum that once slowed bad deals. Empty pads make the sale cleaner for the next flip.\n\nHis neighbor Ruth asks where she is supposed to plug in her oxygen concentrator if the lot goes dark. Harold has a toolbox and a title to a box on wheels. He does not have the land.\n\nWho designs tenure so a paid-off home on rented ground does not become a ticket out?",
      stakeholder: "Harold, retired machinist and park board member",
      crisisMeters: { local: "Displacement", global: "Lot rent", support: "Fixed checks" },
      suggested: ["ai", "networks", "computing", "materials", "print3d", "solar", "battery", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["County General ambulance bay curb"],
      title: "Discharged still weak to the ambulance bay",
      scene:
        "Dr. Nadim signs the discharge at 2:15 a.m. and walks Marcus to the automatic doors with a paper bag of meds and a list of wound-care steps. Marcus still needs a clean place to elevate his leg. The inpatient bed is already promised to the next admission in the hallway.\n\nThe respite wing is full. Taxi vouchers ended at midnight. Marcus’s name sits on a shelter list that does not hold medical holds after three no-shows caused by earlier hospital stays. Billing has already coded him stable enough to leave. Stable on paper is not stable on concrete.\n\nNadim has watched this loop for years. Hospitals empty beds under occupancy pressure. Street and shelter systems treat post-acute recovery as someone else’s lane. Without a bridge bed, the ambulance bay curb becomes the step-down unit. Infection risk climbs. The same patient returns sicker, and the debt notice arrives before the wound closes.\n\nMarcus asks if he can sit in the waiting room until dawn. Security has orders. Nadim stands with him under the bay light and feels the design failure in his own signature.\n\nWho designs the hours after discharge so healing is not an eviction into the night?",
      stakeholder: "Dr. Nadim, ER attending and respite organizer",
      crisisMeters: { local: "Street nights", global: "Bed pressure", support: "Med debt" },
      suggested: ["ai", "networks", "computing", "transportation", "iot", "drones", "solar", "battery"],
      visionTheme: "care-city",
    }
  ],

  cities: [
    {
      places: ["Ahmedabad Textile Lane Roofs"],
      title: "Tin roofs that still cook after dark",
      scene:
        "At 9:40 p.m., Meena climbs the ladder to the lane roof with a wet cloth and a bottle of ORS. Her father still coughs on the cot below. The tin holds the day’s heat like a skillet. Fans on the floor stall when the shared meter trips. She wrings the cloth over his wrists and watches the thermometer stick above the safe line.\n\nThe ward heat desk can issue cool-roof paint and a shade net, but only if the landlord signs. He meters power by the room and bills the extra load as “commercial.” The wiring was laid for looms and bulbs, not for night cooling on sleeping floors. Every summer the same pattern returns: hardscape expands, green strips shrink, and the lane traps heat after dark.\n\nMeena misses another morning shift when her father’s fever spikes again. Lost wages stack beside the clinic slips. The desk has a short list of roofs and a long list of rooms that still cook. Who designs the lane’s night so a body can rest without begging the meter?",
      stakeholder: "Ward heat-health and housing desk",
      crisisMeters: { local: "Heat Nights", global: "Hardscape", support: "Sick Days" },
      suggested: ["solar", "materials", "iot", "ai", "battery", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Manila Estero de Vitas Pocket"],
      title: "The estero that became the alley dump",
      scene:
        "Before dawn, Liza pushes a bamboo pole under the footbridge and feels the plastic bag catch. Water should slide past the stilts. It does not. Last night’s rain sits in the alley like a black pond. Her ground-floor room takes the smell first. The baby’s mat is already damp.\n\nThe barangay truck came twice this week and left half-full. Upstream tenants bag kitchen waste and drop it at the bend because the formal bin is locked after shift change. Landlords raise rent when a cleanup crew appears, then look away when the channel clogs again. The estero is both drain and dump. Every high tide pushes the mess back into doorways.\n\nLiza lifts the mat and finds mold on the underside. She will miss another laundry day if the water does not fall by noon. The council can map the choke points. It cannot yet say who owns the habit that keeps filling them. What would make the waterway worth more clear than convenient to foul?",
      stakeholder: "Barangay waterway and solid-waste council",
      crisisMeters: { local: "Flooding", global: "Trash Backup", support: "Tenant Squeeze" },
      suggested: ["drones", "iot", "materials", "robots", "ai", "transportation"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Bogotá Soacha Ridge Stops"],
      title: "Three hours down the ridge for a shift",
      scene:
        "Andrés reaches the dirt platform at 4:55 a.m. with his kitchen whites folded in a bag. The feeder van is already full. The next one is a rumor written on a chalkboard. Below the ridge, the trunk bus keeps a clock he cannot meet if he waits. He starts walking the first switchbacks in the dark.\n\nFares do not integrate across the edge of the formal system. Drivers skip the upper stops when fuel runs thin or when a checkpoint slows the loop. New housing climbed the slope faster than the route map. The office can add a pin on a screen. It cannot put a seat where the road narrows to one lane of mud.\n\nAndrés clocks in late and loses the breakfast premium. Again. His sister will cover the shortfall this week, then ask him to cover hers. The hillside keeps growing. The feeder keeps thinning. Who designs the first and last hour so a shift on the plain does not cost a night on the ridge?",
      stakeholder: "Hillside feeder and fare-integration office",
      crisisMeters: { local: "Commute Hours", global: "Feeder Gaps", support: "Lost Wages" },
      suggested: ["transportation", "ai", "networks", "battery", "solar", "self-driving"],
      visionTheme: "social-city",
    },
    {
      places: ["Nairobi Mathare Ridge Schools"],
      title: "Lessons under the zinc sheets",
      scene:
        "Teacher Amina chalks the date on a board that leans against a zinc wall. Forty-two learners share space built for twenty-eight. Rain ticks on the roof and drowns the back row. When the morning glare hits the metal, the room becomes a low oven. Two girls at the edge copy from a phone screen because the textbook set never arrived.\n\nThe plot under the school sits on a handshake lease. A broker walked the path last month with a measuring tape and a buyer from outside the ridge. County papers list the site as temporary public use. Temporary has lasted nine years. Each rumor of a flip thins attendance. Parents pull older children into piecework before a locked gate makes the choice for them.\n\nAmina marks three empty desks by midweek. She knows those names. The county unit can send a digital lesson pack. It cannot hold the ground when land price outruns a classroom. What keeps a ridge school standing when the soil under it is the real curriculum?",
      stakeholder: "County basic-education and public-land unit",
      crisisMeters: { local: "Crowded Rooms", global: "Plot Flip", support: "Dropouts" },
      suggested: ["networks", "vr", "solar", "print3d", "iot", "ai"],
      visionTheme: "learn-city",
    }
  ],

  child: [
    {
      places: ["El Alto compound kitchens, La Paz highlands"],
      title: "Night smoke steals small breaths",
      scene:
        "At first light, nurse Mamani presses a cold stethoscope to a three-year-old’s chest in a shared courtyard kitchen. The boy’s ribs pull hard between each breath. His mother has been up since the night burn, fanning a clay stove that still smells of last night’s meal. The gas canister ran out midweek. The refill price jumped again, so the household switched back to dung and scrap wood like half the compound. Smoke hangs low under the zinc roof. It has nowhere clean to go. Children sleep on the same floor where the pots sit. By morning the smallest ones wake with tight chests and gray rings under their eyes. Mamani marks another wheeze on her paper card and knows the clinic nebulizer queue will stretch past noon. Vendors still sell fuel by the door in the only sizes families can buy on a market day. Chimneys were never part of how these rooms were built. Heat for supper and heat for the child’s lungs are the same fire. If the stove stays dirty to keep supper cheap, who redesigns highland compound cooking so a night meal does not buy a week of stolen breath?",
      stakeholder: "Highland community health nurse",
      crisisMeters: { local: "Wheezing", global: "Cook smoke", support: "Fuel cost" },
      suggested: ["solar", "battery", "materials", "iot", "ai", "networks", "energy", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cebu canal-edge daycare, Visayas waterfront"],
      title: "Trash gutters breed the fever",
      scene:
        "Coordinator Reyes counts heads at the canal-edge daycare and stops at the empty mat by the window. Little Jun did not come. His aunt texts a photo of a thermometer and a limp child on a plastic chair. Overnight rain left the gutter behind the building full again. Plastic bags and fruit peels slow the drain until the water sits black and still. Mosquitoes rise from that water before the morning bell. Reyes sweeps larvae from a bucket by the wash corner and knows the same water will return with the next tide of street trash. Collection crews skip the narrow lane when trucks cannot turn. Shop owners push waste toward the canal because the dump fee hits harder than a fine they never see enforced. Parents miss shifts when fever keeps a child home. The daycare loses fees and trust in the same week. Reyes can boil drinking water and hang nets. She cannot stop the gutter from becoming a nursery. Who redesigns the waste-and-water loop at this canal edge so a daycare morning is not a roll call of preventable fever?",
      stakeholder: "Barangay child-health coordinator",
      crisisMeters: { local: "Child fever", global: "Standing water", support: "Missed work" },
      suggested: ["iot", "drones", "ai", "networks", "materials", "solar", "space", "robots"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Kano grain-market under-fives post, northern Nigeria"],
      title: "Spoiled millet on the growth chart",
      scene:
        "Officer Bello unrolls the growth chart and finds the red ink already waiting. Amina’s weight has slipped two marks since the last market week. Her grandmother sets a small bowl of thin millet porridge on the bench and will not meet his eyes. The sack she bought looked sound at the stall. At home the grain turned sour in the heat, weevils threading the middle where no one checks before the sale. Traders along the row still stack bags on bare ground after long truck hauls with no cool shade and no sealed liners. When a buyer complains, the next stall shrugs and sells the same stock under a new scoop. Bello can hand out micronutrient sachets. He cannot make a mother trust the grain that fills the child’s bowl. Amina tires before noon and stops playing with the other under-fives. The chart does not lie. Spoilage is not an accident here. It is how wet-season bulk moves when speed beats care. Who redesigns the path from truck to bowl so a growth chart stops recording preventable hunger in this market?",
      stakeholder: "Nutrition surveillance officer",
      crisisMeters: { local: "Thin arms", global: "Spoiled grain", support: "Market trust" },
      suggested: ["gene-sequencing", "iot", "ai", "solar", "networks", "drones", "materials", "synbio"],
      visionTheme: "food-city",
    },
    {
      places: ["Old Fadama scrap-yard edge clinic, Accra"],
      title: "Battery dust on the play sand",
      scene:
        "Dr. Mensah wipes gray grit from a toddler’s palms before she can take a blood spot. The child has been playing in the sand strip between the clinic wall and the scrap lane. Breakers open lead-acid batteries with hammers a few doors down. Dust lifts when the wind turns. It settles on laundry lines, on cooking pots, on the same sand where children dig. Fathers and older brothers earn the week’s cash from that pile. Closing a yard without another wage is a sentence the block will not accept. Mensah’s growth cards show children who gain height too slowly and tire too fast. Chelation is a city-hospital hope, not a Tuesday option here. She can wash hands and preach wet mopping. She cannot stop the next truck of dead batteries from paying better than clean work. The clinic sits where the scrap economy meets the play space. Who redesigns recovery at this yard edge so a child’s sand is not a paycheck written in lead?",
      stakeholder: "Pediatric environmental health officer",
      crisisMeters: { local: "Slow growth", global: "Lead dust", support: "Scrap jobs" },
      suggested: ["iot", "nano", "materials", "ai", "drones", "networks", "robots", "gene-sequencing"],
      visionTheme: "rebuild-city",
    }
  ],

  maternal: [
    {
      places: ["Solukhumbu trail clinic"],
      title: "Bamboo stretcher at the switchback",
      scene:
        "Pasang steadies the bamboo poles as the litter rounds the last switchback above Namche. The mother on the stretcher has bled through two cloths since the hamlet. The trail clinic’s single delivery room is lit and ready. The road ambulance is not. It waits at the jeep head three hours below, where the gravel ends and the porters begin. Night drops fast on the ridge. The volunteer circle has oxytocin in a cooler and a radio that crackles when the cloud lifts. What they do not have is a way to move a crashing postpartum patient faster than human legs on wet stone. District rules still route emergency vehicles only to motorable points. Birth plans still assume a woman can walk or be carried before the hemorrhage peaks. One more delay and this mother loses the window where simple drugs still work. Who designs the last mile when the map stops and a life does not?",
      stakeholder: "Trail health volunteer circle",
      crisisMeters: { local: "Heavy Bleeding", global: "Road Wait", support: "Staff Gaps" },
      suggested: ["drones", "transportation", "networks", "solar", "battery", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Rakhiyal chawl maternity room"],
      title: "Night heat on the birth floor",
      scene:
        "Meena wipes her sister’s brow with a cloth that is already warm. Night holds the day’s heat under the tin roof. Mothers share cots on the birth floor. When the grid dies, fans stop. The sterilizer goes cold. A new mother spikes a fever, and there is no clean way to cool her or keep instruments safe. Landlords still meter power by the room. The wiring was built for lights and phones, not for round-the-clock birth care. Backup never reaches this floor. The women’s health sabha has begged for a dedicated line and been told the chawl is temporary housing on paper. Babies keep arriving in the heat anyway. Who designs power for the hour a life arrives?",
      stakeholder: "Chawl women’s health sabha",
      crisisMeters: { local: "Mother Fever", global: "Power Cuts", support: "Crowding" },
      suggested: ["solar", "battery", "energy", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cerro Alto workers’ maternity desk"],
      title: "Dust in the labor queue",
      scene:
        "Rosa signs the shift log with dust still on her sleeves and takes a seat in the clinic corridor. Her ankles are swollen. The nurse checks her blood pressure twice. The number is high enough to send her up the hill to the hospital. Company policy says a spouse may leave mid-shift only with a supervisor stamp, and the stamp desk closes when the ore trucks roll. Seizure risk does not wait on ore. The mine spouses’ care committee has mapped every near-miss this season: women who stayed on their feet because a missed shift means a docked ration card and a harder month. The clinic fees for off-site referral sit outside the company package. Rosa’s sister lost a baby last year after a delayed transfer. The queue moves one chair at a time. Who designs care hours that match the body, not the pit schedule?",
      stakeholder: "Mine spouses’ care committee",
      crisisMeters: { local: "Seizures", global: "Shift Rules", support: "Clinic Fees" },
      suggested: ["networks", "ai", "transportation", "iot", "computing", "vr", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Mtwapa creek birth shelter"],
      title: "Warm vials at low tide",
      scene:
        "Amina opens the small fridge and feels the air inside. It is only cool, not cold. The oxytocin vials have sat through another afternoon of weak solar and a cloud bank that cut the panels short. Low tide has grounded the creek ferry. The referral hospital is a crossing and a dusty road away. A mother in the shelter is still bleeding after the placenta. The midwife cooperative knows the dose by heart. They also know warm medicine loses its bite. Supply boats follow the tide chart, not the labor chart. Cold-chain funds stop at the mainland depot. So the shelter waits on water height while a preventable hemorrhage writes its own clock. Who designs medicine that stays potent when the creek itself holds the gate?",
      stakeholder: "Creek midwife cooperative",
      crisisMeters: { local: "Bleeding", global: "Warm Medicine", support: "Ferry Delay" },
      suggested: ["solar", "battery", "iot", "drones", "networks", "transportation", "ai"],
      visionTheme: "coastal-city",
    }
  ],

  coord: [
    {
      places: ["Carhuaz–Huaraz valley towns, Cordillera Blanca"],
      title: "Lakes that will not speak together",
      scene:
        "At first light, Rosa marks the new crack in the moraine wall above Laguna Palcacocha with a grease pencil. The radio on her belt stays quiet. Down-valley, Huaraz still waits on a different frequency and a different spreadsheet. Meltwater rose overnight. A sensor buoy she trusts blinks green on her handheld, then the reading dies at the municipal boundary. Carhuaz’s civil-defense desk cannot push the live level into Huaraz’s map without a signed data letter that takes three days. The letter is still on a desk. When the outlet channel jumps, Rosa’s crew has twenty minutes to clear the lower footpath. They clear it for their own ward. The next ward does not get the call in time. A market stall washes sideways. A boy loses the morning’s potatoes and a week of school fees. Each town bought its own gauges after the last scare. Each town meters its own risk so no one else can claim the budget. The lakes keep filling. Who builds the warning that crosses the ridgeline before the water does?",
      stakeholder: "Valley civil-defense coordinators",
      crisisMeters: { local: "Flood damage", global: "Silent gauges", support: "Blame games" },
      suggested: ["iot", "networks", "ai", "space", "drones", "computing", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Delhi–Ghaziabad–Noida work corridors"],
      title: "Three cities, one heat wave",
      scene:
        "By 10 a.m., Meera’s tablet shows three different heat flags for the same stretch of NH-24. Delhi’s desk paints the corridor amber. Ghaziabad stays green. Noida’s labor line has not updated since dawn. A loader named Imran sits on a curb outside a logistics gate, pulse high, water bottle empty. The clinic van she can dispatch only serves the pin code that funds her unit. Across the invisible city line, the same asphalt cooks the same workers. No shared early-warning pot means each metro buys its own SMS blast and guards the contact list. When Imran collapses, the first ambulance is turned back at a jurisdiction argument that lasts longer than his cool-down window. Meera files the incident under her city. The other two never see it. Night shifts keep running on split thresholds while the heat does not respect the map. Who designs the alert that treats one body as one body across three budgets?",
      stakeholder: "Metro public-health and labor desks",
      crisisMeters: { local: "Heat illness", global: "Split alerts", support: "Budget fights" },
      suggested: ["ai", "networks", "iot", "solar", "battery", "computing", "space"],
      visionTheme: "care-city",
    },
    {
      places: ["Saint-Louis to Kayar landing beaches, Senegal"],
      title: "Nets empty, logbooks closed",
      scene:
        "Awa counts seven sacks where last season she counted twenty. The cooperative board wants the morning total for the shared cold room. Skippers from Kayar shrug and close their notebooks. Saint-Louis boats land a few kilometers north and report only to their own landing chief. Industrial trawlers farther out leave no local mark at all. Without a common catch ledger, each beach guesses the stock alone and races the next tide. Awa’s crew works longer nights for thinner pay. Children on the shore wait for fish that do not come. The marine desk in Dakar asks for numbers that never arrive in one file. Trust thins with the nets. A young captain offers a photo of his hold on a private chat, then deletes it when a rival cooperative might see. The sea is one system. The logbooks are many locked rooms. Who designs the proof of catch that crews will share before the grounds go quiet?",
      stakeholder: "Coastal landing cooperatives and marine desks",
      crisisMeters: { local: "Empty nets", global: "Hidden catch", support: "Distrust" },
      suggested: ["iot", "networks", "ai", "space", "drones", "crypto", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Kisumu–Homa Bay lakeshore belt, Lake Victoria"],
      title: "Shore towns, separate water truths",
      scene:
        "Nurse Otieno bags a stool sample from a child with bloody diarrhea and walks it to the clinic fridge. The fridge label says Kisumu only. Homa Bay’s water desk, an hour down the shore, runs its own turbidity logs and does not open the feed to Kisumu’s dashboard. Yesterday’s bloom sat in the same bay both towns drink from. Mothers still fill jerrycans at the same dawn edge. Otieno’s ward fills cots while the neighboring municipality posts “water normal” on a channel his patients never see. Each council bought sensors with project money that ends at the ward line. Sharing raw readings would mean admitting whose intake failed first. Rivalry over tourism grants keeps the files closed. The child needs oral salts now. The next child will need them too if the lake’s signal stays split. Who designs the water truth both shores can act on before the clinic runs out of beds?",
      stakeholder: "Lakeshore municipal water and clinic leads",
      crisisMeters: { local: "Sick days", global: "Data walls", support: "Local rivalry" },
      suggested: ["iot", "gene-sequencing", "networks", "ai", "drones", "computing", "crypto"],
      visionTheme: "care-city",
    }
  ],

  radicalization: [
    {
      places: ["Riverside Mill Row Gate"],
      title: "Layoff notice, new names on the wall",
      scene:
        "Marta folds the pink slip against the mill-row gate before the second shift horn. Paint on the brick is still wet. Someone has added three family names under a crude arrow that points toward the temp housing block. Her steward badge catches the floodlight. Inside the union room, phones light up with the same thirty-second clip. A voice over shaky footage blames “the new hires” for the line shutdown. No one filmed the empty order book. Rent is already late on half the row. Kids eat cereal for dinner while parents refresh group chats that reward the sharpest insult. The old after-shift card games thinned out when overtime died. Mentors clock out and go home tired. A cousin asks Marta which side the stewards are on. She has a stack of counseling vouchers and no answer that pays a bill. The pipeline does not wait for a better story. Who builds a real off-ramp when the notice hits and the wall already has a list?",
      stakeholder: "Mill-row shop stewards and family counselors",
      crisisMeters: { local: "Missed Rent", global: "Blame Clips", support: "Thin Bonds" },
      suggested: ["ai", "networks", "vr", "computing", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Cedar Hollow Parish Hall"],
      title: "Closed clinic, open airwaves",
      scene:
        "Deacon Ruth unlocks the parish hall and counts empty folding chairs. The mobile clinic van will not come this month. Fuel money went to patch the roof. In the lot, a pickup idles with the AM dial locked on a host who names the clinic’s last nurse as proof that “outsiders took the care.” A mother with a feverish toddler waits anyway. She has already been turned away twice at the county desk for missing papers. Volunteers still brew coffee and keep a paper list of who needs insulin rides. The list shrinks when families stop answering unknown numbers. Hate talk fills the hours the exam room used to hold. Trust frays between the longtime pew holders and the newer trailers past the creek. Ruth’s care circle can offer soup and a ride. It cannot reopen a locked exam door. One missed antibiotic becomes a story someone else owns on air. How do you design care that stays open when the microphone is louder than the waiting room?",
      stakeholder: "Parish care circle and mobile clinic volunteers",
      crisisMeters: { local: "Sick Delays", global: "Hate Radio", support: "Closed Doors" },
      suggested: ["networks", "ai", "transportation", "solar", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Line Night Depot"],
      title: "Cut routes, louder break room",
      scene:
        "Jamal racks his punch card at the East Line night depot and hears the argument before he sees it. Two more owl routes died on the board this week. The break room TV loops a clip blaming “soft shifts” and riders from the south lots. No one loops the budget sheet. Drivers split along old crew lines. Someone taped a cartoon over the mutual-aid flyer. The cartoon has a target on it. Exhaustion sits in the shoulders. Spouses text about second jobs. A probationary driver asks who “they” are supposed to be. Jamal’s steward circle still runs ride shares for late parents and keeps a quiet fund for missed child care. The fund cannot staff a cut line. Every canceled trip becomes proof for the loudest voice in the room. A fist hits a locker. The night supervisor looks away. Who designs crew trust when the schedule shrinks and the scapegoat is already drawn?",
      stakeholder: "Transit mutual-aid stewards",
      crisisMeters: { local: "Exhaustion", global: "Scapegoats", support: "Split Crews" },
      suggested: ["ai", "networks", "computing", "crypto", "transportation"],
      visionTheme: "social-city",
    },
    {
      places: ["North Stand Supporters Club"],
      title: "Standing terrace, softer recruiters",
      scene:
        "After the final whistle, Lena locks the supporters’ club kitchen and finds three boys still on the back steps. They are not talking about the match. A private chat pings with calm praise for “standing up” during the terrace shove that spilled into the street. Last month a mentor coach moved cities for work. The Tuesday skills night lost its anchor. Street fear walks home with younger fans who saw the shove and the sirens. Recruiters do not shout. They send match memes, then slower messages about who belongs in the North Stand. Lena’s trust still holds keys, tea, and a battered first-aid kit. She can ban a scarf. She cannot sit in every thread at midnight. One boy laughs too hard at a joke that names a rival school as the enemy. The pipeline sounds like friendship until it does not. Who designs belonging that outruns the soft invite after the lights die on the terrace?",
      stakeholder: "Supporters’ trust youth workers",
      crisisMeters: { local: "Street Fear", global: "Chat Pipeline", support: "Lost Mentors" },
      suggested: ["vr", "networks", "ai", "iot", "computing"],
      visionTheme: "learn-city",
    }
  ],

  fgm: [
    {
      places: ["Abnub marriage-notary row, Minya Governorate"],
      title: "Stamps still bless the cut",
      scene:
        "Nour stands in the notary queue with her daughter’s school ID and a folded marriage file. The clerk’s stamp hangs over the counter like a small verdict. A cousin leans in and says the groom’s family still wants the purity paper before the date is set. Without the cut, the match collapses and the girl’s name travels the lane as trouble. The mothers’ union has already paid for secondary fees and night study lamps. They cannot outrun the stamp. Cutters keep side rooms near the marriage offices. Families pay them first, then bring the quiet proof the notary will accept without questions. Honor rules ride the paperwork. Infections follow the rushed work—fever, urine pain, weeks out of class. One mother loses a week of piecework wages sitting outside a clinic that has no private exam hour for girls. Nour’s daughter asks if the stamp can wait until after exams. The union can shield a child for a season. It cannot redesign who gets to certify a bride. What would make a marriage file open without buying harm first?",
      stakeholder: "Girls' secondary school mothers' union",
      crisisMeters: { local: "Infections", global: "Cutter Fees", support: "Honor Rules" },
      suggested: ["networks", "ai", "crypto", "vr", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Makump grove edge, Tonkolili District"],
      title: "Grove dues open the bush",
      scene:
        "Aminata counts rice sacks at the mutual-aid shed while the society drum starts beyond the mango line. Her niece is twelve. The aunties say the grove fee is due before the rains lock the path. Refuse, and the circle that shares seed and harvest labor goes quiet. Belonging is the wage here. Girls still come back from the bush with wound pain that makes squatting at the mill a trial. Some miss two planting weeks. The dues are not only money. They are the ticket into the women’s labor net that keeps paddies wet and debts small. Cutters and initiators collect before the ceremony and pass a cut of the fee up the society chain. Families who delay lose turn at the shared thresher. Aminata can hide one child for a season behind a sick relative story. She cannot farm alone if the mutual aid turns its back. The rice circle needs hands. The grove still sells membership through the cut. Who redesigns belonging so harvest solidarity does not require a child’s blood?",
      stakeholder: "Women rice growers' mutual-aid circle",
      crisisMeters: { local: "Wound Pain", global: "Society Dues", support: "Belonging Fear" },
      suggested: ["solar", "networks", "ai", "iot", "print3d", "crypto"],
      visionTheme: "food-city",
    },
    {
      places: ["Borama central women’s market lanes, Awdal"],
      title: "Dawn bookings in the women’s lanes",
      scene:
        "Before the spice stalls open, Hawa unlocks the health cooperative kiosk and finds three new names on the cutter’s slate tucked under the tea crate. Dawn is booking hour. Mothers arrange quiet house visits while stock is unloaded. A trader’s daughter labors two stalls down with a tear from an old cut; the midwife says the next birth could tear wider. Birth injury is not abstract in these lanes. It is blood on a plastic sheet behind a curtain. The cutters are not outsiders. They are kin who earn between market days when cloth sales thin. In-laws still demand the practice before a bride moves in, and a refused demand can freeze a young woman’s stall credit. The cooperative can stock clean pads and teach danger signs. It cannot yet replace the income line that keeps the dawn slate full. Hawa’s own niece is on a waiting list she did not write. One hard season of low sales and the bookings rise. Care after the harm is not the same as stopping the order book. What builds a market where a woman’s credit and a girl’s body are not priced on the same dawn list?",
      stakeholder: "Market traders' health cooperative",
      crisisMeters: { local: "Birth Injury", global: "Cutter Income", support: "In-Law Demand" },
      suggested: ["ai", "networks", "solar", "battery", "computing", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Ranya foothill wedding courtyards, Sulaymaniyah Governorate"],
      title: "Elders still name the pure bride",
      scene:
        "Sara erases the board after last period and hears drums from a courtyard below the school ridge. An elder is naming the pure bride again. Girls in her class go quiet when the word purity enters the lesson on civic rights. One student shifts on the bench every few minutes; chronic pain makes a full exam block harder than the test. Teachers are told not to shame families. They are also told not to name the cut in the staff room if a father sits on the parent council. Purity talk travels from wedding courtyards into engagement talks and then into who gets praised as marriageable. School silence keeps the practice uncounted. Sara’s protection league runs after-hours study for girls who miss days, yet the same elders still bless matches by reputation. A promising student accepts an early engagement to stop the rumors. Her training folder closes. Sara can tutor through pain. She cannot grade a courtyard custom that still certifies worth. When does a school become a place that can refuse the purity script without stranding the girl who must live next door to it?",
      stakeholder: "Young women teachers' protection league",
      crisisMeters: { local: "Chronic Pain", global: "Purity Talk", support: "School Silence" },
      suggested: ["vr", "networks", "ai", "computing", "iot", "transportation"],
      visionTheme: "learn-city",
    }
  ],

  "short-termism": [
    {
      places: ["Salt Creek Mangrove Fringe"],
      title: "Cash kilns thin the storm belt",
      scene:
        "Before dawn, Amina rakes the last cool charcoal from her family’s kiln and bags it for the market truck. The bags mean school fees this month. Behind her, the creek mouth looks thinner than last wet season. A spring tide pushes farther inland than the old marker posts. Crab pots sit in mud that used to hold young mangrove roots. The council still pays by the bag, not by the stand of trees left standing. Kiln crews cut the fringe because cash arrives this week and storm insurance does not. Each dry-season burn clears another strip that once slowed surge. Amina’s uncle lost his boat shed last year when water climbed the bank overnight. She knows the next big blow will find less green wall between the creek and the houses. The permit clerk stamps cutting slips faster than replanting plans. Who designs a living that pays today without selling the belt that keeps the storm out tomorrow?",
      stakeholder: "Creek-side fishers and kiln workers’ council",
      crisisMeters: { local: "Flood water", global: "Charcoal cash", support: "Permit race" },
      suggested: ["iot", "drones", "solar", "ai", "networks", "materials", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Hillside Polytechnic Annex"],
      title: "Exam scores, locked workshops",
      scene:
        "Mr. Okello unlocks the theory wing and leaves the workshop chain in place. Today’s class drills past papers for the board exam. The lathes sit under dust covers. Last term a parent board vote froze tool budgets so the school could hire two more exam coaches. Scores rose. Employers still send back apprentices who cannot hold a tolerance on a real part. The annex earns its grant on pass rates published each spring. Repair hours and stock metal do not appear on that sheet. A second-year student, Ruth, can recite the welding symbols and has never run a bead that will hold under load. When the district inspector visits, the locked doors look tidy. When a local clinic asks for a bracket repair, the shop stays closed. Ruth’s mother paid fees for a trade. The calendar pays for marks. Who designs a school year that keeps tomorrow’s hands skilled without starving this year’s scoreboard?",
      stakeholder: "Instructors, apprentices, and parent board",
      crisisMeters: { local: "Broken shops", global: "Budget freeze", support: "Skill gap" },
      suggested: ["print3d", "vr", "ai", "networks", "computing", "robots", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal Row Tenements"],
      title: "Rent due, stairs failing",
      scene:
        "On collection Friday, caretaker Sita chalks another cracked stair tread and still knocks for rent. The third-floor landing flexes under her shoe. Tenants hand over cash in envelopes because eviction notices arrive faster than repair crews. The landlord’s agent wires money out the same day to cover a short-term loan on another block. Patch jobs use the cheapest board that will pass a quick look. Mold maps the corners where the canal damp climbs the plaster. A child on the second floor misses school after a fall on the loose nosing. The tenants’ union keeps a photo log. Fines for unpermitted DIY patches hit harder than the slow fine for deferred structure work. Sita can name every family behind each door. She cannot name a fund that waits for sound stairs before it demands the month’s rent. Who designs housing cash flow that keeps people housed without spending the building out from under them?",
      stakeholder: "Tenants’ union and block caretakers",
      crisisMeters: { local: "Mold homes", global: "Rent squeeze", support: "Patch fines" },
      suggested: ["iot", "materials", "print3d", "ai", "networks", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Blackwater Fen Allotments"],
      title: "Spring flood sold as dry fields",
      scene:
        "Hari walks the dike at first light and finds the pump still coughing diesel into a field that should be firm by now. Seed catalogs promised a dry window. The lease clerk sold that window in writing. Overnight rain sat on peat that has thinned for years under deep drains run hard each spring. Growers open the pumps early to hit contract dates for early greens. Early greens pay. Peat that stays wet longer would hold the land up. Each forced dry-down settles the beds a little more. Hari’s neighbor lost a corner plot to standing water that no longer drains to the old ditch line. The cooperative’s loan officer checks harvest calendars, not soil height stakes. Hari can feel the path sponge under his boots where carts used to roll clean. The clause on the lease still calls the ground arable without naming what the pumps remove. Who designs a season’s pay that does not spend the ground the next season needs?",
      stakeholder: "Fen growers’ cooperative",
      crisisMeters: { local: "Sinking fields", global: "Pump bills", support: "Lease clauses" },
      suggested: ["iot", "solar", "battery", "ai", "space", "networks", "synbio"],
      visionTheme: "food-city",
    }
  ],

  misinfo: [
    {
      places: ["Riverside Free Clinic Lobby"],
      title: "The nurse who never dialed",
      scene:
        "Marisol stands at the lobby desk with a paper list of missed insulin pickups. She dials Mrs. Chen first. A calm voice answers in the clinic’s own cadence, says the refill window moved to next month, and hangs up polite. Mrs. Chen never got that call. By noon three more patients swear a nurse already told them to wait. Marisol checks the log. No one on her shift dialed those numbers. The clinic’s callback line sits on a cheap voice tree that any phone can spoof. A local outfit sells “appointment scrubber” packs in a neighborhood chat: cloned hold music, stolen extension names, scripts timed to refill week. Patients who believe the fake skip the real desk. Blood sugars climb at home while the lobby chairs stay half empty. The outreach budget still pays for reminder minutes no one trusts. Marisol has one open afternoon and a stack of real names. How do you rebuild a call people will answer when the lie already sounds like care?",
      stakeholder: "Clinic outreach coordinator",
      crisisMeters: { local: "Missed Doses", global: "Fake Calls", support: "Staff Strain" },
      suggested: ["ai", "networks", "computing", "iot", "crypto"],
      visionTheme: "care-city",
    },
    {
      places: ["Seabrook Wharf Notice Board"],
      title: "Sirens nobody believes",
      scene:
        "Harbor master Ellis pins a storm sheet to the wharf board at first light. The siren tested clean an hour ago. By the time the tide turns, a video is already looping in the crew chats: his jacket, his voice, a cancel order he never gave. Two skippers leave nets in the water. One hauls late and loses a season’s gear when the real surge hits the outer piles. The town still runs alerts through a single radio bridge and a social page anyone can mirror with a stolen crest. A small ad ring pays for panic clips before every named storm; clicks rise when boats stay out or race in wrong. Ellis walks the wet planks counting empty slips that should have moved. Insurance adjusters will ask who heard what. The next window is twelve hours. Who designs a warning the harbor will still trust when the fake already wears his face?",
      stakeholder: "Harbor master",
      crisisMeters: { local: "Storm Losses", global: "Fake Alerts", support: "Harbor Doubt" },
      suggested: ["ai", "networks", "space", "iot", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Milltown Night School Hall"],
      title: "The lecture that wasn’t sold",
      scene:
        "Director Ruiz unlocks the hall for the welding cert review and finds half the seats empty. On her phone a clip is already racking shares: her at the podium, promising job placement she never offered, then a cut to a fake invoice for “guaranteed hire.” The real lecture was free. Two students quit that morning, sure the school sold their names. A rival training broker seeds doctored clips before every enrollment week. The edit tools are cheap; the night-school crest sits on a public flyer anyone can lift. Ruiz still has to fill the shop floor by Friday or lose the county grant. She knows the regulars by first name. One of them will not come back if the smear sticks. Trust is the only tuition she cannot refund. How do you prove a classroom is real when the lie arrives first and looks finished?",
      stakeholder: "Night-school director",
      crisisMeters: { local: "Dropouts", global: "Doctored Clips", support: "Paid Smears" },
      suggested: ["ai", "networks", "computing", "vr", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Harborview Tenant Union Hall"],
      title: "Rent strike on a forged memo",
      scene:
        "Union chair Ade walks into the hall with a stack of rent receipts and finds the room already split. Someone taped a landlord memo to the door: mass lock changes Friday, strike void, leaders paid off. The letterhead matches last year’s real notice. The signature does not. Two floors have already stopped paying into the shared defense fund. A block away, a quiet account buys print runs of “official” memos whenever a building organizes; chaos drops sale prices for outside buyers. Ade’s phone fills with neighbors asking who sold them out. She has the real landlord email on her laptop and no way to put it on every door before Friday. One elderly tenant will face a locksmith alone if the forged order holds. The fund needs unity by sundown. Who designs proof that travels as fast as a lie on paper in a hallway?",
      stakeholder: "Tenant union chair",
      crisisMeters: { local: "Locked Doors", global: "Forged Memos", support: "Outside Cash" },
      suggested: ["ai", "networks", "crypto", "computing", "print3d"],
      visionTheme: "social-city",
    }
  ],

  totalitarianism: [
    {
      places: ["Millbridge Community Hospital"],
      title: "The ward docks your household",
      scene:
        "At 2:14 a.m., nurse Amira scans a wristband on the maternity overflow ward. The screen flashes red. The patient is stable. The household score is not. Last month her brother missed a block meeting. The file now labels the family Unreliable. Amira still has clean gloves and a free cot. What she does not have is a green light to admit without a supervisor countersign. The countersign never comes before dawn.\n\nOn the night desk, the report quota board ticks. Each shift must file a minimum number of loyalty flags, no-shows, and attitude notes. Miss the quota and the ward’s own staffing points drop. Nurses who under-report get pulled from overtime. Nurses who over-protect get called in. The quota is not a poster. It is the reason the printer jams with forms before anyone jams with gauze.\n\nAmira’s circle meets in the stairwell between rounds. They trade which clerks still look away. They trade which screens still accept a paper override. They trade which families are one flag from denied pain meds. A new mother downstairs is already waiting on a delayed antibiotic. Her address sits in a watched building. Delay is the harm people feel in the body. The driver is the quota that pays the hospital for compliance theater more than for empty beds filled with care.\n\nIf Amira admits anyway, her badge may stop opening the supply closet tomorrow. If she sends the patient home, the fever comes back to the same door. Who designs care coordination that keeps people alive without feeding the machine that docks a household for who they know?",
      stakeholder: "Night-shift nurses' quiet circle",
      crisisMeters: { local: "Delayed Care", global: "Loyalty Quotas", support: "Staff Fear" },
      suggested: ["networks", "crypto", "ai", "computing", "vr", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Harborlane Produce Arcades"],
      title: "No chant, no cold storage",
      scene:
        "Before sunrise, vendor Kei rolls a cart of greens toward Arcade Bay 4. The cold-locker latch is dark. The permit app shows a gap. He skipped yesterday’s morning unity chant at the gate. No chant, no cold hours. The lettuce will wilt by noon on open ice he cannot afford.\n\nAlong the arcade, the permit ledger updates in public. Stalls light green only when owners log attendance, approved slogans, and the names of anyone who helped unload. Help from an unlisted cousin counts as an undeclared association. The association fee is not money first. It is a mark that freezes the locker again. Empty stalls are what shoppers see. The ledger is what empties them.\n\nKei’s mutual-credit circle used to balance debt in a notebook under the tarps. Now even the notebook is risky. A camera that catches three vendors signing the same page can freeze them all. A widow two bays down already sold her scale after a week without refrigeration. She still greets Kei. She no longer stands next to him when inspectors walk the aisle.\n\nKei can chant and keep the motor running. He can stay silent and watch stock die. He cannot yet prove a delivery route or a shared cooler without feeding a ledger that treats every handshake as a plot. Who designs market trust that keeps food cold without turning every partner into a line item on a loyalty roll?",
      stakeholder: "Vendor mutual-credit association",
      crisisMeters: { local: "Spoiled Stock", global: "Permit Ledger", support: "Vendor Silence" },
      suggested: ["crypto", "networks", "iot", "solar", "battery", "print3d", "ai"],
      visionTheme: "food-city",
    },
    {
      places: ["Copperline Grid Hamlet"],
      title: "Compliant blocks stay lit",
      scene:
        "Line worker Rosa climbs the pole on Maple Spur. She opens the local cutout by the book. The book is no longer only load and weather. The score portal on her handset lists which porches hosted unregistered study groups last week. Those meters drop first when the feeder tightens at dusk.\n\nHardship clerks in the shed process restoration tickets. A ticket moves faster if neighbors have filed enough harmony confirms on each other. People learn to watch windows. A shared tool shed that once held spare fuses now sits locked. Three households signed the same repair roster. That was enough. The outage is cold soup and dark stairs. The portal is why the dark chooses its addresses.\n\nRosa’s crew still knows how to island a transformer and keep a clinic wing alive. What they lack is a way to do it without the portal logging who stood together in the alley. Last winter a clerk restored a block early and lost shift bids for a month. Trust frays pole to pole. Children do homework by phone glow while the compliant side of the street keeps its porch lights.\n\nRosa can follow the portal and cut clean. She can bootleg a jumper and risk the crew. Neither path yet answers how a hamlet shares electrons without a ranking system that rewards isolation. Who designs local power that holds through the evening without making neighbor suspicion the switch?",
      stakeholder: "Line workers and hardship clerks",
      crisisMeters: { local: "Dark Homes", global: "Score Portal", support: "Neighbor Watch" },
      suggested: ["solar", "battery", "networks", "crypto", "computing", "iot", "ai"],
      visionTheme: "energy-city",
    },
    {
      places: ["Saltreed Fisher Quay"],
      title: "Fuel only for the logged crew",
      scene:
        "Skipper Nila ties up at Saltreed with a torn bilge hose. Her hold is half full of ice going soft. The fuel kiosk scanner refuses her fob. Unity Logs show only two of her three crew checked in at the dawn briefing. The third was mending nets with his brother on an unlisted skiff. No full log, no diesel.\n\nAlong the quay, repair league benches sit half empty. Parts used to pass hand to hand with a chalk tally. Now every borrowed impeller must match a logged crew list. Miss the match and the chandler risks a dockside audit. Boats that once shared weather calls go quiet on the open channel. Fuel cuts leave nets dry on the racks. The logs keep producing the silence. They tie berth, fuel, and spare parts to who appears in the same official frame.\n\nNila’s league still knows which hulls need the same gasket size. A young deckhand waits on the pier with a printed flange that could save the day if anyone dares stamp it outside the log. His uncle already lost a season after a crew drift mark. Families split across boats so no single fob carries too many names.\n\nNila can dismiss the third hand and fill the tank. She can idle and lose the catch. She cannot yet run a repair commons the harbor treats as legitimate work instead of an unsanctioned circle. Who designs quay coordination that keeps crews whole and engines fed without a log that breaks the very hands that haul together?",
      stakeholder: "Independent skippers' repair league",
      crisisMeters: { local: "Lost Catch", global: "Crew Logs", support: "Quiet Channel" },
      suggested: ["networks", "crypto", "drones", "solar", "print3d", "computing", "space"],
      visionTheme: "ocean-city",
    }
  ],

  "women-stem": [
    {
      places: ["Pune Polytechnic Instrumentation Wing"],
      title: "Night shuttle ends before her bench time",
      scene:
        "Meera locks the calibration jig at 7:40 p.m. and runs for the gate. The last women-only shuttle already idles with its doors half closed. She makes the step. Her partner does not. The lab stays open until ten for the sensor final. The route home does not. Campus security will not sign late exit slips for women after the shuttle leaves. The rule is written as safety. In practice it cuts the hours when the benches, scopes, and shared kits are free. Boys from the same cohort keep working under the fluorescent lights. They finish the noise tests. They post the plots. Meera’s group loses another graded night. The mark sheet tilts. The guild has counted the pattern all term. Missed labs stack into weaker portfolios. Weaker portfolios keep women out of the instrumentation placements the polytechnic brags about. A principal can add one more van or one more camera and still leave the real design unasked. Who rebuilds lab access so skill, not the last bus, decides who finishes the work?",
      stakeholder: "Polytechnic principal and women students’ guild",
      crisisMeters: { local: "Missed labs", global: "Last shuttle", support: "Placement gap" },
      suggested: ["networks", "ai", "solar", "iot", "self-driving", "vr"],
      visionTheme: "learn-city",
    },
    {
      places: ["Antofagasta Copper Training Depot"],
      title: "Sensor tickets still list the sons",
      scene:
        "Rosa scans her card at the haul-truck simulator bay. The screen greets someone else’s name. It is her cousin’s son, still on the old crew list. She has finished every IoT sensor module the depot offers. The ticket queue does not care. Dispatch software still auto-fills field slots from a male seniority file. That file was built when the pit ran only one kind of crew. Supervisors shrug. They say the system is fair because it is automatic. Women who pass the same drills wait on unpaid hold days. The board fills with familiar last names. Wage bands stall. Underground sensor tickets stay a men’s ledger in practice. The regional association can coach another cohort and still watch certified women lose hours to a roster that will not see them. The training chief can add headsets and still leave the gate locked. Who redesigns the ticket path so competence, not an inherited name file, opens the bay?",
      stakeholder: "Depot training chief and regional women miners’ association",
      crisisMeters: { local: "Hold days", global: "Roster bias", support: "Wage stall" },
      suggested: ["drones", "iot", "vr", "robots", "ai", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Kumasi Teaching Hospital Biomed Bay"],
      title: "Repair floor badge never prints for her",
      scene:
        "Ama stands at the badge window with her nursing-STEM certificate still warm from the printer. The clerk checks the list twice. Her name is not on the repair-floor roll. Only staff coded as biomedical technicians get door access to the open machines. On the ward, infusion pumps fail. Monitors drift. Nurses like Ama already troubleshoot with borrowed manuals after shifts. The hospital still routes formal parts, torque tools, and sign-off authority through a male-dominated tech track. That track rarely admits lateral entrants from nursing. She can watch a ventilator error code and still be turned away at the bay door. Colleagues burn out. They leave clinical STEM paths altogether. The biomedical head can order another printer and still keep skill on the wrong side of the lock. Who designs credentials so the person who keeps a device alive can step onto the floor that owns the fix?",
      stakeholder: "Hospital biomedical head and nursing-STEM liaison",
      crisisMeters: { local: "Broken pumps", global: "Badge lockout", support: "Staff exit" },
      suggested: ["print3d", "ai", "iot", "networks", "computing", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Amman STEM Olympiad Prep Hall"],
      title: "Travel fund needs a male chaperone",
      scene:
        "Lina pins her robotics bracket sheet to the prep-hall board and waits for the travel desk. The regional finals are in two weeks. The school fund will pay her seat only if a male relative signs as chaperone for the overnight coach. Her father works nights. No uncle can take the days. Boys from the same team submit forms alone and keep their slots. Coaches know Lina’s code wins scrimmages. They also know the chaperone rule sits in the parent council’s safety charter. It almost never bends. Girls drop from the travel list one by one. Scholarships tied to medal tables drift toward the students who can move. A brilliant build stays on a laptop in Amman. The arena fills without her. The council can rent another bus and still leave the gate conditional on a man’s name. Who designs competition travel so talent, not a chaperone signature, claims the seat?",
      stakeholder: "Prep-hall coaches and parent-student STEM council",
      crisisMeters: { local: "Dropped seats", global: "Chaperone rule", support: "Medal drift" },
      suggested: ["vr", "networks", "ai", "computing", "solar", "space"],
      visionTheme: "learn-city",
    }
  ],

  memory: [
    {
      places: ["Nishijin timber yard, Kyoto"],
      title: "Joinery marks leave with the last master",
      scene:
        "Kenji runs his thumb along a cedar beam and stops at a shallow chisel nick no tourist would notice. The mark tells which way the grain will twist when summer humidity climbs. He calls for the apprentice who logged last month’s temple repair. The boy left for a factory job in Osaka two weeks ago. The paper tag on the rack names the tree and the date. It does not name the feel of the wood under load. Kenji’s own teacher kept that knowledge in his hands and in muttered notes at the end of each cut. Those notes never entered the yard’s digital inventory. Managers meter progress by pieces finished and hours billed. Slow transmission of touch knowledge looks like idle time on the sheet. A shrine roof on the east side already shows a hairline gap where a substituted joint sits wrong. One more wrong beam and the next typhoon season will open the hall to rain. Who designs a way to keep the mark alive when the hand that made it is gone?",
      stakeholder: "Temple carpentry guild keepers",
      crisisMeters: { local: "Beam Failures", global: "Mark Loss", support: "Apprentice Exit" },
      suggested: ["vr", "ai", "networks", "computing", "print3d", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Toksook Bay boat launch, Alaska"],
      title: "Safe ice only the aunties can name",
      scene:
        "Mary steps onto the gray edge at dawn and names the ice the way her mother taught her. This stretch sings under the boot. That dark seam will open by noon. Her nephew waits with a GPS unit and a printed chart from the school. The chart shows last year’s shore line. It does not show the soft pocket she can smell when the wind shifts. Two hunters went through near the old trail last week. One made it back soaked and shaking. The village still runs safety talks from laminated cards written when the seasons held steadier patterns. Young people leave for jobs in Bethel and Anchorage. The aunties who can read the ice by sound and color grow fewer each spring. Store food costs climb when the freezers run low. Mary watches her nephew pocket the device and glance at the water as if the machine will speak first. Who designs a path that carries her naming forward without freezing it into a map that lies?",
      stakeholder: "Yup'ik shore knowledge keepers",
      crisisMeters: { local: "Trail Accidents", global: "Ice Forgetting", support: "Youth Drift" },
      suggested: ["ai", "networks", "vr", "iot", "space", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Port Talbot blast furnace control room, Wales"],
      title: "The furnace whisper dies at shift end",
      scene:
        "Davies hears the change before the alarm board lights. A thin rise in the stack note means the burden is hanging wrong above the tuyeres. He reaches for the stub of pencil he still keeps in his pocket. The digital log wants a code from a dropdown. There is no code for that particular hiss. Night shift ends in twelve minutes. The relief crew comes in fresh from a contractor rotation and has never stood this furnace through a sticky descent. Company policy clears free-text notes at the end of each quarter to keep the system tidy. Near misses get filed as closed once the numbers settle. Last month a young operator missed the same whisper and dumped a partial cast late. No one was hurt. The floor still talks about the heat that rolled back toward the runners. Davies types a vague comment and knows it will vanish. Who designs a memory that outlasts a shift when the plant only keeps what fits a form?",
      stakeholder: "Steelworks safety stewards",
      crisisMeters: { local: "Near Misses", global: "Shift Amnesia", support: "Note Purges" },
      suggested: ["ai", "iot", "computing", "networks", "vr", "robots"],
      visionTheme: "energy-city",
    },
    {
      places: ["Maternity annex, Komfo Anokye Teaching Hospital, Kumasi"],
      title: "Auntie remedies never reach the chart",
      scene:
        "Ama cools a new mother’s wrists with a cloth wrung in ginger water the way the senior midwife showed her years ago. The woman’s fever had climbed after a long labor. The electronic chart lists antibiotics and vitals. It has no field for the auntie’s sequence of sips, rest, and watchfulness that calmed the same pattern last ward rotation. A junior nurse takes over at handoff and follows only what the screen shows. By morning the fever is back and the bed is flagged for escalation. Staff churn through the annex every season. Contract hires learn the software in a day. They do not learn which grandmother remedy the old team trusted when labs ran slow. Families notice the repeat scares. Some delay coming in because they fear the ward will miss what their own elders already know. Ama stands between the trolley and the screen with a remedy that works and nowhere official to put it. Who designs a record that can hold both the dose and the hands that still remember why?",
      stakeholder: "Senior midwife networks",
      crisisMeters: { local: "Repeat Harm", global: "Handoff Gaps", support: "Staff Churn" },
      suggested: ["ai", "networks", "computing", "crypto", "iot", "vr"],
      visionTheme: "care-city",
    }
  ],

  "rural-roads": [
    {
      places: ["Cajón Seco bridge spur, Chiapas highlands"],
      title: "Harvest trucks stop at the broken bailey",
      scene:
        "Rosa backs the first pickup to the bailey at dawn. Green cherry still wet with night. The steel deck that once took three trucks an hour now lists toward the ravine. A plate sheared in the last storm. She kills the engine and listens to the creek. Buyers wait on the far bank with scales and cash. Behind her, co-op members stack sacks that will sour by afternoon if they stay. The municipal works chief arrives with a clipboard and no crane. Budget lines still favor the paved spur that serves the tourist lodge down-valley. Spare parts sit in a depot two ridges away, billed to a contractor who only works when the road is already open. Rosa’s lot loses grade while the paperwork waits for dry weather that never quite arrives. Who redesigns a highland crossing so the harvest can move before the fruit turns?",
      stakeholder: "Smallholder coffee cooperative and municipal works chief",
      crisisMeters: { local: "Spoiled Crop", global: "Bridge Fail", support: "Spare Cash" },
      suggested: ["transportation", "materials", "drones", "iot", "solar", "networks", "ai", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Barotse floodplain hamlets, Western Zambia"],
      title: "Clinic boat cannot beat the cut-off levee",
      scene:
        "Nurse Mwale poles the clinic skiff toward the cut where the channel used to run. The new levee wall sits raw and high. It protects the rice scheme upstream. It also seals the old water path the boat needs. A mother on the far bank holds a child with a fever that will not break. The traditional authority council approved the wall after three wet seasons ruined the fields. No one mapped the clinic’s route into the same plan. Mwale beaches on mud and walks the long way with a dry kit. By the time she arrives, the window for simple treatment has narrowed. Fuel for a longer detour is rationed to the rice pumps first. The path that keeps people well was never a line on the levee drawings. Who designs flood works that still let care reach the hamlets when the water rises?",
      stakeholder: "River clinic nurses and traditional authority council",
      crisisMeters: { local: "Late Care", global: "Blocked Path", support: "Levee Politics" },
      suggested: ["transportation", "drones", "solar", "battery", "networks", "iot", "ai", "materials"],
      visionTheme: "care-city",
    },
    {
      places: ["Ömnögovi winter school trace, South Gobi"],
      title: "Winter school bus never clears the dune line",
      scene:
        "Head teacher Batbold stands at the boarding gate with a thermos and a roster. The bus is a dark shape stuck beyond the first dune line. Wind has filled the packed trace overnight. Herder parents radio that the children are safe in the ger camp, but the week’s lessons will not start. Last year’s grader budget went to the mine spur that keeps ore moving. The soft school track is still “temporary” on the district map. Teachers who commute from town miss three days in a row and start looking at posts nearer the paved road. Batbold marks another empty column in the attendance book. The desert does not wait for a better alignment. Who builds a winter route that treats a child’s classroom as seriously as a haul truck?",
      stakeholder: "Boarding-school head and herder parents’ association",
      crisisMeters: { local: "Missed Class", global: "Soft Trace", support: "Teacher Exit" },
      suggested: ["transportation", "space", "iot", "solar", "networks", "ai", "vr", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Peerless Lake ice spur, northern Alberta"],
      title: "Fuel and dialysis miss the thaw window",
      scene:
        "Health director Leanne Cardinal watches the contractor’s plow turn back at the pressure ridge. The ice road that feeds Peerless Lake is already weeping at the seams. Diesel for the clinic generator and the monthly dialysis run sit on the far shore. Contracts lock the heavy trucks to a fixed haul calendar written for colder decades. Warm spells now eat days off both ends of the season. A patient who needs treatment twice a week cannot wait for the next freeze that may not hold. Barges are months away. Air charters blow the health budget in a single afternoon. The system still plans as if winter were a reliable bridge. Who redesigns the supply season so care does not vanish when the ice goes soft early?",
      stakeholder: "First Nation health director and winter-road contractors’ co-op",
      crisisMeters: { local: "Supply Gaps", global: "Thaw Days", support: "Contract Lock" },
      suggested: ["transportation", "drones", "materials", "energy", "solar", "battery", "iot", "networks"],
      visionTheme: "rebuild-city",
    }
  ],

  smoking: [
    {
      places: ["Tijuana Maquiladora Gate 7"],
      title: "The gate line runs on shared packs",
      scene:
        "Rosa clocks the line at Gate 7 before the second shift horn. Women pass a single pack down the chain so no one burns a full carton before payday. The plant nurse station logs another week of tight chests and lost hours on the soldering floor. A posted cessation flyer peels in the sun. No one stops. The break yard is the only place supervisors do not time bathroom trips, and the kiosk outside the fence sells cartons cheaper than the clinic sells patches. Shared packs keep the line calm and the piece-rate steady. When Rosa pulls three women aside for a quiet lung check, two refuse. They fear a mark on the attendance sheet more than the cough. A junior tech misses her certification window after a week of wheeze. Rosa must still clear the floor for export. Who redesigns the break economy so quitting does not cost the shift?",
      stakeholder: "Plant occupational nurse collective",
      crisisMeters: { local: "Sick Days", global: "Cheap Cartons", support: "Break Culture" },
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Hanoi Secondary Gate Snack Strip"],
      title: "Snack carts sell the first drag",
      scene:
        "Lan waits at the school gate with her son's inhaler in her fist. The snack strip wakes before the bell. Carts open with bread, tea, and single sticks sold cheaper than candy. Boys cluster where the shade hits the wall. A teacher confiscates one stick. By lunch three more appear. Gate rent is cash on Friday, and tobacco margin keeps the carts in place when noodle sales dip. Parents on the health board post a no-smoking sign. The carts simply roll two meters down the fence line. Lan's son starts a dry cough that follows him into math. She can walk him past the strip. She cannot walk every classmate past the rent that stocks it. Who designs a gate livelihood that does not recruit the first drag?",
      stakeholder: "Parent-teacher health board",
      crisisMeters: { local: "Kids Coughing", global: "Single Sticks", support: "Gate Rent" },
      suggested: ["ai", "networks", "iot", "drones", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Marseille Fos Container Break Yard"],
      title: "Dock break rooms still billow",
      scene:
        "Marc opens the break-room door after a double crane shift and steps into a blue haze. The extractor fan rattles and loses. Men crush butts into a coffee tin because the yard still pays a cut from the cigarette machine by the time clock. Overtime is the real wage. Smokes pace the wait between ship calls. Marc logs particulate spikes on a handheld the union finally bought. The stevedore with the young lungs leaves early, short on hours, short on pay. A safety memo asks for a clean room. The concession contract still needs the vending revenue to fund the night porter. Marc can move chairs. He cannot move the cut that restocks the machine each Monday. Who rebuilds rest so the air does not bill the crew twice?",
      stakeholder: "Port occupational safety steward",
      crisisMeters: { local: "Dirty Air", global: "Vending Cut", support: "Overtime Norm" },
      suggested: ["iot", "materials", "ai", "networks", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Nairobi Maternity Waiting Home Courtyard"],
      title: "Courtyard haze reaches the newborn cots",
      scene:
        "Amina wipes a newborn's face and hears the wheeze start again under the mosquito net. Fathers and uncles gather in the courtyard after dark. The yard kiosk sells tea, airtime, and loose cigarettes to men who cannot enter the ward. Smoke drifts under the eaves where mothers wait out the last weeks of pregnancy. Night visits are how families share news and money. Amina asks the kiosk to move. The vendor pays the home a small fee that buys soap and lamp oil. One mother leaves early, lungs tight, baby still small. Amina can close a window. She cannot close kinship that funds the shelf. Who designs a waiting home night that keeps kinship without teaching the cot to cough?",
      stakeholder: "Midwife cooperative lead",
      crisisMeters: { local: "Baby Wheeze", global: "Yard Kiosk", support: "Night Visits" },
      suggested: ["iot", "materials", "ai", "networks", "nano"],
      visionTheme: "care-city",
    }
  ],

  sanitation: [
    {
      places: ["Sunwell Primary Compound"],
      title: "Latrine queues send girls home by noon",
      scene:
        "At first bell, Amina stands outside the girls' block with her younger sister's hand in hers. The line already wraps past the water drum. Two stalls work. The third door is tied shut with wire. By mid-morning the queue has not moved enough. Girls step out of class in pairs, then drift toward the gate when the wait steals the lesson. The pits were dug for a smaller school. Enrollment doubled when the feeder path opened, and the district still budgets desludging once a term. The vacuum truck comes late or not at all. Teachers mark absences. Mothers keep daughters home after a stomach bug spreads through a grade. Amina's sister misses arithmetic two days running because she will not risk the stall. The hygiene club can scrub seats and post duty rosters. It cannot empty what the schedule refuses to fund. Who designs school sanitation for the hour a child chooses between dignity and a desk?",
      stakeholder: "Parent-teacher hygiene club",
      crisisMeters: { local: "Sick Kids", global: "Full Pits", support: "Budget Gap" },
      suggested: ["solar", "iot", "materials", "print3d", "robots", "ai", "networks", "transportation"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ladder Cut Settlement"],
      title: "Sewage owns the only stair out",
      scene:
        "Rafi carries his mother down the shared stair one careful step at a time. Gray water sheets the treads. Last night's backup left a slick that smells of soap and waste. The only dry route out of the upper rooms is this narrow flight, and it floods whenever the channel below clogs. Landlords collect rent by room and treat the open drain as a public problem. They patch walls. They do not rebuild the line that runs under the cut. Residents tip buckets into the same channel after dark because the shared latrine backs up by evening. Skin sores bloom on ankles that brush the wet rail. When Rafi's mother slips, the union carries her to a clinic an hour away. The channel keeps taking the settlement's waste because no deed assigns the pipe, and delay is cheaper than a new run. Who designs the stair when sewage is the landlord's boundary and the residents' only exit?",
      stakeholder: "Stair-block residents' union",
      crisisMeters: { local: "Skin Sores", global: "Open Channels", support: "Landlord Delay" },
      suggested: ["materials", "drones", "iot", "print3d", "solar", "battery", "ai", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Crossridge Freight Yard"],
      title: "Behind the fuel bay is the toilet",
      scene:
        "Shift change hits and Devi looks for the stall behind the fuel bay. The light is dead again. The lock hangs open because the last crew kicked it when the door jammed. Night loaders hold it for each other when they can. When they cannot, they go behind the tanker line. Gut bugs move through the mutual aid circle every wet month. The yard lease puts toilets on the tenant's side of the ink, and the freight company sublets the bay to three crews who split a single failing block. Management counts trucks, not stalls. A loader who leaves the apron to walk to the gatehouse loses the load bonus. Devi rinses her hands from a jerrycan she bought herself. The circle can stock soap and keep a key rota. It cannot rewrite a lease that treats sanitation as optional overhead on night freight. Who designs the yard so the body that moves the cargo can relieve itself without begging the clock?",
      stakeholder: "Night loaders' mutual aid circle",
      crisisMeters: { local: "Gut Bugs", global: "Locked Stalls", support: "Lease Squeeze" },
      suggested: ["solar", "iot", "materials", "networks", "ai", "crypto", "transportation", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Olive Court Rest Home"],
      title: "The wing that smells before breakfast",
      scene:
        "Before tray carts roll, Nurse Okonkwo cracks a window in Wing B and still catches the sour edge in the hall. Mr. Salim will not walk to the dayroom until the bathroom fan stops rattling and the floor dries. The stack backs up on the old wing first. Pipes were sized for fewer beds and fewer wipe-downs. Contract cuts trimmed the overnight cleaner and delayed the rodding crew another quarter. Families notice the smell on morning visits. One daughter stops leaving her father overnight. Infections climb when soiled linen sits and shared toilets stay wet. The caregivers' council logs every backup with timestamps and photos. Administration answers with a memo about agency staff and a promise to retender the plumbing when the budget cycle opens. Okonkwo has one good bathroom for a full corridor. Who designs care plumbing for the hour an elder needs a clean path more than a balanced spreadsheet?",
      stakeholder: "Family caregivers' council",
      crisisMeters: { local: "Infections", global: "Backed Pipes", support: "Contract Cuts" },
      suggested: ["iot", "robots", "materials", "solar", "ai", "gene-sequencing", "networks", "print3d"],
      visionTheme: "care-city",
    }
  ],

  waste: [
    {
      places: ["Circuit Lane Scrap Alleys"],
      title: "Smoke over Circuit Lane",
      scene:
        "Rina pries a cracked phone open with a butter knife before the morning tip truck arrives. The board is glued shut. Screws hide under stickers. She needs the copper today, not next week. When the knife slips, she feeds the whole handset to the alley fire already smoking between the shuttered stalls. Plastic stink climbs the tenement stairs. A child two floors up starts coughing into a school shirt. The city dump raised the gate fee again last month. Sealed gadgets pay nothing whole, and the licensed yard will not take mixed scrap without a receipt Rina does not have. So the lane burns what it cannot open. Rina’s eyes water by noon. Her association keeps a shared inhaler in a biscuit tin. The trucks still roll in with phones built never to be taken apart. Who designs the take-apart path before the alley has to choose between rent and clean air?",
      stakeholder: "Informal scrap pickers' association",
      crisisMeters: { local: "Burn Smoke", global: "Sealed Gadgets", support: "Tip Fees" },
      suggested: ["materials", "iot", "robots", "ai", "networks", "print3d", "drones", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Junction Battery Sheds"],
      title: "Swollen packs behind the shed",
      scene:
        "Dev rolls a swollen e-bike pack out of the kiosk shade with a stick. The case hisses. Acid bite hits the back of his throat before he can step away. Riders still queue for swaps at lunch. Behind the shed, dead packs lean in a plastic tarp tent that grows every week. The licensed recycler sits across the ring road and charges by the kilo plus a hazmat surcharge the guild cannot split cleanly among twelve kiosk owners. So the packs wait. Rain finds a seam. A neighbor’s dog limps after sniffing the runoff. Dev keeps a chalk tally on the shed wall—units in, units stuck—and the stuck column wins. Cheap packs still arrive sealed, unlabeled, and sold as disposable range. Who designs the return loop so a swollen pack never becomes a puddle behind the shed?",
      stakeholder: "E-bike kiosk operators guild",
      crisisMeters: { local: "Acid Smell", global: "Dead Packs", support: "Haul Cost" },
      suggested: ["battery", "materials", "iot", "robots", "ai", "transportation", "networks", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Riverside Campus Canteens"],
      title: "Trays stacked to the dorm vents",
      scene:
        "Maya shoulders the back door of Canteen B and freezes. Foam trays stand in towers to the dorm vents. Flies lift in a dark sheet when the breeze shifts. Dinner service ended an hour ago. The contract kitchen still plates every rice special on single-use trays because the vendor bid won on unit cost, not on what leaves the loading bay. Washable plates would need a scullery the lease never funded. Students tape windows shut against the smell. A first-year with asthma skips the evening meal and eats instant noodles cold in her room. Maya’s facilities council can fine litter on the quad. It cannot rewrite the catering lock without a clause the bursar fears to open. Trays keep arriving by the pallet. Who redesigns the meal so the vent does not become the dump?",
      stakeholder: "Student facilities council",
      crisisMeters: { local: "Fly Clouds", global: "Foam Trays", support: "Contract Lock" },
      suggested: ["materials", "iot", "ai", "robots", "networks", "synbio", "print3d", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Palm Reach Hotel Strip"],
      title: "Linen that washes out to sea",
      scene:
        "Lila drags a mesh bag of wet wipes and miniature bottles off the morning tide line before the first beach chairs go out. Shampoo pearls stick to her gloves. A torn monogrammed washcloth rides the same foam. Up the service stair, housekeepers restock every room from crates stamped with brand standards—small plastics only, no bulk dispensers, logo facing the mirror. The cooperative Lila leads can clear the sand by nine. It cannot stop the cart that refills the same shelves by noon. A fisherman down the point finds a bottle cap in a net and curses the strip, not the current. Lila’s crew works double shifts after long-stay weekends. The brand manual still calls the minis a signature welcome. Who designs hospitality that does not train the tide to carry the welcome away?",
      stakeholder: "Coastal cleaners cooperative",
      crisisMeters: { local: "Beach Trash", global: "Mini Bottles", support: "Brand Rules" },
      suggested: ["materials", "iot", "drones", "ai", "networks", "transportation", "robots", "solar"],
      visionTheme: "coastal-city",
    }
  ],

  reproductive: [
    {
      places: ["Greenville Birth Corridor, Mississippi Delta"],
      title: "Ninety minutes past the last contraction",
      scene:
        "Keisha Jackson keys the radio at mile marker 14 while rain sheets the highway. The mother in the back seat is ninety minutes past her last strong contraction and still not crowning. The nearest open labor ward is forty-one miles farther than the map promised this morning. Last month that ward cut night coverage again. The county still bills the empty beds as capacity on paper. Insurance cards bounce between three networks before anyone will authorize a transfer van. Keisha has delivered two babies on gravel shoulders this year. She keeps a clean kit and a calm voice. What she cannot keep is a staffed room within reach when a labor turns hard. The roads were built for cotton trucks, not for timed transfers. Who designs a birth corridor that still works after the wards go dark?",
      stakeholder: "Delta doula and EMT coalition",
      crisisMeters: { local: "Road Births", global: "Closed Wards", support: "Insurance Gaps" },
      suggested: ["networks", "ai", "transportation", "drones", "solar", "battery", "iot", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Ilha do Combu birth post, Belém river belt"],
      title: "High water blocks the midwife boat",
      scene:
        "Ana Ribeiro poles the skiff toward the birth post before dawn and finds the dock already under brown water. A first-time mother waits on the raised plank floor with her sister holding a phone light. The fetal heart tones sound thin through the old Doppler. High water has blocked the usual midwife boat for the third time this season. Mainland schedulers still route ultrasound days and blood work to the city clinic first. Island posts get what is left. Ana can catch a normal birth in the stilt house. She cannot run a stalled labor or a hemorrhage without a clear path out. The river keeps rising on a clock no appointment system tracks. Who designs care that moves with the tide instead of against it?",
      stakeholder: "River midwife collective",
      crisisMeters: { local: "Stillbirths", global: "Boat Delays", support: "Mainland Bias" },
      suggested: ["drones", "solar", "battery", "networks", "iot", "transportation", "materials", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Marka industrial dorms RH window, East Amman"],
      title: "The sponsor keeps her health card",
      scene:
        "Yasmin stands outside the factory clinic window at shift change with a folded paper list of symptoms she will not say aloud. The nurse asks for the health card. The sponsor kept it again after last month’s overtime dispute. Without the card there is no pregnancy test, no pills, no quiet referral. Women in the dorms trade names of pharmacies that will sell on cash and silence. A coworker bled through a night shift last winter and still came back at dawn. Factory contracts tie clinic access to the same signature that can end a work permit. Fear keeps the waiting room empty even when the door is open. Who designs reproductive care that a worker can reach without asking the person who holds her papers?",
      stakeholder: "Migrant women’s health advocates",
      crisisMeters: { local: "Hidden Illness", global: "Sponsor Locks", support: "Deportation Fear" },
      suggested: ["networks", "crypto", "ai", "computing", "iot", "vr", "solar", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Sanganer Adolescent ANC Desk, Jaipur fringe"],
      title: "She arrives already mid-pregnancy",
      scene:
        "Sunita Devi opens the antenatal register and writes a new name in the afternoon heat. The girl is fifteen and already mid-pregnancy. She missed three school health days because her mother-in-law said the visits would mark the family. Teachers still count enrolled girls for the grant sheet even when the desks stay empty after marriage. ASHA workers walk lanes with iron tablets and quiet questions. In-laws decide who answers the door. By the time a girl reaches this desk the early window for counseling and safe options has often closed. The count looks fine on the wall chart. The girl does not. Who designs adolescent care that can meet her before the household veto writes the ending?",
      stakeholder: "ASHA workers and girls’ secondary teachers",
      crisisMeters: { local: "Teen Births", global: "In-Law Veto", support: "Count Gaming" },
      suggested: ["ai", "networks", "computing", "solar", "vr", "iot", "print3d", "transportation"],
      visionTheme: "learn-city",
    }
  ],

  amr: [
    {
      places: ["Patancheru Industrial Stretch"],
      title: "The pharma drain tutors the tanks",
      scene:
        "Before dawn, Ramesh opens the valve on the treatment lagoon behind the bulk-drug sheds. Foam rides the ditch toward the village wells. By noon his daughter’s school sends her home with a burning throat and a note the clinic cannot read. The night-shift nurse has already used the last culture bottle that still matches the old chart. Downstream, the municipal lab logs another spike of resistant E. coli in tank water families drink after the municipal line fails. Factories still flush residual antibiotics because the permit meters only color and smell, not active molecules, and the buyers pay for speed. Ramesh keeps the lagoon moving so the plant does not shut and his crew does not lose wages. His wife waits outside the primary-care room with a child who no longer answers the cheap syrup. Who designs the drain and the clinic as one system before the water teaches every household the same hard lesson?",
      stakeholder: "District pollution-control and primary-care joint lead",
      crisisMeters: { local: "Sick days", global: "Factory waste", support: "Clinic trust" },
      suggested: ["gene-sequencing", "iot", "materials", "nano", "ai", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Callao Dockside TB Ward"],
      title: "Port lungs outlast the formulary",
      scene:
        "Rosa clocks in at the dockside TB ward as the night crane still swings containers. A stevedore named Luis sits on the edge of the cot, mask loose, and tells her the cough came back after three months of pills. The lab slip shows the strain no longer bows to the standard pack the port clinic stocks. Luis cannot miss another shift without losing the badge that feeds his mother. Rosa walks the corridor and finds two more men who share the same boarding house and the same half-finished bottles. The formulary still ships the old first-line drugs because the national tender rewards volume, not the resistant map growing along the docks. Supervisors clock hours by the gangway, not by the sputum result. Luis asks her quietly whether he should hide the fever and keep loading. Who redesigns care and work so a cure can finish before the next ship sails?",
      stakeholder: "Port-district TB program director",
      crisisMeters: { local: "Failed cures", global: "Missed doses", support: "Job loss" },
      suggested: ["gene-sequencing", "ai", "networks", "iot", "computing", "drones", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Santa Catarina Hog Belt"],
      title: "Barn routine poisons the creek clinics",
      scene:
        "At first light Marta walks the nursery barn with the dosing chart clipped to her board. Piglets get the same preventive mix the integrator wrote into the contract last season. By afternoon the creek below the lagoon carries a sweet chemical smell into the town where her cousin runs the rural post. Two barn hands call in with skin fevers that do not break on the usual tablets. The clinic’s small fridge holds only what the state truck left last month. Integrators still price healthy weight by continuous low-dose feed, and inspectors count dead animals, not residual drugs in runoff. Marta signs the sheet because a blank line means a fine and a lost week’s pay for the whole crew. Her cousin texts that another child from the creek road needs a stronger drug the post does not stock. Who designs the barn contract and the creek clinic so growth does not teach resistance to every household downstream?",
      stakeholder: "State veterinary and rural health liaison",
      crisisMeters: { local: "Worker fevers", global: "Barn dosing", support: "Creek smell" },
      suggested: ["iot", "gene-sequencing", "ai", "synbio", "drones", "networks", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Makoko Stilt Clinic Lanes"],
      title: "Lane chemists empty the last good drugs",
      scene:
        "Ada paddles the narrow lane to the stilt clinic with a child hot against her chest. The nurse opens a tin and finds only loose white tablets sold without a strip or a name. Last week the same seller on the boardwalk promised a full course; the fever returned in four days. Ada paid what she had because the formal pharmacy across the lagoon charges more than a day’s catch. Lane chemists restock from bulk sacks broken to match whatever cash a mother can spare, and no one tracks which molecule actually reached the child. The clinic log shows three more half-finished treatments this morning alone. Ada’s neighbor still sends customers to the same stall because the stall extends credit when the nets come up empty. The nurse holds the unlabeled pills and the child’s wrist and does not know which failure to name first. Who designs medicine safety on water so a mother’s cash and a child’s cure are not sold as separate bets?",
      stakeholder: "Lagoon primary-care and medicine-safety coordinator",
      crisisMeters: { local: "Child fevers", global: "Loose pills", support: "Shop income" },
      suggested: ["gene-sequencing", "ai", "networks", "iot", "solar", "battery", "computing", "print3d"],
      visionTheme: "social-city",
    }
  ],

  _default: [
    {
      places: ["Local Ward", "Town Center", "District Hub"],
      title: "Crisis lands in {place}",
      scene:
        "People in {place} feel this global problem in daily life. A local driver keeps it going — invent for this place and year, not a slogan.",
      stakeholder: "Local working group",
      crisisMeters: { local: "Pressure", global: "Capacity", support: "Trust" },
      suggested: ["ai", "iot", "networks", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
  ],
};
