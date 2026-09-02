/**
 * Split-sheet logic.
 *
 * Pure functions, no imports — the page is a thin shell over this, and the
 * invariant suite exercises it directly.
 *
 * The output is shaped for `SovereignSignRegistry.stamp()` (see
 * `contracts/SovereignSignRegistry.sol`), so the rules here are the
 * contract's rules, not preferences: shares are integer basis points that
 * must total exactly 10,000, no recipient may hold zero, no address may
 * repeat, and there is a hard ceiling of 64 recipients. A sheet that passes
 * validation here is one the contract will accept; a sheet that fails would
 * revert on-chain after the gas was spent.
 */

/** Basis points in a whole. The contract rejects any total that isn't this. */
export const TOTAL_BPS = 10_000;

/** `stamp()` reverts above this many recipients. */
export const MAX_RECIPIENTS = 64;

export type SplitRole =
  | "Songwriter"
  | "Producer"
  | "Featured Artist"
  | "Performer"
  | "Lyricist"
  | "Publisher"
  | "Master Owner";

export const SPLIT_ROLES: SplitRole[] = [
  "Songwriter",
  "Lyricist",
  "Producer",
  "Featured Artist",
  "Performer",
  "Publisher",
  "Master Owner",
];

export type SplitRow = {
  id: string;
  name: string;
  role: SplitRole;
  /** Polygon address that will receive settlement. */
  wallet: string;
  /** Integer basis points. 2,500 = 25%. */
  bps: number;
};

export type SplitIssue = {
  severity: "error" | "warning";
  message: string;
  /** Row this concerns, when it is row-specific. */
  rowId?: string;
};

export type SplitValidation = {
  /** True only when the contract would accept this sheet. */
  valid: boolean;
  totalBps: number;
  /** Signed distance from a whole, in bps. Negative means over-allocated. */
  remainingBps: number;
  issues: SplitIssue[];
};

/** `0x` followed by 40 hex characters. Checksum casing is not enforced. */
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value.trim());
}

/** Percent (as typed) to integer basis points, or null if unparseable. */
export function percentToBps(input: string): number | null {
  const trimmed = input.trim().replace(/%$/, "");
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  const bps = Math.round(value * 100);
  return bps;
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2).replace(/\.00$/, "");
}

/**
 * Split a whole into `count` shares as evenly as integer basis points allow.
 *
 * Three equal writers cannot each hold 33.33% — that totals 9,999 and the
 * contract rejects it. The remainder goes to the last share, which is also
 * where the contract sends payment dust, so the two behaviours agree.
 */
export function distributeEvenly(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(TOTAL_BPS / count);
  const shares: number[] = Array.from({ length: count }, () => base);
  shares[count - 1] = TOTAL_BPS - base * (count - 1);
  return shares;
}

export function validateSplitSheet(rows: SplitRow[]): SplitValidation {
  const issues: SplitIssue[] = [];
  const totalBps = rows.reduce((sum, r) => sum + (Number.isFinite(r.bps) ? r.bps : 0), 0);

  if (rows.length === 0) {
    issues.push({ severity: "error", message: "Add at least one contributor." });
  }

  if (rows.length > MAX_RECIPIENTS) {
    issues.push({
      severity: "error",
      message: `${rows.length} recipients exceeds the contract's limit of ${MAX_RECIPIENTS}.`,
    });
  }

  for (const row of rows) {
    if (!row.name.trim()) {
      issues.push({ severity: "warning", message: "Contributor has no name.", rowId: row.id });
    }
    if (!isAddressLike(row.wallet)) {
      issues.push({
        severity: "error",
        message: row.wallet.trim()
          ? "Not a valid wallet address — expected 0x followed by 40 hex characters."
          : "Missing wallet address.",
        rowId: row.id,
      });
    }
    if (!Number.isInteger(row.bps) || row.bps <= 0) {
      issues.push({
        severity: "error",
        message: "Share must be a positive whole number of basis points; the contract rejects a zero share.",
        rowId: row.id,
      });
    }
  }

  // Duplicate wallets would silently merge two people's income into one
  // balance, so the contract's own validation does not catch it — this does.
  const seen = new Map<string, string>();
  for (const row of rows) {
    const key = row.wallet.trim().toLowerCase();
    if (!isAddressLike(key)) continue;
    const first = seen.get(key);
    if (first) {
      issues.push({
        severity: "error",
        message: "Duplicate wallet address — two contributors cannot settle to the same address.",
        rowId: row.id,
      });
    } else {
      seen.set(key, row.id);
    }
  }

  if (rows.length > 0 && totalBps !== TOTAL_BPS) {
    const delta = TOTAL_BPS - totalBps;
    issues.push({
      severity: "error",
      message:
        delta > 0
          ? `Shares total ${bpsToPercent(totalBps)}% — ${bpsToPercent(delta)}% still unallocated.`
          : `Shares total ${bpsToPercent(totalBps)}% — over-allocated by ${bpsToPercent(-delta)}%.`,
    });
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    totalBps,
    remainingBps: TOTAL_BPS - totalBps,
    issues,
  };
}

export type ContractArgs = {
  recipients: string[];
  sharesBps: number[];
};

/**
 * The two arrays `stamp()` takes, in row order.
 *
 * Order is not cosmetic: the contract pays integer-division remainder to the
 * final recipient, so whoever is last collects rounding dust across every
 * payment. Put the party who should absorb it there deliberately.
 */
export function toContractArgs(rows: SplitRow[]): ContractArgs {
  return {
    recipients: rows.map((r) => r.wallet.trim()),
    sharesBps: rows.map((r) => r.bps),
  };
}

/** A portable record of the sheet, for filing alongside the master. */
export function toSplitSheetJson(params: {
  title: string;
  isrc?: string;
  rows: SplitRow[];
}): string {
  const { recipients, sharesBps } = toContractArgs(params.rows);
  return `${JSON.stringify(
    {
      work: {
        title: params.title.trim() || "Untitled",
        ...(params.isrc?.trim() ? { isrc: params.isrc.trim() } : {}),
      },
      contributors: params.rows.map((r) => ({
        name: r.name.trim(),
        role: r.role,
        wallet: r.wallet.trim(),
        share_bps: r.bps,
        share_percent: Number(bpsToPercent(r.bps)),
      })),
      contract_call: {
        function: "stamp(bytes32,address[],uint16[])",
        note: "trackHash is the SHA-256 of the master — the payload_sha256 from its sealed manifest.",
        recipients,
        sharesBps,
      },
      total_bps: params.rows.reduce((s, r) => s + r.bps, 0),
    },
    null,
    2,
  )}\n`;
}
