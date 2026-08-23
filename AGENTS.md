# AGENTS.md

## Cursor Cloud specific instructions

This monorepo (Bun workspaces + Turborepo) implements the **Sovereign Sign Protocol (SSP)** platform. The primary end-to-end product is `packages/web` (a React SPA with an embedded Hono API). `packages/desktop` (Electron) and `packages/mobile` (Expo) are optional thin clients that reuse the same API and are not required for core testing. Standard commands live in the root `README.md` and `package.json` scripts; the notes below only cover non-obvious cloud caveats.

### Package manager / toolchain
- Uses **Bun** (pinned `bun@1.3.14`), not npm/pnpm. Bun is installed at `~/.bun/bin`. If `bun` is not found, add `~/.bun/bin` to `PATH` for the shell (a login shell picks it up from `~/.bashrc`), or call it by absolute path `~/.bun/bin/bun`.

### Local database (no remote Turso needed)
- The app targets Turso/LibSQL, but for local dev it runs against a **local SQLite file** configured in the root `.env`: `DATABASE_URL=file:/workspace/packages/web/local.db`. No hosted Turso instance is required.
- Gotcha: `drizzle-kit push` uses the `turso` dialect, which **rejects an empty auth token even for a `file:` URL**. `DATABASE_AUTH_TOKEN` must be set to any non-empty placeholder (libSQL ignores it for `file:` URLs). If `db:push` fails with "Please provide required params", this is the cause.

### Environment file
- Secrets live in the root `.env` (gitignored, loaded via Vite `loadEnv`; API code reads `process.env`, browser code only sees `VITE_`-prefixed vars). If a fresh VM is missing `.env`, recreate it from `.env.template` with at minimum: `DATABASE_URL=file:/workspace/packages/web/local.db`, a non-empty `DATABASE_AUTH_TOKEN` placeholder, a random `BETTER_AUTH_SECRET`, and `WEBSITE_URL=http://localhost:5173` (must match the dev server URL used by Better Auth).

### Running / dev server
- `bun run dev` starts a **single Vite process on port 5173**; the Hono API is mounted at `/api/*` inside that same process via `vite/__plugins/hono-dev-plugin.ts` (there is no separate API server in dev). Health check: `GET /api/health` → `{"status":"ok"}`.

### Surreal Engine (Mastering Grade) — standalone preview
The DSP console lives at `packages/web/public/ssp-engine/` and **must be served over HTTP** (AudioWorklet will not run from `file://`).

**Fastest way to test right now** (no DB, no `.env`, no Vite):

```bash
bun run preview:ssp-engine
```

Then open **http://127.0.0.1:8790/** (or http://localhost:8790/ssp-engine/). Passcode `8888` (also `SPALTER`, `SSP2026`), click **Initialize Master DSP**.

Via the full site dev server (after passcode + Website portal): **http://localhost:5173/ssp-engine/** or nav link **Mastering Grade**.

Do **not** open `index.html` via `file://` — browsers block AudioWorklet on that scheme.
- After schema changes, refresh the local DB: `bun run db:push`. Seed demo data (pillars, ledger, escrow, stems, compliance): `cd packages/web && bun --env-file=../../.env run src/api/database/seed.ts`.

### Access gates (important when testing the UI)
- A client-only **root passcode gate** blocks all routes until unlocked. Valid codes: `8888`, `SPALTER`, `SSP2026`.
- After unlock, a **dual portal** asks Engine vs Website. Refresh always returns to the passcode.
- The Master Engine at `/engine` includes a **Multitask** mode that runs all industry modules concurrently.

### Deploy
- `vercel.json` builds only the web SPA (`bun run build:web` → `packages/web/dist`) so Vercel does not try to build Electron/desktop.

### Lint / typecheck caveats
- `bun run typecheck` passes for all three packages.
- `bun run lint` (konsistent conventions + oxlint) may fail on pre-existing `jsx-a11y` violations in `packages/web/src/web/components/**`.
