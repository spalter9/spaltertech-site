import { useEffect, useState, type ReactNode } from "react";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { formatUsd } from "../../lib/engine-format";
import { GamingModule } from "./gaming-module";
import { FilmModule } from "./film-module";
import { MusicModule } from "./music-module";
import { AiLicensingModule } from "./ai-licensing-module";
import { TaxSettlementTerminal } from "./tax-settlement-terminal";

type JobStatus = "queued" | "running" | "settled";

type ParallelJob = {
  id: string;
  industry: string;
  action: string;
  amount: number;
  status: JobStatus;
};

const SEED_JOBS: Omit<ParallelJob, "status">[] = [
  { id: "j1", industry: "Games", action: "UGC skin royalty split", amount: 4.99 },
  { id: "j2", industry: "Film", action: "Sync cue-sheet settle", amount: 125000 },
  { id: "j3", industry: "Music", action: "Lightning micropayment burst", amount: 842.3 },
  { id: "j4", industry: "AI / DIL", action: "Per-prompt royalty meter", amount: 0.002 },
  { id: "j5", industry: "Tax", action: "IRS auto-withholding", amount: 25 },
  { id: "j6", industry: "Games", action: "Mod creator payout", amount: 1.25 },
  { id: "j7", industry: "Music", action: "Stem provenance embed", amount: 0 },
  { id: "j8", industry: "Film", action: "Treasury remittance", amount: 50000 },
];

/**
 * Multitask mode — all industry rails live at once, with a concurrent
 * settlement feed simulating parallel protocol jobs across verticals.
 */
export function MultitaskModule() {
  const [jobs, setJobs] = useState<ParallelJob[]>(() =>
    SEED_JOBS.map((j, i) => ({
      ...j,
      status: i < 2 ? "running" : i < 4 ? "queued" : "settled",
    })),
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
      setJobs((prev) => {
        const next = prev.map((job) => {
          if (job.status === "running" && Math.random() > 0.55) {
            return { ...job, status: "settled" as const };
          }
          if (job.status === "queued" && Math.random() > 0.65) {
            return { ...job, status: "running" as const };
          }
          return job;
        });
        // Recycle a settled job back into the queue for continuous multitask feel
        if (Math.random() > 0.7) {
          const settledIdx = next.findIndex((j) => j.status === "settled");
          if (settledIdx >= 0) {
            const recycled = SEED_JOBS[tick % SEED_JOBS.length]!;
            next[settledIdx] = {
              ...recycled,
              id: `${recycled.id}-${Date.now().toString(36)}`,
              status: "queued",
            };
          }
        }
        return [...next];
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, [tick]);

  const running = jobs.filter((j) => j.status === "running").length;
  const settled = jobs.filter((j) => j.status === "settled").length;

  return (
    <div className="space-y-6">
      <div className="card-surface rounded-2xl border-gold/30 p-5 sm:p-6 shadow-[0_0_40px_-18px_rgba(197,160,89,0.45)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Multitask · Concurrent Rails</p>
            <h3 className="mt-1 font-display text-xl text-bone sm:text-2xl">
              All industries settling in parallel
            </h3>
            <p className="mt-1 text-sm text-muted">
              Games, Film, Music, AI licensing, and IRS tax run as concurrent protocol jobs —
              no sequential handoff.
            </p>
          </div>
          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-gold">
              {running} running
            </span>
            <span className="rounded-lg border border-verified/35 bg-verified/10 px-2.5 py-1.5 text-verified">
              {settled} settled
            </span>
          </div>
        </div>

        <ul className="space-y-2" aria-live="polite" aria-label="Parallel settlement jobs">
          {jobs.map((job) => (
            <li
              key={job.id}
              className={[
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 transition-all duration-300",
                job.status === "running"
                  ? "border-gold/30 bg-gold/5"
                  : job.status === "settled"
                    ? "border-verified/25 bg-verified/5"
                    : "border-obsidian-line bg-obsidian/40",
              ].join(" ")}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {job.status === "running" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" aria-hidden />
                ) : job.status === "settled" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-verified" aria-hidden />
                ) : (
                  <Activity className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm text-bone">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
                      {job.industry}
                    </span>{" "}
                    · {job.action}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {job.amount > 0 && (
                  <span className="font-display text-sm text-bone">{formatUsd(job.amount, job.amount < 1 ? 3 : 2)}</span>
                )}
                <span
                  className={[
                    "rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide",
                    job.status === "running"
                      ? "border-gold/40 text-gold"
                      : job.status === "settled"
                        ? "border-verified/40 text-verified"
                        : "border-obsidian-line text-muted",
                  ].join(" ")}
                >
                  {job.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-8">
        <Rail title="01 · Video Games & Virtual Economies">
          <GamingModule />
        </Rail>
        <Rail title="02 · Film, Television & Streaming">
          <FilmModule />
        </Rail>
        <Rail title="03 · Music & Spatial Audio">
          <MusicModule />
        </Rail>
        <Rail title="04 · Generative AI & Data Licensing">
          <AiLicensingModule />
        </Rail>
        <Rail title="05 · IRS Tax Settlement Terminal">
          <TaxSettlementTerminal />
        </Rail>
      </div>
    </div>
  );
}

function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{title}</h4>
      {children}
    </section>
  );
}
