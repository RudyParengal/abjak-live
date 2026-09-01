#!/usr/bin/env node
/*
 * Zero-dependency static dev server for the abjak-live site.
 *
 * Replicates the production Vercel behaviour defined in vercel.json:
 *   - cleanUrls: true      -> "/about" serves "about/index.html" (or "about.html")
 *   - trailingSlash: false -> "/about/" redirects to "/about"
 *   - unknown paths        -> 404.html with a 404 status
 *
 * Uses only Node built-ins so it runs with no install step and works offline.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

// Resolve a request pathname to a file on disk, mirroring Vercel cleanUrls.
function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = path.resolve(ROOT, "." + decoded);

  // Prevent path traversal outside the site root.
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return null;
  }

  if (decoded === "/" || decoded === "") {
    return isFile(path.join(ROOT, "index.html")) ? path.join(ROOT, "index.html") : null;
  }
  if (isFile(target)) return target;
  if (isFile(target + ".html")) return target + ".html";
  const indexed = path.join(target, "index.html");
  if (isFile(indexed)) return indexed;
  return null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  let pathname = "/";
  try {
    pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  } catch {
    pathname = req.url || "/";
  }

  // trailingSlash: false -> redirect "/foo/" to "/foo".
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const stripped = pathname.replace(/\/+$/, "") || "/";
    send(res, 308, null, { Location: stripped });
    log(req, 308, started);
    return;
  }

  const file = resolveFile(pathname);
  if (file) {
    fs.readFile(file, (err, data) => {
      if (err) {
        send(res, 500, "Internal Server Error");
        log(req, 500, started);
        return;
      }
      send(res, 200, data, { "Content-Type": contentType(file) });
      log(req, 200, started);
    });
    return;
  }

  // Fallback: serve 404.html with a 404 status, like the deployed site.
  const notFound = path.join(ROOT, "404.html");
  if (isFile(notFound)) {
    fs.readFile(notFound, (err, data) => {
      if (err) {
        send(res, 404, "Not Found");
      } else {
        send(res, 404, data, { "Content-Type": "text/html; charset=utf-8" });
      }
      log(req, 404, started);
    });
    return;
  }
  send(res, 404, "Not Found");
  log(req, 404, started);
});

function log(req, status, started) {
  const ms = Date.now() - started;
  console.log(`${new Date().toISOString()}  ${status}  ${req.method} ${req.url}  ${ms}ms`);
}

server.listen(PORT, HOST, () => {
  console.log(`abjak-live dev server running at http://localhost:${PORT} (serving ${ROOT})`);
});
