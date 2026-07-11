# Web UI

Static HTML, CSS, JS. **No build step. No npm. No Node in production.**

## Local preview

From **repo root**:

```bash
python3 -m http.server 8765
```

Open **http://127.0.0.1:8765/web/beaches.html** (use `127.0.0.1`, not `file://`)

Data lives in `data/` — the server must serve the **repo root** so `../data/` resolves from `web/beaches.html`.

### Check everything (no server)

```bash
python3 dev/check.py
```

### Country dropdown empty?

Hard refresh often does not help if the page is opened wrong. Check the line under **Country**:

- **file:// message** → you opened the HTML file directly; use `python3 -m http.server 8765` from repo root
- **Failed to load app** → open DevTools → Console and share the error
- **No message, still empty** → confirm the server was started from repo root, not from `web/`

## Lazy load chain

Each step fetches one JSON file on user action:

1. **Page load** → `data/explore/countries.json`
2. **Pick country** → `data/explore/{country}/country.json` + `search-index.json`
3. **Pick zone** → `data/explore/{country}/{zone}/city-beaches.json`
4. **Pick beach** → `data/explore/.../{beach}/beach.json`
5. **Species chips/cards** → `data/education/marine-life/{animals|plants}/{slug}.json`

Future species sharding: `data/education/species/index.json` → `species/data/{shard}.json` (see `readmap.json`).

## Files

```
web/
  beaches.html          Curiosity explorer
  index.html            Home
  connection.html       Connection (stub)
  conservation.html     Conservation (stub)
  css/ocean.css
  js/
    api.js              fetchJSON + paths
    beaches.js          page controller
    render-beach.js     beach detail HTML
    render-country.js   country sidebar HTML
    ratings.js          rating bars
    species.js          lazy species cards
    trie.js             beach search
    nav.js              shared nav
    page.js             initPage()
    html.js             escapeHtml
```

Product docs: `readmap.json` · `roadmap_chats.json`
