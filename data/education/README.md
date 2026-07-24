# Education data — lazy-load paths

## Species catalog (preferred)

```
species/index.json              → shard nav only
species/search-index.json       → trie/search (slug, names, tags, shard)
species/shards/{prefix}.json    → up to ~50 full records (prefix = first 2 letters of slug)
```

See `species/README.md`. Beach/country JSON keeps **slugs only**.

## Legacy marine-life (fallback)

```
marine-life/index.json           → category list
marine-life/animals/index.json   → animal card index
marine-life/plants/index.json    → plant card index
marine-life/{type}/{slug}.json   → full species card
```

Still used for records not yet migrated into `species/shards/`.
