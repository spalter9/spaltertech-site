import { useState } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowLeft, FileText, ScrollText, ArrowUpRight, Lock } from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";
import { WhitePaperDoc } from "../components/whitepaper";
import { ExecSummaryDoc } from "../components/exec-summary";
import { AccessGate } from "../components/access-gate";

type Tab = "whitepaper" | "summary";

const TABS: { id: Tab; label: string; sub: string; icon: typeof FileText }[] = [
  { id: "whitepaper", label: "Technical White Paper", sub: "Full protocol specification", icon: ScrollText },
  { id: "summary", label: "Executive Summary", sub: "Institutional positioning", icon: FileText },
];

export default function SspFramework() {
  const [tab, setTab] = useState<Tab>("whitepaper");

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <AccessGate />
      <Nav />

      {/* Header */}
      <div className="relative border-b border-obsidian-line overflow-hidden pt-[68px]">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)" }}
        />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-20">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted mb-8">
            <Link to="/" className="hover:text-bone transition-colors">Home</Link>
            <span className="text-obsidian-line">/</span>
            <span className="text-gold">SSP Protocol Framework</span>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="eyebrow">Public Reference · Open Access</p>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.03] mt-6 max-w-3xl">
              The Sovereign Sign Protocol
              <sup className="ml-1 align-super font-mono text-[0.32em] text-gold">TM</sup> Framework
            </h1>
            <p className="text-muted text-lg leading-relaxed mt-6 max-w-2xl">
              The complete technical and institutional architecture of the protocol — freely readable, no account required.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="sticky top-[68px] z-30 border-b border-obsidian-line bg-obsidian/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1100px] px-6 flex gap-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-label={`${t.label} — ${t.sub}`}
                className={`group relative flex items-center gap-2.5 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                  active ? "text-gold" : "text-muted hover:text-bone"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.id === "whitepaper" ? "White Paper" : "Summary"}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document body */}
      <section className="mx-auto max-w-[820px] px-6 py-14">
        {tab === "whitepaper" ? <WhitePaperDoc /> : <ExecSummaryDoc />}
      </section>

      {/* CTA */}
      <section className="border-t border-obsidian-line">
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <div className="card-surface p-10 text-center flex flex-col items-center">
            <Crest size={48} />
            <h2 className="font-display text-3xl md:text-4xl mt-6 max-w-2xl">See the framework operating live.</h2>
            <p className="text-muted mt-3 max-w-xl">
              The Data Room brings the full protocol together — forensic data, financial charts, and verification tools, in one privileged environment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                to="/data-room"
                className="group flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors"
              >
                <Lock size={13} /> Enter the Data Room
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                to="/"
                className="flex items-center gap-2 px-7 py-3.5 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.2em] transition-colors"
              >
                <ArrowLeft size={14} /> Back to overview
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
