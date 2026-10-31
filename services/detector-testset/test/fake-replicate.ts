/**
 * In-process stand-in for the slice of Replicate's HTTP API the provider uses:
 * create prediction (by model name or by version), read prediction, read model,
 * plus a file host for outputs. Each model slug gets a scripted behaviour.
 */
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export const TOKEN = "test-token";
/** Standard Webhooks secret: "whsec_" + base64 of the HMAC key. */
export const WEBHOOK_SECRET = `whsec_${Buffer.from("replicate-test-signing-key").toString("base64")}`;

/** Headers Replicate would send with `body`, signed with WEBHOOK_SECRET (or another secret). */
export function signWebhook(body: string, timestamp: number, secret = WEBHOOK_SECRET): Record<string, string> {
  const id = "msg_test";
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": String(timestamp), "webhook-signature": `v1,${sig}` };
}

export type Behavior = {
  statuses?: string[]; // status returned by each successive GET; the last one repeats
  output?: unknown; // returned once status is succeeded; "$FILE" is replaced with the served file URL
  error?: string;
  submitStatus?: number; // reject the create call with this HTTP status
  submitDetail?: string;
};

type Prediction = { id: string; slug: string; reads: number; behavior: Behavior };

export class FakeReplicate {
  server: Server;
  baseUrl = "";
  behaviors = new Map<string, Behavior>();
  /** Every create-prediction body received, with the slug it was for and the request headers. */
  created: { slug: string; body: Record<string, unknown>; headers: Record<string, string | string[] | undefined> }[] = [];
  /** Status to return for prediction reads, to simulate an outage. */
  readStatus = 200;
  files = new Map<string, { bytes: Uint8Array; type: string }>();
  private predictions = new Map<string, Prediction>();
  private nextId = 1;

  constructor() {
    this.server = createServer((req, res) => void this.handle(req, res));
  }

  async listen(): Promise<void> {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  fileUrl(name: string): string {
    return `${this.baseUrl}/files/${name}`;
  }

  private send(res: ServerResponse, status: number, body: unknown, type = "application/json") {
    res.writeHead(status, { "content-type": type });
    res.end(body instanceof Uint8Array ? body : JSON.stringify(body));
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", this.baseUrl);
    const path = url.pathname;

    if (req.method === "GET" && path.startsWith("/files/")) {
      const file = this.files.get(path.slice("/files/".length));
      return file ? this.send(res, 200, file.bytes, file.type) : this.send(res, 404, { detail: "Not found" });
    }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      return this.send(res, 401, { title: "Unauthenticated", detail: "You did not pass a valid authentication token" });
    }

    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

    let m = path.match(/^\/v1\/models\/([^/]+\/[^/]+)\/predictions$/);
    if (req.method === "POST" && m) return this.create(res, m[1]!, body, req.headers);

    if (req.method === "POST" && path === "/v1/predictions") {
      const slug = String(body.version ?? "").replace(/^v-/, "").replace("__", "/");
      if (!this.behaviors.has(slug)) return this.send(res, 422, { detail: `Invalid version ${String(body.version)}` });
      return this.create(res, slug, body, req.headers);
    }

    m = path.match(/^\/v1\/models\/([^/]+)\/([^/]+)$/);
    if (req.method === "GET" && m) {
      return this.send(res, 200, { owner: m[1], name: m[2], latest_version: { id: `v-${m[1]}__${m[2]}` } });
    }

    if (req.method === "GET" && path === "/v1/webhooks/default/secret") return this.send(res, 200, { key: WEBHOOK_SECRET });

    m = path.match(/^\/v1\/predictions\/([^/]+)$/);
    if (req.method === "GET" && m) {
      if (this.readStatus !== 200) return this.send(res, this.readStatus, { detail: "upstream unavailable" });
      const p = this.predictions.get(m[1]!);
      if (!p) return this.send(res, 404, { detail: "Prediction not found" });
      const statuses = p.behavior.statuses ?? ["succeeded"];
      const status = statuses[Math.min(p.reads++, statuses.length - 1)]!;
      const output = status === "succeeded" ? this.resolveOutput(p.behavior.output) : null;
      return this.send(res, 200, {
        id: p.id,
        status,
        output,
        error: status === "failed" ? (p.behavior.error ?? "failed") : null,
        created_at: "2026-10-31T00:00:00.000Z",
      });
    }
    return this.send(res, 404, { detail: `No route for ${req.method} ${path}` });
  }

  private resolveOutput(output: unknown): unknown {
    if (output === "$FILE") return this.fileUrl("out.wav");
    if (Array.isArray(output)) return output.map((o) => this.resolveOutput(o));
    return output === undefined ? this.fileUrl("out.wav") : output;
  }

  private create(res: ServerResponse, slug: string, body: Record<string, unknown>, headers: IncomingMessage["headers"]) {
    this.created.push({ slug, body, headers });
    const behavior = this.behaviors.get(slug) ?? {};
    if (behavior.submitStatus) return this.send(res, behavior.submitStatus, { detail: behavior.submitDetail ?? "rejected" });
    const id = `pred-${this.nextId++}`;
    this.predictions.set(id, { id, slug, reads: 0, behavior });
    return this.send(res, 201, { id, status: "starting", created_at: "2026-10-31T00:00:00.000Z" });
  }
}

/** 16-bit PCM WAV of silence. */
export function wavBytes(seconds: number, sampleRate = 44100, channels = 2): Uint8Array {
  const dataBytes = Math.round(seconds * sampleRate) * channels * 2;
  const buf = new Uint8Array(44 + dataBytes);
  const v = new DataView(buf.buffer);
  const put = (at: number, s: string) => [...s].forEach((c, i) => (buf[at + i] = c.charCodeAt(0)));
  put(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  put(36, "data");
  v.setUint32(40, dataBytes, true);
  return buf;
}

/** MPEG-1 Layer III, 128 kbps, 44.1 kHz frames with empty payloads, behind an ID3v2 tag. */
export function mp3Bytes(frames: number): Uint8Array {
  const frameLen = 417; // floor(144 * 128000 / 44100)
  const tag = new Uint8Array(10 + 20);
  tag.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 20]);
  const out = new Uint8Array(tag.length + frames * frameLen);
  out.set(tag);
  for (let f = 0; f < frames; f++) out.set([0xff, 0xfb, 0x90, 0x00], tag.length + f * frameLen);
  return out;
}
