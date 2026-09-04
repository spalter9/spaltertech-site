import type { RawStemMeasurement } from "./scoring";

/**
 * Client for the self-hosted separation + measurement worker.
 *
 * The worker is the only network hop either module makes, and it is the
 * operator's own container on the operator's own network — no audio ever
 * leaves the perimeter. If it is unreachable the audit degrades loudly rather
 * than guessing: a forensic report with an invented verdict is worse than no
 * report at all.
 */

const DEFAULT_URL = "http://127.0.0.1:8770";

/** Demixing a full track on CPU is genuinely slow; give it room. */
const DEFAULT_TIMEOUT_MS = 20 * 60 * 1000;

export type DemixerHealth = {
  online: boolean;
  model: string;
  device: string;
  detail?: string;
};

export type DemixerResponse = {
  model: string;
  device: string;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  stems: RawStemMeasurement[];
  /** Worker-side wall clock, for the operator's capacity planning. */
  elapsed_sec: number;
};

function workerUrl(): string {
  return (process.env.DEMIXER_URL || DEFAULT_URL).replace(/\/+$/, "");
}

function timeoutMs(): number {
  const raw = Number(process.env.DEMIXER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export async function demixerHealth(): Promise<DemixerHealth> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${workerUrl()}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { online: false, model: "unavailable", device: "unavailable", detail: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { model?: string; device?: string };
    return {
      online: true,
      model: json.model ?? "htdemucs",
      device: json.device ?? "unknown",
    };
  } catch (err) {
    return {
      online: false,
      model: "unavailable",
      device: "unavailable",
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

/**
 * Separate and measure. Returns raw measurements only — the verdict is drawn
 * from them here in Node, by `scoring.ts`, so the policy stays in one place.
 */
export async function runDemixAnalysis(params: {
  bytes: Uint8Array;
  fileName: string;
}): Promise<DemixerResponse> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([params.bytes as unknown as BlobPart], { type: "application/octet-stream" }),
    params.fileName,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(`${workerUrl()}/analyze`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Demixer worker returned ${res.status}: ${detail.slice(0, 300)}`);
    }
    const json = (await res.json()) as DemixerResponse;
    if (!Array.isArray(json.stems) || json.stems.length === 0) {
      throw new Error("Demixer worker returned no stems");
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}
