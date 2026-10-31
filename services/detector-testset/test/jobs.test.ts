/**
 *   node --test services/detector-testset/test/jobs.test.ts
 *
 * Runs the real provider and job service against an in-process fake of
 * Replicate's API, so every request body, status transition and failure path
 * is checked without spending credits.
 */
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { audioDurationSeconds } from "../audio.ts";
import { LocalAudioStore, MusicJobService, normalizeInput } from "../jobs.ts";
import { ReplicateProvider } from "../replicate.ts";
import type { GenerateSongInput, MusicError } from "../types.ts";
import { FakeReplicate, TOKEN, mp3Bytes, wavBytes } from "./fake-replicate.ts";

const fake = new FakeReplicate();
let dir = "";
let service: MusicJobService;
const logged: MusicError[] = [];
const fastWait = { pollIntervalMs: 1, sleep: async () => {} };

const provider = (key: string, token = TOKEN) => new ReplicateProvider(key, { token, baseUrl: `${fake.baseUrl}/v1` });
const lastBody = () => fake.created.at(-1)!.body;

before(async () => {
  await fake.listen();
  dir = await mkdtemp(join(tmpdir(), "detector-testset-"));
});
after(async () => {
  await fake.close();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(() => {
  fake.behaviors.clear();
  fake.readStatus = 200;
  fake.created.length = 0;
  fake.files.set("out.wav", { bytes: wavBytes(2), type: "audio/wav" });
  logged.length = 0;
  service = new MusicJobService(new LocalAudioStore(join(dir, "audio")), { log: (id, e) => logged.push(e) });
});

describe("input rules", () => {
  const p = () => provider("stable-audio-2.5");

  test("prompt is required and capped at 2000 characters", () => {
    assert.throws(() => normalizeInput({ prompt: "" }, p()), { code: "INVALID_INPUT" });
    assert.throws(() => normalizeInput({ prompt: "   " }, p()), { code: "INVALID_INPUT" });
    assert.throws(() => normalizeInput({ prompt: "x".repeat(2001) }, p()), { code: "INVALID_INPUT" });
    assert.equal(normalizeInput({ prompt: "x".repeat(2000) }, p()).prompt.length, 2000);
  });

  test("duration defaults to 30 and clamps to the provider max", () => {
    assert.equal(normalizeInput({ prompt: "a" }, p()).durationSeconds, 30);
    assert.equal(normalizeInput({ prompt: "a", durationSeconds: 500 }, p()).durationSeconds, 190);
    assert.equal(normalizeInput({ prompt: "a", durationSeconds: 500 }, provider("musicgen")).durationSeconds, 30);
    assert.throws(() => normalizeInput({ prompt: "a", durationSeconds: 0 }, p()), { code: "INVALID_INPUT" });
    assert.throws(() => normalizeInput({ prompt: "a", durationSeconds: Number.NaN }, p()), { code: "INVALID_INPUT" });
  });

  test("seed must be an integer", () => {
    assert.throws(() => normalizeInput({ prompt: "a", seed: 1.5 }, p()), { code: "INVALID_INPUT" });
  });
});

describe("official model, full lifecycle", () => {
  test("submits by model name, polls to success, stores the audio as ours", async () => {
    fake.behaviors.set("stability-ai/stable-audio-2.5", { statuses: ["starting", "processing", "processing", "succeeded"] });
    const job = await service.run(provider("stable-audio-2.5"), { prompt: "boom bap", seed: 7, durationSeconds: 500 }, fastWait);

    assert.equal(job.status, "succeeded");
    assert.deepEqual(lastBody(), { input: { prompt: "boom bap", duration: 190, seed: 7 } });
    assert.match(job.id, /^[0-9a-f-]{36}$/);
    assert.equal(job.providerJobId, "pred-1");
    assert.ok(job.audioUrl?.startsWith("file://"), "audioUrl points at our copy, not Replicate's");
    const saved = await readFile(fileURLToPath(job.audioUrl!));
    assert.deepEqual(new Uint8Array(saved), fake.files.get("out.wav")!.bytes);
    assert.equal(job.durationSeconds, 2);
    assert.equal(job.error, undefined);
    assert.match(service.stored.get(job.id)!.sha256, /^[0-9a-f]{64}$/);
  });

  test("asks Replicate to wait up to 60 s and to cancel abandoned runs", async () => {
    fake.behaviors.set("google/lyria-2", {});
    await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(fake.created.at(-1)!.headers["prefer"], "wait=60");
    assert.equal(fake.created.at(-1)!.headers["cancel-after"], "10m");
  });

  test("a global cap (MUSIC_MAX_DURATION_SECONDS) applies on top of the model max", async () => {
    fake.behaviors.set("stability-ai/stable-audio-2.5", {});
    const capped = new MusicJobService(new LocalAudioStore(join(dir, "audio")), { maxDurationSeconds: 30, log: () => {} });
    await capped.run(provider("stable-audio-2.5"), { prompt: "boom bap", durationSeconds: 120 }, fastWait);
    assert.equal((lastBody().input as { duration: number }).duration, 30);
  });

  test("intermediate statuses map to queued then running", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["starting", "processing", "succeeded"] });
    const p = provider("lyria-2");
    let job = await service.start(p, { prompt: "soul" });
    assert.equal(job.status, "queued");
    job = await service.refresh(p, job);
    assert.equal(job.status, "queued");
    job = await service.refresh(p, job);
    assert.equal(job.status, "running");
    job = await service.refresh(p, job);
    assert.equal(job.status, "succeeded");
  });

  test("array output takes the first URL", async () => {
    fake.behaviors.set("google/lyria-2", { output: ["$FILE", "ignored"] });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.status, "succeeded");
  });
});

describe("per-model request shapes", () => {
  test("community model resolves its version and posts to /predictions", async () => {
    fake.behaviors.set("meta/musicgen", {});
    const p = provider("musicgen");
    const job = await service.run(p, { prompt: "garage", durationSeconds: 45, seed: 3 }, fastWait);
    assert.equal(job.status, "succeeded");
    assert.equal(lastBody().version, "v-meta__musicgen");
    assert.deepEqual(lastBody().input, {
      prompt: "garage",
      duration: 30,
      model_version: "stereo-large",
      output_format: "mp3",
      normalization_strategy: "loudness",
      seed: 3,
    });
    assert.equal(p.version, "v-meta__musicgen");
  });

  test("lyria passes the negative prompt and seed, and no duration", async () => {
    fake.behaviors.set("google/lyria-2", {});
    await service.run(provider("lyria-2"), { prompt: "soul", negativePrompt: "synth bass", seed: 9, durationSeconds: 12 }, fastWait);
    assert.deepEqual(lastBody().input, { prompt: "soul", negative_prompt: "synth bass", seed: 9 });
  });

  test("minimax needs lyrics and fails before any request without them", async () => {
    fake.behaviors.set("minimax/music-1.5", {});
    const job = await service.run(provider("minimax-music-1.5"), { prompt: "R&B ballad, 68 BPM" }, fastWait);
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "INVALID_INPUT");
    assert.match(job.error!.message, /lyrics/);
    assert.equal(fake.created.length, 0);
  });

  test("minimax sends lyrics and asks for WAV", async () => {
    fake.behaviors.set("minimax/music-1.5", {});
    const input: GenerateSongInput = { prompt: "R&B ballad, 68 BPM", lyrics: "[verse]\nLate night, porch light" };
    const job = await service.run(provider("minimax-music-1.5"), input, fastWait);
    assert.equal(job.status, "succeeded");
    assert.deepEqual(lastBody().input, { prompt: "R&B ballad, 68 BPM", lyrics: "[verse]\nLate night, porch light", audio_format: "wav", sample_rate: 44100 });
  });

  test("elevenlabs folds lyrics into the prompt and turns vocals on", async () => {
    fake.behaviors.set("elevenlabs/music", {});
    await service.run(provider("elevenlabs-music"), { prompt: "pop", lyrics: "la la la la la", durationSeconds: 2 } as GenerateSongInput, fastWait);
    assert.deepEqual(lastBody().input, {
      prompt: "pop\n\nLyrics:\nla la la la la",
      music_length_ms: 5000,
      force_instrumental: false,
      output_format: "wav_cd_quality",
    });
  });

  test("ace-step without lyrics asks for an instrumental and a random seed", async () => {
    fake.behaviors.set("lucataco/ace-step", {});
    await service.run(provider("ace-step"), { prompt: "trap, 140 bpm" }, fastWait);
    assert.deepEqual(lastBody().input, { tags: "trap, 140 bpm", lyrics: "[instrumental]", duration: 30, seed: -1 });
  });
});

describe("failures come back as failed jobs", () => {
  test("generation failure carries the provider's message", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["processing", "failed"], error: "CUDA out of memory" });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.status, "failed");
    assert.deepEqual(job.error, { code: "GENERATION_FAILED", message: "CUDA out of memory" });
    assert.equal(logged.at(-1)?.retryable, true);
    assert.equal((logged.at(-1)?.providerRaw as { error: string }).error, "CUDA out of memory", "raw prediction is logged");
  });

  test("a prediction Replicate aborted is a failure with its own code", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["starting", "aborted"] });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "GENERATION_FAILED");
    assert.match(job.error!.message, /aborted/);
  });

  test("a safety-filter failure is CONTENT_BLOCKED and not retryable", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["failed"], error: "The input or output was flagged as sensitive. (E005)" });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.error?.code, "CONTENT_BLOCKED");
    assert.equal(logged.at(-1)?.retryable, false);
  });

  test("an outage while polling keeps waiting instead of failing the job", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["processing", "succeeded"] });
    const p = provider("lyria-2");
    let job = await service.start(p, { prompt: "soul" });
    fake.readStatus = 503;
    job = await service.refresh(p, job);
    assert.equal(job.status, "queued");
    fake.readStatus = 200;
    job = await service.waitFor(p, job, fastWait);
    assert.equal(job.status, "succeeded");
  });

  test("a rejected request maps the HTTP status to a code", async () => {
    fake.behaviors.set("google/lyria-2", { submitStatus: 422, submitDetail: "prompt flagged" });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "CONTENT_BLOCKED");
    assert.match(job.error!.message, /prompt flagged/);
    assert.deepEqual(logged.at(-1)?.providerRaw, { status: 422, body: JSON.stringify({ detail: "prompt flagged" }) });
  });

  test("a bad token is an internal error, not retryable", async () => {
    const job = await service.run(provider("lyria-2", "wrong"), { prompt: "soul" }, fastWait);
    assert.equal(job.error?.code, "INTERNAL");
    assert.equal(logged.at(-1)?.retryable, false);
  });

  test("a job that never finishes times out", async () => {
    fake.behaviors.set("google/lyria-2", { statuses: ["processing"] });
    let clock = 0;
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, {
      pollIntervalMs: 1000,
      timeoutMs: 5000,
      sleep: async (ms) => void (clock += ms),
      now: () => clock,
    });
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "TIMEOUT");
  });

  test("success with no audio URL is a failure", async () => {
    fake.behaviors.set("google/lyria-2", { output: null });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.error?.code, "GENERATION_FAILED");
  });

  test("an expired output link is a storage error, not a success", async () => {
    fake.behaviors.set("google/lyria-2", { output: fake.fileUrl("gone.wav") });
    const job = await service.run(provider("lyria-2"), { prompt: "soul" }, fastWait);
    assert.equal(job.status, "failed");
    assert.equal(job.error?.code, "INTERNAL");
    assert.match(job.error!.message, /saving the audio failed/);
    assert.equal(job.audioUrl, undefined);
  });

  test("an unknown model key is refused up front", () => {
    assert.throws(() => provider("suno"), /Unknown model "suno"/);
  });
});

describe("audio durations", () => {
  test("WAV from the data chunk", () => {
    assert.equal(audioDurationSeconds(wavBytes(2.5, 48000, 1), "wav"), 2.5);
  });

  test("MP3 by walking frames past an ID3 tag", () => {
    assert.ok(Math.abs(audioDurationSeconds(mp3Bytes(100), "mp3")! - (100 * 1152) / 44100) < 1e-9);
  });

  test("unknown formats are left undefined", () => {
    assert.equal(audioDurationSeconds(new Uint8Array(100), "flac"), undefined);
    assert.equal(audioDurationSeconds(new Uint8Array(100), "wav"), undefined);
  });
});
