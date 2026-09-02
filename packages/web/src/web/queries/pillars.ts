import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/** Current session user (drives the Data Room auth gate). */
export function useMe() {
  return useQuery(orpc.me.queryOptions({ retry: false }));
}

/* Pillar 1 — MasterTrust */
export function useSegments() {
  return useQuery(orpc.masterTrust.listSegments.queryOptions());
}
export function useEscrow() {
  return useQuery(orpc.masterTrust.listEscrow.queryOptions());
}
export function useSettleAsset() {
  const qc = useQueryClient();
  return useMutation(
    orpc.masterTrust.settleAsset.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: orpc.masterTrust.listEscrow.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.ledger.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.stats.key() });
      },
    }),
  );
}

/* Pillar 2 — SSP */
export function useLedger() {
  return useQuery(orpc.ssp.ledger.queryOptions({ input: { limit: 40 } }));
}
export function useSspStats() {
  return useQuery(orpc.ssp.stats.queryOptions());
}
export function useTripwire() {
  return useQuery(orpc.ssp.tripwire.queryOptions({ input: { limit: 20 } }));
}
export function useTriggerTripwire() {
  const qc = useQueryClient();
  return useMutation(
    orpc.ssp.triggerTripwire.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: orpc.ssp.tripwire.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.stats.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.ledger.key() });
      },
    }),
  );
}

/* Pillar 3 — Surrealizer */
export function useStemJobs() {
  return useQuery(orpc.surealizer.listJobs.queryOptions());
}
export function useAnalyze() {
  const qc = useQueryClient();
  return useMutation(
    orpc.surealizer.analyze.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: orpc.surealizer.listJobs.key() }),
    }),
  );
}

/* Homepage pillar copy — Claude-generated; component falls back to its
   built-in static copy when `generated` is false. */
export function usePillarCopy() {
  return useQuery(orpc.content.pillarCopy.queryOptions());
}

/* Compliance & Settlement Infrastructure */
export function useCompliancePosture() {
  return useQuery(orpc.compliance.posture.queryOptions());
}

/* 1 · Dual-layer provenance */
export function useManifests() {
  return useQuery(orpc.compliance.listManifests.queryOptions());
}
export function useAnchorManifest() {
  const qc = useQueryClient();
  return useMutation(
    orpc.compliance.anchorManifest.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: orpc.compliance.listManifests.key() });
        qc.invalidateQueries({ queryKey: orpc.compliance.posture.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.ledger.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.stats.key() });
      },
    }),
  );
}

/* 2 · Account abstraction + fiat off-ramp */
export function useFiatPayouts() {
  return useQuery(orpc.compliance.listPayouts.queryOptions());
}
export function useOfframp() {
  const qc = useQueryClient();
  return useMutation(
    orpc.compliance.offramp.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: orpc.compliance.listPayouts.key() });
        qc.invalidateQueries({ queryKey: orpc.compliance.posture.key() });
      },
    }),
  );
}

/* 3 · Unclaimed 90-day escrow */
export function useUnclaimed() {
  return useQuery(orpc.compliance.listUnclaimed.queryOptions());
}
export function useResolveClaim() {
  const qc = useQueryClient();
  return useMutation(
    orpc.compliance.resolveClaim.mutationOptions({
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: orpc.compliance.listUnclaimed.key() });
        qc.invalidateQueries({ queryKey: orpc.compliance.posture.key() });
        qc.invalidateQueries({ queryKey: orpc.ssp.ledger.key() });
      },
    }),
  );
}
