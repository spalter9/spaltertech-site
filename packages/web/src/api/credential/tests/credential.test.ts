/**
 * SSP Credit Layer — invariant suite.
 *
 *   cd packages/web && bun run src/api/credential/tests/credential.test.ts
 *
 * The properties that must hold: embedding round-trips byte-exactly, existing
 * AI disclosures survive credentialing, and removing a disclosure, editing the
 * file, or editing the credential each fail verification.
 */
import { crc32, embedCredential, extractCredential, pngChunks, stripCredential } from "../container";
import { detectDisclosures } from "../detect";
import { issueCredential, verifyCredential } from "../credential";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.byteLength);
  new DataView(out.buffer).setUint32(0, data.byteLength);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  new DataView(out.buffer).setUint32(8 + data.byteLength, crc32(out.subarray(4, 8 + data.byteLength)));
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

const enc = (s: string) => new TextEncoder().encode(s);
const equal = (a: Uint8Array, b: Uint8Array) => a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);

// A 1×1 PNG that carries a C2PA box and generator parameters, like a typical AI output.
const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
const idat = new Uint8Array([0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00]);
const png = concat([
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("caBX", enc("....jumb....c2pa manifest store")),
  chunk("tEXt", enc("parameters\0a lighthouse at dusk, Steps: 30")),
  chunk("IDAT", idat),
  chunk("IEND", new Uint8Array()),
]);

// A minimal JPEG header with XMP declaring an AI source type.
const xmp = enc(
  "http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType></x:xmpmeta>",
);
const app1 = concat([new Uint8Array([0xff, 0xe1, (xmp.byteLength + 2) >> 8, (xmp.byteLength + 2) & 0xff]), xmp]);
const jpeg = concat([
  new Uint8Array([0xff, 0xd8]),
  new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
  app1,
  new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]),
]);

const input = {
  fileName: "lighthouse.png",
  creatorName: "Test Creator",
  role: "director" as const,
  contributions: ["Concept and composition", "Selected 1 of 240 generations", "Hand colour grade"],
  declaredTools: ["Image model v6"],
};

// Detection
const pngReport = detectDisclosures(png);
check("PNG: C2PA detected", pngReport.disclosures.some((d) => d.kind === "c2pa_manifest"));
check("PNG: generator parameters detected", pngReport.disclosures.some((d) => d.kind === "generator_parameters"));
check(
  "JPEG: IPTC trainedAlgorithmicMedia detected",
  detectDisclosures(jpeg).disclosures.some((d) => d.kind === "iptc_digital_source_type"),
);

// Container round-trip
for (const [name, file] of [["PNG", png], ["JPEG", jpeg]] as const) {
  const embedded = embedCredential(file, '{"hello":"world"}');
  check(`${name}: extract returns what was embedded`, extractCredential(embedded) === '{"hello":"world"}');
  check(`${name}: strip restores the original byte-for-byte`, equal(stripCredential(embedded), file));
  check(`${name}: re-embedding replaces rather than stacks`, equal(stripCredential(embedCredential(embedded, "{}")), file));
}

// Issue + verify
const issued = await issueCredential(png, input);
const credited = issued.credited_file!;
check("issue: disclosures recorded in the credential", issued.signed.credential.ai_disclosure.detected.length === 2);
check("issue: credited PNG still carries C2PA chunk", pngChunks(credited).some((c) => c.type === "caBX"));
const ok = verifyCredential(credited);
check("verify: untouched file passes every check", ok.signature_valid && ok.content_intact && ok.disclosures_intact);

const noC2pa = concat([
  credited.subarray(0, 8),
  ...pngChunks(credited)
    .filter((c) => c.type !== "caBX")
    .map((c) => credited.subarray(c.start, c.end)),
]);
const stripped = verifyCredential(noC2pa);
check("verify: removing the C2PA disclosure is caught", !stripped.disclosures_intact && !stripped.content_intact);

const pixelEdit = credited.slice();
const idatChunk = pngChunks(pixelEdit).find((c) => c.type === "IDAT")!;
pixelEdit[idatChunk.start + 9]! ^= 0x01;
check("verify: editing image data is caught", !verifyCredential(pixelEdit).content_intact);

const forged = JSON.parse(extractCredential(credited)!);
forged.credential.credit.creator = "Someone Else";
check("verify: changing the credited name is caught", !verifyCredential(embedCredential(png, JSON.stringify(forged))).signature_valid);

const jpegIssued = await issueCredential(jpeg, { ...input, fileName: "x.jpg" });
const jv = verifyCredential(jpegIssued.credited_file!);
check("JPEG: issue + verify passes", jv.signature_valid && jv.content_intact && jv.disclosures_intact);

const gif = enc("GIF89a....");
const gifIssued = await issueCredential(gif, input);
check("GIF: no inline embed, sidecar returned", gifIssued.credited_file === null);
check("GIF: sidecar verifies against the original", verifyCredential(gif, gifIssued.sidecar_json).signature_valid);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll credit layer checks passed");
