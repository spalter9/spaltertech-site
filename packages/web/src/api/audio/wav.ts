import type { AudioBuffer32 } from "./types";

const RIFF = 0x46464952;
const WAVE = 0x45564157;
const FMT = 0x20746d66;
const DATA = 0x61746164;
const IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;
/** KSDATAFORMAT_SUBTYPE_IEEE_FLOAT GUID data1 (little-endian). */
const SUBTYPE_IEEE_FLOAT = 0x00000003;
/** KSDATAFORMAT_SUBTYPE_PCM GUID data1 (little-endian). */
const SUBTYPE_PCM = 0x00000001;

function readFourCC(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

/**
 * Decode WAV into interleaved Float32 PCM.
 * Supports IEEE float32 and PCM integer (8/16/24/32) with conversion to Float32.
 */
export function decodeWav(bytes: ArrayBuffer | Uint8Array): AudioBuffer32 {
  const buffer = bytes instanceof Uint8Array ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) : bytes;
  const view = new DataView(buffer);
  if (buffer.byteLength < 44) {
    throw new Error("WAV file too small");
  }
  if (readFourCC(view, 0) !== RIFF || readFourCC(view, 8) !== WAVE) {
    throw new Error("Not a RIFF/WAVE file");
  }

  let offset = 12;
  let sampleRate = 44100;
  let channels = 2;
  let audioFormat = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readFourCC(view, offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkData = offset + 8;
    if (chunkId === FMT) {
      audioFormat = view.getUint16(chunkData, true);
      channels = view.getUint16(chunkData + 2, true);
      sampleRate = view.getUint32(chunkData + 4, true);
      bitsPerSample = view.getUint16(chunkData + 14, true);
      // WAVE_FORMAT_EXTENSIBLE: resolve real codec from SubFormat GUID.
      if (audioFormat === WAVE_FORMAT_EXTENSIBLE && chunkSize >= 40) {
        const subFormat = view.getUint32(chunkData + 24, true);
        if (subFormat === SUBTYPE_IEEE_FLOAT) audioFormat = IEEE_FLOAT;
        else if (subFormat === SUBTYPE_PCM) audioFormat = 1;
      }
    } else if (chunkId === DATA) {
      dataOffset = chunkData;
      dataSize = chunkSize;
      break;
    }
    offset = chunkData + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0) throw new Error("WAV missing data chunk");
  if (channels < 1 || channels > 8) throw new Error(`Unsupported channel count: ${channels}`);

  const frameBytes = (bitsPerSample / 8) * channels;
  const frames = Math.floor(dataSize / frameBytes);
  const samples = new Float32Array(frames * channels);

  if (audioFormat === IEEE_FLOAT && bitsPerSample === 32) {
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = view.getFloat32(dataOffset + i * 4, true);
    }
  } else if (audioFormat === 1 && bitsPerSample === 16) {
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768;
    }
  } else if (audioFormat === 1 && bitsPerSample === 24) {
    for (let i = 0; i < samples.length; i += 1) {
      const o = dataOffset + i * 3;
      let v = view.getUint8(o) | (view.getUint8(o + 1) << 8) | (view.getUint8(o + 2) << 16);
      if (v & 0x800000) v |= ~0xffffff;
      samples[i] = v / 8388608;
    }
  } else if (audioFormat === 1 && bitsPerSample === 32) {
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = view.getInt32(dataOffset + i * 4, true) / 2147483648;
    }
  } else if (audioFormat === 1 && bitsPerSample === 8) {
    for (let i = 0; i < samples.length; i += 1) {
      samples[i] = (view.getUint8(dataOffset + i) - 128) / 128;
    }
  } else {
    throw new Error(`Unsupported WAV format fmt=${audioFormat} bits=${bitsPerSample}`);
  }

  return {
    sampleRate,
    channels,
    samples,
    length: frames,
    bitDepth: 32,
    format: "float32",
  };
}

/** Encode interleaved Float32 PCM to uncompressed IEEE float32 WAV. */
export function encodeWavFloat32(audio: AudioBuffer32): Uint8Array {
  const { sampleRate, channels, samples } = audio;
  const dataBytes = samples.length * 4;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, IEEE_FLOAT, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 4, true);
  view.setUint16(32, channels * 4, true);
  view.setUint16(34, 32, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples.length; i += 1) {
    view.setFloat32(44 + i * 4, samples[i]!, true);
  }

  return new Uint8Array(buffer);
}

export function ensureStereo(audio: AudioBuffer32): AudioBuffer32 {
  if (audio.channels === 2) return audio;
  if (audio.channels === 1) {
    const out = new Float32Array(audio.length * 2);
    for (let i = 0; i < audio.length; i += 1) {
      const s = audio.samples[i]!;
      out[i * 2] = s;
      out[i * 2 + 1] = s;
    }
    return { ...audio, channels: 2, samples: out };
  }
  const out = new Float32Array(audio.length * 2);
  for (let i = 0; i < audio.length; i += 1) {
    out[i * 2] = audio.samples[i * audio.channels]!;
    out[i * 2 + 1] = audio.samples[i * audio.channels + 1] ?? audio.samples[i * audio.channels]!;
  }
  return { ...audio, channels: 2, samples: out };
}
