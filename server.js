/**
 * Chans Cams static file server.
 *
 * Designed for Railway (and any Node 18+ host).
 * - Binds to 0.0.0.0 so the platform's router can reach it.
 * - Reads PORT from the environment, falling back to 3000 locally.
 * - Sets light caching: HTML is revalidated, static assets cached for a day.
 */

"use strict";

const http = require("node:http");
const path = require("node:path");
const handler = require("serve-handler");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = __dirname;

const config = {
  public: PUBLIC_DIR,
  directoryListing: false,
  headers: [
    {
      source: "**/*.{html,htm}",
      headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
    },
    {
      source: "**/*.{css,js,svg,png,jpg,jpeg,webp,gif,ico,woff,woff2,ttf}",
      headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
    },
  ],
};

const server = http.createServer((req, res) => {
  handler(req, res, config).catch((err) => {
    console.error("serve-handler error:", err);
    res.statusCode = 500;
    res.end("Internal server error");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Chans Cams listening on http://${HOST}:${PORT}`);
  console.log(`Serving from: ${path.resolve(PUBLIC_DIR)}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}, closing server…`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
