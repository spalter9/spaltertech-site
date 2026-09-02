import { Link, useRoute } from "wouter";
import { motion } from "motion/react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Nav } from "../components/nav";
import { GLOSSARY, GLOSSARY_BY_SLUG, type GlossaryTerm } from "../lib/glossary-data";

/**
 * The rights glossary — index at /glossary, one page per term at
 * /glossary/:slug.
 *
 * Both live in one file because they are one thing: the index is a table of
 * contents for the term pages, and splitting them would mean keeping two
 * copies of the same styling in sync for no benefit.
 */

function TermLink({ slug }: { slug: string }) {
  const term = GLOSSARY_BY_SLUG[slug];
  if (!term) return null;
  return (
    <Link
      to={`/glossary/${term.slug}`}
      className="inline-flex items-center gap-1 rounded-lg border border-obsidian-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-gold/40 hover:text-gold"
    >
      {term.term}
    </Link>
  );
}

function GlossaryIndex() {
  return (
    <>
      <p className="eyebrow">Reference</p>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="mt-3 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05]"
      >
        The vocabulary that decides
        <span className="gold-text"> who actually gets paid.</span>
      </motion.h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        Most royalties that go missing do so because two systems disagreed about
        which code identified what. These are the terms the protocol itself
        reasons about — written plainly, with the real formats, rates and
        societies named.
      </p>

      <div className="mt-12 grid gap-px bg-obsidian-line sm:grid-cols-2">
        {GLOSSARY.map((term, i) => (
          <motion.div
            key={term.slug}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3) }}
            className="bg-obsidian"
          >
            <Link
              to={`/glossary/${term.slug}`}
              className="group flex h-full flex-col p-7 transition-colors hover:bg-obsidian-raised/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-bone">{term.term}</h2>
                <ArrowUpRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-gold"
                  aria-hidden
                />
              </div>
              {term.aka && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gold/70">
                  {term.aka.join(" · ")}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-muted">{term.short}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  );
}

function TermPage({ term }: { term: GlossaryTerm }) {
  return (
    <>
      <Link
        to="/glossary"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All terms
      </Link>

      <p className="eyebrow mt-8">Reference</p>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06]"
      >
        {term.term}
      </motion.h1>
      {term.aka && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-gold/80">
          {term.aka.join(" · ")}
        </p>
      )}

      <p className="mt-6 max-w-2xl border-l-2 border-gold/70 pl-5 text-lg leading-relaxed text-bone">
        {term.short}
      </p>

      <div className="mt-10 max-w-2xl space-y-5 leading-relaxed text-muted">
        {term.body.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      {term.tool && (
        <Link
          to={term.tool.href}
          className="mt-10 inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold/15"
        >
          {term.tool.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}

      {term.related && term.related.length > 0 && (
        <div className="mt-12 border-t border-obsidian-line pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Related
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {term.related.map((slug) => (
              <TermLink key={slug} slug={slug} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NotFound({ slug }: { slug: string }) {
  return (
    <>
      <p className="eyebrow">Reference</p>
      <h1 className="mt-3 font-display text-4xl">No entry for “{slug}”</h1>
      <p className="mt-4 text-muted">That term isn’t in the glossary yet.</p>
      <Link
        to="/glossary"
        className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-gold hover:text-gold-bright"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All terms
      </Link>
    </>
  );
}

export default function Glossary() {
  const [isTerm, params] = useRoute("/glossary/:slug");
  const slug = isTerm ? params?.slug : undefined;
  const term = slug ? GLOSSARY_BY_SLUG[slug] : undefined;

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 20% -10%, rgba(197,160,89,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[1100px] px-6 py-14 md:py-20">
          {slug ? term ? <TermPage term={term} /> : <NotFound slug={slug} /> : <GlossaryIndex />}
        </div>
      </div>
    </div>
  );
}
