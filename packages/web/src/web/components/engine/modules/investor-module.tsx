import { Link } from "wouter";
import { ScanLine, ArrowUpRight, ArrowRight } from "lucide-react";
import { CampaignPlan } from "../../campaign";
import { Defensibility } from "../../defensibility";
import { AccuracyStory } from "../../accuracy";

/**
 * Investor Briefing — the pitch material, inside the Engine console.
 *
 * The Game Plan, The Case, and the Accuracy story were built on the website
 * side; this brings them where the operator actually works. It reuses those
 * components verbatim so the two surfaces never drift, and links straight into
 * the live Examiner and the full Data Room for depth.
 */

function SectionRule({ tag, title }: { tag: string; title: string }) {
  return (
    <div className="border-t border-obsidian-line pt-8">
      <p className="eyebrow">{tag}</p>
      <h3 className="mt-2 font-display text-3xl leading-[1.08] md:text-4xl">{title}</h3>
    </div>
  );
}

export function InvestorModule() {
  return (
    <div className="space-y-12">
      {/* Masthead */}
      <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-7 md:p-9">
        <span className="inline-block rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold">
          Investor Briefing · Seed Round
        </span>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold leading-[1.05] md:text-5xl">
          The ownership layer for the age of <span className="gold-text">synthetic media.</span>
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">
          Prove who made what — cryptographically, at the source — and pay every rightful party the
          instant a work is used. The first piece runs today: a forensic examiner that tells human
          from machine, stem by stem.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/sovereign-protocol"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-obsidian transition-opacity hover:opacity-90"
          >
            <ScanLine size={13} /> Open the Examiner
          </Link>
          <Link
            to="/data-room"
            className="flex items-center gap-2 rounded-xl border border-gold/30 bg-obsidian-raised px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold/10"
          >
            Data Room <ArrowRight size={13} />
          </Link>
          <Link
            to="/investors"
            className="flex items-center gap-2 rounded-xl border border-obsidian-line px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted transition-colors hover:text-bone"
          >
            Full brief <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl bg-obsidian-line sm:grid-cols-3">
          {[
            { k: "Raising", v: "$3.5M Seed" },
            { k: "Funds", v: "Phase I · The Beachhead" },
            { k: "Live today", v: "The Examiner" },
          ].map((x) => (
            <div key={x.k} className="bg-obsidian p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{x.k}</p>
              <p className="mt-1.5 font-display text-xl text-bone">{x.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The Game Plan */}
      <div>
        <SectionRule tag="The Campaign · Go-to-Market" title="Game Plan" />
        <CampaignPlan />
      </div>

      {/* The Case */}
      <div>
        <SectionRule tag="Defensibility · The Investor Case" title="Why We Win, and What Could Stop Us" />
        <Defensibility />
      </div>

      {/* Accuracy */}
      <div>
        <SectionRule tag="Accuracy · The Honest Answer" title="How Accurate Is It?" />
        <AccuracyStory />
      </div>
    </div>
  );
}
