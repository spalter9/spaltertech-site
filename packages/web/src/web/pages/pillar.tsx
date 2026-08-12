import { Link, useParams, Redirect } from "wouter";
import { motion } from "motion/react";
import {
  Scale, Link2, AudioWaveform, ArrowUpRight, ArrowLeft, ArrowRight,
  Lock, ShieldCheck, GitBranch, Coins, Anchor, Cpu, Bot, Fingerprint,
  Waves, Radio, Boxes, type LucideIcon,
} from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";
import {
  VaultModule, LedgerModule, LedgerStats, SurrealizerModule, ModuleHead, Reveal,
} from "../components/pillar-modules";

type Mechanic = { icon: LucideIcon; title: string; body: string };
type PillarDef = {
  slug: string;
  icon: LucideIcon;
  tag: string;
  name: string;
  tagline: string;
  intro: string;
  mechanics: Mechanic[];
  dataTag: string;
  dataTitle: string;
  dataDesc: string;
  DataView: () => React.ReactNode;
  metrics: { k: string; v: string }[];
};

const PILLARS: PillarDef[] = [
  {
    slug: "master-trust",
    icon: Scale,
    tag: "Pillar I — Legal",
    name: "MasterTrust",
    tagline: "Asset protection. Isolation. Hyper-targeted segmentation.",
    intro:
      "The legal bedrock of the Sovereign infrastructure. Every catalog is placed in a cryptographic multi-signature escrow vault where chain-of-title is verified, ownership is isolated from counterparties, and value is segmented down to the individual split — then settled concurrently to Creators, Labels, and Publishers.",
    mechanics: [
      { icon: ShieldCheck, title: "Multi-Sig Escrow Vault", body: "Assets are held in a cryptographic vault requiring multiple independent signatures to move — no single party can release, redirect, or encumber a title." },
      { icon: GitBranch, title: "Chain-of-Title Verification", body: "Provenance is validated end-to-end before an asset is admitted, producing an immutable, audit-ready record of true ownership." },
      { icon: Boxes, title: "Asset Isolation & Segmentation", body: "Each work is ring-fenced and hyper-segmented by right, territory, and contributor, so exposure never bleeds across the catalog." },
      { icon: Coins, title: "Concurrent Split Settlement", body: "On settlement, Creator / Label / Publisher shares pay out in a single atomic pass — instantly, with no reconciliation lag." },
    ],
    dataTag: "Live · Escrow",
    dataTitle: "MasterTrust Vault",
    dataDesc: "Verified ownership titles under multi-sig escrow with concurrent split settlement. Trigger a live settlement to watch splits pay out.",
    DataView: () => <VaultModule />,
    metrics: [
      { k: "Custody", v: "Multi-Sig" },
      { k: "Chain of title", v: "Verified" },
      { k: "Settlement", v: "Atomic" },
    ],
  },
  {
    slug: "ssp",
    icon: Link2,
    tag: "Pillar II — Accounting",
    name: "Sovereign Sign Protocol",
    tagline: "The cryptographic ledger. Instant, friction-free payouts.",
    intro:
      "The accounting engine. Every attestation is signed and anchored on Polygon, every ownership event is recorded on an immutable ledger, and every revenue split settles the instant it is earned. A smart-contract anti-scraping tripwire bills AI crawlers on contact — or locks them out.",
    mechanics: [
      { icon: Anchor, title: "Polygon-Anchored Ledger", body: "Every attestation is cryptographically signed and written to Polygon — an immutable, publicly verifiable record of ownership and payment." },
      { icon: Cpu, title: "ERC-4337 Account Abstraction", body: "Gasless, programmable settlement accounts let rights-holders receive payouts without touching wallets, keys, or transaction fees." },
      { icon: Coins, title: "Real-Time Split Escrow", body: "Revenue is routed through on-chain split escrows and released the moment it lands — no monthly statements, no float, no friction." },
      { icon: Bot, title: "Anti-Scraping Tripwire", body: "A smart-contract tollbooth detects AI crawlers and either bills them per access or locks them out — turning scraping into revenue." },
    ],
    dataTag: "Live · On-Chain",
    dataTitle: "Sovereign Sign Ledger",
    dataDesc: "The on-chain accounting feed anchored on Polygon, alongside the anti-scraping tripwire. Simulate a crawler hit to see it billed or blocked in real time.",
    DataView: () => (
      <div className="space-y-6">
        <LedgerStats />
        <LedgerModule />
      </div>
    ),
    metrics: [
      { k: "Anchor", v: "Polygon" },
      { k: "Payouts", v: "Instant" },
      { k: "Crawlers", v: "Billed" },
    ],
  },
  {
    slug: "surrealizer",
    icon: AudioWaveform,
    tag: "Pillar III — Signal",
    name: "The Surrealizer Engine",
    tagline: "The utilization engine. Static IP becomes living revenue.",
    intro:
      "The activation layer. The Surrealizer works at the frequency layer — neural stem extraction resolves every contributor with DNA-level accuracy, inaudible steganographic provenance is embedded into every master, and dormant catalogs are restored and re-monetized as living, revenue-producing assets.",
    mechanics: [
      { icon: Waves, title: "Neural Stem Extraction", body: "Deep models separate a master into its constituent stems, exposing every instrument, performance, and layer for analysis." },
      { icon: Fingerprint, title: "Forensic DNA-Level Attribution", body: "Every contributor is detected and credited at the frequency layer — the bass line, the solo, the producer — so no one is hidden." },
      { icon: Radio, title: "Steganographic Provenance", body: "An inaudible, tamper-evident ownership signature is phase-coded into the audio itself, traveling with the file everywhere it goes." },
      { icon: Coins, title: "Catalog Restoration → Revenue", body: "Dormant and orphaned masters are restored, verified, and reactivated as living revenue streams across every digital surface." },
    ],
    dataTag: "Live · Signal",
    dataTitle: "The Surrealizer Engine",
    dataDesc: "Neural stem extraction with forensic, DNA-level credit detection and steganographic phase-coded provenance. Submit a track to run a forensic analysis.",
    DataView: () => <SurrealizerModule />,
    metrics: [
      { k: "Stems", v: "Neural" },
      { k: "Attribution", v: "Forensic" },
      { k: "Catalog", v: "Restored" },
    ],
  },
];

export default function Pillar() {
  const params = useParams();
  const slug = params.slug;
  const idx = PILLARS.findIndex((p) => p.slug === slug);
  if (idx === -1) return <Redirect to="/" />;
  const p = PILLARS[idx]!;
  const next = PILLARS[(idx + 1) % PILLARS.length]!;
  const prev = PILLARS[(idx - 1 + PILLARS.length) % PILLARS.length]!;
  const Icon = p.icon;

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />

      {/* Header */}
      <div className="relative border-b border-obsidian-line overflow-hidden pt-[68px]">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)" }} />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-8">
            <Link to="/" className="hover:text-bone transition-colors">Home</Link>
            <span className="text-obsidian-line">/</span>
            <span className="text-gold">Three Pillars</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 grid place-items-center border border-gold/40 text-gold"><Icon size={26} /></div>
              <p className="eyebrow">{p.tag}</p>
            </div>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] mt-6 max-w-3xl">
              {p.name}
              <sup className="ml-1 align-super font-mono text-[0.32em] text-gold">TM</sup>
            </h1>
            <p className="gold-text font-display text-2xl md:text-3xl mt-3">{p.tagline}</p>
            <p className="text-muted text-lg leading-relaxed mt-6 max-w-2xl">{p.intro}</p>
            <div className="mt-10 flex gap-8">
              {p.metrics.map((m) => (
                <div key={m.k}>
                  <div className="font-display text-2xl md:text-3xl">{m.v}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">{m.k}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mechanics */}
      <section className="mx-auto max-w-[1100px] px-6 py-20">
        <ModuleHead tag="Infrastructure" title="How it works" desc={`The mechanics that make ${p.name} operate as verifiable infrastructure — not a promise.`} />
        <div className="grid md:grid-cols-2 gap-5">
          {p.mechanics.map((m, i) => (
            <Reveal key={m.title} delay={(i % 2) * 0.08}>
              <div className="card-surface p-7 h-full flex gap-5">
                <div className="w-11 h-11 shrink-0 grid place-items-center border border-gold/40 text-gold"><m.icon size={20} /></div>
                <div>
                  <h3 className="font-display text-xl">{m.title}</h3>
                  <p className="text-muted text-sm leading-relaxed mt-2">{m.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Live data */}
      <section className="border-t border-obsidian-line bg-obsidian-raised/30">
        <div className="mx-auto max-w-[1100px] px-6 py-20">
          <ModuleHead tag={p.dataTag} title={p.dataTitle} desc={p.dataDesc} />
          <Reveal>{p.DataView()}</Reveal>
        </div>
      </section>

      {/* Cross-nav + CTA */}
      <section className="border-t border-obsidian-line">
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <div className="flex flex-col sm:flex-row items-stretch gap-4">
            <Link to={`/pillar/${prev.slug}`} className="group card-surface p-6 flex-1 flex items-center gap-3">
              <ArrowLeft size={18} className="text-gold shrink-0" />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Previous pillar</div>
                <div className="font-display text-lg mt-0.5">{prev.name}</div>
              </div>
            </Link>
            <Link to={`/pillar/${next.slug}`} className="group card-surface p-6 flex-1 flex items-center justify-end gap-3 text-right">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Next pillar</div>
                <div className="font-display text-lg mt-0.5">{next.name}</div>
              </div>
              <ArrowRight size={18} className="text-gold shrink-0" />
            </Link>
          </div>

          <div className="mt-8 card-surface p-10 text-center flex flex-col items-center">
            <Crest size={48} />
            <h2 className="font-display text-3xl md:text-4xl mt-6 max-w-2xl">See all three pillars operating live.</h2>
            <p className="text-muted mt-3 max-w-xl">The Data Room brings the full protocol together — forensic data, climbing financial charts, and the verification tools, in one privileged environment.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/data-room" className="group flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors">
                <Lock size={13} /> Enter the Data Room <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link to="/" className="px-7 py-3.5 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.2em] transition-colors">
                Back to overview
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
