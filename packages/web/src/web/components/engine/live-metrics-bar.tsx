import { Activity, Clock3, Landmark, Network } from "lucide-react";
import { LIVE_METRICS, type LiveMetric } from "../../lib/engine-data";

const ICONS = {
  volume: Activity,
  irs: Landmark,
  nodes: Network,
  latency: Clock3,
} as const;

const ACCENT = {
  gold: "text-gold border-gold/25 bg-gold/8",
  verified: "text-verified border-verified/25 bg-verified/8",
  bone: "text-bone border-obsidian-line bg-obsidian-raised",
} as const;

function MetricCard({ metric }: { metric: LiveMetric }) {
  const Icon = ICONS[metric.id as keyof typeof ICONS] ?? Activity;
  return (
    <div className="card-surface rounded-xl px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${ACCENT[metric.accent]}`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {metric.label}
        </p>
      </div>
      <p className="font-display text-xl sm:text-2xl tracking-tight text-bone">{metric.value}</p>
      {metric.hint && <p className="mt-1 text-xs text-gold/90">{metric.hint}</p>}
    </div>
  );
}

export function LiveMetricsBar() {
  return (
    <section aria-label="Live protocol metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {LIVE_METRICS.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}
