import { useMemo, useState } from "react";
import { Clapperboard, FileAudio, Fingerprint, Landmark, Link2, ScrollText, Upload } from "lucide-react";
import { formatUsd, mockAssetHash, truncateHash } from "../../../lib/engine-format";
import { FILM_SPLIT } from "../../../lib/engine-data";
import { SectionCard } from "../section-card";
import { Donut } from "../viz";

export function FilmModule() {
  const [gross, setGross] = useState(2_500_000);
  const [fingerprint, setFingerprint] = useState("cue://orchestra-night-scene-04");
  const [verified, setVerified] = useState(false);

  const distributions = useMemo(
    () =>
      FILM_SPLIT.map((row) => ({
        ...row,
        amount: gross * row.pct,
      })),
    [gross],
  );

  const chainHash = useMemo(
    () => mockAssetHash(`cue|${fingerprint}|${gross}`),
    [fingerprint, gross],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard
        title="Sync Licensing & Cue-Sheet Router"
        subtitle="Box office / streaming gross distributed across talent and treasuries."
        glow
      >
        <label className="block text-sm text-muted">
          Production gross (USD)
          <input
            type="number"
            min={0}
            step={1000}
            value={gross}
            onChange={(e) => setGross(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-3.5 py-2.5 font-display text-lg text-bone outline-none transition focus:border-gold/45"
          />
        </label>

        <div className="mt-5 rounded-2xl border border-obsidian-line bg-obsidian/40 p-5">
          <Donut
            slices={distributions.map((d) => ({ label: d.role, value: d.amount }))}
            top={formatUsd(gross, 0)}
            bottom="production gross"
          />
        </div>

        <ul className="mt-4 space-y-2.5">
          {distributions.map((row) => (
            <li key={row.role} className="rounded-xl border border-obsidian-line bg-obsidian/35 px-3.5 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm text-bone">{row.role}</span>
                <span className="font-display text-sm text-bone">{formatUsd(row.amount, 0)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-obsidian-raised">
                <div
                  className={[
                    "h-full rounded-full transition-all duration-300",
                    row.accent === "gold"
                      ? "bg-gold"
                      : row.accent === "verified"
                        ? "bg-verified"
                        : "bg-bone/70",
                  ].join(" ")}
                  style={{ width: `${row.pct * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{Math.round(row.pct * 100)}% of gross</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Interactive Cue Sheet Verifier"
        subtitle="Inspect audio/video fingerprint with cryptographic chain-of-title."
      >
        <label className="block text-sm text-muted">
          Fingerprint / cue reference
          <input
            value={fingerprint}
            onChange={(e) => {
              setFingerprint(e.target.value);
              setVerified(false);
            }}
            className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-3.5 py-2.5 font-mono text-sm text-bone outline-none transition focus:border-gold/45"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFingerprint(`cue://upload-${Date.now().toString(36)}`);
              setVerified(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-raised/70 px-3.5 py-2.5 text-sm text-muted transition hover:border-gold/35 hover:text-gold"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Simulate Upload
          </button>
          <button
            type="button"
            onClick={() => setVerified(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-3.5 py-2.5 text-sm font-semibold text-obsidian transition hover:opacity-90"
          >
            <FileAudio className="h-4 w-4" aria-hidden />
            Verify Chain-of-Title
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-obsidian-line bg-obsidian/50 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <Link2 className="h-3.5 w-3.5 text-gold" aria-hidden />
            Chain hash
          </div>
          <p className="break-all font-mono text-xs text-gold sm:text-sm">
            {truncateHash(chainHash, 18)}
          </p>
          {verified && (
            <p role="status" className="mt-3 text-sm text-verified">
              Cue sheet verified · Title chain intact · Sync license eligible
            </p>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-obsidian-line bg-obsidian/40 p-5">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Chain of title</p>
          <div className="flex items-center">
            {[
              { icon: Fingerprint, label: "Fingerprint" },
              { icon: Clapperboard, label: "Cue" },
              { icon: ScrollText, label: "License" },
              { icon: Landmark, label: "Treasury" },
            ].map((n, i, arr) => (
              <div key={n.label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={[
                      "grid h-12 w-12 place-items-center rounded-2xl border transition-all duration-500",
                      verified
                        ? "border-verified/60 bg-verified/15 text-verified shadow-[0_0_24px_-6px_rgba(52,211,153,0.8)]"
                        : "border-obsidian-line bg-obsidian-raised text-muted",
                    ].join(" ")}
                    style={{ transitionDelay: verified ? `${i * 160}ms` : "0ms" }}
                  >
                    <n.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">{n.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="relative mx-2 mb-6 h-px flex-1 overflow-hidden bg-obsidian-line">
                    <div
                      className="absolute inset-y-0 left-0 bg-verified transition-all duration-500"
                      style={{ width: verified ? "100%" : "0%", transitionDelay: verified ? `${i * 160 + 120}ms` : "0ms" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
