import { deinterleave, fft, hann, linearToDb, mean, stdDev, toMono } from "./dsp";
import { measureLoudness } from "./loudness";
import type { AudioBuffer32 } from "../audio/types";
import type { ContainerReport } from "./types";

/**
 * Whole-container preflight forensics.
 *
 * This runs in-process on the mixed programme before separation, and is *not*
 * examiner-grade on its own — a mixed container hides per-source evidence. It
 * exists to fix custody measurements at intake, to give the operator an
 * immediate reading while the demixer works, and to stand as the only available
 * signal when the demixer is offline (clearly labelled as such).
 */

const FFT_SIZE = 4096;
const HOP = 1024;

type Spectra = {
  /** Per-frame magnitude, one Float64Array of FFT_SIZE/2 bins per frame. */
  magnitude: Float64Array[];
  /** Per-frame complex spectrum of each channel, kept for phase work. */
  leftRe: Float64Array[];
  leftIm: Float64Array[];
  rightRe: Float64Array[];
  rightIm: Float64Array[];
  frameCount: number;
  binHz: number;
};

function analyse(planar: Float64Array[], sampleRate: number): Spectra {
  const window = hann(FFT_SIZE);
  const left = planar[0] ?? new Float64Array(0);
  const right = planar[1] ?? left;
  const frames = Math.max(0, Math.floor((left.length - FFT_SIZE) / HOP) + 1);
  const bins = FFT_SIZE / 2;

  const magnitude: Float64Array[] = [];
  const leftRe: Float64Array[] = [];
  const leftIm: Float64Array[] = [];
  const rightRe: Float64Array[] = [];
  const rightIm: Float64Array[] = [];

  for (let f = 0; f < frames; f += 1) {
    const start = f * HOP;
    const lr = new Float64Array(FFT_SIZE);
    const li = new Float64Array(FFT_SIZE);
    const rr = new Float64Array(FFT_SIZE);
    const ri = new Float64Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i += 1) {
      lr[i] = left[start + i]! * window[i]!;
      rr[i] = right[start + i]! * window[i]!;
    }
    fft(lr, li);
    fft(rr, ri);

    const mag = new Float64Array(bins);
    for (let b = 0; b < bins; b += 1) {
      const ml = Math.hypot(lr[b]!, li[b]!);
      const mr = Math.hypot(rr[b]!, ri[b]!);
      mag[b] = (ml + mr) * 0.5;
    }
    magnitude.push(mag);
    leftRe.push(lr.slice(0, bins));
    leftIm.push(li.slice(0, bins));
    rightRe.push(rr.slice(0, bins));
    rightIm.push(ri.slice(0, bins));
  }

  return {
    magnitude,
    leftRe,
    leftIm,
    rightRe,
    rightIm,
    frameCount: frames,
    binHz: sampleRate / FFT_SIZE,
  };
}

/**
 * Inter-channel coherence and phase dispersion in the top octave (16–22 kHz).
 *
 * Air recorded through two microphones (or through any analogue stage) carries
 * a scattered, decorrelated phase relationship up there. Neural vocoders and
 * diffusion decoders reconstruct the top octave from a shared latent, which
 * shows up as near-unity coherence with almost no phase dispersion.
 */
function hfPhase(s: Spectra): { correlation: number; dispersion: number } {
  const lowBin = Math.floor(16000 / s.binHz);
  const highBin = Math.min(s.magnitude[0]?.length ?? 0, Math.ceil(22000 / s.binHz));
  if (s.frameCount === 0 || lowBin >= highBin) return { correlation: 0, dispersion: 0 };

  let crossRe = 0;
  let crossIm = 0;
  let energyL = 0;
  let energyR = 0;
  let phasorRe = 0;
  let phasorIm = 0;
  let counted = 0;

  for (let f = 0; f < s.frameCount; f += 1) {
    const lr = s.leftRe[f]!;
    const li = s.leftIm[f]!;
    const rr = s.rightRe[f]!;
    const ri = s.rightIm[f]!;
    for (let b = lowBin; b < highBin; b += 1) {
      // L · conj(R)
      const cr = lr[b]! * rr[b]! + li[b]! * ri[b]!;
      const ci = li[b]! * rr[b]! - lr[b]! * ri[b]!;
      crossRe += cr;
      crossIm += ci;
      energyL += lr[b]! * lr[b]! + li[b]! * li[b]!;
      energyR += rr[b]! * rr[b]! + ri[b]! * ri[b]!;
      const mag = Math.hypot(cr, ci);
      if (mag > 1e-18) {
        phasorRe += cr / mag;
        phasorIm += ci / mag;
        counted += 1;
      }
    }
  }

  const denom = Math.sqrt(energyL * energyR);
  const correlation = denom > 1e-18 ? Math.hypot(crossRe, crossIm) / denom : 0;
  // Circular variance: 1 − resultant length of the unit phasors.
  const dispersion = counted > 0 ? 1 - Math.hypot(phasorRe, phasorIm) / counted : 0;
  return { correlation: Math.min(1, correlation), dispersion: Math.min(1, Math.max(0, dispersion)) };
}

/**
 * Highest frequency still carrying real energy.
 *
 * Lossy codecs and most generative decoders leave a hard shelf where the
 * band-limit sits; a true acoustic capture rolls off gradually instead.
 *
 * The reference level is the 90th percentile of the 500 Hz – 8 kHz band rather
 * than the global spectral peak, because a single dominant partial (a bass
 * note, a held tone) would otherwise drag a 60 dB threshold far above the real
 * noise floor and report a cliff hundreds of Hz up.
 */
function spectralCliff(s: Spectra, sampleRate: number): number {
  const bins = s.magnitude[0]?.length ?? 0;
  if (bins === 0) return 0;
  const avg = new Float64Array(bins);
  for (const frame of s.magnitude) {
    for (let b = 0; b < bins; b += 1) avg[b] = avg[b]! + frame[b]!;
  }
  for (let b = 0; b < bins; b += 1) avg[b] = avg[b]! / Math.max(1, s.frameCount);

  const lowRef = Math.max(1, Math.floor(500 / s.binHz));
  const highRef = Math.min(bins, Math.ceil(8000 / s.binHz));
  if (lowRef >= highRef) return 0;

  const refBand = Array.from(avg.slice(lowRef, highRef)).sort((a, b) => a - b);
  const reference = refBand[Math.floor(refBand.length * 0.9)] ?? 0;
  if (reference <= 0) return 0;

  const floorDb = linearToDb(reference) - 40;
  for (let b = bins - 1; b >= 0; b -= 1) {
    if (linearToDb(avg[b]!) >= floorDb) return Math.min((b + 1) * s.binHz, sampleRate / 2);
  }
  return 0;
}

type Onsets = { times: number[]; tempoBpm: number; jitterMs: number };

/**
 * Spectral-flux onset detection, tempo estimate, and deviation from the grid.
 *
 * Humans playing to a click land a few milliseconds either side of the beat and
 * stay there; the spread is the performance. Programmed and generated material
 * either snaps to the grid (near-zero spread) or drifts without a stable grid
 * at all. The measurement is the spread, in milliseconds — not a judgement.
 */
function onsetTiming(s: Spectra, sampleRate: number): Onsets {
  const bins = s.magnitude[0]?.length ?? 0;
  if (s.frameCount < 8 || bins === 0) return { times: [], tempoBpm: 0, jitterMs: 0 };

  const flux = new Float64Array(s.frameCount);
  for (let f = 1; f < s.frameCount; f += 1) {
    const cur = s.magnitude[f]!;
    const prev = s.magnitude[f - 1]!;
    let sum = 0;
    for (let b = 0; b < bins; b += 1) {
      const d = cur[b]! - prev[b]!;
      if (d > 0) sum += d;
    }
    flux[f] = sum;
  }

  // Adaptive threshold: local mean over ±8 frames plus a fraction of the spread.
  const frameSec = HOP / sampleRate;
  const times: number[] = [];
  const win = 8;
  const fluxStd = stdDev(flux);
  for (let f = 1; f < s.frameCount - 1; f += 1) {
    const lo = Math.max(0, f - win);
    const hi = Math.min(s.frameCount, f + win + 1);
    let local = 0;
    for (let i = lo; i < hi; i += 1) local += flux[i]!;
    local /= hi - lo;
    const threshold = local + 0.35 * fluxStd;
    if (flux[f]! > threshold && flux[f]! >= flux[f - 1]! && flux[f]! > flux[f + 1]!) {
      times.push(f * frameSec);
    }
  }
  if (times.length < 8) return { times, tempoBpm: 0, jitterMs: 0 };

  // Tempo from the autocorrelation of the flux envelope, 60–200 BPM.
  let bestLagFrames = 0;
  let bestScore = -Infinity;
  const minLag = Math.max(1, Math.round(60 / 200 / frameSec));
  const maxLag = Math.min(s.frameCount - 1, Math.round(60 / 60 / frameSec));
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let acc = 0;
    for (let f = lag; f < s.frameCount; f += 1) acc += flux[f]! * flux[f - lag]!;
    const score = acc / (s.frameCount - lag);
    if (score > bestScore) {
      bestScore = score;
      bestLagFrames = lag;
    }
  }
  const beatSec = bestLagFrames * frameSec;
  if (beatSec <= 0) return { times, tempoBpm: 0, jitterMs: 0 };

  // Deviation from the nearest 16th-note grid position, phase-aligned to the
  // first onset so a late start is not counted as error.
  const grid = beatSec / 4;
  const origin = times[0]!;
  const deviations: number[] = [];
  for (const t of times) {
    const rel = t - origin;
    const offset = rel - Math.round(rel / grid) * grid;
    deviations.push(offset * 1000);
  }

  return {
    times,
    tempoBpm: 60 / beatSec,
    jitterMs: stdDev(deviations),
  };
}

export function analyseContainer(audio: AudioBuffer32): ContainerReport {
  const planar = deinterleave(audio.samples, audio.channels);
  const loudness = measureLoudness(audio);
  const spectra = analyse(planar, audio.sampleRate);
  const { correlation, dispersion } = hfPhase(spectra);
  const timing = onsetTiming(spectra, audio.sampleRate);

  const monoBuf = toMono(planar);
  let clipped = 0;
  for (const ch of planar) {
    for (let i = 0; i < ch.length; i += 1) {
      if (Math.abs(ch[i]!) >= 0.999) clipped += 1;
    }
  }

  return {
    integrated_lufs: round(loudness.integratedLufs, 2),
    loudness_range_lu: round(loudness.loudnessRangeLu, 2),
    true_peak_dbtp: round(loudness.truePeakDbtp, 2),
    sample_peak_dbfs: round(loudness.samplePeakDbfs, 2),
    hf_phase_correlation: round(correlation, 4),
    hf_phase_dispersion: round(dispersion, 4),
    spectral_cliff_hz: Math.round(spectralCliff(spectra, audio.sampleRate)),
    micro_timing_jitter_ms: round(timing.jitterMs, 3),
    estimated_tempo_bpm: round(timing.tempoBpm, 2),
    onset_count: timing.times.length,
    dc_offset: round(mean(monoBuf), 6),
    clipped_samples: clipped,
  };
}

function round(value: number, places: number): number {
  if (!Number.isFinite(value)) return value;
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}
