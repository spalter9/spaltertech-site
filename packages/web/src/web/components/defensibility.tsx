import { motion } from "motion/react";
import { Gem, BadgeCheck, Share2, Unlock, ShieldHalf, Swords, type LucideIcon } from "lucide-react";

/**
 * "Why we win, and what could stop us" — the two questions every investor
 * asks. The moat says why the position holds; the risk register names the
 * real threats and the mitigation for each. Naming the risks before being
 * asked is a credibility move, not a weakness — and it's consistent with the
 * project's whole ethos of honest claims.
 */

type Moat = { icon: LucideIcon; k: string; d: string };
const MOAT: Moat[] = [
  {
    icon: Gem,
    k: "First to a defensible method",
    d: "The finding is measurement, not a model's opinion — reproducible, and validated against known material. Being first to a method that holds up under questioning is the hardest position to dislodge.",
  },
  {
    icon: BadgeCheck,
    k: "The trusted operator",
    d: "Adoption flows through the name the industry trusts to run the standard neutrally. That trust compounds with every filing and cannot be cloned by a faster copy of the code.",
  },
  {
    icon: Share2,
    k: "Network effects",
    d: "Every record proven here is referenced everywhere it travels. Each new adopter makes the standard more valuable to the next — the classic flywheel of an infrastructure standard.",
  },
  {
    icon: Unlock,
    k: "Nothing to route around",
    d: "Because we operate the open, neutral ground rather than a private chokepoint, there is no walled garden for anyone to resent or bypass — the incentive is to join, not to build around us.",
  },
];

type Risk = { threat: string; mitigation: string };
const RISKS: Risk[] = [
  {
    threat: "Incumbents move slowly — the majors won't adopt first.",
    mitigation:
      "We don't need them first. The campaign wins from the independent edge inward, where the pain is sharpest and the decision is fastest; the majors are the reward for proving it, not the opening bet.",
  },
  {
    threat: "The finding has to hold up. If it's wrong, the whole thing is.",
    mitigation:
      "The methodology is published and open to third-party audit, the measurements are reproducible, and the tool states an honest inconclusive band rather than overclaiming. Defensibility comes from never asserting more than the signal supports.",
  },
  {
    threat: "Big tech — C2PA, Google, Meta — could extend into this space.",
    mitigation:
      "We interoperate with C2PA rather than compete with it, and occupy a layer they don't: authorship forensics plus the filing language. Operating it as a neutral standard is a position a single platform can't credibly take.",
  },
  {
    threat: "Regulation could shift — the Copyright Office could change its guidance.",
    mitigation:
      "The underlying need — proving human contribution — outlives any single rule. The tool adapts its output to whatever disclosure the moment requires; the science beneath it does not expire.",
  },
  {
    threat: "No detector is ever 100%.",
    mitigation:
      "True — so we don't sell certainty. We layer file-level forensics, acoustic analysis, watermark checks, and a cryptographic authorship record, and we report confidence honestly. That candor is exactly what makes it credible at the Copyright Office.",
  },
];

export function Defensibility() {
  return (
    <div className="mt-8 space-y-12">
      {/* Why we win */}
      <div>
        <div className="flex items-center gap-3">
          <Swords size={18} className="text-gold" />
          <p className="eyebrow">Why We Win</p>
        </div>
        <h3 className="mt-3 max-w-3xl font-display text-2xl leading-[1.12] md:text-3xl">
          The position holds because of what compounds around it.
        </h3>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line sm:grid-cols-2">
          {MOAT.map((m, i) => (
            <motion.div
              key={m.k}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex flex-col bg-obsidian p-7"
            >
              <m.icon size={20} className="text-gold" />
              <h4 className="mt-4 font-display text-xl leading-tight text-bone">{m.k}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.d}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* What could stop us */}
      <div>
        <div className="flex items-center gap-3">
          <ShieldHalf size={18} className="text-gold" />
          <p className="eyebrow">What Could Stop Us</p>
        </div>
        <h3 className="mt-3 max-w-3xl font-display text-2xl leading-[1.12] md:text-3xl">
          The real risks — named, with the answer to each.
        </h3>
        <div className="mt-8 space-y-3">
          {RISKS.map((r, i) => (
            <motion.div
              key={r.threat}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="grid gap-px overflow-hidden rounded-xl bg-obsidian-line md:grid-cols-[1fr_1.3fr]"
            >
              <div className="flex items-start gap-3 bg-danger/[0.06] p-5">
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-danger">Risk</span>
                <p className="text-sm leading-relaxed text-bone/80">{r.threat}</p>
              </div>
              <div className="flex items-start gap-3 bg-gold/[0.05] p-5">
                <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">Answer</span>
                <p className="text-sm leading-relaxed text-bone/85">{r.mitigation}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
