import { Link } from "wouter";
import { motion } from "motion/react";
import { Lock, ShieldCheck, Fingerprint, Coins } from "lucide-react";
import { HeroVideo } from "../hero-video";

const STATS = [
  { icon: ShieldCheck, k: "Chain of title", v: "Verified" },
  { icon: Fingerprint, k: "Provenance", v: "Embedded" },
  { icon: Coins, k: "Settlement", v: "Instant" },
];

export function Hero() {
  return (
    <section className="relative pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.14), transparent 55%)" }}
      />

      {/* Mockup layout: max-w-6xl, pt-12 pb-20, space-y-12 rhythm */}
      <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-20 space-y-12">
        {/* Headline & introduction */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          {/* Pill-style eyebrow */}
          <span className="inline-block font-mono text-gold text-[0.7rem] font-semibold tracking-[0.22em] uppercase bg-gold/10 border border-gold/25 px-4 py-1.5 rounded-full">
            Sovereign Infrastructure
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-bone">
            The sovereign infrastructure for the{" "}
            <span className="gold-text">next era of media assets.</span>
          </h1>
          <p className="text-muted text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Spalter Tech is building the ownership layer of the creative economy — where every
            work is cryptographically proven, every legacy catalog is reawakened as a living
            asset, and every payment settles the instant it is earned.
          </p>
        </motion.div>

        {/* Prime cinematic hero player — rounded frame per mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
        >
          <HeroVideo src="/videos/mt-orphan-16x9-v1.mp4" poster="/videos/mt-orphan-poster.jpg" rounded />
        </motion.div>

        {/* Quick action CTAs — full-width on mobile, gradient primary */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/data-room"
            className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-gold to-gold-bright text-obsidian font-mono text-xs font-bold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
            style={{ boxShadow: "0 0 44px -14px rgba(197,160,89,0.6)" }}
          >
            <Lock size={13} /> Enter The Data Room
          </Link>
          <a
            href="#manifesto"
            className="w-full sm:w-auto text-center px-8 py-4 rounded-xl bg-obsidian-raised border border-gold/30 text-gold font-mono text-xs font-bold uppercase tracking-[0.18em] hover:bg-gold/10 transition-colors"
          >
            Read The Manifesto
          </a>
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-3 gap-6 md:gap-16 max-w-2xl mx-auto">
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
