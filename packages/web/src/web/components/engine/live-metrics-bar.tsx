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

const SPARK: Record<string, number[]> = {
  volume: [8, 11, 9, 14, 13, 18, 16, 22, 21, 27, 30, 34],
  irs: [5, 6, 8, 7, 11, 12, 14, 13, 17, 19, 22, 25],
  nodes: [20, 20, 21, 23, 23, 24, 26, 26, 27, 29, 29, 31],
  latency: [30, 26, 28, 22, 24, 19, 20, 16, 17, 14, 15, 12],
};

function Sparkline({ id, accent }: { id: string; accent: LiveMetric["accent"] }) {
  const pts = SPARK[id] ?? SPARK.volume;
  const w = 120;
  const h = 36;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const color = accent === "verified" ? "#34d399" : "#8fe9ff";
  const gid = `spark-${id}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="spark-draw" />
      <circle cx={xy[xy.length - 1][0] - 1.5} cy={xy[xy.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

function MetricCard({ metric }: { metric: LiveMetric }) {
  const Icon = ICONS[metric.id as keyof typeof ICONS] ?? Activity;
  return (
    <div className="card-surface rounded-2xl px-5 py-4 hover:-translate-y-0.5">
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
      <p className="font-sora text-xl font-semibold tabular-nums tracking-tight text-bone sm:text-2xl">{metric.value}</p>
      {metric.hint && <p className="mt-1 text-xs text-gold-bright/90">{metric.hint}</p>}
      <div className="mt-3 -mb-1">
        <Sparkline id={metric.id} accent={metric.accent} />
      </div>
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
