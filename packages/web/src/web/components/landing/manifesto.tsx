import { motion } from "motion/react";

const TENETS = [
  {
    k: "Ownership is code",
    d: "Rights should not depend on the goodwill of intermediaries. We encode chain-of-title into the asset itself — immutable, portable, and self-enforcing.",
  },
  {
    k: "Every catalog is a living asset",
    d: "The world's recorded history is dormant capital. We reawaken it — forensically attributed, self-accounting, and earning for everyone who built it.",
  },
  {
    k: "Value settles at the speed of signal",
    d: "No quarterly statements, no black boxes. The moment a work is used, the ledger pays every rightful party — concurrently and on-chain.",
  },
];

export function Manifesto() {
  return (
    <section
      id="manifesto"
      className="relative py-28 border-t border-obsidian-line bg-obsidian-raised/40 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(197,160,89,0.08), transparent 50%)" }}
      />
      <div className="relative mx-auto max-w-[1200px] px-6 grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-16 lg:gap-20 items-start">
        {/* Vision statement */}
        <div>
          <p className="eyebrow">The Manifesto</p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="font-display text-4xl md:text-5xl lg:text-[3.4rem] mt-3 leading-[1.04]"
          >
            The old regime of creative ownership was built for paper.{" "}
            <span className="gold-text">We are building for the machine age.</span>
          </motion.h2>
          <div className="mt-8 space-y-5 text-muted leading-relaxed max-w-xl">
            <p>
              For a century, the value of a creative work has been trapped behind opaque ledgers,
              slow intermediaries, and disputes over who did what. In an era where a single model
              can ingest a lifetime of work in seconds, that architecture is not just outdated — it
              is a liability.
            </p>
            <p>
              Spalter Tech treats media as programmable capital. We fuse forensic audio science,
              cryptographic proof, and on-chain settlement into one sovereign standard: a system
              where ownership is provable, provenance is permanent, and every contribution is seen
              and paid. This is the infrastructure the next generation of creators, catalogs, and
              institutions will be built on.
            </p>
          </div>
        </div>

        {/* Tenets */}
        <div className="lg:pt-14 space-y-px bg-obsidian-line">
          {TENETS.map((t, i) => (
            <motion.div
              key={t.k}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="bg-obsidian p-7 border-l-2 border-gold/70"
            >
              <div className="font-mono text-gold text-xs">{`0${i + 1}`}</div>
              <h3 className="font-display text-2xl mt-2">{t.k}</h3>
              <p className="text-muted text-sm mt-2 leading-relaxed">{t.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
