import { band, ramp } from "./dsp";
import { CLAIM_THRESHOLDS } from "./types";
import type {
  ClaimEligibility,
  CopyrightStatus,
  DiscreteStem,
  ExaminerStem,
  ForensicFeature,
  OverallVerdict,
  StemAnalysis,
  StemVerdict,
} from "./types";

/**
 * Deterministic scoring policy.
 *
 * Measurement happens in the Python worker; *judgement* happens here, in one
 * auditable file, so an examiner can be shown exactly which measured value
 * produced which sub-score and what it was weighted at. Nothing here samples a
 * random number or asks a model — the same input file always produces the same
 * verdict, which is the only way a report survives being challenged.
 *
 * Every band below is stated as: implausible-low, human-low, human-high,
 * implausible-high. A value inside the middle pair scores 1.0; outside the
 * outer pair scores 0; between them it ramps linearly.
 */

type Scorer = (value: number) => number;

type FeatureSpec = {
  id: string;
  label: string;
  unit: string;
  weight: number;
  score: Scorer;
  /** Reading shown to the examiner, given the raw value and its sub-score. */
  read: (value: number, score: number) => string;
};

const humanish = (score: number): string =>
  score >= 0.75 ? "consistent with human performance" : score >= 0.4 ? "ambiguous" : "consistent with machine generation";

const VOCAL_SPECS: FeatureSpec[] = [
  {
    id: "pitch_jitter_pct",
    label: "Period-to-period pitch jitter",
    unit: "%",
    weight: 0.22,
    // Human phonation perturbs 0.4–2.5 %; synthesis holds far steadier.
    score: (v) => band(v, 0.05, 0.35, 2.5, 5),
    read: (v, s) => `${v.toFixed(2)} % cycle-to-cycle F0 perturbation — ${humanish(s)}`,
  },
  {
    id: "micro_pitch_drift_cents",
    label: "Micro-pitch drift on sustained notes",
    unit: "cents",
    weight: 0.2,
    score: (v) => band(v, 2, 8, 60, 140),
    read: (v, s) => `${v.toFixed(1)} cents of detrended drift — ${humanish(s)}`,
  },
  {
    id: "shimmer_pct",
    label: "Amplitude shimmer",
    unit: "%",
    weight: 0.14,
    score: (v) => band(v, 0.3, 1.5, 10, 20),
    read: (v, s) => `${v.toFixed(2)} % cycle amplitude perturbation — ${humanish(s)}`,
  },
  {
    id: "formant_stability_cv",
    label: "Formant trajectory variation",
    unit: "cv",
    weight: 0.18,
    // Articulation moves F1/F2 constantly. A flat track means no vocal tract.
    score: (v) => band(v, 0.01, 0.05, 0.45, 0.8),
    read: (v, s) => `F1/F2 coefficient of variation ${v.toFixed(3)} — ${humanish(s)}`,
  },
  {
    id: "room_late_energy_ratio",
    label: "Room acoustic signature",
    unit: "ratio",
    weight: 0.12,
    score: (v) => ramp(v, 0.01, 0.1),
    read: (v, s) => `late-field energy ratio ${v.toFixed(3)} — ${s >= 0.5 ? "physical capture space present" : "anechoic / synthesised space"}`,
  },
  {
    id: "hf_phase_dispersion",
    label: "16–22 kHz phase dispersion",
    unit: "variance",
    weight: 0.08,
    score: (v) => ramp(v, 0.05, 0.35),
    read: (v, s) => `circular variance ${v.toFixed(3)} — ${s >= 0.5 ? "decorrelated air band" : "reconstructed top octave"}`,
  },
  {
    id: "voiced_ratio",
    label: "Voiced frame ratio",
    unit: "ratio",
    weight: 0.06,
    score: (v) => band(v, 0.05, 0.15, 0.95, 1),
    read: (v) => `${(v * 100).toFixed(0)} % of frames voiced`,
  },
];

const DRUM_SPECS: FeatureSpec[] = [
  {
    id: "onset_jitter_ms",
    label: "Onset deviation from beat grid",
    unit: "ms",
    weight: 0.3,
    // A player sits a few ms off the grid. A sequencer sits on it exactly.
    score: (v) => band(v, 0.5, 3, 35, 70),
    read: (v, s) =>
      `${v.toFixed(2)} ms std-dev — ${s >= 0.75 ? "human tracking spread" : v < 3 ? "grid-quantised or generated" : "unstable / no coherent grid"}`,
  },
  {
    id: "hf_phase_correlation",
    label: "16–22 kHz inter-channel coherence",
    unit: "ratio",
    weight: 0.22,
    // Near-unity coherence up top is the neural vocoder tell.
    score: (v) => 1 - ramp(v, 0.55, 0.95),
    read: (v, s) => `coherence ${v.toFixed(3)} — ${s >= 0.5 ? "naturally decorrelated" : "shared-latent reconstruction"}`,
  },
  {
    id: "transient_crest_db",
    label: "Transient crest factor",
    unit: "dB",
    weight: 0.2,
    score: (v) => ramp(v, 6, 16),
    read: (v, s) => `${v.toFixed(1)} dB peak-to-RMS — ${s >= 0.5 ? "uncompressed algorithmic transients intact" : "diffusion smear / transient loss"}`,
  },
  {
    id: "spectral_cliff_hz",
    label: "Usable bandwidth",
    unit: "Hz",
    weight: 0.16,
    score: (v) => ramp(v, 14000, 19000),
    read: (v, s) => `energy to ${Math.round(v)} Hz — ${s >= 0.5 ? "full-band capture" : "band-limited synthesis or lossy source"}`,
  },
  {
    id: "velocity_variance_cv",
    label: "Hit-to-hit dynamic variance",
    unit: "cv",
    weight: 0.12,
    score: (v) => band(v, 0.02, 0.08, 0.6, 1),
    read: (v, s) => `velocity CV ${v.toFixed(3)} — ${humanish(s)}`,
  },
];

/**
 * Weights below were rebalanced after direct validation against synthesized
 * signals (see services/forensics/validate_measurements.py — the one part of
 * the pipeline that never ran before that pass, since the worker needs
 * torch+demucs). `micro_timing_std_ms` and `note_duration_cv` both derive
 * from the same onset-detection pass, which proved noisy on legato/sustained
 * material: spectral-flux onset detection with backtracking is tuned for
 * percussive transients (where it validated cleanly against drums) and can
 * over-trigger or misplace onsets on continuously-voiced tonal parts,
 * corrupting both features together since they share that input. The other
 * three features are each derived independently (pitch tracking, frame-wise
 * spectral analysis, raw STFT phase) and separated human from synthetic
 * material cleanly and repeatably in that same validation. Weight moved from
 * the correlated, less reliable pair toward the independent, robust three,
 * rather than discarding the onset-based pair outright — they still carry
 * real signal on well-articulated material, just less of it.
 */
const HARMONY_SPECS: FeatureSpec[] = [
  {
    id: "micro_timing_std_ms",
    label: "Micro-timing deviation across beat grid",
    unit: "ms",
    weight: 0.15,
    score: (v) => band(v, 0.5, 3, 35, 70),
    read: (v, s) => `${v.toFixed(2)} ms std-dev — ${humanish(s)}`,
  },
  {
    id: "note_duration_cv",
    label: "Note duration variance",
    unit: "cv",
    weight: 0.15,
    score: (v) => band(v, 0.02, 0.1, 0.7, 1.2),
    read: (v, s) => `duration CV ${v.toFixed(3)} — ${humanish(s)}`,
  },
  {
    id: "harmonic_drift_cents",
    label: "Intonation drift",
    unit: "cents",
    weight: 0.3,
    score: (v) => band(v, 0.5, 3, 45, 100),
    read: (v, s) => `${v.toFixed(1)} cents drift — ${s >= 0.5 ? "played intonation" : "fixed-pitch generation"}`,
  },
  {
    id: "spectral_flatness",
    label: "Spectral flatness",
    unit: "ratio",
    weight: 0.2,
    score: (v) => 1 - ramp(v, 0.15, 0.45),
    read: (v, s) => `flatness ${v.toFixed(3)} — ${s >= 0.5 ? "structured harmonic content" : "elevated diffusion noise floor"}`,
  },
  {
    id: "hf_phase_correlation",
    label: "16–22 kHz inter-channel coherence",
    unit: "ratio",
    weight: 0.2,
    score: (v) => 1 - ramp(v, 0.55, 0.95),
    read: (v, s) => `coherence ${v.toFixed(3)} — ${humanish(s)}`,
  },
];

const SPECS: Record<ExaminerStem, FeatureSpec[]> = {
  vocals: VOCAL_SPECS,
  drums: DRUM_SPECS,
  bass_and_harmony: HARMONY_SPECS,
};

/** Which examiner group each Demucs source is judged under. */
export const STEM_GROUP: Record<DiscreteStem, ExaminerStem> = {
  vocals: "vocals",
  drums: "drums",
  bass: "bass_and_harmony",
  other: "bass_and_harmony",
};

export type RawStemMeasurement = {
  stem: DiscreteStem;
  energy_share: number;
  features: Record<string, number>;
};

/**
 * Apply the policy to one measured stem.
 *
 * Features the worker could not measure (silent stem, no voiced frames, no
 * detectable onsets) are dropped and the remaining weights renormalised, so a
 * missing measurement never silently counts as evidence of anything.
 */
export function scoreStem(
  group: ExaminerStem,
  measured: Record<string, number>,
  energyShare: number,
): StemAnalysis {
  const specs = SPECS[group];
  const features: ForensicFeature[] = [];
  let weightUsed = 0;
  let weighted = 0;

  for (const spec of specs) {
    const value = measured[spec.id];
    if (value === undefined || !Number.isFinite(value)) continue;
    const score = clamp01(spec.score(value));
    features.push({
      id: spec.id,
      label: spec.label,
      value: round(value, 4),
      unit: spec.unit,
      score: round(score, 4),
      weight: spec.weight,
      interpretation: spec.read(value, score),
    });
    weightUsed += spec.weight;
    weighted += spec.weight * score;
  }

  const humanScore = weightUsed > 0 ? weighted / weightUsed : 0;
  const verdict = verdictFor(humanScore, weightUsed);

  return {
    stem: group,
    verdict,
    confidence: round(confidenceFor(humanScore, weightUsed), 2),
    copyright_status: copyrightFor(verdict),
    human_score: round(humanScore, 4),
    energy_share: round(energyShare, 4),
    features,
  };
}

function verdictFor(score: number, weightUsed: number): StemVerdict {
  // Under half the evidence measurable, no verdict is defensible.
  if (weightUsed < 0.5) return "INDETERMINATE";
  if (score >= CLAIM_THRESHOLDS.claimable) return "HUMAN_PERFORMANCE";
  if (score >= CLAIM_THRESHOLDS.exclude) return "HYBRID_HUMAN_DIRECTED";
  return "AI_GENERATED";
}

function copyrightFor(verdict: StemVerdict): CopyrightStatus {
  switch (verdict) {
    case "HUMAN_PERFORMANCE":
      return "CLAIMABLE";
    case "HYBRID_HUMAN_DIRECTED":
      return "PARTIAL_CLAIM";
    case "AI_GENERATED":
      return "MUST_EXCLUDE";
    default:
      return "UNDETERMINED";
  }
}

/** Confidence is distance from the nearest decision boundary, not certainty. */
function confidenceFor(score: number, weightUsed: number): number {
  if (weightUsed < 0.5) return 0;
  const evidence = clamp01(weightUsed);
  let margin: number;
  if (score >= CLAIM_THRESHOLDS.claimable) {
    margin = ramp(score, CLAIM_THRESHOLDS.claimable, 1);
  } else if (score < CLAIM_THRESHOLDS.exclude) {
    margin = 1 - ramp(score, 0, CLAIM_THRESHOLDS.exclude);
  } else {
    const centre = (CLAIM_THRESHOLDS.claimable + CLAIM_THRESHOLDS.exclude) / 2;
    const halfWidth = (CLAIM_THRESHOLDS.claimable - CLAIM_THRESHOLDS.exclude) / 2;
    margin = 1 - Math.abs(score - centre) / halfWidth;
  }
  return clamp01(0.5 + 0.5 * margin) * evidence;
}

/** Energy-weighted across stems: a silent stem cannot swing the index. */
export function authorshipIndex(stems: StemAnalysis[]): number {
  const scored = stems.filter((s) => s.verdict !== "INDETERMINATE");
  const totalEnergy = scored.reduce((acc, s) => acc + s.energy_share, 0);
  if (scored.length === 0) return 0;
  if (totalEnergy <= 0) {
    return round(scored.reduce((acc, s) => acc + s.human_score, 0) / scored.length, 4);
  }
  return round(
    scored.reduce((acc, s) => acc + s.human_score * s.energy_share, 0) / totalEnergy,
    4,
  );
}

export function overallVerdict(index: number, stems: StemAnalysis[]): OverallVerdict {
  if (stems.every((s) => s.verdict === "INDETERMINATE")) return "INDETERMINATE";
  if (index >= CLAIM_THRESHOLDS.claimable) {
    // One wholly machine-generated stem still makes the work hybrid.
    return stems.some((s) => s.verdict === "AI_GENERATED") ? "HYBRID_AI_ASSISTED" : "HUMAN_AUTHORED";
  }
  if (index >= CLAIM_THRESHOLDS.exclude) return "HYBRID_AI_ASSISTED";
  return "AI_GENERATED";
}

export function claimEligibility(index: number, stems: StemAnalysis[]): ClaimEligibility {
  if (stems.every((s) => s.verdict === "INDETERMINATE")) return "UNDETERMINED";
  if (stems.every((s) => s.verdict === "AI_GENERATED")) return "MUST_EXCLUDE";
  if (index >= CLAIM_THRESHOLDS.claimable && !stems.some((s) => s.copyright_status !== "CLAIMABLE")) {
    return "ELIGIBLE_FOR_CLAIM";
  }
  return "HYBRID_LIMITATION_REQUIRED";
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}
