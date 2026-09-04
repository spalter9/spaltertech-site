import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { ingestToFloat32 } from "../audio/ingest";
import { analyseContainer } from "./container";
import { evaluateDelivery } from "./delivery-targets";
import { sha256Hex, verifyManifestSignature } from "./crypto";
import { demixerHealth, runDemixAnalysis } from "./demixer";
import { readSeal } from "./bwf";
import { AUDIT_DIR } from "./paths";
import {
  STEM_GROUP,
  authorshipIndex,
  claimEligibility,
  overallVerdict,
  scoreStem,
  type RawStemMeasurement,
} from "./scoring";
import { buildDossier } from "./usco";
import { PROTOCOL_VERSION } from "./types";
import type {
  AuditResult,
  CustodyState,
  DiscreteStemAnalysis,
  ExaminerStem,
  StemAnalysis,
} from "./types";

/**
 * MODULE A — inbound forensic audit scanner.
 *
 * Intake fixes custody before anything else touches the bytes; separation and
 * per-source measurement run on the operator's own worker; scoring is applied
 * locally by a deterministic policy. The pipeline is deliberately willing to
 * return "I could not measure this" — every state that is not a clean audit is
 * reported as such rather than smoothed over.
 */

const DSP_STACK = "librosa/scipy · BS.1770-4 · STFT phase forensics";

type QueueTask = () => Promise<void>;

/**
 * Single-lane queue. The worker serialises GPU work anyway, so running audits
 * one at a time here keeps `queue_position` truthful instead of decorative.
 */
class AuditQueue {
  private pending: QueueTask[] = [];
  private running = false;

  get depth(): number {
    return this.pending.length + (this.running ? 1 : 0);
  }

  push(task: QueueTask): void {
    this.pending.push(task);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.pending.length > 0) {
      const task = this.pending.shift();
      if (!task) break;
      try {
        await task();
      } catch (err) {
        // A task failure is already recorded against its job row; never let it
        // take the lane down with it.
        console.error("[sovereign-audio-protocol] audit task failed:", err);
      }
    }
    this.running = false;
  }
}

const queue = new AuditQueue();

/**
 * Largest container the API will accept, in bytes.
 *
 * Intake buffers the upload to hash it before anything else touches it, so an
 * unbounded body is an unbounded allocation. The worker enforces its own limit
 * separately; this one protects the API process.
 */
export const MAX_UPLOAD_BYTES = (() => {
  const raw = Number(process.env.SAP_MAX_UPLOAD_BYTES);
  return Number.isFinite(raw) && raw > 0 ? raw : 512 * 1024 * 1024;
})();

let reconciled = false;

/**
 * Clear jobs that a restart caught mid-flight.
 *
 * The queue lives in this process, so anything left `queued` or `processing`
 * after a restart will never be picked up again. Those rows are closed out as
 * interrupted rather than re-queued: a job that took the process down would
 * otherwise take it down again on every boot.
 */
export async function reconcileInterruptedJobs(): Promise<number> {
  if (reconciled) return 0;
  reconciled = true;
  const stranded = await db
    .select({ jobId: schema.auditJobs.jobId })
    .from(schema.auditJobs)
    .where(inArray(schema.auditJobs.status, ["queued", "processing"]));
  if (stranded.length === 0) return 0;

  await db
    .update(schema.auditJobs)
    .set({
      status: "failed",
      notice:
        "Interrupted by a server restart before the examination finished. Nothing was reported; resubmit the container to run it again.",
      completedAt: new Date(),
    })
    .where(inArray(schema.auditJobs.status, ["queued", "processing"]));

  console.warn(
    `[sovereign-audio-protocol] closed ${stranded.length} audit job(s) stranded by a restart`,
  );
  return stranded.length;
}

export type ScanAccepted = {
  job_id: string;
  status: "processing";
  sha256: string;
  queue_position: number;
};

const ACCEPTED_EXTENSIONS = [".wav", ".aif", ".aiff", ".flac", ".mp3"];

export function isAcceptedAudio(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Read any manifest already embedded in the container and check its signature. */
function inspectCustody(bytes: Uint8Array): { state: CustodyState; detail?: string } {
  const sealed = readSeal(bytes);
  if (!sealed) return { state: "LEGACY_UNVERIFIED" };
  const valid = verifyManifestSignature(sealed.manifest, sealed.signature);
  return {
    state: valid ? "SEALED_VERIFIED" : "SEALED_TAMPERED",
    detail: valid
      ? `Sealed by ${sealed.signature.key_id.slice(0, 16)} as manifest ${sealed.manifest.manifest_id}.`
      : `Container carries manifest ${sealed.manifest.manifest_id} but the signature does not verify. Treat the file as altered.`,
  };
}

/**
 * Intake. Hashes and persists the container, records custody, and queues the
 * examination. Returns as soon as custody is fixed — analysis runs behind it.
 */
export async function startAudit(params: {
  bytes: Uint8Array;
  fileName: string;
}): Promise<ScanAccepted> {
  await reconcileInterruptedJobs();

  if (params.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Container is ${(params.bytes.byteLength / 1048576).toFixed(1)} MB; the intake limit is ${(MAX_UPLOAD_BYTES / 1048576).toFixed(0)} MB.`,
    );
  }

  const jobId = `aud_${randomBytes(5).toString("hex")}`;
  const fileHash = sha256Hex(params.bytes);

  const dir = join(AUDIT_DIR, jobId);
  await mkdir(dir, { recursive: true });
  const safeName = params.fileName.replaceAll(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "source.wav";
  const filePath = join(dir, safeName);
  await writeFile(filePath, params.bytes);

  const custody = inspectCustody(params.bytes);

  await db.insert(schema.auditJobs).values({
    jobId,
    fileName: params.fileName,
    fileHash,
    filePath,
    byteLength: params.bytes.byteLength,
    status: "queued",
    custodyState: custody.state,
    notice: custody.detail,
  });

  const position = queue.depth;
  queue.push(() => processAudit(jobId));

  return { job_id: jobId, status: "processing", sha256: fileHash, queue_position: position };
}

/** Merge the measurements of two discrete stems by energy share. */
function mergeMeasurements(parts: RawStemMeasurement[]): {
  features: Record<string, number>;
  energyShare: number;
} {
  const totalEnergy = parts.reduce((acc, p) => acc + Math.max(0, p.energy_share), 0);
  const features: Record<string, number> = {};
  const keys = new Set(parts.flatMap((p) => Object.keys(p.features)));

  for (const key of keys) {
    let weightSum = 0;
    let acc = 0;
    for (const part of parts) {
      const value = part.features[key];
      if (value === undefined || !Number.isFinite(value)) continue;
      // Weight by energy so a near-silent stem cannot drag the merged reading.
      const weight = totalEnergy > 0 ? Math.max(0, part.energy_share) : 1;
      acc += value * weight;
      weightSum += weight;
    }
    if (weightSum > 0) features[key] = acc / weightSum;
  }

  return { features, energyShare: totalEnergy };
}

async function markFailed(jobId: string, notice: string): Promise<void> {
  await db
    .update(schema.auditJobs)
    .set({ status: "failed", notice, completedAt: new Date() })
    .where(eq(schema.auditJobs.jobId, jobId));
}

async function processAudit(jobId: string): Promise<void> {
  const [job] = await db.select().from(schema.auditJobs).where(eq(schema.auditJobs.jobId, jobId));
  if (!job) return;

  await db
    .update(schema.auditJobs)
    .set({ status: "processing" })
    .where(eq(schema.auditJobs.jobId, jobId));

  const { readFile } = await import("node:fs/promises");
  let bytes: Uint8Array;
  try {
    bytes = await readFile(job.filePath);
  } catch {
    await markFailed(jobId, "Source container missing from disk.");
    return;
  }

  let audio;
  try {
    audio = await ingestToFloat32(bytes, job.fileName);
  } catch (err) {
    await markFailed(
      jobId,
      err instanceof Error
        ? `Decode failed: ${err.message}`
        : "Decode failed: unsupported container.",
    );
    return;
  }

  const container = analyseContainer(audio);
  const health = await demixerHealth();

  // Delivery readiness is independent of authorship: it depends only on the
  // container's measured loudness, so it is reported even when separation
  // never ran and no verdict is possible.
  const delivery = evaluateDelivery(container.integrated_lufs, container.true_peak_dbtp);

  const base = {
    job_id: jobId,
    file_hash: job.fileHash,
    file_name: job.fileName,
    custody_state: job.custodyState as CustodyState,
    duration_sec: round(audio.length / audio.sampleRate, 3),
    sample_rate: audio.sampleRate,
    channels: audio.channels,
    container,
    delivery,
    analyzed_at: new Date().toISOString(),
    engine: {
      demixer: health.online ? `HTDemucs v4 (${health.model}, ${health.device})` : "unavailable",
      demixer_online: health.online,
      dsp: DSP_STACK,
      protocol_version: PROTOCOL_VERSION,
    },
  };

  if (!health.online) {
    // No separation means no per-source evidence. Say so plainly and stop —
    // a whole-mix reading is not an examiner-grade finding and must not be
    // dressed up as one.
    const result: AuditResult = {
      ...base,
      status: "degraded_no_demix",
      human_authorship_index: 0,
      overall_verdict: "INDETERMINATE",
      claim_eligibility: "UNDETERMINED",
      stems: [],
      discrete_stems: [],
      usco_filing_dossier: {
        material_excluded:
          "Not determined — stem separation was unavailable, so no per-source finding was made.",
        new_material_included:
          "Not determined — stem separation was unavailable, so no per-source finding was made.",
        eCO_copy_paste_text:
          "No filing text is issued for this job. The separation worker was offline, so the analysis covers the mixed container only and cannot support a limitation of claim.",
        limitation_required: false,
        claim_blocked: true,
      },
      notice: `Separation worker offline${health.detail ? ` (${health.detail})` : ""}. Container preflight completed; per-stem examination did not run. This is not an examiner-grade result.`,
    };
    await saveResult(jobId, result);
    return;
  }

  let analysis;
  try {
    analysis = await runDemixAnalysis({ bytes, fileName: job.fileName });
  } catch (err) {
    await markFailed(
      jobId,
      err instanceof Error ? `Separation failed: ${err.message}` : "Separation failed.",
    );
    return;
  }

  const discrete: DiscreteStemAnalysis[] = analysis.stems.map((raw) => {
    const group = STEM_GROUP[raw.stem] ?? "bass_and_harmony";
    return { ...scoreStem(group, raw.features, raw.energy_share), discrete_stem: raw.stem };
  });

  const byGroup = new Map<ExaminerStem, RawStemMeasurement[]>();
  for (const raw of analysis.stems) {
    const group = STEM_GROUP[raw.stem] ?? "bass_and_harmony";
    byGroup.set(group, [...(byGroup.get(group) ?? []), raw]);
  }

  const order: ExaminerStem[] = ["vocals", "drums", "bass_and_harmony"];
  const stems: StemAnalysis[] = order
    .filter((group) => byGroup.has(group))
    .map((group) => {
      const merged = mergeMeasurements(byGroup.get(group)!);
      return scoreStem(group, merged.features, merged.energyShare);
    });

  const index = authorshipIndex(stems);
  const result: AuditResult = {
    ...base,
    status: "complete",
    human_authorship_index: index,
    overall_verdict: overallVerdict(index, stems),
    claim_eligibility: claimEligibility(index, stems),
    stems,
    discrete_stems: discrete,
    usco_filing_dossier: buildDossier(stems, index),
    engine: {
      ...base.engine,
      demixer: `HTDemucs v4 (${analysis.model}, ${analysis.device})`,
    },
    notice:
      job.custodyState === "SEALED_TAMPERED"
        ? "Container carries a protocol manifest whose signature does not verify — the file has been altered since sealing."
        : undefined,
  };

  await saveResult(jobId, result);
}

async function saveResult(jobId: string, result: AuditResult): Promise<void> {
  await db
    .update(schema.auditJobs)
    .set({
      status: result.status,
      humanAuthorshipIndex: result.human_authorship_index,
      overallVerdict: result.overall_verdict,
      claimEligibility: result.claim_eligibility,
      durationSec: result.duration_sec,
      sampleRate: result.sample_rate,
      channels: result.channels,
      resultJson: JSON.stringify(result),
      notice: result.notice,
      completedAt: new Date(),
    })
    .where(eq(schema.auditJobs.jobId, jobId));
}

export type AuditLookup =
  | { state: "missing" }
  | { state: "pending"; job_id: string; status: string; sha256: string; queue_position: number }
  | { state: "ready"; result: AuditResult };

export async function getAudit(jobId: string): Promise<AuditLookup> {
  await reconcileInterruptedJobs();
  const [job] = await db.select().from(schema.auditJobs).where(eq(schema.auditJobs.jobId, jobId));
  if (!job) return { state: "missing" };

  if (job.resultJson) {
    return { state: "ready", result: JSON.parse(job.resultJson) as AuditResult };
  }

  if (job.status === "failed") {
    return {
      state: "pending",
      job_id: job.jobId,
      status: "failed",
      sha256: job.fileHash,
      queue_position: 0,
    };
  }

  return {
    state: "pending",
    job_id: job.jobId,
    status: job.status,
    sha256: job.fileHash,
    queue_position: queue.depth,
  };
}

function round(value: number, places: number): number {
  const f = Math.pow(10, places);
  return Math.round(value * f) / f;
}
