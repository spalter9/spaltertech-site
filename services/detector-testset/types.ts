/**
 * Contract for the known-AI test-set generator.
 *
 * GenerateMusicInput, MusicJob and MusicProvider are kept exactly as specified.
 * GenerateSongInput only adds lyrics, for the generators that sing — the AI
 * detectors judge vocals separately from the instrumental, so the test set
 * needs AI vocals as well as AI beds.
 */

export type GenerateMusicInput = {
  prompt: string; // required, 1..2000 chars
  negativePrompt?: string;
  durationSeconds?: number; // default 30, clamp to provider max
  seed?: number;
};

export type MusicJob = {
  id: string; // our job id
  providerJobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
  audioUrl?: string; // our storage URL, set on success
  durationSeconds?: number;
  error?: { code: string; message: string };
  createdAt: string;
};

export interface MusicProvider {
  name: string;
  maxDurationSeconds: number;
  submit(input: GenerateMusicInput): Promise<{ providerJobId: string }>;
  poll(providerJobId: string): Promise<MusicJob>;
  // optional: handleWebhook(req): Promise<MusicJob>
}

export type GenerateSongInput = GenerateMusicInput & { lyrics?: string };

/** Thrown by providers and the job service; `code` lands in MusicJob.error. */
export class MusicJobError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MusicJobError";
    this.code = code;
  }
}
