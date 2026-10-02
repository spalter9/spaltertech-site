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
- **Root cause confirmed, decisively: desktop Safari on Bradley's Mac
  Mini bounces the same track perfectly, every time** — same WebKit
  engine family as his iPhone, just with far more memory. That
  confirms this was never a logic bug in any of the four "mono" fixes
  or the crossover/punch-band work; it's specifically the phone
  running low on resources doing three full multi-minute renders back
  to back. Bradley has a fully reliable path (Mac Mini, any browser)
  for real work now, independent of whatever happens on the phone.
  **Built the actual fix for the phone case: chunked offline
  rendering** (commit `15160f9`). `renderVariant` split into
  `renderChunk(v, srcBuffer)` — identical graph-building logic,
  parameterized on which buffer to render instead of always the
  global track — plus a new orchestrator that renders tracks over 90s
  in 30-second windows instead of one giant `OfflineAudioContext`.
  Every stage has some form of "memory" a naive cut would audibly
  break at chunk boundaries (room reverb tail up to 2.4s, compressor
  releases up to 250ms, Haas delay lines up to 51ms, the
  worklet-based transient-shaper/maximizer's envelope state), so each
  chunk actually renders 3 extra seconds of real audio *before* its
  nominal start (thrown away after, not in the output) so those
  stages reach the same settled state they'd have reached mid-track.
  The mono downmix (memoryless, per-sample) moved out of the
  per-chunk path to apply once on the assembled buffer instead.
  Short tracks are completely unaffected — same single-render code
  path as always. Wired an optional progress callback through both
  export call sites so a long render's status line shows "CHUNK 3 OF
  7" instead of going silent. **Verified rigorously in Chromium**: ran
  the identical 3-file bounce against Bradley's real 197s track twice
  — once through the new chunked path, once through a copy with
  chunking disabled (the old single-render behavior) — and compared
  sample-by-sample. Correlation 0.999991 across the whole track; RMS
  at every one of the 6 chunk boundaries (30/60/90/120/150/180s)
  matches within 0.1-0.5%, no audible discontinuity anywhere. This
  closes out the mono-bounce/white-noise saga from this session:
  root cause was resource exhaustion on long tracks on mobile
  (worsened by the since-fixed ledger memory leak), not any of the
  code paths the first four fix attempts targeted. Still worth a
  real-device re-test on Bradley's phone when he gets to it (he's
  explicitly not blocking on this — Mac Mini works fine for now) —
  but the fix is built, verified as correct against the existing
  processing chain, and live on `main`.
- **Added "AUTO A/B" to the console** (`index.html`, next to the
  existing BOOM button) for a specific upcoming use case: playing a
  mix to someone (an artist, a label) who should just sit back, close
  their eyes, and compare master vs. original without anyone touching
  a button mid-listen. Starts a timer that flips BOOM on a fixed 20s
  interval by itself, with a live countdown on screen for whoever's
  running the session (not meant for the listener to see). Ticks
  every 250ms against a wall-clock deadline rather than one
  `setTimeout` per flip, so the countdown stays accurate even through
  a backgrounded tab. A manual BOOM click always cancels Auto A/B
  first, so taking over by hand never fights the timer. Verified in
  Playwright: countdown decrements exactly on schedule, BOOM flips
  precisely at the 20s mark, manual override correctly cancels and
  resets the button/status. Pushed to `main` at commit `56f74c1`.
- **Added a one-click export of that Auto A/B cadence as a single MP3**
  (`index.html`, button next to the 3-file bounce: "EXPORT AUTO A/B AS
  ONE MP3") — for sending a demo ahead of a meeting (Bradley's
  immediate case: an upcoming Dre meeting) or playing it somewhere the
  console itself isn't open, not just the live in-browser toggle.
  `renderAutoABDemo()` reuses the same `renderChunk`/`sliceBuffer`
  pieces chunked rendering already uses: alternates 20-second
  MASTER/ORIGINAL segments for the whole track, each MASTER segment
  gets the same 3-second pre-roll (rendered, then discarded) so
  reverb/compression/delay are already settled, and each segment
  fades in/out over 15ms at its own boundaries so a hard cut between
  two differently-processed segments never reads as a click. Reuses
  the exact same encode/hash/ledger/deliver path as the 3-file bounce.
  Verified in Chromium on a 100s test track: RMS/peak cleanly
  alternate in the expected 20s MASTER/ORIGINAL/MASTER/... pattern,
  and the sample-to-sample jump at every internal boundary is no
  larger than (in a couple of cases, smaller than) the typical jump
  found elsewhere in the same track — confirms the fades genuinely
  eliminate clicks rather than just reduce them. Pushed to `main` at
  commit `1dfc750`.
- **Refined per Bradley, ahead of an actual Dre meeting**: no mono in
  this export (confirmed it never was), master always first then
  original (already true), but **exactly `AUTO_AB_CYCLES` (3) full
  master/original cycles** regardless of track length — not however
  many 20s segments fit into the whole track — and a **spoken "SSP
  on"/"SSP off" cue before each segment** so whoever's listening
  always knows which one is about to play without looking at
  anything. A browser can't render `speechSynthesis` output into an
  offline `AudioBuffer`, so the cues are short pre-recorded clips
  (`sspengine-static/audio/voice_ssp_on.wav`, `voice_ssp_off.wav` —
  generated with `espeak-ng`, trimmed, peak-normalized, 5ms edge
  fades; this sandbox had neither the tool nor the files installed by
  default and both had to be set up fresh) fetched and resampled to
  the track's own sample rate once per render. Each segment is now:
  silence gap → voice cue → silence gap → 20s of music, fading in/out
  at its own edges into the surrounding silence. Falls back to
  however many complete cycles actually fit if the loaded track is
  shorter than 3 cycles need (120s + voice/gap overhead). Verified in
  Chromium on a 130s test track (long enough for all 3 cycles): total
  duration matches the predicted sum of every piece to within 0.02s;
  full-window RMS at all 6 music segments shows a clean, consistent
  MASTER (~0.186) / ORIGINAL (~0.12) alternation in the right order;
  a real voice cue confirmed present at all 6 predicted positions;
  the gap immediately before each music segment measures exactly
  zero. Pushed to `main` at commit `4593c1e`.
- **Verified the Auto A/B demo export's MASTER segments are genuinely
  the same quality as a plain "Bounce Master" export** — Bradley's
  explicit requirement before using this file to play for Dr. Dre
  ("the quality has to be the same as, as the master... that's going
  to be what sells Dre"). This was pure verification, no code changes
  (no commit). Ran both exports in Chromium against the same 130s
  test track/preset (both go through chunked rendering: plain master
  bounce via `renderChunked`'s 30s/3s-preroll windows since the track
  exceeds the 90s threshold, the AB demo via its own 20s/3s-preroll
  windows in `renderAutoABDemo`), decoded both outputs' real audio
  samples, and mathematically derived the exact sample position of
  each MASTER segment inside the AB demo output (down to the sample,
  from `AUTO_AB_SECONDS`/`AB_VOICE_GAP_MS`/the real voice-clip lengths
  decoded at the track's sample rate) rather than relying on
  cross-correlation search — a first attempt at blind cross-correlation
  search gave misleadingly high "matches" at wrong offsets because the
  synthetic test track's steady 300Hz test tone is periodic and
  correlates with itself at many false lags; the fix was computing the
  true alignment directly from the code's own constants instead of
  searching for it. Compared each of the 3 MASTER segments against the
  corresponding time range of the plain master bounce: segment 1
  bit-for-bit identical (correlation 1.000000, zero RMS/peak
  difference); segments 2 and 3 correlation 0.999998–0.999999 with
  RMS difference ~0.0003 and peak difference ~0.006–0.007 — the same
  tiny, inaudible magnitude already verified elsewhere this session as
  the expected chunk-boundary rounding noise from chunked rendering
  (not any quality loss, truncation, or artifact). Confirms Bradley's
  requirement is genuinely met: what plays during the MASTER segments
  of the Auto A/B demo is the same master quality, not some lesser
  pass.
- **Upgraded the "SSP on"/"SSP off" voice cues from espeak-ng to a real
  neural TTS voice** (commit `fc3a86f`) — Bradley's call: "go with
  the smoothest computer voice you've got for right now... when we
  get Spalty working, then we'll change it." Hugging Face (where
  Piper's voice models are hosted today) is blocked by this sandbox's
  network policy, but `github.com`/`raw.githubusercontent.com` are
  not, and Piper's legacy v0.0.2 GitHub release still serves the same
  voice models as `.tar.gz` assets — used that path to fetch
  `en-us-ryan-high` (`pip install piper-tts`, model pulled from
  `github.com/rhasspy/piper/releases/download/v0.0.2/`, no Hugging
  Face access needed). Regenerated both clips with the same spelled-
  out "S S P on"/"S S P off" input text and the same post-processing
  as before (silence trim, peak-normalize to 0.92, 5ms edge fades).
  Verified end-to-end in Chromium: swapped the new files into a
  `main`-based test checkout, ran the full Auto A/B demo export
  against the 130s test track, confirmed all 6 segments (3 voice
  cues + 3 music segments, correctly alternating) completed with no
  new errors. Still a placeholder voice, just a clearer one — swap to
  Spalty's real ElevenLabs voice once that's wired up in production
  (see the Spalty item above).
- **Live playback static on Safari (iPhone AND Mac Mini), even with the
  engine OFF** — Bradley's report: "I just hit play... still static",
  no music at all. Not reproducible in Chromium (live chain measured
  clean, engine on and off). Root mechanism found in code: BOOM off only
  set `N.wet` gain to 0 — the whole master chain stayed wired to the
  speakers, plus the LUFS meter's gain-0 sink to `destination` (the
  `ssp-loudness` worklet passes its input through). On WebKit NaN * 0 is
  NaN (already documented in `makeCodec`), so any stage emitting NaN
  poisons the ORIGINAL too. Proven in Chromium by injecting a NaN
  AudioWorklet into `N.out`: old code → every output sample non-finite
  with the engine off; new code → original plays clean. **Fix (commit
  `7e814cc`):** `linkWet()` physically disconnects `N.wet` from `N.an`
  and `N.lufsSink` from `destination` 250ms after BOOM-off (after the
  fade, ~-108dB residual, no click) and reconnects on BOOM-on; and the
  live valve `N.shaper.oversample` is now `'none'` (was `'4x'`), same
  as every export — WebKit's oversampled WaveShaper is the documented
  source of this garbage-output class, and monitor now = print. Rapid
  toggle / Auto A/B / LUFS meter regression-tested clean.
  **Not yet confirmed on real Safari.** The re-test tells you which
  case it is: original clean but MASTER still static → something else
  in the master chain glitches on WebKit (next suspects: the AudioWorklet
  stages, HRTF panner, room convolver); ORIGINAL still static too → it
  isn't the site at all, it's the loaded file itself (e.g. one of the
  white-noise iPhone bounces being reloaded) or the Mac's audio
  output/interface (disturbed in the same session by plugging wireless
  dongles into the hub the interface shares). Also noticed, not fixed:
  the loudness worklet's `hist` array grows without bound and is
  re-filtered every block, so CPU on the audio thread creeps up over a
  very long-lived tab.
- **`7e814cc` did NOT change anything on the iPhone** — Bradley: "still
  massive static on the iPhone, nothing's changed" (Mac not yet
  re-checked). Note the master chain still *runs* with the engine off
  (source always feeds `N.inWet`; only its route to the speakers is
  cut), so device CPU overload from the chain, the file itself, or an
  iOS-level output problem are all still open. Rather than another
  round-trip guess, added a temporary **AUDIO CHECK · STATIC
  TROUBLESHOOTER** button under Auto A/B (commit `76339d7`, build tag
  `AUDIO_CHECK_BUILD`). One tap → screenshot-ready box: build tag
  (confirms the device isn't running a cached page), device/browser,
  engine vs fresh-context sample rate, loaded-file stats (level, L/R
  correlation, invalid samples → flags "the file itself is static"
  using the known bad-bounce signature of high RMS + ~0 correlation),
  master-chain/speaker-feed invalid-sample counts, then plays a 1s beep
  and 4s of the raw track through a fresh bare AudioContext, then 2s
  through the console. Reading it: beep static → iOS/device output,
  nothing in our code; beep clean + raw static → the file; raw clean +
  console static → our graph on that device (then: invalid samples
  shown → NaN stage; none shown → likely audio-thread overload, try a
  true bypass that stops feeding `N.inWet`). **Remove the button once
  solved.** Sandbox gotcha: `pkill -f "http.server 90xx"` chained with
  `&&` in one Bash call matches its own shell and kills it (exit 144),
  silently skipping everything after it — run it on its own.
- **Phone exports now land in a "your file is ready" card** (commit
  `f35f8a5`) — Bradley: after bouncing on the iPhone he couldn't find
  the file in Files. Cause: `deliver()` ran long after the tap, iOS
  refuses `navigator.share` without a fresh tap, and the `<a download>`
  fallback saves silently (or not at all). On touch devices
  (`isTouchDevice` = touch + no `showSaveFilePicker`) every rendered
  export (`deliver(blob, name, true)` from bounce master, 3-file bounce,
  Auto A/B demo) goes to `showReady()`: inline `<audio>` player + a
  SAVE / SHARE button that calls the share sheet on its own tap (Save
  to Files / AirDrop / Messages / WhatsApp). Keeps the last
  `READY_MAX` (4). Tap-started saves (ledger SAVE, stem download, docs)
  try the share sheet if the last tap was <1s ago (own `lastTapAt`
  tracking — `navigator.userActivation` is NOT trustworthy: Playwright's
  Chromium reports `isActive` true even before any tap), and fall back
  to the card if refused. Desktop flow unchanged. Verified on an
  emulated iPhone 13 with a stubbed share sheet. Not yet seen on
  Bradley's real iPhone.
- **Computers never use the share sheet now** (commit `1e9d1fc`) —
  Bradley on the Mac: bounces "go right into that other mode" instead
  of a file he can listen to before sending. `deliver()` used to try
  `navigator.share` before a plain download on desktop too, and Mac
  Safari supports it → AirDrop/Mail/Messages popup. Desktop rendered
  exports now download immediately and also land in the card (title
  "SAVED · LISTEN BEFORE YOU SEND IT", inline player); card button is
  "SAVE AS… (PICK A FOLDER)" when `showSaveFilePicker` exists
  (Chrome/Edge) else "DOWNLOAD AGAIN" (Safari). A web page can't pick
  the Desktop itself — Safari saves wherever Settings → General → File
  download location points (Bradley was told how to set it to
  Desktop). Test gotcha: `addInitScript(fn)` serializes `fn`, so a
  closure variable inside it is undefined — pass it as the 2nd arg.
- **A/B from two files: the user's own master + the original** (commit
  `b09a67c`) — Bradley wants the Dre A/B built from the master he
  already bounced and approved. Loading that master into the console's
  engine-based Auto A/B would master it twice, so there's a separate
  box under the export buttons (`#ab2Box`: slot 1 `#ab2MasterIn`, slot 2
  `#ab2OrigIn`, `#ab2Bounce`). It calls `renderAutoABDemo(onProgress,
  src, masterSeg)` — now parameterized: `src` = original, `masterSeg`
  cuts MASTER segments straight from the master file (no processing).
  `alignLag()` lines the files up (decimated correlation ±0.3s, then
  exact to the sample), absorbing MP3 encoder delay. Measured: a
  console master runs **~6 ms (264 samples) behind** the original —
  the limiter's look-ahead (the engine-based A/B carries the same
  offset; irrelevant there because every segment is separated by a
  voice cue). Rejects files with correlation < .25 ("don't look like
  the same song"), warns if the "master" is >1dB quieter (swapped?).
  Verified: master segments bit-identical to the master file at the
  exact sample for in-sync / +1105 / −300 sample offsets; original
  segments exact to 16-bit precision. Test songs must be non-periodic
  (`song_orig_130s.wav` generator in this session) — the old kick+tone
  track fools any correlation-based alignment.
- **A/B redesigned around ONE passage, original first** (commit
  `aad686c`) — Bradley: the old layout (0–20s one version, 20–40s the
  other) compared different music; he wants the same passage both ways,
  the strongest part (usually the chorus), original ("SSP off", B)
  first, then master ("SSP on", A). `pickBestSection()`: 100 fps RMS
  envelope; tempo from onset-flux autocorrelation 60–180 BPM with
  parabolic sub-frame peak (`estimateBeat`); length = 4/8/16 bars
  closest to `AB_TARGET_SECONDS` (20) within 12–32s; the earliest
  window within 0.5 dB of the loudest picks WHICH chorus, then the
  loudest window within ±half a passage picks exactly where (tolerance
  alone drifted one bar back into the verse — caught in testing);
  start snapped to the strongest onset within ~0.6 beat. `getABPair()`
  → `{orig, master, sec}` (master from file via lag, or engine-rendered
  passage with pre-roll + `alignLag`). `buildABFile()` = 3 ×
  [gap, "SSP off", gap, original, gap, "SSP on", gap, master]; both
  export buttons share `finishABExport()`; two-file checks live in
  `prepareAB2()`. Engine version now renders only the passage (~4s,
  far lighter on phones). New **A/B screen** (`#abScreenOpen` →
  `#abScreen`, state in `abS`): B left / A right, both buffers looped
  in sync on a bare AudioContext (no engine), gains pick the audible
  side; tap = that side from the TOP of the passage (commit `aea9c81`,
  Bradley: "they have to hear exact, identical... it doesn't continue
  on"; 15ms fade-out first, cancels Auto); Auto switches at
  each loop point B→A→B (bug caught: first boundary was scheduled at
  t0 because playback starts 60ms after the tap → clamp pass ≥ 0).
  Uses the two-file box's files when both loaded, else the console's
  song. Live BOOM Auto A/B now also starts on the original.
  **MATCH LEVELS switch** on the A/B screen (commit `561995d`):
  `passageLoudness()` = integrated LUFS (BS.1770 K-weighting via
  OfflineAudioContext highshelf 1500Hz +4dB / highpass 38Hz, 400ms
  blocks, -70/-10 gating); `abApplyMatch()` turns the louder side down
  via per-side `abS.trim` gains (never boosts). Gotcha: Web Audio's
  highpass/lowpass Q is in **dB** — BS.1770's linear Q 0.5 must be
  `20*log10(.5)`; with plain 0.5 music read ~1.7 dB hot. Cross-checked
  with `pyloudnorm` (pip-installable here): within 0.02 dB. Note the
  gap depends on preset: Spalter preset master +3.7 dB vs original on
  the test song, default FLAT preset master −1.4 dB. Verified on
  a 90 BPM test song with a known chorus at 32.0s (`structured_song.wav`
  generator in this session): picks 32.0s / 8 bars / 90 BPM.

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
