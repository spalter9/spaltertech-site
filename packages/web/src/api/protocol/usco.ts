import { CONTENT_WIDTH, PdfPage, renderPdf } from "./pdf";
import type { AuditResult, ExaminerStem, StemAnalysis, UscoFilingDossier } from "./types";

/**
 * USCO Limitation of Claim drafting.
 *
 * The Copyright Office does not reject a work for containing machine-generated
 * material — it rejects an application that fails to disclaim it. So the text
 * below is written to do exactly two things: name what is being excluded, and
 * name the human authorship being claimed. It is deliberately conservative;
 * where the evidence is mixed it disclaims more, not less, because an
 * over-broad claim is the failure mode that costs a registration.
 */

const STEM_PROSE: Record<ExaminerStem, { excluded: string; claimed: string; short: string }> = {
  vocals: {
    excluded: "machine-generated vocal content",
    claimed: "the original vocal performance, including lead and background vocals",
    short: "Vocals",
  },
  drums: {
    excluded: "machine-generated rhythmic and percussion elements",
    claimed: "the original rhythmic performance and percussion tracking",
    short: "Drums / Percussion",
  },
  bass_and_harmony: {
    excluded: "machine-generated harmonic and instrumental textures",
    claimed: "the original bass performance, instrumental parts, and musical arrangement",
    short: "Bass & Harmony",
  },
};

function joinClauses(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function buildDossier(stems: StemAnalysis[], index: number): UscoFilingDossier {
  const excluded = stems.filter((s) => s.copyright_status === "MUST_EXCLUDE");
  const partial = stems.filter((s) => s.copyright_status === "PARTIAL_CLAIM");
  const claimable = stems.filter((s) => s.copyright_status === "CLAIMABLE");
  const indeterminate = stems.filter((s) => s.copyright_status === "UNDETERMINED");

  const claimBlocked = claimable.length === 0 && partial.length === 0;
  const limitationRequired = excluded.length > 0 || partial.length > 0;

  const excludedParts = [
    ...excluded.map((s) => STEM_PROSE[s.stem].excluded),
    ...partial.map((s) => `the machine-generated component of the ${STEM_PROSE[s.stem].short.toLowerCase()} material`),
  ];

  const includedParts = [
    ...claimable.map((s) => STEM_PROSE[s.stem].claimed),
    ...partial.map(
      (s) => `the human selection, arrangement, and treatment applied to the ${STEM_PROSE[s.stem].short.toLowerCase()} material`,
    ),
  ];

  const materialExcluded = excludedParts.length
    ? `${capitalise(joinClauses(excludedParts))}.`
    : "No machine-generated material identified. No limitation of claim required on the evidence in this report.";

  const newMaterialIncluded = includedParts.length
    ? `${capitalise(joinClauses(includedParts))}, together with the sound recording as fixed.`
    : "No independently claimable human authorship was identified in the analysed material.";

  const eco = buildEcoStatement({ excluded, partial, claimable, indeterminate, index, claimBlocked });

  return {
    material_excluded: materialExcluded,
    new_material_included: newMaterialIncluded,
    eCO_copy_paste_text: eco,
    limitation_required: limitationRequired,
    claim_blocked: claimBlocked,
  };
}

function buildEcoStatement(params: {
  excluded: StemAnalysis[];
  partial: StemAnalysis[];
  claimable: StemAnalysis[];
  indeterminate: StemAnalysis[];
  index: number;
  claimBlocked: boolean;
}): string {
  if (params.claimBlocked) {
    return (
      "Forensic analysis did not identify claimable human authorship in this recording. " +
      "Applicant should not submit a claim in the sound recording on this material as analysed. " +
      "If human authorship exists in elements not present in the analysed file (for example, " +
      "underlying lyrics or musical composition fixed separately), that authorship should be " +
      "claimed on its own terms and this recording excluded."
    );
  }

  const sentences: string[] = [];

  const disclaimed = [
    ...params.excluded.map((s) => STEM_PROSE[s.stem].excluded),
    ...params.partial.map((s) => `the machine-generated portions of the ${STEM_PROSE[s.stem].short.toLowerCase()} material`),
  ];
  if (disclaimed.length) {
    sentences.push(
      `Applicant expressly disclaims copyright in ${joinClauses(disclaimed)}, which were produced by generative means and are not the product of human authorship.`,
    );
  }

  const claimed = [
    ...params.claimable.map((s) => STEM_PROSE[s.stem].claimed),
    ...params.partial.map(
      (s) => `the human selection, arrangement, editing, and treatment of the ${STEM_PROSE[s.stem].short.toLowerCase()} material`,
    ),
  ];
  if (claimed.length) {
    sentences.push(
      `Applicant claims ${joinClauses(claimed)}, and the sound recording as fixed, as original works of human authorship.`,
    );
  }

  if (params.indeterminate.length) {
    sentences.push(
      `The following material was not measurable to a reportable standard and is not relied upon in this claim: ${joinClauses(params.indeterminate.map((s) => STEM_PROSE[s.stem].short.toLowerCase()))}.`,
    );
  }

  return sentences.join(" ");
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ─────────────────────────── Examiner PDF ─────────────────────────── */

const VERDICT_LABEL: Record<string, string> = {
  HUMAN_AUTHORED: "HUMAN AUTHORED",
  HYBRID_AI_ASSISTED: "HYBRID — AI ASSISTED",
  AI_GENERATED: "AI GENERATED",
  INDETERMINATE: "INDETERMINATE",
};

/** One-page examiner dossier, continued onto a second page when needed. */
export function renderExaminerDossier(result: AuditResult): Uint8Array {
  const page = new PdfPage();
  const pages = [page];

  page.text("SOVEREIGN AUDIO PROTOCOL", { font: "bold", size: 9, gray: 0.45 });
  page.space(2);
  page.text("Forensic Authorship Examination", { font: "bold", size: 20 });
  page.space(2);
  page.text(result.file_name, { size: 10.5, gray: 0.35 });
  page.rule();

  page.space(4);
  page.row("Container SHA-256", `${result.file_hash.slice(0, 32)}…`);
  page.row("Chain of custody", custodyLabel(result.custody_state));
  page.row("Duration", `${result.duration_sec.toFixed(2)} s · ${result.sample_rate} Hz · ${result.channels} ch`);
  page.row("Separation engine", result.engine.demixer);
  page.row("Examined (UTC)", result.analyzed_at);
  page.space(8);

  page.box(30, 0.94);
  page.space(3);
  page.text(`VERDICT: ${VERDICT_LABEL[result.overall_verdict] ?? result.overall_verdict}`, {
    font: "bold",
    size: 13,
    x: 8,
  });
  page.space(1);
  page.text(
    `Human Authorship Index ${(result.human_authorship_index * 100).toFixed(1)} / 100   ·   ${result.claim_eligibility.replaceAll("_", " ")}`,
    { size: 9.5, x: 8, gray: 0.3 },
  );
  page.space(12);

  page.text("STEM-LEVEL FINDINGS", { font: "bold", size: 10 });
  page.rule({ gray: 0.85 });
  for (const stem of result.stems) {
    page.space(3);
    page.text(
      `${STEM_PROSE[stem.stem].short}  —  ${stem.verdict.replaceAll("_", " ")}`,
      { font: "bold", size: 10.5 },
    );
    page.row(
      `Human score ${(stem.human_score * 100).toFixed(1)}/100 · confidence ${(stem.confidence * 100).toFixed(0)}% · ${(stem.energy_share * 100).toFixed(1)}% of programme energy`,
      stem.copyright_status.replaceAll("_", " "),
      { size: 8.5 },
    );
    for (const feature of stem.features.slice(0, 4)) {
      page.paragraph(`• ${feature.label}: ${feature.interpretation}`, {
        size: 8.5,
        x: 10,
        width: CONTENT_WIDTH - 10,
        gray: 0.25,
      });
    }
    page.space(4);
  }

  const second = new PdfPage();
  pages.push(second);

  second.text("LIMITATION OF CLAIM — 17 U.S.C. § 409(9)", { font: "bold", size: 13 });
  second.rule();
  second.space(4);

  second.text("Material excluded from the claim", { font: "bold", size: 10 });
  second.space(2);
  second.paragraph(result.usco_filing_dossier.material_excluded, { size: 10 });
  second.space(8);

  second.text("New material included in the claim", { font: "bold", size: 10 });
  second.space(2);
  second.paragraph(result.usco_filing_dossier.new_material_included, { size: 10 });
  second.space(8);

  second.text("Statement for the eCO application", { font: "bold", size: 10 });
  second.space(2);
  second.paragraph(result.usco_filing_dossier.eCO_copy_paste_text, { size: 10 });
  second.space(12);

  second.text("METHOD", { font: "bold", size: 10 });
  second.rule({ gray: 0.85 });
  second.space(2);
  second.paragraph(
    `The container was hashed on receipt to fix custody, separated into four discrete sources by ${result.engine.demixer}, and each source measured independently. Scoring is deterministic: every sub-score is a fixed piecewise-linear function of a measured value, published with the weight it carried. A stem scoring at or above ${(0.8 * 100).toFixed(0)}/100 is treated as claimable human authorship; below ${(0.4 * 100).toFixed(0)}/100 it must be excluded; between those bounds a limitation of claim is required. No generative model participates in the verdict, and re-running the same file reproduces the same result.`,
    { size: 9, gray: 0.2 },
  );
  second.space(8);

  second.text("CONTAINER MEASUREMENTS", { font: "bold", size: 10 });
  second.rule({ gray: 0.85 });
  second.row("Integrated loudness", `${result.container.integrated_lufs.toFixed(2)} LUFS`);
  second.row("True peak", `${result.container.true_peak_dbtp.toFixed(2)} dBTP`);
  second.row("Loudness range", `${result.container.loudness_range_lu.toFixed(2)} LU`);
  second.row("16–22 kHz coherence", result.container.hf_phase_correlation.toFixed(4));
  second.row("16–22 kHz phase dispersion", result.container.hf_phase_dispersion.toFixed(4));
  second.row("Spectral cliff", `${result.container.spectral_cliff_hz} Hz`);
  second.row("Micro-timing jitter", `${result.container.micro_timing_jitter_ms.toFixed(2)} ms`);
  second.row("Estimated tempo", `${result.container.estimated_tempo_bpm.toFixed(1)} BPM`);
  second.space(14);

  second.rule({ gray: 0.85 });
  second.paragraph(
    "This report states measurements and the deterministic conclusions drawn from them. It is prepared for use in a copyright application and is not legal advice; the applicant remains responsible for the accuracy of the claim submitted.",
    { size: 8, gray: 0.45 },
  );
  second.space(2);
  second.paragraph(
    `Sovereign Audio Protocol ${result.engine.protocol_version} · job ${result.job_id} · generated ${result.analyzed_at}`,
    { size: 8, gray: 0.45 },
  );

  return renderPdf(pages, `Forensic Authorship Examination — ${result.file_name}`);
}

function custodyLabel(state: AuditResult["custody_state"]): string {
  switch (state) {
    case "SEALED_VERIFIED":
      return "Sealed — signature verified";
    case "SEALED_TAMPERED":
      return "Sealed — SIGNATURE FAILED";
    default:
      return "Legacy — unverified";
  }
}
