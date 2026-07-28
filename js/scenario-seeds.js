/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: 2026-07-28T06:15:36.908Z
 * Source: mixed ai=43 local=0
 * Themes: 43
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
 * Prose: Hemingway clarity for a smart high-school senior; introduce jargon on first use.
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
        "On a Friday night the bay fills with gunshot and wreck cases. Dr. Ramirez still sees the bleeding and the pulse with her own hands. A new scoring system ranks each patient in seconds and locks the order of the OR. Last month it buried a quiet belly bleed behind a louder but stable chest wound; the quiet patient crashed in the hall. Nurses now wait for the green light on a screen before they move a stretcher. The hospital bought the system to cut lawsuits and speed charts. Vendors keep tuning it on remote data so the lock gets tighter every quarter. Ramirez can still shout, but the board treats a low score as safer than her judgment.",
      stakeholder: "Dr. Ramirez, trauma attending",
      pressureKeys: ["Missed Crises", "Hard Locks", "Liability Push"],
      suggested: ["ai", "computing", "networks", "iot", "vr", "robots"],
      visionTheme: "care-city",
    },
    {
      places: ["King County Emergency Call Center, Seattle"],
      title: "The call router that quiets the wrong voice",
      scene:
        "Aisha has worked the night board for twelve years. She knows the shake in a voice when someone is hiding from a partner. The new router listens first. It ranks urgency, language, and how long the call might take, then parks some callers in a quiet queue or drops them to a bot. Last week a soft-spoken elder with chest pain waited while the system chased a clearer, shorter call. Families on the line hear hold music and think help is coming. Managers praise the average handle time. The vendor updates the ranking model from city-wide stats no one in the room can open. Each update makes the quiet calls easier to sideline.",
      stakeholder: "Aisha, veteran call-taker",
      pressureKeys: ["Slow Help", "Auto Drops", "Handle Time"],
      suggested: ["ai", "networks", "computing", "iot", "space", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Westlands Water District Allocation Desk, Fresno County"],
      title: "The ditch AI that starves the small orchard",
      scene:
        "Elena’s almonds are browning at the edges while the canal two fields over still runs for a bigger neighbor. The district now lets an allocation model set weekly cuts. It reads soil probes, market prices, and bond covenants, then posts numbers no grower can fully trace. Small orchards without perfect sensor coverage look like waste on the map. Elena trucked water last summer and still lost a block of trees. Staff say the model protects the district’s credit rating and stops fights at the counter. Each dry season the same black-box rules tighten. The harm is local thirst and empty limbs; the driver is an automated cut that favors clean data and big paper over a living grove.",
      stakeholder: "Elena, small orchard operator",
      pressureKeys: ["Crop Stress", "Opaque Cuts", "Bond Rules"],
      suggested: ["ai", "iot", "networks", "computing", "drones", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["MBTA Operations Control Center, Boston"],
      title: "Buses that skip the night-shift clinic stop",
      scene:
        "Marcus builds the night pad and still rides the 28 when his shift ends. Cleaners and clinic aides used to catch the last bus home from the stop by the community health center. A new schedule engine now kills low-ridership stops to hit cost targets. The model treats empty seats as failure, so it skips the clinic corner after nine. Workers wait in the cold or pay for cars they cannot afford. Dispatch screens glow green when the on-time score rises. The same engine learns from every skipped run and recommends deeper cuts. Riders feel stranded; the system keeps optimizing away the stops that serve people who move when the city is quiet.",
      stakeholder: "Marcus, bus scheduler and ATU member",
      pressureKeys: ["Stranded Riders", "Skip Logic", "Cost Targets"],
      suggested: ["ai", "networks", "computing", "transportation", "iot", "self-driving", "battery"],
      visionTheme: "coastal-city",
    }
  ],

  genocide: [
    {
      places: ["Goma Central Hospital Records Wing"],
      title: "Ward lists sold after midnight",
      scene:
        "After the night shift, Esperance Mukamana locks the records room and still hears phones buzz in the alley. Families crowd the gate at dawn looking for kin who never came home from the wards. Someone is copying admission lists—names, neighborhoods, and group marks—and selling the paper after midnight. The buyers use those lists to pick who gets stopped on the road home. Fear keeps patients from seeking care. The list trade keeps feeding the hunt.",
      stakeholder: "Night-shift nurse Esperance Mukamana",
      pressureKeys: ["Missing kin", "List sales", "Night fear"],
      suggested: ["ai", "networks", "crypto", "computing", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Wau Relief Consignment Yard"],
      title: "Ration cards that starve a block",
      scene:
        "On Block 7 the sacks arrive, but half the doors stay shut. Kids skip meals while the yard stamps cards for favored clans first. Block leader Nyibol Deng watches names get crossed off with no appeal. A small circle of gate clerks and elders control who counts as eligible. Hunger spreads on the denied streets. The card racket keeps turning relief into a weapon against the wrong surnames.",
      stakeholder: "Block leader Nyibol Deng",
      pressureKeys: ["Hunger", "Card denial", "Clan capture"],
      suggested: ["drones", "networks", "ai", "space", "crypto", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Prizren Municipal Scholarship Board"],
      title: "Tablets that fail one language",
      scene:
        "Teacher Lirije Krasniqi hands out loaner tablets for the city exam prep. Half the screens freeze on one language pack and dump those students from the practice queue. Parents learn their kids will never clear the score cut. A few board members quietly set the software defaults and the appeal rules. Futures close for one speech community. The board’s capture keeps baking exclusion into every new device drop.",
      stakeholder: "Teacher Lirije Krasniqi",
      pressureKeys: ["School bans", "Lost futures", "Board capture"],
      suggested: ["ai", "networks", "vr", "computing", "crypto", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Sittwe Jetty Labor Desk"],
      title: "Crew badges that never return",
      scene:
        "Boats leave at first light with stamped crew badges. Some badges never come back to the rack. Families wait on the jetty with empty baskets while other crews unload full holds. Jetty steward Aung Myint sees which names get temporary badges and which get permanent ones. Missing fishers leave whole lanes hungry. The badge racket keeps marking who is safe to vanish at sea.",
      stakeholder: "Jetty steward Aung Myint",
      pressureKeys: ["Missing fishers", "Hunger", "Badge rackets"],
      suggested: ["drones", "networks", "ai", "space", "transportation", "iot"],
      visionTheme: "ocean-city",
    }
  ],

  poverty: [
    {
      places: ["Sorting Lane"],
      title: "The tip owns the pickers on Sorting Lane",
      scene:
        "Before dawn on Sorting Lane, families climb the open dump to pull plastic and metal before the trucks bury it. Kids miss breakfast when the haul is light. Cuts and smoke from burning scrap keep people sick and off the next day’s shift. The real trap is the private scale at the gate. One buyer sets the weight and the price, and pickers have no other legal place to sell. Without a fair scale or a shared sales channel, every hard hour still ends in empty meals and deeper debt to the same middleman.",
      stakeholder: "Waste picker cooperative",
      pressureKeys: ["Empty Meals", "Scale Grip", "Sick Kids"],
      suggested: ["networks", "crypto", "ai", "iot", "print3d", "solar", "battery", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Dust Ridge"],
      title: "Advance pay chains the kiln on Dust Ridge",
      scene:
        "On Dust Ridge the brick kilns run hot and the air tastes of ash. Workers take advance pay to cover rent and medicine, then learn the debt never quite clears. Coughs linger. Children carry clay when a parent cannot stand a full day. The driver is the boss’s closed books. Hours, fines, and “food credit” are written only by the yard owner, so leaving means losing what you are told you still owe. Cheap power and open ledgers could break the chain; right now the kiln owns the wage.",
      stakeholder: "Kiln workers’ mutual aid circle",
      pressureKeys: ["Bonded Debt", "Boss Books", "Lung Trouble"],
      suggested: ["solar", "battery", "networks", "crypto", "ai", "materials", "computing", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Hill Signal"],
      title: "Tuition dies when the mast fails in Hill Signal",
      scene:
        "In Hill Signal the secondary school depends on one hilltop mast for lessons, exam forms, and the small fees parents send by phone. When the mast drops, classes stop and families fall behind on tuition. Students walk hours for a signal bar and still miss whole units. The local driver is a single private mast and prepaid data sold at village prices with no backup path. Teachers cannot host materials offline at scale, and households rack up data debt chasing the same weak link. Connectivity failure here is not an inconvenience—it is how poverty locks the next grade.",
      stakeholder: "Village teachers’ network",
      pressureKeys: ["Missed Classes", "Mast Monopoly", "Data Debt"],
      suggested: ["networks", "solar", "battery", "ai", "computing", "vr", "space", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ferry Slip"],
      title: "Dawn fares strand the cleaners at Ferry Slip",
      scene:
        "Night cleaners finish office towers across the water and race the last boat to Ferry Slip before dawn. When the boat is full or the pier fee jumps, they sleep on the quay or pay a private skiff they cannot afford. Children wait alone on the home side. Wages shrink with every stranded night. The system that keeps them poor is a single pier franchise: docking rights, timetable, and cash fares controlled by one operator with no worker-run option and no safe night route. Miss the slip and you lose the shift, the fare home, and another day of school cover for your kids.",
      stakeholder: "Cross-water night workers’ association",
      pressureKeys: ["Stranded Nights", "Pier Fees", "Child Risk"],
      suggested: ["transportation", "solar", "battery", "networks", "iot", "ai", "crypto", "drones"],
      visionTheme: "coastal-city",
    }
  ],

  "chem-bio": [
    {
      places: ["Weftbridge Dyeworks Row"],
      title: "Second-use blues on the dye row",
      scene:
        "On Weftbridge Dyeworks Row the night shift still leaves with stinging eyes and nosebleeds. The alley air tastes metallic after the vats run late. Families upstairs hang sheets that come down stiff with a sharp smell no laundry soap fully kills. The harm is daily and close: workers clock out sick, kids miss school, clinics log the same burning sinuses week after week.\n\nWhat keeps feeding the danger is not only old pipes. Several shops buy bulk solvents and intermediates that can finish cloth—or, with a different recipe and no questions, feed a chemical weapon precursor chain. Drums arrive under dye-grade labels. Seals lag. Ledgers disagree. No one on the row has a cheap way to prove what is really in the grey drums before they are opened, mixed, or quietly resold. Until the row can see and ",
      stakeholder: "Rina Mercado, row occupational health advocate",
      pressureKeys: ["Nosebleeds", "Grey drums", "Seal lag"],
      suggested: ["iot", "ai", "materials", "networks", "drones", "computing", "robots", "nano"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Stonepass Border Dry Port"],
      title: "Lab kits under the wrong code",
      scene:
        "At Stonepass Border Dry Port, handlers open crates that should hold farm sensors and school science kits. Some nights the packing foam hides bottles that burn skin on contact. Ambulances have taken three dock workers this season. The lived harm is simple: people who move boxes go home blistered, and the town clinic has no spare beds when a shift goes wrong.\n\nThe driver is a labeling game. Dual-use lab kits—gear that can support normal research or help someone build a biological or chemical threat—ride in under false commodity codes. Night gaps in inspection mean sealed pallets cross with a stamp and a shrug. Brokers know which codes get a wave-through. Until the port can match contents to claims in real time, not just paper, the same corridor that feeds local labs will keep leaking the wro",
      stakeholder: "Jonas Veld, dry-port customs liaison",
      pressureKeys: ["Handler burns", "False labels", "Night gaps"],
      suggested: ["ai", "iot", "drones", "networks", "crypto", "computing", "transportation", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Lowfen Municipal Waterworks"],
      title: "What the outfall never names",
      scene:
        "In Lowfen the gut bugs hit in waves. Parents keep kids home. Nurses write the same watery illness on chart after chart along the river blocks. People boil water and still feel off. The harm is in kitchens and school bathrooms, not in a distant report.\n\nDownstream of the municipal waterworks sits a blind outfall—a discharge pipe the plant does not fully fingerprint. Upstream shops and a small contract lab can tip odd chemical and biological waste into drains that meet that pipe. Sample piles grow faster than the lab can read them. Without fast gene sequencing and sensors that name what is in the water, not only how cloudy it looks, the works stays blind. The same gap that hides ordinary pollution can hide a deliberate dump until the town is already sick.",
      stakeholder: "Marta Singh, works lab supervisor",
      pressureKeys: ["Gut sickness", "Blind outfall", "Sample pile"],
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "synbio", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Cedar Contract Vivarium Park"],
      title: "Loaner strains after closing time",
      scene:
        "Cedar Contract Vivarium Park rents animal rooms and bench space to small biotech teams. After closing time, staff have logged fevers and coughs that track bad transfers between suites. Neighbors on the fence line want the park shut. The harm is personal: technicians get sick, and the block next door stops trusting every white van.\n\nThe deeper problem is strain sharing without a hard chain of custody. Loaner strains—live research microbes passed between contract clients—move on handshakes and shared freezers. Inventory apps lag. A culture meant for vaccine work can leave the building mislabeled or incomplete. Dual-use risk grows when nobody can prove which organism sat on which shelf. Until the park can sequence, seal, and log every transfer, the same flexible lab model that helps startups ",
      stakeholder: "Dr. Noah Abebe, vivarium biosafety officer",
      pressureKeys: ["Staff fevers", "Strain sharing", "Neighbor fear"],
      suggested: ["gene-sequencing", "synbio", "ai", "iot", "networks", "crypto", "computing", "vr"],
      visionTheme: "learn-city",
    }
  ],

  asteroid: [
    {
      places: ["Sutherland Sky Belt, Northern Cape"],
      title: "Mine glare blanks the Karoo rock watch",
      scene:
        "Guest lodges around Sutherland sit half empty. Families who once booked dark-sky weekends cancel when the night turns milky white. The local rock watch—small telescopes and cameras that hunt near-Earth objects, the space rocks that could hit our planet—loses faint streaks in the wash of light. Open-pit mines on the plateau keep floodlights on all night for safety and shift work. That glare is the driver: it erases the dim signals the watch needs, so discovery windows shrink while booking boards stay blank and permit fights stall any shield or curfew deal.",
      stakeholder: "Naledi Mokoena, community dark-sky coordinator",
      pressureKeys: ["Empty lodges", "Sky glare", "Permit lock"],
      suggested: ["space", "ai", "computing", "networks", "iot", "drones", "solar", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Goldstone Antelope Valley rim, California"],
      title: "Dish backlog leaves the valley guessing",
      scene:
        "Town halls in the Antelope Valley fill with the same question after every headline rock: where is it pointed, and who is watching? Civil liaisons post thin updates because the big tracking dishes spend nights in repair or queued behind deep-space missions. When a dish sits idle, track gaps open—hours with no fresh path on a near-Earth object. Crews know the local driver: a long repair queue and shared time rules that push planetary-defense passes to the back. People stop trusting alerts. Shops near the rim feel the jitter when parents keep kids home on rumor nights.",
      stakeholder: "Rosa Delgado, civil tracking liaison",
      pressureKeys: ["Track gaps", "Alarm fatigue", "Repair queue"],
      suggested: ["space", "ai", "networks", "computing", "iot", "robots", "materials", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Maunakea access communities, Hawaiʻi Island"],
      title: "Time-share freeze after every rock scare",
      scene:
        "After each new space-rock scare, summit schedules freeze. Domes that could refine an orbit stay dark while mediators renegotiate who gets the night. Lodge workers and guides lose shifts when tours and support jobs pause. The lived harm is empty pay weeks and frayed nerves in the access communities below the mountain. The driver is not the rock itself—it is a brittle time-share system. Every fear spike reopens trust fights over sacred land, science slots, and defense observing, so the hours needed to pin down a threat keep getting locked away.",
      stakeholder: "Kainoa Hale, summit operations mediator",
      pressureKeys: ["Closed domes", "Wage shock", "Trust fracture"],
      suggested: ["space", "ai", "networks", "computing", "vr", "iot", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Esrange fringe, Kiruna municipality"],
      title: "Kinetic stack waits while the range idles",
      scene:
        "On the fringe of Esrange, rehearse-and-hold notices stack up. A kinetic stack—the practice hardware for a push-the-rock deflection test—waits in crates while the range stays quiet. Reindeer herders report stressed animals when rumor convoys and pause orders chop the calendar without clear end dates. Families feel the stall as delayed contracts and uneasy grazing seasons. The local driver is liability gridlock: overlapping rules on who pays if a test goes wrong keep real defense practice from flying, so the town lives with readiness theater instead of proven moves.",
      stakeholder: "Ingrid Larsson, range civil-integration lead",
      pressureKeys: ["Mission stall", "Herd stress", "Liability gridlock"],
      suggested: ["space", "robots", "materials", "print3d", "ai", "computing", "networks", "nuclear"],
      visionTheme: "rebuild-city",
    }
  ],

  weather: [
    {
      places: ["Drawdown Flats"],
      title: "When the pivot runs dry",
      scene:
        "On Drawdown Flats the center-pivot sprinklers still make their slow circles, but the circles are shorter every summer. Corn tips burn white by noon. Well pumps cough sand. Families haul jugs from town because kitchen taps spit grit. The co-op keeps drilling deeper and running longer sets because the old water rights and the crop contracts both demand it. That habit empties the aquifer faster than rain can refill it, so the next dry year hits harder than the last.",
      stakeholder: "Irrigation co-op president",
      pressureKeys: ["Dry Wells", "Wasted Water", "Farm Debt"],
      suggested: ["iot", "ai", "solar", "battery", "drones", "space", "genetic-engineering", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Ember Ridge"],
      title: "Orange noon at Ember Ridge",
      scene:
        "Ember Ridge wakes under a sky the color of rust. Kids stay inside with windows taped shut. The clinic hallway fills with people coughing and rubbing red eyes. On the ridges above town, beetle-killed pines stand like dry matches. Logging roads are thin, and burn piles wait years for crews. When wind and heat line up, those dead stands feed fast-moving fire that pours smoke into the valley for weeks. The smoke is the harm people feel today. The untreated dead timber is what keeps lighting the next plume.",
      stakeholder: "County public health nurse",
      pressureKeys: ["Smoke Days", "Dead Timber", "Clinic Crowds"],
      suggested: ["drones", "iot", "ai", "space", "networks", "robots", "materials", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Levee Bend"],
      title: "The river takes the bend again",
      scene:
        "At Levee Bend the river shoulders into the same curve it has taken for a century. Sandbags lean against porch steps. Mold climbs drywall in houses that flooded last spring and the spring before. People sleep on cots at the parish hall while they wait for the water to fall. The earthen levee has soft spots and unfinished patches where money ran out. Every big rain pushes harder against those gaps, and each breach teaches the river a wider path through the neighborhood. Families lose homes now because the weak line still decides where the flood goes.",
      stakeholder: "Parish floodplain manager",
      pressureKeys: ["Floodwater", "Levee Gaps", "Displaced Families"],
      suggested: ["iot", "ai", "drones", "materials", "robots", "space", "networks", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Windrow Court"],
      title: "Sirens after the roof",
      scene:
        "Windrow Court is a grid of mobile homes on the open edge of town. When the sirens wail, roofs peel and walls fold. People crawl from twisted frames with cut hands and no dry place to sleep. The community shelter fills by midnight and turns families away. Many homes still sit on thin straps and aging anchors because lot rents leave little cash for upgrades, and the park rules make heavy work slow. Stronger storms keep coming across the flat ground. Weak tie-downs turn each gust into another wrecked home and another night without a bed.",
      stakeholder: "Mobile home residents' council lead",
      pressureKeys: ["Wind Damage", "Weak Tie-Downs", "Shelter Space"],
      suggested: ["materials", "print3d", "robots", "energy", "battery", "solar", "networks", "drones"],
      visionTheme: "social-city",
    }
  ],

  mideast: [
    {
      places: ["Dust Road Clinic Row"],
      title: "Ambulances pay twice at the gate",
      scene:
        "On the strip of clinics between two neighborhoods, night labor pains and gunshot wounds still arrive by taxi. Families watch the clock while drivers argue at the steel gate. Each crossing can cost a second cash fee, and sometimes the ambulance turns around. Mothers lose the golden hour for bleeding. Kids with asthma wait through dust storms without oxygen refills.\n\nThe fees are not random theft alone. Rival checkpoint crews treat the clinic road as a toll franchise. When truces fray, the price jumps and the rules change without notice. Staff burn out and leave. The board can stock bandages, but it cannot stop the gate from taxing care itself—and that tax keeps fear and delay as the normal way sick people move.",
      stakeholder: "Cross-community clinic board",
      pressureKeys: ["Missed Care", "Checkpoint Fees", "Staff Flight"],
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Saffron Lane Souk"],
      title: "Shutters rise only after the cut",
      scene:
        "Saffron Lane used to open at dawn. Now metal shutters stay down until someone pays the morning cut to the men who “watch the alley.” Spice sellers, phone-repair kiosks, and bread stalls lose the early crowd. Parents send teens to hold a spot in line for permits that may never come. Idle days pile up; fights over who paid whom spill into the lane.\n\nThe driver is not only fear of strangers. A patchwork of street tolls—small forced payments for the right to open, unload, or pass—turns every stall into a revenue post for competing crews. Honest ledgers cannot beat a system that rewards whoever controls the corner that week. Trade shrinks, rumors harden, and young people learn that the surest wage is the toll, not the shop.",
      stakeholder: "Merchants’ fair-toll association",
      pressureKeys: ["Empty Stalls", "Street Tolls", "Idle Youth"],
      suggested: ["networks", "ai", "crypto", "solar", "iot", "drones", "transportation", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Rubble Lane Blocks"],
      title: "Winter walls that never rise",
      scene:
        "In the blocks behind the old bus depot, families hang tarps where apartment walls used to be. Rain finds the mattresses. Grandparents sleep in stairwells when the wind strips the plastic. Kids memorize which floors still have a safe corner. Every cold season, the same promise returns: this year the outer walls go up before frost.\n\nThey rarely do. Cement, rebar, and window frames vanish from job sites overnight, sold across town. Overlapping deed claims—who owns which ruined flat—freeze permits while crews wait. Theft and paper fights feed each other: no secure stockpile, no finished wall; no finished wall, no proof that staying is worth the risk. The rubble stays open, and winter keeps winning.",
      stakeholder: "Tenants’ rebuild cooperative",
      pressureKeys: ["Exposed Homes", "Material Theft", "Deed Fights"],
      suggested: ["print3d", "materials", "robots", "solar", "drones", "ai", "networks", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Twin Bank Canals"],
      title: "The canal gate becomes a weapon",
      scene:
        "Tomato rows on the east bank brown at the edges while west-bank plots stay green a little longer. Farmers walk the ditch at dawn with buckets. Wells run brackish. Families take loans for tanker water and miss school fees when the crop fails. Arguments at the shared sluice—the canal gate that meters flow—end with locked chains and phone videos, not fair turns.\n\nSomeone always holds the crank. When politics upstream sour, the gate becomes a lever: open for allies, shut for rivals. Downstream plots die on a schedule set by whoever seized the winch last. Debt climbs. Kin groups stop sharing seed. The land can still grow food, but the local habit of using water control as pressure keeps scarcity on purpose, season after season.",
      stakeholder: "Both-banks water users’ council",
      pressureKeys: ["Crop Failure", "Gate Capture", "Family Debt"],
      suggested: ["iot", "solar", "ai", "networks", "space", "drones", "crypto", "computing"],
      visionTheme: "food-city",
    }
  ],

  nuclear: [
    {
      places: ["Clearwater Silo Road, northern Great Plains"],
      title: "Sirens over the grain elevators",
      scene:
        "At 2 a.m. the town sirens wake everyone along Silo Road. Kids sit up in bed. Elevator crews freeze on the catwalks. Capt. Maya Brooks has ninety seconds in a buried capsule to say whether a blip is real war or a bad feed. Families already pack go-bags and skip night shifts at the co-op. The harm is not abstract: sleep breaks, clinic visits for panic rise, and harvest trucks sit idle after every false alert. The driver sits under the wheat. Old launch rules still treat minutes as proof. Crew pairs rotate fast, sleep little, and must act before anyone topside can double-check weather radar or a jammed civilian link. Until the capsule can slow the clock and share a clearer picture with the people who live above the silos, one misread night can turn grain country into a launch order.",
      stakeholder: "Capt. Maya Brooks, missile combat crew commander",
      pressureKeys: ["Night Sirens", "Short Fuses", "Family Fear"],
      suggested: ["ai", "computing", "networks", "iot", "vr", "quantum-internet"],
      visionTheme: "food-city",
    },
    {
      places: ["Floe Watch Headland, Labrador coast"],
      title: "Ice clutter looks inbound",
      scene:
        "Spray hits the windows at Floe Watch while Sgt. Inuk Arnaq stares at tracks that might be missiles—or ice and duct glare fooling tired sensors. When the board lights up, fishing crews race home and the small clinic fills with chest pain and shaking hands. Elders refuse night travel on the coast road. The lived harm is fear you can schedule: canceled medevac hops, kids kept from school, and a waiting room that never empties after a scare. The driver is the watch itself. Cold-sea clutter, thin satellite passes, and a short hold-fire window force Arnaq’s team to escalate before a second look can sort ice from inbound. If the headland cannot sense cleaner and buy minutes without guessing, a winter storm of false tracks can push a real alert up the chain.",
      stakeholder: "Sgt. Inuk Arnaq, sensor fusion lead",
      pressureKeys: ["False Tracks", "Hold Time", "Clinic Strain"],
      suggested: ["space", "ai", "networks", "iot", "drones", "computing"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Iron Quay Liaison Yard, lower Danube corridor"],
      title: "Drills without a shared clock",
      scene:
        "River fog hangs over Iron Quay when two neighbors run armed drills on the same morning and neither desk has the other’s clock. Col. Elena Popa’s phone lights up as quay workers drop cargo nets and parents pull children from the market. Sirens disagree. Ferry lines snap into arguments. The harm is local and bodily: stampedes on the bridge, lost wages on the docks, and rumors that empty shelves by noon. The driver is not the fog. It is hidden exercise schedules, patched radio nets, and no joint picture that proves a sortie is a drill before someone treats it as the real opening shot. Until the yard can show the same timeline to both sides and to the town, a routine practice day can still become a misjudgment spiral.",
      stakeholder: "Col. Elena Popa, joint deconfliction desk",
      pressureKeys: ["Civilian Panic", "Hidden Drills", "Trust Gap"],
      suggested: ["networks", "crypto", "space", "ai", "vr", "drones"],
      visionTheme: "social-city",
    },
    {
      places: ["Granite Command Hollow, Appalachian foothills"],
      title: "Near-send on patch night",
      scene:
        "In a hillside bunker above a mill town, patch night means fresh software on the command links that carry launch authority. Eng. Kenji Okada watches a clean update path stutter, flip a veto flag, then nearly pass a test order as live. Outside, church basements unlock and the diner empties when the rumor hits Main Street. People feel the harm in their hands: kids kept home, night nurses calling out sick with stress, and a town that flinches at every generator test. The driver is brittle control gear. Aging switches, rushed patches, and a shrinking human veto window mean a maintenance glitch can look like intent. If Granite Hollow cannot prove each fix safe and keep a human stop in the loop, one near-send becomes the story that never quite ends.",
      stakeholder: "Eng. Kenji Okada, C3 assurance lead",
      pressureKeys: ["Near Misses", "Veto Shrink", "Town Anxiety"],
      suggested: ["computing", "ai", "networks", "quantum-internet", "robots", "iot"],
      visionTheme: "energy-city",
    }
  ],

  slavery: [
    {
      places: ["Ranong Channel Boats"],
      title: "Papers locked below the ice line",
      scene:
        "At night the clinic skiff ties up to long-tail boats in the Ranong Channel. Deck hands climb down with crushed fingers, rope burns, and fever. Many cannot leave when the trip ends. Captains hold their identity papers in a locked box below the ice line and call the hold a debt for food, fuel, and the ride out. The harm is simple: men work hurt and unpaid, and families on shore stop hearing from them. The driver is local and stubborn. Buyers pay by the kilo of catch with no crew check, so skippers keep cheap trapped labor and the same boats keep sailing.",
      stakeholder: "Port clinic outreach medic",
      pressureKeys: ["Night Injuries", "Crew Debt", "Held Papers"],
      suggested: ["iot", "networks", "ai", "crypto", "drones", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Sambas Palm Blocks"],
      title: "The scale that never zeros the loan",
      scene:
        "In the Sambas palm blocks, kids miss class when harvest peaks. Parents live in company barracks and pick fruit under a loan they never seem to finish. The weighing shed runs the trick. Fruit is marked light on the company scale, so the advance for tools and rice grows instead of shrinking. Teachers see empty desks and tired children who work the rows after dawn. The harm is lost school and trapped families. The driver is the shed itself: supervisors who control the only scale, the only store, and the only road out keep forced labor feeding the mills.",
      stakeholder: "Plantation school teacher",
      pressureKeys: ["Missed School", "Weigh Fraud", "Barrack Rules"],
      suggested: ["crypto", "iot", "ai", "networks", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Bhadohi Loom Lanes"],
      title: "Knot counts after midnight",
      scene:
        "In Bhadohi’s loom lanes, the knot count runs past midnight. Children tie fine carpets because small hands are fast and quiet. Families took cash advances from the loom owner months ago. That debt is the leash. When a child-rights counselor visits, the same kids are hidden or coached to smile for a fake audit notebook that never matches the real hours. The harm is clear: sore eyes, cut sleep, and school abandoned for piece rates. The driver is the advance-and-export chain on these streets—owners who buy silence with debt and papers that claim the work is clean.",
      stakeholder: "Child-rights counselor",
      pressureKeys: ["Child Hours", "Family Advances", "Fake Audits"],
      suggested: ["ai", "networks", "crypto", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Kolwezi Dig Trenches"],
      title: "Ore sacks instead of schoolbags",
      scene:
        "Outside Kolwezi, boys and young men haul cobalt ore in sacks from hand-dug trenches. Spines twist early. Pay comes as paper chits, not cash you can spend in town, and the chits only work at the boss’s stall. A mobile health-post nurse tapes shoulders and treats infected cuts, then watches the same crew walk back down. The harm is broken bodies and wages that never free anyone. The driver sits at the pit rim: local bosses who control access, chits, and who gets loaded onto the next buyer truck keep forced digging alive for the mineral trade.",
      stakeholder: "Mobile health-post nurse",
      pressureKeys: ["Spine Strain", "Chit Pay", "Pit Bosses"],
      suggested: ["drones", "iot", "ai", "robots", "networks", "crypto", "computing"],
      visionTheme: "energy-city",
    }
  ],

  women: [
    {
      places: ["Riverside Maternity Shift Gate"],
      title: "The walk home after midnight",
      scene:
        "At Riverside Maternity, night-shift nurses finish at 1 a.m. The last city bus left hours ago. Many women walk the dark river road alone or wait for a brother or husband who may not come. Last month two nurses were robbed; one stopped showing up. The hospital still posts the same roster because safe rides are treated as each woman’s private family duty, not part of the job. Empty posts mean longer labors for mothers still in the wards, and the fear keeps skilled staff leaving.",
      stakeholder: "Night-shift nurses' safety caucus",
      pressureKeys: ["Night Fear", "Shuttle Gap", "Staff Loss"],
      suggested: ["networks", "solar", "iot", "transportation", "ai", "battery", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Old Bund Land Registry"],
      title: "The deed still needs his name",
      scene:
        "On the Old Bund, widows bring harvest papers to the land desk and leave without a stamp. The registry will not update a field title unless a living adult man signs—even when the husband has died and the wife has farmed the plot for years. Without the stamp, creditors and cousins claim the soil. Families lose rice and rent money in the same season. The rule is not a forgotten custom on a shelf; clerks enforce it every Tuesday because the database and the paper forms still treat a woman alone as incomplete ownership.",
      stakeholder: "Widows' land rights desk",
      pressureKeys: ["Field Loss", "Title Block", "Legal Limbo"],
      suggested: ["networks", "ai", "crypto", "computing", "space", "iot", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["East Yard Trade School"],
      title: "The welding bay closes at dusk",
      scene:
        "East Yard Trade School trains electricians and welders, but the practical bay locks when the sun drops. Women apprentices who cook dinner or fetch younger siblings miss the only open machines. Men finish their hours; women collect theory credits and stall. Employers want logged torch time, so the gap becomes a permanent hire block. The schedule is written around an old safety rule and a habit of sending girls home early—not around who actually needs the tools. Families then pull daughters back to unpaid care work, and the shop floor stays mostly male.",
      stakeholder: "Women apprentices' coalition",
      pressureKeys: ["Skill Block", "Bay Lock", "Family Pull"],
      suggested: ["vr", "print3d", "networks", "ai", "solar", "robots", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Lakeview Family Planning Counter"],
      title: "The form still wants his signature",
      scene:
        "At the Lakeview counter, a woman can sit through counseling and still leave without contraception or a follow-up slot if the clerk demands a husband’s signature on the consent line. Some partners are away for work; some refuse; some are the reason she came alone. Midwives watch repeat pregnancies and infections climb in the same blocks. The barrier is not only shame in the waiting room—it is a local intake rule that treats adult women as needing male permission before basic care is dispensed. Stigma keeps others from even joining the queue.",
      stakeholder: "Community midwives' network",
      pressureKeys: ["Care Denial", "Consent Gate", "Clinic Stigma"],
      suggested: ["networks", "ai", "iot", "computing", "solar", "crypto", "drones"],
      visionTheme: "care-city",
    }
  ],

  education: [
    {
      places: ["Marsh Bend"],
      title: "Flood weeks erase a grade in Marsh Bend",
      scene:
        "In Marsh Bend, spring water sits in the elementary wing for weeks. Kids lose whole units of reading and math while classrooms dry out and mold crews work. Parents watch report cards slide and know the next storm will do it again. The local driver is not only the river. The district still rebuilds on the same low pad, keeps the same calendar, and treats flood weeks as bad luck instead of a design problem. Buses stop when the access road goes under. Make-up days stack into summer that working families cannot use. Talent is here. The system keeps washing the school year away.",
      stakeholder: "Tanya Brooks, PTA lead and levee witness",
      pressureKeys: ["Missed Days", "Flood Bias", "Catch Up"],
      suggested: ["networks", "ai", "solar", "battery", "vr", "computing", "drones", "materials"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Packingtown"],
      title: "English-only exams strand Packingtown fifth-graders",
      scene:
        "In Packingtown, fifth-graders from packing-plant families freeze on state tests written only in English. They can explain a story at the dinner table in Somali or Spanish, then fail the bubble sheet that decides who gets help next year. Parents on night shift cannot sit in daytime conferences. The harm is real now: kids held back, labeled behind, pulled from science for drill sheets. The driver that keeps it going is a local rule stack. The district grades and places students on English-only exams, funds almost no bilingual aides, and times services around a plant schedule that never matches school hours. Opportunity is uneven on purpose, not by accident.",
      stakeholder: "Hodan Ali, plant nurse and parent advocate",
      pressureKeys: ["Reading Gap", "Language Rules", "Aide Shortage"],
      suggested: ["ai", "networks", "vr", "computing", "transportation", "iot", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Heat Ridge"],
      title: "Blackout classrooms empty Heat Ridge by noon",
      scene:
        "On Heat Ridge, summer heat turns portable classrooms into ovens by late morning. When the grid flickers, fans die and teachers send everyone home. Students miss science labs and the cool library hour that kept them reading. Younger siblings wait in cars while older kids become free childcare. The lived harm is lost hours and frayed focus. The driver is local power and building choices: thin-walled portables, peak loads the feeder cannot hold, and a schedule that still assumes reliable midday electricity. Until power and heat are treated as part of the school design, empty desks at noon will keep writing the achievement gap.",
      stakeholder: "Luis Ortega, after-school coach",
      pressureKeys: ["Heat Days", "Power Gaps", "Home Care"],
      suggested: ["solar", "battery", "networks", "ai", "computing", "vr", "iot", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Millbridge"],
      title: "Teen caregivers miss the credit clock in Millbridge",
      scene:
        "In Millbridge, teens raise younger cousins and check on grandparents after the mills thinned out formal care. They miss first period, turn in work late, and watch graduation credits slip even when they understand the material. Night classes exist on paper, but the seat-time rules and bus times assume a free adult at home. The harm is credits lost and futures narrowed. The driver is a local system that only counts bodies in chairs at fixed hours and offers almost no credit for learning done between care shifts. Kinship care is common here. School still pretends every student has a clear calendar and a ride.",
      stakeholder: "Keisha Dunn, kinship caregiver and night student",
      pressureKeys: ["Credits Lost", "Seat Rules", "Care Load"],
      suggested: ["ai", "networks", "vr", "computing", "transportation", "solar", "battery", "robots"],
      visionTheme: "care-city",
    }
  ],

  automation: [
    {
      places: ["Cedar Junction Fulfillment Hub"],
      title: "Aisles that pick themselves",
      scene:
        "At Cedar Junction, the night pick crew still walks the long aisles under cold lights. Orders used to mean steady hours. Now the wall screens flash higher piece counts while half the carts roll empty because software already assigned the easy bins to machines. People feel it in thinner paychecks and in the quiet dread before each shift board posts. The driver is not mystery tech from far away. Corporate keeps buying more warehouse robots and AI routing that treats human pickers as the overflow valve. Every time the system beats last week’s speed, the hub cuts another human block and raises the quota on whoever remains. Rent does not wait. The crew steward has to invent a local path before the night floor is only sensors and a skeleton crew.",
      stakeholder: "Night pick crew steward",
      pressureKeys: ["Jobs", "Pick quotas", "Rent stress"],
      suggested: ["robots", "ai", "iot", "networks", "computing", "transportation"],
      visionTheme: "food-city",
    },
    {
      places: ["Harborview Driver Dispatch Garage"],
      title: "Medallions against empty curbs",
      scene:
        "Harborview’s independent drivers still line up at the old dispatch garage near the ferry ramps. Medallion loans and car notes do not shrink when the app goes quiet. Riders now hop into geofenced robotaxis on the waterfront loop, and the curb that once meant fares sits empty for long stretches. Drivers feel the harm in missed school fees and in the shame of sitting idle while tourists film the driverless vans. The local driver is simple and stubborn: fleet companies score routes with AI and push self-driving cars onto the profitable short hops first. Human drivers get the scraps, the late nights, and the rating hits when they refuse unsafe gigs. The co-op lead needs tools that keep people earning and moving before debt forces the garage doors shut for good.",
      stakeholder: "Independent driver co-op lead",
      pressureKeys: ["Jobs", "Fleet scores", "Debt"],
      suggested: ["self-driving", "ai", "networks", "transportation", "computing", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Lakeside Hospital Revenue Wing"],
      title: "Charts coded without the wing",
      scene:
        "In Lakeside’s revenue wing, coders once turned doctor notes into the billing codes that keep the hospital paid. Now an AI chart reader drafts most codes before lunch, and managers measure the unit against targets the software itself set. People feel the harm when full-time seats turn into temporary review shifts and student loans still come due. Nose-to-screen fatigue rises because the leftover work is only the messy edge cases the model dumps back. The driver that keeps cutting jobs is local and plain: the hospital bought the coding AI to chase faster claims and fewer human hours, then tied staffing to the new chart targets. Each clean month becomes proof that another desk can go. The coding unit rep has to rebuild skill, pay, and purpose inside these walls before the wing is a server roo",
      stakeholder: "Coding unit rep",
      pressureKeys: ["Jobs", "Chart targets", "Loan strain"],
      suggested: ["ai", "computing", "networks", "vr", "crypto", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Sunridge Berry Packing Shed"],
      title: "Sorters took the piece-rate weeks",
      scene:
        "At Sunridge, seasonal crews used to fill the packing shed for berry weeks and earn piece-rate cash that carried families through lean months. Optical sorters and packing arms now take the fast lines. People feel the harm when the season shortens to a few cleanup days and kids notice the grocery money is gone. Hands that knew fruit grade sit idle while the shed still hums. The system that keeps erasing weeks is on the floor: owners install more robots and sensor lines each harvest because buyers demand uniform boxes at machine speed, and the shed races neighboring farms on pack rate. Humans become the buffer for jams and night overflow, not the core crew. The seasonal organizer must invent local work, skills, and share rules before the shed runs a full season with almost no people.",
      stakeholder: "Seasonal crew organizer",
      pressureKeys: ["Jobs", "Pack speed", "Skills"],
      suggested: ["robots", "ai", "iot", "print3d", "networks", "computing"],
      visionTheme: "food-city",
    }
  ],

  refugees: [
    {
      places: ["Paso del Norte Hostel Strip"],
      title: "Hostels full, stamps still pending",
      scene:
        "On the strip behind the old rail yard, three hostels share one laundry line and a waiting room that never empties. Families sleep in shifts. Kids do homework on stair landings while parents clutch phone numbers for appointments that slip another week. The harm is simple: no private bed, cold food, and a fear that one missed call means starting over. What keeps feeding the crush is not only the border. A slow local paper mill — the stamp desk, the shared scanner, the rule that one missing form resets the queue — turns short stays into months. Day labor bosses know who is stuck and cut the wage. Nora’s co-op can open cots. It cannot clear the backlog alone.",
      stakeholder: "Nora Velez, hostel cooperative coordinator",
      pressureKeys: ["Crowding", "Paper Delays", "Wage Pressure"],
      suggested: ["ai", "networks", "crypto", "computing", "solar", "battery", "print3d", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Old South Levee Road"],
      title: "Second breach, no parcel left",
      scene:
        "After the second breach, the road is a ribbon of mud and blue tarps. People who farmed here for decades now cook on borrowed burners in a school gym. Their harm is wet floors, spoiled seed, and kids who stop asking when they go home. The driver is not only the river. County title maps still treat half the plots as one owner’s name from a paper book that washed out. Without a clear title, families cannot claim rebuild aid or a safe plot uphill. So they leave — or stay in limbo while the next crest builds. Coach Dara’s mutual-aid crew moves sand and soup. They need a way to prove who belongs to which ground before the road empties for good.",
      stakeholder: "Coach Dara Nguyen, levee mutual-aid lead",
      pressureKeys: ["Flooding", "Lost Titles", "Outmigration"],
      suggested: ["solar", "battery", "iot", "drones", "materials", "ai", "space", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["San Lázaro Ridge Clinic"],
      title: "Wounded at the ridge clinic gate",
      scene:
        "At night the ridge clinic hears boots on gravel before it sees faces. Some arrivals are sick from the trail. Some are hurt. The waiting bench fills; the oxygen tank hisses lower. Patients feel the harm in long nights, untreated wounds, and a door that sometimes stays shut when the ward is past safe load. What keeps the line growing is a local gate rule: without a sponsor letter or a matched bed code, night staff must turn people toward a city hospital two hours down-slope. That rule was meant to stop chaos. It now dumps the sickest back onto the road and burns out the nurses who stay. Dr. Okonkwo can triage. She needs power, records, and a fairer way to open the gate without collapsing the ward.",
      stakeholder: "Dr. Samira Okonkwo, night triage lead",
      pressureKeys: ["Sick Nights", "Gatekeeping", "Staff Burnout"],
      suggested: ["ai", "networks", "solar", "battery", "drones", "computing", "transportation", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Jetty Ferry Sheds"],
      title: "Ferry cuts, addresses that sink",
      scene:
        "The ferry sheds smell of wet rope and diesel. When a run is cut, people sleep on benches with their papers in plastic bags. Bedding stays damp. Kids miss school on the far shore. The lived harm is cold nights, lost wages, and mail that never finds them. The driver sits in the harbor office: berth rights and “proof of address” still tie to pier numbers that flood and change. If your shed number is gone, you are harder to roster for work, harder to house on land, and first to lose a seat when the captain must lighten the load. Fights break out over who boards. Captain Marlow’s desk tries to keep peace. The jetty needs dry berths, trusted IDs that move with people, and power that does not die with the tide.",
      stakeholder: "Captain Eli Marlow, seafarer and ferry workers desk",
      pressureKeys: ["Wet Bedding", "Dead Addresses", "Berth Fights"],
      suggested: ["networks", "solar", "battery", "transportation", "drones", "iot", "materials", "ai"],
      visionTheme: "ocean-city",
    }
  ],

  ag: [
    {
      places: ["Loess Bend County"],
      title: "Bare winter fields blow the county thin",
      scene:
        "After harvest the hills sit naked. March winds lift the fine topsoil and turn noon brown. Kids wipe grit from their eyes at the bus stop. Older growers cough through clinic visits they cannot skip. Renters push every acre into cash grain because landlords want full production and banks want payments. Cover crops and longer rests cost money nobody has on thin margins, so the ground stays bare and the dust keeps coming.",
      stakeholder: "County soil district and tenant growers coalition",
      pressureKeys: ["Dust Days", "Bare Acres", "Farm Debt"],
      suggested: ["iot", "ai", "drones", "space", "solar", "genetic-engineering", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Fogline Spice Terraces"],
      title: "Full-sun spice rush kills the mist forest",
      scene:
        "Buyers pay top price for sun-grown spice, so co-op members cut the shade trees that once held the mist. Without that canopy the soil bakes, then slides in the first hard rain. Springs that fed the lower steps run weaker each dry season. Families haul water farther and watch mud take seedbeds overnight. The driver is simple: short contracts reward clear-cut full sun and punish anyone who keeps forest cover for the long haul.",
      stakeholder: "Terrace cooperative and spring wardens",
      pressureKeys: ["Mudslides", "Spring Flow", "Shade Loss"],
      suggested: ["space", "iot", "drones", "ai", "networks", "gene-sequencing", "solar", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Ringroad Greens Belt"],
      title: "Spec sheets turn salad rows into spray alleys",
      scene:
        "School kitchens and big buyers demand perfect leaves with zero blemish. Growers along the ring road meet those specs with calendar sprays that drift into yards and open windows. Parents keep kids inside on treatment mornings. Field crews miss shifts with rashes and headaches. The system that keeps this going is the purchase contract itself: miss the look standard and the load is rejected, so the spray schedule stays locked even when pests are light.",
      stakeholder: "Peri-urban growers union and school meal buyers",
      pressureKeys: ["Spray Drift", "Sick Days", "Buyer Lock"],
      suggested: ["iot", "ai", "synbio", "drones", "robots", "gene-sequencing", "networks", "alt-proteins"],
      visionTheme: "social-city",
    },
    {
      places: ["Brackish Polder Reach"],
      title: "Pump wars salt the seed beds",
      scene:
        "Everyone races the neighbor’s well. Deeper pumps pull brackish water into fields that once grew clean forage and greens. Seedlings burn at the roots. Dairy herds eat bought feed while veg plots fail a second time. The water board’s shared rules fray because each farm that pumps harder steals a season from the next. Until the race slows, salt keeps climbing and plantings keep dying.",
      stakeholder: "Polder water board and mixed dairy–veg alliance",
      pressureKeys: ["Soil Salt", "Failed Plantings", "Pump Race"],
      suggested: ["solar", "battery", "iot", "ai", "materials", "networks", "space", "genetic-engineering"],
      visionTheme: "coastal-city",
    }
  ],

  food: [
    {
      places: ["Ladder Ridge Parish"],
      title: "Blight takes the parish potatoes",
      scene:
        "At Ladder Ridge Parish the school kitchen runs on potatoes from the strip fields behind the chapel. Kids now leave trays half full because the mash tastes off and the portions shrank. Elena, who runs the kitchen, counts empty sacks by Friday and sends smaller lunches home in the same bags. The harm is simple: families skip meals when the parish crop fails, and the free lunch was the only steady plate many kids got. What keeps it going is a blight that jumps row to row faster each wet spring, while growers still plant the same saved seed and spray late because early tests cost money they do not have. Until someone can read the pathogen fast, swap in tougher stock, and watch the fields before the leaves blacken, the parish will keep feeding hunger with smaller scoops.",
      stakeholder: "Elena, parish school-kitchen lead",
      pressureKeys: ["Hunger", "Crop Blight", "Seed Debt"],
      suggested: ["gene-sequencing", "genetic-engineering", "iot", "ai", "solar", "drones", "networks", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Copper Gate Wholesale"],
      title: "Dawn crates rot at the gate",
      scene:
        "Before sunrise at Copper Gate Wholesale, jam-packed crates of greens and fruit sit in the heat while the gate ledger crawls. By the time stallholders haul stock to the open market, leaves wilt and soft fruit weeps juice onto the concrete. Jamal runs for the stallholders union and hears the same complaint: buyers walk past mushy piles, and vendors eat the loss or raise prices until regulars stop coming. People in the blocks around the market feel it as emptier pots and more fried starch because fresh food costs too much or never arrives sound. The driver is not only bad luck. Power drops knock out the old coolers, trucks bunch up with no shared schedule, and fees still hit every stall whether the crate survives or not. Spoilage is built into how the gate moves food, and until cold chain, ro",
      stakeholder: "Jamal, stallholders union runner",
      pressureKeys: ["Hunger", "Spoilage", "Stall Fees"],
      suggested: ["iot", "battery", "solar", "transportation", "ai", "networks", "alt-proteins", "robots"],
      visionTheme: "food-city",
    },
    {
      places: ["Thorn Well Circuit"],
      title: "Wells on the circuit turn to mud",
      scene:
        "Along the Thorn Well Circuit, Nia drives a dusty loop with weighing scales and nutrition kits. Homesteads that once pulled clear water for kitchen gardens now crank up brown sludge or dry pipes. Mothers show her children with thinning arms and ask for packets she is already short on. The lived harm is hunger and weak kids when garden plots die and milk thins because animals drink first. What keeps the problem alive is more than drought. Shared wells sit on contested fence lines, pumps run only when someone can spare diesel, and no one has a common map of which aquifer still holds. Landholders lock gates; smaller plots lose access first. Until water is measured, shared fairly, and lifted without burning scarce fuel, the circuit will keep turning gardens into dust and clinics into food lines",
      stakeholder: "Nia, mobile nutrition aide",
      pressureKeys: ["Hunger", "Dry Wells", "Fence Lines"],
      suggested: ["iot", "solar", "ai", "drones", "networks", "space", "materials", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Millrace Flats"],
      title: "Barges pass the small jetties by",
      scene:
        "In Millrace Flats the co-op silo still stands by the old millrace, but the big barges slide past the small jetties without tying off. Oksana keeps the clerk books and watches pledged grain leave for distant elevators while local bakers bid on empty air. Households stretch porridge and skip protein; the co-op shelf that once held member flour now shows paper IOUs. The harm is empty cupboards in a place that still grows grain in sight of the water. The driver is a credit and routing bind: buyers with deeper credit lock the barge slots, side jetties lack gear to load fast, and the co-op’s paper ledger cannot prove a claim before the boat has already passed. Until small docks can signal, load, and settle in time with the main channel, the flats will keep exporting fullness and importing hunger",
      stakeholder: "Oksana, co-op silo clerk",
      pressureKeys: ["Hunger", "Diverted Grain", "Credit Bind"],
      suggested: ["ai", "networks", "transportation", "iot", "solar", "battery", "alt-proteins", "crypto"],
      visionTheme: "food-city",
    }
  ],

  eco: [
    {
      places: ["Cattail Bend Flats"],
      title: "Cranes over concrete",
      scene:
        "At Cattail Bend Flats the spring tide now sits in living rooms. Kids walk to school on planks. Mosquitoes breed in the standing water, and the last heron nests sit on shrinking islands of grass. The marsh used to soak up storm water and feed the bay. Developers keep filling the wet ground and pouring pads for warehouses because short leases pay the neighborhood council’s bills faster than any restoration grant. Every new slab kills more cattail root, so the next storm hits harder. People feel the flood in their shoes; the driver is the lease money that rewards paving the sponge.",
      stakeholder: "Marsh neighborhood council",
      pressureKeys: ["Flooding", "Wetland Loss", "Lease Money"],
      suggested: ["drones", "space", "ai", "iot", "materials", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Silver Ladder Bend"],
      title: "Empty nets at the weir",
      scene:
        "Silver Ladder Bend once ran thick with shad in spring. Now fishers haul nets that come up light, and Friday fish fries use frozen fillets from far away. Kids who learned the river from grandparents watch empty water under the old stone weir. Upstream farms and a new grain elevator straighten banks, dump silt, and hold water behind low dams so barges can load on schedule. The contracts pay towns in cash, but they choke the riffles where fish spawn. Empty nets are the harm people taste at dinner; blocked flow for grain money is what keeps the river dying.",
      stakeholder: "River fishers' cooperative",
      pressureKeys: ["Empty Nets", "Blocked River", "Grain Contracts"],
      suggested: ["iot", "ai", "drones", "gene-sequencing", "synbio", "solar", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Glassgrass Sound"],
      title: "Sand where meadows waved",
      scene:
        "Glassgrass Sound used to shine green in clear shallows. Guides could point to seagrass meadows and the scallops hiding there. Now the water stays cloudy, the grass dies in patches, and charter tips shrink when visitors see mud instead of fish. A busy port deepens channels and sells dredged sand for fill and beaches up the coast. Each scoop stirs silt that smothers the grass and starves the nursery that fed the sound. Cloudy water and lost trips are what locals feel; sand dredging for port fees is the machine that keeps tearing the bottom.",
      stakeholder: "Sound fishers and guides guild",
      pressureKeys: ["Cloudy Water", "Sand Dredging", "Port Fees"],
      suggested: ["drones", "space", "iot", "materials", "nano", "ai", "solar"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Lichen Stair Valley"],
      title: "Spring without frogs",
      scene:
        "In Lichen Stair Valley the spring used to roar with frogs after rain. Wells ran clear. Now the water comes up brown after storms, and the night chorus is thin. Families boil more and walk farther when pumps clog. On the slopes, crews cut hardwood for charcoal kilns that sell to town markets and roadside grills. Bare ground sheds mud into the creeks that feed the wells, and the shade that held moisture is gone. Muddy water and quiet nights are the harm; charcoal cash that pays for school fees and medicine is why the cutting does not stop.",
      stakeholder: "Valley water stewards",
      pressureKeys: ["Muddy Wells", "Forest Loss", "Charcoal Cash"],
      suggested: ["drones", "space", "ai", "iot", "networks", "gene-sequencing", "solar", "materials"],
      visionTheme: "care-city",
    }
  ],

  infectious: [
    {
      places: ["Dump Edge Lane Settlement"],
      title: "Medical waste tips fever into Dump Edge Lane",
      scene:
        "On Dump Edge Lane the pickers sort plastic and metal with bare hands. Clinic bags keep showing up in the open tip—needles, blood-soaked gauze, broken vials. Rosa’s crew is getting deep cuts that will not heal clean. Fever and swollen arms keep people off the piles for days. The harm is immediate: infected wounds and nights of shaking chills in tin shacks far from a proper ward. The driver is local and stubborn. Private haulers and underfunded clinics still dump medical waste here because the legal landfill charges more and checks bags. Until the waste stream is tracked, sorted, and stopped at the source, every shift on the tip reseeds the same infections.",
      stakeholder: "Rosa, waste-picker cooperative lead",
      pressureKeys: ["Infected Cuts", "Waste Dumping", "Clinic Access"],
      suggested: ["gene-sequencing", "iot", "ai", "materials", "networks", "drones", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Station Road Pilgrim Lodge"],
      title: "Shared cistern cough fills Station Road Lodge",
      scene:
        "Pilgrims and day laborers pack the bunk rooms along Station Road. One roof cistern and a row of shared cups serve everyone. A dry cough started in the men’s hall last month. Now it jumps bed to bed overnight. Imam Karim counts empty prayer mats and unpaid bunk fees. Guests lose workdays; some cannot afford the bus home. The lived harm is simple: fever, cough, and lost wages in a building meant for rest. The driver sits in plain sight. The lodge still draws untreated water into one open tank, and sick guests keep arriving because the road is a transit hub with no screening and no spare isolation room. Shared water and crowded sleep keep the outbreak turning over.",
      stakeholder: "Imam Karim, lodge warden",
      pressureKeys: ["Cough Spread", "Shared Water", "Lost Wages"],
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Old Quay Fish Landing"],
      title: "Gutting rinse sickens Old Quay landings",
      scene:
        "Before dawn the women gut the catch on the wet concrete at Old Quay. They rinse knives and boards in the same harbor slip where the boats tie up. Stomach cramps and bloody diarrhea hit the crew after market days. Nia’s association is short boats because half the members are home sick. Buyers walk past stalls when the smell of illness hangs over the ice. Families feel it in empty dinner pots and missed school fees. The harm is gut illness tied to the landing itself. The driver is the rinse habit no one has broken: fish waste and human runoff mix in the slip, and there is still no clean wash station or rule that keeps dirty water off the cutting tables. Every landing day feeds the next wave of sickness.",
      stakeholder: "Nia, women’s fishers association",
      pressureKeys: ["Gut Illness", "Dirty Rinse", "Market Days"],
      suggested: ["gene-sequencing", "iot", "synbio", "materials", "networks", "ai", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Maple Primary School Yard"],
      title: "Playground pump empties Maple Primary desks",
      scene:
        "Maple Primary’s yard pump is the only water the kids trust at break. Lately the line tastes metallic and the younger classes go home with fever and vomiting by afternoon. Ms. Okonkwo marks empty desks in red. Parents keep children out for a week at a time. Lessons stall; the exam term is at risk. The harm is sick children and a school that cannot stay open full days. The driver is underground and local. The old well sits too close to a cracked septic line from the staff block, and no one tests the water before the bell rings. Until the source is fixed and watched, every drink at the pump can start another classroom outbreak.",
      stakeholder: "Ms. Okonkwo, head teacher",
      pressureKeys: ["Sick Kids", "Bad Well", "Class Days"],
      suggested: ["iot", "gene-sequencing", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "learn-city",
    }
  ],

  climate: [
    {
      places: ["Cedar Bend"],
      title: "Cedar Bend loses the lower ward",
      scene:
        "Spring storms no longer spare the lower ward. Water sits in living rooms for days. Families sleep on cots at the high school while mold climbs the drywall they still pay rent on. Rhea walks the sandbag line at dawn and counts porches that will not dry before the next crest. The harm is not only the water. Upstream, new parking lots and big-box pads sealed the old wetlands that once held the river’s overflow. Every fresh slab sends the crest higher and faster into the same streets. If the paving keeps winning, the lower ward stops being a neighborhood and becomes a seasonal lake.",
      stakeholder: "Rhea, ward flood-watch captain",
      pressureKeys: ["Flooded Homes", "Paved Wetlands", "Missed Shifts"],
      suggested: ["iot", "drones", "materials", "ai", "solar", "battery", "networks", "space"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Juniper Wells"],
      title: "Night heat pins Juniper Wells",
      scene:
        "Nights used to cool the town. They do not anymore. Diego’s clinic fills after dark with kids who cannot keep fluids down and elders whose hearts race in still, hot rooms. Fans push warm air. The free cool rooms at the library fill by supper and turn people away. Outside the fence line, gas flares from the field burn through the night and dump extra heat and fumes onto the same blocks that already bake. The flares keep the wells running and the royalty checks coming, so nobody shuts them off. Until the night heat breaks or the burning slows, sick hours will keep stacking faster than the clinic can staff.",
      stakeholder: "Diego, community clinic organizer",
      pressureKeys: ["Heat Illness", "Gas Flares", "Cool Rooms"],
      suggested: ["solar", "battery", "iot", "ai", "materials", "energy", "networks", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Gull Point"],
      title: "Warm water empties Gull Point nets",
      scene:
        "The co-op ice house used to smell like a good haul by noon. Now Noor watches boats come in light. The water along the point runs warmer than the old charts, and the fish the crews grew up on have shifted toward deeper, colder ground. Families stretch thinner weeks between pay. Diesel still runs almost every hull—ice machines, long steams to farther grounds, generators on the dock—so each trip burns more fuel to catch less. Warm seas and boat exhaust feed each other: thinner catches push longer burns, and the burns add to the same climate squeeze that moved the fish. If the pattern holds, the dock becomes a parking lot for boats that no longer pay for themselves.",
      stakeholder: "Noor, co-op dock lead",
      pressureKeys: ["Empty Nets", "Boat Diesel", "Dock Jobs"],
      suggested: ["tidal", "wind", "battery", "solar", "iot", "ai", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Soot Bridge"],
      title: "Inversion traps Soot Bridge",
      scene:
        "Some mornings the valley holds a lid of dirty air so thick the school flags hang still. Amira’s PTA group tracks nosebleeds, inhalers, and kids sent home by noon. Parents miss work to sit in clinic hallways. The stack at the old coking plant still pushes smoke on the night shift, and when a temperature inversion traps the valley—cold air stuck under warmer air above—the plume has nowhere to go but into bedrooms and playgrounds. Plant jobs pay the mortgages on the same streets that breathe the worst of it. Until the smoke drops or the trapped air stops owning the mornings, sick days will keep beating attendance and paychecks.",
      stakeholder: "Amira, PTA clean-air lead",
      pressureKeys: ["Dirty Air", "Stack Smoke", "Sick Days"],
      suggested: ["materials", "iot", "ai", "drones", "networks", "solar", "battery", "robots"],
      visionTheme: "social-city",
    }
  ],

  cancer: [
    {
      places: ["Circuit Beach scrap yards"],
      title: "Circuit Beach burns still seed the tumors",
      scene:
        "At Circuit Beach, open scrap yards strip old electronics for copper. Workers light board piles so the metal drops free. Smoke hangs low over shacks and the path kids use to school. Health volunteer Ama Diallo treats open sores that will not heal and tracks neighbors who later hear the word cancer. The burns do not stop. Cash from copper is still the wage that covers food and fees, so the pits are lit again before dawn.",
      stakeholder: "Scrap-yard health volunteer Ama Diallo",
      pressureKeys: ["Open sores", "Burn smoke", "Scrap wages"],
      suggested: ["iot", "drones", "materials", "ai", "gene-sequencing", "robots", "solar", "networks"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Old Gasworks School block"],
      title: "Playground vapors no one capped in time",
      scene:
        "The elementary school sits on land that once held gas tanks. Black tar still seeps under the blacktop. Kids leave class with headaches, nosebleeds, and long sick stretches at home. PTA nurse coordinator Priya Nair keeps the count and sees the pattern grow each term. The old tanks were never fully capped. Cleanup money loses the budget fight year after year, so vapors keep rising through cracked soil while recess goes on above.",
      stakeholder: "PTA nurse coordinator Priya Nair",
      pressureKeys: ["Sick kids", "Tar vapors", "Budget fights"],
      suggested: ["iot", "materials", "ai", "gene-sequencing", "drones", "networks", "computing", "space"],
      visionTheme: "learn-city",
    },
    {
      places: ["Nail Row beauty corridor"],
      title: "Solvent booths trade lungs for tips",
      scene:
        "Nail Row is a tight strip of booths with thin walls and weak fans. Polish removers and acrylic liquids fill the air for twelve-hour shifts. Booth steward Linh Tran hears the same dry coughs and watches skilled workers miss days they cannot afford. Tips keep the chairs full. Landlords keep rent high and vent upgrades off the table, so the same solvents that finish a manicure keep soaking into lungs and raising long-term cancer risk.",
      stakeholder: "Booth steward Linh Tran",
      pressureKeys: ["Cough spells", "Booth fumes", "Lease fear"],
      suggested: ["iot", "materials", "ai", "networks", "gene-sequencing", "print3d", "solar", "nano"],
      visionTheme: "social-city",
    },
    {
      places: ["Vinyl Reach night plant"],
      title: "Night resin lines still mark the livers",
      scene:
        "On the night shift at Vinyl Reach, hot resin lines run hard to hit orders. Sweet chemical smells cling to clothes and skin. Shift safety rep Omar Haddad logs new liver cases among crews who stack overtime when quotas rise. Stopping a line costs the plant more than a clinic visit, so small leaks get wiped and the run continues. The same push that fills shipping docks keeps marking workers’ bodies year after year.",
      stakeholder: "Shift safety rep Omar Haddad",
      pressureKeys: ["Liver cases", "Resin leaks", "Overtime push"],
      suggested: ["iot", "robots", "ai", "materials", "gene-sequencing", "networks", "computing", "synbio"],
      visionTheme: "energy-city",
    }
  ],

  mental: [
    {
      places: ["Ames Cyclone Corridor, Iowa"],
      title: "Waitlist longer than the semester",
      scene:
        "On the Iowa State side of town, students sit through lectures with racing hearts and then walk home alone. Panic hits at night in crowded dorms; some stop sleeping, and a few drop classes before anyone on staff knows their name. Campus counseling is free on paper, but the wait for a real appointment can run past finals. Peer supporters take the overflow on phones and late-night walks, yet they are students too. The driver is not only “stress.” The university grew enrollment faster than counseling seats, and insurance rules plus stigma still push kids to tough it out until grades crack. If nothing changes, the corridor will keep minting crises faster than it can answer them.",
      stakeholder: "Campus peer-support director",
      pressureKeys: ["Panic Nights", "Wait Lists", "Grade Fear"],
      suggested: ["ai", "networks", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Garden City Packing Ward, Kansas"],
      title: "The line never slows for grief",
      scene:
        "Before dawn, workers clock into the packing plant with sore hands and quiet faces. Many came for steady pay; some carry grief from family left behind or from injuries and deaths on the line. Breaks are short. Talking about sadness can feel like risking the job, so people go silent and push through. Exhaustion piles up: missed sleep, short tempers at home, and no easy path to a counselor who speaks their language on a night shift. The local driver is the line itself—speed and staffing targets that treat recovery time as waste. Chaplains and wellness liaisons catch what they can in hallways, but the system keeps grinding out hurt faster than care can reach the floor.",
      stakeholder: "Plant chaplain and wellness liaison",
      pressureKeys: ["Exhaustion", "Line Speed", "Silence"],
      suggested: ["networks", "ai", "transportation", "vr", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Detroit Receiving Night Floor, Michigan"],
      title: "Twelve-hour hearts running empty",
      scene:
        "On the night floor, monitors beep and families wait in plastic chairs. Nurses carry the weight of hard calls—who gets the last bed, who hears bad news alone—and then clock out still replaying what they could not fix. That wound has a name people use here: moral injury, the hurt that comes when you know the right care and cannot deliver it. Short staffing means doubles and skipped meals. New hires leave within a year. The lived harm is burnout you can see in shaking hands and empty break rooms. The driver is a hospital system that runs census and overtime harder than it rebuilds the team, so the same floor keeps breaking the people who hold it together.",
      stakeholder: "ICU charge nurse coalition",
      pressureKeys: ["Moral Injury", "Short Staffing", "Turnover"],
      suggested: ["ai", "robots", "networks", "vr", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Phoenix Desert Stack, Arizona"],
      title: "Five stars or the spiral",
      scene:
        "In heat that stays past sunset, app workers bounce between apartment towers and strip-mall lots. One bad rating can cut the next week’s orders. People drive sick, skip water, and answer rude messages with a forced smile because the algorithm does not care why. Anxiety spikes when the phone goes quiet; isolation follows when every hour is a solo hustle with no break room and no boss to appeal. Mutual-aid organizers share shade, snacks, and crisis numbers in parking garages, but the driver is the rating-and-dispatch system itself—it rewards constant availability and punishes rest. Without a real safety net, burnout becomes the default shift, and the spiral pulls drivers out of housing and care at the same time.",
      stakeholder: "Gig worker mutual-aid organizer",
      pressureKeys: ["Burnout", "Rating Fear", "No Safety Net"],
      suggested: ["ai", "networks", "transportation", "computing", "solar"],
      visionTheme: "social-city",
    }
  ],

  alzheimer: [
    {
      places: ["Prairie View Senior Cottages, Grand Island"],
      title: "Dusk walks past the grain bins",
      scene:
        "At Prairie View the cottages sit low beside the rail spur and the old grain bins. After supper, people with memory loss sometimes slip out the side gate. Families find them hours later on the county road, cold and confused, shoes full of dust. One night last winter a man walked toward the highway lights and was nearly hit by a truck.\n\nThe harm is real and local: neighbors lose sleep, volunteers burn out, and residents lose the freedom to walk safely at dusk. What keeps feeding the problem is thinner than the cottages admit. Checks still run on paper clipboards and a single night phone. Adult children live hours away in Lincoln or Omaha. There is no shared map of who left, when, or which path they usually take—so the same gaps open every evening between the bins and the dark fields.",
      stakeholder: "Ruth, township volunteer coordinator",
      pressureKeys: ["Wandering", "Late Checks", "Family Distance"],
      suggested: ["iot", "ai", "networks", "drones", "transportation", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Harbor Lights Tower, Seattle"],
      title: "Three floors, one night aide",
      scene:
        "Harbor Lights is a tall senior tower above the ferry noise. On many nights one aide covers three floors. Pills get late. Call lights stack up. A resident with early dementia waits too long for help to the bathroom and falls in the hall. Others stop trusting the staff and hide symptoms so they will not be moved to a locked unit.\n\nPeople feel the harm in missed doses, lonely nights, and fear of being a burden. The driver is not only kindness running short. The building still runs care like a thin hotel shift: paper med carts, slow radios, and no backup when someone calls in sick. Wages and housing costs push aides out of the city, so the same understaffed pattern resets every roster. Without better tools and trust, the tower keeps producing the same crises floor by floor.",
      stakeholder: "Kenji, resident council president",
      pressureKeys: ["Missed Meds", "Thin Staffing", "Trust Gap"],
      suggested: ["robots", "iot", "ai", "networks", "vr", "battery"],
      visionTheme: "care-city",
    },
    {
      places: ["Ironbound Walk-In Row, Youngstown"],
      title: "After the midnight caregiving shift",
      scene:
        "On Walk-In Row the free clinic stays open late because families have nowhere else to go. Angela sees daughters who worked a factory shift, then sat up all night with a parent who no longer knows the house. By morning the caregivers shake, skip their own blood pressure meds, and miss the short window when a memory screen—a simple clinic check for early thinking changes—could still help.\n\nThe lived harm is exhaustion, ER dumps, and elders moved into crisis beds far from home. What keeps the problem growing is the local care grind itself. There is no steady day program, little respite, and almost no ride that fits a night-shift life. People wait until a fall or a police wellness check forces a move. The row keeps absorbing the crash instead of catching memory loss earlier, so each year more f",
      stakeholder: "Angela, free-clinic nurse practitioner",
      pressureKeys: ["Exhaustion", "Missed Screens", "Crisis Moves"],
      suggested: ["ai", "networks", "transportation", "computing", "iot", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Little Mekong Courtyard, Fresno"],
      title: "Prayers between bus transfers",
      scene:
        "In the courtyard behind the temple, elders wait for the bus that links home, market, and clinic. Some already forget the transfer. Families fear the wide arterial roads, yet shame keeps them from naming dementia out loud. Appointments slip. A grandmother crosses against the light because the Khmer instructions on the phone app never matched what the driver said.\n\nPeople feel the harm as near-misses in traffic, delayed diagnosis, and quiet isolation from neighbors who might help. The driver is a local system that still assumes English forms, one fixed bus clock, and adult children free at midday. Mutual-aid leads like Sothea patch rides with prayer lists and borrowed vans, but the same gaps—language, stigma, and hard-to-reach clinics—keep pushing memory loss into the street instead of into ",
      stakeholder: "Sothea, temple mutual-aid lead",
      pressureKeys: ["Traffic Risk", "Language Barrier", "Shame Delay"],
      suggested: ["ai", "networks", "iot", "drones", "vr", "self-driving"],
      visionTheme: "social-city",
    }
  ],

  ageing: [
    {
      places: ["Midtown Home-Care Corridor"],
      title: "Doubles until the body breaks",
      scene:
        "On the third-floor walk-ups along the Midtown Home-Care Corridor, aides lift the same clients twice before noon. Knees pop. Backs seize. One worker tapes her wrists in the stairwell because the next visit is a full transfer from bed to chair. Families pay for hours, not for rest, so the schedule packs visits tight and skips recovery time. The real driver is not only weak bodies at home. It is a care system that still treats ageing as endless manual labor: no shared lift gear on every floor, thin training for joint-safe moves, and pay that forces double shifts. Harm lands in the workers first—strained shoulders, missed family dinners, people quitting mid-route—while the same model keeps grinding more years out of fewer hands.",
      stakeholder: "Home-care workers cooperative steward",
      pressureKeys: ["Body strain", "Shift load", "Worker gaps"],
      suggested: ["ai", "robots", "iot", "networks", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Brickfields Elder Yards"],
      title: "Kilns that outlast bones",
      scene:
        "At the Brickfields Elder Yards, men and women past sixty still stack green bricks beside the firing kilns. Heat rolls off the arches. Dust coats their throats. By late afternoon, hips lock and fingers refuse to close on the tongs. Younger hires left for warehouse jobs, so the yards keep the older crew on piece rates because the orders never stop. The lived harm is joint pain, heat exhaustion, and wages that vanish when a bad knee means a week off. What keeps the problem running is a production line built for young bodies and cheap fuel: long kiln cycles, no cool rest bays, and no plan to redesign lifts or shift patterns for longer working lives. Ageing here is not a quiet retirement. It is the same hard labor until the body fails.",
      stakeholder: "Yard occupational health lead",
      pressureKeys: ["Joint pain", "Kiln heat", "Lost wages"],
      suggested: ["materials", "robots", "iot", "ai", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Sunstack Senior Towers"],
      title: "Upper floors without cool air",
      scene:
        "In Sunstack Senior Towers, the elevators stall in summer and the top floors bake after noon. Residents sit by open windows with wet towels because the old window units trip the breakers. One woman times her errands for dawn so she will not climb stairs in the heat. Another skips dinner to keep the fan running. People feel the harm now: dizzy spells, poor sleep, and days spent alone because friends will not visit a sweltering flat. The driver is not weather alone. It is a building and billing system that never planned for longer lives in place—thin insulation, peak-rate power, and no shared cooling or battery buffer on the upper stacks—so each hot season pushes frail tenants harder while the towers stay the same.",
      stakeholder: "Tenant association chair",
      pressureKeys: ["Heat stress", "Power bills", "Alone hours"],
      suggested: ["solar", "battery", "iot", "ai", "networks", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["River Gate Wholesale Market"],
      title: "Dawn stalls without successors",
      scene:
        "Before sunrise at River Gate Wholesale Market, vendors in their seventies haul crates off the trucks. Wet floors take ankles. Ice bins freeze stiff fingers. A fall behind a fish stall ends a week of sales, and there is no spare cousin waiting to open the shutter. Buyers still want the early lots, so the same elders keep the grind because the market never built a handoff—no lighter carts, no shared lift gear, no training path that brings younger sellers in beside them. Harm shows up as bruises, skipped clinic days, and stalls that go dark when a hip gives out. The driver is a wholesale rhythm that treats lasting strength as free fuel and has no local system to extend working healthspan or pass the stall on without a crash.",
      stakeholder: "Market vendors guild secretary",
      pressureKeys: ["Falls", "Dawn grind", "Thin help"],
      suggested: ["robots", "iot", "ai", "print3d", "transportation", "gene-sequencing"],
      visionTheme: "food-city",
    }
  ],

  water: [
    {
      places: ["Canal Ward"],
      title: "Standpipes sputter brown in Canal Ward",
      scene:
        "In Canal Ward the morning line forms before sunrise. Kids carry jerrycans to the shared standpipe and wait while the tap coughs rust-colored water that stains clothes and burns throats. Mothers skip work to boil what little comes out, and still the clinic sees more stomach bugs each week. The pipes under the lanes are old iron, cracked where salt and truck vibration eat the joints. Leaks pull ditch water and sewage back into the main whenever pressure drops. The utility keeps patching the loudest breaks and then moves on, so the same stretch fails again. Until the line itself stops sucking dirt, every clean bucket is temporary.",
      stakeholder: "Mira, standpipe committee lead",
      pressureKeys: ["Sick Days", "Pipe Failures", "Repair Delay"],
      suggested: ["iot", "materials", "nano", "ai", "solar", "battery", "networks", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Paddy Step Wells"],
      title: "Green film coats the Paddy Step Wells",
      scene:
        "At the Paddy Step Wells the stone stairs still lead down to water families have trusted for generations. This season a green film skins the surface by noon, and children who drink from the lower steps come home with fever and cramps. Growers upstream flood fields with fertilizer and pesticide after each dry spell. When the rains come, that runoff slides straight into the shared wells before anyone can divert it. Neighbors argue over whose turn it is to draw, and some dig illegal side pits that pull the water table lower. The wells keep getting dirtier because the fields keep feeding them chemicals, not because people refuse to carry buckets farther.",
      stakeholder: "Sita, growers’ water keeper",
      pressureKeys: ["Tummy Bugs", "Field Runoff", "Well Fights"],
      suggested: ["iot", "drones", "ai", "materials", "nano", "solar", "gene-sequencing", "space"],
      visionTheme: "food-city",
    },
    {
      places: ["Night Clinic Bore"],
      title: "Boil orders never lift at Night Clinic Bore",
      scene:
        "The Night Clinic Bore is supposed to supply clean water for handwashing, IV bags, and the maternity ward. Instead staff post boil orders that never end. Nurses watch wound infections climb on the night shift, and families pay for sealed bottles they cannot afford. Behind the clinic a cracked septic trench sits uphill from the bore. When the rains hit or the pump runs hard, waste seeps through the soil into the same aquifer the drill taps. The clinic treats the sick with water that helps make them sick. Until the septic path is cut and the bore is protected at the source, every new filter only buys a few quiet weeks.",
      stakeholder: "Dr. Elias, night-shift clinician",
      pressureKeys: ["Ward Infections", "Septic Seep", "Bottle Bills"],
      suggested: ["iot", "materials", "nano", "solar", "battery", "robots", "ai", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["Guest Pier"],
      title: "Guest pools win, alley taps lose at Guest Pier",
      scene:
        "Along Guest Pier the hotels keep the pools blue and the guest showers hot. One street back, alley taps run dry by mid-morning and residents queue with pans for a trickle that tastes of salt. Noor’s cistern crew rations what they catch from roofs, but the shared wells are dropping. Resorts and new guest villas pump from the same thin coastal aquifer and pipe the best flow to tourist meters first. Overdraw pulls seawater inland, so the alleys get brackish dregs while the pier stays green. People are not only short of taps—they are last in line on a system built to serve visitors before neighbors.",
      stakeholder: "Noor, alley cistern steward",
      pressureKeys: ["Thirst Lines", "Well Overdraw", "Guest Priority"],
      suggested: ["iot", "solar", "battery", "materials", "nano", "ai", "tidal", "networks"],
      visionTheme: "coastal-city",
    }
  ],

  air: [
    {
      places: ["Tidegate Fishing Quays"],
      title: "Bunker smoke on wash day",
      scene:
        "On wash day the quay fills with wet nets and kids. Old fishing boats still burn heavy bunker fuel at the berths because shore power is scarce and pricey. Black smoke rolls low over the drying lines. Nurses at the dock clinic see red eyes, tight chests, and more asthma puffs after every busy landing. Families taste soot on laundry and fish. The harm is in the air people breathe between boat and home. The driver keeps running: engines idle for ice, lights, and winches whenever the pier outlets cannot take the load.",
      stakeholder: "Dock clinic nurses and fisher-family co-op",
      pressureKeys: ["Burning eyes", "Ship smoke", "Berth power"],
      suggested: ["iot", "ai", "solar", "battery", "energy", "networks", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Ring Road School Corridor"],
      title: "Recess under the flyover",
      scene:
        "The school yard sits under a concrete flyover where ring-road trucks downshift all morning. Kids run recess in a haze that leaves a metallic taste. Teachers log more sick days and inhalers after diesel peaks. Parents time pickups to dodge the worst plumes, yet the corridor still funnels long-haul freight because it is the cheapest path across the city. The lived harm is coughs, missed class, and stinging throats. The driver is the truck route itself—old engines, stop-start grades, and weak fleet rules that keep exhaust pouring over the playground.",
      stakeholder: "Parent-teacher air watch and corridor bus crews",
      pressureKeys: ["Sick days", "Truck exhaust", "Fleet rules"],
      suggested: ["transportation", "iot", "ai", "battery", "solar", "networks", "computing", "drones"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal-Side Scrap Lanes"],
      title: "Evening fires in the lane",
      scene:
        "After dark the scrap lanes glow. Waste-picker crews burn cable and plastic to strip copper because dump fees and formal yards cost more than a night’s sort. Smoke slides into one-room homes along the canal. Midwives hear baby coughs sharpen and see tiny chests work too hard before dawn. People feel the harm in stinging eyes and nights without clean air for infants. The system that keeps making the smoke is simple: no cheap clean way to reclaim metal, so open fires stay the paying method.",
      stakeholder: "Waste-picker cooperative and community midwives",
      pressureKeys: ["Baby cough", "Waste fires", "Dump fees"],
      suggested: ["materials", "iot", "ai", "solar", "battery", "robots", "print3d", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Riverside Dye Cluster"],
      title: "Colored fog at shift change",
      scene:
        "At shift change a colored fog hangs between the dye sheds and the boarding houses. Coal and oil boilers still raise steam for the vats when the grid flickers, and vents push the plume straight into narrow streets. Garment workers walk home with tight chests and headaches; aunties open windows only to shut them again. Piece rates push shops to run extra night batches instead of fixing stacks or switching heat. People feel the harm in burning lungs and spoiled sleep. The driver is the cluster’s cheap dirty steam—old boilers tied to rush orders that will not wait for cleaner power.",
      stakeholder: "Garment workers’ health circle and boarding-house aunties",
      pressureKeys: ["Chest pain", "Boiler smoke", "Piece rates"],
      suggested: ["energy", "solar", "battery", "iot", "ai", "materials", "nano", "networks"],
      visionTheme: "care-city",
    }
  ],

  "energy-access": [
    {
      places: ["Ulaanbaatar Ger District Lanes"],
      title: "Coal smoke fills the gap the grid left",
      scene:
        "Winter nights in the ger lanes still mean raw throats and kids who wake coughing. Families burn raw coal in iron stoves because the formal grid stops at the paved edge and never reaches most plots. The lived harm is simple: dirty indoor air, clinic lines for lung trouble, and mothers who keep windows shut against the cold while the smoke stays in. The driver that keeps this going is not only cold weather. Land plots sit in a legal gray zone, so utilities will not run stable lines, and cheap coal remains the only heat people can buy by the sack. Until power is clean, local, and legal to connect, every cold snap pushes more smoke into the same felt walls.",
      stakeholder: "Ger district health volunteer lead",
      pressureKeys: ["Cough nights", "Coal smoke", "Plot rights"],
      suggested: ["solar", "battery", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Camotes Island Rice Co-op Wharf"],
      title: "Harvest waits while the genset coughs",
      scene:
        "After harvest, sacks pile on the wharf while the co-op’s old diesel genset sputters and dies. Without steady power, the small mill and the cold room cannot run, so grain heats, bugs move in, and families lose the sale that pays school fees. Fishers and rice growers feel it the same week: spoiled stock and another loan. The local driver is not bad farming. The island sits at the weak end of a long feeder line, so brownouts are normal, and the co-op keeps renting diesel by the drum because no one has financed a clean microgrid the members can own. Every delayed milling day turns energy poverty into empty lunch boxes.",
      stakeholder: "Rice co-op chair",
      pressureKeys: ["Spoiled grain", "Diesel waits", "School fees"],
      suggested: ["solar", "battery", "wind", "iot", "networks", "energy"],
      visionTheme: "food-city",
    },
    {
      places: ["Humla Trailhead Health Post"],
      title: "The sterilizer sleeps through the night shift",
      scene:
        "At the trailhead clinic, night births still happen by phone light when the sterilizer and the lamp cut out. Midwives boil instruments on a kerosene ring and send porters down-slope for fuel that arrives late or not at all. Mothers feel the harm in long labors, infection risk, and staff who are too tired to climb to the next village at dawn. The driver is the energy chain itself: there is no reliable line over the pass, so every critical device depends on jerrycans carried on foot. Until the post can make and store its own power on site, dark hours will keep turning routine deliveries into emergencies.",
      stakeholder: "District midwife supervisor",
      pressureKeys: ["Dark births", "Fuel porters", "Staff burnout"],
      suggested: ["solar", "battery", "drones", "networks", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Makoko Lagoon Stilt Blocks"],
      title: "Light sold by the hour on the lagoon",
      scene:
        "On the stilt blocks, students share one bulb rented by the hour from a neighbor’s noisy generator wire. Homework stops when the coin runs out, and evening classes cancel when the extension cord sparks over the water. Families feel it as dark study time, burned eyes, and kids who fall behind. The driver is how power is sold here: no formal meters reach the lagoon homes, so informal middlemen price light in short slices and take a cut on every fragile splice. Until the community can own safe generation and fair sharing rules, energy access will stay a nightly toll instead of a public floor.",
      stakeholder: "Lagoon teachers' collective secretary",
      pressureKeys: ["Dark study", "Wire fees", "Trust gap"],
      suggested: ["solar", "battery", "iot", "crypto", "networks", "ai"],
      visionTheme: "social-city",
    }
  ],

  homeless: [
    {
      places: ["Sunbelt Weekly Inn strip, Mesa corridors"],
      title: "Noon checkout into a furnace lot",
      scene:
        "At 11 a.m. the weekly motels along Baseline push families out with rolling bags into asphalt that already burns through shoe soles. Kids wait in the shade of a vending machine while parents call every number on a crumpled list. Heat illness hits hard here: dizziness, vomiting, and ER trips that empty the last cash. The driver is not only the sun. Owners keep room churn high—short stays, rising nightly rates, and quick turnovers—so the strip never becomes stable housing. Caseworkers like Marisol race the same loop: find a bed before dark, lose it at checkout, start over. Without cooler safe rooms and a way to slow the churn, more people will sleep in cars and lots that cook them.",
      stakeholder: "Marisol, motel outreach caseworker",
      pressureKeys: ["Heat illness", "Room churn", "Case backlog"],
      suggested: ["ai", "networks", "iot", "solar", "battery", "materials", "print3d", "transportation"],
      visionTheme: "care-city",
    },
    {
      places: ["Riverbend Family Justice annex"],
      title: "Thirty safe nights, then the courthouse lot",
      scene:
        "Keisha meets survivors at the annex with a duffel and a clock. Shelter rules often cap a stay at about thirty safe nights. After that, people end up in the courthouse lot or a couch that is not truly safe. The lived harm is nights without a locked door—fear, missed work, kids who cannot sleep. The system that keeps producing the crisis is a tangle of voucher rules and credit blocks: aid that expires, landlords who demand clean records, and paperwork that moves slower than the danger. Protection alone is not enough if the exit path still dumps families back outside. The quest is to turn short safety into lasting keys without trapping people in the lot.",
      stakeholder: "Keisha, domestic-violence housing advocate",
      pressureKeys: ["Unsafe nights", "Voucher rules", "Credit blocks"],
      suggested: ["ai", "networks", "computing", "crypto", "vr", "transportation", "iot", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Palm Court senior trailer park"],
      title: "Sold out from under the fixed check",
      scene:
        "Harold still keeps the park board minutes in a binder on his kitchen table. Last spring a new owner bought Palm Court and raised lot rent faster than any Social Security check can stretch. Neighbors who paid on time for decades now face notices. Displacement here looks like a U-Haul at dawn and a folding chair on a relative’s porch. The harm is seniors losing the only home they can afford. The driver is the sale-and-raise cycle: investors buy aging parks, lift lot rent, and treat fixed incomes as someone else’s problem. Rebuilding trust means more than a tent—it means ownership tools, fair rent brakes, and homes that cannot be flipped out from under people living on a fixed check.",
      stakeholder: "Harold, retired machinist and park board member",
      pressureKeys: ["Displacement", "Lot rent", "Fixed checks"],
      suggested: ["ai", "networks", "computing", "materials", "print3d", "solar", "battery", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["County General ambulance bay curb"],
      title: "Discharged still weak to the ambulance bay",
      scene:
        "Dr. Nadim signs discharge papers knowing the next bed is a bus bench by the bay. Patients leave still weak—post-surgery, pneumonia, heart failure—because the hospital has no medical respite beds and street nights undo the treatment by morning. Readmissions climb. The lived harm is pain, infection, and fear on concrete. The local driver is bed pressure tied to unpaid med debt and a housing market that will not take anyone sick or broke. Ambulances circle the same names. Stopping the loop means step-down rooms, transport that does not dump people at the curb, and a path off the street before the next collapse.",
      stakeholder: "Dr. Nadim, ER attending and respite organizer",
      pressureKeys: ["Street nights", "Bed pressure", "Med debt"],
      suggested: ["ai", "networks", "computing", "transportation", "iot", "drones", "solar", "battery"],
      visionTheme: "care-city",
    }
  ],

  cities: [
    {
      places: ["Ahmedabad Textile Lane Roofs"],
      title: "Tin roofs that still cook after dark",
      scene:
        "On the textile lanes, families sleep under thin metal sheets that hold the day’s heat long after sunset. Kids wake sticky and short of breath. Elders skip meals because the upstairs rooms feel like ovens. Clinics see more heat exhaustion each summer week.\n\nThe harm is not only weather. Builders keep covering every open yard with concrete and tin because land prices push denser sheds and fewer trees. Cool courtyards vanish. Without shade, reflective roofs, or night power for fans, the same lanes cook people year after year.",
      stakeholder: "Ward heat-health and housing desk",
      pressureKeys: ["Heat Nights", "Hardscape", "Sick Days"],
      suggested: ["solar", "materials", "iot", "ai", "battery", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Manila Estero de Vitas Pocket"],
      title: "The estero that became the alley dump",
      scene:
        "In the pocket beside Estero de Vitas, knee-deep water still sits in ground-floor rooms two days after a hard rain. Kids wade past floating bags to reach the alley. Parents boil water and miss shifts when the path out is a trash-choked ditch.\n\nPeople dump here because collection trucks cannot reach the tight lanes and landlords charge for every extra bin. The estero—the narrow tidal creek that should drain the block—fills with plastic and silt instead. Each storm backs up faster. Flooding is the lived harm; blocked water and unpaid waste routes are what keep making it worse.",
      stakeholder: "Barangay waterway and solid-waste council",
      pressureKeys: ["Flooding", "Trash Backup", "Tenant Squeeze"],
      suggested: ["drones", "iot", "materials", "robots", "ai", "transportation"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Bogotá Soacha Ridge Stops"],
      title: "Three hours down the ridge for a shift",
      scene:
        "Before dawn, workers line the ridge paths above Soacha waiting for a bus that may already be full. A two-hour downhill crawl into Bogotá can become three when the feeder van never comes. People lose pay for late clocks. Teens drop night classes because the ride home is unsafe and slow.\n\nThe city core still treats the hillside stops as an afterthought. Formal routes end at the flat avenues; the last climb is left to irregular vans with no shared schedule or fair fare card. Long commute hours are what families feel. Broken feeder links are the local system that locks the ridge out of a fair city.",
      stakeholder: "Hillside feeder and fare-integration office",
      pressureKeys: ["Commute Hours", "Feeder Gaps", "Lost Wages"],
      suggested: ["transportation", "ai", "networks", "battery", "solar", "self-driving"],
      visionTheme: "social-city",
    },
    {
      places: ["Nairobi Mathare Ridge Schools"],
      title: "Lessons under the zinc sheets",
      scene:
        "In Mathare’s ridge classrooms, sixty children share benches under a zinc roof that roars when it rains. When the power cuts, the lesson ends. Teachers shout over the noise. Families pull older kids out to earn cash when fees and crowded rooms make school feel useless.\n\nThe county still leases fragile plots that landlords can flip for housing the moment a better offer appears. Schools cannot expand or wire steady power on ground that might be sold next year. Crowded, dark rooms are the harm kids feel now. Unstable public land deals are the driver that keeps education thin on the ridge.",
      stakeholder: "County basic-education and public-land unit",
      pressureKeys: ["Crowded Rooms", "Plot Flip", "Dropouts"],
      suggested: ["networks", "vr", "solar", "print3d", "iot", "ai"],
      visionTheme: "learn-city",
    }
  ],

  child: [
    {
      places: ["El Alto compound kitchens, La Paz highlands"],
      title: "Night smoke steals small breaths",
      scene:
        "After dark on the high plain, mothers light dung and scrap wood in shared courtyard kitchens. The smoke has nowhere to go in the cold thin air. Toddlers wake with tight chests and a wet cough that does not clear by morning. The clinic nurse counts more wheezing kids each winter week. Families keep burning what they can buy cheap because bottled gas costs more than a day’s wage and the grid cuts out when people need heat most. Until clean heat is cheaper and steadier than smoke, small lungs will keep paying the bill.",
      stakeholder: "Highland community health nurse",
      pressureKeys: ["Wheezing", "Cook smoke", "Fuel cost"],
      suggested: ["solar", "battery", "materials", "iot", "ai", "networks", "energy", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cebu canal-edge daycare, Visayas waterfront"],
      title: "Trash gutters breed the fever",
      scene:
        "Along the canal, plastic and food waste clog the drains after every hard rain. Water sits for days beside the daycare gate. Mosquitoes breed in the still pools, and dengue fever — a mosquito-borne illness that spikes temperature and pain — hits the smallest children first. Parents miss shifts at the port when a child burns with fever. The barangay can fog streets and hand out nets, but trash still slides into the same gutters because pickup is irregular and the canal has no real flow path. As long as waste and water pool at the doorstep, the fever keeps coming back.",
      stakeholder: "Barangay child-health coordinator",
      pressureKeys: ["Child fever", "Standing water", "Missed work"],
      suggested: ["iot", "drones", "ai", "networks", "materials", "solar", "space", "robots"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Kano grain-market under-fives post, northern Nigeria"],
      title: "Spoiled millet on the growth chart",
      scene:
        "At the under-fives post beside the grain market, the nurse wraps a paper band around little arms. Too many read thin. Mothers buy millet and sorghum from open sacks that sat through heat and damp in poorly sealed stores. Mold and weevils spoil the grain before it reaches the pot, so meals fill bellies without enough real nourishment. Traders know buyers will walk if prices jump, so bad stock still moves. Without cooler dry storage and a way to prove grain is clean, the growth charts will keep sliding even when the market looks full.",
      stakeholder: "Nutrition surveillance officer",
      pressureKeys: ["Thin arms", "Spoiled grain", "Market trust"],
      suggested: ["gene-sequencing", "iot", "ai", "solar", "networks", "drones", "materials", "synbio"],
      visionTheme: "food-city",
    },
    {
      places: ["Old Fadama scrap-yard edge clinic, Accra"],
      title: "Battery dust on the play sand",
      scene:
        "Kids play in the dirt a few meters from where workers crack old lead-acid batteries and burn cable sheaths for copper. Fine dust settles on hands, toys, and the porridge bowl. At the edge clinic, children show slow growth and tired blood — signs the body is carrying lead, a metal poison that harms brains and bones. Families need the scrap wages. Yards stay open because buyers pay for metal and no safer line of work sits next door. Until the dust is stopped at the source and clean jobs replace the toxic ones, the play sand will keep making children sick.",
      stakeholder: "Pediatric environmental health officer",
      pressureKeys: ["Slow growth", "Lead dust", "Scrap jobs"],
      suggested: ["iot", "nano", "materials", "ai", "drones", "networks", "robots", "gene-sequencing"],
      visionTheme: "rebuild-city",
    }
  ],

  maternal: [
    {
      places: ["Solukhumbu trail clinic"],
      title: "Bamboo stretcher at the switchback",
      scene:
        "On the switchback above Namche, a mother bleeds through a cotton pad while neighbors carry her on a bamboo stretcher. The trail clinic can stop some bleeding with basic kits, but the nearest full obstetric room is hours down a road that washes out every monsoon. Families feel the harm in cold hands and long waits: blood loss that should be treatable turns deadly when the jeep never comes. The driver that keeps this going is not only distance. Seasonal porter schedules and a single shared vehicle mean emergency runs lose to tourist treks and cargo, so postpartum crises stack up the same way every year.",
      stakeholder: "Trail health volunteer circle",
      pressureKeys: ["Heavy Bleeding", "Road Wait", "Staff Gaps"],
      suggested: ["drones", "transportation", "networks", "solar", "battery", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Rakhiyal chawl maternity room"],
      title: "Night heat on the birth floor",
      scene:
        "In the chawl maternity room, mothers share cots under a tin roof that holds the day’s heat long after dark. When the grid dies, fans stop and the sterilizer goes cold; a new mother spikes a fever and there is no clean way to cool her or keep instruments safe. Women feel the harm as soaked sheets, racing pulses, and babies who cannot settle in the stale air. The system that keeps producing the danger is a wiring plan built for lights and phones, not for round-the-clock birth care—landlords still meter power by the room, so backup fuel and stable outlets never reach the birth floor.",
      stakeholder: "Chawl women’s health sabha",
      pressureKeys: ["Mother Fever", "Power Cuts", "Crowding"],
      suggested: ["solar", "battery", "energy", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cerro Alto workers’ maternity desk"],
      title: "Dust in the labor queue",
      scene:
        "Outside the mine’s maternity desk, spouses wait in a line that tastes of dust. A woman who seized at home sits on a plastic chair while the clerk checks shift papers before anyone opens a chart. Families feel the harm as delayed magnesium, unpaid clinic fees, and husbands who cannot leave the pit without losing the day’s wage. The driver is the roster itself: contractor rules tie clinic access to active badges and night-shift gates, so high blood pressure in pregnancy keeps getting treated late even when the building is only a short walk from the shaft.",
      stakeholder: "Mine spouses’ care committee",
      pressureKeys: ["Seizures", "Shift Rules", "Clinic Fees"],
      suggested: ["networks", "ai", "transportation", "iot", "computing", "vr", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Mtwapa creek birth shelter"],
      title: "Warm vials at low tide",
      scene:
        "At low tide the creek birth shelter smells of salt and kerosene. A midwife holds a vial of medicine that has sat warm too long because the cooler failed again; across the water a mother bleeds while the ferry waits on fuel and tide. People feel the harm in shaky hands, spoiled oxytocin, and hours when a short boat ride becomes a gamble. The local driver is a supply chain that still treats the creek as an afterthought—cold boxes, fuel, and spare parts move on the same slow ferry schedule as market goods, so safe birth drugs keep arriving late or already warm.",
      stakeholder: "Creek midwife cooperative",
      pressureKeys: ["Bleeding", "Warm Medicine", "Ferry Delay"],
      suggested: ["solar", "battery", "iot", "drones", "networks", "transportation", "ai"],
      visionTheme: "coastal-city",
    }
  ],

  coord: [
    {
      places: ["Carhuaz–Huaraz valley towns, Cordillera Blanca"],
      title: "Lakes that will not speak together",
      scene:
        "When a glacial lake above the valley rises too fast, the flood can tear through farms and road bridges in hours. Families already live with cracked walls, lost potato fields, and nights spent listening for sirens that may never come in time. Each town keeps its own water gauges, radio channels, and emergency lists. Neighboring desks do not share live readings or a common response purse, so one town’s warning dies at the next ridge. The harm is wet houses and ruined harvests. The driver is separate systems that refuse to act as one corridor when the mountains send the same water down on everyone.",
      stakeholder: "Valley civil-defense coordinators",
      pressureKeys: ["Flood damage", "Silent gauges", "Blame games"],
      suggested: ["iot", "networks", "ai", "space", "drones", "computing", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Delhi–Ghaziabad–Noida work corridors"],
      title: "Three cities, one heat wave",
      scene:
        "In peak summer the factory and warehouse belts bake. Workers faint on shifts, clinics fill with heat illness, and night buses still run full because people cannot miss pay. Heat does not stop at city lines, yet each metro desk sends its own alerts, opens its own cooling centers, and guards its own overtime budget. A spike in one district rarely triggers shared staff, shared vans, or a joint emergency fund across the three cities. People feel the harm in sick days and lost wages. The problem keeps growing because the corridor still answers one weather event with three uncoordinated playbooks.",
      stakeholder: "Metro public-health and labor desks",
      pressureKeys: ["Heat illness", "Split alerts", "Budget fights"],
      suggested: ["ai", "networks", "iot", "solar", "battery", "computing", "space"],
      visionTheme: "care-city",
    },
    {
      places: ["Saint-Louis to Kayar landing beaches, Senegal"],
      title: "Nets empty, logbooks closed",
      scene:
        "Landing beaches that once filled at dawn now see thinner catches and longer waits. Crews come home with less fish to sell, and families cut meals when the market stalls go quiet. Illegal or unreported boats still work the same nearshore grounds, but each cooperative and marine desk keeps its own logbooks, radio tips, and patrol requests. There is no shared early picture of who is fishing where, and no pooled fund that pays for joint patrols when one beach alone cannot afford the fuel. Empty nets are the harm people taste at dinner. Closed books and separate rules are what keep the shared sea ungoverned.",
      stakeholder: "Coastal landing cooperatives and marine desks",
      pressureKeys: ["Empty nets", "Hidden catch", "Distrust"],
      suggested: ["iot", "networks", "ai", "space", "drones", "crypto", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Kisumu–Homa Bay lakeshore belt, Lake Victoria"],
      title: "Shore towns, separate water truths",
      scene:
        "Along the lakeshore, stomach illness spikes after heavy rains and cloudy tap days. Parents miss work to sit in clinic queues while kids stay home from school. Towns test water and count sick visits on their own spreadsheets. They rarely share lab results, pump outages, or a joint reserve for chlorine, spare parts, and surge nurses when the same lake and pipes fail together. People feel the harm as sick days and fear of the next glass. Rival budgets and data walls keep each municipality blind to the pattern next door, so the same outbreak story repeats town by town.",
      stakeholder: "Lakeshore municipal water and clinic leads",
      pressureKeys: ["Sick days", "Data walls", "Local rivalry"],
      suggested: ["iot", "gene-sequencing", "networks", "ai", "drones", "computing", "crypto"],
      visionTheme: "care-city",
    }
  ],

  radicalization: [
    {
      places: ["Riverside Mill Row Gate"],
      title: "Layoff notice, new names on the wall",
      scene:
        "At the mill-row gate the pink slips hit on Friday. By Monday rent apps light up red and kids skip the dentist. Shop stewards hear the same story in every break: who took the shift, who looks different, who to blame. A local driver keeps the heat high—short video clips and group chats that name scapegoats faster than any union meeting can answer. Family counselors watch thin bonds snap while the feed keeps feeding anger.",
      stakeholder: "Mill-row shop stewards and family counselors",
      pressureKeys: ["Missed Rent", "Blame Clips", "Thin Bonds"],
      suggested: ["ai", "networks", "vr", "computing", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Cedar Hollow Parish Hall"],
      title: "Closed clinic, open airwaves",
      scene:
        "The parish hall now holds the wait list the closed clinic left behind. Elders sit with untreated pain. Parents drive an hour for a simple shot. On the drive home the dial finds a local talk show that blames outsiders for every empty exam room. Volunteers still pack food boxes, but the airwaves keep selling a simple enemy. Care delays hurt bodies now; the blame broadcast keeps turning neighbors into threats.",
      stakeholder: "Parish care circle and mobile clinic volunteers",
      pressureKeys: ["Sick Delays", "Hate Radio", "Closed Doors"],
      suggested: ["networks", "ai", "transportation", "solar", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Line Night Depot"],
      title: "Cut routes, louder break room",
      scene:
        "Night buses got cut. Drivers finish late and still miss the last ride home. In the break room the talk turns sharp: who gets overtime, who gets blamed for crime on the line, who should not be here. Mutual-aid stewards try to share rides and meals, yet a local rumor mill—texts and locker posters—keeps pointing at easy scapegoats. Exhaustion is real. The scapegoat story is what keeps crews splitting.",
      stakeholder: "Transit mutual-aid stewards",
      pressureKeys: ["Exhaustion", "Scapegoats", "Split Crews"],
      suggested: ["ai", "networks", "computing", "crypto", "transportation"],
      visionTheme: "social-city",
    },
    {
      places: ["North Stand Supporters Club"],
      title: "Standing terrace, softer recruiters",
      scene:
        "After the match the terrace empties into side streets where kids once had coaches and safe rooms. Mentors left when funding dried. Now softer voices in group chats offer belonging, gear, and a clear enemy. Youth workers still open the club on match nights, but street fear rises when rival clips go viral. The harm is kids pulled toward hate. The driver is a quiet chat pipeline that fills the gap mentors left.",
      stakeholder: "Supporters’ trust youth workers",
      pressureKeys: ["Street Fear", "Chat Pipeline", "Lost Mentors"],
      suggested: ["vr", "networks", "ai", "iot", "computing"],
      visionTheme: "learn-city",
    }
  ],

  fgm: [
    {
      places: ["Abnub marriage-notary row, Minya Governorate"],
      title: "Stamps still bless the cut",
      scene:
        "Along the notary offices near the Nile road, mothers wait with folders while clerks stamp marriage papers. Girls leave school early with pelvic pain, fever after unclean cuts, and fear of the next exam week. The driver is not only old custom. Families still pay cutters because some notaries and in-laws treat a stamped “purity” note as the cheap path to a wedding contract. Without a safer proof of consent and health, the fee-and-stamp loop keeps booking the next girl.",
      stakeholder: "Girls' secondary school mothers' union",
      pressureKeys: ["Infections", "Cutter Fees", "Honor Rules"],
      suggested: ["networks", "ai", "crypto", "vr", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Makump grove edge, Tonkolili District"],
      title: "Grove dues open the bush",
      scene:
        "At the rice plots by the grove, women count shared seed money while girls limp home after initiation season. Wound pain keeps them from transplanting; some miss market days and lose the harvest share their households need. The local driver is the Bondo dues system: families pay society fees so daughters can “belong,” and cutters earn from those payments. Stopping the harm means changing how belonging and mutual aid are funded, not only treating the wounds afterward.",
      stakeholder: "Women rice growers' mutual-aid circle",
      pressureKeys: ["Wound Pain", "Society Dues", "Belonging Fear"],
      suggested: ["solar", "networks", "ai", "iot", "print3d", "crypto"],
      visionTheme: "food-city",
    },
    {
      places: ["Borama central women’s market lanes, Awdal"],
      title: "Dawn bookings in the women’s lanes",
      scene:
        "Before sunrise, traders set out cloth and spices while cutters take quiet cash bookings for brides. Young women who already live with birth injury — tearing and long labor risk from sealed scar tissue — still hear in-laws demand the cut so a match will hold. Cutter income and in-law pressure travel the same market paths as the goods. If the lanes only add first-aid stalls and never touch who gets paid to cut, the bookings continue every wedding season.",
      stakeholder: "Market traders' health cooperative",
      pressureKeys: ["Birth Injury", "Cutter Income", "In-Law Demand"],
      suggested: ["ai", "networks", "solar", "battery", "computing", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Ranya foothill wedding courtyards, Sulaymaniyah Governorate"],
      title: "Elders still name the pure bride",
      scene:
        "In foothill courtyards, tea trays pass while elders praise a “pure” bride and teachers notice empty desks after holidays. Survivors sit through class with chronic pain and infections they cannot name aloud. The driver is public purity talk tied to marriage reputation: families silence school complaints to protect matches, and the next cohort learns that speaking up costs a future. Ending the cycle needs new ways to teach, witness, and protect girls without feeding the purity scoreboard.",
      stakeholder: "Young women teachers' protection league",
      pressureKeys: ["Chronic Pain", "Purity Talk", "School Silence"],
      suggested: ["vr", "networks", "ai", "computing", "iot", "transportation"],
      visionTheme: "learn-city",
    }
  ],

  "short-termism": [
    {
      places: ["Salt Creek Mangrove Fringe"],
      title: "Cash kilns thin the storm belt",
      scene:
        "At low tide the creek smells of wet mud and woodsmoke. Fishers haul thinner nets than five years ago. The young mangroves that once broke storm surge are gone in patches—cut for charcoal that sells the same week. Families need that cash for school fees and boat fuel now. Kiln bosses pay same-day and race for cutting permits before the next inspection. Each season the fringe gets thinner, flood water climbs higher into the stilt houses, and the short cash wins over the trees that would have guarded the shore.",
      stakeholder: "Creek-side fishers and kiln workers’ council",
      pressureKeys: ["Flood water", "Charcoal cash", "Permit race"],
      suggested: ["iot", "drones", "solar", "ai", "networks", "materials", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Hillside Polytechnic Annex"],
      title: "Exam scores, locked workshops",
      scene:
        "The annex still has lathes and wiring benches, but half the rooms stay locked. District money follows test scores this year, so instructors drill past papers instead of teaching apprentices to fix pumps and panels. Parents on the board push for the ranking that unlocks next term’s grant. Broken shop tools sit unused. Graduates leave able to pass a quiz and unable to hold a real job on the industrial road below. The skill gap widens because the budget rewards what can be counted by Friday, not what the town will need in five years.",
      stakeholder: "Instructors, apprentices, and parent board",
      pressureKeys: ["Broken shops", "Budget freeze", "Skill gap"],
      suggested: ["print3d", "vr", "ai", "networks", "computing", "robots", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal Row Tenements"],
      title: "Rent due, stairs failing",
      scene:
        "Black mold maps the corners of the third-floor flats. Kids cough through the night. Landlords still collect full rent on the first of the month and fine tenants who patch stairs or seal leaks without a licensed crew they cannot afford. Caretakers know which joists will go next, but the owners treat every spare dollar as profit to pull out this quarter. The tenants’ union wants safe stairs and dry walls. The books want cash now. Each winter the homes sicken more people while the short rent squeeze blocks the long fix.",
      stakeholder: "Tenants’ union and block caretakers",
      pressureKeys: ["Mold homes", "Rent squeeze", "Patch fines"],
      suggested: ["iot", "materials", "print3d", "ai", "networks", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Blackwater Fen Allotments"],
      title: "Spring flood sold as dry fields",
      scene:
        "Growers walk fields that sink a little more each spring. Peat soil—old wet ground that stores water and carbon—shrinks when over-pumped to keep rows dry for a quick crop contract. Diesel pumps run hard before inspection week so leases look productive. Bills climb. When the rain comes, water has nowhere slow to go, and seed beds drown. The cooperative could rest strips and raise beds for the long haul, but lease clauses punish anyone who leaves land “idle” this season. Short dry-field sales keep writing the next flood.",
      stakeholder: "Fen growers’ cooperative",
      pressureKeys: ["Sinking fields", "Pump bills", "Lease clauses"],
      suggested: ["iot", "solar", "battery", "ai", "space", "networks", "synbio"],
      visionTheme: "food-city",
    }
  ],

  misinfo: [
    {
      places: ["Riverside Free Clinic Lobby"],
      title: "The nurse who never dialed",
      scene:
        "In the Riverside Free Clinic lobby, Maria waits two hours for a refill she was told was ready. The call she trusted came from a number that looked like the clinic’s. The voice named her meds and a pickup window. No nurse here made that call. Across town, a cheap robocall setup and cloned clinic audio keep spinning fake appointment lines. Patients miss real doses, show up on the wrong day, or stop answering the clinic at all. Staff burn mornings untangling fear from fact while the spoof pipeline runs on open caller-ID tricks and shared deepfake voice clips anyone can buy.",
      stakeholder: "Clinic outreach coordinator",
      pressureKeys: ["Missed Doses", "Fake Calls", "Staff Strain"],
      suggested: ["ai", "networks", "computing", "iot", "crypto"],
      visionTheme: "care-city",
    },
    {
      places: ["Seabrook Wharf Notice Board"],
      title: "Sirens nobody believes",
      scene:
        "At Seabrook Wharf the storm siren wails and half the crews keep unloading. Last month a viral clip showed the harbor master “canceling” a warning that was never canceled. Nets and engines took real water damage when a squall hit on time. The local driver is a chain of edited alert videos and spoofed text blasts that mimic the port channel. Each fake makes the next real siren easier to shrug off. The notice board is papered with printouts arguing both ways while the tide tables do not care who is winning the argument.",
      stakeholder: "Harbor master",
      pressureKeys: ["Storm Losses", "Fake Alerts", "Harbor Doubt"],
      suggested: ["ai", "networks", "space", "iot", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Milltown Night School Hall"],
      title: "The lecture that wasn’t sold",
      scene:
        "Milltown Night School Hall used to fill for welding and nurse-aide classes. This term seats sit empty after a doctored clip showed the director “selling grades” to a contractor. She never said it. Someone stitched her face to other audio and paid to push the video in local groups. Students who need the certificate for shift work drop out rather than risk a fake scandal on their name. The same paid smear accounts keep seeding new cuts whenever enrollment ticks up, so doubt is the product and empty desks are the bill.",
      stakeholder: "Night-school director",
      pressureKeys: ["Dropouts", "Doctored Clips", "Paid Smears"],
      suggested: ["ai", "networks", "computing", "vr", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Harborview Tenant Union Hall"],
      title: "Rent strike on a forged memo",
      scene:
        "At Harborview Tenant Union Hall, neighbors argue over a memo that looks like the city housing office. It tells tenants to withhold rent or lose a phantom protection. Some locked their doors and stopped payment. Others paid and got threatened as scabs. Late fees and eviction notices are already hitting the hallway. The driver is not only anger; it is a print-and-forward forge shop that drops official-looking PDFs into group chats whenever a lease fight trends. Outside money boosts the posts. Trust inside the building thins faster than any repair list can fix.",
      stakeholder: "Tenant union chair",
      pressureKeys: ["Locked Doors", "Forged Memos", "Outside Cash"],
      suggested: ["ai", "networks", "crypto", "computing", "print3d"],
      visionTheme: "social-city",
    }
  ],

  totalitarianism: [
    {
      places: ["Millbridge Community Hospital"],
      title: "The ward docks your household",
      scene:
        "On the night ward at Millbridge, a feverish kid waits while the charge nurse stares at a glowing tablet. Care is no longer only about need. Each shift the hospital must hit a report quota: a fixed count of loyalty flags, tip-offs, and signed loyalty notes filed before dawn. Miss the number and the district office docks the whole household’s ration points and can freeze the nurse’s badge. Patients leave sicker. Staff whisper in the supply closet and stop writing honest notes. The quota machine keeps the fear alive; the empty beds and delayed meds are what families feel by morning.",
      stakeholder: "Night-shift nurses' quiet circle",
      pressureKeys: ["Denied Care", "Report Quotas", "Staff Fear"],
      suggested: ["networks", "crypto", "ai", "computing", "vr", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Harborlane Produce Arcades"],
      title: "No chant, no cold storage",
      scene:
        "At Harborlane the produce arcades used to hum before sunrise. Now half the stalls sit dark. To keep a cold locker and a selling permit, vendors must open the morning with the Unity chant and log it on the public Permit Ledger—a shared list the ward office updates in real time. Skip the ritual or sell to someone flagged, and the locker power cuts by noon. Fruit spoils. Families walk home with less food. The ledger is the local engine: it turns speech into a switch for electricity and space, so empty stalls and hungry evenings keep coming back.",
      stakeholder: "Vendor mutual-credit association",
      pressureKeys: ["Empty Stalls", "Permit Ledger", "Vendor Fear"],
      suggested: ["crypto", "networks", "iot", "solar", "battery", "print3d", "ai"],
      visionTheme: "food-city",
    },
    {
      places: ["Copperline Grid Hamlet"],
      title: "Compliant blocks stay lit",
      scene:
        "In Copperline the lights die first on the side streets that scored low. Every home and shop has a Score Portal—a simple online board that ranks blocks on attendance at rallies, neighbor reports, and app check-ins. Line workers and hardship clerks get the cut list from that board, not from storm damage. A low score means rolling blackouts, cold rooms, and dead phones. People stop visiting across porches. The portal is what keeps the pattern running: it turns social obedience into a switch for power, so outages and distrust rise together each season.",
      stakeholder: "Line workers and hardship clerks",
      pressureKeys: ["Power Cuts", "Score Portal", "Neighbor Distrust"],
      suggested: ["solar", "battery", "networks", "crypto", "computing", "iot", "ai"],
      visionTheme: "energy-city",
    },
    {
      places: ["Saltreed Fisher Quay"],
      title: "Fuel only for the logged crew",
      scene:
        "At Saltreed Quay the independent boats still know the tides, but the fuel dock only opens for crews on the Unity Log. That log is a daily roll of who attended the pier briefing, who named a doubter, and who ran the approved radio channel. Miss an entry and the pump stays locked. Nets go unrepaired. Skippers lose mates who will not spy on each other. Families eat less fish. The log is the local driver: it ties diesel and spare parts to political performance, so fuel cuts and broken crews keep repeating even when the weather is fair.",
      stakeholder: "Independent skippers' repair league",
      pressureKeys: ["Fuel Cuts", "Unity Logs", "Broken Crews"],
      suggested: ["networks", "crypto", "drones", "solar", "print3d", "computing", "space"],
      visionTheme: "ocean-city",
    }
  ],

  "women-stem": [
    {
      places: ["Pune Polytechnic Instrumentation Wing"],
      title: "Night shuttle ends before her bench time",
      scene:
        "After dark, the instrumentation wing still hums. Girls who need extra hours on the calibration benches watch the last campus shuttle leave at eight. Without that ride, many cannot stay. Parents will not accept a walk through unlit streets, so lab practice ends early for them while male classmates finish the setups. Grades slip on the practicals that decide who enters sensor and automation jobs. The shuttle timetable was written around an old assumption: serious lab work is for students who can get home alone. Until routes, lighting, and booking match real bench hours, the wing keeps training a thinner pipeline of women technicians every term.",
      stakeholder: "Polytechnic principal and women students’ guild",
      pressureKeys: ["Missed labs", "Shuttle gaps", "Grade slide"],
      suggested: ["networks", "ai", "solar", "iot", "self-driving", "vr"],
      visionTheme: "learn-city",
    },
    {
      places: ["Antofagasta Copper Training Depot"],
      title: "Sensor tickets still list the sons",
      scene:
        "At the copper training depot, work tickets for drone surveys and IoT sensor walks still go out under familiar last names—often the sons and nephews of long-time crews. Women who finished the same safety modules wait on the bench. They lose paid field hours, and the wage gap hardens before they ever log a full season. Dispatch software and crew habits were built when the pit was treated as men’s ground. As long as ticket assignment copies that pattern, the depot keeps producing skilled men for the sensor crews and side-lined women for the classroom.",
      stakeholder: "Depot training chief and regional women miners’ association",
      pressureKeys: ["Ticket lockout", "Crew bias", "Wage stall"],
      suggested: ["drones", "iot", "vr", "robots", "ai", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Kumasi Teaching Hospital Biomed Bay"],
      title: "Repair floor badge never prints for her",
      scene:
        "In the biomed bay, infusion pumps and monitors sit in red tags while patients upstairs wait. Nurses who know the wards want to cross-train on repairs. The badge printer for the repair floor keeps rejecting their names or routing them to observation-only status. Without a full badge, they cannot sign out tools or log fixes, so broken machines stack up and promising women leave for wards that at least pay overtime. Access rules still treat deep repair as a closed craft passed among men already on the roster. That gate—not a lack of interest—keeps the hospital short of women in clinical engineering.",
      stakeholder: "Hospital biomedical head and nursing-STEM liaison",
      pressureKeys: ["Broken machines", "Badge bias", "Career exits"],
      suggested: ["print3d", "ai", "iot", "networks", "computing", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Amman STEM Olympiad Prep Hall"],
      title: "Travel fund needs a male chaperone",
      scene:
        "In the prep hall, girls who can solve the contest problems still lose seats at regional olympiads. The travel fund will not release tickets unless a male chaperone is named, and families often cannot spare one. Boys from the same coaches board the bus. Scholarships tied to those contests pass them by. The chaperone rule was meant as safety policy, but it now acts as a filter on who may show scored work in public. Until travel, remote proof, and funding treat a qualified girl as enough, Amman’s pipeline keeps crowning a narrower set of STEM winners.",
      stakeholder: "Prep-hall coaches and parent-student STEM council",
      pressureKeys: ["Seats lost", "Chaperone rule", "Scholarship gap"],
      suggested: ["vr", "networks", "ai", "computing", "solar", "space"],
      visionTheme: "learn-city",
    }
  ],

  memory: [
    {
      places: ["Nishijin timber yard, Kyoto"],
      title: "Joinery marks leave with the last master",
      scene:
        "At the Nishijin timber yard, temple beams still go up the old way: wood locked to wood with cuts only a few hands still read. Last spring a repaired hall settled wrong after a storm. A joint that should have held slipped a hair. No one died, but plaster cracked and the priests had to close the wing for weeks. The harm is simple—roofs that fail quietly when the marks that told how to cut them are gone.\n\nThe driver is not weather. It is how the yard works now. Senior carpenters carry the joinery marks—small chisel codes and layout habits—in their heads and on scrap boards that never enter the digital job file. When a master retires or dies, the next crew inherits drawings without the why. Apprentices leave for steadier pay in concrete work. The yard keeps shipping timber, but the living memo",
      stakeholder: "Temple carpentry guild keepers",
      pressureKeys: ["Beam Failures", "Mark Loss", "Apprentice Exit"],
      suggested: ["vr", "ai", "networks", "computing", "print3d", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Toksook Bay boat launch, Alaska"],
      title: "Safe ice only the aunties can name",
      scene:
        "From the Toksook Bay boat launch, families still run snowmachines and skiffs across the ice toward hunting and fishing grounds. In the last two winters, three near-misses and one bad fall through rotten ice put people in the clinic. The ice does not look the way the old stories describe. Thin spots open where trails used to hold. The harm is cold, wet, and immediate—people hurt because the safe path is no longer obvious.\n\nWhat keeps the danger growing is not only a warmer Bering Sea. It is the break in shore knowledge. Yup'ik aunties and elders can still name ice by color, sound, and season—words for crust, overflow, and wind-scoured edges that never made it into school maps or phone apps. Younger hunters leave for work in Bethel or Anchorage. When they come back, the ice has changed and t",
      stakeholder: "Yup'ik shore knowledge keepers",
      pressureKeys: ["Trail Accidents", "Ice Forgetting", "Youth Drift"],
      suggested: ["ai", "networks", "vr", "iot", "space", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Port Talbot blast furnace control room, Wales"],
      title: "The furnace whisper dies at shift end",
      scene:
        "In the Port Talbot blast furnace control room, veterans still talk about the whisper—the small change in sound, heat, or gauge drift that means trouble before the alarm board lights up. Last year a near miss forced an emergency slowdown. No explosion, but a crew scrambled, and the plant lost a costly day. Families in town felt the scare in texts from the gate. The harm is real risk on the floor and paychecks that wobble when the furnace hiccups.\n\nThe system that keeps erasing the fix is how knowledge moves—or does not—between shifts. The best cues live in short handovers, sticky notes, and one senior operator’s ear. Official logs capture numbers, not the gut read. When veterans clock out for good, or when short-staffed nights skip the long brief, the next crew inherits a clean screen and a",
      stakeholder: "Steelworks safety stewards",
      pressureKeys: ["Near Misses", "Shift Amnesia", "Note Purges"],
      suggested: ["ai", "iot", "computing", "networks", "vr", "robots"],
      visionTheme: "energy-city",
    },
    {
      places: ["Maternity annex, Komfo Anokye Teaching Hospital, Kumasi"],
      title: "Auntie remedies never reach the chart",
      scene:
        "In the maternity annex at Komfo Anokye Teaching Hospital in Kumasi, night shifts still run on too few hands. Mothers return with the same bleeding patterns or feeding crises the senior midwives already solved last month for someone else. The harm shows up as repeat emergencies, longer stays, and families who lose trust when the ward seems to forget what worked.\n\nThe driver is the handoff gap. Experienced midwives carry auntie remedies—practical tricks for spotting trouble early, calming a labor, or coaching a first feed—that never land in the official chart. Charts want codes and drug names. The useful detail stays in hallway talk and then leaves when staff churn to private clinics or burnout. New nurses inherit thin notes and learn the hard way again. Until the ward can catch that living ",
      stakeholder: "Senior midwife networks",
      pressureKeys: ["Repeat Harm", "Handoff Gaps", "Staff Churn"],
      suggested: ["ai", "networks", "computing", "crypto", "iot", "vr"],
      visionTheme: "care-city",
    }
  ],

  "rural-roads": [
    {
      places: ["Cajón Seco bridge spur, Chiapas highlands"],
      title: "Harvest trucks stop at the broken bailey",
      scene:
        "After the rains, the steel bailey bridge on the Cajón Seco spur is still the only truck link from the coffee co-op plots to the valley road. A bailey bridge is a modular steel span crews bolt together in pieces. Last season a support bent and half the cherry load sat rotting on the far bank while buyers waited below. Families lost cash they needed for school fees and fertilizer. The harm is simple: wet cherries spoil fast when trucks cannot cross. The driver that keeps the isolation going is not only weather. The municipality still budgets for patch welds and one-lane reopens instead of a permanent all-season crossing, and spare parts sit weeks away in Tuxtla. Until the spur can carry harvest weight every week of the year, the co-op stays cut off from markets it already grows for.",
      stakeholder: "Smallholder coffee cooperative and municipal works chief",
      pressureKeys: ["Spoiled Crop", "Bridge Fail", "Spare Cash"],
      suggested: ["transportation", "materials", "drones", "iot", "solar", "networks", "ai", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Barotse floodplain hamlets, Western Zambia"],
      title: "Clinic boat cannot beat the cut-off levee",
      scene:
        "When the Zambezi rises, paths between the Barotse hamlets turn to water. Nurses run a river clinic boat with vaccines, birth kits, and malaria tests. Mothers still walk hours through mud when the boat is late, and children with fever wait past the safe window for care. A cut-off levee — an earth bank built to hold floodwater back — now blocks the old channel the boat used. Cattle owners and ward leaders argue over where new cuts may open, so the boat loses days to politics while the water keeps rising. The lived harm is late care people feel in their bodies. The local driver is the levee and landing system that never planned for clinic traffic year-round, so flood season keeps locking hamlets off the all-season route to treatment.",
      stakeholder: "River clinic nurses and traditional authority council",
      pressureKeys: ["Late Care", "Blocked Path", "Levee Politics"],
      suggested: ["transportation", "drones", "solar", "battery", "networks", "iot", "ai", "materials"],
      visionTheme: "care-city",
    },
    {
      places: ["Ömnögovi winter school trace, South Gobi"],
      title: "Winter school bus never clears the dune line",
      scene:
        "In the South Gobi, the boarding school draws herder kids from scattered winter camps. The school trace is a packed dirt line across soft sand — not a paved road. After early storms the bus sinks to the axles at the dune line, and students miss weeks of class. Parents then keep older children home to help with animals, and teachers apply for posts in Dalanzadgad where the roads stay firm. Missed class is the harm families feel now. What keeps producing the isolation is the province’s habit of grading the same soft trace each autumn instead of building a raised, all-season link with markers and hard standing. Until that spine exists, winter wind and sand will keep cutting the school off from the camps it serves.",
      stakeholder: "Boarding-school head and herder parents’ association",
      pressureKeys: ["Missed Class", "Soft Trace", "Teacher Exit"],
      suggested: ["transportation", "space", "iot", "solar", "networks", "ai", "vr", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Peerless Lake ice spur, northern Alberta"],
      title: "Fuel and dialysis miss the thaw window",
      scene:
        "Peerless Lake depends on a winter ice spur — a temporary road frozen over muskeg and lake edge — to bring diesel, food, and dialysis supplies before spring thaw. When warm spells come early, the spur closes and the clinic rations fuel for the generator while patients face delayed runs to High Prairie. Families feel empty shelves and skipped treatment weeks. The driver is not only climate. Contracts and insurance still lock haulers to the classic freeze calendar, and there is no all-season backup corridor budgeted for shoulder months. Each year the thaw window shrinks and the same paperwork assumes ice will hold. Without a different way to move weight when ice fails, the community stays one warm week away from supply gaps.",
      stakeholder: "First Nation health director and winter-road contractors’ co-op",
      pressureKeys: ["Supply Gaps", "Thaw Days", "Contract Lock"],
      suggested: ["transportation", "drones", "materials", "energy", "solar", "battery", "iot", "networks"],
      visionTheme: "rebuild-city",
    }
  ],

  smoking: [
    {
      places: ["Tijuana Maquiladora Gate 7"],
      title: "The gate line runs on shared packs",
      scene:
        "Before the morning whistle at Gate 7, workers pass a shared pack down the line. By lunch the break bay smells like a closed room of smoke. People clock more sick days for coughs and tight chests, and the plant nurse station fills with the same complaints. Cheap cartons still sell at the fence kiosks for less than a meal, so the habit stays cheaper than quitting. The break culture treats a cigarette as the only real pause on a long shift. That mix keeps tobacco in the air and in the lungs, not just as a private choice but as the factory’s daily rhythm.",
      stakeholder: "Plant occupational nurse collective",
      pressureKeys: ["Sick Days", "Cheap Cartons", "Break Culture"],
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Hanoi Secondary Gate Snack Strip"],
      title: "Snack carts sell the first drag",
      scene:
        "Outside the secondary school gate, snack carts ring the sidewalk. Kids buy single sticks with change meant for banh mi. Teachers hear more coughing in first period, and parents notice stained fingers they did not pack in any lunch. Vendors need the gate rent money, and loose cigarettes out-earn candy on thin margins. The strip turns a school doorway into the easiest first drag in the neighborhood. Harm shows up in young lungs; the driver is a sidewalk economy that rewards selling tobacco one stick at a time.",
      stakeholder: "Parent-teacher health board",
      pressureKeys: ["Kids Coughing", "Single Sticks", "Gate Rent"],
      suggested: ["ai", "networks", "iot", "drones", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Marseille Fos Container Break Yard"],
      title: "Dock break rooms still billow",
      scene:
        "In the Fos container break yard, the indoor rest rooms still cloud by mid-shift. Dockworkers step out of cold wind into a haze that clings to jackets and throats. Eyes water. Some skip the room and smoke harder outside the doors, so the air never really clears. Vending machines cut a share of every pack sold on site, and long overtime makes the next cigarette feel like fuel. Secondhand smoke is the lived harm in a sealed break space. The driver is a yard that still profits from selling tobacco into exhausted crews.",
      stakeholder: "Port occupational safety steward",
      pressureKeys: ["Dirty Air", "Vending Cut", "Overtime Norm"],
      suggested: ["iot", "materials", "ai", "networks", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Nairobi Maternity Waiting Home Courtyard"],
      title: "Courtyard haze reaches the newborn cots",
      scene:
        "At the maternity waiting home, families sleep in the open courtyard while mothers wait for labor. Visitors light cigarettes under the same roof line where newborn cots sit near open doors. Midwives hear more baby wheeze after busy visiting nights. A yard kiosk sells loose sticks to tired relatives who stay for days. Night visits keep the smoke drifting through thin walls. Infants breathe what adults light; the kiosk and the visiting pattern keep tobacco moving through a place built for birth, not for ash.",
      stakeholder: "Midwife cooperative lead",
      pressureKeys: ["Baby Wheeze", "Yard Kiosk", "Night Visits"],
      suggested: ["iot", "materials", "ai", "networks", "nano"],
      visionTheme: "care-city",
    }
  ],

  sanitation: [
    {
      places: ["Sunwell Primary Compound"],
      title: "Latrine queues send girls home by noon",
      scene:
        "At Sunwell Primary the morning bell still rings, but by midday the girls’ line at the only working block of toilets snakes past the ball court. Many walk home rather than wait, miss afternoon math, and come back the next day already behind. The pits are simple holes with concrete slabs. When they fill, the school has no truck on contract and no spare land inside the fence, so staff lock stalls and hope rain dilutes the overflow. Parents on the hygiene club scrub floors and buy soap, yet the real driver is the same: too few seats for the enrollment, pits that nobody empties on a schedule, and a maintenance budget that buys chalk before it buys a desludging visit.",
      stakeholder: "Parent-teacher hygiene club",
      pressureKeys: ["Sick Kids", "Full Pits", "Budget Gap"],
      suggested: ["solar", "iot", "materials", "print3d", "robots", "ai", "networks", "transportation"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ladder Cut Settlement"],
      title: "Sewage owns the only stair out",
      scene:
        "Ladder Cut clings to a steep cut above the old rail spur. One concrete stair is the only dry path most families use to reach the road. After heavy rain, grey water and toilet waste from uphill shacks run in open channels beside that stair, soak the lower landings, and leave kids with itchy sores on ankles and hands. Residents haul buckets and lay scrap boards, but the channels stay open because landlords never paid to connect the slope to a sealed line, and the city map still treats the cut as temporary. Until pipes, pumps, or a real drain replace the ditch beside the steps, every storm puts waste back underfoot.",
      stakeholder: "Stair-block residents' union",
      pressureKeys: ["Skin Sores", "Open Channels", "Landlord Delay"],
      suggested: ["materials", "drones", "iot", "print3d", "solar", "battery", "ai", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Crossridge Freight Yard"],
      title: "Behind the fuel bay is the toilet",
      scene:
        "Night loaders at Crossridge share one grim stall tucked behind the diesel bay. The door sticks, the light is dead half the week, and when the tank backs up the smell mixes with fuel until people stop eating on shift. Gut bugs spread through the crew because handwash water is a single drum and the yard lease treats toilets as the tenant’s problem, not the landlord’s. Dispatch still packs more trailers onto the same pad, so the stall stays locked more often while managers argue over who pays for a pump-out. The harm is in the guts and the skipped meals; the driver is a yard that grows freight without growing sealed, usable sanitation.",
      stakeholder: "Night loaders' mutual aid circle",
      pressureKeys: ["Gut Bugs", "Locked Stalls", "Lease Squeeze"],
      suggested: ["solar", "iot", "materials", "networks", "ai", "crypto", "transportation", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Olive Court Rest Home"],
      title: "The wing that smells before breakfast",
      scene:
        "On the east wing of Olive Court the hallway smells wrong before the breakfast carts roll. Several residents get repeated urinary and skin infections after nights when the shared toilets gurgle and staff place towels at door thresholds. The building’s old cast pipes catch wipes and thickeners the home was never redesigned to handle, and the outsourced maintenance contract only covers emergency call-outs, not a full line replacement. Families on the caregivers’ council notice the pattern first: fewer safe toilets, more infections, and a budget that trims nursing hours instead of fixing the stack. Until the pipes and the care contract both change, the wing keeps making people sicker in the place meant to keep them safe.",
      stakeholder: "Family caregivers' council",
      pressureKeys: ["Infections", "Backed Pipes", "Contract Cuts"],
      suggested: ["iot", "robots", "materials", "solar", "ai", "gene-sequencing", "networks", "print3d"],
      visionTheme: "care-city",
    }
  ],

  waste: [
    {
      places: ["Circuit Lane Scrap Alleys"],
      title: "Smoke over Circuit Lane",
      scene:
        "At dawn the alleys reek of plastic and metal. Pickers crack phones and laptops on tarps, then burn the boards they cannot open for copper. Kids cough through school. Eyes water. The real driver is sealed gadgets: screws glued, batteries glued, no spare parts sold. Repair shops close. Every week more dead devices arrive from the city, and the only cash left is in the smoke.",
      stakeholder: "Informal scrap pickers' association",
      pressureKeys: ["Burn Smoke", "Sealed Gadgets", "Tip Fees"],
      suggested: ["materials", "iot", "robots", "ai", "networks", "print3d", "drones", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Junction Battery Sheds"],
      title: "Swollen packs behind the shed",
      scene:
        "E-bike kiosks stack failed packs behind thin tin walls. Some swell and leak. Riders smell acid on hot afternoons. Shop hands get rashes. Haulers charge more each month to take the dead packs across town, so stacks grow. The driver is simple: cheap packs with no take-back path, swapped fast for fares, then dumped. Without a local loop to test, rebuild, or reclaim the cells, the sheds keep filling.",
      stakeholder: "E-bike kiosk operators guild",
      pressureKeys: ["Acid Smell", "Dead Packs", "Haul Cost"],
      suggested: ["battery", "materials", "iot", "robots", "ai", "transportation", "networks", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Riverside Campus Canteens"],
      title: "Trays stacked to the dorm vents",
      scene:
        "Lunch ends and foam trays climb toward the dorm air vents. Flies gather. Students hold their breath on the walkways. The canteens run on a locked catering contract that pays by tray count and bans reusable plates. Compost bins sit empty because the hauler only takes sealed foam. Waste outruns any student cleanup drive because the contract keeps buying the same single-use stream every semester.",
      stakeholder: "Student facilities council",
      pressureKeys: ["Fly Clouds", "Foam Trays", "Contract Lock"],
      suggested: ["materials", "iot", "ai", "robots", "networks", "synbio", "print3d", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Palm Reach Hotel Strip"],
      title: "Linen that washes out to sea",
      scene:
        "After checkout, mini shampoo bottles, plastic wrappers, and frayed linen scraps ride the drain and the wind onto the public beach. Cleaners rake the same stretch each morning before guests arrive. Brand rules force tiny single-use amenities in every room and ban bulk refill stations. So the strip keeps shipping waste seaward even while the cooperative picks it back up by hand.",
      stakeholder: "Coastal cleaners cooperative",
      pressureKeys: ["Beach Trash", "Mini Bottles", "Brand Rules"],
      suggested: ["materials", "iot", "drones", "ai", "networks", "transportation", "robots", "solar"],
      visionTheme: "coastal-city",
    }
  ],

  reproductive: [
    {
      places: ["Greenville Birth Corridor, Mississippi Delta"],
      title: "Ninety minutes past the last contraction",
      scene:
        "On the two-lane road between Greenville and the next open labor ward, a woman finishes pushing in the back of a borrowed truck. The nearest hospital closed its maternity floor last spring. The next one is more than an hour away when the bridge floods or a shift goes short. Doulas and EMTs keep oxygen, clean kits, and phones in their cars because too many babies and mothers still meet the world on gravel shoulders.\n\nThe harm is not only distance. County budgets and private insurers keep shuttering wards that do not pay, so skilled birth teams leave and the corridor empties further. Each closure makes the next emergency longer, blood loss harder to stop, and families more afraid to call until it is almost too late.",
      stakeholder: "Delta doula and EMT coalition",
      pressureKeys: ["Road Births", "Closed Wards", "Insurance Gaps"],
      suggested: ["networks", "ai", "transportation", "drones", "solar", "battery", "iot", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Ilha do Combu birth post, Belém river belt"],
      title: "High water blocks the midwife boat",
      scene:
        "At the wooden birth post on Ilha do Combu, the river midwife watches the tide lift the dock and hide the usual channel markers. A first-time mother is in strong labor on the far side of the island. When the boat cannot leave, the post has only basic tools, a solar lamp, and a radio that drops calls. Families already know what late arrival can mean: a baby who never breathes, or a mother who bleeds while the city hospital stays out of reach.\n\nStorm seasons and unplanned fill along the mainland keep rewriting the water routes. Clinics and supply budgets still sit on the city shore, so island posts stay thin on staff, fuel, and backup gear. The river is both the road and the delay, and every season the delay grows.",
      stakeholder: "River midwife collective",
      pressureKeys: ["Stillbirths", "Boat Delays", "Mainland Bias"],
      suggested: ["drones", "solar", "battery", "networks", "iot", "transportation", "materials", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Marka industrial dorms RH window, East Amman"],
      title: "The sponsor keeps her health card",
      scene:
        "In the factory dorms of East Amman, a young woman misses her third visit to the small reproductive-health window because her sponsor holds her civil ID and work card. Without those papers the clinic will not open a file. She treats cramps and fever with painkillers from the corner shop and hopes the bleeding stops before the next night shift. Advocates hear the same story in whispers: infections left untreated, pregnancies hidden until late, contraception bought in secret or not at all.\n\nThe driver is the sponsorship lock itself. Housing, wages, and clinic access run through the employer’s signature, so speaking up can mean lost work or a deportation threat. Fear keeps women off the books, and off-the-books care stays patchy, expensive, and easy to cut.",
      stakeholder: "Migrant women’s health advocates",
      pressureKeys: ["Hidden Illness", "Sponsor Locks", "Deportation Fear"],
      suggested: ["networks", "crypto", "ai", "computing", "iot", "vr", "solar", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Sanganer Adolescent ANC Desk, Jaipur fringe"],
      title: "She arrives already mid-pregnancy",
      scene:
        "At the antenatal desk on the Jaipur fringe, an ASHA community health worker meets a fifteen-year-old who is already halfway through pregnancy. No one at home would let her come earlier. School stopped after grade eight. The first clinic visit is often the first honest talk about her body, and by then options are few and risks are higher for both mother and baby.\n\nIn-laws and local honor rules still decide when a girl may leave the house or sit with a nurse alone. Officials also chase tidy coverage numbers, so workers feel pressure to count quick checkmarks instead of slow trust-building with families. The desk sees the result every week: care that starts too late because silence at home and scorekeeping outside both reward delay.",
      stakeholder: "ASHA workers and girls’ secondary teachers",
      pressureKeys: ["Teen Births", "In-Law Veto", "Count Gaming"],
      suggested: ["ai", "networks", "computing", "solar", "vr", "iot", "print3d", "transportation"],
      visionTheme: "learn-city",
    }
  ],

  amr: [
    {
      places: ["Patancheru Industrial Stretch"],
      title: "The pharma drain tutors the tanks",
      scene:
        "Along the Patancheru industrial stretch outside Hyderabad, families wake to rashes and stubborn fevers that ordinary antibiotics no longer clear. Clinic lines grow as skin and gut infections bounce back after a short pause. Upstream, bulk drug plants still race orders and send half-treated wastewater into open drains and holding tanks. Those tanks act like outdoor classrooms where bacteria learn to shrug off the same drugs doctors prescribe. Until the waste stream is cleaned at the source, every new production surge keeps training stronger bugs for the neighborhood.",
      stakeholder: "District pollution-control and primary-care joint lead",
      pressureKeys: ["Sick days", "Factory waste", "Clinic trust"],
      suggested: ["gene-sequencing", "iot", "materials", "nano", "ai", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Callao Dockside TB Ward"],
      title: "Port lungs outlast the formulary",
      scene:
        "In Callao’s dockside TB ward, longshore workers and their families return coughing after months of pills that should have worked. Pay stops when shifts are missed, and households lose rent money while waiting for a second-line regimen. The ward’s stock of first-choice tuberculosis drugs is failing because incomplete treatment is still common on the waterfront: men start therapy, feel better, then vanish back to night shifts and shared bunks. Missed doses let the bacteria harden inside living lungs, then spread through the port. Stopping the spiral means finishing every course and catching resistant strains early—not only handing out more bottles.",
      stakeholder: "Port-district TB program director",
      pressureKeys: ["Failed cures", "Missed doses", "Job loss"],
      suggested: ["gene-sequencing", "ai", "networks", "iot", "computing", "drones", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Santa Catarina Hog Belt"],
      title: "Barn routine poisons the creek clinics",
      scene:
        "In Santa Catarina’s hog belt, barn hands and neighbors show up at rural clinics with high fevers and wounds that ignore the usual antibiotics. The creek that runs past the sheds carries a sour smell after heavy rains, and kids who play downstream get sick more often. On many farms, low-dose antibiotics still go into feed as a daily routine to keep crowded animals growing, not only to treat clear disease. That constant dosing breeds tough bacteria in manure and runoff that reach workers and village taps. Local health will keep sliding until the barns change how they raise hogs, not only how clinics bandage the aftermath.",
      stakeholder: "State veterinary and rural health liaison",
      pressureKeys: ["Worker fevers", "Barn dosing", "Creek smell"],
      suggested: ["iot", "gene-sequencing", "ai", "synbio", "drones", "networks", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Makoko Stilt Clinic Lanes"],
      title: "Lane chemists empty the last good drugs",
      scene:
        "In Makoko’s stilt lanes, parents ferry children with burning fevers to a small clinic that has almost run out of medicines that still work. Families buy loose pills by the handful from floating shops because a full lab visit costs a day’s catch. Those informal sellers split strips, skip cold storage, and push leftover courses that never finish the job. Half-taken, poor-quality antibiotics let bacteria practice survival in the densest homes on the lagoon. The clinic cannot outrun the problem while the lane trade keeps teaching resistance one incomplete dose at a time.",
      stakeholder: "Lagoon primary-care and medicine-safety coordinator",
      pressureKeys: ["Child fevers", "Loose pills", "Shop income"],
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
      pressureKeys: ["Pressure", "Capacity", "Trust"],
      suggested: ["ai", "iot", "networks", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
  ],
};
