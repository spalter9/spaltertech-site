/**
 * Linear-phase EQ via zero-phase FIR (forward-backward IIR peaking approximation).
 * Forward + reverse filtering cancels phase distortion while applying tonal gain.
 */

function peakingCoeffs(freq: number, gainDb: number, q: number, sampleRate: number) {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = 1 + alpha * A;
  const b1 = -2 * cos;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cos;
  const a2 = 1 - alpha / A;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function filterForward(
  input: Float32Array,
  c: { b0: number; b1: number; b2: number; a1: number; a2: number },
): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const x0 = input[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function reverse(buf: Float32Array): Float32Array {
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i += 1) out[i] = buf[buf.length - 1 - i]!;
  return out;
}

/** Apply linear-phase peaking bands (filtfilt-style) to a mono Float32 channel. */
export function linearPhaseEq(
  mono: Float32Array,
  sampleRate: number,
  bands: { freq: number; gainDb: number; q: number }[],
): Float32Array {
  let signal = mono;
  for (const band of bands) {
    if (Math.abs(band.gainDb) < 0.01) continue;
    const c = peakingCoeffs(band.freq, band.gainDb, band.q, sampleRate);
    const forward = filterForward(signal, c);
    const backward = filterForward(reverse(forward), c);
    signal = reverse(backward);
  }
  return signal;
}
