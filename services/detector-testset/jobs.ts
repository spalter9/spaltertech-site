import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { audioDurationSeconds } from "./audio.ts";
import { MusicJobError, asMusicJobError } from "./types.ts";
import type { GenerateMusicInput, MusicError, MusicJob, MusicProvider } from "./types.ts";

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

/**
 * Validates and normalizes a request: prompt 1..2000 chars, duration defaulted
 * to 30 and clamped to the provider's max (and to `cap`, if one is configured).
 */
export function normalizeInput<T extends GenerateMusicInput>(
  input: T,
  provider: MusicProvider,
  cap = Number.POSITIVE_INFINITY,
): T & { durationSeconds: number } {
  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    throw new MusicJobError("INVALID_INPUT", "prompt is required");
  }
  if (input.prompt.length > MAX_PROMPT_CHARS) {
    throw new MusicJobError("INVALID_INPUT", `prompt is ${input.prompt.length} characters; the limit is ${MAX_PROMPT_CHARS}`);
  }
  if (input.negativePrompt !== undefined && typeof input.negativePrompt !== "string") {
    throw new MusicJobError("INVALID_INPUT", "negativePrompt must be text");
  }
  const requested = input.durationSeconds ?? DEFAULT_DURATION_SECONDS;
  if (typeof requested !== "number" || !Number.isFinite(requested) || requested <= 0) {
    throw new MusicJobError("INVALID_INPUT", "durationSeconds must be a positive number");
  }
  if (input.seed !== undefined && !Number.isInteger(input.seed)) {
    throw new MusicJobError("INVALID_INPUT", "seed must be an integer");
  }
  return { ...input, durationSeconds: Math.min(requested, provider.maxDurationSeconds, cap) };
}

function extensionOf(url: string, contentType: string | null): string {
  const fromPath = url.startsWith("data:") ? undefined : new URL(url).pathname.split(".").pop()?.toLowerCase();
  if (fromPath && AUDIO_EXTS.includes(fromPath)) return fromPath;
  const type = contentType ?? "";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("flac")) return "flac";
  if (type.includes("ogg")) return "ogg";
  return "bin";
}

export type WaitOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type ServiceOptions = {
  fetch?: typeof fetch;
  /** Global duration cap on top of each provider's own (MUSIC_MAX_DURATION_SECONDS). */
  maxDurationSeconds?: number;
  /** Receives every error with the provider's raw response. Logs only; never sent to a client. */
  log?: (jobId: string, error: MusicError) => void;
};

/**
 * Runs jobs against any MusicProvider: submit, poll (or accept a webhook)
 * until done, copy the audio into our store. Failures never throw out of
 * here: they come back as a failed MusicJob, so a batch run records every
 * outcome.
 */
export class MusicJobService {
  store: AudioStore;
  /** Storage details for each succeeded job, keyed by our job id. */
  stored = new Map<string, StoredAudio>();
  private fetchImpl: typeof fetch;
  private cap: number;
  private log: (jobId: string, error: MusicError) => void;

  constructor(store: AudioStore, options: ServiceOptions = {}) {
    this.store = store;
    this.fetchImpl = options.fetch ?? fetch;
    this.cap = options.maxDurationSeconds ?? Number.POSITIVE_INFINITY;
    this.log =
      options.log ??
      ((jobId, e) => console.error(`[music ${jobId}] ${e.code}: ${e.message}`, e.providerRaw === undefined ? "" : e.providerRaw));
  }

  /** Validation only, so a caller can reject bad input before creating a job. */
  validate<T extends GenerateMusicInput>(provider: MusicProvider, input: T): T & { durationSeconds: number } {
    return normalizeInput(input, provider, this.cap);
  }

  newJob(): MusicJob {
    return { id: randomUUID(), providerJobId: "", status: "queued", createdAt: new Date().toISOString() };
  }

  private fail(job: MusicJob, e: unknown): MusicJob {
    const err = asMusicJobError(e);
    this.log(job.id, err.toMusicError());
    return { ...job, status: "failed", error: { code: err.code, message: err.message } };
  }

  async start(provider: MusicProvider, input: GenerateMusicInput, job: MusicJob = this.newJob()): Promise<MusicJob> {
    try {
      const { providerJobId } = await provider.submit(this.validate(provider, input));
      return { ...job, providerJobId };
    } catch (e) {
      return this.fail(job, e);
    }
  }

  async refresh(provider: MusicProvider, job: MusicJob): Promise<MusicJob> {
    if (job.status === "succeeded" || job.status === "failed") return job;
    let remote: MusicJob;
    try {
      remote = await provider.poll(job.providerJobId);
    } catch (e) {
      // An unreachable status endpoint isn't a failed generation; keep waiting.
      if (e instanceof MusicJobError && e.retryable) return job;
      return this.fail(job, e);
    }
    return this.complete(job, remote);
  }

  /** Applies a provider-side status (from a poll or a webhook) to our job, storing the audio on success. */
  async complete(job: MusicJob, remote: MusicJob): Promise<MusicJob> {
    if (remote.status === "failed") {
      // Providers may hang their raw response on the error; it goes to the log and no further.
      const { code = "GENERATION_FAILED", message = "Generation failed", providerRaw } = (remote.error ?? {}) as Partial<MusicError>;
      this.log(job.id, new MusicJobError(code, message, { providerRaw }).toMusicError());
      return { ...job, status: "failed", error: { code, message } };
    }
    if (remote.status !== "succeeded") return { ...job, status: remote.status };
    try {
      const res = await this.fetchImpl(remote.audioUrl!);
      if (!res.ok) throw new Error(`download returned HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const ext = extensionOf(remote.audioUrl!, res.headers.get("content-type"));
      const saved = await this.store.save(job.id, bytes, ext);
      this.stored.set(job.id, saved);
      const durationSeconds = audioDurationSeconds(bytes, ext) ?? remote.durationSeconds;
      const { error: _previous, ...rest } = job;
      return { ...rest, status: "succeeded", audioUrl: saved.url, ...(durationSeconds !== undefined ? { durationSeconds } : {}) };
    } catch (e) {
      return this.fail(job, new MusicJobError("INTERNAL", `Generated, but saving the audio failed: ${(e as Error).message}`, { retryable: true, providerRaw: e }));
    }
  }

  async run(provider: MusicProvider, input: GenerateMusicInput, options: WaitOptions = {}): Promise<MusicJob> {
    const job = await this.start(provider, input);
    return this.waitFor(provider, job, options);
  }

  async waitFor(provider: MusicProvider, initial: MusicJob, options: WaitOptions = {}): Promise<MusicJob> {
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const now = options.now ?? Date.now;
    const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
    const deadline = now() + timeoutMs;
    let job = initial;
    while (job.status === "queued" || job.status === "running") {
      if (now() >= deadline) return this.fail(job, new MusicJobError("TIMEOUT", `No result after ${Math.round(timeoutMs / 1000)} s`));
      await sleep(options.pollIntervalMs ?? 3000);
      job = await this.refresh(provider, job);
    }
    return job;
  }
}
