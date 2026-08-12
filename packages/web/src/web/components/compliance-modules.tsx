import { useState } from "react";
import {
  Loader2, ShieldCheck, Fingerprint, Anchor, Landmark, Wallet, ArrowRightLeft,
  Clock, CheckCircle2, FileCheck2, BadgeCheck, Banknote,
} from "lucide-react";
import {
  useManifests, useAnchorManifest, useFiatPayouts, useOfframp,
  useUnclaimed, useResolveClaim, useCompliancePosture,
} from "../queries/pillars";
import { Stat, safeParse } from "./pillar-modules";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/* ── Posture header ────────────────────────────────────────── */
export function PostureStats() {
  const p = useCompliancePosture();
  return (
    <div className="grid sm:grid-cols-4 gap-px bg-obsidian-line">
      <Stat label="Manifests anchored" value={p.data ? p.data.manifests.toLocaleString() : "—"} icon={FileCheck2} />
      <Stat label="Fiat settled" value={p.data ? usd(p.data.payoutUsd) : "—"} icon={Banknote} accent="verified" />
      <Stat label="Escrow held (90-day)" value={p.data ? usd(p.data.escrowHeldUsd) : "—"} icon={Clock} />
      <Stat label="Open claims" value={p.data ? String(p.data.escrowClaims) : "—"} icon={ShieldCheck} />
    </div>
  );
}

/* ── 1 · Dual-Layer Provenance (C2PA + watermark + anchor) ──── */
export function ProvenanceModule() {
  const manifests = useManifests();
  const anchor = useAnchorManifest();
  const [title, setTitle] = useState("");
  const [human, setHuman] = useState(70);

  return (
    <>
      <div className="card-surface p-6 mb-6 flex flex-col lg:flex-row gap-4 lg:items-end">
        <label className="flex-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Sign &amp; anchor a new master</span>
          <input value={title} aria-label="Track title to sign and anchor" onChange={(e) => setTitle(e.target.value)} placeholder="Track title…"
            className="mt-1.5 w-full bg-obsidian border border-obsidian-line focus:border-gold outline-none px-4 py-3 text-sm text-bone transition-colors" />
        </label>
        <label className="lg:w-56">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Human contribution · {human}%</span>
          <input type="range" min={0} max={100} value={human} aria-label="Human contribution ratio"
            onChange={(e) => setHuman(Number(e.target.value))}
            className="mt-3 w-full accent-gold" />
        </label>
        <button
          onClick={() => { if (title.trim()) { anchor.mutate({ title: title.trim(), humanRatio: human }); setTitle(""); } }}
          disabled={anchor.isPending || !title.trim()}
          className="flex items-center justify-center gap-2 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-gold-bright transition-colors disabled:opacity-50"
        >
          {anchor.isPending ? <Loader2 size={14} className="animate-spin" /> : <Anchor size={14} />} Sign &amp; Anchor
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs min-w-[860px]">
            <thead>
              <tr className="text-gold border-b border-obsidian-line">
                {["Title", "C2PA Manifest", "Human / AI", "Acoustic Watermark", "Survives", "Anchor", "State"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3.5 uppercase tracking-[0.12em] text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manifests.isLoading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={18} /></td></tr>
              )}
              {manifests.data?.map((m, i) => {
                const survives = safeParse<string[]>(m.survives) ?? [];
                return (
                  <tr key={m.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                    <td className="px-4 py-3.5 max-w-[220px] truncate text-bone">{m.title}</td>
                    <td className="px-4 py-3.5 text-gold truncate max-w-[150px]">{m.manifestHash.slice(0, 16)}…</td>
                    <td className="px-4 py-3.5 text-muted">
                      <span className="text-verified">{m.humanRatio}%</span> / <span className="text-bone/70">{m.aiRatio}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-bone/80"><span className="flex items-center gap-1.5"><Fingerprint size={13} className="text-gold" /> {m.watermarkBits}-bit</span></td>
                    <td className="px-4 py-3.5 text-muted">{survives.join(" · ")}</td>
                    <td className="px-4 py-3.5 text-muted truncate max-w-[120px]">{m.anchorTxHash.slice(0, 12)}…</td>
                    <td className="px-4 py-3.5 uppercase text-verified"><span className="flex items-center gap-1"><BadgeCheck size={13} /> {m.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── 2 · Account Abstraction + Fiat Off-Ramp ───────────────── */
const RAIL_LABEL: Record<string, string> = { ACH: "ACH", wire: "Wire", RTP: "RTP" };
const PAY_STATE: Record<string, string> = {
  settled: "text-verified", in_transit: "text-gold", queued: "text-muted", held: "text-danger",
};

export function FiatOfframpModule() {
  const payouts = useFiatPayouts();
  const offramp = useOfframp();

  return (
    <>
      <div className="card-surface p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 grid place-items-center border border-gold/40 text-gold"><Wallet size={20} /></div>
          <div>
            <div className="font-display text-lg">Invisible wallets · zero-crypto friction</div>
            <p className="text-muted text-xs mt-0.5">ERC-4337 smart accounts created on email / OAuth / SSO login. No seed phrases, no gas.</p>
          </div>
        </div>
        <button
          onClick={() => offramp.mutate({ recipient: "New Creator Payout", usdcAmount: Number((250 + Math.random() * 4000).toFixed(2)), rail: "ACH" })}
          disabled={offramp.isPending}
          className="flex items-center justify-center gap-2 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-gold-bright transition-colors disabled:opacity-50"
        >
          {offramp.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />} Off-ramp USDC
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-obsidian-line font-mono text-[10px] uppercase tracking-[0.18em] text-gold flex items-center gap-2">
          <Landmark size={13} /> Polygon USDC → USD bank settlement
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs min-w-[820px]">
            <thead>
              <tr className="text-muted border-b border-obsidian-line">
                {["Recipient", "Smart Account", "Login", "USDC", "USD", "Rail", "Bank", "State"].map((h) => (
                  <th key={h} className="text-left font-medium px-4 py-3 uppercase tracking-[0.12em] text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.isLoading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={18} /></td></tr>
              )}
              {payouts.data?.map((p, i) => (
                <tr key={p.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                  <td className="px-4 py-3 max-w-[200px] truncate text-bone">{p.recipient}</td>
                  <td className="px-4 py-3 text-gold truncate max-w-[120px]">{p.smartAccount.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-muted uppercase">{p.loginMethod}</td>
                  <td className="px-4 py-3 text-bone/70">{p.usdcAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-bone">{usd(p.usdAmount)}</td>
                  <td className="px-4 py-3 text-muted">{RAIL_LABEL[p.rail] ?? p.rail}</td>
                  <td className="px-4 py-3 text-muted">••{p.bankLast4}</td>
                  <td className={`px-4 py-3 uppercase ${PAY_STATE[p.status]}`}>{p.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ── 3 · Unclaimed Split Escrow (90-day time-lock) ─────────── */
const REASON_LABEL: Record<string, string> = { disputed: "Disputed", orphaned: "Orphaned", unmatched: "Unmatched" };

function daysLeft(release: Date | string): number {
  const t = new Date(release).getTime() - Date.now();
  return Math.ceil(t / (1000 * 60 * 60 * 24));
}

export function UnclaimedEscrowModule() {
  const rows = useUnclaimed();
  const resolve = useResolveClaim();

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 py-3.5 border-b border-obsidian-line font-mono text-[10px] uppercase tracking-[0.18em] text-gold flex items-center gap-2">
        <Clock size={13} /> 90-day programmatic hold · funds held, never frozen
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs min-w-[860px]">
          <thead>
            <tr className="text-muted border-b border-obsidian-line">
              {["Claim", "Held", "Reason", "Time-lock", "State", ""].map((h) => (
                <th key={h} className="text-left font-medium px-4 py-3 uppercase tracking-[0.12em] text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.isLoading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted"><Loader2 className="animate-spin inline text-gold" size={18} /></td></tr>
            )}
            {rows.data?.map((r, i) => {
              const left = daysLeft(r.releaseAt);
              const released = r.releaseState === "released";
              return (
                <tr key={r.id} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                  <td className="px-4 py-3.5 max-w-[280px] truncate text-bone">{r.title}</td>
                  <td className="px-4 py-3.5 text-bone">{usd(r.amount)}</td>
                  <td className="px-4 py-3.5 text-muted">{REASON_LABEL[r.reason] ?? r.reason}</td>
                  <td className="px-4 py-3.5 text-muted">
                    {released ? <span className="text-verified">complete</span> : left <= 0 ? <span className="text-gold">unlocked</span> : `${left}d remaining`}
                  </td>
                  <td className={`px-4 py-3.5 uppercase ${released ? "text-verified" : r.releaseState === "claimable" ? "text-gold" : r.releaseState === "disputed" ? "text-danger" : "text-muted"}`}>
                    {r.releaseState}{r.claimant ? ` · ${r.claimant}` : ""}
                  </td>
                  <td className="px-4 py-3.5">
                    {released ? (
                      <span className="text-verified flex items-center gap-1"><CheckCircle2 size={13} /> Paid</span>
                    ) : r.releaseState === "claimable" ? (
                      <button
                        onClick={() => resolve.mutate({ claimKey: r.claimKey, claimant: "Verified Rights-Holder" })}
                        disabled={resolve.isPending}
                        className="border border-gold text-gold px-3 py-1.5 uppercase tracking-[0.12em] text-[10px] hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50"
                      >
                        {resolve.isPending && resolve.variables?.claimKey === r.claimKey ? "…" : "Release"}
                      </button>
                    ) : (
                      <span className="text-muted">held</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
