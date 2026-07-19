import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { Lock, LogOut, Menu, X } from "lucide-react";
import { Monogram } from "./brand";
import { useMe } from "../queries/pillars";
import { authClient } from "../lib/auth";

const LINKS = [
  { href: "/pillar/master-trust", label: "Cryptographic Sovereignty", sub: "Master Trust" },
  { href: "/pillar/surrealizer", label: "Catalog Modernization", sub: "Surrealizer Engine" },
  { href: "/pillar/ssp", label: "Ecosystem Integration", sub: "Sovereign Sign Protocol" },
];

export function Nav() {
  const [loc] = useLocation();
  const me = useMe();
  const authed = !!me.data;
  const [open, setOpen] = useState(false);

  // Close the mobile menu on route change and lock body scroll while open.
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-obsidian/80 border-b border-obsidian-line">
      <div className="mx-auto max-w-[1200px] px-6 h-[68px] flex items-center justify-between">
        <Link to="/" className="cursor-pointer">
          <Monogram compact />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              title={l.sub}
              className={`group relative font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                loc === l.href ? "text-gold" : "text-muted hover:text-bone"
              }`}
            >
              {l.label}
              {/* Tech name surfaced on hover — deep architecture stays discoverable */}
              <span className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-sm border border-obsidian-line bg-obsidian-raised px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-gold opacity-0 translate-y-1 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.9)] transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                {l.sub}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {authed ? (
            <>
              <Link
                to="/data-room"
                className={`hidden sm:flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 border transition-colors ${
                  loc.startsWith("/data-room")
                    ? "border-gold text-gold"
                    : "border-obsidian-line text-bone hover:border-gold hover:text-gold"
                }`}
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
              className="hidden sm:flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
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
                  <Link
                    key={l.href}
                    to={l.href}
                    className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line transition-colors ${
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
                  </Link>
                );
              })}

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
    </header>
  );
}
