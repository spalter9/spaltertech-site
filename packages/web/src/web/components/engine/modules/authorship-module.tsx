import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  FileCheck2,
  Lock,
  ShieldAlert,
  UserCheck,
  Waves,
} from "lucide-react";
import { SectionCard } from "../section-card";

/**
 * Sovereign Audio Protocol, as an engine module.
 *
 * The other rails on this engine settle money. This one settles a prior
 * question — who made the record — because a master nobody can register is
 * a master that never reaches those rails at all.
 *
 * The feature names and weights below are the examiner's real ones, lifted
 * from `api/protocol/scoring.ts`. The values attached to them are an
 * illustration and are labelled as such everywhere they appear; the live
 * console at /sovereign-protocol is what produces real ones.
 */

type Tone = "verified" | "danger" | "gold";

type StemFinding = {
  id: string;
  stem: string;
  verdict: string;
  status: string;
  tone: Tone;
  /** Energy-weighted authorship index, 0–100. */
  index: number;
  features: { label: string; weight: number; read: string; tone: Tone }[];
};

const FINDINGS: StemFinding[] = [
  {
    id: "vocals",
    stem: "Vocals",
    verdict: "Human performance",
    status: "Claimable",
    tone: "verified",
    index: 92,
    features: [
      { label: "Intonation drift", weight: 0.3, read: "31.4 cents drift — played intonation", tone: "verified" },
      { label: "Micro-timing deviation", weight: 0.15, read: "18.60 ms std-dev — consistent with a person", tone: "verified" },
      { label: "Note duration variance", weight: 0.15, read: "duration CV 0.412 — consistent with a person", tone: "verified" },
      { label: "Spectral flatness", weight: 0.2, read: "0.19 ratio — recorded, not reconstructed", tone: "verified" },
      { label: "HF phase correlation", weight: 0.2, read: "0.34 — room audible behind the take", tone: "verified" },
    ],
  },
  {
    id: "drums",
    stem: "Drums",
    verdict: "AI generated",
    status: "Must exclude",
    tone: "danger",
    index: 8,
    features: [
      { label: "Intonation drift", weight: 0.3, read: "0.2 cents drift — fixed-pitch generation", tone: "danger" },
      { label: "Micro-timing deviation", weight: 0.15, read: "0.31 ms std-dev — quantised to the grid", tone: "danger" },
      { label: "Note duration variance", weight: 0.15, read: "duration CV 0.014 — machine-uniform", tone: "danger" },
      { label: "Spectral flatness", weight: 0.2, read: "0.52 ratio — top octave reconstructed", tone: "danger" },
      { label: "HF phase correlation", weight: 0.2, read: "0.94 — no room, synthetic stereo field", tone: "danger" },
    ],
  },
  {
    id: "bass",
    stem: "Bass & harmony",
    verdict: "Human directed",
    status: "Partial claim",
    tone: "gold",
    index: 57,
    features: [
      { label: "Intonation drift", weight: 0.3, read: "12.8 cents drift — played intonation", tone: "verified" },
      { label: "Micro-timing deviation", weight: 0.15, read: "2.90 ms std-dev — lightly corrected", tone: "gold" },
      { label: "Note duration variance", weight: 0.15, read: "duration CV 0.096 — lightly corrected", tone: "gold" },
      { label: "Spectral flatness", weight: 0.2, read: "0.38 ratio — partly reconstructed", tone: "gold" },
      { label: "HF phase correlation", weight: 0.2, read: "0.71 — ambience largely absent", tone: "danger" },
    ],
  },
];

const VALVES = [
  { id: "original", name: "Original", use: "Vault master — untouched, hashed on arrival" },
  { id: "master", name: "Master", use: "Streaming delivery — normalised per platform" },
  { id: "mv3", name: "MV3", use: "Sync mix — pre-separated, provenance attached" },
  { id: "model", name: "Model", use: "AI licensing — states training terms in-header" },
];

function toneClass(tone: Tone) {
  return tone === "verified"
    ? "border-verified/40 bg-verified/10 text-verified"
    : tone === "danger"
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-gold/40 bg-gold/10 text-gold";
}

function barClass(tone: Tone) {
  return tone === "verified" ? "bg-verified" : tone === "danger" ? "bg-danger" : "bg-gold";
}

export function AuthorshipModule() {
  const [activeId, setActiveId] = useState(FINDINGS[0]!.id);
  const active = FINDINGS.find((f) => f.id === activeId) ?? FINDINGS[0]!;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Inbound — the audit. */}
      <SectionCard
        title="Inbound · Forensic authorship audit"
        subtitle="Stems separated on our own hardware, then each judged on its own physical evidence."
        glow
        action={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-line bg-obsidian/50 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            <Waves className="h-3 w-3" aria-hidden />
            Example finding
          </span>
        }
      >
        <div
          role="tablist"
          aria-label="Stem findings"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FINDINGS.map((f) => {
            const selected = f.id === active.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveId(f.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                  selected
                    ? "border-gold/45 bg-gold/10 text-gold"
                    : "border-obsidian-line text-muted hover:border-gold/30 hover:text-bone"
                }`}
              >
                {f.stem}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-obsidian-line bg-obsidian/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-lg text-bone">{active.stem}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {active.verdict}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${toneClass(active.tone)}`}
            >
              {active.status}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-obsidian-line">
              <div
                className={`h-full transition-all duration-300 ${barClass(active.tone)}`}
                style={{ width: `${active.index}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted">
              {active.index} / 100
            </span>
          </div>
        </div>

        <dl className="mt-3 space-y-px overflow-hidden rounded-xl bg-obsidian-line">
          {active.features.map((f) => (
            <div key={f.label} className="bg-obsidian/60 px-4 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="text-sm text-bone">{f.label}</dt>
                <span className="font-mono text-[10px] tabular-nums text-muted">
                  weight {f.weight.toFixed(2)}
                </span>
              </div>
              <dd
                className={`mt-0.5 font-mono text-[11px] leading-relaxed ${
                  f.tone === "verified"
                    ? "text-verified"
                    : f.tone === "danger"
                      ? "text-danger"
                      : "text-gold"
                }`}
              >
                {f.read}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Every number is published with the weight it carried. Nothing is decided by a
          model, and the same file always produces the same result.
        </p>
      </SectionCard>

      {/* Outbound — the seal, and the filing language. */}
      <div className="flex flex-col gap-4">
        <SectionCard
          title="Outbound · Four-valve sealed export"
          subtitle="Every version leaves carrying the finding inside the file, signed, so tampering shows."
        >
          <div className="space-y-px overflow-hidden rounded-xl bg-obsidian-line">
            {VALVES.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 bg-obsidian/60 px-4 py-3"
              >
                <div>
                  <p className="font-display text-base text-bone">{v.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{v.use}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-verified/35 bg-verified/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-verified">
                  <Lock className="h-3 w-3" aria-hidden />
                  Cross-hashed
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="The filing language"
          subtitle="What the Copyright Office asks you to disclaim — written for you, from the finding."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-line bg-obsidian/50 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              <FileCheck2 className="h-3 w-3" aria-hidden />
              Example
            </span>
          }
        >
          <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-4">
            <p className="font-mono text-[11px] leading-relaxed text-bone/90">
              &ldquo;Applicant expressly disclaims copyright in machine-generated rhythmic and
              percussion elements&hellip; Applicant claims the original vocal performance, the
              musical arrangement, and the sound recording as fixed.&rdquo;
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
            <p>
              Runs entirely on our own infrastructure — no audio reaches a third party. It
              states measurements and the conclusions drawn from them; it is not legal
              advice, and the Copyright Office determines every application itself.
            </p>
          </div>

          <Link
            to="/sovereign-protocol"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-obsidian transition-colors hover:bg-gold-bright"
          >
            <UserCheck className="h-4 w-4" aria-hidden />
            Audit a track
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
