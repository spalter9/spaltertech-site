"""
Sovereign Audio Protocol — forensic separation worker.

A single self-hosted FastAPI service. It accepts an audio container, separates
it with HTDemucs v4, measures each source, and returns raw measurements. It
never returns a verdict — the scoring policy lives in the Node API so that
judgement stays in one auditable place.

    POST /analyze   multipart file → per-stem measurements
    GET  /health    model + device, for the API's availability probe

No outbound network calls are made at request time.
"""

from __future__ import annotations

import io
import logging
import os
import time

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

import measurements
import separation


logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("sap.forensics")

MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", 512 * 1024 * 1024))
MAX_ANALYSIS_SECONDS = float(os.environ.get("MAX_ANALYSIS_SECONDS", 900))

app = FastAPI(title="Sovereign Audio Protocol — Forensics Worker", version="1.0")


def _decode(raw: bytes, filename: str) -> tuple[np.ndarray, int]:
    """Decode to (channels, samples) float32. soundfile first, librosa as fallback."""
    try:
        data, sr = sf.read(io.BytesIO(raw), dtype="float32", always_2d=True)
        return data.T, int(sr)
    except Exception:  # noqa: BLE001 - fall through to the broader decoder
        pass

    try:
        import librosa

        # librosa reaches for audioread/ffmpeg, which covers mp3 and exotic aiff.
        data, sr = librosa.load(io.BytesIO(raw), sr=None, mono=False)
        if data.ndim == 1:
            data = np.stack([data, data])
        return data.astype(np.float32), int(sr)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=415, detail=f"Could not decode {filename!r}: {exc}"
        ) from exc


@app.get("/health")
def health() -> JSONResponse:
    info = separation.model_info()
    return JSONResponse({"status": "ok", **info})


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> JSONResponse:
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds {MAX_UPLOAD_BYTES} bytes",
        )

    started = time.monotonic()
    audio, sr = _decode(raw, file.filename or "upload")
    duration = audio.shape[-1] / sr if sr else 0.0

    if duration > MAX_ANALYSIS_SECONDS:
        raise HTTPException(
            status_code=413,
            detail=f"Programme is {duration:.0f}s; worker limit is {MAX_ANALYSIS_SECONDS:.0f}s",
        )

    logger.info("separating %s (%.1fs, %dHz)", file.filename, duration, sr)
    stems, stem_sr = separation.separate(audio, sr)

    shares = measurements.energy_shares(stems)
    payload = []
    for name, stem in stems.items():
        logger.info("measuring stem %s", name)
        payload.append(
            {
                "stem": name,
                "energy_share": round(shares.get(name, 0.0), 6),
                "features": measurements.measure_stem(name, stem, stem_sr),
            }
        )

    info = separation.model_info()
    return JSONResponse(
        {
            "model": info["model"],
            "device": info["device"],
            "duration_sec": round(duration, 3),
            "sample_rate": stem_sr,
            "channels": int(audio.shape[0]),
            "stems": payload,
            "elapsed_sec": round(time.monotonic() - started, 2),
        }
    )


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 8770)),
        workers=1,
    )
