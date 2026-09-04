import type { AuditResult } from "../queries/sovereign-protocol";

/**
 * A fully-worked example finding for the "See an example finding" demo.
 *
 * It exists so the Examiner shows its whole payoff — verdict, per-stem
 * findings, and the Copyright Office wording — in the first seconds, with no
 * upload, no separation worker, and no wait. That makes the tool demonstrable
 * on a cold laptop in a room, where the live pipeline (which needs the demixer
 * running) is fragile. It is always rendered under an explicit "example /
 * illustration only" banner, and the numbers are representative, not measured.
 */
export const EXAMPLE_FINDING: AuditResult = {
  job_id: "example-illustration",
  file_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  file_name: "Golden Hour — reversion master (example).wav",
  status: "complete",
  custody_state: "SEALED_VERIFIED",
  human_authorship_index: 0.77,
  overall_verdict: "HYBRID_AI_ASSISTED",
  claim_eligibility: "HYBRID_LIMITATION_REQUIRED",
  duration_sec: 213.4,
  sample_rate: 44100,
  channels: 2,
  stems: [
    {
      stem: "vocals",
      verdict: "HUMAN_PERFORMANCE",
      confidence: 0.9,
      copyright_status: "CLAIMABLE",
      human_score: 0.94,
      energy_share: 0.34,
      features: [
        {
          id: "pitch_jitter",
          label: "Pitch micro-jitter",
          value: 14.2,
          unit: "cents",
          score: 0.91,
          weight: 0.34,
          interpretation: "Natural vibrato and drift consistent with a sung human performance.",
        },
        {
          id: "breath_events",
          label: "Breath & consonant noise",
          value: 37,
          unit: "events",
          score: 0.88,
          weight: 0.24,
          interpretation: "Audible breaths and plosive bursts a generator rarely reproduces.",
        },
        {
          id: "formant_motion",
          label: "Formant trajectory",
          value: 0.79,
          unit: "idx",
          score: 0.86,
          weight: 0.2,
          interpretation: "Vowel formants move the way a real vocal tract does.",
        },
      ],
    },
    {
      stem: "drums",
      verdict: "AI_GENERATED",
      confidence: 0.88,
      copyright_status: "MUST_EXCLUDE",
      human_score: 0.09,
      energy_share: 0.29,
      features: [
        {
          id: "grid_adherence",
          label: "Micro-timing to grid",
          value: 1.1,
          unit: "ms",
          score: 0.08,
          weight: 0.3,
          interpretation: "Hits land on the grid to the millisecond — machine-tight, not a human drummer.",
        },
        {
          id: "velocity_entropy",
          label: "Velocity variation",
          value: 0.12,
          unit: "idx",
          score: 0.1,
          weight: 0.26,
          interpretation: "Near-identical hit dynamics; a person varies far more.",
        },
        {
          id: "hf_reconstruction",
          label: "Top-octave reconstruction",
          value: 19100,
          unit: "Hz",
          score: 0.14,
          weight: 0.2,
          interpretation: "The top octave is synthesized rather than recorded cymbal air.",
        },
      ],
    },
    {
      stem: "bass_and_harmony",
      verdict: "HYBRID_HUMAN_DIRECTED",
      confidence: 0.76,
      copyright_status: "PARTIAL_CLAIM",
      human_score: 0.68,
      energy_share: 0.37,
      features: [
        {
          id: "timing_feel",
          label: "Pocket / timing feel",
          value: 8.3,
          unit: "ms",
          score: 0.63,
          weight: 0.28,
          interpretation: "Sits slightly behind the beat like a played part, but quantized in places.",
        },
        {
          id: "articulation",
          label: "Articulation variety",
          value: 0.55,
          unit: "idx",
          score: 0.58,
          weight: 0.24,
          interpretation: "Mixed — some human phrasing, some pattern repetition suggesting assistance.",
        },
      ],
    },
  ],
  usco_filing_dossier: {
    material_excluded: "AI-generated rhythmic and percussion elements (programmed drums).",
    new_material_included:
      "Original vocal performance, the sound recording as fixed, and the human-directed bass and harmonic arrangement.",
    eCO_copy_paste_text:
      "Applicant expressly disclaims copyright in machine-generated rhythmic and percussion elements. Applicant claims the original vocal performance, the human-directed bass and harmonic arrangement, and the sound recording as fixed.",
    limitation_required: true,
    claim_blocked: false,
  },
  container: {
    integrated_lufs: -9.8,
    loudness_range_lu: 6.2,
    true_peak_dbtp: -0.8,
    sample_peak_dbfs: -1.1,
    hf_phase_correlation: 0.62,
    hf_phase_dispersion: 0.41,
    spectral_cliff_hz: 20500,
    micro_timing_jitter_ms: 8.1,
    estimated_tempo_bpm: 92,
    onset_count: 412,
    dc_offset: 0.0002,
    clipped_samples: 0,
  },
  delivery: [
    {
      platform: "Spotify",
      target_lufs: -14,
      target_true_peak_dbtp: -1,
      normalisation_gain_db: -4.2,
      true_peak_after_gain_dbtp: -5.0,
      status: "on_target",
      note: "",
    },
    {
      platform: "Apple Music",
      target_lufs: -16,
      target_true_peak_dbtp: -1,
      normalisation_gain_db: -6.2,
      true_peak_after_gain_dbtp: -7.0,
      status: "on_target",
      note: "",
    },
    {
      platform: "YouTube",
      target_lufs: -14,
      target_true_peak_dbtp: -1,
      normalisation_gain_db: -4.2,
      true_peak_after_gain_dbtp: -5.0,
      status: "on_target",
      note: "",
    },
  ],
  analyzed_at: new Date().toISOString(),
  notice:
    "Illustrative example. The numbers here are representative of a real finding, not a live measurement.",
  engine: {
    demixer: "htdemucs (example)",
    demixer_online: true,
    dsp: "BS.1770-4 · YIN · LPC",
    protocol_version: "SAP/1.0",
  },
};
