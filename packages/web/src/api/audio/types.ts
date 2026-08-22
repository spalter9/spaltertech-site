/** Native 32-bit float PCM tensor (planar or interleaved stereo). */

export type ChannelLayout = "interleaved" | "planar";

export type AudioBuffer32 = {
  sampleRate: number;
  channels: number;
  /** Interleaved Float32 PCM in [-∞, +∞] headroom (typically ±1.0 nominal). */
  samples: Float32Array;
  length: number;
  bitDepth: 32;
  format: "float32";
};

export type DspProfileId =
  | "spatial-holographic"
  | "mastering-transparent"
  | "broadcast-punch";

export type DspProfile = {
  id: DspProfileId;
  label: string;
  description: string;
  dynamics: {
    lowThreshold: number;
    midThreshold: number;
    highThreshold: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
  };
  eq: { freq: number; gainDb: number; q: number }[];
  spatial: {
    width: number;
    depthMs: number;
    midGainDb: number;
    sideGainDb: number;
  };
};

export type ForensicReport = {
  passed: boolean;
  phaseCorrelation: number;
  spectralBalanceScore: number;
  peakAmplitude: number;
  truePeakEstimate: number;
  rmsLufsProxy: number;
  clippingEvents: number;
  checks: { id: string; label: string; passed: boolean; detail: string }[];
};

export type OwnershipMetadata = {
  creatorName: string;
  creatorId: string;
  rightsType: "MASTER" | "COMPOSITION" | "NEIGHBORING";
  title: string;
  isrc?: string;
};

export type RenderResult = {
  masterId: string;
  assetKey: string;
  provenanceHash: string;
  assetHash: string;
  ledgerTxHash: string;
  anchorTxHash: string;
  sampleRate: number;
  channels: number;
  durationSec: number;
  profileId: DspProfileId;
  forensic: ForensicReport;
  fileName: string;
  byteLength: number;
};

export const DSP_PROFILES: Record<DspProfileId, DspProfile> = {
  "spatial-holographic": {
    id: "spatial-holographic",
    label: "Spatial Holographic",
    description:
      "Float32 multi-band shaping with linear-phase air EQ and mid-side holographic widening.",
    dynamics: {
      lowThreshold: -24,
      midThreshold: -18,
      highThreshold: -16,
      ratio: 2.2,
      attackMs: 8,
      releaseMs: 120,
    },
    eq: [
      { freq: 60, gainDb: 0.8, q: 0.7 },
      { freq: 2400, gainDb: -0.6, q: 1.1 },
      { freq: 12000, gainDb: 1.4, q: 0.8 },
    ],
    spatial: { width: 1.35, depthMs: 11, midGainDb: -0.3, sideGainDb: 1.2 },
  },
  "mastering-transparent": {
    id: "mastering-transparent",
    label: "Mastering Transparent",
    description: "Gentle Float32 dynamics and linear-phase tonal balance with modest stereo depth.",
    dynamics: {
      lowThreshold: -22,
      midThreshold: -20,
      highThreshold: -18,
      ratio: 1.6,
      attackMs: 12,
      releaseMs: 180,
    },
    eq: [
      { freq: 80, gainDb: 0.4, q: 0.6 },
      { freq: 3500, gainDb: -0.3, q: 1.0 },
      { freq: 10000, gainDb: 0.6, q: 0.9 },
    ],
    spatial: { width: 1.12, depthMs: 6, midGainDb: 0, sideGainDb: 0.4 },
  },
  "broadcast-punch": {
    id: "broadcast-punch",
    label: "Broadcast Punch",
    description: "Forward transient emphasis with controlled Float32 limiting and focused mid presence.",
    dynamics: {
      lowThreshold: -20,
      midThreshold: -16,
      highThreshold: -14,
      ratio: 3.0,
      attackMs: 4,
      releaseMs: 90,
    },
    eq: [
      { freq: 100, gainDb: 1.2, q: 0.8 },
      { freq: 2800, gainDb: 1.0, q: 1.2 },
      { freq: 9000, gainDb: 0.5, q: 0.9 },
    ],
    spatial: { width: 1.08, depthMs: 4, midGainDb: 0.6, sideGainDb: -0.2 },
  },
};
