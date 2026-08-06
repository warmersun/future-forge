/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: 2026-07-31T06:21:06.701Z
 * Source: mixed ai=43 local=0
 * Themes: 43
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
 * Prose: design-challenge story craft (hook → mechanism → open challenge); easy first read, not shorter-for-its-own-sake.
 * Crisis meters: crisisMeters: { local, global, support } — HUD labels per perspective.
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
        "Dr. Ramirez calls for the OR as the gurney hits the bay. The board lights green for a different patient first. The trauma score model has already ranked the room. Her case sits second. The bleeder in front of her is unstable. She knows the pattern from last month’s night shift. Protocol will not unlock the suite until the score agrees. She overrides once. Risk flags the chart in real time. Legal will see the flag before morning. The model was trained on years of bay data and insurer outcomes. It keeps learning from every accepted transfer and every delayed case that still closed clean on paper. Staff chase the green path because red paths stall beds and draw review. The bleeder’s pressure drops while the higher-ranked case waits on a stable line. Ramirez has ninety seconds of argument left before the next ambulance fills the bay. Who designs the score so a surgeon’s hand still counts when the model is already sure?",
      stakeholder: "Dr. Ramirez, trauma attending",
      crisisMeters: { local: "Missed Crises", global: "Hard Locks", support: "Liability Push" },
      suggested: ["ai", "computing", "networks", "iot", "vr", "robots"],
      visionTheme: "care-city",
    },
    {
      places: ["King County Emergency Call Center, Seattle"],
      title: "The call router that quiets the wrong voice",
      scene:
        "Aisha pins a caller on line four and hears wet breathing under traffic noise. The router strips the call to a short priority tag before her screen finishes loading. Low urgency. Suggested script: non-emergency redirect. She knows that tag. It hits harder on accented speech and on calls that start mid-panic. She keeps the line open anyway. The queue clock turns amber on her headset. Supervisors measure handle time against the model’s forecast. The forecast was tuned to clear volume and cut abandoned-call rates citywide. It keeps routing the messy voices down the slow ladder so the clean ones hit crews first. Aisha’s override still works, but every override lands in a weekly stack. Across town a man waits beside a dark bus stop while a calmer call two blocks away gets the first unit. She has the address. The system has already decided who sounds worth the minute. Who designs the ear of the city so the frightened voice is not the one it learns to quiet?",
      stakeholder: "Aisha, veteran call-taker",
      crisisMeters: { local: "Slow Help", global: "Auto Drops", support: "Handle Time" },
      suggested: ["ai", "networks", "computing", "iot", "space", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Westlands Water District Allocation Desk, Fresno County"],
      title: "The ditch AI that starves the small orchard",
      scene:
        "Elena opens the allocation app at dawn and finds her lateral cut again. The almonds two rows over still show a full turn. Her soil probes already read dry at root depth. She drives to the district desk with printed meter logs. The clerk shrugs at the screen. The optimization engine set the week’s releases overnight. It favors parcels with higher predicted yield per acre-foot and cleaner repayment histories on district bonds. Her small block scores as high risk and low return. She can appeal, but the next model run lands before the hearing slot. Neighbors with larger holdings feed the same sensors and loan data the engine trusts. Every dry week teaches it that small orchards underperform. Her trees brown at the tips while the canal still moves water past her gate. One more cut and she loses the season’s contract. Who designs the ditch brain so a living orchard is not only a residual after the bond math finishes?",
      stakeholder: "Elena, small orchard operator",
      crisisMeters: { local: "Crop Stress", global: "Opaque Cuts", support: "Bond Rules" },
      suggested: ["ai", "iot", "networks", "computing", "drones", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["MBTA Operations Control Center, Boston"],
      title: "Buses that skip the night-shift clinic stop",
      scene:
        "Marcus watches the 28 pull past the clinic stop on the wall board. Three night-shift nurses stand under the shelter light with empty hands. The optimizer marked the stop as low boardings and high delay risk after ten. It rebuilt the headway to hit downtown on-time targets. He keys a hold request. The system answers with a cost flag and a recovery path that erases the stop again. Schedule software now owns the recovery logic after each late trip. It was trained on ridership counts, labor minutes, and the agency’s published reliability score. Sparse late stops look like waste in that training set. Drivers still wave at familiar faces, then roll because the tablet turns red if they dwell. A nurse misses the handoff at the overnight desk. Marcus can force one trip by hand. He cannot force the model to value a quiet curb the same as a crowded one. Who designs the night map so the people who keep the city awake still get a ride home?",
      stakeholder: "Marcus, bus scheduler and ATU member",
      crisisMeters: { local: "Stranded Riders", global: "Skip Logic", support: "Cost Targets" },
      suggested: ["ai", "networks", "computing", "transportation", "iot", "self-driving", "battery"],
      visionTheme: "coastal-city",
    }
  ],

  genocide: [
    {
      places: ["Goma Central Hospital Records Wing"],
      title: "Ward lists sold after midnight",
      scene:
        "Esperance Mukamana locks the records wing at 1:10 a.m. and still finds the intake binder open on the counter. Three new names from the burn ward are already circled in pencil that is not hers. She checks the CCTV tablet. The corridor camera froze twenty minutes ago. Outside, a motorbike idles with its headlamp off. Families sleep on the stairs waiting for news of kin who came in bleeding and never came out. When a list leaves this wing, doors stop answering on certain blocks. Clerks still sell ward rosters to men who pay in cash and ask only for ethnicity fields and home avenues. The hospital needs the side money to buy gloves. The buyers need the names. Esperance holds the only clean copy of tonight’s admissions and hears boots on the stair. Who designs a patient record that feeds care without feeding a hunt?",
      stakeholder: "Night-shift nurse Esperance Mukamana",
      crisisMeters: { local: "Missing kin", global: "List sales", support: "Night fear" },
      suggested: ["ai", "networks", "crypto", "computing", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Wau Relief Consignment Yard"],
      title: "Ration cards that starve a block",
      scene:
        "Nyibol Deng counts sacks at dawn and comes up twelve short for Block Seven. The yard printer spits ration cards with clan codes already filled. Her neighbor’s card shows denied in red though the children still line up with empty basins. A supervisor shrugs and points at the manifest tablet. Names that match the wrong section chiefs simply do not load. Trucks keep arriving. Food keeps leaving through a side gate after dark toward compounds that already eat. Hunger tightens first on the blocks frozen out of the card file. Nyibol can move one sack by hand. She cannot move the list that decides who counts as fed. Who designs relief identity so a yard cannot starve a street by checkbox?",
      stakeholder: "Block leader Nyibol Deng",
      crisisMeters: { local: "Hunger", global: "Card denial", support: "Clan capture" },
      suggested: ["drones", "networks", "ai", "space", "crypto", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Prizren Municipal Scholarship Board"],
      title: "Tablets that fail one language",
      scene:
        "Lirije Krasniqi sets the scholarship tablets on the long table before the morning queue forms. The login screen accepts only one script. A father slides forward a paper transcript in the other language and the clerk shakes his head without reading it. Last spring three students from her street passed every exam and still received silent refusals. The board says the system is neutral. The training data never included their school’s stamp. Seats fill with names the software already trusts. Futures thin out in kitchens where parents burn the rejected forms for heat. Lirije can tutor until midnight. She cannot make the portal see a child it was never built to score. Who designs a public ladder that does not erase one tongue at the first click?",
      stakeholder: "Teacher Lirije Krasniqi",
      crisisMeters: { local: "School bans", global: "Lost futures", support: "Board capture" },
      suggested: ["ai", "networks", "vr", "computing", "crypto", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Sittwe Jetty Labor Desk"],
      title: "Crew badges that never return",
      scene:
        "Aung Myint stamps crew badges at the jetty desk as the tide turns. Four badges from yesterday’s skiff still hang on the hook unclaimed. The wives wait at the gate with rice pots gone cold. Harbor police say the men jumped ship. No one saw a jump. New badges print only for names on a preferred roster the broker refreshes from a private phone. Men from the wrong quarter pay fees and still sail without a paper trail that can call them back. Empty seats at the evening fire spread along one lane first. Aung can refuse a stamp. He cannot stop a system that makes certain fishers vanish as paperwork. Who designs harbor work so a badge cannot become a quiet erasure?",
      stakeholder: "Jetty steward Aung Myint",
      crisisMeters: { local: "Missing fishers", global: "Hunger", support: "Badge rackets" },
      suggested: ["drones", "networks", "ai", "space", "transportation", "iot"],
      visionTheme: "ocean-city",
    }
  ],

  poverty: [
    {
      places: ["Sorting Lane"],
      title: "The tip owns the pickers on Sorting Lane",
      scene:
        "Before sunrise, Meena drags a sack of wet cardboard up Sorting Lane and waits for the scale. The clerk weighs slow on purpose. He knocks a kilo off her load and writes the short number in the tip’s book. Her kids ate plain rice last night. They will eat the same tonight if this bag pays less again. The tip sets the only buying price in the ward. Middlemen buy clean plastic and metal in bulk, then lock the lane gates when pickers try to sell outside. Meena’s cooperative can sort faster and cleaner than any lone cart, yet every rupee still passes through the same clerk. One member’s boy has a cough from the dump dust and no clinic fee left. If the scale keeps owning the morning, the cooperative empties out and the lane stays a trap. Who redesigns the sale so the people who lift the waste can own the price?",
      stakeholder: "Waste picker cooperative",
      crisisMeters: { local: "Empty Meals", global: "Scale Grip", support: "Sick Kids" },
      suggested: ["networks", "crypto", "ai", "iot", "print3d", "solar", "battery", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Dust Ridge"],
      title: "Advance pay chains the kiln on Dust Ridge",
      scene:
        "Rafi coughs into his sleeve and still loads another brick onto the cart. The kiln boss already paid him two months ahead for school fees and medicine. That advance sits in the boss’s ledger as a chain. Leaving means the debt jumps and the next job vanishes by word of mouth. Dust coats the ridge by noon. Wives wash black water from children’s eyes at the shared tap. The mutual aid circle pools coins for inhalers, yet every recovery week pushes a worker deeper into the same advance book. The boss sets piece rates after the fire is lit, not before. No one sees the full tally until payday shrinks. Rafi’s daughter needs another clinic visit. He cannot miss a shift without the ledger swelling. How do you break a wage that arrives as a trap before the work even starts?",
      stakeholder: "Kiln workers’ mutual aid circle",
      crisisMeters: { local: "Bonded Debt", global: "Boss Books", support: "Lung Trouble" },
      suggested: ["solar", "battery", "networks", "crypto", "ai", "materials", "computing", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Hill Signal"],
      title: "Tuition dies when the mast fails in Hill Signal",
      scene:
        "Teacher Lila opens the shared tablet at seven and finds a blank screen. The hill mast is down again. Three students who walk an hour for the morning slot turn back with wet books. Their parents paid data packs on credit through the only reseller who owns the tower lease. When the signal dies, the packs still drain. Missed classes stack into failed exams. Failed exams end the scholarship path out of the valley. The teachers’ network prints worksheets when paper lasts, yet the exam board only accepts timed online drills. The reseller will not share mast access with a village mesh. He says the contract is exclusive. Lila watches one bright girl stop coming after her mother chose rice over another top-up. Who builds learning that does not collapse every time one locked mast goes dark?",
      stakeholder: "Village teachers’ network",
      crisisMeters: { local: "Missed Classes", global: "Mast Monopoly", support: "Data Debt" },
      suggested: ["networks", "solar", "battery", "ai", "computing", "vr", "space", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ferry Slip"],
      title: "Dawn fares strand the cleaners at Ferry Slip",
      scene:
        "Nisha finishes the office tower at four in the morning and runs for the first boat. The pier clerk has raised the dawn fare again. Cash only. No monthly pass for night cleaners. She misses the gangway by a minute and watches the ferry pull out with half its seats empty. The next boat is two hours later. Her neighbor’s child waits alone at the compound gate until she returns. Last month a girl from the association was robbed on that long wait. Pier fees fund the landing rights the boat owners renew each season. Workers who scrub the city before sunrise never sit on that renewal board. The association tried a shared van. The bridge toll ate the savings by week two. Nisha texts her sister to hold the child and feels the job tilt toward impossible. Who designs the crossing so the people who clean the skyline can reach home before the risk does?",
      stakeholder: "Cross-water night workers’ association",
      crisisMeters: { local: "Stranded Nights", global: "Pier Fees", support: "Child Risk" },
      suggested: ["transportation", "solar", "battery", "networks", "iot", "ai", "crypto", "drones"],
      visionTheme: "coastal-city",
    }
  ],

  "chem-bio": [
    {
      places: ["Weftbridge Dyeworks Row"],
      title: "Second-use blues on the dye row",
      scene:
        "Rina Mercado holds a cotton swab to a dyer’s upper lip at shift change. The swab comes away pink. Three stalls down, the same pattern shows on a teenager who only mixes mordants. The clinic board already lists nosebleeds as routine. No one calls it routine when the blood keeps coming after the fans are fixed. A grey drum sits behind the dye house with a scratched stencil and a seal that does not match the invoice. The broker who dropped it left before dawn. Row landlords still buy intermediates by the cheapest lot, and the paperwork stops at colorfastness. No one on the floor is paid to ask what else the same chemistry can become when a drum leaves the yard unlabeled. Rina can pad the noses and log the nights. She cannot seal a supply chain that treats dual-use stock as ordinary inventory. Who designs the row so a dyer’s body is not the first sensor for a second use?",
      stakeholder: "Rina Mercado, row occupational health advocate",
      crisisMeters: { local: "Nosebleeds", global: "Grey drums", support: "Seal lag" },
      suggested: ["iot", "ai", "materials", "networks", "drones", "computing", "robots", "nano"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Stonepass Border Dry Port"],
      title: "Lab kits under the wrong code",
      scene:
        "Jonas Veld cracks a crate marked teaching reagents and finds cold packs still sweating. The manifest lists school kits. The inner labels list growth media and a strain code no classroom needs. His glove sticks where a vial wept. The burn line rises before the hazmat cart arrives. Night shift runs with two officers and a handheld that only flags the codes already in the book. Brokers know the gap. They split dual-use labware across mixed pallets and time the gate for the hour when the scanner queue is longest. By morning the crate is either cleared or vanished into a bonded shed. Jonas can hold one box. He cannot staff every dark hour or rewrite every false label alone. The next handler will be someone’s kid on a temp badge. Who designs a dry port that catches intent without freezing the trade a border town lives on?",
      stakeholder: "Jonas Veld, dry-port customs liaison",
      crisisMeters: { local: "Handler burns", global: "False labels", support: "Night gaps" },
      suggested: ["ai", "iot", "drones", "networks", "crypto", "computing", "transportation", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Lowfen Municipal Waterworks"],
      title: "What the outfall never names",
      scene:
        "Marta Singh lifts a sample bottle from the outfall ladder and smells the sweet solvent note before the lab does. Upstream clinics logged gut sickness again after the weekend rain. Kids on the towpath missed school. The plant’s routine panel still returns clean for the usual metals and coliforms. Whatever rode the surge is not on the printed list. The industrial park above the works files discharge under blanket permits, and the outfall pipe has no name for a spike the assay never sought. Marta’s bench stacks samples in a cold room that is already full. She can boil advisories and hand out bottled water. She cannot see a threat the monitoring schedule was never built to read. A parent waits at the gate for a number that means the tap is safe. Who designs waterworks that notice a chemical or biological surprise before a neighborhood stomach does?",
      stakeholder: "Marta Singh, works lab supervisor",
      crisisMeters: { local: "Gut sickness", global: "Blind outfall", support: "Sample pile" },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "synbio", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Cedar Contract Vivarium Park"],
      title: "Loaner strains after closing time",
      scene:
        "Dr. Noah Abebe finds the shared incubator log signed out to a contract bay that emptied at six. The strain ID on the sticky note does not match the park’s approved list. Two techs called in with fevers after a late transfer no supervisor logged. The bay next door rents by the month and sublets bench time to startups that chase speed over paperwork. Loaner vials move in cooler bags between buildings because the official transfer form takes three days and a client wants data tomorrow. Neighbors past the fence already ask why ambulances stop at the gate. Noah can lock one door and swab one hood. He cannot police a park whose business model sells after-hours flexibility as a feature. The next fever may be a false alarm. It may not. Who designs shared animal space so research hustle cannot quietly become an untracked pathogen path?",
      stakeholder: "Dr. Noah Abebe, vivarium biosafety officer",
      crisisMeters: { local: "Staff fevers", global: "Strain sharing", support: "Neighbor fear" },
      suggested: ["gene-sequencing", "synbio", "ai", "iot", "networks", "crypto", "computing", "vr"],
      visionTheme: "learn-city",
    }
  ],

  asteroid: [
    {
      places: ["Sutherland Sky Belt, Northern Cape"],
      title: "Mine glare blanks the Karoo rock watch",
      scene:
        "Naledi Mokoena kills the lodge porch light at 02:10 and still cannot see the southern sweep. Dust from the night haul road hangs like a second sky. The volunteer scopes on the ridge catch only washed stars. A faint rock track that should have been logged before dawn is gone in the glare. Guest rooms stay empty. Tour vans cancel. The cook sends half the staff home without pay. Open-pit floodlights and dust from new mineral claims run all night on provincial permits written for ore, not for dark. Those same permits treat sky darkness as optional. Without clean arcs, the small Karoo network cannot feed early positions into the wider watch. Naledi’s phone holds three angry messages from lodge owners and one quiet note from a student who drove four hours for a night that never opened. Who designs a claim map that keeps both the ore moving and the sky dark enough to catch a rock while there is still time?",
      stakeholder: "Naledi Mokoena, community dark-sky coordinator",
      crisisMeters: { local: "Empty lodges", global: "Sky glare", support: "Permit lock" },
      suggested: ["space", "ai", "computing", "networks", "iot", "drones", "solar", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Goldstone Antelope Valley rim, California"],
      title: "Dish backlog leaves the valley guessing",
      scene:
        "Rosa Delgado stands under Dish 14 with a clipboard that no longer matches the sky. A bearing whine stopped the dish mid-slew before sunrise. The spare sits in a depot three counties away. Civil alert partners keep calling for a refined track on a rock that skimmed the morning catalogs. She has only a stale arc and a polite holding line. Ranch families on the valley rim already ignore the phone trees. Last month’s false tone emptied school lots for nothing. Crews fix deep-space jobs first because the backlog board ranks science contracts above civil follow-up. Hours vanish while the rock’s path widens on paper. Rosa’s nephew asks at dinner whether the next siren means pack a bag or go back to homework. Who redesigns the repair queue so a civilian sky does not go dark between contract priorities?",
      stakeholder: "Rosa Delgado, civil tracking liaison",
      crisisMeters: { local: "Track gaps", global: "Alarm fatigue", support: "Repair queue" },
      suggested: ["space", "ai", "networks", "computing", "iot", "robots", "materials", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Maunakea access communities, Hawaiʻi Island"],
      title: "Time-share freeze after every rock scare",
      scene:
        "Kainoa Hale meets the night crew at the access gate with fresh bad news. Another distant rock headline has frozen the time-share board until further notice. Domes that should rotate stay locked. Guides lose the week’s wages before breakfast. Kupuna who blessed the road feel used when closures come without a shared table. Summit operators chase every new alert into longer blackout windows because the schedule software treats community nights as the easiest block to cut. Trust frays in the parking lot. A young technician who grew up in Waimea turns his truck around rather than cross a line of quiet protest. Kainoa holds both the operations radio and the community list and cannot satisfy either on the same calendar. Who writes a sky schedule that keeps watch time alive without treating local livelihoods as the first switch to flip?",
      stakeholder: "Kainoa Hale, summit operations mediator",
      crisisMeters: { local: "Closed domes", global: "Wage shock", support: "Trust fracture" },
      suggested: ["space", "ai", "networks", "computing", "vr", "iot", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Esrange fringe, Kiruna municipality"],
      title: "Kinetic stack waits while the range idles",
      scene:
        "Ingrid Larsson walks the snow edge of the range road where the reindeer tracks stop short of the new fence. A kinetic interceptor stack sits crated in the hangar, cleared on paper, idle in practice. Herders moved the animals twice this month for drills that never lit. The café in town cut winter hours. Liability binders from three agencies still disagree on whose insurance covers a failed divert test over shared grazing land. Until the signatures align, the range cannot run the full sequence that would prove a rock could be shoved off a city-bound line. Each delay leaves the hardware cold and the herding routes uncertain. Ingrid’s counterpart in the samee village will not meet without a map that shows both the corridor and the calving ground. Who designs a test range that can prove a planetary shove without freezing the livelihoods that already live under the flight path?",
      stakeholder: "Ingrid Larsson, range civil-integration lead",
      crisisMeters: { local: "Mission stall", global: "Herd stress", support: "Liability gridlock" },
      suggested: ["space", "robots", "materials", "print3d", "ai", "computing", "networks", "nuclear"],
      visionTheme: "rebuild-city",
    }
  ],

  weather: [
    {
      places: ["Drawdown Flats"],
      title: "When the pivot runs dry",
      scene:
        "At 4:10 a.m., Rosa Mendez climbs the ladder on pivot seven and lays her palm on the gearbox. The metal is cool. The arm should already be hissing water across the milo. It is not. In the ditch below, the last trickle dies against cracked mud. Her phone shows the co-op allotment cut again overnight. The aquifer under Drawdown Flats has been dropping a foot a year, yet the county still prices water as if the old snowpack will return. Neighbors keep adding longer laterals and deeper pumps to chase what is left. Each new well steals pressure from the next. Rosa’s board meets at noon. If she votes to idle a third of the circles, three families miss loan payments before harvest. If she keeps pumping, the shallow home wells on the east side go dry by August. The harm is already in the kitchen: her sister boils laundry water and skips baths for the kids. The driver keeps turning: extraction rules written for wet decades, enforced on a thinning basin. How do you redesign irrigation rights and tools so the co-op can grow food without mining the last of the water out from under its own houses?",
      stakeholder: "Irrigation co-op president",
      crisisMeters: { local: "Dry Wells", global: "Wasted Water", support: "Farm Debt" },
      suggested: ["iot", "ai", "solar", "battery", "drones", "space", "genetic-engineering", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Ember Ridge"],
      title: "Orange noon at Ember Ridge",
      scene:
        "Nurse Calder holds a paper mask over a six-year-old’s face while the clinic skylight turns the color of rust. Outside, the ridge is a wall of dead pine. Beetle-kill timber stands unthinned for miles because salvage bids collapsed and burn permits stall in three offices. By noon the air quality app reads hazardous, then quits updating when the tower loses power. The waiting room fills with coughs and watery eyes. Calder’s nebulizer supply is down to eight kits. A logger’s wife asks why the county still lets pile burns on clear days in shoulder season. Calder knows the answer is habit and budget: crews clear roads, not crown fuels, and homeowners rebuild with the same gutters that catch embers. The smoke is the harm children breathe today. The driver is a fuel-loaded landscape managed for last century’s fire, still producing the next plume. Who redesigns care and land practice together so a ridge clinic is not the only lung the county has left?",
      stakeholder: "County public health nurse",
      crisisMeters: { local: "Smoke Days", global: "Dead Timber", support: "Clinic Crowds" },
      suggested: ["drones", "iot", "ai", "space", "networks", "robots", "materials", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Levee Bend"],
      title: "The river takes the bend again",
      scene:
        "Parish floodplain manager Ellis stands in boot-deep water on what was Mrs. Fontenot’s porch last spring. The river has taken the same bend a third time in six years. Sandbags from the night shift sag where the borrow pit dirt never compacted. Upstream, a new warehouse slab and a straightened drainage ditch dump peak flow faster than the old levee geometry can turn it. Ellis’s maps still show a hundred-year line drawn when the basin held more swamp. Insurance non-renewals hit the block first. Two families sleep at the high school again. Ellis can raise a temporary wall by Friday, or he can argue for setbacks that cost the parish industrial tax base. The water in the hallway is the harm people feel now. The driver is development and channel work that keep sharpening the flood peak toward the same curve of homes. What do you build—and what do you refuse to rebuild—so Levee Bend stops paying for the same mistake at higher water?",
      stakeholder: "Parish floodplain manager",
      crisisMeters: { local: "Floodwater", global: "Levee Gaps", support: "Displaced Families" },
      suggested: ["iot", "ai", "drones", "materials", "robots", "space", "networks", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Windrow Court"],
      title: "Sirens after the roof",
      scene:
        "After the second siren, Tanya Cole counts units with blue tarps from the residents’ council porch. Windrow Court sits on the open edge of town where derecho winds hit full run. Lot ties on half the homes are the original straps from the nineties. The park owner mails notices about skirting and anchors, then raises lot rent the month inspections fail. Last night’s gust peeled Tanya’s neighbor’s roof and threw a porch chair through a windshield. The school gym already told them it is at capacity. Tanya’s list has fourteen names with nowhere quiet to sleep. She can push for a bond on community shelters, or she can fight for upgrade funds that landlords may pocket without lowering risk. Torn metal and sleepless kids are the harm in the court tonight. The driver is cheap siting and weak tie-down rules that keep placing light homes in the wind’s path without the hardware storms now demand. Who designs ownership, anchors, and refuge so a mobile home street is not a disposable line in every severe weather warning?",
      stakeholder: "Mobile home residents' council lead",
      crisisMeters: { local: "Wind Damage", global: "Weak Tie-Downs", support: "Shelter Space" },
      suggested: ["materials", "print3d", "robots", "energy", "battery", "solar", "networks", "drones"],
      visionTheme: "social-city",
    }
  ],

  mideast: [
    {
      places: ["Dust Road Clinic Row"],
      title: "Ambulances pay twice at the gate",
      scene:
        "Layla brakes the clinic van at the outer barrier before dawn. In the back, a laboring mother grips the rail and counts through another wave. The first guard takes the paper fee and waves them toward a second chain across the same dust road. The second booth belongs to a different faction. Same corridor. New receipt.\n\nThe radio crackles with a second call from the birth floor. The sterilizer is already warm. The midwife is waiting. Minutes stretch while both booths argue whose stamp is valid today. Cash leaves the glove box twice. The oxygen cylinder stays strapped and unused.\n\nCheckpoint crews rotate by roster and keep ledgers in cigarette packs. Clinics that refuse the double toll get held until the shift changes. Drivers learn the prices the way they learn potholes. The road that should move care becomes a toll farm on fear.\n\nBy the time the van reaches Clinic Row, the mother’s bleeding has changed. Layla’s hands are steady on the stretcher and her mind is not. Staff who can leave already took night shifts across the line. Who designs passage so a birth does not pay ransom to two gates?",
      stakeholder: "Cross-community clinic board",
      crisisMeters: { local: "Missed Care", global: "Checkpoint Fees", support: "Staff Flight" },
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Saffron Lane Souk"],
      title: "Shutters rise only after the cut",
      scene:
        "Yusuf rolls up the metal shutter on his spice stall and finds the lane half empty again. The morning cut came before the first bus. Men with armbands walked the alley and named a street toll for “protection of trade.” Those who paid early opened. Those who argued kept steel down.\n\nA neighbor’s son leans on a shutter and watches. He used to haul sacks for three stalls. Today there is no haul. Idle hands gather near the tea cart where rumors price the next collection. Buyers from the next quarter stop at the mouth of the lane and turn back when they see the armbands.\n\nThe fair-toll association keeps a paper book of who paid whom. The book does not match the men on the street. Each faction treats the souk as a cash machine tied to the last flare-up. Trust frays in public. A merchant who shares a table with the wrong cousin loses customers without a word spoken.\n\nYusuf measures saffron he cannot sell and counts apprentices he cannot keep. Empty stalls teach a harder lesson than closed borders. How do neighbors design a market lane that stays open without feeding the toll that empties it?",
      stakeholder: "Merchants’ fair-toll association",
      crisisMeters: { local: "Empty Stalls", global: "Street Tolls", support: "Idle Youth" },
      suggested: ["networks", "ai", "crypto", "solar", "iot", "drones", "transportation", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Rubble Lane Blocks"],
      title: "Winter walls that never rise",
      scene:
        "Amira chalks a square on the slab where her kitchen wall should stand by first frost. The cooperative stacked rebar and bags at dawn. By noon half the stack is gone. Tire tracks cut fresh lines through the dust toward the ring road.\n\nNight watch was supposed to rotate. Two families argued over whose deed map was older and left the corner unguarded. In the morning the good panels are missing and the cheap ones remain. Children sleep under tarps that snap in the wind. Rain finds every seam.\n\nSuppliers will only deliver to the lane if someone signs for loss. No one signs. Claim papers from three offices name different owners for the same stairwell. Rebuild money sits in accounts while theft turns materials into a second black market. Each delay hardens the story that nothing finished here stays.\n\nAmira’s youngest coughs through the damp. The cooperative can pour a footing. It cannot pour trust into a title fight. Who designs a rebuild that walls rise faster than the theft and the deed quarrel can tear them down?",
      stakeholder: "Tenants’ rebuild cooperative",
      crisisMeters: { local: "Exposed Homes", global: "Material Theft", support: "Deed Fights" },
      suggested: ["print3d", "materials", "robots", "solar", "drones", "ai", "networks", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Twin Bank Canals"],
      title: "The canal gate becomes a weapon",
      scene:
        "Hassan walks the ditch at first light and finds his tomato rows already curling. Overnight the shared gate on the high canal was cranked shut on his bank’s side. Across the water, a cousin’s field still glitters with a full head. Same family name. Different checkpoint flag painted on the winch house.\n\nHe calls the both-banks council. Phones ring into arguments about whose turn the schedule named. The iron wheel does not care about the paper roster. Whoever holds the padlock holds the crop. Downstream plots crack while upstream plots drink.\n\nLocal strongmen learned that a gate lever buys loyalty faster than a speech. Each season’s shortage becomes a ledger of favors. Farmers mortgage next harvest to tank water by truck. Debt climbs while the soil turns to dust in sight of a full channel.\n\nHassan’s daughter asks if they will plant again. He has seed and no sure flow. The council can meet until dark and still leave the winch in one fist. How do both banks design water control that feeds fields instead of arming the next quarrel?",
      stakeholder: "Both-banks water users’ council",
      crisisMeters: { local: "Crop Failure", global: "Gate Capture", support: "Family Debt" },
      suggested: ["iot", "solar", "ai", "networks", "space", "drones", "crypto", "computing"],
      visionTheme: "food-city",
    }
  ],

  nuclear: [
    {
      places: ["Clearwater Silo Road, northern Great Plains"],
      title: "Sirens over the grain elevators",
      scene:
        "Capt. Maya Brooks keys the capsule hatch at 03:12 and the night siren still rolls across the wheat. On Silo Road the elevators stand black against the stars. Her headset carries a second tone that is not weather. It is the short-fuse alert that means the crew has minutes, not hours, to sort real from ghost.\n\nThe board lights a track that should not be there. Doctrine says she authenticates and reports up. The phone tree to the farmhouses is slower than the clock on the wall. Her sister’s place sits three miles past the outer fence. Kids sleep under a roof that has heard too many drills this season.\n\nMaintenance still patches the old launch wiring on a cycle built for peacetime. Crews rotate on tight sleep. The authentication steps stack while the grain trucks idle at the county line, drivers watching the same sky. Speed is treated as safety. Doubt is treated as delay.\n\nMaya’s hand stays on the confirm switch longer than the checklist likes. One wrong hold and the wing looks soft. One fast send and a family on Silo Road wakes to a sky that does not forgive. Who designs the minutes between a siren and a human veto when the elevators are full and the fuses keep getting shorter?",
      stakeholder: "Capt. Maya Brooks, missile combat crew commander",
      crisisMeters: { local: "Night Sirens", global: "Short Fuses", support: "Family Fear" },
      suggested: ["ai", "computing", "networks", "iot", "vr", "quantum-internet"],
      visionTheme: "food-city",
    },
    {
      places: ["Floe Watch Headland, Labrador coast"],
      title: "Ice clutter looks inbound",
      scene:
        "Sgt. Inuk Arnaq taps the fusion screen as pack ice calves off the headland. The coastal radar paints a hard return that walks like a missile track. Wind shears the spray. The clinic radio downstairs is already busy with a fisherman who twisted through the night ice.\n\nHold time is the rule: wait for a second sensor before anyone lifts a phone inland. The second sensor is late. Fog sits on the dish. A drone run is grounded by the same gale that makes the ice look fast. The track does not vanish. It only softens and hardens again.\n\nThe watch floor still fuses cold-war range gates with newer feeds that disagree on weather clutter. Operators learn to trust the loudest paint. Upstream desks want clean numbers. Local crews want another minute of sky truth. The clinic downstairs treats panic the same night the board lights red.\n\nInuk’s thumb hovers over the escalate key while his cousin waits for a medic on the shore road. A false inbound empties the headland of sleep. A slow call leaves no margin if the paint is real. Who designs the hold when ice, fog, and fear all look like flight paths?",
      stakeholder: "Sgt. Inuk Arnaq, sensor fusion lead",
      crisisMeters: { local: "False Tracks", global: "Hold Time", support: "Clinic Strain" },
      suggested: ["space", "ai", "networks", "iot", "drones", "computing"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Iron Quay Liaison Yard, lower Danube corridor"],
      title: "Drills without a shared clock",
      scene:
        "Col. Elena Popa pins a paper strip to the glass map as river fog lifts off Iron Quay. A partner unit has started a readiness drill on a clock her desk never received. Barges slow at the bend. Dockworkers hear jet noise and do not know which flag owns the sound.\n\nHer liaison line rings with three versions of the same hour. One side swears the notice went out. Another side never opened the channel. Market stalls along the quay pull shutters early. A mother asks the gate guard if the bridge will close before school lets out.\n\nDeconfliction still runs on separate nets, separate crypto habits, and courtesy calls that arrive after wheels are up. Each headquarters protects its own surprise. Shared time is treated as a favor, not a rail. Civilians read every unannounced roar as the real thing.\n\nElena can freeze her own side and look weak, or let the drill finish and watch trust crack on the quay. One more hidden exercise and the next true warning may meet empty phones. Who designs a shared clock when pride and secrecy keep writing different hours on the same river?",
      stakeholder: "Col. Elena Popa, joint deconfliction desk",
      crisisMeters: { local: "Civilian Panic", global: "Hidden Drills", support: "Trust Gap" },
      suggested: ["networks", "crypto", "space", "ai", "vr", "drones"],
      visionTheme: "social-city",
    },
    {
      places: ["Granite Command Hollow, Appalachian foothills"],
      title: "Near-send on patch night",
      scene:
        "Eng. Kenji Okada watches the status wall blink amber as the overnight patch rolls across Granite Command Hollow. Deep under the ridge, a command link drops for eleven seconds. The backup path comes up dirty. For a breath the system offers a launch path with one fewer human veto than doctrine requires.\n\nHe kills the auto-advance with a hard stop. The room exhales. Topsides, the hollow town already felt the generator surge. Porch lights flickered. A diner cook texts his brother on the night shift: is it weather or worse.\n\nPatches still ship on a calendar set by vendors and distant budgets. Crews load updates while live traffic rides the same rails. Redundancy is drawn on slides. On the floor, failover steals authority from the people meant to hold it. Each near-miss trains operators to click faster next time.\n\nKenji can freeze every patch and watch the stack rot, or keep the cadence and gamble another eleven-second hole. The town counts surges now. Who designs change control when a software night can shrink the human hand on the last switch?",
      stakeholder: "Eng. Kenji Okada, C3 assurance lead",
      crisisMeters: { local: "Near Misses", global: "Veto Shrink", support: "Town Anxiety" },
      suggested: ["computing", "ai", "networks", "quantum-internet", "robots", "iot"],
      visionTheme: "energy-city",
    }
  ],

  slavery: [
    {
      places: ["Ranong Channel Boats"],
      title: "Papers locked below the ice line",
      scene:
        "Before dawn, medic Arun climbs the gunwale of a long-tail that still smells of diesel and fish ice. A deckhand named Som holds out a swollen hand. The cut is deep. Salt has already found it. Arun opens his kit on a crate and starts to clean.\n\nThe skipper blocks the ladder. No shore run, he says. The buyer wants the hold full by noon. Som’s passport is in a zip bag in the wheelhouse, under a padlock the crew cannot open. Wages are counted against food, fuel, and “recruitment fees” that never finish. Each trip resets the debt a little higher.\n\nSom works the next set with a bandage that will not hold. If he jumps at the pier, he has no paper and no name the port will honor. Arun can stitch a hand. He cannot unlock a life tied to a catch quota. Who designs proof of freedom that travels with the crew, not with the boat?",
      stakeholder: "Port clinic outreach medic",
      crisisMeters: { local: "Night Injuries", global: "Crew Debt", support: "Held Papers" },
      suggested: ["iot", "networks", "ai", "crypto", "drones", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Sambas Palm Blocks"],
      title: "The scale that never zeros the loan",
      scene:
        "Teacher Rina marks attendance on a cracked phone under the zinc roof of the block school. Only nine children sit on the mat. The rest are already in the rows, hauling loose fruit because the morning weigh-in ran light.\n\nAt the shed, the clerk writes wet weight with a pencil and a scale that sits on uneven planks. Families live in company barracks. Rent, rice, and tools come as advances. The ledger never quite clears. Parents who complain lose their bunk and their child’s school slot in the same afternoon.\n\nRina’s brightest pupil, Dewi, falls asleep mid-lesson with sap still on her wrists. A harvest target is eating the school day. The plantation does not need to lock a gate. The loan and the scale do the work. Who designs a harvest record children and teachers can trust when the yard owns both the weight and the roof?",
      stakeholder: "Plantation school teacher",
      crisisMeters: { local: "Missed School", global: "Weigh Fraud", support: "Barrack Rules" },
      suggested: ["crypto", "iot", "ai", "networks", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Bhadohi Loom Lanes"],
      title: "Knot counts after midnight",
      scene:
        "Counselor Meera steps into a lane workshop where the bulbs hum after ten. A boy named Kabir ties knots on a border that will ship as a luxury rug. His fingers are quick. His eyes are red. The order board still shows two thousand knots to go.\n\nThe contractor smiles for the daytime audit tablet, then sends the children back when the van leaves. Families took festival advances against the loom. The debt sits on the household book, not the brand tag. If Kabir stops, the advance turns into a threat at the door.\n\nMeera can offer a shelter bed. She cannot erase a loan that buys silence from parents who fear the street more than the night shift. The rug looks clean in the showroom. The hours that made it do not. Who designs a chain of proof that follows the knot, not the staged visit?",
      stakeholder: "Child-rights counselor",
      crisisMeters: { local: "Child Hours", global: "Family Advances", support: "Fake Audits" },
      suggested: ["ai", "networks", "crypto", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Kolwezi Dig Trenches"],
      title: "Ore sacks instead of schoolbags",
      scene:
        "Nurse Amina sets a folding stool at the edge of a cobalt trench and waves the next digger forward. A teenager named Tatu lowers a sack and grips his lower back. The pain is old for a body this young. Dust coats his teeth.\n\nPayment is a paper chit from the pit boss, redeemable at a kiosk that trims the rate for “tools” and “security.” No badge, no contract, no way to refuse a deeper cut when the buyer’s truck is waiting. Children slip into the line when school fees fail. The ore still moves.\n\nAmina tapes Tatu’s strain and sends him home with advice he cannot take. Tomorrow the chit system will call him back before sunrise. Batteries somewhere else will shine. This trench will keep filling sacks with bodies that have no exit path. Who designs a mineral path that pays the digger in the open, not the boss in the shade?",
      stakeholder: "Mobile health-post nurse",
      crisisMeters: { local: "Spine Strain", global: "Chit Pay", support: "Pit Bosses" },
      suggested: ["drones", "iot", "ai", "robots", "networks", "crypto", "computing"],
      visionTheme: "energy-city",
    }
  ],

  women: [
    {
      places: ["Riverside Maternity Shift Gate"],
      title: "The walk home after midnight",
      scene:
        "Priya clocks out at 12:40 a.m. and stands under the single working floodlight at the maternity gate. The last staff shuttle left at eleven. The schedule still assumes someone will pick her up. No one does. She checks the alley toward the bus stop. Two scooters idle with engines low. Last month a colleague was followed to her building and quit the next week. The hospital posts a safety flyer by the time clock. It does not move bodies after dark. Ward managers fill night rosters with the nurses who live farthest because day shifts are already claimed by seniors with seniority and cars. The gate guard shrugs when she asks about a second run. Fuel is tight. Drivers refuse the late loop without hazard pay the budget never holds. Priya texts her sister to stay awake on the line until she reaches the main road. Her hands shake on the phone. If the night team keeps bleeding people, the birth floor loses the only hands who know the crash cart. Who designs the last mile of a shift so the nurse who caught a life can get home without becoming the next story?",
      stakeholder: "Night-shift nurses' safety caucus",
      crisisMeters: { local: "Night Fear", global: "Shuttle Gap", support: "Staff Loss" },
      suggested: ["networks", "solar", "iot", "transportation", "ai", "battery", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Old Bund Land Registry"],
      title: "The deed still needs his name",
      scene:
        "Meera sets the death certificate on the counter and asks for the plot map in her own name. The clerk does not look up. He taps the old ledger rule: transfer needs the husband’s signature or a court order that takes years. Her husband died in the spring floods. The rice field still feeds her two children. A cousin already fences the far bund and tells neighbors the widow will sell cheap. She has farmed that soil since she was sixteen. Without the title she cannot open a seed loan. Without the loan the next planting slips. The registry still runs on paper books keyed to male heads of household because that is how the district coded ownership when the canal was dug. Women wait on the bench with folders. Men walk out with stamps. Meera’s daughter asks if they will lose the mango tree by the path. The answer sits in a signature line no living hand can fill. Who redesigns the deed so a woman who works the land can hold it when the name on the page is gone?",
      stakeholder: "Widows' land rights desk",
      crisisMeters: { local: "Field Loss", global: "Title Block", support: "Legal Limbo" },
      suggested: ["networks", "ai", "crypto", "computing", "space", "iot", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["East Yard Trade School"],
      title: "The welding bay closes at dusk",
      scene:
        "Asha lifts her helmet as the shop bell rings at 5:15. The welding bay goes dark. Male apprentices stay for evening practice because the night guard knows their uncles. She is told to leave with the day light. Her bead work is clean. The instructor says so. Still the advanced torch block is scheduled after supper, and the gate list does not include her name. At home her mother keeps the shop stool warm and says the family needs her on the counter by six. The trade school wants more women in the yard for the new rail contracts. The timetable was written around men who can stay late without a second shift of care. Asha misses the certification hours. The contractor hires from the night list. She walks out past the locked bay and counts the weeks until the exam. One missed block becomes a closed door. Who builds practice time so skill, not the hour the gate shuts, decides who gets the ticket?",
      stakeholder: "Women apprentices' coalition",
      crisisMeters: { local: "Skill Block", global: "Bay Lock", support: "Family Pull" },
      suggested: ["vr", "print3d", "networks", "ai", "solar", "robots", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Lakeview Family Planning Counter"],
      title: "The form still wants his signature",
      scene:
        "Nita slides her card across the counter and asks for the implant refill. The clerk pulls a form with a spouse-consent box. Her husband works two districts away and will not sign. Last time she left without care and missed three weeks of wages when the bleeding returned. The midwife in the back room knows her history. Policy still routes long-acting methods through a husband’s name because the district copied an old ministry template and never rewrote the queue. Women who come alone get a counseling slip and a smile. They do not get the tray. A neighbor whispers that the clinic marks “difficult” on charts when women push. Nita’s youngest is two. She cannot risk another pregnancy and keep the market stall. She stands with the unsigned form while the clock runs on the only afternoon she could close shop. Who designs the consent path so a woman’s body is not held at the desk by a signature that will not come?",
      stakeholder: "Community midwives' network",
      crisisMeters: { local: "Care Denial", global: "Consent Gate", support: "Clinic Stigma" },
      suggested: ["networks", "ai", "iot", "computing", "solar", "crypto", "drones"],
      visionTheme: "care-city",
    }
  ],

  education: [
    {
      places: ["Marsh Bend"],
      title: "Flood weeks erase a grade in Marsh Bend",
      scene:
        "Tanya Brooks stands in the levee parking lot at dawn with a milk crate of dry workbooks. The river has dropped two feet. The school still smells like wet carpet. She tapes a paper schedule to the gym door so parents can see which days count. The district clock does not pause for water. Attendance is seat time or nothing. After three flood weeks last spring, her son’s class skipped whole units and never got them back. Teachers push what is left into the dry months. Kids who missed the foundation sit quiet in the back. The bus routes reopen on paper while side roads stay soft. Tanya walks the same families to the temporary room and watches the tally sheets fill with absences the system will treat as failure. Funding follows the days kids are marked present in a building the river keeps claiming. Who designs learning time that survives the weeks the water owns the road?",
      stakeholder: "Tanya Brooks, PTA lead and levee witness",
      crisisMeters: { local: "Missed Days", global: "Flood Bias", support: "Catch Up" },
      suggested: ["networks", "ai", "solar", "battery", "vr", "computing", "drones", "materials"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Packingtown"],
      title: "English-only exams strand Packingtown fifth-graders",
      scene:
        "Hodan Ali pins a translated study sheet to the break-room corkboard before her plant shift. Fifth-graders from the packing lines’ families take the same state exam as every other school. The booklet is English only. Her daughter can explain a science idea at the kitchen table in Somali and stall on the same idea in print. Aides who could bridge the gap were cut when the plant schedule shifted nights. The school still scores promotion on that single test window. Parents who work kill-floor hours cannot sit the practice nights. Hodan walks kids through word lists between sanitation rounds and watches bright students freeze on directions they would clear if someone met them halfway. The rule treats language as a finished gate, not a path. Who designs the proof of learning so a packing-town fifth grade is not left outside the door?",
      stakeholder: "Hodan Ali, plant nurse and parent advocate",
      crisisMeters: { local: "Reading Gap", global: "Language Rules", support: "Aide Shortage" },
      suggested: ["ai", "networks", "vr", "computing", "transportation", "iot", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Heat Ridge"],
      title: "Blackout classrooms empty Heat Ridge by noon",
      scene:
        "Luis Ortega unlocks the rec-center side door at 10:40 and finds half his after-school roster already gone. The middle school dismissed early again. Classrooms hit heat limits when the old circuit trips and the window units die. Fans sit still. Kids press water bottles to their necks and leave before noon. The district calendar still counts a short day as a full day of instruction if the doors opened. Luis runs drills in the shaded lot and watches homework folders stay closed because the morning lesson never finished. Families pull younger siblings home when the power blinks. The grid was built for evening peaks, not for a ridge of portable classrooms baking through July. Teachers lose the hour when attention is still possible. Who designs school power so a heat day is not a lost day?",
      stakeholder: "Luis Ortega, after-school coach",
      crisisMeters: { local: "Heat Days", global: "Power Gaps", support: "Home Care" },
      suggested: ["solar", "battery", "networks", "ai", "computing", "vr", "iot", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Millbridge"],
      title: "Teen caregivers miss the credit clock in Millbridge",
      scene:
        "Keisha Dunn signs her nephew into the clinic waiting room and checks the night-class portal on her phone. The seat time bar is red again. She is seventeen, raising two younger cousins while her aunt works doubles at the mill. Credit recovery meets only on campus, three evenings a week, doors locked at the bell. When a fever keeps a child home, Keisha stays home too. The software marks her absent without a care code that counts. Counselors tell her to choose school or family as if the choice were free. She finishes worksheets at the clinic side table and still falls short of the hours the diploma demands. The rule assumes a student who can leave the house on a fixed clock. Millbridge keeps producing graduates who had to disappear to keep toddlers safe. Who designs credit so caregiving does not erase the transcript?",
      stakeholder: "Keisha Dunn, kinship caregiver and night student",
      crisisMeters: { local: "Credits Lost", global: "Seat Rules", support: "Care Load" },
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
      crisisMeters: { local: "Infected Cuts", global: "Waste Dumping", support: "Clinic Access" },
      suggested: ["gene-sequencing", "iot", "ai", "materials", "networks", "drones", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Station Road Pilgrim Lodge"],
      title: "Shared cistern cough fills Station Road Lodge",
      scene:
        "Imam Karim unlocks the courtyard gate before dawn and finds three men already coughing into their sleeves by the ablution trough. The cistern under the lodge is the only water for washing, cooking, and the night prayer rinse. Last week a traveler from the coast slept two nights, left a dry cough, and moved on. Now the bunk room sounds like a broken engine. Karim wants to close the taps and buy tanked water, but the lodge runs on pilgrim fees that barely cover rice and mats. The municipal line stops at the station plaza. Haulers fill the underground tank from mixed sources whenever the price dips, and no one tests what arrives. Men who cannot afford a guesthouse keep coming because the lodge is the trust they know. If Karim turns them away, they sleep on the platform and lose work. If he keeps the cistern open, the cough walks home with every departing guest. Who designs water and welcome so faith hospitality does not become the quiet amplifier of an outbreak?",
      stakeholder: "Imam Karim, lodge warden",
      crisisMeters: { local: "Cough Spread", global: "Shared Water", support: "Lost Wages" },
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Old Quay Fish Landing"],
      title: "Gutting rinse sickens Old Quay landings",
      scene:
        "Nia slits a mackerel on the wet board and rinses her knife in the same bucket the boat used at the rail. By mid-morning her stomach twists. Two other women from the association leave the tables early, pale and shaking. The quay has no separate wash line. Ice melt, blood, and bilge water drain into the trough that everyone dips for a quick clean before the buyers shout. Harbor rules still treat rinse water as the boats’ problem, not the market’s. Captains save time by pumping over the side into the shared channel that feeds the gutting boards at low tide. Nia’s association can fine members for dirty knives and lose the morning sale, or keep pace and watch the same gut illness return every hot week. The fish must move before noon or the price collapses. Who redesigns the landing so speed to market does not keep recycling sickness through the same rinse?",
      stakeholder: "Nia, women’s fishers association",
      crisisMeters: { local: "Gut Illness", global: "Dirty Rinse", support: "Market Days" },
      suggested: ["gene-sequencing", "iot", "synbio", "materials", "networks", "ai", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Maple Primary School Yard"],
      title: "Playground pump empties Maple Primary desks",
      scene:
        "Ms. Okonkwo counts empty seats after break and stops at twelve. The children who drank from the yard pump after football are the ones missing. A girl returns with a note: vomiting through the night, no strength for the walk. The pump is the only water the school can offer between lessons. The well under it sits downhill from latrines the township never fully lined. After heavy rain the taste turns metallic and sweet. District maintenance still schedules the school on the same slow circuit as empty lots, so repairs wait while attendance drops. Parents pull healthy siblings too, afraid of whatever rides the handle. Okonkwo can lock the pump and watch concentration fail in the heat, or leave it open and keep sending homes the same sickness. Exam week is three weeks out. Who designs school water so a playground drink stops being the quiet reason desks go empty?",
      stakeholder: "Ms. Okonkwo, head teacher",
      crisisMeters: { local: "Sick Kids", global: "Bad Well", support: "Class Days" },
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
