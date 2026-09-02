/**
 * SOVEREIGN AUDIO PROTOCOL — shared contract types.
 *
 * Module A (inbound):  forensic audit scanner → examiner-grade verdict + USCO dossier
 * Module B (outbound): 4-valve export matrix → cross-hashed, signed, BWF-sealed package
 *
 * Everything here is self-hosted. No third-party SaaS is contacted at any point
 * in either pipeline; the only outbound call the protocol ever makes is to the
 * operator's own Demucs worker over the private network.
 */

import type { DeliveryVerdict } from "./delivery-targets";

/* ───────────────────────── MODULE A — AUDIT ───────────────────────── */

/** The four discrete sources HTDemucs v4 separates a container into. */
export type DiscreteStem = "vocals" | "drums" | "bass" | "other";

/** The three groups an examiner actually reasons about on a claim. */
export type ExaminerStem = "vocals" | "drums" | "bass_and_harmony";

export type StemVerdict =
  | "HUMAN_PERFORMANCE"
  | "HYBRID_HUMAN_DIRECTED"
  | "AI_GENERATED"
  | "INDETERMINATE";

export type CopyrightStatus =
  | "CLAIMABLE"
  | "PARTIAL_CLAIM"
  | "MUST_EXCLUDE"
  | "UNDETERMINED";

export type ClaimEligibility =
  | "ELIGIBLE_FOR_CLAIM"
  | "HYBRID_LIMITATION_REQUIRED"
  | "MUST_EXCLUDE"
  | "UNDETERMINED";

export type OverallVerdict =
  | "HUMAN_AUTHORED"
  | "HYBRID_AI_ASSISTED"
  | "AI_GENERATED"
  | "INDETERMINATE";

export type AuditJobStatus =
  | "queued"
  | "processing"
  | "complete"
  | "failed"
  /** Demixer offline: whole-container preflight only, never examiner-grade. */
  | "degraded_no_demix";

/** Provenance state read out of the container's own header before any analysis. */
export type CustodyState =
  /** A Sovereign Audio Protocol manifest was found in the header and verified. */
  | "SEALED_VERIFIED"
  /** A manifest was found but its signature does not verify — treat as hostile. */
  | "SEALED_TAMPERED"
  /** No embedded manifest: unknown chain of custody. */
  | "LEGACY_UNVERIFIED";

/**
 * One measured DSP feature behind a verdict.
 *
 * Every number an examiner sees is traceable to one of these: the raw measured
 * value, the window it was measured over, and the deterministic 0..1 sub-score
 * it contributed. Nothing in the scoring path is random or model-inferred.
 */
export type ForensicFeature = {
  id: string;
  label: string;
  /** Raw measured value in `unit`. */
  value: number;
  unit: string;
  /** Deterministic human-likelihood contribution in [0,1]. */
  score: number;
  /** Weight this feature carried inside its stem's score. */
  weight: number;
  /** Human-readable reading of the measurement. */
  interpretation: string;
};

export type StemAnalysis = {
  stem: ExaminerStem;
  verdict: StemVerdict;
  /** Distance-from-threshold confidence in [0,1]. */
  confidence: number;
  copyright_status: CopyrightStatus;
  /** Deterministic human-authorship score in [0,1]. */
  human_score: number;
  /** Share of total programme energy this stem carries, in [0,1]. */
  energy_share: number;
  features: ForensicFeature[];
};

export type DiscreteStemAnalysis = StemAnalysis & { discrete_stem: DiscreteStem };

export type UscoFilingDossier = {
  material_excluded: string;
  new_material_included: string;
  eCO_copy_paste_text: string;
  /** Whether a limitation of claim must be filed at all. */
  limitation_required: boolean;
  /** Claim is unsafe to file as-is (e.g. every stem scored MUST_EXCLUDE). */
  claim_blocked: boolean;
};

export type AuditResult = {
  job_id: string;
  file_hash: string;
  file_name: string;
  status: AuditJobStatus;
  custody_state: CustodyState;
  /** Energy-weighted mean of stem human scores, in [0,1]. */
  human_authorship_index: number;
  overall_verdict: OverallVerdict;
  claim_eligibility: ClaimEligibility;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  /** The three examiner groups. Matches the published API contract. */
  stems: StemAnalysis[];
  /** The four raw Demucs sources, for the deep audit trail. */
  discrete_stems: DiscreteStemAnalysis[];
  usco_filing_dossier: UscoFilingDossier;
  /** Whole-container measurements taken before separation. */
  container: ContainerReport;
  /**
   * How the container's measured loudness lands against each streaming
   * platform's published normalisation target. Independent of the authorship
   * finding — a master can be perfectly claimable and still clip on delivery.
   */
  delivery: DeliveryVerdict[];
  analyzed_at: string;
  /** Populated on `failed` / `degraded_no_demix`. */
  notice?: string;
  engine: {
    demixer: string;
    demixer_online: boolean;
    dsp: string;
    protocol_version: string;
  };
};

/** Whole-container preflight — runs in-process, before (and independent of) demixing. */
export type ContainerReport = {
  integrated_lufs: number;
  loudness_range_lu: number;
  true_peak_dbtp: number;
  sample_peak_dbfs: number;
  /** Inter-channel coherence restricted to 16–22 kHz, in [0,1]. */
  hf_phase_correlation: number;
  /** Circular variance of the 16–22 kHz inter-channel phase, in [0,1]. */
  hf_phase_dispersion: number;
  /** Highest frequency carrying meaningful energy (codec/vocoder bandwidth cliff). */
  spectral_cliff_hz: number;
  /** Onset deviation from the estimated beat grid, ms std-dev. */
  micro_timing_jitter_ms: number;
  estimated_tempo_bpm: number;
  onset_count: number;
  dc_offset: number;
  clipped_samples: number;
};

/* ───────────────────────── MODULE B — SEAL ───────────────────────── */

export type ValveId = "original" | "master" | "mv3" | "model";

export type ValveTier =
  | "ARCHIVAL_VAULT"
  | "STREAMING_DSP"
  | "BROADCAST_SYNC"
  | "MACHINE_INGESTION";

export type ValveDescriptor = {
  valve: ValveId;
  filename: string;
  tier: ValveTier;
  /** SHA-256 of the bit-exact PCM payload — stable under metadata injection. */
  sha256: string;
  byte_length: number;
  sample_rate: number;
  channels: number;
  bit_depth: 32;
  duration_sec: number;
  integrated_lufs: number;
  true_peak_dbtp: number;
  /** Tier-specific fields mirrored into the published manifest. */
  lufs?: number;
  pre_cleared?: boolean;
  permissions?: { training_allowed: boolean; derivatives_allowed: boolean };
  treatment: string;
};

export type ProvenanceLayer = {
  layer: string;
  type: "HUMAN_PERFORMANCE" | "AI_GENERATED_DISCLAIMED" | "HYBRID_HUMAN_DIRECTED";
  performer?: string;
  source?: string;
  human_treatment?: string;
};

export type UscoLimitationOfClaim = {
  material_excluded: string;
  new_material_included: string;
  eCO_statement: string;
};

export type AuthorialManifest = {
  $schema: string;
  manifest_id: string;
  protocol_version: string;
  timestamp_utc: string;
  session_id: string;
  work: {
    title: string;
    creator: string;
    rights_type: "MASTER" | "COMPOSITION" | "NEIGHBORING";
    isrc?: string;
    iswc?: string;
  };
  four_valves: Record<ValveId, Omit<ValveDescriptor, "valve">>;
  /** SHA-256 over the four payload hashes — binds all tiers into one seal. */
  cross_hash: string;
  provenance_breakdown: ProvenanceLayer[];
  usco_limitation_of_claim: UscoLimitationOfClaim;
  /** Present when the session was built from a Module A audit. */
  audit_reference?: {
    job_id: string;
    file_hash: string;
    human_authorship_index: number;
    overall_verdict: OverallVerdict;
  };
};

/** Detached Ed25519 signature over the canonical JSON encoding of the manifest. */
export type ManifestSignature = {
  algorithm: "Ed25519";
  /** SHA-256 of the DER public key — the operator's stable signer identity. */
  key_id: string;
  public_key_spki_b64: string;
  signature_b64: string;
  /** SHA-256 of the exact canonical bytes that were signed. */
  signed_digest: string;
};

export type SealedManifest = {
  manifest: AuthorialManifest;
  signature: ManifestSignature;
};

export type SealResult = {
  session_id: string;
  manifest_id: string;
  cross_hash: string;
  valves: ValveDescriptor[];
  signature: ManifestSignature;
  package_filename: string;
  package_bytes: number;
  /** SHA-256 of each delivered file *after* sealing — the delivery receipt. */
  sealed_file_hashes: Record<ValveId, string>;
  created_at: string;
};

export type VerifyResult = {
  verified: boolean;
  reason: string;
  manifest?: AuthorialManifest;
  signature?: ManifestSignature;
  /** Recomputed payload hash of the submitted file. */
  payload_sha256?: string;
  /** Whether the recomputed payload hash matches the one inside the manifest. */
  payload_matches?: boolean;
  /** Which valve of the sealed set the submitted file claims to be. */
  valve?: ValveId;
};

export const PROTOCOL_VERSION = "sap/1.0";

export const MANIFEST_SCHEMA_URL =
  "https://soundprotocol.io/schemas/v1/authorial-manifest.json";

/** Deterministic claim bands. Fixed by the protocol, never tuned per-run. */
export const CLAIM_THRESHOLDS = {
  /** Human score at or above this is claimable outright. */
  claimable: 0.8,
  /** Human score below this must be disclaimed. */
  exclude: 0.4,
} as const;

/** Streaming delivery targets for the MASTER valve. */
export const MASTER_TARGETS = {
  integratedLufs: -14,
  truePeakDbfs: -1,
} as const;
