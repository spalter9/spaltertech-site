"""
Per-stem forensic measurement.

This module measures. It does not judge: every function returns a physical
quantity in a stated unit, and the scoring policy that turns those numbers into
a copyright verdict lives on the Node side, in one auditable file. Keeping the
split clean is what lets an examiner be shown "we measured X and the published
policy maps X to Y" instead of an opaque score.

Anything that cannot be measured on a given stem (a silent source, no voiced
frames, no detectable onsets) comes back as None and is dropped from the
weighted score upstream rather than defaulting to a value that would read as
evidence.
"""

from __future__ import annotations

import numpy as np

try:  # pragma: no cover - exercised only in the container
    import librosa
    from scipy.signal import find_peaks
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "measurements.py needs librosa and scipy. Install with: pip install -r requirements.txt"
    ) from exc


FFT_SIZE = 4096
HOP = 1024
SILENCE_RMS = 1e-5


# ─────────────────────────── helpers ───────────────────────────


def _mono(stem: np.ndarray) -> np.ndarray:
    """Stems arrive as (channels, samples)."""
    return stem.mean(axis=0) if stem.ndim > 1 else stem


def _rms(signal: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(signal)))) if signal.size else 0.0


def _is_silent(signal: np.ndarray) -> bool:
    return _rms(signal) < SILENCE_RMS


def _cv(values: np.ndarray) -> float | None:
    """Coefficient of variation, guarded against a zero mean."""
    values = values[np.isfinite(values)]
    if values.size < 3:
        return None
    mean = float(np.mean(values))
    if abs(mean) < 1e-12:
        return None
    return float(np.std(values) / abs(mean))


def _sustained_segments(voiced: np.ndarray, min_frames: int) -> list[tuple[int, int]]:
    """Contiguous runs of voiced frames at least `min_frames` long."""
    segments: list[tuple[int, int]] = []
    start: int | None = None
    for i, flag in enumerate(voiced):
        if flag and start is None:
            start = i
        elif not flag and start is not None:
            if i - start >= min_frames:
                segments.append((start, i))
            start = None
    if start is not None and len(voiced) - start >= min_frames:
        segments.append((start, len(voiced)))
    return segments


# ─────────────────────── shared spectral work ───────────────────────


def hf_phase(stem: np.ndarray, sr: int) -> tuple[float | None, float | None]:
    """
    Inter-channel coherence and circular phase dispersion, 16–22 kHz.

    A microphone pair (or any analogue path) decorrelates the top octave.
    Neural vocoders and diffusion decoders rebuild it from a shared latent,
    which shows as near-unity coherence with almost no phase spread.
    """
    if stem.ndim < 2 or stem.shape[0] < 2 or sr < 44100:
        return None, None

    left = librosa.stft(np.ascontiguousarray(stem[0]), n_fft=FFT_SIZE, hop_length=HOP)
    right = librosa.stft(np.ascontiguousarray(stem[1]), n_fft=FFT_SIZE, hop_length=HOP)

    freqs = librosa.fft_frequencies(sr=sr, n_fft=FFT_SIZE)
    band = (freqs >= 16000) & (freqs <= 22000)
    if not band.any():
        return None, None

    lo = left[band]
    ro = right[band]
    cross = lo * np.conj(ro)

    energy = np.sqrt(np.sum(np.abs(lo) ** 2) * np.sum(np.abs(ro) ** 2))
    if energy < 1e-18:
        return None, None
    coherence = float(np.abs(np.sum(cross)) / energy)

    magnitude = np.abs(cross)
    usable = magnitude > 1e-18
    if usable.sum() < 8:
        return min(coherence, 1.0), None
    unit = cross[usable] / magnitude[usable]
    dispersion = float(1.0 - np.abs(np.mean(unit)))

    return min(coherence, 1.0), float(np.clip(dispersion, 0.0, 1.0))


def spectral_cliff_hz(mono: np.ndarray, sr: int) -> float | None:
    """
    Highest frequency still carrying real energy.

    Referenced to the 90th percentile of the 500 Hz – 8 kHz band, not the global
    spectral peak: a single dominant partial would otherwise pull a peak-relative
    threshold up above the real noise floor and report a cliff far too low.
    """
    if _is_silent(mono):
        return None
    spectrum = np.abs(librosa.stft(mono, n_fft=FFT_SIZE, hop_length=HOP)).mean(axis=1)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=FFT_SIZE)

    reference_band = spectrum[(freqs >= 500) & (freqs <= 8000)]
    if reference_band.size == 0:
        return None
    reference = float(np.percentile(reference_band, 90))
    if reference <= 0:
        return None

    above = np.flatnonzero(spectrum >= reference * (10 ** (-40 / 20)))
    if above.size == 0:
        return None
    return float(freqs[int(above[-1])])


def onset_grid_deviation(mono: np.ndarray, sr: int) -> tuple[float | None, np.ndarray]:
    """
    Std-dev of onset deviation from the nearest 16th-note grid position, in ms.

    The grid is phase-locked to the first onset so a late count-in is not
    scored as error. A player lands a few milliseconds either side of the beat;
    a sequencer lands on it exactly.
    """
    if _is_silent(mono):
        return None, np.array([])

    envelope = librosa.onset.onset_strength(y=mono, sr=sr, hop_length=HOP)

    # Tempo is estimated from the envelope directly, before peak-picking, so
    # it can inform peak-picking rather than only interpret its output.
    tempo, _ = librosa.beat.beat_track(onset_envelope=envelope, sr=sr, hop_length=HOP)
    tempo = float(np.atleast_1d(tempo)[0])
    if not np.isfinite(tempo) or tempo <= 0:
        return None, np.array([])

    grid = (60.0 / tempo) / 4.0

    # Sustained, pitch-modulated material (vibrato, drift, legato) can ripple
    # the onset envelope within a single held note and trigger a run of
    # spurious detections around it — the default peak-picker has no notion
    # of how close together two real notes could plausibly be. `wait`
    # enforces a minimum spacing derived from the tempo estimate itself
    # (half a 16th note — faster than almost any real articulation, so a
    # genuine fast passage is not suppressed) rather than a fixed constant
    # that would either be too loose for a slow ballad or too tight for a
    # fast one.
    min_spacing_frames = max(1, int(round((grid / 2) * sr / HOP)))
    onsets = librosa.onset.onset_detect(
        onset_envelope=envelope,
        sr=sr,
        hop_length=HOP,
        units="time",
        backtrack=True,
        wait=min_spacing_frames,
    )
    if onsets.size < 8:
        return None, onsets
    relative = onsets - onsets[0]
    deviation = relative - np.round(relative / grid) * grid
    return float(np.std(deviation) * 1000.0), onsets


def onset_amplitudes(mono: np.ndarray, sr: int, onsets: np.ndarray) -> np.ndarray:
    """Peak amplitude in a 60 ms window following each onset."""
    if onsets.size == 0:
        return np.array([])
    window = int(0.06 * sr)
    peaks = []
    for time in onsets:
        start = int(time * sr)
        segment = mono[start : start + window]
        if segment.size:
            peaks.append(float(np.max(np.abs(segment))))
    return np.array(peaks)


# ─────────────────────────── vocals ───────────────────────────


def _f0_track(mono: np.ndarray, sr: int, fmin: float, fmax: float):
    f0, voiced, _ = librosa.pyin(
        mono,
        fmin=fmin,
        fmax=fmax,
        sr=sr,
        frame_length=FFT_SIZE,
        hop_length=HOP,
    )
    return f0, voiced


def vocal_features(stem: np.ndarray, sr: int) -> dict[str, float | None]:
    mono = _mono(stem)
    coherence, dispersion = hf_phase(stem, sr)

    features: dict[str, float | None] = {
        "hf_phase_dispersion": dispersion,
        "hf_phase_correlation": coherence,
        "pitch_jitter_pct": None,
        "micro_pitch_drift_cents": None,
        "shimmer_pct": None,
        "formant_stability_cv": None,
        "room_late_energy_ratio": None,
        "voiced_ratio": None,
    }

    if _is_silent(mono):
        return features

    f0, voiced = _f0_track(mono, sr, librosa.note_to_hz("C2"), librosa.note_to_hz("C7"))
    voiced = np.nan_to_num(voiced, nan=0.0).astype(bool)
    features["voiced_ratio"] = float(voiced.mean()) if voiced.size else None

    valid = np.isfinite(f0) & voiced
    if valid.sum() >= 12:
        # Jitter: cycle-to-cycle period perturbation across voiced frames.
        periods = 1.0 / f0[valid]
        deltas = np.abs(np.diff(periods))
        mean_period = float(np.mean(periods))
        if mean_period > 0 and deltas.size:
            features["pitch_jitter_pct"] = float(np.mean(deltas) / mean_period * 100.0)

        # Micro-pitch drift: detrended cents deviation inside sustained notes.
        min_frames = max(4, int(0.2 * sr / HOP))
        drifts = []
        for start, end in _sustained_segments(valid, min_frames):
            segment = f0[start:end]
            segment = segment[np.isfinite(segment)]
            if segment.size < 4:
                continue
            cents = 1200.0 * np.log2(segment / np.median(segment))
            trend = np.polyval(np.polyfit(np.arange(cents.size), cents, 1), np.arange(cents.size))
            drifts.append(float(np.std(cents - trend)))
        if drifts:
            features["micro_pitch_drift_cents"] = float(np.mean(drifts))

    # Shimmer: perturbation between successive glottal-period peak amplitudes.
    if valid.sum() >= 12:
        median_f0 = float(np.nanmedian(f0[valid]))
        if np.isfinite(median_f0) and median_f0 > 0:
            distance = max(2, int(sr / median_f0 * 0.8))
            peaks, _ = find_peaks(np.abs(mono), distance=distance)
            if peaks.size >= 12:
                amps = np.abs(mono[peaks])
                mean_amp = float(np.mean(amps))
                if mean_amp > 0:
                    features["shimmer_pct"] = float(
                        np.mean(np.abs(np.diff(amps))) / mean_amp * 100.0
                    )

    # Formant trajectories from LPC roots over voiced frames.
    features["formant_stability_cv"] = _formant_cv(mono, sr, voiced)

    # Room signature: energy still present 50–300 ms after note offsets.
    features["room_late_energy_ratio"] = _late_field_ratio(mono, sr)

    return features


def _formant_cv(mono: np.ndarray, sr: int, voiced: np.ndarray) -> float | None:
    """Coefficient of variation of the F1/F2 tracks across voiced frames."""
    order = int(2 + sr / 1000)
    frame = FFT_SIZE
    f1_track: list[float] = []
    f2_track: list[float] = []

    for index, is_voiced in enumerate(voiced):
        if not is_voiced:
            continue
        start = index * HOP
        segment = mono[start : start + frame]
        if segment.size < frame or _rms(segment) < SILENCE_RMS:
            continue
        windowed = segment * np.hamming(segment.size)
        try:
            coeffs = librosa.lpc(windowed, order=order)
        except Exception:  # noqa: BLE001 - LPC is ill-conditioned on some frames
            continue
        # A near-perfectly periodic frame (a clean synthetic tone, a test
        # sine, a heavily denoised vocal) can singularize the Levinson-Durbin
        # recursion: lpc returns without raising, but with inf/nan
        # coefficients. np.roots does not guard against that — it fails
        # eigenvalue decomposition outright — so a single pathological frame
        # would otherwise crash the whole stem's measurement rather than
        # just being skipped as "no formant found here."
        if not np.all(np.isfinite(coeffs)):
            continue
        try:
            roots = np.roots(coeffs)
        except np.linalg.LinAlgError:
            continue
        roots = roots[np.imag(roots) > 0]
        if roots.size == 0:
            continue
        freqs = np.sort(np.abs(np.arctan2(np.imag(roots), np.real(roots))) * sr / (2 * np.pi))
        formants = freqs[(freqs > 200) & (freqs < 5000)]
        if formants.size >= 2:
            f1_track.append(float(formants[0]))
            f2_track.append(float(formants[1]))

    if len(f1_track) < 8:
        return None
    cv1 = _cv(np.array(f1_track))
    cv2 = _cv(np.array(f2_track))
    values = [v for v in (cv1, cv2) if v is not None]
    return float(np.mean(values)) if values else None


def _late_field_ratio(mono: np.ndarray, sr: int) -> float | None:
    """
    Ratio of energy 50–300 ms after a note offset to the energy at the offset.

    A capture in a physical space keeps decaying after the source stops. A dry
    synthesis, or a generated vocal with no modelled room, drops to the noise
    floor immediately.
    """
    envelope = librosa.onset.onset_strength(y=mono, sr=sr, hop_length=HOP)
    if envelope.size < 16:
        return None

    rms = librosa.feature.rms(y=mono, frame_length=FFT_SIZE, hop_length=HOP)[0]
    if rms.size < 16:
        return None

    peak = float(rms.max())
    if peak <= 0:
        return None

    # Offsets: frames where level falls through 40 % of the local peak.
    threshold = peak * 0.4
    ratios = []
    late_start = max(1, int(0.05 * sr / HOP))
    late_end = max(late_start + 1, int(0.3 * sr / HOP))

    for i in range(1, rms.size - late_end):
        if rms[i] < threshold <= rms[i - 1]:
            reference = float(rms[i - 1])
            if reference <= 0:
                continue
            tail = rms[i + late_start : i + late_end]
            if tail.size:
                ratios.append(float(np.mean(tail) / reference))

    if not ratios:
        return None
    return float(np.clip(np.mean(ratios), 0.0, 1.0))


# ─────────────────────────── drums ───────────────────────────


def drum_features(stem: np.ndarray, sr: int) -> dict[str, float | None]:
    mono = _mono(stem)
    coherence, _ = hf_phase(stem, sr)

    features: dict[str, float | None] = {
        "hf_phase_correlation": coherence,
        "onset_jitter_ms": None,
        "transient_crest_db": None,
        "spectral_cliff_hz": spectral_cliff_hz(mono, sr),
        "velocity_variance_cv": None,
    }

    if _is_silent(mono):
        return features

    jitter, onsets = onset_grid_deviation(mono, sr)
    features["onset_jitter_ms"] = jitter

    amps = onset_amplitudes(mono, sr, onsets)
    features["velocity_variance_cv"] = _cv(amps) if amps.size else None

    # Crest factor measured locally around each hit, not across the whole stem —
    # a stem-wide figure would just report how sparse the part is.
    if onsets.size:
        window = int(0.05 * sr)
        crests = []
        for time in onsets:
            start = int(time * sr)
            segment = mono[start : start + window]
            if segment.size < 32:
                continue
            rms = _rms(segment)
            peak = float(np.max(np.abs(segment)))
            if rms > 0 and peak > 0:
                crests.append(20.0 * np.log10(peak / rms))
        if crests:
            features["transient_crest_db"] = float(np.mean(crests))

    return features


# ────────────────────── bass and harmonic sources ──────────────────────


def harmony_features(stem: np.ndarray, sr: int) -> dict[str, float | None]:
    mono = _mono(stem)
    coherence, _ = hf_phase(stem, sr)

    features: dict[str, float | None] = {
        "hf_phase_correlation": coherence,
        "micro_timing_std_ms": None,
        "note_duration_cv": None,
        "harmonic_drift_cents": None,
        "spectral_flatness": None,
    }

    if _is_silent(mono):
        return features

    timing, onsets = onset_grid_deviation(mono, sr)
    features["micro_timing_std_ms"] = timing

    features["spectral_flatness"] = float(
        np.mean(librosa.feature.spectral_flatness(y=mono, n_fft=FFT_SIZE, hop_length=HOP))
    )

    # Note durations: onset to the point the note has decayed 20 dB.
    if onsets.size >= 4:
        rms = librosa.feature.rms(y=mono, frame_length=FFT_SIZE, hop_length=HOP)[0]
        durations = []
        for time in onsets:
            frame = int(time * sr / HOP)
            if frame >= rms.size - 2:
                continue
            start_level = float(rms[frame])
            if start_level <= 0:
                continue
            target = start_level * (10 ** (-20 / 20))
            end = frame + 1
            while end < rms.size and rms[end] > target:
                end += 1
            durations.append((end - frame) * HOP / sr)
        if len(durations) >= 4:
            features["note_duration_cv"] = _cv(np.array(durations))

    # Intonation drift: deviation from equal temperament inside held notes.
    f0, voiced = _f0_track(mono, sr, librosa.note_to_hz("C1"), librosa.note_to_hz("C6"))
    voiced = np.nan_to_num(voiced, nan=0.0).astype(bool)
    valid = np.isfinite(f0) & voiced
    if valid.sum() >= 12:
        cents = 1200.0 * np.log2(f0[valid] / 440.0)
        deviation = cents - np.round(cents / 100.0) * 100.0
        features["harmonic_drift_cents"] = float(np.std(deviation))

    return features


FEATURE_EXTRACTORS = {
    "vocals": vocal_features,
    "drums": drum_features,
    "bass": harmony_features,
    "other": harmony_features,
}


def measure_stem(name: str, stem: np.ndarray, sr: int) -> dict[str, float | None]:
    extractor = FEATURE_EXTRACTORS.get(name, harmony_features)
    features = extractor(stem, sr)
    # JSON has no NaN; anything non-finite becomes null and is dropped upstream.
    return {
        key: (float(value) if value is not None and np.isfinite(value) else None)
        for key, value in features.items()
    }


def energy_shares(stems: dict[str, np.ndarray]) -> dict[str, float]:
    """Each stem's share of total programme power."""
    powers = {name: float(np.mean(np.square(_mono(audio)))) for name, audio in stems.items()}
    total = sum(powers.values())
    if total <= 0:
        return {name: 0.0 for name in stems}
    return {name: power / total for name, power in powers.items()}
