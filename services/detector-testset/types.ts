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

export type MusicError = {
  code:
    | "INVALID_INPUT"
    | "CONTENT_BLOCKED" // prompt rejected by safety filter
    | "RATE_LIMITED"
    | "PROVIDER_UNAVAILABLE"
    | "GENERATION_FAILED"
    | "TIMEOUT"
    | "INTERNAL";
  message: string;
  retryable: boolean;
  providerRaw?: unknown; // log only, never return to client
};

export type MusicErrorCode = MusicError["code"];

const RETRYABLE: Record<MusicErrorCode, boolean> = {
  INVALID_INPUT: false,
  CONTENT_BLOCKED: false,
  RATE_LIMITED: true,
  PROVIDER_UNAVAILABLE: true,
  GENERATION_FAILED: true,
  TIMEOUT: true,
  INTERNAL: false,
};

/** Thrown by providers and the job service; becomes MusicJob.error, or a 400 body. */
export class MusicJobError extends Error {
  code: MusicErrorCode;
  retryable: boolean;
  providerRaw: unknown;

  constructor(code: MusicErrorCode, message: string, options: { retryable?: boolean; providerRaw?: unknown } = {}) {
    super(message);
    this.name = "MusicJobError";
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE[code];
    this.providerRaw = options.providerRaw;
  }

  toMusicError(): MusicError {
    return { code: this.code, message: this.message, retryable: this.retryable, providerRaw: this.providerRaw };
  }
}

/** What a client may see: the error without the provider's raw response. */
export function clientError(error: MusicError): Omit<MusicError, "providerRaw"> {
  const { providerRaw: _raw, ...rest } = error;
  return rest;
}

/** Anything thrown, as a MusicJobError. */
export function asMusicJobError(e: unknown): MusicJobError {
  if (e instanceof MusicJobError) return e;
  return new MusicJobError("INTERNAL", e instanceof Error ? e.message : String(e), { providerRaw: e });
}
