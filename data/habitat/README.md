# Habitat data — coastal slice only

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
