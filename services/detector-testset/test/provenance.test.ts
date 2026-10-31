/**
 *   node --test services/detector-testset/test/provenance.test.ts
 *
 * Builds real container layouts byte by byte (ID3v2.3/2.4/v1, RIFF, FLAC,
 * MP4) carrying the kinds of labels generators leave, and checks what the
 * provenance check concludes from each.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { MetadataProvenanceDetector, checkProvenance, detectorOptionsFromEnv } from "../provenance.ts";
import { mp3Bytes } from "./fake-replicate.ts";

const enc = new TextEncoder();
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) (out.set(p, o), (o += p.length));
  return out;
};
const str = (s: string) => enc.encode(s);
const latin = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const be32 = (n: number) => Uint8Array.of(n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const le32 = (n: number) => Uint8Array.of(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, n >>> 24);
const syncsafe = (n: number) => Uint8Array.of((n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f);

function id3(version: 3 | 4, frames: [string, Uint8Array][]): Uint8Array {
  const body = cat(...frames.map(([id, b]) => cat(latin(id), version === 4 ? syncsafe(b.length) : be32(b.length), Uint8Array.of(0, 0), b)));
  return cat(latin("ID3"), Uint8Array.of(version, 0, 0), syncsafe(body.length), body);
}
const comm = (text: string) => cat(Uint8Array.of(3), latin("eng"), Uint8Array.of(0), str(text));
const wxxx = (url: string) => cat(Uint8Array.of(0), Uint8Array.of(0), latin(url));
const geob = (mime: string, data: Uint8Array) => cat(Uint8Array.of(0), latin(mime), Uint8Array.of(0, 0, 0), data);
const tUtf16 = (text: string) => cat(Uint8Array.of(1, 0xff, 0xfe), Uint8Array.from(Buffer.from(text, "utf16le")));

function riff(chunks: [string, Uint8Array][]): Uint8Array {
  const body = cat(...chunks.map(([id, b]) => cat(latin(id), le32(b.length), b, b.length % 2 ? Uint8Array.of(0) : new Uint8Array())));
  return cat(latin("RIFF"), le32(4 + body.length), latin("WAVE"), body);
}
const fmt = cat(Uint8Array.of(1, 0, 2, 0), le32(44100), le32(176400), Uint8Array.of(4, 0, 16, 0));
const info = (sub: string, value: string) => {
  const v = cat(str(value), Uint8Array.of(0));
  return cat(latin("INFO"), latin(sub), le32(v.length), v);
};

function vorbis(comments: string[]): Uint8Array {
  const vendor = str("reference libFLAC 1.4.3");
  return cat(le32(vendor.length), vendor, le32(comments.length), ...comments.map((c) => cat(le32(str(c).length), str(c))));
}
function flac(comments: string[]): Uint8Array {
  const block = vorbis(comments);
  return cat(latin("fLaC"), Uint8Array.of(0x80 | 4, (block.length >> 16) & 255, (block.length >> 8) & 255, block.length & 255), block);
}

const box = (type: string, ...body: Uint8Array[]) => {
  const b = cat(...body);
  return cat(be32(8 + b.length), latin(type), b);
};
const ilstItem = (type: string, value: string) => box(type, box("data", be32(1), be32(0), str(value)));
const mp4 = (...top: Uint8Array[]) => cat(box("ftyp", latin("M4A "), be32(0), latin("isomM4A ")), ...top);
const C2PA_UUID = Uint8Array.from(Buffer.from("d8fec3d61b0e483c92975828877ec481", "hex"));

const audio = mp3Bytes(20).subarray(30); // bare frames, no tag
const manifestWith = (...texts: string[]) => cat(latin("jumb\0\0c2pa"), ...texts.map((t) => cat(Uint8Array.of(0x78, t.length), str(t))));
const verdictOf = (bytes: Uint8Array, extra: object = {}) => checkProvenance({ bytes, ...extra });

describe("finds Suno", () => {
  test("in a 'made with Suno' comment (ID3v2.4)", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("Made with Suno")]]), audio));
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.confidence, 0.9);
    assert.equal(r.needs_review, false);
    assert.equal(r.evidence[0]!.signal, "id3_metadata");
    assert.match(r.evidence[0]!.match, /COMM/);
  });

  test("a suno.com song link outranks a plain suno.com mention (ID3v2.3 WXXX)", () => {
    const link = verdictOf(cat(id3(3, [["WXXX", wxxx("https://suno.com/song/3f2a9c1e-7b4d-4c2a-9e1f-0a6b8c2d4e5f")]]), audio));
    assert.equal(link.verdict, "likely_suno");
    assert.equal(link.evidence[0]!.signal, "embedded_url");
    assert.equal(link.confidence, 0.95);
    const domain = verdictOf(cat(id3(3, [["WXXX", wxxx("https://www.suno.com")]]), audio));
    assert.deepEqual([domain.verdict, domain.confidence], ["likely_suno", 0.85]); // exactly at the review threshold
  });

  test("independent signals add up: tag + link + source URL", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("made with suno")], ["WXXX", wxxx("https://suno.com/song/x")]]), audio), {
      sourceUrl: "https://cdn1.suno.ai/abc.mp3",
    });
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.confidence, 0.996); // 1 - 0.10 × 0.15 × 0.25
    assert.deepEqual(r.evidence.map((e) => e.signal), ["id3_metadata", "embedded_url", "source_url"]);
  });

  test("in a C2PA manifest stored as an ID3 GEOB frame", () => {
    const manifest = manifestWith("Suno Inc.", "c2pa.actions", "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia");
    const r = verdictOf(cat(id3(4, [["GEOB", geob("application/x-c2pa-manifest-store", manifest)]]), audio));
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.evidence[0]!.signal, "c2pa_manifest");
    assert.match(r.evidence[0]!.match, /names Suno and declares trainedAlgorithmicMedia \(signature not verified\)/);
  });

  test("a bare name in encoder/comment fields, or the source URL alone, goes to review", () => {
    const review = (r: { verdict: string; confidence: number; needs_review: boolean }) => [r.verdict, r.confidence, r.needs_review];
    const tsse = verdictOf(cat(id3(3, [["TSSE", tUtf16("Suno v4.5")]]), audio));
    assert.deepEqual(review(tsse), ["unknown", 0.6, true]);
    const txxx = verdictOf(cat(id3(4, [["TXXX", cat(Uint8Array.of(3), str("Software"), Uint8Array.of(0), str("Suno"))]]), audio));
    assert.deepEqual(review(txxx), ["unknown", 0.6, true]);
    const v1 = new Uint8Array(128);
    v1.set(latin("TAG"));
    v1.set(latin("made with suno"), 97);
    assert.equal(verdictOf(cat(audio, v1)).verdict, "likely_suno"); // "made with suno" in an ID3v1 comment
    const m = mp4(box("moov", box("udta", box("meta", be32(0), box("ilst", ilstItem("©too", "Suno v4"))))), box("mdat"));
    const r = verdictOf(m);
    assert.deepEqual(review(r), ["unknown", 0.6, true]);
    assert.equal(r.evidence[0]!.signal, "mp4_atom");
    const src = verdictOf(audio, { sourceUrl: "https://cdn1.suno.ai/x.mp3" });
    assert.deepEqual(review(src), ["unknown", 0.75, true]);
    // two weak signals together clear the bar: 1 - 0.4 × 0.25 = 0.9
    const both = verdictOf(cat(id3(3, [["TSSE", tUtf16("Suno v4.5")]]), audio), { sourceUrl: "https://cdn1.suno.ai/x.mp3" });
    assert.deepEqual(review(both), ["likely_suno", 0.9, false]);
  });
});

describe("finds other generators", () => {
  test("Udio named in a WAV's software tag goes to review; a udio.com link is a verdict", () => {
    const r = verdictOf(riff([["fmt ", fmt], ["LIST", info("ISFT", "Udio v1.5")], ["data", new Uint8Array(8)]]));
    assert.deepEqual([r.verdict, r.needs_review], ["unknown", true]);
    const link = verdictOf(riff([["fmt ", fmt], ["LIST", info("ICMT", "https://www.udio.com/songs/abc")], ["data", new Uint8Array(8)]]));
    assert.deepEqual([link.verdict, link.confidence, link.needs_review], ["likely_ai_other", 0.85, false]);
    assert.equal(r.evidence[0]!.signal, "riff_info");
  });

  test("Stable Audio in a FLAC Vorbis comment (bare name: review)", () => {
    const r = verdictOf(flac(["TITLE=Night Drive", "COMMENT=Generated with Stable Audio 2.5"]));
    assert.deepEqual([r.verdict, r.needs_review], ["unknown", true]);
    assert.equal(r.evidence[0]!.signal, "vorbis_comment");
  });

  test("Mureka in an Ogg Vorbis comment header (bare name: review)", () => {
    const page = cat(latin("OggS"), new Uint8Array(23), Uint8Array.of(3), latin("vorbis"), vorbis(["ARTIST=Night Drive", "ENCODER=Mureka O1"]));
    const r = verdictOf(page);
    assert.deepEqual([r.verdict, r.needs_review], ["unknown", true]);
    assert.match(r.evidence[0]!.match, /Vorbis ENCODER/);
  });

  test("a C2PA chunk in a WAV that declares AI without naming the tool", () => {
    const r = verdictOf(riff([["fmt ", fmt], ["C2PA", manifestWith("trainedAlgorithmicMedia")], ["data", new Uint8Array(8)]]));
    assert.equal(r.verdict, "likely_ai_other");
    assert.equal(r.confidence, 0.85);
  });

  test("a C2PA box in an MP4", () => {
    const r = verdictOf(mp4(box("uuid", C2PA_UUID, manifestWith("compositeWithTrainedAlgorithmicMedia")), box("mdat")));
    assert.equal(r.verdict, "likely_ai_other");
    assert.match(r.evidence[0]!.match, /MP4 uuid box/);
  });
});

describe("doesn't overreach", () => {
  test("a file with no labels is unknown, never human, and not sent to review", () => {
    const r = verdictOf(audio);
    assert.deepEqual([r.verdict, r.confidence, r.evidence, r.needs_review], ["unknown", 0, [], false]);
  });

  test("ordinary studio tags don't trip the matchers ('Audio' is not 'Udio')", () => {
    const r = verdictOf(cat(id3(4, [["TSSE", cat(Uint8Array.of(3), str("Pro Tools Studio Audio"))], ["COMM", comm("Mastered at Sterling Sound")]]), audio));
    assert.equal(r.verdict, "unknown");
    assert.deepEqual(r.evidence, []);
  });

  test("a bare 'Suno' in a title, artist, other tag or filename doesn't count ('suno' is Hindi for 'listen')", () => {
    const tagged = cat(
      id3(4, [
        ["TIT2", cat(Uint8Array.of(3), str("Suno"))],
        ["TPE1", cat(Uint8Array.of(3), str("Suno Sangeet"))],
        ["TXXX", cat(Uint8Array.of(3), str("ARTISTS"), Uint8Array.of(0), str("AIVA Ray"))],
      ]),
      audio,
    );
    const r = verdictOf(tagged, { filename: "Suno Na.mp3" });
    assert.deepEqual([r.verdict, r.evidence], ["unknown", []]);
    const flacTitle = verdictOf(flac(["TITLE=Suno", "ARTIST=Lyria Choir"]));
    assert.deepEqual([flacTitle.verdict, flacTitle.evidence], ["unknown", []]);
  });

  test("a filename with a 'made with suno' phrase is listed but capped below a verdict", () => {
    const r = verdictOf(audio, { filename: "night-drive_made-with-suno.mp3" });
    assert.deepEqual([r.verdict, r.needs_review], ["unknown", true]);
    assert.equal(r.evidence[0]!.signal, "filename");
    assert.equal(r.evidence[0]!.weight, 0.4);
  });

  test("a C2PA manifest with no AI claim is noted at zero weight", () => {
    const r = verdictOf(riff([["fmt ", fmt], ["C2PA", manifestWith("Adobe Audition", "c2pa.created")], ["data", new Uint8Array(8)]]));
    assert.deepEqual([r.verdict, r.needs_review], ["unknown", false]);
    assert.equal(r.evidence[0]!.weight, 0);
  });

  test("not even a detector that heard no AI makes it likely_human", () => {
    const r = verdictOf(audio, { hostedDetector: { name: "Hive", aiProbability: 0.08 } });
    assert.deepEqual([r.verdict, r.confidence, r.needs_review], ["unknown", 0, false]);
    assert.deepEqual(r.evidence, [{ signal: "hosted_detector", match: "Hive: 92% not AI", weight: 0 }]);
  });

  test("an AI label outweighs a detector that missed it", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("made with suno")]]), audio), { hostedDetector: { name: "Hive", aiProbability: 0.1 } });
    assert.equal(r.verdict, "likely_suno");
  });

  test("classifier signals alone give likely_ai_other, even when one names Suno", () => {
    const r = verdictOf(audio, { hostedDetector: { name: "Hive", aiProbability: 0.97, generator: "suno" } });
    assert.deepEqual([r.verdict, r.confidence, r.needs_review], ["likely_ai_other", 0.97, false]);
    const unsure = verdictOf(audio, { spectralClassifier: { name: "in-house", aiProbability: 0.7 } });
    assert.deepEqual([unsure.verdict, unsure.needs_review], ["unknown", true]);
  });

  test("a Suno label plus a classifier is likely_suno", () => {
    const r = verdictOf(cat(id3(3, [["TSSE", tUtf16("Suno v4.5")]]), audio), { hostedDetector: { name: "Hive", aiProbability: 0.8 } });
    assert.deepEqual([r.verdict, r.confidence], ["likely_suno", 0.92]); // 1 - 0.4 × 0.2
  });

  test("the review threshold is configurable", () => {
    const r = checkProvenance({ bytes: cat(id3(3, [["TSSE", tUtf16("Suno v4.5")]]), audio) }, { reviewThreshold: 0.5 });
    assert.deepEqual([r.verdict, r.needs_review], ["likely_suno", false]);
  });
});

describe("ProvenanceDetector", () => {
  const sunoTagged = cat(id3(4, [["COMM", comm("made with suno")]]), audio);
  const hive = { name: "Hive", aiProbability: 0.99 };
  let base = "";
  const server = createServer((req, res) => {
    if (req.url === "/files/night_drive.mp3") return res.writeHead(200, { "content-type": "audio/mpeg" }), res.end(sunoTagged);
    if (req.url === "/files/huge.mp3") return res.writeHead(200, { "content-length": String(10_000_000) }), res.end(new Uint8Array(10));
    res.writeHead(404).end();
  });
  before(async () => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>((r) => server.close(() => r())));

  test("reads PROVENANCE_ML_ENABLED and PROVENANCE_REVIEW_THRESHOLD, defaulting to off and 0.85", () => {
    assert.deepEqual(detectorOptionsFromEnv({}), { mlEnabled: false, reviewThreshold: 0.85 });
    assert.deepEqual(detectorOptionsFromEnv({ PROVENANCE_ML_ENABLED: "true", PROVENANCE_REVIEW_THRESHOLD: "0.9" }), { mlEnabled: true, reviewThreshold: 0.9 });
    assert.throws(() => detectorOptionsFromEnv({ PROVENANCE_ML_ENABLED: "yes please" }), /true or false/);
    assert.throws(() => detectorOptionsFromEnv({ PROVENANCE_REVIEW_THRESHOLD: "85" }), /\(0, 1\]/);
  });

  test("with ML off, listening detectors are never called", async () => {
    let calls = 0;
    const d = new MetadataProvenanceDetector({ mlEnabled: false, hostedDetector: async () => (calls++, hive) });
    const r = await d.detect({ buffer: Buffer.from(audio) });
    assert.deepEqual([r.verdict, r.evidence, calls], ["unknown", [], 0]);
  });

  test("with ML on, a detector's answer counts", async () => {
    const d = new MetadataProvenanceDetector({ mlEnabled: true, hostedDetector: async () => hive });
    const r = await d.detect({ buffer: Buffer.from(audio) });
    assert.deepEqual([r.verdict, r.confidence], ["likely_ai_other", 0.99]);
  });

  test("a detector that errors is noted and the check still answers", async () => {
    const d = new MetadataProvenanceDetector({ mlEnabled: true, hostedDetector: async () => { throw new Error("Hive 503"); } });
    const r = await d.detect({ buffer: Buffer.from(sunoTagged) });
    assert.equal(r.verdict, "likely_suno");
    assert.deepEqual(r.evidence.at(-1), { signal: "hosted_detector", match: "failed: Hive 503", weight: 0 });
  });

  test("a URL is downloaded, and its filename and address are read too", async () => {
    const r = await new MetadataProvenanceDetector().detect({ url: `${base}/files/night_drive.mp3` });
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.evidence[0]!.signal, "id3_metadata");
  });

  test("bad requests fail clearly", async () => {
    const d = new MetadataProvenanceDetector({ maxDownloadBytes: 1_000_000 });
    await assert.rejects(d.detect({}), /buffer or a url/);
    await assert.rejects(d.detect({ url: "file:///etc/passwd" }), /only http\(s\)/);
    await assert.rejects(d.detect({ url: `${base}/files/missing.mp3` }), /HTTP 404/);
    await assert.rejects(d.detect({ url: `${base}/files/huge.mp3` }), /larger than/);
  });
});
