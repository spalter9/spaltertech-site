import { Link } from "wouter";
import { motion } from "motion/react";
import {
  ShieldCheck, ArrowUpRight, ArrowRight, Lock, Fingerprint, Anchor, FileCheck2,
  Wallet, Landmark, KeyRound, Clock, Scale, Boxes, ScrollText, type LucideIcon,
} from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";
import { ModuleHead, Reveal } from "../components/pillar-modules";
import {
  PostureStats, ProvenanceModule, FiatOfframpModule, UnclaimedEscrowModule,
} from "../components/compliance-modules";

type Mechanic = { icon: LucideIcon; title: string; body: string };
type Group = {
  n: string;
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
};

const GROUPS: Group[] = [
  {
    n: "01",
    icon: ShieldCheck,
    tag: "Provenance",
    name: "Dual-Layer Provenance & Watermarking",
    tagline: "Signed C2PA credentials, an inaudible watermark, and an on-chain anchor.",
    intro:
      "Every master carries two independent, tamper-evident proofs. An off-chain, cryptographically-signed C2PA v2 manifest is embedded in the file header — recording human-vs-AI contribution ratios and session hashes — while an imperceptible multi-bit acoustic watermark is woven into the signal itself. The manifest hash is then anchored to the SSP smart contract on Polygon, producing an immutable chain of custody that routes royalties automatically.",
    mechanics: [
      { icon: FileCheck2, title: "Signed C2PA v2 Manifest", body: "A cryptographically-signed Content Credentials manifest is embedded in the WAV/MP3 header, declaring human-vs-AI contribution ratios and signing-session hashes — EU AI Act Article 50 ready." },
      { icon: Fingerprint, title: "Imperceptible Acoustic Watermark", body: "A multi-bit watermark is phase-coded into the audio and survives lossy re-encoding — MP3, AAC — and streaming compression, traveling with the file everywhere it goes." },
      { icon: Anchor, title: "Polygon On-Chain Anchor", body: "The manifest hash is anchored to the SSP smart contract on Polygon, creating an immutable chain of custody and the routing key for automatic royalty settlement." },
      { icon: ScrollText, title: "C2PA & EU AI Act Readiness", body: "Provenance is machine-verifiable end to end, giving platforms, regulators, and sync buyers audit-grade disclosure of exactly how each work was made." },
    ],
    dataTag: "Live · Provenance",
    dataTitle: "C2PA Manifest Registry",
    dataDesc: "Signed manifests with contribution ratios, acoustic-watermark payloads, and their Polygon anchor transactions. Sign and anchor a new master to see the full pipeline run.",
    DataView: () => <ProvenanceModule />,
  },
  {
    n: "02",
    icon: Wallet,
    tag: "Settlement",
    name: "Invisible Account Abstraction & Fiat Off-Ramp",
    tagline: "Zero-crypto-friction payouts, straight to a USD bank account.",
    intro:
      "Rights-holders never touch a wallet. Invisible Web3 accounts are created via ERC-4337 account abstraction on ordinary email, OAuth, or SSO login — no seed phrases, no gas. An automated bridge then off-ramps Polygon USDC micro-payouts into fiat, settling to ACH, wire, or RTP in real USD. Crypto rails power the settlement; the creator only ever sees dollars in their bank.",
    mechanics: [
      { icon: KeyRound, title: "Invisible Wallet Creation", body: "Account Abstraction (Privy / Magic-style) provisions a smart account the instant a user signs in with email, OAuth, or SSO — no seed phrases, no keys, no gas to manage." },
      { icon: Landmark, title: "Stablecoin → Fiat Bridge", body: "An automated Circle / Stripe Connect bridge off-ramps Polygon USDC micro-payouts into fiat, landing real USD in the recipient's bank account." },
      { icon: Wallet, title: "ACH / Wire / RTP Rails", body: "Payouts settle over the right rail for the amount — ACH for routine splits, wire for large publisher settlements, RTP for instant delivery." },
      { icon: Scale, title: "Zero-Crypto-Friction UX", body: "Every crypto mechanic is abstracted away. Rights-holders experience a normal financial dashboard while the protocol handles chain, gas, and conversion." },
    ],
    dataTag: "Live · Off-Ramp",
    dataTitle: "Fiat Settlement Feed",
    dataDesc: "Invisible ERC-4337 accounts off-ramping Polygon USDC into USD bank accounts over ACH, wire, and RTP. Trigger an off-ramp to watch a payout settle.",
    DataView: () => <FiatOfframpModule />,
  },
  {
    n: "03",
    icon: Clock,
    tag: "Escrow",
    name: "Unclaimed Split Escrow Logic",
    tagline: "Disputed and orphaned splits, held programmatically — not frozen.",
    intro:
      "The industry's $400M+ 'black box' of unmatched royalties exists because nobody can safely hold disputed money. The Sovereign standard fixes it with a 90-day, time-locked smart-contract escrow. When a split is disputed or its owner is unknown, the funds are held programmatically — fully accounted, auditable, and earmarked — until the rightful owner is verified and the escrow releases on-chain. Nothing is frozen; everything is provable.",
    mechanics: [
      { icon: Clock, title: "90-Day Time-Locked Escrow", body: "Disputed or orphaned splits enter a smart-contract escrow with a 90-day programmatic lock — a defined window for the true owner to be matched and verified." },
      { icon: Boxes, title: "Held, Never Frozen", body: "Funds remain fully accounted and earmarked to the work — not stranded in a black box — so value is never lost and always traceable to its source." },
      { icon: ShieldCheck, title: "On-Chain Resolution", body: "The moment a claimant is verified, the escrow releases the split on-chain and writes the settlement to the SSP ledger in a single auditable pass." },
      { icon: ScrollText, title: "Audit-Compliant Disclosure", body: "Catalog owners and sync buyers — Netflix, gaming studios — get a clean, provable record of every held, resolved, and released split." },
    ],
    dataTag: "Live · Escrow",
    dataTitle: "Unclaimed Split Ledger",
    dataDesc: "Disputed and orphaned splits under a 90-day programmatic hold, with live time-locks. Release a claimable split to settle it on-chain to the verified owner.",
    DataView: () => <UnclaimedEscrowModule />,
  },
];

export default function Infrastructure() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />

      {/* Header */}
      <div className="relative border-b border-obsidian-line overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)" }} />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-8">
            <Link to="/" className="hover:text-bone transition-colors">Home</Link>
            <span className="text-obsidian-line">/</span>
            <span className="text-gold">Compliance &amp; Settlement</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 grid place-items-center border border-gold/40 text-gold"><ShieldCheck size={26} /></div>
              <p className="eyebrow">The Infrastructure Layer</p>
            </div>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.02] mt-6 max-w-3xl">Compliance &amp; Frictionless Fiat Settlement</h1>
            <p className="gold-text font-display text-2xl md:text-3xl mt-3">Provenance you can prove. Payouts you can bank.</p>
            <p className="text-muted text-lg leading-relaxed mt-6 max-w-2xl">
              The cross-cutting layer that makes the three pillars enterprise- and regulator-ready:
              dual-layer C2PA + on-chain provenance, invisible account abstraction with a real fiat
              off-ramp, and a 90-day escrow that finally closes the industry's unclaimed-royalty black box.
            </p>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
              {[
                { k: "Provenance", v: "C2PA v2" },
                { k: "Compliance", v: "EU AI Act · Art. 50" },
                { k: "Settlement", v: "USDC → USD" },
                { k: "Escrow", v: "90-Day Lock" },
              ].map((m) => (
                <div key={m.k}>
                  <div className="font-display text-2xl md:text-3xl">{m.v}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">{m.k}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live posture */}
      <section className="border-b border-obsidian-line bg-obsidian-raised/30">
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <ModuleHead tag="Live · Posture" title="Settlement posture" desc="Real-time counts across provenance, fiat settlement, and time-locked escrow — wired to the live backend." />
          <Reveal><PostureStats /></Reveal>
        </div>
      </section>

      {/* Three capability groups */}
      {GROUPS.map((g, gi) => (
        <section key={g.n} className={gi % 2 ? "border-b border-obsidian-line bg-obsidian-raised/20" : "border-b border-obsidian-line"}>
          <div className="mx-auto max-w-[1100px] px-6 py-20">
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl text-obsidian-line">{g.n}</span>
              <div className="w-11 h-11 grid place-items-center border border-gold/40 text-gold"><g.icon size={20} /></div>
              <p className="eyebrow">{g.tag}</p>
            </div>
            <h2 className="font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.05] mt-5 max-w-3xl">{g.name}</h2>
            <p className="gold-text font-display text-xl md:text-2xl mt-2">{g.tagline}</p>
            <p className="text-muted leading-relaxed mt-5 max-w-2xl">{g.intro}</p>

            <div className="grid md:grid-cols-2 gap-5 mt-12">
              {g.mechanics.map((m, i) => (
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

            <div className="mt-14">
              <ModuleHead tag={g.dataTag} title={g.dataTitle} desc={g.dataDesc} />
              <Reveal>{g.DataView()}</Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <div className="card-surface p-10 text-center flex flex-col items-center">
            <Crest size={48} />
            <h2 className="font-display text-3xl md:text-4xl mt-6 max-w-2xl">Provenance, settlement, and escrow — verified in one environment.</h2>
            <p className="text-muted mt-3 max-w-xl">The Data Room brings the full protocol together: the three pillars, the compliance layer, and every live verification tool in one privileged environment.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/data-room" className="group flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors">
                <Lock size={13} /> Enter the Data Room <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link to="/pillar/ssp" className="group flex items-center gap-2 px-7 py-3.5 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.2em] transition-colors">
                Explore the pillars <ArrowRight size={14} className="text-gold group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
