#!/usr/bin/env python3
"""Generate 30 animal + 20 plant species into digram shards. Does not touch parallax."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data" / "education" / "species"
SHARDS = ROOT / "shards"


def shard_id(slug: str) -> str:
    return "".join(c for c in slug.lower() if c.isalnum())[:2]


LANG_NAMES = {"pap": "Papiamento", "es": "Spanish", "nl": "Dutch", "fr": "French", "pt": "Portuguese"}


def map_status(raw: str) -> str:
    text = raw or ""
    if re.search(r"extinct", text, re.I):
        return "Extinct"
    if re.search(r"critically|endangered", text, re.I):
        return "Critical"
    if re.search(r"vulnerable|near.?threatened|threatened|cites|depleted", text, re.I):
        return "Bad"
    return "Good"


def taxonomy_line(typ: str, tags: list[str]) -> str:
    kind = "Animal" if typ == "animal" else "Plant"
    pick = [t for t in tags if t not in {"endangered", "invasive"}][:2]
    parts = [kind, *[t.replace("-", " ").title() for t in pick]]
    out = []
    for p in parts:
        if p.lower() not in {x.lower() for x in out}:
            out.append(p)
    return " · ".join(out)


def languages_block(popular: str, translations: dict | None) -> dict:
    tr = translations or {}
    other = []
    for code, name in tr.items():
        if code in ("pap", "en") or not name:
            continue
        other.append({"lang": LANG_NAMES.get(code, code), "name": name})
        if len(other) >= 3:
            break
    return {
        "indigenous": {"lang": "Papiamento", "name": tr.get("pap") or ""},
        "english": popular,
        "other": other,
    }


def help_caution(tags: list[str], typ: str, status: str, slug: str) -> tuple[str, str]:
    tagset = set(tags)
    if "turtle" in tagset or "turtle" in slug:
        return (
            "Keep nesting beaches dark and clear; support marine protected areas.",
            "Never buy turtle products; don’t block crawlways or touch nesting turtles.",
        )
    if "shark" in tagset or "ray" in tagset:
        return (
            "Respect distance on the reef; support healthy fish stocks sharks need.",
            "Don’t bait, chase, or grab rays and sharks for photos.",
        )
    if "coral" in tagset or "builder" in tagset or "cnidarian" in tagset:
        return (
            "Use reef-safe sunscreen; choose operators that don’t touch or kick coral.",
            "Never stand on, break, or collect living coral.",
        )
    if "mangrove" in tagset:
        return (
            "Protect shoreline buffers; support mangrove restoration projects.",
            "Don’t clear mangrove roots for beach access or dump trash in lagoons.",
        )
    if "seagrass" in tagset or "meadow" in tagset:
        return (
            "Anchor in sand, not grass; support seagrass-friendly boat habits.",
            "Don’t drive propellers through meadows or dig up plants.",
        )
    if status == "Critical":
        return (
            "Back local reef and wildlife protection; share accurate stories, not souvenirs.",
            "Avoid wildlife trade, reckless collecting, and operators that harass animals.",
        )
    if status == "Bad":
        return (
            "Choose low-impact snorkel habits and support recovery efforts.",
            "Don’t take shells, fans, or live animals home as trophies.",
        )
    if typ == "plant":
        return (
            "Leave living plants where they grow; reduce nutrient runoff when you can.",
            "Don’t uproot algae or seagrass for aquariums without permits.",
        )
    return (
        "Give wildlife space; pick reef-safe sunscreen and careful finning.",
        "Don’t feed fish, chase animals, or pocket living souvenirs.",
    )


def sp(
    id: str,
    typ: str,
    popular: str,
    sci: str,
    tags: list[str],
    habits: dict,
    facts: list[str],
    translations: dict | None = None,
    status: str = "Not Evaluated",
    aliases: list[str] | None = None,
):
    mapped = map_status(status)
    help_by, caution = help_caution(tags, typ, mapped, id)
    eating = " ".join(x for x in [habits.get("food"), habits.get("feeding")] if x)
    habitat = " ".join(x for x in [habits.get("dwelling"), habits.get("socializing")] if x)
    rec = {
        "id": id,
        "shard": shard_id(id),
        "type": typ,
        "popular_name": popular,
        "taxonomy": taxonomy_line(typ, tags),
        "scientific_name": sci,
        "languages": languages_block(popular, translations),
        "conservation": {
            "status": mapped,
            "help_by": help_by,
            "caution_against": caution,
            "life_info": {
                "eating": eating or "Life details coming soon.",
                "mating": habits.get("mating") or "Life details coming soon.",
                "habitat": habitat or "Life details coming soon.",
            },
        },
        "fun_facts": facts[:5],
        "images": [],
        "tags": tags,
    }
    return rec, {
        "id": id,
        "name": popular,
        "scientific_name": sci,
        "shard": rec["shard"],
        "type": typ,
        "tags": tags,
        "aliases": aliases or [],
    }


def plant_habits(dwelling: str, note: str = "Photosynthetic primary producer.") -> dict:
    return {
        "dwelling": dwelling,
        "food": note,
        "feeding": "Makes energy from sunlight (and sometimes from clear shallow water light).",
        "mating": "Spreads by spores, seeds, propagules, or creeping rhizomes depending on the species.",
        "socializing": "Forms habitat structure that shelters fish, crabs, and invertebrates.",
    }


animals = [
    sp(
        "blue-tang", "animal", "Blue Tang", "Acanthurus coeruleus",
        ["fish", "reef", "herbivore"],
        {
            "dwelling": "Caribbean coral reefs and rocky shallows where algae coats the rock.",
            "food": "Turf algae and film scraped from reef surfaces.",
            "feeding": "Pecks and scrapes with a small beak-like mouth — a living reef janitor.",
            "mating": "Spawns in groups over the reef at dusk; eggs drift with the current.",
            "socializing": "Juveniles are bright yellow loners; adults may school or keep a cleaning circuit.",
        },
        [
            "Kids know this look from cartoon reefs — the real fish prefers salad to adventure.",
            "Those scalpels at the tail base are real: don’t grab a tang.",
        ],
        {"es": "Cirujano azul", "pap": "Blowtang"}, "Least Concern (IUCN)",
        ["blue surgeonfish", "Atlantic blue tang"],
    ),
    sp(
        "french-angelfish", "animal", "French Angelfish", "Pomacanthus paru",
        ["fish", "reef", "pair-bonding"],
        {
            "dwelling": "Coral reefs and wreck edges from snorkel depths to deeper drop-offs.",
            "food": "Sponges, tunicates, and algae picked from the reef.",
            "feeding": "Pairs patrol a territory, nipping sponges that other fish ignore.",
            "mating": "Usually close pairs that swim flank to flank.",
            "socializing": "Juveniles are bold black-and-yellow cleaners; adults stay close as a duo.",
        },
        [
            "Young French angels run tiny cleaning stations — a spa day for bigger fish.",
            "Yellow bars fade as they grow into elegant black-and-gold adults.",
        ],
        {"es": "Ángel francés", "pap": "Angel francés"}, "Least Concern (IUCN)",
        ["french angel"],
    ),
    sp(
        "queen-angelfish", "animal", "Queen Angelfish", "Holacanthus ciliaris",
        ["fish", "reef", "colorful"],
        {
            "dwelling": "Clear Caribbean reefs with caves and coral heads for shelter.",
            "food": "Mostly sponges, plus algae and small invertebrates.",
            "feeding": "Picks carefully at sponges — royalty with a picky menu.",
            "mating": "Pairs defend a home stretch of reef.",
            "socializing": "Shy of snorkelers but curious from a polite distance.",
        },
        [
            "A blue crown-like spot on the head earns the royal nickname.",
            "One of the brightest billboards on a healthy reef.",
        ],
        {"es": "Ángel reina", "pap": "Queen angel"}, "Least Concern (IUCN)",
    ),
    sp(
        "stoplight-parrotfish", "animal", "Stoplight Parrotfish", "Sparisoma viride",
        ["fish", "reef", "herbivore", "parrotfish"],
        {
            "dwelling": "Seagrass beds and coral reefs; sleeps in a mucus cocoon by night.",
            "food": "Algae scraped from rock and dead coral.",
            "feeding": "Beak bites leave pale scrapes; sand in their waste helps build beaches.",
            "mating": "Complex sex change: some females become bright terminal-phase males.",
            "socializing": "Daytime grazing groups; night solo sleepers in slimy sleeping bags.",
        },
        [
            "Much soft white beach sand started as parrotfish poop — glamorous, right?",
            "The ‘stoplight’ name nods to red, yellow, and green color phases.",
        ],
        {"es": "Loro semáforo", "pap": "Prikichi"}, "Least Concern (IUCN)",
        ["parrotfish", "green parrotfish"],
    ),
    sp(
        "blue-parrotfish", "animal", "Blue Parrotfish", "Scarus coeruleus",
        ["fish", "reef", "herbivore", "parrotfish"],
        {
            "dwelling": "Shallow reefs and rubble where algae grows thick.",
            "food": "Algae and coral rock scraped with fused teeth.",
            "feeding": "Loud crunching you can sometimes hear underwater.",
            "mating": "Aggregates to spawn; colors flash during courtship.",
            "socializing": "Often in loose schools sweeping a reef face.",
        },
        [
            "Big blues look painted with one giant watercolor wash.",
            "Their beak is many teeth fused into a chisel.",
        ],
        {"es": "Loro azul", "pap": "Prikichi blauw"}, "Least Concern (IUCN)",
    ),
    sp(
        "yellowtail-snapper", "animal", "Yellowtail Snapper", "Ocyurus chrysurus",
        ["fish", "reef", "snapper"],
        {
            "dwelling": "Reef edges, wrecks, and sandy channels.",
            "food": "Small fish, shrimp, and crabs.",
            "feeding": "Quick dashes from midwater to snap prey.",
            "mating": "Spawns offshore in groups.",
            "socializing": "Often schools above the reef like a yellow-striped cloud.",
        },
        [
            "The bright yellow tail is a built-in ID badge for snorkelers.",
            "A favorite of divers and dinner menus — follow local catch rules.",
        ],
        {"es": "Rabirrubia", "pap": "Yellowtail"}, "Least Concern (IUCN)",
        ["rabirrubia"],
    ),
    sp(
        "great-barracuda", "animal", "Great Barracuda", "Sphyraena barracuda",
        ["fish", "predator", "reef"],
        {
            "dwelling": "Reef edges, seagrass, and nearshore blue water — still as a spear.",
            "food": "Fish ambushed with a burst of speed.",
            "feeding": "Hangs motionless, then rockets forward.",
            "mating": "Broadcast spawners in open water.",
            "socializing": "Young school; big adults often hunt alone.",
        },
        [
            "Usually ignore people — shiny jewelry interests them more than you do.",
            "Teeth point backward: once a fish is in, it’s not swimming out.",
        ],
        {"es": "Picuda", "pap": "Barracuda"}, "Least Concern (IUCN)",
        ["barracuda", "picuda"],
    ),
    sp(
        "spotted-eagle-ray", "animal", "Spotted Eagle Ray", "Aetobatus narinari",
        ["ray", "reef", "graceful"],
        {
            "dwelling": "Sandy flats and reef passes; sometimes leaps clear of the water.",
            "food": "Clams, snails, and crabs crushed with plate-like teeth.",
            "feeding": "Digs in sand with a duck-like snout, then crunches lunch.",
            "mating": "Live-bearing; pups arrive ready to swim.",
            "socializing": "May cruise alone or in elegant small squadrons.",
        },
        [
            "Polka dots on a flying carpet — one of the ocean’s best costumes.",
            "Those leaps might shake off remoras… or just show off.",
        ],
        {"es": "Chucho pintado", "pap": "Raya águila"}, "Near Threatened (IUCN)",
        ["eagle ray"],
    ),
    sp(
        "southern-stingray", "animal", "Southern Stingray", "Hypanus americanus",
        ["ray", "sand", "benthic"],
        {
            "dwelling": "Buried in sand flats — often only eyes and spiracles show.",
            "food": "Worms, crabs, and clams found by electro-sense.",
            "feeding": "Flips sand with wingbeats, then vacuums hidden snacks.",
            "mating": "Live-bearing; nursery flats can hold many young rays.",
            "socializing": "Mostly solitary couch potatoes of the seafloor.",
        },
        [
            "Shuffle your feet in sand — a polite knock so rays can scoot away.",
            "The barb is defense, not a hunting spear.",
        ],
        {"es": "Raya látigo", "pap": "Raya"}, "Near Threatened (IUCN)",
        ["stingray"],
    ),
    sp(
        "nurse-shark", "animal", "Nurse Shark", "Ginglymostoma cirratum",
        ["shark", "reef", "nocturnal"],
        {
            "dwelling": "Rests under ledges by day; patrols reefs at night.",
            "food": "Lobsters, crabs, and sleepy fish sucked up like a vacuum.",
            "feeding": "Barbels by the mouth feel for prey in crevices.",
            "mating": "Eggs hatch inside the mother (ovoviviparous).",
            "socializing": "Daytime piles can look like a sleepy shark slumber party.",
        },
        [
            "Gentle unless provoked — don’t pull tails for a photo.",
            "They can sit still for hours, pumping water over their gills.",
        ],
        {"es": "Tiburón gata", "pap": "Tiburón nurse"}, "Vulnerable (IUCN)",
    ),
    sp(
        "caribbean-reef-shark", "animal", "Caribbean Reef Shark", "Carcharhinus perezi",
        ["shark", "reef", "predator"],
        {
            "dwelling": "Drop-offs and reef walls with clear water and current.",
            "food": "Reef fish and rays.",
            "feeding": "Curious inspector that may circle divers — give space.",
            "mating": "Live-bearing with small litters.",
            "socializing": "Often alone or in loose groups along a wall.",
        },
        [
            "A classic reef-shark silhouette for Caribbean wall dives.",
            "Healthy shark numbers usually mean a healthy reef pantry.",
        ],
        {"es": "Tiburón de arrecife", "pap": "Tiburón di rif"}, "Endangered (IUCN)",
        ["reef shark"],
    ),
    sp(
        "hawksbill-turtle", "animal", "Hawksbill Turtle", "Eretmochelys imbricata",
        ["reptile", "turtle", "endangered", "reef"],
        {
            "dwelling": "Coral reefs rich in sponges; nests on tropical beaches.",
            "food": "Sponges — one of the few animals that dine on them.",
            "feeding": "Narrow beak reaches into reef cracks for sponge bites.",
            "mating": "Females nest on beaches; hatchlings race to the sea.",
            "socializing": "Mostly solitary reef wanderers.",
        },
        [
            "Named for a hawk-like beak perfect for sponge surgery.",
            "Critically endangered — shell trade and habitat loss hit them hard.",
        ],
        {"es": "Tortuga carey", "pap": "Karetturtuga"}, "Critically Endangered (IUCN)",
        ["carey", "hawksbill"],
    ),
    sp(
        "loggerhead-turtle", "animal", "Loggerhead Turtle", "Caretta caretta",
        ["reptile", "turtle", "endangered"],
        {
            "dwelling": "Open ocean and coastal bays; powerful jaws for hard prey.",
            "food": "Crabs, conchs, and other crunchy invertebrates.",
            "feeding": "Big head and jaws crack shells other turtles can’t.",
            "mating": "Famous nesting beaches; females may travel huge distances.",
            "socializing": "Solitary travelers between feeding and nesting grounds.",
        },
        [
            "The logger head is packed with muscle for shell-cracking.",
            "Hatchlings use Earth’s magnetic field like a built-in GPS.",
        ],
        {"es": "Tortuga boba", "pap": "Turtuga cabezú"}, "Vulnerable (IUCN)",
        ["loggerhead"],
    ),
    sp(
        "bottlenose-dolphin", "animal", "Bottlenose Dolphin", "Tursiops truncatus",
        ["mammal", "cetacean", "coastal"],
        {
            "dwelling": "Bays, channels, and nearshore blue water in social groups.",
            "food": "Fish and squid hunted with teamwork and echolocation.",
            "feeding": "Herding, mud-ring feeding, and clever local tricks.",
            "mating": "Calves stay with mothers for years learning dolphin school.",
            "socializing": "Pods chat with clicks and whistles — ocean gossip.",
        },
        [
            "Each dolphin may have a unique whistle ‘name’ friends recognize.",
            "They sleep with one eye open — half the brain naps at a time.",
        ],
        {"es": "Delfín nariz de botella", "pap": "Dolfijn"}, "Least Concern (IUCN)",
        ["dolphin", "delfín"],
    ),
    sp(
        "french-grunt", "animal", "French Grunt", "Haemulon flavolineatum",
        ["fish", "reef", "schooling"],
        {
            "dwelling": "Aruba reef edges, mangrove channels, and sandy patches near coral heads.",
            "food": "Small crustaceans and worms taken from sand at night.",
            "feeding": "Daytime schools hover over the reef; nighttime they fan out to forage.",
            "mating": "Spawns in groups; larvae settle back to shallow nurseries.",
            "socializing": "Classic yellow-striped schools — a staple snorkel sight around the ABC islands.",
        },
        [
            "Named for the grunting sounds they make with teeth and swim bladder.",
            "Often share daytime hangouts with other grunt species over the same coral head.",
        ],
        {"es": "Ronco francés", "pap": "French grunt"}, "Least Concern (IUCN)",
        ["grunt", "ronco"],
    ),
    sp(
        "caribbean-flamingo", "animal", "Caribbean Flamingo", "Phoenicopterus ruber",
        ["bird", "coastal", "lagoon"],
        {
            "dwelling": "Salty lagoons and shallow flats with muddy bottoms.",
            "food": "Shrimp and microbes that dye feathers pink-orange.",
            "feeding": "Upside-down bill filters tiny food from water.",
            "mating": "Colony nesters with dramatic group dances.",
            "socializing": "Huge pink flocks are a Caribbean postcard come alive.",
        },
        [
            "You are what you eat — without pink prey, feathers fade.",
            "Those ‘backward knees’ are mostly ankles.",
        ],
        {"es": "Flamenco", "pap": "Flamengu"}, "Least Concern (IUCN)",
        ["flamingo", "flamenco"],
    ),
    sp(
        "magnificent-frigatebird", "animal", "Magnificent Frigatebird", "Fregata magnificens",
        ["bird", "pelagic", "coastal"],
        {
            "dwelling": "Roosts on mangroves and cliffs; soars over coastal water all day.",
            "food": "Fish snatched from the surface — and snacks stolen from other birds.",
            "feeding": "Pirate of the sky: harasses boobies until they drop a catch.",
            "mating": "Males inflate a huge red throat balloon to impress.",
            "socializing": "Colonies argue loudly; in air they look like flying Ws.",
        },
        [
            "They can soar for hours without flapping — ocean hang-gliders.",
            "Feathers aren’t very waterproof, so they rarely land on the sea.",
        ],
        {"es": "Fragata", "pap": "Man-o-war bird"}, "Least Concern (IUCN)",
        ["frigatebird", "man-o-war bird"],
    ),
    sp(
        "laughing-gull", "animal", "Laughing Gull", "Leucophaeus atricilla",
        ["bird", "coastal", "beach"],
        {
            "dwelling": "Beaches, docks, and parking lots with a view of fries.",
            "food": "Fish, crabs, scraps — opportunistic beach comedians.",
            "feeding": "Pecks the wrack line; also follows boats for handouts.",
            "mating": "Nests in colonies on sandy islands.",
            "socializing": "Named for a laugh-like call that fills every pier.",
        },
        [
            "That ‘ha-ha-ha’ call is why they’re never quiet vacation guests.",
            "Summer black hoods molt to a winter smudge.",
        ],
        {"es": "Gaviota reidora", "pap": "Meeuw"}, "Least Concern (IUCN)",
        ["gull"],
    ),
    sp(
        "royal-tern", "animal", "Royal Tern", "Thalasseus maximus",
        ["bird", "coastal", "diving"],
        {
            "dwelling": "Beaches and inlets; rests in neat lines facing the wind.",
            "food": "Small fish dive-caught from a hover.",
            "feeding": "Plunge-dives with a splash and a triumphant swallow.",
            "mating": "Colony nesters on sandy scrapes.",
            "socializing": "Crested royalty posing for beach photos.",
        },
        [
            "The shaggy black crest looks like it woke up fabulous.",
            "Often stands with bills into the breeze like weather vanes.",
        ],
        {"es": "Charrán real", "pap": "Stern"}, "Least Concern (IUCN)",
        ["tern"],
    ),
    sp(
        "green-moray", "animal", "Green Moray", "Gymnothorax funebris",
        ["eel", "reef", "nocturnal"],
        {
            "dwelling": "Reef holes and wrecks; head often peeking from a den.",
            "food": "Fish, crabs, and octopus hunted at night.",
            "feeding": "Ambush from a crevice; pharyngeal jaws pull prey in.",
            "mating": "Open-water larval stage before settling on a reef.",
            "socializing": "Looks angry when breathing — open mouth is gill work.",
        },
        [
            "The green color is a mucus coat over brownish skin.",
            "Give dens space; a surprised moray has a strong bite.",
        ],
        {"es": "Morena verde", "pap": "Morena"}, "Least Concern (IUCN)",
        ["moray", "moray eel"],
    ),
    sp(
        "spotted-moray", "animal", "Spotted Moray", "Gymnothorax moringa",
        ["eel", "reef", "nocturnal"],
        {
            "dwelling": "Coral heads and rocky holes across Caribbean reefs.",
            "food": "Crustaceans and small fish.",
            "feeding": "Night hunter with a leopard-print tuxedo.",
            "mating": "Pelagic larvae ride currents to new reefs.",
            "socializing": "Usually one eel per favorite hole.",
        },
        [
            "Spots help it vanish against dappled reef light.",
            "Open-mouth look is breathing, not a threat display.",
        ],
        {"es": "Morena pintada", "pap": "Morena spikkel"}, "Least Concern (IUCN)",
    ),
    sp(
        "caribbean-reef-octopus", "animal", "Caribbean Reef Octopus", "Octopus briareus",
        ["cephalopod", "reef", "nocturnal"],
        {
            "dwelling": "Reef crevices and rubble; masters of hide-and-seek.",
            "food": "Crabs and snails drilled or pulled apart.",
            "feeding": "Arms explore cracks while the body stays tucked.",
            "mating": "Female guards eggs; male uses a specialized arm.",
            "socializing": "Solitary geniuses with soft-body escape art.",
        },
        [
            "Color and texture change in a blink — living camouflage.",
            "Three hearts and blue blood keep the alien vibes strong.",
        ],
        {"es": "Pulpo de arrecife", "pap": "Octopus"}, "Not Evaluated",
        ["octopus", "pulpo"],
    ),
    sp(
        "caribbean-spiny-lobster", "animal", "Caribbean Spiny Lobster", "Panulirus argus",
        ["crustacean", "reef", "nocturnal"],
        {
            "dwelling": "Under coral ledges by day; marches across sand at night.",
            "food": "Snails, crabs, and carrion.",
            "feeding": "Antennae-first explorer of the night reef.",
            "mating": "Females carry eggs under the tail like an orange berry cluster.",
            "socializing": "Famous for single-file migration queues across the seafloor.",
        },
        [
            "No big claws — defense is spines and a fast tail flip.",
            "Long antennae combine touch and smell.",
        ],
        {"es": "Langosta", "pap": "Kreef"}, "Data Deficient (IUCN)",
        ["spiny lobster", "langosta", "lobster"],
    ),
    sp(
        "queen-conch", "animal", "Queen Conch", "Aliger gigas",
        ["mollusk", "seagrass", "endangered"],
        {
            "dwelling": "Seagrass beds and sandy shallows.",
            "food": "Algae and organic film grazed with a rasping tongue.",
            "feeding": "Slow lawnmower of the grass beds.",
            "mating": "Egg strands look like sandy spaghetti on the bottom.",
            "socializing": "Overharvested in many places — check local rules.",
        },
        [
            "The pink shell interior is a Caribbean icon.",
            "They hop-lurch forward on a strong muscular foot.",
        ],
        {"es": "Carrucho", "pap": "Karkó"}, "CITES / depleted in many areas",
        ["conch", "carrucho", "karkó"],
    ),
    sp(
        "long-spined-sea-urchin", "animal", "Long-Spined Sea Urchin", "Diadema antillarum",
        ["echinoderm", "reef", "herbivore"],
        {
            "dwelling": "Reef crevices and rocky bottoms; spines wave in the surge.",
            "food": "Algae — a key grazer that helps coral stay clear.",
            "feeding": "Night grazing marches across reef rock.",
            "mating": "Broadcast spawners; larvae drift before settling.",
            "socializing": "A 1980s die-off changed Caribbean reefs — recovery still matters.",
        },
        [
            "Step carefully: spines are brittle and painful.",
            "When Diadema vanish, algae can smother coral.",
        ],
        {"es": "Erizo negro", "pap": "See-egel"}, "Not Evaluated",
        ["diadema", "sea urchin", "urchin"],
    ),
    sp(
        "flamingo-tongue-snail", "animal", "Flamingo Tongue Snail", "Cyphoma gibbosum",
        ["mollusk", "reef", "colorful"],
        {
            "dwelling": "On soft corals and sea fans it slowly eats.",
            "food": "Live tissue of gorgonians.",
            "feeding": "Mantle flaps cover the shell with leopard-like spots.",
            "mating": "Lays egg capsules on the same fans it grazes.",
            "socializing": "Tiny living jewelry — look, don’t pocket.",
        },
        [
            "The spots are soft mantle tissue, not paint on the shell.",
            "When threatened, the mantle retracts and the shell looks plain cream.",
        ],
        {"es": "Lengua de flamenco", "pap": "Flamingo tongue"}, "Not Evaluated",
    ),
    sp(
        "elkhorn-coral", "animal", "Elkhorn Coral", "Acropora palmata",
        ["coral", "reef", "endangered", "builder"],
        {
            "dwelling": "High-energy shallow reef crests where waves break.",
            "food": "Symbiotic algae plus captured plankton.",
            "feeding": "Daylight partners (zooxanthellae) live inside the tissue.",
            "mating": "Synchronized night spawning releases egg–sperm bundles.",
            "socializing": "Antler-like thickets shelter countless fish.",
        },
        [
            "Named for branches like elk antlers — Caribbean reef architecture.",
            "Critically endangered after disease and bleaching waves.",
        ],
        {"es": "Coral cuerno de alce", "pap": "Koral eland"}, "Critically Endangered (IUCN)",
        ["acropora"],
    ),
    sp(
        "staghorn-coral", "animal", "Staghorn Coral", "Acropora cervicornis",
        ["coral", "reef", "endangered", "builder"],
        {
            "dwelling": "Back-reef and lagoon patches with branching thickets.",
            "food": "Energy from symbiotic algae plus night zooplankton.",
            "feeding": "Polyps open more at night to snag tiny prey.",
            "mating": "Mass spawning events timed to lunar cycles.",
            "socializing": "Nursery structure for juvenile reef fish.",
        },
        [
            "Looks like underwater deer antlers in dense gardens.",
            "Restoration nurseries grow fragments to replant reefs.",
        ],
        {"es": "Coral cuerno de ciervo", "pap": "Koral hert"}, "Critically Endangered (IUCN)",
    ),
    sp(
        "brain-coral", "animal", "Brain Coral", "Diploria labyrinthiformis",
        ["coral", "reef", "builder"],
        {
            "dwelling": "Reef flats and slopes as boulder-like domes.",
            "food": "Symbiotic algae plus trapped plankton.",
            "feeding": "Maze-like valleys house rows of polyps.",
            "mating": "Broadcast spawning on warm summer nights.",
            "socializing": "Slow growers that can live for centuries.",
        },
        [
            "The maze pattern looks like a brain — animals living in stone.",
            "Touching coral can hurt living tissue — fins up, hands off.",
        ],
        {"es": "Coral cerebro", "pap": "Koral brein"}, "Near Threatened (IUCN)",
        ["diploria"],
    ),
    sp(
        "fire-coral", "animal", "Fire Coral", "Millepora complanata",
        ["cnidarian", "reef", "hydrocoral"],
        {
            "dwelling": "Shallow Aruba reef crests and flats — blade-like yellow-tan colonies in surge.",
            "food": "Symbiotic algae plus plankton stung by tiny polyps.",
            "feeding": "Looks like coral but is a hydrozoan relative of jellyfish.",
            "mating": "Releases medusae; also spreads by colony growth.",
            "socializing": "Forms nursery structure for juvenile reef fish on Aruba’s leeward shallows.",
        },
        [
            "Touching it feels like a bee sting — admire with eyes, not fingers.",
            "Common on Aruba’s shallow reef islands alongside elkhorn stands.",
        ],
        {"es": "Coral de fuego", "pap": "Vuurkoraal"}, "Not Evaluated",
        ["millepora", "blade fire coral"],
    ),
]

plants = [
    sp(
        "red-mangrove", "plant", "Red Mangrove", "Rhizophora mangle",
        ["mangrove", "nursery", "coastal"],
        plant_habits("Prop-root forests along tidal shores and lagoon edges.", "Filters salt at the roots; makes sugar with sunlight."),
        [
            "Kids call the prop roots underwater stilts — and they’re right.",
            "A living breakwater that also stores carbon in muddy soils.",
        ],
        {"es": "Mangle rojo", "pap": "Mangel rood"}, "Least Concern (IUCN)",
        ["mangle rojo", "mangrove"],
    ),
    sp(
        "black-mangrove", "plant", "Black Mangrove", "Avicennia germinans",
        ["mangrove", "coastal", "tidal"],
        plant_habits("Higher intertidal mudflats behind red mangroves.", "Photosynthesis; snorkel roots (pneumatophores) breathe air."),
        [
            "Leaves can excrete salt crystals you can taste.",
            "Pneumatophores are the mangrove’s snorkels at low tide.",
        ],
        {"es": "Mangle negro", "pap": "Mangel pretu"}, "Least Concern (IUCN)",
    ),
    sp(
        "white-mangrove", "plant", "White Mangrove", "Laguncularia racemosa",
        ["mangrove", "coastal"],
        plant_habits("Landward edge of mangrove belts on less soggy soils."),
        [
            "Look for two tiny bumps at the leaf stalk — salt exit doors.",
            "Less famous than red mangrove, still vital shoreline habitat.",
        ],
        {"es": "Mangle blanco", "pap": "Mangel blanku"}, "Least Concern (IUCN)",
    ),
    sp(
        "buttonwood", "plant", "Buttonwood", "Conocarpus erectus",
        ["mangrove", "coastal", "transition"],
        plant_habits("Drier edges of mangrove forests and coastal thickets."),
        [
            "Not always feet-in-water, but still part of the mangrove crew.",
            "Silver-leaf varieties shimmer in coastal wind.",
        ],
        {"es": "Mangle botón", "pap": "Buttonwood"}, "Least Concern (IUCN)",
        ["buttonwood mangrove"],
    ),
    sp(
        "turtle-grass", "plant", "Turtle Grass", "Thalassia testudinum",
        ["seagrass", "nursery", "meadow"],
        plant_habits("Sandy shallows forming wide underwater meadows.", "The pasture of the coastal sea."),
        [
            "Named because green turtles mow it like a salad bar.",
            "Seagrass beds store carbon in sediment — blue-carbon heroes.",
        ],
        {"es": "Hierba de tortuga", "pap": "Sea grass"}, "Threatened locally",
        ["thalassia", "seagrass"],
    ),
    sp(
        "manatee-grass", "plant", "Manatee Grass", "Syringodium filiforme",
        ["seagrass", "meadow"],
        plant_habits("Aruba and ABC lagoons — often mixed with turtle grass in clear shallows.", "Photosynthesis with cylindrical noodle-like leaves."),
        [
            "Leaves look like green spaghetti waving in the current.",
            "Part of Aruba’s native seagrass mix with turtle grass and shoal grass.",
        ],
        {"es": "Hierba de manatí", "pap": "Manati grass"}, "Not Evaluated",
    ),
    sp(
        "shoal-grass", "plant", "Shoal Grass", "Halodule wrightii",
        ["seagrass", "pioneer", "meadow"],
        plant_habits("Disturbed or shallow flats; a pioneer seagrass."),
        [
            "Thin blades make it the fine grass of Caribbean shallows.",
            "Often first to reclaim bare sand after storms or anchors.",
        ],
        {"es": "Hierba de bajío", "pap": "Shoal grass"}, "Not Evaluated",
        ["halodule"],
    ),
    sp(
        "sargassum", "plant", "Sargassum", "Sargassum natans",
        ["algae", "pelagic", "floating"],
        plant_habits("Floats in open-ocean windrows; sometimes blankets beaches.", "Photosynthesis at the sea surface."),
        [
            "Berry-like gas bladders keep the golden weed afloat.",
            "Offshore it’s wildlife habitat; huge beach piles need careful cleanup.",
        ],
        {"es": "Sargazo", "pap": "Sargassum"}, "Not Evaluated",
        ["sargazo", "gulfweed"],
    ),
    sp(
        "sea-lettuce", "plant", "Sea Lettuce", "Ulva lactuca",
        ["algae", "green", "intertidal"],
        plant_habits("Rocks, tide pools, and nutrient-rich shallows."),
        [
            "Looks like plastic lettuce glued to rocks — but it’s alive.",
            "Sheets can be only a few cells thick and still thrive.",
        ],
        {"es": "Lechuga de mar", "pap": "Sea lettuce"}, "Not Evaluated",
        ["ulva"],
    ),
    sp(
        "mermaids-fan", "plant", "Mermaid's Fan", "Udotea flabellum",
        ["algae", "green", "sand"],
        plant_habits("Sandy reef flats and seagrass edges."),
        [
            "Named for looking like a mermaid dropped her fan.",
            "Calcified tissues help it stand upright in surge.",
        ],
        {"es": "Abanico de sirena", "pap": "Mermaid fan"}, "Not Evaluated",
        ["udotea"],
    ),
    sp(
        "mermaids-wine-glass", "plant", "Mermaid's Wine Glass", "Acetabularia crenulata",
        ["algae", "green", "single-cell"],
        plant_habits("Shallow rocky and sandy Caribbean bottoms."),
        [
            "Mostly one giant cell with a stem and a tiny cup — biology magic.",
            "Looks like a field of miniature champagne glasses.",
        ],
        {"es": "Copa de sirena", "pap": "Wine glass algae"}, "Not Evaluated",
        ["acetabularia"],
    ),
    sp(
        "green-feather-algae", "plant", "Green Feather Algae", "Caulerpa sertularioides",
        ["algae", "green", "sand"],
        plant_habits("Sand and reef flats; feather-like fronds from runners."),
        [
            "Feathery fronds sprout from a creeping stolon like underground stems.",
            "Related species can be invasive outside their home range.",
        ],
        {"es": "Alga pluma", "pap": "Feather algae"}, "Not Evaluated",
        ["caulerpa"],
    ),
    sp(
        "y-branched-algae", "plant", "Y-Branched Algae", "Dictyota menstrualis",
        ["algae", "brown", "reef"],
        plant_habits("Reef flats and rocky shallows with Y-shaped tips."),
        [
            "Each tip forks like a tiny letter Y — easy underwater ID.",
            "Can form soft brown carpets after nutrient pulses.",
        ],
        {"es": "Alga dicotómica", "pap": "Dictyota"}, "Not Evaluated",
        ["dictyota"],
    ),
    sp(
        "white-scroll-algae", "plant", "White Scroll Algae", "Padina boergesenii",
        ["algae", "brown", "calcified"],
        plant_habits("Rocky shallows; fan lobes often dusted with white chalk."),
        [
            "Looks like a rolled paper fan dipped in powdered sugar.",
            "Calcium carbonate on the surface helps it feel stiff.",
        ],
        {"es": "Alga abanico", "pap": "Padina"}, "Not Evaluated",
        ["padina"],
    ),
    sp(
        "halimeda", "plant", "Halimeda", "Halimeda opuntia",
        ["algae", "green", "calcified", "sand-maker"],
        plant_habits("Reef flats and lagoons; jointed green coin-like segments."),
        [
            "Calcified segments break down into tropical white sand.",
            "Looks like a string of underwater cactus pads.",
        ],
        {"es": "Halimeda", "pap": "Halimeda"}, "Not Evaluated",
        ["calcareous green algae"],
    ),
    sp(
        "shaving-brush-algae", "plant", "Shaving Brush Algae", "Penicillus capitatus",
        ["algae", "green", "sand"],
        plant_habits("Sandy bottoms; a stalk topped with a soft green brush."),
        [
            "Named because it looks like an old-fashioned shaving brush.",
            "Holdfast anchors it in shifting sand like a tiny tree.",
        ],
        {"es": "Brocha de afeitar", "pap": "Penicillus"}, "Not Evaluated",
        ["penicillus"],
    ),
    sp(
        "sea-grapes", "plant", "Sea Grapes", "Coccoloba uvifera",
        ["coastal", "dune", "tree"],
        plant_habits("Beach berms and coastal thickets just above the tide."),
        [
            "Round leaves and grape-like fruit clusters line many Caribbean roads.",
            "A windbreak tree that loves salt spray.",
        ],
        {"es": "Uva de playa", "pap": "Griffin"}, "Least Concern (IUCN)",
        ["seagrape", "uva de playa"],
    ),
    sp(
        "halophila-seagrass", "plant", "Halophila Seagrass", "Halophila stipulacea",
        ["seagrass", "meadow", "invasive"],
        plant_habits("Aruba lagoons and seagrass beds — an introduced seagrass now mixed with native meadows."),
        [
            "Arrived in the Caribbean via the Suez–Atlantic route and now grows in Aruba MPAs.",
            "Small oval leaves distinguish it from long-bladed turtle grass.",
        ],
        {"es": "Halophila", "pap": "Halophila"}, "Not Evaluated",
        ["halophila", "invasive seagrass"],
    ),
    sp(
        "saucer-blade-algae", "plant", "Saucer Blade Algae", "Avrainvillea asarifolia",
        ["algae", "green", "sand"],
        plant_habits("Sandy and muddy shallows near Aruba mangroves and lagoons."),
        [
            "Soft green blades look like little saucers or lily pads on the sand.",
            "Documented in Aruba mangrove-lagoon biodiversity surveys.",
        ],
        {"es": "Alga platillo", "pap": "Saucer algae"}, "Not Evaluated",
        ["avrainvillea"],
    ),
    sp(
        "batophora-algae", "plant", "Batophora Algae", "Batophora oerstedii",
        ["algae", "green", "lagoon"],
        plant_habits("Quiet hypersaline and mangrove-edge waters of the southern Caribbean, including ABC shores."),
        [
            "Bead-like green stalks common in warm, calm Caribbean shallows.",
            "Often shares lagoon floors with seagrass and mangrove peat around Aruba.",
        ],
        {"es": "Batophora", "pap": "Batophora"}, "Not Evaluated",
        ["batophora"],
    ),
]


def load_existing():
    """Keep brown-pelican, green-sea-turtle, mahi-mahi records from current shards."""
    keep = {}
    for path in SHARDS.glob("*.json"):
        data = json.loads(path.read_text())
        for rec in data.get("species", []):
            if rec.get("id") in {"brown-pelican", "green-sea-turtle", "mahi-mahi"}:
                keep[rec["id"]] = rec
    return keep


def main():
    assert len(animals) == 30, len(animals)
    assert len(plants) == 20, len(plants)

    existing = load_existing()
    by_shard: dict[str, list] = defaultdict(list)
    search_entries = []

    # Existing three first (preserve images + copy)
    for slug in ("brown-pelican", "green-sea-turtle", "mahi-mahi"):
        rec = existing[slug]
        by_shard[rec["shard"]].append(rec)
        search_entries.append(
            {
                "id": rec["id"],
                "name": rec["popular_name"],
                "scientific_name": rec["scientific_name"],
                "shard": rec["shard"],
                "type": rec["type"],
                "tags": rec.get("tags", []),
                "aliases": {
                    "brown-pelican": ["pelican", "pelícano", "pelikaan"],
                    "green-sea-turtle": ["turtle", "tortuga", "turtuga"],
                    "mahi-mahi": ["dorado", "dolphinfish", "mahi"],
                }[slug],
            }
        )

    new_ids = set()
    for rec, entry in animals + plants:
        assert rec["id"] not in existing, rec["id"]
        assert rec["id"] not in new_ids, rec["id"]
        new_ids.add(rec["id"])
        by_shard[rec["shard"]].append(rec)
        search_entries.append(entry)

    # Clear old shards and rewrite
    SHARDS.mkdir(parents=True, exist_ok=True)
    for path in SHARDS.glob("*.json"):
        path.unlink()

    shard_index = []
    for sid in sorted(by_shard.keys()):
        species = sorted(by_shard[sid], key=lambda r: r["id"])
        assert len(species) <= 50, (sid, len(species))
        doc = {"schema_version": "1.1", "shard": sid, "species": species}
        (SHARDS / f"{sid}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        shard_index.append(
            {
                "id": sid,
                "path": f"shards/{sid}.json",
                "count": len(species),
                "label": sid[:1].upper() + sid[1:],
            }
        )

    index = {
        "schema_version": "1.0",
        "last_updated": "2026-07-25",
        "description": "Species shard registry. Shard key = first 2 letters of slug. Hub nav loads this file only; records live in shards/{id}.json.",
        "shard_rule": "slug_prefix_2",
        "max_per_shard": 50,
        "shards": shard_index,
    }
    (ROOT / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")

    search = {
        "schema_version": "1.0",
        "last_updated": "2026-07-25",
        "description": "Lightweight search / trie source. No full species bodies — resolve via shard + slug.",
        "entries": sorted(search_entries, key=lambda e: e["id"]),
    }
    (ROOT / "search-index.json").write_text(json.dumps(search, indent=2, ensure_ascii=False) + "\n")

    n_anim = sum(1 for e in search_entries if e["type"] == "animal")
    n_plant = sum(1 for e in search_entries if e["type"] == "plant")
    print(f"shards={len(shard_index)} entries={len(search_entries)} animals={n_anim} plants={n_plant}")
    print("new animals=30 new plants=20 (plus 3 existing animals)")


if __name__ == "__main__":
    main()
