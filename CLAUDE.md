# spaltertech-site — project memory

Read this first. It's the handoff note for picking this work back up.

## What this repo is

- **`sspengine-static/`** — the production site for **sspengine.com**, a
  Cloudflare Pages project. Deploys automatically on push to `main`.
  This is the one that matters for anything user-facing.
- **`android/SurrealAudio/`** — native Android app source (Kotlin/Gradle),
  lives on this dev branch (`claude/fill-fixed-stuff-code-p35th8`), not on
  `main`. `:dsp` is a pure-JVM module, buildable/testable in any sandbox
  with `gradle :dsp:run` — no Android SDK needed. `:app` needs a real
  Android SDK, which most sandboxes don't have; CI builds it instead (see
  below).
- **`.github/workflows/android-build.yml`** — builds the Android debug
  APK on GitHub's own runners (has normal internet access; most dev
  sandboxes here have `dl.google.com` blocked by network policy). It does
  **not** auto-push to `main` (that was tried and correctly blocked as an
  unreviewed production deploy) — it stages the built APK on a plain
  branch called `android-apk-build`, fetchable from anywhere with a plain
  `git fetch`. Deploying that APK onto the live site is a manual,
  reviewed step: fetch that branch, pull the file out, verify it, then
  push it into `sspengine-static/downloads/` the normal way.
- **`packages/web/`** — a separate Vercel app. Not the same thing as
  `sspengine-static/`. Don't confuse the two.

## How production pushes work here

`sspengine-static/` deploys from `main`, but development happens on the
assigned dev branch. The established, working pattern for every site
change this session:

```
git fetch origin main
git checkout -b <throwaway-name> origin/main
# make + verify the change
git commit -m "..."
git push origin <throwaway-name>:main
git branch -D <throwaway-name>          # delete local throwaway
git checkout claude/fill-fixed-stuff-code-p35th8   # back to the dev branch
```

Never push the dev branch itself to `main` — it doesn't even have
`sspengine-static/` in a consistent state relative to `main`'s history.
Always branch fresh off `origin/main` for a site change.

## Local verification before pushing

This site uses Cloudflare Pages Functions (`sspengine-static/functions/api/`)
backed by D1. `wrangler` (via `npx -y wrangler`) works in this sandbox and
can spin up a **real local D1 database** — not a mock:

```
cd sspengine-static
npx -y wrangler pages dev . --port 8950 --d1=DB --compatibility-date=2024-01-01
# find the sqlite file it creates under .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
# apply schema.sql to it directly via python3 sqlite3, then restart the dev server
```

`.dev.vars` in `sspengine-static/` sets plain env vars for local dev
(`PORTAL_SESSION_SECRET`, `BOOTSTRAP_KEY`, etc.) — gitignored, never commit
real secrets there. `.wrangler/` (local D1 state) is also gitignored.

## Product lines live on this site

1. **The Master Trust Engine** (`index.html`) — institutional, not a
   consumer app. Rights/settlement infrastructure pitch, investor data
   room, the mastering console itself.
2. **Surreal Audio** (`surreal-audio.html`, `immersive.html`,
   `get-android.html`) — the consumer spatial-audio engine. Free tier is
   the browser demo; Android/iOS apps are the next tier. Bass-safe
   frequency-split stereo widening is the core technical differentiator —
   width only applied above 150Hz, so bass never turns to mud. Full-screen
   visualizer (10 modes, ported from the console) lives in `immersive.html`.
3. **Spalter Rights Registry** (`scan.html`, `split.html`, `registry/`) —
   QR-code song registration + self-service split sheets for
   writers/producers who don't have access to the institutional app.
   Backend: Cloudflare D1 (`writers`, `tracks`, `splits`, `messages`
   tables — schema at `writers-portal/schema.sql` on this dev branch).

## Known pending items (as of last session)

- **D1 database not yet bound in production.** The registry pages/API
  are deployed and code-verified locally, but someone with Cloudflare
  dashboard access needs to: create a D1 database, run
  `writers-portal/schema.sql` against it, bind it as `DB` to the Pages
  project, and set `PORTAL_SESSION_SECRET` + `BOOTSTRAP_KEY` as project
  variables. Until then `/api/public/quick-register` and
  `/api/public/quick-split` return a clear "not set up yet" error rather
  than failing silently.
- **Android APK is a debug build**, not signed for Play Store, sideload
  only (`get-android.html` walks through it). Google Play internal
  testing track not yet set up — would need a $25 developer account and
  a privacy policy page (app requests RECORD_AUDIO / capture permission).
- **iOS app not started at all** — needs a real macOS/Xcode environment,
  which no sandbox here has. Own-file-import-only scope (Apple doesn't
  allow app-to-app audio capture).
- **Visualizer's 3D Core mode (Three.js)** — verified to fail gracefully
  when its CDN script can't load, but its actual 3D rendering was never
  seen running in this sandbox (cdnjs.cloudflare.com is network-blocked
  here). Same code already runs live in the institutional console, so
  confidence is high, but worth a human's first real look before it's in
  front of anyone else.
- **Split sheets don't enforce that percentages sum to 100%** — each
  collaborator proposes their own share independently; reconciliation is
  a manual staff step in the review queue today, not automated.

## Working style established this session

- Verify claims empirically before reporting them done — local server +
  Playwright for the frontend, a real local D1 database (not a mock) for
  anything backend, actual CI runs for anything Android. The user
  (Bradley, non-technical founder) explicitly relies on this rigor and
  has caught real bugs this way (a native DSP bug, a CI config bug, a
  `selected` attribute bug that made every review-queue row show
  "rejected" regardless of real status).
- Bradley communicates via voice-to-text — expect run-on, informal
  phrasing. Ground vague asks in what already exists before building;
  ask a tight clarifying question only when the ambiguity genuinely
  changes architecture (native app vs. web page, what a QR scan actually
  registers, etc.) — otherwise just proceed.
