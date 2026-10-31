import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { audioDurationSeconds } from "./audio.ts";
import { MusicJobError } from "./types.ts";
import type { GenerateMusicInput, MusicJob, MusicProvider } from "./types.ts";

export const DEFAULT_DURATION_SECONDS = 30;
const MAX_PROMPT_CHARS = 2000;
const AUDIO_EXTS = ["wav", "mp3", "flac", "ogg", "m4a"];

export type StoredAudio = { url: string; path: string; sha256: string; bytes: number };

/** Where finished audio lives. Provider URLs expire (Replicate's within an hour), ours don't. */
export interface AudioStore {
  save(jobId: string, bytes: Uint8Array, ext: string): Promise<StoredAudio>;
}

export class LocalAudioStore implements AudioStore {
  dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  async save(jobId: string, bytes: Uint8Array, ext: string): Promise<StoredAudio> {
    await mkdir(this.dir, { recursive: true });
    const path = join(this.dir, `${jobId}.${ext}`);
    await writeFile(path, bytes);
    return {
      url: pathToFileURL(path).href,
      path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
  }
}

/** Validates and normalizes a request against one provider: prompt 1..2000 chars, duration defaulted and clamped. */
export function normalizeInput<T extends GenerateMusicInput>(input: T, provider: MusicProvider): T & { durationSeconds: number } {
  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    throw new MusicJobError("invalid_input", "prompt is required");
  }
  if (input.prompt.length > MAX_PROMPT_CHARS) {
    throw new MusicJobError("invalid_input", `prompt is ${input.prompt.length} characters; the limit is ${MAX_PROMPT_CHARS}`);
  }
  const requested = input.durationSeconds ?? DEFAULT_DURATION_SECONDS;
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new MusicJobError("invalid_input", "durationSeconds must be a positive number");
  }
  if (input.seed !== undefined && !Number.isInteger(input.seed)) {
    throw new MusicJobError("invalid_input", "seed must be an integer");
  }
  return { ...input, durationSeconds: Math.min(requested, provider.maxDurationSeconds) };
}

function extensionOf(url: string, contentType: string | null): string {
  const fromPath = new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (fromPath && AUDIO_EXTS.includes(fromPath)) return fromPath;
  const type = contentType ?? "";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("flac")) return "flac";
  if (type.includes("ogg")) return "ogg";
  return "bin";
}

const failed = (job: MusicJob, code: string, message: string): MusicJob => ({ ...job, status: "failed", error: { code, message } });

export type WaitOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/**
 * Runs jobs against any MusicProvider: submit, poll until done, copy the audio
 * into our store. Failures never throw out of here — they come back as a failed
 * MusicJob with an error code, so a batch run records every outcome.
 */
export class MusicJobService {
  store: AudioStore;
  fetchImpl: typeof fetch;
  /** Storage details for each succeeded job, keyed by our job id. */
  stored = new Map<string, StoredAudio>();

  constructor(store: AudioStore, fetchImpl: typeof fetch = fetch) {
    this.store = store;
    this.fetchImpl = fetchImpl;
  }

  async start(provider: MusicProvider, input: GenerateMusicInput): Promise<MusicJob> {
    const job: MusicJob = { id: randomUUID(), providerJobId: "", status: "queued", createdAt: new Date().toISOString() };
    try {
      const { providerJobId } = await provider.submit(normalizeInput(input, provider));
      return { ...job, providerJobId };
    } catch (e) {
      return failed(job, e instanceof MusicJobError ? e.code : "provider_error", (e as Error).message);
    }
  }

  async refresh(provider: MusicProvider, job: MusicJob): Promise<MusicJob> {
    if (job.status === "succeeded" || job.status === "failed") return job;
    let remote: MusicJob;
    try {
      remote = await provider.poll(job.providerJobId);
    } catch (e) {
      // A failed status check isn't a failed generation; keep waiting.
      if (e instanceof MusicJobError && e.code === "network_error") return job;
      return failed(job, e instanceof MusicJobError ? e.code : "provider_error", (e as Error).message);
    }
    if (remote.status !== "succeeded") {
      return { ...job, status: remote.status, ...(remote.error ? { error: remote.error } : {}) };
    }
    try {
      const res = await this.fetchImpl(remote.audioUrl!);
      if (!res.ok) throw new Error(`download returned HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const ext = extensionOf(remote.audioUrl!, res.headers.get("content-type"));
      const saved = await this.store.save(job.id, bytes, ext);
      this.stored.set(job.id, saved);
      const durationSeconds = audioDurationSeconds(bytes, ext) ?? remote.durationSeconds;
      return {
        ...job,
        status: "succeeded",
        audioUrl: saved.url,
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      };
    } catch (e) {
      return failed(job, "storage_error", `Generated, but saving the audio failed: ${(e as Error).message}`);
    }
  }

  async run(provider: MusicProvider, input: GenerateMusicInput, options: WaitOptions = {}): Promise<MusicJob> {
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const now = options.now ?? Date.now;
    const interval = options.pollIntervalMs ?? 3000;
    const deadline = now() + (options.timeoutMs ?? 10 * 60 * 1000);
    let job = await this.start(provider, input);
    while (job.status === "queued" || job.status === "running") {
      if (now() >= deadline) return failed(job, "timeout", `No result after ${Math.round((options.timeoutMs ?? 600000) / 1000)} s`);
      await sleep(interval);
      job = await this.refresh(provider, job);
    }
    return job;
  }
}
