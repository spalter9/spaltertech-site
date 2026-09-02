# Forensics worker

Self-hosted HTDemucs v4 separation plus per-stem DSP measurement, for Module A
of the Sovereign Audio Protocol. Full protocol documentation lives in
[`docs/sovereign-audio-protocol.md`](../../docs/sovereign-audio-protocol.md).

## Run

```bash
docker compose up -d --build
curl http://127.0.0.1:8770/health
```

Model weights are baked into the image at build time, so the running container
makes no outbound network calls. It binds to loopback — the API is the only
thing that should reach it. Put it behind mTLS or a private network before
exposing it anywhere else.

Without a GPU, comment out the `deploy.resources` block in
`docker-compose.yml`. Everything works; separation just takes minutes instead
of seconds, and the first model load on a cold CPU start is slow enough that
the healthcheck allows a 180 s grace period.

## API

```
GET  /health    → {"status":"ok","model":"htdemucs","device":"cuda"}
POST /analyze   → multipart file, returns per-stem measurements
```

`/analyze` returns measurements only — never a verdict. Scoring policy lives on
the Node side in `packages/web/src/api/protocol/scoring.ts` so that judgement
stays in one auditable place, and so an examiner can be shown the measured
value separately from the rule applied to it.

```json
{
  "model": "htdemucs",
  "device": "cuda",
  "duration_sec": 214.3,
  "sample_rate": 44100,
  "channels": 2,
  "stems": [
    {
      "stem": "vocals",
      "energy_share": 0.34,
      "features": {
        "pitch_jitter_pct": 1.24,
        "micro_pitch_drift_cents": 27.5,
        "shimmer_pct": 5.8,
        "formant_stability_cv": 0.21,
        "room_late_energy_ratio": 0.11,
        "hf_phase_dispersion": 0.44,
        "hf_phase_correlation": 0.38,
        "voiced_ratio": 0.58
      }
    }
  ],
  "elapsed_sec": 41.2
}
```

A feature that could not be measured (silent stem, no voiced frames, no
detectable onsets) is returned as `null`. The API drops it and renormalises the
remaining weights rather than treating a missing measurement as evidence.

A single stem whose feature extraction raises is not allowed to fail the whole
request: `app.py` catches it, logs it, and reports that stem as unmeasured
(every key present, every value `null` — the same shape a silent stem
produces) rather than 500ing and losing the other three stems' results.

## Validating without a GPU

`measurements.py` only imports numpy/scipy/librosa — no torch, no model
weights — so it can be exercised directly against synthesized audio:

```bash
python3 -m venv .venv-validate
.venv-validate/bin/pip install -r requirements-validate.txt
.venv-validate/bin/python validate_measurements.py
```

It builds paired human-like/synthetic signals per stem, changing one property
at a time, and checks that each feature separates in the direction its
scoring band in `scoring.ts` assumes. This is the only thing in the repo that
actually runs the DSP against real signal rather than checking it compiles —
worth re-running after any change to `measurements.py`. It does not validate
HTDemucs separation quality, which needs real audio and a GPU to assess
honestly; see the "Validating the measurement code without a GPU" section of
[the protocol docs](../../docs/sovereign-audio-protocol.md) for what it has
already found running here.

## Environment

| Variable | Default | Notes |
|---|---|---|
| `DEMUCS_MODEL` | `htdemucs` | Any model `demucs.pretrained.get_model` accepts |
| `DEMUCS_DEVICE` | auto | Auto-selects `cuda` → `mps` → `cpu` |
| `MAX_UPLOAD_BYTES` | 536870912 | 512 MB |
| `MAX_ANALYSIS_SECONDS` | 900 | Rejects programme longer than this |
| `LOG_LEVEL` | `INFO` | |

## Notes

- One uvicorn worker by design. Separation is serialised on the GPU anyway, and
  a second process would double VRAM for no throughput.
- `requirements.txt` is pinned so a rebuild reproduces the same worker — and
  therefore the same measurements.
