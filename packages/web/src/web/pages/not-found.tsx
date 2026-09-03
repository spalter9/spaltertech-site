import { Link } from "wouter";
import { ArrowLeft, Compass } from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";

/**
 * Catch-all for any unmatched route. Without it, an unknown URL rendered a
 * blank shell — this gives a wrong link somewhere a graceful landing and a
 * way back into the site.
 */
const LINKS = [
  { to: "/", label: "Home" },
  { to: "/sovereign-protocol", label: "The Examiner" },
  { to: "/ssp-framework", label: "SSP Framework" },
  { to: "/glossary", label: "Rights Glossary" },
  { to: "/data-room", label: "Data Room" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)" }}
        />
        <div className="relative mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-28 text-center">
          <Crest size={52} />
          <p className="eyebrow mt-8">Off the ledger</p>
          <h1 className="font-display text-6xl md:text-7xl mt-3 leading-none">
            <span className="gold-text">404</span>
          </h1>
          <h2 className="font-display text-2xl md:text-3xl mt-4 leading-tight">
            This record has no chain of title.
          </h2>
          <p className="text-muted mt-4 max-w-md leading-relaxed">
            The page you asked for isn't part of the protocol. It may have moved, or the link
            may be mistaken. Everything the ecosystem publishes is reachable below.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="card-surface flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-bone/80 transition-colors hover:text-gold"
              >
                <Compass size={13} className="text-gold" /> {l.label}
              </Link>
            ))}
          </div>

          <Link
            to="/"
            className="mt-10 flex items-center gap-2 bg-gold px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-obsidian transition-colors hover:bg-gold-bright"
          >
            <ArrowLeft size={14} /> Return home
          </Link>
        </div>
      </section>
    </div>
  );
}
