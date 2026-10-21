/**
 * Byte-level carriage of an SSP credential inside an image container.
 *
 * The credential is *added* as one self-contained unit — a PNG iTXt chunk or a
 * JPEG APP15 segment — and nothing else in the file is touched. Every pixel,
 * every existing metadata block, and every existing provenance record (C2PA,
 * XMP, generator text chunks) passes through byte-for-byte. Removing our unit
 * therefore reproduces the original upload exactly, which is what lets a
 * verifier recompute the content hash the credential was signed over.
 */

export type ImageFormat = "png" | "jpeg" | "webp" | "gif" | "mp4" | "unknown";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_KEYWORD = "ssp:credential";
/** APP15 payloads start with this tag so we never mistake another writer's APP15 for ours. */
const JPEG_TAG = "SSPCRED\0";
const JPEG_MAX_SEGMENT_PAYLOAD = 0xffff - 2;

export function sniffFormat(bytes: Uint8Array): ImageFormat {
  if (PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 0, 4) === "GIF8") return "gif";
  if (ascii(bytes, 4, 4) === "ftyp") return "mp4";
  return "unknown";
}

export function canEmbed(format: ImageFormat): boolean {
  return format === "png" || format === "jpeg";
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function readU32(bytes: Uint8Array, at: number): number {
  return ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
}

function writeU32(out: Uint8Array, at: number, value: number) {
  out[at] = (value >>> 24) & 0xff;
  out[at + 1] = (value >>> 16) & 0xff;
  out[at + 2] = (value >>> 8) & 0xff;
  out[at + 3] = value & 0xff;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ─────────────────────────── PNG ─────────────────────────── */

export type PngChunk = { type: string; start: number; end: number; data: Uint8Array };

export function pngChunks(bytes: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let at = 8;
  while (at + 12 <= bytes.byteLength) {
    const length = readU32(bytes, at);
    const type = ascii(bytes, at + 4, 4);
    const end = at + 12 + length;
    if (end > bytes.byteLength) break;
    chunks.push({ type, start: at, end, data: bytes.subarray(at + 8, at + 8 + length) });
    at = end;
    if (type === "IEND") break;
  }
  return chunks;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.byteLength);
  writeU32(out, 0, data.byteLength);
  const typeBytes = new TextEncoder().encode(type);
  out.set(typeBytes, 4);
  out.set(data, 8);
  writeU32(out, 8 + data.byteLength, crc32(out.subarray(4, 8 + data.byteLength)));
  return out;
}

function isOurPngChunk(chunk: PngChunk): boolean {
  if (chunk.type !== "iTXt") return false;
  const nul = chunk.data.indexOf(0);
  return nul > 0 && new TextDecoder().decode(chunk.data.subarray(0, nul)) === PNG_KEYWORD;
}

/* ─────────────────────────── JPEG ─────────────────────────── */

type JpegSegment = { marker: number; start: number; end: number; payload: Uint8Array };

/** Header segments up to (not including) the first SOS. Markers without a length are not expected here. */
function jpegHeaderSegments(bytes: Uint8Array): JpegSegment[] {
  const segments: JpegSegment[] = [];
  let at = 2;
  while (at + 4 <= bytes.byteLength && bytes[at] === 0xff) {
    const marker = bytes[at + 1]!;
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[at + 2]! << 8) | bytes[at + 3]!;
    const end = at + 2 + length;
    if (length < 2 || end > bytes.byteLength) break;
    segments.push({ marker, start: at, end, payload: bytes.subarray(at + 4, end) });
    at = end;
  }
  return segments;
}

function isOurJpegSegment(seg: JpegSegment): boolean {
  return seg.marker === 0xef && ascii(seg.payload, 0, JPEG_TAG.length) === JPEG_TAG;
}

/* ─────────────────────────── API ─────────────────────────── */

/** Insert a credential. Any credential already present is replaced, never stacked. */
export function embedCredential(bytes: Uint8Array, json: string): Uint8Array {
  const format = sniffFormat(bytes);
  const base = stripCredential(bytes);
  const text = new TextEncoder().encode(json);

  if (format === "png") {
    // iTXt: keyword \0 compression-flag compression-method language \0 translated \0 text
    const header = new TextEncoder().encode(`${PNG_KEYWORD}\0\0\0\0\0`);
    const chunk = pngChunk("iTXt", concat([header, text]));
    const iend = pngChunks(base).find((c) => c.type === "IEND");
    if (!iend) throw new Error("PNG has no IEND chunk");
    return concat([base.subarray(0, iend.start), chunk, base.subarray(iend.start)]);
  }

  if (format === "jpeg") {
    const payload = concat([new TextEncoder().encode(JPEG_TAG), text]);
    if (payload.byteLength > JPEG_MAX_SEGMENT_PAYLOAD) {
      throw new Error("Credential is too large for a single JPEG segment");
    }
    const segment = new Uint8Array(4 + payload.byteLength);
    segment[0] = 0xff;
    segment[1] = 0xef;
    segment[2] = ((payload.byteLength + 2) >> 8) & 0xff;
    segment[3] = (payload.byteLength + 2) & 0xff;
    segment.set(payload, 4);
    // After the leading APPn run, so JFIF/EXIF/XMP/C2PA keep their positions.
    const segments = jpegHeaderSegments(base);
    let insertAt = 2;
    for (const seg of segments) {
      if (seg.marker < 0xe0 || seg.marker > 0xef) break;
      insertAt = seg.end;
    }
    return concat([base.subarray(0, insertAt), segment, base.subarray(insertAt)]);
  }

  throw new Error(`Cannot embed a credential in ${format} — use the sidecar instead`);
}

export function extractCredential(bytes: Uint8Array): string | null {
  const format = sniffFormat(bytes);
  if (format === "png") {
    const chunk = pngChunks(bytes).find(isOurPngChunk);
    if (!chunk) return null;
    // Skip keyword\0 + flag + method + language\0 + translated\0
    let at = chunk.data.indexOf(0) + 3;
    at = chunk.data.indexOf(0, at) + 1;
    at = chunk.data.indexOf(0, at) + 1;
    return new TextDecoder().decode(chunk.data.subarray(at));
  }
  if (format === "jpeg") {
    const seg = jpegHeaderSegments(bytes).find(isOurJpegSegment);
    return seg ? new TextDecoder().decode(seg.payload.subarray(JPEG_TAG.length)) : null;
  }
  return null;
}

/** Remove only our own unit — the inverse of embedCredential. */
export function stripCredential(bytes: Uint8Array): Uint8Array {
  const format = sniffFormat(bytes);
  if (format === "png") {
    const ours = pngChunks(bytes).filter(isOurPngChunk);
    return removeRanges(bytes, ours);
  }
  if (format === "jpeg") {
    const ours = jpegHeaderSegments(bytes).filter(isOurJpegSegment);
    return removeRanges(bytes, ours);
  }
  return bytes;
}

function removeRanges(bytes: Uint8Array, ranges: { start: number; end: number }[]): Uint8Array {
  if (ranges.length === 0) return bytes;
  const parts: Uint8Array[] = [];
  let at = 0;
  for (const r of ranges) {
    parts.push(bytes.subarray(at, r.start));
    at = r.end;
  }
  parts.push(bytes.subarray(at));
  return concat(parts);
}
