import { motion } from "motion/react";
import {
  BadgeCheck,
  Bot,
  Clapperboard,
  Gamepad2,
  Landmark,
  Music2,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface MeshNode {
  label: string;
  icon: LucideIcon;
}

const NODES: MeshNode[] = [
  { label: "Games", icon: Gamepad2 },
  { label: "Film", icon: Clapperboard },
  { label: "Music", icon: Music2 },
  { label: "AI / DIL", icon: Bot },
  { label: "IRS Tax", icon: Landmark },
  { label: "Credit", icon: BadgeCheck },
];

const CX = 200;
const CY = 200;
const R = 148;

function nodePos(i: number) {
  const a = ((-90 + i * 60) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}

const CHIPS = [
  { icon: Zap, text: "12ms settlement" },
  { icon: Landmark, text: "25% tax auto-remitted" },
  { icon: ShieldCheck, text: "Cryptographic receipts" },
];

/** Settlement mesh: six industry rails feeding one protocol core, packets flowing inward. */
function SettlementMesh() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8fe9ff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#6d8bff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6d8bff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="spoke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d8bff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#8fe9ff" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fe9ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8f5bff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <circle cx={CX} cy={CY} r="190" fill="url(#hub-glow)" />

        {/* slow-rotating dashed rings */}
        <g className="mesh-spin" style={{ animationDuration: "60s" }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="url(#ring-grad)" strokeWidth="1" strokeDasharray="2 7" />
        </g>
        <g className="mesh-spin" style={{ animationDuration: "40s", animationDirection: "reverse" }}>
          <circle cx={CX} cy={CY} r="98" fill="none" stroke="#6d8bff" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="40 14 4 14" />
        </g>
        <circle cx={CX} cy={CY} r="62" fill="none" stroke="#8fe9ff" strokeOpacity="0.25" />

        {/* spokes + travelling packets */}
        {NODES.map((n, i) => {
          const { x, y } = nodePos(i);
          const path = `M ${x} ${y} L ${CX} ${CY}`;
          return (
            <g key={n.label}>
              <path d={path} stroke="url(#spoke)" strokeWidth="1.2" fill="none" />
              <circle r="3.2" fill="#8fe9ff">
                <animateMotion dur="2.8s" begin={`${i * 0.45}s`} repeatCount="indefinite" path={path} />
                <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" begin={`${i * 0.45}s`} repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="#b18cff">
                <animateMotion dur="2.8s" begin={`${i * 0.45 + 1.4}s`} repeatCount="indefinite" path={path} />
                <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" begin={`${i * 0.45 + 1.4}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* pulse rings from the core */}
        {[0, 1.3].map((d) => (
          <circle key={d} cx={CX} cy={CY} r="40" fill="none" stroke="#8fe9ff" strokeWidth="1.2">
            <animate attributeName="r" values="40;120" dur="2.6s" begin={`${d}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0" dur="2.6s" begin={`${d}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Core */}
      <div
        className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold-bright/50 bg-gradient-to-br from-gold/50 via-obsidian-raised to-obsidian"
        style={{ boxShadow: "0 0 60px -6px rgba(143,233,255,0.55), inset 0 0 24px rgba(143,233,255,0.2)" }}
      >
        <span className="font-mono text-lg font-bold tracking-[0.2em] text-gold-bright">SSP</span>
        <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-bone/60">Core</span>
      </div>

      {/* Industry nodes */}
      {NODES.map((n, i) => {
        const { x, y } = nodePos(i);
        const Icon = n.icon;
        return (
          <motion.div
            key={n.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${(x / 400) * 100}%`, top: `${(y / 400) * 100}%` }}
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/45 bg-obsidian-raised/90 text-gold-bright backdrop-blur"
              style={{ boxShadow: "0 0 26px -6px rgba(109,139,255,0.7)" }}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="rounded-full bg-obsidian/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-bone/80">
              {n.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function EngineHero() {
  return (
    <section
      aria-label="Engine overview"
      className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-obsidian-raised/90 via-obsidian to-obsidian p-6 sm:p-10"
      style={{ boxShadow: "0 30px 90px -40px rgba(58,79,214,0.7), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(109,139,255,0.35), transparent 70%)" }}
        aria-hidden
      />
      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-bright">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verified opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-verified" />
            </span>
            Live protocol mesh
          </span>
          <h1 className="font-sora text-4xl font-semibold leading-[1.05] tracking-tight text-bone sm:text-5xl">
            Every industry.
            <br />
            <span className="gold-text">One settlement layer.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Games, film, music, AI licensing and tax settle in parallel on the Sovereign Sign
            Protocol — verified at the source, split instantly, remitted in milliseconds.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {CHIPS.map(({ icon: Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-raised/70 px-3.5 py-2 text-sm text-bone/90"
              >
                <Icon className="h-4 w-4 text-gold-bright" aria-hidden />
                {text}
              </span>
            ))}
          </div>
        </div>
        <SettlementMesh />
      </div>
    </section>
  );
}
