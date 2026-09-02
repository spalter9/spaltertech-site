import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { Crest } from "../brand";

export function Closing() {
  return (
    <>
      {/* CTA */}
      <section className="relative py-28 border-t border-obsidian-line bg-obsidian-raised/40 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(197,160,89,0.12), transparent 55%)" }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6 text-center flex flex-col items-center">
          <Crest size={56} />
          <h2 className="font-display text-4xl md:text-5xl mt-8 max-w-3xl leading-[1.05]">
            The infrastructure is built. The technology is bulletproof.
          </h2>
          <p className="text-muted mt-5 max-w-xl leading-relaxed">
            Explore the privileged Data Room for the full technical and financial architecture of
            the Spalter ecosystem.
          </p>
          <Link
            to="/data-room"
            className="mt-10 flex items-center gap-2 px-8 py-4 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors"
          >
            Access the Data Room <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/10 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-4 text-center">
          <Crest size={28} />

          {/* Reference material lives here rather than the top nav, which is
              already full — and this is where people look for it anyway. */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              to="/glossary"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold"
            >
              Rights Glossary
            </Link>
            <Link
              to="/sovereign-protocol"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold"
            >
              Audit &amp; Seal
            </Link>
            <Link
              to="/legal/privacy"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold"
            >
              Privacy
            </Link>
            <Link
              to="/legal/terms"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-gold"
            >
              Terms
            </Link>
          </nav>

          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted leading-relaxed">
            Protected by MasterTrust Secure Protocol Infrastructure
            <span className="hidden sm:inline"> · </span>
            <br className="sm:hidden" />
            Spalter Entertainment Technologies
          </p>
          <a
            href="mailto:info@spaltentech.com"
            className="font-mono text-[11px] text-gold hover:text-gold-bright transition-colors"
          >
            info@spaltentech.com
          </a>
        </div>
      </footer>
    </>
  );
}
