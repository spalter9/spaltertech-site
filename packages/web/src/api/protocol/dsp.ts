/**
 * Signal primitives shared by the loudness meter and the container forensics.
 * Plain Float64 maths, no native bindings — this runs anywhere Node runs.
 */

export type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** Direct-form-I biquad over a channel, returning a new buffer. */
export function applyBiquad(input: Float32Array | Float64Array, c: Biquad): Float64Array {
  const out = new Float64Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const x0 = input[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** RBJ high-shelf, normalised so a0 = 1. */
export function highShelf(sampleRate: number, freq: number, q: number, gainDb: number): Biquad {
  const a = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * q);
  const sq = 2 * Math.sqrt(a) * alpha;
  const b0 = a * (a + 1 + (a - 1) * cw + sq);
  const b1 = -2 * a * (a - 1 + (a + 1) * cw);
  const b2 = a * (a + 1 + (a - 1) * cw - sq);
  const a0 = a + 1 - (a - 1) * cw + sq;
  const a1 = 2 * (a - 1 - (a + 1) * cw);
  const a2 = a + 1 - (a - 1) * cw - sq;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** RBJ high-pass, normalised so a0 = 1. */
export function highPass(sampleRate: number, freq: number, q: number): Biquad {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * q);
  const b0 = (1 + cw) / 2;
  const b1 = -(1 + cw);
  const b2 = (1 + cw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cw;
  const a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** RBJ low-pass, normalised so a0 = 1. */
export function lowPass(sampleRate: number, freq: number, q: number): Biquad {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cw = Math.cos(w0);
  const sw = Math.sin(w0);
  const alpha = sw / (2 * q);
  const b0 = (1 - cw) / 2;
  const b1 = 1 - cw;
  const b2 = (1 - cw) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cw;
  const a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Re-interleave planar channels back into a single PCM buffer. */
export function interleave(planar: Float64Array[]): Float32Array {
  const channels = planar.length;
  const frames = planar[0]?.length ?? 0;
  const out = new Float32Array(frames * channels);
  for (let c = 0; c < channels; c += 1) {
    const ch = planar[c]!;
    for (let i = 0; i < frames; i += 1) out[i * channels + c] = ch[i]!;
  }
  return out;
}

/** Split interleaved PCM into per-channel planar buffers. */
export function deinterleave(samples: Float32Array, channels: number): Float64Array[] {
  const frames = Math.floor(samples.length / channels);
  const out: Float64Array[] = [];
  for (let c = 0; c < channels; c += 1) {
    const ch = new Float64Array(frames);
    for (let i = 0; i < frames; i += 1) ch[i] = samples[i * channels + c]!;
    out.push(ch);
  }
  return out;
}

export function toMono(planar: Float64Array[]): Float64Array {
  const first = planar[0];
  if (!first) return new Float64Array(0);
  if (planar.length === 1) return first;
  const out = new Float64Array(first.length);
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    for (const ch of planar) sum += ch[i]!;
    out[i] = sum / planar.length;
  }
  return out;
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 * `re`/`im` must be the same power-of-two length.
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const uRe = re[i + k]!;
        const uIm = im[i + k]!;
        const vRe = re[i + k + len / 2]! * curRe - im[i + k + len / 2]! * curIm;
        const vIm = re[i + k + len / 2]! * curIm + im[i + k + len / 2]! * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export function hann(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i += 1) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  return w;
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * 4x polyphase sinc interpolation for inter-sample (true) peak detection.
 * 48 taps split across 4 phases, per the BS.1770-4 annex guidance.
 */
const TAPS_PER_PHASE = 12;
const OVERSAMPLE = 4;

function buildPolyphase(): Float64Array[] {
  const phases: Float64Array[] = [];
  for (let p = 0; p < OVERSAMPLE; p += 1) {
    const taps = new Float64Array(TAPS_PER_PHASE);
    const frac = p / OVERSAMPLE;
    let sum = 0;
    for (let t = 0; t < TAPS_PER_PHASE; t += 1) {
      const x = t - TAPS_PER_PHASE / 2 + 1 - frac;
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      // Blackman window over the tap span keeps the stopband down.
      const wpos = (t + 0.5) / TAPS_PER_PHASE;
      const win =
        0.42 - 0.5 * Math.cos(2 * Math.PI * wpos) + 0.08 * Math.cos(4 * Math.PI * wpos);
      taps[t] = sinc * win;
      sum += taps[t]!;
    }
    // Unity DC gain per phase so a constant signal reconstructs exactly.
    for (let t = 0; t < TAPS_PER_PHASE; t += 1) taps[t] = taps[t]! / sum;
    phases.push(taps);
  }
  return phases;
}

const POLYPHASE = buildPolyphase();

/**
 * Largest L1 tap sum across the phases.
 *
 * An interpolated sample is a weighted sum of the window, so its magnitude can
 * never exceed this times the largest magnitude in that window. That gives an
 * exact skip test below — not a heuristic — which matters because most of a
 * track is nowhere near its own peak.
 */
const POLYPHASE_L1 = Math.max(
  ...POLYPHASE.map((taps) => taps.reduce((acc, t) => acc + Math.abs(t), 0)),
);

const HALF_TAPS = TAPS_PER_PHASE / 2;

/**
 * Peak of the 4x-oversampled waveform, in linear amplitude.
 *
 * Two passes: take the sample-domain peak first, then interpolate only around
 * samples whose neighbourhood could possibly beat it. The bound is exact, so
 * the answer is identical to interpolating everywhere — it just skips the
 * ninety-odd percent of a typical programme that cannot contend.
 */
export function truePeakLinear(planar: Float64Array[]): number {
  let peak = samplePeakLinear(planar);
  if (peak === 0) return 0;

  const BLOCK = 64;

  for (const ch of planar) {
    const n = ch.length;

    // One O(n) prepass of block maxima turns the per-sample rejection test
    // into two array reads instead of a twelve-sample rescan.
    const blockCount = Math.ceil(n / BLOCK);
    const blockMax = new Float64Array(blockCount);
    for (let b = 0; b < blockCount; b += 1) {
      const end = Math.min(n, (b + 1) * BLOCK);
      let m = 0;
      for (let k = b * BLOCK; k < end; k += 1) {
        const a = ch[k]! < 0 ? -ch[k]! : ch[k]!;
        if (a > m) m = a;
      }
      blockMax[b] = m;
    }

    for (let i = 0; i < n; i += 1) {
      const lo = i - HALF_TAPS + 1;
      const hi = lo + TAPS_PER_PHASE;

      // The window spans at most two blocks; their maximum bounds it.
      const firstBlock = Math.max(0, lo >> 6);
      const lastBlock = Math.min(blockCount - 1, (hi - 1) >> 6);
      let windowBound = blockMax[firstBlock]!;
      for (let b = firstBlock + 1; b <= lastBlock; b += 1) {
        if (blockMax[b]! > windowBound) windowBound = blockMax[b]!;
      }
      if (windowBound * POLYPHASE_L1 <= peak) continue;

      const edge = lo < 0 || hi > n;
      for (let p = 1; p < OVERSAMPLE; p += 1) {
        const taps = POLYPHASE[p]!;
        let acc = 0;
        if (edge) {
          for (let t = 0; t < TAPS_PER_PHASE; t += 1) {
            const idx = lo + t;
            if (idx < 0 || idx >= n) continue;
            acc += ch[idx]! * taps[t]!;
          }
        } else {
          for (let t = 0; t < TAPS_PER_PHASE; t += 1) acc += ch[lo + t]! * taps[t]!;
        }
        const a = acc < 0 ? -acc : acc;
        if (a > peak) peak = a;
      }
    }
  }
  return peak;
}

export function linearToDb(linear: number): number {
  return 20 * Math.log10(Math.max(linear, 1e-12));
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/** Sample-domain peak, in linear amplitude. */
export function samplePeakLinear(planar: Float64Array[]): number {
  let peak = 0;
  for (const ch of planar) {
    for (let i = 0; i < ch.length; i += 1) {
      const a = Math.abs(ch[i]!);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

export function mean(values: ArrayLike<number>): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) sum += values[i]!;
  return sum / values.length;
}

export function stdDev(values: ArrayLike<number>): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (let i = 0; i < values.length; i += 1) {
    const d = values[i]! - m;
    acc += d * d;
  }
  return Math.sqrt(acc / (values.length - 1));
}

/**
 * Piecewise-linear ramp used by every forensic sub-score.
 * Below `low` → 0, above `high` → 1, linear in between (works inverted too).
 */
export function ramp(value: number, low: number, high: number): number {
  if (low === high) return value >= high ? 1 : 0;
  const t = (value - low) / (high - low);
  return Math.min(1, Math.max(0, t));
}

/** A score that peaks inside a plausible human band and falls off outside it. */
export function band(value: number, lowEdge: number, lowIn: number, highIn: number, highEdge: number): number {
  if (value <= lowEdge || value >= highEdge) return 0;
  if (value >= lowIn && value <= highIn) return 1;
  if (value < lowIn) return ramp(value, lowEdge, lowIn);
  return 1 - ramp(value, highIn, highEdge);
}
