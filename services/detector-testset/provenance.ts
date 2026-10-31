/**
 * Provenance check: what a file says about where it came from, before anyone
 * listens to it. Reads the tags and embedded manifests a generator leaves
 * behind — Suno attaches C2PA content credentials to new downloads — plus the
 * filename and the URL it was fetched from, and folds in a hosted detector's
 * verdict when one is supplied.
 *
 * Rule that the Examiner broke and this keeps: missing evidence is not
 * evidence of a human. Tags strip in one click and older Suno downloads carry
 * none, so nothing here returns likely_human; a clean file is "unknown".
 *
 * Verdicts (confidence = noisy-OR over the AI signals found):
 *   >= review threshold (0.85) with a tag/manifest/URL signal -> likely_suno (likely_ai_other if it names another generator)
 *   >= review threshold from classifier signals only          -> likely_ai_other
 *   <= 0.20 with no signals at all                            -> unknown
 *   anything else                                             -> unknown, needs_review: true
 *
 *   node services/detector-testset/provenance.ts song.mp3 [https://...mp3] [--source-url https://...]
 *   PROVENANCE_ML_ENABLED=false  PROVENANCE_REVIEW_THRESHOLD=0.85
 */

import { pathToFileURL } from "node:url";

export type ProvenanceResult = {
  verdict: "likely_suno" | "likely_ai_other" | "likely_human" | "unknown";
  confidence: number; // 0..1
  evidence: Evidence[];
  checkedAt: string;
  needs_review: boolean; // some signal, not enough for a verdict: a person should look
};

export interface ProvenanceDetector {
  detect(input: { buffer?: Buffer; url?: string; filename?: string }): Promise<ProvenanceResult>;
}

export type Evidence = {
  // riff_info and c2pa_manifest extend the original list: WAV keeps its tags in
  // RIFF chunks, and C2PA is the label Suno itself attaches.
  signal:
    | "id3_metadata"
    | "mp4_atom"
    | "vorbis_comment"
    | "riff_info"
    | "c2pa_manifest"
    | "filename"
    | "source_url"
    | "embedded_url"
    | "spectral_classifier"
    | "hosted_detector";
  match: string; // what was found
  weight: number; // 0..1 contribution; 0 = noted, not a signal (e.g. a detector that heard no AI)
};

/** A listening detector's answer (Hive, Modulate, or our own classifier). */
export type DetectorResult = {
  aiProbability: number; // 0..1
  generator?: string; // e.g. "suno", when the detector attributes one
  name: string;
};

export type ProvenanceInput = {
  bytes: Uint8Array;
  filename?: string;
  sourceUrl?: string;
  hostedDetector?: DetectorResult;
  spectralClassifier?: DetectorResult;
};

type Target = "suno" | "ai_other" | "none";
type Found = { evidence: Evidence; target: Target };
/** `comment` marks comment and encoder/software fields: the only places a bare generator name counts. */
type Field = { signal: Evidence["signal"]; label: string; value: string; comment: boolean };

// ---------- markers ----------

/**
 * Ranked, strongest first. A song link or a "made with" phrase is hard to
 * mistake; a bare name is not ("suno" is Hindi/Urdu for "listen", AIVA and
 * Lyria are people's names), so bare names only count in comment and
 * encoder fields and a C2PA manifest, never in a title, artist or filename.
 */
type Rule = { target: Target; name: string; kind: "link" | "phrase" | "domain" | "word"; re: RegExp; weight: number };

const generator = (name: string, domain: RegExp, word: RegExp): Rule[] => [
  { target: "ai_other", name, kind: "domain", re: domain, weight: 0.85 },
  { target: "ai_other", name, kind: "word", re: word, weight: 0.6 },
];

const RULES: Rule[] = [
  { target: "suno", name: "Suno", kind: "link", re: /suno\.com\/song\/[0-9a-f-]{36}/i, weight: 0.95 },
  { target: "suno", name: "Suno", kind: "phrase", re: /\bmade with suno\b/i, weight: 0.9 },
  { target: "suno", name: "Suno", kind: "domain", re: /(?:https?:\/\/)?(?:www\.)?suno\.(?:com|ai)\b/i, weight: 0.85 },
  { target: "suno", name: "Suno", kind: "word", re: /\bsuno\b/i, weight: 0.6 },
  ...generator("Udio", /\budio\.com\b/i, /\budio\b/i),
  ...generator("Riffusion", /\briffusion\.com\b/i, /riffusion/i),
  ...generator("Mureka", /\bmureka\.ai\b/i, /mureka/i),
  ...generator("MusicGen", /audiocraft\.metademolab\.com/i, /musicgen|audiocraft/i),
  ...generator("Stable Audio", /\bstableaudio\.com\b/i, /stable[\s_-]?audio/i),
  ...generator("ElevenLabs", /\belevenlabs\.io\b/i, /elevenlabs|eleven labs/i),
  ...generator("Lyria", /deepmind\.google\/[^\s]*lyria/i, /\blyria\b/i),
  ...generator("Mubert", /\bmubert\.com\b/i, /mubert/i),
  ...generator("Soundraw", /\bsoundraw\.io\b/i, /soundraw/i),
  ...generator("Boomy", /\bboomy\.com\b/i, /\bboomy\b/i),
  ...generator("AIVA", /\baiva\.ai\b/i, /\baiva\b/i),
  ...generator("Loudly", /\bloudly\.com\b/i, /\bloudly ai\b/i),
  ...generator("Beatoven", /\bbeatoven\.ai\b/i, /beatoven/i),
  ...generator("Soundful", /\bsoundful\.com\b/i, /soundful/i),
  ...generator("ACE-Step", /ace-step\.github\.io/i, /ace[\s_-]?step/i),
  ...generator("MiniMax / Hailuo", /\bhailuoai\.(?:com|video)\b/i, /minimax music|hailuo/i),
];
/** IPTC digital source types C2PA uses for generated media. */
const AI_SOURCE_TYPE = /(?:compositeWith)?trainedAlgorithmicMedia|algorithmicMedia/i;

/** Strongest rule the text satisfies; bare-name rules only when `words` is allowed. */
function bestMatch(text: string, words: boolean): Rule | undefined {
  let best: Rule | undefined;
  for (const r of RULES) {
    if (r.kind === "word" && !words) continue;
    if ((!best || r.weight > best.weight) && r.re.test(text)) best = r;
  }
  return best;
}

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n)}…` : s);

// ---------- byte helpers ----------

const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join("");
const ascii = (b: Uint8Array, at: number, len: number) => latin1(b.subarray(at, at + len));
const u32be = (b: Uint8Array, at: number) => ((b[at]! << 24) >>> 0) + (b[at + 1]! << 16) + (b[at + 2]! << 8) + b[at + 3]!;
const u32le = (b: Uint8Array, at: number) => b[at]! + (b[at + 1]! << 8) + (b[at + 2]! << 16) + ((b[at + 3]! << 24) >>> 0);
const u24be = (b: Uint8Array, at: number) => (b[at]! << 16) + (b[at + 1]! << 8) + b[at + 2]!;
const syncsafe = (b: Uint8Array, at: number) => ((b[at]! & 0x7f) << 21) | ((b[at + 1]! & 0x7f) << 14) | ((b[at + 2]! & 0x7f) << 7) | (b[at + 3]! & 0x7f);
const utf8 = (b: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(b);

/** Strings inside a binary blob (CBOR/JUMBF in a C2PA store keeps its text as plain UTF-8). */
function printable(b: Uint8Array): string {
  return utf8(b).replace(/[^\x20-\x7e -￿]+/g, " ");
}

// ---------- ID3 ----------

/** Splits an encoded "description\0value" pair (UTF-16 terminators are two bytes, on an even offset). */
function id3Pair(b: Uint8Array, encoding: number): [string, string] {
  const wide = encoding === 1 || encoding === 2;
  let i = 0;
  if (wide) while (i + 1 < b.length && !(b[i] === 0 && b[i + 1] === 0)) i += 2;
  else while (i < b.length && b[i] !== 0) i++;
  return [id3Text(b.subarray(0, i), encoding), id3Text(b.subarray(i + (wide ? 2 : 1)), encoding)];
}

const ID3_COMMENT_FRAMES = new Set(["COMM", "COM", "TSSE", "TSS", "TENC", "TEN"]);
const COMMENTISH = /comment|descr|encod|software|tool|generat|creat|source|made/i;

function id3Text(b: Uint8Array, encoding: number): string {
  if (encoding === 1 || encoding === 2) {
    let le = encoding === 1;
    let start = 0;
    if (encoding === 1 && b.length >= 2) {
      le = !(b[0] === 0xfe && b[1] === 0xff);
      if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) start = 2;
    }
    return new TextDecoder(le ? "utf-16le" : "utf-16be").decode(b.subarray(start)).replace(/\0+/g, " ").trim();
  }
  return (encoding === 3 ? utf8(b) : latin1(b)).replace(/\0+/g, " ").trim();
}

/** Parses an ID3v2 tag at `at`; returns its length (0 if none). */
function readId3v2(b: Uint8Array, at: number, fields: Field[], blobs: { label: string; data: Uint8Array }[]): number {
  if (ascii(b, at, 3) !== "ID3" || at + 10 > b.length) return 0;
  const major = b[at + 3]!;
  const flags = b[at + 5]!;
  const size = syncsafe(b, at + 6);
  const end = Math.min(b.length, at + 10 + size);
  let pos = at + 10;
  if (flags & 0x40) pos += major === 4 ? syncsafe(b, pos) : u32be(b, pos) + 4; // extended header
  const idLen = major === 2 ? 3 : 4;
  const hdrLen = major === 2 ? 6 : 10;
  while (pos + hdrLen <= end) {
    const id = ascii(b, pos, idLen);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding
    const fsize = major === 2 ? u24be(b, pos + 3) : major === 4 ? syncsafe(b, pos + 4) : u32be(b, pos + 4);
    const body = b.subarray(pos + hdrLen, Math.min(end, pos + hdrLen + fsize));
    pos += hdrLen + fsize;
    if (!body.length) continue;
    const enc = body[0]!;
    const label = `ID3 ${id}`;
    if (id === "TXXX" || id === "TXX") {
      const [desc, value] = id3Pair(body.subarray(1), enc);
      fields.push({ signal: "id3_metadata", label: `${label}:${desc}`, value, comment: COMMENTISH.test(desc) });
    } else if (id === "COMM" || id === "COM" || id === "USLT" || id === "ULT") {
      const [, value] = id3Pair(body.subarray(4), enc); // 3-byte language, then short description
      fields.push({ signal: "id3_metadata", label, value, comment: ID3_COMMENT_FRAMES.has(id) });
    } else if (id === "WXXX" || id === "WXX") {
      fields.push({ signal: "id3_metadata", label, value: id3Pair(body.subarray(1), enc)[1] || latin1(body.subarray(1)).replace(/\0+/g, " ").trim(), comment: false });
    } else if (id[0] === "T") {
      fields.push({ signal: "id3_metadata", label, value: id3Text(body.subarray(1), enc), comment: ID3_COMMENT_FRAMES.has(id) });
    } else if (id[0] === "W") {
      fields.push({ signal: "id3_metadata", label, value: latin1(body).replace(/\0+/g, "").trim(), comment: false });
    } else if (id === "PRIV") {
      fields.push({ signal: "id3_metadata", label, value: printable(body), comment: false });
    } else if (id === "GEOB" || id === "GEO") {
      // encoding, mime\0, filename\0, description\0, data — C2PA stores its manifest here in MP3
      const mimeEnd = body.indexOf(0, 1);
      const mime = latin1(body.subarray(1, mimeEnd));
      if (/c2pa/i.test(mime)) blobs.push({ label: "ID3 GEOB (C2PA manifest store)", data: body.subarray(mimeEnd + 1) });
      else fields.push({ signal: "id3_metadata", label: `${label} ${mime}`, value: printable(body.subarray(mimeEnd + 1)), comment: false });
    }
  }
  return end - at;
}

function readId3v1(b: Uint8Array, fields: Field[]) {
  if (b.length < 128 || ascii(b, b.length - 128, 3) !== "TAG") return;
  const t = b.subarray(b.length - 128);
  const str = (s: number, n: number) => latin1(t.subarray(s, s + n)).replace(/\0+/g, " ").trim();
  for (const [label, s, n] of [["title", 3, 30], ["artist", 33, 30], ["album", 63, 30], ["comment", 97, 30]] as const) {
    const v = str(s, n);
    if (v) fields.push({ signal: "id3_metadata", label: `ID3v1 ${label}`, value: v, comment: label === "comment" });
  }
}

// ---------- WAV ----------

function readRiff(b: Uint8Array, fields: Field[], blobs: { label: string; data: Uint8Array }[]) {
  let pos = 12;
  while (pos + 8 <= b.length) {
    const id = ascii(b, pos, 4);
    const size = u32le(b, pos + 4);
    const body = b.subarray(pos + 8, Math.min(b.length, pos + 8 + size));
    if (id === "LIST" && ascii(body, 0, 4) === "INFO") {
      let p = 4;
      while (p + 8 <= body.length) {
        const sub = ascii(body, p, 4);
        const n = u32le(body, p + 4);
        const value = utf8(body.subarray(p + 8, p + 8 + n)).replace(/\0+/g, " ").trim();
        fields.push({ signal: "riff_info", label: `RIFF INFO ${sub}`, value, comment: sub === "ICMT" || sub === "ISFT" });
        p += 8 + n + (n % 2);
      }
    } else if (id === "bext") {
      fields.push({ signal: "riff_info", label: "RIFF bext", value: printable(body.subarray(0, 602)), comment: true }); // description + originator software
    } else if (id.toLowerCase() === "id3 ") {
      readId3v2(body, 0, fields, blobs);
    } else if (id === "C2PA") {
      blobs.push({ label: "RIFF C2PA chunk", data: body });
    }
    pos += 8 + size + (size % 2);
  }
}

// ---------- FLAC / Ogg ----------

function readVorbisComments(b: Uint8Array, at: number, fields: Field[], where: string) {
  let p = at;
  const vendorLen = u32le(b, p);
  fields.push({ signal: "vorbis_comment", label: `${where} vendor`, value: utf8(b.subarray(p + 4, p + 4 + vendorLen)), comment: true });
  p += 4 + vendorLen;
  const count = u32le(b, p);
  p += 4;
  for (let i = 0; i < count && p + 4 <= b.length; i++) {
    const n = u32le(b, p);
    const s = utf8(b.subarray(p + 4, p + 4 + n));
    const eq = s.indexOf("=");
    const key = eq > 0 ? s.slice(0, eq).toUpperCase() : "COMMENT";
    fields.push({ signal: "vorbis_comment", label: `${where} ${key}`, value: eq > 0 ? s.slice(eq + 1) : s, comment: COMMENTISH.test(key) });
    p += 4 + n;
  }
}

function readFlac(b: Uint8Array, at: number, fields: Field[], blobs: { label: string; data: Uint8Array }[]) {
  let p = at + 4;
  for (let last = false; !last && p + 4 <= b.length; ) {
    last = (b[p]! & 0x80) !== 0;
    const type = b[p]! & 0x7f;
    const len = u24be(b, p + 1);
    const body = b.subarray(p + 4, p + 4 + len);
    if (type === 4) readVorbisComments(body, 0, fields, "FLAC");
    else if (type === 2) blobs.push({ label: `FLAC APPLICATION ${ascii(body, 0, 4)}`, data: body.subarray(4) });
    p += 4 + len;
  }
}

function readOgg(b: Uint8Array, fields: Field[]) {
  const head = latin1(b.subarray(0, Math.min(b.length, 65536)));
  for (const [marker, skip] of [["\x03vorbis", 7], ["OpusTags", 8]] as const) {
    const i = head.indexOf(marker);
    if (i >= 0) return readVorbisComments(b, i + skip, fields, marker.includes("Opus") ? "Opus" : "Vorbis");
  }
}

// ---------- MP4 ----------

const C2PA_UUID = "d8fec3d61b0e483c92975828877ec481";
const CONTAINERS = new Set(["moov", "udta", "ilst", "trak", "mdia", "minf", "stbl"]);
const MP4_COMMENT_ATOMS = new Set(["\u00a9cmt", "\u00a9too", "\u00a9enc", "desc", "ldes"]);

function readMp4(b: Uint8Array, start: number, end: number, fields: Field[], blobs: { label: string; data: Uint8Array }[], parent = "") {
  let p = start;
  while (p + 8 <= end) {
    let size = u32be(b, p);
    const type = ascii(b, p + 4, 4);
    let header = 8;
    if (size === 1) {
      size = Number(new DataView(b.buffer, b.byteOffset + p + 8, 8).getBigUint64(0));
      header = 16;
    } else if (size === 0) size = end - p;
    if (size < header || p + size > end) break;
    const bodyStart = p + header;
    const bodyEnd = p + size;
    if (type === "uuid") {
      const uuid = Array.from(b.subarray(bodyStart, bodyStart + 16), (x) => x.toString(16).padStart(2, "0")).join("");
      if (uuid === C2PA_UUID) blobs.push({ label: "MP4 uuid box (C2PA manifest store)", data: b.subarray(bodyStart + 16, bodyEnd) });
    } else if (type === "meta") {
      readMp4(b, bodyStart + 4, bodyEnd, fields, blobs, type); // full box: skip version/flags
    } else if (CONTAINERS.has(type)) {
      readMp4(b, bodyStart, bodyEnd, fields, blobs, type);
    } else if (parent === "ilst") {
      // each item holds a 'data' box: size, 'data', type(4), locale(4), value — or mean/name/data for '----'
      let q = bodyStart;
      const parts: string[] = [];
      let name = "";
      while (q + 8 <= bodyEnd) {
        const s = u32be(b, q);
        const t = ascii(b, q + 4, 4);
        if (s < 8) break;
        if (t === "data") parts.push(utf8(b.subarray(q + 16, q + s)));
        else if (t === "name") name = utf8(b.subarray(q + 12, q + s));
        q += s;
      }
      const label = name ? `MP4 ----:${name}` : `MP4 ${type}`;
      const comment = MP4_COMMENT_ATOMS.has(type) || (type === "----" && COMMENTISH.test(name));
      fields.push({ signal: "mp4_atom", label, value: parts.join(" ").replace(/\0+/g, " ").trim(), comment });
    }
    p += size;
  }
}

// ---------- the check ----------

export function extractMetadata(bytes: Uint8Array): { fields: Field[]; blobs: { label: string; data: Uint8Array }[] } {
  const fields: Field[] = [];
  const blobs: { label: string; data: Uint8Array }[] = [];
  const id3Len = readId3v2(bytes, 0, fields, blobs);
  const at = id3Len;
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") readRiff(bytes, fields, blobs);
  else if (ascii(bytes, at, 4) === "fLaC") readFlac(bytes, at, fields, blobs);
  else if (ascii(bytes, 0, 4) === "OggS") readOgg(bytes, fields);
  else if (ascii(bytes, 4, 4) === "ftyp") readMp4(bytes, 0, bytes.length, fields, blobs);
  readId3v1(bytes, fields);
  return { fields: fields.filter((f) => f.value), blobs };
}

export const DEFAULT_REVIEW_THRESHOLD = 0.85;
const UNKNOWN_CEILING = 0.2;
const METADATA_SIGNALS = new Set<Evidence["signal"]>(["id3_metadata", "mp4_atom", "vorbis_comment", "riff_info", "c2pa_manifest", "embedded_url", "source_url"]);
const CLASSIFIER_SIGNALS = new Set<Evidence["signal"]>(["hosted_detector", "spectral_classifier"]);

const WEIGHT = {
  c2paNamed: 0.95,
  c2paSourceType: 0.85,
  sourceUrl: 0.75, // caps: where a file came from, or what it's called, is weaker than what it carries
  filename: 0.4,
};

export function checkProvenance(input: ProvenanceInput, options: { reviewThreshold?: number } = {}): ProvenanceResult {
  const threshold = options.reviewThreshold ?? DEFAULT_REVIEW_THRESHOLD;
  const found: Found[] = [];
  const seen = new Set<string>();
  const add = (signal: Evidence["signal"], match: string, weight: number, target: Target) => {
    const key = `${signal}|${match}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ evidence: { signal, match: clip(match, 200), weight }, target });
  };

  const { fields, blobs } = extractMetadata(input.bytes);

  for (const blob of blobs) {
    const text = printable(blob.data);
    const named = bestMatch(text, true);
    const sourceType = text.match(AI_SOURCE_TYPE)?.[0];
    if (named) add("c2pa_manifest", `${blob.label} names ${named.name}${sourceType ? ` and declares ${sourceType}` : ""} (signature not verified)`, WEIGHT.c2paNamed, named.target);
    else if (sourceType) add("c2pa_manifest", `${blob.label} declares ${sourceType} (signature not verified)`, WEIGHT.c2paSourceType, "ai_other");
    else add("c2pa_manifest", `${blob.label} present, no AI assertion found (signature not verified)`, 0, "none");
  }

  for (const f of fields) {
    const hit = bestMatch(f.value, f.comment);
    if (!hit) continue;
    const signal = hit.kind === "link" || hit.kind === "domain" ? "embedded_url" : f.signal;
    add(signal, `${f.label}: "${clip(f.value)}" (${hit.name} ${hit.kind})`, hit.weight, hit.target);
  }

  if (input.sourceUrl) {
    const hit = bestMatch(input.sourceUrl, false);
    if (hit) add("source_url", `${input.sourceUrl} (${hit.name} ${hit.kind})`, Math.min(hit.weight, WEIGHT.sourceUrl), hit.target);
  }
  if (input.filename) {
    const hit = bestMatch(`${input.filename} ${input.filename.replace(/[_.-]+/g, " ")}`, false);
    if (hit) add("filename", `${input.filename} (${hit.name} ${hit.kind})`, Math.min(hit.weight, WEIGHT.filename), hit.target);
  }

  for (const [signal, result] of [["hosted_detector", input.hostedDetector], ["spectral_classifier", input.spectralClassifier]] as const) {
    if (!result) continue;
    const p = Math.min(1, Math.max(0, result.aiProbability));
    const named = result.generator ? bestMatch(result.generator, true) : undefined;
    // A detector that heard AI is a signal at its own probability; one that didn't is noted, not counted.
    if (p >= 0.5) add(signal, `${result.name}: ${(p * 100).toFixed(0)}% AI${result.generator ? `, attributed to ${result.generator}` : ""}`, p, named?.target === "suno" ? "suno" : "ai_other");
    else add(signal, `${result.name}: ${((1 - p) * 100).toFixed(0)}% not AI`, 0, "none");
  }

  // Independent signals combine like noisy-OR: each one closes part of the remaining doubt.
  const signals = found.filter((f) => f.evidence.weight > 0);
  const confidence = 1 - signals.reduce((acc, f) => acc * (1 - f.evidence.weight), 1);
  const labelled = signals.filter((f) => METADATA_SIGNALS.has(f.evidence.signal));
  const classifierOnly = signals.length > 0 && signals.every((f) => CLASSIFIER_SIGNALS.has(f.evidence.signal));

  let verdict: ProvenanceResult["verdict"] = "unknown";
  let needsReview = false;
  if (confidence >= threshold && labelled.length) {
    // A label names its generator; Suno wins if any label says Suno.
    verdict = labelled.some((f) => f.target === "suno") ? "likely_suno" : "likely_ai_other";
  } else if (confidence >= threshold && classifierOnly) {
    verdict = "likely_ai_other"; // a classifier's attribution isn't proof of which generator
  } else if (!(confidence <= UNKNOWN_CEILING && signals.length === 0)) {
    needsReview = true;
  }

  return {
    verdict,
    confidence: Math.round(confidence * 1000) / 1000,
    evidence: found.map((f) => f.evidence).sort((a, b) => b.weight - a.weight),
    checkedAt: new Date().toISOString(),
    needs_review: needsReview,
  };
}

// ---------- detector ----------

export type DetectorOptions = {
  /** PROVENANCE_ML_ENABLED: run the listening detectors below. Off, they're never called. */
  mlEnabled?: boolean;
  /** PROVENANCE_REVIEW_THRESHOLD: confidence needed for a verdict. */
  reviewThreshold?: number;
  hostedDetector?: (bytes: Uint8Array) => Promise<DetectorResult>;
  spectralClassifier?: (bytes: Uint8Array) => Promise<DetectorResult>;
  fetch?: typeof fetch;
  maxDownloadBytes?: number;
};

export function detectorOptionsFromEnv(env: Record<string, string | undefined> = process.env): Pick<DetectorOptions, "mlEnabled" | "reviewThreshold"> {
  const ml = (env.PROVENANCE_ML_ENABLED ?? "false").trim().toLowerCase();
  if (!["true", "false", "1", "0", ""].includes(ml)) throw new Error(`PROVENANCE_ML_ENABLED must be true or false, not "${env.PROVENANCE_ML_ENABLED}"`);
  const raw = env.PROVENANCE_REVIEW_THRESHOLD?.trim();
  const threshold = raw ? Number(raw) : DEFAULT_REVIEW_THRESHOLD;
  if (!(threshold > 0 && threshold <= 1)) throw new Error(`PROVENANCE_REVIEW_THRESHOLD must be a number in (0, 1], not "${raw}"`);
  return { mlEnabled: ml === "true" || ml === "1", reviewThreshold: threshold };
}

/** Tags, manifests, filename and URL, plus listening detectors when ML is enabled. */
export class MetadataProvenanceDetector implements ProvenanceDetector {
  options: DetectorOptions;

  constructor(options: DetectorOptions = {}) {
    this.options = options;
  }

  async detect(input: { buffer?: Buffer; url?: string; filename?: string }): Promise<ProvenanceResult> {
    const bytes = input.buffer ? new Uint8Array(input.buffer.buffer, input.buffer.byteOffset, input.buffer.byteLength) : input.url ? await this.download(input.url) : undefined;
    if (!bytes) throw new Error("detect() needs a buffer or a url");
    const filename = input.filename ?? (input.url ? decodeURIComponent(new URL(input.url).pathname.split("/").pop() ?? "") || undefined : undefined);

    const listened: Pick<ProvenanceInput, "hostedDetector" | "spectralClassifier"> = {};
    const notes: Evidence[] = [];
    if (this.options.mlEnabled) {
      for (const key of ["hostedDetector", "spectralClassifier"] as const) {
        const run = this.options[key];
        if (!run) continue;
        try {
          listened[key] = await run(bytes);
        } catch (e) {
          // A detector that couldn't answer says nothing either way; the result shows it was tried.
          notes.push({ signal: key === "hostedDetector" ? "hosted_detector" : "spectral_classifier", match: `failed: ${(e as Error).message}`, weight: 0 });
        }
      }
    }
    const result = checkProvenance(
      { bytes, ...(filename ? { filename } : {}), ...(input.url ? { sourceUrl: input.url } : {}), ...listened },
      { reviewThreshold: this.options.reviewThreshold ?? DEFAULT_REVIEW_THRESHOLD },
    );
    return notes.length ? { ...result, evidence: [...result.evidence, ...notes] } : result;
  }

  private async download(url: string): Promise<Uint8Array> {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") throw new Error(`only http(s) URLs can be fetched, not ${protocol}`);
    const max = this.options.maxDownloadBytes ?? 100 * 1024 * 1024;
    const res = await (this.options.fetch ?? fetch)(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`fetching ${url} returned HTTP ${res.status}`);
    if (Number(res.headers.get("content-length") ?? 0) > max) throw new Error(`${url} is larger than ${max} bytes`);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length;
      if (total > max) throw new Error(`${url} is larger than ${max} bytes`);
      chunks.push(chunk);
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) (out.set(c, o), (o += c.length));
    return out;
  }
}

// ---------- CLI ----------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFile } = await import("node:fs/promises");
  const { basename } = await import("node:path");
  const argv = process.argv.slice(2);
  const urlIdx = argv.indexOf("--source-url");
  const sourceUrl = urlIdx >= 0 ? argv.splice(urlIdx, 2)[1] : undefined;
  if (!argv.length) {
    console.error("usage: node provenance.ts <audio files or http(s) URLs…> [--source-url URL]");
    process.exit(1);
  }
  const detector = new MetadataProvenanceDetector(detectorOptionsFromEnv());
  for (const item of argv) {
    const result = /^https?:\/\//.test(item)
      ? await detector.detect({ url: item })
      : await detector.detect({ buffer: await readFile(item), filename: basename(item), ...(sourceUrl ? { url: sourceUrl } : {}) });
    console.log(JSON.stringify({ file: item, ...result }, null, 2));
  }
}
