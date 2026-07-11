#!/usr/bin/env python3
"""
Dev static server — serves repo root with no-cache headers on HTML/JS/CSS/JSON.

Chrome caches ES modules aggressively; plain `python3 -m http.server` does not
send no-store headers, so Chrome often shows a broken page after restarts while
Safari looks fine. Use this instead during local dev:

  python3 dev/serve.py

Open http://127.0.0.1:8765/web/beaches.html
"""
from __future__ import annotations

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NO_CACHE_EXT = {".html", ".css", ".js", ".json", ".mjs"}
DEFAULT_PORT = 8765
HOST = os.environ.get("HOST", "127.0.0.1")


class DevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        ext = Path(self.path.split("?")[0]).suffix.lower()
        if ext in NO_CACHE_EXT:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


def pick_port(start: int) -> int:
    import socket

    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((HOST, port))
                return port
            except OSError:
                continue
    raise OSError(f"No free port between {start} and {start + 19}")


def main() -> int:
    requested = int(os.environ.get("PORT", DEFAULT_PORT))
    try:
        port = pick_port(requested)
    except OSError as exc:
        print(exc, file=sys.stderr)
        return 1

    server = HTTPServer((HOST, port), DevHandler)
    url = f"http://{HOST}:{port}/web/beaches.html"
    if port != requested:
        print(f"Port {requested} busy — using {port}")
    print(f"Dev server (no-cache): {url}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
