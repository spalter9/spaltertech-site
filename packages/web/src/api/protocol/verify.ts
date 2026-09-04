import { payloadHash, readSeal } from "./bwf";
import { computeCrossHash, verifyManifestSignature } from "./crypto";
import type { VerifyResult, ValveId } from "./types";

/**
 * Standalone verification.
 *
 * Everything needed to check a file is inside the file. No database lookup, no
 * key server, no call home — which is the point: a sealed file that only this
 * installation can verify would be a claim, not proof.
 */
export function verifySealedFile(bytes: Uint8Array): VerifyResult {
  const sealed = readSeal(bytes);
  if (!sealed) {
    return { verified: false, reason: "No protocol manifest found in this file." };
  }

  const { manifest, signature } = sealed;

  if (!verifyManifestSignature(manifest, signature)) {
    return {
      verified: false,
      reason: "Manifest signature does not verify — the manifest has been altered.",
      manifest,
      signature,
    };
  }

  let recomputed: string;
  try {
    recomputed = payloadHash(bytes);
  } catch {
    return {
      verified: false,
      reason: "File is not a readable WAV container.",
      manifest,
      signature,
    };
  }

  const entries = Object.entries(manifest.four_valves) as [
    ValveId,
    (typeof manifest.four_valves)[ValveId],
  ][];
  const match = entries.find(([, descriptor]) => descriptor.sha256 === recomputed);

  const declaredCrossHash = computeCrossHash(entries.map(([, d]) => d.sha256));
  if (declaredCrossHash !== manifest.cross_hash) {
    return {
      verified: false,
      reason: "Cross-hash does not match the four payload hashes inside the manifest.",
      manifest,
      signature,
      payload_sha256: recomputed,
      payload_matches: false,
    };
  }

  if (!match) {
    return {
      verified: false,
      reason:
        "Signature is valid but this file's audio does not match any of the four sealed payload hashes — the audio has been edited since sealing.",
      manifest,
      signature,
      payload_sha256: recomputed,
      payload_matches: false,
    };
  }

  return {
    verified: true,
    reason: `Verified as the ${match[0].toUpperCase()} valve of ${manifest.manifest_id}, signed by ${signature.key_id.slice(0, 16)}.`,
    manifest,
    signature,
    payload_sha256: recomputed,
    payload_matches: true,
    valve: match[0],
  };
}
