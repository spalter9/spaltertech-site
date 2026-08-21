import type { AudioBuffer32, DspProfile } from "../types";
import { multiBandShape } from "./dynamics";
import { linearPhaseEq } from "./eq";
import { spatialStage } from "./spatial";

function splitStereo(audio: AudioBuffer32): { left: Float32Array; right: Float32Array } {
  const left = new Float32Array(audio.length);
  const right = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i += 1) {
    left[i] = audio.samples[i * 2]!;
    right[i] = audio.samples[i * 2 + 1]!;
  }
  return { left, right };
}

function joinStereo(left: Float32Array, right: Float32Array, meta: AudioBuffer32): AudioBuffer32 {
  const samples = new Float32Array(left.length * 2);
  for (let i = 0; i < left.length; i += 1) {
    samples[i * 2] = left[i]!;
    samples[i * 2 + 1] = right[i]!;
  }
  return { ...meta, samples, length: left.length, channels: 2 };
}

/**
 * Uncompressed Float32 DSP chain:
 * multi-band transient/dynamic shaping → linear-phase EQ → mid-side spatial matrix.
 * No intermediate quantization; headroom preserved until float WAV export.
 */
export function runDspChain(input: AudioBuffer32, profile: DspProfile): AudioBuffer32 {
  const { left, right } = splitStereo(input);

  const leftDyn = multiBandShape(left, input.sampleRate, profile.dynamics);
  const rightDyn = multiBandShape(right, input.sampleRate, profile.dynamics);

  const leftEq = linearPhaseEq(leftDyn, input.sampleRate, profile.eq);
  const rightEq = linearPhaseEq(rightDyn, input.sampleRate, profile.eq);

  const staged = spatialStage(joinStereo(leftEq, rightEq, input), profile.spatial);

  // Soft ceiling only if peaks exceed ±1.0 — preserves Float32 headroom otherwise.
  let peak = 0;
  for (let i = 0; i < staged.samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(staged.samples[i]!));
  }
  if (peak > 1.0) {
    const norm = 1.0 / peak;
    for (let i = 0; i < staged.samples.length; i += 1) {
      staged.samples[i]! *= norm * 0.999;
    }
  }

  return staged;
}
