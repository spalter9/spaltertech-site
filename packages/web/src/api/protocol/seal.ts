import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { ingestToFloat32 } from "../audio/ingest";
import { encodeWavFloat32 } from "../audio/wav";
import { payloadHash, sealWav } from "./bwf";
import { computeCrossHash, sha256Hex, signManifest } from "./crypto";
import { EXPORT_DIR } from "./paths";
import { renderExaminerDossier } from "./usco";
import {
  MANIFEST_SCHEMA_URL,
  PROTOCOL_VERSION,
  type AuditResult,
  type AuthorialManifest,
  type ProvenanceLayer,
  type SealResult,
  type SealedManifest,
  type UscoLimitationOfClaim,
  type ValveDescriptor,
  type ValveId,
  type ValveTier,
} from "./types";
import {
  measureValve,
  renderMaster,
  renderModel,
  renderMv3,
  renderOriginal,
  type ValveRender,
} from "./valves";
import { buildZip, type ZipEntry } from "./zip";

/**
 * MODULE B — outbound 4-valve export matrix.
 *
 * One export event produces four distinct files, four payload hashes, one
 * cross-hash binding them, one Ed25519 signature over the manifest, and one
 * copy of that signed manifest written into every file's own header. After
 * this runs, each of the four files can prove three things on its own: what it
 * is, what the other three are, and that nobody has edited any of them since.
 */

const VALVE_ORDER: ValveId[] = ["original", "master", "mv3", "model"];

const TIERS: Record<ValveId, ValveTier> = {
  original: "ARCHIVAL_VAULT",
  master: "STREAMING_DSP",
  mv3: "BROADCAST_SYNC",
  model: "MACHINE_INGESTION",
};

const FILE_SUFFIX: Record<ValveId, string> = {
  original: "Original_Vault",
  master: "DSP_Master",
  mv3: "Sync_MV3",
  model: "AI_Model",
};

export type SealInput = {
  bytes: Uint8Array;
  fileName: string;
  title: string;
  creatorName: string;
  rightsType: "MASTER" | "COMPOSITION" | "NEIGHBORING";
  isrc?: string;
  iswc?: string;
  /** Declared layers. Derived from the audit when one is cited and none given. */
  provenance?: ProvenanceLayer[];
  /** Module A job to bind this seal to. */
  auditJobId?: string;
};

function slugify(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replaceAll(/[^A-Za-z0-9]+/g, "_")
      .replaceAll(/^_+|_+$/g, "")
      .slice(0, 60) || "Session"
  );
}

/** Turn a completed audit into the manifest's provenance and claim language. */
function fromAudit(audit: AuditResult): {
  layers: ProvenanceLayer[];
  limitation: UscoLimitationOfClaim;
} {
  const labels: Record<string, string> = {
    vocals: "Lead & Background Vocal",
    drums: "Rhythm Foundation",
    bass_and_harmony: "Bass & Harmonic Textures",
  };

  const layers: ProvenanceLayer[] = audit.stems.map((stem) => {
    if (stem.copyright_status === "CLAIMABLE") {
      return {
        layer: labels[stem.stem] ?? stem.stem,
        type: "HUMAN_PERFORMANCE",
        source: `forensic audit ${audit.job_id} · human score ${(stem.human_score * 100).toFixed(1)}/100`,
      };
    }
    if (stem.copyright_status === "MUST_EXCLUDE") {
      return {
        layer: labels[stem.stem] ?? stem.stem,
        type: "AI_GENERATED_DISCLAIMED",
        human_treatment: "Disclaimed in full — no human authorship claimed in this layer",
      };
    }
    return {
      layer: labels[stem.stem] ?? stem.stem,
      type: "HYBRID_HUMAN_DIRECTED",
      human_treatment: "Human selection, arrangement, editing, and dynamic treatment",
    };
  });

  return {
    layers,
    limitation: {
      material_excluded: audit.usco_filing_dossier.material_excluded,
      new_material_included: audit.usco_filing_dossier.new_material_included,
      eCO_statement: audit.usco_filing_dossier.eCO_copy_paste_text,
    },
  };
}

const UNAUDITED_LIMITATION: UscoLimitationOfClaim = {
  material_excluded:
    "Not established by forensic examination. No machine-generated material is disclaimed on the basis of this seal alone.",
  new_material_included:
    "Sound recording as fixed, as declared by the rights holder at the time of export.",
  eCO_statement:
    "This export was sealed without a completed forensic authorship examination. The declarations above are the rights holder's own and are not supported by stem-level analysis. Run an inbound audit and re-seal to attach an examined limitation of claim.",
};

export async function sealExport(input: SealInput): Promise<SealResult> {
  const source = await ingestToFloat32(input.bytes, input.fileName);

  const sessionId = `exp_${randomBytes(5).toString("hex")}`;
  const createdAt = new Date();
  const manifestId = `man_${randomBytes(4).toString("hex")}_${createdAt.getUTCFullYear()}`;
  const slug = slugify(input.title);

  let audit: AuditResult | undefined;
  if (input.auditJobId) {
    const [job] = await db
      .select()
      .from(schema.auditJobs)
      .where(eq(schema.auditJobs.jobId, input.auditJobId));
    if (job?.resultJson) audit = JSON.parse(job.resultJson) as AuditResult;
  }

  // 1 — render all four tiers from the same decoded source.
  const renders: Record<ValveId, ValveRender> = {
    original: renderOriginal(source),
    master: renderMaster(source),
    mv3: renderMv3(source),
    model: renderModel(source),
  };

  // 2 — encode, measure, and hash the bit-exact payload of each tier.
  const encoded = new Map<ValveId, Uint8Array>();
  const descriptors: ValveDescriptor[] = [];

  for (const valve of VALVE_ORDER) {
    const render = renders[valve];
    const wav = encodeWavFloat32(render.audio);
    encoded.set(valve, wav);

    const measurement = measureValve(render.audio);
    const filename = `${slug}_${FILE_SUFFIX[valve]}.wav`;

    descriptors.push({
      valve,
      filename,
      tier: TIERS[valve],
      sha256: payloadHash(wav),
      byte_length: wav.byteLength,
      sample_rate: render.audio.sampleRate,
      channels: render.audio.channels,
      bit_depth: 32,
      duration_sec: measurement.durationSec,
      integrated_lufs: measurement.integratedLufs,
      true_peak_dbtp: measurement.truePeakDbtp,
      treatment: render.treatment,
      ...(valve === "master" ? { lufs: measurement.integratedLufs } : {}),
      ...(valve === "mv3" ? { pre_cleared: true } : {}),
      ...(valve === "model"
        ? { permissions: { training_allowed: false, derivatives_allowed: false } }
        : {}),
    });
  }

  // 3 — bind the four payload hashes into one cross-hash.
  const crossHash = computeCrossHash(descriptors.map((d) => d.sha256));

  const derived = audit ? fromAudit(audit) : null;
  const manifest: AuthorialManifest = {
    $schema: MANIFEST_SCHEMA_URL,
    manifest_id: manifestId,
    protocol_version: PROTOCOL_VERSION,
    timestamp_utc: createdAt.toISOString(),
    session_id: sessionId,
    work: {
      title: input.title,
      creator: input.creatorName,
      rights_type: input.rightsType,
      ...(input.isrc ? { isrc: input.isrc } : {}),
      ...(input.iswc ? { iswc: input.iswc } : {}),
    },
    four_valves: Object.fromEntries(
      descriptors.map(({ valve, ...rest }) => [valve, rest]),
    ) as AuthorialManifest["four_valves"],
    cross_hash: crossHash,
    provenance_breakdown: input.provenance?.length
      ? input.provenance
      : (derived?.layers ?? [
          {
            layer: "Sound Recording",
            type: "HUMAN_PERFORMANCE",
            performer: input.creatorName,
            source: "Declared by rights holder at export",
          },
        ]),
    usco_limitation_of_claim: derived?.limitation ?? UNAUDITED_LIMITATION,
    ...(audit
      ? {
          audit_reference: {
            job_id: audit.job_id,
            file_hash: audit.file_hash,
            human_authorship_index: audit.human_authorship_index,
            overall_verdict: audit.overall_verdict,
          },
        }
      : {}),
  };

  // 4 — sign once; the same signature travels inside all four files.
  const signature = await signManifest(manifest);
  const sealed: SealedManifest = { manifest, signature };

  // 5 — inject the seal, then hash what actually ships.
  const dir = join(EXPORT_DIR, sessionId);
  await mkdir(dir, { recursive: true });

  const sealedFileHashes = {} as Record<ValveId, string>;
  const zipEntries: ZipEntry[] = [];

  for (const descriptor of descriptors) {
    const raw = encoded.get(descriptor.valve)!;
    const measurement = measureValve(renders[descriptor.valve].audio);
    const sealedBytes = sealWav({
      wav: raw,
      sealed,
      valve: descriptor,
      maxMomentaryLufs: measurement.maxMomentaryLufs,
      maxShortTermLufs: measurement.maxShortTermLufs,
    });

    const filePath = join(dir, descriptor.filename);
    await writeFile(filePath, sealedBytes);

    const sealedHash = sha256Hex(sealedBytes);
    sealedFileHashes[descriptor.valve] = sealedHash;
    zipEntries.push({ name: descriptor.filename, data: sealedBytes });

    await db.insert(schema.exportValves).values({
      sessionId,
      valve: descriptor.valve,
      tier: descriptor.tier,
      fileName: descriptor.filename,
      filePath,
      payloadSha256: descriptor.sha256,
      sealedSha256: sealedHash,
      byteLength: sealedBytes.byteLength,
      sampleRate: descriptor.sample_rate,
      channels: descriptor.channels,
      durationSec: descriptor.duration_sec,
      integratedLufs: descriptor.integrated_lufs,
      truePeakDbtp: descriptor.true_peak_dbtp,
      treatment: descriptor.treatment,
    });
  }

  // 6 — package: the four tiers, the signed manifest, a delivery receipt, and
  // the examiner dossier when this seal cites an audit.
  const manifestJson = `${JSON.stringify(sealed, null, 2)}\n`;
  zipEntries.push({ name: "manifest.json", data: new TextEncoder().encode(manifestJson) });

  const receipt = buildReceipt({ sealed, descriptors, sealedFileHashes, createdAt });
  zipEntries.push({ name: "DELIVERY_RECEIPT.txt", data: new TextEncoder().encode(receipt) });

  if (audit) {
    zipEntries.push({
      name: `USCO_Examiner_Dossier_${audit.job_id}.pdf`,
      data: renderExaminerDossier(audit),
    });
  }

  const packageFileName = `${slug}_SAP_${manifestId}.zip`;
  const packageBytes = buildZip(zipEntries, createdAt);
  const packagePath = join(dir, packageFileName);
  await writeFile(packagePath, packageBytes);
  await writeFile(join(dir, "manifest.json"), manifestJson, "utf8");

  await db.insert(schema.exportSessions).values({
    sessionId,
    manifestId,
    title: input.title,
    creatorName: input.creatorName,
    rightsType: input.rightsType,
    isrc: input.isrc,
    crossHash,
    signatureKeyId: signature.key_id,
    packageFileName,
    packagePath,
    packageBytes: packageBytes.byteLength,
    manifestJson,
    auditJobId: input.auditJobId,
  });

  return {
    session_id: sessionId,
    manifest_id: manifestId,
    cross_hash: crossHash,
    valves: descriptors,
    signature,
    package_filename: packageFileName,
    package_bytes: packageBytes.byteLength,
    sealed_file_hashes: sealedFileHashes,
    created_at: createdAt.toISOString(),
  };
}

function buildReceipt(params: {
  sealed: SealedManifest;
  descriptors: ValveDescriptor[];
  sealedFileHashes: Record<ValveId, string>;
  createdAt: Date;
}): string {
  const { sealed, descriptors, sealedFileHashes } = params;
  const lines: string[] = [
    "SOVEREIGN AUDIO PROTOCOL — DELIVERY RECEIPT",
    "===========================================",
    "",
    `Work            : ${sealed.manifest.work.title}`,
    `Creator         : ${sealed.manifest.work.creator}`,
    `Manifest        : ${sealed.manifest.manifest_id}`,
    `Session         : ${sealed.manifest.session_id}`,
    `Sealed (UTC)    : ${sealed.manifest.timestamp_utc}`,
    `Cross-hash      : ${sealed.manifest.cross_hash}`,
    `Signer key id   : ${sealed.signature.key_id}`,
    `Signature       : Ed25519, detached over canonical manifest JSON`,
    "",
    "FOUR VALVES",
    "-----------",
  ];

  for (const descriptor of descriptors) {
    lines.push(
      `${descriptor.valve.toUpperCase()} — ${descriptor.tier}`,
      `  file            : ${descriptor.filename}`,
      `  treatment       : ${descriptor.treatment}`,
      `  audio payload   : sha256:${descriptor.sha256}`,
      `  delivered file  : sha256:${sealedFileHashes[descriptor.valve]}`,
      `  measured        : ${descriptor.integrated_lufs.toFixed(2)} LUFS · ${descriptor.true_peak_dbtp.toFixed(2)} dBTP · ${descriptor.sample_rate} Hz · ${descriptor.channels} ch · 32-bit float`,
      "",
    );
  }

  lines.push(
    "HOW TO VERIFY",
    "-------------",
    "The audio payload hash covers the WAV data chunk only, so it stays valid",
    "even after metadata is rewritten. The delivered-file hash covers the whole",
    "sealed file exactly as shipped.",
    "",
    "  1. Read the iXML chunk of any of the four files to recover the manifest.",
    "  2. Verify the Ed25519 signature over the canonical manifest JSON.",
    "  3. Recompute each file's data-chunk SHA-256 and compare to the manifest.",
    "  4. Recompute the cross-hash: sha256 of the four payload hashes, sorted",
    "     ascending and joined with '|'.",
    "",
    "Any single altered tier breaks step 3 for that file and step 4 for all four.",
    "",
    "LIMITATION OF CLAIM",
    "-------------------",
    sealed.manifest.usco_limitation_of_claim.eCO_statement,
    "",
  );

  return lines.join("\n");
}
