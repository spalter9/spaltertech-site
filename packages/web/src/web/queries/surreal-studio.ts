import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export type DspProfileId =
  | "spatial-holographic"
  | "mastering-transparent"
  | "broadcast-punch";

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

export type RenderUploadResult = {
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
  downloadPath: string;
};

export function useDspProfiles() {
  return useQuery(orpc.surealizer.listProfiles.queryOptions());
}

export function useFloat32Masters() {
  return useQuery(orpc.surealizer.listMasters.queryOptions());
}

export type RenderUploadInput = {
  file: File;
  profileId: DspProfileId;
  title: string;
  creatorName: string;
  rightsType: "MASTER" | "COMPOSITION" | "NEIGHBORING";
  isrc?: string;
};

export function useRenderFloat32Master() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenderUploadInput): Promise<RenderUploadResult> => {
      const body = new FormData();
      body.append("file", input.file);
      body.append("profileId", input.profileId);
      body.append("title", input.title);
      body.append("creatorName", input.creatorName);
      body.append("rightsType", input.rightsType);
      if (input.isrc) body.append("isrc", input.isrc);

      const res = await fetch("/api/surealizer/render", { method: "POST", body });
      const json = (await res.json()) as RenderUploadResult & { error?: string };
      if (!res.ok) throw new Error(json.error || `Render failed (${res.status})`);
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orpc.surealizer.listMasters.key() });
      qc.invalidateQueries({ queryKey: orpc.surealizer.listJobs.key() });
      qc.invalidateQueries({ queryKey: orpc.ssp.ledger.key() });
      qc.invalidateQueries({ queryKey: orpc.ssp.stats.key() });
      qc.invalidateQueries({ queryKey: orpc.compliance.listManifests.key() });
    },
  });
}
