import { randomUUID } from "node:crypto";
import { withRaw } from "./replicate.ts";
import { MusicJobError, asMusicJobError } from "./types.ts";
import type { GenerateMusicInput, MusicErrorCode, MusicJob, MusicProvider } from "./types.ts";

/**
 * Stable Audio through Stability's own API, for when the key is Stability's
 * rather than Replicate's. The endpoint answers synchronously with the audio
 * itself, so submit() starts the request in the background and poll() reports
 * on it; the finished audio is handed over as a data: URL for the job service
 * to store.
 *
 * Per Stability's OpenAPI spec: the body is multipart/form-data, not JSON;
 * there is no negative prompt; Stable Audio 2.5 takes 4-8 steps (8 credits a
 * song) and ignores cfg_scale, while Stable Audio 2 takes 30-100 steps.
 */

export type StabilityOptions = {
  apiKey: string;
  baseUrl?: string; // overridable for tests
  fetch?: typeof fetch;
  model?: "stable-audio-2.5" | "stable-audio-2";
  outputFormat?: "mp3" | "wav";
};

type Pending = { job: MusicJob };

function httpCode(status: number): MusicErrorCode {
  if (status === 400 || status === 422) return "INVALID_INPUT";
  if (status === 403) return "CONTENT_BLOCKED"; // Stability's content moderation
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "INTERNAL";
}

export class StabilityProvider implements MusicProvider {
  name = "stability";
  maxDurationSeconds = 190;
  private options: StabilityOptions;
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private pending = new Map<string, Pending>();
  private seeds = new Map<string, number>();

  constructor(options: StabilityOptions) {
    this.options = options;
    this.baseUrl = (options.baseUrl ?? "https://api.stability.ai").replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Seed Stability reports it used, once a job has finished. */
  seedUsed(providerJobId: string): number | undefined {
    return this.seeds.get(providerJobId);
  }

  async submit(input: GenerateMusicInput): Promise<{ providerJobId: string }> {
    if (input.seed !== undefined && (input.seed < 0 || input.seed > 4294967294)) {
      throw new MusicJobError("INVALID_INPUT", "seed must be between 0 and 4294967294 for Stable Audio");
    }
    const providerJobId = `stability-${randomUUID()}`;
    const entry: Pending = {
      job: { id: providerJobId, providerJobId, status: "running", createdAt: new Date().toISOString() },
    };
    this.pending.set(providerJobId, entry);
    void this.generate(input).then(
      ({ audioUrl, seed }) => {
        entry.job = { ...entry.job, status: "succeeded", audioUrl };
        if (seed !== undefined) this.seeds.set(providerJobId, seed);
      },
      (e) => {
        const err = asMusicJobError(e);
        entry.job = { ...entry.job, status: "failed", error: withRaw({ code: err.code, message: err.message }, err.providerRaw) };
      },
    );
    return { providerJobId };
  }

  async poll(providerJobId: string): Promise<MusicJob> {
    const entry = this.pending.get(providerJobId);
    if (!entry) throw new MusicJobError("INTERNAL", `No Stability request ${providerJobId} in this process (it may have restarted)`);
    // Hand a finished result over once; the audio is held in memory until then.
    if (entry.job.status === "succeeded" || entry.job.status === "failed") this.pending.delete(providerJobId);
    return entry.job;
  }

  private async generate(input: GenerateMusicInput): Promise<{ audioUrl: string; seed?: number }> {
    const model = this.options.model ?? "stable-audio-2.5";
    const format = this.options.outputFormat ?? "mp3";
    const form = new FormData();
    form.set("prompt", input.prompt);
    form.set("duration", String(Math.min(input.durationSeconds ?? 30, this.maxDurationSeconds)));
    form.set("model", model);
    form.set("output_format", format);
    form.set("steps", model === "stable-audio-2.5" ? "8" : "50");
    if (model === "stable-audio-2") form.set("cfg_scale", "7");
    if (input.seed !== undefined) form.set("seed", String(input.seed));

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/v2beta/audio/stable-audio-2/text-to-audio`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.apiKey}`, Accept: "audio/*" },
        body: form,
      });
    } catch (e) {
      throw new MusicJobError("PROVIDER_UNAVAILABLE", `Couldn't reach Stability: ${(e as Error).message}`, { providerRaw: e });
    }
    if (!res.ok) {
      const text = await res.text();
      let detail = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { errors?: string[]; name?: string };
        detail = parsed.errors?.join("; ") || parsed.name || detail;
      } catch {}
      throw new MusicJobError(httpCode(res.status), `Stability ${res.status}: ${detail}`, { providerRaw: { status: res.status, body: text } });
    }
    const type = res.headers.get("content-type") ?? (format === "wav" ? "audio/wav" : "audio/mpeg");
    const bytes = Buffer.from(await res.arrayBuffer());
    const seedHeader = res.headers.get("seed");
    return {
      audioUrl: `data:${type};base64,${bytes.toString("base64")}`,
      ...(seedHeader ? { seed: Number(seedHeader) } : {}),
    };
  }
}
