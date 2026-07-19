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
      <footer className="border-t border-obsidian-line py-12">
        <div className="mx-auto max-w-[1200px] px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Crest size={30} />
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
              Spalter Entertainment Technologies
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Sovereign Sign Protocol · Anchored on Polygon
          </div>
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
