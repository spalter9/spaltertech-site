import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * "The standards it speaks" — an interoperability band.
 *
 * The rest of the page makes large claims; this section grounds them in the
 * real, external standards the protocol already plugs into, so a reader (or a
 * label's counsel) can see it is not a walled garden. The glyphs are bespoke
 * inline SVG rather than icon-font pulls, drawn on one 32-unit grid with a
 * single gold stroke so the row reads as one designed set.
 */

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span className="text-gold" aria-hidden>
      <svg width="30" height="30" viewBox="0 0 32 32">{children}</svg>
    </span>
  );
}

type Standard = {
  code: string;
  name: string;
  body: string;
  glyph: ReactNode;
};

const STANDARDS: Standard[] = [
  {
    code: "C2PA v2",
    name: "Content provenance",
    body: "Every export ships a tamper-evident manifest — the Coalition for Content Provenance and Authenticity standard adopted across the media industry.",
    glyph: (
      <g {...S}>
        <path d="M16 4l10 4v7c0 6-4.2 10.4-10 13-5.8-2.6-10-7-10-13V8l10-4z" />
        <path d="M11.5 16l3 3 6-6.5" />
      </g>
    ),
  },
  {
    code: "ISRC · ISWC",
    name: "Rights identifiers",
    body: "Each recording and composition carries the same registry codes the PROs, the MLC, and every DSP already key their accounting to.",
    glyph: (
      <g {...S}>
        <rect x="5" y="8" width="22" height="16" rx="2" />
        <path d="M9 12v8M12 12v8M15 12v8M18.5 12v8M22 12v8" />
      </g>
    ),
  },
  {
    code: "Polygon PoS",
    name: "On-chain anchor",
    body: "Chain-of-title and split settlement are anchored to a public proof-of-stake ledger — verifiable by anyone, owned by no intermediary.",
    glyph: (
      <g {...S}>
        <path d="M16 4l10.4 6v12L16 28 5.6 22V10L16 4z" />
        <path d="M16 11l5.2 3v6L16 23l-5.2-3v-6L16 11z" />
      </g>
    ),
  },
  {
    code: "USCO · §202",
    name: "Copyright filing",
    body: "Findings map to the exact AI-disclosure wording the U.S. Copyright Office asks applicants to submit — claim and disclaim, in the Office's own terms.",
    glyph: (
      <g {...S}>
        <path d="M6 27h20" />
        <path d="M16 4l10 5H6l10-5z" />
        <path d="M9 12v11M14 12v11M18 12v11M23 12v11" />
      </g>
    ),
  },
  {
    code: "USDC → ACH",
    name: "Fiat settlement",
    body: "Value settles the instant it is earned in a regulated stablecoin, then off-ramps to real dollars over ACH, wire, or RTP — no quarterly statement.",
    glyph: (
      <g {...S}>
        <circle cx="16" cy="16" r="11" />
        <path d="M16 10v12M13 12.5h4.2a2.3 2.3 0 010 4.6h-2.4a2.3 2.3 0 000 4.6H19" />
      </g>
    ),
  },
];

export function Standards() {
  return (
    <section className="relative overflow-hidden border-t border-obsidian-line py-28">
      <div className="absolute inset-0 bg-grid opacity-20" aria-hidden="true" />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(197,160,89,0.07), transparent 55%)" }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Interoperability</p>
          <h2 className="mt-3 font-display text-4xl leading-[1.05] md:text-5xl">
            Sovereign, <span className="gold-text">not a walled garden.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            The protocol does not ask the industry to abandon what it runs on. It speaks the
            standards already in place — provenance, identifiers, ledger, filing, and settlement —
            so a work proven here is recognized everywhere it travels.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line sm:grid-cols-2 lg:grid-cols-3">
          {STANDARDS.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="group flex flex-col bg-obsidian p-8 transition-colors hover:bg-obsidian-raised"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-gold/25 bg-gold/[0.05] transition-colors group-hover:border-gold/50">
                  <Glyph>{s.glyph}</Glyph>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  {s.code}
                </span>
              </div>
              <h3 className="mt-6 font-display text-2xl leading-tight text-bone">{s.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </motion.div>
          ))}

          {/* Closing tile keeps the 6-cell grid whole and states the through-line. */}
          <div className="flex flex-col justify-center bg-obsidian-raised/60 p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              One verifiable pass
            </p>
            <p className="mt-3 text-sm leading-relaxed text-bone/85">
              Legal, signal, and settlement resolve together — every standard above referenced
              from a single record, not five disconnected systems.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
