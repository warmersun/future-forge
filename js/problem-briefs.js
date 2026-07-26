/**
 * Static problem briefs for the mission screen (read while Quests draft).
 * Authored once at development time — not generated at runtime.
 * Each brief: currentState, rootCauses, warnings.
 */

/** @typedef {{ currentState: string, rootCauses: string, warnings: string }} ProblemBrief */

/** @type {Record<string, ProblemBrief>} */
export const PROBLEM_BRIEFS = {
  "rogue-si": {
    currentState:
      "Frontier AI systems already outperform humans on many narrow tasks and are being wired into search, code, finance, and government pilots. Full “superintelligence” is not here, but rapid capability gains and competitive deployment mean control and alignment lag behind capability in many institutions.",
    rootCauses:
      "Race dynamics reward speed over safety; evaluation of open-ended systems is hard; incentives favor productization; governance is fragmented across labs, states, and open-source ecosystems; once systems act at scale, reverse is costly.",
    warnings:
      "Local inventions that hand high-stakes decisions to opaque models can lock in harm before safeguards exist. Prefer human-in-the-loop, audit trails, and narrow scopes. Do not invent as if full autonomous AGI is already reliable infrastructure.",
  },
  genocide: {
    currentState:
      "Mass atrocity risk remains real in several regions. Early-warning networks, satellite monitoring, and civil-society alerts exist, but response is often late, politicized, or underfunded. Prevention is possible in theory; practice still fails when will and coordination fail.",
    rootCauses:
      "Identity conflict, dehumanizing propaganda, weak institutions, arms flows, and international free-riding. Information arrives, but incentives to act early are weak when costs are immediate and benefits diffuse.",
    warnings:
      "Tech for surveillance or targeting can dual-use into oppression. Prioritize civilian protection, verified information, and community legitimacy—not purely automated “threat scores.” Local inventions should not replace political accountability with black-box alerts.",
  },
  poverty: {
    currentState:
      "Extreme poverty has fallen globally over decades but remains concentrated; hundreds of millions still lack reliable income, services, and agency. Progress is uneven; shocks (conflict, climate, disease) reverse gains quickly for the most vulnerable.",
    rootCauses:
      "Exclusion from markets and services, weak property and labor rights, health and education gaps, geographic isolation, discrimination, and political voice gaps. Growth alone does not reach everyone without deliberate inclusion.",
    warnings:
      "Digital or fintech “solutions” can exclude people without IDs, connectivity, or literacy. Design for the last mile, cash + services where needed, and avoid debt traps or data extraction framed as help.",
  },
  "chem-bio": {
    currentState:
      "Chemical and biological weapons are banned under major treaties, yet dual-use research, lab accidents, and illicit intent remain risks. Detection, attribution, and public-health readiness are uneven worldwide.",
    rootCauses:
      "Knowledge and tools spread with legitimate science; verification is imperfect; norms can erode; preparedness funding rises after crises then fades; dual-use incentives in research and industry.",
    warnings:
      "Do not invent systems that make high-risk pathogens or toxins easier to produce. Prefer detection, PPE, medical countermeasures, and transparent governance. Dual-use claims need strict red lines in your how-it-works.",
  },
  asteroid: {
    currentState:
      "Near-Earth object surveys have improved dramatically; no known civilization-ending impact is imminent on short timescales, but incomplete catalogs and limited deflection readiness mean planetary defense is unfinished work.",
    rootCauses:
      "Vast search space, limited telescope and follow-up capacity historically, and rare-event underinvestment. Deflection tech is maturing from tests, not yet a standing global service.",
    warnings:
      "Local inventing is usually about sensing, public warning, and civil resilience—not city-scale deflection beams. Avoid sci-fi overclaim; focus on detection partnerships, drills, and recovery logistics if this theme is your frame.",
  },
  weather: {
    currentState:
      "Heat waves, floods, storms, and droughts are more frequent or intense in many regions under climate change. Early warning has improved, but last-mile alerts, infrastructure, and recovery funds still fail the poorest districts first.",
    rootCauses:
      "Warmer atmosphere and oceans load the dice for extremes; exposure grows with coastal and urban expansion; underinvestment in resilient infrastructure and social safety nets.",
    warnings:
      "Sensors without response plans are theater. Invent for warning-to-action loops, cooling/flood shelter, and equity—not only prettier dashboards. Timing matters: deploy usable pilots before the next season, not perfect models after.",
  },
  mideast: {
    currentState:
      "The Middle East holds layered conflicts, occupation dynamics, trauma, and fragile livelihoods alongside vibrant civil society, trade, and diplomacy efforts. Violence and displacement recur; peace processes are intermittent and contested.",
    rootCauses:
      "Historical grievances, borders and resource competition, external interventions, authoritarian and factional politics, and economic exclusion that fuels recruitment and despair.",
    warnings:
      "Local inventions should center livelihoods, trauma-aware care, and shared infrastructure—not “solve geopolitics” with a gadget. Avoid one-sided tech that increases surveillance or military asymmetry under a peace label.",
  },
  nuclear: {
    currentState:
      "Nuclear weapons states retain arsenals; modernization continues; arms-control architecture is frayed. Risk is less “movie countdown” than miscalculation, accident, or crisis escalation under compressed decision times.",
    rootCauses:
      "Security dilemmas, prestige, domestic politics of arsenals, imperfect early-warning and command systems, and erosion of treaties and norms.",
    warnings:
      "Local inventing almost never means building weapons. Focus on crisis communication resilience, civil protection literacy, and de-escalation tools. Do not glamorize launch systems or invent as if municipal actors control the nuclear button.",
  },
  slavery: {
    currentState:
      "Chattel slavery is illegal nearly everywhere, but forced labor, debt bondage, trafficking, and child labor persist in supply chains, domestic work, fishing, and conflict zones—often hidden from consumers.",
    rootCauses:
      "Profit from cheap coerced labor, weak enforcement, migration vulnerability, corruption, and opaque multi-tier supply chains that dilute accountability.",
    warnings:
      "Worker surveillance marketed as “compliance” can harm the people you claim to protect. Design with worker voice, safe reporting, and remedy—not only blockchain proofs for brands.",
  },
  women: {
    currentState:
      "Legal equality has advanced in many countries, yet gaps remain in safety, pay, political power, education access, and reproductive rights. Backlash and uneven enforcement reverse gains in some places.",
    rootCauses:
      "Patriarchal norms, economic dependence, violence and legal barriers, underrepresentation in institutions, and underinvestment in care infrastructure that falls disproportionately on women.",
    warnings:
      "Tech that ignores safety (e.g., public location sharing without controls) can increase harm. Center agency, privacy, and local women’s leadership—not savior gadgets designed elsewhere.",
  },
  education: {
    currentState:
      "School enrollment rose worldwide, but learning outcomes, teacher shortages, and digital divides leave huge talent unrealized. Crises and poverty still pull children out of classrooms.",
    rootCauses:
      "Underfunded schools, uneven teacher quality and pay, language and disability barriers, connectivity gaps, and opportunity costs of child labor or care work.",
    warnings:
      "AI tutors without teachers can widen gaps if only the well-connected benefit. Prefer tools that support educators, offline use, and local curricula—not pure replacement fantasies.",
  },
  automation: {
    currentState:
      "Automation and AI already reshape warehouses, offices, transport, and customer service. Some jobs vanish or deskill; new ones appear unevenly. Debates on UBI, reskilling, and shorter work weeks are live policy fights.",
    rootCauses:
      "Capital substitutes for routine labor where profitable; skills pipelines lag; social insurance was built for 20th-century employment; firms capture productivity gains without sharing.",
    warnings:
      "“Retrain everyone with an app” fails without real wages and placement. Invent for dignity, portable skills, and income bridges—not only efficiency for owners.",
  },
  refugees: {
    currentState:
      "Tens of millions are forcibly displaced. Host cities absorb arrivals into strained housing, schools, and clinics. Legal status, work rights, and integration pathways vary widely and change with politics.",
    rootCauses:
      "Conflict, persecution, climate stress, and failed asylum systems. Receiving countries underfund reception while origin crises persist.",
    warnings:
      "Biometric ID and tracking can become tools of exclusion. Design for dignity, language access, and housing/work—not warehouses of data without consent.",
  },
  ag: {
    currentState:
      "Industrial agriculture feeds billions but degrades soils, water, and biodiversity in many regions. Regenerative and precision practices are spreading, still minority share of global acreage.",
    rootCauses:
      "Short-term yield incentives, input lock-in, land inequality, climate stress, and markets that underprice ecological damage.",
    warnings:
      "High-tech farming that only works for large capital can lock out smallholders. Fit inventions to local soils, water, and farmer knowledge—not one-size export packages.",
  },
  food: {
    currentState:
      "The world produces enough calories overall, yet hunger and malnutrition persist through poverty, conflict, waste, and poor distribution. Price shocks hit low-income households first.",
    rootCauses:
      "Access and affordability, not only total production; supply-chain fragility; conflict; climate hits to harvests; and diets skewed by cheap ultra-processed calories.",
    warnings:
      "Food-tech that prices out the hungry is a photo-op. Prioritize cold chain, local production, and affordability—not only novel proteins for wealthy markets.",
  },
  eco: {
    currentState:
      "Biodiversity loss, deforestation, ocean degradation, and pollution continue at rates that threaten ecosystem services humans depend on. Protected areas and restoration efforts expand but lag drivers of loss.",
    rootCauses:
      "Habitat conversion, overharvest, invasive species, pollution, and climate change—driven by economic systems that externalize nature’s value.",
    warnings:
      "“Green” inventions can greenwash extractive projects. Measure real habitat and community outcomes. Avoid claiming full ecosystem recovery on short game timelines.",
  },
  infectious: {
    currentState:
      "Pandemic readiness improved in tools (sequencing, vaccines platforms) after COVID-19, but funding, trust, and equity in access remain fragile. Endemic diseases still kill millions yearly where systems are weak.",
    rootCauses:
      "Zoonotic spillover, dense travel, weak primary care, antimicrobial resistance, misinformation, and underfunded surveillance in high-risk regions.",
    warnings:
      "Outbreak tech without trust fails. Pair detection with communication and care capacity. Do not invent forced quarantine black boxes that destroy legitimacy.",
  },
  climate: {
    currentState:
      "Global temperatures and extreme weather trends are rising with cumulative emissions. Clean energy is scaling fast in many markets, yet fossil systems, lock-in, and adaptation gaps remain large.",
    rootCauses:
      "Fossil-based energy and industry, land-use change, and delayed collective action under free-rider incentives. Adaptation is underfunded relative to mitigation talk.",
    warnings:
      "Local climate inventions should cut real exposure or emissions locally—not offset theater. Timing: deploy near-term resilience while longer transitions run.",
  },
  cancer: {
    currentState:
      "Survival has improved for many cancers where screening and therapy are available; late diagnosis and unequal access still drive preventable deaths, especially in lower-resource regions.",
    rootCauses:
      "Biology of uncontrolled cell growth, aging populations, risk factors (tobacco, infections, pollution), and health-system bottlenecks in imaging, pathology, and treatment capacity.",
    warnings:
      "Do not invent “cure all cancer overnight.” Prefer earlier detection, triage, navigation, and access. Clinical claims need pilot honesty and partners.",
  },
  mental: {
    currentState:
      "Depression, anxiety, and related conditions are leading causes of disability worldwide. Demand for care exceeds supply of clinicians; stigma still blocks help-seeking in many communities.",
    rootCauses:
      "Social isolation, economic stress, trauma, substance use, underfunded services, and models of care that are clinic-centric rather than community-embedded.",
    warnings:
      "Chatbots are not a full clinical system. Design for crisis escalation paths, privacy, and human care—not isolation in an app that cannot intervene safely.",
  },
  alzheimer: {
    currentState:
      "Alzheimer’s and related dementias grow with aging populations. Disease-modifying options are limited and expensive; most care is family- and community-borne under high burden.",
    rootCauses:
      "Complex neurodegenerative biology, late diagnosis, limited therapies, and care systems unprepared for long progressive illness.",
    warnings:
      "Surveillance framed as “safety” can strip dignity. Invent for caregiver support, navigation, and respectful assistance—not only tracking devices.",
  },
  ageing: {
    currentState:
      "Lifespans lengthened; healthspan did not always keep pace. Longevity science is active, but most gains still come from public health, chronic-disease care, and social determinants—not miracle pills.",
    rootCauses:
      "Biological aging processes, lifestyle and environment, and systems built for shorter lives and acute care rather than long multimorbidity.",
    warnings:
      "Anti-aging hype outruns evidence. Local inventing should target function, mobility, and care access—not claims of reversing aging this decade for a whole city.",
  },
  water: {
    currentState:
      "Billions still lack safely managed drinking water or sanitation. Climate stress, pollution, and over-extraction hit wells and utilities; tanker economies fill gaps at high cost.",
    rootCauses:
      "Underinvestment in infrastructure, pollution, aquifer depletion, weak governance of shared waters, and poverty that prices households out of safe supply.",
    warnings:
      "Pumps without maintenance budgets fail. Design for local repair, energy for treatment, and fair allocation—not one-shot hardware drops.",
  },
  air: {
    currentState:
      "Ambient and household air pollution drive large disease burdens, especially near traffic, industry, and solid-fuel cooking. Monitoring improved; clean transitions are uneven.",
    rootCauses:
      "Fossil combustion, industrial emissions, dust, and indoor solid fuels—plus weak regulation and exposure inequality by neighborhood income.",
    warnings:
      "Sensors alone do not clean air. Couple measurement with enforceable sources cuts, clean cooking, and mobility shifts people can actually use.",
  },
  "energy-access": {
    currentState:
      "Hundreds of millions lack electricity or reliable supply; many more face costly, intermittent power. Solar and mini-grids expand access, still incomplete for productive uses and clinics.",
    rootCauses:
      "High grid extension costs, weak utilities, poverty, and fuels that are dirty or expensive at the margin. Policy and finance often lag technical possibility.",
    warnings:
      "First watts that die at dusk fail clinics. Pair generation with storage, maintenance training, and realistic load priorities.",
  },
  homeless: {
    currentState:
      "Visible homelessness and housing insecurity are rising in many cities even in wealthy countries. Shelter systems are overstretched; exits to stable housing lag inflow.",
    rootCauses:
      "Housing costs outpacing wages, mental health and substance gaps, weak tenancy protections, and underbuilt social housing—plus discharges from institutions without housing plans.",
    warnings:
      "Clearance and pure tech tracking without housing supply worsen harm. Invent for shelter quality, services linkage, and paths to stay housed.",
  },
  cities: {
    currentState:
      "Most humans will live in urban areas. Cities concentrate opportunity and inequality, heat islands, congestion, and service stress—while also hosting innovation capacity.",
    rootCauses:
      "Rapid urbanization, land and transport policy failures, fragmented governance across metro edges, and infrastructure lagging population growth.",
    warnings:
      "Smart-city stacks without democratic oversight become surveillance. Prefer public goods, mobility, and housing equity over gadget dashboards.",
  },
  child: {
    currentState:
      "Child mortality fell dramatically, yet preventable deaths from pneumonia, diarrhea, malaria, and malnutrition continue where primary care and vaccines lag. Nutrition and early development gaps shape lifelong outcomes.",
    rootCauses:
      "Poverty, weak primary care, vaccine and nutrition access gaps, water/sanitation failures, and maternal health links that start before birth.",
    warnings:
      "Family-facing inventions need caregiver trust and cold-chain reality. Avoid data collection without care capacity to act on results.",
  },
  maternal: {
    currentState:
      "Most maternal deaths are preventable with skilled care, emergency transport, and basic supplies—yet disparities remain huge between and within countries.",
    rootCauses:
      "Distance to facilities, shortages of midwives and blood/products, poverty, adolescent pregnancy, and care quality gaps including disrespectful treatment that deters use.",
    warnings:
      "Apps without ambulances and blood banks fail. Invent for referral, transport, and respectful skilled birth attendance—not only pregnancy trackers.",
  },
  coord: {
    currentState:
      "Cross-border and cross-city problems (storms, outbreaks, supply shocks) still meet fragmented budgets, data, and response funds. Pilots cooperate; standing shared capacity is rare.",
    rootCauses:
      "Sovereignty instincts, free-rider incentives, incompatible systems, and short political horizons that underfund shared early warning and pooled response.",
    warnings:
      "A shared dashboard without a shared fund or decision rights is theater. Design governance and incentives as carefully as the sensors.",
  },
};

/**
 * @param {string | { id?: string } | null | undefined} globalOrId
 * @returns {ProblemBrief | null}
 */
export function briefForGlobal(globalOrId) {
  if (!globalOrId) return null;
  const id = typeof globalOrId === "string" ? globalOrId : globalOrId.id;
  if (!id) return null;
  const b = PROBLEM_BRIEFS[id];
  if (!b) return null;
  if (!b.currentState?.trim() || !b.rootCauses?.trim() || !b.warnings?.trim()) return null;
  return b;
}
