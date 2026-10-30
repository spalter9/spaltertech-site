import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeftRight, Lock, LogOut, Menu, ScanLine, X } from "lucide-react";
import { Monogram } from "./brand";
import { useMe } from "../queries/pillars";
import { authClient } from "../lib/auth";
import { PillarModal, type PillarSlug } from "./pillar-modal";
import { useGatewayOptional } from "./root-passcode-lock";

const LINKS: { slug: PillarSlug; href: string; label: string; short: string; sub: string }[] = [
  { slug: "master-trust", href: "/pillar/master-trust", label: "Cryptographic Sovereignty", short: "Sovereignty", sub: "MasterTrust™" },
  { slug: "surrealizer", href: "/pillar/surrealizer", label: "Catalog Modernization", short: "Catalog", sub: "Surrealizer Engine™" },
  { slug: "ssp", href: "/pillar/ssp", label: "Ecosystem Integration", short: "Ecosystem", sub: "Sovereign Sign Protocol™" },
];

export function Nav() {
  const [loc, navigate] = useLocation();
  const me = useMe();
  const gateway = useGatewayOptional();
  const authed = !!me.data;
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<PillarSlug | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on route change and lock body scroll while open.
  useEffect(() => setOpen(false), [loc]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 glass border-b transition-all duration-500 ${
        scrolled ? "border-gold/25 shadow-[0_14px_40px_-24px_rgba(0,0,0,0.95)]" : "border-gold/10"
      }`}
    >
      <div
        className={`mx-auto max-w-[96rem] px-6 flex items-center justify-between transition-all duration-500 ${
          scrolled ? "h-16" : "h-20"
        }`}
      >
        <Link to="/" className="cursor-pointer shrink-0 mr-6">
          <Monogram compact />
        </Link>

        <nav className="hidden lg:flex min-w-0 flex-1 items-center gap-5 2xl:gap-7 mr-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => setModal(l.slug)}
              aria-label={`${l.label} — ${l.sub}`}
              title={l.sub}
              className={`group relative nav-link ${loc === l.href ? "is-active" : ""}`}
            >
              <span className="hidden 2xl:inline">{l.label}</span>
              <span className="2xl:hidden">{l.short}</span>
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
            className={`nav-link ${loc === "/infrastructure" ? "is-active" : ""}`}
          >
            Compliance
          </Link>
          <Link
            to="/enterprise"
            aria-label="Enterprise infrastructure for master trusts, labels, and platforms"
            title="Enterprise"
            className={`nav-link ${loc === "/enterprise" ? "is-active" : ""}`}
          >
            Enterprise
          </Link>
          <Link
            to="/ssp-framework"
            aria-label="Sovereign Sign Protocol"
            title="Sovereign Sign Protocol™"
            className={`nav-link ${loc === "/ssp-framework" ? "is-active" : ""}`}
          >
            SSP Protocol
          </Link>
          <Link
            to="/engine"
            aria-label="SSP Master Engine"
            title="SSP Master Engine™"
            className={`nav-link ${loc === "/engine" ? "is-active" : ""}`}
          >
            Master Engine
          </Link>
          <Link
            to="/surreal-studio"
            aria-label="Surreal Engine Float32 Studio"
            title="Surreal Studio™"
            className={`nav-link ${loc === "/surreal-studio" ? "is-active" : ""}`}
          >
            Surreal Studio
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {/* The examiner sits in the action cluster rather than the nav row:
              nine nowrap items overflow below ~1400px and this was the last
              of them, so the one page people are sent to was clipped away. */}
          <Link
            to="/sovereign-protocol"
            aria-label="Examiner — forensic authorship audit and four-valve seal"
            title="Sovereign Audio Protocol™ — Examiner"
            className={`hidden md:inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
              loc === "/sovereign-protocol"
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-gold/35 bg-gold/[0.07] text-gold hover:bg-gold/15"
            }`}
          >
            <ScanLine size={12} /> Examiner
          </Link>
          {gateway && (
            <button
              type="button"
              onClick={gateway.returnToPortals}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-obsidian-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-gold/40 hover:text-gold"
              title="Back to Portal Selection"
            >
              <ArrowLeftRight size={12} /> <span className="hidden 2xl:inline">Gateways</span>
            </button>
          )}
          {authed ? (
            <>
              <Link
                to="/data-room"
                className="btn-gold hidden sm:flex !px-5 !py-2.5 !text-[11px]"
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
              className="btn-gold hidden sm:flex !px-5 !py-2.5 !text-[11px]"
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

              <Link
                to="/engine"
                aria-label="SSP Master Engine"
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                  loc === "/engine" ? "text-gold" : "text-bone hover:text-gold"
                }`}
              >
                <span>
                  <span className="block font-display text-xl leading-tight">Master Engine</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    Multi-Industry SSP Engine™
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              </Link>

              <Link
                to="/surreal-studio"
                aria-label="Surreal Engine Float32 Studio"
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                  loc === "/surreal-studio" ? "text-gold" : "text-bone hover:text-gold"
                }`}
              >
                <span>
                  <span className="block font-display text-xl leading-tight">Surreal Studio</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    Float32 DSP · SSP Stamp™
                  </span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
              </Link>

              <Link
                to="/sovereign-protocol"
                aria-label="Sovereign Audio Protocol — forensic audit and 4-valve seal"
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-4 py-4 border-b border-obsidian-line text-left transition-colors ${
                  loc === "/sovereign-protocol" ? "text-gold" : "text-bone hover:text-gold"
                }`}
              >
                <span>
                  <span className="block font-display text-xl leading-tight">Examiner</span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-muted mt-1">
                    Sovereign Audio Protocol™
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
