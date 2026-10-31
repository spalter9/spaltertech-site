/**
 * Duration of a stored file, read from its headers — no decoding. Covers the
 * two formats the generators return (WAV, MP3); anything else is undefined.
 */

export function audioDurationSeconds(bytes: Uint8Array, ext: string): number | undefined {
  if (ext === "wav") return wavDuration(bytes);
  if (ext === "mp3") return mp3Duration(bytes);
  return undefined;
}

function ascii(bytes: Uint8Array, at: number, len: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + len));
}

function wavDuration(bytes: Uint8Array): number | undefined {
  if (bytes.length < 12 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WAVE") return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sampleRate = 0;
  let blockAlign = 0;
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const id = ascii(bytes, pos, 4);
    const size = view.getUint32(pos + 4, true);
    if (id === "fmt " && pos + 20 <= bytes.length) {
      sampleRate = view.getUint32(pos + 12, true);
      blockAlign = view.getUint16(pos + 20, true);
    } else if (id === "data") {
      if (!sampleRate || !blockAlign) return undefined;
      // Streaming writers leave 0 or 0xFFFFFFFF here; fall back to what's on disk.
      const available = bytes.length - (pos + 8);
      const dataBytes = size === 0 || size === 0xffffffff ? available : Math.min(size, available);
      return dataBytes / blockAlign / sampleRate;
    }
    pos += 8 + size + (size % 2);
  }
  return undefined;
}

const MP3_BITRATES: Record<string, number[]> = {
  // [version bit][layer]: kbps by index 1..14
  "1-1": [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  "1-2": [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  "1-3": [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-1": [32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  "2-2": [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "2-3": [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const MP3_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

type FrameHeader = { length: number; samples: number; sampleRate: number };

function mp3Frame(bytes: Uint8Array, pos: number): FrameHeader | undefined {
  if (pos + 4 > bytes.length) return undefined;
  const b1 = bytes[pos + 1]!;
  const b2 = bytes[pos + 2]!;
  if (bytes[pos] !== 0xff || (b1 & 0xe0) !== 0xe0) return undefined;
  const versionBits = (b1 >> 3) & 3;
  const layerBits = (b1 >> 1) & 3;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 3;
  if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return undefined;
  const layer = 4 - layerBits;
  const mpeg1 = versionBits === 3;
  const kbps = MP3_BITRATES[`${mpeg1 ? 1 : 2}-${layer}`]![bitrateIndex - 1]!;
  const sampleRate = MP3_RATES[versionBits]![rateIndex]!;
  const padding = (b2 >> 1) & 1;
  const bps = kbps * 1000;
  if (layer === 1) return { length: (Math.floor((12 * bps) / sampleRate) + padding) * 4, samples: 384, sampleRate };
  const samples = layer === 3 && !mpeg1 ? 576 : 1152;
  const length = Math.floor(((samples / 8) * bps) / sampleRate) + padding;
  return { length, samples, sampleRate };
}

function mp3Duration(bytes: Uint8Array): number | undefined {
  let pos = 0;
  if (ascii(bytes, 0, 3) === "ID3" && bytes.length >= 10) {
    const size = ((bytes[6]! & 0x7f) << 21) | ((bytes[7]! & 0x7f) << 14) | ((bytes[8]! & 0x7f) << 7) | (bytes[9]! & 0x7f);
    pos = 10 + size + (bytes[5]! & 0x10 ? 10 : 0);
  }
  // Find the first frame whose successor also parses, so a stray 0xFF in junk doesn't count.
  let first: FrameHeader | undefined;
  for (; pos + 4 <= bytes.length; pos++) {
    const h = mp3Frame(bytes, pos);
    if (h && (pos + h.length >= bytes.length || mp3Frame(bytes, pos + h.length))) {
      first = h;
      break;
    }
  }
  if (!first) return undefined;

  // A Xing/Info header in the first frame carries the exact frame count (VBR files).
  for (const tag of ["Xing", "Info"]) {
    const at = findAscii(bytes, tag, pos + 4, pos + Math.min(first.length, 64));
    if (at >= 0 && at + 12 <= bytes.length && bytes[at + 7]! & 1) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return (view.getUint32(at + 8) * first.samples) / first.sampleRate;
    }
  }

  let frames = 0;
  let samples = 0;
  while (pos + 4 <= bytes.length) {
    const h = mp3Frame(bytes, pos);
    if (!h) break;
    frames++;
    samples += h.samples;
    pos += h.length;
  }
  return frames ? samples / first.sampleRate : undefined;
}

function findAscii(bytes: Uint8Array, text: string, from: number, to: number): number {
  outer: for (let i = from; i + text.length <= Math.min(to, bytes.length); i++) {
    for (let j = 0; j < text.length; j++) if (bytes[i + j] !== text.charCodeAt(j)) continue outer;
    return i;
  }
  return -1;
}
