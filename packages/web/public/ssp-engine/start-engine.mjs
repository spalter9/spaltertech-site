#!/usr/bin/env node
/**
 * Local-only static server for the standalone Surreal Engine suite.
 * Usage: node start-engine.mjs [--port 8765] [--host 127.0.0.1]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

function parseArgs(argv) {
  let port = Number(process.env.PORT ?? 8765);
  let host = process.env.HOST ?? "127.0.0.1";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--port" && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (argv[i] === "--host" && argv[i + 1]) {
      host = argv[++i];
    }
  }
  return { port, host };
}

function findFreePort(host, start) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port >= start + 100) {
        reject(new Error("No free port found"));
        return;
      }
      const tester = net.createServer();
      tester.once("error", () => tryPort(port + 1));
      tester.once("listening", () => {
        tester.close(() => resolve(port));
      });
      tester.listen(port, host);
    };
    tryPort(start);
  });
}

async function resolveFile(pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) return null;
  try {
    const info = await stat(filePath);
    if (info.isFile()) return filePath;
  } catch {
    /* not found */
  }
  return null;
}

const args = parseArgs(process.argv);
const host = args.host;
const port = await findFreePort(host, args.port);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    const filePath = await resolveFile(url.pathname);
    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const body = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(err instanceof Error ? err.message : "Server error");
  }
});

server.listen(port, host, () => {
  console.log("");
  console.log("  SSP // The Surreal Engine (local static server)");
  console.log("  ───────────────────────────────────────────────");
  console.log(`  URL:      http://${host}:${port}/`);
  console.log(`  Folder:   ${ROOT}`);
  console.log("  Passcode: 8888 | SPALTER | SSP2026");
  console.log("  Stop:     Ctrl+C");
  console.log("");
});
