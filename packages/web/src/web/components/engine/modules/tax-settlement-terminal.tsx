import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  Landmark,
  Wallet,
} from "lucide-react";
import { formatUsd, mockAssetHash, truncateHash } from "../../../lib/engine-format";
import { SectionCard } from "../section-card";

const IRS_RATE = 0.25;

export function TaxSettlementTerminal() {
  const [gross, setGross] = useState(100);
  const [settled, setSettled] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const irs = useMemo(() => Number((gross * IRS_RATE).toFixed(2)), [gross]);
  const net = useMemo(() => Number((gross - irs).toFixed(2)), [gross, irs]);

  const receiptHash = useMemo(
    () => (receiptId ? mockAssetHash(`tax-receipt|${receiptId}|${gross}`) : null),
    [receiptId, gross],
  );

  const runSettlement = () => {
    setSettled(true);
    setReceiptId(`SSP-TAX-${Date.now().toString(36).toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Live Point-of-Sale Real-Time Tax Settlement Terminal"
        subtitle="Smart-contract auto-deduction wires IRS treasury in milliseconds — zero 1099 overhead."
        glow
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <label className="block text-sm text-muted">
              Gross transaction amount
              <div className="mt-2 flex items-center gap-3">
                <span className="font-display text-3xl text-bone">{formatUsd(gross)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10000}
                step={1}
                value={gross}
                onChange={(e) => {
                  setGross(Number(e.target.value));
                  setSettled(false);
                  setReceiptId(null);
                }}
                className="mt-4 w-full accent-gold"
                aria-valuetext={formatUsd(gross)}
              />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>$1.00</span>
                <span>$5,000.00</span>
                <span>$10,000.00</span>
              </div>
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {[100, 500, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setGross(preset);
                    setSettled(false);
                    setReceiptId(null);
                  }}
                  className="rounded-lg border border-obsidian-line px-3 py-1.5 text-sm text-muted transition hover:border-gold/40 hover:text-gold"
                >
                  {formatUsd(preset, 0)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={runSettlement}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold via-gold-bright to-verified px-4 py-3.5 text-sm font-semibold text-obsidian transition hover:opacity-90 sm:w-auto"
            >
              <Landmark className="h-4 w-4" aria-hidden />
              Execute Instant Settlement
            </button>
          </div>

          <div className="space-y-3" aria-live="polite">
            <FlowStep
              icon={<ArrowDownToLine className="h-4 w-4" />}
              label="Gross Transaction Inflow"
              value={formatUsd(gross)}
              status="CAPTURED"
              accent="gold"
              active
            />
            <div className="mx-auto h-6 w-px bg-gradient-to-b from-gold to-gold-bright" />
            <FlowStep
              icon={<Landmark className="h-4 w-4" />}
              label="Smart Contract → IRS Treasury"
              value={formatUsd(irs)}
              status={settled ? "SETTLED IN 8ms" : "PENDING"}
              accent="gold"
              active={settled}
            />
            <div className="mx-auto h-6 w-px bg-gradient-to-b from-gold-bright to-verified" />
            <FlowStep
              icon={<Wallet className="h-4 w-4" />}
              label="Net Clean Liquidity → Creator/Studio"
              value={formatUsd(net)}
              status={settled ? "INSTANTLY ACCESSIBLE" : "HELD"}
              accent="verified"
              active={settled}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cryptographic Tax Receipt"
        subtitle="Zero-liability immutable audit proof — eradicates 1099 filing overhead."
      >
        {receiptId && receiptHash ? (
          <div className="rounded-xl border border-verified/30 bg-verified/8 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-verified">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <span className="font-display font-semibold">Receipt issued</span>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Receipt ID</dt>
                <dd className="font-mono text-bone">{receiptId}</dd>
              </div>
              <div>
                <dt className="text-muted">IRS remittance</dt>
                <dd className="font-display text-gold">{formatUsd(irs)}</dd>
              </div>
              <div>
                <dt className="text-muted">Net to payee</dt>
                <dd className="font-display text-verified">{formatUsd(net)}</dd>
              </div>
              <div>
                <dt className="text-muted">Liability status</dt>
                <dd className="text-verified">ZERO — Auto-settled</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Immutable audit proof</dt>
                <dd className="mt-1 break-all font-mono text-xs text-gold sm:text-sm">
                  {truncateHash(receiptHash, 20)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-obsidian-line bg-obsidian/40 px-4 py-5 text-sm text-muted">
            <FileText className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            Execute a settlement to mint a cryptographic tax receipt with zero-liability audit
            proof.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function FlowStep({
  icon,
  label,
  value,
  status,
  accent,
  active,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: string;
  accent: "gold" | "verified";
  active?: boolean;
}) {
  const colors = {
    gold: { border: "border-gold/35 text-gold", icon: "text-gold" },
    verified: { border: "border-verified/35 text-verified", icon: "text-verified" },
  };

  return (
    <div
      className={[
        "rounded-xl border px-4 py-3 transition-all duration-300",
        active ? `${colors[accent].border} bg-obsidian/50` : "border-obsidian-line bg-obsidian/30 text-muted",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className={active ? colors[accent].icon : "text-muted"}>{icon}</span>
        {label}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="font-display text-xl text-bone">{value}</p>
        <span
          className={[
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
            active ? colors[accent].border : "border-obsidian-line text-muted",
          ].join(" ")}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
