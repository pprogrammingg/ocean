const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PREFERRED_PORT = Number(process.env.PORT) || 8765;
const MAX_TRIES = 10;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === "ENOENT" ? 404 : 500);
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

function createServer(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let pathname = url.pathname;

    if (pathname === "/") pathname = "/web/index.html";

    const filePath = safePath(pathname);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) {
        const index = path.join(filePath, "index.html");
        return fs.stat(index, (e2, s2) => {
          if (e2 || !s2.isFile()) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          serveFile(index, res);
        });
      }
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      serveFile(filePath, res);
    });
  });

  return server;
}

function listen(port, attempt = 0) {
  const server = createServer(port);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempt < MAX_TRIES) {
      const next = port + 1;
      console.warn(`Port ${port} in use — trying ${next}…`);
      listen(next, attempt + 1);
      return;
    }
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${port} in use. Free it: lsof -i :${PREFERRED_PORT} then kill <pid>`);
      console.error(`Or pick another: PORT=3000 npm start`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    if (port !== PREFERRED_PORT) {
      console.warn(`(Preferred port ${PREFERRED_PORT} was busy)`);
    }
    console.log(`ocean-love.xyz → http://localhost:${port}/web/beaches.html`);
  });
}

listen(PREFERRED_PORT);
