import { Link } from "wouter";
import { motion } from "motion/react";
import { ShieldCheck, AudioWaveform, Link2, ArrowRight, ArrowUpRight, FileCheck2, Landmark, Clock, type LucideIcon } from "lucide-react";
import { usePillarCopy } from "../../queries/pillars";

type Pillar = {
  icon: LucideIcon;
  index: string;
  tag: string;
  name: string;
  maps: string;
  slug: string;
  body: string;
  points: string[];
};

/**
 * The three core ecosystem pillars — a higher-level framing mapped onto the
 * underlying tech pillars (MasterTrust, Surrealizer, SSP). Each links into
 * its detailed pillar page.
 */
const PILLARS: Pillar[] = [
  {
    icon: ShieldCheck,
    index: "01",
    tag: "Ownership, Absolute",
    name: "Cryptographic Sovereignty",
    maps: "Powered by the MasterTrust™",
    slug: "master-trust",
    body: "Every master, every split, every attestation is cryptographically sealed and anchored on-chain. Chain-of-title stops being a claim and becomes mathematical fact — multi-sig escrow, immutable provenance, and instant concurrent settlement retire the ledgers and lawyers of the old regime.",
    points: ["Multi-sig escrow vault", "Chain-of-title as proof", "Instant on-chain settlement"],
  },
  {
    icon: AudioWaveform,
    index: "02",
    tag: "Legacy IP, Reawakened",
    name: "Spalter Catalog Modernization",
    maps: "Powered by the Surrealizer Engine™",
    slug: "surrealizer",
    body: "The Surrealizer Engine performs forensics at the frequency layer — neural stem extraction, DNA-level credit detection, and inaudible steganographic provenance. Dormant catalogs are reawakened as living, self-accounting, revenue-generating assets that pay every contributor they were built from.",
    points: ["Neural stem extraction", "Forensic attribution", "Catalog restoration"],
  },
  {
    icon: Link2,
    index: "03",
    tag: "One Sovereign Standard",
    name: "Ecosystem Integration",
    maps: "Powered by the Sovereign Sign Protocol™",
    slug: "ssp",
    body: "The Sovereign Sign Protocol is the connective tissue of the ecosystem — a Polygon-anchored ledger with real-time split escrows and a smart-contract tripwire that bills AI crawlers on contact or locks them out. Legal, signal, and settlement resolve in a single, verifiable pass.",
    points: ["Polygon-anchored ledger", "Real-time split settlement", "Anti-scraping tripwire"],
  },
];

export function Pillars() {
  const { data: liveCopy } = usePillarCopy();
  const liveBySlug = new Map(liveCopy?.pillars.map((p) => [p.slug, p]) ?? []);

  return (
    <section id="pillars" className="relative py-28 border-t border-obsidian-line">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">The Core Ecosystem</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3 leading-[1.05]">
            Three pillars. <span className="gold-text">One sovereign standard.</span>
          </h2>
          <p className="text-muted mt-4 leading-relaxed">
            An interlocking architecture where creative ownership is proven, legacy value is
            reawakened, and every asset resolves through a single verifiable ledger.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-14">
          {PILLARS.map((p, i) => {
            const live = liveBySlug.get(p.slug);
            const tag = live?.tag ?? p.tag;
            const body = live?.body ?? p.body;
            return (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <Link
                  to={`/pillar/${p.slug}`}
                  className="group card-surface p-8 flex flex-col h-full hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 grid place-items-center border border-gold/40 text-gold transition-colors group-hover:bg-gold group-hover:text-obsidian">
                      <p.icon size={22} />
                    </div>
                    <span className="font-mono text-3xl text-obsidian-line group-hover:text-gold/30 transition-colors">
                      {p.index}
                    </span>
                  </div>
                  <p className="eyebrow mt-6">{tag}</p>
                  <h3 className="font-display text-2xl mt-2 leading-tight">{p.name}</h3>
                  <p className="text-muted text-sm leading-relaxed mt-4 flex-1">{body}</p>
                  <ul className="mt-6 space-y-2">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-sm text-bone/80">
                        <span className="w-1 h-1 bg-gold rounded-full" /> {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 border-t border-obsidian-line pt-4 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                      {p.maps}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-gold transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Compliance & Settlement infrastructure band */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-6"
        >
          <Link
            to="/infrastructure"
            className="group card-surface p-8 md:p-10 flex flex-col lg:flex-row lg:items-center gap-8 hover:-translate-y-0.5"
          >
            <div className="flex-1">
              <p className="eyebrow">The Infrastructure Layer</p>
              <h3 className="font-display text-2xl md:text-3xl mt-2 leading-tight">
                Compliance &amp; <span className="gold-text">frictionless fiat settlement.</span>
              </h3>
              <p className="text-muted text-sm leading-relaxed mt-3 max-w-2xl">
                Dual-layer C2PA + on-chain provenance, invisible account abstraction with a real
                USDC→USD off-ramp, and a 90-day escrow that closes the industry's unclaimed-royalty
                black box — the layer that makes the protocol enterprise- and regulator-ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-col lg:w-64 shrink-0">
              {[
                { icon: FileCheck2, label: "C2PA v2 + acoustic watermark" },
                { icon: Landmark, label: "USDC → USD · ACH / wire / RTP" },
                { icon: Clock, label: "90-day time-locked escrow" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 text-sm text-bone/80">
                  <f.icon size={15} className="text-gold shrink-0" /> {f.label}
                </div>
              ))}
              <span className="mt-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                Explore the layer <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
