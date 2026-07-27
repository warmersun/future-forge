/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Regenerated: 2026-07-27T04:27:15.116Z
 * Source: mixed ai=43 local=0
 * Themes: 43
 * Logic: harm + local driver in every scene (Sustainable / Scale depth).
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
        "A gunshot patient waits behind a curtain while the acuity model keeps a lower-priority boarding case in the only hybrid OR because its confidence outranks the charge nurse’s verbal override; the family hears every delayed minute. System leadership hardens those locks after malpractice insurers demanded ‘consistent scoring,’ so each quarter human veto shrinks—the driver is liability-driven automation that treats clinical dissent as noise.",
      stakeholder: "Dr. Ramirez, trauma attending",
      pressureKeys: ["Missed Crises", "Hard Locks", "Liability Push"],
      suggested: ["ai", "computing", "networks", "iot", "vr", "robots"],
      visionTheme: "care-city",
    },
    {
      places: ["King County Emergency Call Center, Seattle"],
      title: "The call router that quiets the wrong voice",
      scene:
        "A grandmother’s labored breathing is classed non-urgent by a speech-and-risk AI and dropped into a callback queue; neighbors are already panicking on speakerphone before a human replays the tape. City managers keep expanding auto-prioritization to cut handle time and overtime, so the learning loop rewards faster dismissals—the local driver is metric-chasing call automation that outruns judgment.",
      stakeholder: "Aisha, veteran call-taker",
      pressureKeys: ["Slow Help", "Auto Drops", "Handle Time"],
      suggested: ["ai", "networks", "computing", "iot", "space", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Westlands Water District Allocation Desk, Fresno County"],
      title: "The ditch AI that starves the small orchard",
      scene:
        "A third-generation almond grower finds his lateral shut after the allocation optimizer reassigns pulse water overnight to a higher-scoring industrial offtaker; leaf curl shows before any appeal form loads. Board consultants keep feeding price-and-efficiency objectives into one opaque controller because bond covenants demand ‘smart scarcity,’ so each dry year small holders lose voice—the driver is a single optimization stack deciding who drinks when.",
      stakeholder: "Elena, small orchard operator",
      pressureKeys: ["Crop Stress", "Opaque Cuts", "Bond Rules"],
      suggested: ["ai", "iot", "networks", "computing", "drones", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["MBTA Operations Control Center, Boston"],
      title: "Buses that skip the night-shift clinic stop",
      scene:
        "Night-shift nurses miss the last reliable bus when a ridership AI cancels ‘low yield’ trips along the hospital corridor; two aides already walk dark blocks after double shifts. Agency leaders widen the model’s schedule authority to hit on-time and cost targets tied to state funding, so human schedulers lose stop-level veto each budget cycle—the driver is funding-tied optimization that treats community stops as error terms.",
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
        "Families camp in the corridor after fever rounds while certain surnames vanish from the discharge board and empty beds stay unexplained. A father is told his daughter was “transferred” and never finds her at the referral ward. Hardline clerks inside the records wing print ethnicity-coded ward rosters and sell them to neighborhood patrols, so every admission quietly feeds a disappearance pipeline.",
      stakeholder: "Night-shift nurse Esperance Mukamana",
      pressureKeys: ["Missing kin", "Fear", "List sales"],
      suggested: ["ai", "networks", "crypto", "computing", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Wau Relief Consignment Yard"],
      title: "Ration cards that starve a block",
      scene:
        "Mothers watch their cards stop scanning at the gate while children sip leaf broth and sacks tagged for their block leave on private trucks. Elders argue whether to walk out with no papers before the next consignment. A militia-aligned storekeeper rewrote the beneficiary database with clan tags, so hunger is enforced as inventory rules rather than open massacre.",
      stakeholder: "Block leader Nyibol Deng",
      pressureKeys: ["Hunger", "Card denial", "Clan capture"],
      suggested: ["drones", "networks", "ai", "space", "crypto", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Prizren Municipal Scholarship Board"],
      title: "Tablets that fail one language",
      scene:
        "Students who studied all year are turned away when the proctor’s tablet flashes red on their home-language field; parents lose housing aid tied to enrollment proof. Grandmothers burn old primers so soldiers will not find them in cupboards. Board software and patronage appointees keep converting “standardization” rules into a slow purge of one community’s future teachers and clerks.",
      stakeholder: "Teacher Lirije Krasniqi",
      pressureKeys: ["School bans", "Lost futures", "Board capture"],
      suggested: ["ai", "networks", "vr", "computing", "crypto", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Sittwe Jetty Labor Desk"],
      title: "Crew badges that never return",
      scene:
        "Fishers sleep under tarps when their crew badges fail the new scanner; wives sell wedding gold for rice while favored crews unload ice without checks. Men taken for “paper clarification” behind the ice plant do not come home. Militia members embedded in the labor desk control badge issuance and phone tip-offs, turning the harbor into a nightly filter of who may remain on the coast.",
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
        "Families on Sorting Lane sleep beside baled plastic and cough through nights when the dump fire shifts wind, yet a single middleman’s weigh-house still sets the kilo price after dark so a full day’s haul buys half a meal. City tip contracts and the scale house keep scrap title out of picker hands, turning every truck arrival into deeper dependence instead of a path to co-owned yards. Kids skip clinic days to guard carts while the same broker rents them the carts at usury rates.",
      stakeholder: "Waste picker cooperative",
      pressureKeys: ["Empty Meals", "Scale Grip", "Sick Kids"],
      suggested: ["networks", "crypto", "ai", "iot", "print3d", "solar", "battery", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Dust Ridge"],
      title: "Advance pay chains the kiln on Dust Ridge",
      scene:
        "Brick molders on Dust Ridge work barefoot in heat that splits skin, still owing last season’s rice advance so leaving means losing the only shelter the kiln boss provides. A closed ring of quarry owners and labor recruiters controls clay pits and piece rates, locking whole families into multi-year bondage rather than wage work they could exit. Infants breathe kiln smoke in the open dorms while payroll is scratched in a book only the contractor can read.",
      stakeholder: "Kiln workers’ mutual aid circle",
      pressureKeys: ["Bonded Debt", "Boss Books", "Lung Trouble"],
      suggested: ["solar", "battery", "networks", "crypto", "ai", "materials", "computing", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Hill Signal"],
      title: "Tuition dies when the mast fails in Hill Signal",
      scene:
        "Parents in Hill Signal watch exam coaching vanish every time the only mast drops, and teens walk hours for a bar of signal that still bills them for failed logins. A distant tower lease and prepaid reseller cartel keep community mesh illegal and overpriced, so digital homework and remittance apps stay locked behind a single failing mast instead of local ownership. Mothers sell jewelry for data packs while the same agents refuse shared backhaul that would cut their margin.",
      stakeholder: "Village teachers’ network",
      pressureKeys: ["Missed Classes", "Mast Monopoly", "Data Debt"],
      suggested: ["networks", "solar", "battery", "ai", "computing", "vr", "space", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ferry Slip"],
      title: "Dawn fares strand the cleaners at Ferry Slip",
      scene:
        "Night cleaners at Ferry Slip miss the last cheap boat home and sleep on the quay, then pay penalty fares that erase a shift’s pay before rent is counted. Two private landing licenses and a fuel cartel set schedules and pier fees so workers cannot start a shared dawn boat or route around the gouge. Children wait unwatched until noon while parents remain trapped on the wrong bank by a transport system built to extract, not serve.",
      stakeholder: "Cross-water night workers’ association",
      pressureKeys: ["Stranded Nights", "Pier Fees", "Child Risk"],
      suggested: ["transportation", "solar", "battery", "networks", "iot", "ai", "crypto", "drones"],
      visionTheme: "coastal-city",
    }
  ],

  "chem-bio": [
    {
      places: ["Weftbridge Dyeworks Row"],
      title: "Export blues with a second use",
      scene:
        "Shift families tape windows shut after night winds carry acrid dye fog that leaves children with nosebleeds and school nurses logging unexplained rashes. The same intermediate tanks that color export denim also hold dual-use aromatic and organophosphate precursors, and paper export seals still clear lots faster than any on-site assay can check what left the loading bay. Clinics feel the burns now; the unmonitored intermediate trade is what keeps weapons-usable chemistry flowing through the row.",
      stakeholder: "Rina Mercado, row occupational health advocate",
      pressureKeys: ["Nosebleeds", "Grey intermediates", "Seal lag"],
      suggested: ["iot", "ai", "materials", "networks", "drones", "computing", "robots", "nano"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Stonepass Border Dry Port"],
      title: "Lab kits under the wrong code",
      scene:
        "A spill on the east apron sends three handlers to hospital with searing eyes and a nearby primary school cancels recess when the wind shifts. Bonded freights still move dual-use reagents, culture media, and benchtop synthesis kits under vague ‘lab supply’ codes because night scanners and human review never catch the same crate, turning ordinary research logistics into a local precursor and isolate highway. Families feel the harm in emergency bays; the misdeclaration loophole is the driver that keeps the gap open.",
      stakeholder: "Jonas Veld, dry-port customs liaison",
      pressureKeys: ["Handler burns", "Misdeclared kits", "Night gaps"],
      suggested: ["ai", "iot", "drones", "networks", "crypto", "computing", "transportation", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Lowfen Municipal Waterworks"],
      title: "What the outfall never names",
      scene:
        "Downstream blocks boil water again after a week of gut cramps and a closed day-care, while plant techs admit the night outfall alarms still cannot tell fertilizer runoff from something engineered. Industrial slip lines and hospital discharge share the same trunk with only sparse grab samples, so restricted chem spikes or uncharacterized biologicals can pass the works without a sequence or sensor trail. Residents live the sickness in kitchens; the blind outfall is what keeps detection too late for this theme.",
      stakeholder: "Marta Singh, works lab supervisor",
      pressureKeys: ["Gut sickness", "Blind outfall", "Sample backlog"],
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "synbio", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Cedar Contract Vivarium Park"],
      title: "Loaner strains after closing time",
      scene:
        "Animal techs call out sick and apartment neighbors demand air filters after a cluster of fevers traces back to the park’s shared holding rooms. Contract colonies still swap ‘loaner’ pathogen strains between startup and university clients on handshake logs and unlocked freezers, so unlisted isolates circulate as ordinary research convenience rather than tracked dual-use material. Staff feel the fevers and stigma first; the unlogged strain-sharing circuit is what grows the local biological-weapons risk.",
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
        "Guest-house owners and farm workers around Sutherland watch bookings vanish and school fees stretch whenever another near-Earth object headline sends tourists home early—the dread lands as empty tables and thinner wage weeks. Open-pit floodlights and night-shift power contracts still wash the dark plateau, and the same provincial desks that rubber-stamp 24-hour extraction keep survey telescopes fighting glare and brownout nights, so long-period rocks slip the southern census.",
      stakeholder: "Naledi Mokoena, community dark-sky coordinator",
      pressureKeys: ["Empty lodges", "Sky glare", "Permit lock"],
      suggested: ["space", "ai", "computing", "networks", "iot", "drones", "solar", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Goldstone Antelope Valley rim, California"],
      title: "Dish backlog leaves the valley guessing",
      scene:
        "Trailer-court families and base-adjacent school staff lose sleep and pay overtime when impact-probability rumors spike insurance calls and unplanned siren drills across the Mojave fringe. Aging deep-space dishes sit in a maintenance backlog while civil and military scheduling walls block continuous follow-up tracks; that local sharing and repair queue is what keeps civilization-class rocks half-known on the public board.",
      stakeholder: "Rosa Delgado, civil tracking liaison",
      pressureKeys: ["Track gaps", "Alarm fatigue", "Repair queue"],
      suggested: ["space", "ai", "networks", "computing", "iot", "robots", "materials", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Maunakea access communities, Hawaiʻi Island"],
      title: "Time-share freeze after every rock scare",
      scene:
        "Kupuna, hotel night staff, and shuttle drivers feel cultural grief and sudden shift cuts when each viral asteroid story hardens road closures and empties the mid-level lodges. Fractured summit time-allocation and access rules still push planetary-defense survey blocks to the back of the queue behind proprietary science and stalled negotiations, so the local governance machine itself widens the detection window Earth cannot afford.",
      stakeholder: "Kainoa Hale, summit operations mediator",
      pressureKeys: ["Closed domes", "Wage shock", "Trust fracture"],
      suggested: ["space", "ai", "networks", "computing", "vr", "iot", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Esrange fringe, Kiruna municipality"],
      title: "Kinetic stack waits while the range idles",
      scene:
        "Reindeer herders and town clinic nurses already absorb boom nights, corridor fences, and drill sirens for a deflection test campaign that keeps slipping—sleep debt and disrupted migration routes are the lived cost now. Fragmented payload certification, winter weather holds, and liability fights over who owns a failed kinetic strike keep the hardware in hangars; that paperwork and range-politics loop is burning the launch years still left for a real impactor mission.",
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
        "In Drawdown Flats, ranch kids rinse grit from their teeth while the co-op well coughs sand and the feedlot thins before market week. Center-pivot monocultures and deeper diesel pumps still mine the same shrinking aquifer every dry spell, turning short droughts into lasting water loss across the bench.",
      stakeholder: "Irrigation co-op president",
      pressureKeys: ["Dry Wells", "Dust Days", "Farm Debt"],
      suggested: ["iot", "ai", "solar", "battery", "drones", "space", "genetic-engineering", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Ember Ridge"],
      title: "Orange noon at Ember Ridge",
      scene:
        "Wildfire smoke turns noon orange over Ember Ridge; nebulizer queues spill from the clinic lot and schools cancel outdoor time for a third straight week. Ladder fuels on untreated slopes and new cul-de-sacs pushed into the tree line still feed every wind-driven fire season straight into the same ridgeline streets.",
      stakeholder: "County public health nurse",
      pressureKeys: ["Smoke Days", "Fuel Buildup", "Clinic Crowds"],
      suggested: ["drones", "iot", "ai", "space", "networks", "robots", "materials", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Levee Bend"],
      title: "The river takes the bend again",
      scene:
        "Spring snowmelt shoves the river over Levee Bend’s north wall; families sandbag porches while mold climbs drywall from last year’s “rare” flood. Channelized banks, sealed upstream pavement, and deferred levee lifts still aim every crest at the same low ward each melt season.",
      stakeholder: "Parish floodplain manager",
      pressureKeys: ["Floodwater", "Levee Gaps", "Displaced Families"],
      suggested: ["iot", "ai", "drones", "materials", "robots", "space", "networks", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Windrow Court"],
      title: "Sirens after the roof",
      scene:
        "A spring derecho peels roofs off Windrow Court’s manufactured homes; elders wait under tarps while downed lines spark across the only exit road. Unanchored trailers, overhead feeders, and one undersized community shelter still leave the same park first and last when straight-line winds return.",
      stakeholder: "Mobile home residents' council lead",
      pressureKeys: ["Wind Damage", "Weak Housing", "Shelter Space"],
      suggested: ["materials", "print3d", "robots", "energy", "battery", "solar", "networks", "drones"],
      visionTheme: "social-city",
    }
  ],

  mideast: [
    {
      places: ["Dust Road Clinic Row"],
      title: "Ambulances pay twice at the gate",
      scene:
        "Along Dust Road Clinic Row, mothers carry feverish children past shuttered wings because oxygen, sutures, and cold-chain vaccines run out after night shelling and sniper hours keep staff home. Patients die of treatable shock while stretchers wait for a second “clearance” fee at the militia checkpoint that controls the only feeder road. Local fixers and rival ward captains skim aid manifests and sell convoy slots, so scarcity itself stays a profitable loyalty test rather than a shared logistics problem.",
      stakeholder: "Cross-community clinic board",
      pressureKeys: ["Missed Care", "Checkpoint Fees", "Staff Flight"],
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Saffron Lane Souk"],
      title: "Shutters rise only after the cut",
      scene:
        "In Saffron Lane Souk, bakers and spice traders lose half their week when armed crews seal alleys or seize crates labeled “tax,” and families stretch lentils while school fees go unpaid. Night markets collapse into rumor when a stall is marked as belonging to the wrong cousin, so livelihoods shrink to whoever can buy a quiet morning. Protection brokers and warehouse bosses prefer opaque tolls and fake invoices over open stall licenses, keeping conflict rents higher than a fair traders’ calendar.",
      stakeholder: "Merchants’ fair-toll association",
      pressureKeys: ["Empty Stalls", "Street Tolls", "Idle Youth"],
      suggested: ["networks", "ai", "crypto", "solar", "iot", "drones", "transportation", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Rubble Lane Blocks"],
      title: "Winter walls that never rise",
      scene:
        "On Rubble Lane Blocks, three generations sleep under tarps in half-collapsed stairwells while rain ruins schoolbooks and infected cuts go untreated in the cold. Cement bags and rebar vanish from “priority rebuild” piles before roofs go on, and neighbors argue whose deed photo is still valid after the last blast map. War-linked contractors and title brokers profit by rationing materials and stalling shared permits, so permanent housing stays rarer than another round of cash-for-rubble patronage.",
      stakeholder: "Tenants’ rebuild cooperative",
      pressureKeys: ["Exposed Homes", "Material Theft", "Deed Fights"],
      suggested: ["print3d", "materials", "robots", "solar", "drones", "ai", "networks", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Twin Bank Canals"],
      title: "The canal gate becomes a weapon",
      scene:
        "Beside Twin Bank Canals, tomato beds crack and household wells turn brackish when upstream crews slam gates after a rumor of stolen water, and children miss class hauling jerrycans before dawn. Livestock sales collapse as pastures brown, so wedding debts and clinic bills pile up on both banks. Local strongmen and pump landlords keep the shared gauge locked and sell “emergency releases,” turning irrigation into a grievance machine more valuable than a joint water schedule.",
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
        "Farm families along the launch-control spur already keep go-bags by the mudroom after two midnight readiness horns this spring; school buses run half-empty the morning after every alert. The local driver is not faraway ideology but a modernization push inside the capsule wing: new launch-control software is scored on shorter human confirmation windows, so crews are rewarded for faster release readiness whenever sensor confidence wobbles. People live chronic fear in town while the system keeps manufacturing accidental-war risk as ‘responsiveness.’",
      stakeholder: "Capt. Maya Brooks, missile combat crew commander",
      pressureKeys: ["Night Sirens", "Short Fuses", "Family Fear"],
      suggested: ["ai", "computing", "networks", "iot", "vr", "quantum-internet"],
      visionTheme: "food-city",
    },
    {
      places: ["Floe Watch Headland, Labrador coast"],
      title: "Ice clutter looks inbound",
      scene:
        "Clinic staff in the harbor settlement cancel home visits whenever the headland array throws ballistic-looking tracks across ice ridges and freighter wakes; elders refuse night travel and kids learn the evacuation horn before arithmetic. Underfunded sensors plus automated threat scoring treat noisy polar returns as possible salvos, and doctrine still shortens hold time when confidence bands overlap. The lived harm is freeze-risk evacuations and sleepless wards; the driver is brittle sensing fused to hair-trigger release posture.",
      stakeholder: "Sgt. Inuk Arnaq, sensor fusion lead",
      pressureKeys: ["False Tracks", "Hold Time", "Clinic Strain"],
      suggested: ["space", "ai", "networks", "iot", "drones", "computing"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Iron Quay Liaison Yard, lower Danube corridor"],
      title: "Drills without a shared clock",
      scene:
        "Market stalls slam shut when contrails and convoy dust rise on opposite banks; parents pull children from school on rumor alone by midday. Neither post publishes a live exercise calendar the other can cryptographically verify, so ambiguous drills still count as possible first moves and both keep reciprocal launch readiness elevated. Civilians absorb panic and empty streets while opacity plus mirrored schedules keep producing misjudgment.",
      stakeholder: "Col. Elena Popa, joint deconfliction desk",
      pressureKeys: ["Civilian Panic", "Hidden Drills", "Trust Gap"],
      suggested: ["networks", "crypto", "space", "ai", "vr", "drones"],
      visionTheme: "social-city",
    },
    {
      places: ["Granite Command Hollow, Appalachian foothills"],
      title: "Near-send on patch night",
      scene:
        "Base-town diners go quiet after yard talk of a ‘near-send’ when authorization software hiccuped during a weekend patch; spouses watch the ridgeline lights and stop sleeping through thunderstorms. Procurement and deterrence briefings still push engineers to automate release pathways and shrink dual-human veto windows on legacy command links, shipping fragility as a feature. The community rides accidental-war dread while local modernization confuses speed with safety.",
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
        "Myanmar deckhands on Ranong Channel Boats haul nets through infected cuts and sleepless multi-week trips while captains keep phones and travel papers in the wheelhouse safe. Port brokers and boat owners reload the same crews with inflated fuel and food advances after every landing, so export shrimp and squid still clear the pier with clean paperwork while no one on deck can walk away.",
      stakeholder: "Port clinic outreach medic",
      pressureKeys: ["Night Injuries", "Crew Debt", "Held Papers"],
      suggested: ["iot", "networks", "ai", "crypto", "drones", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Sambas Palm Blocks"],
      title: "The scale that never zeros the loan",
      scene:
        "Families in company barracks along Sambas Palm Blocks miss clinic days and school terms because weigh-station deductions and tool charges keep plantation advances growing after every fruit bunch. Mill agents and corridor land brokers own the only buying scale for miles, so certified palm oil still feeds global brands while the same households stay bound to next season’s quota.",
      stakeholder: "Plantation school teacher",
      pressureKeys: ["Missed School", "Weigh Fraud", "Barrack Rules"],
      suggested: ["crypto", "iot", "ai", "networks", "space", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Bhadohi Loom Lanes"],
      title: "Knot counts after midnight",
      scene:
        "Children’s fingers swell tying export knots through dusty nights in Bhadohi Loom Lanes while wages pass only to loom masters who hold family cash advances and school fees hostage. Exporters stack subcontractors so showroom audits stay clean and overseas orders stay on schedule, reproducing the debt that keeps whole households at the frames.",
      stakeholder: "Child-rights counselor",
      pressureKeys: ["Child Hours", "Family Advances", "Fake Audits"],
      suggested: ["ai", "networks", "crypto", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Kolwezi Dig Trenches"],
      title: "Ore sacks instead of schoolbags",
      scene:
        "Boys and girls climb Kolwezi Dig Trenches with metal-dust coughs and aching spines, paid in depot chits that bosses mark down whenever volume slips. Pit controllers and middle buyers push informal crews for phone-battery supply chains, so dangerous open pits stay crowded and families cannot refuse a shift without losing the week’s only cash.",
      stakeholder: "Mobile health-post nurse",
      pressureKeys: ["Spine Strain", "Chit Pay", "Pit Bosses"],
      suggested: ["drones", "iot", "ai", "robots", "networks", "crypto", "computing"],
      visionTheme: "energy-city",
    }
  ],

  women: [
    {
      places: ["Riverside Maternity Shift Gate"],
      title: "The night bus is still a family duty",
      scene:
        "When the last delivery ends, nurses and cleaners step out of Riverside Maternity Shift Gate into unlit lanes because the hospital board still treats staff transport as something a brother or husband should provide. Assaults, phone snatches, and quiet resignations climb each wet season, yet overtime rules and the vehicle budget remain written as if only male orderlies work after dark. Fear on the walk home is the lived harm; the driver is a roster and transport system that erases women’s night labor from the official ledger.",
      stakeholder: "Night-shift nurses' safety caucus",
      pressureKeys: ["Night Fear", "Shuttle Gap", "Staff Loss"],
      suggested: ["networks", "solar", "iot", "transportation", "ai", "battery", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Old Bund Land Registry"],
      title: "Mutation waits on a living male name",
      scene:
        "Widows line up at Old Bund Land Registry with tax stubs and photos of the plots they till, but clerks will not open a title mutation unless a living male heir countersigns—so cousins collect rent while fields go short of seed. Software defaults still key ownership to the husband’s national ID even when death certificates sit on the counter. Empty granaries and legal limbo are the harm people feel now; male-default mutation rules are the local machine that reprints the exclusion every season.",
      stakeholder: "Widows' land rights desk",
      pressureKeys: ["Field Loss", "Title Block", "Legal Limbo"],
      suggested: ["networks", "ai", "crypto", "computing", "space", "iot", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["East Yard Trade School"],
      title: "The practical bay locks at dusk",
      scene:
        "Young women clear the written welding exam at East Yard Trade School, then find the night practical bay and locker wing closed to them because supervisors say insurance forms and gear sizes were never built for mixed cohorts. Factory badges require the full certificate, so families pull daughters back into unpaid home piecework while the school’s roster treats female night training as a special exception. Lost wages and stalled careers hit immediately; gendered facility and insurer rules keep producing the pipeline gap.",
      stakeholder: "Women apprentices' coalition",
      pressureKeys: ["Skill Block", "Bay Lock", "Family Pull"],
      suggested: ["vr", "print3d", "networks", "ai", "solar", "robots", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Lakeview Family Planning Counter"],
      title: "The form still wants his signature",
      scene:
        "At Lakeview Family Planning Counter, women leave without contraception when staff insist on a husband’s written consent line that regional protocol does not require—yet the paper form still prints it and the stock cabinet opens only after it is filled. Unwanted pregnancies, rushed travel to distant chemists, and clinic whispers follow within months. Bodily risk is the harm felt now; consent theater plus inventory lock rules are the local system that keeps manufacturing denial.",
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
        "When the spring surge fills Marsh Bend Elementary, third-graders lose six weeks of reading while families sleep on cots in the high-school gym. County capital still ranks the industrial levee above school flood walls and pays per-pupil aid only for dry-day seat counts, so every wet year the same patched building reopens and the same kids slip a full grade behind.",
      stakeholder: "Tanya Brooks, PTA lead and levee witness",
      pressureKeys: ["Missed Days", "Flood Bias", "Catch Up"],
      suggested: ["networks", "ai", "solar", "battery", "vr", "computing", "drones", "materials"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Packingtown"],
      title: "English-only exams strand Packingtown fifth-graders",
      scene:
        "On kill-floor shift changes, Somali and Spanish-speaking kids translate for parents at conferences no interpreter covers, then fail state reading tests written only in the majority tongue. The district still funds seat-time over language support and keeps one shared bilingual aide for three schools, so the plant’s labor pipeline keeps minting unfinished credentials instead of graduates.",
      stakeholder: "Hodan Ali, plant nurse and parent advocate",
      pressureKeys: ["Reading Gap", "Language Rules", "Aide Shortage"],
      suggested: ["ai", "networks", "vr", "computing", "transportation", "iot", "solar"],
      visionTheme: "food-city",
    },
    {
      places: ["Heat Ridge"],
      title: "Blackout classrooms empty Heat Ridge by noon",
      scene:
        "By May the portable classrooms on Heat Ridge hit unsafe temperatures and children are sent home with unfinished worksheets while older siblings mind toddlers in tin-roof homes. County purchasing still stocks diesel for the admin annex and blocks cool-roof and solar line-items for the colonia trailers, so heat itself becomes the silent filter that pushes teens toward early exit.",
      stakeholder: "Luis Ortega, after-school coach",
      pressureKeys: ["Heat Days", "Power Gaps", "Home Care"],
      suggested: ["solar", "battery", "networks", "ai", "computing", "vr", "iot", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Millbridge"],
      title: "Teen caregivers miss the credit clock in Millbridge",
      scene:
        "In Millbridge’s walk-up blocks, fifteen-year-olds handle sibling pickup and grandparent meds during the only hours the credit lab is open, then fail seat-time rules that unlock diplomas. Social services and the school board still score attendance as character instead of a care gap the shuttered mill left behind, so unpaid family labor keeps manufacturing unfinished graduates.",
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
        "Night pickers at Cedar Junction Fulfillment Hub watched whole aisles go dark for humans after shelf robots and scan tunnels took the fast movers; overtime that covered rent and clinic co-pays disappeared while trailer horns still roll all night. Regional ops keeps raising units-per-hour boards that only the robot cells can hit, so every clean scorecard freezes another human lane out of the next hiring plan.",
      stakeholder: "Night pick crew steward",
      pressureKeys: ["Jobs", "Pick quotas", "Rent stress"],
      suggested: ["robots", "ai", "iot", "networks", "computing", "transportation"],
      visionTheme: "food-city",
    },
    {
      places: ["Harborview Driver Dispatch Garage"],
      title: "Medallions against empty curbs",
      scene:
        "Owner-drivers staged at Harborview Driver Dispatch Garage sit longer between fares as geofenced robotaxi pilots skim airport and waterfront loops; medallion loans and insurance still hit every month. City franchise scoring rewards fleet utilization and wait-time targets that favor operators who swap human shifts for autonomous vehicles, so each quarterly review funds more driverless bays instead of garage apprenticeships.",
      stakeholder: "Independent driver co-op lead",
      pressureKeys: ["Jobs", "Fleet scores", "Debt"],
      suggested: ["self-driving", "ai", "networks", "transportation", "computing", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Lakeside Hospital Revenue Wing"],
      title: "Charts coded without the wing",
      scene:
        "Medical coding clerks on Lakeside Hospital Revenue Wing lost whole specialty queues overnight when an AI coding suite took clean charts; student loans and eldercare costs did not slow down. Hospital finance still ranks the wing on cost-per-chart and denial rates, so managers keep feeding more visit types into the model and locking lower human ratios into the next budget cycle.",
      stakeholder: "Coding unit rep",
      pressureKeys: ["Jobs", "Chart targets", "Loan strain"],
      suggested: ["ai", "computing", "networks", "vr", "crypto", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Sunridge Berry Packing Shed"],
      title: "Sorters took the piece-rate weeks",
      scene:
        "Seasonal packers at Sunridge Berry Packing Shed lost the piece-rate weeks that paid school clothes and winter heat after vision sorters and tray robots took the grading tables; empty folding chairs still line the break wall. Grower co-op contracts now demand pack-out speed and defect scores only the automated lines reliably meet, so each harvest review adds another machine table and cuts crew calls.",
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
        "Along the inland checkpoint road, families rotate four-hour bunks in converted truck hostels while toddlers sleep under fluorescent lights and miss school weeks. Coughs spread through the unheated corridors every time a bus dumps another group before dawn. The provincial status desk still demands origin-country police certificates that no longer print, and warehouse contractors quietly tip officers to slow releases so night labor stays cheap and disposable.",
      stakeholder: "Nora Velez, hostel cooperative coordinator",
      pressureKeys: ["Crowding", "Paper delays", "Wage pressure"],
      suggested: ["ai", "networks", "crypto", "computing", "solar", "battery", "print3d", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Old South Levee Road"],
      title: "Second breach, no parcel left",
      scene:
        "After the lower levee failed again, stilt-house families pitch tarps on the parish road berm while wells taste of diesel and salt. Elders haul jugs past drowned rice paddies and watch kids develop rashes from standing water. Upstream pump schedules still favor export cane estates, and the land office fast-tracks distressed titles to outside buyers before return claims can be filed.",
      stakeholder: "Coach Dara Nguyen, levee mutual-aid lead",
      pressureKeys: ["Flooding", "Lost titles", "Outmigration"],
      suggested: ["solar", "battery", "iot", "drones", "materials", "ai", "space", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["San Lázaro Ridge Clinic"],
      title: "Wounded at the ridge clinic gate",
      scene:
        "In the mountain clinic waiting hall, displaced patients share benches with host residents while winter wind cuts through cracked windows and IV poles double as coat racks. Parents cannot prove residency for referral transport, so treatable infections turn into weeks of fever on the floor. Cross-border triage rules still route care through embassy letters no one can obtain, and private ambulance firms refuse uninsured pickups beyond the toll booth.",
      stakeholder: "Dr. Samira Okonkwo, night triage lead",
      pressureKeys: ["Sick nights", "Gatekeeping", "Staff burnout"],
      suggested: ["ai", "networks", "solar", "battery", "drones", "computing", "transportation", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Jetty Ferry Sheds"],
      title: "Ferry cuts, addresses that sink",
      scene:
        "When three island ferry runs were cancelled after insurance hikes, families from the outer keys sleep on the covered pier with wet bedding and no shore power for medicine fridges. Children miss enrollment because every form still asks for a street number that now sits under high tide. Harbor berth leases favor tour operators who lobby against temporary address cards, so the same people cycle between pier sheds and informal boat camps without a path to work permits.",
      stakeholder: "Captain Eli Marlow, seafarer and ferry workers desk",
      pressureKeys: ["Wet bedding", "Dead addresses", "Berth fights"],
      suggested: ["networks", "solar", "battery", "transportation", "drones", "iot", "materials", "ai"],
      visionTheme: "ocean-city",
    }
  ],

  ag: [
    {
      places: ["Loess Bend County"],
      title: "Bare winter fields blow the county thin",
      scene:
        "In Loess Bend County, spring winds paint porches brown and clinic visits for grit cough spike while wheat yields sag on thinner topsoil each harvest. Elevator contracts and cash-rent races pay only for continuous export grain, so leaseholders leave fields bare all winter and deep-till every acre, shredding residue that once held the loess in place. Families breathe the loss and watch margins vanish now; the driver is a grain-procurement calendar that rewards bare-soil monoculture over living cover.",
      stakeholder: "County soil district and tenant growers coalition",
      pressureKeys: ["Dust Days", "Bare Acres", "Farm Debt"],
      suggested: ["iot", "ai", "drones", "space", "solar", "genetic-engineering", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Fogline Spice Terraces"],
      title: "Full-sun spice rush kills the mist forest",
      scene:
        "Along Fogline Spice Terraces, springs run cloudy by noon and cardamom understory wilts while landslides nick the switchback road after every heavy rain. Exporters pay premium only for full-sun bulk spice on steep leased plots, so households clear remaining shade trees and cut rest years to chase volume, collapsing the mist canopy that held soil and steady water. People lose clean water and safe paths now; the driver is a price system that strips regenerative shade for short-cycle monoculture spice.",
      stakeholder: "Terrace cooperative and spring wardens",
      pressureKeys: ["Mudslides", "Spring Flow", "Shade Loss"],
      suggested: ["space", "iot", "drones", "ai", "networks", "gene-sequencing", "solar", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Ringroad Greens Belt"],
      title: "Spec sheets turn salad rows into spray alleys",
      scene:
        "Just outside the ring road, night-market sellers watch leaves yellow early and parents keep kids indoors when mist blowers start before dawn on the lease blocks. Supermarket buyers reject any blemish and lock growers into uniform hybrid calendars, so crews overdose fungicide and neonics on a schedule that drifts into courtyard wells and kills the pollinators roadside plots once shared. Households taste bitter greens and pay more for cleaner food now; the driver is retail procurement that punishes living soil diversity for cosmetic yield.",
      stakeholder: "Peri-urban growers union and school meal buyers",
      pressureKeys: ["Spray Drift", "Sick Days", "Buyer Lock"],
      suggested: ["iot", "ai", "synbio", "drones", "robots", "gene-sequencing", "networks", "alt-proteins"],
      visionTheme: "social-city",
    },
    {
      places: ["Brackish Polder Reach"],
      title: "Pump wars salt the seed beds",
      scene:
        "In Brackish Polder Reach, seedbeds crust white by midseason and dairy cows refuse ditch water while smallholders watch germination fail on the lowest parcels. Competing drainage boards and cash-crop leases race bigger pumps to dry peat for continuous vegetables sold upriver, so every extra lift pulls saline groundwater into the root zone and oxidizes the shared peat cushion. Families lose reliable plantings and pasture now; the driver is uncoordinated pump competition tied to thirsty continuous cropping without rest or freshwater rules.",
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
        "In Ladder Ridge Parish the school kitchen scrapes thin gruel because late blight blackened the terraced potatoes families count on through winter, and clinic scales show children losing weight before the frost. Continuous planting of one borrowed variety, abandoned communal seed houses, and fungicide prices locked to a single distant supplier keep the same pathogen racing through every plot each wet season. Plates are empty now; the seed-and-input system keeps restocking the failure.",
      stakeholder: "Elena, parish school-kitchen lead",
      pressureKeys: ["Hunger", "Crop Blight", "Seed Debt"],
      suggested: ["gene-sequencing", "genetic-engineering", "iot", "ai", "solar", "drones", "networks", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Copper Gate Wholesale"],
      title: "Dawn crates rot at the gate",
      scene:
        "Before sunrise at Copper Gate Wholesale, stacked tomato and greens crates sweat and collapse while neighborhood aunties walk home with half-bags because prices jump by mid-morning once the spoiled layer is discarded. No shared cold rooms, diesel that only runs for big brokers, and stall fee rules that punish short-haul growers keep the city's fresh food dying in the aisle. Families feel the shortage at supper; the cold-chain and fee system keeps turning waste into hunger.",
      stakeholder: "Jamal, stallholders union runner",
      pressureKeys: ["Hunger", "Spoilage", "Stall Fees"],
      suggested: ["iot", "battery", "solar", "transportation", "ai", "networks", "alt-proteins", "robots"],
      visionTheme: "food-city",
    },
    {
      places: ["Thorn Well Circuit"],
      title: "Wells on the circuit turn to mud",
      scene:
        "Herders on the Thorn Well Circuit boil thorn-fruit tea for supper after the third seasonal well silts to mud, and children chew dried strips while milk calabashes stay empty. Unregulated tanker withdrawals for distant feedlots, fenced private boreholes, and veterinary posts that open only after fees keep collapsing the shared water that once carried mobile herds through the dry months. Hunger is in the camps tonight; the water-and-enclosure system keeps stripping the range.",
      stakeholder: "Nia, mobile nutrition aide",
      pressureKeys: ["Hunger", "Dry Wells", "Fence Lines"],
      suggested: ["iot", "solar", "ai", "drones", "networks", "space", "materials", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Millrace Flats"],
      title: "Barges pass the small jetties by",
      scene:
        "On Millrace Flats the cooperative silo echoes empty while flour prices in the river towns climb, and shift workers skip protein because the only working mill now unloads from deep-draft barges that never stop at the old jetties. Upstream contract farming for export meal, channel dredging that favors big hulls, and credit tied to a single buyer keep smallholders from storing or milling for local bread. Empty larders are already local; the barge-and-contract system keeps diverting the harvest past them.",
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
        "At Cattail Bend Flats, families lose free marsh fish and cool shade as dump trucks fill heron ponds for bonded warehouses, and school-road dust plus diesel leave kids coughing after every fill day. Spring floods now shove brown water under kitchen doors because the wetland sponge is gone. Inland-port lease bonuses still pay more than any standing cattail, so survey stakes march outward each dry season.",
      stakeholder: "Marsh neighborhood council",
      pressureKeys: ["Flooding", "Wetland Loss", "Lease Money"],
      suggested: ["drones", "space", "ai", "iot", "materials", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Silver Ladder Bend"],
      title: "Empty nets at the weir",
      scene:
        "Elders at Silver Ladder Bend smoke fewer fish than any year they remember; the spring shad run stalls at the new irrigation weir upstream rice exporters raised without fish passage. Kids skip stones where spawning gravel once flashed silver, and market stalls shutter by noon. Pump schedules and mill contracts keep the gates shut through peak migration because dry-season grain prices punish any release of water.",
      stakeholder: "River fishers' cooperative",
      pressureKeys: ["Empty Nets", "Blocked River", "Grain Contracts"],
      suggested: ["iot", "ai", "drones", "gene-sequencing", "synbio", "solar", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Glassgrass Sound"],
      title: "Sand where meadows waved",
      scene:
        "Waders at Glassgrass Sound sink into bare mud where seagrass meadows once cleared the shallows; night sand barges cut trenches for city concrete while juvenile fish and grazing dugongs vanish from the flats. Beach clinics treat more infected cuts from cloudy water, and small-boat coolers come back light. Quarry licenses feed port fees the township depends on, so dredge permits renew faster than any meadow map can be defended.",
      stakeholder: "Sound fishers and guides guild",
      pressureKeys: ["Cloudy Water", "Sand Dredging", "Port Fees"],
      suggested: ["drones", "space", "iot", "materials", "nano", "ai", "solar"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Lichen Stair Valley"],
      title: "Spring without frogs",
      scene:
        "School nature walks in Lichen Stair Valley go silent—no frogs, no thrushes—after the last cloud-forest belt is cut for charcoal and softwood pallets hauled to coastal mills before dawn. Household wells turn cloudy by afternoon, and mudslides nick the only clinic road after hard rain. Kiln bosses and crate buyers still front cash to hillside crews because city bakeries and export sheds demand cheap heat and wood, so stumps replace moss whenever patrols thin out.",
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
        "Children who sort plastics beside the open medical-waste trench come home with infected cuts that will not close, and elders ration one antibiotic strip across three households. Night haulers still tip unsorted hospital bags because the transfer station pays by wet weight, not segregation, so the settlement’s waste economy keeps seeding resistant skin and gut infections faster than the outreach nurse can dress wounds.",
      stakeholder: "Rosa, waste-picker cooperative lead",
      pressureKeys: ["Infected Cuts", "Waste Dumping", "Clinic Access"],
      suggested: ["gene-sequencing", "iot", "ai", "materials", "networks", "drones", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Station Road Pilgrim Lodge"],
      title: "Shared cistern cough fills Station Road Lodge",
      scene:
        "Overnight pilgrims wake with the same wet cough that has filled the infirmary mats two festivals in a row, and day-labor relatives lose bus fares waiting outside locked doors. Ablution tanks are still refilled from one unchlorinated rooftop cistern between peak arrivals, and damp mattresses turn without airing, so the lodge’s water and bedding rules keep amplifying respiratory chains through every holy week.",
      stakeholder: "Imam Karim, lodge warden",
      pressureKeys: ["Cough Spread", "Shared Water", "Lost Wages"],
      suggested: ["gene-sequencing", "iot", "ai", "networks", "materials", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Old Quay Fish Landing"],
      title: "Gutting rinse sickens Old Quay landings",
      scene:
        "Fishwives miss two market dawns with bloody diarrhea after rinse water from the gutting tables reaches the play strip and nearby hand wells. Boats still dump bilge and share unwashed knives on the same harbor steps because the auction clock pays the fastest unloaded hold, so the landing’s speed-first workflow keeps recycling gut pathogens into hands, ice, and drinking water.",
      stakeholder: "Nia, women’s fishers association",
      pressureKeys: ["Gut Illness", "Dirty Rinse", "Market Days"],
      suggested: ["gene-sequencing", "iot", "synbio", "materials", "networks", "ai", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Maple Primary School Yard"],
      title: "Playground pump empties Maple Primary desks",
      scene:
        "Half the morning class is out vomiting after the shared hand-pump break, and parents lose factory shifts ferrying sick children to a clinic already out of oral rehydration salts. The pump still draws from a cracked ring well beside the overflowing latrine block the district never desludged, so the school’s own water-and-toilet system keeps reintroducing the outbreak every term.",
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
        "After each cloudburst, Cedar Bend families stack sandbags while kids sleep on cots in the high-school gym and corner shops throw out spoiled stock. Mold climbs rented ground floors and night-shift nurses wade to the clinic—while new warehouse pads, filled wetlands along the feeder creek, and diesel sump pumps at the distribution hub still shove floodwater toward the lower ward and burn more fuel every storm.",
      stakeholder: "Rhea, ward flood-watch captain",
      pressureKeys: ["Flooded Homes", "Paved Wetlands", "Missed Shifts"],
      suggested: ["iot", "drones", "materials", "ai", "solar", "battery", "networks", "space"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Juniper Wells"],
      title: "Night heat pins Juniper Wells",
      scene:
        "In Juniper Wells, farm crews finish harvests before dawn and toddlers pack into the library for the only reliable cool air when the feeder sags. Clinic cots fill with heat exhaustion and pharmacies run short on electrolyte packs—while roadside compressor stations, open methane flares, and idling crew-camp diesels still dump heat and emissions across the same valley with almost no shade left.",
      stakeholder: "Diego, community clinic organizer",
      pressureKeys: ["Heat Illness", "Gas Flares", "Cool Rooms"],
      suggested: ["solar", "battery", "iot", "ai", "materials", "energy", "networks", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Gull Point"],
      title: "Warm water empties Gull Point nets",
      scene:
        "Gull Point crews haul nets that come up thin, and the co-op freezers brown out so families lose a week of catch overnight. Teenagers skip the boats for any town shift they can find as slip rents still come due—while the diesel ice plant, bunker-fuel trawlers, and fishmeal stacks keep warming the harbor and lock the fleet into the same fuel that prices them out of thinner seasons.",
      stakeholder: "Noor, co-op dock lead",
      pressureKeys: ["Empty Nets", "Boat Diesel", "Dock Jobs"],
      suggested: ["tidal", "wind", "battery", "solar", "iot", "ai", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Soot Bridge"],
      title: "Inversion traps Soot Bridge",
      scene:
        "When the winter inversion sits on Soot Bridge, parents cancel recess and elders tape plastic over kitchen windows that already smell like exhaust. Asthma inhalers run short at the corner pharmacy and soccer fields stay empty for weeks—while rail-yard switchers, petcoke piles by the coking ovens, and unfiltered boiler stacks still feed the brown layer that settles on every laundry line.",
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
        "Night burners on Circuit Beach strip insulation from motherboards and wake with open sores that clinics later call skin and liver cancers. Scrap bosses still pay by the kilo of recovered copper, so open-pit board burns resume every dry spell and children play downwind of the same plumes. Families feel the lesions first; the cash-for-ash system keeps pumping carcinogens into the shacks.",
      stakeholder: "Scrap-yard health volunteer Ama Diallo",
      pressureKeys: ["Open sores", "Burn smoke", "Scrap wages"],
      suggested: ["iot", "drones", "materials", "ai", "gene-sequencing", "robots", "solar", "networks"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Old Gasworks School block"],
      title: "Playground vapors no one capped in time",
      scene:
        "Teachers at Old Gasworks School count more nosebleeds and a cluster of childhood leukemias while tar smell still rises through classroom floor cracks after rain. The city still postpones capping the buried gasworks pits because redevelopment bids outrank soil vapor tests, so the same intrusion path keeps dosing kids every heating season. Parents live the diagnoses as shattered routines; the unremediated brownfield keeps writing the exposure.",
      stakeholder: "PTA nurse coordinator Priya Nair",
      pressureKeys: ["Sick kids", "Tar vapors", "Budget fights"],
      suggested: ["iot", "materials", "ai", "gene-sequencing", "drones", "networks", "computing", "space"],
      visionTheme: "learn-city",
    },
    {
      places: ["Nail Row beauty corridor"],
      title: "Solvent booths trade lungs for tips",
      scene:
        "Manicurists along Nail Row lose weight and cough through double shifts while lung and sinus cancers climb in the shared clinic upstairs. Shop leases still ban costly ventilation upgrades and importers keep flooding the strip with cheap acrylate and formaldehyde mixes, so booth air never clears between clients. Workers feel the breathlessness and late scans; the low-rent solvent supply chain keeps the dose high.",
      stakeholder: "Booth steward Linh Tran",
      pressureKeys: ["Cough spells", "Booth fumes", "Lease fear"],
      suggested: ["iot", "materials", "ai", "networks", "gene-sequencing", "print3d", "solar", "nano"],
      visionTheme: "social-city",
    },
    {
      places: ["Vinyl Reach night plant"],
      title: "Night resin lines still mark the livers",
      scene:
        "Night-shift baggers at the Vinyl Reach compounding plant watch co-workers yellow with liver cancers while the smell of uncured resin clings to lunch rooms. Maintenance still runs open monomer transfers on the old lines because shutdown bonuses beat leak repairs, and the plant nurse only sees workers after overtime peaks. Families meet the tumors at late stage; continuous vinyl chloride handling keeps manufacturing the risk.",
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
        "Undergrads along the Ames Cyclone Corridor skip meals and whisper into crisis lines at 3 a.m., while roommates find them shaking on dorm bathroom floors after panic they tried to white-knuckle through midterms. Ranking-driven grade curves plus counseling centers capped by rigid staff formulas keep stretching waitlists past eight weeks, so ordinary academic stress keeps converting into full breakdowns before anyone is ever seen.",
      stakeholder: "Campus peer-support director",
      pressureKeys: ["Panic Nights", "Wait Lists", "Grade Fear"],
      suggested: ["ai", "networks", "vr", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Garden City Packing Ward, Kansas"],
      title: "The line never slows for grief",
      scene:
        "Night-shift cutters in Garden City's packing ward clock out with numb hands and racing minds, then sit alone in truck cabs after another silent coworker overdose the floor pretends not to name. Export-tied line-speed quotas and a points system that punishes bathroom, grief, or clinic breaks keep manufacturing exhaustion and untreated trauma faster than the bilingual wellness van can circle the lots.",
      stakeholder: "Plant chaplain and wellness liaison",
      pressureKeys: ["Exhaustion", "Line Speed", "Silence"],
      suggested: ["networks", "ai", "transportation", "vr", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Detroit Receiving Night Floor, Michigan"],
      title: "Twelve-hour hearts running empty",
      scene:
        "Nurses on Detroit Receiving's night floor finish mandatory doubles with trembling hands, then cry in the parking structure replaying failed codes before short, angry days off with their kids. Overtime grids and ratio waivers written for budget shortfalls strip recovery time every roster cycle, so moral injury and compassion fatigue regenerate faster than any single wellness flyer can blunt.",
      stakeholder: "ICU charge nurse coalition",
      pressureKeys: ["Moral Injury", "Short Staffing", "Turnover"],
      suggested: ["ai", "robots", "networks", "vr", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Phoenix Desert Stack, Arizona"],
      title: "Five stars or the spiral",
      scene:
        "App-rated drivers and warehouse pickers in the Phoenix Desert Stack apartments refresh acceptance scores between drops with shaking hands, skipping meals and sleep while landlord portals ding late rent. Algorithmic deactivation threats and piece-rate pay with no mental-health sick coverage keep turning one bad week into cascading crises no peer chat group can catch in time.",
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
        "Elders with undiagnosed dementia leave cottage doors ajar and walk county roads toward old farmsteads at dusk; neighbors find them cold beside irrigation ditches. Adult children run harvest and packing shifts miles away and cannot be the evening failsafe. County aging services still only open a full case after a 911 search or guardian petition, so mild disorientation keeps ripening into missing-person nights and sudden nursing-home placements that empty the cottages.",
      stakeholder: "Ruth, township volunteer coordinator",
      pressureKeys: ["Wandering", "Late Diagnosis", "Family Distance"],
      suggested: ["iot", "ai", "networks", "drones", "transportation", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Harbor Lights Tower, Seattle"],
      title: "Three floors, one night aide",
      scene:
        "Residents with dementia in Harbor Lights Tower miss evening pills and meals when the aging call system only rings a front desk that is often empty, and a single night aide covers three floors. Families discover dehydration and bruises only on weekend visits and stop trusting management. The ownership company still staffs to bare code ratios and treats continuous sensors as liability magnets, so preventable agitation and falls keep filling ER basements and forcing emergency guardianships.",
      stakeholder: "Kenji, resident council president",
      pressureKeys: ["Missed Meds", "Thin Staffing", "Trust Gap"],
      suggested: ["robots", "iot", "ai", "networks", "vr", "battery"],
      visionTheme: "care-city",
    },
    {
      places: ["Ironbound Walk-In Row, Youngstown"],
      title: "After the midnight caregiving shift",
      scene:
        "Retired mill workers along Ironbound Walk-In Row arrive confused at the free clinic after spouses finish janitorial night shifts; staff have no memory pathway and send them home with pain scripts. Spouses collapse from stacked paid work and unpaid care while still fearing eviction. Retiree plans and the county still treat cognitive screens as optional wellness extras rather than routine primary care, so progression keeps being missed until a stove fire or a lost drive forces crisis placement.",
      stakeholder: "Angela, free-clinic nurse practitioner",
      pressureKeys: ["Exhaustion", "Missed Screens", "Crisis Moves"],
      suggested: ["ai", "networks", "transportation", "computing", "iot", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Little Mekong Courtyard, Fresno"],
      title: "Prayers between bus transfers",
      scene:
        "Grandparents in Little Mekong Courtyard wander from temple gardens onto busy arterials after bilingual day programs closed with the last grant cycle. Adult children driving produce trucks cannot leave the fields for midday check-ins. County intake still funnels cognitive testing through English-only downtown slots with long waits, so families delay out of shame and paperwork fear while neighbors absorb more rescue walks and police wellness checks.",
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
        "Along Midtown Home-Care Corridor, aides in their sixties finish sixteen-hour doubles with swollen ankles, skipped meals, and missed insulin, then ride two night buses home. Piece-rate visit billing and no-replacement call-outs keep stretching the same aging workforce instead of redesigning lift assists, route density, and paid recovery, so the district shortens healthspan while still depending on their hands. Clients already cancel baths and wound care when an aide simply cannot climb another flight.",
      stakeholder: "Home-care workers cooperative steward",
      pressureKeys: ["Body strain", "Shift load", "Worker gaps"],
      suggested: ["ai", "robots", "iot", "networks", "transportation", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Brickfields Elder Yards"],
      title: "Kilns that outlast bones",
      scene:
        "On Brickfields Elder Yards, potters and stackers past sixty cough through heat haze while wrists lock and night sweats spoil sleep before dawn shifts. Piece-rate kiln schedules, unpaid cooling breaks, and open-yard dust keep grinding lungs and joints faster than the clinic can patch, locking families into shorter working lives even as orders cheer cheaper bricks. Grandchildren already haul water jugs to the drying racks when elders cannot finish a load.",
      stakeholder: "Yard occupational health lead",
      pressureKeys: ["Joint pain", "Kiln heat", "Lost wages"],
      suggested: ["materials", "robots", "iot", "ai", "solar", "battery"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Sunstack Senior Towers"],
      title: "Upper floors without cool air",
      scene:
        "Residents on the upper floors of Sunstack Senior Towers ration fans by noon as heat turns apartments into ovens and dizziness sends people to stair landings. Landlord metering rules and sealed-window retrofits that never funded shared cooling or check-in loops keep producing dehydration, falls, and skipped meds instead of treating longer lives as a building system to redesign. Neighbors already leave water jugs at doors and listen for silence after dark.",
      stakeholder: "Tenant association chair",
      pressureKeys: ["Heat stress", "Power bills", "Alone hours"],
      suggested: ["solar", "battery", "iot", "ai", "networks", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["River Gate Wholesale Market"],
      title: "Dawn stalls without successors",
      scene:
        "Vendors at River Gate Wholesale Market still lift crates at 3 a.m. into their seventies because stall licenses stay personal and young helpers left for warehouse apps. Wet floors, cold storage drafts, and all-cash pre-dawn hours keep stacking falls, untreated blood pressure, and stalled cancer screens instead of redesigning lift gear, shared logistics, and health checks into the market itself. Families already cover night watches when a parent does not return from the ice bays.",
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
        "Before dawn in Canal Ward, mothers hold jerrycans under a standpipe that coughs rusty water then dies, and kids stay home with stomach cramps from ditch scoops. Unrepaired trunk mains and unlicensed dye shops upstream keep bleeding pressure and color into the shared lines — the crisis is produced by who gets discharge permits and repair crews, not only by a dry sky.",
      stakeholder: "Mira, standpipe committee lead",
      pressureKeys: ["Sick Days", "Pipe Failures", "Repair Delay"],
      suggested: ["iot", "materials", "nano", "ai", "solar", "battery", "networks", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Paddy Step Wells"],
      title: "Green film coats the Paddy Step Wells",
      scene:
        "At Paddy Step Wells, cooking pots show a green film by noon and toddlers line the clinic bench with vomiting after every irrigation pulse. Open fertilizer ditches and unlined field drains keep flushing nutrients straight into the shared steps — clean water fails because the slopes are farmed without recovery paths, not only because rain is late.",
      stakeholder: "Sita, growers’ water keeper",
      pressureKeys: ["Tummy Bugs", "Field Runoff", "Well Fights"],
      suggested: ["iot", "drones", "ai", "materials", "nano", "solar", "gene-sequencing", "space"],
      visionTheme: "food-city",
    },
    {
      places: ["Night Clinic Bore"],
      title: "Boil orders never lift at Night Clinic Bore",
      scene:
        "Night Clinic Bore posts another boil order while nurses rinse instruments with bought bottles and new mothers fear the ward taps. Cracked septic lines behind the old laundry block keep seeping into the shallow bore field every time the generator floods the sump — infection risk is fed by the waste path under the clinic, not only by missing filters at the sink.",
      stakeholder: "Dr. Elias, night-shift clinician",
      pressureKeys: ["Ward Infections", "Septic Seep", "Bottle Bills"],
      suggested: ["iot", "materials", "nano", "solar", "battery", "robots", "ai", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["Guest Pier"],
      title: "Guest pools win, alley taps lose at Guest Pier",
      scene:
        "Along Guest Pier, alley households haul sweet water by handcart while hotel pools stay full and laundry chutes never stop. Unmetered resort wells and brine dumped from small desal skids keep drawing down the thin coastal lens — residents go thirsty because tourism intake rules favor the boardwalk, not only because the rains failed.",
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
        "On Tidegate Fishing Quays, laundry lines and open fish stalls yellow under a low brown film as ferry and tramp freighters burn cheap heavy fuel while docked, and kids with stinging eyes skip the morning catch school. Night arrivals still idle auxiliary engines for hours because harbor power pedestals are scarce, berth fees favor the lowest bunker bill, and agents will not wait for cleaner cold-ironing.",
      stakeholder: "Dock clinic nurses and fisher-family co-op",
      pressureKeys: ["Burning eyes", "Ship smoke", "Berth power"],
      suggested: ["iot", "ai", "solar", "battery", "energy", "networks", "materials", "drones"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Ring Road School Corridor"],
      title: "Recess under the flyover",
      scene:
        "At schools pressed against the Ring Road School Corridor, PE is canceled when diesel from container trucks and aging buses fills the courtyards, and asthma inhalers empty before midterms. Freight still funnels through the same flyover at peak hours because toll discounts, lax idle rules, and just-in-time depot schedules keep the cheapest dirty fleets on the route.",
      stakeholder: "Parent-teacher air watch and corridor bus crews",
      pressureKeys: ["Sick days", "Truck exhaust", "Fleet rules"],
      suggested: ["transportation", "iot", "ai", "battery", "solar", "networks", "computing", "drones"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal-Side Scrap Lanes"],
      title: "Evening fires in the lane",
      scene:
        "After dark in the Canal-Side Scrap Lanes, plastic-cable and foam burns send acrid plumes into one-room homes where infants cough through the night and midwives record more wheeze visits. Sorting yards still torch what recyclers will not buy because dump fees, missing take-back rules, and landlord bans on shared clean yards make open burning the fastest way to clear tomorrow’s pile.",
      stakeholder: "Waste-picker cooperative and community midwives",
      pressureKeys: ["Baby cough", "Waste fires", "Dump fees"],
      suggested: ["materials", "iot", "ai", "solar", "battery", "robots", "print3d", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Riverside Dye Cluster"],
      title: "Colored fog at shift change",
      scene:
        "At dawn shift change along the Riverside Dye Cluster, workers and nearby tea stalls taste sharp chemical haze as coal boilers and untreated vents push colored fog over the boarding rooms. Small dye houses still fire scrap coal and skip scrubbers because fast-fashion piece rates and shared chimney leases punish any shop that slows the line for cleaner heat.",
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
        "Before dawn in the Ulaanbaatar Ger District Lanes, mothers wipe ash from children's nostrils while kettles boil on raw coal because wall sockets die in the cold snap. The utility still treats ger plots as informal and unbankable for firm feeders, so stove-fuel middlemen and winter peak rationing keep dirty heat as the only power households can count on.",
      stakeholder: "Ger district health volunteer lead",
      pressureKeys: ["Cough nights", "Coal smoke", "Plot rights"],
      suggested: ["solar", "battery", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Camotes Island Rice Co-op Wharf"],
      title: "Harvest waits while the genset coughs",
      scene:
        "On Camotes Island Rice Co-op Wharf, farmers watch wet paddy mold in sacks because the co-op mill only runs when scarce diesel arrives by barge, cutting cash before school-term fees. The provincial utility still prices the island spur as loss-making and defers submarine-cable upgrades, so a diesel cartel and intermittent barge logistics lock every harvest into energy poverty.",
      stakeholder: "Rice co-op chair",
      pressureKeys: ["Spoiled grain", "Diesel waits", "School fees"],
      suggested: ["solar", "battery", "wind", "iot", "networks", "energy"],
      visionTheme: "food-city",
    },
    {
      places: ["Humla Trailhead Health Post"],
      title: "The sterilizer sleeps through the night shift",
      scene:
        "At Humla Trailhead Health Post, midwives finish deliveries by phone light and boil instruments on wood fires when the single diesel genset fails, and newborns chill in the dark. Subsidized kerosene and a distant district grid plan that never budgets high-altitude last-mile feeders keep the post dependent on fuel porters who arrive late when snow closes the trail.",
      stakeholder: "District midwife supervisor",
      pressureKeys: ["Dark births", "Fuel porters", "Staff burnout"],
      suggested: ["solar", "battery", "drones", "networks", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Makoko Lagoon Stilt Blocks"],
      title: "Light sold by the hour on the lagoon",
      scene:
        "In Makoko Lagoon Stilt Blocks, students lose evening study hours and fish smokers spoil overnight catches when shared generators cut out, while families pay daily wire fees to local strongmen. The city will not extend formal meters across contested water plots, so a rent-seeking connection racket—not only missing panels—keeps energy access a daily toll on the poorest households.",
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
        "At noon the Sunbelt Weekly Inn dumps long-stay families onto blacktop already past 110°F so weekend tourist apps can refill the rooms; kids vomit from heat while parents guard garbage bags of clothes. Owners chase short-stay revenue and vacancy bonuses written into local tax and code practice, so last-resort weekly roofs keep flipping to churn instead of stable leases—the local driver that manufactures unsheltered nights faster than cooling centers can open.",
      stakeholder: "Marisol, motel outreach caseworker",
      pressureKeys: ["Heat illness", "Room churn", "Case backlog"],
      suggested: ["ai", "networks", "iot", "solar", "battery", "materials", "print3d", "transportation"],
      visionTheme: "care-city",
    },
    {
      places: ["Riverbend Family Justice annex"],
      title: "Thirty safe nights, then the courthouse lot",
      scene:
        "Survivors leave the Riverbend annex after thirty funded nights with a protective order, two kids, and no landlord willing to touch a thin rental file; by week two the courthouse parking lot becomes the bedroom. Voucher rules that demand clean credit, full deposits, and perfect paperwork while abuser-linked debt still scars reports keep the handoff from shelter to lease broken—the local system that returns people to danger or the street on a calendar.",
      stakeholder: "Keisha, domestic-violence housing advocate",
      pressureKeys: ["Unsafe nights", "Voucher rules", "Credit blocks"],
      suggested: ["ai", "networks", "computing", "crypto", "vr", "transportation", "iot", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Palm Court senior trailer park"],
      title: "Sold out from under the fixed check",
      scene:
        "Palm Court elders who own their trailers watch bulk buyers post thirty-day pad notices; SSI and pension checks cannot match the doubled lot rents, so walkers and oxygen tanks move into cars and church basements. State rules that treat land sales as ordinary commerce without real tenant purchase rights or rent caps let investors clear stable elder courts for speculation—the local driver that turns owned homes into instant homelessness.",
      stakeholder: "Harold, retired machinist and park board member",
      pressureKeys: ["Displacement", "Lot rent", "Fixed checks"],
      suggested: ["ai", "networks", "computing", "materials", "print3d", "solar", "battery", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["County General ambulance bay curb"],
      title: "Discharged still weak to the ambulance bay",
      scene:
        "At dawn, patients still feverish or post-op are wheeled to the County General curb with a discharge packet and a rideshare code that expires; many are back in the ER within days after nights on transit benches. Hospital throughput targets and the absence of funded medical-respite contracts push people out before housing navigators can act—the local machine that converts illness into unsheltered relapse.",
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
        "On the Textile Lane roofs, night temperatures stay high enough that infants fail to sleep and elders crowd courtyard clinics with heat exhaustion by morning. Setbacks and greenery rules keep yielding to paved godown courtyards and unshaded metal extensions because floor-area incentives still reward hardscape over trees and cool roofs, so the same redevelopment that densifies jobs keeps trapping waste heat in the lanes.",
      stakeholder: "Ward heat-health and housing desk",
      pressureKeys: ["Heat Nights", "Sick Days", "Hardscape"],
      suggested: ["solar", "materials", "iot", "ai", "networks", "battery"],
      visionTheme: "energy-city",
    },
    {
      places: ["Manila Estero de Vitas Pocket"],
      title: "The estero that became the alley dump",
      scene:
        "Families along the Estero de Vitas Pocket watch black water and plastic push into ground-floor rooms after ordinary rains, and children stay home with skin and gut infections while boats cannot clear the choke points. Collection routes and lot permits still treat the waterway as leftover edge space for informal dumping and warehouse fill, so every dry-season build cycle narrows the channel that once drained the barangay.",
      stakeholder: "Barangay waterway and solid-waste council",
      pressureKeys: ["Flooding", "Trash Backup", "Tenant Squeeze"],
      suggested: ["drones", "iot", "materials", "robots", "ai", "transportation"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Bogotá Soacha Ridge Stops"],
      title: "Three hours down the ridge for a shift",
      scene:
        "Dawn queues on the Soacha Ridge stretch past two hours before workers even reach the trunk buses, and missed connections mean lost day wages, empty school seats, and caregivers missing clinic windows. Feeder rights-of-way and depot land keep converting to gated parcels because municipal scheduling still prioritizes formal avenue BRT over hillside last-mile capacity, so sprawl outruns the mobility spine that ties homes to pay.",
      stakeholder: "Hillside feeder and fare-integration office",
      pressureKeys: ["Commute Hours", "Lost Wages", "Feeder Gaps"],
      suggested: ["transportation", "ai", "networks", "battery", "solar", "self-driving"],
      visionTheme: "social-city",
    },
    {
      places: ["Nairobi Mathare Ridge Schools"],
      title: "Lessons under the zinc sheets",
      scene:
        "On Mathare Ridge, double shifts pack sixty children into zinc-roof rooms that flood and overheat, so reading levels stall and girls drop out when toilets fail and paths wash out. School-plot leases and roadside commerce still outbid classroom expansion because permitting treats learning space as temporary occupancy rather than protected public ground, and the same speculation wave keeps shrinking the yards kids need to stay enrolled.",
      stakeholder: "County basic-education and public-land unit",
      pressureKeys: ["Crowded Rooms", "Dropouts", "Plot Flip"],
      suggested: ["networks", "vr", "solar", "print3d", "iot", "ai"],
      visionTheme: "learn-city",
    }
  ],

  child: [
    {
      places: ["El Alto compound kitchens, La Paz highlands"],
      title: "Night smoke steals small breaths",
      scene:
        "Mothers wake to toddlers wheezing and rubbing raw eyes after nights beside dung and scrap-wood stoves in unvented rooms. Landlords still ban open gas lines and the bottled-fuel queue prices out the coldest blocks, so every dry-season freeze remakes the same pneumonia line at the health post. Families feel the chest rattle and lost daycare days while the housing-and-fuel system keeps the smoke locked indoors.",
      stakeholder: "Highland community health nurse",
      pressureKeys: ["Wheezing", "Cook smoke", "Fuel cost"],
      suggested: ["solar", "battery", "materials", "iot", "ai", "networks", "energy", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cebu canal-edge daycare, Visayas waterfront"],
      title: "Trash gutters breed the fever",
      scene:
        "Toddlers spike sudden fevers and go limp-limbed as Aedes swarms rise from plastic-choked gutters outside the daycare gate. Waste contracts still skip the narrow lanes and landlords pave over the last soakaway ditches, so standing water reloads with every rain. Caregivers lose night wages to hospital queues while the drainage and trash system keeps manufacturing the bites.",
      stakeholder: "Barangay child-health coordinator",
      pressureKeys: ["Child fever", "Standing water", "Missed work"],
      suggested: ["iot", "drones", "ai", "networks", "materials", "solar", "space", "robots"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Kano grain-market under-fives post, northern Nigeria"],
      title: "Spoiled millet on the growth chart",
      scene:
        "Infants stall on weight charts after caregivers stretch thin gruel with mold-damaged millet sold cheap after the rains. Leaky trader stores and roadside mixing still push damp bags into the lowest-price heap because inspection ends at the ring road, so toxins keep entering first foods. Mothers feel the thin arms and endless revisit days while the post-harvest market system keeps rewarding unsafe grain.",
      stakeholder: "Nutrition surveillance officer",
      pressureKeys: ["Thin arms", "Spoiled grain", "Market trust"],
      suggested: ["gene-sequencing", "iot", "ai", "solar", "networks", "drones", "materials", "synbio"],
      visionTheme: "food-city",
    },
    {
      places: ["Old Fadama scrap-yard edge clinic, Accra"],
      title: "Battery dust on the play sand",
      scene:
        "Preschoolers show slow speech, stomach cramps, and lagging first steps after playing in dust blown from open lead-acid breaking yards beside the only shaded yard. Export buyers and scrap rents keep informal recycling denser each season, and relocation stalls without real alternate livelihoods, so the same blocks that house kids keep crushing batteries in the open. Parents feel delayed words and restless nights while the recovery economy keeps spraying metal into the air children breathe.",
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
        "On the high trail above Salleri, a mother with stalled labor is lashed to a bamboo stretcher while porters slip on wet shale; her pulse thins as the district operating table stays a full day downhill. The local driver is a single government jeep pool that books timber and election runs first, plus a ridge clinic that cannot keep a charged spare battery or radio through weeks of cloud. Families already recite which switchback claimed the last emergency referral.",
      stakeholder: "Trail health volunteer circle",
      pressureKeys: ["Heavy Bleeding", "Road Wait", "Staff Gaps"],
      suggested: ["drones", "transportation", "networks", "solar", "battery", "iot", "ai"],
      visionTheme: "care-city",
    },
    {
      places: ["Rakhiyal chawl maternity room"],
      title: "Night heat on the birth floor",
      scene:
        "In Rakhiyal’s stacked chawls, postpartum mothers faint on thin mats while the shared ceiling fan stalls and oxytocin warm in a plastic cooler loses its bite; a newborn’s fever climbs before anyone finds clean water. The driver is a municipal grid that sheds the lane every peak evening for mill loads, joined to a ward budget that rents no shade roof and never stocks reliable cold packs. Aunties already keep wet cloths ready because the night shift means heat stroke after blood loss.",
      stakeholder: "Chawl women’s health sabha",
      pressureKeys: ["Mother Fever", "Power Cuts", "Crowding"],
      suggested: ["solar", "battery", "energy", "iot", "networks", "ai", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cerro Alto workers’ maternity desk"],
      title: "Dust in the labor queue",
      scene:
        "Outside Cerro Alto’s company clinic, a pregnant hauler waits through a night of headaches until her blood pressure spikes into seizures on the metal bench; oxygen smells of brake dust and the only stretcher is reserved for pit injuries. The local driver is a mine rota that docks pay for “unscheduled clinic hours” and a municipal rule that leaves contractor families off the public maternity roster. Spouses already sell tools the week a birth turns into intensive care.",
      stakeholder: "Mine spouses’ care committee",
      pressureKeys: ["Seizures", "Shift Rules", "Clinic Fees"],
      suggested: ["networks", "ai", "transportation", "iot", "computing", "vr", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Mtwapa creek birth shelter"],
      title: "Warm vials at low tide",
      scene:
        "Beside Mtwapa creek, a midwife opens a foam box to find oxytocin lukewarm after the kerosene fridge ran dry again; the mother already soaking the mat cannot stop bleeding while the nearest typed blood waits across a tidal ford. The driver is a county supply loop that restocks fish ice before clinic fuel and a ferry timetable owned by market brokers, so cold-chain breaks and river delays keep repeating the same postpartum crashes. Grandmothers mark the moon phases when the shelter is most likely to fail.",
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
        "When a glacial lake suddenly dumps, farmhouses on the valley floor lose walls to mud and families sleep in school gyms with wet blankets and no clean water. Each municipality still runs its own half-maintained lake gauges and treats a public red reading as a tourism and liability hit, so the corridor has no shared early-warning fund or automatic joint alert—the competitive silence, not only the ice, is what keeps the next surge a local surprise.",
      stakeholder: "Valley civil-defense coordinators",
      pressureKeys: ["Flood damage", "Silent gauges", "Blame games"],
      suggested: ["iot", "networks", "ai", "space", "drones", "computing", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Delhi–Ghaziabad–Noida work corridors"],
      title: "Three cities, one heat wave",
      scene:
        "Outdoor laborers faint on construction scaffolds and night markets empty early while emergency rooms stack patients on benches with ice packs that run out by dusk. Each city still issues separate heat alerts and refuses a pooled cooling-bus and clinic-surge fund because the first to admit overload looks weak on the evening news—the missing shared response pot is what turns a regional heat spell into staggered local collapse.",
      stakeholder: "Metro public-health and labor desks",
      pressureKeys: ["Heat illness", "Split alerts", "Budget fights"],
      suggested: ["ai", "networks", "iot", "solar", "battery", "computing", "space"],
      visionTheme: "care-city",
    },
    {
      places: ["Saint-Louis to Kayar landing beaches, Senegal"],
      title: "Nets empty, logbooks closed",
      scene:
        "Fishers haul in thinner catches and households cut school fees and protein from evening bowls while women at the drying racks wait on smaller trays. Landing committees and neighboring councils hide true catch numbers and block a shared quota-and-depletion ledger so no one has to admit overfishing first—the secrecy, not only the warm water, keeps the whole strip racing toward empty nets together.",
      stakeholder: "Coastal landing cooperatives and marine desks",
      pressureKeys: ["Empty nets", "Hidden catch", "Distrust"],
      suggested: ["iot", "networks", "ai", "space", "drones", "crypto", "computing"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Kisumu–Homa Bay lakeshore belt, Lake Victoria"],
      title: "Shore towns, separate water truths",
      scene:
        "Children miss school with repeated diarrhea and clinic ORS stocks thin out after cloudy intake weeks while mothers boil water they cannot fully trust. Town water desks publish only cleaned-up dashboards and will not co-fund a shared shoreline sensor ring or joint contamination response purse, because the first honest spike risks tourism and political blame—the refusal to co-own the early signal is what keeps the sickness cycling along the bay.",
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
        "Outside Riverside Mill Row Gate, second-shift sewers clutch pink slips after the cutting floor’s new line robots went live, and parents already skip rent and keep kids home when neighborhood chats fill with clips blaming the hostel across the tracks. The driver is not only online hate: opaque shift boards, no shared skills path off the old machines, and a parking-lot loudspeaker recruiter who translates wage panic into a purity story about who “belongs” on the payroll.",
      stakeholder: "Mill-row shop stewards and family counselors",
      pressureKeys: ["Missed Rent", "Blame Clips", "Thin Bonds"],
      suggested: ["ai", "networks", "vr", "computing", "robots"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Cedar Hollow Parish Hall"],
      title: "Closed clinic, open airwaves",
      scene:
        "In Cedar Hollow Parish Hall, elders line up for a volunteer blood-pressure night because the county clinic cut hours, and grandkids already flinch when cousins share late-night shows that cast nurses and newcomers as enemies of the valley. Empty appointment books and a single unchallenged talk-radio hour are the local engine: grief and travel costs meet a grievance pipeline that names a scapegoat faster than any town meeting can book a nurse.",
      stakeholder: "Parish care circle and mobile clinic volunteers",
      pressureKeys: ["Sick Delays", "Hate Radio", "Closed Doors"],
      suggested: ["networks", "ai", "transportation", "solar", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["East Line Night Depot"],
      title: "Cut routes, louder break room",
      scene:
        "At East Line Night Depot, bus operators who lost weekend overtime after route software “optimized” the map eat from vending machines while group chats pin delayed pensions on depot hires from another district. Families feel the harm in shorter sleep and sharper kitchen arguments; the driver is the sealed scheduling black box plus break-room rumor chains that turn roster pain into ethnic loyalty tests before any union mediator gets a fair data room.",
      stakeholder: "Transit mutual-aid stewards",
      pressureKeys: ["Exhaustion", "Scapegoats", "Split Crews"],
      suggested: ["ai", "networks", "computing", "crypto", "transportation"],
      visionTheme: "social-city",
    },
    {
      places: ["North Stand Supporters Club"],
      title: "Standing terrace, softer recruiters",
      scene:
        "Under the North Stand Supporters Club lights, teens locked out of after-school pitches watch matchday chats slide from refereeing gripes into dehumanizing chants about a rival neighborhood’s faith, and younger siblings already copy the slogans on the walk home. Crowded housing, cut youth coaches, and unmoderated fan channels are the pipeline—not only the songs—giving soft-spoken recruiters a weekly room where belonging is sold as us-versus-them before any youth worker can open a calmer space.",
      stakeholder: "Supporters’ trust youth workers",
      pressureKeys: ["Street Fear", "Chat Pipeline", "Lost Mentors"],
      suggested: ["vr", "networks", "ai", "iot", "computing"],
      visionTheme: "learn-city",
    }
  ],

  fgm: [
    {
      places: ["Abnub marriage-notary row, Minya Governorate"],
      title: "Notary stamps still favor the cut",
      scene:
        "Teen girls on Abnub’s notary row sit through blood-soaked recoveries each engagement season—fevers, pain on walking to school, and quiet dropouts—while aunts insist no respectable contract will be signed without proof of cutting. Local marriage brokers, fee-taking traditional birth attendants, and family honor talk keep producing FGM as the price of a stamped union, not a fading private custom. Invent public status, schooling, and contract tools that rewrite those marriage-market rules instead of only hiding girls after the blade.",
      stakeholder: "Girls' secondary school mothers' union",
      pressureKeys: ["Infections", "Cutter Fees", "Honor Rules"],
      suggested: ["networks", "ai", "crypto", "vr", "computing", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Makump grove edge, Tonkolili District"],
      title: "Bondo dues open the initiation bush",
      scene:
        "Before the rains, girls from Makump are walked toward the Bondo grove and return with searing wounds, urine pain, and weeks lost from class while markets slow around their recovery. Society leaders, initiation fees, and the fear of being shut out of women’s mutual aid still renew the cut each season as the gate to adult belonging and farm labor sharing. Invent livelihood, learning, and public-declaration paths that retire that initiation economy—not only mobile clinics that treat injuries afterward.",
      stakeholder: "Women rice growers' mutual-aid circle",
      pressureKeys: ["Wound Pain", "Society Dues", "Belonging Fear"],
      suggested: ["solar", "networks", "ai", "iot", "print3d", "crypto"],
      visionTheme: "food-city",
    },
    {
      places: ["Borama central women’s market lanes, Awdal"],
      title: "Market cutters book brides before dawn",
      scene:
        "In Borama’s pre-dawn market lanes, mothers still pay known cutters so daughters will be accepted by in-laws, and girls limp home with hemorrhage fears, lifelong pain, and terror of first birth. The driver is a living payment chain—cutter income, mother-in-law demands, and marriageability talk along clan lines—that keeps producing FGM even when city clinics post bans. Invent care, proof-of-abandonment, and household incentive systems that end demand at the source rather than only expanding fistula wards.",
      stakeholder: "Market traders' health cooperative",
      pressureKeys: ["Birth Injury", "Cutter Income", "In-Law Demand"],
      suggested: ["ai", "networks", "solar", "battery", "computing", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Ranya foothill wedding courtyards, Sulaymaniyah Governorate"],
      title: "Foothill elders still name the pure bride",
      scene:
        "In Ranya’s hillside courtyards, girls face cutting before match-making visits and carry chronic pain, fear of childbirth, and silence that keeps them from school councils and clinic truth-telling. Village elders, matchmakers, and kinship honor rules still treat the cut as proof a family is trustworthy, so the practice regenerates with every engagement season despite regional abandonment pledges. Invent peer learning, elder-accountable registries, and care networks that break that purity gate without only offering secret shelters.",
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
        "Along Salt Creek Mangrove Fringe, evening cookfires sting kids’ eyes and spring tides already push farther into stilt-house yards because the green buffer has been cut back for charcoal sacks sold at the roadside. Traders pay cash on load-out day while short woodcutting permits and family school-fee deadlines reward whoever fells first, so living storm defenses keep becoming fuel even as elders mark how much higher the water sits each year.",
      stakeholder: "Creek-side fishers and kiln workers’ council",
      pressureKeys: ["Flood water", "Charcoal cash", "Permit race"],
      suggested: ["iot", "drones", "solar", "ai", "networks", "materials", "crypto"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Hillside Polytechnic Annex"],
      title: "Exam scores, locked workshops",
      scene:
        "At Hillside Polytechnic Annex, apprentices practice welds on scrap in a hallway because the machine bay roof leaks onto idle lathes and the CNC is down for a part no one will order. District leaders freeze multi-year equipment and roof bonds so this year’s exam-pass charts and operating ledger stay green for inspectors and promotion boards, quietly liquidating the shop floor that was supposed to train the next decade’s technicians.",
      stakeholder: "Instructors, apprentices, and parent board",
      pressureKeys: ["Broken shops", "Budget freeze", "Skill gap"],
      suggested: ["print3d", "vr", "ai", "networks", "computing", "robots", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Canal Row Tenements"],
      title: "Rent due, stairs failing",
      scene:
        "In Canal Row Tenements, mold blackens bedroom corners and a missing stair tread has already sent one elder to clinic, so families sleep with windows cracked even in winter damp. Owners and agents chase this month’s rent targets while patch-and-pass inspections and cheap fines make full structural and damp repairs a balance-sheet loss next quarter, so the building stock keeps being mined for cash until floors and pipes fail.",
      stakeholder: "Tenants’ union and block caretakers",
      pressureKeys: ["Mold homes", "Rent squeeze", "Patch fines"],
      suggested: ["iot", "materials", "print3d", "ai", "networks", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Blackwater Fen Allotments"],
      title: "Spring flood sold as dry fields",
      scene:
        "On the Blackwater Fen Allotments, boots sink in black mud beside ditches that reek of peat, and last season’s field fire left a haze that kept children indoors for a week. Crop buyers and land-lease clauses still pay only for drained, plantable acres this season, so cooperatives keep the pumps running and the peat oxidizing rather than rewet or shift crops—turning tomorrow’s soil and flood buffer into this year’s delivery ticket.",
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
        "Elders skip insulin and blood-pressure pickups after cloned nurse voicemails warn that the free clinic is swapping expired stock—sugars spike, a stroke lands in the hallway, and the waiting room empties by noon. A neighborhood click farm stitches clinic hold-music into fresh scare calls every time the real pharmacist posts hours, so the lie regenerates faster than paper flyers on the door.",
      stakeholder: "Clinic outreach coordinator",
      pressureKeys: ["Missed Doses", "Fake Calls", "Staff Strain"],
      suggested: ["ai", "networks", "computing", "iot", "crypto"],
      visionTheme: "care-city",
    },
    {
      places: ["Seabrook Wharf Notice Board"],
      title: "Sirens nobody believes",
      scene:
        "Families stay on the pier when a real storm warning hits because last month’s deepfake siren emptied the docks for a nonevent—hulls crack, bait freezers die, and kids lose a week of fish money. Anonymous ferry-group admins keep pasting new “false alarm confessions” from town officials onto every weather update, so doubt outruns the harbor master’s walk along the boards.",
      stakeholder: "Harbor master",
      pressureKeys: ["Storm Losses", "Fake Alerts", "Harbor Doubt"],
      suggested: ["ai", "networks", "space", "iot", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Milltown Night School Hall"],
      title: "The lecture that wasn’t sold",
      scene:
        "Adult learners quit GED night classes after a spliced video shows the instructor “admitting” grades are for sale—parents lose linked childcare slots and the cafeteria job pipeline stalls the same month. A rival tutoring broker funds meme pages that regenerate the doctored clip with new captions whenever enrollment ticks up, so the smear outpaces every live Q&A in the hall.",
      stakeholder: "Night-school director",
      pressureKeys: ["Dropouts", "Doctored Clips", "Paid Smears"],
      suggested: ["ai", "networks", "computing", "vr", "crypto"],
      visionTheme: "learn-city",
    },
    {
      places: ["Harborview Tenant Union Hall"],
      title: "Rent strike on a forged memo",
      scene:
        "Tenants withhold rent after a forged housing-authority memo claims a toxic-mold buyout is coming—locks turn, a grandmother sleeps in the stairwell with her oxygen tank, and kids miss school for couch-hopping. A freelance content mill paid by an outside property fund spins fresh “leaked memo” templates each week, so panic restarts before the real inspector’s paper report can circulate floor to floor.",
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
        "At Millbridge Community Hospital, elders sleep on corridor chairs after a child's offhand joke in the waiting room drops the whole household's care tier and freezes refill slots. Ward budgets, overtime, and bed priority now run through a municipal wellness-conduct portal that ranks units on scripted education completion and peer-report quotas, so charge nurses keep widening mandatory check-in questions to protect their scores. Families learn which symptoms are safer left unsaid.",
      stakeholder: "Night-shift nurses' quiet circle",
      pressureKeys: ["Denied Care", "Report Quotas", "Staff Fear"],
      suggested: ["networks", "crypto", "ai", "computing", "vr", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Harborlane Produce Arcades"],
      title: "No chant, no cold storage",
      scene:
        "Stallholders at Harborlane Produce Arcades find cold-room keys revoked and morning dock slots erased when they skip the market loyalty chant on the borough app; kids go home with thinner bags while flagged neighbors watch. Hygiene grades, truck permits, and ice allotments are gated by a continuous association ledger that treats shared tea breaks as unauthorized meetings, so inspectors pad metrics by expanding who must be logged. Hunger walks the same aisles that once fed half the district.",
      stakeholder: "Vendor mutual-credit association",
      pressureKeys: ["Empty Stalls", "Permit Ledger", "Vendor Fear"],
      suggested: ["crypto", "networks", "iot", "solar", "battery", "print3d", "ai"],
      visionTheme: "food-city",
    },
    {
      places: ["Copperline Grid Hamlet"],
      title: "Compliant blocks stay lit",
      scene:
        "Families in Copperline Grid Hamlet sit through selective blackouts after a private group chat is scraped into the utility civic-reliability index, and insulin fridges warm while praise-posting streets keep power. Transformer upgrades and hardship waivers flow only to feeders that clear political-education hours and peer-nomination drills, so local managers invent longer mandatory webinars to keep their lines funded. Darkness teaches who you may still message.",
      stakeholder: "Line workers and hardship clerks",
      pressureKeys: ["Power Cuts", "Score Portal", "Neighbor Distrust"],
      suggested: ["solar", "battery", "networks", "crypto", "computing", "iot", "ai"],
      visionTheme: "energy-city",
    },
    {
      places: ["Saltreed Fisher Quay"],
      title: "Fuel only for the logged crew",
      scene:
        "Skippers at Saltreed Fisher Quay lose ice-house space and fuel chits when they miss cadre-led unity voyages, and nets dry on racks while children borrow rice from relatives who still smile for the harbor camera. Boat licenses and co-op votes are scored through a seamanship-loyalty file that maps every shared radio channel and pier meeting, so repair circles dissolve rather than hand the office an attendance list. The catch still goes to those who clap on schedule.",
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
        "At Pune Polytechnic Instrumentation Wing, women diploma students watch CNC and sensor-calibration slots fill after dark while the last safe campus shuttle leaves and hostel gates lock, so they hand half-finished boards to male classmates who stay. Families already feel the sting of lower practical marks and lost internship shortlists this term. The local driver is a male-default night access system—transport schedules, hostel rules, and first-come bench culture—that keeps producing the STEM drop-off before final exams.",
      stakeholder: "Polytechnic principal and women students’ guild",
      pressureKeys: ["Missed labs", "Shuttle gaps", "Grade slide"],
      suggested: ["networks", "ai", "solar", "iot", "self-driving", "vr"],
      visionTheme: "learn-city",
    },
    {
      places: ["Antofagasta Copper Training Depot"],
      title: "Sensor tickets still list the sons",
      scene:
        "Young women finishing mining-electronics courses at Antofagasta Copper Training Depot lose paid pit-sensor and drone-inspection apprenticeships when supervisors fill tickets through sons-of-crew networks and declare underground shifts “not for girls.” Households feel stalled wages and broken promises now as copper firms still claim a technician shortage. The closed roster and chaperone custom keep manufacturing underrepresentation in mine STEM at the depot gate.",
      stakeholder: "Depot training chief and regional women miners’ association",
      pressureKeys: ["Ticket lockout", "Crew bias", "Wage stall"],
      suggested: ["drones", "iot", "vr", "robots", "ai", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Kumasi Teaching Hospital Biomed Bay"],
      title: "Repair floor badge never prints for her",
      scene:
        "Women biomedical engineering graduates at Kumasi Teaching Hospital Biomed Bay are routed to inventory desks while men alone hold after-hours ventilator and imaging-repair badges, so broken machines pile up and their clinical STEM careers freeze. Patients and families feel longer downtime and cancelled surgeries now. The local driver is a gendered custody-and-on-call system that treats heavy repair and night call as male work and keeps pushing trained women out of hospital STEM.",
      stakeholder: "Hospital biomedical head and nursing-STEM liaison",
      pressureKeys: ["Broken machines", "Badge bias", "Career exits"],
      suggested: ["print3d", "ai", "iot", "networks", "computing", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Amman STEM Olympiad Prep Hall"],
      title: "Travel fund needs a male chaperone",
      scene:
        "Girls who outscore boys in Amman STEM Olympiad Prep Hall still lose regional contest seats when travel grants and lab-visit buses require a male family chaperone schools will not fund, so teams depart without them and scholarship paths close. Parents feel the shame of wasted talent and unpaid coaching fees this season. The chaperone rule and male-default travel ledger keep reproducing the pipeline gap at the contest door.",
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
        "Temple repair crews around the Nishijin timber yard still watch scaffolds go back up when a hidden joint fails because only a retired master could read faded carpenter marks and seasonal cedar cues—those hands are gone or too frail to climb. Prefecture jobs pay certified fastener kits and photo archives of finished roofs, not paid hours for masters to narrate why each chisel path mattered, so the procurement system itself keeps erasing craft memory and the same typhoon-season failures return.",
      stakeholder: "Temple carpentry guild keepers",
      pressureKeys: ["Beam Failures", "Mark Loss", "Apprentice Exit"],
      suggested: ["vr", "ai", "networks", "computing", "print3d", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Toksook Bay boat launch, Alaska"],
      title: "Safe ice only the aunties can name",
      scene:
        "Hunters launching from Toksook Bay cut trips short and lose seal shares when young drivers misread gray ice elders once named by sound, color, and wind—those voices are in clinics or gone. Grants fund GPS tracks and satellite ice charts that miss lagoon micro-patterns, and youth pay ties to formal certifications instead of shore walks with aunties, so the knowledge system that kept families fed keeps thinning every breakup season.",
      stakeholder: "Yup'ik shore knowledge keepers",
      pressureKeys: ["Trail Accidents", "Ice Forgetting", "Youth Drift"],
      suggested: ["ai", "networks", "vr", "iot", "space", "computing"],
      visionTheme: "food-city",
    },
    {
      places: ["Port Talbot blast furnace control room, Wales"],
      title: "The furnace whisper dies at shift end",
      scene:
        "Night crews at Port Talbot still scramble when a gas spike behaves like one an old chargehand could smell and steady by ear, and the last of those hands left without a recorded walkthrough. Corporate training loads vendor SOPs and sensor dashboards while liability rules strip free-form shift notes from the archive, so the plant’s own documentation system keeps deleting the craft memory that would blunt the next near-miss.",
      stakeholder: "Steelworks safety stewards",
      pressureKeys: ["Near Misses", "Shift Amnesia", "Note Purges"],
      suggested: ["ai", "iot", "computing", "networks", "vr", "robots"],
      visionTheme: "energy-city",
    },
    {
      places: ["Maternity annex, Komfo Anokye Teaching Hospital, Kumasi"],
      title: "Auntie remedies never reach the chart",
      scene:
        "New mothers in the Kumasi maternity annex return with the same preventable complications because rotating staff cannot find the handoff stories senior midwives once carried about family risks, herbal clashes, and who needs a second look—those aunties are stretched thin or retiring. Hospital policy privileges coded EHR fields and treats free-text oral handoffs as noncompliant risk to delete, so the records system itself keeps erasing the continuity that would stop repeated harm on the ward.",
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
        "After every big storm, coffee and maize sacks pile up on the wrong side of Cajón Seco because the single bailey bridge over the arroyo sits half-scoured and unsafe for laden trucks. Municipal crews patch planks with leftover highway steel while logging and plantation traffic still get priority lane time on the graded trunk, so the spur never gets a permanent span or drainage. Families sell wet cherry at distress prices to the only middleman who risks a mule train, and school fees vanish with the season.",
      stakeholder: "Smallholder coffee cooperative and municipal works chief",
      pressureKeys: ["Spoiled Crop", "Bridge Fail", "Spare Cash"],
      suggested: ["transportation", "materials", "drones", "iot", "solar", "networks", "ai", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Barotse floodplain hamlets, Western Zambia"],
      title: "Clinic boat cannot beat the cut-off levee",
      scene:
        "When the Zambezi rises, pregnant women and snakebite cases from the outer Barotse hamlets wait days because the dry-season dirt causeway vanishes and the clinic’s one boat is trapped behind a privately raised rice levee with no public gate. District budgets fund floating markets for tourism photos, not marked navigation channels or raised all-season footpaths that would keep care moving. Grandmothers keep death tallies on kitchen walls while the same levee owners lobby to keep the cut closed.",
      stakeholder: "River clinic nurses and traditional authority council",
      pressureKeys: ["Late Care", "Blocked Path", "Levee Politics"],
      suggested: ["transportation", "drones", "solar", "battery", "networks", "iot", "ai", "materials"],
      visionTheme: "care-city",
    },
    {
      places: ["Ömnögovi winter school trace, South Gobi"],
      title: "Winter school bus never clears the dune line",
      scene:
        "From first hard frost, the boarding-school bus for herder children stalls at soft dune crossings where the formal winter trace was never compacted or marked, so parents keep kids home rather than risk night strandings. Aimag road money follows mining haul roads that serve copper trucks, while the school route is redrawn each year on paper without posts, culverts, or a funded grader pass. Enrollment drops, teachers request transfers, and the next generation’s literacy gap widens with every closed month.",
      stakeholder: "Boarding-school head and herder parents’ association",
      pressureKeys: ["Missed Class", "Soft Trace", "Teacher Exit"],
      suggested: ["transportation", "space", "iot", "solar", "networks", "ai", "vr", "battery"],
      visionTheme: "learn-city",
    },
    {
      places: ["Peerless Lake ice spur, northern Alberta"],
      title: "Fuel and dialysis miss the thaw window",
      scene:
        "As winters shorten, the ice spur into Peerless Lake communities carries fuel, dialysis supplies, and building kits for fewer reliable weeks, and the last soft patches already swallowed a loaded trailer this season. Provincial winter-road contracts still assume old freeze calendars and pay only for tonnage delivered, not for all-season spurs, hovercraft trials, or year-round barge landings that would break the freeze dependence. Elders ration heat and clinic trips while construction lumber rots on the far shore waiting for a winter that no longer cooperates.",
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
        "Before the first whistle at Tijuana Maquiladora Gate 7, night-shift workers share lit cigarettes down the queue while children wait in idling cars with windows cracked against the blue haze. By midday, throats rasp on the line and sick days climb. The company store still docks pay for discounted carton ‘stress packs’ timed to shift changes, so nicotine stays wired into how the plant buys calm.",
      stakeholder: "Plant occupational nurse collective",
      pressureKeys: ["Sick Days", "Cheap Cartons", "Break Culture"],
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Hanoi Secondary Gate Snack Strip"],
      title: "Snack carts sell the first drag",
      scene:
        "After lunch along Hanoi Secondary Gate Snack Strip, parents smell smoke on uniforms and teens cough through afternoon lessons while younger siblings copy the pose with candy-stick props. Ward-licensed snack carts still stack single cigarettes beside sweets at dismissal prices lower than a soft drink, so the school gate itself keeps recruiting the next cohort of smokers.",
      stakeholder: "Parent-teacher health board",
      pressureKeys: ["Kids Coughing", "Single Sticks", "Gate Rent"],
      suggested: ["ai", "networks", "iot", "drones", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["Marseille Fos Container Break Yard"],
      title: "Dock break rooms still billow",
      scene:
        "Stevedores at Marseille Fos Container Break Yard taste tar after every overtime bay and partners complain of clothes that never air out of the night shift. Chest tightness shows up in clinic logs each winter. Union canteens still take a quiet cut from cigarette vending that undercuts quit flyers, locking the only warm break ritual to tobacco sales.",
      stakeholder: "Port occupational safety steward",
      pressureKeys: ["Dirty Air", "Vending Cut", "Overtime Norm"],
      suggested: ["iot", "materials", "ai", "networks", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Nairobi Maternity Waiting Home Courtyard"],
      title: "Courtyard haze reaches the newborn cots",
      scene:
        "In the Nairobi Maternity Waiting Home Courtyard, pregnant women and newborns share night air with relatives who chain-smoke through multi-day waits, and midwives log more wheeze and poor feeds after visiting hours. The compound kiosk still funds the caretaker’s salary with loose-stick sales twenty steps from the dorm doors, so the care setting restocks its own secondhand harm.",
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
        "At Sunwell Primary Compound, girls line up for two cracked pit stalls that flood the play yard after every heavy rain; many leave early with stomach cramps and miss exams while boys still wash hands in the same mud. The district keeps building classrooms but never budgets a desludging route or spare pans, and the caretaker still empties waste into a ditch behind the kitchen because the nearest licensed tanker will not climb the rutted access road without a fee no school fund can pay—so every term the pits fill and the outbreak clock resets.",
      stakeholder: "Parent-teacher hygiene club",
      pressureKeys: ["Sick Kids", "Full Pits", "Budget Gap"],
      suggested: ["solar", "iot", "materials", "print3d", "robots", "ai", "transportation", "networks"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ladder Cut Settlement"],
      title: "Sewage owns the only stair out",
      scene:
        "Families in Ladder Cut Settlement slip on black water that sheets down the single concrete stair after night rains; toddlers pick up sores and elders stop leaving home rather than wade through it. Shared pit banks along the slope have no vehicle access, so landlords still collect rent while tenants tip buckets into the open channel that feeds the stair—because the ward map never listed a sludge path and fines hit residents, not owners—so every storm reloads waste into the only way people walk.",
      stakeholder: "Stair-block residents' union",
      pressureKeys: ["Skin Sores", "Open Channels", "Landlord Delay"],
      suggested: ["materials", "drones", "iot", "print3d", "solar", "battery", "ai", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Crossridge Freight Yard"],
      title: "Behind the fuel bay is the toilet",
      scene:
        "Long-haul drivers and night loaders at Crossridge Freight Yard relieve themselves behind parked tankers because the yard block is padlocked and foul; dysentery and lost shifts pile up before dawn runs. The concessionaire underbid the lease and skipped tanker contracts, and depot managers still score on-time departures, not hygiene—so broken cubicles stay closed and open defecation returns to the loading lanes each payroll week.",
      stakeholder: "Night loaders' mutual aid circle",
      pressureKeys: ["Gut Bugs", "Locked Stalls", "Lease Squeeze"],
      suggested: ["solar", "iot", "materials", "networks", "ai", "crypto", "transportation", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Olive Court Rest Home"],
      title: "The wing that smells before breakfast",
      scene:
        "Residents on the east wing of Olive Court Rest Home wake to sewage odors and wet floors when the old riser backs up; urinary infections and falls climb the same weeks families visit. The operator still dumps greywater and failed fixtures into a side gully because the municipal sewer stub was never finished and night cleaning was cut from the care contract—so every clog reloads pathogens into the corridor where elders eat and sleep.",
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
        "Residents along Circuit Lane Scrap Alleys wipe black soot from laundry lines as pickers burn phone cables for copper after every weekend haul. Phone shops still push sealed, unrepairable handsets with no deposit return because distributors pay for volume, not take-back—so broken devices keep feeding open fires instead of a parts bank.",
      stakeholder: "Informal scrap pickers' association",
      pressureKeys: ["Burn Smoke", "Sealed Gadgets", "Tip Fees"],
      suggested: ["materials", "iot", "robots", "ai", "networks", "print3d", "drones", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Junction Battery Sheds"],
      title: "Swollen packs behind the shed",
      scene:
        "Shopkeepers at Junction Battery Sheds choke on sweet chemical stink when swollen e-bike packs weep into the alley after rain and children step around sticky metal shards. Fleet apps still treat packs as disposable consumables with no reverse-logistics deposit, so riders abandon dead modules at kiosks rather than haul them across town—the same locked supply chain that floods the ditch with gel and foil.",
      stakeholder: "E-bike kiosk operators guild",
      pressureKeys: ["Acid Smell", "Dead Packs", "Haul Cost"],
      suggested: ["battery", "materials", "iot", "robots", "ai", "transportation", "networks", "energy"],
      visionTheme: "energy-city",
    },
    {
      places: ["Riverside Campus Canteens"],
      title: "Trays stacked to the dorm vents",
      scene:
        "Students in Riverside Campus Canteens sleep with windows shut against fruit-fly clouds rising from towers of foam trays left after every exam week. Catering contracts still ban shared crockery for speed and bill single-use plastic as a free line item, so wet food never separates and the night hauler tips one mixed load behind the gym.",
      stakeholder: "Student facilities council",
      pressureKeys: ["Fly Clouds", "Foam Trays", "Contract Lock"],
      suggested: ["materials", "iot", "ai", "robots", "networks", "synbio", "print3d", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Palm Reach Hotel Strip"],
      title: "Linen that washes out to sea",
      scene:
        "Fishers off Palm Reach Hotel Strip pull soggy towels, mini bottles, and key-card sleeves from nets while beach cleaners fill carts after every checkout wave. Hotels still order single-night amenities by the pallet because brand standards ban bulk dispensers and laundry loops with local co-ops—so the same guest turnover that fills rooms also fills the tide line.",
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
        "In the Delta’s cotton towns, laboring women bounce over unfinished highway while the nearest obstetric suite is a county away, and grandmothers still keep towels for roadside deliveries that go wrong. Families count emergency transfers the way they once counted flood crests. The local driver is a hospital finance rulebook that lets boards shutter labor floors when Medicaid margins dip, leaving no overnight surgical team and no shared regional blood protocol tied to parish ambulances.",
      stakeholder: "Delta doula and EMT coalition",
      pressureKeys: ["Road Births", "Closed Wards", "Insurance Gaps"],
      suggested: ["networks", "ai", "transportation", "drones", "solar", "battery", "iot", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Ilha do Combu birth post, Belém river belt"],
      title: "High water blocks the midwife boat",
      scene:
        "On Combu and neighboring islands, women in prolonged labor wait for a canoe that cannot cross when tide and rain coincide, while newborns cool on porches without sterile kits. Stillbirths and cord infections are spoken of as river luck, not preventable failure. The driver is a municipal health map that funds only mainland hospital beds and treats riverine posts as optional outreach, with no night fuel stipend, blood cooler, or oxytocin locker on the islands themselves.",
      stakeholder: "River midwife collective",
      pressureKeys: ["Stillbirths", "Boat Delays", "Mainland Bias"],
      suggested: ["drones", "solar", "battery", "networks", "iot", "transportation", "materials", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Marka industrial dorms RH window, East Amman"],
      title: "The sponsor keeps her health card",
      scene:
        "Live-in garment and cleaning workers hide pregnancies and untreated infections because clinic entry requires a sponsor’s stamped card, and deportation talk follows any positive test. Some bleed through double shifts rather than ask permission to leave the compound. The driver is a work-permit health system that routes reproductive visits through employer HR desks and keeps no anonymous walk-in lane for migrant women off the factory books.",
      stakeholder: "Migrant women’s health advocates",
      pressureKeys: ["Hidden Illness", "Sponsor Locks", "Deportation Fear"],
      suggested: ["networks", "crypto", "ai", "computing", "iot", "vr", "solar", "gene-sequencing"],
      visionTheme: "social-city",
    },
    {
      places: ["Sanganer Adolescent ANC Desk, Jaipur fringe"],
      title: "She arrives already mid-pregnancy",
      scene:
        "Girls pulled from class after family betrothal reach the fringe PHC already mid-pregnancy, anemic and watched by in-laws who forbid iron tablets and scans unless a mother-in-law sits in. Night home births still end in hemorrhage that neighbors cannot name aloud. The driver is a block registry and incentive scheme that rewards institutional delivery counts but never flags early marriage or funds confidential adolescent counseling separate from family ration cards.",
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
        "Families drawing from borewells along the Patancheru Industrial Stretch watch simple cuts and urinary infections stop answering the cheap tablets still sold at the lane chemist, and school nurses log longer fevers that used to break in two days. Bulk antibiotic makers and formulation units still release partially treated process water heavy with active residues into the open storm drains that recharge the same tanks and irrigation ditches. As long as the outfalls keep dosing the aquifer, every monsoon restocks resistant bacteria in drinking and wash water.",
      stakeholder: "District pollution-control and primary-care joint lead",
      pressureKeys: ["Sick days", "Factory waste", "Clinic trust"],
      suggested: ["gene-sequencing", "iot", "materials", "nano", "ai", "networks", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Callao Dockside TB Ward"],
      title: "Port lungs outlast the formulary",
      scene:
        "Dockworkers and their children on the Callao Dockside TB Ward cough through month after month while standard pills no longer quiet the night sweats, and households lose wages waiting for culture results that arrive too late. Crowded boarding rooms, interrupted treatment sold in split blister packs, and delayed drug-susceptibility tests keep seeding multidrug-resistant strains that bounce between ships, hostels, and the public ward. Without faster ID and tighter treatment support, each new cohort arrives already carrying harder bugs.",
      stakeholder: "Port-district TB program director",
      pressureKeys: ["Failed cures", "Missed doses", "Job loss"],
      suggested: ["gene-sequencing", "ai", "networks", "iot", "computing", "drones", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Santa Catarina Hog Belt"],
      title: "Barn routine poisons the creek clinics",
      scene:
        "Barn hands and nearby villagers along the Santa Catarina Hog Belt cycle through skin abscesses and bloody gut bugs that shrug off the same antibiotics stocked for the animals, and rural posts report wound infections that refuse first-line drugs. Integrators still mix routine preventive antibiotics into feed and flush slurry into creeks that feed household wells and small vegetable plots. The dosing-plus-runoff habit keeps minting resistant strains for workers, markets, and downstream clinics.",
      stakeholder: "State veterinary and rural health liaison",
      pressureKeys: ["Worker fevers", "Barn dosing", "Creek smell"],
      suggested: ["iot", "gene-sequencing", "ai", "synbio", "drones", "networks", "materials"],
      visionTheme: "food-city",
    },
    {
      places: ["Makoko Stilt Clinic Lanes"],
      title: "Lane chemists empty the last good drugs",
      scene:
        "Mothers in the Makoko Stilt Clinic Lanes paddle infants with escalating fevers to a floating post where once-reliable syrups no longer drop the heat, and fishers nurse boat cuts that weep for weeks. Unlicensed chemists still sell loose broad-spectrum capsules for every cough, diarrhea, and ‘weakness,’ often in incomplete courses paid per pill, while the clinic lacks rapid tests to refuse or target treatment. The cash-per-pill lane economy keeps selecting harder bugs faster than the post can restock effective medicine.",
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
