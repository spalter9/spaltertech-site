import {
  applyBiquad,
  dbToLinear,
  deinterleave,
  highPass,
  interleave,
  linearToDb,
  lowPass,
  truePeakLinear,
} from "./dsp";
import { integratedLufsOf, measureLoudness } from "./loudness";
import { MASTER_TARGETS } from "./types";
import type { AudioBuffer32 } from "../audio/types";

/**
 * The four valves.
 *
 * One source render fans out into four tiers that are deliberately *different
 * files* rather than four labels on the same audio: an untouched vault copy, a
 * delivery master hit to streaming targets, an instrumental for sync, and a
 * levelled reference for machine ingestion. Each is measured after rendering,
 * so the numbers in the manifest describe the bytes that actually shipped.
 */

function clone(audio: AudioBuffer32): AudioBuffer32 {
  return { ...audio, samples: new Float32Array(audio.samples) };
}

function fromPlanar(source: AudioBuffer32, planar: Float64Array[]): AudioBuffer32 {
  return {
    ...source,
    channels: planar.length,
    samples: interleave(planar),
    length: planar[0]?.length ?? 0,
  };
}

function applyGain(audio: AudioBuffer32, gain: number): AudioBuffer32 {
  const out = new Float32Array(audio.samples.length);
  for (let i = 0; i < out.length; i += 1) out[i] = audio.samples[i]! * gain;
  return { ...audio, samples: out };
}

/**
 * Look-ahead true-peak limiter.
 *
 * Gain reduction is computed against the 4x-oversampled peak so inter-sample
 * overs are caught, then smoothed over a 1.5 ms attack window and released
 * over 60 ms. The look-ahead delay means the gain is already down when the
 * transient arrives, which is what keeps the ceiling honest without audible
 * pumping on the attack.
 */
export function truePeakLimit(audio: AudioBuffer32, ceilingDb: number): AudioBuffer32 {
  const ceiling = dbToLinear(ceilingDb);
  const planar = deinterleave(audio.samples, audio.channels);
  const frames = planar[0]?.length ?? 0;
  if (frames === 0) return audio;

  const lookahead = Math.max(1, Math.round(0.0015 * audio.sampleRate));
  const releaseCoeff = Math.exp(-1 / (0.06 * audio.sampleRate));

  // Per-frame required gain, taken from the loudest oversampled peak nearby.
  const required = new Float64Array(frames);
  required.fill(1);
  for (let i = 0; i < frames; i += 1) {
    let peak = 0;
    for (const ch of planar) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
    }
    // 1.26x headroom allowance approximates the worst-case inter-sample rise
    // between two neighbouring samples; the exact figure is verified below.
    const estimate = peak * 1.26;
    required[i] = estimate > ceiling ? ceiling / estimate : 1;
  }

  // Roll the minimum backwards over the look-ahead window, then release.
  const gain = new Float64Array(frames);
  let current = 1;
  for (let i = 0; i < frames; i += 1) {
    let target = 1;
    const end = Math.min(frames, i + lookahead);
    for (let j = i; j < end; j += 1) target = Math.min(target, required[j]!);
    current = target < current ? target : current + (target - current) * (1 - releaseCoeff);
    gain[i] = current;
  }

  const limited = planar.map((ch) => {
    const out = new Float64Array(frames);
    for (let i = 0; i < frames; i += 1) out[i] = ch[i]! * gain[i]!;
    return out;
  });

  // Verify against the real oversampled peak and trim once if we still clear it.
  const achieved = truePeakLinear(limited);
  if (achieved > ceiling) {
    const trim = ceiling / achieved;
    for (const ch of limited) {
      for (let i = 0; i < frames; i += 1) ch[i] = ch[i]! * trim;
    }
  }

  return fromPlanar(audio, limited);
}

/**
 * Normalise to a target integrated loudness, then hold the true-peak ceiling.
 *
 * Limiting changes loudness, so the pass repeats until the measurement settles
 * inside 0.1 LU or the iteration budget runs out — the manifest then reports
 * whatever was actually achieved, never the target.
 */
export function normaliseToTarget(
  audio: AudioBuffer32,
  targetLufs: number,
  ceilingDb: number,
): AudioBuffer32 {
  let working = clone(audio);
  for (let pass = 0; pass < 4; pass += 1) {
    const measured = integratedLufsOf(working);
    if (!Number.isFinite(measured)) return working;
    const delta = targetLufs - measured;
    if (Math.abs(delta) < 0.1 && pass > 0) break;
    working = truePeakLimit(applyGain(working, dbToLinear(delta)), ceilingDb);
  }
  return working;
}

/**
 * Band-limited centre cancellation for the sync/TV valve.
 *
 * Naive L−R cancellation takes the kick and bass with the vocal and collapses
 * to silence in mono. Cancelling only between 200 Hz and 8 kHz keeps the low
 * end and the air band from the original mix, which is what makes the result
 * usable under dialogue rather than a karaoke artefact.
 */
export function centreCancel(audio: AudioBuffer32): AudioBuffer32 {
  const planar = deinterleave(audio.samples, audio.channels);
  const left = planar[0];
  const right = planar[1] ?? planar[0];
  if (!left || !right) return clone(audio);

  const frames = left.length;
  const mid = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) mid[i] = (left[i]! + right[i]!) * 0.5;

  // Isolate the 200 Hz – 8 kHz portion of the centre content to subtract.
  const hp = highPass(audio.sampleRate, 200, 0.707);
  const lp = lowPass(audio.sampleRate, 8000, 0.707);
  const centreBand = applyBiquad(applyBiquad(mid, hp), lp);

  const outL = new Float64Array(frames);
  const outR = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) {
    outL[i] = left[i]! - centreBand[i]!;
    outR[i] = right[i]! - centreBand[i]!;
  }

  return fromPlanar(audio, [outL, outR]);
}

export type ValveRender = {
  audio: AudioBuffer32;
  treatment: string;
};

/** ORIGINAL — the vault copy. Bit-exact, no processing of any kind. */
export function renderOriginal(source: AudioBuffer32): ValveRender {
  return {
    audio: clone(source),
    treatment: "unaltered production master, 32-bit float, source sample rate preserved",
  };
}

/** MASTER — streaming delivery at −14 LUFS integrated, −1.0 dBTP ceiling. */
export function renderMaster(source: AudioBuffer32): ValveRender {
  return {
    audio: normaliseToTarget(source, MASTER_TARGETS.integratedLufs, MASTER_TARGETS.truePeakDbfs),
    treatment: `loudness-normalised to ${MASTER_TARGETS.integratedLufs} LUFS integrated, true-peak limited to ${MASTER_TARGETS.truePeakDbfs} dBTP`,
  };
}

/** MV3 — instrumental / TV mix, levelled to sit where the master sits. */
export function renderMv3(source: AudioBuffer32): ValveRender {
  const instrumental = centreCancel(source);
  return {
    audio: normaliseToTarget(
      instrumental,
      MASTER_TARGETS.integratedLufs,
      MASTER_TARGETS.truePeakDbfs,
    ),
    treatment:
      "band-limited centre cancellation (200 Hz – 8 kHz), low and air bands preserved, levelled to master",
  };
}

/** MODEL — levelled reference for machine ingestion, rights denied in-band. */
export function renderModel(source: AudioBuffer32): ValveRender {
  return {
    audio: normaliseToTarget(source, -16, -1),
    treatment:
      "levelled to −16 LUFS / −1.0 dBTP for corpus consistency; ingestion rights denied in the embedded manifest",
  };
}

export type ValveMeasurement = {
  integratedLufs: number;
  truePeakDbtp: number;
  maxMomentaryLufs: number;
  maxShortTermLufs: number;
  durationSec: number;
};

export function measureValve(audio: AudioBuffer32): ValveMeasurement {
  const report = measureLoudness(audio);
  return {
    integratedLufs: Number.isFinite(report.integratedLufs) ? round(report.integratedLufs, 2) : -70,
    truePeakDbtp: Number.isFinite(report.truePeakDbtp) ? round(report.truePeakDbtp, 2) : -144,
    maxMomentaryLufs: Number.isFinite(report.maxMomentaryLufs)
      ? round(report.maxMomentaryLufs, 2)
      : -70,
    maxShortTermLufs: Number.isFinite(report.maxShortTermLufs)
      ? round(report.maxShortTermLufs, 2)
      : -70,
    durationSec: round(audio.length / audio.sampleRate, 3),
  };
}

function round(value: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}

export { linearToDb };
