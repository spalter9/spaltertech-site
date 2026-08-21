import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { decodeWav, ensureStereo } from "./wav";
import type { AudioBuffer32 } from "./types";

const execFileAsync = promisify(execFile);

function isWavMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  );
}

function isMp3Magic(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  return bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0;
}

async function ffmpegToFloat32Wav(input: Uint8Array, ext: string): Promise<Uint8Array> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dir = join(tmpdir(), "ssp-surreal-ingest");
  await mkdir(dir, { recursive: true });
  const inPath = join(dir, `${stamp}.${ext}`);
  const outPath = join(dir, `${stamp}-f32.wav`);
  await writeFile(inPath, input);
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inPath,
        "-acodec",
        "pcm_f32le",
        "-ac",
        "2",
        "-f",
        "wav",
        outPath,
      ],
      { timeout: 120_000 },
    );
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => undefined);
    await unlink(outPath).catch(() => undefined);
  }
}

/**
 * Ingest MP3/WAV into a native Float32 tensor buffer with full mathematical headroom.
 * WAV is decoded in-process; compressed formats are decoded via ffmpeg to pcm_f32le.
 */
export async function ingestToFloat32(bytes: Uint8Array, fileName: string): Promise<AudioBuffer32> {
  const lower = fileName.toLowerCase();

  if (isWavMagic(bytes) || lower.endsWith(".wav")) {
    if (isWavMagic(bytes)) {
      try {
        return ensureStereo(decodeWav(bytes));
      } catch {
        /* fall through to ffmpeg for exotic WAV containers */
      }
    }
    const wavBytes = await ffmpegToFloat32Wav(bytes, "wav");
    return ensureStereo(decodeWav(wavBytes));
  }

  if (isMp3Magic(bytes) || lower.endsWith(".mp3") || lower.endsWith(".mpeg")) {
    const wavBytes = await ffmpegToFloat32Wav(bytes, "mp3");
    return ensureStereo(decodeWav(wavBytes));
  }

  throw new Error("Unsupported audio type. Upload MP3 or WAV.");
}
