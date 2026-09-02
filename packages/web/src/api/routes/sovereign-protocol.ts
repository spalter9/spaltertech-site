import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authedAllowed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { getAudit } from "../protocol/audit";
import { demixerHealth } from "../protocol/demixer";
import { keyIdFor, loadSigningKeys, publicKeyB64 } from "../protocol/crypto";
import { CLAIM_THRESHOLDS, MASTER_TARGETS, PROTOCOL_VERSION } from "../protocol/types";
import type { AuditResult, AuthorialManifest, SealedManifest } from "../protocol/types";

/**
 * SOVEREIGN AUDIO PROTOCOL — typed read surface.
 *
 * The binary paths (upload, ZIP, PDF) are plain HTTP routes in api/index.ts,
 * because oRPC is not the right transport for a 400 MB multipart body or a
 * streamed download. Everything else — status, listings, results — is here.
 */

export const sovereignProtocol = {
  /** Live posture of both modules, including whether the demixer is reachable. */
  status: authedAllowed.handler(async () => {
    const health = await demixerHealth();
    const { publicKey } = await loadSigningKeys();
    const jobs = await db.select({ status: schema.auditJobs.status }).from(schema.auditJobs);
    const seals = await db
      .select({ id: schema.exportSessions.id })
      .from(schema.exportSessions);

    return {
      protocol: "Sovereign Audio Protocol",
      version: PROTOCOL_VERSION,
      self_hosted: true,
      third_party_dependencies: [] as string[],
      module_a: {
        name: "Inbound Forensic Audit Scanner",
        demixer_online: health.online,
        demixer: health.online ? `HTDemucs v4 · ${health.model} · ${health.device}` : "offline",
        detail: health.detail,
        thresholds: CLAIM_THRESHOLDS,
        jobs_total: jobs.length,
        jobs_complete: jobs.filter((j) => j.status === "complete").length,
      },
      module_b: {
        name: "Outbound 4-Valve Export Matrix",
        valves: ["original", "master", "mv3", "model"],
        master_targets: MASTER_TARGETS,
        signer_key_id: keyIdFor(publicKey),
        signature_algorithm: "Ed25519",
        seals_total: seals.length,
      },
    };
  }),

  /** Public key for offline verification of any file this installation sealed. */
  signerKey: authedAllowed.handler(async () => {
    const { publicKey } = await loadSigningKeys();
    return {
      algorithm: "Ed25519",
      key_id: keyIdFor(publicKey),
      public_key_spki_b64: publicKeyB64(publicKey),
      public_key_pem: (publicKey.export({ type: "spki", format: "pem" }) as string).trim(),
    };
  }),

  listAudits: authedAllowed.handler(() =>
    db
      .select({
        jobId: schema.auditJobs.jobId,
        fileName: schema.auditJobs.fileName,
        fileHash: schema.auditJobs.fileHash,
        status: schema.auditJobs.status,
        custodyState: schema.auditJobs.custodyState,
        humanAuthorshipIndex: schema.auditJobs.humanAuthorshipIndex,
        overallVerdict: schema.auditJobs.overallVerdict,
        claimEligibility: schema.auditJobs.claimEligibility,
        durationSec: schema.auditJobs.durationSec,
        notice: schema.auditJobs.notice,
        createdAt: schema.auditJobs.createdAt,
        completedAt: schema.auditJobs.completedAt,
      })
      .from(schema.auditJobs)
      .orderBy(desc(schema.auditJobs.createdAt))
      .limit(40),
  ),

  getAudit: authedAllowed
    .input(z.object({ jobId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const lookup = await getAudit(input.jobId);
      if (lookup.state === "missing") {
        throw new ORPCError("NOT_FOUND", { message: "Audit job not found" });
      }
      if (lookup.state === "pending") {
        return { ready: false as const, pending: lookup };
      }
      return { ready: true as const, result: lookup.result satisfies AuditResult };
    }),

  listSeals: authedAllowed.handler(() =>
    db
      .select({
        sessionId: schema.exportSessions.sessionId,
        manifestId: schema.exportSessions.manifestId,
        title: schema.exportSessions.title,
        creatorName: schema.exportSessions.creatorName,
        rightsType: schema.exportSessions.rightsType,
        crossHash: schema.exportSessions.crossHash,
        signatureKeyId: schema.exportSessions.signatureKeyId,
        packageFileName: schema.exportSessions.packageFileName,
        packageBytes: schema.exportSessions.packageBytes,
        auditJobId: schema.exportSessions.auditJobId,
        createdAt: schema.exportSessions.createdAt,
      })
      .from(schema.exportSessions)
      .orderBy(desc(schema.exportSessions.createdAt))
      .limit(40),
  ),

  getSeal: authedAllowed
    .input(z.object({ sessionId: z.string().min(1) }))
    .handler(async ({ input }) => {
      const [session] = await db
        .select()
        .from(schema.exportSessions)
        .where(eq(schema.exportSessions.sessionId, input.sessionId));
      if (!session) throw new ORPCError("NOT_FOUND", { message: "Export session not found" });

      const valves = await db
        .select()
        .from(schema.exportValves)
        .where(eq(schema.exportValves.sessionId, input.sessionId));

      const sealed = JSON.parse(session.manifestJson) as SealedManifest;
      return {
        session,
        valves,
        manifest: sealed.manifest satisfies AuthorialManifest,
        signature: sealed.signature,
        packagePath: `/api/v1/export/${session.sessionId}/package`,
      };
    }),
};
