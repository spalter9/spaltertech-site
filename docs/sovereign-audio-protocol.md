# Sovereign Audio Protocol

A self-hosted forensic authorship and provenance system in two halves.

**Module A — inbound.** A container arrives, is hashed before anything touches
it, separated into four sources on your own hardware, and measured stem by
stem. The output is an examiner-grade verdict and a USCO limitation-of-claim
dossier drafted from the measurements.

**Module B — outbound.** An export event produces four distinct tiers, each
hashed, all four bound by one cross-hash, the manifest signed with your own
Ed25519 key and written into every file's broadcast header.

No third-party SaaS is contacted in either path. The only network hop the API
makes is to your own separation worker.

---

## 1. Running it

### The separation worker

```bash
cd services/forensics
docker compose up -d --build      # GPU passthrough is on by default
docker compose logs -f            # first CPU-only model load takes a few minutes
curl http://127.0.0.1:8770/health # {"status":"ok","model":"htdemucs","device":"cuda"}
```

The image bakes the HTDemucs v4 weights in at build time, so the running
container needs no outbound network access at all. It binds to loopback: the
API is the only thing that should reach it. To run without a GPU, comment out
the `deploy.resources` block in `docker-compose.yml` — everything works, just
slower.

### The API

The worker's address comes from `DEMIXER_URL` (default
`http://127.0.0.1:8770`). Nothing else needs configuring. On first seal the
protocol mints its Ed25519 keypair at
`packages/web/.data/protocol/keys/`, `0600`, and reuses it forever after.

**Back that key up.** Losing it does not invalidate already-sealed files —
every manifest carries the public key that signed it — but future seals will
carry a new signer identity.

```bash
bun run db:push   # creates audit_jobs, export_sessions, export_valves
bun run dev
```

The console lives at `/sovereign-protocol`.

---

## 2. Module A — inbound forensic audit

### Pipeline

1. **Intake & hash.** SHA-256 over the uploaded bytes, computed before decode.
   This is what fixes custody, and it is the number every later artefact cites.
2. **Header probe.** If the container already carries a protocol manifest, its
   signature is checked: `SEALED_VERIFIED`, `SEALED_TAMPERED`, or
   `LEGACY_UNVERIFIED` when there is none.
3. **Container preflight.** BS.1770-4 loudness, true peak, 16–22 kHz phase
   behaviour, spectral cliff, onset timing — measured in-process on the mixed
   programme.
4. **Separation.** HTDemucs v4 splits the container into `vocals`, `drums`,
   `bass`, `other`.
5. **Per-stem measurement.** Each source is measured with the feature set
   appropriate to it (below).
6. **Scoring.** A deterministic policy maps measurements to a human-authorship
   score per examiner group, then to a verdict.
7. **Dossier.** The limitation-of-claim language is drafted from the verdicts.

### What is measured

Measurement lives in `services/forensics/measurements.py`. Judgement lives in
`packages/web/src/api/protocol/scoring.ts`. That split is deliberate: an
examiner can be shown the measured value, the published band it fell in, and
the weight it carried — not an opaque score.

**Vocals**

| Feature | What it catches |
|---|---|
| Period-to-period pitch jitter | Human phonation perturbs 0.4–2.5 %; synthesis holds far steadier |
| Micro-pitch drift on sustained notes | Detrended cents deviation inside held notes |
| Amplitude shimmer | Cycle-to-cycle amplitude perturbation |
| Formant trajectory variation | Articulation moves F1/F2 constantly; a flat track means no vocal tract |
| Room acoustic signature | Energy still decaying 50–300 ms after note offsets |
| 16–22 kHz phase dispersion | A real capture decorrelates the top octave |
| Voiced frame ratio | Plausibility gate |

**Drums**

| Feature | What it catches |
|---|---|
| Onset deviation from beat grid | A player sits a few ms off the grid; a sequencer sits on it |
| 16–22 kHz inter-channel coherence | Near-unity coherence is the neural-vocoder tell |
| Transient crest factor | Diffusion smears transients |
| Usable bandwidth | Band-limited synthesis and lossy sources shelf off early |
| Hit-to-hit dynamic variance | Uniform velocities mean programming |

**Bass & harmony**

| Feature | What it catches |
|---|---|
| Micro-timing deviation | As above, on sustained sources |
| Note duration variance | Quantised durations cluster |
| Intonation drift | Played intonation drifts; fixed-pitch generation does not |
| Spectral flatness | Elevated diffusion noise floor |
| 16–22 kHz inter-channel coherence | As above |

### Scoring

Each feature maps through a fixed piecewise-linear band to a sub-score in
`[0,1]`, published as *implausible-low, human-low, human-high,
implausible-high*. Weights per group sum to 1. Features that could not be
measured are dropped and the remaining weights renormalised — a missing
measurement never counts as evidence. Below half the evidence measurable, the
verdict is `INDETERMINATE` rather than a guess.

| Human score | Verdict | Copyright status |
|---|---|---|
| ≥ 0.80 | `HUMAN_PERFORMANCE` | `CLAIMABLE` |
| 0.40 – 0.80 | `HYBRID_HUMAN_DIRECTED` | `PARTIAL_CLAIM` |
| < 0.40 | `AI_GENERATED` | `MUST_EXCLUDE` |

The **human authorship index** is the energy-weighted mean of the stem scores,
so a near-silent stem cannot swing the result. Nothing in the scoring path
samples a random number or consults a model: the same file always produces the
same verdict, which is the only way a report survives being challenged.

### Endpoints

```
POST /api/v1/audit/scan               multipart file → 202
GET  /api/v1/audit/result/:job_id     202 while running, 200 with the report
GET  /api/v1/audit/dossier/:job_id    application/pdf — the examiner dossier
```

```bash
curl -F "file=@take.wav" http://localhost:5173/api/v1/audit/scan
# {"job_id":"aud_75ec5d3fbb","status":"processing","sha256":"b1dd…","queue_position":0}

curl http://localhost:5173/api/v1/audit/result/aud_75ec5d3fbb
```

### When the worker is offline

The job completes as `degraded_no_demix`: container preflight only, verdict
`INDETERMINATE`, no filing text issued, and a notice saying plainly that this
is not an examiner-grade result. A forensic report with an invented verdict is
worse than no report, so the pipeline refuses to produce one.

---

## 3. Module B — outbound 4-valve export matrix

### The four tiers

| Valve | Tier | Treatment |
|---|---|---|
| `original` | `ARCHIVAL_VAULT` | Bit-exact, unprocessed, source rate preserved |
| `master` | `STREAMING_DSP` | −14 LUFS integrated, −1.0 dBTP ceiling |
| `mv3` | `BROADCAST_SYNC` | Band-limited centre cancellation (200 Hz – 8 kHz), levelled to master |
| `model` | `MACHINE_INGESTION` | −16 LUFS reference; training and derivatives denied in-band |

Loudness normalisation iterates against a real BS.1770-4 measurement until it
settles within 0.1 LU, and the manifest reports what was **achieved**, never
the target.

The MV3 cancels only 200 Hz – 8 kHz because naive L−R takes the kick and bass
with the vocal and collapses in mono; keeping the low and air bands is what
makes the result usable under dialogue.

### Hashing, and why it works

Two different hashes, for two different jobs:

- **`sha256` (payload hash)** — SHA-256 of the WAV `data` chunk *only*. This is
  what the manifest records. Because it ignores metadata, a manifest can
  describe the very file it is embedded in, and rewriting headers downstream
  never invalidates it.
- **`sealed_file_sha256`** — SHA-256 of the whole delivered file, recorded in
  the delivery receipt.

The **cross-hash** is SHA-256 of the four payload hashes, sorted ascending and
joined with `|`. Every one of the four files carries the same manifest, so
altering any single tier breaks its own payload hash *and* the cross-hash check
from all three others.

### Signing

Ed25519 over the RFC 8785-style canonical JSON of the manifest — keys sorted,
no insignificant whitespace — so the signed byte sequence is reproducible from
the parsed manifest alone. The signature block carries the public key, which
means any file can be verified by anyone holding only that file. Whether that
key is *yours* is a separate question: compare `key_id` against the one
published at `sovereignProtocol.signerKey`.

### What goes into the file

- **`bext`** (EBU Tech 3285 v2) — origination record, coding history, and the
  loudness fields broadcasters ingest, in hundredths of a LU.
- **`iXML`** — the full signed manifest, plus mirrored rights and
  limitation-of-claim fields readable without parsing JSON.

Both are written before `data`, word-aligned, with the RIFF size rebuilt.

### The package

```
Session_Original_Vault.wav      sealed
Session_DSP_Master.wav          sealed
Session_Sync_MV3.wav            sealed
Session_AI_Model.wav            sealed
manifest.json                   signed manifest
DELIVERY_RECEIPT.txt            both hash sets + verification instructions
USCO_Examiner_Dossier_*.pdf     when the seal cites an audit
```

Stored, not deflated: float PCM does not compress meaningfully, and storing
keeps each member's hash inside the archive equal to its hash outside it.

### Endpoints

```
POST /api/v1/export/seal                 multipart → 201
GET  /api/v1/export/:id/package          application/zip
GET  /api/v1/export/:id/valve/:valve     audio/wav, one sealed tier
POST /api/v1/export/verify               multipart → 200 verified / 422 not
```

Pass `auditJobId` to `seal` to bind an examination to the export: the
provenance breakdown and the limitation of claim are then derived from measured
findings and travel inside all four files.

### Verifying by hand

```
1. Read the iXML chunk of any of the four files to recover the manifest.
2. Verify the Ed25519 signature over the canonical manifest JSON.
3. Recompute the file's data-chunk SHA-256; compare to the manifest.
4. Recompute the cross-hash from the four payload hashes, sorted, joined by '|'.
```

---

## 4. Layout

```
packages/web/src/api/protocol/
  types.ts        contract types, claim thresholds, delivery targets
  crypto.ts       canonical JSON, Ed25519 keys, signing, cross-hash
  dsp.ts          biquads, FFT, 4x polyphase true-peak, scoring ramps
  loudness.ts     BS.1770-4 — K-weighting, gating, LRA, true peak
  container.ts    whole-container preflight forensics
  scoring.ts      the deterministic verdict policy
  demixer.ts      client for the self-hosted worker
  audit.ts        Module A orchestration + queue
  riff.ts         RIFF chunk surgery
  bwf.ts          bext + iXML build, seal, recover
  valves.ts       the four renders, limiter, normalisation
  zip.ts          STORED zip writer
  usco.ts         limitation-of-claim drafting + examiner PDF
  pdf.ts          dependency-free PDF writer
  seal.ts         Module B orchestration
  verify.ts       standalone verification

services/forensics/
  app.py          FastAPI worker
  separation.py   HTDemucs v4
  measurements.py per-stem DSP measurement
```

---

## 5. Limits worth stating

- **The forensic features are evidence, not proof.** They measure properties
  that current generative systems tend not to reproduce. They are not a
  detector for any specific model, and a sufficiently good fake — or a heavily
  processed human performance — can land in the wrong band. The report states
  measurements and the deterministic conclusions drawn from them; it does not
  claim certainty, and the PDF says so.
- **The dossier is not legal advice.** It drafts filing language from
  measurements. The applicant remains responsible for the claim submitted.
- **Separation quality bounds everything downstream.** Bleed between stems
  moves the measurements. HTDemucs v4 is good, not perfect.
- **`ORIGINAL` preserves the source rate** rather than forcing 96 kHz.
  Resampling an archival copy would make it not the original.
- **MP3, AIFF and FLAC intake need `ffmpeg`** on the API host. WAV decodes
  in-process with no external binary.
