/**
 *   node --test services/detector-testset/test/provenance.test.ts
 *
 * Builds real container layouts byte by byte (ID3v2.3/2.4/v1, RIFF, FLAC,
 * MP4) carrying the kinds of labels generators leave, and checks what the
 * provenance check concludes from each.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkProvenance } from "../provenance.ts";
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
  test("in an ID3v2.4 comment", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("Made with Suno")]]), audio));
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.confidence, 0.8);
    assert.equal(r.evidence[0]!.signal, "id3_metadata");
    assert.match(r.evidence[0]!.match, /COMM/);
  });

  test("in an embedded suno.com link (ID3v2.3 WXXX)", () => {
    const r = verdictOf(cat(id3(3, [["WXXX", wxxx("https://suno.com/song/3f2a9c1e")]]), audio));
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.evidence[0]!.signal, "embedded_url");
    assert.equal(r.confidence, 0.9);
  });

  test("independent signals add up: tag + link + source URL", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("made with suno")], ["WXXX", wxxx("https://suno.com/song/x")]]), audio), {
      sourceUrl: "https://cdn1.suno.ai/abc.mp3",
    });
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.confidence, 0.995); // 1 - 0.2 × 0.1 × 0.25
    assert.deepEqual(r.evidence.map((e) => e.signal), ["embedded_url", "id3_metadata", "source_url"]);
  });

  test("in a C2PA manifest stored as an ID3 GEOB frame", () => {
    const manifest = manifestWith("Suno Inc.", "c2pa.actions", "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia");
    const r = verdictOf(cat(id3(4, [["GEOB", geob("application/x-c2pa-manifest-store", manifest)]]), audio));
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.evidence[0]!.signal, "c2pa_manifest");
    assert.match(r.evidence[0]!.match, /names Suno and declares trainedAlgorithmicMedia \(signature not verified\)/);
  });

  test("in a UTF-16 text frame, an ID3v1 comment, an MP4 encoder atom, and the source URL", () => {
    assert.equal(verdictOf(cat(id3(3, [["TSSE", tUtf16("Suno v4.5")]]), audio)).verdict, "likely_suno");
    const v1 = new Uint8Array(128);
    v1.set(latin("TAG"));
    v1.set(latin("made with suno"), 97);
    assert.equal(verdictOf(cat(audio, v1)).verdict, "likely_suno");
    const m = mp4(box("moov", box("udta", box("meta", be32(0), box("ilst", ilstItem("©too", "Suno v4"))))), box("mdat"));
    const r = verdictOf(m);
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.evidence[0]!.signal, "mp4_atom");
    assert.equal(verdictOf(audio, { sourceUrl: "https://cdn1.suno.ai/x.mp3" }).verdict, "likely_suno");
  });
});

describe("finds other generators", () => {
  test("Udio in a WAV's RIFF INFO software tag", () => {
    const r = verdictOf(riff([["fmt ", fmt], ["LIST", info("ISFT", "Udio v1.5")], ["data", new Uint8Array(8)]]));
    assert.equal(r.verdict, "likely_ai_other");
    assert.equal(r.evidence[0]!.signal, "riff_info");
  });

  test("Stable Audio in a FLAC Vorbis comment", () => {
    const r = verdictOf(flac(["TITLE=Night Drive", "COMMENT=Generated with Stable Audio 2.5"]));
    assert.equal(r.verdict, "likely_ai_other");
    assert.equal(r.evidence[0]!.signal, "vorbis_comment");
  });

  test("Mureka in an Ogg Vorbis comment header", () => {
    const page = cat(latin("OggS"), new Uint8Array(23), Uint8Array.of(3), latin("vorbis"), vorbis(["ARTIST=Night Drive", "ENCODER=Mureka O1"]));
    const r = verdictOf(page);
    assert.equal(r.verdict, "likely_ai_other");
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
  test("a file with no labels is unknown, never human", () => {
    const r = verdictOf(audio);
    assert.deepEqual([r.verdict, r.confidence, r.evidence], ["unknown", 0, []]);
  });

  test("ordinary studio tags don't trip the matchers ('Audio' is not 'Udio')", () => {
    const r = verdictOf(cat(id3(4, [["TSSE", cat(Uint8Array.of(3), str("Pro Tools Studio Audio"))], ["COMM", comm("Mastered at Sterling Sound")]]), audio));
    assert.equal(r.verdict, "unknown");
    assert.deepEqual(r.evidence, []);
  });

  test("a filename alone is listed but isn't enough", () => {
    const r = verdictOf(audio, { filename: "my_song_suno_v2.mp3" });
    assert.equal(r.verdict, "unknown");
    assert.equal(r.evidence[0]!.signal, "filename");
    assert.equal(r.evidence[0]!.weight, 0.4);
  });

  test("a C2PA manifest with no AI claim is noted at zero weight", () => {
    const r = verdictOf(riff([["fmt ", fmt], ["C2PA", manifestWith("Adobe Audition", "c2pa.created")], ["data", new Uint8Array(8)]]));
    assert.equal(r.verdict, "unknown");
    assert.equal(r.evidence[0]!.weight, 0);
  });

  test("likely_human only comes from a detector that listened", () => {
    const human = verdictOf(audio, { hostedDetector: { name: "Hive", aiProbability: 0.08 } });
    assert.equal(human.verdict, "likely_human");
    assert.equal(human.confidence, 0.92);
    assert.equal(human.evidence[0]!.signal, "hosted_detector");
  });

  test("an AI label outweighs a detector that missed it", () => {
    const r = verdictOf(cat(id3(4, [["COMM", comm("made with suno")]]), audio), { hostedDetector: { name: "Hive", aiProbability: 0.1 } });
    assert.equal(r.verdict, "likely_suno");
  });

  test("a detector that attributes the track to Suno counts as Suno", () => {
    const r = verdictOf(audio, { hostedDetector: { name: "Hive", aiProbability: 0.97, generator: "suno" } });
    assert.equal(r.verdict, "likely_suno");
    assert.equal(r.confidence, 0.97);
  });
});
