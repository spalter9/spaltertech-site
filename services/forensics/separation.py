"""
HTDemucs v4 source separation, self-hosted.

The model weights are pulled once at image build time and cached inside the
container, so a running worker needs no network access at all. Nothing about
the audio it processes leaves the host.
"""

from __future__ import annotations

import os
import threading

import numpy as np
import torch

from demucs.apply import apply_model
from demucs.pretrained import get_model


DEFAULT_MODEL = os.environ.get("DEMUCS_MODEL", "htdemucs")

# One model instance, loaded lazily, guarded for concurrent requests. GPU memory
# is the binding constraint here, so separation is serialised rather than pooled.
_model = None
_model_lock = threading.Lock()
_gpu_lock = threading.Lock()


def _select_device() -> str:
    override = os.environ.get("DEMUCS_DEVICE")
    if override:
        return override
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = _select_device()


def load_model():
    global _model
    with _model_lock:
        if _model is None:
            model = get_model(DEFAULT_MODEL)
            model.to(DEVICE)
            model.eval()
            _model = model
    return _model


def model_info() -> dict[str, str]:
    return {"model": DEFAULT_MODEL, "device": DEVICE}


def separate(audio: np.ndarray, sr: int) -> tuple[dict[str, np.ndarray], int]:
    """
    Separate into the four discrete sources.

    `audio` is (channels, samples) float32 at `sr`. The model runs at its own
    sample rate, so the input is resampled in and the stems come back at the
    model rate — which is what gets measured, and what the report states.
    """
    model = load_model()

    if audio.ndim == 1:
        audio = np.stack([audio, audio])
    if audio.shape[0] == 1:
        audio = np.repeat(audio, 2, axis=0)
    if audio.shape[0] > 2:
        audio = audio[:2]

    target_sr = int(model.samplerate)
    if sr != target_sr:
        import librosa

        audio = np.stack([librosa.resample(ch, orig_sr=sr, target_sr=target_sr) for ch in audio])

    tensor = torch.from_numpy(np.ascontiguousarray(audio)).float()

    # Demucs is trained on level-normalised input; restore the offset after.
    ref = tensor.mean(0)
    mean = float(ref.mean())
    std = float(ref.std()) or 1.0
    tensor = (tensor - mean) / std

    with _gpu_lock, torch.no_grad():
        sources = apply_model(
            model,
            tensor[None],
            device=DEVICE,
            shifts=1,
            split=True,
            overlap=0.25,
            progress=False,
        )[0]

    sources = sources * std + mean

    stems = {
        name: sources[index].cpu().numpy().astype(np.float32)
        for index, name in enumerate(model.sources)
    }
    return stems, target_sr
