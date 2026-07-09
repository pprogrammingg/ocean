# Web UI

Static HTML/CSS/JS — **no build step, no Node in production.**

## Live (GitHub Pages)

Push to `main` → GitHub Actions deploys the repo as static files.

- Project URL: `https://pprogrammingg.github.io/ocean/web/beaches.html`
- With custom domain: `https://ocean-love.xyz/web/beaches.html`

Enable in repo **Settings → Pages → Source: GitHub Actions**.

## Local preview

From repo root:

```bash
python3 -m http.server 8765
```

Open http://localhost:8765/web/beaches.html

Optional Node server: see `dev/README.md`.

## Lazy loading (works without Node)

The browser loads JSON on demand via `fetch()` — same on GitHub Pages and locally:

1. `data/explore/countries.json`
2. `data/explore/{country}/country.json` + `search-index.json`
3. `data/explore/{country}/{zone}/city-beaches.json`
4. `data/explore/.../{beach}/beach.json`
5. `data/education/marine-life/...` (ecosystem cards)

Paths in `api.js` use `../data/` (relative to pages in `web/`), so no server-side routing is required.

## Structure

```
web/
  index.html          Home
  beaches.html        Beaches explorer
  css/ocean.css
  js/
    api.js            fetch + data paths
    ratings.js        Spectrum bars
    render-beach.js   Beach detail HTML
    beaches.js        Page controller
    trie.js           Country search
```
