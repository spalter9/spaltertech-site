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
    <section id="manifesto" className="relative overflow-hidden py-28 md:py-36">
      <div className="aurora-blob -right-40 top-10 h-[30rem] w-[30rem] bg-[#3a4fd6]/40" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="eyebrow">The Manifesto</p>
        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="mt-5 max-w-5xl font-sora text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
        >
          <span className="text-bone/45">The old regime of creative ownership was built for paper.</span>{" "}
          <span className="gold-text">We are building for the machine age.</span>
        </motion.h2>

        <div className="mt-12 grid gap-8 text-muted leading-relaxed md:grid-cols-2 md:gap-14">
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

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {TENETS.map((t, i) => (
            <motion.div
              key={t.k}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="card-surface group relative overflow-hidden rounded-3xl p-8 hover:-translate-y-1.5"
            >
              <span className="text-outline pointer-events-none absolute -right-2 -top-6 font-sora text-[9rem] font-bold leading-none transition-all duration-500 group-hover:text-gold/20">
                {i + 1}
              </span>
              <div className="relative">
                <div className="mb-10 h-1 w-12 rounded-full bg-gradient-to-r from-gold-bright to-gold" />
                <h3 className="font-sora text-xl font-semibold leading-snug">{t.k}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
