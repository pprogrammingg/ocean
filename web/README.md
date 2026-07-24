# Web UI

Static HTML, CSS, JS. **No build step. No npm. No Node in production.**

## Local preview

From **repo root**:

```bash
python3 dev/serve.py
```

Open **http://127.0.0.1:8765/web/index.html** (Home / landing)

Curiosity beaches: **http://127.0.0.1:8765/web/curiosity/beaches.html**

Species hub: **http://127.0.0.1:8765/web/curiosity/species.html**

Data lives in `data/` — pages under `web/curiosity/` resolve it via `../../data/`.

### Check everything (no server)

```bash
python3 dev/check.py
```

### Country dropdown empty?

Hard refresh often does not help if the page is opened wrong. Check the line under **Country**:

- **file:// message** → you opened the HTML file directly; use `python3 dev/serve.py` from repo root
- **Failed to load app** → open DevTools → Console and share the error
- **No message, still empty** → confirm the server was started from repo root, not from `web/`

## Lazy load chain

Each step fetches one JSON file on user action:

1. **Page load** → `data/explore/countries.json`
2. **Pick country** → `data/explore/{country}/country.json` + `search-index.json`
3. **Pick zone** → `data/explore/{country}/{zone}/city-beaches.json`
4. **Pick beach** → `data/explore/.../{beach}/beach.json`
5. **Species chip** → overlay loads `data/education/species/shards/{prefix}.json`
6. **Species hub** → `species/index.json` then one shard on letter click

## Files

```
web/
  curiosity/
    beaches.html        Curiosity default (beaches)
    species.html        Species hub (open in new tab)
  beaches.html          Redirect → curiosity/beaches.html
  species.html          Redirect → curiosity/species.html
  index.html            Home
  connection.html       Connection (stub)
  conservation.html     Conservation (stub)
  css/ocean.css
  css/fonts.css         font load + --font-display / --font-body (swap here)
  js/
    api.js              fetchJSON + paths
    beaches.js          page controller
    render-beach.js     beach detail HTML
    render-country.js   country sidebar HTML
    ratings.js          rating bars
    species.js          shard resolve + fetch
    species-overlay.js  postcard overlay (?species=)
    species-page.js     species hub controller
    render-species.js   postcard + hub sections
    trie.js             beach search
    nav.js              shared nav
    page.js             initPage()
    boot-page.js        mount page by data-page
    soft-nav.js         same-tab navigation without full reload
    html.js             escapeHtml
```

Product docs: `roadmap.json`

Landing: `index.html` — no-scroll glossy stage; stats count up from indexes.
