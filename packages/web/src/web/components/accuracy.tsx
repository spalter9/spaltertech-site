import { motion } from "motion/react";
import { ShieldCheck, Fingerprint, FileAudio, Waves, Lock, type LucideIcon } from "lucide-react";

/**
 * "How accurate is it?" — the honest answer to the hardest diligence question.
 *
 * Accuracy here is not one percentage. It is certainty where provenance was
 * sealed at creation (a cryptographic proof, not a guess), and honest, layered
 * confidence everywhere else, with an explicit inconclusive band. Leading with
 * the sealed-provenance 100% is both the strongest number and the true one —
 * and stating the forensic layers plainly is what lets a finding survive a
 * challenge. The figures are consistent with the project's validation: file
 * forensics ~97% on original files, acoustic analysis robust on its own, and
 * the layered verdict in the high 90s on realistic material.
 */

type Layer = { n: string; icon: LucideIcon; k: string; d: string; note: string };

const LAYERS: Layer[] = [
  {
    n: "0",
    icon: ShieldCheck,
    k: "Watermark check",
    d: "When a generator's own watermark (Suno, SynthID, and the like) is present and licensed, it is decisive on its own.",
    note: "Decisive when present",
  },
  {
    n: "1",
    icon: FileAudio,
    k: "File forensics",
    d: "Sample rate and encoder pipeline read straight from the container — the fingerprint of how a file was actually made.",
    note: "~97% on original files",
  },
  {
    n: "2",
    icon: Waves,
    k: "Acoustic forensics",
    d: "Per-stem measurement of the physical traces of a human performance — pitch jitter, micro-timing, room, top-octave air.",
    note: "Robust · the honest floor",
  },
  {
    n: "3",
    icon: Lock,
    k: "Cryptographic seal",
    d: "Once a work is examined, the finding is sealed to the file — so it is proven once and never has to be re-argued.",
    note: "Proven, not re-litigated",
  },
];

export function AccuracyStory() {
  return (
    <div className="mt-8 space-y-10">
      <p className="max-w-3xl leading-relaxed text-muted">
        It isn&rsquo;t one number. It&rsquo;s <span className="text-bone">certainty where it exists</span>,
        and honest, layered confidence everywhere else — because a tool that overstates what it knows
        does not survive the Copyright Office, and one that says &ldquo;inconclusive&rdquo; when it
        genuinely can&rsquo;t tell is the one a court trusts.
      </p>

      {/* Two regimes */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-verified/40 bg-verified/[0.06] p-7"
        >
          <div className="flex items-center gap-3">
            <Fingerprint size={20} className="text-verified" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verified">
              Sealed at the source
            </p>
          </div>
          <p className="mt-5 font-display text-5xl leading-none text-bone">100%</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-verified">
            Certainty, not confidence
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            For any work sealed at creation, a cryptographic record binds the authorship declaration
            to the recording. Verifying it is a math check — provenance is <span className="text-bone">proven,
            not inferred</span>. This is the number for your catalog going forward, and for every
            release sealed through the protocol.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-7"
        >
          <div className="flex items-center gap-3">
            <Waves size={20} className="text-gold" />
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
              Unsealed &amp; legacy
            </p>
          </div>
          <p className="mt-5 font-display text-5xl leading-none text-bone">
            High-90s<span className="align-top text-2xl text-gold">*</span>
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
            Layered forensic confidence
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            No single test is perfect on a finished record, so four independent layers are stacked and
            the confidence is reported honestly. <span className="text-bone">*</span> on realistic
            material, with an explicit <span className="text-bone">inconclusive band</span> for the
            genuinely ambiguous — never a forced answer.
          </p>
        </motion.div>
      </div>

      {/* The four layers */}
      <div>
        <p className="eyebrow">Four independent layers</p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-obsidian-line sm:grid-cols-2">
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="flex flex-col bg-obsidian p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <l.icon size={18} className="text-gold" />
                  <span className="font-mono text-xs text-gold">Tier {l.n}</span>
                </div>
                <span className="rounded-full border border-obsidian-line px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  {l.note}
                </span>
              </div>
              <h4 className="mt-3 font-display text-xl leading-tight text-bone">{l.k}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{l.d}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* The line that wins the room */}
      <div className="flex items-start gap-4 border-l-2 border-gold/50 bg-obsidian-raised/40 px-6 py-6">
        <ShieldCheck size={20} className="mt-1 shrink-0 text-gold" />
        <p className="max-w-3xl font-display text-lg leading-snug text-bone md:text-xl">
          We don&rsquo;t sell certainty we don&rsquo;t have. We give you certainty where it exists —
          everything sealed at the source — and honest, layered confidence everywhere else. That
          candor is exactly what makes a finding hold up when it is challenged.
        </p>
      </div>
    </div>
  );
}
