#!/usr/bin/env python3
"""Add approximate WGS84 coordinates to explore beach.json + search-index (for habitat nearby links)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPLORE = ROOT / "data" / "explore"

# Approximate public map pins — planning-grade, not survey.
COORDS = {
    "andicuri-beach": (12.5365, -69.9420),
    "blackstone-beach": (12.4820, -69.9050),
    "boca-grandi": (12.4550, -69.8800),
    "boca-prins": (12.4780, -69.9100),
    "dos-playa": (12.4700, -69.9000),
    "wariruri-beach": (12.5750, -70.0000),
    "arashi": (12.6125, -70.0528),
    "boca-catalina": (12.6050, -70.0480),
    "hadicurari": (12.5980, -70.0450),
    "malmok-beach": (12.6020, -70.0465),
    "tres-trapi": (12.5900, -70.0430),
    "baby-beach": (12.4186, -69.8831),
    "grapefield-beach": (12.4300, -69.8700),
    "mangel-halto": (12.4550, -69.9600),
    "rodgers-beach": (12.4250, -69.8900),
    "druif-beach": (12.5350, -70.0600),
    "eagle-beach": (12.5494, -70.0576),
    "flamingo-beach": (12.5420, -70.0620),
    "manchebo-beach": (12.5450, -70.0600),
    "palm-beach": (12.5687, -70.0456),
    "surfside-beach": (12.5200, -70.0380),
}


def main():
    updated = 0
    missing = []
    for path in EXPLORE.rglob("beach.json"):
        data = json.loads(path.read_text())
        bid = data["id"]
        if bid not in COORDS:
            missing.append(bid)
            continue
        lat, lng = COORDS[bid]
        data["coordinates"] = {"lat": lat, "lng": lng, "crs": "EPSG:4326", "precision": "approximate"}
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        updated += 1

    for index_path in EXPLORE.glob("*/search-index.json"):
        index = json.loads(index_path.read_text())
        for beach in index.get("beaches") or []:
            bid = beach["id"]
            if bid in COORDS:
                lat, lng = COORDS[bid]
                beach["coordinates"] = {"lat": lat, "lng": lng, "crs": "EPSG:4326"}
        index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")

    print(f"beaches_updated={updated} missing_coords={missing or 'none'}")


if __name__ == "__main__":
    main()
