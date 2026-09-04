import type { AuditResult } from "../queries/sovereign-protocol";

/**
 * A fully-worked example finding for the "See an example finding" demo.
 *
 * It exists so the Examiner shows its whole payoff — verdict, per-stem
 * findings, and the Copyright Office wording — in the first seconds, with no
 * upload, no separation worker, and no wait. That makes the tool demonstrable
 * on a cold laptop in a room, where the live pipeline (which needs the demixer
 * running) is fragile.
 *
 * This example is a strong, all-human record — the case the tool is built to
 * vindicate: a high authorship index and a clean, fully-claimable verdict. It
 * is always rendered under an explicit "example / illustration only" banner,
 * and the numbers are representative of a real finding, not a live measurement.
 */
export const EXAMPLE_FINDING: AuditResult = {
  job_id: "example-illustration",
  file_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  file_name: "Golden Hour — reversion master (example).wav",
  status: "complete",
  custody_state: "SEALED_VERIFIED",
  human_authorship_index: 0.96,
  overall_verdict: "HUMAN_AUTHORED",
  claim_eligibility: "ELIGIBLE_FOR_CLAIM",
  duration_sec: 213.4,
  sample_rate: 44100,
  channels: 2,
  stems: [
    {
      stem: "vocals",
      verdict: "HUMAN_PERFORMANCE",
      confidence: 0.94,
      copyright_status: "CLAIMABLE",
      human_score: 0.97,
      energy_share: 0.34,
      features: [
        {
          id: "pitch_jitter",
          label: "Pitch micro-jitter",
          value: 14.2,
          unit: "cents",
          score: 0.95,
          weight: 0.34,
          interpretation: "Natural vibrato and drift consistent with a sung human performance.",
        },
        {
          id: "breath_events",
          label: "Breath & consonant noise",
          value: 41,
          unit: "events",
          score: 0.92,
          weight: 0.24,
          interpretation: "Audible breaths and plosive bursts a generator does not reproduce.",
        },
        {
          id: "formant_motion",
          label: "Formant trajectory",
          value: 0.82,
          unit: "idx",
          score: 0.9,
          weight: 0.2,
          interpretation: "Vowel formants move the way a real vocal tract does.",
        },
      ],
    },
    {
      stem: "drums",
      verdict: "HUMAN_PERFORMANCE",
      confidence: 0.9,
      copyright_status: "CLAIMABLE",
      human_score: 0.93,
      energy_share: 0.29,
      features: [
        {
          id: "grid_adherence",
          label: "Micro-timing to grid",
          value: 21.4,
          unit: "ms",
          score: 0.9,
          weight: 0.3,
          interpretation: "Hits push and drag around the grid by tens of milliseconds — a drummer's feel, not a machine.",
        },
        {
          id: "velocity_entropy",
          label: "Velocity variation",
          value: 0.68,
          unit: "idx",
          score: 0.91,
          weight: 0.26,
          interpretation: "Wide, natural variation in hit dynamics across the take.",
        },
        {
          id: "hf_air",
          label: "Top-octave air",
          value: 20800,
          unit: "Hz",
          score: 0.88,
          weight: 0.2,
          interpretation: "Full recorded cymbal air to the top of the band — captured, not synthesized.",
        },
      ],
    },
    {
      stem: "bass_and_harmony",
      verdict: "HUMAN_PERFORMANCE",
      confidence: 0.91,
      copyright_status: "CLAIMABLE",
      human_score: 0.95,
      energy_share: 0.37,
      features: [
        {
          id: "timing_feel",
          label: "Pocket / timing feel",
          value: 12.1,
          unit: "ms",
          score: 0.93,
          weight: 0.28,
          interpretation: "Sits in a played pocket, slightly behind the beat, take to take.",
        },
        {
          id: "articulation",
          label: "Articulation variety",
          value: 0.86,
          unit: "idx",
          score: 0.92,
          weight: 0.24,
          interpretation: "Slides, ghost notes and dynamics of a played instrument.",
        },
      ],
    },
  ],
  usco_filing_dossier: {
    material_excluded: "None. No machine-generated material was detected in any source.",
    new_material_included:
      "The complete original vocal and instrumental performances, the arrangement, and the sound recording as fixed.",
    eCO_copy_paste_text:
      "Applicant claims the original vocal performance, the instrumental performances, the arrangement, and the sound recording as fixed. No AI-generated material is present in the work.",
    limitation_required: false,
    claim_blocked: false,
  },
  container: {
    integrated_lufs: -9.8,
    loudness_range_lu: 7.4,
    true_peak_dbtp: -0.8,
    sample_peak_dbfs: -1.1,
    hf_phase_correlation: 0.71,
    hf_phase_dispersion: 0.33,
    spectral_cliff_hz: 21200,
    micro_timing_jitter_ms: 17.6,
    estimated_tempo_bpm: 92,
    onset_count: 431,
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
    "Illustrative example of an all-human record. The numbers here are representative of a real finding, not a live measurement.",
  engine: {
    demixer: "htdemucs (example)",
    demixer_online: true,
    dsp: "BS.1770-4 · YIN · LPC",
    protocol_version: "SAP/1.0",
  },
};
