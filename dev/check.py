#!/usr/bin/env python3
"""
Site check — no server, no npm, no Node. Reads files from disk.

  python3 dev/check.py

From repo root. Verifies web assets, data paths, and the explore JSON graph
(including the Aruba lazy-load chain the beaches page uses).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPLORE = ROOT / "data" / "explore"
WEB = ROOT / "web"

issues: list[str] = []


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def fail(msg: str) -> None:
    issues.append(msg)


def read_json(rel: str) -> dict | None:
    path = ROOT / rel
    if not path.is_file():
        fail(f"missing file: {rel}")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON: {rel} — {exc}")
        return None


def collect_js_graph(entry: Path, seen: set[Path] | None = None) -> set[Path]:
    seen = seen or set()
    entry = entry.resolve()
    if entry in seen:
        return seen
    seen.add(entry)
    if not entry.is_file():
        fail(f"missing JS: {entry.relative_to(ROOT)}")
        return seen
    source = entry.read_text(encoding="utf-8")
    for match in re.finditer(r'from\s+["\'](\./[^"\']+)["\']', source):
        collect_js_graph(entry.parent / match.group(1), seen)
    return seen


def check_web() -> None:
    print("Web")
    html_path = WEB / "beaches.html"
    if not html_path.is_file():
        fail("missing web/beaches.html")
        return

    html = html_path.read_text(encoding="utf-8")
    for needle in ('id="country-select"', 'name="ocean-data-base"', 'content="../data/"'):
        if needle not in html:
            fail(f"beaches.html missing {needle!r}")
        else:
            ok(f"beaches.html has {needle}")

    if re.search(r"\?v=\d+", html):
        fail("beaches.html uses ?v= cache-bust query strings")
    else:
        ok("beaches.html has no ?v= query strings")

    meta_match = re.search(r'name="ocean-data-base"\s+content="([^"]+)"', html)
    if meta_match:
        data_base = meta_match.group(1)
        resolved = (html_path.parent / data_base / "explore" / "countries.json").resolve()
        if not resolved.is_file():
            fail(f"meta ocean-data-base {data_base!r} does not resolve to countries.json")
        else:
            ok(f"data path {data_base}explore/countries.json resolves on disk")

    js_files = collect_js_graph(WEB / "js" / "beaches.js")
    js_files.add((WEB / "js" / "page.js").resolve())
    for path in sorted(js_files):
        ok(f"JS module {path.relative_to(ROOT).as_posix()}")

    css = WEB / "css" / "ocean.css"
    if css.is_file():
        ok("css/ocean.css")
    else:
        fail("missing web/css/ocean.css")


def check_countries() -> list[dict]:
    print("Data")
    index = read_json("data/explore/countries.json")
    if not index:
        return []

    countries = index.get("countries") or []
    if not countries:
        fail("countries.json: empty countries array")
        return []

    ids = {c.get("id") for c in countries}
    for required in ("aruba", "bonaire", "australia"):
        if required in ids:
            ok(f"countries.json includes {required}")
        else:
            fail(f"countries.json missing {required}")

    for country in countries:
        cid = country.get("id")
        if not cid:
            fail("country entry missing id")
            continue
        verify_country(country)

    return countries


def verify_country(country: dict) -> None:
    cid = country["id"]
    meta = read_json(f"data/explore/{cid}/country.json")
    search = read_json(f"data/explore/{cid}/search-index.json")
    if not search:
        return

    count = search.get("beach_count", 0)
    beaches = search.get("beaches") or []
    if len(beaches) != count:
        fail(f"{cid}: beaches[] length ({len(beaches)}) != beach_count ({count})")

    if meta:
        overview = (meta.get("marine_overview") or {}).get("known_beach_count")
        if overview is not None and overview != count:
            fail(f"{cid}: marine_overview.known_beach_count ({overview}) != search-index ({count})")

    zone_sum = sum(z.get("beach_count", 0) for z in country.get("city_zones") or [])
    if count > 0 and zone_sum != count:
        fail(f"{cid}: city_zones sum ({zone_sum}) != search-index ({count})")

    for beach in beaches:
        beach_file = EXPLORE / beach["path"]
        if not beach_file.is_file():
            fail(f"{cid}: missing beach file data/explore/{beach['path']}")
        zone_file = EXPLORE / cid / beach["zone"] / "city-beaches.json"
        if count > 0 and not zone_file.is_file():
            fail(f"{cid}: missing zone index {beach['zone']}/city-beaches.json")

    for zone in country.get("city_zones") or []:
        if zone.get("beach_count", 0) > 0:
            zone_file = EXPLORE / cid / zone["id"] / "city-beaches.json"
            if not zone_file.is_file():
                fail(f"{cid}: zone {zone['id']} claims beaches but city-beaches.json missing")


def check_aruba_chain() -> None:
    print("Lazy-load chain (Aruba)")
    meta = read_json("data/explore/aruba/country.json")
    search = read_json("data/explore/aruba/search-index.json")
    if not meta or not search:
        return

    if meta.get("marine_overview"):
        ok("aruba/country.json has marine_overview")
    else:
        fail("aruba/country.json missing marine_overview")

    count = search.get("beach_count", 0)
    beaches = search.get("beaches") or []
    if count <= 0 or not beaches:
        fail("aruba search-index has no beaches")
        return

    ok(f"aruba search-index lists {count} beaches")

    first = beaches[0]
    zone = read_json(f"data/explore/aruba/{first['zone']}/city-beaches.json")
    if zone and any(b.get("path") == first.get("path") for b in zone.get("beaches") or []):
        ok(f"zone {first['zone']}/city-beaches.json references first beach")
    else:
        fail(f"zone {first['zone']} does not list beach {first.get('path')}")

    beach = read_json(f"data/explore/{first['path']}")
    if beach and beach.get("name") and beach.get("id"):
        ok(f"beach JSON loads: {beach['name']}")
    else:
        fail(f"beach file invalid: data/explore/{first['path']}")


def main() -> int:
    print(f"Checking {ROOT}\n")
    check_web()
    print()
    countries = check_countries()
    print()
    check_aruba_chain()

    print()
    if issues:
        print(f"FAILED — {len(issues)} issue(s):\n")
        for msg in issues:
            print(f"  • {msg}")
        return 1

    n = len(countries) if countries else 0
    print(f"OK — web + {n} countries verified (no server needed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
