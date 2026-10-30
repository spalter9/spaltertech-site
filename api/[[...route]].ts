// Vercel Node.js Function entry point — mounts the Hono app (which already
// registers its routes with full "/api/..." paths) behind Vercel's
// zero-config /api function detection. Needs the Node runtime (not Edge):
// the app reads files from disk (node:fs/promises) and uses Better Auth,
// neither of which run on Edge.
import { handle } from "hono/vercel";
import app from "../packages/web/src/api/index";

export const config = {
  runtime: "nodejs",
};

export default handle(app);
