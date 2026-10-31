/**
 * HTTP front for the job service, for generating test tracks one request at a
 * time instead of in a batch.
 *
 *   POST /api/music/generate        { prompt, durationSeconds?, negativePrompt?, seed? }
 *                                    200 { jobId, status: "queued" } · 400 MusicError
 *   GET  /api/music/jobs/:jobId     200 MusicJob · 404
 *   GET  /api/music/files/:name     the stored audio
 *   POST /api/webhooks/replicate    Replicate's completion callback, signature-checked
 *
 * Environment: REPLICATE_API_TOKEN, STABILITY_API_KEY, MUSIC_PROVIDER
 * (replicate | stability), MUSIC_MAX_DURATION_SECONDS (default 30), plus
 * MUSIC_REPLICATE_MODEL (default musicgen), MUSIC_DATA_DIR, HOST/PORT,
 * MUSIC_PUBLIC_URL, MUSIC_WEBHOOK_URL, MUSIC_API_KEY. MUSIC_STORAGE_BUCKET is
 * reserved: cloud storage isn't wired, so the server refuses to start with it
 * set rather than quietly keeping files on local disk.
 *
 * Binds to 127.0.0.1. Anyone who can reach /generate spends the account's
 * credits, so listening anywhere else requires MUSIC_API_KEY.
 */
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { LocalAudioStore, MusicJobService } from "./jobs.ts";
import { ReplicateProvider, WebhookSignatureError } from "./replicate.ts";
import { StabilityProvider } from "./stability.ts";
import { MusicJobError, asMusicJobError, clientError } from "./types.ts";
import type { GenerateMusicInput, MusicJob, MusicProvider } from "./types.ts";

export type ServerConfig = {
  provider: MusicProvider;
  dataDir: string;
  maxDurationSeconds: number;
  apiKey?: string;
  /** Base URL clients use to reach this server; audio URLs are built from it. */
  publicUrl?: string;
  fetch?: typeof fetch;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

const terminal = (j: MusicJob | undefined) => !j || j.status === "succeeded" || j.status === "failed";

export async function createMusicServer(config: ServerConfig): Promise<{ server: Server; url: () => string; jobs: Map<string, MusicJob>; idle: () => Promise<void> }> {
  const { provider } = config;
  await mkdir(config.dataDir, { recursive: true });
  const jobsFile = join(config.dataDir, "jobs.json");
  const audioDir = join(config.dataDir, "audio");
  const jobs = new Map<string, MusicJob>();
  try {
    for (const j of JSON.parse(await readFile(jobsFile, "utf8")) as MusicJob[]) jobs.set(j.id, j);
  } catch {}

  let baseUrl = config.publicUrl?.replace(/\/$/, "") ?? "";
  const store = new LocalAudioStore(audioDir);
  const service = new MusicJobService(store, { maxDurationSeconds: config.maxDurationSeconds, ...(config.fetch ? { fetch: config.fetch } : {}) });
  const running = new Set<Promise<void>>();

  let saving = Promise.resolve();
  const persist = () => (saving = saving.then(() => writeFile(jobsFile, JSON.stringify([...jobs.values()], null, 2))));
  const put = (job: MusicJob) => {
    jobs.set(job.id, job);
    void persist();
  };

  /** Submit, then poll until done unless a webhook finishes the job first. */
  async function drive(job: MusicJob, input: GenerateMusicInput | null) {
    let current = input ? await service.start(provider, input, job) : job;
    if (!terminal(jobs.get(job.id))) put(current);
    const deadline = Date.now() + (config.timeoutMs ?? 10 * 60 * 1000);
    while (!terminal(jobs.get(job.id))) {
      if (Date.now() >= deadline) {
        put({ ...current, status: "failed", error: { code: "TIMEOUT", message: "No result in time" } });
        break;
      }
      await new Promise((r) => setTimeout(r, config.pollIntervalMs ?? 3000));
      const latest = jobs.get(job.id)!;
      if (terminal(latest)) break;
      current = await service.refresh(provider, latest);
      if (!terminal(jobs.get(job.id))) put(current);
    }
  }
  const track = (p: Promise<void>) => {
    running.add(p);
    void p.finally(() => running.delete(p));
  };

  // Jobs that were in flight when the server last stopped pick up where they left off;
  // ones that never reached the provider can't, and are closed out.
  for (const j of jobs.values()) {
    if (terminal(j)) continue;
    if (j.providerJobId) track(drive(j, null));
    else put({ ...j, status: "failed", error: { code: "INTERNAL", message: "Server restarted before the job was submitted" } });
  }

  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const readBody = async (req: IncomingMessage) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    return raw;
  };
  const withPublicUrl = (j: MusicJob): MusicJob => {
    if (!j.audioUrl?.startsWith("file:")) return j;
    const name = j.audioUrl.split("/").pop()!;
    return { ...j, audioUrl: `${baseUrl}/api/music/files/${name}` };
  };

  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://x").pathname;

      if (req.method === "POST" && path === "/api/webhooks/replicate") {
        if (!(provider instanceof ReplicateProvider)) return send(res, 404, { error: "not found" });
        const rawBody = await readBody(req);
        let remote: MusicJob;
        try {
          remote = await provider.handleWebhook({ headers: req.headers as Record<string, string>, rawBody });
        } catch (e) {
          if (e instanceof WebhookSignatureError) return send(res, 401, { error: e.message });
          throw e;
        }
        const job = [...jobs.values()].find((j) => j.providerJobId === remote.providerJobId);
        if (job && !terminal(job)) put(await service.complete(job, remote));
        return send(res, 200, { ok: true });
      }

      if (config.apiKey && req.headers.authorization !== `Bearer ${config.apiKey}`) {
        return send(res, 401, { error: "missing or wrong API key" });
      }

      if (req.method === "POST" && path === "/api/music/generate") {
        let input: GenerateMusicInput;
        try {
          const body = JSON.parse((await readBody(req)) || "{}") as Record<string, unknown>;
          input = {
            prompt: body.prompt as string,
            ...(body.durationSeconds !== undefined ? { durationSeconds: body.durationSeconds as number } : {}),
            ...(body.negativePrompt !== undefined ? { negativePrompt: body.negativePrompt as string } : {}),
            ...(body.seed !== undefined ? { seed: body.seed as number } : {}),
          };
          service.validate(provider, input);
        } catch (e) {
          const err = e instanceof SyntaxError ? new MusicJobError("INVALID_INPUT", "body must be JSON") : asMusicJobError(e);
          return send(res, 400, clientError(err.toMusicError()));
        }
        const job = service.newJob();
        put(job);
        track(drive(job, input));
        return send(res, 200, { jobId: job.id, status: "queued" });
      }

      let m = path.match(/^\/api\/music\/jobs\/([^/]+)$/);
      if (req.method === "GET" && m) {
        const job = jobs.get(decodeURIComponent(m[1]!));
        return job ? send(res, 200, withPublicUrl(job)) : send(res, 404, { error: "not found" });
      }

      m = path.match(/^\/api\/music\/files\/([0-9a-f-]+\.(wav|mp3|flac|ogg|m4a|bin))$/);
      if (req.method === "GET" && m) {
        const file = join(audioDir, m[1]!);
        const info = await stat(file).catch(() => null);
        if (!info) return send(res, 404, { error: "not found" });
        const type = { wav: "audio/wav", mp3: "audio/mpeg", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4", bin: "application/octet-stream" }[m[2]!]!;
        res.writeHead(200, { "content-type": type, "content-length": info.size });
        return void createReadStream(file).pipe(res);
      }

      return send(res, 404, { error: "not found" });
    } catch (e) {
      const err = asMusicJobError(e);
      console.error("[music server]", err.message, err.providerRaw ?? "");
      return send(res, 500, clientError({ ...err.toMusicError(), code: "INTERNAL", message: "Internal error" }));
    }
  });

  return {
    server,
    jobs,
    url: () => {
      if (!baseUrl) {
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
      }
      return baseUrl;
    },
    /** Resolves once every in-flight job has finished (tests use it). */
    idle: async () => {
      while (running.size) await Promise.all([...running]);
      await saving;
    },
  };
}

function isLoopback(host: string) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  if (env.MUSIC_STORAGE_BUCKET) {
    console.error("MUSIC_STORAGE_BUCKET is set, but cloud storage isn't wired yet. Unset it to keep audio under MUSIC_DATA_DIR.");
    process.exit(1);
  }
  const host = env.HOST ?? "127.0.0.1";
  if (!isLoopback(host) && !env.MUSIC_API_KEY) {
    console.error(`Refusing to listen on ${host} without MUSIC_API_KEY: anyone who reaches /generate spends your credits.`);
    process.exit(1);
  }
  const which = (env.MUSIC_PROVIDER ?? "replicate").toLowerCase();
  let provider: MusicProvider;
  if (which === "stability") {
    if (!env.STABILITY_API_KEY) throw new Error("MUSIC_PROVIDER=stability needs STABILITY_API_KEY");
    provider = new StabilityProvider({ apiKey: env.STABILITY_API_KEY });
  } else if (which === "replicate") {
    if (!env.REPLICATE_API_TOKEN) throw new Error("MUSIC_PROVIDER=replicate needs REPLICATE_API_TOKEN");
    provider = new ReplicateProvider(env.MUSIC_REPLICATE_MODEL ?? "musicgen", {
      token: env.REPLICATE_API_TOKEN,
      waitSeconds: 0, // the HTTP response doesn't wait on generation, so neither does submit
      ...(env.MUSIC_WEBHOOK_URL ? { webhookUrl: env.MUSIC_WEBHOOK_URL } : {}),
    });
  } else {
    throw new Error(`MUSIC_PROVIDER must be replicate or stability, not "${which}"`);
  }
  const port = Number(env.PORT ?? 8790);
  const app = await createMusicServer({
    provider,
    dataDir: resolve(env.MUSIC_DATA_DIR ?? join(import.meta.dirname, "out", "server")),
    maxDurationSeconds: Number(env.MUSIC_MAX_DURATION_SECONDS ?? 30),
    ...(env.MUSIC_API_KEY ? { apiKey: env.MUSIC_API_KEY } : {}),
    ...(env.MUSIC_PUBLIC_URL ? { publicUrl: env.MUSIC_PUBLIC_URL } : { publicUrl: `http://${host}:${port}` }),
  });
  app.server.listen(port, host, () => console.log(`music API on http://${host}:${port} · provider ${provider.name}`));
}
