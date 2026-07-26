/**
 * Curated local mission angle packs — one quality set per global theme.
 * Used by localScenariosForGlobal / ensureScenarios as the product seed.
 *
 * Scale rule: existential themes (asteroid, nuclear, rogue SI, chem-bio…) are
 * planetary or civilizational stakes told through concrete institutional places
 * — not “warn a village about a rock.”
 */

/** @type {Record<string, object[]>} */
export const SCENARIO_ANGLE_PACKS = {
  asteroid: [
    {
      places: ["Planetary Defense Coordination Cell", "Near-Earth Object Desk", "Impact Task Force HQ"],
      title: "A civilization-class rock on a short clock",
      scene:
        "Survey data just tightened: a multi-kilometer near-Earth object has a non-zero impact probability within decades — dinosaur-killer class energy if it hits. {place} must fuse detection confidence, public truth-telling, and deflection options (kinetic, nuclear last resort, civil defense) without panic theater. This is not a village siren problem; it is whether humanity can act as one species on a rock that does not care about borders.",
      stakeholder: "Dr. Vale, planetary defense science lead",
      pressureKeys: ["ImpactRisk", "Time", "Coordination"],
      suggested: ["space", "ai", "computing", "networks", "nuclear", "drones", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Deep Survey Array Consortium", "Southern Hemisphere Sky Net", "Lunar Gateway Watch"],
      title: "Blind spots in the sky census",
      scene:
        "Most of the sky that could hide a long-period extinction-class body is still poorly sampled. {place} has budget for sensors and computing, but nations argue who owns the data and who cries wolf. Invent a detection + trust architecture that finds dinosaur-scale threats early enough for deflection, not just local sirens after the trajectory is fixed.",
      stakeholder: "Cmdr. Okada, survey operations",
      pressureKeys: ["Blindspots", "FalseAlarms", "Trust"],
      suggested: ["space", "ai", "computing", "networks", "quantum", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Deflection Decision Room", "Launch Authority Board", "Treaty Table Six"],
      title: "Years to impact, no agreed deflection",
      scene:
        "Models converge: a city-to-continent killing strike is avoidable only if a deflection mission launches soon. {place} faces engineering risk, dual-use nuclear politics, and liability if deflection fails. Design the decision, verification, and mission stack so action is possible before the window closes.",
      stakeholder: "Ambassador Rhee, space security envoy",
      pressureKeys: ["MissionRisk", "Politics", "Deadline"],
      suggested: ["space", "nuclear", "ai", "crypto", "networks", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Megacity Coast Alliance", "Impact Tsunami Desk", "Global Shelter Grid"],
      title: "If deflection fails, civilization still needs a plan",
      scene:
        "Even a miss or ocean impact can send mega-tsunamis and climate shocks. {place} must invent layered civil defense: who moves, what stays powered, how food and order hold when ports die. Local inventing here still serves a planetary failure mode — not a single village flood drill.",
      stakeholder: "General Santos, civil contingency lead",
      pressureKeys: ["Displacement", "Supply", "Order"],
      suggested: ["networks", "ai", "drones", "solar", "battery", "print3d", "iot"],
      visionTheme: "coastal-city",
    },
  ],

  nuclear: [
    {
      places: ["Crisis Hotline Bridge", "Second-Strike Watch Floor", "P5 Duty Desk"],
      title: "Minutes to misjudgment",
      scene:
        "Early-warning sensors disagree; human decision time is measured in minutes. {place} needs verification, delay buffers, and shared confidence tools that reduce accidental launch — without pretending politics vanish.",
      stakeholder: "Col. Berg, duty officer",
      pressureKeys: ["FalseAlarm", "Time", "Escalation"],
      suggested: ["ai", "networks", "computing", "space", "quantum-internet", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Border Early-Warning Pair", "Shared Radar Corridor", "Neutral Monitor Post"],
      title: "Two rivals, one ambiguous track",
      scene:
        "Adversaries share a sky of ambiguous tracks. {place} must invent mutual visibility or third-party verification that makes a first strike less “rational” under stress.",
      stakeholder: "Liaison team (both sides)",
      pressureKeys: ["Opacity", "Trust", "HairTrigger"],
      suggested: ["space", "ai", "networks", "crypto", "computing", "quantum"],
      visionTheme: "social-city",
    },
    {
      places: ["Arsenal Modernization Board", "C3 Upgrade Wing", "Legacy Silo Command"],
      title: "Modernize without hair-triggers",
      scene:
        "Aging command systems are being replaced under budget pressure. {place} risks shipping faster launch authority by accident. Invent safer C3 that cuts accidental war risk while still deterring attack.",
      stakeholder: "Eng. Mora, C3 architect",
      pressureKeys: ["Fragility", "Speed", "Safety"],
      suggested: ["computing", "ai", "networks", "quantum-internet", "iot"],
      visionTheme: "energy-city",
    },
    {
      places: ["Blackout Capital", "Grid Collapse Zone", "Dark City Command"],
      title: "Nuclear winter is abstract — blackout is not",
      scene:
        "Even a limited exchange would collapse grids and logistics. {place} invents resilience for food, water, and order under multi-week darkness — a local face of nuclear catastrophe planning.",
      stakeholder: "Mayor's continuity cell",
      pressureKeys: ["Power", "Food", "Order"],
      suggested: ["solar", "battery", "networks", "ai", "drones", "print3d"],
      visionTheme: "rebuild-city",
    },
  ],

  "rogue-si": [
    {
      places: ["Metro Benefits Office", "Claims Automation Floor", "Welfare Black Box"],
      title: "The benefits AI nobody can question",
      scene:
        "City hall wants an opaque model to decide benefits *this year*. Caseworkers are already overruled. Prevention means governable AI that still works under budget pressure — not a sci-fi ban on tools.",
      stakeholder: "Len, casework supervisor",
      pressureKeys: ["Opacity", "Harm", "Protest"],
      suggested: ["ai", "computing", "networks", "crypto", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["National Model Lab", "Frontier Training Cluster", "Alignment Red Team"],
      title: "Capability races ahead of control",
      scene:
        "Labs race larger models while evaluation lags. {place} must invent evaluation, kill-switch culture, and deploy gates that scale with capability — before a runaway system is someone else's problem.",
      stakeholder: "Dr. Ng, eval lead",
      pressureKeys: ["Capability", "EvalGap", "Race"],
      suggested: ["ai", "computing", "networks", "crypto", "quantum"],
      visionTheme: "social-city",
    },
    {
      places: ["Hospital Autopilot Ward", "Clinical Copilot Desk", "Triage Model Room"],
      title: "When the model outranks the clinician",
      scene:
        "A clinical AI is quietly becoming the real decision-maker. Liability is fuzzy; patients sense it. Invent oversight and human authority that still uses the tool's speed.",
      stakeholder: "Dr. Santos, chief of staff",
      pressureKeys: ["Safety", "Liability", "Trust"],
      suggested: ["ai", "networks", "iot", "gene-sequencing", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["City Traffic Brain", "Autonomous Fleet HQ", "Infrastructure OS"],
      title: "One stack runs the city",
      scene:
        "Traffic, power, and emergency dispatch share one learning stack. A bad update could cascade. Design compartmentalization and recovery for a city that already depends on the machine.",
      stakeholder: "Amira, city CTO",
      pressureKeys: ["Cascade", "Control", "Uptime"],
      suggested: ["ai", "iot", "networks", "self-driving", "computing", "crypto"],
      visionTheme: "rebuild-city",
    },
  ],

  "chem-bio": [
    {
      places: ["Biosecurity Hot Lab", "Pathogen Watch Node", "Dual-Use Review Board"],
      title: "Dual-use research at city speed",
      scene:
        "A regional lab can sequence and synthesize faster than review committees meet. {place} needs detection, access control, and response that match real biotech capability — without shutting honest science.",
      stakeholder: "Dr. Okonkwo, biosafety lead",
      pressureKeys: ["DualUse", "Detection", "Trust"],
      suggested: ["gene-sequencing", "synbio", "ai", "networks", "iot", "nano"],
      visionTheme: "care-city",
    },
    {
      places: ["Port Bio-Screen", "Airport Grey Zone", "Border Sample Desk"],
      title: "Something wrong in the samples",
      scene:
        "Anomalous pathogen signatures appear in routine screens. Panic vs silence is a political trap. Invent rapid characterization and communication that keeps trade and truth both alive.",
      stakeholder: "Cmdr. Hale, port health",
      pressureKeys: ["Unknown", "Trade", "Fear"],
      suggested: ["gene-sequencing", "ai", "drones", "networks", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Open Science Co-op", "Garage Bio Club", "Community Lab Hub"],
      title: "Democratized biotech, weak norms",
      scene:
        "Community labs lower barriers. Most work is good; one bad actor is enough. Design norms, monitoring, and education that scale with access.",
      stakeholder: "Rina, community lab steward",
      pressureKeys: ["Access", "Misuse", "Norms"],
      suggested: ["synbio", "gene-sequencing", "ai", "crypto", "networks"],
      visionTheme: "learn-city",
    },
    {
      places: ["City Medical Stockpile", "MCM Distribution Hub", "Hospital Surge Wing"],
      title: "Countermeasures that never arrive",
      scene:
        "After a scare, countermeasures are stuck in politics and cold-chain. Invent local production, targeting, and fair distribution that works under fear.",
      stakeholder: "Public health director",
      pressureKeys: ["Stockpile", "Equity", "Time"],
      suggested: ["synbio", "print3d", "drones", "solar", "ai", "networks"],
      visionTheme: "care-city",
    },
  ],

  genocide: [
    {
      places: ["Early Warning Cell", "Satellite Atrocity Desk", "Witness Network HQ"],
      title: "Signals before the headlines",
      scene:
        "Displacement, hate radio, and night convoy patterns precede mass killing. {place} sees pieces; no one owns the whole picture. Invent fusion and escalation paths that force response before mass graves.",
      stakeholder: "Analyst Kade, early warning",
      pressureKeys: ["Blindspots", "Denial", "Time"],
      suggested: ["space", "ai", "networks", "drones", "iot", "crypto"],
      visionTheme: "social-city",
    },
    {
      places: ["Border Refuge Corridor", "Safe Passage Desk", "Cross-border Clinic"],
      title: "Escape routes that close at night",
      scene:
        "Civilians need verified safe corridors while armed groups shift. Logistics, trust, and proof of protection must work in hours, not conferences.",
      stakeholder: "Nadia, corridor coordinator",
      pressureKeys: ["Access", "Violence", "Trust"],
      suggested: ["drones", "networks", "ai", "iot", "solar", "space"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Hate Media Monitor", "Local Radio League", "Messaging War Room"],
      title: "Incitement scales faster than law",
      scene:
        "Incitement spreads on cheap networks. Takedowns lag; censorship claims poison trust. Invent counter-speech and verification that protect targets without becoming a propaganda tool.",
      stakeholder: "Journalist collective",
      pressureKeys: ["Incitement", "Trust", "Speed"],
      suggested: ["ai", "networks", "crypto", "computing", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Evidence Vault", "War-Crimes Archive", "Witness Protection Node"],
      title: "Proof that survives power cuts",
      scene:
        "Evidence is destroyed as fast as it is collected. Design resilient documentation and chain-of-custody so justice is possible later — and deterrence is credible now.",
      stakeholder: "Legal investigator",
      pressureKeys: ["Evidence", "Safety", "Impunity"],
      suggested: ["crypto", "networks", "space", "ai", "drones", "iot"],
      visionTheme: "social-city",
    },
  ],

  climate: [
    {
      places: ["Portside Ward", "Delta Flats", "Harbor Row"],
      title: "{place} floods again",
      scene:
        "The school gym in {place} is the emergency shelter for the third time this decade. Fishers lose weeks when the quay goes under. Residents want something that works *here*, not a national slogan.",
      stakeholder: "Aisha, ward climate liaison",
      pressureKeys: ["Floods", "Livelihoods", "Trust"],
      suggested: ["iot", "solar", "battery", "drones", "ai", "materials", "networks"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Roofblock District", "Kiln Street", "Old Foundry"],
      title: "Heat island nights in {place}",
      scene:
        "Night temperatures in {place} stay above safe sleep thresholds. Elderly residents fill the clinic each heat wave. Shade, power for cooling, and early warning all fail at once.",
      stakeholder: "Dr. Imani, night clinic",
      pressureKeys: ["Heat", "Health", "Power"],
      suggested: ["iot", "solar", "battery", "materials", "ai", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Saltmarsh Co-op", "Lowland Farms", "Silt Parish"],
      title: "Saltwater takes the fields near {place}",
      scene:
        "Fields near {place} go saline after storm surges. Crop insurance is a rumor. Farmers need water, soil, and income options that fit this coast.",
      stakeholder: "Rafi, co-op chair",
      pressureKeys: ["Salinity", "Income", "Food"],
      suggested: ["synbio", "iot", "solar", "alt-proteins", "ai", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["Bridge End", "Levee Town", "Canal Quarter"],
      title: "Insurance retreats from {place}",
      scene:
        "Insurers redraw maps and drop {place}. Mortgages freeze. People still live here. A local fix must cut risk and keep trust without waiting for capital markets.",
      stakeholder: "Nina, housing clerk",
      pressureKeys: ["Risk", "Housing", "Trust"],
      suggested: ["iot", "ai", "materials", "networks", "drones", "crypto"],
      visionTheme: "coastal-city",
    },
  ],

  weather: [
    {
      places: ["Tornado Alley Town", "Siren Gap County", "Flatland Grid"],
      title: "Warnings arrive after the roof",
      scene:
        "Severe storms outrun the siren network in {place}. Cell coverage dies first. Invent hyperlocal warning and shelter logistics that work when towers fall.",
      stakeholder: "Sheriff's emergency desk",
      pressureKeys: ["LeadTime", "Shelter", "Power"],
      suggested: ["iot", "networks", "drones", "solar", "battery", "ai", "space"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Monsoon City", "Drain Bottleneck", "Sump Ward"],
      title: "One hour of rain, three days under",
      scene:
        "Cloudbursts overwhelm drains in {place}. Pump crews can't be everywhere. Sensors, pumps, and public guidance must act as one system.",
      stakeholder: "Public works chief",
      pressureKeys: ["Floods", "Mobility", "Disease"],
      suggested: ["iot", "ai", "drones", "robots", "networks", "materials"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Wildfire Edge", "Smoke Valley", "Ember Line"],
      title: "Embers jump the firebreak",
      scene:
        "Winds drive fire into the wildland-urban interface of {place}. Evacuation roads choke. Detection, power shutoff, and air quality care collide.",
      stakeholder: "CalFire liaison (local)",
      pressureKeys: ["Fire", "Air", "Evacuation"],
      suggested: ["drones", "iot", "ai", "space", "networks", "solar"],
      visionTheme: "energy-city",
    },
    {
      places: ["Drought Basin", "Dust Bowl Co-op", "Empty Reservoir"],
      title: "The reservoir is a mud ring",
      scene:
        "Multi-year drought empties storage for {place}. Water fights replace planning. Efficiency, reuse, and fair allocation need inventing under pressure.",
      stakeholder: "Basin water board",
      pressureKeys: ["Thirst", "Conflict", "Crops"],
      suggested: ["iot", "solar", "ai", "synbio", "networks", "drones"],
      visionTheme: "food-city",
    },
  ],

  water: [
    {
      places: ["Harran Wells", "Dust Spring", "Old Cistern"],
      title: "The well turned saline at {place}",
      scene:
        "The main well at {place} is brackish. Tanker prices spike every dry month. Kids miss school to haul water. A fix must be affordable and maintainable locally.",
      stakeholder: "Yusuf, co-op well keeper",
      pressureKeys: ["Thirst", "Cost", "Health"],
      suggested: ["solar", "battery", "materials", "nano", "iot", "ai", "print3d"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Pipe End Estate", "North Reservoir", "Hilltank"],
      title: "Night rationing in {place}",
      scene:
        "Municipal pipes to {place} only flow before dawn. Households queue with jerrycans. Theft and leaks eat half the volume. Measurement and fairness matter as much as new supply.",
      stakeholder: "Sana, water board tech",
      pressureKeys: ["Access", "Leaks", "Fairness"],
      suggested: ["iot", "networks", "ai", "solar", "materials", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Schoolyard Tap", "Clinic Bore", "Market Fountain"],
      title: "Unsafe taps at {place}",
      scene:
        "Coliform alerts keep returning at {place}. Boiling fuel is expensive. Parents need trusted tests and a treatment path that works without a full utility rebuild.",
      stakeholder: "Mina, parent committee",
      pressureKeys: ["Contamination", "Health", "Cost"],
      suggested: ["iot", "nano", "materials", "solar", "ai", "networks"],
      visionTheme: "care-city",
    },
    {
      places: ["Irrigation Circle", "Canal Bend", "Orchard Strip"],
      title: "Upstream takes first cut near {place}",
      scene:
        "Farms upstream of {place} take water before the village share arrives. Conflict rises each dry season. Coordination and proof of use are the invention, not just a pump.",
      stakeholder: "The canal users’ council",
      pressureKeys: ["Share", "Conflict", "Crops"],
      suggested: ["iot", "crypto", "networks", "ai", "drones", "solar"],
      visionTheme: "food-city",
    },
  ],

  infectious: [
    {
      places: ["Crossing Clinic 7", "Border Post B", "Transit Bay"],
      title: "Fever cluster at {place}",
      scene:
        "Staff at {place} see a new fever pattern among travelers. They are three nurses deep. Detection, logistics, and trust — this week, not after a conference.",
      stakeholder: "Dr. Okonkwo, clinic lead",
      pressureKeys: ["Outbreak", "Capacity", "Fear"],
      suggested: ["gene-sequencing", "ai", "networks", "drones", "iot", "synbio"],
      visionTheme: "care-city",
    },
    {
      places: ["Market Ward", "Night Bazaar", "Dock Markets"],
      title: "Rumor outruns results in {place}",
      scene:
        "A suspected outbreak rumor empties {place}'s market. Lab results take days. Vendors lose income; fear spreads faster than facts.",
      stakeholder: "Hana, market association",
      pressureKeys: ["Rumor", "Trade", "Trust"],
      suggested: ["gene-sequencing", "ai", "networks", "iot", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["School Cluster", "Dorm Block", "Campus Edge"],
      title: "Classrooms empty after two cases near {place}",
      scene:
        "Two confirmed cases near {place} close three schools. Contact tracing is paper and phone trees. Keep kids learning without fueling panic.",
      stakeholder: "Principal Ade",
      pressureKeys: ["Spread", "Learning", "Fear"],
      suggested: ["ai", "networks", "iot", "gene-sequencing", "vr"],
      visionTheme: "learn-city",
    },
    {
      places: ["Cold-chain Depot", "Vaccine Shed", "Last-mile Hub"],
      title: "Vaccines warm at {place}",
      scene:
        "Power blips at {place} spoil a vaccine shipment. Cold-chain reliability and rapid redistribution are on the line.",
      stakeholder: "Kofi, logistics nurse",
      pressureKeys: ["ColdChain", "Doses", "Trust"],
      suggested: ["solar", "battery", "iot", "drones", "networks", "ai"],
      visionTheme: "energy-city",
    },
  ],

  education: [
    {
      places: ["Ridge County", "Three Hills", "River Schools"],
      title: "One science teacher, three schools in {place}",
      scene:
        "Three rural schools in {place} share one science teacher who drives 90 minutes between them. Labs sit empty half the week.",
      stakeholder: "Ms. Reyes, shared science teacher",
      pressureKeys: ["Learning", "Burnout", "Equity"],
      suggested: ["ai", "vr", "networks", "solar", "computing", "robots"],
      visionTheme: "learn-city",
    },
    {
      places: ["Shift Town", "Mill District", "Nightshift Ward"],
      title: "Homework after the factory whistle in {place}",
      scene:
        "Teens in {place} work evening shifts. Day school assumes free evenings. Learning has to fit real schedules and weak home connectivity.",
      stakeholder: "Omar, youth mentor",
      pressureKeys: ["Attendance", "Skills", "Access"],
      suggested: ["ai", "networks", "vr", "solar", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Language Block", "Newcomer School", "Welcome Campus"],
      title: "Twelve home languages in one classroom at {place}",
      scene:
        "A classroom at {place} has twelve home languages and two teachers. Tools must help without erasing culture or teachers.",
      stakeholder: "Ms. Patel, lead teacher",
      pressureKeys: ["Language", "Equity", "Burnout"],
      suggested: ["ai", "vr", "networks", "computing", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Lab-less High", "Tool Shed School", "Workshop Annex"],
      title: "No working lab in {place}",
      scene:
        "The only secondary school in {place} has broken equipment and no consumables. Students memorize diagrams.",
      stakeholder: "Coach Lin, STEM club",
      pressureKeys: ["Practice", "Materials", "Equity"],
      suggested: ["print3d", "vr", "robots", "networks", "ai", "solar"],
      visionTheme: "learn-city",
    },
  ],

  poverty: [
    {
      places: ["Cashless Fringe", "No-ID Quarter", "Informal Strip"],
      title: "No ID, no pay rail in {place}",
      scene:
        "Workers in {place} earn cash but can't open accounts or prove identity. Predatory lenders fill the gap. Invent inclusive rails that don't create new exclusion.",
      stakeholder: "Micro-vendor cooperative",
      pressureKeys: ["Access", "Debt", "Dignity"],
      suggested: ["crypto", "networks", "ai", "iot", "solar", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Job Queue Ward", "Day-Labor Gate", "Skills Desert"],
      title: "Work exists; matches don't in {place}",
      scene:
        "Employers need hands; people need work. Information is gossip. Design matching, transport, and childcare that unlock real income this month.",
      stakeholder: "Labor organizer",
      pressureKeys: ["Jobs", "Info", "Care"],
      suggested: ["ai", "networks", "transportation", "solar", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Fee Trap Clinic", "Paperwork Maze", "Benefit Cliff"],
      title: "Benefits that cost more to claim",
      scene:
        "Eligible families in {place} skip benefits because paperwork and travel cost more than the aid. Reduce friction without fraud theater that harms the poor.",
      stakeholder: "Social worker unit",
      pressureKeys: ["Friction", "Hunger", "Trust"],
      suggested: ["ai", "networks", "iot", "crypto", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Energy-Poor Block", "Dark Staircase", "Candle Floor"],
      title: "Poverty is also watts in {place}",
      scene:
        "Households ration kerosene and phone charge. Kids study by phone light. First reliable watts change learning and safety tonight.",
      stakeholder: "Tenant association",
      pressureKeys: ["Power", "Cost", "Safety"],
      suggested: ["solar", "battery", "iot", "print3d", "materials"],
      visionTheme: "energy-city",
    },
  ],

  slavery: [
    {
      places: ["Port Container Yard", "Export Processing Zone", "Night Shift Dorm"],
      title: "Forced overtime behind the fence",
      scene:
        "Workers in {place} surrender passports and sleep in locked dorms. Audits are theater. Invent detection and worker-voice systems that survive retaliation.",
      stakeholder: "Labor inspector (burned out)",
      pressureKeys: ["Coercion", "Opacity", "Retaliation"],
      suggested: ["iot", "ai", "networks", "crypto", "drones", "space"],
      visionTheme: "social-city",
    },
    {
      places: ["Seafood Supply Chain", "Ice Dock", "Broker Alley"],
      title: "Debt bondage on the boats",
      scene:
        "Crews are trapped by recruitment debt. Product reaches rich markets clean-looking. Traceability must be real enough to cut the debt trap.",
      stakeholder: "Former crew advocate",
      pressureKeys: ["Debt", "Trace", "Violence"],
      suggested: ["iot", "crypto", "networks", "ai", "drones", "space"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Domestic Work Corridor", "App-Booked Homes", "Agency Row"],
      title: "Invisible workers, private doors",
      scene:
        "Domestic workers in {place} disappear into private homes. Abuse is hard to report. Design safety nets that respect privacy and still stop trafficking.",
      stakeholder: "Migrant workers' union",
      pressureKeys: ["Isolation", "Abuse", "Voice"],
      suggested: ["networks", "ai", "crypto", "iot", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Construction Mega-Site", "Camp City", "Contractor Nest"],
      title: "Wage theft as default",
      scene:
        "Subcontracting hides who owes wages. Workers strike, then starve. Proof of hours and payment rails must be enforceable on-site.",
      stakeholder: "Site steward",
      pressureKeys: ["WageTheft", "Opacity", "Safety"],
      suggested: ["crypto", "iot", "ai", "networks", "drones"],
      visionTheme: "rebuild-city",
    },
  ],

  women: [
    {
      places: ["Night Bus Corridor", "Shift Change Gate", "Dark Walk Home"],
      title: "Safety ends at the factory gate",
      scene:
        "Women workers in {place} face harassment on the last kilometer home. Policing is thin; cameras alone aren't safety. Invent mobility and community response that works at 2 a.m.",
      stakeholder: "Workers' safety collective",
      pressureKeys: ["Safety", "Mobility", "Reporting"],
      suggested: ["iot", "networks", "ai", "self-driving", "drones", "solar"],
      visionTheme: "social-city",
    },
    {
      places: ["Land Title Office", "Inheritance Desk", "Co-op Shares Hall"],
      title: "Rights on paper, not in practice",
      scene:
        "Inheritance and land rights for women exist in law but not in queues at {place}. Design proof, advocacy, and economic tools that make rights real.",
      stakeholder: "Legal aid clinic",
      pressureKeys: ["Rights", "Access", "Retaliation"],
      suggested: ["crypto", "networks", "ai", "iot", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Clinic After Hours", "Contraception Desert", "Postpartum Gap"],
      title: "Care that closes at 4 p.m.",
      scene:
        "Reproductive and postpartum care in {place} is hours and stigma away. Invent access that is private, local, and clinically sound.",
      stakeholder: "Nurse-midwife network",
      pressureKeys: ["Access", "Stigma", "Health"],
      suggested: ["networks", "ai", "drones", "solar", "iot", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Girls' STEM Lab", "Secondary School Gate", "Scholarship Desk"],
      title: "Talent exits at puberty",
      scene:
        "Girls in {place} outperform early, then drop when schools are far or unsafe. Keep learning paths open without ignoring household economics.",
      stakeholder: "Head teacher",
      pressureKeys: ["Dropout", "Safety", "Equity"],
      suggested: ["ai", "vr", "networks", "solar", "transportation"],
      visionTheme: "learn-city",
    },
  ],

  mideast: [
    {
      places: ["Ceasefire Market Town", "Shared Water Point", "Divided Checkpoint"],
      title: "Peace is a water truck schedule",
      scene:
        "In {place}, rival communities share a fragile ceasefire and one failing water source. Invent logistics and verification that make cooperation pay better than sniping infrastructure.",
      stakeholder: "Municipal peace committee",
      pressureKeys: ["Violence", "Water", "Trust"],
      suggested: ["iot", "solar", "networks", "drones", "ai", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Trauma Clinic Corridor", "Returnee Block", "Rubble School"],
      title: "After the blast, the paperwork",
      scene:
        "Families return to damaged housing in {place}. PTSD, jobs, and debris collide. Design recovery that restores dignity, not just concrete.",
      stakeholder: "Field psychologist + engineer pair",
      pressureKeys: ["Trauma", "Shelter", "Jobs"],
      suggested: ["print3d", "robots", "ai", "solar", "networks", "vr"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Cross-border Clinic", "Neutral Medical Hub", "Aid Convoy Desk"],
      title: "Medicine as a rare ceasefire",
      scene:
        "Medical corridors open and close with politics. Invent routing, cold-chain, and trust tokens that keep care moving when radio chatter turns hostile.",
      stakeholder: "Red Crescent logistics",
      pressureKeys: ["Access", "Delay", "Safety"],
      suggested: ["drones", "networks", "solar", "ai", "iot", "space"],
      visionTheme: "care-city",
    },
    {
      places: ["Youth Job Circle", "Demobilization Yard", "Skills Tent"],
      title: "Guns pay better than apprenticeships",
      scene:
        "Young people in {place} face recruitment by armed groups when legal work is scarce. Create credible income and belonging paths that compete with the gun economy.",
      stakeholder: "Youth cooperative",
      pressureKeys: ["Jobs", "Recruitment", "Hope"],
      suggested: ["ai", "vr", "print3d", "solar", "networks", "robots"],
      visionTheme: "social-city",
    },
  ],

  automation: [
    {
      places: ["Canal Logistics Park", "Night Sort Hub", "Robot Aisle 12"],
      title: "The night shift disappeared",
      scene:
        "Warehouse automation cut 30% of shifts in eighteen months. Rent didn't fall. Workers want retraining that leads to real pay — not a pamphlet.",
      stakeholder: "Dev, shift steward",
      pressureKeys: ["Jobs", "Skills", "Dignity"],
      suggested: ["ai", "robots", "vr", "networks", "crypto", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Call Center City", "Voice Bot Floor", "Support Tier 0"],
      title: "Support jobs hollow out overnight",
      scene:
        "Language models replaced tier-1 support in {place}. Mortgages remain. Invent transition income and new skilled roles that use human judgment.",
      stakeholder: "Union chapter lead",
      pressureKeys: ["Displacement", "Debt", "Skills"],
      suggested: ["ai", "vr", "networks", "crypto", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Driver Depot", "Autonomous Corridor", "Fare Protest Lot"],
      title: "Wheels without wages",
      scene:
        "Autonomous fleets threaten taxi and truck livelihoods in {place}. Design transition that keeps mobility and doesn't throw drivers into crisis.",
      stakeholder: "Drivers' association",
      pressureKeys: ["Jobs", "Mobility", "Protest"],
      suggested: ["self-driving", "ai", "networks", "crypto", "iot"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["UBI Pilot Town", "Means-Test Maze", "Cash-plus Clinic"],
      title: "Cash arrives; meaning doesn't",
      scene:
        "A basic income pilot in {place} cuts extreme poverty but isolation and purpose crises rise. Invent complementary systems — work, care, learning — that cash alone can't buy.",
      stakeholder: "Pilot evaluation team",
      pressureKeys: ["Poverty", "Isolation", "Purpose"],
      suggested: ["ai", "networks", "vr", "crypto", "iot", "robots"],
      visionTheme: "social-city",
    },
  ],

  refugees: [
    {
      places: ["Northgate City", "Winter Gym Network", "Reception Pier"],
      title: "Four thousand arrivals, one winter",
      scene:
        "A mid-size city expects 4,000 new arrivals before spring. Gyms are full. Paperwork is chaos. Dignity has a deadline.",
      stakeholder: "Marta, reception coordinator",
      pressureKeys: ["Shelter", "Services", "Tension"],
      suggested: ["print3d", "drones", "solar", "networks", "ai", "iot", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Border Camp Delta", "Tent City B", "Mud Season Camp"],
      title: "Mud, disease, and missing lists",
      scene:
        "A camp at {place} floods every rain. Family reunification is paper notebooks. Water, power, and identity systems must work this season.",
      stakeholder: "Camp manager",
      pressureKeys: ["Health", "Shelter", "Identity"],
      suggested: ["solar", "battery", "iot", "networks", "drones", "ai"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Language Intake School", "Credential Black Hole", "Skills Tent"],
      title: "Engineers washing dishes",
      scene:
        "Skilled arrivals in {place} can't practice. Credential recognition is glacial. Unlock work without fake degrees or exploitation.",
      stakeholder: "Employment liaison",
      pressureKeys: ["Work", "Credentials", "Dignity"],
      suggested: ["ai", "vr", "networks", "crypto", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Host Neighborhood", "Shared Clinic Queue", "Rumor Street"],
      title: "Hosts burn out too",
      scene:
        "Locals in {place} share clinics and schools with arrivals. Solidarity frays under rumor. Invent fairness systems that keep both communities housed and heard.",
      stakeholder: "Neighborhood council",
      pressureKeys: ["Tension", "Services", "Trust"],
      suggested: ["ai", "networks", "iot", "crypto", "solar"],
      visionTheme: "social-city",
    },
  ],

  ag: [
    {
      places: ["Dust Co-op", "Monocrop Plain", "Soil Clinic Farm"],
      title: "Soil dies under the yield race",
      scene:
        "Farms around {place} chase yield until soil collapses. Inputs cost more than harvest. Invent regenerative systems that pay this season and next decade.",
      stakeholder: "Co-op agronomist",
      pressureKeys: ["Soil", "Debt", "Yield"],
      suggested: ["synbio", "iot", "drones", "ai", "solar", "alt-proteins"],
      visionTheme: "food-city",
    },
    {
      places: ["Pesticide Drift Zone", "Bee Gap Orchards", "Spray Map Dispute"],
      title: "Neighbors poison each other's crops",
      scene:
        "Drift and timing wars hit orchards near {place}. Monitoring and alternatives must reduce harm without bankrupting smallholders.",
      stakeholder: "Orchard association",
      pressureKeys: ["Toxics", "Conflict", "Pollinators"],
      suggested: ["drones", "iot", "ai", "synbio", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Post-harvest Loss Hub", "Spoiled Silo", "Market Distance"],
      title: "Grown then wasted",
      scene:
        "Crops rot between field and market around {place}. Cold chain and logistics beat more fertilizer. Invent loss reduction that small farmers can run.",
      stakeholder: "Cold-chain co-op",
      pressureKeys: ["Waste", "Income", "Power"],
      suggested: ["solar", "battery", "iot", "drones", "ai", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Water-Stress Basin", "Flood-or-Drought Fields", "Canal Lottery"],
      title: "Climate broke the planting calendar",
      scene:
        "Rains no longer match seed advice in {place}. Farmers need forecasts, varieties, and insurance-like tools that fit their risk — not generic apps.",
      stakeholder: "Extension officer",
      pressureKeys: ["Climate", "Water", "Debt"],
      suggested: ["ai", "iot", "space", "synbio", "networks", "drones"],
      visionTheme: "food-city",
    },
  ],

  food: [
    {
      places: ["Mile-Long Block", "Food Desert Row", "Two-Bus Market"],
      title: "The last greengrocer closed",
      scene:
        "A dense neighborhood's last fresh-food shop closed. Corner stores sell calories, not vegetables. Transit to a supermarket is two buses.",
      stakeholder: "Elena, community kitchen",
      pressureKeys: ["Nutrition", "Price", "Access"],
      suggested: ["alt-proteins", "drones", "ai", "iot", "transportation", "synbio", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Price Spike Market", "Import Wharf", "Bread Queue"],
      title: "Staple prices double overnight",
      scene:
        "Global shock hits {place}'s staples. Hoarding starts. Design local buffers and fair allocation that prevent riot-and-ration cycles.",
      stakeholder: "Market authority",
      pressureKeys: ["Price", "Hoarding", "Hunger"],
      suggested: ["ai", "networks", "alt-proteins", "iot", "crypto", "drones"],
      visionTheme: "food-city",
    },
    {
      places: ["School Meal Kitchen", "Empty Pantry", "Holiday Gap"],
      title: "Kids' only meal disappears on break",
      scene:
        "School meals are the reliable calories for many kids in {place}. Holidays mean hunger. Invent continuity without stigmatizing families.",
      stakeholder: "School nutrition lead",
      pressureKeys: ["Hunger", "Stigma", "Logistics"],
      suggested: ["ai", "drones", "networks", "alt-proteins", "iot", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Urban Farm Roof", "Contaminated Plot", "Allotment Waitlist"],
      title: "Grow local — if the soil is safe",
      scene:
        "Community wants urban production in {place}, but soil tests scare everyone. Safe growing and distribution must be designed together.",
      stakeholder: "Urban ag collective",
      pressureKeys: ["Safety", "Access", "Trust"],
      suggested: ["synbio", "iot", "nano", "ai", "solar", "print3d"],
      visionTheme: "food-city",
    },
  ],

  eco: [
    {
      places: ["Kelp Harbor", "Empty Nets Quay", "Night Poaching Line"],
      title: "Empty nets, angry quay",
      scene:
        "Fish stocks collapsed locally at {place}. Some boats still cheat night limits. Monitoring and alternatives have to work for this harbor.",
      stakeholder: "Captain Seo",
      pressureKeys: ["Stocks", "Income", "Conflict"],
      suggested: ["drones", "iot", "ai", "space", "synbio", "alt-proteins"],
      visionTheme: "ocean-city",
    },
    {
      places: ["Forest Frontier", "Illegal Road Head", "Ranger Station 3"],
      title: "Trees fall faster than permits",
      scene:
        "Illegal logging roads open overnight near {place}. Rangers are outnumbered. Detection and economic alternatives must beat the chainsaw economy.",
      stakeholder: "Ranger unit",
      pressureKeys: ["Deforestation", "Crime", "Livelihoods"],
      suggested: ["space", "drones", "ai", "iot", "networks", "crypto"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Pollinator Collapse Farms", "Silent Orchard", "Hive Loss Co-op"],
      title: "Spring without bees",
      scene:
        "Pollinator collapse hits orchards around {place}. Yields crash. Invent monitoring, habitat, and farm practice changes that scale beyond a poster campaign.",
      stakeholder: "Orchard co-op",
      pressureKeys: ["Pollinators", "Yield", "Chemicals"],
      suggested: ["iot", "drones", "ai", "synbio", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["River Dead Zone", "Factory Outfall", "Fish Kill Bend"],
      title: "The river smells like solvent",
      scene:
        "Industrial discharge kills a stretch of river by {place}. Blame is murky; kids still play downstream. Proof, enforcement, and cleanup need inventing together.",
      stakeholder: "River basin council",
      pressureKeys: ["Pollution", "Health", "Accountability"],
      suggested: ["iot", "drones", "ai", "nano", "networks", "materials"],
      visionTheme: "coastal-city",
    },
  ],

  cancer: [
    {
      places: ["Regional Oncology Hub", "Scan Backlog Wing", "Rural Referral Desk"],
      title: "Scan wait times hit nine months",
      scene:
        "Imaging backlog means late diagnoses around {place}. Rural patients miss appointments. Find risk earlier without inventing a miracle drug overnight.",
      stakeholder: "Dr. Chen, oncology lead",
      pressureKeys: ["Wait", "LateStage", "Equity"],
      suggested: ["ai", "gene-sequencing", "networks", "nano", "computing", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Chemo Day Unit", "Transport Gap", "Side-Effect Hotline"],
      title: "Treatment fails the commute",
      scene:
        "Patients abandon chemo because transport and side-effect support fail in {place}. Invent care logistics that keep people on protocol.",
      stakeholder: "Oncology nurse navigator",
      pressureKeys: ["Adherence", "Access", "Support"],
      suggested: ["networks", "ai", "drones", "transportation", "iot", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Genomic Pilot Lab", "Consent Maze", "Data Trust Desk"],
      title: "Genomics without trust",
      scene:
        "A genomics pilot could personalize therapy, but communities fear data misuse. Design consent, benefit-sharing, and clinical use that earns participation.",
      stakeholder: "Community ethics board",
      pressureKeys: ["Trust", "Access", "Privacy"],
      suggested: ["gene-sequencing", "ai", "crypto", "networks", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Palliative Shortage", "Pain Med Gate", "Home Care Desert"],
      title: "Cure talk, no comfort",
      scene:
        "Even when cure fails, comfort care is scarce in {place}. Invent dignified symptom management and home support that isn't an afterthought.",
      stakeholder: "Palliative care lead",
      pressureKeys: ["Pain", "HomeCare", "Dignity"],
      suggested: ["ai", "iot", "networks", "robots", "drones", "vr"],
      visionTheme: "care-city",
    },
  ],

  mental: [
    {
      places: ["Crisis Line Overflow", "ER Psych Boarding", "48-Hour Wait"],
      title: "The crisis line never hangs up",
      scene:
        "Crisis volume in {place} overflows into ER boarding. People wait days for a bed. Invent triage and community response that reduces harm without empty apps.",
      stakeholder: "Crisis team lead",
      pressureKeys: ["Wait", "Harm", "Capacity"],
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Youth Silent Cohort", "School Counselor One", "Social Feed Spiral"],
      title: "Teens disappear into the feed",
      scene:
        "Youth distress spikes in {place}; one counselor covers three schools. Design support that meets kids where they are without surveillance theater.",
      stakeholder: "School counselor network",
      pressureKeys: ["Isolation", "Access", "Stigma"],
      suggested: ["ai", "vr", "networks", "iot", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Worker Burnout Plant", "Always-On Shift", "Quiet Quitting Floor"],
      title: "Productivity ate the weekend",
      scene:
        "Employers in {place} face burnout disability claims. Invent workplace systems that cut load and detect risk early without punishing disclosure.",
      stakeholder: "Occupational health lead",
      pressureKeys: ["Burnout", "Disclosure", "Retention"],
      suggested: ["ai", "iot", "networks", "vr", "robots"],
      visionTheme: "social-city",
    },
    {
      places: ["Rural Tele-Psych Gap", "Bandwidth Desert", "Stigma Town"],
      title: "Nearest psychiatrist is three counties",
      scene:
        "Distance and stigma block care in {place}. Telehealth fails on bandwidth and trust. Invent hybrid care that actually gets used.",
      stakeholder: "Primary care clinic",
      pressureKeys: ["Access", "Stigma", "Continuity"],
      suggested: ["networks", "ai", "vr", "solar", "iot"],
      visionTheme: "care-city",
    },
  ],

  alzheimer: [
    {
      places: ["Cedar Day Center", "Memory Waitlist", "Family Burnout Home"],
      title: "Who watches the watchers of memory",
      scene:
        "A day center for people with dementia has a fourteen-month waitlist. Families burn out. Tools must preserve dignity — not just surveillance.",
      stakeholder: "Tomás, center director",
      pressureKeys: ["Care", "Safety", "Families"],
      suggested: ["ai", "robots", "iot", "bci", "networks", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Wandering Alert Grid", "Night Streets", "Door Sensor Block"],
      title: "Lost between home and corner store",
      scene:
        "Wandering incidents rise in {place}. Police are not clinicians. Invent community location and return systems that respect liberty.",
      stakeholder: "Community safety board",
      pressureKeys: ["Safety", "Liberty", "Response"],
      suggested: ["iot", "networks", "ai", "drones", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Diagnosis Delay Clinic", "Neuropsych Backlog", "Early Clue GP"],
      title: "Diagnosis arrives years late",
      scene:
        "Cognitive decline is noticed late in {place}. Primary care lacks tools and time. Earlier detection must connect to support, not just a label.",
      stakeholder: "GP consortium",
      pressureKeys: ["Delay", "Support", "Stigma"],
      suggested: ["ai", "bci", "networks", "gene-sequencing", "iot"],
      visionTheme: "care-city",
    },
    {
      places: ["Care Worker Shortage", "Night Aide Route", "Agency Roulette"],
      title: "No one left to hire",
      scene:
        "Home aides are scarce and underpaid around {place}. Families collapse. Invent augmentation and scheduling that help workers rather than replace care.",
      stakeholder: "Home care agency",
      pressureKeys: ["Staffing", "Quality", "Cost"],
      suggested: ["robots", "ai", "networks", "iot", "vr"],
      visionTheme: "care-city",
    },
  ],

  ageing: [
    {
      places: ["Longevity Pilot Ward", "Healthspan Lab", "Senior Co-op Tower"],
      title: "Living longer, sicker",
      scene:
        "Lifespan rises in {place} while healthy years lag. Design prevention and support systems that compress morbidity — not just add dependent years.",
      stakeholder: "Geriatrics director",
      pressureKeys: ["Healthspan", "Cost", "Independence"],
      suggested: ["ai", "gene-sequencing", "synbio", "iot", "robots", "networks"],
      visionTheme: "care-city",
    },
    {
      places: ["Isolated High-Rise", "No Elevator Block", "Silent Floor"],
      title: "Nobody knocks anymore",
      scene:
        "Older residents in {place} go days without contact. Falls go unnoticed. Invent check-in and community systems that aren't creepy surveillance.",
      stakeholder: "Building social worker",
      pressureKeys: ["Isolation", "Falls", "Trust"],
      suggested: ["iot", "ai", "networks", "robots", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Pension Cliff Town", "Fixed Income Market", "Meds or Rent"],
      title: "Meds or rent this month",
      scene:
        "Fixed incomes fail against drug and housing costs in {place}. Invent support stacks that keep people housed and treated without shame.",
      stakeholder: "Senior advocacy group",
      pressureKeys: ["Cost", "Housing", "Health"],
      suggested: ["ai", "networks", "crypto", "iot", "print3d"],
      visionTheme: "social-city",
    },
    {
      places: ["Intergenerational Hub", "Empty Playground", "Shared Kitchen"],
      title: "Ages segregated by design",
      scene:
        "Housing and services split young and old in {place}. Invent shared infrastructure that cuts loneliness and care costs together.",
      stakeholder: "Urban planner + elders council",
      pressureKeys: ["Isolation", "Care", "Space"],
      suggested: ["networks", "ai", "iot", "print3d", "solar", "vr"],
      visionTheme: "rebuild-city",
    },
  ],

  air: [
    {
      places: ["East Industrial Corridor", "Truck Route Schools", "Smog Gate"],
      title: "School days lost to smog",
      scene:
        "Asthma days close classrooms along the truck route in {place}. Parents have sensor photos; industry has lobbyists.",
      stakeholder: "Priya, parent coalition",
      pressureKeys: ["Air", "Health", "Traffic"],
      suggested: ["iot", "ai", "solar", "battery", "self-driving", "networks", "materials"],
      visionTheme: "energy-city",
    },
    {
      places: ["Cookfire District", "Indoor Smoke Homes", "Charcoal Market"],
      title: "The kitchen is the hazard",
      scene:
        "Indoor air from cooking fuels sickens women and kids in {place}. Clean alternatives must fit cost, culture, and supply chains.",
      stakeholder: "Women's energy co-op",
      pressureKeys: ["IndoorAir", "Health", "Cost"],
      suggested: ["solar", "battery", "materials", "iot", "print3d"],
      visionTheme: "energy-city",
    },
    {
      places: ["Wildfire Smoke Basin", "PurpleAir Panic", "Shelter-in-Place Week"],
      title: "Outdoor air becomes indoor fate",
      scene:
        "Regional wildfire smoke traps {place} for weeks. Filtration, power, and outdoor labor rules need inventing under orange skies.",
      stakeholder: "Public health air desk",
      pressureKeys: ["Smoke", "Power", "Work"],
      suggested: ["iot", "solar", "battery", "materials", "ai", "networks"],
      visionTheme: "energy-city",
    },
    {
      places: ["Port Idling Zone", "Ship Stack Lane", "Dockworker Lung"],
      title: "Ships idle, lungs pay",
      scene:
        "Port operations cloud {place} with particulate. Electrification and scheduling could help — if inventable under union and operator constraints.",
      stakeholder: "Port labor + city air board",
      pressureKeys: ["Particulate", "Jobs", "Trade"],
      suggested: ["battery", "solar", "iot", "ai", "self-driving", "networks"],
      visionTheme: "coastal-city",
    },
  ],

  "energy-access": [
    {
      places: ["Riverbend Health Post", "Dark Clinic", "Cold Chain Hut"],
      title: "The clinic dies at dusk",
      scene:
        "When the grid fails, vaccines warm and night births go dark at {place}. Diesel is expensive and late. First watts must stay on.",
      stakeholder: "Nurse Amara",
      pressureKeys: ["Power", "Care", "ColdChain"],
      suggested: ["solar", "battery", "iot", "networks", "print3d", "drones"],
      visionTheme: "energy-city",
    },
    {
      places: ["Study-by-Phone Village", "No-Grid School", "Charge Queue"],
      title: "Homework needs a charge",
      scene:
        "Students in {place} walk kilometers to charge phones. Learning apps are useless without power. Invent community energy that prioritizes study and clinics.",
      stakeholder: "Teacher cooperative",
      pressureKeys: ["Power", "Learning", "Equity"],
      suggested: ["solar", "battery", "networks", "ai", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Agro-processing Shed", "Diesel Mill", "Spoiled Harvest"],
      title: "No power, no value-add",
      scene:
        "Farmers near {place} can't process crops without diesel. Reliable power would raise income more than another fertilizer loan.",
      stakeholder: "Agro co-op chair",
      pressureKeys: ["Power", "Income", "Waste"],
      suggested: ["solar", "battery", "iot", "ai", "print3d"],
      visionTheme: "food-city",
    },
    {
      places: ["Mini-grid Politics", "Tariff Fight", "Blackout Ballot"],
      title: "The mini-grid that nobody pays",
      scene:
        "A mini-grid in {place} fails on tariffs and trust more than tech. Invent governance and metering that keep lights on fairly.",
      stakeholder: "Mini-grid operator",
      pressureKeys: ["Payments", "Trust", "Uptime"],
      suggested: ["iot", "crypto", "solar", "battery", "networks", "ai"],
      visionTheme: "energy-city",
    },
  ],

  homeless: [
    {
      places: ["Southbank streets", "Overpass Camp", "Winter Count Zone"],
      title: "Winter count keeps rising",
      scene:
        "Encampments grow under the overpass each winter in {place}. Hotels are full. People need warm, safe options *this* season and a path to stay housed.",
      stakeholder: "Kenji, outreach lead",
      pressureKeys: ["Shelter", "Cold", "Services"],
      suggested: ["print3d", "materials", "solar", "ai", "robots", "iot", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Shelter Overflow", "ID Barrier Desk", "Ban Policy Fight"],
      title: "Rules that exclude the coldest",
      scene:
        "Shelter rules in {place} exclude partners, pets, or storage — so people stay outside. Redesign intake that is safe and actually used.",
      stakeholder: "Shelter director",
      pressureKeys: ["Access", "Safety", "Dignity"],
      suggested: ["ai", "networks", "iot", "print3d", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Exit to Housing Gap", "Voucher Waitlist", "Landlord No"],
      title: "Voucher in hand, door closed",
      scene:
        "People leave shelters with vouchers landlords refuse in {place}. Invent matching, guarantees, and support that turn paper into keys.",
      stakeholder: "Housing navigator",
      pressureKeys: ["Housing", "Refusal", "Time"],
      suggested: ["ai", "networks", "crypto", "iot", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Medical Respite Gap", "Street Discharge", "ER Revolving"],
      title: "Discharged to the sidewalk",
      scene:
        "Hospitals discharge unsheltered patients to streets in {place}. Invent medical respite and follow-up that stop the revolving door.",
      stakeholder: "Hospital social work",
      pressureKeys: ["Health", "Shelter", "Cost"],
      suggested: ["ai", "networks", "iot", "drones", "solar", "robots"],
      visionTheme: "care-city",
    },
  ],

  cities: [
    {
      places: ["Megacity Edge", "Informal Tower Belt", "Transit Desert"],
      title: "The city grew faster than pipes",
      scene:
        "Informal settlements around {place} lack water, power, and transit. Upgrading must avoid displacement. Invent services that land with residents, not against them.",
      stakeholder: "Municipal upgrading unit",
      pressureKeys: ["Services", "Displacement", "Health"],
      suggested: ["solar", "iot", "networks", "print3d", "ai", "drones"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Congestion Core", "Two-Hour Commute", "Bus Bunching Line"],
      title: "Mobility that steals the day",
      scene:
        "Commutes crush time and air quality in {place}. Invent mobility that is fair to riders and street vendors — not only car elites.",
      stakeholder: "Transport authority",
      pressureKeys: ["Time", "Air", "Equity"],
      suggested: ["self-driving", "ai", "iot", "networks", "battery", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Heat + Flood Combo Ward", "Sponge City Pilot", "Drain Politics"],
      title: "Climate hits the densest blocks first",
      scene:
        "Dense wards in {place} get heat and flood the same week. Green infrastructure and power resilience must fit tiny footprints and politics.",
      stakeholder: "Climate adaptation office",
      pressureKeys: ["Heat", "Floods", "Power"],
      suggested: ["iot", "materials", "solar", "ai", "networks", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Housing Cost Spiral", "Key Worker Exodus", "Empty Luxury Stack"],
      title: "Teachers can't live near the school",
      scene:
        "Key workers leave {place} as rents explode while units sit empty. Invent housing allocation and build systems that restore a working city.",
      stakeholder: "Housing board",
      pressureKeys: ["Rent", "Vacancy", "Services"],
      suggested: ["print3d", "materials", "ai", "networks", "crypto", "robots"],
      visionTheme: "rebuild-city",
    },
  ],

  child: [
    {
      places: ["Under-Five Clinic", "Vaccine Dropout Row", "Growth Chart Desk"],
      title: "Preventable disease returns",
      scene:
        "Immunization and nutrition slip in {place}. Caregivers face distance and misinformation. Invent last-mile child health that rebuilds trust.",
      stakeholder: "Pediatric outreach lead",
      pressureKeys: ["Disease", "Nutrition", "Trust"],
      suggested: ["drones", "networks", "ai", "iot", "solar", "gene-sequencing"],
      visionTheme: "care-city",
    },
    {
      places: ["Malnutrition Hotspot", "Ready-to-Use Gap", "Market Calorie Trap"],
      title: "Calories without nutrients",
      scene:
        "Child stunting rises where cheap calories dominate diets near {place}. Design detection and food access that works for caregivers with no free hours.",
      stakeholder: "Nutrition program",
      pressureKeys: ["Stunting", "Access", "Cost"],
      suggested: ["ai", "iot", "drones", "alt-proteins", "networks", "synbio"],
      visionTheme: "food-city",
    },
    {
      places: ["Neonatal Cold Room", "Power-Cut Ward", "Kangaroo Care Tent"],
      title: "Newborns lose the night",
      scene:
        "Neonatal units in {place} fail when power fails. Warmth, oxygen, and monitoring need inventing under intermittent grids.",
      stakeholder: "NICU nurse lead",
      pressureKeys: ["Power", "Survival", "Equipment"],
      suggested: ["solar", "battery", "iot", "ai", "networks", "print3d"],
      visionTheme: "care-city",
    },
    {
      places: ["Lead Dust Block", "Toxic Playground", "Old Paint Homes"],
      title: "Invisible poison in play",
      scene:
        "Lead and toxins hit kids' cognition in {place}. Testing is rare; remediation is political. Invent detection and safe housing pathways.",
      stakeholder: "Environmental pediatrics",
      pressureKeys: ["Toxins", "Housing", "Learning"],
      suggested: ["iot", "nano", "ai", "networks", "materials", "drones"],
      visionTheme: "care-city",
    },
  ],

  maternal: [
    {
      places: ["High Valley births", "Washed Bridge Route", "Two-Hour Theater"],
      title: "Two hours to the next theater",
      scene:
        "Complications mean a two-hour road trip if rains haven't washed the bridge near {place}. Midwives want backup that arrives in time.",
      stakeholder: "Lila, midwife network",
      pressureKeys: ["Access", "Risk", "Trust"],
      suggested: ["drones", "networks", "ai", "iot", "transportation", "solar", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Postpartum Blind Spot", "Six-Week No-Show", "Home Visit Desert"],
      title: "Care ends at discharge",
      scene:
        "Mothers disappear from care after birth in {place}. Hemorrhage and depression strike at home. Invent follow-up that reaches them.",
      stakeholder: "Postpartum team",
      pressureKeys: ["FollowUp", "Depression", "Hemorrhage"],
      suggested: ["networks", "ai", "iot", "drones", "solar", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Blood Bank Empty", "Cross-Match Delay", "Rural Transfusion"],
      title: "No blood when minutes matter",
      scene:
        "Obstetric hemorrhage meets empty blood banks around {place}. Logistics and voluntary donation systems need inventing under cultural constraints.",
      stakeholder: "Hospital blood lead",
      pressureKeys: ["Blood", "Time", "Supply"],
      suggested: ["drones", "networks", "ai", "iot", "solar", "transportation"],
      visionTheme: "care-city",
    },
    {
      places: ["Respectful Care Gap", "Abuse Report Desk", "Birth Companion Ban"],
      title: "Women avoid the facility",
      scene:
        "Mistreatment drives home births without skilled care near {place}. Invent accountability and support that make facilities worth trusting.",
      stakeholder: "Women's birth rights group",
      pressureKeys: ["Trust", "Safety", "Access"],
      suggested: ["networks", "ai", "iot", "vr", "crypto"],
      visionTheme: "care-city",
    },
  ],

  coord: [
    {
      places: ["Alliance of five port towns", "Shared Storm Path", "Five Mayors Table"],
      title: "Five coasts, no shared warning",
      scene:
        "Five small coastal towns share a storm path but not a budget or data pipe. Each mayor waits for the other to buy sensors. Coordination *is* the invention.",
      stakeholder: "The inter-town working group",
      pressureKeys: ["Blindspots", "Delay", "Trust"],
      suggested: ["iot", "networks", "ai", "crypto", "space", "drones", "computing"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Pandemic Stockpile Standoff", "Regional PPE Poker", "Border Closure Chat"],
      title: "Everyone hoards, everyone loses",
      scene:
        "Regions around {place} hoard PPE and data in crises. Invent shared reserves and triggers that make cooperation the dominant strategy.",
      stakeholder: "Regional health consortium",
      pressureKeys: ["Hoarding", "Trust", "Speed"],
      suggested: ["networks", "ai", "crypto", "iot", "drones", "space"],
      visionTheme: "care-city",
    },
    {
      places: ["River Basin Compact", "Upstream Dam Fight", "Downstream Flood"],
      title: "One river, six vetoes",
      scene:
        "Upstream decisions flood or starve {place}. Treaties exist on paper. Invent monitoring and side-payments that make the basin manageable.",
      stakeholder: "Basin commission staff",
      pressureKeys: ["Conflict", "Data", "Floods"],
      suggested: ["iot", "space", "ai", "networks", "crypto", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Standards Babel", "Aid Duplicate Desk", "Interop Graveyard"],
      title: "Ten apps, zero interoperability",
      scene:
        "Agencies in {place} each bought a different crisis system. Nothing talks. Invent interop and incentives that retire the graveyard of pilots.",
      stakeholder: "Digital government unit",
      pressureKeys: ["Fragmentation", "Waste", "Delay"],
      suggested: ["networks", "ai", "crypto", "computing", "iot"],
      visionTheme: "social-city",
    },
  ],

  radicalization: [
    {
      places: ["School Bench Corridor", "Youth Club Annex", "First-Year Assembly"],
      title: "Prejudice starts on the school bench",
      scene:
        "In {place}, dehumanizing jokes and online memes harden into cliques before anyone names extremism. Invent early dialogue, media literacy, and rights-based peer tools that work in classrooms—not after a crisis headline.",
      stakeholder: "School counselor network",
      pressureKeys: ["Prejudice", "Isolation", "Trust"],
      suggested: ["ai", "networks", "vr", "iot", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Campus Counter-Content Lab", "Student Media Desk", "Discord-to-Street Bridge"],
      title: "Online pipeline, offline risk",
      scene:
        "Recruiters around {place} move youth from forums to meetups faster than moderators act. Invent youth-led counter-content and off-ramps that preserve free speech while slowing violent pathways.",
      stakeholder: "Student peace coalition",
      pressureKeys: ["Pipeline", "Speed", "Credibility"],
      suggested: ["ai", "networks", "crypto", "computing", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Release Gate Hub", "Halfway House Desk", "Probation Square"],
      title: "The reintegration cliff",
      scene:
        "People leaving detention near {place} hit housing and job voids that recruiters exploit. Invent dignified reintegration logistics that beat the extremist welcome package.",
      stakeholder: "Reentry caseworkers",
      pressureKeys: ["Void", "Recruitment", "Stability"],
      suggested: ["networks", "ai", "iot", "solar", "transportation"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Layoff Rumor Mill", "Factory Town Square", "Night Shift Canteen"],
      title: "Economic shock, easy scapegoat",
      scene:
        "After layoffs in {place}, rumors name a minority for the pain. Invent rumor-response and mutual-aid systems that channel anger into agency without surveillance blacklists.",
      stakeholder: "Union and community mediators",
      pressureKeys: ["Grievance", "Rumor", "Violence"],
      suggested: ["networks", "ai", "iot", "crypto", "vr"],
      visionTheme: "social-city",
    },
  ],

  fgm: [
    {
      places: ["Border Cutting Season Post", "Transit Clinic Van", "Cross-River Kin Network"],
      title: "Cutting season crosses the border",
      scene:
        "Families near {place} move girls across a soft border during school breaks to evade local bans. Invent protection and community signaling that works with kinship—not only police checkpoints.",
      stakeholder: "Girls' protection coalition",
      pressureKeys: ["Mobility", "Secrecy", "Risk"],
      suggested: ["networks", "ai", "iot", "drones", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Traditional Midwife Cooperative", "Practitioner Transition Desk", "Village Skills Hall"],
      title: "Livelihoods locked to the blade",
      scene:
        "Practitioners around {place} earn status and income from FGM. Invent economic and social transition paths so abandonment does not mean destitution—without medicalizing the cut.",
      stakeholder: "Women elders' association",
      pressureKeys: ["Income", "Status", "Norms"],
      suggested: ["networks", "ai", "solar", "print3d", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Public Declaration Ground", "School Safe Space", "Radio Call-In Hut"],
      title: "Beliefs shift faster than practice",
      scene:
        "Many girls and women near {place} say FGM should end, yet ceremonies continue. Invent community declaration, school protection, and peer accountability that turn attitude into abandonment.",
      stakeholder: "Youth anti-FGM club",
      pressureKeys: ["Norms", "PeerPressure", "Enforcement"],
      suggested: ["networks", "ai", "vr", "solar", "iot"],
      visionTheme: "learn-city",
    },
    {
      places: ["Survivor Fistula Ward", "Confidential Care Annex", "Stigma Break Circle"],
      title: "Care without the spotlight",
      scene:
        "Survivors near {place} need clinical repair and counseling but fear exposure. Invent private care navigation and stigma reduction that centers dignity—not spectacle.",
      stakeholder: "Clinical social workers",
      pressureKeys: ["Stigma", "Access", "Pain"],
      suggested: ["networks", "ai", "iot", "drones", "gene-sequencing"],
      visionTheme: "care-city",
    },
  ],

  "short-termism": [
    {
      places: ["Burn Season Ridge", "Charcoal Camp Edge", "Community Forest Gate"],
      title: "This season's field, next decade's flood",
      scene:
        "Households around {place} clear forest for grazing or crops because hunger is this month. Invent incentives and buffers so protecting trees is rational before soils wash away.",
      stakeholder: "Forest user group",
      pressureKeys: ["Hunger", "ForestLoss", "Erosion"],
      suggested: ["iot", "space", "ai", "solar", "networks", "drones"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Drought Livestock Market", "Dairy Co-op Yard", "Famine Credit Desk"],
      title: "Slaughter the future for meat today",
      scene:
        "In drought near {place}, farmers sell or slaughter productive animals for immediate food. Invent credit, feed, and insurance that keep long-term herds alive without empty stomachs.",
      stakeholder: "Pastoralist cooperative",
      pressureKeys: ["Drought", "Assets", "Credit"],
      suggested: ["iot", "networks", "ai", "solar", "drones", "crypto"],
      visionTheme: "food-city",
    },
    {
      places: ["Election-Year Budget Hall", "Disaster Fund Vault", "Ribbon-Cut Plaza"],
      title: "Raid the future for a ribbon",
      scene:
        "Politicians in {place} raid multi-year resilience funds for visible short projects before the vote. Invent transparent rails and citizen locks that make future-stripping costly.",
      stakeholder: "Civic budget watch",
      pressureKeys: ["Politics", "Funds", "Trust"],
      suggested: ["crypto", "networks", "ai", "iot", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Cheap Rebuild Coast", "Code Waiver Desk", "Insurance Exit Ramp"],
      title: "Rebuild cheaper, flood harder",
      scene:
        "After a flood, {place} rebuilds to last year's weak code to save money now. Invent financing and verification so resilient rebuild beats temporary cheap.",
      stakeholder: "Municipal recovery cell",
      pressureKeys: ["Cost", "Risk", "LockIn"],
      suggested: ["materials", "iot", "ai", "networks", "drones", "print3d"],
      visionTheme: "coastal-city",
    },
  ],

  misinfo: [
    {
      places: ["Clinic Rumor Desk", "Vaccine Queue WhatsApp", "Ward Health Post"],
      title: "A rumor empties the clinic",
      scene:
        "False claims about treatment race through {place} faster than nurses can answer. Invent local verification and trusted messengers that restore care uptake without silencing patients.",
      stakeholder: "Community health workers",
      pressureKeys: ["Rumor", "Uptake", "Trust"],
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "care-city",
    },
    {
      places: ["Deepfake Mayor Desk", "Election Week Newsroom", "Town Hall Screen"],
      title: "The mayor's face says what she never said",
      scene:
        "A synthetic video of a local official floods {place} days before a vote or crisis decision. Invent provenance and rapid community checks that work on cheap phones.",
      stakeholder: "Independent local journalists",
      pressureKeys: ["Fakes", "Speed", "Polarization"],
      suggested: ["ai", "crypto", "networks", "computing", "iot"],
      visionTheme: "social-city",
    },
    {
      places: ["Evacuation Denial Channel", "Storm Siren Dispute", "Hillside Shelter Gate"],
      title: "Denial in the evacuation window",
      scene:
        "As a storm approaches {place}, influencers claim the warning is a hoax. Invent last-mile trusted alerts and counter-rumor loops that still respect free speech under time pressure.",
      stakeholder: "Civil defense liaison",
      pressureKeys: ["Denial", "Time", "Safety"],
      suggested: ["iot", "networks", "ai", "space", "drones"],
      visionTheme: "coastal-city",
    },
    {
      places: ["Closed Newsroom Building", "Parish Notice Board", "Co-op Radio Hut"],
      title: "No trusted intermediate left",
      scene:
        "The last local paper near {place} folded; rumor fills the gap. Invent sustainable public-interest media and verification hubs people actually believe.",
      stakeholder: "Citizen reporters' co-op",
      pressureKeys: ["Vacuum", "Credibility", "Capture"],
      suggested: ["networks", "ai", "solar", "crypto", "iot"],
      visionTheme: "social-city",
    },
  ],

  totalitarianism: [
    {
      places: ["State Channel Only Zone", "Hidden News Cache", "Border Radio Shadow"],
      title: "One channel, one truth",
      scene:
        "People in {place} hear only state media. Invent safe logistics for independent news—language bridges, offline distribution, and verification that survive raids.",
      stakeholder: "Exile journalist network",
      pressureKeys: ["Monopoly", "Fear", "Isolation"],
      suggested: ["networks", "crypto", "ai", "solar", "iot", "space"],
      visionTheme: "social-city",
    },
    {
      places: ["Censorship Firewall Town", "Family Call Blackout", "Mesh Courtyard"],
      title: "The line goes dead when it matters",
      scene:
        "Authorities near {place} throttle or cut networks during protests and funerals. Invent resilient family and civic communication that is hard to fully extinguish—without building a better spy tool for the regime.",
      stakeholder: "Digital rights collective",
      pressureKeys: ["Blackout", "Surveillance", "Kin"],
      suggested: ["networks", "crypto", "iot", "solar", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Biometric Ration Gate", "Work Permit Desk", "Excluded Block"],
      title: "No ID, no bread",
      scene:
        "Digital ID around {place} gates food and work; dissidents vanish from eligibility. Invent mutual aid and identity alternatives that reduce exclusion without feeding the registry.",
      stakeholder: "Neighborhood mutual-aid cell",
      pressureKeys: ["Exclusion", "Hunger", "Control"],
      suggested: ["crypto", "networks", "ai", "iot", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Forbidden Assembly Hall", "Shift Whisper Network", "Market Signal Chain"],
      title: "Organize without a target list",
      scene:
        "Large gatherings near {place} are crushed; people need to coordinate aid and witness without creating a perfect arrest list. Invent sousveillance and mass coordination patterns that favor the many.",
      stakeholder: "Labor and civic organizers",
      pressureKeys: ["Repression", "Coordination", "Safety"],
      suggested: ["networks", "crypto", "ai", "iot", "drones"],
      visionTheme: "social-city",
    },
  ],

  "women-stem": [
    {
      places: ["Secondary Math Wing", "Chore-Before-Dawn Home", "Long Walk Lab"],
      title: "Talent exits at the science gate",
      scene:
        "Girls near {place} outperform early, then leave math and physics when distance, chores, and stereotypes stack. Invent pathway retention that is STEM-specific—not only general school access.",
      stakeholder: "Head of science faculty",
      pressureKeys: ["Dropout", "Chores", "Distance"],
      suggested: ["ai", "vr", "networks", "solar", "transportation"],
      visionTheme: "learn-city",
    },
    {
      places: ["Night Lab Corridor", "Campus Gate After Hours", "Field Station Bunk"],
      title: "The lab is brilliant—and unsafe after dark",
      scene:
        "Women students and techs in {place} leave STEM when harassment and unsafe transit make late experiments impossible. Invent lab culture and mobility that keep talent in science.",
      stakeholder: "Women in STEM association",
      pressureKeys: ["Safety", "Harassment", "Retention"],
      suggested: ["iot", "networks", "ai", "self-driving", "solar"],
      visionTheme: "learn-city",
    },
    {
      places: ["First-Degree Cliff Desk", "Mentorship Lottery Hall", "Industry Placement Void"],
      title: "Degree in hand, pipeline ends",
      scene:
        "Women graduate STEM near {place} then hit a mentorship and placement desert. Invent matching, sponsorship, and first-job rails into labs and engineering shops.",
      stakeholder: "University career STEM lead",
      pressureKeys: ["Placement", "Mentors", "Bias"],
      suggested: ["ai", "networks", "vr", "crypto", "computing"],
      visionTheme: "social-city",
    },
    {
      places: ["Fab-Lab Nursery Wall", "Shift Childcare Co-op", "Engineering Park Gate"],
      title: "Care hours vs cleanroom hours",
      scene:
        "STEM workplaces around {place} assume someone else does care work. Invent on-site or shared care so women engineers and scientists can stay in the pipeline without choosing between family and bench.",
      stakeholder: "Industrial park HR and unions",
      pressureKeys: ["Care", "Hours", "Equity"],
      suggested: ["iot", "networks", "ai", "robots", "solar"],
      visionTheme: "learn-city",
    },
  ],

  memory: [
    {
      places: ["Everyday Life Log Desk", "Pocket Archive Co-op", "Consent Capture Cafe"],
      title: "Ordinary lives leave no trace",
      scene:
        "People in {place} want to preserve experiences for themselves and family, but tools are either surveillance toys or unused. Invent privacy-first life capture ordinary households will actually own and search.",
      stakeholder: "Community library tech desk",
      pressureKeys: ["Forgetting", "Privacy", "Access"],
      suggested: ["ai", "networks", "iot", "crypto", "computing", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Elder Story Circle", "Language Archive Hut", "Vanishing Dialect Room"],
      title: "Stories leave with the elders",
      scene:
        "Oral histories around {place} die with the last fluent speakers. Invent dignified community archiving—audio, place, kinship—not extractive recording for outsiders only.",
      stakeholder: "Cultural heritage keepers",
      pressureKeys: ["Loss", "Consent", "Continuity"],
      suggested: ["ai", "networks", "solar", "iot", "vr"],
      visionTheme: "social-city",
    },
    {
      places: ["Disaster Plan Amnesia Desk", "Staff Churn Archive", "Empty Handover Shelf"],
      title: "The plan existed—on a laptop that left",
      scene:
        "After turnover at {place}'s municipal or clinic team, flood and outbreak playbooks are forgotten. Invent institutional memory that survives staff churn without becoming a surveillance dump.",
      stakeholder: "City continuity officer",
      pressureKeys: ["Churn", "Amnesia", "Risk"],
      suggested: ["ai", "networks", "crypto", "iot", "computing"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Format Rot Vault", "Unreadable Decade Disk", "Museum of Dead Media"],
      title: "Saved forever, openable never",
      scene:
        "Schools and families near {place} 'backed up' life on formats nobody can read in ten years. Invent longevity and migration for personal and civic records that people control.",
      stakeholder: "Digital preservation co-op",
      pressureKeys: ["Rot", "LockIn", "Legacy"],
      suggested: ["computing", "ai", "networks", "crypto", "materials"],
      visionTheme: "social-city",
    },
  ],

  "rural-roads": [
    {
      places: ["Mud Clinic Track", "Rainy Season Bridge Gap", "Maternity Detour Path"],
      title: "The clinic vanishes when it rains",
      scene:
        "When rains hit near {place}, the only track to emergency care becomes mud. Invent all-weather access or last-mile medical logistics that do not wait for a perfect highway budget.",
      stakeholder: "Rural clinic nurses",
      pressureKeys: ["Access", "Rain", "Time"],
      suggested: ["drones", "transportation", "iot", "solar", "materials", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Crop Rot Roadhead", "Market Two Days Away", "Broken Culvert Farm"],
      title: "Harvest dies on the road",
      scene:
        "Farmers around {place} lose produce because the all-season road never reaches them. Invent connectivity and cold-chain logistics that shrink isolation from markets.",
      stakeholder: "Farmer cooperative",
      pressureKeys: ["Isolation", "Spoilage", "Income"],
      suggested: ["transportation", "iot", "drones", "solar", "battery", "networks"],
      visionTheme: "food-city",
    },
    {
      places: ["Long Walk School Path", "Consolidated Campus Gate", "Unsafe Footbridge"],
      title: "School is a dangerous walk",
      scene:
        "Children near {place} face hours on unsafe paths after school consolidation. Invent safe rural mobility and connectivity so education is not a hazard.",
      stakeholder: "Parents' school committee",
      pressureKeys: ["Distance", "Safety", "Attendance"],
      suggested: ["transportation", "solar", "iot", "networks", "drones"],
      visionTheme: "learn-city",
    },
    {
      places: ["Ribbon-Cut Road Ghost", "Unfunded Maintenance Yard", "Pothole Politics Desk"],
      title: "Built once, abandoned forever",
      scene:
        "{place} got a road for the photo-op; maintenance funds never followed. Invent upkeep incentives, local stewardship, and monitoring that keep access open after the cameras leave.",
      stakeholder: "Rural roads authority engineer",
      pressureKeys: ["Maintenance", "Politics", "Decay"],
      suggested: ["iot", "drones", "ai", "materials", "networks", "space"],
      visionTheme: "rebuild-city",
    },
  ],

  smoking: [
    {
      places: ["School Gate Kiosk Row", "Youth Nicotine Alley", "Vape Near Campus"],
      title: "The first pack is free at the gate",
      scene:
        "Retailers near {place}'s schools push cheap nicotine to teens. Invent initiation barriers and youth-led norms that work without criminalizing kids.",
      stakeholder: "School health team",
      pressureKeys: ["Initiation", "Retail", "Addiction"],
      suggested: ["ai", "networks", "iot", "vr", "computing"],
      visionTheme: "learn-city",
    },
    {
      places: ["Multi-Unit Courtyard", "Shared Stairwell Air", "Sealed Window Block"],
      title: "Secondhand smoke has no door",
      scene:
        "Families in {place}'s dense housing cannot escape neighbors' smoke. Invent building-scale protection and cessation support that respects tenants' rights.",
      stakeholder: "Tenant union health desk",
      pressureKeys: ["Secondhand", "Housing", "Conflict"],
      suggested: ["iot", "materials", "networks", "ai", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Cessation Desert Clinic", "Quitline Empty Desk", "Shift Worker Break Yard"],
      title: "Want to quit—can't afford the path",
      scene:
        "Heavy smokers in low-income work near {place} face costly or distant cessation. Invent affordable, continuous quit support that fits shift lives.",
      stakeholder: "Primary care nurses",
      pressureKeys: ["Access", "Cost", "Relapse"],
      suggested: ["ai", "networks", "iot", "vr", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Clinic Door Ad Wall", "Tobacco Density Map", "Hospital Ashtray Street"],
      title: "Ads outnumber clinics",
      scene:
        "Around {place}'s health facilities, tobacco retail and ads dominate the streetscape. Invent local policy tools and alternatives that shrink density without one-off bans that never stick.",
      stakeholder: "Municipal health officer",
      pressureKeys: ["Density", "Marketing", "Norms"],
      suggested: ["ai", "networks", "iot", "space", "computing"],
      visionTheme: "social-city",
    },
  ],

  sanitation: [
    {
      places: ["Open Defecation Path", "Shared Latrine Queue", "Cholera Season Ward"],
      title: "No private toilet, no dignity",
      scene:
        "Households near {place} lack basic latrines; disease follows the paths people still use. Invent affordable toilets and hygiene systems people will maintain—not posters alone.",
      stakeholder: "WASH community committee",
      pressureKeys: ["Access", "Disease", "Dignity"],
      suggested: ["materials", "iot", "solar", "print3d", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Sludge Truck Night Route", "Illegal Dump Ravine", "Emptier Co-op Yard"],
      title: "Someone empties it—into the river",
      scene:
        "Pit emptiers around {place} dump fecal sludge unsafely because treatment plants are far or closed. Invent safe emptying economies and treatment that pay emptiers to do right.",
      stakeholder: "Sanitation workers' co-op",
      pressureKeys: ["Sludge", "Dumping", "Health"],
      suggested: ["iot", "drones", "networks", "materials", "ai", "solar"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["School Toilet Block", "Girls' Attendance Gap", "Broken Lock Cubicle"],
      title: "No safe toilet, skip school",
      scene:
        "Schools near {place} lack private, clean toilets—especially for girls. Invent school sanitation that protects dignity and attendance.",
      stakeholder: "Parent-teacher association",
      pressureKeys: ["Attendance", "Privacy", "Hygiene"],
      suggested: ["solar", "iot", "materials", "networks", "print3d"],
      visionTheme: "learn-city",
    },
    {
      places: ["Informal Settlement Edge", "No Sewer Map", "Shared Block Courtyard"],
      title: "City grew; sewers didn't",
      scene:
        "{place}'s informal settlement has density without sewer rights. Invent leapfrog sanitation that works with tenure reality—not only master-plan pipes that never arrive.",
      stakeholder: "Settlement WASH lead",
      pressureKeys: ["Density", "Tenure", "Contamination"],
      suggested: ["materials", "iot", "solar", "ai", "networks", "drones"],
      visionTheme: "rebuild-city",
    },
  ],

  waste: [
    {
      places: ["Plastic Drain Mouth", "Flooded Market Alley", "Clogged Culvert Ward"],
      title: "Drains full of plastic, streets full of water",
      scene:
        "Single-use plastic chokes drains in {place} and turns rain into flood. Invent collection, redesign, and flow systems that cut both waste and water risk.",
      stakeholder: "Municipal drainage crew",
      pressureKeys: ["Plastic", "Floods", "Collection"],
      suggested: ["robots", "iot", "ai", "materials", "drones", "networks"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Picker Cooperative Yard", "Formalization Desk", "Material Buyback Gate"],
      title: "Informal heroes, formal exclusion",
      scene:
        "Waste pickers keep {place} circulating materials but face exclusion when new contracts arrive. Invent circular systems that include livelihoods—not only shiny MRFs that erase them.",
      stakeholder: "Picker cooperative leaders",
      pressureKeys: ["Livelihoods", "Toxics", "Formalization"],
      suggested: ["networks", "ai", "iot", "crypto", "robots", "materials"],
      visionTheme: "social-city",
    },
    {
      places: ["Backyard E-Waste Fire", "Phone Scrap Lane", "Toxic Smoke Block"],
      title: "E-waste burns after dark",
      scene:
        "Households near {place} burn cables for copper; smoke poisons kids. Invent safe e-waste recovery that still pays scrap workers.",
      stakeholder: "Environmental health officers",
      pressureKeys: ["Toxics", "Smoke", "Income"],
      suggested: ["materials", "robots", "ai", "iot", "networks", "print3d"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Open Dump Ridge", "Methane Flare Gap", "Organics Only Stream"],
      title: "The dump grows faster than the city",
      scene:
        "{place}'s open dump leaks methane and leachate while organics still mix with plastics. Invent separation and organics systems that shrink the mountain.",
      stakeholder: "Solid waste utility",
      pressureKeys: ["Volume", "Methane", "Leachate"],
      suggested: ["iot", "ai", "drones", "synbio", "solar", "networks", "materials"],
      visionTheme: "rebuild-city",
    },
  ],

  reproductive: [
    {
      places: ["Method Stockout Clinic", "Contraception Desert Shelf", "Pharmacy Last Mile"],
      title: "The shelf is empty again",
      scene:
        "People who need contraception near {place} hit stockouts and narrow method choice. Invent reliable supply and counseling for all who need methods—not only one demographic poster.",
      stakeholder: "Family planning nurses",
      pressureKeys: ["Stockouts", "Choice", "Access"],
      suggested: ["networks", "ai", "drones", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Men's STI Evening Clinic", "Shift Worker Testing Van", "Stigma Side Door"],
      title: "Men won't walk in the day door",
      scene:
        "STI rates rise around {place}, but men avoid daytime clinics. Invent confidential testing and treatment pathways that treat men as full users of reproductive health—not afterthoughts.",
      stakeholder: "STI program lead",
      pressureKeys: ["Stigma", "Men", "Transmission"],
      suggested: ["ai", "networks", "iot", "gene-sequencing", "drones"],
      visionTheme: "care-city",
    },
    {
      places: ["Adolescent Confidential Desk", "School-Linked RH Room", "Judgmental Queue"],
      title: "Teens need care without the lecture",
      scene:
        "Adolescents near {place} face stigma and broken confidentiality when seeking RH care. Invent private, rights-based access that includes all genders.",
      stakeholder: "Youth-friendly clinic team",
      pressureKeys: ["Confidentiality", "Stigma", "Age"],
      suggested: ["networks", "ai", "vr", "iot", "solar"],
      visionTheme: "care-city",
    },
    {
      places: ["Couple Fertility Desert", "Male Factor Lab Gap", "IVF Only for the Rich"],
      title: "Infertility with nowhere to go",
      scene:
        "Couples and individuals in {place} face infertility with almost no diagnostics—especially male-factor workups. Invent accessible fertility navigation that is not only maternal care and not only luxury IVF.",
      stakeholder: "Reproductive medicine outreach",
      pressureKeys: ["Infertility", "Cost", "Equity"],
      suggested: ["ai", "gene-sequencing", "networks", "iot", "vr"],
      visionTheme: "care-city",
    },
  ],

  amr: [
    {
      places: ["Last-Line Ward", "ICU Culture Delay Desk", "Resistant Infection Bay"],
      title: "The last antibiotic fails on the ward",
      scene:
        "A hospital near {place} watches common bacterial infections shrug off last-line drugs. Invent stewardship, infection control, and diagnostics that preserve remaining antibiotics—not a viral outbreak gadget.",
      stakeholder: "Hospital antimicrobial steward",
      pressureKeys: ["Resistance", "Beds", "Time"],
      suggested: ["gene-sequencing", "ai", "iot", "networks", "synbio"],
      visionTheme: "care-city",
    },
    {
      places: ["Livestock Antibiotic Trough", "Downstream Village Well", "Farm Pharmacy Window"],
      title: "The farm doses the future",
      scene:
        "Farms upstream of {place} use antibiotics as growth crutches; resistance genes show up in people. Invent animal health and monitoring that cut misuse without collapsing livelihoods overnight.",
      stakeholder: "One-health veterinary officer",
      pressureKeys: ["FarmUse", "Runoff", "Resistance"],
      suggested: ["iot", "gene-sequencing", "ai", "drones", "networks", "synbio"],
      visionTheme: "food-city",
    },
    {
      places: ["OTC Antibiotic Counter", "No-Script Pharmacy Row", "Leftover Pill Market"],
      title: "Antibiotics without a diagnosis",
      scene:
        "Pharmacies around {place} sell antibiotics like sweets. Invent retail and care pathways that stop blind bacterial treatment while still treating people who are truly sick.",
      stakeholder: "Community pharmacists' association",
      pressureKeys: ["Misuse", "Access", "Resistance"],
      suggested: ["ai", "networks", "iot", "gene-sequencing", "crypto"],
      visionTheme: "care-city",
    },
    {
      places: ["Blind Prescribe Desk", "48-Hour Culture Lab", "Point-of-Care Void"],
      title: "Treat now, culture never",
      scene:
        "Clinicians near {place} prescribe broad antibiotics because results take days or never arrive. Invent rapid bacterial diagnostics and decision support that make the right drug the easy path.",
      stakeholder: "District lab director",
      pressureKeys: ["Delay", "BlindRx", "Capacity"],
      suggested: ["gene-sequencing", "ai", "nano", "iot", "networks", "materials"],
      visionTheme: "care-city",
    },
  ],

  _default: [
    {
      places: ["Northgate", "Riverside Ward", "Old Market", "Hillcrest"],
      title: "{theme} hits home in {place}",
      scene:
        "In {place}, {theme} is not abstract — it shapes this week's work, care, and trust. People need a local invention that fits the street, clinic, or quay they actually live in.",
      stakeholder: "Local working group",
      pressureKeys: ["Pressure", "Capacity", "Trust"],
      suggested: ["ai", "iot", "networks", "solar", "drones"],
      visionTheme: "rebuild-city",
    },
    {
      places: ["Canal District", "East Works", "South Pier", "Green Belt"],
      title: "A deadline arrives in {place}",
      scene:
        "{place} faces a hard deadline around {theme}. Temporary fixes are failing. Stakeholders want something deployable this year that doesn't make the next crisis worse.",
      stakeholder: "City liaison",
      pressureKeys: ["Urgency", "Cost", "Trust"],
      suggested: ["ai", "networks", "iot", "battery", "materials"],
      visionTheme: "social-city",
    },
    {
      places: ["Clinic Lane", "School Yard", "Depot Edge", "Harbor Path"],
      title: "Frontline staff in {place} are out of runway",
      scene:
        "Frontline workers in {place} are absorbing {theme} with overtime and paper systems. They need tools that reduce load without removing human judgment.",
      stakeholder: "Shift lead",
      pressureKeys: ["Burnout", "Backlog", "Quality"],
      suggested: ["ai", "robots", "networks", "iot", "vr"],
      visionTheme: "care-city",
    },
    {
      places: ["Co-op Hall", "Parish Room", "Union House", "Youth Hub"],
      title: "Neighbors organize around {theme} in {place}",
      scene:
        "Neighbors in {place} are organizing around {theme} but lack shared data, power, or logistics. Coordination itself is part of the invention.",
      stakeholder: "Community organizer",
      pressureKeys: ["Coordination", "Resources", "Trust"],
      suggested: ["networks", "crypto", "iot", "ai", "solar"],
      visionTheme: "social-city",
    },
  ],
};
