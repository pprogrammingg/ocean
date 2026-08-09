#!/usr/bin/env python3
"""Migrate species shards to 3-section card shape (identity / conservation / fun facts)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "data" / "education" / "species"
SHARDS = ROOT / "shards"

LANG_NAMES = {
    "pap": "Papiamento",
    "es": "Spanish",
    "nl": "Dutch",
    "en": "English",
    "pt": "Portuguese",
    "fr": "French",
}

STATUS_MAP = [
    (re.compile(r"extinct", re.I), "Extinct"),
    (re.compile(r"critically|endangered", re.I), "Critical"),
    (re.compile(r"vulnerable|near.?threatened|threatened|cites|depleted", re.I), "Bad"),
]


def map_status(raw: str | None) -> str:
    text = raw or ""
    for pat, label in STATUS_MAP:
        if pat.search(text):
            return label
    return "Good"


def taxonomy_line(rec: dict) -> str:
    kind = "Animal" if rec.get("type") == "animal" else "Plant"
    tags = [t for t in (rec.get("tags") or []) if t and t not in {"endangered", "invasive"}]
    # Prefer life-form tags over geography fluff
    pick = tags[:2] if tags else []
    parts = [kind, *[t.replace("-", " ").title() for t in pick]]
    # de-dupe while preserving order
    out = []
    for p in parts:
        if p.lower() not in {x.lower() for x in out}:
            out.append(p)
    return " · ".join(out)


def languages_block(rec: dict) -> dict:
    tr = rec.get("translations") or {}
    indigenous_name = tr.get("pap") or ""
    english = rec.get("popular_name") or rec.get("name") or ""
    other = []
    for code, name in tr.items():
        if code in ("pap", "en") or not name:
            continue
        other.append({"lang": LANG_NAMES.get(code, code), "name": name})
        if len(other) >= 3:
            break
    return {
        "indigenous": {"lang": "Papiamento", "name": indigenous_name},
        "english": english,
        "other": other,
    }


def join_bits(*bits: str | None) -> str:
    parts = [b.strip() for b in bits if b and str(b).strip()]
    return " ".join(parts)


def help_and_caution(rec: dict, status: str) -> tuple[str, str]:
    tags = set(rec.get("tags") or [])
    typ = rec.get("type")
    slug = rec.get("id") or ""

    if "turtle" in tags or "turtle" in slug:
        return (
            "Keep nesting beaches dark and clear; support marine protected areas.",
            "Never buy turtle products; don’t block crawlways or touch nesting turtles.",
        )
    if "shark" in tags or "ray" in tags:
        return (
            "Respect distance on the reef; support healthy fish stocks sharks need.",
            "Don’t bait, chase, or grab rays and sharks for photos.",
        )
    if "coral" in tags or "builder" in tags or "cnidarian" in tags:
        return (
            "Use reef-safe sunscreen; choose operators that don’t touch or kick coral.",
            "Never stand on, break, or collect living coral.",
        )
    if "mangrove" in tags:
        return (
            "Protect shoreline buffers; support mangrove restoration projects.",
            "Don’t clear mangrove roots for beach access or dump trash in lagoons.",
        )
    if "seagrass" in tags or "meadow" in tags:
        return (
            "Anchor in sand, not grass; support seagrass-friendly boat habits.",
            "Don’t drive propellers through meadows or dig up plants.",
        )
    if "invasive" in tags:
        return (
            "Report unusual blooms to local managers; keep native meadows healthy.",
            "Don’t transplant seagrass or algae between lagoons.",
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


def life_info(habits: dict | None) -> dict:
    h = habits if isinstance(habits, dict) else {}
    eating = join_bits(h.get("food"), h.get("feeding"))
    mating = h.get("mating") or ""
    habitat = join_bits(h.get("dwelling"), h.get("socializing"))
    if isinstance(habits, str):
        habitat = habits
    return {
        "eating": eating or "Life details coming soon.",
        "mating": mating or "Life details coming soon.",
        "habitat": habitat or "Life details coming soon.",
    }


def migrate_record(rec: dict) -> dict:
    status = map_status(rec.get("conservation_status"))
    if isinstance(rec.get("conservation"), dict) and rec["conservation"].get("status"):
        # already migrated — refresh identity fields only if missing
        cons = rec["conservation"]
        status = cons.get("status") or status
        help_by = cons.get("help_by") or help_and_caution(rec, status)[0]
        caution = cons.get("caution_against") or help_and_caution(rec, status)[1]
        life = cons.get("life_info") or life_info(rec.get("dwelling_habits"))
    else:
        help_by, caution = help_and_caution(rec, status)
        life = life_info(rec.get("dwelling_habits"))

    facts = list(rec.get("fun_facts") or [])[:5]
    out = {
        "id": rec["id"],
        "shard": rec.get("shard"),
        "type": rec.get("type"),
        "popular_name": rec.get("popular_name") or rec.get("name"),
        "taxonomy": rec.get("taxonomy") or taxonomy_line(rec),
        "scientific_name": rec.get("scientific_name") or "",
        "languages": rec.get("languages") if isinstance(rec.get("languages"), dict) else languages_block(rec),
        "conservation": {
            "status": status,
            "help_by": help_by,
            "caution_against": caution,
            "life_info": {
                "eating": life.get("eating") or "Life details coming soon.",
                "mating": life.get("mating") or "Life details coming soon.",
                "habitat": life.get("habitat") or "Life details coming soon.",
            },
        },
        "fun_facts": facts,
        "images": rec.get("images") or [],
        "tags": rec.get("tags") or [],
    }
    if rec.get("aliases"):
        out["aliases"] = rec["aliases"]
    return out


def main():
    n = 0
    for path in sorted(SHARDS.glob("*.json")):
        data = json.loads(path.read_text())
        data["schema_version"] = "1.1"
        data["species"] = [migrate_record(sp) for sp in data.get("species", [])]
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        n += len(data["species"])
    print(f"migrated {n} species across {len(list(SHARDS.glob('*.json')))} shards → schema 1.1")


if __name__ == "__main__":
    main()
