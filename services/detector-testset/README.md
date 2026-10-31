# Detector test set

Generates songs we **know** are AI, labelled by generator, so the AI-music
detectors we're evaluating for the Examiner (Hive, Modulate) can be scored
against ground truth instead of vendor claims. Internal only; nothing here
ships to the site.

Why it exists: the Examiner's current five-measurement verdict calls stereo
white noise "Likely human performance · Claimable" in all three bands, and a
fully machine-made, perfectly quantized song "Claimable" in the mid band.
A detector replaces that verdict only after it catches every track in this set
and flags none of the human reference records.

## Run

Needs Node 22.18+ (runs the `.ts` files directly) and a Replicate API token
(replicate.com → Account → API tokens).

```bash
node generate.ts --dry-run                       # list the jobs, spend nothing
REPLICATE_API_TOKEN=r8_... node generate.ts --songs boom-bap   # one song on every model first
REPLICATE_API_TOKEN=r8_... node generate.ts      # all 6 models × 6 songs = 36 tracks
```

Flags: `--models lyria-2,musicgen` (keys below), `--songs id,id` (from
`prompts.json`), `--duration 30`, `--concurrency 2`, `--out dir`.

Replicate bills per run and each model's price is on its page; start with
`--songs` on one song to see the real cost before the full batch.

| Key | Replicate model | Vocals | Length |
|---|---|---|---|
| `lyria-2` | google/lyria-2 | no | fixed ~30 s |
| `minimax-music-1.5` | minimax/music-1.5 | yes | follows the lyrics |
| `stable-audio-2.5` | stability-ai/stable-audio-2.5 | no | up to 190 s |
| `elevenlabs-music` | elevenlabs/music | yes | 5–300 s |
| `musicgen` | meta/musicgen | no | up to 30 s |
| `ace-step` | lucataco/ace-step | yes | up to 240 s |

## Output

`out/<timestamp>/` (gitignored): `audio/<job id>.wav` and `manifest.json`.
Each manifest entry has `label: "ai"`, the generator and model version, the
song id, the exact input (prompt, lyrics, seed, duration), the file's SHA-256
and the full `MusicJob`, failures included. The manifest is rewritten after
every job, so an interrupted run keeps what finished.

## What this doesn't cover

Suno and Udio have no official API, and Suno is the one people actually use.
Add those by hand: real tracks from the people who made them (Bradley's
friend's tracks first), plus a few made on suno.com, each with a manifest
entry saying where it came from. The test also needs the other half: human
records the detectors must **not** flag, plus every file again as a 128 kbps
MP3 and after a pass through the console's master chain, since detection
weakens on processed audio.

## Code

`types.ts` is the job contract (`GenerateMusicInput`, `MusicJob`,
`MusicProvider`). `replicate.ts` implements `MusicProvider` per model,
`jobs.ts` submits, polls, and copies results into our storage (provider URLs
expire within the hour), and `generate.ts` is the batch CLI.

```bash
node --test test/jobs.test.ts   # against an in-process fake of Replicate's API
```
