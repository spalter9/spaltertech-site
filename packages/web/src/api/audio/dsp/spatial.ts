import type { AudioBuffer32 } from "../types";

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Mid-side widening + Haas-style depth delay for holographic staging.
 * Operates entirely in Float32 with no hard clip.
 */
export function spatialStage(
  audio: AudioBuffer32,
  opts: { width: number; depthMs: number; midGainDb: number; sideGainDb: number },
): AudioBuffer32 {
  if (audio.channels !== 2) {
    throw new Error("Spatial staging requires stereo Float32 buffers");
  }

  const { sampleRate, length, samples } = audio;
  const delaySamples = Math.max(0, Math.round((opts.depthMs / 1000) * sampleRate));
  const midGain = dbToGain(opts.midGainDb);
  const sideGain = dbToGain(opts.sideGainDb);
  const out = new Float32Array(samples.length);

  for (let i = 0; i < length; i += 1) {
    const l = samples[i * 2]!;
    const r = samples[i * 2 + 1]!;
    let mid = ((l + r) * 0.5) * midGain;
    let side = ((l - r) * 0.5) * opts.width * sideGain;

    if (delaySamples > 0 && i >= delaySamples) {
      const dl = samples[(i - delaySamples) * 2]!;
      const dr = samples[(i - delaySamples) * 2 + 1]!;
      const delayedSide = ((dl - dr) * 0.5) * 0.22;
      side += delayedSide;
    }

    out[i * 2] = mid + side;
    out[i * 2 + 1] = mid - side;
  }

  return { ...audio, samples: out };
}
