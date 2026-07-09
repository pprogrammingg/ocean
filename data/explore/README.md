# Explore data — lazy-load paths

```
countries.json                          → all countries + city_zone ids
{country}/country.json                  → ocean overview for country
{country}/search-index.json             → trie source (names, aliases, search_tags)
{country}/{city_zone}/city-beaches.json → beach index for zone
{country}/{city_zone}/{beach}/beach.json → full beach detail
{country}/scuba-zones/                  → dive sites (populated later)
```

Cross-references to marine life use slugs from `data/education/marine-life/`.
