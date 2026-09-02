import { audioPayload, findChunk, writeChunks } from "./riff";
import { sha256Hex } from "./crypto";
import { PROTOCOL_VERSION } from "./types";
import type { SealedManifest, ValveDescriptor } from "./types";

/**
 * Broadcast Wave sealing.
 *
 * The manifest is written into the file itself, in the two places the
 * professional audio chain already reads: a `bext` chunk (EBU Tech 3285 —
 * carries the origination record and the loudness metadata every broadcaster
 * ingests) and an `iXML` chunk (carries the full signed manifest as structured
 * XML). A file that leaves this system explains its own provenance to any tool
 * that opens it, with no database lookup and no network call.
 */

const BEXT_FIXED_BYTES = 602;
const IXML_ROOT_OPEN = "<SOVEREIGN_AUDIO_PROTOCOL>";
const IXML_ROOT_CLOSE = "</SOVEREIGN_AUDIO_PROTOCOL>";

function asciiInto(target: Uint8Array, offset: number, text: string, length: number): void {
  const clipped = text.slice(0, length);
  for (let i = 0; i < clipped.length; i += 1) {
    const code = clipped.charCodeAt(i);
    // bext fields are strict 7-bit ASCII; anything else becomes a space.
    target[offset + i] = code >= 0x20 && code <= 0x7e ? code : 0x20;
  }
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeI16(target: Uint8Array, offset: number, value: number): void {
  writeU16(target, offset, value < 0 ? value + 0x10000 : value);
}

/** Loudness fields are signed hundredths of a LU/dB, clamped to int16. */
function loudnessField(value: number): number {
  if (!Number.isFinite(value)) return 0x7fff;
  return Math.max(-32768, Math.min(32767, Math.round(value * 100)));
}

export type BextParams = {
  description: string;
  originator: string;
  originatorReference: string;
  /** UTC instant the seal was created. */
  createdAt: Date;
  codingHistory: string;
  integratedLufs: number;
  loudnessRangeLu: number;
  truePeakDbtp: number;
  maxMomentaryLufs: number;
  maxShortTermLufs: number;
  /** 32-byte UMID material number, hex. Padded into the 64-byte UMID field. */
  umidHex: string;
};

export function buildBextChunk(params: BextParams): Uint8Array {
  const history = `${params.codingHistory}\r\n\0`;
  const out = new Uint8Array(BEXT_FIXED_BYTES + history.length);

  asciiInto(out, 0, params.description, 256);
  asciiInto(out, 256, params.originator, 32);
  asciiInto(out, 288, params.originatorReference, 32);

  const iso = params.createdAt.toISOString();
  asciiInto(out, 320, iso.slice(0, 10), 10); // yyyy-mm-dd
  asciiInto(out, 330, iso.slice(11, 19), 8); // hh:mm:ss

  // TimeReference (samples since midnight) — zero: these are file-relative renders.
  writeU16(out, 346, 2); // Version 2 → loudness fields are meaningful

  const umid = params.umidHex.slice(0, 64);
  for (let i = 0; i + 1 < umid.length; i += 2) {
    out[348 + i / 2] = Number.parseInt(umid.slice(i, i + 2), 16);
  }

  writeI16(out, 412, loudnessField(params.integratedLufs));
  writeI16(out, 414, loudnessField(params.loudnessRangeLu));
  writeI16(out, 416, loudnessField(params.truePeakDbtp));
  writeI16(out, 418, loudnessField(params.maxMomentaryLufs));
  writeI16(out, 420, loudnessField(params.maxShortTermLufs));
  // 422..601 reserved, already zero.

  asciiInto(out, BEXT_FIXED_BYTES, history, history.length);
  return out;
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildIxmlChunk(sealed: SealedManifest, valve: ValveDescriptor): Uint8Array {
  const { manifest, signature } = sealed;
  const permissions = valve.permissions ?? { training_allowed: false, derivatives_allowed: false };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BWFXML>
  <IXML_VERSION>1.52</IXML_VERSION>
  <PROJECT>${escapeXml(manifest.work.title)}</PROJECT>
  <NOTE>${escapeXml(manifest.usco_limitation_of_claim.eCO_statement)}</NOTE>
  <CIRCLED>FALSE</CIRCLED>
  <FILE_UID>${escapeXml(manifest.manifest_id)}</FILE_UID>
  <SOVEREIGN_AUDIO_PROTOCOL>
    <PROTOCOL_VERSION>${escapeXml(manifest.protocol_version)}</PROTOCOL_VERSION>
    <MANIFEST_ID>${escapeXml(manifest.manifest_id)}</MANIFEST_ID>
    <SESSION_ID>${escapeXml(manifest.session_id)}</SESSION_ID>
    <VALVE>${escapeXml(valve.valve)}</VALVE>
    <TIER>${escapeXml(valve.tier)}</TIER>
    <PAYLOAD_SHA256>${escapeXml(valve.sha256)}</PAYLOAD_SHA256>
    <CROSS_HASH>${escapeXml(manifest.cross_hash)}</CROSS_HASH>
    <SIGNER_KEY_ID>${escapeXml(signature.key_id)}</SIGNER_KEY_ID>
    <RIGHTS>
      <TRAINING_ALLOWED>${permissions.training_allowed ? "TRUE" : "FALSE"}</TRAINING_ALLOWED>
      <DERIVATIVES_ALLOWED>${permissions.derivatives_allowed ? "TRUE" : "FALSE"}</DERIVATIVES_ALLOWED>
    </RIGHTS>
    <USCO_LIMITATION_OF_CLAIM>
      <MATERIAL_EXCLUDED>${escapeXml(manifest.usco_limitation_of_claim.material_excluded)}</MATERIAL_EXCLUDED>
      <NEW_MATERIAL_INCLUDED>${escapeXml(manifest.usco_limitation_of_claim.new_material_included)}</NEW_MATERIAL_INCLUDED>
    </USCO_LIMITATION_OF_CLAIM>
    <SEALED_MANIFEST_JSON>${escapeXml(JSON.stringify(sealed))}</SEALED_MANIFEST_JSON>
  </SOVEREIGN_AUDIO_PROTOCOL>
</BWFXML>
`;
  return new TextEncoder().encode(xml);
}

/** Write the `bext` + `iXML` seal into a rendered WAV. */
export function sealWav(params: {
  wav: Uint8Array;
  sealed: SealedManifest;
  valve: ValveDescriptor;
  maxMomentaryLufs: number;
  maxShortTermLufs: number;
}): Uint8Array {
  const { wav, sealed, valve } = params;
  const rights = valve.permissions
    ? `training=${valve.permissions.training_allowed ? "allowed" : "DENIED"}; derivatives=${valve.permissions.derivatives_allowed ? "allowed" : "DENIED"}`
    : "rights per manifest";

  const bext = buildBextChunk({
    description: `${sealed.manifest.work.title} | ${valve.tier} | SAP ${sealed.manifest.manifest_id} | ${rights}`,
    originator: "Sovereign Audio Protocol",
    originatorReference: sealed.manifest.manifest_id,
    createdAt: new Date(sealed.manifest.timestamp_utc),
    codingHistory: [
      `A=PCM,F=${valve.sample_rate},W=32,M=${valve.channels === 1 ? "mono" : "stereo"},T=${valve.treatment}`,
      `A=SAP,F=${valve.sample_rate},T=cross-hash:${sealed.manifest.cross_hash.slice(0, 16)}`,
      `A=SAP,T=signer:${sealed.signature.key_id.slice(0, 16)}`,
    ].join("\r\n"),
    integratedLufs: valve.integrated_lufs,
    loudnessRangeLu: 0,
    truePeakDbtp: valve.true_peak_dbtp,
    maxMomentaryLufs: params.maxMomentaryLufs,
    maxShortTermLufs: params.maxShortTermLufs,
    // UMID material number derived from the payload hash: same audio, same UMID.
    umidHex: valve.sha256,
  });

  return writeChunks(wav, [
    { id: "bext", data: bext },
    { id: "iXML", data: buildIxmlChunk(sealed, valve) },
  ]);
}

/** Recover a seal from a WAV, or null when the file carries none. */
export function readSeal(wav: Uint8Array): SealedManifest | null {
  let ixml: Uint8Array | null;
  try {
    ixml = findChunk(wav, "iXML");
  } catch {
    return null;
  }
  if (!ixml) return null;

  const text = new TextDecoder().decode(ixml);
  const open = text.indexOf("<SEALED_MANIFEST_JSON>");
  const close = text.indexOf("</SEALED_MANIFEST_JSON>");
  if (open === -1 || close === -1 || close < open) return null;

  const encoded = text.slice(open + "<SEALED_MANIFEST_JSON>".length, close);
  const json = encoded
    .replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
  try {
    const parsed = JSON.parse(json) as SealedManifest;
    if (!parsed?.manifest || !parsed?.signature) return null;
    if (parsed.manifest.protocol_version !== PROTOCOL_VERSION) {
      // Still return it — version drift is the caller's decision, not a parse error.
      return parsed;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** SHA-256 of the bit-exact PCM payload, ignoring all metadata. */
export function payloadHash(wav: Uint8Array): string {
  return sha256Hex(audioPayload(wav));
}

export { IXML_ROOT_CLOSE, IXML_ROOT_OPEN };
