import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowUpRight, Lock, ShieldCheck, Fingerprint, Coins } from "lucide-react";
import { Crest } from "../brand";
import { HeroVideo } from "../hero-video";

const STATS = [
  { icon: ShieldCheck, k: "Chain of title", v: "Verified" },
  { icon: Fingerprint, k: "Provenance", v: "Embedded" },
  { icon: Coins, k: "Settlement", v: "Instant" },
];

export function Hero() {
  return (
    <section className="relative pt-[68px] overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.14), transparent 55%)" }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-24 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center"
        >
          <Crest size={60} />
          <p className="eyebrow mt-6">Spalter Entertainment Technologies</p>
          <h1 className="font-display mt-4 text-[clamp(2.3rem,6vw,4.6rem)] leading-[0.98] font-semibold max-w-4xl">
            The sovereign infrastructure for the{" "}
            <span className="gold-text">next era of media assets.</span>
          </h1>
          <p className="text-muted mt-6 max-w-2xl leading-relaxed text-[15px] md:text-base">
            Spalter Tech is building the ownership layer of the creative economy — where every
            work is cryptographically proven, every legacy catalog is reawakened as a living
            asset, and every payment settles the instant it is earned.
          </p>
        </motion.div>

        {/* Cinematic hero player */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="mx-auto mt-10 max-w-[1000px]"
        >
          <HeroVideo src="/videos/mt-landing-16x9.mp4" poster="/videos/mt-landing-poster.jpg" />
        </motion.div>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/data-room"
            className="group flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors"
          >
            <Lock size={13} /> Enter the Data Room
            <ArrowUpRight
              size={15}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </Link>
          <a
            href="#manifesto"
            className="px-7 py-3.5 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.2em] transition-colors"
          >
            Read the Manifesto
          </a>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-6 md:gap-16 max-w-2xl mx-auto">
          {STATS.map((s) => (
            <div key={s.k} className="flex flex-col items-center gap-2">
              <s.icon size={20} className="text-gold" />
              <div className="font-display text-xl md:text-2xl">{s.v}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted text-center">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
