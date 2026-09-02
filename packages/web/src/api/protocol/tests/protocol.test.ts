/**
 * Sovereign Audio Protocol — invariant suite.
 *
 *   cd packages/web && bun --env-file=../../.env run src/api/protocol/tests/protocol.test.ts
 *
 * Covers the properties that must not silently regress: the loudness meter
 * against the EBU reference tone, the exactness of the true-peak fast path,
 * hash stability under metadata injection, tamper rejection, package
 * reproducibility, and the determinism of the scoring policy.
 *
 * It writes real sealed sessions into .data/protocol — that directory is
 * disposable and gitignored.
 */
import { join } from "node:path";
import { EXPORT_DIR } from "../paths";
import { encodeWavFloat32, decodeWav } from "../../audio/wav";
import { measureLoudness } from "../loudness";
import { truePeakLinear } from "../dsp";
import { analyseContainer } from "../container";
import { sealExport, buildSessionPackage } from "../seal";
import { verifySealedFile } from "../verify";
import { readSeal, payloadHash } from "../bwf";
import { listChunks } from "../riff";
import { renderExaminerDossier } from "../usco";
import { scoreStem, authorshipIndex, overallVerdict, claimEligibility } from "../scoring";
import { buildDossier } from "../usco";
import type { AudioBuffer32 } from "../../audio/types";

const SR = 48000;


function pass(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

/* ── 1. A 1 kHz sine at a known level: the loudness meter must land on spec ── */
function sine(freq: number, seconds: number, amp: number): AudioBuffer32 {
  const n = Math.floor(SR * seconds);
  const samples = new Float32Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    const v = amp * Math.sin((2 * Math.PI * freq * i) / SR);
    samples[i * 2] = v;
    samples[i * 2 + 1] = v;
  }
  return { sampleRate: SR, channels: 2, samples, length: n, bitDepth: 32, format: "float32" };
}

console.log("\n[1] BS.1770-4 meter against a known reference");
// EBU Tech 3341 case 1: a 1 kHz sine at −23 dBFS on both channels reads −23 LUFS.
const ref = sine(1000, 5, Math.pow(10, -23 / 20));
const refReport = measureLoudness(ref);
pass(
  "stereo 1 kHz @ −23 dBFS reads −23 LUFS (±0.1)",
  Math.abs(refReport.integratedLufs - -23) <= 0.1,
  `${refReport.integratedLufs.toFixed(3)} LUFS`,
);
const ref2 = sine(1000, 5, Math.pow(10, -6 / 20));
const ref2Report = measureLoudness(ref2);
pass(
  "stereo 1 kHz @ −6 dBFS reads −6 LUFS (±0.1)",
  Math.abs(ref2Report.integratedLufs - -6) <= 0.1,
  `${ref2Report.integratedLufs.toFixed(3)} LUFS`,
);
pass(
  "true peak of a −6 dBFS sine is ≈ −6 dBTP",
  Math.abs(ref2Report.truePeakDbtp - -6) <= 0.3,
  `${ref2Report.truePeakDbtp.toFixed(3)} dBTP`,
);

/* ── 2. Programme-like source ── */
function programme(seconds: number): AudioBuffer32 {
  const n = Math.floor(SR * seconds);
  const samples = new Float32Array(n * 2);
  let seed = 12345;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const beat = Math.floor(SR * 0.5);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    // Centre-panned "vocal" + wide harmony + transient hits.
    const vocal = 0.25 * Math.sin(2 * Math.PI * 220 * t + 0.4 * Math.sin(2 * Math.PI * 5.2 * t));
    const harmL = 0.12 * Math.sin(2 * Math.PI * 330 * t);
    const harmR = 0.12 * Math.sin(2 * Math.PI * 330 * t + 0.9);
    const phase = i % beat;
    const hit = phase < 800 ? 0.4 * Math.exp(-phase / 120) * rand() : 0;
    samples[i * 2] = vocal + harmL + hit;
    samples[i * 2 + 1] = vocal + harmR + hit;
  }
  return { sampleRate: SR, channels: 2, samples, length: n, bitDepth: 32, format: "float32" };
}

console.log("\n[2] Container forensics");
const source = programme(12);
const container = analyseContainer(source);
console.log("   ", JSON.stringify(container));
pass("integrated loudness measured", Number.isFinite(container.integrated_lufs));
pass("onsets detected", container.onset_count > 4, `${container.onset_count} onsets`);
pass("tempo estimated", container.estimated_tempo_bpm > 0, `${container.estimated_tempo_bpm} BPM`);
pass("spectral cliff reported", container.spectral_cliff_hz > 0, `${container.spectral_cliff_hz} Hz`);

/* ── 3. Module B: seal ── */
console.log("\n[3] Module B — 4-valve seal");
const sourceWav = encodeWavFloat32(source);
const seal = await sealExport({
  bytes: sourceWav,
  fileName: "test-source.wav",
  title: "Protocol Verification Take",
  creatorName: "Bradley David Spalter",
  rightsType: "MASTER",
  isrc: "US-SPA-26-00001",
});
console.log(`    session ${seal.session_id} · manifest ${seal.manifest_id}`);
pass("four valves rendered", seal.valves.length === 4);
pass("cross-hash present", /^[0-9a-f]{64}$/.test(seal.cross_hash));
pass("signature is Ed25519", seal.signature.algorithm === "Ed25519");

const master = seal.valves.find((v) => v.valve === "master")!;
pass(
  "MASTER hit −14 LUFS (±0.5)",
  Math.abs(master.integrated_lufs - -14) <= 0.5,
  `${master.integrated_lufs} LUFS`,
);
pass(
  "MASTER holds the −1.0 dBTP ceiling",
  master.true_peak_dbtp <= -0.9,
  `${master.true_peak_dbtp} dBTP`,
);
const model = seal.valves.find((v) => v.valve === "model")!;
pass("MODEL denies training", model.permissions?.training_allowed === false);
const mv3 = seal.valves.find((v) => v.valve === "mv3")!;
pass("MV3 marked pre-cleared", mv3.pre_cleared === true);
pass(
  "all four payload hashes are distinct",
  new Set(seal.valves.map((v) => v.sha256)).size === 4,
);

/* ── 4. Sealed file structure + verification ── */
console.log("\n[4] BWF seal + verification");
const { readFile } = await import("node:fs/promises");
const sealedPath = join(EXPORT_DIR, seal.session_id, master.filename);
const sealedBytes = new Uint8Array(await readFile(sealedPath));

const chunks = listChunks(sealedBytes).map((c) => c.id);
console.log("    chunks:", chunks.join(", "));
pass("bext chunk written", chunks.includes("bext"));
pass("iXML chunk written", chunks.includes("iXML"));
pass("data chunk intact", chunks.includes("data"));

const recovered = readSeal(sealedBytes);
pass("manifest recovered from the file itself", recovered !== null);
pass("manifest id round-trips", recovered?.manifest.manifest_id === seal.manifest_id);

pass(
  "payload hash survives metadata injection",
  payloadHash(sealedBytes) === master.sha256,
  `${payloadHash(sealedBytes).slice(0, 16)}…`,
);

const verified = verifySealedFile(sealedBytes);
console.log("    verify:", verified.reason);
pass("sealed file verifies", verified.verified === true);
pass("identified as the MASTER valve", verified.valve === "master");

// The sealed WAV must still decode as audio.
const decoded = decodeWav(sealedBytes);
pass(
  "sealed WAV still decodes",
  decoded.channels === 2 && decoded.length === master.duration_sec * SR,
  `${decoded.length} frames @ ${decoded.sampleRate} Hz`,
);

/* ── 5. Tamper detection ── */
console.log("\n[5] Tamper detection");
const tampered = new Uint8Array(sealedBytes);
// Flip one sample deep inside the audio payload.
const dataStart = listChunks(tampered).find((c) => c.id === "data")!.offset;
tampered[dataStart + 5000] = (tampered[dataStart + 5000]! ^ 0xff) & 0xff;
const tamperCheck = verifySealedFile(tampered);
console.log("    verify:", tamperCheck.reason);
pass("edited audio is rejected", tamperCheck.verified === false);
pass("rejection names the payload mismatch", tamperCheck.payload_matches === false);

/* ── 6. Package ── */
console.log("\n[6] Delivery package");
const zipBytes = await buildSessionPackage(seal.session_id);
pass("package assembles on demand", zipBytes !== null);
pass(
  "analytic size matches the real archive",
  zipBytes!.byteLength === seal.package_bytes,
  `${zipBytes!.byteLength} vs declared ${seal.package_bytes}`,
);
// Rebuilding must be byte-identical, or the recorded size becomes a lie.
const rebuilt = await buildSessionPackage(seal.session_id);
pass(
  "rebuild is byte-identical",
  Buffer.compare(Buffer.from(zipBytes!), Buffer.from(rebuilt!)) === 0,
);
pass("zip built", zipBytes!.byteLength > 0, `${(zipBytes!.byteLength / 1048576).toFixed(2)} MB`);

/* ── 7. Scoring policy + dossier ── */
console.log("\n[7] Scoring policy");
const humanVocal = scoreStem("vocals", {
  pitch_jitter_pct: 1.1,
  micro_pitch_drift_cents: 24,
  shimmer_pct: 5.2,
  formant_stability_cv: 0.18,
  room_late_energy_ratio: 0.12,
  hf_phase_dispersion: 0.4,
  voiced_ratio: 0.6,
}, 0.35);
pass("clean human vocal scores CLAIMABLE", humanVocal.copyright_status === "CLAIMABLE", `score ${humanVocal.human_score}`);

const synthDrums = scoreStem("drums", {
  onset_jitter_ms: 0.4,
  hf_phase_correlation: 0.99,
  transient_crest_db: 5.0,
  spectral_cliff_hz: 13000,
  velocity_variance_cv: 0.01,
}, 0.4);
pass("generated drums score MUST_EXCLUDE", synthDrums.copyright_status === "MUST_EXCLUDE", `score ${synthDrums.human_score}`);

// Genuinely mixed: played timing, but quantised durations, fixed intonation,
// an elevated noise floor and a suspiciously coherent top octave.
const hybridBass = scoreStem("bass_and_harmony", {
  micro_timing_std_ms: 6.0,
  note_duration_cv: 0.04,
  harmonic_drift_cents: 1.6,
  spectral_flatness: 0.38,
  hf_phase_correlation: 0.88,
}, 0.25);
pass("mixed evidence scores PARTIAL_CLAIM", hybridBass.copyright_status === "PARTIAL_CLAIM", `score ${hybridBass.human_score}`);

const stems = [humanVocal, synthDrums, hybridBass];
const index = authorshipIndex(stems);
const verdict = overallVerdict(index, stems);
const eligibility = claimEligibility(index, stems);
pass("index is energy-weighted", index > 0 && index < 1, `${index}`);
pass("verdict is hybrid", verdict === "HYBRID_AI_ASSISTED", verdict);
pass("limitation required", eligibility === "HYBRID_LIMITATION_REQUIRED", eligibility);

const dossier = buildDossier(stems, index);
console.log("\n    excluded :", dossier.material_excluded);
console.log("    included :", dossier.new_material_included);
console.log("    eCO      :", dossier.eCO_copy_paste_text);
pass("dossier flags a limitation", dossier.limitation_required === true);
pass("dossier does not block the claim", dossier.claim_blocked === false);

// Deterministic: same input, same output.
const repeat = scoreStem("vocals", {
  pitch_jitter_pct: 1.1, micro_pitch_drift_cents: 24, shimmer_pct: 5.2,
  formant_stability_cv: 0.18, room_late_energy_ratio: 0.12,
  hf_phase_dispersion: 0.4, voiced_ratio: 0.6,
}, 0.35);
pass("scoring is deterministic", JSON.stringify(repeat) === JSON.stringify(humanVocal));

/* ── 8. Examiner PDF ── */
console.log("\n[8] Examiner dossier PDF");
const fakeResult = {
  job_id: "aud_testfixture", file_hash: "a".repeat(64), file_name: "test-source.wav",
  status: "complete" as const, custody_state: "LEGACY_UNVERIFIED" as const,
  human_authorship_index: index, overall_verdict: verdict, claim_eligibility: eligibility,
  duration_sec: 12, sample_rate: SR, channels: 2, stems, discrete_stems: [],
  usco_filing_dossier: dossier, container, analyzed_at: new Date().toISOString(),
  engine: { demixer: "HTDemucs v4 (htdemucs, cpu)", demixer_online: true, dsp: "librosa/scipy", protocol_version: "sap/1.0" },
};
const pdf = renderExaminerDossier(fakeResult);
const head = new TextDecoder("latin1").decode(pdf.slice(0, 8));
const tail = new TextDecoder("latin1").decode(pdf.slice(-8));
pass("PDF header", head.startsWith("%PDF-1.4"), head.trim());
pass("PDF trailer", tail.includes("%%EOF"));
pass("PDF has content", pdf.byteLength > 2000, `${pdf.byteLength} bytes`);

/* ── 9. The true-peak fast path must be exact, not merely close ── */
console.log("\n[9] True-peak skip test is exact");
{
  // Brute force: interpolate every sample, no rejection test at all.
  const OVERSAMPLE = 4;
  const TAPS = 12;
  function brute(ch: Float64Array): number {
    const phases: number[][] = [];
    for (let p = 0; p < OVERSAMPLE; p += 1) {
      const taps: number[] = [];
      const frac = p / OVERSAMPLE;
      let sum = 0;
      for (let t = 0; t < TAPS; t += 1) {
        const x = t - TAPS / 2 + 1 - frac;
        const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
        const w = (t + 0.5) / TAPS;
        const win = 0.42 - 0.5 * Math.cos(2 * Math.PI * w) + 0.08 * Math.cos(4 * Math.PI * w);
        taps.push(sinc * win);
        sum += taps[t]!;
      }
      phases.push(taps.map((v) => v / sum));
    }
    let peak = 0;
    for (let i = 0; i < ch.length; i += 1) {
      const d = Math.abs(ch[i]!);
      if (d > peak) peak = d;
      for (let p = 1; p < OVERSAMPLE; p += 1) {
        let acc = 0;
        for (let t = 0; t < TAPS; t += 1) {
          const idx = i + t - TAPS / 2 + 1;
          if (idx < 0 || idx >= ch.length) continue;
          acc += ch[idx]! * phases[p]![t]!;
        }
        if (Math.abs(acc) > peak) peak = Math.abs(acc);
      }
    }
    return peak;
  }

  // Signals chosen to stress inter-sample overs: a tone just off Nyquist/4,
  // an impulse train, and shaped noise.
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const cases: Record<string, Float64Array> = {
    "near-quarter-Nyquist tone": Float64Array.from({ length: 20000 }, (_, i) =>
      0.98 * Math.sin((2 * Math.PI * 11997 * i) / 48000),
    ),
    "impulse train": Float64Array.from({ length: 20000 }, (_, i) => (i % 97 === 0 ? 0.95 : 0)),
    "shaped noise": Float64Array.from({ length: 20000 }, () => 0.7 * rnd()),
    silence: new Float64Array(4096),
  };

  for (const [name, signal] of Object.entries(cases)) {
    const fast = truePeakLinear([signal]);
    const reference = brute(signal);
    pass(
      `fast path equals brute force — ${name}`,
      Math.abs(fast - reference) < 1e-12,
      `${fast.toFixed(9)} vs ${reference.toFixed(9)}`,
    );
  }
}

console.log(
  process.exitCode ? "\nSUITE FAILED\n" : "\nAll invariants hold.\n",
);
