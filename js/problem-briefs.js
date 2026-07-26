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
  radicalization: {
    currentState:
      "Violent extremism and radicalization still recruit through prejudice, online pipelines, and offline grievances. Prevention programs exist in schools and communities, but coverage is uneven and often reacts after harm rather than disarming pathways early.",
    rootCauses:
      "Identity conflict, dehumanizing propaganda, social exclusion, weak rule of law, and platforms that amplify grievance faster than dialogue. Young people are targeted early—on school benches and online—before offline violence.",
    warnings:
      "Disarming radicalization starts with human rights, dialogue across boundaries, and youth empowerment—not mass surveillance or predictive “terror scores.” Dual-use watchlists can become tools of discrimination. Prefer off-ramps, media literacy, and community legitimacy.",
  },
  fgm: {
    currentState:
      "More than 200 million girls and women alive today have undergone FGM; millions more remain at risk each year. Prevalence has fallen in many countries—a girl is about one-third less likely to undergo FGM than thirty years ago—yet progress is uneven and COVID-era disruptions set programs back.",
    rootCauses:
      "Social norms, marriageability pressure, practitioner livelihoods, weak enforcement, and cross-border “cutting season” mobility. Attitudes are shifting in many places where girls and women who know of FGM say it should end, but practice can lag belief.",
    warnings:
      "Invent for community-led abandonment, girls’ education and protection, and survivor care—never graphic “rescue” theater or shaming gadgets. Do not medicalize FGM as a clinical upgrade. Center local women’s leadership, confidentiality, and dignity.",
  },
  "short-termism": {
    currentState:
      "Households and communities under pressure still liquidate long-term assets for immediate survival: farmers slaughter dairy cows in famine; forests are burned for this season’s field. The same pattern appears in politics and firms that raid the future for short returns.",
    rootCauses:
      "Poverty traps and missing safety nets force high discount rates; insecure land and resource rights; markets and politics that reward this quarter’s yield over decades of soil, forest, and resilience capital.",
    warnings:
      "Related to poverty, but the core problem is temporal tradeoff. Invent incentives and buffers that make protecting tomorrow rational today—not lectures that ignore empty stomachs. Avoid “green” schemes that lock the poor out of livelihoods without alternatives.",
  },
  misinfo: {
    currentState:
      "Shared facts and institutional trust are under pressure from algorithmic amplification, cheap synthetic media, and hollowed local journalism. Falsehoods travel faster than corrections; crises (health, elections, disasters) become epistemic emergencies as well as physical ones.",
    rootCauses:
      "Attention economies reward outrage; verification is costly; AI lowers the cost of convincing fakes; polarisation and weak media literacy erode common ground; underfunded public-interest media leave rumor unchallenged.",
    warnings:
      "Do not invent “AI deletes wrongthink” as a clean win. Prefer provenance, local trusted intermediaries, and user agency. Surveillance framed as anti-disinfo can silence legitimate speech. Design for correction speed and dignity, not purity police.",
  },
  totalitarianism: {
    currentState:
      "Strict totalitarian systems still isolate populations through repression, indoctrination, and information monopoly. Broader autocracy has expanded; tools that help people access free media, communicate, and organize are scarce where they are needed most.",
    rootCauses:
      "Concentrated coercive power, state media monopolies, censorship infrastructure, fear of association, and international free-riding when isolated populations cannot be reached safely.",
    warnings:
      "People need free media, language bridges, censorship circumvention, and safer collective action—not better state surveillance. Dual-use is extreme: tools can be seized. Prefer sousveillance and mutual aid designs that do not require a friendly regime.",
  },
  "women-stem": {
    currentState:
      "Only about 35% of STEM students in higher education globally are women. Girls often perform well early, then leave math and science pathways at secondary and tertiary transitions; workplace retention in labs and tech roles remains unequal.",
    rootCauses:
      "Stereotypes, unsafe or distant schools, household labor, hostile lab cultures, missing mentors and role models, and care infrastructure that falls on women after degrees. This is a STEM pipeline problem—not the whole of equal rights.",
    warnings:
      "Do not invent “one inspirational app” as the whole solution. Prefer safe transit, lab culture, scholarships with placement, and care near workplaces. Distinct from general women’s rights inventing (safety, law, political voice)—keep the focus on science and engineering pathways.",
  },
  memory: {
    currentState:
      "Human memory is incomplete and unreliable even in healthy people. For the first time, ordinary people can create rich multimedia records of lived experience—yet most life is still uncaptured, unsearchable, or locked in formats that will rot.",
    rootCauses:
      "Biological forgetting; lack of affordable, private capture tools; organizational churn that erases institutional knowledge; cultural loss when elders’ stories are never recorded; digital obsolescence of media and formats.",
    warnings:
      "This is not Alzheimer or dementia care. Invent for documenting and preserving experience—personal, community, and institutional—with consent and privacy. Life-logging without control becomes surveillance. Prefer user-owned archives and dignified legacy, not forced total recall.",
  },
  "rural-roads": {
    currentState:
      "On the order of a billion rural people live more than about 2 km from an all-season road. Isolation from markets, clinics, and schools is a core poverty trap feature—“to be poor is to be isolated.” Rainy seasons and terrain cut access further.",
    rootCauses:
      "Underinvestment in rural infrastructure, weak maintenance after ribbon-cutting, difficult terrain and climate, and political bias toward visible urban projects over last-mile connectivity.",
    warnings:
      "A road without maintenance is a temporary promise. Invent for all-weather access, clinic and market logistics, and upkeep incentives—not only one-time construction theater. Watch displacement and land grabs framed as “corridor development.”",
  },
  smoking: {
    currentState:
      "Over a billion people still use tobacco regularly; smoking kills millions yearly and remains concentrated in lower-income countries even as high-income rates fall. Secondhand smoke and youth nicotine uptake (including new products) keep the epidemic alive.",
    rootCauses:
      "Addiction biology, industry marketing, retail density, weak cessation services, and lagging regulation where enforcement is thin. Social norms and stress keep initiation high among youth in some places.",
    warnings:
      "Shame-only campaigns fail people with least access to cessation. Invent for initiation prevention, affordable quit support, and secondhand protection—not surveillance of smokers without care. Avoid industry-capture “solutions.”",
  },
  sanitation: {
    currentState:
      "Billions still lack safely managed sanitation; over a billion lack even basic private toilets or latrines, and hundreds of millions practice open defecation. Urban sewers lag informal growth; school toilets and fecal sludge systems remain weak links.",
    rootCauses:
      "Cost of toilets and sewers, underfunded utilities, stigma, land tenure barriers in informal settlements, and neglect of the full chain from latrine to safe treatment.",
    warnings:
      "This is toilets, sewage, and hygiene—not drinking-water filtration alone (see Clean Water). Sensors without emptying and treatment are theater. Prefer dignity, gender-safe school facilities, and safe sludge economies over luxury smart-toilet hype for the already served.",
  },
  waste: {
    currentState:
      "Cities generate on the order of two billion tons of municipal solid waste yearly, plus huge e-waste and hazardous streams. Recycling and circular systems grow but lag production; landfills, open dumps, and plastic-clogged drains still dominate many places.",
    rootCauses:
      "Linear production, cheap single-use packaging, weak collection, informal-sector exclusion from formal plans, and global waste trade that shifts harm to poorer regions.",
    warnings:
      "Do not invent “export the trash” as local success. Design with informal pickers’ livelihoods, real material recovery, and reduction at source. E-waste burning and plastic-choked floods need systems, not one-off beach cleanups as the whole invent.",
  },
  reproductive: {
    currentState:
      "Sexual and reproductive health means people can have a safe sex life and decide if, when, and how often to reproduce. Contraceptive access has improved globally but remains low in many regions; STIs, infertility care, and confidential services for all genders lag.",
    rootCauses:
      "Stockouts, stigma, provider bias, cost, restrictive policy, and services designed only around pregnancy—not men, partners, adolescents, or fertility care. FGM and forced marriage are related harms but not the whole of RH.",
    warnings:
      "This theme is for all people—not only women and children. Maternal emergency obstetric care is its own theme; FGM is its own theme. Invent for agency, privacy, STI care (including men), contraception choice, and fertility access—never coercive fertility control framed as good.",
  },
  amr: {
    currentState:
      "Bacteria and other microbes are evolving resistance to antibiotics and antimicrobials. Common infections and surgery become harder to treat; last-line drugs fail in hospitals while community misuse and farm use accelerate resistance. This is not a virus-outbreak theme—it is the erosion of antimicrobial effectiveness.",
    rootCauses:
      "Overuse and misuse of antibiotics in humans and animals, weak diagnostics that force blind treatment, poor infection control, and underinvestment in new antimicrobials and stewardship.",
    warnings:
      "Do not invent “another viral pandemic app” here. Prefer stewardship, rapid bacterial diagnostics, farm and pharmacy practice change, and access to the right drug—not unrestricted antibiotic vending. Preserve efficacy; do not invent systems that encourage more blind prescribing.",
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
