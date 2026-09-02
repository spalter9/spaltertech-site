import {
  applyBiquad,
  deinterleave,
  linearToDb,
  samplePeakLinear,
  truePeakLinear,
  type Biquad,
} from "./dsp";
import type { AudioBuffer32 } from "../audio/types";

/**
 * ITU-R BS.1770-4 loudness, implemented to the letter of the recommendation:
 * K-weighting, 400 ms blocks at 75 % overlap, absolute gate at −70 LKFS and a
 * relative gate 10 LU below the absolutely-gated loudness.
 *
 * The gating maths sums *mean channel power over gated blocks* — not the mean
 * of the per-block loudness values, which is the usual way this gets it wrong
 * by a few tenths of a LU on dynamic programme.
 */

export type LoudnessReport = {
  /** Integrated (gated) programme loudness, LUFS. */
  integratedLufs: number;
  /** EBU R128 loudness range, LU. */
  loudnessRangeLu: number;
  /** 4x-oversampled inter-sample peak, dBTP. */
  truePeakDbtp: number;
  /** Sample-domain peak, dBFS. */
  samplePeakDbfs: number;
  /** Highest 400 ms block loudness, LUFS. */
  maxMomentaryLufs: number;
  /** Highest 3 s window loudness, LUFS. */
  maxShortTermLufs: number;
  gatedBlockCount: number;
};

const ABSOLUTE_GATE_LKFS = -70;
const RELATIVE_GATE_LU = -10;
const LOUDNESS_OFFSET = -0.691;

/** BS.1770 channel weights for the layouts we accept (L, R, C, Ls, Rs). */
function channelWeight(index: number, channels: number): number {
  if (channels <= 2) return 1;
  // 5.x: surrounds carry +1.5 dB (≈1.41 linear power weight).
  return index >= 3 ? 1.41 : 1;
}

/**
 * The two K-weighting stages, designed at the buffer's own sample rate.
 *
 * BS.1770 tabulates its coefficients at 48 kHz only. These are the analytic
 * forms they come from, so the response is identical at 48 kHz and correct at
 * every other rate — a generic RBJ shelf is *not* equivalent here and lands
 * about a quarter of a dB off the EBU Tech 3341 reference tone.
 */
export function kWeightFilters(sampleRate: number): [Biquad, Biquad] {
  // Stage 1 — high-frequency shelving filter (the "head effect" pre-filter).
  const shelfF0 = 1681.974450955533;
  const shelfG = 3.999843853973347;
  const shelfQ = 0.7071752369554196;

  const k1 = Math.tan((Math.PI * shelfF0) / sampleRate);
  const vh = Math.pow(10, shelfG / 20);
  const vb = Math.pow(vh, 0.4996667741545416);
  const a0 = 1 + k1 / shelfQ + k1 * k1;

  const shelf: Biquad = {
    b0: (vh + (vb * k1) / shelfQ + k1 * k1) / a0,
    b1: (2 * (k1 * k1 - vh)) / a0,
    b2: (vh - (vb * k1) / shelfQ + k1 * k1) / a0,
    a1: (2 * (k1 * k1 - 1)) / a0,
    a2: (1 - k1 / shelfQ + k1 * k1) / a0,
  };

  // Stage 2 — RLB high-pass weighting curve.
  const hpF0 = 38.13547087602444;
  const hpQ = 0.5003270373238773;
  const k2 = Math.tan((Math.PI * hpF0) / sampleRate);
  const d0 = 1 + k2 / hpQ + k2 * k2;

  const rlb: Biquad = {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (k2 * k2 - 1)) / d0,
    a2: (1 - k2 / hpQ + k2 * k2) / d0,
  };

  return [shelf, rlb];
}

/** Apply the two K-weighting stages at the buffer's own sample rate. */
export function kWeight(planar: Float64Array[], sampleRate: number): Float64Array[] {
  const [shelf, rlb] = kWeightFilters(sampleRate);
  return planar.map((ch) => applyBiquad(applyBiquad(ch, shelf), rlb));
}

/** Mean square of each channel over one block, i.e. BS.1770's z_ij. */
function blockPowers(
  weighted: Float64Array[],
  start: number,
  blockSize: number,
): number[] {
  return weighted.map((ch) => {
    let sum = 0;
    for (let i = start; i < start + blockSize; i += 1) sum += ch[i]! * ch[i]!;
    return sum / blockSize;
  });
}

function loudnessOf(powers: number[], channels: number): number {
  let acc = 0;
  for (let c = 0; c < powers.length; c += 1) acc += channelWeight(c, channels) * powers[c]!;
  return LOUDNESS_OFFSET + 10 * Math.log10(Math.max(acc, 1e-24));
}

type BlockSet = { loudness: number[]; powers: number[][] };

function analyseBlocks(
  weighted: Float64Array[],
  sampleRate: number,
  windowSec: number,
  hopSec: number,
): BlockSet {
  const blockSize = Math.max(1, Math.round(windowSec * sampleRate));
  const hop = Math.max(1, Math.round(hopSec * sampleRate));
  const length = weighted[0]?.length ?? 0;
  const loudness: number[] = [];
  const powers: number[][] = [];
  for (let start = 0; start + blockSize <= length; start += hop) {
    const p = blockPowers(weighted, start, blockSize);
    powers.push(p);
    loudness.push(loudnessOf(p, weighted.length));
  }
  return { loudness, powers };
}

/** Gated integrated loudness over a prepared block set. */
function gatedIntegrated(blocks: BlockSet, channels: number): { lufs: number; kept: number } {
  const absoluteKeep: number[] = [];
  for (let i = 0; i < blocks.loudness.length; i += 1) {
    if (blocks.loudness[i]! > ABSOLUTE_GATE_LKFS) absoluteKeep.push(i);
  }
  if (absoluteKeep.length === 0) return { lufs: Number.NEGATIVE_INFINITY, kept: 0 };

  const meanPowerOver = (indices: number[]): number[] => {
    const out = Array.from({ length: channels }, () => 0);
    for (const i of indices) {
      const p = blocks.powers[i]!;
      for (let c = 0; c < channels; c += 1) out[c] = out[c]! + p[c]!;
    }
    return out.map((v) => v / indices.length);
  };

  const relativeThreshold = loudnessOf(meanPowerOver(absoluteKeep), channels) + RELATIVE_GATE_LU;
  const finalKeep = absoluteKeep.filter((i) => blocks.loudness[i]! > relativeThreshold);
  if (finalKeep.length === 0) return { lufs: Number.NEGATIVE_INFINITY, kept: 0 };

  return { lufs: loudnessOf(meanPowerOver(finalKeep), channels), kept: finalKeep.length };
}

/**
 * EBU R128 loudness range: short-term blocks, absolutely gated at −70 LUFS and
 * relatively gated 20 LU below their mean, then the 10th–95th percentile span.
 */
function loudnessRange(shortTerm: number[]): number {
  const above = shortTerm.filter((l) => l > ABSOLUTE_GATE_LKFS).sort((a, b) => a - b);
  if (above.length < 2) return 0;
  const powerMean =
    10 *
    Math.log10(
      above.reduce((acc, l) => acc + Math.pow(10, l / 10), 0) / above.length,
    );
  const gated = above.filter((l) => l > powerMean - 20);
  if (gated.length < 2) return 0;
  const pick = (p: number): number => {
    const idx = Math.min(gated.length - 1, Math.max(0, Math.round(p * (gated.length - 1))));
    return gated[idx]!;
  };
  return pick(0.95) - pick(0.1);
}

export function measureLoudness(audio: AudioBuffer32): LoudnessReport {
  const planar = deinterleave(audio.samples, audio.channels);
  if (planar.length === 0 || (planar[0]?.length ?? 0) === 0) {
    return {
      integratedLufs: Number.NEGATIVE_INFINITY,
      loudnessRangeLu: 0,
      truePeakDbtp: Number.NEGATIVE_INFINITY,
      samplePeakDbfs: Number.NEGATIVE_INFINITY,
      maxMomentaryLufs: Number.NEGATIVE_INFINITY,
      maxShortTermLufs: Number.NEGATIVE_INFINITY,
      gatedBlockCount: 0,
    };
  }

  const weighted = kWeight(planar, audio.sampleRate);
  const momentary = analyseBlocks(weighted, audio.sampleRate, 0.4, 0.1);
  const shortTerm = analyseBlocks(weighted, audio.sampleRate, 3, 1);
  const { lufs, kept } = gatedIntegrated(momentary, planar.length);

  return {
    integratedLufs: lufs,
    loudnessRangeLu: loudnessRange(shortTerm.loudness),
    truePeakDbtp: linearToDb(truePeakLinear(planar)),
    samplePeakDbfs: linearToDb(samplePeakLinear(planar)),
    maxMomentaryLufs: momentary.loudness.length ? Math.max(...momentary.loudness) : Number.NEGATIVE_INFINITY,
    maxShortTermLufs: shortTerm.loudness.length ? Math.max(...shortTerm.loudness) : Number.NEGATIVE_INFINITY,
    gatedBlockCount: kept,
  };
}

/** Integrated loudness only — used inside the normalisation loop. */
export function integratedLufsOf(audio: AudioBuffer32): number {
  const planar = deinterleave(audio.samples, audio.channels);
  if (planar.length === 0) return Number.NEGATIVE_INFINITY;
  const weighted = kWeight(planar, audio.sampleRate);
  const blocks = analyseBlocks(weighted, audio.sampleRate, 0.4, 0.1);
  return gatedIntegrated(blocks, planar.length).lufs;
}
