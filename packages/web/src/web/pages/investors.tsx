import { Link } from "wouter";
import { motion } from "motion/react";
import {
  ScanLine,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Fingerprint,
  Cpu,
  Crosshair,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { Nav } from "../components/nav";
import { Crest } from "../components/brand";

/**
 * The investor one-pager, as a page inside the gated site.
 *
 * The five-minute brief: the problem and why now, the working product (the
 * differentiator — a deck tells, this runs), the wedge and first move, the
 * market, the model, and the ask tied to the campaign. It distills the Data
 * Room onto one scroll and sends the reader into the Game Plan and the
 * Examiner for depth. Market and model figures are the ones stated in the
 * Executive Summary; nothing here claims traction not yet earned.
 */

function StatTile({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="card-surface rounded-xl p-6">
      <p className="font-display text-3xl leading-none text-bone md:text-4xl">{v}</p>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{k}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{sub}</p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6 }}
      className="border-t border-obsidian-line py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1100px] px-6">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl leading-[1.08] md:text-4xl">{title}</h2>
        {lead ? <p className="mt-4 max-w-2xl leading-relaxed text-muted">{lead}</p> : null}
        {children}
      </div>
    </motion.section>
  );
}

const PRODUCT_POINTS: { icon: LucideIcon; k: string; d: string }[] = [
  { icon: Cpu, k: "Runs in the browser", d: "Source separation and forensic analysis on the user's own hardware. No audio leaves the machine." },
  { icon: ScanLine, k: "A finding per stem", d: "Each source — vocals, drums, bass, instruments — scored for the physical traces of a human performance." },
  { icon: FileCheck2, k: "Copyright Office wording", d: "The exact language to claim and disclaim, ready to paste into the registration application." },
  { icon: Fingerprint, k: "Cryptographic record", d: "A sealed authorship record — hash, timestamp, and the finding — that travels with the file." },
];

const REVENUE: { icon: LucideIcon; k: string; d: string }[] = [
  { icon: FileCheck2, k: "Authentication", d: "A per-file fee to fingerprint, examine, and seal a work at the point of creation — flat for independents, volume-scaled for enterprise." },
  { icon: Coins, k: "Ecosystem split", d: "An automated 1–2% processing split on streaming and sync settlements routed through the ledger." },
  { icon: ShieldCheck, k: "Enterprise & catalog", d: "Annual licensing for pipeline integration, plus retroactive ingestion that turns dormant catalogs into sealed, earning assets." },
];

export default function Investors() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />

      {/* Masthead */}
      <section className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.14), transparent 55%)" }}
        />
        <div className="relative mx-auto max-w-[1100px] px-6 py-16 md:py-24">
          <span className="inline-block rounded-full border border-gold/25 bg-gold/10 px-4 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Investor Brief · Seed Round
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.03] tracking-tight md:text-6xl">
            The ownership layer for the age of{" "}
            <span className="gold-text">synthetic media.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Spalter Tech proves who made what — cryptographically, at the source — and gets every
            rightful party paid the instant a work is used. The first piece is already running: a
            forensic examiner that tells human from machine, stem by stem, in the browser.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/sovereign-protocol"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-obsidian transition-opacity hover:opacity-90"
              style={{ boxShadow: "0 0 44px -14px rgba(197,160,89,0.6)" }}
            >
              <ScanLine size={13} /> Watch the Examiner
            </Link>
            <Link
              to="/data-room"
              className="flex items-center gap-2 rounded-xl border border-gold/30 bg-obsidian-raised px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10"
            >
              Open the Data Room <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line sm:grid-cols-3">
            {[
              { k: "Raising", v: "$3.5M Seed" },
              { k: "Funds", v: "Phase I · The Beachhead" },
              { k: "Live today", v: "The Examiner" },
            ].map((x) => (
              <div key={x.k} className="bg-obsidian p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{x.k}</p>
                <p className="mt-2 font-display text-2xl text-bone">{x.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem / why now */}
      <Section
        eyebrow="The Opening"
        title={
          <>
            The law changed. <span className="gold-text">The tools didn't.</span>
          </>
        }
        lead="Since 2023 the U.S. Copyright Office has required applicants to disclaim AI-generated material and exclude it from the claim. Every rights-holder now has to answer a question none of them can — and that gap is the opening."
      >
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StatTile k="Regulatory forcing function" v="2023" sub="The Copyright Office begins requiring AI material to be disclaimed — the EU AI Act adds disclosure duties on top." />
          <StatTile k="Tools that can tell, from a mix, what a human made" v="Zero" sub="No one can separate human from machine in a finished record. Artists guess — and guessing puts the registration at risk." />
          <StatTile k="Rights-holders now exposed" v="Everyone" sub="Every catalog, label, and creator filing new work is forced to make a disclosure they have no way to verify." />
        </div>
      </Section>

      {/* The product — the differentiator */}
      <Section
        eyebrow="What We Built"
        title={
          <>
            Not a deck. <span className="gold-text">A working tool.</span>
          </>
        }
        lead="The Examiner runs today. Drop in a record; it separates the stems on your own hardware, scores each for the physical signatures of a human performance, and returns the exact wording for the copyright application — with a cryptographic authorship record sealed to the file."
      >
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCT_POINTS.map((p) => (
            <div key={p.k} className="flex flex-col bg-obsidian p-7">
              <p.icon size={20} className="text-gold" />
              <h3 className="mt-4 font-display text-xl leading-tight text-bone">{p.k}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.d}</p>
            </div>
          ))}
        </div>
        <Link
          to="/sovereign-protocol"
          className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:text-gold-bright"
        >
          See it run <ArrowUpRight size={14} />
        </Link>
      </Section>

      {/* The wedge & first move */}
      <Section
        eyebrow="The Strategy"
        title={
          <>
            One wedge, won cleanly. <span className="gold-text">Then the breakout.</span>
          </>
        }
        lead="We open where the pain is sharpest and the decision is fastest — not on the majors. Prove it in music copyright, turn the tool into an open standard, then extend the same provenance layer into film and games."
      >
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="card-surface rounded-2xl p-7">
            <div className="flex items-center gap-3">
              <Crosshair size={18} className="text-gold" />
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The first move</p>
            </div>
            <p className="mt-4 leading-relaxed text-bone/85">
              Open on <span className="text-gold">DistroKid</span> — the largest independent
              distributor, filing at the volume where the disclosure problem bites — with{" "}
              <span className="text-bone">Bradley Spalter's own catalog</span> as the founding proof
              case, examined and sealed end to end from day one. Fastest yes, sharpest pain, and proof
              we control before the first outside conversation.
            </p>
            <p className="mt-4 border-l-2 border-gold/60 pl-4 text-sm text-bone">
              The majors are not the first move. They are the reward for winning it.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The full campaign</p>
            <p className="mt-4 leading-relaxed text-muted">
              Four sequenced phases — Beachhead, Standard, Breakout, Rail — each with the move, the
              target, the objective, and the counter we hold for every counter. It's laid out move by
              move in the Game Plan.
            </p>
            <Link
              to="/data-room#campaign"
              className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:text-gold-bright"
            >
              Read the Game Plan <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </Section>

      {/* The market */}
      <Section
        eyebrow="The Market"
        title="A toll on volume the industry already moves"
        lead="Music is the proof of concept and the beachhead. The same provenance layer extends to the far larger film, television, and video-game pipelines, where synthetic-media provenance is an even bigger unsolved problem."
      >
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StatTile k="Global recorded music" v="$31.7B" sub="Annual — with paid streaming accounting for $22B+ across 800M+ paid accounts." />
          <StatTile k="Sync licensing" v="$7.2B" sub="A market tracking toward this valuation, where provenance and clearance are chronic bottlenecks." />
          <StatTile k="Expansion fronts" v="Film · Games" sub="The breakout verticals — the same standard, carried in on music proof rather than a cold pitch." />
        </div>
      </Section>

      {/* The model */}
      <Section
        eyebrow="The Model"
        title={
          <>
            High-margin infrastructure, <span className="gold-text">paid at the source.</span>
          </>
        }
        lead="Revenue is earned as the standard is adopted — not forced. Three lines, all automated on-chain, all settling the instant a work is authenticated or used."
      >
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line md:grid-cols-3">
          {REVENUE.map((r) => (
            <div key={r.k} className="flex flex-col bg-obsidian p-7">
              <r.icon size={20} className="text-gold" />
              <h3 className="mt-4 font-display text-xl leading-tight text-bone">{r.k}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.d}</p>
            </div>
          ))}
        </div>
        <Link
          to="/data-room#proforma"
          className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold hover:text-gold-bright"
        >
          Model it in the Pro Forma <ArrowUpRight size={14} />
        </Link>
      </Section>

      {/* The ask */}
      <Section
        eyebrow="The Ask"
        title={
          <>
            $3.5M Seed <span className="gold-text">takes the Beachhead.</span>
          </>
        }
        lead="The raise maps to the campaign. Each round funds a named phase and produces the proof that unlocks the next — capital is fuel for a plan already drawn, not a bet on one yet to come."
      >
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="card-surface rounded-2xl p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">What it buys</p>
            <p className="mt-3 leading-relaxed text-bone/85">
              Harden the Examiner, land the first anchor adopter and first catalogs, publish the
              measurement methodology for third-party audit, and lock foundational IP with counsel.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verified">The proof it produces</p>
            <p className="mt-3 leading-relaxed text-bone/85">
              One anchor adopter live and public, first catalogs examined and filed, and an open,
              audited methodology — the traction that opens Series A and the majors' door.
            </p>
          </div>
        </div>
      </Section>

      {/* Team */}
      <Section eyebrow="The Team" title="Built by the people who have to use it">
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="card-surface rounded-2xl p-7">
            <h3 className="font-display text-2xl text-bone">Bradley Spalter</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">CEO &amp; Music Designer</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Commercial deployment strategy, industry architecture, and the enterprise integration
              framework — built from inside the catalog the protocol is designed to protect.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-7">
            <h3 className="font-display text-2xl text-bone">Peter Van Barkal</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">CTO</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The Surreal Audio Engine and the forensic pipeline at the core of the protocol — the
              signal science that makes the finding defensible.
            </p>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-obsidian-line py-24">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(197,160,89,0.12), transparent 55%)" }}
        />
        <div className="relative mx-auto flex max-w-[1100px] flex-col items-center px-6 text-center">
          <Crest size={52} />
          <h2 className="mt-8 max-w-2xl font-display text-3xl leading-[1.06] md:text-4xl">
            The plan is drawn. The product runs. <span className="gold-text">The opening is now.</span>
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-muted">
            Everything behind this brief — the architecture, the financials, the full campaign — is
            in the privileged Data Room.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/data-room"
              className="flex items-center gap-2 bg-gold px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-obsidian transition-colors hover:bg-gold-bright"
            >
              Enter the Data Room <ArrowUpRight size={15} />
            </Link>
            <a
              href="mailto:info@spaltertech.com"
              className="flex items-center gap-2 border border-gold/30 px-8 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
            >
              Contact the principals
            </a>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Spalter Entertainment Technologies · info@spaltertech.com
          </p>
        </div>
      </section>
    </div>
  );
}
