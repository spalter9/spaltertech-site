import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Copy, Plus, Scale, Trash2 } from "lucide-react";
import { Nav } from "../components/nav";
import {
  MAX_RECIPIENTS,
  SPLIT_ROLES,
  TOTAL_BPS,
  bpsToPercent,
  distributeEvenly,
  percentToBps,
  toContractArgs,
  toSplitSheetJson,
  validateSplitSheet,
  type SplitRole,
  type SplitRow,
} from "../lib/split-sheet";

/**
 * Split-sheet builder.
 *
 * Deliberately not a generic form: it validates against the exact rules
 * `SovereignSignRegistry.stamp()` enforces, so a sheet that shows green here
 * is one the contract will accept. Everything it reports — the 64-recipient
 * ceiling, the zero-share rejection, integer basis points — is the contract's
 * behaviour rather than a house style choice.
 */

function newRow(): SplitRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "Songwriter",
    wallet: "",
    bps: 0,
  };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold transition hover:bg-gold/15"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function SplitSheet() {
  const [title, setTitle] = useState("");
  const [isrc, setIsrc] = useState("");
  const [rows, setRows] = useState<SplitRow[]>([newRow()]);
  /** What the user typed, kept separate so "33.3" isn't rewritten mid-keystroke. */
  const [shareText, setShareText] = useState<Record<string, string>>({});

  const validation = useMemo(() => validateSplitSheet(rows), [rows]);
  const args = useMemo(() => toContractArgs(rows), [rows]);

  const update = (id: string, patch: Partial<SplitRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const setShare = (id: string, raw: string) => {
    setShareText((prev) => ({ ...prev, [id]: raw }));
    const bps = percentToBps(raw);
    update(id, { bps: bps ?? 0 });
  };

  const splitEvenly = () => {
    const shares = distributeEvenly(rows.length);
    setRows((prev) => prev.map((r, i) => ({ ...r, bps: shares[i] ?? 0 })));
    setShareText(
      Object.fromEntries(rows.map((r, i) => [r.id, bpsToPercent(shares[i] ?? 0)])),
    );
  };

  const issuesFor = (id: string) =>
    validation.issues.filter((i) => i.rowId === id && i.severity === "error");
  const sheetIssues = validation.issues.filter((i) => !i.rowId);

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 25% -10%, rgba(197,160,89,0.10), transparent 55%)",
          }}
        />

        <div className="relative mx-auto max-w-[1100px] px-6 py-14 md:py-18">
          <p className="eyebrow">Tools</p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06]"
          >
            Split sheet
          </motion.h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Record who owns what, and get back the exact arguments the Sovereign Sign
            Registry takes. Validation here is the contract&rsquo;s own: shares are whole
            basis points totalling 10,000, nobody holds zero, no address repeats, and
            there is a hard ceiling of {MAX_RECIPIENTS} recipients.
          </p>

          {/* Work */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Work title
              </span>
              <input
                value={title}
                aria-label="Work title"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled"
                className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none transition-colors focus:border-gold/45"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                ISRC (optional)
              </span>
              <input
                value={isrc}
                aria-label="ISRC"
                onChange={(e) => setIsrc(e.target.value)}
                placeholder="US-SPA-26-00000"
                className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 font-mono text-sm text-bone outline-none transition-colors focus:border-gold/45"
              />
            </label>
          </div>

          {/* Contributors */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Contributors</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={splitEvenly}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-obsidian-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-gold/40 hover:text-gold disabled:opacity-40"
              >
                <Scale className="h-3.5 w-3.5" /> Split evenly
              </button>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, newRow()])}
                disabled={rows.length >= MAX_RECIPIENTS}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold transition hover:bg-gold/15 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add contributor
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((row, index) => {
              const errors = issuesFor(row.id);
              const isLast = index === rows.length - 1;
              return (
                <div
                  key={row.id}
                  className={`rounded-xl border bg-obsidian/40 p-4 ${
                    errors.length ? "border-danger/40" : "border-obsidian-line"
                  }`}
                >
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1.6fr_auto_auto] md:items-end">
                    <label className="block">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Name
                      </span>
                      <input
                        value={row.name}
                        aria-label={`Contributor ${index + 1} name`}
                        onChange={(e) => update(row.id, { name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 text-sm text-bone outline-none focus:border-gold/45"
                      />
                    </label>

                    <label className="block">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Role
                      </span>
                      <select
                        value={row.role}
                        aria-label={`Contributor ${index + 1} role`}
                        onChange={(e) => update(row.id, { role: e.target.value as SplitRole })}
                        className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 text-sm text-bone outline-none focus:border-gold/45"
                      >
                        {SPLIT_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Wallet
                      </span>
                      <input
                        value={row.wallet}
                        aria-label={`Contributor ${index + 1} wallet`}
                        onChange={(e) => update(row.id, { wallet: e.target.value })}
                        placeholder="0x…"
                        className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 font-mono text-[12px] text-bone outline-none focus:border-gold/45"
                      />
                    </label>

                    <label className="block md:w-24">
                      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                        Share %
                      </span>
                      <input
                        value={shareText[row.id] ?? (row.bps ? bpsToPercent(row.bps) : "")}
                        aria-label={`Contributor ${index + 1} share`}
                        onChange={(e) => setShare(row.id, e.target.value)}
                        inputMode="decimal"
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 text-right font-mono text-sm tabular-nums text-bone outline-none focus:border-gold/45"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                      aria-label={`Remove contributor ${index + 1}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-obsidian-line text-muted transition hover:border-danger/40 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-mono text-[10px] text-muted">
                      {row.bps.toLocaleString()} bps
                    </span>
                    {isLast && rows.length > 1 && (
                      <span className="font-mono text-[10px] text-gold/80">
                        last recipient — receives rounding dust on every payment
                      </span>
                    )}
                    {errors.map((e) => (
                      <span key={e.message} className="text-[11px] text-danger">
                        {e.message}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Running total */}
          <div className="mt-6 rounded-2xl border border-obsidian-line bg-obsidian/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-3xl tabular-nums text-bone">
                  {bpsToPercent(validation.totalBps)}%
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  of 100% allocated · {validation.totalBps.toLocaleString()} / {TOTAL_BPS.toLocaleString()} bps
                </span>
              </div>
              <span
                className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] ${
                  validation.valid
                    ? "border-verified/40 bg-verified/10 text-verified"
                    : "border-danger/40 bg-danger/10 text-danger"
                }`}
              >
                {validation.valid ? "Contract would accept" : "Contract would reject"}
              </span>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-obsidian-line">
              <div
                className={`h-full transition-all ${
                  validation.totalBps === TOTAL_BPS
                    ? "bg-verified"
                    : validation.totalBps > TOTAL_BPS
                      ? "bg-danger"
                      : "bg-gold"
                }`}
                style={{
                  width: `${Math.min(100, (validation.totalBps / TOTAL_BPS) * 100)}%`,
                }}
              />
            </div>

            {sheetIssues.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {sheetIssues.map((issue) => (
                  <li
                    key={issue.message}
                    className={`flex gap-2 text-[12px] leading-relaxed ${
                      issue.severity === "error" ? "text-danger" : "text-muted"
                    }`}
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contract call */}
          <div className="mt-8 rounded-2xl border border-gold/25 bg-gold/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Registry call</p>
                <h2 className="mt-1 font-display text-2xl text-bone">
                  stamp(bytes32, address[], uint16[])
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton
                  text={JSON.stringify(args.recipients)}
                  label="Copy recipients"
                />
                <CopyButton text={JSON.stringify(args.sharesBps)} label="Copy shares" />
                <CopyButton
                  text={toSplitSheetJson({ title, isrc, rows })}
                  label="Copy sheet JSON"
                />
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted">
              <span className="text-bone">trackHash</span> is the SHA-256 of the master —
              use the <span className="text-bone">payload_sha256</span> from its sealed
              manifest, which identifies the audio itself and survives any later metadata
              rewrite.
            </p>

            <pre className="mt-4 overflow-x-auto rounded-xl border border-obsidian-line bg-obsidian/70 p-4 font-mono text-[11px] leading-relaxed text-bone/90">
{`recipients = ${JSON.stringify(args.recipients, null, 2)}

sharesBps  = ${JSON.stringify(args.sharesBps)}`}
            </pre>

            <p className="mt-4 flex gap-2 text-[12px] leading-relaxed text-muted">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
              Splits are immutable once stamped. There is no update function — a
              correction means a new track hash. Check every address before you sign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
