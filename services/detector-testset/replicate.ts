import { MusicJobError } from "./types.ts";
import type { GenerateMusicInput, GenerateSongInput, MusicJob, MusicProvider } from "./types.ts";

/**
 * Replicate-hosted generators. One Replicate token reaches several model
 * families (Google, MiniMax, Stability, ElevenLabs, Meta, ACE-Step), which is
 * the point: a detector that only catches one family isn't worth paying for.
 *
 * Input shapes come from each model's published schema on replicate.com.
 * Official models run by name; community models need a version id, resolved
 * from the model's latest version at submit time and reported back so the
 * manifest records exactly what produced each file.
 */

type ModelInput = Record<string, unknown>;

export type ReplicateModel = {
  slug: string; // owner/name on replicate.com
  official: boolean;
  maxDurationSeconds: number;
  /** Takes duration from the request; false means the model picks its own length. */
  honorsDuration: boolean;
  sings: boolean;
  buildInput(input: GenerateSongInput, durationSeconds: number): ModelInput;
};

const withSeed = (seed: number | undefined, input: ModelInput): ModelInput =>
  seed === undefined ? input : { ...input, seed };

function lengthBetween(field: string, value: string | undefined, min: number, max: number): string {
  const n = value?.trim().length ?? 0;
  if (n < min || n > max) {
    throw new MusicJobError("invalid_input", `${field} must be ${min}-${max} characters for this model (got ${n})`);
  }
  return value!.trim();
}

export const REPLICATE_MODELS: Record<string, ReplicateModel> = {
  "lyria-2": {
    slug: "google/lyria-2",
    official: true,
    maxDurationSeconds: 30, // fixed-length clips
    honorsDuration: false,
    sings: false,
    buildInput: (i) =>
      withSeed(i.seed, { prompt: i.prompt, ...(i.negativePrompt ? { negative_prompt: i.negativePrompt } : {}) }),
  },
  "minimax-music-1.5": {
    slug: "minimax/music-1.5",
    official: true,
    maxDurationSeconds: 240, // length follows the lyrics
    honorsDuration: false,
    sings: true,
    buildInput: (i) => ({
      prompt: lengthBetween("prompt", i.prompt, 10, 300),
      lyrics: lengthBetween("lyrics", i.lyrics, 10, 600),
      audio_format: "wav",
      sample_rate: 44100,
    }),
  },
  "stable-audio-2.5": {
    slug: "stability-ai/stable-audio-2.5",
    official: true,
    maxDurationSeconds: 190,
    honorsDuration: true,
    sings: false,
    buildInput: (i, d) => withSeed(i.seed, { prompt: i.prompt, duration: Math.round(d) }),
  },
  "elevenlabs-music": {
    slug: "elevenlabs/music",
    official: true,
    maxDurationSeconds: 300,
    honorsDuration: true,
    sings: true,
    buildInput: (i, d) => ({
      prompt: i.lyrics ? `${i.prompt}\n\nLyrics:\n${i.lyrics}` : i.prompt,
      music_length_ms: Math.max(5000, Math.round(d * 1000)),
      force_instrumental: !i.lyrics,
      output_format: "wav_cd_quality",
    }),
  },
  musicgen: {
    slug: "meta/musicgen",
    official: false,
    maxDurationSeconds: 30,
    honorsDuration: true,
    sings: false,
    buildInput: (i, d) =>
      withSeed(i.seed, { prompt: i.prompt, duration: Math.round(d), model_version: "stereo-large", output_format: "wav" }),
  },
  "ace-step": {
    slug: "lucataco/ace-step",
    official: false,
    maxDurationSeconds: 240,
    honorsDuration: true,
    sings: true,
    buildInput: (i, d) => ({
      tags: i.prompt,
      lyrics: i.lyrics?.trim() || "[instrumental]",
      duration: d,
      seed: i.seed ?? -1,
    }),
  },
};

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled" | "aborted";
  output?: unknown;
  error?: string | null;
  created_at?: string;
  version?: string;
};

export type ReplicateOptions = {
  token: string;
  baseUrl?: string; // overridable for tests
  fetch?: typeof fetch;
};

function firstUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(firstUrl).find(Boolean);
  if (output && typeof output === "object") return Object.values(output).map(firstUrl).find(Boolean);
  return undefined;
}

const HTTP_CODES: Record<number, string> = {
  401: "unauthorized",
  402: "payment_required",
  404: "not_found",
  422: "invalid_input",
  429: "rate_limited",
};

export class ReplicateProvider implements MusicProvider {
  name: string;
  maxDurationSeconds: number;
  model: ReplicateModel;
  /** Version id actually used, once known; recorded in the manifest. */
  version: string | undefined;
  private token: string;
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(key: string, options: ReplicateOptions) {
    const model = REPLICATE_MODELS[key];
    if (!model) throw new Error(`Unknown model "${key}". Known: ${Object.keys(REPLICATE_MODELS).join(", ")}`);
    this.name = key;
    this.model = model;
    this.maxDurationSeconds = model.maxDurationSeconds;
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? "https://api.replicate.com/v1").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  async submit(input: GenerateMusicInput): Promise<{ providerJobId: string }> {
    const duration = Math.min(input.durationSeconds ?? 30, this.maxDurationSeconds);
    const body: Record<string, unknown> = { input: this.model.buildInput(input as GenerateSongInput, duration) };
    let url = `${this.baseUrl}/models/${this.model.slug}/predictions`;
    if (!this.model.official) {
      body.version = await this.resolveVersion();
      url = `${this.baseUrl}/predictions`;
    }
    const prediction = await this.request<Prediction>("POST", url, body);
    return { providerJobId: prediction.id };
  }

  /**
   * MusicJob.id is ours, not the provider's, so it comes back as the
   * prediction id here; the job service swaps in our id and our storage URL.
   */
  async poll(providerJobId: string): Promise<MusicJob> {
    const p = await this.request<Prediction>("GET", `${this.baseUrl}/predictions/${encodeURIComponent(providerJobId)}`);
    this.version ??= p.version;
    const job: MusicJob = {
      id: p.id,
      providerJobId: p.id,
      status: p.status === "starting" ? "queued" : p.status === "processing" ? "running" : p.status === "succeeded" ? "succeeded" : "failed",
      createdAt: p.created_at ?? new Date().toISOString(),
    };
    if (p.status === "succeeded") {
      job.audioUrl = firstUrl(p.output);
      if (!job.audioUrl) {
        job.status = "failed";
        job.error = { code: "no_output", message: "Prediction succeeded but returned no audio URL" };
      }
    } else if (p.status === "failed") {
      job.error = { code: "provider_failed", message: p.error || "Generation failed" };
    } else if (p.status === "canceled" || p.status === "aborted") {
      job.error = { code: p.status, message: `Prediction was ${p.status} (stopped by Replicate or by its deadline)` };
    }
    return job;
  }

  private async resolveVersion(): Promise<string> {
    if (this.version) return this.version;
    const model = await this.request<{ latest_version?: { id?: string } }>("GET", `${this.baseUrl}/models/${this.model.slug}`);
    const id = model.latest_version?.id;
    if (!id) throw new MusicJobError("not_found", `${this.model.slug} has no published version`);
    this.version = id;
    return id;
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new MusicJobError("network_error", `${method} ${url}: ${(e as Error).message}`);
    }
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { detail?: string; title?: string };
        detail = parsed.detail || parsed.title || detail;
      } catch {}
      throw new MusicJobError(HTTP_CODES[res.status] ?? "provider_error", `Replicate ${res.status}: ${detail}`);
    }
    return JSON.parse(text) as T;
  }
}
