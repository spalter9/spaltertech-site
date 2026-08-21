import { ArrowLeft, Radio } from "lucide-react";
import { useGatewayOptional } from "../root-passcode-lock";

export function EngineHeader() {
  const gateway = useGatewayOptional();

  return (
    <header className="flex flex-col gap-4 border-b border-obsidian-line pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10"
          aria-hidden
        >
          <span className="font-mono text-xs font-bold tracking-wider text-gold">SSP</span>
        </div>
        <div>
          <p className="font-display text-lg leading-snug tracking-tight text-bone sm:text-xl md:text-2xl">
            Spalter Tech <span className="text-muted">//</span>{" "}
            Sovereign Sign Protocol Master Engine
            <sup className="ml-1 align-super font-mono text-[0.4em] text-gold">TM</sup>
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted sm:text-sm">
            <Radio className="h-3.5 w-3.5 text-verified" aria-hidden />
            Multi-Industry Settlement · Live Protocol Mesh
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {gateway && (
          <>
            <button
              type="button"
              onClick={gateway.returnToPortals}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-obsidian-line bg-obsidian-raised/70 px-3 py-2 text-sm text-muted transition-colors hover:border-gold/40 hover:text-gold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Portal Selection
            </button>
            <button
              type="button"
              onClick={gateway.lockSignOut}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-obsidian-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-danger/40 hover:text-danger"
            >
              Lock / Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
