import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/**
 * Sovereign Audio Protocol — client bindings.
 *
 * Reads go through the typed oRPC client. The three byte-moving paths (scan
 * upload, seal upload, verify upload) post multipart directly to /api/v1,
 * because that is what those endpoints are.
 */

export type StemVerdict =
  | "HUMAN_PERFORMANCE"
  | "HYBRID_HUMAN_DIRECTED"
  | "AI_GENERATED"
  | "INDETERMINATE";

export type CopyrightStatus = "CLAIMABLE" | "PARTIAL_CLAIM" | "MUST_EXCLUDE" | "UNDETERMINED";

export type ForensicFeature = {
  id: string;
  label: string;
  value: number;
  unit: string;
  score: number;
  weight: number;
  interpretation: string;
};

export type StemAnalysis = {
  stem: "vocals" | "drums" | "bass_and_harmony";
  verdict: StemVerdict;
  confidence: number;
  copyright_status: CopyrightStatus;
  human_score: number;
  energy_share: number;
  features: ForensicFeature[];
};

export type ContainerReport = {
  integrated_lufs: number;
  loudness_range_lu: number;
  true_peak_dbtp: number;
  sample_peak_dbfs: number;
  hf_phase_correlation: number;
  hf_phase_dispersion: number;
  spectral_cliff_hz: number;
  micro_timing_jitter_ms: number;
  estimated_tempo_bpm: number;
  onset_count: number;
  dc_offset: number;
  clipped_samples: number;
};

export type DeliveryVerdict = {
  platform: string;
  target_lufs: number;
  target_true_peak_dbtp: number;
  normalisation_gain_db: number;
  true_peak_after_gain_dbtp: number;
  status: "on_target" | "quiet" | "loud" | "would_clip";
  note: string;
};

export type AuditResult = {
  job_id: string;
  file_hash: string;
  file_name: string;
  status: "complete" | "failed" | "degraded_no_demix" | "queued" | "processing";
  custody_state: "SEALED_VERIFIED" | "SEALED_TAMPERED" | "LEGACY_UNVERIFIED";
  human_authorship_index: number;
  overall_verdict: "HUMAN_AUTHORED" | "HYBRID_AI_ASSISTED" | "AI_GENERATED" | "INDETERMINATE";
  claim_eligibility:
    | "ELIGIBLE_FOR_CLAIM"
    | "HYBRID_LIMITATION_REQUIRED"
    | "MUST_EXCLUDE"
    | "UNDETERMINED";
  duration_sec: number;
  sample_rate: number;
  channels: number;
  stems: StemAnalysis[];
  usco_filing_dossier: {
    material_excluded: string;
    new_material_included: string;
    eCO_copy_paste_text: string;
    limitation_required: boolean;
    claim_blocked: boolean;
  };
  container: ContainerReport;
  delivery: DeliveryVerdict[];
  analyzed_at: string;
  notice?: string;
  engine: { demixer: string; demixer_online: boolean; dsp: string; protocol_version: string };
};

export type ScanAccepted = {
  job_id: string;
  status: string;
  sha256: string;
  queue_position: number;
};

export type ValveDescriptor = {
  valve: "original" | "master" | "mv3" | "model";
  filename: string;
  tier: string;
  sha256: string;
  byte_length: number;
  sample_rate: number;
  channels: number;
  duration_sec: number;
  integrated_lufs: number;
  true_peak_dbtp: number;
  treatment: string;
  permissions?: { training_allowed: boolean; derivatives_allowed: boolean };
};

export type SealResult = {
  session_id: string;
  manifest_id: string;
  cross_hash: string;
  valves: ValveDescriptor[];
  signature: { algorithm: string; key_id: string; signature_b64: string };
  package_filename: string;
  package_bytes: number;
  package_path: string;
  created_at: string;
};

export type VerifyResult = {
  verified: boolean;
  reason: string;
  valve?: string;
  payload_sha256?: string;
  payload_matches?: boolean;
};

export function useProtocolStatus() {
  return useQuery({
    ...orpc.sovereignProtocol.status.queryOptions(),
    // The demixer can come and go; keep the console's reading current.
    refetchInterval: 30_000,
  });
}

export function useAuditList() {
  return useQuery(orpc.sovereignProtocol.listAudits.queryOptions());
}

export function useSealList() {
  return useQuery(orpc.sovereignProtocol.listSeals.queryOptions());
}

/** Poll one job until the examination lands, then stop. */
export function useAuditResult(jobId: string | null) {
  return useQuery({
    ...orpc.sovereignProtocol.getAudit.queryOptions({ input: { jobId: jobId ?? "" } }),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (query.state.data?.ready ? false : 2500),
  });
}

export function useScanAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ScanAccepted> => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/audit/scan", { method: "POST", body });
      const json = (await res.json()) as ScanAccepted & { error?: string };
      if (!res.ok) throw new Error(json.error || `Scan rejected (${res.status})`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orpc.sovereignProtocol.listAudits.key() });
      qc.invalidateQueries({ queryKey: orpc.sovereignProtocol.status.key() });
    },
  });
}

export type SealInput = {
  file: File;
  title: string;
  creatorName: string;
  rightsType: "MASTER" | "COMPOSITION" | "NEIGHBORING";
  isrc?: string;
  auditJobId?: string;
};

export function useSealExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SealInput): Promise<SealResult> => {
      const body = new FormData();
      body.append("file", input.file);
      body.append("title", input.title);
      body.append("creatorName", input.creatorName);
      body.append("rightsType", input.rightsType);
      if (input.isrc) body.append("isrc", input.isrc);
      if (input.auditJobId) body.append("auditJobId", input.auditJobId);

      const res = await fetch("/api/v1/export/seal", { method: "POST", body });
      const json = (await res.json()) as SealResult & { error?: string };
      if (!res.ok) throw new Error(json.error || `Seal failed (${res.status})`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orpc.sovereignProtocol.listSeals.key() });
      qc.invalidateQueries({ queryKey: orpc.sovereignProtocol.status.key() });
    },
  });
}

export function useVerifyFile() {
  return useMutation({
    mutationFn: async (file: File): Promise<VerifyResult> => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/v1/export/verify", { method: "POST", body });
      // A failed verification is a valid answer, not a transport error.
      return (await res.json()) as VerifyResult;
    },
  });
}
