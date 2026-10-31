import { createHmac, timingSafeEqual } from "node:crypto";
import { MusicJobError } from "./types.ts";
import type { GenerateMusicInput, GenerateSongInput, MusicErrorCode, MusicJob, MusicProvider } from "./types.ts";

/**
 * Replicate-hosted generators. One Replicate token reaches several model
 * families (Google, MiniMax, Stability, ElevenLabs, Meta, ACE-Step), which is
 * the point: a detector that only catches one family isn't worth paying for.
 *
 * Input shapes come from each model's published schema on replicate.com.
 * Official models run by name (POST /models/{owner}/{name}/predictions);
 * every other model, MusicGen included, must name a version, so it's resolved
 * from the model's latest version and reported back for the manifest.
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
    throw new MusicJobError("INVALID_INPUT", `${field} must be ${min}-${max} characters for this model (got ${n})`);
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
      withSeed(i.seed, {
        prompt: i.prompt,
        duration: Math.round(d),
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "loudness",
      }),
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

export type Prediction = {
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
  /** Prefer: wait=N on create (1-60); 0 returns at once and leaves it all to polling. */
  waitSeconds?: number;
  /** Replicate cancels the prediction after this long, so an abandoned job stops billing. */
  cancelAfter?: string;
  /** When set, Replicate POSTs the finished prediction here instead of us polling. */
  webhookUrl?: string;
  /** whsec_... signing secret; fetched from Replicate and cached when not given. */
  webhookSecret?: string;
  webhookToleranceSeconds?: number;
  now?: () => number;
};

export class WebhookSignatureError extends Error {}

/** Attaches the provider's raw response to a job error, for the job service to log and strip. */
export function withRaw(error: { code: string; message: string }, providerRaw: unknown): { code: string; message: string } {
  return Object.assign(error, { providerRaw });
}

function firstUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(firstUrl).find(Boolean);
  if (output && typeof output === "object") return Object.values(output).map(firstUrl).find(Boolean);
  return undefined;
}

/** Replicate's E005 and similar wording mean the input or output tripped a safety filter. */
const BLOCKED = /\bE005\b|sensitive|nsfw|safety|flagged|moderat/i;

function httpCode(status: number): MusicErrorCode {
  if (status === 400 || status === 422) return "INVALID_INPUT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "INTERNAL"; // 401/402/403/404: our token, billing or model name, not something a retry fixes
}

export class ReplicateProvider implements MusicProvider {
  name: string;
  maxDurationSeconds: number;
  model: ReplicateModel;
  /** Version id actually used, once known; recorded in the manifest. */
  version: string | undefined;
  private options: ReplicateOptions;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private webhookSecret: string | undefined;

  constructor(key: string, options: ReplicateOptions) {
    const model = REPLICATE_MODELS[key];
    if (!model) throw new Error(`Unknown model "${key}". Known: ${Object.keys(REPLICATE_MODELS).join(", ")}`);
    this.name = key;
    this.model = model;
    this.maxDurationSeconds = model.maxDurationSeconds;
    this.options = options;
    this.baseUrl = (options.baseUrl ?? "https://api.replicate.com/v1").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.webhookSecret = options.webhookSecret;
  }

  async submit(input: GenerateMusicInput): Promise<{ providerJobId: string }> {
    const duration = Math.min(input.durationSeconds ?? 30, this.maxDurationSeconds);
    const body: Record<string, unknown> = { input: this.model.buildInput(input as GenerateSongInput, duration) };
    if (this.options.webhookUrl) {
      body.webhook = this.options.webhookUrl;
      body.webhook_events_filter = ["completed"];
    }
    let url = `${this.baseUrl}/models/${this.model.slug}/predictions`;
    if (!this.model.official) {
      body.version = await this.resolveVersion();
      url = `${this.baseUrl}/predictions`;
    }
    const headers: Record<string, string> = { "Cancel-After": this.options.cancelAfter ?? "10m" };
    const wait = this.options.waitSeconds ?? 60;
    if (wait > 0) headers.Prefer = `wait=${Math.min(60, Math.round(wait))}`;
    const prediction = await this.request<Prediction>("POST", url, body, headers);
    return { providerJobId: prediction.id };
  }

  /**
   * MusicJob.id is ours, not the provider's, so it comes back as the
   * prediction id here; the job service swaps in our id and our storage URL.
   */
  async poll(providerJobId: string): Promise<MusicJob> {
    const p = await this.request<Prediction>("GET", `${this.baseUrl}/predictions/${encodeURIComponent(providerJobId)}`);
    return this.toJob(p);
  }

  /** Verifies a webhook delivery (Standard Webhooks signing) and returns the prediction as a job. */
  async handleWebhook(req: { headers: Record<string, string | undefined>; rawBody: string }): Promise<MusicJob> {
    const id = req.headers["webhook-id"];
    const timestamp = req.headers["webhook-timestamp"];
    const signatures = req.headers["webhook-signature"];
    if (!id || !timestamp || !signatures) throw new WebhookSignatureError("missing webhook signature headers");
    const now = (this.options.now ?? Date.now)() / 1000;
    if (Math.abs(now - Number(timestamp)) > (this.options.webhookToleranceSeconds ?? 300)) {
      throw new WebhookSignatureError("webhook timestamp outside tolerance");
    }
    const secret = await this.signingSecret();
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${req.rawBody}`).digest();
    const valid = signatures.split(" ").some((entry) => {
      const sig = Buffer.from(entry.split(",")[1] ?? "", "base64");
      return sig.length === expected.length && timingSafeEqual(sig, expected);
    });
    if (!valid) throw new WebhookSignatureError("webhook signature does not match");
    return this.toJob(JSON.parse(req.rawBody) as Prediction);
  }

  toJob(p: Prediction): MusicJob {
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
        job.error = { code: "GENERATION_FAILED", message: "Generation finished but returned no audio" };
      }
    } else if (p.status === "failed") {
      const message = p.error || "Generation failed";
      job.error = withRaw({ code: BLOCKED.test(message) ? "CONTENT_BLOCKED" : "GENERATION_FAILED", message }, p);
    } else if (p.status === "canceled" || p.status === "aborted") {
      job.error = withRaw({ code: "GENERATION_FAILED", message: `Prediction was ${p.status} (stopped by Replicate or by its deadline)` }, p);
    }
    return job;
  }

  private async signingSecret(): Promise<string> {
    if (!this.webhookSecret) {
      const res = await this.request<{ key?: string }>("GET", `${this.baseUrl}/webhooks/default/secret`);
      if (!res.key) throw new MusicJobError("INTERNAL", "Replicate returned no webhook signing secret");
      this.webhookSecret = res.key;
    }
    return this.webhookSecret;
  }

  private async resolveVersion(): Promise<string> {
    if (this.version) return this.version;
    const model = await this.request<{ latest_version?: { id?: string } }>("GET", `${this.baseUrl}/models/${this.model.slug}`);
    const id = model.latest_version?.id;
    if (!id) throw new MusicJobError("INTERNAL", `${this.model.slug} has no published version`);
    this.version = id;
    return id;
  }

  private async request<T>(method: string, url: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${this.options.token}`, "Content-Type": "application/json", ...extraHeaders },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new MusicJobError("PROVIDER_UNAVAILABLE", `Couldn't reach Replicate: ${(e as Error).message}`, { providerRaw: e });
    }
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { detail?: string; title?: string };
        detail = parsed.detail || parsed.title || detail;
      } catch {}
      const code = res.status === 422 && BLOCKED.test(detail) ? "CONTENT_BLOCKED" : httpCode(res.status);
      throw new MusicJobError(code, `Replicate ${res.status}: ${detail}`, { providerRaw: { status: res.status, body: text } });
    }
    return JSON.parse(text) as T;
  }
}
