/**
 * Minimal ZIP writer, STORED method only.
 *
 * The delivery package holds four 32-bit float WAVs plus the manifest and the
 * examiner PDF. Float PCM does not deflate meaningfully, so storing keeps the
 * package byte-verifiable: every embedded file's SHA-256 in the manifest is
 * also its hash inside the archive, and any tool can extract it — including
 * `unzip` on a machine with nothing else installed.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS packed date/time, as ZIP has stored timestamps since 1989. */
function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (Math.floor(date.getUTCSeconds() / 2) & 0x1f);
  const packed =
    ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { time, date: packed };
}

export type ZipEntry = { name: string; data: Uint8Array };

const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const EOCD_BYTES = 22;

/**
 * Exact size of the archive `buildZip` would produce, without producing it.
 *
 * Lets a seal record the package size while writing only the member files to
 * disk — the archive itself is assembled on request, so a delivery is not
 * stored twice.
 */
export function zipSize(entries: { name: string; byteLength: number }[]): number {
  const encoder = new TextEncoder();
  let total = EOCD_BYTES;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name).length;
    total += LOCAL_HEADER_BYTES + nameBytes + entry.byteLength;
    total += CENTRAL_HEADER_BYTES + nameBytes;
  }
  return total;
}

class ByteWriter {
  private parts: Uint8Array[] = [];
  length = 0;

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.length += bytes.length;
  }

  u16(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.push(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length);
    let cursor = 0;
    for (const part of this.parts) {
      out.set(part, cursor);
      cursor += part.length;
    }
    return out;
  }
}

export function buildZip(entries: ZipEntry[], createdAt = new Date()): Uint8Array {
  const { time, date } = dosDateTime(createdAt);
  const encoder = new TextEncoder();
  const body = new ByteWriter();
  const central = new ByteWriter();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = body.length;

    body.u32(0x04034b50); // local file header
    body.u16(20); // version needed
    body.u16(0); // flags
    body.u16(0); // method: stored
    body.u16(time);
    body.u16(date);
    body.u32(crc);
    body.u32(entry.data.length);
    body.u32(entry.data.length);
    body.u16(nameBytes.length);
    body.u16(0); // extra length
    body.push(nameBytes);
    body.push(entry.data);

    central.u32(0x02014b50); // central directory header
    central.u16(20); // version made by
    central.u16(20); // version needed
    central.u16(0);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(entry.data.length);
    central.u32(entry.data.length);
    central.u16(nameBytes.length);
    central.u16(0); // extra
    central.u16(0); // comment
    central.u16(0); // disk number
    central.u16(0); // internal attrs
    central.u32(0); // external attrs
    central.u32(offset);
    central.push(nameBytes);
  }

  const out = new ByteWriter();
  out.push(body.toUint8Array());
  const centralOffset = out.length;
  out.push(central.toUint8Array());

  out.u32(0x06054b50); // end of central directory
  out.u16(0);
  out.u16(0);
  out.u16(entries.length);
  out.u16(entries.length);
  out.u32(central.length);
  out.u32(centralOffset);
  out.u16(0);

  return out.toUint8Array();
}
