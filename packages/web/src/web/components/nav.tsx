import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { Lock, LogOut, Menu, X } from "lucide-react";
import { Monogram } from "./brand";
import { useMe } from "../queries/pillars";
import { authClient } from "../lib/auth";
import { PillarModal, type PillarSlug } from "./pillar-modal";

const LINKS: { slug: PillarSlug; href: string; label: string; sub: string }[] = [
  { slug: "master-trust", href: "/pillar/master-trust", label: "Cryptographic Sovereignty", sub: "MasterTrust™" },
  { slug: "surrealizer", href: "/pillar/surrealizer", label: "Catalog Modernization", sub: "Surrealizer Engine™" },
  { slug: "ssp", href: "/pillar/ssp", label: "Ecosystem Integration", sub: "Sovereign Sign Protocol™" },
];

export function Nav() {
  const [loc, navigate] = useLocation();
  const me = useMe();
  const authed = !!me.data;
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<PillarSlug | null>(null);

  // Close the mobile menu on route change and lock body scroll while open.
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-obsidian/80 border-b border-gold/10">
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        <Link to="/" className="cursor-pointer">
          <Monogram compact />
        </Link>

        <nav className="hidden lg:flex items-center gap-5 mr-8">
          {LINKS.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => setModal(l.slug)}
              aria-label={`${l.label} — ${l.sub}`}
              title={l.sub}
              className={`group relative font-mono whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-colors ${
                loc === l.href ? "text-gold" : "text-muted hover:text-bone"
              }`}
            >
              {l.label}
              {/* Tech name surfaced on hover — deep architecture stays discoverable */}
              <span className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-sm border border-obsidian-line bg-obsidian-raised px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-gold opacity-0 translate-y-1 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.9)] transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                {l.sub}
              </span>
            </button>
          ))}
          <Link
            to="/infrastructure"
            aria-label="Compliance & Settlement Infrastructure"
            title="Compliance & Settlement"
            className={`font-mono whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-colors ${
              loc === "/infrastructure" ? "text-gold" : "text-muted hover:text-bone"
            }`}
          >
            Compliance
          </Link>
          <Link
            to="/enterprise"
            aria-label="Enterprise infrastructure for master trusts, labels, and platforms"
            title="Enterprise"
            className={`font-mono whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-colors ${
              loc === "/enterprise" ? "text-gold" : "text-muted hover:text-bone"
            }`}
          >
            Enterprise
          </Link>
          <Link
            to="/ssp-framework"
            aria-label="Sovereign Sign Protocol"
            title="Sovereign Sign Protocol™"
            className={`font-mono whitespace-nowrap text-[10px] uppercase tracking-[0.14em] transition-colors ${
              loc === "/ssp-framework" ? "text-gold" : "text-muted hover:text-bone"
            }`}
          >
            SSP Protocol
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <Link
                to="/data-room"
                className={`hidden sm:flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-opacity ${
                  loc.startsWith("/data-room")
                    ? "bg-gradient-to-r from-gold-bright to-gold text-obsidian"
                    : "bg-gradient-to-r from-gold to-gold-bright text-obsidian hover:opacity-90"
                }`}
                style={{ boxShadow: "0 0 30px -10px rgba(197,160,89,0.5)" }}
              >
                <Lock size={13} /> Data Room
              </Link>
              <button
                onClick={() => authClient.signOut().then(() => (window.location.href = "/"))}
                className="hidden sm:block text-muted hover:text-danger transition-colors p-2"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              to="/data-room"
              className="hidden sm:flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-obsidian transition-opacity hover:opacity-90"
              style={{ boxShadow: "0 0 30px -10px rgba(197,160,89,0.5)" }}
            >
              <Lock size={13} /> Data Room
            </Link>
          )}

          {/* Hamburger — shown below the lg breakpoint */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden text-bone hover:text-gold transition-colors p-1.5 -mr-1.5"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden border-t border-obsidian-line bg-obsidian/95 backdrop-blur-md"
          >
            <nav className="mx-auto max-w-[1200px] px-6 py-5 flex flex-col">
              <p className="eyebrow mb-3">The Core Ecosystem</p>
              {LINKS.map((l) => {
                const active = loc === l.href;
                return (
                  <button
                    key={l.href}
                    type="button"
                    aria-label={`${l.label} — ${l.sub}`}
                    onClick={() => {
                      setOpen(false);
                      setModal(l.slug);
                    }}
                    className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                      active ? "text-gold" : "text-bone hover:text-gold"
                    }`}
                  >
                    <span>
                      <span className="block font-display text-xl leading-tight">{l.label}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                        {l.sub}
                      </span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Compliance & Settlement Infrastructure"
                onClick={() => {
                  setOpen(false);
                  navigate("/infrastructure");
                }}
                className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                  loc === "/infrastructure" ? "text-gold" : "text-bone hover:text-gold"
                }`}
              >
                <span>
                  <span className="block font-display text-xl leading-tight">Compliance &amp; Settlement</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    Infrastructure Layer
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              </button>

              <button
                type="button"
                aria-label="Enterprise infrastructure for master trusts, labels, and platforms"
                onClick={() => {
                  setOpen(false);
                  navigate("/enterprise");
                }}
                className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                  loc === "/enterprise" ? "text-gold" : "text-bone hover:text-gold"
                }`}
              >
                <span>
                  <span className="block font-display text-xl leading-tight">Enterprise</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    For Trusts, Labels &amp; Platforms
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              </button>

              <Link
                to="/ssp-framework"
                aria-label="Sovereign Sign Protocol"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left text-bone hover:text-gold transition-colors"
              >
                <span>
                  <span className="block font-display text-xl leading-tight">SSP Protocol</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    Sovereign Sign Protocol™
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              </Link>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/data-room"
                  className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] px-4 py-3.5 bg-gold text-obsidian hover:bg-gold-bright transition-colors"
                >
                  <Lock size={13} /> Enter the Data Room
                </Link>
                {authed && (
                  <button
                    onClick={() => authClient.signOut().then(() => (window.location.href = "/"))}
                    className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] px-4 py-3 border border-obsidian-line text-muted hover:text-danger hover:border-danger/50 transition-colors"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick-look pillar modal — pops before the full page */}
      <PillarModal slug={modal} onClose={() => setModal(null)} />
    </header>
  );
}
