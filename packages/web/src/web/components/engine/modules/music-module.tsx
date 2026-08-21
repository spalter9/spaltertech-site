import { useMemo, useState } from "react";
import { AudioWaveform, Banknote, Headphones, Zap } from "lucide-react";
import { formatNumber, formatUsd } from "../../../lib/engine-format";
import { MUSIC_TRACKS } from "../../../lib/engine-data";
import { SectionCard } from "../section-card";

const STEMS = ["Vocals", "Drums", "Bass", "Synths", "Ambience"] as const;

export function MusicModule() {
  const [activeStem, setActiveStem] = useState<(typeof STEMS)[number]>("Vocals");
  const [spatial, setSpatial] = useState(0.65);
  const [lightningBurst, setLightningBurst] = useState(0);

  const libraryEarnings = useMemo(
    () => MUSIC_TRACKS.reduce((sum, track) => sum + track.streams * track.perStream, 0),
    [],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard
        title="Layer-2 Lightning Micropayments"
        subtitle="Per-stream settlements route in real time across the rights library."
        glow
        action={
          <button
            type="button"
            onClick={() => setLightningBurst((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Fire stream burst
          </button>
        }
      >
        <div className="mb-4 rounded-xl border border-verified/25 bg-verified/8 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Artists Forward debt-waiver
              </p>
              <p className="font-display text-lg text-verified">Balance: $0.00</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-verified/35 bg-obsidian/40 px-2.5 py-1 text-xs font-medium text-verified">
              <Banknote className="h-3.5 w-3.5" aria-hidden />
              Active Cash-Out enabled
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-obsidian-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-obsidian-raised/80 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-3 py-2.5 font-medium">Track</th>
                <th className="px-3 py-2.5 font-medium">ISRC</th>
                <th className="px-3 py-2.5 font-medium">Streams</th>
                <th className="px-3 py-2.5 font-medium">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {MUSIC_TRACKS.map((track) => (
                <tr key={track.id} className="border-t border-obsidian-line">
                  <td className="px-3 py-2.5 text-bone">{track.title}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gold">{track.isrc}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {formatNumber(track.streams + lightningBurst * 120)}
                  </td>
                  <td className="px-3 py-2.5 font-display text-verified">
                    {formatUsd(
                      track.streams * track.perStream + lightningBurst * 120 * track.perStream,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Library accrued:{" "}
          <span className="font-display text-bone">
            {formatUsd(libraryEarnings + lightningBurst * 120 * 0.004)}
          </span>
        </p>
      </SectionCard>

      <SectionCard
        title="Stem Isolation & 3D Spatial Preview"
        subtitle="Preview isolated stems with spatial depth control."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {STEMS.map((stem) => (
            <button
              key={stem}
              type="button"
              onClick={() => setActiveStem(stem)}
              className={[
                "rounded-lg border px-3 py-1.5 text-sm transition",
                activeStem === stem
                  ? "border-gold/45 bg-gold/10 text-gold"
                  : "border-obsidian-line text-muted hover:border-gold/30 hover:text-bone",
              ].join(" ")}
            >
              {stem}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-obsidian-line bg-obsidian/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-bone">
            <AudioWaveform className="h-4 w-4 text-gold" aria-hidden />
            Isolating: <span className="font-semibold">{activeStem}</span>
          </div>
          <div className="mb-4 flex h-16 items-end gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gold/70"
                style={{
                  height: `${20 + ((i * 17 + activeStem.length * 9) % 70)}%`,
                  opacity: 0.35 + (i % 5) * 0.12,
                }}
              />
            ))}
          </div>

          <label className="block text-sm text-muted">
            <span className="mb-2 inline-flex items-center gap-2">
              <Headphones className="h-4 w-4 text-gold" aria-hidden />
              Spatial depth ({Math.round(spatial * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={spatial}
              onChange={(e) => setSpatial(Number(e.target.value))}
              className="mt-2 w-full accent-gold"
              aria-valuetext={`${Math.round(spatial * 100)} percent spatial depth`}
            />
          </label>
        </div>
      </SectionCard>
    </div>
  );
}
