/** Soft-knee Float32 compressor / expander for a mono channel. */
export function shapeDynamics(
  channel: Float32Array,
  sampleRate: number,
  thresholdDb: number,
  ratio: number,
  attackMs: number,
  releaseMs: number,
): Float32Array {
  const out = new Float32Array(channel.length);
  const attack = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const release = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  let envelope = 0;

  for (let i = 0; i < channel.length; i += 1) {
    const x = channel[i]!;
    const abs = Math.abs(x);
    envelope = abs > envelope ? attack * envelope + (1 - attack) * abs : release * envelope + (1 - release) * abs;
    const envDb = 20 * Math.log10(Math.max(envelope, 1e-9));
    let gainDb = 0;
    if (envDb > thresholdDb) {
      gainDb = (thresholdDb - envDb) * (1 - 1 / ratio);
    }
    const gain = Math.pow(10, gainDb / 20);
    out[i] = x * gain;
  }
  return out;
}

/** Linkwitz-Riley style 2nd-order low/high split for three-band processing. */
function biquadLowpass(freq: number, sampleRate: number) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.SQRT2);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function biquadHighpass(freq: number, sampleRate: number) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.SQRT2);
  const b0 = (1 + cos) / 2;
  const b1 = -(1 + cos);
  const b2 = (1 + cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function applyBiquad(
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

export function multiBandShape(
  mono: Float32Array,
  sampleRate: number,
  opts: {
    lowThreshold: number;
    midThreshold: number;
    highThreshold: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
  },
): Float32Array {
  const lp = biquadLowpass(250, sampleRate);
  const hp = biquadHighpass(2500, sampleRate);
  const low = applyBiquad(mono, lp);
  const high = applyBiquad(mono, hp);
  const mid = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i += 1) {
    mid[i] = mono[i]! - low[i]! - high[i]!;
  }

  const lowOut = shapeDynamics(low, sampleRate, opts.lowThreshold, opts.ratio, opts.attackMs, opts.releaseMs);
  const midOut = shapeDynamics(mid, sampleRate, opts.midThreshold, opts.ratio * 0.9, opts.attackMs, opts.releaseMs);
  const highOut = shapeDynamics(
    high,
    sampleRate,
    opts.highThreshold,
    opts.ratio * 1.1,
    opts.attackMs * 0.7,
    opts.releaseMs * 0.8,
  );

  const out = new Float32Array(mono.length);
  for (let i = 0; i < mono.length; i += 1) {
    out[i] = lowOut[i]! + midOut[i]! + highOut[i]!;
  }
  return out;
}
