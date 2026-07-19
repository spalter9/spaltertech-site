import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

/** Current session user (drives the Data Room auth gate). */
export function useMe() {
  return useQuery(orpc.me.queryOptions({ retry: false }));
}

/* Pillar 1 — Master Trust */
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
