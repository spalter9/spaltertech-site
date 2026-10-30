// Vercel Node.js Function entry point — mounts the Hono app (which already
// registers its routes with full "/api/..." paths) behind Vercel's
// zero-config /api function detection. Needs the Node runtime (not Edge):
// the app reads files from disk (node:fs/promises) and uses Better Auth,
// neither of which run on Edge.

import { handle } from "hono/vercel";
import type { Hono } from "hono";

export const config = {
  runtime: "nodejs",
};

// Vercel's Turso Marketplace integration names its env vars
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN; the app's db client reads
// DATABASE_URL / DATABASE_AUTH_TOKEN at import time, so this mapping has to
// run before the app is imported at all — a static import would be hoisted
// above any top-level assignment in this file, so the app is loaded lazily
// (and cached) on first request instead.
process.env.DATABASE_URL ??= process.env.TURSO_DATABASE_URL;
process.env.DATABASE_AUTH_TOKEN ??= process.env.TURSO_AUTH_TOKEN;

let handlerPromise: Promise<ReturnType<typeof handle>> | undefined;

function getHandler() {
  handlerPromise ??= import("../packages/web/src/api/index").then(
    ({ default: app }: { default: Hono }) => handle(app),
  );
  return handlerPromise;
}

export default async function (req: Request) {
  const handler = await getHandler();
  return handler(req);
}
