/**
 * Standalone Surreal Engine preview server.
 *
 * Serves packages/web/public/ssp-engine as the document root so Safari / Chrome
 * can open the suite without Vite, .env, or the main SPA passcode gate.
 *
 * Usage (from repo root):
 *   bun run preview:ssp-engine
 *
 * Then open the printed URL (default http://127.0.0.1:8790/).
 */
import { join, normalize, extname } from "node:path";
import { stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";

const PORT = Number(process.env.SSP_ENGINE_PORT ?? 8790);
const HOST = process.env.SSP_ENGINE_HOST ?? "0.0.0.0";
const SUITE_ROOT = join(import.meta.dir, "public", "ssp-engine");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

function contentType(filePath: string): string {
  return MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function lanAddresses(): string[] {
  const out: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) out.push(entry.address);
    }
  }
  return out;
}

async function resolveFile(pathname: string): Promise<string | null> {
  let rel = decodeURIComponent(pathname.split("?")[0] ?? "/");

  // Accept both suite-as-root and /ssp-engine/* URLs
  if (rel === "/ssp-engine" || rel === "/ssp-engine/") rel = "/";
  else if (rel.startsWith("/ssp-engine/")) rel = rel.slice("/ssp-engine".length);

  if (rel === "/" || rel === "") rel = "/index.html";

  const candidate = normalize(join(SUITE_ROOT, rel));
  if (!candidate.startsWith(SUITE_ROOT)) return null;

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
    if (info.isDirectory()) {
      const indexPath = join(candidate, "index.html");
      const indexInfo = await stat(indexPath);
      if (indexInfo.isFile()) return indexPath;
    }
  } catch {
    /* not found */
  }
  return null;
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/ssp-engine") {
      return Response.redirect(`${url.origin}/ssp-engine/${url.search}`, 308);
    }

    // Health check for tunnels / probes
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", suite: "ssp-engine" });
    }

    const filePath = await resolveFile(url.pathname);
    if (!filePath) {
      return new Response("Not Found — open / or /ssp-engine/", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response(Bun.file(filePath), {
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
});

const port = server.port;
console.log("");
console.log("══════════════════════════════════════════════");
console.log("  SSP Surreal Engine — local preview");
console.log("══════════════════════════════════════════════");
console.log(`  Open:     http://127.0.0.1:${port}/`);
console.log(`  Alt:      http://localhost:${port}/ssp-engine/`);
for (const ip of lanAddresses()) {
  console.log(`  LAN:      http://${ip}:${port}/`);
}
console.log("  Passcode: 8888  (also SPALTER / SSP2026)");
console.log("  Stop:     Ctrl+C");
console.log("══════════════════════════════════════════════");
console.log("");
console.log(`Serving ${SUITE_ROOT}`);
console.log(`Bound ${HOST}:${port}`);
