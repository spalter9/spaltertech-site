import { motion } from "motion/react";
import {
  Crosshair,
  Landmark,
  Network,
  Coins,
  Swords,
  ShieldHalf,
  Target,
  Flag,
  type LucideIcon,
} from "lucide-react";

/**
 * "The Campaign" — the go-to-market war plan, written for the investor.
 *
 * The brief was explicit: Eisenhower, not a hopeful founder. We have a plan,
 * the plan is sequenced, and for every counter the board can throw there is a
 * prepared response. So every phase carries an intended move, the target we
 * open it on, the objective that counts as taking the square, and the
 * counter-move we hold in reserve.
 *
 * Nothing here claims traction we do not have: targets are named as targets
 * and moves as the plan, so the section reads as strategy, not as a scoreboard.
 */

type Phase = {
  n: string;
  codename: string;
  icon: LucideIcon;
  move: string;
  target: string;
  objective: string;
  counter: string;
  answer: string;
};

const PHASES: Phase[] = [
  {
    n: "I",
    codename: "The Beachhead",
    icon: Crosshair,
    move: "Make the Examiner the default step before a music copyright registration — the tool you run a record through before you file.",
    target:
      "Not the majors. DistroKid — the largest independent distributor, moving new releases at the volume where the disclosure problem bites hardest — as the first distribution partner we approach, with Bradley Spalter's own catalog as the founding proof case.",
    objective:
      "Bradley Spalter's catalog examined, filed and sealed end to end, DistroKid engaged on a pilot, and the methodology published for audit. Real filings, real proof.",
    counter: "“It isn’t validated. Prove the forensics hold up.”",
    answer:
      "We publish the measurement methodology and open it to third-party audit. Open beats a black box — the skeptic becomes the validator.",
  },
  {
    n: "II",
    codename: "The Standard",
    icon: Landmark,
    move: "Turn the working tool into an open, documented protocol and bind it to the rails the industry already trusts — C2PA for provenance, ISRC/ISWC and DDEX for identity. Stand up neutral governance.",
    target:
      "Standards bodies (C2PA, DDEX), the PRO and MLC world, and a second-vertical adopter to prove it travels.",
    objective:
      "Spalter is the reference implementation and the trusted operator of an open standard — the name on it, not the cage around it.",
    counter: "“Why would we build our business on one vendor’s system?”",
    answer:
      "Governance is the answer: open spec, neutral operation, fully auditable. We trade the walled-garden fantasy for the standard itself — which is worth far more.",
  },
  {
    n: "III",
    codename: "The Breakout",
    icon: Network,
    move: "Extend the same provenance layer into film, VFX and video games — where AI-authorship and asset provenance is a bigger, hotter, more unsolved problem than in music.",
    target:
      "A game studio or engine, and a film/VFX post house or a guild-aligned partner (synthetic-performer and SAG-AFTRA AI terms are the opening).",
    objective:
      "Cross-industry proof: one standard now spanning music, film and games — carried in on music proof, never a cold pitch.",
    counter: "“Different industry, different rules — your music tool won’t fit.”",
    answer:
      "The provenance primitive is industry-agnostic. We localize the filing and rights layer per vertical and keep the core identical. Sequence is the weapon: we arrive proven.",
  },
  {
    n: "IV",
    codename: "The Rail",
    icon: Coins,
    move: "Once provenance is trusted and adopted, the settlement layer — the SSP ledger, split escrow, and the fiat off-ramp — becomes the default rail, because it is already attached to the records everyone references.",
    target:
      "The installed base won in Phases I–III: every rights-holder, distributor and platform already citing a Spalter-proven record.",
    objective:
      "Recurring infrastructure revenue on top of an installed base whose trust we already own — the durable business.",
    counter: "“Someone will just build a cheaper rail and route around you.”",
    answer:
      "There is nothing to route around. An open standard we operate neutrally is the ground the industry stands on, not a chokepoint it resents — and every record proven here is cited everywhere it travels.",
  },
];

function Doctrine() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-gold/25 bg-obsidian-raised/50 p-8 md:p-10"
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse at 85% 0%, rgba(197,160,89,0.10), transparent 55%)" }}
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/[0.06] text-gold">
          <Swords size={26} />
        </div>
        <div>
          <p className="eyebrow">The Doctrine</p>
          <h3 className="mt-2 font-display text-3xl leading-[1.08] md:text-4xl">
            We are playing chess, <span className="gold-text">not checkers.</span>
          </h3>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            We are not waiting for the industry to arrive — we are taking the board, one square at a
            time. Every phase below is a move with an objective. Every likely counter has a response
            already in reserve. As Eisenhower had it:{" "}
            <span className="text-bone">“Plans are worthless, but planning is everything.”</span> We
            play the position in front of us, not the one we wish for — and we do not move without
            knowing our next three.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function WhyNow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line md:grid-cols-3"
    >
      <div className="bg-obsidian p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The opening</p>
        <p className="mt-3 text-sm leading-relaxed text-bone/85">
          Since 2023 the U.S. Copyright Office has required applicants to disclaim AI-generated
          material. The EU AI Act adds disclosure duties on top.
        </p>
      </div>
      <div className="bg-obsidian p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The pressure</p>
        <p className="mt-3 text-sm leading-relaxed text-bone/85">
          Every rights-holder is now forced to answer a question none of them can: which part was
          human, and which was the machine?
        </p>
      </div>
      <div className="bg-obsidian p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">The move</p>
        <p className="mt-3 text-sm leading-relaxed text-bone/85">
          We move first, where the pain is sharpest and the decision-maker is fastest — and we
          answer that question with measurement, not opinion.
        </p>
      </div>
    </motion.div>
  );
}

function FirstMove() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/[0.08] to-transparent p-8 md:p-10"
    >
      <div className="flex items-center gap-3">
        <Target size={18} className="text-gold" />
        <p className="eyebrow">The First Move · Opening 90 Days</p>
      </div>
      <h3 className="mt-3 max-w-3xl font-display text-2xl leading-[1.12] md:text-3xl">
        Open on the fastest yes with the sharpest pain — not on the majors.
      </h3>

      <div className="mt-8 grid gap-px overflow-hidden rounded-xl bg-obsidian-line md:grid-cols-3">
        <div className="bg-obsidian p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Who we approach</p>
          <p className="mt-2 text-sm leading-relaxed text-bone/90">
            <span className="text-gold">DistroKid</span> — the largest independent distributor,
            filing at the volume where the disclosure problem bites hardest — as the first partner we
            approach, with <span className="text-bone">Bradley Spalter's own catalog</span> as the
            founding proof case.
          </p>
        </div>
        <div className="bg-obsidian p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Why them first</p>
          <p className="mt-2 text-sm leading-relaxed text-bone/90">
            DistroKid moves indie volume no major touches, and its filers feel the pain now. And a
            founder's catalog we can commit on day one means the proof exists before the first outside
            conversation — a demonstration, not a promise.
          </p>
        </div>
        <div className="bg-obsidian p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The objective</p>
          <p className="mt-2 text-sm leading-relaxed text-bone/90">
            Bradley Spalter's catalog examined, filed and sealed, DistroKid engaged on a pilot, and
            the methodology published for audit. Proof on the board.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gold/25 bg-gold/[0.05] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
          The offer to DistroKid · a launch-partner window
        </p>
        <p className="mt-2 text-sm leading-relaxed text-bone/85">
          First and alone with the Examiner and sealed-authorship filing for a defined window — their
          edge over every other distributor while it lasts. When the window closes, it opens to the
          industry as the standard. First-mover advantage, not a permanent lock — the exclusivity that
          wins the anchor without mortgaging the open standard the whole thesis rests on.
        </p>
      </div>

      <p className="mt-6 border-l-2 border-gold/60 pl-4 text-sm leading-relaxed text-bone">
        The majors are not the first move. They are the reward for winning it.
      </p>
    </motion.div>
  );
}

type Round = {
  round: string;
  size: string;
  phase: string;
  buys: string;
  proof: string;
};

const ROUNDS: Round[] = [
  {
    round: "Seed",
    size: "$3.5M",
    phase: "Phase I · The Beachhead",
    buys: "Harden the Examiner, land the first anchor adopter and first catalogs, publish the methodology for third-party audit, and lock foundational IP.",
    proof: "One adopter live and public, first catalogs examined and filed.",
  },
  {
    round: "Series A",
    size: "Growth",
    phase: "Phase II · The Standard",
    buys: "Open the protocol, align it to C2PA and DDEX, stand up neutral governance, ship SDKs, and win a second-vertical adopter.",
    proof: "Spalter operating an open standard others build on.",
  },
  {
    round: "Series B",
    size: "Expansion",
    phase: "Phases III–IV · Breakout & the Rail",
    buys: "Extend into film and games, then bring the settlement rail — ledger, escrow, off-ramp — to scale on the installed base.",
    proof: "Cross-industry adoption and recurring infrastructure revenue.",
  },
];

function CapitalLadder() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border border-obsidian-line bg-obsidian-raised/40 p-8 md:p-10"
    >
      <div className="flex items-center gap-3">
        <Coins size={18} className="text-gold" />
        <p className="eyebrow">Capital &amp; the Campaign</p>
      </div>
      <h3 className="mt-3 max-w-3xl font-display text-2xl leading-[1.12] md:text-3xl">
        Every dollar takes a square. The raise <span className="gold-text">is</span> the war plan.
      </h3>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        The rounds are not a hope for runway — each one funds a named phase and produces the proof
        that unlocks the next. Capital is fuel for a campaign already mapped, not a bet on one yet
        to be drawn.
      </p>

      <div className="mt-8 space-y-4">
        {ROUNDS.map((r, i) => (
          <div
            key={r.round}
            className="grid gap-6 rounded-xl border border-obsidian-line bg-obsidian p-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1.2fr)] md:items-center"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-gold">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-display text-2xl leading-none text-bone">{r.round}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-gold/90">{r.size}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{r.phase}</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">What it buys</p>
              <p className="mt-1.5 text-sm leading-relaxed text-bone/85">{r.buys}</p>
            </div>
            <div className="md:border-l md:border-obsidian-line md:pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verified">Proof it produces</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.proof}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        Investors are wired into the on-chain distribution waterfall detailed in the Executive
        Summary — capital is returned programmatically as protocol revenue is realized, not on a
        quarterly statement.
      </p>
    </motion.div>
  );
}

export function CampaignPlan() {
  return (
    <div className="mt-8 space-y-6">
      <Doctrine />
      <WhyNow />

      {/* The board — four phases, each a move with a counter held in reserve. */}
      <div className="relative space-y-6 pt-2">
        {PHASES.map((p, i) => (
          <motion.div
            key={p.n}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.55, delay: i * 0.06 }}
            className="card-surface rounded-2xl p-7 md:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
              {/* Phase marker */}
              <div className="flex shrink-0 items-start gap-4 lg:w-56">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/[0.05] text-gold">
                  <p.icon size={22} />
                </div>
                <div>
                  <p className="font-mono text-xs text-gold">Phase {p.n}</p>
                  <h4 className="mt-1 font-display text-2xl leading-tight text-bone">{p.codename}</h4>
                </div>
              </div>

              {/* Move / target / objective */}
              <div className="grid flex-1 gap-5 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The move</p>
                  <p className="mt-2 text-sm leading-relaxed text-bone/85">{p.move}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Who we approach</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.target}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Take the square</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.objective}</p>
                </div>
              </div>
            </div>

            {/* Move / counter-move — the chess. */}
            <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-obsidian-line sm:grid-cols-[1fr_1.2fr]">
              <div className="flex items-start gap-3 bg-danger/[0.06] p-5">
                <ShieldHalf size={16} className="mt-0.5 shrink-0 text-danger" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-danger">They counter</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-bone/80">{p.counter}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gold/[0.05] p-5">
                <Swords size={16} className="mt-0.5 shrink-0 text-gold" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">We answer</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-bone/85">{p.answer}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <FirstMove />
      <CapitalLadder />

      {/* The endgame. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="flex items-start gap-4 border-l-2 border-gold/50 bg-obsidian-raised/40 px-6 py-6"
      >
        <Flag size={20} className="mt-1 shrink-0 text-gold" />
        <p className="max-w-3xl font-display text-lg leading-snug text-bone md:text-xl">
          We do not need the whole board on day one. We need the opening played perfectly, with
          every counter already answered — and that is how the standard is won.
        </p>
      </motion.div>
    </div>
  );
}
