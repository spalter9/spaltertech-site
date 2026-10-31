/**
 *   node --test services/detector-testset/test/service.test.ts
 *
 * Stability's direct API, Replicate webhooks, and the HTTP server, each run
 * for real against in-process fakes.
 */
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalAudioStore, MusicJobService } from "../jobs.ts";
import { ReplicateProvider, WebhookSignatureError } from "../replicate.ts";
import { createMusicServer } from "../server.ts";
import { StabilityProvider } from "../stability.ts";
import type { MusicError, MusicJob } from "../types.ts";
import { FakeReplicate, TOKEN, mp3Bytes, signWebhook, wavBytes } from "./fake-replicate.ts";

const fake = new FakeReplicate();
let dir = "";
const logged: MusicError[] = [];
const quiet = { log: (_id: string, e: MusicError) => void logged.push(e) };
// A real timer, not an instant promise: Stability's request runs in the background
// and an instant sleep would spin the poll loop without ever letting its reply in.
const fastWait = { pollIntervalMs: 1, sleep: () => new Promise<void>((r) => setTimeout(r, 1)) };

before(async () => {
  await fake.listen();
  dir = await mkdtemp(join(tmpdir(), "detector-service-"));
});
after(async () => {
  await fake.close();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(() => {
  fake.behaviors.clear();
  fake.created.length = 0;
  fake.readStatus = 200;
  fake.files.set("out.wav", { bytes: wavBytes(2), type: "audio/wav" });
});

// ---------- Stability ----------

type StabilityCall = { fields: Record<string, string>; headers: Record<string, string | string[] | undefined> };

async function fakeStability(): Promise<{ server: Server; url: string; calls: StabilityCall[] }> {
  const calls: StabilityCall[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const form = await new Request("http://x", { method: "POST", headers: { "content-type": req.headers["content-type"]! }, body: Buffer.concat(chunks) }).formData();
    const fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    calls.push({ fields, headers: req.headers });
    if (req.headers.authorization !== "Bearer sk-test") {
      res.writeHead(401, { "content-type": "application/json" });
      return res.end(JSON.stringify({ name: "unauthorized", errors: ["authorization: invalid or missing header value"] }));
    }
    if (fields.prompt!.includes("blocked")) {
      res.writeHead(403, { "content-type": "application/json" });
      return res.end(JSON.stringify({ name: "content_moderation", errors: ["Your request was flagged by our content moderation system"] }));
    }
    res.writeHead(200, { "content-type": "audio/mpeg", seed: "424242", "finish-reason": "SUCCESS" });
    res.end(mp3Bytes(50));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls };
}

describe("Stability direct", () => {
  let stab: Awaited<ReturnType<typeof fakeStability>>;
  before(async () => (stab = await fakeStability()));
  after(() => new Promise<void>((r) => stab.server.close(() => r())));

  test("posts multipart with Stable Audio 2.5 settings and stores the returned MP3", async () => {
    const p = new StabilityProvider({ apiKey: "sk-test", baseUrl: stab.url });
    const service = new MusicJobService(new LocalAudioStore(join(dir, "stab")), quiet);
    const job = await service.run(p, { prompt: "boom bap", durationSeconds: 500, seed: 7, negativePrompt: "edm" }, fastWait);

    assert.equal(job.status, "succeeded");
    const call = stab.calls.at(-1)!;
    assert.match(String(call.headers["content-type"]), /^multipart\/form-data/);
    assert.equal(call.headers.accept, "audio/*");
    assert.deepEqual(call.fields, { prompt: "boom bap", duration: "190", model: "stable-audio-2.5", output_format: "mp3", steps: "8", seed: "7" });
    assert.ok(job.audioUrl!.endsWith(".mp3"));
    assert.ok(Math.abs(job.durationSeconds! - (50 * 1152) / 44100) < 1e-9);
    assert.equal(p.seedUsed(job.providerJobId), 424242);
  });

  test("Stable Audio 2 gets its own step range and cfg_scale", async () => {
    const p = new StabilityProvider({ apiKey: "sk-test", baseUrl: stab.url, model: "stable-audio-2" });
    await new MusicJobService(new LocalAudioStore(join(dir, "stab")), quiet).run(p, { prompt: "soul" }, fastWait);
    const { fields } = stab.calls.at(-1)!;
    assert.equal(fields.steps, "50");
    assert.equal(fields.cfg_scale, "7");
  });

  test("content moderation (403) is CONTENT_BLOCKED; a bad key is INTERNAL", async () => {
    const service = new MusicJobService(new LocalAudioStore(join(dir, "stab")), quiet);
    const blocked = await service.run(new StabilityProvider({ apiKey: "sk-test", baseUrl: stab.url }), { prompt: "blocked words" }, fastWait);
    assert.equal(blocked.error?.code, "CONTENT_BLOCKED");
    assert.match(blocked.error!.message, /content moderation/);
    assert.deepEqual(Object.keys(blocked.error!), ["code", "message"]);
    assert.match(String((logged.at(-1)?.providerRaw as { body: string }).body), /content_moderation/, "raw response is logged");
    const badKey = await service.run(new StabilityProvider({ apiKey: "nope", baseUrl: stab.url }), { prompt: "soul" }, fastWait);
    assert.equal(badKey.error?.code, "INTERNAL");
  });

  test("an out-of-range seed is rejected before any request", async () => {
    const before = stab.calls.length;
    const job = await new MusicJobService(new LocalAudioStore(join(dir, "stab")), quiet).run(
      new StabilityProvider({ apiKey: "sk-test", baseUrl: stab.url }),
      { prompt: "soul", seed: -5 },
      fastWait,
    );
    assert.equal(job.error?.code, "INVALID_INPUT");
    assert.equal(stab.calls.length, before);
  });
});

// ---------- Replicate webhooks ----------

describe("Replicate webhook signatures", () => {
  const prediction = JSON.stringify({ id: "pred-77", status: "succeeded", output: "https://replicate.delivery/x/out.mp3", created_at: "2026-10-31T00:00:00Z" });
  const at = 1_800_000_000;
  const provider = () => new ReplicateProvider("musicgen", { token: TOKEN, baseUrl: `${fake.baseUrl}/v1`, now: () => at * 1000 });

  test("a correctly signed delivery becomes a job, using the secret fetched from Replicate", async () => {
    const job = await provider().handleWebhook({ headers: signWebhook(prediction, at), rawBody: prediction });
    assert.equal(job.providerJobId, "pred-77");
    assert.equal(job.status, "succeeded");
    assert.equal(job.audioUrl, "https://replicate.delivery/x/out.mp3");
  });

  test("a changed body, a wrong secret, or a stale timestamp is refused", async () => {
    const p = provider();
    await assert.rejects(p.handleWebhook({ headers: signWebhook(prediction, at), rawBody: prediction.replace("77", "78") }), WebhookSignatureError);
    const other = `whsec_${Buffer.from("someone-else").toString("base64")}`;
    await assert.rejects(p.handleWebhook({ headers: signWebhook(prediction, at, other), rawBody: prediction }), WebhookSignatureError);
    await assert.rejects(p.handleWebhook({ headers: signWebhook(prediction, at - 3600), rawBody: prediction }), /tolerance/);
    await assert.rejects(p.handleWebhook({ headers: {}, rawBody: prediction }), /missing/);
  });
});

// ---------- HTTP server ----------

async function startServer(opts: { apiKey?: string; statuses?: string[]; dataDir?: string } = {}) {
  fake.behaviors.set("meta/musicgen", opts.statuses ? { statuses: opts.statuses } : {});
  const provider = new ReplicateProvider("musicgen", { token: TOKEN, baseUrl: `${fake.baseUrl}/v1`, waitSeconds: 0 });
  const app = await createMusicServer({
    provider,
    dataDir: opts.dataDir ?? (await mkdtemp(join(dir, "srv-"))),
    maxDurationSeconds: 30,
    pollIntervalMs: 5,
    ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
  });
  await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
  const base = app.url();
  const call = (path: string, init?: RequestInit) => fetch(`${base}${path}`, init);
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    call(path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
  return { app, base, call, post, close: () => new Promise<void>((r) => app.server.close(() => r())) };
}

describe("HTTP API", () => {
  test("generate → queued → poll → succeeded, with the audio served from our own URL", async () => {
    const s = await startServer();
    const res = await s.post("/api/music/generate", { prompt: "boom bap", durationSeconds: 90, seed: 3 });
    assert.equal(res.status, 200);
    const { jobId, status } = (await res.json()) as { jobId: string; status: string };
    assert.equal(status, "queued");

    await s.app.idle();
    const job = (await (await s.call(`/api/music/jobs/${jobId}`)).json()) as MusicJob;
    assert.equal(job.status, "succeeded");
    assert.equal(job.audioUrl, `${s.base}/api/music/files/${jobId}.wav`);
    assert.equal((fake.created.at(-1)!.body.input as { duration: number }).duration, 30);
    const audio = await fetch(job.audioUrl!);
    assert.equal(audio.headers.get("content-type"), "audio/wav");
    assert.deepEqual(new Uint8Array(await audio.arrayBuffer()), fake.files.get("out.wav")!.bytes);
    await s.close();
  });

  test("bad input is a 400 MusicError with no provider internals", async () => {
    const s = await startServer();
    for (const body of [{}, { prompt: "" }, { prompt: "x".repeat(2001) }, { prompt: "a", durationSeconds: -1 }, "{not json"]) {
      const res = await s.post("/api/music/generate", body);
      assert.equal(res.status, 400);
      const err = (await res.json()) as Record<string, unknown>;
      assert.equal(err.code, "INVALID_INPUT");
      assert.equal(err.retryable, false);
      assert.ok(!("providerRaw" in err));
    }
    await s.close();
  });

  test("unknown job is 404; unknown route is 404", async () => {
    const s = await startServer();
    assert.equal((await s.call("/api/music/jobs/nope")).status, 404);
    assert.equal((await s.call("/api/music/files/../../jobs.json")).status, 404);
    await s.close();
  });

  test("a provider failure shows on the job, raw response kept out of it", async () => {
    const s = await startServer({ statuses: ["processing", "failed"] });
    fake.behaviors.get("meta/musicgen")!.error = "The input or output was flagged as sensitive. (E005)";
    const { jobId } = (await (await s.post("/api/music/generate", { prompt: "x" })).json()) as { jobId: string };
    await s.app.idle();
    const job = (await (await s.call(`/api/music/jobs/${jobId}`)).json()) as MusicJob & Record<string, unknown>;
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "CONTENT_BLOCKED");
    assert.ok(!("providerRaw" in job) && !("providerRaw" in (job.error as object)));
    await s.close();
  });

  test("with MUSIC_API_KEY set, requests without it are refused", async () => {
    const s = await startServer({ apiKey: "k1" });
    assert.equal((await s.post("/api/music/generate", { prompt: "x" })).status, 401);
    assert.equal((await s.call("/api/music/jobs/x")).status, 401);
    assert.equal((await s.post("/api/music/generate", { prompt: "x" }, { authorization: "Bearer k1" })).status, 200);
    await s.app.idle();
    await s.close();
  });

  test("a signed webhook finishes a job that polling alone never would", async () => {
    const s = await startServer({ statuses: ["processing"] });
    const { jobId } = (await (await s.post("/api/music/generate", { prompt: "x" })).json()) as { jobId: string };
    let job: MusicJob | undefined;
    while (!(job = s.app.jobs.get(jobId))?.providerJobId) await new Promise((r) => setTimeout(r, 5));

    const body = JSON.stringify({ id: job.providerJobId, status: "succeeded", output: fake.fileUrl("out.wav") });
    const bad = await s.call("/api/webhooks/replicate", { method: "POST", headers: { ...signWebhook(body, Math.floor(Date.now() / 1000)), "webhook-signature": "v1,AAAA" }, body });
    assert.equal(bad.status, 401);
    const ok = await s.call("/api/webhooks/replicate", { method: "POST", headers: signWebhook(body, Math.floor(Date.now() / 1000)), body });
    assert.equal(ok.status, 200);

    await s.app.idle();
    assert.equal(s.app.jobs.get(jobId)?.status, "succeeded");
    await s.close();
  });

  test("after a restart, in-flight jobs resume and never-submitted ones are closed out", async () => {
    fake.behaviors.set("meta/musicgen", {});
    const p = new ReplicateProvider("musicgen", { token: TOKEN, baseUrl: `${fake.baseUrl}/v1`, waitSeconds: 0 });
    const { providerJobId } = await p.submit({ prompt: "x" });
    const dataDir = await mkdtemp(join(dir, "restart-"));
    const stale: MusicJob[] = [
      { id: "11111111-1111-1111-1111-111111111111", providerJobId, status: "running", createdAt: "2026-10-31T00:00:00Z" },
      { id: "22222222-2222-2222-2222-222222222222", providerJobId: "", status: "queued", createdAt: "2026-10-31T00:00:00Z" },
    ];
    await writeFile(join(dataDir, "jobs.json"), JSON.stringify(stale));

    const s = await startServer({ dataDir });
    await s.app.idle();
    assert.equal(s.app.jobs.get(stale[0]!.id)?.status, "succeeded");
    assert.equal(s.app.jobs.get(stale[1]!.id)?.error?.code, "INTERNAL");
    const saved = JSON.parse(await readFile(join(dataDir, "jobs.json"), "utf8")) as MusicJob[];
    assert.equal(saved.find((j) => j.id === stale[0]!.id)?.status, "succeeded");
    await s.close();
  });
});
