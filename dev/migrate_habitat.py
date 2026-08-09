#!/usr/bin/env python3
"""Migrate regenerative_habitat catalog + glossary + lean guides into ocean-love data/habitat/."""
from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RH = ROOT.parent / "regenerative_habitat"
OUT = ROOT / "data" / "habitat"
EXPLORE = ROOT / "data" / "explore"
MAX_PER_SHARD = 50
NEARBY_KM = 20
# Ocean Love publishes near-ocean slice only; full regenerative catalog stays in sister repo.
COASTAL_SWIM_MIN = 3
COASTAL_GUIDE_IDS = {"yucatan", "indonesia", "malaysia"}
COASTAL_GLOSSARY_IDS = {
    "regenerative-habitat",
    "food-forest",
    "regenerative-agriculture",
    "rainwater-harvesting",
    "greywater",
    "blackwater",
    "swale",
    "cenote",
    "karst",
    "fideicomiso",
    "permaculture",
    "bioswale",
    "biodigester",
    "thermal-mass",
    "passive-solar",
    "adobe",
    "mayan-vernacular",
}

# Hand-curated ABC coastal habitat stubs so swim-near-ocean can link to explore beaches.
ARUBA_COASTAL_PLACES = [
    {
        "id": "aruba-eagle-coast",
        "name": "Eagle Beach coastal edge",
        "country": "Aruba",
        "region": "West coast",
        "lat": 12.5510,
        "lng": -70.0560,
        "note": "Low-rise coastal living near calm west-coast swim water — planning stub for ocean-love linkages.",
        "scores": {"price": 2, "views": 4, "eco": 3, "swim": 5, "total": 14},
        "land_price_usd": {"label": "local market", "low": 0, "high": 0, "mid": 0, "parcel": "varies"},
    },
    {
        "id": "aruba-palm-coast",
        "name": "Palm Beach coastal edge",
        "country": "Aruba",
        "region": "West / northwest coast",
        "lat": 12.5700,
        "lng": -70.0450,
        "note": "Higher-energy strip near Palm / Malmok snorkel water — planning stub.",
        "scores": {"price": 2, "views": 4, "eco": 3, "swim": 5, "total": 14},
        "land_price_usd": {"label": "local market", "low": 0, "high": 0, "mid": 0, "parcel": "varies"},
    },
    {
        "id": "aruba-san-nicolas-south",
        "name": "San Nicolas south shore",
        "country": "Aruba",
        "region": "South coast",
        "lat": 12.4220,
        "lng": -69.8850,
        "note": "Near Baby Beach / Rodgers calm lagoons — planning stub.",
        "scores": {"price": 3, "views": 3, "eco": 3, "swim": 5, "total": 14},
        "land_price_usd": {"label": "local market", "low": 0, "high": 0, "mid": 0, "parcel": "varies"},
    },
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "place"


def shard_id(slug: str) -> str:
    key = re.sub(r"[^a-z0-9]", "", slug.lower())
    return key[:2] or "zz"


def country_id(name: str) -> str:
    return slugify(name)


def tags_for(loc: dict) -> list[str]:
    scores = loc["scores"]
    tags = ["coastal", "swim-near-ocean", "3-5-acres"]
    if scores["eco_permaculture_culture_1_5"] >= 4:
        tags.append("eco-culture")
    if scores["swim_quality_over_surf_1_5"] >= 4:
        tags.append("calm-swim")
    if scores["ridge_ocean_view_1_5"] >= 4:
        tags.append("views")
    if scores["price_affordability_1_5"] >= 4:
        tags.append("affordable")
    if scores["total_1_20"] >= 15:
        tags.append("high-score")
    for part in re.split(r"[\s/,]+", loc.get("region") or ""):
        p = slugify(part)
        if len(p) > 3 and p not in tags:
            tags.append(p)
            if len(tags) >= 8:
                break
    return tags


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def load_explore_beaches() -> list[dict]:
    beaches = []
    for index_path in EXPLORE.glob("*/search-index.json"):
        index = json.loads(index_path.read_text())
        country = index.get("country_id")
        for b in index.get("beaches") or []:
            coords = b.get("coordinates") or {}
            if coords.get("lat") is None or coords.get("lng") is None:
                continue
            beaches.append(
                {
                    "id": b["id"],
                    "name": b["name"],
                    "country_id": country,
                    "zone": b["zone"],
                    "path": b["path"],
                    "lat": coords["lat"],
                    "lng": coords["lng"],
                }
            )
    return beaches


def nearby_for(lat: float, lng: float, country: str, beaches: list[dict]) -> list[dict]:
    cid = country_id(country)
    hits = []
    for b in beaches:
        if b["country_id"] != cid:
            continue
        km = haversine_km(lat, lng, b["lat"], b["lng"])
        if km <= NEARBY_KM:
            hits.append(
                {
                    "id": b["id"],
                    "name": b["name"],
                    "country_id": b["country_id"],
                    "zone": b["zone"],
                    "path": b["path"],
                    "km": round(km, 1),
                }
            )
    hits.sort(key=lambda x: x["km"])
    return hits


def aruba_stub_record(stub: dict, beaches: list[dict]) -> dict:
    cid = "aruba"
    sid = shard_id(stub["id"])
    tags = ["coastal", "swim-near-ocean", "3-5-acres", "aruba", "abc"]
    nearby = nearby_for(stub["lat"], stub["lng"], "Aruba", beaches)
    return {
        "id": stub["id"],
        "shard": sid,
        "name": stub["name"],
        "country_id": cid,
        "country": "Aruba",
        "region": stub["region"],
        "coordinates": {"lat": stub["lat"], "lng": stub["lng"], "crs": "EPSG:4326", "precision": "approximate"},
        "scores": stub["scores"],
        "land_price_usd": stub["land_price_usd"],
        "note": stub["note"],
        "tags": tags,
        "nearby_beaches": nearby,
        "disclaimer": "Planning stub — not a listing. Nearby beaches linked within ~20 km.",
    }


def migrate_catalog():
    raw = json.loads((RH / "raw_research.json").read_text())
    explore_beaches = load_explore_beaches()
    by_shard: dict[str, list] = defaultdict(list)
    search_entries = []
    countries: dict[str, dict] = {}

    used_slugs: set[str] = set()
    skipped = 0
    linked = 0
    for loc in raw["locations"]:
        swim = loc["scores"]["swim_quality_over_surf_1_5"]
        if swim < COASTAL_SWIM_MIN:
            skipped += 1
            continue

        base = slugify(loc["name"])
        cid = country_id(loc["country"])
        slug = base
        n = 2
        while slug in used_slugs:
            slug = f"{base}-{cid}" if n == 2 else f"{base}-{cid}-{n}"
            n += 1
        used_slugs.add(slug)

        sid = shard_id(slug)
        tags = tags_for(loc)
        scores = loc["scores"]
        price = loc["land_price_usd"]
        coords = loc.get("coordinates") or {}
        lat, lng = coords.get("lat"), coords.get("lng")
        nearby = []
        if lat is not None and lng is not None:
            nearby = nearby_for(float(lat), float(lng), loc["country"], explore_beaches)
            if nearby:
                linked += 1

        record = {
            "id": slug,
            "shard": sid,
            "name": loc["name"],
            "country_id": cid,
            "country": loc["country"],
            "region": loc["region"],
            "coordinates": {
                "lat": lat,
                "lng": lng,
                "crs": "EPSG:4326",
                "precision": "planning-seed",
            }
            if lat is not None
            else None,
            "scores": {
                "price": scores["price_affordability_1_5"],
                "views": scores["ridge_ocean_view_1_5"],
                "eco": scores["eco_permaculture_culture_1_5"],
                "swim": scores["swim_quality_over_surf_1_5"],
                "total": scores["total_1_20"],
            },
            "land_price_usd": {
                "label": price["label"],
                "low": price["total_low"],
                "high": price["total_high"],
                "mid": price["midpoint_estimate"],
                "parcel": price["parcel_acres"],
            },
            "note": loc.get("research_note") or "",
            "tags": tags,
            "nearby_beaches": nearby,
            "disclaimer": "Planning sketch — not a listing, appraisal, or legal survey.",
        }
        by_shard[sid].append(record)

        search_entries.append(
            {
                "id": slug,
                "name": loc["name"],
                "country_id": cid,
                "country": loc["country"],
                "region": loc["region"],
                "shard": sid,
                "tags": tags,
                "search_tags": tags
                + [
                    loc["country"].lower(),
                    slugify(loc["region"]).replace("-", " "),
                    "habitat",
                    "regenerative",
                    "swim-near-ocean",
                ],
                "aliases": [],
                "score_total": scores["total_1_20"],
                "price_label": price["label"],
                "nearby_count": len(nearby),
            }
        )

        if cid not in countries:
            countries[cid] = {"id": cid, "name": loc["country"], "place_count": 0}
        countries[cid]["place_count"] += 1

    # ABC coastal stubs linked to explore beaches
    for stub in ARUBA_COASTAL_PLACES:
        if stub["id"] in used_slugs:
            continue
        used_slugs.add(stub["id"])
        rec = aruba_stub_record(stub, explore_beaches)
        by_shard[rec["shard"]].append(rec)
        if rec["nearby_beaches"]:
            linked += 1
        search_entries.append(
            {
                "id": rec["id"],
                "name": rec["name"],
                "country_id": rec["country_id"],
                "country": rec["country"],
                "region": rec["region"],
                "shard": rec["shard"],
                "tags": rec["tags"],
                "search_tags": rec["tags"] + ["swim-near-ocean", "habitat"],
                "aliases": [],
                "score_total": rec["scores"]["total"],
                "price_label": rec["land_price_usd"]["label"],
                "nearby_count": len(rec["nearby_beaches"]),
            }
        )
        cid = rec["country_id"]
        if cid not in countries:
            countries[cid] = {"id": cid, "name": rec["country"], "place_count": 0}
        countries[cid]["place_count"] += 1

    # split oversized shards
    final_shards: dict[str, list] = {}
    for sid, rows in sorted(by_shard.items()):
        rows = sorted(rows, key=lambda r: r["id"])
        if len(rows) <= MAX_PER_SHARD:
            final_shards[sid] = rows
            continue
        for i in range(0, len(rows), MAX_PER_SHARD):
            chunk = rows[i : i + MAX_PER_SHARD]
            kid = sid if i == 0 else f"{sid}{i // MAX_PER_SHARD + 1}"
            for r in chunk:
                r["shard"] = kid
            ids = {r["id"] for r in chunk}
            for e in search_entries:
                if e["id"] in ids:
                    e["shard"] = kid
            final_shards[kid] = chunk

    shard_dir = OUT / "catalog" / "shards"
    shard_dir.mkdir(parents=True, exist_ok=True)
    for old in shard_dir.glob("*.json"):
        old.unlink()

    shard_index = []
    for sid, rows in sorted(final_shards.items()):
        doc = {"schema_version": "1.0", "shard": sid, "places": rows}
        (shard_dir / f"{sid}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        shard_index.append(
            {"id": sid, "path": f"catalog/shards/{sid}.json", "count": len(rows), "label": sid.upper()}
        )

    (OUT / "catalog" / "index.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "shard_rule": "slug_prefix_2",
                "max_per_shard": MAX_PER_SHARD,
                "nearby_km": NEARBY_KM,
                "place_count": len(search_entries),
                "shards": shard_index,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )

    country_list = sorted(countries.values(), key=lambda c: c["name"])
    (OUT / "countries.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "description": "Habitat place countries — filter index only",
                "countries": country_list,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )

    (OUT / "search-index.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "description": "Lightweight place trie source. Resolve detail via catalog shard + id.",
                "place_count": len(search_entries),
                "nearby_km": NEARBY_KM,
                "entries": sorted(search_entries, key=lambda e: e["id"]),
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
    print(
        f"catalog: kept={len(search_entries)} skipped_low_swim={skipped} "
        f"linked_to_beaches={linked} explore_beaches_with_coords={len(explore_beaches)} (≤{NEARBY_KM} km)"
    )
    return len(search_entries), len(final_shards), len(country_list)


def migrate_glossary():
    text = (RH / "js" / "glossary-data.js").read_text()
    terms = []
    pat = r'"([^"]+)":\s*\{\s*title:\s*"([^"]*)",\s*text:\s*"((?:\\.|[^"\\])*)"'
    for m in re.finditer(pat, text, re.S):
        tid, title, body = m.group(1), m.group(2), m.group(3)
        body = body.replace("\\n", "\n").replace('\\"', '"')
        terms.append({"id": tid, "title": title, "text": body, "tags": ["glossary", "coastal"]})
    terms = [t for t in terms if t["id"] in COASTAL_GLOSSARY_IDS]
    if len(terms) < 8:
        raise SystemExit(f"glossary coastal filter too aggressive ({len(terms)} terms)")
    (OUT / "glossary.json").write_text(
        json.dumps(
            {"schema_version": "1.0", "term_count": len(terms), "terms": sorted(terms, key=lambda t: t["id"])},
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
    return len(terms)


GUIDES = [
    {
        "id": "yucatan",
        "name": "Yucatán",
        "country": "Mexico",
        "tagline": "Coastal & cenote-country regenerative living",
        "summary": "Near-ocean regenerative habitat on the peninsula: Gulf fringe, mangrove law, fideicomiso belt, and swim-friendly water — with karst that sends rain to the aquifer. Inland hills stay useful for surge distance; the ocean-love slice prioritizes living with the sea, not landlocked campo alone.",
        "highlights": [
            {
                "title": "Coastal fringe (Progreso–Telchac–east)",
                "text": "Salt air, mangrove rules, hurricane shutters, fideicomiso for many foreign buyers — true ocean adjacency.",
            },
            {
                "title": "Valladolid & cenote corridor",
                "text": "Swim-in-stone sinkholes and limestone care; water protection is the covenant.",
            },
            {
                "title": "North & west of Mérida (logistics ring)",
                "text": "Services + breeze lots within reach of coast; shade and height beat lawn dreams.",
            },
            {
                "title": "Interior (optional buffer)",
                "text": "Surge distance and cooler nights — use as hinterland, not as a substitute for ocean love.",
            },
        ],
        "cost_bands": [
            {"item": "Land (3–5 acres, titled path)", "usd": "~$45k–$250k+", "note": "Coastal / tourist-adjacent higher"},
            {"item": "Habitat shell", "usd": "~$80k–$220k+", "note": "Corrosion + wind detailing on fringe"},
            {"item": "Rainwater + filtration", "usd": "~$8k–$35k", "note": "Tank size drives cost"},
            {"item": "Sewage", "usd": "~$4k–$18k", "note": "Karst setbacks matter"},
            {"item": "Food forest start", "usd": "~$3k–$15k", "note": "Keep canopy; skip wall-to-wall clear"},
        ],
        "tags": ["mexico", "coastal", "karst", "mangrove", "fideicomiso", "cenote"],
    },
    {
        "id": "indonesia",
        "name": "Indonesia",
        "country": "Indonesia",
        "tagline": "Islands, tenure & reef ethics",
        "summary": "Archipelago regenerative living next to swimmable sea: monsoon–quake build, foreign tenure paths, and peat/reef ethics. Inland highlands stay in the sister regenerative_habitat research — this guide is for ocean-edge life.",
        "highlights": [
            {"title": "Island / coastal tenure", "text": "Lease / PT structures common for foreigners — lawyer early."},
            {"title": "Salt & monsoon build", "text": "Corrosion, rain, and seismic detailing over catalog dreams."},
            {"title": "Reef & mangrove ethics", "text": "No harm to reefs, mangroves, or carbon-rich peat for a ‘view.’"},
        ],
        "cost_bands": [
            {"item": "Small coastal land", "usd": "Wide Rp/USD band", "note": "Tourism islands inflate fast"},
            {"item": "Simple dwelling", "usd": "Local craft vs imported", "note": "Logistics dominate remote islands"},
        ],
        "tags": ["indonesia", "islands", "coastal", "reef-ethics", "tenure"],
    },
    {
        "id": "malaysia",
        "name": "Malaysia",
        "country": "Malaysia",
        "tagline": "Peninsula & Borneo coastal edge",
        "summary": "State land rules and rainforest-edge design for regenerative living near swimmable water. Full inland / highland depth remains in regenerative_habitat; ocean-love keeps the coastal edge.",
        "highlights": [
            {"title": "Coastal & estuary edge", "text": "Swim access, runoff, and wildlife corridors — design with wet seasons."},
            {"title": "State variation", "text": "Land rules differ by state — don’t generalize from one listing."},
            {"title": "Strata vs landed", "text": "Different rights; landed has more regenerative landscape room."},
        ],
        "cost_bands": [
            {"item": "Coastal-edge land", "usd": "MYR bands vary by state", "note": "Verify foreign purchase rules"},
            {"item": "Humidity-first build", "usd": "Envelope + mold detailing", "note": "Climate drives cost more than finish porn"},
        ],
        "tags": ["malaysia", "borneo", "coastal", "state-land"],
    },
]


def migrate_guides():
    gdir = OUT / "guides"
    gdir.mkdir(parents=True, exist_ok=True)
    for old in gdir.glob("*.json"):
        old.unlink()
    index = []
    for g in GUIDES:
        if g["id"] not in COASTAL_GUIDE_IDS:
            continue
        doc = {
            "schema_version": "1.0",
            **g,
            "disclaimer": "Coastal regenerative planning sketch — not listings or legal advice. Wider inland research: regenerative_habitat sister repo.",
        }
        (gdir / f"{g['id']}.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        index.append(
            {
                "id": g["id"],
                "name": g["name"],
                "country": g["country"],
                "tagline": g["tagline"],
                "tags": g["tags"],
                "path": f"guides/{g['id']}.json",
            }
        )
    (gdir / "index.json").write_text(
        json.dumps({"schema_version": "1.0", "scope": "coastal", "guides": index}, indent=2, ensure_ascii=False)
        + "\n"
    )
    return len(index)


def write_root_index(places: int, shards: int, countries: int, terms: int, guides: int):
    (OUT / "index.json").write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "description": "Coastal regenerative habitat slice for ocean-love. Wider regenerative living research stays in sister repo regenerative_habitat.",
                "scope": "near-ocean",
                "coastal_swim_min": COASTAL_SWIM_MIN,
                "sister_repo": "../regenerative_habitat",
                "place_count": places,
                "country_count": countries,
                "shard_count": shards,
                "guide_count": guides,
                "glossary_term_count": terms,
                "paths": {
                    "countries": "countries.json",
                    "search_index": "search-index.json",
                    "catalog_index": "catalog/index.json",
                    "guides_index": "guides/index.json",
                    "glossary": "glossary.json",
                },
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )


def write_readme():
    (OUT / "README.md").write_text(
        """# Habitat data — coastal slice only

Ocean Love publishes **near-ocean regenerative living** (swim-friendly coastal places + coastal guides).

**Sister repo `regenerative_habitat`** = base research index (global / inland / studies / full manuscripts). Expand there; re-slice here with:

```bash
python3 dev/migrate_habitat.py
```

Filter: `swim_quality >= 3`. Guides: Yucatán, Indonesia, Malaysia (coastal-framed).

```
data/habitat/
  index.json              ← counts + scope
  countries.json          ← country filter
  search-index.json       ← trie (no full records)
  catalog/shards/{id}.json← ≤50 places (slug digram)
  guides/{slug}.json      ← coastal region guides
  glossary.json           ← coastal-relevant terms
```
"""
    )


def main():
    if not (RH / "raw_research.json").exists():
        raise SystemExit(f"missing sister repo data: {RH / 'raw_research.json'}")
    OUT.mkdir(parents=True, exist_ok=True)
    places, shards, countries = migrate_catalog()
    terms = migrate_glossary()
    guides = migrate_guides()
    write_root_index(places, shards, countries, terms, guides)
    write_readme()
    print(f"places={places} shards={shards} countries={countries} terms={terms} guides={guides}")


if __name__ == "__main__":
    main()
