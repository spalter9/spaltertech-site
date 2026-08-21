import type { AudioBuffer32, ForensicReport } from "./types";

function rms(channel: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < channel.length; i += 1) sum += channel[i]! * channel[i]!;
  return Math.sqrt(sum / Math.max(channel.length, 1));
}

function bandEnergy(mono: Float32Array, sampleRate: number, lowHz: number, highHz: number): number {
  // Single-pole band energy proxy via differenced smoothed envelope in-band.
  const rcHigh = 1 / (2 * Math.PI * highHz);
  const rcLow = 1 / (2 * Math.PI * lowHz);
  const dt = 1 / sampleRate;
  const alphaHigh = dt / (rcHigh + dt);
  const alphaLow = dt / (rcLow + dt);
  let lp = 0;
  let bp = 0;
  let energy = 0;
  for (let i = 0; i < mono.length; i += 1) {
    const x = mono[i]!;
    lp += alphaLow * (x - lp);
    const hp = x - lp;
    bp += alphaHigh * (hp - bp);
    energy += bp * bp;
  }
  return energy / Math.max(mono.length, 1);
}

/**
 * Forensic phase-integrity and spectral-balance verification.
 * Must pass before SSP asset hash / on-chain rights are finalized.
 */
export function verifyForensics(audio: AudioBuffer32): ForensicReport {
  if (audio.channels !== 2) {
    return {
      passed: false,
      phaseCorrelation: 0,
      spectralBalanceScore: 0,
      peakAmplitude: 0,
      truePeakEstimate: 0,
      rmsLufsProxy: 0,
      clippingEvents: 0,
      checks: [
        {
          id: "stereo",
          label: "Stereo Float32 buffer",
          passed: false,
          detail: "Master must be stereo for phase-integrity analysis",
        },
      ],
    };
  }

  const n = audio.length;
  let sumLR = 0;
  let sumL2 = 0;
  let sumR2 = 0;
  let peak = 0;
  let clipping = 0;
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const mono = new Float32Array(n);

  for (let i = 0; i < n; i += 1) {
    const l = audio.samples[i * 2]!;
    const r = audio.samples[i * 2 + 1]!;
    left[i] = l;
    right[i] = r;
    mono[i] = (l + r) * 0.5;
    sumLR += l * r;
    sumL2 += l * l;
    sumR2 += r * r;
    const a = Math.max(Math.abs(l), Math.abs(r));
    peak = Math.max(peak, a);
    if (a >= 0.999) clipping += 1;
  }

  const denom = Math.sqrt(sumL2 * sumR2) || 1e-12;
  const phaseCorrelation = sumLR / denom;

  const low = bandEnergy(mono, audio.sampleRate, 40, 200);
  const mid = bandEnergy(mono, audio.sampleRate, 200, 4000);
  const high = bandEnergy(mono, audio.sampleRate, 4000, 16000);
  const total = low + mid + high + 1e-12;
  const lowR = low / total;
  const midR = mid / total;
  const highR = high / total;
  // Prefer balanced spectrum: mid dominant, extremes present but not runaway.
  const spectralBalanceScore = 1 - Math.min(1, Math.abs(midR - 0.55) + Math.abs(lowR - 0.25) + Math.abs(highR - 0.2));

  const monoRms = rms(mono);
  const rmsLufsProxy = -0.691 + 10 * Math.log10(Math.max(monoRms * monoRms, 1e-12));
  const truePeakEstimate = peak * 1.05;

  const checks: ForensicReport["checks"] = [
    {
      id: "phase",
      label: "Inter-channel phase integrity",
      passed: phaseCorrelation >= 0.15 && phaseCorrelation <= 0.999,
      detail: `correlation=${phaseCorrelation.toFixed(4)}`,
    },
    {
      id: "spectral",
      label: "Spectral balance",
      passed: spectralBalanceScore >= 0.35,
      detail: `score=${spectralBalanceScore.toFixed(3)} low=${lowR.toFixed(2)} mid=${midR.toFixed(2)} high=${highR.toFixed(2)}`,
    },
    {
      id: "headroom",
      label: "Float32 headroom / zero hard clip",
      passed: clipping === 0 && peak <= 1.0,
      detail: `peak=${peak.toFixed(6)} clipEvents=${clipping}`,
    },
    {
      id: "truepeak",
      label: "True-peak estimate within float ceiling",
      passed: truePeakEstimate <= 1.05,
      detail: `truePeak≈${truePeakEstimate.toFixed(4)}`,
    },
  ];

  return {
    passed: checks.every((c) => c.passed),
    phaseCorrelation,
    spectralBalanceScore,
    peakAmplitude: peak,
    truePeakEstimate,
    rmsLufsProxy,
    clippingEvents: clipping,
    checks,
  };
}
