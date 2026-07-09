# Education data — lazy-load paths

```
marine-life/index.json           → category list
marine-life/animals/index.json   → animal card index
marine-life/plants/index.json    → plant card index
marine-life/{type}/{slug}.json   → full species card
```

Beach `ecosystem.animals` / `ecosystem.plants` arrays hold slugs that map to `{slug}.json` under `animals/` or `plants/`.
