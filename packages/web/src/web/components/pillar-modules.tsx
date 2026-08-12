import { useState } from "react";
import { motion } from "motion/react";
import {
  Loader2, Play, ShieldCheck, Fingerprint, AudioWaveform, Bot, CheckCircle2,
  Lock as LockIcon, BarChart3, Link2,
} from "lucide-react";
import {
  useEscrow, useSettleAsset, useLedger, useSspStats, useTripwire,
  useTriggerTripwire, useStemJobs, useAnalyze,
} from "../queries/pillars";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/* ── Pillar I — MasterTrust Vault ─────────────────────────── */
export function VaultModule() {
  const escrow = useEscrow();
  const settle = useSettleAsset();
  const stateColor: Record<string, string> = {
    settled: "text-verified", settling: "text-gold", pending: "text-muted", held: "text-danger",
  };
  return (
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
                <td className="px-4 py-3.5 text-verified"><span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Multi-Sig</span></td>
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
  );
}

/* ── Pillar II — SSP Ledger + Tripwire ─────────────────────── */
export function LedgerStats() {
  const stats = useSspStats();
  return (
    <div className="grid sm:grid-cols-4 gap-px bg-obsidian-line">
      <Stat label="On-chain volume" value={stats.data ? usd(stats.data.totalVolume) : "—"} icon={BarChart3} />
      <Stat label="Transactions" value={stats.data ? stats.data.txCount.toLocaleString() : "—"} icon={Link2} />
      <Stat label="Bots billed" value={stats.data ? String(stats.data.botsBilled) : "—"} icon={Bot} accent="verified" />
      <Stat label="Bots locked out" value={stats.data ? String(stats.data.botsLocked) : "—"} icon={LockIcon} accent="danger" />
    </div>
  );
}

export function LedgerModule() {
  const ledger = useLedger();
  const tripwire = useTripwire();
  const trigger = useTriggerTripwire();

  return (
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
  );
}

/* ── Pillar III — Surrealizer Engine ───────────────────────── */
export function SurrealizerModule() {
  const jobs = useStemJobs();
  const analyze = useAnalyze();
  const [track, setTrack] = useState("");

  return (
    <>
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

      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
    </>
  );
}

/* ── Shared UI ─────────────────────────────────────────────── */
export function SkeletonCards({ n }: { n: number }) {
  return <>{Array.from({ length: n }).map((_, i) => <div key={i} className="card-surface p-6 h-48 animate-pulse opacity-50" />)}</>;
}

export function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof BarChart3; accent?: "verified" | "danger" }) {
  return (
    <div className="bg-obsidian p-5">
      <Icon size={16} className={accent === "verified" ? "text-verified" : accent === "danger" ? "text-danger" : "text-gold"} />
      <div className="font-display text-2xl mt-2">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mt-0.5">{label}</div>
    </div>
  );
}

export function ModuleHead({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{tag}</p>
      <h2 className="font-display text-3xl md:text-4xl mt-2">{title}</h2>
      <p className="text-muted text-sm mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

export function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** Reveal wrapper for staggered section entrances. */
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}
