/**
 * Builds the known-AI half of the detector test set.
 *
 *   REPLICATE_API_TOKEN=r8_... node services/detector-testset/generate.ts
 *   node services/detector-testset/generate.ts --dry-run
 *   node services/detector-testset/generate.ts --models lyria-2,musicgen --songs boom-bap --duration 20
 *
 * Every model × song in prompts.json becomes one job. Instrumental-only models
 * get the prompt alone; models that sing also get the lyrics. Output lands in
 * out/<timestamp>/ (gitignored) with manifest.json labelling every file as AI,
 * by which generator, from which prompt and seed: the ground truth the Hive vs
 * Modulate comparison is scored against.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { LocalAudioStore, MusicJobService, normalizeInput } from "./jobs.ts";
import { REPLICATE_MODELS, ReplicateProvider } from "./replicate.ts";
import type { GenerateSongInput, MusicJob } from "./types.ts";

type Song = { id: string; prompt: string; negativePrompt?: string; lyrics?: string };

const here = dirname(fileURLToPath(import.meta.url));

const { values: args } = parseArgs({
  options: {
    models: { type: "string", default: Object.keys(REPLICATE_MODELS).join(",") },
    songs: { type: "string" },
    duration: { type: "string", default: "30" },
    concurrency: { type: "string", default: "2" },
    out: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

const { songs: allSongs } = JSON.parse(await readFile(join(here, "prompts.json"), "utf8")) as { songs: Song[] };
const songIds = args.songs?.split(",").map((s) => s.trim());
const songs = songIds ? allSongs.filter((s) => songIds.includes(s.id)) : allSongs;
const modelKeys = args.models!.split(",").map((s) => s.trim());
const duration = Number(args.duration);
const token = process.env.REPLICATE_API_TOKEN ?? "";

if (!args["dry-run"] && !token) {
  console.error("Set REPLICATE_API_TOKEN (replicate.com → Account → API tokens), or pass --dry-run.");
  process.exit(1);
}

type Plan = { provider: ReplicateProvider; song: Song; input: GenerateSongInput };
const plan: Plan[] = [];
for (const key of modelKeys) {
  const provider = new ReplicateProvider(key, { token });
  songs.forEach((song, i) => {
    const input: GenerateSongInput = {
      prompt: song.prompt,
      durationSeconds: duration,
      seed: 1000 + i, // fixed per song, so a rerun of the same model reproduces the file where the model honors seeds
      ...(song.negativePrompt ? { negativePrompt: song.negativePrompt } : {}),
      ...(provider.model.sings && song.lyrics ? { lyrics: song.lyrics } : {}),
    };
    plan.push({ provider, song, input });
  });
}

console.log(`${plan.length} tracks: ${modelKeys.length} models × ${songs.length} songs, ${duration} s requested each`);
for (const { provider, song, input } of plan) {
  const n = normalizeInput(input, provider);
  const length = provider.model.honorsDuration ? `${n.durationSeconds} s` : "model picks length";
  console.log(`  ${provider.model.slug.padEnd(30)} ${song.id.padEnd(18)} ${length}${input.lyrics ? " · vocals" : ""}`);
}
if (args["dry-run"]) process.exit(0);

const outDir = args.out ?? join(here, "out", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(outDir, { recursive: true });
const service = new MusicJobService(new LocalAudioStore(join(outDir, "audio")));

type Entry = {
  label: "ai";
  generator: string;
  model: string;
  modelVersion: string | null;
  song: string;
  input: GenerateSongInput;
  file: string | null;
  sha256: string | null;
  job: MusicJob;
};
const entries: Entry[] = [];

async function writeManifest() {
  const manifest = { createdAt: new Date().toISOString(), source: "replicate", entries };
  await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

let next = 0;
async function worker() {
  while (next < plan.length) {
    const { provider, song, input } = plan[next++]!;
    const job = await service.run(provider, input);
    const stored = service.stored.get(job.id);
    entries.push({
      label: "ai",
      generator: provider.name,
      model: provider.model.slug,
      modelVersion: provider.version ?? null,
      song: song.id,
      input,
      file: stored ? relative(outDir, stored.path) : null,
      sha256: stored?.sha256 ?? null,
      job,
    });
    await writeManifest(); // after every job, so an interrupted run keeps what finished
    const detail = job.status === "succeeded" ? `${job.durationSeconds?.toFixed(1) ?? "?"} s` : `${job.error?.code}: ${job.error?.message}`;
    console.log(`[${entries.length}/${plan.length}] ${provider.model.slug} · ${song.id} · ${job.status} · ${detail}`);
  }
}

await Promise.all(Array.from({ length: Math.max(1, Number(args.concurrency)) }, worker));
const ok = entries.filter((e) => e.job.status === "succeeded").length;
console.log(`\n${ok} of ${entries.length} generated. Manifest: ${join(outDir, "manifest.json")}`);
process.exit(ok === entries.length ? 0 : 1);
