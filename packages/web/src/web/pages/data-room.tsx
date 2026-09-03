import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2, FileText, Video, Presentation, Workflow, DollarSign, Link2, BarChart3,
  Play, ShieldCheck, Fingerprint, AudioWaveform, Bot, Lock as LockIcon, ArrowLeft, CheckCircle2,
  X, ArrowRight,
} from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";
import { ProForma } from "../components/pro-forma";
import { VideoPlayer } from "../components/video-player";
import { WhitePaperDoc } from "../components/whitepaper";
import { ExecSummaryDoc } from "../components/exec-summary";
import { CampaignPlan } from "../components/campaign";
import { authClient } from "../lib/auth";
import {
  useMe, useSegments, useEscrow, useSettleAsset, useLedger, useSspStats, useTripwire,
  useTriggerTripwire, useStemJobs, useAnalyze,
} from "../queries/pillars";

const KIND_ICON: Record<string, typeof FileText> = {
  VIDEO: Video, PRESENTATION: Presentation, WHITE_PAPER: FileText, INTEGRATION: Link2,
  FLOWCHART: Workflow, PRICING: DollarSign, FINANCIALS: BarChart3, LINK: Link2,
};

const SECTIONS = [
  { id: "briefing", label: "Briefing" },
  { id: "campaign", label: "Game Plan" },
  { id: "data-room", label: "Data Room" },
  { id: "vault", label: "MasterTrust Vault" },
  { id: "ledger", label: "SSP Ledger" },
  { id: "surrealizer", label: "Surrealizer Engine" },
  { id: "proforma", label: "Pro Forma" },
];

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function DataRoom() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-obsidian grid place-items-center">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }
  // OPEN ACCESS (temporary): login + allowlist gate disabled by request.
  // To re-lock, restore:
  //   if (!me.data) return <Login />;
  //   if (!me.data.allowed) return <AccessPending email={me.data.email} />;

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="pt-20">
        {/* Header */}
        <div className="relative border-b border-obsidian-line overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-40" />
          <div className="relative mx-auto max-w-[1200px] px-6 py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Crest size={54} />
              <div>
                <p className="eyebrow">The MasterTrust · Privileged</p>
                <h1 className="font-display text-3xl md:text-4xl mt-1">Data Room</h1>
                <p className="text-muted text-sm mt-1">{me.data && me.data.id !== "guest" ? `Signed in as ${me.data.email}` : "Guest · Open Access"}</p>
              </div>
            </div>
            <Link to="/" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone transition-colors">
              <ArrowLeft size={14} /> Public site
            </Link>
          </div>
        </div>

        {/* Sticky section nav */}
        <div className="sticky top-20 z-40 backdrop-blur-md bg-obsidian/85 border-b border-obsidian-line">
          <div className="mx-auto max-w-[1200px] px-6 flex gap-6 overflow-x-auto">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-gold whitespace-nowrap transition-colors">
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 py-16 space-y-24">
          <BriefingModule />
          <section id="campaign" className="scroll-mt-32">
            <ModuleHead
              tag="The Campaign · Go-to-Market"
              title="Game Plan"
              desc="How we win industry adoption — the doctrine, the sequenced moves, the first move, and the counter we hold for every counter."
            />
            <CampaignPlan />
          </section>
          <DataRoomModule />
          <VaultModule />
          <LedgerModule />
          <SurrealizerModule />
          <section id="proforma" className="scroll-mt-32">
            <ModuleHead tag="Estimator" title="Pro Forma" desc="Model the revenue engine from the verified Month 1 baseline out to Year 3." />
            <ProForma />
          </section>
        </div>
      </div>
    </div>
  );
}

function ModuleHead({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{tag}</p>
      <h2 className="font-display text-3xl md:text-4xl mt-2">{title}</h2>
      <p className="text-muted text-sm mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Module: Enterprise Directive briefing video ───────────── */
function BriefingModule() {
  return (
    <section id="briefing" className="scroll-mt-32">
      <ModuleHead
        tag="The Master Enterprise Directive"
        title="Executive Briefing"
        desc="A full walkthrough of the Sovereign infrastructure — the three-pillar ecosystem reclaiming control, transparency, and valuation for premier creative catalogs."
      />

      {/* Cinematic overview — opening companion player (first) */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center">
        <div className="lg:order-2">
          <p className="eyebrow">Companion · Cinematic</p>
          <h3 className="font-display text-2xl mt-2">The Sovereign Overview</h3>
          <p className="text-muted text-sm mt-2 leading-relaxed">
            The cinematic overview of the sovereign infrastructure — the ownership layer of the creative economy, in motion. The opening chapter ahead of the full feature below.
          </p>
        </div>
        <div className="lg:order-1 card-surface p-2">
          <VideoPlayer
            sources={[{ src: "/videos/mt-landing-16x9-v4.mp4", type: "video/mp4" }]}
            poster="/videos/mt-landing-poster.jpg"
            ratio="16 / 9"
          />
        </div>
      </div>

      {/* SSP Directive — narrated three-pillar walkthrough */}
      <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center">
        <div>
          <p className="eyebrow">Narrated · 1:15</p>
          <h3 className="font-display text-2xl mt-2">The Sovereign Directive</h3>
          <p className="text-muted text-sm mt-2 leading-relaxed">
            A tight, narrated primer on the three pillars — the MasterTrust, the Sovereign Sign Ledger, and the Surrealizer Engine. The fastest path to the full picture.
          </p>
        </div>
        <div className="card-surface p-2">
          <VideoPlayer
            sources={[{ src: "/videos/ssp-directive-16x9-v2.mp4", type: "video/mp4" }]}
            poster="/videos/ssp-directive-poster.jpg"
            ratio="16 / 9"
          />
        </div>
      </div>

      {/* Main event — large feature player (third) */}
      <div className="mt-14 mb-3 flex items-center gap-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Feature Presentation</span>
        <span className="h-px flex-1 bg-obsidian-line" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">4:04 · Narrated</span>
      </div>
      <div className="card-surface p-2 sm:p-3">
        <VideoPlayer
          sources={[{ src: "/videos/mt-main-16x9.mp4", type: "video/mp4" }]}
          poster="/videos/mt-main-poster.jpg"
          ratio="16 / 9"
        />
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Confidential · For privileged review only
      </p>
    </section>
  );
}

/* ── Module: 8-segment Data Room ───────────────────────────── */
type Segment = {
  id: string; code: string; title: string; kind: string;
  summary: string; body: string; status: string; clearance: string;
};

// Cards that correspond to a live section on this page get a jump link.
const JUMP_FOR: Record<string, { id: string; label: string }> = {
  VIDEO: { id: "briefing", label: "Watch the briefing" },
  FINANCIALS: { id: "proforma", label: "Open the Pro Forma estimator" },
  PRICING: { id: "proforma", label: "Open the Pro Forma estimator" },
  INTEGRATION: { id: "surrealizer", label: "Open the Surrealizer Engine" },
  LINK: { id: "vault", label: "Enter the live modules" },
};

function DataRoomModule() {
  const segs = useSegments();
  const [selected, setSelected] = useState<Segment | null>(null);

  return (
    <section id="data-room" className="scroll-mt-32">
      <ModuleHead tag="Pillar I — Legal" title="Segment Library" desc="Eight structured IP and financial disclosure modules. Served securely from the MasterTrust. Select any module to open it." />
      {segs.isLoading ? (
        <Grid><SkeletonCards n={8} /></Grid>
      ) : (
        <Grid>
          {segs.data?.map((s, i) => {
            const Icon = KIND_ICON[s.kind] ?? FileText;
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => setSelected(s as Segment)}
                aria-label={`Open ${s.title}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.06 }}
                className="card-surface p-6 flex flex-col text-left cursor-pointer hover:-translate-y-1 hover:border-gold/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gold text-sm">{s.code}</span>
                  <Icon size={18} className="text-muted" />
                </div>
                <h3 className="font-display text-lg mt-4 leading-snug">{s.title}</h3>
                <p className="text-muted text-xs mt-2 leading-relaxed flex-1">{s.summary}</p>
                <div className="mt-5 flex items-center justify-between border-t border-obsidian-line pt-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{s.kind.replace("_", " ")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold flex items-center gap-1">
                    {s.clearance === "privileged" ? <LockIcon size={10} /> : null}{s.status.replace("_", " ")}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </Grid>
      )}

      <SegmentModal segment={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function SegmentModal({ segment, onClose }: { segment: Segment | null; onClose: () => void }) {
  useEffect(() => {
    if (!segment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [segment, onClose]);

  const jump = segment ? JUMP_FOR[segment.kind] : undefined;
  const Icon = segment ? (KIND_ICON[segment.kind] ?? FileText) : FileText;
  const isWhitePaper = segment?.kind === "WHITE_PAPER";
  const isExecSummary = segment?.kind === "EXECUTIVE_SUMMARY";
  const isDoc = isWhitePaper || isExecSummary;

  return (
    <AnimatePresence>
      {segment && (
        <motion.div
          key="segment-modal"
          className="fixed inset-0 z-[70] grid place-items-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={onClose} aria-hidden />

          <motion.div
            aria-modal="true"
            aria-label={segment.title}
            className={`relative w-full ${isDoc ? "max-w-3xl" : "max-w-xl"} card-surface border border-gold/30 p-8 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] max-h-[85vh] overflow-y-auto`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-gold transition-colors p-1" aria-label="Close">
              <X size={18} />
            </button>

            <div className="flex items-center justify-between">
              <div className="w-12 h-12 grid place-items-center border border-gold/40 text-gold">
                <Icon size={22} />
              </div>
              <span className="font-mono text-3xl text-obsidian-line">{segment.code}</span>
            </div>

            {isWhitePaper ? (
              <WhitePaperDoc />
            ) : isExecSummary ? (
              <ExecSummaryDoc />
            ) : (
              <>
                <p className="eyebrow mt-6">{segment.kind.replace("_", " ")}</p>
                <h3 className="font-display text-2xl md:text-3xl mt-2 leading-tight">{segment.title}</h3>
                <p className="text-gold/90 text-sm leading-relaxed mt-5">{segment.summary}</p>
                <p className="text-muted text-sm leading-relaxed mt-3 whitespace-pre-line">{segment.body}</p>
              </>
            )}

            <div className="mt-8 border-t border-obsidian-line pt-5 flex items-center gap-3 flex-wrap">
              {jump && (
                <a
                  href={`#${jump.id}`}
                  onClick={onClose}
                  className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] px-5 py-3 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
                >
                  {jump.label}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </a>
              )}
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted flex items-center gap-1">
                {segment.clearance === "privileged" ? <LockIcon size={10} /> : null}
                {segment.clearance} · {segment.status.replace("_", " ")}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Module: MasterTrust Vault ────────────────────────────── */
function VaultModule() {
  const escrow = useEscrow();
  const settle = useSettleAsset();
  const stateColor: Record<string, string> = {
    settled: "text-verified", settling: "text-gold", pending: "text-muted", held: "text-danger",
  };
  return (
    <section id="vault" className="scroll-mt-32">
      <ModuleHead tag="Pillar I — Escrow" title="MasterTrust Vault" desc="Cryptographic multi-sig escrow. Verified ownership titles with concurrent split settlement to Creators, Labels, and Publishers." />
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs min-w-[820px]">
            <thead>
              <tr className="text-gold border-b border-obsidian-line">
                {["Asset Key", "Title", "Ownership", "Splits C/L/P", "Gross", "State", ""].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3.5 uppercase tracking-[0.12em] text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {escrow.isLoading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={18} /></td></tr>
              )}
              {escrow.data?.map((a, i) => (
                <tr key={a.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                  <td className="px-4 py-3.5 text-gold">{a.assetKey}</td>
                  <td className="px-4 py-3.5 max-w-[240px] truncate text-bone">{a.title}</td>
                  <td className="px-4 py-3.5 text-verified flex items-center gap-1.5"><ShieldCheck size={13} /> Multi-Sig</td>
                  <td className="px-4 py-3.5 text-muted">{a.creatorSplit}/{a.labelSplit}/{a.publisherSplit}</td>
                  <td className="px-4 py-3.5">{usd(a.grossValue)}</td>
                  <td className={`px-4 py-3.5 uppercase ${stateColor[a.settlementState]}`}>{a.settlementState}</td>
                  <td className="px-4 py-3.5">
                    {a.settlementState === "settled" ? (
                      <span className="text-verified flex items-center gap-1"><CheckCircle2 size={13} /> Done</span>
                    ) : (
                      <button
                        onClick={() => settle.mutate({ assetKey: a.assetKey })}
                        disabled={settle.isPending}
                        className="border border-gold text-gold px-3 py-1.5 uppercase tracking-[0.12em] text-[10px] hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50"
                      >
                        {settle.isPending && settle.variables?.assetKey === a.assetKey ? "…" : "Settle"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ── Module: SSP Ledger + Tripwire ─────────────────────────── */
function LedgerModule() {
  const ledger = useLedger();
  const stats = useSspStats();
  const tripwire = useTripwire();
  const trigger = useTriggerTripwire();

  return (
    <section id="ledger" className="scroll-mt-32">
      <ModuleHead tag="Pillar II — Accounting" title="Sovereign Sign Ledger" desc="On-chain accounting anchored on Polygon, with the smart-contract anti-scraping tripwire." />

      <div className="grid sm:grid-cols-4 gap-px bg-obsidian-line mb-6">
        <Stat label="On-chain volume" value={stats.data ? usd(stats.data.totalVolume) : "—"} icon={BarChart3} />
        <Stat label="Transactions" value={stats.data ? stats.data.txCount.toLocaleString() : "—"} icon={Link2} />
        <Stat label="Bots billed" value={stats.data ? String(stats.data.botsBilled) : "—"} icon={Bot} accent="verified" />
        <Stat label="Bots locked out" value={stats.data ? String(stats.data.botsLocked) : "—"} icon={LockIcon} accent="danger" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ledger feed */}
        <div className="card-surface overflow-hidden">
          <div className="px-5 py-3.5 border-b border-obsidian-line font-mono text-[10px] uppercase tracking-[0.18em] text-gold">On-chain ledger · Polygon</div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {ledger.isLoading && <tr><td className="px-5 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={16} /></td></tr>}
                {ledger.data?.map((e, i) => (
                  <tr key={e.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                    <td className="px-5 py-2.5 text-gold w-[90px]">{e.type === "SPLIT_SETTLEMENT" ? "SPLIT" : e.type.split("_")[0]}</td>
                    <td className="px-3 py-2.5 text-muted truncate max-w-[110px]">{e.txHash.slice(0, 12)}…</td>
                    <td className="px-3 py-2.5 text-bone/80 truncate">{e.counterparty}</td>
                    <td className="px-5 py-2.5 text-right text-bone">{usd(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tripwire */}
        <div className="card-surface overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-obsidian-line flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Anti-scraping tripwire</span>
            <div className="flex gap-2">
              <button onClick={() => trigger.mutate({ crawlerId: "GPTBot", willPay: true })} disabled={trigger.isPending}
                className="border border-verified/50 text-verified px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] hover:bg-verified/10 transition-colors disabled:opacity-50">Sim · Pay</button>
              <button onClick={() => trigger.mutate({ crawlerId: "unknown", willPay: false })} disabled={trigger.isPending}
                className="border border-danger/50 text-danger px-2.5 py-1 text-[9px] uppercase tracking-[0.1em] hover:bg-danger/10 transition-colors disabled:opacity-50">Sim · Block</button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto flex-1">
            <table className="w-full font-mono text-[11px]">
              <tbody>
                {tripwire.isLoading && <tr><td className="px-5 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={16} /></td></tr>}
                {tripwire.data?.map((t, i) => (
                  <tr key={t.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                    <td className="px-5 py-2.5 text-bone/80 w-[90px]">{t.crawlerId}</td>
                    <td className="px-3 py-2.5 text-muted truncate max-w-[140px]">{t.source}</td>
                    <td className={`px-3 py-2.5 uppercase ${t.action === "billed" ? "text-verified" : "text-danger"}`}>{t.action === "billed" ? "Billed" : "Locked"}</td>
                    <td className="px-5 py-2.5 text-right text-bone">{t.tollAmount ? usd(t.tollAmount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Module: Surrealizer Engine ────────────────────────────── */
function SurrealizerModule() {
  const jobs = useStemJobs();
  const analyze = useAnalyze();
  const [track, setTrack] = useState("");

  return (
    <section id="surrealizer" className="scroll-mt-32">
      <ModuleHead tag="Pillar III — Signal" title="The Surrealizer Engine™" desc="Neural stem extraction with forensic, DNA-level credit detection and steganographic phase-coded provenance." />

      <div className="card-surface p-6 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <label className="flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Submit a track for forensic analysis</span>
          <input value={track} aria-label="Submit a track for forensic analysis" onChange={(e) => setTrack(e.target.value)} placeholder="Track title…"
            className="mt-1.5 w-full bg-obsidian border border-obsidian-line focus:border-gold outline-none px-4 py-3 text-sm text-bone transition-colors" />
        </label>
        <button
          onClick={() => { if (track.trim()) { analyze.mutate({ trackTitle: track.trim() }); setTrack(""); } }}
          disabled={analyze.isPending || !track.trim()}
          className="flex items-center justify-center gap-2 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-gold-bright transition-colors disabled:opacity-50"
        >
          {analyze.isPending ? <Loader2 size={14} className="animate-spin" /> : <AudioWaveform size={14} />} Analyze
        </button>
      </div>

      <Grid cols={2}>
        {jobs.isLoading && <SkeletonCards n={4} />}
        {jobs.data?.map((j) => {
          const stems = safeParse<{ name: string; confidence: number }[]>(j.stems);
          const layers = safeParse<{ attribution: string; confidence: number }[]>(j.forensicLayers);
          return (
            <div key={j.id} className="card-surface p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">{j.trackTitle}</h3>
                <span className={`font-mono text-[9px] uppercase tracking-[0.16em] flex items-center gap-1 ${j.status === "complete" ? "text-verified" : "text-gold"}`}>
                  {j.status === "processing" ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}{j.status}
                </span>
              </div>
              {j.status === "processing" && (
                <div className="mt-3 h-1 bg-obsidian rounded overflow-hidden"><div className="h-full bg-gold" style={{ width: `${j.progress}%` }} /></div>
              )}
              <div className="mt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mb-2">Neural stems</div>
                <div className="flex flex-wrap gap-2">
                  {stems?.map((s) => (
                    <span key={s.name} className="font-mono text-[10px] text-bone/80 border border-obsidian-line px-2 py-1">{s.name} · {(s.confidence * 100).toFixed(0)}%</span>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mb-2 flex items-center gap-1.5"><Fingerprint size={12} /> Forensic attribution</div>
                <ul className="space-y-1.5">
                  {layers?.map((l, k) => (
                    <li key={k} className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-bone/80">{l.attribution}</span>
                      <span className="text-gold">{(l.confidence * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              {j.provenanceHash && (
                <div className="mt-4 border-t border-obsidian-line pt-3 font-mono text-[10px] text-muted">Provenance · <span className="text-gold">{j.provenanceHash}</span></div>
              )}
            </div>
          );
        })}
      </Grid>
    </section>
  );
}

/* ── Small shared UI ───────────────────────────────────────── */
function Grid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  return <div className={`grid gap-5 sm:grid-cols-2 ${cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>{children}</div>;
}
function SkeletonCards({ n }: { n: number }) {
  return <>{Array.from({ length: n }).map((_, i) => <div key={i} className="card-surface p-6 h-48 animate-pulse opacity-50" />)}</>;
}
function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof BarChart3; accent?: "verified" | "danger" }) {
  return (
    <div className="bg-obsidian p-5">
      <Icon size={16} className={accent === "verified" ? "text-verified" : accent === "danger" ? "text-danger" : "text-gold"} />
      <div className="font-display text-2xl mt-2">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mt-0.5">{label}</div>
    </div>
  );
}
function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/* ── Access gate — signed in, but not on the allowlist ─────── */
/* Kept for easy re-locking; unused while open access is enabled. */
// eslint-disable-next-line no-unused-vars
function AccessPending({ email }: { email: string }) {
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      window.location.href = "/";
    }
  }
  return (
    <div className="min-h-screen bg-obsidian text-bone grid place-items-center relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(197,160,89,0.10), transparent 55%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-[460px] card-surface p-10 text-center"
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <Crest size={58} />
            <div className="absolute -right-1 -bottom-1 bg-obsidian rounded-full p-1 border border-obsidian-line">
              <LockIcon size={16} className="text-gold" />
            </div>
          </div>
          <p className="eyebrow mt-6">The MasterTrust · Restricted</p>
          <h1 className="font-display text-3xl mt-2">Access Pending</h1>
          <p className="text-muted text-sm mt-3 leading-relaxed">
            This Data Room is invitation-only. Your account is authenticated, but
            <span className="text-bone"> {email} </span>
            is not yet on the approved access list.
          </p>
          <p className="text-muted text-sm mt-3 leading-relaxed">
            Request clearance from the administrator at{" "}
            <a href="mailto:info@spaltertech.com" className="text-gold hover:text-gold-bright transition-colors">
              info@spaltertech.com
            </a>
            . Once approved, sign in again to enter.
          </p>

          <button
            onClick={signOut}
            disabled={signingOut}
            className="mt-8 w-full flex items-center justify-center gap-2 py-3 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.18em] transition-colors disabled:opacity-60"
          >
            {signingOut && <Loader2 size={14} className="animate-spin" />}
            Sign out
          </button>
          <Link
            to="/"
            className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone transition-colors"
          >
            <ArrowLeft size={14} /> Return to public site
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
