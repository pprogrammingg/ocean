# Local dev (not used on GitHub Pages)

GitHub Pages serves `web/` + `data/` as static files. Lazy-loading uses browser `fetch()` — no build step in production.

## Local preview

From **repo root**:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/web/beaches.html — not `file://`. Server must run from repo root (so `../data/` works from `web/`).

## Check (no server)

Stdlib Python only — verifies HTML, JS modules, data graph, and Aruba lazy-load chain:

```bash
python3 dev/check.py
```
