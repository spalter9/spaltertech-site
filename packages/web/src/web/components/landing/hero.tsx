import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, Coins, Fingerprint, Lock, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import { HeroVideo } from "../hero-video";

const CHIPS: { icon: LucideIcon; k: string; v: string; pos: string; delay: string }[] = [
  { icon: UserCheck, k: "Human authorship", v: "Measured", pos: "left-0 top-[12%] lg:-left-10", delay: "0s" },
  { icon: ShieldCheck, k: "Chain of title", v: "Verified", pos: "right-0 top-[8%] lg:-right-10", delay: "-2s" },
  { icon: Fingerprint, k: "Provenance", v: "Embedded", pos: "left-0 bottom-[14%] lg:-left-12", delay: "-4s" },
  { icon: Coins, k: "Settlement", v: "Instant", pos: "right-0 bottom-[10%] lg:-right-12", delay: "-1s" },
];

const TICKER = [
  "MasterTrust™",
  "Surrealizer Engine™",
  "Sovereign Sign Protocol™",
  "C2PA v2 provenance",
  "USDC → USD off-ramp",
  "Polygon-anchored ledger",
  "90-day time-locked escrow",
  "Forensic stem attribution",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      {/* Atmosphere */}
      <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
      <div className="aurora-blob -left-40 top-0 h-[34rem] w-[34rem] bg-[#3a4fd6]/60" aria-hidden />
      <div className="aurora-blob -right-32 top-24 h-[30rem] w-[30rem] bg-[#8fe9ff]/25" style={{ animationDelay: "-7s" }} aria-hidden />
      <div className="aurora-blob left-1/3 top-[30rem] h-[28rem] w-[28rem] bg-[#8f5bff]/25" style={{ animationDelay: "-12s" }} aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-5xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-gold-bright">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verified opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-verified" />
            </span>
            Sovereign Infrastructure
          </span>

          <h1 className="mt-7 font-sora text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.6rem]">
            The sovereign infrastructure for the{" "}
            <span className="gold-text">next era of media assets.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Spalter Tech is building the ownership layer of the creative economy — where every
            work is cryptographically proven, every legacy catalog is reawakened as a living
            asset, and every payment settles the instant it is earned.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/data-room" className="btn-gold w-full sm:w-auto">
              <Lock size={13} /> Enter The Data Room
            </Link>
            <a href="#manifesto" className="btn-ghost w-full sm:w-auto">
              Read The Manifesto
            </a>
          </div>

          {/* The capability that runs today, named before the fold. */}
          <a
            href="#authorship"
            className="group glass mx-auto mt-8 inline-flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-gold/25 px-5 py-3 text-center transition-colors hover:border-gold/50"
          >
            <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-gold-bright">
              Now live
            </span>
            <span className="text-sm leading-relaxed text-bone">
              <span className="text-gold-bright">The Examiner</span> — upload a record, get a
              stem-by-stem finding on which parts a person actually performed, and the Copyright
              Office wording that goes with it.{" "}
              <ArrowRight
                size={13}
                className="inline-block align-[-1px] text-gold-bright transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </a>
        </motion.div>

        {/* Product window with floating trust chips */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-16 max-w-5xl pb-6"
        >
          <div
            className="absolute -inset-6 rounded-[2.5rem] opacity-70 blur-3xl"
            style={{ background: "linear-gradient(120deg, rgba(109,139,255,0.45), rgba(143,233,255,0.2), rgba(143,91,255,0.4))" }}
            aria-hidden
          />
          <div className="relative rounded-[1.75rem] border border-gold/30 bg-obsidian-raised/80 p-2 shadow-[0_40px_120px_-40px_rgba(58,79,214,0.9)] backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5c451]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-verified/70" />
              <span className="ml-3 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                spalter.tech · the sovereign briefing
              </span>
            </div>
            <HeroVideo src="/videos/mt-orphan-16x9-v1.mp4" poster="/videos/mt-orphan-poster.jpg" rounded />
          </div>

          {CHIPS.map((c) => (
            <div
              key={c.k}
              className={`glass animate-float absolute hidden items-center gap-3 rounded-2xl border border-gold/30 px-4 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] md:flex ${c.pos}`}
              style={{ animationDelay: c.delay }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-bright/30 to-gold/20 text-gold-bright">
                <c.icon size={17} />
              </span>
              <span className="text-left leading-tight">
                <span className="block font-sora text-sm font-semibold text-bone">{c.v}</span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{c.k}</span>
              </span>
            </div>
          ))}
        </motion.div>

        {/* Mobile: chips as a grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:hidden">
          {CHIPS.map((c) => (
            <div key={c.k} className="card-surface flex items-center gap-3 rounded-2xl p-3.5">
              <c.icon size={18} className="shrink-0 text-gold-bright" />
              <span className="leading-tight">
                <span className="block font-sora text-sm font-semibold">{c.v}</span>
                <span className="block font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted">{c.k}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div className="marquee relative mt-16 overflow-hidden border-y border-obsidian-line bg-obsidian-raised/50 py-4" aria-hidden>
        <div className="marquee-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="mx-8 flex items-center gap-8 whitespace-nowrap font-mono text-xs uppercase tracking-[0.22em] text-muted">
              {t}
              <span className="h-1 w-1 rounded-full bg-gold" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
