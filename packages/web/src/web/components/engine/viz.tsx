import type { ReactNode } from "react";

export const VIZ_COLORS = ["#6d8bff", "#8fe9ff", "#8f5bff", "#34d399", "#f5c451"] as const;

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

/** Animated donut chart — slices ease to their new sizes whenever values change. */
export function Donut({
  slices,
  size = 168,
  thickness = 16,
  top,
  bottom,
  legend = true,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  top?: ReactNode;
  bottom?: ReactNode;
  legend?: boolean;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div
          className="absolute inset-2 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, rgba(109,139,255,0.35), transparent 70%)" }}
          aria-hidden
        />
        <svg viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" role="img" aria-label="Distribution chart">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2540" strokeWidth={thickness} />
          {slices.map((s, i) => {
            const len = Math.max(0, (Math.max(0, s.value) / total) * c - gap);
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color ?? VIZ_COLORS[i % VIZ_COLORS.length]}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.22,1,0.36,1), stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
              />
            );
            offset += (Math.max(0, s.value) / total) * c;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {top && <div className="font-sora text-lg font-semibold tabular-nums text-bone">{top}</div>}
          {bottom && <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{bottom}</div>}
        </div>
      </div>
      {legend && (
        <ul className="w-full min-w-0 flex-1 space-y-1.5">
          {slices.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.color ?? VIZ_COLORS[i % VIZ_COLORS.length], boxShadow: `0 0 10px ${s.color ?? VIZ_COLORS[i % VIZ_COLORS.length]}` }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="font-mono tabular-nums text-bone/80">{Math.round((s.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Vertical pipe between flow steps; packets stream down it while `active`. */
export function FlowPipe({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto h-9 w-px" aria-hidden>
      <div className={`absolute inset-0 ${active ? "bg-gold-bright/60" : "bg-obsidian-line"} transition-colors duration-500`} />
      {active &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="flow-packet absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold-bright"
            style={{ animationDelay: `${i * 0.35}s`, boxShadow: "0 0 12px #8fe9ff" }}
          />
        ))}
    </div>
  );
}
