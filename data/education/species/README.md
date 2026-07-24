# Species catalog — lazy-load shards

Built for ~100k species without loading the world at once.

## Layout

```
data/education/species/
  index.json              ← shard list only (ids, counts, paths) — for sticky nav
  search-index.json       ← lightweight trie source (slug, names, tags, shard) — no full records
  shards/{prefix}.json    ← up to ~50 full species records each
```

## Shard key rule

**Default:** first **2 letters** of the slug (`brown-pelican` → `br`, `mahi-mahi` → `ma`).

- Digrams keep popular letters (`s`, `c`, `b`) from becoming megashards.
- Rare prefixes can later collapse into 1-letter files (`x.json`) when small.
- If a digram exceeds ~50 entries, split further (`bra.json`, `bre.json`) or numbered (`br-2.json`) and update `index.json` + search entries.

Clients can **derive the shard from the slug** without hitting the index — critical when opening an overlay from a beach chip.

```
shardId(slug) = slug.replace(/[^a-z0-9]/g, "").slice(0, 2)
```

## Lazy-load chain

1. Country/beach chip has **slug only**
2. Click → open overlay → fetch `shards/{shardId}.json` → find record by `id`
3. Species hub → fetch `index.json` (nav) → on shard select fetch that shard only
4. Search → fetch `search-index.json` (or future search shards) → resolve slug → fetch species shard

Never embed full species objects in beach/country JSON.

## Record shape

See any file under `shards/`. Fields: `popular_name`, `translations`, `scientific_name`, `dwelling_habits`, `fun_facts`, `images`, `tags`.

### Images

Hero photos live under **`web/media/species/`** (not in `data/`):

```
web/media/species/_incoming/{slug}.jpg   ← drop originals
web/media/species/{slug}/hero.webp       ← 1600×1000 (16∶10)
```

Shard `images` entry:

```json
{ "role": "hero", "src": "media/species/brown-pelican/hero.webp", "alt": "…" }
```

Legacy `data/education/marine-life/` cards remain a fallback until fully migrated.
