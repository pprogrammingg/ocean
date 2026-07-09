# Web UI

Vanilla HTML/CSS/JS — no build step. Run from repo root: `npm start`.

## Structure

```
web/
  index.html          Home
  beaches.html        Beaches explorer
  css/ocean.css       All styles (tokens → layout → components)
  js/
    api.js            fetch + data paths
    ratings.js        Spectrum bars, score helpers
    render-beach.js   Beach detail HTML + ecosystem hydration
    beaches.js        Page controller (events, state)
    trie.js           Country search trie
```

## Data loading

All JSON fetched lazily from `../data/` via `api.js`.
