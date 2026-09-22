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
- **Spalty (the console's AI chat widget) has never had its server-side
  keys configured in production** — confirmed live via a screenshot
  from sspengine.com showing `/api/spalty` return `HTTP 503 — Spalty is
  not configured`. Someone with Cloudflare dashboard access needs to set
  `ANTHROPIC_API_KEY` (a real key from console.anthropic.com, separate
  from whatever powers Claude Code) and, for the cloned ElevenLabs
  voice, `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`, as environment
  variables on the Pages project (Settings → Environment variables, set
  for the Production environment, then trigger a fresh deploy — env var
  changes don't apply to an already-built deployment). Until then, both
  `/api/spalty` and `/api/spalty-voice` fail this exact way and Spalty
  degrades to a canned text line / the browser's robot voice — this is
  now a clear, specific, self-diagnosing message rather than the
  confusing "I go fully live once we deploy" line it used to show,
  which read as Spalty falsely claiming the site wasn't live yet.
- **Immersive's Haas/ER/room sends now have a second highpass (300Hz)
  above the 150Hz width-matrix crossover**, on top of the send path
  only (`N.sendHP` in `index.html`'s live graph and offline bounce,
  `sendHP` in `immersive.html`). Root cause of Bradley's "the kick's
  punch/chest is dropping out when Immersive engages" report: the
  150Hz crossover already zeroes a dead-center source (mono kick,
  lead vocal) out of the side-only bus those sends are built from, but
  it does nothing to stop *other* wideband mix content in the
  150–300Hz "chest" band from riding into Haas/reflections/room and
  cluttering exactly the band that defines a kick's punch — even
  though the kick's own level was never touched (confirmed directly:
  a band-limited 150–300Hz measurement of a real kick pattern showed
  no level change with Immersive on, 0.1%, before this fix). Verified
  with a 200Hz decorrelated probe tone that the new send highpass
  roughly halves that leak (0.021 → 0.011 RMS into the Haas wet bus)
  without touching the kick's own punch-band level. Pushed to `main`
  at commit `6deeaf7`.
- **Found and fixed a real, severe structural bug in the 150Hz width
  crossover itself** (not just the Haas/ER/room sends above): `wLow`
  (lowpass) and `wHigh` (an independently-built highpass) were summed
  back together downstream, and two independently-built biquads don't
  stay phase-matched at a shared corner frequency. Measured on a
  steady-tone sweep: a near-total ~85dB null right at 150Hz and steep
  ~9dB notches at 130/175Hz, present on *every* track any time the
  processed chain (BOOM/master chain) was engaged — independent of
  width amount, Immersive, or preset. On a real mix this was a genuine
  ~3.5dB dip in the 150–400Hz band vs. the dry original — exactly the
  "mid-lows"/"chest" band, and almost certainly the real explanation
  behind repeated "sounds no different / worse than the original"
  reports on both the console and `immersive.html` across sessions
  (see the width-slider nudge history in `immersive.html` — previous
  rounds chased this as a level problem, never as the structural one
  underneath). Fixed by rebuilding `wHigh` via subtraction (signal
  minus its own lowpassed self) instead of an independent filter — the
  same phase-coherent technique `makeMultiband` already used and
  documented nearby, just never applied to this crossover. Verified:
  the tone sweep went from -85dB/-9dB notches to a flat +1.1 to
  +1.2dB across 80–700Hz; the real-mix 150–400Hz gap closed from
  -3.5dB to +0.7dB; Immersive's own width effect is unaffected
  (+37% side/mid ratio, same as before the fix). Applied in
  `index.html`'s live graph and offline bounce path, and in
  `immersive.html`. Pushed to `main` at commit `1be97df`.
- **Fixed a Safari-only full-scale-noise bug on the "mono check" file
  in the console's 3-file bounce** (`renderVariant('mono')` in
  `index.html`). The mono variant built a stereo `OfflineAudioContext`
  and manually downmixed afterward via a ChannelSplitter -> single
  GainNode -> ChannelMerger fan-out (one gain node connected to both
  merger inputs). Bradley sent an actual Safari-rendered bounce
  (Dr. Dre — The Next Episode) where the mono file was confirmed via
  direct sample analysis to be full-scale noise for the entire 197s
  (~0.84 RMS vs. ~0.19 on the correctly-rendered master, ~0 L/R
  correlation for the whole track — should be exactly 1.0 for a true
  mono file), while master/original in the same bounce were fine, and
  the identical bounce reproduced cleanly in Chromium — pointing at a
  WebKit-specific bug in that exact fan-out node shape, the same
  general class as an already-documented-and-worked-around Safari
  WaveShaper offline-rendering bug elsewhere in this file. Fix:
  render the mono variant into a genuinely 1-channel
  `OfflineAudioContext` and let the browser's standard stereo-to-mono
  destination downmix handle it (0.5·(L+R), same math, no custom
  node graph) — removes the buggy shape entirely rather than working
  around it. Verified in Chromium against Bradley's actual track
  (correct 1-channel output, sane level, no NaN). Pushed to `main` at
  commit `b4e39d1`.
- **That fix (commit `b4e39d1`) did not actually resolve it** —
  Bradley re-tested on his real Safari device after it was live and
  the mono file was still pure white noise. Confirmed the push really
  was live on `main` (not a stale-deploy issue), so the 1-channel-
  destination approach itself was the wrong theory: Safari mishandles
  *some* multi-channel offline-render path, not specifically the
  splitter/gain/merger fan-out shape from the first attempt or the
  implicit-downmix shape from the second. **Actual fix (commit
  `eb8b5de`):** stopped guessing at which Web Audio node shape Safari
  breaks on, and removed Web Audio from the downmix step entirely —
  the mono variant now renders through the identical stereo graph as
  `master` (proven correct on every browser including Bradley's
  Safari, in the same bounce), then downmixes with plain JavaScript
  (`0.5 * (l[i] + r[i])` in a for loop) on the returned
  `Float32Array` data, no Web Audio nodes or OfflineAudioContext
  channel tricks involved at all. Verified in Chromium: MONO output
  is bit-for-bit identical to `0.5*(masterL + masterR)`. **Still not
  verified on real Safari** (no such environment in any sandbox
  here) — this is the second attempt Bradley needs to re-test; if
  this one still doesn't hold, the bug isn't in the downmix step at
  all and the search needs to move elsewhere in the render pipeline
  (e.g. the shared stages every variant renders through, which would
  also implicate `master`/`original` eventually, or something
  specific to how Safari's MP3 encoder path or `deliver()` handles a
  1-channel buffer downstream of the render).
- **That second fix (commit `eb8b5de`) ALSO did not resolve it** —
  Bradley re-tested again on real Safari, still white noise, same
  signature (uniform ~0.84 RMS, ~0 L/R correlation, whole track).
  He also reported the `original` file as noise this round, but
  direct inspection of the actual uploaded files showed `original`
  was fine (clean, RMS ~0.19, correct) — that report was very likely
  a mix-up on his end (non-technical user, and the repeated re-upload
  workflow produces filenames like `..._ORIGINAL_ORIGINAL_4.mp3` that
  are genuinely easy to confuse in a downloads folder). Only `mono`
  was actually still broken. Root-caused the real gap in every prior
  verification here: this sandbox can't reach the CDN `lamejs` loads
  from, so `canMp3` was always false in testing and every previous
  "verified in Chromium" fix silently exercised the WAV fallback
  (`wavFloat32`), never lamejs's `channels=1` MP3 encoder path
  (`new Mp3Encoder(1, sr, 320)` + single-argument `encodeBuffer`) —
  the one thing common to all three failed attempts and the one thing
  never actually tested. Pulled the real `lamejs` 1.2.0 from npm and
  served it locally in Playwright to close that gap. **Actual fix
  (commit `b73bc7a`):** stopped trying to fix the mono-specific
  encoder path and sidestepped it — `renderVariant('mono')` still
  computes a true mono mixdown (0.5·(L+R)) but delivers it in a
  normal 2-channel buffer with both channels identical, so it goes
  through the exact same `channels=2` lamejs path `master` has used
  correctly on Bradley's Safari every time. Verified end-to-end for
  the first time with the real MP3 encoder (not the WAV fallback)
  against Bradley's actual track: decodes to RMS 0.18 (matches
  master), L/R correlation exactly 1.0000 for the full 197s, no NaN.
  **Still needs Bradley's real-Safari re-test to confirm** — this is
  the fourth attempt; if it still doesn't hold, the MP3-encoder-path
  theory is wrong too and the next thing to check is `deliver()`
  itself or iOS memory pressure across three sequential large renders
  in one bounce run, ideally with the user directly in a screen-share
  or remote debugging session rather than another round-trip guess.
- **That fourth fix (commit `b73bc7a`) also failed to help, and the
  picture changed completely from a screenshot** — Bradley reported
  both `master` AND `mono` coming back as noise (not just mono),
  confirmed by sample inspection (`master`'s code path was never
  touched by any of the four "mono" fixes, ruling out the downmix
  theory entirely). A private-browsing test (genuinely fresh session,
  no restored state) still showed the same corruption — ruling out
  session/tab carryover too. Then a screenshot of an actual failed
  attempt showed the real signal the whole time: **`✕ BOUNCE FAILED —
  TRACK MAY BE TOO LONG FOR THIS DEVICE`** — an error message that
  already existed in the code, from a genuinely thrown exception on
  the third render of the bounce (only ORIGINAL and SSP_MASTER made
  it into the ledger; MONO never completed). That reframed everything:
  this was never a logic bug in the mono downmix at all — it's mobile
  Safari running low on resources partway through three full
  multi-minute `OfflineAudioContext` renders back to back in one
  session, degrading to either a clean crash or (worse, in earlier
  attempts) silent data corruption depending on exactly how depleted
  things were at that moment.
  **Found a real, concrete, unbounded memory leak that fits this
  perfectly:** every ledger row's SAVE button (`ledgerSave()` in
  `index.html`, used by every export path — bounce, valve export,
  Examiner report, stem Examiner, signed master, server print)
  closed over its blob directly, keeping the full exported file alive
  in memory for the rest of the page's life with zero release
  mechanism. `pendingSaves` looked like an earlier, incomplete attempt
  at bounding this — it was pushed to but never read anywhere, dead
  code. Across a long session with repeated exports of a 3+ minute
  track (exactly what today's testing was), this accumulates with no
  ceiling. **Fix (commit `c5a9175`):** keep only the most recent 3
  exported blobs live/re-downloadable; older rows release their blob
  reference (nulled, garbage-collectable) while keeping their
  timestamp/hash as the audit record, and their SAVE button now tells
  the user to re-export instead of silently failing. Also widened the
  pause between each of the bounce's three renders from 600ms to
  1500ms to give the browser more real time to reclaim memory before
  the next multi-minute render starts. Verified in Chromium: ran the
  bounce twice (6 ledger entries against the cap of 3), confirmed the
  oldest 3 SAVE buttons correctly report "expired" with no download
  while the newest 3 still deliver real files.
  **Still needs Bradley's real-device re-test** — ideally after a
  genuine full restart (not "restore saved session," which brought
  back the same accumulated leak every prior time) — to confirm the
  leak was actually the root cause of today's whole saga, or at least
  a major contributor to it. If a bounce right after a truly fresh
  start (private tab or a fully-quit-and-reopened Safari) still fails
  or comes back as noise on the very first attempt of a session, that
  rules out accumulated leak/memory pressure specifically and points
  back at something inherent to rendering this one very long track,
  in which case the next real lead is chunked offline rendering
  (render the multi-minute track in shorter windowed segments and
  concatenate, so peak memory per `OfflineAudioContext` stays low
  regardless of total track length) rather than another narrow
  point-fix.

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
