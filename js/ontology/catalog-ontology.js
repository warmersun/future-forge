/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Instant Lane 1–2 ontology baseline for all 29 catalog emTechs.
 * Every family has researched 2026 reached capabilities and dated future forecasts,
 * respecting mature / steep / early capability curves without model calls.
 */

import { TECHS } from "../data.js";
import { polarityForTech } from "../hex/polarity.js";

/**
 * Curated capability tracks for all 29 TECHS in js/data.js.
 * Each entry provides:
 * - capability: operational mechanism
 * - trendSummary: plain-English rate/direction from historical milestones
 * - past (optional): earlier historical anchor milestone to make the trend visible
 * - reached: honest <=2026 milestone + 2–3 general use cases
 * - predicted: extrapolated >2026 milestone + 2–3 general use cases
 */
export const PACKS = {
  computing: {
    capability: "Local and cloud processors, memory, and edge servers that run software and models.",
    trendSummary: "Compute per dollar keeps compounding via specialized chips and efficient small servers.",
    past: { year: 2016, label: "Smartphone-scale SoCs put gigascale compute in pockets" },
    reached: {
      year: 2026,
      label: "Quiet mini-PCs and edge boxes run local databases and small models offline",
      useCases: [
        ["Room server box", "Store records, lessons, and maps inside a building when internet fails or is unsafe."],
        ["Offline scheduling & simulation", "Optimize routes, shifts, or water gates on secondhand local hardware."],
        ["Phone-first local tools", "Run lightweight calculators, forms, and translation on cheap handsets."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Watt-scale neural edge chips run rich multimodal workflows on battery power",
      useCases: [
        ["All-day solar edge node", "Run continuous video/sensor analysis on a pole-mounted solar box."],
        ["Pocket lab workstation", "Run heavy simulation and diagnostic pipelines on a rugged field tablet."],
      ],
    },
  },
  energy: {
    capability: "Generating, converting, and distributing electricity and heat for clinics, pumps, and homes.",
    trendSummary: "Modular microgrids and solid-state power electronics cut local setup cost each year.",
    past: { year: 2015, label: "Diesel generators dominate off-grid backup despite fuel cost" },
    reached: {
      year: 2026,
      label: "Smart inverters and modular microgrids balance local generation and critical loads",
      useCases: [
        ["Critical-load islanding", "Keep clinic fridges, lights, and water pumps running when the main grid drops."],
        ["Pay-as-you-go local meter", "Share a neighborhood microgrid fairly across households and workshops."],
        ["Heat-pump retrofit", "Turn modest electricity into high-efficiency heating or cooling for shared rooms."],
      ],
    },
    predicted: {
      year: 2030,
      label: "Autonomous plug-and-play DC nanogrids balance street-level power without engineers",
      useCases: [
        ["Peer-to-peer street grid", "Neighbors automatically trade surplus rooftop and battery power block by block."],
        ["Zero-downtime industrial heat", "Electrified thermal blocks power local food drying and manufacturing cleanly."],
      ],
    },
  },
  crypto: {
    capability: "Shared tamper-evident ledgers, programmable escrow, and low-fee digital transfers.",
    trendSummary: "Layer-2 rollups cut transaction fees below a cent, making small-value audit rails practical.",
    past: { year: 2020, label: "High mainnet fees limit public chains to large transfers" },
    reached: {
      year: 2026,
      label: "Sub-cent L2 ledgers and stablecoin rails settle transparent local grants and receipts",
      useCases: [
        ["Open co-op treasury", "Publish every incoming grant and outgoing payout so members can audit funds."],
        ["Milestone escrow", "Release maintenance or bounty funds automatically when a verified check passes."],
        ["Tamper-evident custody log", "Timestamp sample, supply, or inspection hashes so records cannot be silently altered."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Zero-knowledge credentials prove eligibility without exposing identity on-chain",
      useCases: [
        ["Private relief vouchers", "Prove residency or need to claim aid without creating a central surveillance list."],
        ["Offline-tolerant token sync", "Settle local vouchers over mesh/SMS and reconcile when a link returns."],
      ],
    },
  },
  quantum: {
    capability: "Quantum processors that simulate molecular chemistry and tackle specialized optimization.",
    trendSummary: "Error-mitigated qubit counts are rising, though practical fault-tolerance is still years out.",
    past: { year: 2019, label: "First noisy 50+ qubit benchmark demonstrations in physics labs" },
    reached: {
      year: 2026,
      label: "Cloud-accessed noisy quantum hardware and hybrid simulators test small molecules",
      useCases: [
        ["University hybrid research link", "Benchmark small catalyst or material candidates alongside classical computers."],
        ["Quantum-resistant key upgrade", "Migrate sensitive local archives to post-quantum classical encryption today."],
      ],
    },
    predicted: {
      year: 2032,
      label: "Early fault-tolerant logical qubits model complex catalysts, fertilizers, and materials",
      useCases: [
        ["Custom catalyst discovery", "Design low-energy filtration membranes or nitrogen-fixing catalysts computationally."],
        ["Regional grid & fleet solver", "Solve multi-constraint routing and storage schedules beyond classical heuristics."],
      ],
    },
  },
  geothermal: {
    capability: "Tapping steady underground heat for round-the-clock electricity and district heating.",
    trendSummary: "Oil-and-gas directional drilling is steadily lowering deep geothermal well costs.",
    past: { year: 2018, label: "Conventional geothermal restricted to volcanic rift zones" },
    reached: {
      year: 2026,
      label: "Shallow ground-source heat loops and volcanic-basin plants deliver steady thermal load",
      useCases: [
        ["Shared borehole heat loop", "Stabilize winter heating and summer cooling for a school, clinic, or greenhouse."],
        ["Geothermal crop & food drying", "Use steady low-grade ground heat to preserve harvests without burning fuel."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Enhanced closed-loop drilling unlocks firm 24/7 clean electricity in ordinary rock",
      useCases: [
        ["Firm town baseload well", "Power water treatment and clinics 24/7 regardless of wind, sun, or season."],
        ["Industrial steam replacement", "Supply clean high-heat process steam for local manufacturing."],
      ],
    },
  },
  tidal: {
    capability: "Turbines driven by predictable ocean tide currents in narrows and estuaries.",
    trendSummary: "Submerged rotor durability is improving in harsh salt water, but siting remains specialized.",
    past: { year: 2016, label: "First grid-connected tidal array pilot in northern straits" },
    reached: {
      year: 2026,
      label: "Pilot estuary and channel turbines generate predictable power on strong tidal straits",
      useCases: [
        ["Tidal-clocked pumping", "Run desalination or water storage pumps on the exact daily schedule of strong tides."],
        ["Harbor navigation & sensor power", "Feed coastal buoys and pier equipment from small tidal-current rotors."],
      ],
    },
    predicted: {
      year: 2030,
      label: "Modular composite tidal arrays lower maintenance enough for small island microgrids",
      useCases: [
        ["Island baseload array", "Anchor predictable coastal electricity through dark winter storm weeks."],
        ["Estuary cold-storage hub", "Power port ice-making and catch preservation cleanly at the dock."],
      ],
    },
  },
  solar: {
    capability: "Photovoltaic panels that turn sunlight directly into cheap daytime electricity.",
    trendSummary: "Solar module cost has fallen ~90% over a decade, making panels the cheapest daytime electron.",
    past: { year: 2015, label: "Utility solar crosses parity in sunny deserts" },
    reached: {
      year: 2026,
      label: "Ultra-cheap PV modules make rooftop, pump, and off-grid daytime power affordable everywhere",
      useCases: [
        ["Direct solar pumping & cold chain", "Pump well water to an elevated tank or freeze ice packs while the sun shines."],
        ["Clinic & school roof array", "Cut daytime fuel bills and charge tool packs straight from the roof."],
        ["Agrivoltaic shade canopies", "Grow heat-sensitive crops beneath raised panels that harvest both shade and power."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Lightweight tandem/perovskite films boost yield and mount on weak roofs and vehicles",
      useCases: [
        ["Peel-and-stick weak-roof solar", "Electrify corrugated tin sheds and temporary shelters that cannot bear heavy glass."],
        ["Solar-skinned range extenders", "Trickle-charge light local carts, boats, and field stations outdoors."],
      ],
    },
  },
  wind: {
    capability: "Turbines that harvest kinetic wind energy across plains, ridges, and coasts.",
    trendSummary: "Taller hubs, better blades, and predictive pitch control steadily raise capacity factors.",
    past: { year: 2014, label: "Onshore wind undercuts coal in windy corridors" },
    reached: {
      year: 2026,
      label: "Community-scale and coastal wind turbines pair cleanly with local storage and grids",
      useCases: [
        ["Winter/night wind complement", "Generate power on stormy nights and winter weeks when solar output dips."],
        ["Co-op ridge turbine", "Fund local municipal budgets and shared microgrids from a windy hill or harbor."],
      ],
    },
    predicted: {
      year: 2030,
      label: "Rapid-erect modular towers and floating offshore units reach remote windy coasts",
      useCases: [
        ["Crane-free rural wind mast", "Erect medium turbines on narrow mountain or island roads without giant cranes."],
        ["Deep-water coastal feeder", "Bring steady offshore sea-breeze power into crowded port towns."],
      ],
    },
  },
  wave: {
    capability: "Buoys and converters capturing surface ocean swell energy along exposed coasts.",
    trendSummary: "Storm-survivability prototypes are advancing slowly; commercial scale remains ahead.",
    past: { year: 2018, label: "Early wave prototypes struggle with storm mooring damage" },
    reached: {
      year: 2026,
      label: "Small instrumented wave buoys power offshore sensors and breakwater pilots",
      useCases: [
        ["Self-powered ocean monitoring buoy", "Run offshore weather, pollution, or acoustic sensors indefinitely without battery boat trips."],
        ["Harbor breakwater pilot", "Test wave-damping caissons that Trickle-feed dock lighting."],
      ],
    },
    predicted: {
      year: 2031,
      label: "Storm-detuning composite wave converters power remote islands and coastal desal",
      useCases: [
        ["Wave-driven coastal desalination", "Pressurize reverse-osmosis fresh water directly from winter ocean swells."],
        ["Remote island microgrid", "Replace shipped diesel drums on exposed islands with offshore swell arrays."],
      ],
    },
  },
  nuclear: {
    capability: "High-density zero-carbon fission reactors delivering continuous electricity and heat.",
    trendSummary: "Conventional plants take years; factory-built small modular reactors (SMRs) are in licensing.",
    past: { year: 2016, label: "Large gigawatt reactors dominate low-carbon baseload where built" },
    reached: {
      year: 2026,
      label: "Existing regional grids and medical/industrial isotope supply; SMRs remain in construction",
      useCases: [
        ["Grid-tied regional baseload", "Tap existing clean nuclear grid hours for off-peak water or hydrogen production."],
        ["Radioisotope diagnostics & sterilization", "Use established medical and agricultural isotopes in clinics and pest control."],
      ],
    },
    predicted: {
      year: 2031,
      label: "First commercial factory SMRs and microreactors supply dedicated industrial & district energy",
      useCases: [
        ["District heat & desal anchor", "Run high-volume water desalination and town heating from one compact site."],
        ["Remote mining/port microreactor", "Replace heavy diesel convoys at isolated northern or island infrastructure."],
      ],
    },
  },
  battery: {
    capability: "Electrochemical and thermal packs that store energy for vehicles, tools, and night loads.",
    trendSummary: "Lithium-iron-phosphate (LFP) pack prices dropped over 80% in a decade while cycle life surged.",
    past: { year: 2015, label: "Grid and EV packs exceed $350/kWh" },
    reached: {
      year: 2026,
      label: "Durable ~$100/kWh LFP packs and swappable e-mobility batteries run tools and clinics past dusk",
      useCases: [
        ["Swappable drone & bike packs", "Keep delivery drones, e-trikes, and field tools moving with charged spare packs."],
        ["Clinic & cold-chain night buffer", "Hold daytime solar power to run vaccine fridges, lights, and oxygen overnight."],
        ["Second-life EV battery bank", "Repurpose retired vehicle modules into cheap community backup storage."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Sodium-ion cheap stationary banks and higher-density solid-state flight packs mature",
      useCases: [
        ["Multi-day town storage shed", "Ride out multi-day monsoon or storm blackouts on abundant mineral-cheap cells."],
        ["Long-range heavy e-flight pack", "Double payload and endurance for regional cargo drones and ambulances."],
      ],
    },
  },
  ai: {
    capability: "Language, vision, and prediction models that draft, tutor, classify, and spot patterns.",
    trendSummary: "Inference cost per token keeps falling ~10× a year while capable open weights shrink onto laptops.",
    past: { year: 2022, label: "Frontier language models require massive cloud clusters" },
    reached: {
      year: 2026,
      label: "Copilots and quantized open-weight models tutor, translate, and triage with human oversight",
      useCases: [
        ["Offline tutoring & form help", "Explain lessons, translate notices, and check forms on room-owned hardware."],
        ["Image & sensor triage", "Flag crop blight, X-ray anomalies, or leak patterns so scarce specialists review top risks first."],
        ["Multilingual voice intake", "Turn spoken reports from residents into structured tickets in their own dialect."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Reliable multi-step local agents verify tool outputs with sharply lower hallucination rates",
      useCases: [
        ["Autonomous logistics coordinator", "Continuously re-plan local supply, repair, and clinic queues under human policy."],
        ["Verified scientific & legal assistant", "Cross-check complex filings and bench protocols against formal rulebooks locally."],
      ],
    },
  },
  robots: {
    capability: "Machines that sense, grasp, haul, inspect, or clean in physical environments.",
    trendSummary: "Warehouse, pipe-inspection, and agricultural robots are scaling; general home humanoids are still pilots.",
    past: { year: 2018, label: "Industrial robots mostly bolted inside factory safety cages" },
    reached: {
      year: 2026,
      label: "Wheeled/tracked field bots, pipe crawlers, and warehouse movers work along structured paths",
      useCases: [
        ["Hazardous pipe & tunnel crawler", "Inspect sewers, culverts, and collapsed rooms without risking a human worker."],
        ["Heavy cart & ward tug", "Haul laundry, water jugs, harvested crates, or waste along set corridors."],
        ["Precision weeding & spraying rig", "Spot-treat weeds or pests row by row to cut chemical runoff."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Dexterous vision-guided manipulators handle messy sorting, repair, and physical care assist",
      useCases: [
        ["Mixed-waste sorting cell", "Pick hazardous batteries, plastics, and metals out of tangled municipal trash."],
        ["Safe patient-lift & Elder assist", "Help caregivers transfer patients and fetch items without back injuries."],
      ],
    },
  },
  networks: {
    capability: "Wireless meshes, fiber, cellular, and LEO satellite dishes that move data between people.",
    trendSummary: "Low-Earth-orbit broadband and cheap Wi-Fi mesh radios keep shrinking dead zones.",
    past: { year: 2017, label: "Remote clinics wait years for trench fiber or costly geostationary links" },
    reached: {
      year: 2026,
      label: "Cheap Wi-Fi/LoRa mesh nodes and portable LEO dishes connect towns—or link rooms offline",
      useCases: [
        ["Zero-internet room or village LAN", "Share lessons, maps, and messages across local Wi-Fi without touching outside gateways."],
        ["Long-range LoRa sensor radio", "Send tiny water, flood, or soil alerts kilometers across hills on AA-battery power."],
        ["Community backhaul dish", "Bring high-speed telemedicine and weather feeds to an isolated valley post."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Direct-to-handset satellite messaging and self-healing mesh radios survive disasters seamlessly",
      useCases: [
        ["Dead-zone emergency SMS", "Reach ordinary phones in canyons and storm blackouts with zero ground towers."],
        ["Delay-tolerant regional sync", "Automatically ferry encrypted community updates across intermittent links."],
      ],
    },
  },
  transportation: {
    capability: "Electric two-wheelers, cargo e-trikes, transit routing, and rugged last-mile vehicles.",
    trendSummary: "Light electric freight bikes, e-buses, and cold-box carriers are rapidly cutting per-trip cost.",
    past: { year: 2016, label: "Last-mile rural and alley freight relies on two-stroke fuel motors" },
    reached: {
      year: 2026,
      label: "Cargo e-trikes, electric buses, and insulated cold-boxes move people and goods cheaply",
      useCases: [
        ["Narrow-alley cargo e-trike", "Carry water, vaccines, tools, or produce through mud paths and crowded lanes silently."],
        ["Demand-pooled shuttle route", "Group clinic, school, and market rides so rural elders aren't stranded."],
        ["Mobile workshop van", "Bring repair tools, diagnostics, or water testing on a rotating weekly circuit."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Ultra-fast depot charging and modular pods cut rural freight and ambulance response times",
      useCases: [
        ["Electric rural ambulance relay", "Bridge rough feeder roads to regional hospitals without fuel shortages."],
        ["Containerized cold-chain swap", "Move sealed solar-chilled produce boxes seamlessly from farm to market."],
      ],
    },
  },
  "self-driving": {
    capability: "Vehicles that steer and brake autonomously along mapped streets, yards, and corridors.",
    trendSummary: "Geofenced robotaxis and yard/mine trucks operate in select cities; chaotic rural roads lag.",
    past: { year: 2020, label: "First safety-driverless robotaxi rides in mapped sunny suburbs" },
    reached: {
      year: 2026,
      label: "Low-speed geofenced shuttles and fixed-corridor industrial haulers run in mapped zones",
      useCases: [
        ["Closed-campus / port shuttle", "Move shift workers, patients, or pallets along a dedicated low-speed lane."],
        ["Driver-assist collision braking", "Cut highway and night-shift fatigue crashes on existing community buses and trucks."],
      ],
    },
    predicted: {
      year: 2029,
      label: "All-weather autonomous shuttles and night freight corridors expand to secondary towns",
      useCases: [
        ["On-demand night mobility shuttle", "Give non-drivers, elders, and night nurses safe door-to-door transit."],
        ["Autonomous supply convoy", "Run off-peak medicine and food resupply along mapped inter-town highways."],
      ],
    },
  },
  drones: {
    capability: "Uncrewed aircraft that map terrain, inspect hazards, and ferry light urgent payloads.",
    trendSummary: "Onboard vision/LiDAR and medical corridor ops keep cutting flight setup and pilot skill barriers.",
    past: { year: 2016, label: "Rwanda launches first fixed-wing blood delivery corridor" },
    reached: {
      year: 2026,
      label: "Mapped medical/inspection corridors and GPS-free obstacle-sensing quadcopters fly 15–30 min hops",
      useCases: [
        ["Post-rain & flood mapping", "Fly one pass over paddies, roofs, or culverts to map runoff and washouts fast."],
        ["Light urgent sample / medicine hop", "Ferry blood units, antivenom, or water vials across washed-out bridges."],
        ["Canopy & indoor LiDAR scout", "Map cluttered woods, caves, or damaged buildings without satellite lock."],
      ],
    },
    predicted: {
      year: 2030,
      label: "Coordinated multi-drone fleets share live town maps and fly routine beyond-line-of-sight routes",
      useCases: [
        ["Automated watershed patrol", "Multiple craft update one live flood and pollution map from charging nests."],
        ["Heavy all-weather clinic resupply", "Carry 10+ kg relief loads through gusty night weather without a pilot per craft."],
      ],
    },
  },
  "quantum-internet": {
    capability: "Distributing quantum keys and entangled states to detect eavesdropping physically.",
    trendSummary: "Dedicated metro-fiber QKD links exist today; long-distance quantum repeaters remain deep lab work.",
    past: { year: 2017, label: "Micius satellite demonstrates experimental quantum key relay" },
    reached: {
      year: 2026,
      label: "Point-to-point metro fiber Quantum Key Distribution (QKD) testbeds link fixed institutions",
      useCases: [
        ["Metro hospital/utility fiber pilot", "Test tamper-evident key exchange over dedicated dark fiber between two hubs."],
        ["Hardware RNG key seeding", "Generate verifiable physical entropy for local cryptographic keys."],
      ],
    },
    predicted: {
      year: 2034,
      label: "Quantum repeaters link regional nodes into tamper-proof entanglement networks",
      useCases: [
        ["Tamper-evident grid & infrastructure link", "Detect any physical tap on critical regional power and water control lines."],
        ["Distributed quantum sensor array", "Synchronize ultra-precise clocks and subsurface sensors across sites."],
      ],
    },
  },
  space: {
    capability: "Earth-observation satellites (optical, radar, thermal, methane) and orbital communication relays.",
    trendSummary: "Reusable rockets slashed launch cost per kg, multiplying daily planet-wide satellite imagery.",
    past: { year: 2015, label: "First orbital booster landing begins sharp drop in launch cost" },
    reached: {
      year: 2026,
      label: "Daily optical, cloud-piercing radar (SAR), and methane/wildfire satellites cover the globe",
      useCases: [
        ["Cloud-piercing flood & landslide watch", "Download SAR radar passes to spot rising water or slope slip through storm clouds."],
        ["Illegal burn, leak & deforestation alert", "Pinpoint plumes, mine runoff, or forest cuts before patrols reach the ridge."],
        ["Soil moisture & crop stress map", "Target scarce irrigation and extension visits using free/low-cost orbital bands."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Sub-hour revisit constellations and onboard orbital AI push real-time alerts to field phones",
      useCases: [
        ["15-minute wildfire ignition ping", "Catch brush fires within minutes of spark and text coordinates to local crews."],
        ["Live maritime & watershed tracking", "Monitor illegal dumping and fishing dark-fleets continuously from orbit."],
      ],
    },
  },
  synbio: {
    capability: "Programming DNA, enzymes, and cell-free reactions to sense chemicals or brew useful molecules.",
    trendSummary: "DNA synthesis and cell-free reaction kits get cheaper yearly; self-replicating field release remains restricted.",
    past: { year: 2018, label: "Cell-free paper strip biosensors proven in academic labs" },
    reached: {
      year: 2026,
      label: "Cell-free paper/vial biosensors and contained fermentation make peptides, enzymes, and reagents",
      useCases: [
        ["Freeze-dried paper water/toxin test", "Spot heavy metals, nitrates, or pathogens with a color-change strip—no living GMO released."],
        ["Local enzyme & reagent brewing", "Produce diagnostic enzymes in contained benchtop bioreactors instead of importing cold-shipped kits."],
        ["Bio-synthesis order screening", "Screen DNA/peptide orders against safety red lines while keeping harmless parts legal."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Biocontained engineered microbes and on-demand biologics scale safely for clinics and soils",
      useCases: [
        ["Point-of-care biologic synthesizer", "Brew small-batch heat-stable vaccines or antidotes in regional hospital pharmacies."],
        ["Contained industrial bio-remediation", "Break down stubborn PFAS or dye waste inside sealed treatment tanks."],
      ],
    },
  },
  bci: {
    capability: "Reading or stimulating neural signals via non-invasive caps or clinical implants.",
    trendSummary: "Surgical speech/cursor implants work in small trials, while wearable dry-electrode EEG improves comfort.",
    past: { year: 2021, label: "Intracortical array decodes imagined handwriting in paralyzed volunteer" },
    reached: {
      year: 2026,
      label: "Clinical implants restore speech/cursor for severe paralysis; wearable EEG tracks sleep & alertness",
      useCases: [
        ["Locked-in speech & cursor clinical aid", "Help patients with ALS or spinal injury communicate via assistive clinic trials."],
        ["Wearable fatigue & seizure monitor", "Use soft dry-contact headbands to track epilepsy patterns or shift-worker microsleeps."],
      ],
    },
    predicted: {
      year: 2031,
      label: "Minimally invasive high-bandwidth interfaces control prosthetics and mobility aids reliably at home",
      useCases: [
        ["Home neural prosthetic control", "Operate a wheelchair or robotic arm fluidly without daily lab recalibration."],
        ["Stroke neuro-rehabilitation loop", "Pair intention decoding with muscle stimulation to speed motor recovery."],
      ],
    },
  },
  "genetic-engineering": {
    capability: "Precisely editing plant, microbe, or human cells (CRISPR, base & prime editing) for resilience or cure.",
    trendSummary: "First CRISPR blood-disorder cures are approved, though per-patient delivery cost is still falling.",
    past: { year: 2023, label: "First regulatory approval of CRISPR therapy for sickle-cell disease" },
    reached: {
      year: 2026,
      label: "Gene-edited drought/blight-tolerant crop seeds and first ex-vivo blood therapies exist",
      useCases: [
        ["Climate-resilient non-transgenic seed", "Plant locally adapted varieties edited for salt, heat, or fungal blight resistance."],
        ["CRISPR rapid point-of-care assay", "Use Cas-enzyme cleavage to detect specific viral or resistance genes on a lateral strip."],
      ],
    },
    predicted: {
      year: 2029,
      label: "In-vivo lipid nanoparticle delivery drops single-dose gene therapy cost for broader clinics",
      useCases: [
        ["One-shot clinic genetic cure", "Treat inherited blood or liver conditions via an IV infusion without bone-marrow transplant."],
        ["Blight-immunized staple orchards", "Protect perennial local tree and root crops from fast-mutating pests."],
      ],
    },
  },
  "gene-sequencing": {
    capability: "Reading DNA and RNA rapidly from swabs, blood, soil, or wastewater.",
    trendSummary: "Cost per genome halves roughly every 18 months while nanopore readers shrink to pocket size.",
    past: { year: 2014, label: "First $1,000 human genome in centralized sequencing centers" },
    reached: {
      year: 2026,
      label: "Portable rugged sequencers and ~$200 clinic runs identify pathogens and resistance on the same shift",
      useCases: [
        ["Same-shift clinic pathogen read", "Identify which bacterium, virus, or drug-resistance gene is in a sample without a capital-city truck."],
        ["Wastewater & well early warning", "Sequence pooled sewage or canal samples weekly to spot outbreaks days before wards fill."],
        ["Vial & supply verification", "Read nucleic acids directly from a bench vial or food shipment to verify contents."],
      ],
    },
    predicted: {
      year: 2028,
      label: "Sub-$100 automated sample-to-answer cartridges run routine panels with minimal lab training",
      useCases: [
        ["Routine rural fever & TB panel", "Run walk-in genomic triage at small district posts without a specialist technician."],
        ["Continuous biodiversity & soil eDNA", "Track pollinator, fish, and soil microbiome recovery cheaply by local stewards."],
      ],
    },
  },
  "alt-proteins": {
    capability: "Producing nutritious protein via precision fermentation, fungi/mycoprotein, and plant fractionation.",
    trendSummary: "Precision fermentation and fungal biomass scale well today; cultivated animal meat remains high-cost.",
    past: { year: 2019, label: "Next-gen plant proteins enter mainstream grocery & foodservice" },
    reached: {
      year: 2026,
      label: "Mycoprotein vats and crop-byproduct fermentation turn local starches/sugars into dense protein",
      useCases: [
        ["Ag-waste fungal protein vat", "Ferment cassava peel, brewery grain, or sugar side-streams into shelf-stable school protein."],
        ["Drought-proof staple fortification", "Blend precision-fermented iron, B12, and amino acids into local flour and porridges."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Food-grade bioreactors drop cost enough for decentralized town-scale dairy and egg proteins",
      useCases: [
        ["Micro-dairy fermentation unit", "Produce real whey/casein nutrition in arid or land-scarce towns without cattle herds."],
        ["Emergency shelf-stable ration brewery", "Spin up high-protein relief food locally from water, power, and simple feedstocks."],
      ],
    },
  },
  vr: {
    capability: "Immersive VR headsets and passthrough AR glasses for hands-on rehearsal and remote guidance.",
    trendSummary: "Standalone untethered headsets are cheap and sharp; lightweight all-day outdoor AR glasses are maturing.",
    past: { year: 2020, label: "Standalone inside-out tracked VR headsets drop below $400" },
    reached: {
      year: 2026,
      label: "Untethered VR/passthrough headsets run zero-risk skill drills and live see-what-I-see remote guidance",
      useCases: [
        ["Zero-waste procedural rehearsal", "Let trainees practice hazardous repairs, midwifery, or triage 50 times before touching real gear."],
        ["See-what-I-see remote mentor", "Stream a local tech's view so a distant specialist can circle which valve or wire to touch."],
        ["Visual town flood/build walkthrough", "Let residents stand inside a 1:1 preview of a proposed dike or street layout to build buy-in."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Lightweight rugged AR glasses overlay real-time checklists and translations hands-free in the field",
      useCases: [
        ["Hands-free field repair overlay", "Guide volunteers step-by-step through pump, solar, or clinic equipment maintenance."],
        ["Live caption & sign-language glasses", "Give deaf or multilingual residents instant face-to-face captions in clinics and classrooms."],
      ],
    },
  },
  print3d: {
    capability: "Additive manufacturing in polymers, resins, concrete, and metals from digital files on-site.",
    trendSummary: "Multi-material desktop printers and CNC/scan workflows now produce functional end-use parts fast.",
    past: { year: 2016, label: "Desktop printers mostly limited to brittle hobby prototypes" },
    reached: {
      year: 2026,
      label: "High-speed polymer/composite printers + 3D phone scans fabricate spare parts, jigs, and braces locally",
      useCases: [
        ["Broken-valve & spare-part fab", "Scan and print custom gaskets, brackets, and pump fittings instead of waiting months on imports."],
        ["Custom prosthetics & splints", "Fit breathable, patient-matched orthotics and sockets in one clinic afternoon."],
        ["Precision molds & repair jigs", "Print durable molds to cast silicone seals, ceramics, or concrete blocks repeatable at scale."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Affordable desktop metal sintering and automated mortar printing cut structural build times",
      useCases: [
        ["Local stainless/alloy part shop", "Print load-bearing metal gears and surgical tools in district workshops."],
        ["Rapid culvert & shelter printing", "Extrude flood walls, water tanks, and housing cores with minimal formwork waste."],
      ],
    },
  },
  iot: {
    capability: "Low-cost physical sensors and actuators measuring water, air, power, soil, and cold chains.",
    trendSummary: "MEMS sensors + multi-year battery radios cost a few dollars per node, making continuous sensing routine.",
    past: { year: 2015, label: "Environmental gauges require wired power and manual clipboard reads" },
    reached: {
      year: 2026,
      label: "Cheap rugged sensor nodes measure nitrates, PM2.5, flow, vibration, and fridge temps for years on a cell",
      useCases: [
        ["Sluice, well & pipe leak watch", "Alert keepers by SMS/light the moment water turbidity, nitrates, or pressure cross a threshold."],
        ["Cold-chain & power tamper seal", "Log continuous vaccine-fridge temperatures and grid dropouts automatically."],
        ["School & street air-quality beacons", "Show live PM2.5/heat readings with simple color lamps people on the street can read."],
      ],
    },
    predicted: {
      year: 2029,
      label: "Battery-free ambient-harvesting tags and ultra-cheap multi-analyte lab-on-chip sensors spread",
      useCases: [
        ["Peel-and-stick battery-free tags", "Track moisture, spoilage, and structural strain across thousands of crates or beams with zero batteries."],
        ["Continuous multi-toxin water probe", "Read heavy metals, pesticides, and pathogens inline without reagent swaps."],
      ],
    },
  },
  materials: {
    capability: "Engineered membranes, coatings, composites, and sorbents for filtration, cooling, and durability.",
    trendSummary: "Computational screening + roll-to-roll manufacturing are bringing passive cooling paints and selective membranes to market.",
    past: { year: 2018, label: "New specialty polymers take decades of trial-and-error synthesis" },
    reached: {
      year: 2026,
      label: "Radiative-cooling roof coatings, selective water membranes, and corrosion-proof composites ship commercially",
      useCases: [
        ["Passive radiative-cooling roofs", "Drop indoor classroom and clinic heat by 4–6 °C in full sun using zero electricity."],
        ["Gravity-fed selective filter cartridges", "Strip arsenic, fluoride, nitrates, or microplastics at village standpipes without high pressure."],
        ["Moisture-harvesting & phase-change packs", "Buffer clinic cold boxes at exact temperatures for days without active compressors."],
      ],
    },
    predicted: {
      year: 2029,
      label: "AI-designed MOFs and recyclable self-healing polymers slash atmospheric water and carbon capture energy",
      useCases: [
        ["Solar-regenerated arid water harvester", "Pull clean drinking water from dry desert air using sunlight-heated sorbent beds."],
        ["Ultra-durable biodegradable packaging", "Replace single-use plastic sachets with high-barrier compostable films."],
      ],
    },
  },
  nano: {
    capability: "Nanoscale particles, lipid carriers, and surface structures for targeted medicine, sensing, and catalysis.",
    trendSummary: "Lipid nanoparticles proved global clinical scale; broader environmental nanomaterials face careful toxicity checks.",
    past: { year: 2021, label: "Lipid nanoparticles deliver mRNA vaccines to billions of people" },
    reached: {
      year: 2026,
      label: "Targeted nanoparticle drug carriers, gold-nanoparticle rapid strips, and photocatalytic coatings work in niches",
      useCases: [
        ["High-sensitivity rapid lateral strip", "Boost cheap paper diagnostic strips to catch low-load infections early."],
        ["Antimicrobial & self-cleaning hospital surfaces", "Coat high-touch clinic rails and water tanks to cut surface pathogen carryover."],
      ],
    },
    predicted: {
      year: 2030,
      label: "Thermostable targeted nanocarriers and selective nanocatalysts eliminate cold-chain and clean stubborn pollutants",
      useCases: [
        ["Fridge-free targeted therapeutics", "Deliver drugs or vaccines to specific organs in heat-stable dry doses."],
        ["Sunlight-activated water nanocatalyst", "Break down pharmaceutical and industrial runoff in shallow solar treatment troughs."],
      ],
    },
  },
};

/**
 * @param {object} trend
 * @returns {string}
 */
export function trendRateSummary(trend) {
  const kind = trend?.compounding?.kind;
  const name = /cost|price|\$|dollar/i.test(
    `${trend?.unit || ""} ${trend?.name || ""}`
  )
    ? "Cost"
    : String(trend?.name || "Capability").slice(0, 48);
  if (kind === "halving") {
    const months = Math.max(1, Math.round(Number(trend.compounding.periodYears) * 12));
    return `${name} halves about every ${months} months`;
  }
  if (kind === "doubling") {
    const months = Math.max(1, Math.round(Number(trend.compounding.periodYears) * 12));
    return `${name} doubles about every ${months} months`;
  }
  if (kind === "cagr") {
    const pct = Math.round(Number(trend.compounding.annualRate) * 100);
    return `${name} compounds ~${pct}% per year`;
  }
  return String(trend?.trendSummary || trend?.summary || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/**
 * @param {object} tech
 */
export function trendSummaryForTech(tech) {
  const packed = PACKS[tech?.id]?.trendSummary;
  if (packed) return packed;
  if (tech?.curve === "early") {
    return `${tech.name} is early on the curve — narrow lab/clinical niches work now; broad deployment lies ahead.`;
  }
  if (tech?.curve === "mature") {
    return `${tech.name} is proven infrastructure; modular cost drops keep expanding local reach.`;
  }
  return `${tech.name} rides a steep cost-and-capability curve this decade.`;
}

function worldOf(tech) {
  const explicit = tech?.polarity;
  if (explicit === "atoms" || explicit === "split" || explicit === "bits") return explicit;
  const derived = polarityForTech(tech?.id);
  if (derived === "atoms" || derived === "split" || derived === "bits") return derived;
  return "bits";
}

function casesFromHint(tech) {
  const parts = String(tech?.inventionHint || tech?.summary || "")
    .split(/[,;]/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s.length > 2);
  while (parts.length < 2) {
    parts.push(`${tech?.name || "Tech"} pilot`);
  }
  return parts.slice(0, 3).map((part) => ({
    title: part.slice(0, 64),
    blurb: `${part} — applied with human oversight and local maintenance.`,
  }));
}

function toUseCases(rows, techId, keySuffix, world, origin = "catalog") {
  return rows.map((row, i) => ({
    id: `uc-${techId}-${keySuffix}-${i + 1}`,
    title: String(row.title || "Use case").slice(0, 72),
    blurb: String(row.blurb || "").slice(0, 280),
    world,
    origin,
  }));
}

/**
 * @param {object} tech
 */
export function catalogMilestonesForTech(tech) {
  const world = worldOf(tech);
  const ready = Number(tech?.readyYear) || 2026;
  const pack = PACKS[tech.id] || {};
  const reachedYear = pack.reached?.year || 2026;
  const predictedYear = pack.predicted?.year || (ready > 2026 ? ready : 2029);
  const hinted = casesFromHint(tech);
  const reachedRows =
    pack.reached?.useCases?.map(([title, blurb]) => ({ title, blurb })) || hinted;
  const predictedRows =
    pack.predicted?.useCases?.map(([title, blurb]) => ({ title, blurb })) ||
    hinted.slice(0, 2).map((row) => ({
      title: `Next-gen ${row.title.toLowerCase()}`.slice(0, 72),
      blurb: `Forecast (~${predictedYear}): ${row.blurb}`,
    }));

  const list = [];
  if (pack.past?.year && pack.past?.label) {
    list.push({
      id: `ms-${tech.id}-past-${pack.past.year}`,
      year: pack.past.year,
      label: pack.past.label,
      status: "reached",
      isHistoryAnchor: true,
      origin: "catalog",
      useCases: toUseCases(reachedRows.slice(0, 2), tech.id, `past-${pack.past.year}`, world),
    });
  }
  list.push(
    {
      id: `ms-${tech.id}-reached-${reachedYear}`,
      year: reachedYear,
      label: pack.reached?.label || `${tech.name}: proven local pilot capability`,
      status: "reached",
      origin: "catalog",
      useCases: toUseCases(reachedRows, tech.id, "reached", world),
    },
    {
      id: `ms-${tech.id}-predicted-${predictedYear}`,
      year: Math.max(predictedYear, 2027),
      label: pack.predicted?.label || `${tech.name}: broader cost & performance unlock`,
      status: "predicted",
      origin: "catalog",
      useCases: toUseCases(predictedRows, tech.id, "predicted", world),
    }
  );
  return list;
}

/**
 * @param {string} techId
 * @param {{ techs?: object[] }} [opts]
 */
export function catalogTrack(techId, opts = {}) {
  const techs = opts.techs || TECHS;
  const tech = techs.find((t) => t.id === techId);
  if (!tech) return null;
  const pack = PACKS[tech.id] || {};
  return {
    techId: tech.id,
    name: tech.name,
    icon: tech.icon || "",
    domain: tech.domain || "",
    world: worldOf(tech),
    capability: pack.capability || String(tech.summary || tech.learn || "").slice(0, 220),
    trendSummary: trendSummaryForTech(tech),
    trends: [],
    milestones: catalogMilestonesForTech(tech),
  };
}

export function allCatalogTechIds() {
  return TECHS.map((t) => t.id);
}

/**
 * Build milestone-specific general use cases from a prediction-bank or trend row
 * so external milestones unlock their own relevant cards rather than identical copies.
 */
function deriveExternalUseCases({ techId, world, idSlug, headline, detail, fallback }) {
  const cleanHead = String(headline || "").replace(/\.$/, "").trim();
  const cleanDetail = String(detail || "").replace(/\s+/g, " ").trim();
  const sentences = cleanDetail
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && !/^this chart\b/i.test(s));

  const primaryTitle = cleanHead.length > 64 ? `${cleanHead.slice(0, 61).trim()}…` : cleanHead || "Unlocked capability";
  const primaryBlurb =
    sentences[0] || fallback?.[0]?.blurb || cleanHead || "Apply this capability threshold in a concrete workflow.";
  const out = [
    {
      id: `uc-${techId}-${idSlug}-1`,
      title: primaryTitle,
      blurb: primaryBlurb.slice(0, 280),
      world,
      origin: "bank",
    },
  ];
  if (fallback?.[0] && fallback[0].title !== primaryTitle) {
    out.push({
      ...fallback[0],
      id: `uc-${techId}-${idSlug}-2`,
      origin: "catalog",
    });
  } else if (sentences[1]) {
    const words = sentences[1].replace(/\.$/, "").split(/\s+/).slice(0, 6).join(" ");
    out.push({
      id: `uc-${techId}-${idSlug}-2`,
      title: words.slice(0, 64) || "Paired workflow",
      blurb: sentences[1].slice(0, 280),
      world,
      origin: "bank",
    });
  }
  return out;
}

/**
 * Bank and trend rows become extra milestones. Status is copied, never upgraded.
 * @param {object} track
 * @param {object[]} [predictions]
 * @param {object[]} [trends]
 */
export function mergeExternalMilestones(track, predictions = [], trends = []) {
  if (!track) return track;
  const milestones = track.milestones.map((m) => ({
    ...m,
    useCases: m.useCases.map((u) => ({ ...u })),
  }));
  const seen = new Set(milestones.map((m) => `${m.year}|${m.label.toLowerCase()}`));
  const fallbackUses = (status) =>
    (milestones.find((m) => m.status === status && !m.isHistoryAnchor) || milestones[0])?.useCases || [];

  let bankAdded = 0;
  for (const row of predictions || []) {
    if (bankAdded >= 3) break;
    if (!row || !Array.isArray(row.techIds) || !row.techIds.includes(track.techId)) continue;
    const year = Number(row.year);
    if (!Number.isFinite(year)) continue;
    const label = String(row.headline || "").trim();
    if (!label) continue;
    const key = `${year}|${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const status =
      year > 2026 || row.kind === "prediction" || row.claimBand === "near" || row.claimBand === "frontier"
        ? "predicted"
        : "reached";
    const slug = `bank-${row.id || year}`;
    milestones.push({
      id: `ms-${track.techId}-${slug}`,
      year,
      label,
      detail: String(row.detail || "").slice(0, 280),
      status,
      attribution: String(row.speaker || row.attribution || row.sourceNote || "").slice(0, 160),
      origin: "bank",
      useCases: deriveExternalUseCases({
        techId: track.techId,
        world: track.world,
        idSlug: slug,
        headline: label,
        detail: row.detail,
        status,
        fallback: fallbackUses(status),
      }),
    });
    bankAdded += 1;
  }

  for (const trend of trends || []) {
    if (!trend || trend.techId !== track.techId) continue;
    const topUses = Array.isArray(trend.useCases) ? trend.useCases : [];
    for (const m of trend.milestones || []) {
      const year = Math.round(Number(m.year ?? String(m.date || "").slice(0, 4)));
      const label = String(m.label || "").trim();
      if (!Number.isFinite(year) || !label) continue;
      const key = `${year}|${trend.id || ""}|${label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const status = m.status === "reached" ? "reached" : "predicted";
      const slug = `trend-${trend.id}-${m.id || year}`;
      const authoredUses =
        Array.isArray(m.useCases) && m.useCases.length ? m.useCases : topUses;
      const hasAuthoredUseCases = authoredUses.length > 0;
      const useCases = hasAuthoredUseCases
        ? authoredUses.map((u, i) => ({
            id: u.id || `uc-${track.techId}-${slug}-${i + 1}`,
            title: String(u.title || "Unlocked use case").slice(0, 80),
            blurb: String(u.blurb || u.title || "").slice(0, 280),
            world: u.world || track.world,
            origin: "trend",
          }))
        : deriveExternalUseCases({
            techId: track.techId,
            world: track.world,
            idSlug: slug,
            headline: label,
            detail: m.detail || m.note || trend.capability || "",
            fallback: fallbackUses(status),
          });
      const detailText =
        m.detail ||
        (trend.capability
          ? `${trend.capability} (${m.value != null ? `${m.value} ${trend.unit || ""}`.trim() : year})`
          : undefined);
      milestones.push({
        id: `ms-${track.techId}-${slug}`,
        year,
        label,
        detail: detailText ? String(detailText).slice(0, 280) : undefined,
        attribution: m.attribution ? String(m.attribution).slice(0, 160) : undefined,
        status,
        value: m.value,
        capabilityId: trend.id,
        capabilityName: trend.name,
        hasAuthoredUseCases,
        origin: "trend",
        useCases,
      });
    }
  }

  milestones.sort((a, b) => a.year - b.year || String(a.label).localeCompare(String(b.label)));
  return { ...track, milestones };
}
