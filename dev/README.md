# Local dev (not used on GitHub Pages)

GitHub Pages serves `web/` + `data/` as static files. Lazy-loading uses browser `fetch()` — no build step in production.

## Local preview

From **repo root**:

```bash
python3 dev/serve.py
```

Open http://127.0.0.1:8765/web/beaches.html — not `file://`. Server must run from repo root (so `../data/` works from `web/`).

**Why not `python3 -m http.server`?** Chrome caches JS modules hard. After a server restart, Chrome may show a broken page while Safari looks fine. `serve.py` sends `no-cache` headers so a normal refresh works.

If Chrome is still stuck once: DevTools → Network → check **Disable cache**, then refresh. Or use an Incognito window once.

## Check (no server)

```bash
python3 dev/check.py
```
