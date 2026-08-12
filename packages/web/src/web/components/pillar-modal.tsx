import { useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, AudioWaveform, Link2, ArrowRight, X, type LucideIcon } from "lucide-react";

export type PillarSlug = "master-trust" | "ssp" | "surrealizer";

type PillarDetail = {
  slug: PillarSlug;
  icon: LucideIcon;
  index: string;
  tag: string;
  name: string;
  maps: string;
  /** Short intel lead-in shown at the top of the modal. */
  lead: string;
  /** Richer description carried over from the full pillar page. */
  body: string;
  points: string[];
};

/**
 * Quick-look copy for the nav modals. The lead lines mirror the concise
 * "intel" blurbs; the body/points are the richer copy from the pillar pages.
 * Each modal links through to its full page.
 */
export const PILLAR_DETAILS: Record<PillarSlug, PillarDetail> = {
  "master-trust": {
    slug: "master-trust",
    icon: ShieldCheck,
    index: "01",
    tag: "Ownership, Absolute",
    name: "MasterTrust",
    maps: "Cryptographic Sovereignty",
    lead: "Proprietary asset holding framework and secure, modernized distribution infrastructure.",
    body: "Every master, every split, every attestation is cryptographically sealed and anchored on-chain. Chain-of-title stops being a claim and becomes mathematical fact — multi-sig escrow, immutable provenance, and instant concurrent settlement retire the ledgers and lawyers of the old regime.",
    points: ["Multi-sig escrow vault", "Chain-of-title as proof", "Instant on-chain settlement"],
  },
  ssp: {
    slug: "ssp",
    icon: Link2,
    index: "03",
    tag: "One Sovereign Standard",
    name: "Sovereign Sign Protocol",
    maps: "Ecosystem Integration",
    lead: "Cryptographic digital identity and advanced song-fingerprinting architecture.",
    body: "The Sovereign Sign Protocol is the connective tissue of the ecosystem — a Polygon-anchored ledger with real-time split escrows and a smart-contract tripwire that bills AI crawlers on contact or locks them out. Legal, signal, and settlement resolve in a single, verifiable pass.",
    points: ["Polygon-anchored ledger", "Real-time split settlement", "Anti-scraping tripwire"],
  },
  surrealizer: {
    slug: "surrealizer",
    icon: AudioWaveform,
    index: "02",
    tag: "Legacy IP, Reawakened",
    name: "Surrealizer Engine",
    maps: "Catalog Modernization",
    lead: "Advanced catalog utility and proprietary digital-asset modernization interface.",
    body: "The Surrealizer Engine performs forensics at the frequency layer — neural stem extraction, DNA-level credit detection, and inaudible steganographic provenance. Dormant catalogs are reawakened as living, self-accounting, revenue-generating assets that pay every contributor they were built from.",
    points: ["Neural stem extraction", "Forensic attribution", "Catalog restoration"],
  },
};

export function PillarModal({
  slug,
  onClose,
}: {
  slug: PillarSlug | null;
  onClose: () => void;
}) {
  // Close on Escape and lock body scroll while a modal is open.
  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [slug, onClose]);

  const detail = slug ? PILLAR_DETAILS[slug] : null;

  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          key="pillar-modal"
          className="fixed inset-0 z-[70] grid place-items-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            aria-modal="true"
            aria-label={detail.name}
            className="relative w-full max-w-lg card-surface border border-gold/30 p-8 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted hover:text-gold transition-colors p-1"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between">
              <div className="w-12 h-12 grid place-items-center border border-gold/40 text-gold">
                <detail.icon size={22} />
              </div>
              <span className="font-mono text-3xl text-obsidian-line">{detail.index}</span>
            </div>

            <p className="eyebrow mt-6">{detail.tag}</p>
            <h3 className="font-display text-3xl mt-2 leading-tight">
              {detail.name}
              <sup className="ml-0.5 align-super font-mono text-[0.4em] text-gold">TM</sup>
            </h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mt-2">
              {detail.maps}
            </p>

            <p className="text-gold/90 text-sm leading-relaxed mt-5">{detail.lead}</p>
            <p className="text-muted text-sm leading-relaxed mt-3">{detail.body}</p>

            <ul className="mt-6 space-y-2">
              {detail.points.map((pt) => (
                <li key={pt} className="flex items-center gap-2 text-sm text-bone/80">
                  <span className="w-1 h-1 bg-gold rounded-full" /> {pt}
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-obsidian-line pt-5">
              <Link
                to={`/pillar/${detail.slug}`}
                onClick={onClose}
                className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] px-5 py-3 border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
              >
                Read more
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
