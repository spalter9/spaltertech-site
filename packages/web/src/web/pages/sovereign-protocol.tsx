import { useState, type ChangeEvent } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileSearch,
  Loader2,
  Lock,
  Package,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Nav } from "../components/nav";
import {
  useAuditList,
  useAuditResult,
  useProtocolStatus,
  useScanAudio,
  useSealExport,
  useSealList,
  useVerifyFile,
  type AuditResult,
  type CopyrightStatus,
  type DeliveryVerdict,
  type StemAnalysis,
} from "../queries/sovereign-protocol";

/**
 * SOVEREIGN AUDIO PROTOCOL — operator console.
 *
 * Tab 1 runs an inbound container through the forensic audit and hands back
 * the eCO text and the examiner PDF. Tab 2 seals an export into four
 * cross-hashed tiers. The two are connected: a completed audit can be carried
 * straight into a seal, which is what puts an examined limitation of claim
 * inside the delivered files' own headers.
 */

const STEM_LABEL: Record<StemAnalysis["stem"], string> = {
  vocals: "Vocals",
  drums: "Drums & Percussion",
  bass_and_harmony: "Bass & Harmony",
};

const STATUS_STYLE: Record<CopyrightStatus, string> = {
  CLAIMABLE: "border-verified/40 bg-verified/10 text-verified",
  PARTIAL_CLAIM: "border-gold/40 bg-gold/10 text-gold",
  MUST_EXCLUDE: "border-danger/40 bg-danger/10 text-danger",
  UNDETERMINED: "border-obsidian-line bg-obsidian/60 text-muted",
};

function Bar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone = value >= 0.8 ? "bg-verified" : value >= 0.4 ? "bg-gold" : "bg-danger";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-obsidian-line">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold transition hover:bg-gold/15"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function FileField({
  id,
  file,
  onPick,
  hint,
}: {
  id: string;
  file: File | null;
  onPick: (f: File | null) => void;
  hint: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{hint}</span>
      <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-obsidian-line bg-obsidian/50 p-5 sm:flex-row sm:items-center">
        <Upload className="h-5 w-5 shrink-0 text-gold" aria-hidden />
        <input
          id={id}
          type="file"
          aria-label={hint}
          accept=".wav,.aif,.aiff,.flac,.mp3,audio/*"
          onChange={(e: ChangeEvent<HTMLInputElement>) => onPick(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-bone file:mr-3 file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.14em] file:text-gold"
        />
      </div>
      {file && (
        <p className="mt-2 font-mono text-[11px] text-muted">
          {file.name} · {(file.size / 1048576).toFixed(2)} MB
        </p>
      )}
    </label>
  );
}

/* ───────────────────────── Tab 1 — inbound audit ───────────────────────── */

function StemCard({ stem }: { stem: StemAnalysis }) {
  return (
    <div className="rounded-xl border border-obsidian-line bg-obsidian/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg text-bone">{STEM_LABEL[stem.stem]}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {stem.verdict.replaceAll("_", " ")} · confidence {(stem.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${STATUS_STYLE[stem.copyright_status]}`}
        >
          {stem.copyright_status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="font-mono text-2xl tabular-nums text-bone">
          {(stem.human_score * 100).toFixed(0)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">/ 100 human</span>
        <div className="ml-auto w-32">
          <Bar value={stem.human_score} />
        </div>
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-muted">
        {(stem.energy_share * 100).toFixed(1)}% of programme energy
      </p>

      <ul className="mt-4 space-y-2 border-t border-obsidian-line pt-4">
        {stem.features.map((f) => (
          <li key={f.id} className="flex gap-3 text-[12px] leading-relaxed">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden />
            <span className="text-muted">
              <span className="text-bone">{f.label}</span> — {f.interpretation}
              <span className="ml-1 font-mono text-[10px] text-muted/70">
                (w {f.weight.toFixed(2)} → {f.score.toFixed(2)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DELIVERY_STYLE: Record<DeliveryVerdict["status"], string> = {
  on_target: "border-verified/40 bg-verified/10 text-verified",
  quiet: "border-gold/40 bg-gold/10 text-gold",
  loud: "border-gold/40 bg-gold/10 text-gold",
  would_clip: "border-danger/40 bg-danger/10 text-danger",
  unmeasurable: "border-obsidian-line bg-obsidian/50 text-muted",
};

const DELIVERY_LABEL: Record<DeliveryVerdict["status"], string> = {
  on_target: "On target",
  quiet: "Turned up",
  loud: "Turned down",
  would_clip: "Would clip",
  unmeasurable: "No signal",
};

/**
 * Delivery readiness is a separate question from authorship: a track can be
 * fully claimable and still arrive clipped, because the platform's own
 * normalisation gain lifts the peak after the master leaves here.
 */
/**
 * Format a measurement the audit can legitimately have no value for.
 *
 * Digital silence gates every BS.1770 block away, so integrated loudness is
 * -Infinity and arrives over the wire as null; the delivery gains derived
 * from it are null too. That is a real answer about the audio, not a
 * failure, so it is rendered as one rather than crashed on.
 */
function fmt(value: number | null, places: number, suffix = "", signed = false): string {
  if (value === null || !Number.isFinite(value)) return "\u2014";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(places)}${suffix}`;
}

function DeliveryPanel({ delivery }: { delivery: DeliveryVerdict[] }) {
  if (!delivery?.length) return null;
  const clipping = delivery.filter((d) => d.status === "would_clip");

  return (
    <div className="rounded-2xl border border-obsidian-line bg-obsidian/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Streaming delivery</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {clipping.length === 0
            ? "clears every platform"
            : `${clipping.length} platform${clipping.length > 1 ? "s" : ""} would clip`}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {delivery.map((d) => (
          <li
            key={d.platform}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-obsidian-line/60 pb-2 last:border-0"
          >
            <span className="text-sm text-bone">{d.platform}</span>
            <span className="font-mono text-[10px] tabular-nums text-muted">
              {fmt(d.normalisation_gain_db, 1, " dB", true)} →{" "}
              {fmt(d.true_peak_after_gain_dbtp, 2, " dBTP")}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${DELIVERY_STYLE[d.status]}`}
            >
              {DELIVERY_LABEL[d.status]}
            </span>
          </li>
        ))}
      </ul>

      {clipping.length > 0 && (
        <p className="mt-4 flex gap-2 text-[12px] leading-relaxed text-muted">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
          {clipping[0]!.note}
        </p>
      )}
    </div>
  );
}

function AuditReport({ result }: { result: AuditResult }) {
  const verdictTone =
    result.overall_verdict === "HUMAN_AUTHORED"
      ? "border-verified/40 bg-verified/10"
      : result.overall_verdict === "AI_GENERATED"
        ? "border-danger/40 bg-danger/10"
        : "border-gold/40 bg-gold/10";

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${verdictTone}`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Verdict</p>
        <p className="mt-2 font-display text-3xl text-bone">
          {result.overall_verdict.replaceAll("_", " ")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="font-mono text-3xl tabular-nums text-bone">
              {(result.human_authorship_index * 100).toFixed(1)}
            </span>
            <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              / 100 human authorship index
            </span>
          </div>
          <span className="rounded-full border border-obsidian-line px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-bone">
            {result.claim_eligibility.replaceAll("_", " ")}
          </span>
        </div>
        {result.notice && (
          <p className="mt-4 flex gap-2 text-sm text-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            {result.notice}
          </p>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-obsidian-line bg-obsidian/40 p-5 font-mono text-[11px] sm:grid-cols-2">
        {[
          ["Container SHA-256", `${result.file_hash.slice(0, 40)}…`],
          ["Chain of custody", result.custody_state.replaceAll("_", " ")],
          ["Programme", `${result.duration_sec.toFixed(2)} s · ${result.sample_rate} Hz · ${result.channels} ch`],
          ["Separation", result.engine.demixer],
          [
            "Integrated loudness",
            result.container.integrated_lufs === null
              ? "no measurable loudness (silent)"
              : `${result.container.integrated_lufs.toFixed(2)} LUFS`,
          ],
          ["True peak", `${result.container.true_peak_dbtp.toFixed(2)} dBTP`],
          ["16–22 kHz coherence", result.container.hf_phase_correlation.toFixed(4)],
          ["Micro-timing jitter", `${result.container.micro_timing_jitter_ms.toFixed(2)} ms`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-obsidian-line/60 py-1.5">
            <dt className="text-muted">{label}</dt>
            <dd className="truncate text-bone">{value}</dd>
          </div>
        ))}
      </dl>

      <DeliveryPanel delivery={result.delivery} />

      {result.stems.length > 0 && (
        <div className="space-y-4">
          <p className="eyebrow">Stem-level findings</p>
          {result.stems.map((stem) => (
            <StemCard key={stem.stem} stem={stem} />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Limitation of claim</p>
            <h3 className="mt-1 font-display text-2xl text-bone">USCO filing dossier</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={result.usco_filing_dossier.eCO_copy_paste_text} label="Copy eCO text" />
            <a
              href={`/api/v1/audit/dossier/${result.job_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold transition hover:bg-gold/15"
            >
              <Download className="h-3.5 w-3.5" /> Examiner PDF
            </a>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-relaxed">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Material excluded
            </p>
            <p className="mt-1 text-bone">{result.usco_filing_dossier.material_excluded}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              New material included
            </p>
            <p className="mt-1 text-bone">{result.usco_filing_dossier.new_material_included}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              eCO statement
            </p>
            <p className="mt-1 rounded-xl border border-obsidian-line bg-obsidian/60 p-4 font-mono text-[12px] leading-relaxed text-bone">
              {result.usco_filing_dossier.eCO_copy_paste_text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InboundTab({ onCarryToSeal }: { onCarryToSeal: (jobId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const scan = useScanAudio();
  const result = useAuditResult(jobId);
  const history = useAuditList();

  const ready = result.data?.ready ? result.data.result : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
        <div className="card-surface space-y-5 rounded-2xl p-6">
          <FileField
            id="audit-file"
            file={file}
            onPick={setFile}
            hint="Container under examination (WAV / AIFF / FLAC / MP3)"
          />

          <button
            type="button"
            disabled={!file || scan.isPending}
            onClick={() => {
              if (!file) return;
              scan.mutate(file, { onSuccess: (accepted) => setJobId(accepted.job_id) });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-obsidian transition hover:opacity-90 disabled:opacity-50"
          >
            {scan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Fixing custody…
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4" /> Hash · Demix · Examine
              </>
            )}
          </button>

          {scan.error && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {scan.error.message}
            </p>
          )}

          {scan.data && (
            <div className="rounded-xl border border-obsidian-line bg-obsidian/60 p-4 font-mono text-[11px]">
              <p className="text-muted">
                job <span className="text-gold">{scan.data.job_id}</span>
              </p>
              <p className="mt-1 break-all text-muted">
                intake sha256 <span className="text-bone">{scan.data.sha256}</span>
              </p>
              <p className="mt-1 text-muted">queue position {scan.data.queue_position}</p>
            </div>
          )}
        </div>

        <div className="card-surface rounded-2xl p-6">
          <p className="eyebrow">Recent examinations</p>
          <ul className="mt-4 space-y-2">
            {(history.data ?? []).slice(0, 8).map((job) => (
              <li key={job.jobId}>
                <button
                  type="button"
                  onClick={() => setJobId(job.jobId)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-obsidian-line px-3 py-2 text-left transition hover:border-gold/35"
                >
                  <span className="truncate text-sm text-bone">{job.fileName}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {job.overallVerdict?.replaceAll("_", " ") ?? job.status}
                  </span>
                </button>
              </li>
            ))}
            {history.data?.length === 0 && (
              <li className="text-sm text-muted">No examinations yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div>
        {!jobId && (
          <div className="card-surface rounded-2xl p-8 text-center">
            <FileSearch className="mx-auto h-8 w-8 text-gold/50" aria-hidden />
            <p className="mt-4 text-sm text-muted">
              Upload a container to fix its hash, separate it into four sources, and measure each
              one independently.
            </p>
          </div>
        )}

        {jobId && !ready && (
          <div className="card-surface rounded-2xl p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gold" aria-hidden />
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              {result.data && !result.data.ready
                ? `${result.data.pending.status} · queue ${result.data.pending.queue_position}`
                : "examining"}
            </p>
            <p className="mt-2 text-sm text-muted">
              Separation runs on your own worker. A full track takes minutes on CPU, seconds on GPU.
            </p>
          </div>
        )}

        {ready && (
          <div className="space-y-5">
            <AuditReport result={ready} />
            {!ready.usco_filing_dossier.claim_blocked && (
              <button
                type="button"
                onClick={() => onCarryToSeal(ready.job_id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-gold transition hover:bg-gold/15"
              >
                <Package className="h-4 w-4" /> Carry this finding into a 4-valve seal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Tab 2 — outbound seal ───────────────────────── */

function OutboundTab({ auditJobId }: { auditJobId: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("Bradley David Spalter");
  const [rightsType, setRightsType] = useState<"MASTER" | "COMPOSITION" | "NEIGHBORING">("MASTER");
  const [isrc, setIsrc] = useState("");
  const [verifyFile, setVerifyFile] = useState<File | null>(null);

  const seal = useSealExport();
  const verify = useVerifyFile();
  const seals = useSealList();

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
        <div className="card-surface space-y-5 rounded-2xl p-6">
          <FileField
            id="seal-file"
            file={file}
            onPick={(f) => {
              setFile(f);
              if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
            }}
            hint="Session render to seal"
          />

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Title</span>
            <input
              value={title}
              aria-label="Session title"
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
              placeholder="Session title"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Creator
              </span>
              <input
                value={creatorName}
                aria-label="Creator"
                onChange={(e) => setCreatorName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Rights type
              </span>
              <select
                value={rightsType}
                aria-label="Rights type"
                onChange={(e) =>
                  setRightsType(e.target.value as "MASTER" | "COMPOSITION" | "NEIGHBORING")
                }
                className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
              >
                <option value="MASTER">Master</option>
                <option value="COMPOSITION">Composition</option>
                <option value="NEIGHBORING">Neighboring</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              ISRC (optional)
            </span>
            <input
              value={isrc}
              aria-label="ISRC"
              onChange={(e) => setIsrc(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 font-mono text-sm text-bone outline-none focus:border-gold/45"
              placeholder="US-SPA-26-00000"
            />
          </label>

          {auditJobId && (
            <p className="flex gap-2 rounded-xl border border-verified/30 bg-verified/10 px-4 py-3 text-sm text-verified">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Sealing against audit {auditJobId} — the examined limitation of claim goes inside all
              four files.
            </p>
          )}

          <button
            type="button"
            disabled={!file || seal.isPending}
            onClick={() => {
              if (!file) return;
              seal.mutate({
                file,
                title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
                creatorName: creatorName.trim() || "Spalter Creator",
                rightsType,
                isrc: isrc.trim() || undefined,
                auditJobId: auditJobId ?? undefined,
              });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-obsidian transition hover:opacity-90 disabled:opacity-50"
          >
            {seal.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Rendering four tiers…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Render · Cross-hash · Sign · Seal
              </>
            )}
          </button>

          {seal.error && (
            <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {seal.error.message}
            </p>
          )}
        </div>

        <div className="card-surface space-y-4 rounded-2xl p-6">
          <div>
            <p className="eyebrow">Verify a sealed file</p>
            <p className="mt-1 text-sm text-muted">
              Checks the signature and recomputes the payload hash. Works on any file this protocol
              sealed, from any installation.
            </p>
          </div>
          <FileField
            id="verify-file"
            file={verifyFile}
            onPick={setVerifyFile}
            hint="Sealed WAV to verify"
          />
          <button
            type="button"
            disabled={!verifyFile || verify.isPending}
            onClick={() => verifyFile && verify.mutate(verifyFile)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-gold transition hover:bg-gold/15 disabled:opacity-50"
          >
            {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify seal
          </button>
          {verify.data && (
            <p
              className={`flex gap-2 rounded-xl border px-4 py-3 text-sm ${
                verify.data.verified
                  ? "border-verified/40 bg-verified/10 text-verified"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {verify.data.verified ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              {verify.data.reason}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {seal.data ? (
          <div className="card-surface rounded-2xl border-verified/30 p-6">
            <div className="flex items-center gap-2 text-verified">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <p className="font-display text-2xl">Sealed</p>
            </div>

            <dl className="mt-4 space-y-1.5 font-mono text-[11px]">
              {[
                ["Manifest", seal.data.manifest_id],
                ["Session", seal.data.session_id],
                ["Cross-hash", `${seal.data.cross_hash.slice(0, 40)}…`],
                ["Signer", `${seal.data.signature.key_id.slice(0, 32)}…`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="truncate text-bone">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 space-y-3">
              {seal.data.valves.map((valve) => (
                <div key={valve.valve} className="rounded-xl border border-obsidian-line bg-obsidian/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                      {valve.valve} · {valve.tier.replaceAll("_", " ")}
                    </p>
                    <a
                      href={`/api/v1/export/${seal.data!.session_id}/valve/${valve.valve}`}
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-gold"
                    >
                      WAV ↓
                    </a>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{valve.treatment}</p>
                  <p className="mt-2 break-all font-mono text-[10px] text-muted/80">
                    payload sha256:{valve.sha256}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
                    {valve.integrated_lufs.toFixed(2)} LUFS · {valve.true_peak_dbtp.toFixed(2)} dBTP ·{" "}
                    {valve.sample_rate} Hz · 32-bit float
                    {valve.permissions && !valve.permissions.training_allowed && " · training denied"}
                  </p>
                </div>
              ))}
            </div>

            <a
              href={seal.data.package_path}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-gold transition hover:bg-gold/15"
            >
              <Download className="h-4 w-4" /> Sealed package ·{" "}
              {(seal.data.package_bytes / 1048576).toFixed(1)} MB
            </a>
          </div>
        ) : (
          <div className="card-surface rounded-2xl p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-gold/50" aria-hidden />
            <p className="mt-4 text-sm text-muted">
              One export event produces four files: the untouched vault copy, the streaming master,
              the sync instrumental, and the machine-ingestion reference — each carrying the signed
              manifest of all four.
            </p>
          </div>
        )}

        <div className="card-surface rounded-2xl p-6">
          <p className="eyebrow">Sealed sessions</p>
          <ul className="mt-4 space-y-2">
            {(seals.data ?? []).slice(0, 8).map((row) => (
              <li
                key={row.sessionId}
                className="flex items-center justify-between gap-3 rounded-lg border border-obsidian-line px-3 py-2"
              >
                <span className="truncate text-sm text-bone">{row.title}</span>
                <a
                  href={`/api/v1/export/${row.sessionId}/package`}
                  className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-gold hover:text-gold-bright"
                >
                  ZIP ↓
                </a>
              </li>
            ))}
            {seals.data?.length === 0 && <li className="text-sm text-muted">No seals yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── page shell ───────────────────────────── */

export default function SovereignProtocol() {
  const [tab, setTab] = useState<"inbound" | "outbound">("inbound");
  const [carriedJob, setCarriedJob] = useState<string | null>(null);
  const status = useProtocolStatus();

  const demixerOnline = status.data?.module_a.demixer_online ?? false;

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p className="eyebrow">Sovereign Audio Protocol · self-hosted</p>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05]">
              Forensic audit in.
              <span className="gold-text"> Sealed provenance out.</span>
            </h1>
            <p className="mt-4 max-w-3xl text-muted leading-relaxed">
              Inbound containers are hashed at intake, separated into four sources on your own
              hardware, and measured stem by stem into an examiner-grade verdict with the USCO
              limitation-of-claim text drafted from it. Outbound exports leave as four cross-hashed
              tiers, signed with your own key, each carrying the manifest inside its own broadcast
              header. No third-party service touches the audio at any point.
            </p>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                demixerOnline
                  ? "border-verified/40 bg-verified/10 text-verified"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${demixerOnline ? "bg-verified" : "bg-danger"}`}
                aria-hidden
              />
              Demixer {demixerOnline ? "online" : "offline"}
            </span>
            {status.data && (
              <>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  {status.data.module_a.demixer}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  signer {status.data.module_b.signer_key_id.slice(0, 16)}…
                </span>
              </>
            )}
          </div>

          {!demixerOnline && (
            <p className="mt-4 flex max-w-3xl gap-2 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-muted">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              The separation worker is not reachable, so inbound scans will return a container-level
              preflight only and will be marked as not examiner-grade. Start it with{" "}
              <code className="font-mono text-bone">docker compose up -d</code> in{" "}
              <code className="font-mono text-bone">services/forensics</code>. Outbound sealing is
              unaffected.
            </p>
          )}

          <div className="mt-10 flex gap-2 border-b border-obsidian-line">
            {(
              [
                ["inbound", "01 · Inbound audit"],
                ["outbound", "02 · 4-valve export"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                  tab === id
                    ? "border-gold text-gold"
                    : "border-transparent text-muted hover:text-bone"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {tab === "inbound" ? (
              <InboundTab
                onCarryToSeal={(jobId) => {
                  setCarriedJob(jobId);
                  setTab("outbound");
                }}
              />
            ) : (
              <OutboundTab auditJobId={carriedJob} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
