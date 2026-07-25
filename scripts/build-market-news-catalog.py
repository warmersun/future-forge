#!/usr/bin/env python3
"""Build js/sim/market-news.js MARKET_EVENTS bank (122 cards) with static image paths."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "js/sim/market-news.js"

VALID = {
    "computing",
    "energy",
    "crypto",
    "quantum",
    "geothermal",
    "tidal",
    "solar",
    "wind",
    "wave",
    "nuclear",
    "battery",
    "ai",
    "robots",
    "networks",
    "transportation",
    "self-driving",
    "drones",
    "quantum-internet",
    "space",
    "synbio",
    "bci",
    "genetic-engineering",
    "gene-sequencing",
    "alt-proteins",
    "vr",
    "print3d",
    "iot",
    "materials",
    "nano",
}
DOMAINS = {"power", "automator", "mover", "lifeforce", "link", "portal"}

# id|headline|body|scope|budget|will|icon|tone
# scope: tech ids comma-separated, or @domain, or * for all
RAW = r"""
ram-shortage|RAM shortage hits supply chains|Memory chips are scarce and pricey. Computing projects need deeper pockets before they leave the lab.|computing|1|0|💾|bad
ai-datacenter-backlash|Public divided over AI data centers|People don't want a data center built in their state. Fielding AI and heavy compute needs more political will.|ai,computing|0|2|🏙️|bad
solar-glut|Solar panel glut drops prices|Factories overbuilt. Solar and battery kits flood municipal catalogs — capital costs ease.|solar,battery|-1|0|☀|good
nuclear-permit-wave|Nuclear permits move faster|A regional compact streamlines small-reactor reviews. Political will for nuclear ticks up.|nuclear|0|-1|☢|good
drone-airspace-clamp|Drone airspace rules tighten|New corridors and insurance mandates raise the bar. Autonomy projects need budget and buy-in.|drones,self-driving|1|1|🛸|bad
gene-sequencing-boom|Portable sequencers get cheaper|A price war in field genomics. Pathogen and biotech stacks cost less capital to stand up.|gene-sequencing,synbio,genetic-engineering|-1|0|🧬|good
biotech-scare|Lab-leak scare fans biotech fear|Headlines outrun evidence. Synthetic biology and genetic work face a tougher political climate.|synbio,genetic-engineering,gene-sequencing|0|2|⚠️|bad
grid-congestion|Grid congestion fees spike|Transmission bottlenecks make energy projects pricier to wire up — especially large generation.|energy,wind,solar,geothermal,tidal,wave|1|0|⚡|bad
open-source-models|Open-source models flood the market|Capable free weights lower the barrier. AI assistants get cheaper to stand up locally.|ai|-1|0|✦|good
robot-labor-pushback|Unions push back on care robots|Care and logistics automation meets organized resistance. Political will is the scarce resource.|robots|0|1|🤖|bad
chip-export-thaw|Export controls ease on edge chips|A temporary thaw. Edge computing and IoT kits drop in price for civic projects.|computing,iot,networks|-1|0|📡|good
privacy-backlash|Sensor surveillance backlash|Communities reject always-on cameras and meters. IoT and networks need more political cover.|iot,networks,ai|0|1|👁|bad
print-shop-grants|Municipal 3D print grants land|Cities fund local fab shops. Additive manufacturing and materials get a capital break.|print3d,materials|-1|0|🖨|good
rare-earth-squeeze|Rare-earth squeeze hits hardware|Magnets, batteries, and advanced materials cost more. Hardware-heavy stacks feel it.|@power,@portal|1|0|⛏|bad
climate-fund-surge|Adaptation funds open early|A climate window funds local resilience tech. Political will for green stacks softens.|@power,@portal|0|-1|🌍|good
vr-training-fad|VR training budgets cut|Enterprises walk back headset programs. Link-domain projects need more capital to justify.|@link|1|0|🕶|bad
quantum-hype-cycle|Quantum hype cools — pilots pause|Investors wait for clearer niches. Quantum work needs more will to keep sponsors interested.|quantum,quantum-internet|0|1|⚛|mixed
community-broadband|Community broadband wins a vote|Fiber co-ops pass. Networks and coordination tools face less political friction.|networks,iot|0|-1|⛓|good
crypto-winter-thaw|Ledger tools rebrand as civic rails|Less hype, more procurement. Crypto-style ledgers cost a little less political capital.|crypto|0|-1|Ƀ|good
battery-fire-scare|Warehouse battery fire dominates news|Safety fears raise insurance and compliance costs for battery projects.|battery|1|1|🔋|bad
wind-siting-wars|Wind siting wars escalate|Coastal and ridge communities fight new turbines. Wind projects need more political will.|wind|0|1|🌬|bad
offshore-wind-subsidy|Offshore wind subsidy package|A regional package underwrites marine wind. Capital costs ease for wind stacks.|wind,energy|-1|0|🌊|good
geothermal-drill-boom|Geothermal drill costs drop|New drill bits and shared rigs cut baseload heat projects. Geothermal gets cheaper to start.|geothermal|-1|0|🌋|good
seismic-permit-freeze|Seismic fears freeze geothermal permits|Induced-quake stories stall local permits. Geothermal needs more political cover.|geothermal|0|1|📉|bad
tidal-pilot-success|Tidal pilot beats forecasts|A harbor pilot posts reliable output. Tidal and wave tech look more fundable.|tidal,wave|-1|0|🌙|good
marine-storm-damage|Storm damages marine energy kit|Insurance after a bad season raises capital for tidal and wave projects.|tidal,wave|1|0|🌪|bad
nuclear-waste-standoff|Nuclear waste standoff returns|Storage politics flare. Nuclear needs more will even where reactors are welcome on paper.|nuclear|0|1|☢|bad
smr-factory-discount|SMR factory offers bulk pricing|Modular reactor vendors cut first-unit premiums. Nuclear capital eases slightly.|nuclear|-1|0|🏭|good
oil-price-spike|Oil price spike revives electrify-now|Fossil volatility makes clean power stacks easier to sell politically.|solar,wind,battery,energy|0|-1|🛢|good
gas-lobby-blitz|Gas lobby blitz hits clean power|Incumbent messaging slows clean generation. Will costs rise for power techs.|@power|0|1|📢|bad
microgrid-standard|Microgrid standard adopted|A shared standard cuts integration cost for energy, battery, and networks stacks.|energy,battery,networks,iot|-1|0|🔌|good
utility-monopoly-fee|Utility monopoly fees for edge devices|Distribution charges hit local generation and storage. Power hardware costs more.|solar,battery,energy|1|0|💸|bad
copper-shortage|Copper shortage hits wiring|Cables and motors get pricey. Energy and mover hardware budgets climb.|energy,transportation,self-driving,robots|1|0|🟧|bad
lithium-price-crash|Lithium price crash|Battery packs get cheaper again after a supply glut.|battery,self-driving,drones|-1|0|📉|good
hydrogen-hype-tax|Hydrogen hype tax on energy budgets|Policymakers divert funds to unready H2 schemes. Local power pilots pay more to compete.|energy,solar,wind|1|0|💨|bad
community-solar-law|Community solar law passes|Shared solar co-ops get easy rules. Solar will cost drops.|solar|0|-1|☀|good
night-storage-mandate|Night storage mandate|New rules couple generation with storage. Battery capital rises; solar politics ease a bit.|battery,solar|1|-1|🌙|mixed
blackout-week|Blackout week focuses minds|After multi-day outages, political will for local energy and batteries rises.|energy,battery,solar,wind|0|-1|🌑|good
ai-chip-tax|AI chip import tax|Specialized accelerators get pricier. AI and computing stacks need more capital.|ai,computing|1|0|🧾|bad
teacher-ai-grants|Teacher AI copilot grants|Education funds underwrite classroom AI. Will and capital ease for AI projects.|ai|-1|-1|📚|good
deepfake-scandal|Deepfake scandal week|Trust crashes. AI projects need more political will to clear scrutiny.|ai|0|2|🎭|bad
robot-lease-deals|Robot-as-a-service lease deals|Vendors finance bodies monthly. Robots cost less upfront capital.|robots|-1|0|🤝|good
robot-injury-lawsuit|Robot injury lawsuit goes viral|Liability fears raise compliance spend for robots.|robots|1|1|⚖️|bad
warehouse-robot-boom|Warehouse robot boom discounts spares|Overbuilt logistics robots spill into civic markets cheaper.|robots,drones|-1|0|📦|good
ai-energy-backlash|AI energy use backlash|Communities link AI to power strain. AI will cost rises.|ai|0|1|🔥|bad
open-robotics-kit|Open robotics kit hits shelves|Shared designs and parts drop robot build costs.|robots,print3d|-1|0|🧰|good
automation-tax-talk|Automation tax talk returns|Politicians float robot taxes. Automator stacks need more will.|@automator|0|1|🏛|bad
ai-safety-fund|National AI safety fund|Compliance and eval tools get subsidies. AI capital eases if you play by the book.|ai|-1|0|🛡|good
ev-charger-glut|EV charger glut|Charge hardware is cheap. Transportation and self-driving support costs fall.|transportation,self-driving,battery|-1|0|🔌|good
road-pricing-fight|Road pricing fight|Congestion charges spark protests. Self-driving and transport need more will.|self-driving,transportation|0|1|🛣|bad
autonomy-corridor-opens|Autonomy corridor opens|A city opens a mapped shuttle corridor. Self-driving capital and will ease.|self-driving,networks|-1|-1|🚌|good
drone-crash-ban|Drone crash triggers temporary ban|A high-profile incident grounds local drones until rules tighten.|drones|1|1|🚫|bad
medical-drone-lane|Medical drone lane approved|Blood and vaccine corridors get permanent status. Drones get easier politically.|drones|0|-1|🩸|good
satellite-bandwidth-sale|Satellite bandwidth sale|Space connectivity vendors dump capacity. Space and networks get cheaper to wire.|space,networks|-1|0|🛰|good
space-debris-scare|Space debris scare|Launch insurance spikes. Space projects need more capital.|space|1|0|☄|bad
fiber-cut-wave|Fiber cut crime wave|Cable theft raises network resilience costs.|networks|1|0|✂️|bad
mesh-radio-legalized|Mesh radio legalized|Community mesh networks get clear spectrum rules. Networks and IoT will ease.|networks,iot|0|-1|📻|good
quantum-link-pilot|Quantum link pilot funded|A research corridor funds quantum networking trials. Quantum internet capital eases.|quantum-internet,quantum|-1|0|🔗|good
transport-strike|Transport strike disrupts pilots|Labor action freezes mobility trials. Mover stacks need more will.|@mover|0|1|🪧|bad
bike-lane-data-deal|Bike-lane sensor deal|Cities bulk-buy IoT for mobility. Networks and IoT hardware get cheaper.|iot,networks,transportation|-1|0|🚲|good
lidar-price-war|Lidar price war|Sensors for autonomy and drones get cheaper.|self-driving,drones,robots|-1|0|📡|good
gps-jamming-zone|GPS jamming zone expands|Navigation risk raises cost for drones, space, and self-driving ops.|drones,self-driving,space|1|0|📍|bad
gene-therapy-approval|Gene therapy approval wave|Regulators clear more therapies. Genetic engineering will eases.|genetic-engineering,synbio|0|-1|✅|good
clinic-sequencer-rebate|Clinic sequencer rebate|Public health rebates portable sequencing kits.|gene-sequencing|-1|0|🏥|good
gmo-crop-ban-talk|GMO crop ban talk spreads|Farm politics harden. Synbio and genetic engineering need more will.|synbio,genetic-engineering,alt-proteins|0|1|🌾|bad
alt-protein-price-parity|Alt-protein price parity|Plant and fermentation proteins hit cost parity in more cafeterias.|alt-proteins|-1|-1|🥗|good
cultured-meat-ban|Cultured meat ban in key market|A ban raises political cost for alternative proteins.|alt-proteins,synbio|0|2|🚫|bad
bci-trial-success|BCI trial restores speech|Positive trial coverage lowers political friction for brain-computer interfaces.|bci|0|-1|🧠|good
bci-ethics-probe|BCI ethics probe opens|Consent and data fears raise will cost for neural interfaces.|bci|0|1|🔍|bad
pandemic-stockpile|Pandemic stockpile restock|Public buyers bulk-order diagnostics. Gene sequencing capital eases.|gene-sequencing,synbio|-1|0|🧪|good
synbio-ip-thicket|Synbio IP thicket|Licensing fights raise capital for synthetic biology builds.|synbio|1|0|📄|bad
crispr-tool-drop|CRISPR tool prices drop|Gene-editing reagents get cheaper for local labs.|genetic-engineering,synbio|-1|0|✂|good
blood-sample-privacy|Blood sample privacy law|Biobank rules tighten. Sequencing and BCI projects need more will.|gene-sequencing,bci|0|1|🩸|bad
school-lunch-proteins|School lunch protein pilots|Public kitchens trial alt proteins — political path opens.|alt-proteins|0|-1|🍎|good
vr-headset-clearance|VR headset clearance sale|Enterprise returns flood the market. VR capital drops.|vr|-1|0|🕶|good
ar-workplace-mandate|AR workplace safety mandate|Factories fund AR training — Link domain will eases.|@link|0|-1|🦺|good
motion-sickness-report|Motion sickness report goes viral|VR adoption politics worsen for a season.|vr|0|1|🤢|bad
metaverse-budget-purge|Metaverse budget purge|Big tech cuts hurt headset supply chains; short-term prices spike.|vr|1|0|🧹|bad
medical-vr-therapy|Medical VR therapy covered|Insurers reimburse VR therapy modules. Will and capital ease.|vr|-1|-1|🩺|good
iot-chip-shortage|IoT chip shortage returns|Sensor nodes get pricier for civic builds.|iot|1|0|📟|bad
smart-city-grant|Smart city sensor grant|A federal program funds IoT for water, air, and flood meters.|iot,networks|-1|-1|🏙|good
nano-hype-funding|Nano materials hype funding|A materials sprint drops nano and advanced materials capital.|nano,materials|-1|0|🔬|good
nano-toxicity-study|Nano toxicity study alarms public|Safety reviews raise will cost for nano projects.|nano|0|1|⚠|bad
recycled-filaments|Recycled 3D filaments flood market|Print feedstock gets cheaper for local fab.|print3d,materials|-1|0|♻️|good
printer-fire-recall|3D printer fire recall|Insurance and compliance raise print3d capital.|print3d|1|1|🔥|bad
materials-tariff|Advanced materials tariff|Import duties hit specialty materials and nano feedstocks.|materials,nano|1|0|🚢|bad
open-hardware-license|Open hardware license wave|Shared designs cut materials and print3d project capital.|print3d,materials,iot|-1|0|🔓|good
right-to-repair-win|Right-to-repair win|Local repair laws favor maintainable IoT and print stacks.|iot,print3d,robots|0|-1|🔧|good
e-waste-crackdown|E-waste crackdown|Disposal fees raise capital for hardware-heavy portal stacks.|@portal|1|0|🗑|bad
interest-rate-hike|Interest rate hike|Capital markets tighten. Almost every hardware stack costs more to fund.|*|1|0|📈|bad
stimulus-tech-window|Stimulus tech window|A short spending window softens capital for local tech pilots.|*|-1|0|🪟|good
election-year-caution|Election-year caution|Officials avoid controversial tech. Will rises across frontier stacks.|@automator,@lifeforce,@link|0|1|🗳|bad
mayors-innovation-pact|Mayors innovation pact|Cities share procurement templates. Political will eases for multi-domain pilots.|*|0|-1|🤝|good
cyberattack-week|Cyberattack week|Security mandates raise costs for networks, IoT, AI, and crypto.|networks,iot,ai,crypto|1|1|🛡|bad
open-data-law|Open data law passes|Cities publish APIs. Networks and IoT projects face less political friction.|networks,iot,ai|0|-1|🗂|good
talent-visa-freeze|Talent visa freeze|Skilled labor shortages raise costs for computing, AI, and quantum.|computing,ai,quantum|1|0|🛂|bad
university-lab-share|University lab share program|Shared equipment lowers capital for gene, quantum, and materials work.|gene-sequencing,quantum,materials,synbio|-1|0|🎓|good
insurance-premium-spike|Tech pilot insurance spike|Underwriters raise premiums on drones, robots, and nuclear-adjacent work.|drones,robots,nuclear,battery|1|0|📋|bad
philanthropy-sprint|Philanthropy sprint for local tech|Foundations match municipal invent funds. Capital eases across the board.|*|-1|0|💝|good
disinfo-wave|Disinfo wave about tech pilots|Rumors force extra community process. Will rises for visible stacks.|@automator,@mover,@lifeforce|0|1|💬|bad
youth-climate-march|Youth climate march|Street pressure softens will for clean power and materials stacks.|@power,@portal|0|-1|✊|good
crypto-crash|Crypto crash|Speculative heat dies; remaining civic ledger work needs less will, more careful capital.|crypto|1|-1|📉|mixed
stablecoin-payroll|Stablecoin payroll pilots|Cities trial transparent local funds. Crypto capital eases slightly.|crypto,networks|-1|0|💰|good
bci-data-breach|BCI vendor data breach|Neural data fears spike will cost for BCI.|bci|0|2|🔓|bad
space-earth-obs-deal|Earth observation deal for towns|Cheap satellite data feeds local planning. Space and AI capital ease.|space,ai,networks|-1|0|🌎|good
self-driving-pedestrian-incident|Self-driving pedestrian incident|A high-profile crash freezes will for autonomy.|self-driving|0|2|🚨|bad
drone-delivery-holiday|Drone delivery holiday rush|Seasonal demand drops drone hardware prices after overstock.|drones|-1|0|🎁|good
materials-breakthrough|Lab materials breakthrough|A published process cuts specialty materials cost.|materials,nano|-1|0|✨|good
quantum-error-milestone|Quantum error-correction milestone|Hype returns with substance; quantum will eases, capital still high.|quantum|0|-1|⚛|good
network-neutrality-fight|Network neutrality fight|ISPs and cities clash. Networks will cost rises.|networks|0|1|⚖|bad
fab-lab-franchise|Fab lab franchise wave|Standardized print shops lower print3d startup capital.|print3d|-1|0|🏗|good
robot-nurse-pilot|Robot nurse pilot praised|Care outcomes soften political resistance to robots.|robots,ai|0|-1|👩‍⚕️|good
energy-poverty-fund|Energy poverty fund|Targeted funds cut capital for solar, battery, and energy access stacks.|solar,battery,energy|-1|0|💡|good
storm-rebuild-surge|Storm rebuild surge|Demand spikes materials and drones; short-term capital rises.|materials,drones,print3d,iot|1|0|🏚|bad
public-trust-rebound|Public trust rebound poll|After quiet wins, will eases slightly across automator and mover tech.|@automator,@mover|0|-1|📊|good
global-shipping-jam|Global shipping jam|Hardware lead times stretch; power and portal budgets climb.|@power,@portal|1|0|🚢|bad
local-currency-pilot|Local currency and ledger pilot|Municipal ledger pilots normalize crypto tooling.|crypto|0|-1|🪙|good
ai-exam-cheating-panic|AI exam cheating panic|Schools restrict AI; will cost rises for education-facing AI.|ai|0|1|📝|bad
flood-sensor-rebate|Flood sensor rebate|Water districts rebate IoT kits after a wet season.|iot,networks|-1|0|💧|good
heatwave-grid-alert|Heatwave grid alert|Peak demand politics favor batteries and demand tech.|battery,energy,solar|0|-1|🌡|good
venture-winter|Venture winter for deep tech|Private capital flees long-horizon stacks; quantum and space budgets rise.|quantum,space,synbio|1|0|🥶|bad
co-op-procurement|Co-op multi-city procurement|Cities bulk-buy sensors and panels together. Capital eases for IoT and solar.|iot,solar,battery|-1|0|🛒|good
"""


def parse_events():
    events = []
    for line in RAW.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) != 8:
            raise SystemExit(f"bad line ({len(parts)} parts): {line[:80]}")
        id_, headline, body, scope, b, w, icon, tone = parts
        e = {
            "id": id_,
            "headline": headline,
            "body": body,
            "budgetDelta": int(b),
            "willDelta": int(w),
            "icon": icon,
            "tone": tone,
            "imagePrompt": (
                "Editorial news illustration for a strategy board game about emerging technology. "
                f"Scene: {headline}. Cinematic 16:9, rich color, no readable text, no logos, no watermarks."
            ),
            "image": f"assets/market-news/{id_}.jpg",
        }
        if scope == "*":
            e["all"] = True
        else:
            domains = []
            techs = []
            for s in scope.split(","):
                s = s.strip()
                if s.startswith("@"):
                    domains.append(s[1:])
                else:
                    techs.append(s)
            if techs:
                e["techIds"] = techs
            if domains:
                e["domains"] = domains
        events.append(e)

    ids = [e["id"] for e in events]
    if len(ids) != len(set(ids)):
        dups = sorted({i for i in ids if ids.count(i) > 1})
        raise SystemExit(f"duplicate ids: {dups}")
    for e in events:
        for t in e.get("techIds") or []:
            if t not in VALID:
                raise SystemExit(f"bad tech {t} in {e['id']}")
        for d in e.get("domains") or []:
            if d not in DOMAINS:
                raise SystemExit(f"bad domain {d} in {e['id']}")
    return events


def emit_event(e: dict) -> str:
    lines = ["  {"]
    lines.append(f'    id: {json.dumps(e["id"], ensure_ascii=False)},')
    lines.append(f'    headline: {json.dumps(e["headline"], ensure_ascii=False)},')
    lines.append(f'    body: {json.dumps(e["body"], ensure_ascii=False)},')
    if e.get("techIds"):
        lines.append(f'    techIds: {json.dumps(e["techIds"])},')
    if e.get("domains"):
        lines.append(f'    domains: {json.dumps(e["domains"])},')
    if e.get("all"):
        lines.append("    all: true,")
    lines.append(f'    budgetDelta: {int(e["budgetDelta"])},')
    lines.append(f'    willDelta: {int(e["willDelta"])},')
    lines.append(f'    icon: {json.dumps(e["icon"], ensure_ascii=False)},')
    lines.append(f'    tone: {json.dumps(e["tone"])},')
    lines.append(f'    imagePrompt: {json.dumps(e["imagePrompt"], ensure_ascii=False)},')
    lines.append(f'    image: {json.dumps(e["image"])},')
    lines.append("  },")
    return "\n".join(lines)


def main():
    events = parse_events()
    print(f"events: {len(events)}")
    body = "\n".join(emit_event(e) for e in events)
    src = OUT.read_text(encoding="utf-8")
    start = src.index("export const MARKET_EVENTS = [")
    marker = "\n\n/**\n * Does this market event apply to tech `t`?"
    arr_close = src.index(marker)
    close = src.rindex("];", start, arr_close)
    new_src = (
        src[:start]
        + "export const MARKET_EVENTS = [\n"
        + body
        + "\n];"
        + src[close + 2 :]
    )
    new_src = new_src.replace(
        "/** Curated bank of world events that reprice emerging tech. */",
        f"/** Curated bank of world events that reprice emerging tech ({len(events)} cards). */",
        1,
    )
    # also if already rewritten
    new_src = re.sub(
        r"/\*\* Curated bank of world events that reprice emerging tech(?: \(\d+ cards\))?\. \*/",
        f"/** Curated bank of world events that reprice emerging tech ({len(events)} cards). */",
        new_src,
        count=1,
    )
    OUT.write_text(new_src, encoding="utf-8")
    print(f"wrote {OUT}")
    # manifest for image generator
    manifest = ROOT / "assets/market-news/manifest.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(
        json.dumps(
            [
                {
                    "id": e["id"],
                    "headline": e["headline"],
                    "imagePrompt": e["imagePrompt"],
                    "image": e["image"],
                }
                for e in events
            ],
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {manifest}")


if __name__ == "__main__":
    main()
