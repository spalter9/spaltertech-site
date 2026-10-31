# Detector test set

Tools for scoring AI-music detectors (Hive, Modulate) against ground truth
instead of vendor claims, before one replaces the Examiner's verdict. Internal
only; nothing here ships to the site.

Why it exists: the Examiner's current five-measurement verdict calls stereo
white noise "Likely human performance · Claimable" in all three bands, and a
fully machine-made, perfectly quantized song "Claimable" in the mid band.
A detector replaces that verdict only after it catches every AI track in the
test set and flags none of the human reference records.

Needs Node 22.18+ (runs the `.ts` files directly). `npm test` runs all 66 tests
against in-process fakes of Replicate and Stability, without spending credits.

## 1. Generate known-AI songs — `generate.ts`

```bash
node generate.ts --dry-run                                     # list the jobs, spend nothing
REPLICATE_API_TOKEN=r8_... node generate.ts --songs boom-bap   # one song on every model first
REPLICATE_API_TOKEN=r8_... node generate.ts                    # 6 models × 6 songs = 36 tracks
STABILITY_API_KEY=sk-... node generate.ts --models stability   # Stable Audio direct from Stability
```

Flags: `--models` (keys below), `--songs id,id` (from `prompts.json`),
`--duration 30`, `--concurrency 2`, `--out dir`. Each provider bills per
song; start with one `--songs` to see the real cost.

| Key | Model | Vocals | Length |
|---|---|---|---|
| `lyria-2` | google/lyria-2 (Replicate) | no | fixed ~30 s |
| `minimax-music-1.5` | minimax/music-1.5 (Replicate) | yes | follows the lyrics |
| `stable-audio-2.5` | stability-ai/stable-audio-2.5 (Replicate) | no | up to 190 s |
| `elevenlabs-music` | elevenlabs/music (Replicate) | yes | 5–300 s |
| `musicgen` | meta/musicgen (Replicate), MP3, loudness-normalized | no | up to 30 s |
| `ace-step` | lucataco/ace-step (Replicate) | yes | up to 240 s |
| `stability` | Stable Audio 2.5 via api.stability.ai (opt-in) | no | up to 190 s |

Output: `out/<timestamp>/` (gitignored) with `audio/<job id>.*` and
`manifest.json`, one entry per job: `label: "ai"`, generator and model
version, song id, exact input (prompt, lyrics, seed, duration), SHA-256, and
the `MusicJob`, failures included. Rewritten after every job.

## 2. One song at a time over HTTP — `server.ts`

```
POST /api/music/generate      { prompt, durationSeconds?, negativePrompt?, seed? }
                              200 { jobId, status: "queued" } · 400 MusicError
GET  /api/music/jobs/:jobId   200 MusicJob · 404
GET  /api/music/files/:name   the stored audio (MusicJob.audioUrl points here)
POST /api/webhooks/replicate  Replicate's completion callback (signature-checked)
```

```bash
REPLICATE_API_TOKEN=r8_... node server.ts      # http://127.0.0.1:8790
```

| Variable | Default | |
|---|---|---|
| `MUSIC_PROVIDER` | `replicate` | or `stability` |
| `REPLICATE_API_TOKEN` / `STABILITY_API_KEY` | — | for the chosen provider |
| `MUSIC_MAX_DURATION_SECONDS` | `30` | cap on top of each model's own |
| `MUSIC_REPLICATE_MODEL` | `musicgen` | any key from the table above |
| `MUSIC_DATA_DIR` | `out/server` | jobs.json and audio |
| `HOST` / `PORT` | `127.0.0.1` / `8790` | |
| `MUSIC_API_KEY` | — | Bearer key; **required** to listen beyond localhost, since anyone who reaches `/generate` spends the account's credits |
| `MUSIC_PUBLIC_URL` | `http://HOST:PORT` | base for audio URLs |
| `MUSIC_WEBHOOK_URL` | — | public URL of `/api/webhooks/replicate`; Replicate then pushes results (polling continues as a fallback) |
| `MUSIC_STORAGE_BUCKET` | — | **not wired yet**: the server refuses to start with it set rather than quietly storing on local disk |

Jobs persist in `jobs.json`; after a restart, in-flight Replicate jobs resume.

Errors are `MusicError` (`INVALID_INPUT`, `CONTENT_BLOCKED`, `RATE_LIMITED`,
`PROVIDER_UNAVAILABLE`, `GENERATION_FAILED`, `TIMEOUT`, `INTERNAL`, each with
`retryable`). The provider's raw response is logged on the server and never
returned to a client.

Two corrections to the request examples this was specced from, both checked
against the providers' own OpenAPI specs: Replicate's
`/v1/models/{owner}/{name}/predictions` only runs *official* models, and
MusicGen isn't one, so it goes through `/v1/predictions` with a version id.
Stability's text-to-audio takes `multipart/form-data`, not JSON, has no
negative prompt, and 8 steps is only valid with `model=stable-audio-2.5`
(Stable Audio 2 needs 30–100).

## 3. What a file says about itself — `provenance.ts`

```bash
node provenance.ts track.mp3 [https://host/track.mp3] [--source-url https://...]
```

`MetadataProvenanceDetector` implements
`ProvenanceDetector.detect({ buffer?, url?, filename? })` (a `url` with no
buffer is downloaded, http(s) only, 100 MB cap) and returns a
`ProvenanceResult`: verdict, confidence, evidence, `needs_review`. It reads ID3v2/v1 (incl.
C2PA in a GEOB frame), WAV RIFF INFO/bext/C2PA chunks, FLAC and Ogg Vorbis
comments, MP4 ilst atoms and the C2PA uuid box, plus the filename and source
URL. Suno attaches C2PA content credentials to new downloads; older downloads
carry no label. C2PA signatures are detected, not cryptographically verified.

Markers are ranked, and each field counts once, at its strongest match:

| Marker | Weight | Where it counts |
|---|---|---|
| C2PA manifest naming the generator | 0.95 | manifest |
| `suno.com/song/<uuid>` | 0.95 | any field |
| `made with suno` | 0.90 | any field |
| `suno.com` / `suno.ai` (and other generators' domains) | 0.85 | any field |
| C2PA declaring AI, no generator named | 0.85 | manifest |
| bare `suno` (or another generator's name) | 0.60 | comment and encoder/software fields only |

A bare name never counts in a title, artist, album or filename: "suno" is
Hindi/Urdu for "listen", and AIVA and Lyria are people's names. The source
URL is capped at 0.75 and the filename at 0.40.

Verdict, with `confidence = 1 − Π(1 − weight)` over the AI signals found:

| Condition | Verdict |
|---|---|
| ≥ threshold, with a tag / manifest / URL signal | `likely_suno` (`likely_ai_other` if those name another generator) |
| ≥ threshold, classifier signals only | `likely_ai_other`, even if the classifier names Suno |
| ≤ 0.20 and no signals at all | `unknown` |
| anything else | `unknown`, `needs_review: true` |

Nothing returns `likely_human` (the type keeps it): a clean file is
`unknown`, and a detector that heard no AI is listed at weight 0, not
counted. So a lone bare "Suno" in an encoder field (0.60), a Suno source URL
(0.75) or a filename (0.40) goes to review; two of them together can clear
the bar (0.60 + 0.75 → 0.90).

| Variable | Default | |
|---|---|---|
| `PROVENANCE_REVIEW_THRESHOLD` | `0.85` | confidence needed for a verdict, in (0, 1] |
| `PROVENANCE_ML_ENABLED` | `false` | call the listening detectors (`hostedDetector`, `spectralClassifier` options, where Hive or Modulate plug in); off, they're never called. One that errors is listed at weight 0 and the check still answers. |

The Evidence list adds `riff_info` and `c2pa_manifest` to the original
signal names.

## Still to add by hand

Suno and Udio have no official API. Add real Suno tracks (Bradley's
friend's first, plus a few made on suno.com) with a manifest entry each. The
human half of the test set is Bradley's own records, and every file is tested
again as a 128 kbps MP3 and after a pass through the console's master chain,
since detection weakens on processed audio.
