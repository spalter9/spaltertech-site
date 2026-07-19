import { useMemo, useState } from "react";
import { RevenueChart } from "./revenue-chart";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Pro Forma estimator — driven by the Month 1 verified model. */
export function ProForma() {
  const [attestations, setAttestations] = useState(250_000);
  const [attFee, setAttFee] = useState(0.05);
  const [nodes, setNodes] = useState(10);
  const [nodeFee, setNodeFee] = useState(499);
  const [growth, setGrowth] = useState(15); // % MoM
  const [months, setMonths] = useState(12);

  const cogsPerTx = 0.008;
  const opexDev = 8500;
  const opexMktg = 3500;

  const projection = useMemo(() => {
    const rows = [];
    let att = attestations;
    let nd = nodes;
    for (let m = 1; m <= months; m++) {
      const rev = att * attFee + nd * nodeFee;
      const cogs = att * cogsPerTx;
      const gross = rev - cogs;
      const opex = opexDev + opexMktg;
      const noi = gross - opex;
      rows.push({ m, att, rev, cogs, gross, opex, noi });
      att = Math.round(att * (1 + growth / 100));
      nd = Math.round(nd * (1 + growth / 200)); // nodes grow slower
    }
    return rows;
  }, [attestations, attFee, nodes, nodeFee, growth, months]);

  const totals = useMemo(
    () => projection.reduce((a, r) => ({ rev: a.rev + r.rev, noi: a.noi + r.noi }), { rev: 0, noi: 0 }),
    [projection],
  );
  const m1 = projection[0]!;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      {/* Inputs */}
      <div className="card-surface p-6 space-y-5">
        <p className="eyebrow">Assumptions</p>
        <Slider label="Month 1 attestations" value={attestations} min={50_000} max={1_000_000} step={10_000} onChange={setAttestations} display={attestations.toLocaleString()} />
        <Slider label="Fee / attestation" value={attFee} min={0.02} max={0.2} step={0.01} onChange={setAttFee} display={`$${attFee.toFixed(2)}`} />
        <Slider label="Enterprise nodes" value={nodes} min={1} max={200} step={1} onChange={setNodes} display={String(nodes)} />
        <Slider label="Node license / mo" value={nodeFee} min={199} max={1999} step={50} onChange={setNodeFee} display={`$${nodeFee}`} />
        <Slider label="MoM growth" value={growth} min={0} max={40} step={1} onChange={setGrowth} display={`${growth}%`} />
        <Slider label="Horizon (months)" value={months} min={3} max={36} step={1} onChange={setMonths} display={`${months} mo`} />
      </div>

      {/* Output */}
      <div className="space-y-6">
        <div className="grid sm:grid-cols-4 gap-px bg-obsidian-line">
          <Kpi label="Month 1 revenue" value={fmt(m1.rev)} />
          <Kpi label="Month 1 NOI" value={fmt(m1.noi)} accent={m1.noi >= 0} />
          <Kpi label={`${months}-mo revenue`} value={fmt(totals.rev)} />
          <Kpi label={`${months}-mo NOI`} value={fmt(totals.noi)} accent={totals.noi >= 0} />
        </div>

        <RevenueChart data={projection.map((r) => ({ m: r.m, rev: r.rev, noi: r.noi }))} />

        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-gold border-b border-obsidian-line">
                  {["Mo", "Attestations", "Revenue", "COGS", "Gross", "OpEx", "Net Op. Income"].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 uppercase tracking-[0.12em] text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projection.map((r, i) => (
                  <tr key={r.m} className={i % 2 ? "bg-obsidian-raised/40" : ""}>
                    <td className="px-4 py-2.5 text-muted">{r.m}</td>
                    <td className="px-4 py-2.5">{Math.round(r.att).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{fmt(r.rev)}</td>
                    <td className="px-4 py-2.5 text-muted">{fmt(r.cogs)}</td>
                    <td className="px-4 py-2.5">{fmt(r.gross)}</td>
                    <td className="px-4 py-2.5 text-muted">{fmt(r.opex)}</td>
                    <td className={`px-4 py-2.5 ${r.noi >= 0 ? "text-verified" : "text-danger"}`}>{fmt(r.noi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="font-mono text-[10px] text-muted">
          Model seeded from the Month 1 verified pro forma. COGS ${cogsPerTx}/settlement · OpEx ${(opexDev + opexMktg).toLocaleString()}/mo fixed. Year-3 target: $45M–$60M ARR.
        </p>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
        <span className="font-mono text-xs text-gold">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-gold"
      />
    </label>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-obsidian p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className={`font-display text-2xl mt-1 ${accent ? "text-verified" : "text-bone"}`}>{value}</div>
    </div>
  );
}
