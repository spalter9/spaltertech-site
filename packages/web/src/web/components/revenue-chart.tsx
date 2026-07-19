import { useMemo } from "react";
import { motion } from "motion/react";

export type ChartPoint = { m: number; rev: number; noi: number };

const fmtK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

/**
 * Climbing revenue / NOI area chart — pure SVG, animated draw-in.
 * Two stacked series: cumulative revenue (gold area) and net operating income (verified line).
 */
export function RevenueChart({ data }: { data: ChartPoint[] }) {
  const W = 960;
  const H = 300;
  const padL = 56;
  const padR = 20;
  const padT = 24;
  const padB = 34;

  const { revPath, revArea, noiPath, maxV, xs, dots } = useMemo(() => {
    const n = data.length;
    const maxRev = Math.max(...data.map((d) => d.rev), 1);
    const maxNoi = Math.max(...data.map((d) => Math.max(d.noi, 0)), 1);
    const maxV = Math.max(maxRev, maxNoi);
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
    const y = (v: number) => padT + innerH - (Math.max(v, 0) / maxV) * innerH;

    const revPts = data.map((d, i) => `${x(i)},${y(d.rev)}`);
    const noiPts = data.map((d, i) => `${x(i)},${y(d.noi)}`);
    const revPath = "M" + revPts.join(" L");
    const noiPath = "M" + noiPts.join(" L");
    const revArea = `${revPath} L${x(n - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;
    const xs = data.map((d, i) => ({ x: x(i), m: d.m }));
    const dots = data.map((d, i) => ({ x: x(i), y: y(d.rev), rev: d.rev }));
    return { revPath, revArea, noiPath, maxV, xs, dots };
  }, [data]);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Projected monthly revenue · climbing curve</span>
        <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.14em]">
          <span className="flex items-center gap-1.5 text-gold"><span className="w-3 h-[2px] bg-gold" /> Revenue</span>
          <span className="flex items-center gap-1.5 text-verified"><span className="w-3 h-[2px] bg-verified" /> Net income</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Projected monthly revenue chart">
        <defs>
          <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c5a059" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#c5a059" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + axis labels */}
        {gridLines.map((g) => {
          const yy = padT + (H - padT - padB) * (1 - g);
          return (
            <g key={g}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#1c1a16" strokeWidth={1} />
              <text x={padL - 8} y={yy + 3} textAnchor="end" className="fill-muted" style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}>
                {fmtK(maxV * g)}
              </text>
            </g>
          );
        })}

        {/* X labels (every other month to avoid crowding) */}
        {xs.map((p, i) => (
          (xs.length <= 12 || i % 2 === 0) && (
            <text key={p.m} x={p.x} y={H - 12} textAnchor="middle" className="fill-muted" style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}>
              M{p.m}
            </text>
          )
        ))}

        {/* Revenue area + line */}
        <motion.path d={revArea} fill="url(#revfill)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path d={revPath} fill="none" stroke="#c5a059" strokeWidth={2.2}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
        {/* NOI line */}
        <motion.path d={noiPath} fill="none" stroke="#5fb37a" strokeWidth={1.8} strokeDasharray="4 3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.2, ease: "easeInOut" }} />

        {/* End dot */}
        {dots.length > 0 && (
          <motion.circle cx={dots[dots.length - 1]!.x} cy={dots[dots.length - 1]!.y} r={4} fill="#e4c989"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, delay: 1.2 }} />
        )}
      </svg>
    </div>
  );
}
