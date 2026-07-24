# Species media

Drop originals in `_incoming/`, then we resize into per-slug folders.

```
web/media/species/
  _incoming/                 ← put raw photos here (any size)
    brown-pelican.jpg        ← filename = species slug (+ extension)
  brown-pelican/
    hero.webp                ← 1600×1000 (16∶10) — guide + postcard
    card.webp                ← 900×560 (optional, postcard-only later)
```

## Naming

- Folder / incoming file stem = species `id` slug (`brown-pelican`, `green-sea-turtle`).
- Prefer WebP exports; JPEG is fine as fallback.

## JSON (shard record)

```json
"images": [
  {
    "role": "hero",
    "src": "media/species/brown-pelican/hero.webp",
    "alt": "Brown pelican in flight over coastal water"
  }
]
```

Paths are root-relative to `web/` (resolved via `webRoot()` in the UI).

## One hero for both surfaces

**Yes — one resized `hero.webp` (1600×1000) is used for:**
- species postcard / slug card (overlay)
- species guide section hero

Same `images[].role: "hero"` entry. Optional `card.webp` (900×560) can be added later only if overlay needs a lighter file.
