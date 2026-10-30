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

/** Decorative SVG art per pillar — rings, waveform, linked nodes. */
function PillarArt({ i }: { i: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`pointer-events-none absolute opacity-50 transition-opacity duration-500 group-hover:opacity-90 ${i === 0 ? "-bottom-10 -right-6 h-80 w-80" : "-right-8 -top-8 h-56 w-56"}`}
      aria-hidden
    >
      {i === 0 && (
        <g fill="none" stroke="#8fe9ff" strokeWidth="1">
          {[30, 52, 74, 96].map((r, k) => (
            <circle key={r} cx="130" cy="70" r={r} strokeOpacity={0.55 - k * 0.1} strokeDasharray={k % 2 ? "3 6" : undefined} />
          ))}
          <path d="M130 40 l22 10 v22 c0 14 -10 24 -22 30 c-12 -6 -22 -16 -22 -30 v-22 z" stroke="#6d8bff" strokeOpacity="0.9" />
        </g>
      )}
      {i === 1 && (
        <g fill="#8fe9ff">
          {Array.from({ length: 16 }).map((_, k) => {
            const h = 14 + Math.abs(Math.sin(k * 0.9)) * 52;
            return <rect key={k} x={20 + k * 10} y={70 - h / 2} width="4" height={h} rx="2" opacity={0.25 + (k % 5) * 0.14} />;
          })}
        </g>
      )}
      {i === 2 && (
        <g stroke="#8fe9ff" strokeOpacity="0.5" fill="none">
          <path d="M40 120 L100 60 L160 100 L130 30 M100 60 L110 140 L40 120" />
          {[[40, 120], [100, 60], [160, 100], [130, 30], [110, 140]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="#6d8bff" stroke="#8fe9ff" strokeOpacity="0.9" />
          ))}
        </g>
      )}
    </svg>
  );
}

export function Pillars() {
  const { data: liveCopy } = usePillarCopy();
  const liveBySlug = new Map(liveCopy?.pillars.map((p) => [p.slug, p]) ?? []);

  return (
    <section id="pillars" className="relative overflow-hidden py-28 md:py-36">
      <div className="aurora-blob -left-40 top-40 h-[30rem] w-[30rem] bg-[#8f5bff]/25" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">The Core Ecosystem</p>
          <h2 className="font-sora text-3xl font-semibold tracking-tight sm:text-5xl mt-4 leading-[1.05]">
            Three pillars. <span className="gold-text">One sovereign standard.</span>
          </h2>
          <p className="text-muted mt-4 leading-relaxed">
            An interlocking architecture where creative ownership is proven, legacy value is
            reawakened, and every asset resolves through a single verifiable ledger.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          {PILLARS.map((p, i) => {
            const live = liveBySlug.get(p.slug);
            const tag = live?.tag ?? p.tag;
            const body = live?.body ?? p.body;
            return (
              <motion.div
                key={p.slug}
                className={i === 0 ? "md:col-span-4" : "md:col-span-2"}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
              >
                <Link
                  to={`/pillar/${p.slug}`}
                  className="group card-surface relative flex h-full flex-col overflow-hidden rounded-3xl p-8 hover:-translate-y-1"
                >
                  <PillarArt i={i} />
                  <div className="relative flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-gold-bright transition-colors group-hover:bg-gold group-hover:text-obsidian">
                      <p.icon size={22} />
                    </div>
                    <span className="font-mono text-3xl text-obsidian-line group-hover:text-gold/30 transition-colors">
                      {p.index}
                    </span>
                  </div>
                  <p className="eyebrow relative mt-6">{tag}</p>
                  <h3 className="font-sora text-2xl font-semibold mt-2 leading-tight">{p.name}</h3>
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
        {/* Compliance & Settlement infrastructure band */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="md:col-span-4"
        >
          <Link
            to="/infrastructure"
            className="group card-surface flex h-full flex-col gap-8 rounded-3xl p-8 hover:-translate-y-0.5 md:p-10 lg:flex-row lg:items-center"
          >
            <div className="flex-1">
              <p className="eyebrow">The Infrastructure Layer</p>
              <h3 className="font-sora text-2xl font-semibold md:text-3xl mt-2 leading-tight">
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
      </div>
    </section>
  );
}
