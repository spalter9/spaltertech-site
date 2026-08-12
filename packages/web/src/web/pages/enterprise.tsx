import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Zap,
  Lock,
  Radio,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Cpu,
  Landmark,
  Check,
  X,
  Clock,
  Fingerprint,
  Users,
  Banknote,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { AccessGate } from "../components/access-gate";

/* ------------------------------------------------------------------ */
/* Enterprise B2B landing — deep-slate + indigo/cyan glassmorphism.    */
/* Self-contained visual identity, separate from the gold investor     */
/* site. Institutional fintech / music-tech infrastructure positioning.*/
/* ------------------------------------------------------------------ */

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------- Nav -------------------------------- */

function TopBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0B0F17]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-6 h-[68px] flex items-center justify-between">
        <Link
          to="/enterprise"
          className="flex items-center gap-2.5"
          aria-label="Spaltertech home"
        >
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-[#0B0F17]">
            <Building2 size={17} />
          </span>
          <span className="font-semibold tracking-tight text-white text-[15px]">
            Spaltertech
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-400">
          <a href="#infrastructure" className="hover:text-white transition-colors">
            Infrastructure
          </a>
          <a href="#comparison" className="hover:text-white transition-colors">
            Comparison
          </a>
          <Link to="/ssp-framework" className="hover:text-white transition-colors">
            SSP Protocol
          </Link>
          <Link to="/" className="hover:text-white transition-colors">
            Investor Site
          </Link>
        </nav>
        <Link
          to="/data-room"
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] border border-white/10 px-4 py-2 text-[13px] font-medium text-white hover:border-cyan-400/50 hover:bg-white/[0.08] transition-colors"
          aria-label="Access the enterprise data room"
        >
          Access <ArrowUpRight size={14} />
        </Link>
      </div>
    </header>
  );
}

/* ------------------------------- Hero -------------------------------- */

function PipelineNode({
  icon: Icon,
  label,
  sub,
  glow,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  glow: "indigo" | "cyan" | "core";
}) {
  const ring =
    glow === "core"
      ? "border-cyan-400/40 shadow-[0_0_40px_-8px_rgba(34,211,238,0.5)]"
      : glow === "indigo"
        ? "border-indigo-400/30"
        : "border-cyan-400/30";
  return (
    <div
      className={`flex-1 min-w-[150px] rounded-2xl border ${ring} bg-white/[0.03] backdrop-blur-sm px-5 py-5 text-center`}
    >
      <span
        className={`inline-grid place-items-center w-10 h-10 rounded-xl mb-3 ${
          glow === "core"
            ? "bg-gradient-to-br from-indigo-500 to-cyan-400 text-[#0B0F17]"
            : "bg-white/[0.05] text-cyan-300"
        }`}
      >
        <Icon size={19} />
      </span>
      <div className="text-white font-semibold text-[14px] leading-tight">
        {label}
      </div>
      <div className="text-slate-500 text-[11px] mt-1 leading-snug">{sub}</div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-[68px]">
      {/* ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% -5%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(40% 40% at 85% 20%, rgba(34,211,238,0.12), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[12px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            Enterprise infrastructure · C2PA · EU AI Act ready
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="mt-7 max-w-4xl font-semibold tracking-tight text-white text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.03]">
            Spaltertech: The Legal &amp; Financial Engine for{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-cyan-400 bg-clip-text text-transparent">
              Modern Catalog Management
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-6 max-w-2xl text-slate-400 text-lg leading-relaxed">
            Automated AI provenance, C2PA manifest signing, and instant USD
            royalty distribution built for master trusts, labels, and platforms.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#infrastructure"
              className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-[#0B0F17] transition-shadow hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.6)]"
              aria-label="Explore enterprise rails"
            >
              Explore Enterprise Rails
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </a>
            <a
              href="#comparison"
              className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] px-6 py-3.5 text-[14px] font-medium text-white hover:border-cyan-400/40 hover:bg-white/[0.05] transition-colors"
              aria-label="View architecture and API specs"
            >
              View Architecture &amp; API Specs
            </a>
          </div>
        </Reveal>

        {/* Architecture pipeline badge */}
        <Reveal delay={0.32}>
          <div className="mt-16 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md p-6 md:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-6">
              <Cpu size={13} className="text-cyan-400" />
              Settlement Pipeline
            </div>
            <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-2">
              <PipelineNode
                icon={Building2}
                label="MasterTrusts / Labels / DSPs"
                sub="Catalog ingestion & rights data"
                glow="indigo"
              />
              <div className="hidden md:flex items-center text-cyan-400/60 px-1">
                <ArrowRight size={22} />
              </div>
              <PipelineNode
                icon={Cpu}
                label="Spaltertech Core Engine"
                sub="C2PA signing · split accounting"
                glow="core"
              />
              <div className="hidden md:flex items-center text-cyan-400/60 px-1">
                <ArrowRight size={22} />
              </div>
              <PipelineNode
                icon={Landmark}
                label="Instant USD Payouts"
                sub="ACH · wire · RTP settlement"
                glow="cyan"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------- Infrastructure Matrix ------------------------- */

type Card = {
  icon: LucideIcon;
  kicker: string;
  title: string;
  subtitle: string;
  bullet: string;
};

const CARDS: Card[] = [
  {
    icon: ShieldCheck,
    kicker: "Global AI Regulatory Compliance",
    title: "Dual-Layer Provenance Engine",
    subtitle: "Meets EU AI Act Article 50 & RIAA compliance standards out of the box.",
    bullet:
      "Embeds cryptographically signed C2PA metadata directly into audio file headers alongside imperceptible acoustic watermarking.",
  },
  {
    icon: Zap,
    kicker: "Zero-Friction Royalty Settlement",
    title: "Invisible Account Abstraction with Web2 simplicity.",
    subtitle: "Web2 login simplicity paired with Web3 programmatic split accounting.",
    bullet:
      "Users log in via SSO/email. Polygon smart-contract splits automatically off-ramp micro-royalties straight into traditional USD bank accounts via ACH.",
  },
  {
    icon: Lock,
    kicker: "Rights Protection & Conflict Resolution",
    title: "90-Day Programmatic Escrow",
    subtitle: "Eliminates catalog freezes and black-box royalty delays.",
    bullet:
      "Contested split payouts route to a secure 90-day smart-contract escrow, allowing undisputed shares to pay out instantly without halting catalog distribution.",
  },
  {
    icon: Radio,
    kicker: "Tamper-Proof Metadata Tracking",
    title: "Spectrally Embedded Watermarking",
    subtitle: "Guarantees catalog attribution across lossy social media channels.",
    bullet:
      "Acoustic watermarks woven into the frequency spectrum ensure tracking survives social media re-encoding (TikTok, Instagram, YouTube).",
  },
];

function InfraCard({ card, i }: { card: Card; i: number }) {
  const Icon = card.icon;
  return (
    <Reveal delay={(i % 2) * 0.08}>
      <div className="group relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-7 overflow-hidden transition-colors hover:border-cyan-400/40">
        {/* corner glow */}
        <div
          className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="inline-grid place-items-center w-12 h-12 rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300 group-hover:border-cyan-400/40 transition-colors">
            <Icon size={22} />
          </span>
          <div className="mt-5 text-[11px] uppercase tracking-[0.16em] text-indigo-300/80">
            {card.kicker}
          </div>
          <h3 className="mt-2 text-white font-semibold text-xl tracking-tight">
            {card.title}
          </h3>
          <p className="mt-2 text-slate-400 text-[14px] leading-relaxed">
            {card.subtitle}
          </p>
          <div className="mt-5 flex gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Check size={16} className="mt-0.5 shrink-0 text-cyan-400" />
            <p className="text-slate-300 text-[13px] leading-relaxed">
              {card.bullet}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function InfraMatrix() {
  return (
    <section
      id="infrastructure"
      className="relative border-t border-white/[0.06] scroll-mt-[68px]"
    >
      <div className="mx-auto max-w-[1200px] px-6 py-24">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.2em] text-cyan-400/80">
            Risk Mitigation &amp; Infrastructure Matrix
          </div>
          <h2 className="mt-4 max-w-2xl font-semibold tracking-tight text-white text-[clamp(1.9rem,4vw,3rem)] leading-[1.08]">
            Four enterprise rails, one settlement engine.
          </h2>
          <p className="mt-4 max-w-2xl text-slate-400 text-lg leading-relaxed">
            Compliance, payout, dispute, and attribution risk — engineered out
            of the catalog lifecycle by default.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {CARDS.map((c, i) => (
            <InfraCard key={c.title} card={c} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Comparison Table -------------------------- */

type Row = {
  capability: string;
  legacy: string;
  spaltertech: string;
};

const ROWS: Row[] = [
  {
    capability: "Provenance Verification",
    legacy: "Manual audits · header loss",
    spaltertech: "Automated C2PA signing",
  },
  {
    capability: "Split Accounting",
    legacy: "30–90 day reconciliation",
    spaltertech: "Real-time on-chain splits",
  },
  {
    capability: "Royalty Settlement",
    legacy: "Batch payout delays",
    spaltertech: "Real-time ACH off-ramp",
  },
  {
    capability: "Dispute Settlement",
    legacy: "Black-box catalog holds",
    spaltertech: "90-day programmatic escrow",
  },
  {
    capability: "Attribution Tracking",
    legacy: "Lost on re-encode",
    spaltertech: "Spectral watermark survives",
  },
  {
    capability: "User Onboarding",
    legacy: "Custodial account friction",
    spaltertech: "Non-custodial software rail",
  },
];

function ComparisonTable() {
  return (
    <section
      id="comparison"
      className="relative border-t border-white/[0.06] scroll-mt-[68px]"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 0%, rgba(99,102,241,0.1), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-[1100px] px-6 py-24">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.2em] text-cyan-400/80">
            Head to Head
          </div>
          <h2 className="mt-4 max-w-3xl font-semibold tracking-tight text-white text-[clamp(1.9rem,4vw,3rem)] leading-[1.08]">
            Legacy Catalog Management vs. Spaltertech Infrastructure
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          {/* ---- Desktop / tablet: 3-column grid ---- */}
          <div className="mt-12 hidden md:block overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
            {/* header row */}
            <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-white/[0.08] bg-white/[0.02]">
              <div className="px-5 py-4 text-[12px] uppercase tracking-[0.14em] text-slate-400">
                Core Capability
              </div>
              <div className="px-5 py-4 text-[12px] uppercase tracking-[0.14em] text-rose-300/70 border-l border-white/[0.06]">
                Legacy Catalog Systems
              </div>
              <div className="px-5 py-4 text-[12px] uppercase tracking-[0.14em] text-cyan-300 border-l border-white/[0.06]">
                Spaltertech Engine
              </div>
            </div>

            {ROWS.map((r, i) => (
              <div
                key={r.capability}
                className={`grid grid-cols-[1.1fr_1fr_1fr] items-stretch ${
                  i !== ROWS.length - 1 ? "border-b border-white/[0.05]" : ""
                } hover:bg-white/[0.015] transition-colors`}
              >
                <div className="min-w-0 px-5 py-5 text-white font-medium text-[14px] flex items-center">
                  {r.capability}
                </div>
                <div className="min-w-0 px-5 py-5 border-l border-white/[0.06] flex items-center">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.07] px-3 py-1.5 text-[12.5px] text-rose-200/90">
                    <X size={13} className="shrink-0 text-rose-400" />
                    {r.legacy}
                  </span>
                </div>
                <div className="min-w-0 px-5 py-5 border-l border-white/[0.06] flex items-center">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-1.5 text-[12.5px] text-cyan-100">
                    <Check size={13} className="shrink-0 text-cyan-400" />
                    {r.spaltertech}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Mobile: stacked cards ---- */}
          <div className="mt-10 flex flex-col gap-4 md:hidden">
            {ROWS.map((r) => (
              <div
                key={r.capability}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] text-white font-medium text-[15px]">
                  {r.capability}
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-rose-300/70 mb-1.5">
                      Legacy Catalog Systems
                    </div>
                    <span className="inline-flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.07] px-3 py-1.5 text-[13px] text-rose-200/90">
                      <X size={13} className="shrink-0 mt-0.5 text-rose-400" />
                      {r.legacy}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.14em] text-cyan-300 mb-1.5">
                      Spaltertech Engine
                    </div>
                    <span className="inline-flex items-start gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-1.5 text-[13px] text-cyan-100">
                      <Check size={13} className="shrink-0 mt-0.5 text-cyan-400" />
                      {r.spaltertech}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------- Engine Teaser Box ------------------------- */

type SimTrack = {
  title: string;
  artist: string;
  gross: number;
};

const SIM_TRACKS: SimTrack[] = [
  { title: "Midnight Reversion", artist: "Aura Vane", gross: 4820.5 },
  { title: "Black Box Serenade", artist: "Elio Sol", gross: 2115.75 },
  { title: "Paragraph 3.3", artist: "Aura Vane", gross: 7340.0 },
  { title: "Orphaned Master", artist: "V. Kessler", gross: 1580.25 },
];

const SIM_STAGES = [
  { key: "ingest", label: "Ingest", detail: "Asset fingerprinted", icon: Fingerprint },
  { key: "verify", label: "Verify", detail: "C2PA signature validated", icon: ShieldCheck },
  { key: "attribute", label: "Attribute", detail: "Contributors resolved", icon: Users },
  { key: "split", label: "Split", detail: "Shares computed on-chain", icon: Cpu },
  { key: "settle", label: "Settle", detail: "USD off-ramp cleared", icon: Banknote },
] as const;

const SIM_SPLITS = [
  { party: "Creator", pct: 50, tone: "cyan" },
  { party: "Historical Writers", pct: 30, tone: "indigo" },
  { party: "Publisher", pct: 12, tone: "slate" },
  { party: "Label", pct: 8, tone: "slate" },
] as const;

const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

function SplitBar({
  party,
  pct,
  amount,
  tone,
  active,
  delay,
}: {
  party: string;
  pct: number;
  amount: number;
  tone: "cyan" | "indigo" | "slate";
  active: boolean;
  delay: number;
}) {
  const fill =
    tone === "cyan"
      ? "from-cyan-400 to-cyan-500"
      : tone === "indigo"
        ? "from-indigo-400 to-indigo-500"
        : "from-slate-500 to-slate-600";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[11.5px] text-slate-300 truncate">{party}</span>
        <span className="flex items-baseline gap-2 shrink-0">
          <span className="text-[10.5px] text-slate-500 font-mono">{pct}%</span>
          <span className="text-[11.5px] text-white font-mono tabular-nums">
            {active ? usd(amount) : "—"}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: active ? `${pct}%` : 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: active ? delay : 0 }}
        />
      </div>
    </div>
  );
}

function EngineSimulation() {
  const [txIndex, setTxIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [settledCount, setSettledCount] = useState(1284);
  const [settledValue, setSettledValue] = useState(3412880.4);

  const track = SIM_TRACKS[txIndex % SIM_TRACKS.length]!;
  const withheld = track.gross * 0.08;
  const net = track.gross - withheld;
  const splitsLive = stage >= 3;

  useEffect(() => {
    const t = setTimeout(() => {
      if (stage < SIM_STAGES.length - 1) {
        setStage((s) => s + 1);
        return;
      }
      setSettledCount((c) => c + 1);
      setSettledValue((v) => v + net);
      setTxIndex((i) => i + 1);
      setStage(0);
    }, stage === SIM_STAGES.length - 1 ? 1900 : 1150);
    return () => clearTimeout(t);
  }, [stage, net]);

  return (
    <div
      className="rounded-2xl border border-white/[0.09] bg-[#070B12]/80 backdrop-blur-sm overflow-hidden"
      aria-label="Live protocol transaction simulation"
    >
      {/* status bar */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
        <span className="flex items-center gap-2">
          <span className="relative grid place-items-center w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400" />
            <motion.span
              className="absolute inset-0 rounded-full bg-emerald-400"
              animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-emerald-300">
            Engine Live
          </span>
        </span>
        <span className="text-[10.5px] font-mono text-slate-500 truncate">
          tx 0x{(0x8f21a4 + txIndex * 7919).toString(16)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] p-4 sm:p-5">
        {/* pipeline */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-slate-500">
              Pipeline
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={track.title}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.3 }}
                className="text-[11.5px] text-white truncate"
              >
                {track.title}{" "}
                <span className="text-slate-500">· {track.artist}</span>
              </motion.span>
            </AnimatePresence>
          </div>

          <ol className="space-y-1.5">
            {SIM_STAGES.map((s, i) => {
              const done = i < stage;
              const now = i === stage;
              const Icon = s.icon;
              return (
                <li
                  key={s.key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-500 ${
                    now
                      ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                      : done
                        ? "border-white/[0.07] bg-white/[0.02]"
                        : "border-white/[0.05] bg-transparent"
                  }`}
                >
                  <span
                    className={`grid place-items-center w-7 h-7 rounded-lg shrink-0 transition-colors duration-500 ${
                      now
                        ? "bg-gradient-to-br from-indigo-500 to-cyan-400 text-[#070B12]"
                        : done
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-white/[0.04] text-slate-600"
                    }`}
                  >
                    {done ? <Check size={13} /> : <Icon size={13} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[12.5px] font-medium leading-tight transition-colors duration-500 ${
                        now ? "text-white" : done ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span
                      className={`block text-[10.5px] leading-tight mt-0.5 transition-colors duration-500 ${
                        now ? "text-cyan-300/80" : "text-slate-600"
                      }`}
                    >
                      {s.detail}
                    </span>
                  </span>
                  {now && (
                    <motion.span
                      className="h-1 w-10 rounded-full bg-cyan-400/25 overflow-hidden shrink-0"
                      aria-hidden="true"
                    >
                      <motion.span
                        className="block h-full bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.05, ease: "linear" }}
                      />
                    </motion.span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* splits + settlement */}
        <div className="flex flex-col">
          <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-slate-500 mb-3">
            Split Settlement
          </span>

          <div className="space-y-3">
            {SIM_SPLITS.map((s, i) => (
              <SplitBar
                key={s.party}
                party={s.party}
                pct={s.pct}
                amount={(net * s.pct) / 100}
                tone={s.tone}
                active={splitsLive}
                delay={i * 0.09}
              />
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-slate-400">Gross</span>
              <span className="text-white font-mono tabular-nums">
                {usd(track.gross)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Receipt size={11} className="text-amber-300/70" />
                Tax withheld (8%)
              </span>
              <span className="text-amber-200/90 font-mono tabular-nums">
                −{usd(withheld)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] pt-1">
              <span className="text-slate-200 font-medium">Net settled</span>
              <span
                className={`font-mono tabular-nums font-semibold transition-colors duration-500 ${
                  stage === SIM_STAGES.length - 1
                    ? "text-emerald-300"
                    : "text-slate-500"
                }`}
              >
                {stage === SIM_STAGES.length - 1 ? usd(net) : "pending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* running totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-white/[0.07] bg-white/[0.02]">
        {[
          { k: "Settled today", v: settledCount.toLocaleString("en-US") },
          { k: "Value routed", v: usd(settledValue) },
          { k: "Avg latency", v: "1.4s" },
        ].map((m, i) => (
          <div
            key={m.k}
            className={`flex items-baseline justify-between gap-3 px-4 sm:px-5 py-3 sm:block ${
              i !== 0
                ? "border-t border-white/[0.06] sm:border-t-0 sm:border-l"
                : ""
            }`}
          >
            <div className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-slate-500">
              {m.k}
            </div>
            <div className="text-[13px] text-white font-mono tabular-nums sm:mt-1">
              {m.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EngineTeaser() {
  return (
    <section className="relative border-t border-white/[0.06]">
      <div className="relative mx-auto max-w-[1100px] px-6 pt-20">
        <Reveal>
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-cyan-500/30 rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-3">
                <span className="text-cyan-400 text-xs font-semibold tracking-wider uppercase block">
                  Live Protocol Simulation
                </span>
                <h4 className="text-2xl font-bold text-white">
                  See the Engine in Action
                </h4>
                <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
                  Our real-time transaction engine processes instant split
                  settlements and tax compliance natively. Watch the data flow
                  through MasterTrust.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 items-center shrink-0">
                <Link
                  to="/data-room"
                  className="px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors text-sm"
                >
                  Access Investor Memorandum
                </Link>
                <Link
                  to="/ssp-framework"
                  className="px-6 py-3 rounded-xl border border-cyan-500/40 text-cyan-300 font-semibold hover:bg-cyan-500/10 transition-colors text-sm"
                >
                  View SSP Framework
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <EngineSimulation />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------- Closing CTA ---------------------------- */

function ClosingCTA() {
  return (
    <section
      id="contact"
      className="relative border-t border-white/[0.06] scroll-mt-[68px]"
    >
      <div className="mx-auto max-w-[1100px] px-6 py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-white/[0.05] to-white/[0.01] backdrop-blur-md p-10 md:p-14 text-center">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.14), transparent 60%)",
              }}
            />
            <div className="relative flex flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[12px] text-slate-300">
                <Clock size={13} className="text-cyan-400" /> Onboarding
                enterprise partners now
              </span>
              <h2 className="mt-6 max-w-2xl font-semibold tracking-tight text-white text-[clamp(1.9rem,4vw,3rem)] leading-[1.1]">
                Deploy compliant catalog infrastructure — without touching crypto.
              </h2>
              <p className="mt-4 max-w-xl text-slate-400 text-lg leading-relaxed">
                Provenance, split accounting, and instant USD settlement on a
                single non-custodial rail. Built for master trusts, labels,
                publishers, and DSPs.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link
                  to="/data-room"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3.5 text-[14px] font-semibold text-[#0B0F17] transition-shadow hover:shadow-[0_0_32px_-4px_rgba(34,211,238,0.6)]"
                  aria-label="Access the enterprise data room"
                >
                  Access the Platform
                  <ArrowUpRight
                    size={16}
                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </Link>
                <Link
                  to="/infrastructure"
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.02] px-6 py-3.5 text-[14px] font-medium text-white hover:border-cyan-400/40 hover:bg-white/[0.05] transition-colors"
                  aria-label="View the live infrastructure layer"
                >
                  View Live Infrastructure <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-slate-500">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400 text-[#0B0F17]">
              <Building2 size={14} />
            </span>
            Spaltertech — enterprise catalog infrastructure
          </div>
          <div>© {new Date().getFullYear()} Spaltertech. All rights reserved.</div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Page -------------------------------- */

export default function Enterprise() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-white antialiased selection:bg-cyan-400 selection:text-[#0B0F17]">
      <AccessGate />
      <TopBar />
      <Hero />
      <InfraMatrix />
      <ComparisonTable />
      <EngineTeaser />
      <ClosingCTA />
    </div>
  );
}
