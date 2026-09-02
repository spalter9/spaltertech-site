/**
 * RIFF/WAVE chunk surgery.
 *
 * Broadcast metadata lives in top-level RIFF chunks alongside `fmt ` and
 * `data`. Writing them correctly means respecting three rules that are easy to
 * get wrong and silently corrupt a file for every professional tool that reads
 * it: chunks are word-aligned with a pad byte that is *not* counted in the
 * chunk size, the RIFF size field covers everything after itself, and metadata
 * belongs before `data` so streaming readers see it without seeking to the end.
 */

export type RiffChunk = {
  id: string;
  /** Offset of the chunk's payload (i.e. past the 8-byte header). */
  offset: number;
  /** Declared payload size, excluding any pad byte. */
  size: number;
};

function readId(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function writeId(bytes: Uint8Array, offset: number, id: string): void {
  for (let i = 0; i < 4; i += 1) bytes[offset + i] = id.charCodeAt(i);
}

export function listChunks(wav: Uint8Array): RiffChunk[] {
  if (wav.length < 12 || readId(wav, 0) !== "RIFF" || readId(wav, 8) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE container");
  }
  const chunks: RiffChunk[] = [];
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const id = readId(wav, offset);
    const size = readU32(wav, offset + 4);
    const payload = offset + 8;
    if (payload + size > wav.length) {
      // Truncated final chunk — take what is actually there rather than throw.
      chunks.push({ id, offset: payload, size: Math.max(0, wav.length - payload) });
      break;
    }
    chunks.push({ id, offset: payload, size });
    offset = payload + size + (size % 2);
  }
  return chunks;
}

export function findChunk(wav: Uint8Array, id: string): Uint8Array | null {
  const chunk = listChunks(wav).find((c) => c.id === id);
  if (!chunk) return null;
  return wav.subarray(chunk.offset, chunk.offset + chunk.size);
}

/**
 * The bit-exact audio payload — the `data` chunk contents and nothing else.
 *
 * Hashing this rather than the whole file is what lets a manifest describe the
 * file it is embedded in: metadata can be injected, stripped, or rewritten
 * without moving the number that identifies the audio.
 */
export function audioPayload(wav: Uint8Array): Uint8Array {
  const data = findChunk(wav, "data");
  if (!data) throw new Error("WAV has no data chunk");
  return data;
}

export type ChunkWrite = { id: string; data: Uint8Array };

/**
 * Insert or replace top-level chunks, keeping everything else byte-identical.
 * Written chunks are placed before `data`, in the order given.
 */
export function writeChunks(wav: Uint8Array, writes: ChunkWrite[]): Uint8Array {
  const chunks = listChunks(wav);
  const dataChunk = chunks.find((c) => c.id === "data");
  if (!dataChunk) throw new Error("WAV has no data chunk");

  const replacing = new Set(writes.map((w) => w.id));
  const parts: Uint8Array[] = [];

  const header = new Uint8Array(12);
  writeId(header, 0, "RIFF");
  writeId(header, 8, "WAVE");
  parts.push(header);

  const emit = (id: string, payload: Uint8Array): void => {
    const head = new Uint8Array(8);
    writeId(head, 0, id);
    writeU32(head, 4, payload.length);
    parts.push(head, payload);
    if (payload.length % 2 === 1) parts.push(new Uint8Array(1));
  };

  // Everything before `data`, minus any chunk we are about to rewrite.
  for (const chunk of chunks) {
    if (chunk.id === "data") break;
    if (replacing.has(chunk.id)) continue;
    emit(chunk.id, wav.subarray(chunk.offset, chunk.offset + chunk.size));
  }

  for (const write of writes) emit(write.id, write.data);

  emit("data", wav.subarray(dataChunk.offset, dataChunk.offset + dataChunk.size));

  // Any trailing chunks that followed `data` in the source.
  let seenData = false;
  for (const chunk of chunks) {
    if (chunk.id === "data") {
      seenData = true;
      continue;
    }
    if (!seenData || replacing.has(chunk.id)) continue;
    emit(chunk.id, wav.subarray(chunk.offset, chunk.offset + chunk.size));
  }

  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  // RIFF size counts everything after the size field itself.
  writeU32(out, 4, total - 8);
  return out;
}
