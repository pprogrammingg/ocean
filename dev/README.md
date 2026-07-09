# Optional local dev server (not used on GitHub Pages)

GitHub Pages serves `web/` + `data/` as static files. Lazy-loading uses browser `fetch()` — no Node in production.

## Local preview

From repo root:

```bash
python3 -m http.server 8765
```

Open http://localhost:8765/web/beaches.html

## Restore Node server (optional)

If you prefer Node for local dev, add `package.json`:

```json
{
  "private": true,
  "scripts": { "start": "node dev/server.js" }
}
```

Copy `server.js.example` to `server.js` and run `npm start`.
