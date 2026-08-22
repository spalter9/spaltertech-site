/**
 * Standalone static server for the Surreal Engine suite.
 *
 * Serves packages/web/public so /ssp-engine/* paths resolve correctly
 * (index.html uses <base href="/ssp-engine/"> and absolute worklet paths).
 *
 * Usage: bun run preview:ssp-engine
 * Open:  http://localhost:8790/ssp-engine/
 */
import { join, normalize } from "node:path";
import { stat } from "node:fs/promises";

const PORT = Number(process.env.SSP_ENGINE_PORT ?? 8790);
const PUBLIC_ROOT = join(import.meta.dir, "public");
const SUITE_PREFIX = "/ssp-engine";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

async function resolvePath(pathname: string): Promise<string | null> {
  if (pathname === SUITE_PREFIX) return null; // handled by redirect

  let filePath: string;
  if (pathname === `${SUITE_PREFIX}/`) {
    filePath = join(PUBLIC_ROOT, "ssp-engine/index.html");
  } else if (pathname.startsWith(`${SUITE_PREFIX}/`)) {
    filePath = join(PUBLIC_ROOT, pathname.slice(1));
  } else if (pathname === "/" || pathname === "") {
    filePath = join(PUBLIC_ROOT, "ssp-engine/index.html");
  } else {
    return null;
  }

  const normalized = normalize(filePath);
  if (!normalized.startsWith(PUBLIC_ROOT)) return null;

  try {
    const info = await stat(normalized);
    if (info.isFile()) return normalized;
  } catch {
    /* not found */
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === SUITE_PREFIX) {
      return Response.redirect(`${url.origin}${SUITE_PREFIX}/${url.search}`, 308);
    }

    const filePath = await resolvePath(url.pathname);
    if (!filePath) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const file = Bun.file(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": "no-cache",
      },
    });
  },
});

console.log(`SSP Surreal Engine preview`);
console.log(`  Suite:  http://localhost:${server.port}${SUITE_PREFIX}/`);
console.log(`  Root:   http://localhost:${server.port}/  (redirects to suite)`);
console.log(`  Passcode: 8888, SPALTER, or SSP2026`);
console.log(`  Press Ctrl+C to stop`);
