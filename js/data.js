/**
 * Future Forge — polymath timing game
 * Learn emTechs + cross-domain inventing + exponential readiness under a rising local crisis.
 */

import { SCENARIO_ANGLE_PACKS as SEED_ANGLE_PACKS } from "./scenario-seeds.js";

export const GAME = {
  title: "Future Forge",
  tagline: "Invent local solutions with emerging tech — beat the clock as the future arrives.",
  startYear: 2026,
  yearsPerTurn: 2,
  /** Solo / friends default action points per invent turn */
  apMax: 3,
  features: {
    runReport: true,
    actionPoints: true,
    budgetWill: true,
    scrutinyCombat: true,
    deployStages: true,
    multiplayer: false,
    hotseat: false,
  },
  /** Starting capital / political will when budgetWill is on */
  startingBudget: 5,
  startingWill: 3,
  maxBudget: 10,
  maxWill: 5,
};

/**
 * Domain filters for the tech tray
 * Power — energy, crypto, computing
 * Automator — AI & robotics
 * Mover — transportation & networking
 * LifeForce — synbio & related life tech
 * Link — AR / VR
 * Portal — IoT, fabrication, materials
 */
export const DOMAINS = {
  power: { label: "Power", color: "#fbbf24" },
  automator: { label: "Automator", color: "#7c9cff" },
  mover: { label: "Mover", color: "#38bdf8" },
  lifeforce: { label: "LifeForce", color: "#34d399" },
  link: { label: "Link", color: "#c4b5fd" },
  portal: { label: "Portal", color: "#fb923c" },
};

export const VISION_STAGES = [
  { id: "present", name: "Today", minTechs: 0, blurb: "The place as it is — pressure building." },
  { id: "prototype", name: "Early build", minTechs: 1, blurb: "First pieces of your idea appear." },
  { id: "transition", name: "Scaling", minTechs: 3, blurb: "Systems take hold across the locale." },
  { id: "transformed", name: "New normal", minTechs: 5, blurb: "Everyday life has clearly changed." },
];

/**
 * Theme shelves for Choose a theme (display order).
 * Each GLOBAL has a matching `shelf` id.
 */
export const THEME_SHELVES = [
  { id: "health", title: "Health & care" },
  { id: "climate", title: "Climate, water & air" },
  { id: "food", title: "Food & land" },
  { id: "learning", title: "Learning & work" },
  { id: "rights", title: "Safety, rights & society" },
  { id: "longterm", title: "Long-term risks" },
];

/** Pinned first row on the theme screen (ids into GLOBALS). */
export const START_HERE_THEME_IDS = [
  "climate",
  "water",
  "infectious",
  "education",
  "energy-access",
  "poverty",
];

/**
 * Global themes from problems.md — player picks a theme, then a local mission
 * `shelf` groups Choose a theme (not used for Spark one-click Portside).
 */
export const GLOBALS = [
  { id: "rogue-si", title: "Rogue SuperIntelligence", kind: "before", shelf: "longterm", blurb: "Powerful AI without control or alignment." },
  { id: "genocide", title: "Prevent Genocide", kind: "before", shelf: "rights", blurb: "Mass atrocity risk and failed early warning." },
  { id: "poverty", title: "Extreme Poverty", kind: "now", shelf: "learning", blurb: "People locked out of income, services, and agency." },
  { id: "chem-bio", title: "Chemical and Biological Weapons", kind: "before", shelf: "longterm", blurb: "Catastrophic dual-use and detection gaps." },
  { id: "asteroid", title: "Asteroid Impact", kind: "before", shelf: "longterm", blurb: "Planetary defense and detection windows." },
  { id: "weather", title: "Extreme Weather Events", kind: "now", shelf: "climate", blurb: "Heat, flood, storm, drought shocks." },
  { id: "mideast", title: "Peace in the Middle East", kind: "now", shelf: "rights", blurb: "Conflict, trauma, and fragile livelihoods." },
  { id: "nuclear", title: "Nuclear Annihilation", kind: "before", shelf: "longterm", blurb: "Misjudgment and launch fragility." },
  { id: "slavery", title: "Slavery", kind: "now", shelf: "rights", blurb: "Forced labor hidden in supply chains." },
  { id: "women", title: "Equal Rights for Women", kind: "now", shelf: "rights", blurb: "Safety, rights, education, economic agency." },
  { id: "education", title: "Lack of Education", kind: "now", shelf: "learning", blurb: "Talent universal; opportunity uneven." },
  { id: "automation", title: "Automation / UBI", kind: "now", shelf: "learning", blurb: "Jobs and meaning under automation." },
  { id: "refugees", title: "Refugees", kind: "now", shelf: "rights", blurb: "Displacement, shelter, papers, belonging." },
  { id: "ag", title: "Sustainable Agriculture", kind: "now", shelf: "food", blurb: "Food systems that regenerate land." },
  { id: "food", title: "Food Security", kind: "now", shelf: "food", blurb: "Reliable nutritious food for all." },
  { id: "eco", title: "Ecological Crises", kind: "now", shelf: "climate", blurb: "Biodiversity and ecosystem collapse." },
  { id: "infectious", title: "Infectious Diseases", kind: "now", shelf: "health", blurb: "Outbreak detection and equitable response." },
  { id: "climate", title: "Climate Crises", kind: "now", shelf: "climate", blurb: "Emissions, heat, and long-term risk." },
  { id: "cancer", title: "Cure Cancer", kind: "now", shelf: "health", blurb: "Earlier detection, better therapy, access." },
  { id: "mental", title: "Mental Health Crises", kind: "now", shelf: "health", blurb: "Care access, connection, stigma." },
  { id: "alzheimer", title: "Alzheimer", kind: "now", shelf: "health", blurb: "Dementia care, detection, dignity." },
  { id: "ageing", title: "Ageing as a Disease", kind: "now", shelf: "health", blurb: "Healthspan and longer lives." },
  { id: "water", title: "Clean Water", kind: "now", shelf: "climate", blurb: "Safe, reliable water access." },
  { id: "air", title: "Air Pollution", kind: "now", shelf: "climate", blurb: "Dirty air from transport, industry, cooking." },
  { id: "energy-access", title: "Access to Energy", kind: "now", shelf: "climate", blurb: "Energy poverty blocking development." },
  { id: "homeless", title: "Homelessness", kind: "now", shelf: "rights", blurb: "Stable housing and services." },
  { id: "cities", title: "Cities / Urbanization", kind: "now", shelf: "climate", blurb: "Liveable, fair, climate-ready cities." },
  { id: "child", title: "Child Health", kind: "now", shelf: "health", blurb: "Preventable disease and malnutrition." },
  { id: "maternal", title: "Maternal Health", kind: "now", shelf: "health", blurb: "Safe birth and postpartum care." },
  { id: "coord", title: "Global Coordination Failure", kind: "now", shelf: "longterm", blurb: "No shared early-warning or response fund across places that need each other." },
  { id: "radicalization", title: "Countering Radicalization", kind: "now", shelf: "rights", blurb: "Prejudice and extremism pipelines — rights-based off-ramps." },
  { id: "fgm", title: "Female Genital Mutilation (FGM)", kind: "now", shelf: "rights", blurb: "Harmful practice; community abandonment and survivor care." },
  { id: "short-termism", title: "Short-Term Needs vs Long-Term Future", kind: "now", shelf: "longterm", blurb: "Survival and returns that liquidate tomorrow’s assets." },
  { id: "misinfo", title: "Misinformation & Epistemic Crises", kind: "now", shelf: "rights", blurb: "Shared truth erodes under deepfakes and weak institutions." },
  { id: "totalitarianism", title: "Totalitarianism", kind: "now", shelf: "rights", blurb: "Isolation, indoctrination, and tools for free association." },
  { id: "women-stem", title: "STEM for Women", kind: "now", shelf: "learning", blurb: "Girls and women underrepresented in STEM pathways." },
  { id: "memory", title: "Incomplete Memory", kind: "now", shelf: "rights", blurb: "We forget — document and preserve lived experience." },
  { id: "rural-roads", title: "Rural Road Connectivity", kind: "now", shelf: "food", blurb: "Rural isolation far from all-season roads." },
  { id: "smoking", title: "Smoking", kind: "now", shelf: "health", blurb: "Tobacco epidemic, cessation, and secondhand harm." },
  { id: "sanitation", title: "Sanitation", kind: "now", shelf: "climate", blurb: "Toilets, sewage, and hygiene — not drinking water alone." },
  { id: "waste", title: "Waste & Recycling", kind: "now", shelf: "climate", blurb: "Waste outruns recycling; circular systems lag." },
  { id: "reproductive", title: "Reproductive Health", kind: "now", shelf: "health", blurb: "Safe sex life and reproductive freedom for all people." },
  { id: "amr", title: "Antimicrobial Resistance", kind: "now", shelf: "health", blurb: "Superbugs and antibiotic failure — bacterial resistance." },
];

/**
 * Local missions — small concrete instances of global problems.
 * Crisis meters use structured roles: local | global | support
 * (each: { label, pressure, pressureRise, winMax }). Omit a role to hide that meter.
 */
export const MISSIONS = [
  {
    id: "portside-floods",
    globalId: "climate",
    title: "Portside Ward floods again",
    place: "Portside Ward",
    startYear: 2026,
    collapseYear: 2036,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Floods", pressure: 2, pressureRise: 1, winMax: 1 },
      global: { label: "Livelihoods", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Trust", pressure: 1, pressureRise: 0, winMax: 2 }
    },
    scene:
      "The school gym is the emergency shelter for the third time this decade. Fishers lose weeks of work when the quay goes under. Residents want something that works *here*, not a national slogan.",
    stakeholder: "Aisha, ward climate liaison",
    suggested: ["iot", "solar", "battery", "drones", "ai", "materials", "networks"],
    visionTheme: "coastal-city",
  },
  {
    id: "saline-well",
    globalId: "water",
    title: "The well turned saline",
    place: "Harran Wells",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Thirst", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Cost", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Health", pressure: 1, pressureRise: 1, winMax: 1 }
    },
    scene:
      "One town’s main well is brackish. Tanker prices spike every dry month. Kids miss school to haul water. A fix must be affordable and maintainable locally.",
    stakeholder: "Yusuf, co-op well keeper",
    suggested: ["solar", "battery", "materials", "nano", "iot", "ai", "print3d"],
    visionTheme: "coastal-city",
  },
  {
    id: "border-fever",
    globalId: "infectious",
    title: "Fever cluster at the border clinic",
    place: "Crossing Clinic 7",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Outbreak", pressure: 2, pressureRise: 1, winMax: 1 },
      global: { label: "Capacity", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Fear", pressure: 1, pressureRise: 1, winMax: 1 }
    },
    scene:
      "A small clinic sees a new fever pattern among travelers. Staff are three nurses deep. They need detection, logistics, and trust — this week, not after a conference.",
    stakeholder: "Dr. Okonkwo, clinic lead",
    suggested: ["gene-sequencing", "ai", "networks", "drones", "iot", "synbio"],
    visionTheme: "care-city",
  },
  {
    id: "three-schools",
    globalId: "education",
    title: "One science teacher, three schools",
    place: "Ridge County schools",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Learning", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Burnout", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Equity", pressure: 2, pressureRise: 0, winMax: 1 }
    },
    scene:
      "Three rural schools share one science teacher who drives 90 minutes between them. Labs are empty half the week. Students who can leave, leave.",
    stakeholder: "Ms. Reyes, the shared science teacher",
    suggested: ["ai", "vr", "networks", "solar", "computing", "robots"],
    visionTheme: "learn-city",
  },
  {
    id: "arrival-city",
    globalId: "refugees",
    title: "Four thousand arrivals, one winter",
    place: "Northgate City",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Shelter", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Services", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Tension", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "A mid-size city expects 4,000 new arrivals before spring. Gyms are full. Paperwork is chaos. Locals fear queues at clinics. Dignity has a deadline.",
    stakeholder: "Marta, reception coordinator",
    suggested: ["print3d", "drones", "solar", "networks", "ai", "iot", "crypto"],
    visionTheme: "rebuild-city",
  },
  {
    id: "warehouse-shifts",
    globalId: "automation",
    title: "The night shift disappeared",
    place: "Canal Logistics Park",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Jobs", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Skills", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Dignity", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "Warehouse automation cut 30% of shifts in eighteen months. Rent didn’t fall. Workers want retraining that leads to real pay — not a pamphlet.",
    stakeholder: "Dev, shift steward",
    suggested: ["ai", "robots", "vr", "networks", "crypto", "computing"],
    visionTheme: "social-city",
  },
  {
    id: "opaque-benefits",
    globalId: "rogue-si",
    title: "The benefits AI nobody can question",
    place: "Metro Benefits Office",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Opacity", pressure: 2, pressureRise: 1, winMax: 0 },
      global: { label: "Harm", pressure: 1, pressureRise: 1, winMax: 0 },
      support: { label: "Protest", pressure: 1, pressureRise: 1, winMax: 1 }
    },
    scene:
      "City hall wants to deploy an opaque AI to decide benefits *this year* and cut costs. Caseworkers are already overruled by a black box pilot. Prevention means a better system, not a ban on tools.",
    stakeholder: "Len, casework supervisor",
    suggested: ["ai", "computing", "networks", "crypto", "bci", "iot"],
    visionTheme: "social-city",
  },
  {
    id: "smog-corridor",
    globalId: "air",
    title: "School days lost to smog",
    place: "East Industrial Corridor",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "AsthmaDays", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "ParentTrust", pressure: 2, pressureRise: 0, winMax: 1 },
      support: { label: "CorridorPM", pressure: 3, pressureRise: 1, winMax: 1 }
    },
    scene:
      "Asthma days close classrooms along the truck route. Parents have sensor photos of the haze — and the corridor still runs diesel at rush hour. A local fix must protect kids and cut corridor exhaust.",
    stakeholder: "Priya, parent coalition",
    suggested: ["iot", "ai", "solar", "battery", "self-driving", "networks", "materials"],
    visionTheme: "energy-city",
  },
  {
    id: "dark-clinic",
    globalId: "energy-access",
    title: "The clinic dies at dusk",
    place: "Riverbend Health Post",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Power", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Care", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "ColdChain", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "When the grid fails, vaccines warm and night births go dark. Diesel is expensive and late. Staff need first watts that stay on.",
    stakeholder: "Nurse Amara",
    suggested: ["solar", "battery", "iot", "networks", "print3d", "drones"],
    visionTheme: "energy-city",
  },
  {
    id: "empty-nets",
    globalId: "eco",
    title: "Empty nets, angry quay",
    place: "Kelp Harbor",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Stocks", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Habitat", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Conflict", pressure: 1, pressureRise: 1, winMax: 1 }
    },
    scene:
      "Fish stocks collapsed locally. Some boats still cheat night limits. Young people leave. Monitoring and alternatives have to work for this harbor.",
    stakeholder: "Captain Seo",
    suggested: ["drones", "iot", "ai", "space", "synbio", "alt-proteins"],
    visionTheme: "ocean-city",
  },
  {
    id: "memory-house",
    globalId: "alzheimer",
    title: "Who watches the watchers of memory",
    place: "Cedar Day Center",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Care", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Safety", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Families", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "A day center for people with dementia has a waitlist of fourteen months. Families burn out. Staff need tools that preserve dignity — not just surveillance.",
    stakeholder: "Tomás, center director",
    suggested: ["ai", "robots", "iot", "bci", "networks", "vr"],
    visionTheme: "care-city",
  },
  {
    id: "maternal-road",
    globalId: "maternal",
    title: "Two hours to the next theater",
    place: "High Valley births",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Access", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Risk", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Trust", pressure: 1, pressureRise: 0, winMax: 1 }
    },
    scene:
      "Complications mean a two-hour road trip if the rains haven’t washed the bridge. Midwives want backup that arrives in time.",
    stakeholder: "Lila, midwife network",
    suggested: ["drones", "networks", "ai", "iot", "transportation", "solar", "vr"],
    visionTheme: "care-city",
  },
  {
    id: "shelter-winter",
    globalId: "homeless",
    title: "Winter count keeps rising",
    place: "Southbank streets",
    startYear: 2026,
    collapseYear: 2032,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Shelter", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Cold", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Services", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "Encampments grow under the overpass each winter. Hotels are full. Building codes move slowly. People need warm, safe options *this* season and a path to stay housed.",
    stakeholder: "Kenji, outreach lead",
    suggested: ["print3d", "materials", "solar", "ai", "robots", "iot", "networks"],
    visionTheme: "rebuild-city",
  },
  {
    id: "food-desert",
    globalId: "food",
    title: "The last greengrocer closed",
    place: "Mile-Long Block",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Nutrition", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Price", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Access", pressure: 2, pressureRise: 0, winMax: 1 }
    },
    scene:
      "A dense neighborhood’s last fresh-food shop closed. Corner stores sell calories, not vegetables. Transit to a supermarket is two buses.",
    stakeholder: "Elena, community kitchen",
    suggested: ["alt-proteins", "drones", "ai", "iot", "transportation", "synbio", "print3d"],
    visionTheme: "food-city",
  },
  {
    id: "five-coasts",
    globalId: "coord",
    title: "Five coasts, no shared warning",
    place: "Alliance of five port towns",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Blindspots", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "Delay", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Trust", pressure: 2, pressureRise: 1, winMax: 1 }
    },
    scene:
      "Five small coastal towns share a storm path but not a budget or data pipe. Each mayor waits for the other to buy sensors. Coordination *is* the invention.",
    stakeholder: "The inter-town working group",
    suggested: ["iot", "networks", "ai", "crypto", "space", "drones", "computing"],
    visionTheme: "coastal-city",
  },
  {
    id: "cancer-wait",
    globalId: "cancer",
    title: "Scan wait times hit nine months",
    place: "Regional Oncology Hub",
    startYear: 2026,
    collapseYear: 2034,
    yearsPerTurn: 2,
    pressure: {
      local: { label: "Wait", pressure: 3, pressureRise: 1, winMax: 1 },
      global: { label: "LateStage", pressure: 2, pressureRise: 1, winMax: 1 },
      support: { label: "Equity", pressure: 2, pressureRise: 0, winMax: 1 }
    },
    scene:
      "Imaging backlog means late diagnoses. Rural patients miss appointments. Oncologists want triage and tools that find risk earlier without inventing a miracle drug overnight.",
    stakeholder: "Dr. Chen, oncology lead",
    suggested: ["ai", "gene-sequencing", "networks", "nano", "computing", "iot"],
    visionTheme: "care-city",
  },
];

/**
 * emTech catalog — broad categories, always pickable.
 * readyYear = soft horizon hint only (when "near" use cases get more common), NOT a lock.
 */
export const TECHS = [
  // —— Power: energy, crypto, computing ——
  tech("computing", "Computing", "01", "power", 2026, "mature",
    "Digital processing, memory, and simulation.",
    "Substrate for AI, networks, and software systems.",
    "Run models and coordinate local systems.",
    "energy use, concentration of power",
    ["ai", "quantum", "networks", "iot"],
    { city: "edge-nodes", sky: "data-aurora", narrative: "Compute hums behind local decisions." }),
  tech("energy", "Energy", "⚡", "power", 2026, "mature",
    "Physical power for work, heat, light, and industry.",
    "How we generate and store energy shapes every other scale-up.",
    "Power clinics, pumps, and workshops.",
    "emissions, unequal access",
    ["battery", "solar", "wind", "nuclear"],
    { city: "bright-grid", infra: "charge-mesh", narrative: "Power is the backbone of every fix." }),
  tech("crypto", "Crypto-Currency", "Ƀ", "power", 2027, "steep",
    "Shared ledgers, tokens, and programmable incentives.",
    "Coordination and verification tools — with real scam risk.",
    "Transparent local funds or supply proofs.",
    "scams, volatility, governance failure",
    ["networks", "ai", "iot"],
    { city: "trust-rails", narrative: "Shared records settle local agreements in the open." }),
  tech("quantum", "Quantum Computing", "⚛", "power", 2032, "early",
    "Quantum processors for hard simulation and optimization.",
    "Early useful niches; not a laptop replacement.",
    "Hard local optimization / research partner (later years).",
    "hype, access concentration",
    ["computing", "ai", "materials", "quantum-internet"],
    { sky: "quantum-glow", narrative: "Specialized quantum jobs open new designs." }),
  tech("geothermal", "Geothermal Power", "🌋", "power", 2028, "steep",
    "Heat from the Earth for steady power.",
    "Baseload renewable where geology allows.",
    "Steady local clean power.",
    "siting, cost, seismicity",
    ["energy", "battery", "materials"],
    { city: "bright-grid", narrative: "Quiet heat becomes steady electricity." }),
  tech("tidal", "Tidal Power", "🌙", "power", 2030, "early",
    "Power from tidal flows.",
    "Predictable but site-limited marine energy.",
    "Coastal baseload where tides run strong.",
    "marine impact, capital cost",
    ["wave", "battery", "materials"],
    { nature: "blue-abundance", narrative: "Tides turn into coastal power." }),
  tech("solar", "Solar Power", "☀", "power", 2026, "mature",
    "Electricity from sunlight.",
    "Fastest-scaling clean generation when paired with storage.",
    "Roofs, pumps, microgrids.",
    "intermittency, materials",
    ["battery", "wind", "networks", "print3d"],
    { sky: "fusion-day", city: "bright-grid", narrative: "Roofs drink sunlight for local work." }),
  tech("wind", "Wind Power", "🌬", "power", 2026, "mature",
    "Electricity from wind.",
    "Mature renewable; needs grid flexibility.",
    "Community or coastal turbines.",
    "siting, wildlife, intermittency",
    ["solar", "battery", "energy"],
    { infra: "wind-rows", narrative: "Turbines stitch power into the landscape." }),
  tech("wave", "Wave Power", "〰", "power", 2031, "early",
    "Energy from ocean waves.",
    "High potential, hard engineering.",
    "Island and harbor power (later).",
    "storms, cost, reliability",
    ["tidal", "battery", "materials"],
    { nature: "blue-abundance", narrative: "Swells feed coastal nodes." }),
  tech("nuclear", "Nuclear Power", "☢", "power", 2030, "steep",
    "Dense low-carbon baseload (fission / advanced reactors).",
    "High capacity; trust and cost dominate.",
    "Regional firm power for industry and desal.",
    "waste, accidents, cost",
    ["energy", "materials", "ai"],
    { infra: "fusion-core", narrative: "Firm clean power anchors the region." }),
  tech("battery", "Battery Technology", "🔋", "power", 2026, "steep",
    "Storing electricity for mobility and grids.",
    "The partner that makes solar and wind local-real.",
    "Clinics, fleets, evening power.",
    "mining, fire, recycling",
    ["solar", "wind", "self-driving", "drones", "robots"],
    { city: "quiet-mobility", infra: "charge-mesh", narrative: "Power waits in packs until needed." }),

  // —— Automator: AI & robotics ——
  tech("ai", "Artificial Intelligence", "✦", "automator", 2026, "steep",
    "Systems that predict, recommend, generate, and decide from data.",
    "Automates pattern-finding; still needs human accountability.",
    "Triage, tutoring, logistics, early warning.",
    "bias, overtrust, opaque decisions",
    ["computing", "robots", "iot", "networks", "vr"],
    { sky: "data-aurora", people: "ai-assist", narrative: "Local assistants draft routes and lessons." }),
  tech("robots", "Robots", "🤖", "automator", 2027, "steep",
    "Machines that sense, move, build, care, or inspect.",
    "Physical automation — bodies for intelligent software.",
    "Care assist, rebuild, hazardous work.",
    "safety, jobs, accountability",
    ["ai", "drones", "battery", "iot"],
    { people: "co-bots", city: "service-bots", narrative: "Machines share work; people keep judgment." }),

  // —— Mover: transportation & networking ——
  tech("networks", "Networks", "⛓", "mover", 2026, "mature",
    "Moving information and coordination across distance.",
    "The rails that let other tools reach people.",
    "Telemedicine, schooling, alerts.",
    "exclusion, outages, cyber risk",
    ["quantum-internet", "iot", "ai", "crypto"],
    { city: "edge-nodes", narrative: "Links stitch distant rooms into one response." }),
  tech("transportation", "Transportation", "🚚", "mover", 2026, "mature",
    "Moving people, goods, and medicine physically.",
    "Access is often a logistics problem.",
    "Corridors, last mile, emergency transit.",
    "emissions, congestion, accidents",
    ["self-driving", "drones", "battery", "ai"],
    { city: "flow-streets", narrative: "Goods and care arrive with less waste." }),
  tech("self-driving", "Self-Driving Cars", "🛣", "mover", 2029, "steep",
    "Vehicles that navigate with limited human control.",
    "Slow safety deployment; huge local mobility stakes.",
    "Shuttles, freight corridors, access for non-drivers.",
    "edge cases, liability, jobs",
    ["ai", "iot", "battery", "networks"],
    { city: "flow-streets", narrative: "Coordinated vehicles free street space." }),
  tech("drones", "Drones", "🕊", "mover", 2026, "steep",
    "Uncrewed aircraft for delivery, sensing, response.",
    "Already flying medical and inspection routes in places.",
    "Last-mile medicine, maps, search.",
    "privacy, airspace, noise",
    ["robots", "ai", "iot", "battery"],
    { sky: "drone-flocks", narrative: "Small craft deliver and watch overhead." }),
  tech("quantum-internet", "Quantum Internet", "◇", "mover", 2034, "early",
    "Networking quantum states for secure links.",
    "Long-horizon infrastructure.",
    "Ultra-secure links for critical local nodes (late game).",
    "timelines, cost",
    ["quantum", "networks", "crypto"],
    { sky: "quantum-glow", narrative: "Quiet secure links join critical sites." }),
  tech("space", "Space Exploration", "🚀", "mover", 2028, "steep",
    "Orbit and beyond for observation, comms, defense.",
    "Satellites already shape weather and connectivity.",
    "Local use of orbital data and links.",
    "debris, cost, militarization",
    ["drones", "ai", "networks", "materials"],
    { sky: "drone-flocks", narrative: "Orbital eyes and relays serve the town." }),

  // —— LifeForce: synbio & related ——
  tech("synbio", "Synthetic Biology", "🦠", "lifeforce", 2029, "early",
    "Designing living systems as tools and factories.",
    "Medicines, materials, environmental microbes — carefully.",
    "Local biotech capacity with guardrails.",
    "biosecurity, ecology, ethics",
    ["genetic-engineering", "gene-sequencing", "alt-proteins", "ai"],
    { nature: "living-infra", narrative: "Living tools enter the local toolkit." }),
  tech("bci", "Brain-Computer Interface", "🧠", "lifeforce", 2031, "early",
    "Direct links between neural signals and machines.",
    "Clinical restoration first; broader use later.",
    "Restore speech or movement for specific patients.",
    "privacy of mind, medical risk",
    ["ai", "robots", "vr", "computing"],
    { people: "neural-link", narrative: "Thought becomes a careful interface." }),
  tech("genetic-engineering", "Genetic Engineering", "🧬", "lifeforce", 2028, "steep",
    "Changing genomes for traits and therapies.",
    "Crops, gene therapies, engineered microbes.",
    "Local health or crop resilience tools.",
    "ecology, ethics, equity",
    ["gene-sequencing", "synbio", "ai"],
    { nature: "engineered-life", narrative: "Careful genetic tools enter clinics and fields." }),
  tech("gene-sequencing", "Gene Sequencing", "📑", "lifeforce", 2026, "steep",
    "Reading DNA/RNA at scale.",
    "Outbreak maps and personal diagnostics.",
    "Identify pathogens and risks quickly.",
    "privacy, discrimination",
    ["genetic-engineering", "ai", "iot", "networks"],
    { people: "health-aura", narrative: "Genomes become readable maps for action." }),
  tech("alt-proteins", "Alternative Proteins", "🌱", "lifeforce", 2028, "steep",
    "Plant, fermentation, and cultivated proteins.",
    "Lower land and emissions intensity of protein.",
    "Local protein when supply chains break.",
    "cost, culture, energy",
    ["synbio", "ai", "energy", "iot"],
    { city: "food-labs", nature: "rewilded", narrative: "Protein is produced closer to plates." }),

  // —— Link: AR / VR ——
  tech("vr", "Virtual Reality", "🥽", "link", 2026, "steep",
    "Immersive training and remote presence (VR/AR family).",
    "Practice and shared seeing without full travel.",
    "Train skills, rehearse disasters, remote expertise.",
    "isolation, accessibility, manipulation",
    ["ai", "networks", "bci"],
    { people: "ar-layers", narrative: "Practice worlds before real risk." }),

  // —— Portal: IoT, 3D print, nano, materials ——
  tech("print3d", "3D Printing", "▣", "portal", 2026, "steep",
    "Turning digital designs into physical objects on-site.",
    "Local manufacturing of parts, tools, shelters.",
    "Print what you cannot wait to ship.",
    "quality, waste, misuse",
    ["materials", "networks", "robots"],
    { city: "print-yards", narrative: "Neighborhood fabs print urgent parts." }),
  tech("iot", "Internet of Things", "◎", "portal", 2026, "mature",
    "Sensors that make the physical world measurable.",
    "See floods, air, machines, bodies — then act.",
    "Early warning and continuous monitoring.",
    "privacy, false alarms, surveillance",
    ["networks", "ai", "drones", "self-driving"],
    { infra: "sensor-mesh", narrative: "The place reports its own stress." }),
  tech("materials", "Material Science", "◈", "portal", 2027, "steep",
    "New solids and surfaces — strength, filters, conductors.",
    "Underwrites batteries, buildings, devices.",
    "Better barriers, lighter structures, filters.",
    "toxicity unknowns, recycling",
    ["nano", "print3d", "battery", "synbio"],
    { city: "morph-surfaces", narrative: "Surfaces adapt to weather and wear." }),
  tech("nano", "Nano-Technology", "·", "portal", 2029, "early",
    "Engineering at nanometer scale for medicine and materials.",
    "Delivery, sensors, coatings.",
    "Targeted filters or medical tools.",
    "toxicity, dual-use",
    ["materials", "synbio", "gene-sequencing"],
    { people: "health-aura", narrative: "Tiny layers clean and deliver carefully." }),
];

/** Spark first-run tray (~12); Workshop still shows full catalog */
const STARTER_TECH_IDS = new Set([
  "solar",
  "battery",
  "iot",
  "ai",
  "networks",
  "drones",
  "materials",
  "print3d",
  "gene-sequencing",
  "robots",
  "wind",
  "transportation",
]);
for (const t of TECHS) {
  if (STARTER_TECH_IDS.has(t.id)) t.starter = true;
}

function tech(id, name, icon, domain, readyYear, curve, summary, learn, inventionHint, risk, pairs, vision) {
  return {
    id,
    name,
    icon,
    domain,
    readyYear, // soft horizon only
    curve,
    summary,
    learn,
    inventionHint,
    scarcity: `What scarce capability could ${name} help make more abundant here?`,
    risk,
    pairs,
    vision,
    starter: false,
    ...capabilitySeed(id, name, summary),
  };
}

/** Static art-of-the-possible seeds (fallback when live AI/search unavailable) */
function capabilitySeed(id, name, summary) {
  const seeds = {
    computing: {
      primer:
        "Computing is the substrate under almost every modern system: processors, memory, software, and simulation. Local inventions often need somewhere to run models, store records, or coordinate devices — even offline at the edge. Capability is abundant in the cloud; the hard local problem is access, energy, skills, and who controls the stack.",
      maturity: {
        now: "Cloud and edge compute, commodity GPUs/CPUs, and software platforms that scale from phones to data centers.",
        near: "Cheaper inference everywhere and tighter real-time local control loops for clinics, grids, and logistics.",
        frontier: "Ambient compute so cheap and ubiquitous that energy and cost almost drop out of design constraints.",
      },
      milestones: ["On-device AI chips in phones and industrial controllers", "Widespread cloud regions and open-source software stacks"],
      useCasesNow: ["Local data platforms", "Offline-capable clinic apps", "Simulation for flood or traffic planning"],
    },
    energy: {
      primer:
        "Energy is the ability to do physical work — light, heat, motion, cold chain. Every local invention that pumps water, runs a clinic at night, or moves goods sits on an energy budget. The challenge is rarely “is electricity invented?”; it is reliability, cost, cleanliness, and who gets cut off first when the grid fails.",
      maturity: {
        now: "Mixed grids; diesel backup still common where reliability is poor.",
        near: "More firm clean options and smarter demand response at community scale.",
        frontier: "Energy scarcity largely exits everyday local design constraints.",
      },
      milestones: ["Record renewable build-out in many markets", "Falling costs for generation paired with smarter grids"],
      useCasesNow: ["Clinic/microgrid planning", "Load shifting", "Hybrid backup that cuts diesel hours"],
    },
    crypto: {
      primer:
        "Crypto-currency and shared ledgers are tools for recording agreements, transfers, and proofs without a single trusted intermediary. Used well, they can make local funds transparent or track supply chains; used badly, they enable scams and volatility. For local inventing, think coordination and verification — not get-rich speculation.",
      maturity: {
        now: "Public ledgers, stablecoins, and pilot public-good funds; UX and fraud remain hard.",
        near: "Clearer regulation and identity rails for procurement and aid.",
        frontier: "Programmable money as boring default infrastructure for municipal finance.",
      },
      milestones: ["Tokenized aid and supply-proof pilots in several jurisdictions"],
      useCasesNow: ["Transparent community funds", "Supply-chain proofs", "Shared savings pools with public rules"],
    },
    ai: {
      primer:
        "Artificial intelligence finds patterns in data to predict, recommend, generate text or images, and support decisions. It is already a co-worker in many clinics, classrooms, and logistics desks — but it can be biased, overconfident, or opaque. Strong local inventions keep humans accountable and scope the model to a real workflow.",
      maturity: {
        now: "Assistive models, classification, forecasting, and copilots with human oversight.",
        near: "More reliable agents for narrow workflows; better local-language models.",
        frontier: "Broad autonomous judgment in high-stakes domains without humans — not honest for most missions yet.",
      },
      milestones: ["Generative AI copilots in work, education, and some clinical tools"],
      useCasesNow: ["Triage support", "Tutoring aids", "Document and logistics copilots", "Early-warning scoring"],
    },
    robots: {
      primer:
        "Robots are machines that sense and act in the physical world — carrying, inspecting, assisting care, or rebuilding. Software intelligence needs a body to move goods or people. Today’s wins are often supervised, mapped environments; open-world autonomy is still the stretch.",
      maturity: {
        now: "Warehouse, inspection, and limited care/assist robots under supervision.",
        near: "More reliable mobile manipulators in mapped indoor sites.",
        frontier: "General household robots that handle any chore unsupervised.",
      },
      milestones: ["Hospital logistics robots and industrial cobots in daily use"],
      useCasesNow: ["Clinic logistics", "Hazard inspection", "Rebuild assist with human lead"],
    },
    networks: {
      primer:
        "Networks move information and coordination across distance — fiber, cellular, mesh, satellite. Without them, sensors cannot alert, telemedicine cannot reach, and AI cannot sync. Local inventing often means last-mile connectivity, resilience in outages, and who is still excluded.",
      maturity: {
        now: "Cellular, fiber, mesh, and satellite links; coverage gaps remain intensely local.",
        near: "Cheaper community meshes and resilient failover for clinics and schools.",
        frontier: "Universal high-quality connectivity as default everywhere.",
      },
      milestones: ["LEO satellite broadband and community mesh pilots expanding access"],
      useCasesNow: ["Telemedicine links", "School connectivity", "Alert broadcasts"],
    },
    transportation: {
      primer:
        "Transportation is how people, goods, and medicine move physically. Many “tech” crises are logistics crises: the vaccine, the midwife, the spare part is hours away. Invent for corridors, last mile, and reliability under weather and poverty — not only vehicles that look futuristic.",
      maturity: {
        now: "Buses, bikes, vans, ferries, and logistics software already move care and goods.",
        near: "Better demand-responsive transit and EV fleets on fixed corridors.",
        frontier: "Frictionless zero-emission mobility for every trip with no planning.",
      },
      milestones: ["EV buses and optimized routing cutting cost on many urban routes"],
      useCasesNow: ["Medical logistics corridors", "Demand-responsive vans", "Priority emergency lanes"],
    },
    print3d: {
      primer:
        "3D printing turns digital designs into physical parts on-site — tools, braces, fixtures, sometimes medical devices. It shortens supply chains when ships and trucks fail, but quality control, materials, and certification still matter. Invent for urgent local fabrication with clear SOPs, not magic printers of everything.",
      maturity: {
        now: "Local fabs print tools, spare parts, and some medical devices under quality limits.",
        near: "Broader certified materials and municipal print hubs.",
        frontier: "Any object on demand from digital files with perfect strength.",
      },
      milestones: ["Workshop and hospital makerspaces producing spare parts under SOPs"],
      useCasesNow: ["Urgent spare parts", "Custom braces and tools", "Prototype shelters"],
    },
    iot: {
      primer:
        "The Internet of Things is sensors and actuators that make the physical world measurable and sometimes controllable — flood height, cold-chain temperature, air quality, machine vibration. The hardware is often cheap; the hard parts are power, maintenance, false alarms, privacy, and who acts on the data.",
      maturity: {
        now: "Cheap sensors for water, air, and assets; networks and maintenance are the bottleneck.",
        near: "Denser meshes with better battery life and analytics.",
        frontier: "Invisible continuous sensing of entire districts with perfect action loops.",
      },
      milestones: ["City flood, air, and water sensor networks in production use"],
      useCasesNow: ["Flood early warning", "Cold-chain monitors", "Leak detection"],
    },
    vr: {
      primer:
        "Virtual and augmented reality create immersive or overlaid views for training, remote expertise, and rehearsal of high-risk work. They do not replace roads or clinics, but they can multiply scarce experts and let people practice before real storms or surgeries. Accessibility and motion sickness still limit who benefits.",
      maturity: {
        now: "VR/AR training, remote expert overlays, and simulation for high-risk skills.",
        near: "Lighter headsets and better multi-user local training rooms.",
        frontier: "Full sensory presence that replaces most physical co-location.",
      },
      milestones: ["Surgical and disaster training and remote-assist AR in hospitals and utilities"],
      useCasesNow: ["Skill rehearsal", "Remote expert overlay", "Public-risk walkthroughs"],
    },
    synbio: {
      primer:
        "Synthetic biology designs living systems — microbes, cells, genetic circuits — as tools for medicines, materials, diagnostics, and environmental work. It is a broad family, not one product. Much is tightly regulated; invent with partnerships, labs, and guardrails, not “programmable life runs the city” as if it were a mobile app.",
      maturity: {
        now: "Sequencing, some gene therapies, industrial enzymes, regulated biotech products.",
        near: "Broader biomanufacturing access; more agri and clinical apps under regulation.",
        frontier: "Programmable living systems as everyday municipal infrastructure.",
      },
      milestones: ["Pathogen genomics in outbreaks", "Approved gene therapies for select diseases"],
      useCasesNow: ["Outbreak sequencing partnerships", "Contract biomanufacturing", "Lab diagnostics"],
    },
    quantum: {
      primer:
        "Quantum computing uses quantum effects for certain hard calculations — materials, chemistry, some optimization — that classical machines struggle with. It is not a faster laptop for city hall. Honest local use today is research partnership, learning, and long-horizon planning, not “quantum runs the clinic.”",
      maturity: {
        now: "Research machines and cloud access for experiments; not general IT replacement.",
        near: "Niche hybrid quantum–classical jobs (materials, optimization pilots).",
        frontier: "Broad practical quantum advantage in everyday municipal systems.",
      },
      milestones: ["Cloud quantum access and improving error-mitigation research"],
      useCasesNow: ["R&D partnerships", "Learning labs", "Long-horizon planning studies"],
    },
    geothermal: {
      primer:
        "Geothermal draws heat from the Earth for steady electricity or district heat. Where geology works, it is firm, low-carbon power. Where it does not, drilling and siting costs dominate. Invent with local resource maps and long capital horizons, not universal geothermal everywhere.",
      maturity: {
        now: "Proven baseload where geology is good; drilling cost and siting dominate.",
        near: "Enhanced geothermal expanding viable sites.",
        frontier: "Cheap firm geothermal nearly everywhere.",
      },
      milestones: ["New enhanced geothermal pilots", "Expanded district heat projects"],
      useCasesNow: ["Regional baseload where geology allows", "District heat partnerships"],
    },
    tidal: {
      primer:
        "Tidal power converts predictable tidal flows into electricity. Resource is site-specific and capital-heavy, but the predictability is valuable for islands and harbors. Invent only where tides and environment allow — and pair with storage and grid planning.",
      maturity: {
        now: "A few commercial sites; capital cost and marine impact still high.",
        near: "More predictable coastal projects with better turbines.",
        frontier: "Cheap tidal power for any coast.",
      },
      milestones: ["Operational tidal arrays in select strong-current channels"],
      useCasesNow: ["Harbor and island baseload pilots", "Research partnerships"],
    },
    "self-driving": {
      primer:
        "Self-driving vehicles aim to navigate with little or no human control. Progress is real in geofenced areas and advanced driver assistance, but open-road reliability, edge cases, and liability still limit scale. Local inventing often means shuttles and freight on mapped routes, not “all traffic is autonomous tomorrow.”",
      maturity: {
        now: "Geofenced robotaxi/shuttle pilots and ADAS; full open-road autonomy limited.",
        near: "Fixed-route shuttles and freight corridors more common.",
        frontier: "Universal driverless mobility in any weather and road.",
      },
      milestones: ["Commercial robotaxi zones", "Autonomous shuttles on mapped routes"],
      useCasesNow: ["Campus/clinic shuttles", "Mapped freight corridors", "Access pilots for non-drivers"],
    },
    drones: {
      primer:
        "Drones are uncrewed aircraft for delivery, inspection, mapping, and search. Medical corridors already save time for blood and vaccines in several countries. Urban free-flight swarms are still constrained by airspace, noise, and safety rules — invent with corridors and missions, not unrestricted sky.",
      maturity: {
        now: "Mapped corridors for medical delivery, inspection, and mapping in many countries.",
        near: "Denser urban operations with clearer regulation.",
        frontier: "Fully free-roaming swarms as default logistics.",
      },
      milestones: ["Operational medical drone corridors for blood and vaccines"],
      useCasesNow: ["Last-mile medical logistics", "Infrastructure inspection", "Disaster search"],
    },
    bci: {
      primer:
        "Brain–computer interfaces translate neural signals into computer commands or stimulation — restoring communication or movement for people with severe disability in clinical settings. Consumer mind-apps are mostly hype for local missions. Invent with clinical pathways and consent, not mass surveillance of thoughts.",
      maturity: {
        now: "Clinical and research interfaces for severe paralysis and communication restoration.",
        near: "Broader clinical speech and motor prostheses.",
        frontier: "Consumer high-bandwidth brain apps as normal interfaces.",
      },
      milestones: ["Trial participants communicating via advanced BCIs"],
      useCasesNow: ["Clinical trial pathways", "Assistive research partnerships"],
    },
    "quantum-internet": {
      primer:
        "Quantum internet aims to network quantum states for ultra-secure links and distributed quantum tasks. It is early research infrastructure, not a city ISP replacement. Local inventing may mean pilot secure links between critical sites with research partners — not entanglement for every household.",
      maturity: {
        now: "Lab and metro testbeds; not commodity city infrastructure.",
        near: "Limited secure links between specialized sites.",
        frontier: "Routine entanglement networking across regions.",
      },
      milestones: ["Quantum key distribution and network experiments in research corridors"],
      useCasesNow: ["Pilot secure links", "Research consortia"],
    },
    solar: {
      primer:
        "Solar photovoltaic turns sunlight into electricity — now among the cheapest new generation options in much of the world when sites and policy allow. Night and cloudy reliability need storage or backup. Local inventing thrives on roofs, pumps, clinics, and microgrids with honest battery pairing.",
      maturity: {
        now: "Cheap PV for roofs, clinics, pumps; storage needed for night and reliability.",
        near: "Even cheaper packs and integrated microgrids.",
        frontier: "Energy abundance limited mostly by land and politics.",
      },
      milestones: ["PV among cheapest new generation in much of the world"],
      useCasesNow: ["Clinic power", "Water pumping", "School lighting", "Microgrids"],
    },
    wind: {
      primer:
        "Wind power converts wind into electricity at utility or community scale. It is mature but intermittent and politically local (siting, wildlife, views). Pair with storage, demand flexibility, or firm power for clinics and industry that cannot wait for the wind.",
      maturity: {
        now: "Mature onshore/offshore turbines; siting and grid flexibility are the fights.",
        near: "Better storage pairing and community ownership models.",
        frontier: "Wind plus storage as default cheap power with little friction.",
      },
      milestones: ["Record capacity additions", "Long multi-year cost declines in many markets"],
      useCasesNow: ["Community turbines", "Coastal wind with storage", "Industrial offtake"],
    },
    wave: {
      primer:
        "Wave power harvests energy from ocean swells. Potential is large; surviving storms and hitting cost targets remains hard. Invent as harbor or island pilots with patient capital — not as a universal coastal default this decade.",
      maturity: {
        now: "Mostly pilots; storm survival and cost still hard.",
        near: "Harbor-scale arrays with better reliability.",
        frontier: "Cheap wave power along any energetic coast.",
      },
      milestones: ["Multi-year pilot arrays surviving harsh sea states"],
      useCasesNow: ["Island harbor pilots", "Research co-location with ports"],
    },
    nuclear: {
      primer:
        "Nuclear fission offers dense, firm low-carbon power. Large plants and emerging small modular reactors face cost, trust, waste, and schedule challenges. Local inventing is usually regional planning and industrial heat partnership — not a backyard reactor for one ward.",
      maturity: {
        now: "Large plants and some SMRs under construction or early operation; trust and cost dominate.",
        near: "More SMR deployments and factory-built modules.",
        frontier: "Plug-and-play firm nuclear for every city that wants it.",
      },
      milestones: ["First commercial SMR projects", "Life-extension of existing fleets"],
      useCasesNow: ["Regional firm power planning", "Industrial heat partnerships"],
    },
    battery: {
      primer:
        "Batteries store electricity for later — evening clinic lights, EV fleets, solar firming. They make intermittent renewables local and useful. Chemistries improve; mining, fire safety, and recycling remain design constraints. Invent for real kilowatt-hours and duty cycles, not infinite free storage.",
      maturity: {
        now: "Li-ion packs for EVs and home/clinic storage; density and cost still improving.",
        near: "Safer denser chemistries more common at local scale.",
        frontier: "Storage ceases to be the bottleneck for most local renewables.",
      },
      milestones: ["Multi-year cost declines enabling home and grid storage pilots"],
      useCasesNow: ["Evening clinic power", "EV fleets", "Solar firming"],
    },
    space: {
      primer:
        "Space systems — especially satellites — already deliver weather, imaging, and connectivity that towns use on the ground. Local inventing is about using orbital data and links for flood maps, crop stress, or backhaul — not building a launch pad in the mission place.",
      maturity: {
        now: "Earth observation, weather, and connectivity constellations already local-relevant.",
        near: "Cheaper revisit times and more direct-to-device links.",
        frontier: "Instant global sensing and connectivity with no gaps.",
      },
      milestones: ["Dense LEO constellations for broadband and frequent imaging"],
      useCasesNow: ["Flood and crop maps", "Backhaul connectivity", "Disaster situational awareness"],
    },
    materials: {
      primer:
        "Material science designs solids and surfaces — strength, filtration, insulation, conductivity. Better materials make flood barriers, lighter rebuilds, cleaner water, and better batteries possible. Invent for what the place must withstand, with recycling and toxicity in the story.",
      maturity: {
        now: "Advanced composites, membranes, and coatings in industrial supply chains.",
        near: "Cheaper high-performance materials for local builders.",
        frontier: "Self-healing programmable materials as default building stock.",
      },
      milestones: ["Commercial membranes", "Lighter structures", "Better thermal materials"],
      useCasesNow: ["Flood barriers", "Filters", "Lighter rebuild materials"],
    },
    nano: {
      primer:
        "Nanotechnology engineers matter at nanometer scale for drug delivery, sensors, and coatings. Regulated products already exist; general nanofactories do not. Invent with safety data and dual-use caution — especially for medical or environmental release.",
      maturity: {
        now: "Nanomedicine delivery, coatings, and sensors in regulated products.",
        near: "Broader clinical and filtration uses with clearer safety data.",
        frontier: "General-purpose nanofactories in every clinic.",
      },
      milestones: ["Approved nanomedicine formulations", "Commercial nano-coatings"],
      useCasesNow: ["Targeted drug-delivery pilots", "Water and air filters", "Protective coatings"],
    },
    "genetic-engineering": {
      primer:
        "Genetic engineering changes genomes for crops, therapies, or industrial microbes under regulation and ethics debates. Local inventing may mean resilience crops or clinical pathways with institutions — not open DIY editing of ecosystems.",
      maturity: {
        now: "Engineered crops, select gene therapies, industrial microbes under regulation.",
        near: "More therapies and climate-resilient crops with governance fights.",
        frontier: "Open local genome editing as everyday DIY infrastructure.",
      },
      milestones: ["Approved CRISPR therapies", "Widely planted engineered crops in some regions"],
      useCasesNow: ["Specialty crop resilience", "Clinical gene-therapy pathways", "Industrial microbes"],
    },
    "gene-sequencing": {
      primer:
        "Gene sequencing reads DNA/RNA to identify pathogens, risks, and sometimes guide care. Outbreak vans and wastewater surveillance already exist. Invent for speed-to-action and privacy — a sequence without response is only a file.",
      maturity: {
        now: "Portable and lab sequencers map pathogens and clinical panels routinely in capable systems.",
        near: "Faster bedside panels and lower-cost whole genomes.",
        frontier: "Instant full biological readout for any sample by anyone.",
      },
      milestones: ["Outbreak sequencing vans", "Wastewater genomic surveillance"],
      useCasesNow: ["Pathogen ID", "Wastewater surveillance", "Targeted diagnostics"],
    },
    "alt-proteins": {
      primer:
        "Alternative proteins — plant, fermentation, cultivated — aim to deliver nutrition with less land and emissions intensity. Culture, cost, and energy still gate adoption. Invent for school and clinic menus or local fermentation, not overnight replacement of every diet.",
      maturity: {
        now: "Plant and fermentation proteins on shelves; cultivated meat mostly pilot/early market.",
        near: "Price parity in more categories; clearer labeling and energy costs.",
        frontier: "Default protein with negligible land and animal use everywhere.",
      },
      milestones: ["Supermarket plant/fermentation proteins", "Limited cultivated-meat approvals"],
      useCasesNow: ["School/clinic protein menus", "Local fermentation hubs", "Supply-shock buffers"],
    },
  };
  const s = seeds[id] || {
    primer: `${name} is an emerging-technology family with real-world pilots and products in some form. Use it for local inventions when the mechanism fits this place — and keep claims matched to what is actually possible this year.`,
    maturity: {
      now: summary || `${name} has real-world deployments in some form today.`,
      near: `Broader, cheaper, more reliable ${name} applications.`,
      frontier: `Transformative ${name} as default infrastructure everywhere.`,
    },
    milestones: [`Ongoing real-world pilots and products in the ${name} category.`],
    useCasesNow: [summary || `Applied ${name} with human oversight`],
  };
  return s;
}

/** Soft horizon only — never use as a pick lock */
export function isTechReady(tech, year) {
  return true; // categories are always choosable; feasibility judges claims
}

/** Soft: years until "near" use cases become more routine (for copy only) */
export function techHorizonYear(tech) {
  return tech.readyYear || GAME.startYear;
}

export function globalById(id) {
  return GLOBALS.find((g) => g.id === id);
}

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id);
}

export function missionsForGlobal(globalId) {
  return MISSIONS.filter((m) => m.globalId === globalId);
}

/** Valid tech ids for scenario suggested stacks */
export function allTechIds() {
  return TECHS.map((t) => t.id);
}

export const VISION_THEME_IDS = [
  "coastal-city",
  "food-city",
  "care-city",
  "energy-city",
  "learn-city",
  "rebuild-city",
  "social-city",
  "ocean-city",
];

/**
 * Client-side local scenario pack when the API is offline.
 * Produces multiple concrete places per global theme.
 */
export function localScenariosForGlobal(global, { count = 4, salt = 0 } = {}) {
  const g = typeof global === "string" ? globalById(global) : global;
  if (!g) return [];
  // Prefer seed angle packs (quality default for every theme). Flagship MISSIONS
  // still win when they share a place/title — otherwise packs fill all four slots.
  const seeds = missionsForGlobal(g.id).map((m) => ({ ...m, source: "curated" }));
  const generated = buildLocalScenarioVariants(g, Math.max(count, 4), salt).map((m) => ({
    ...m,
    source: "curated",
  }));
  const out = [];
  const seenPlaces = new Set();
  // Packs first so asteroid/nuclear etc. show the new planetary-scale set;
  // then any unique flagship MISSIONS not already represented.
  for (const m of [...generated, ...seeds]) {
    const key = (m.place || m.title || "").toLowerCase();
    if (seenPlaces.has(key)) continue;
    seenPlaces.add(key);
    out.push(m);
    if (out.length >= count) break;
  }
  let extra = 1;
  while (out.length < count) {
    const more = buildLocalScenarioVariants(g, count, salt + extra * 17);
    for (const m of more) {
      const key = (m.place || m.title || "").toLowerCase();
      if (seenPlaces.has(key)) continue;
      seenPlaces.add(key);
      out.push({ ...m, source: "curated" });
      if (out.length >= count) break;
    }
    extra += 1;
    if (extra > 8) break;
  }
  return out.slice(0, count);
}

/** Bump when seed scenes change so generated ids never collide with old caches. */
const SCENARIO_PACK_REV = "d6";

function buildLocalScenarioVariants(g, count, salt) {
  const packs = SCENARIO_ANGLE_PACKS[g.id] || SCENARIO_ANGLE_PACKS._default;
  const suggestedDefault = DEFAULT_SUGGESTED_BY_KIND[g.kind] || DEFAULT_SUGGESTED_BY_KIND.now;
  const visionDefault = DEFAULT_VISION_BY_GLOBAL[g.id] || "rebuild-city";
  const n = Math.max(count, packs.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const pack = packs[(i + salt) % packs.length];
    const place = pickRot(pack.places, i + salt);
    const title = pack.title.replace("{place}", place);
    const scene = pack.scene.replace(/\{place\}/g, place).replace(/\{theme\}/g, g.title);
    // Explicit crisis perspectives (local harm / global-systemic / support-social)
    const meters =
      pack.crisisMeters && typeof pack.crisisMeters === "object"
        ? pack.crisisMeters
        : null;
    // Legacy packs used pressureKeys[0/1/2] — still accept if any remain
    const legacyKeys = Array.isArray(pack.pressureKeys) ? pack.pressureKeys : null;
    const roles = ["local", "global", "support"];
    const defaults = ["Pressure", "Cost", "Trust"];
    const pressure = {};
    roles.forEach((role, ki) => {
      const labelRaw =
        (meters && meters[role] != null ? meters[role] : null) ??
        legacyKeys?.[ki] ??
        defaults[ki];
      if (labelRaw == null || labelRaw === false) return; // omit role if pack sets null
      const label = String(labelRaw).slice(0, 40);
      if (!label) return;
      pressure[role] = {
        label,
        pressure: 2 + ((i + ki + salt) % 2),
        pressureRise: ki === 2 ? 0 : 1,
        winMax: 1,
      };
    });
    const collapseYear = 2032 + ((i + salt) % 3) * 2;
    out.push({
      id: `gen-${g.id}-${i}-${salt}-${SCENARIO_PACK_REV}`,
      globalId: g.id,
      title,
      place,
      startYear: GAME.startYear,
      collapseYear,
      yearsPerTurn: GAME.yearsPerTurn,
      pressure,
      scene,
      stakeholder: pack.stakeholder,
      suggested: pack.suggested || suggestedDefault,
      visionTheme: pack.visionTheme || visionDefault,
      source: "generated",
    });
  }
  return out;
}

function pickRot(arr, i) {
  return arr[Math.abs(i) % arr.length];
}

const DEFAULT_SUGGESTED_BY_KIND = {
  before: ["ai", "networks", "iot", "computing", "crypto"],
  now: ["ai", "iot", "networks", "solar", "battery", "drones"],
};

const DEFAULT_VISION_BY_GLOBAL = {
  climate: "coastal-city",
  weather: "coastal-city",
  water: "coastal-city",
  infectious: "care-city",
  cancer: "care-city",
  maternal: "care-city",
  child: "care-city",
  mental: "care-city",
  alzheimer: "care-city",
  ageing: "care-city",
  education: "learn-city",
  automation: "social-city",
  refugees: "rebuild-city",
  homeless: "rebuild-city",
  food: "food-city",
  ag: "food-city",
  energy: "energy-city",
  "energy-access": "energy-city",
  air: "energy-city",
  eco: "ocean-city",
  rogue: "social-city",
  "rogue-si": "social-city",
  coord: "coastal-city",
  cities: "rebuild-city",
  slavery: "social-city",
  women: "social-city",
  poverty: "rebuild-city",
  nuclear: "energy-city",
  asteroid: "rebuild-city",
  "chem-bio": "care-city",
  mideast: "rebuild-city",
  radicalization: "social-city",
  fgm: "care-city",
  "short-termism": "rebuild-city",
  misinfo: "social-city",
  totalitarianism: "social-city",
  "women-stem": "learn-city",
  memory: "social-city",
  "rural-roads": "rebuild-city",
  smoking: "care-city",
  sanitation: "rebuild-city",
  waste: "rebuild-city",
  reproductive: "care-city",
  amr: "care-city",
};

/** Curated angle packs (seeded in scenario-seeds.js); unknown themes → _default */
const SCENARIO_ANGLE_PACKS = new Proxy(SEED_ANGLE_PACKS, {
  get(target, prop, receiver) {
    if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
    if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
    if (prop === "_default") return target._default;
    return target._default;
  },
});

export function techById(id) {
  return TECHS.find((t) => t.id === id);
}

export function domainsInStack(techs) {
  return [...new Set(techs.map((t) => t.domain))];
}

/** Heuristic stretch detector for how-it-works text (client fallback; AI assess can override) */
export const FRONTIER_CLAIM_PATTERNS = [
  /quantum\s*internet/i,
  /entangle(ment)?\s*(network|link).*(every|city|all)/i,
  /full(y)?\s*autonomous\s*(city|fleet|everything)/i,
  /mind\s*control|upload(ed)?\s*consciousness/i,
  /unlimited\s*energy|free\s*energy/i,
  /teleport/i,
  /cure\s*all\s*cancer\s*overnight/i,
  /bci.*(everyone|consumer|mass|all residents)/i,
  /programmable\s*(city|building|street)s?\s*that\s*grow/i,
  /living\s*(city|building|infrastructure)\s*(that|which)\s*(grow|heal|rebuild)/i,
  /general[- ]purpose\s*quantum/i,
  /nanobot\s*(swarm|army).*(cure|clean|fix)/i,
  /replace\s*all\s*(doctors|teachers|drivers)/i,
];

/** Pilot-honest language softens longer-horizon categories */
const PILOT_LANGUAGE =
  /\b(pilot|trial|partnership|partner with|lab|research|limited|mapped corridor|geofenced|supervised|clinical|opt[- ]in|phase\s*1|prototype|with oversight|human[- ]in[- ]the[- ]loop)\b/i;

/** Exported for run scoring / honesty without leaking private regex imports elsewhere */
export function hasPilotLanguage(text) {
  return PILOT_LANGUAGE.test(String(text || ""));
}

/** Routine/universal claims that stretch "near" capabilities */
const ROUTINE_LANGUAGE =
  /\b(routine|every(one| resident)?|all residents|city[- ]wide|guarantees|always|overnight|fully automatic|no human|autonomous everywhere|municipal default)\b/i;

/**
 * Score timing of CLAIMS, not whether a category card is "unlocked".
 * Categories are always pickable; frontier/over-claim language is what goes red.
 */
export function detectClaimStretch(howText, techs, year) {
  const text = `${howText || ""}`.trim();
  if (text.length < 20) {
    return {
      level: "yellow",
      reason: "Need a clearer how-it-works to judge whether claims match this year's capabilities.",
    };
  }

  if (FRONTIER_CLAIM_PATTERNS.some((re) => re.test(text))) {
    return {
      level: "red",
      reason:
        "How-it-works treats frontier capability as routine now — revise toward pilots, partnerships, or near-term tools.",
    };
  }

  const stack = techs || [];
  // Soft horizon: categories whose "near" use cases often get more common later
  const softHorizon = stack.filter((t) => (t.readyYear || year) > year + 2);
  const hasPilot = PILOT_LANGUAGE.test(text);
  const hasRoutine = ROUTINE_LANGUAGE.test(text);

  // Explicit frontier maturity mentioned as already done
  const frontierWords =
    /\b(frontier|sci[- ]?fi|fully programmable life|general AGI|mind upload|unlimited clean power)\b/i;
  if (frontierWords.test(text) && !hasPilot) {
    return {
      level: "red",
      reason: "Story leans on frontier outcomes without pilot framing for this year.",
    };
  }

  if (softHorizon.length && hasRoutine && !hasPilot) {
    return {
      level: "yellow",
      reason: `${softHorizon
        .map((t) => t.name)
        .join(", ")} can be in the stack, but city-wide/routine claims fit better as pilots this year.`,
    };
  }

  if (softHorizon.length && !hasPilot && text.length < 80) {
    return {
      level: "yellow",
      reason: `Stack includes longer-horizon categories (${softHorizon
        .map((t) => t.name)
        .join(", ")}). Spell a near-term mechanism (pilot, partner, corridor) so timing stays honest.`,
    };
  }

  if (softHorizon.length && hasPilot) {
    return {
      level: "green",
      reason: `Near-term/pilot framing looks compatible with ${year} — longer-horizon categories used honestly.`,
    };
  }

  // Check stack "now" use cases for vague totalizing claims on mature stacks
  if (hasRoutine && stack.some((t) => (t.curve || "") === "early")) {
    return {
      level: "yellow",
      reason: "Universal claims on early-curve tech — prefer scoped pilots and named partners.",
    };
  }

  return {
    level: "green",
    reason: `Claims look compatible with near-term capabilities of this stack in ${year}.`,
  };
}

/** Serialize tech for co-inventor / assess APIs (includes capability seeds) */
export function techForAi(t, year = GAME.startYear) {
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    domain: t.domain,
    summary: t.summary,
    scarcity: t.scarcity,
    risk: t.risk,
    readyYear: t.readyYear, // soft horizon only
    softHorizon: t.readyYear,
    maturity: t.maturity || null,
    milestones: t.milestones || [],
    useCasesNow: t.useCasesNow || [],
    alwaysPickable: true,
  };
}

/** News lines when the clock advances */
export const YEAR_NEWS = [
  { minYear: 2026, text: "Sensor kits get cheaper; community networks light up." },
  { minYear: 2028, text: "Battery packs for clinics drop in price again." },
  { minYear: 2028, text: "Local 3D print shops take municipal contracts." },
  { minYear: 2030, text: "Autonomy pilots expand on fixed routes." },
  { minYear: 2030, text: "Gene sequencing vans become almost routine." },
  { minYear: 2032, text: "Specialized quantum cloud jobs open for research partners." },
  { minYear: 2032, text: "Alternative proteins hit cafeteria budgets in pilot cities." },
  { minYear: 2034, text: "Long-horizon quantum links leave the lab in limited trials." },
];

/**
 * Foresight bank for learn screen — milestones (what is already real),
 * trends (direction of travel), predictions (labeled forecasts).
 */
export const FORESIGHT = [
  { kind: "milestone", techIds: ["solar", "wind", "battery", "energy"], text: "Utility-scale solar and wind are already among the cheapest new electricity sources in much of the world when paired with storage." },
  { kind: "trend", techIds: ["battery", "solar", "wind"], text: "Battery pack costs have fallen for over a decade, enabling local microgrids and evening power." },
  { kind: "prediction", techIds: ["battery", "self-driving"], text: "Prediction: dense solid-state and next-gen packs further cut cost and fire risk this decade — still uncertain on exact year." },
  { kind: "milestone", techIds: ["ai", "computing", "networks"], text: "AI copilots and assistive models are already in clinics, schools, and logistics software worldwide." },
  { kind: "trend", techIds: ["ai", "computing"], text: "Inference is moving to the edge; smaller models get cheaper to run locally and offline." },
  { kind: "prediction", techIds: ["ai", "bci"], text: "Prediction: clinical brain–computer interfaces expand from pilot trials to routine speech/motor restoration for narrow patient groups." },
  { kind: "milestone", techIds: ["drones", "robots"], text: "Medical and inspection drone corridors already operate in several countries for blood, vaccines, and infrastructure checks." },
  { kind: "trend", techIds: ["drones", "robots", "iot"], text: "Autonomy expands first on fixed routes and mapped sites, then into messier open environments." },
  { kind: "prediction", techIds: ["self-driving", "transportation"], text: "Prediction: driverless shuttles on geofenced corridors become normal in some cities before fully open-road robotaxis everywhere." },
  { kind: "milestone", techIds: ["gene-sequencing", "genetic-engineering", "synbio"], text: "Pathogen sequencing during outbreaks and early gene therapies are real clinical tools, not only lab demos." },
  { kind: "trend", techIds: ["gene-sequencing", "ai"], text: "Time from sample to sequence continues to shrink; AI helps interpret results for non-specialists." },
  { kind: "prediction", techIds: ["alt-proteins", "synbio"], text: "Prediction: alternative proteins reach price parity in more markets — adoption still depends on culture, regulation, and energy costs." },
  { kind: "milestone", techIds: ["iot", "networks"], text: "Cities and utilities already deploy sensor networks for floods, leaks, air quality, and grid stress." },
  { kind: "trend", techIds: ["iot", "networks", "crypto"], text: "Sensing gets cheaper; the hard part is governance — who owns the data and who acts on alerts." },
  { kind: "prediction", techIds: ["quantum", "quantum-internet"], text: "Prediction: useful quantum applications stay narrow (materials, optimization niches) before general-purpose quantum networking." },
  { kind: "milestone", techIds: ["print3d", "materials"], text: "Additive manufacturing already produces tools, spare parts, and some medical devices at local workshops." },
  { kind: "trend", techIds: ["print3d", "materials", "nano"], text: "Design files travel as bits; local fabrication capacity spreads as materials and printers improve." },
  { kind: "prediction", techIds: ["space", "ai"], text: "Prediction: denser Earth-observation and connectivity constellations make near-real-time local environmental data routine for small towns." },
  { kind: "milestone", techIds: ["nuclear", "geothermal"], text: "Nuclear and geothermal already supply firm low-carbon power in regions that built them; new advanced designs are still ramping." },
  { kind: "trend", techIds: ["nuclear", "geothermal", "tidal", "wave"], text: "Interest in firm clean power rises wherever grids hit renewable intermittency walls." },
  { kind: "prediction", techIds: ["tidal", "wave"], text: "Prediction: marine energy stays site-limited; winners are harbors and islands with strong resources and patient capital." },
  // theme-linked
  { kind: "milestone", globalIds: ["climate", "weather", "water"], text: "Milestone: climate attribution science and local flood/heat early-warning systems are already used by cities." },
  { kind: "trend", globalIds: ["climate", "energy-access", "air"], text: "Trend: electrification of transport and cooking continues where grids and wallets allow — uneven by district." },
  { kind: "prediction", globalIds: ["climate", "coord"], text: "Prediction: places that share sensors and response funds across jurisdictions will outpace those that wait for national programs." },
  { kind: "milestone", globalIds: ["infectious", "cancer", "maternal", "child"], text: "Milestone: genomic surveillance and telemedicine expanded rapidly after recent pandemics, then stalled where funding and trust failed." },
  { kind: "trend", globalIds: ["education", "automation"], text: "Trend: hybrid human+AI teaching and training spreads first where teachers and workers are scarcest." },
  { kind: "prediction", globalIds: ["refugees", "homeless"], text: "Prediction: modular shelter + digital identity systems scale in crises only if local legitimacy and funding are solved first." },
];

export function foresightForStack(techIds, globalId, year = 2026) {
  const set = new Set(techIds || []);
  const pick = (kind) => {
    const pool = FORESIGHT.filter((f) => {
      if (f.kind !== kind) return false;
      const techHit = (f.techIds || []).some((id) => set.has(id));
      const globalHit = (f.globalIds || []).includes(globalId);
      return techHit || globalHit;
    });
    if (!pool.length) {
      const fallback = FORESIGHT.filter((f) => f.kind === kind);
      return fallback[Math.floor(Math.random() * fallback.length)] || null;
    }
    // Prefer tech hits
    const techPool = pool.filter((f) => (f.techIds || []).some((id) => set.has(id)));
    const use = techPool.length ? techPool : pool;
    return use[Math.floor(Math.random() * use.length)];
  };
  return {
    year,
    milestone: pick("milestone"),
    trend: pick("trend"),
    prediction: pick("prediction"),
  };
}

/**
 * Challenge faces that attack the invention.
 * visual: static asset under assets/challengers/{id}.jpg
 */
export const CHALLENGE_ANGLES = [
  {
    id: "moloch",
    label: "Moloch",
    subtitle: "System game mechanics",
    blurb:
      "The multipolar trap: races, freeriding, Goodhart’s law, and race-to-the-bottom dynamics that punish good design.",
    visual: "assets/challengers/moloch.jpg",
  },
  {
    id: "ethicist",
    label: "Ethicist",
    subtitle: "Hard tradeoffs",
    blurb:
      "Ethical dilemmas with no clean good/bad answer — dignity, bias, dual-use, who is harmed when you scale.",
    visual: "assets/challengers/ethicist.jpg",
  },
  {
    id: "stakeholder",
    label: "Stakeholder",
    subtitle: "Officials & community",
    blurb:
      "City officials and community leaders: funding, permits, policy, and public support you must negotiate.",
    visual: "assets/challengers/stakeholder.jpg",
  },
  {
    id: "nature",
    label: "Mother Nature",
    subtitle: "The natural world",
    blurb:
      "Energy, materials, ecology, disease, storms — the physical world advances on its own terms.",
    visual: "assets/challengers/nature.jpg",
  },
];
