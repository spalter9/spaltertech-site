import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ingestToFloat32 } from "./ingest";
import { runDspChain } from "./dsp/chain";
import { verifyForensics } from "./forensics";
import { stampWithSsp } from "./stamp";
import { encodeWavFloat32 } from "./wav";
import { DSP_PROFILES, type DspProfileId, type OwnershipMetadata, type RenderResult } from "./types";
import { db } from "../database";
import * as schema from "../database/schema";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const MASTERS_DIR = join(PACKAGE_ROOT, ".data", "masters");

export async function renderFloat32Master(params: {
  fileBytes: Uint8Array;
  fileName: string;
  profileId: DspProfileId;
  ownership: OwnershipMetadata;
}): Promise<RenderResult> {
  const profile = DSP_PROFILES[params.profileId];
  if (!profile) throw new Error(`Unknown DSP profile: ${params.profileId}`);

  const ingested = await ingestToFloat32(params.fileBytes, params.fileName);
  const processed = runDspChain(ingested, profile);
  const forensic = verifyForensics(processed);
  if (!forensic.passed) {
    const failed = forensic.checks.filter((c) => !c.passed).map((c) => c.label);
    throw new Error(`Forensic gate failed: ${failed.join(", ")}`);
  }

  const wavBytes = encodeWavFloat32(processed);
  const durationSec = processed.length / processed.sampleRate;
  const stamp = await stampWithSsp({
    wavBytes,
    ownership: params.ownership,
    forensic,
    profileId: profile.id,
    sampleRate: processed.sampleRate,
    durationSec,
  });

  await mkdir(MASTERS_DIR, { recursive: true });
  const masterId = stamp.assetKey.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const fileName = `${masterId}.wav`;
  const filePath = join(MASTERS_DIR, fileName);
  await writeFile(filePath, wavBytes);

  const stems = JSON.stringify([
    { name: "Float32 Master", confidence: 1 },
    { name: "Mid Channel", confidence: 0.99 },
    { name: "Side Channel", confidence: 0.98 },
  ]);
  const forensicLayers = JSON.stringify(
    forensic.checks.map((c) => ({
      attribution: c.label,
      confidence: c.passed ? 0.99 : 0.2,
      detail: c.detail,
    })),
  );

  await db.insert(schema.stemJobs).values({
    trackTitle: params.ownership.title,
    status: "complete",
    progress: 100,
    stems,
    forensicLayers,
    provenanceHash: stamp.provenanceHash,
    assetKey: stamp.assetKey,
  });

  await db.insert(schema.float32Masters).values({
    masterId,
    assetKey: stamp.assetKey,
    title: params.ownership.title,
    creatorName: params.ownership.creatorName,
    profileId: profile.id,
    fileName,
    filePath,
    byteLength: wavBytes.byteLength,
    sampleRate: processed.sampleRate,
    channels: processed.channels,
    durationSec,
    assetHash: stamp.assetHash,
    provenanceHash: stamp.provenanceHash,
    ledgerTxHash: stamp.ledgerTxHash,
    anchorTxHash: stamp.anchorTxHash,
    forensicJson: JSON.stringify(forensic),
    status: "stamped",
  });

  return {
    masterId,
    assetKey: stamp.assetKey,
    provenanceHash: stamp.provenanceHash,
    assetHash: stamp.assetHash,
    ledgerTxHash: stamp.ledgerTxHash,
    anchorTxHash: stamp.anchorTxHash,
    sampleRate: processed.sampleRate,
    channels: processed.channels,
    durationSec,
    profileId: profile.id,
    forensic,
    fileName,
    byteLength: wavBytes.byteLength,
  };
}
