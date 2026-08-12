import { z } from "zod";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authedAllowed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * COMPLIANCE & SETTLEMENT INFRASTRUCTURE
 * The cross-cutting layer that hardens the three pillars for enterprise
 * catalog owners, sync buyers, and regulators:
 *   1. Dual-layer provenance — signed C2PA v2 manifest + imperceptible
 *      acoustic watermark, with the manifest hash anchored on Polygon.
 *   2. Invisible account abstraction (ERC-4337) + stablecoin→fiat off-ramp
 *      that lands Polygon USDC micro-payouts in a USD bank via ACH/wire.
 *   3. 90-day time-locked escrow for disputed / orphaned splits — funds are
 *      held programmatically (never frozen) and resolve on-chain.
 * Also exposed as a plain HTTP status route at /api/compliance (api/index.ts).
 */

const SURVIVES = ["MP3", "AAC", "stream-compression"] as const;
const hex = (n: number) => `0x${crypto.randomUUID().replace(/-/g, "").slice(0, n)}`;

export const compliance = {
  /* 1 · Dual-Layer Provenance ─────────────────────────────── */
  listManifests: authedAllowed.handler(() =>
    db.select().from(schema.provenanceManifests).orderBy(desc(schema.provenanceManifests.createdAt)).limit(40),
  ),

  // Simulate the export → C2PA sign → watermark embed → Polygon anchor pipeline
  anchorManifest: authedAllowed
    .input(
      z.object({
        title: z.string().min(1),
        humanRatio: z.number().min(0).max(100).default(70),
        assetKey: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const humanRatio = Math.round(input.humanRatio);
      const aiRatio = 100 - humanRatio;
      const [manifest] = await db
        .insert(schema.provenanceManifests)
        .values({
          assetKey: input.assetKey,
          title: input.title,
          manifestHash: `c2pa:${hex(40)}`,
          humanRatio,
          aiRatio,
          sessionHash: hex(24),
          watermarkId: `AWM-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
          watermarkBits: 128,
          survives: JSON.stringify(SURVIVES),
          signer: "Spalter Trust Services CA",
          anchorTxHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
          chain: "Polygon",
          blockHeight: 61_400_000 + Math.floor(Math.random() * 90_000),
          status: "anchored",
        })
        .returning();
      // Record the attestation on the SSP ledger
      await db.insert(schema.ledgerEntries).values({
        txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
        type: "ATTESTATION",
        assetKey: input.assetKey,
        amount: 0.05,
        counterparty: "C2PA Manifest Anchor",
        chain: "Polygon",
        blockHeight: 61_400_000 + Math.floor(Math.random() * 90_000),
        status: "confirmed",
      });
      return manifest;
    }),

  /* 2 · Account Abstraction + Fiat Off-Ramp ───────────────── */
  listPayouts: authedAllowed.handler(() =>
    db.select().from(schema.fiatPayouts).orderBy(desc(schema.fiatPayouts.createdAt)).limit(40),
  ),

  // Simulate a stablecoin → fiat off-ramp (Polygon USDC → USD bank)
  offramp: authedAllowed
    .input(
      z.object({
        recipient: z.string().min(1),
        usdcAmount: z.number().min(0.01),
        rail: z.enum(["ACH", "wire", "RTP"]).default("ACH"),
      }),
    )
    .handler(async ({ input }) => {
      const usd = Number((input.usdcAmount * 0.9997).toFixed(2)); // ~1:1 bridge, minor spread
      const [payout] = await db
        .insert(schema.fiatPayouts)
        .values({
          payoutRef: `PO-${hex(12)}`,
          recipient: input.recipient,
          smartAccount: hex(40),
          loginMethod: "email",
          usdcAmount: Number(input.usdcAmount.toFixed(2)),
          usdAmount: usd,
          rail: input.rail,
          bankLast4: String(1000 + Math.floor(Math.random() * 9000)).slice(-4),
          provider: input.rail === "wire" ? "Circle" : "Stripe Connect",
          status: "in_transit",
        })
        .returning();
      return payout;
    }),

  /* 3 · Unclaimed Split Escrow (90-day lock) ──────────────── */
  listUnclaimed: authedAllowed.handler(() =>
    db.select().from(schema.unclaimedEscrow).orderBy(asc(schema.unclaimedEscrow.releaseAt)),
  ),

  // Resolve a matched claim — release the held split to the rightful owner
  resolveClaim: authedAllowed
    .input(z.object({ claimKey: z.string(), claimant: z.string().min(1) }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.unclaimedEscrow)
        .where(eq(schema.unclaimedEscrow.claimKey, input.claimKey));
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Escrow claim not found" });

      const [updated] = await db
        .update(schema.unclaimedEscrow)
        .set({ releaseState: "released", claimant: input.claimant })
        .where(eq(schema.unclaimedEscrow.claimKey, input.claimKey))
        .returning();

      // Write the released split to the SSP ledger
      await db.insert(schema.ledgerEntries).values({
        txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
        type: "SPLIT_SETTLEMENT",
        assetKey: row.assetKey,
        amount: row.amount,
        counterparty: `${input.claimant} (resolved claim)`,
        chain: "Polygon",
        blockHeight: 61_400_000 + Math.floor(Math.random() * 90_000),
        status: "confirmed",
      });
      return updated;
    }),

  // Aggregate posture for the compliance dashboard header
  posture: authedAllowed.handler(async () => {
    const [prov] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.provenanceManifests);
    const [pay] = await db
      .select({
        count: sql<number>`count(*)`,
        usd: sql<number>`coalesce(sum(${schema.fiatPayouts.usdAmount}), 0)`,
      })
      .from(schema.fiatPayouts);
    const [esc] = await db
      .select({
        count: sql<number>`count(*)`,
        held: sql<number>`coalesce(sum(case when ${schema.unclaimedEscrow.releaseState} != 'released' then ${schema.unclaimedEscrow.amount} else 0 end), 0)`,
      })
      .from(schema.unclaimedEscrow);
    return {
      manifests: prov?.count ?? 0,
      payouts: pay?.count ?? 0,
      payoutUsd: pay?.usd ?? 0,
      escrowClaims: esc?.count ?? 0,
      escrowHeldUsd: esc?.held ?? 0,
      lockDays: 90,
    };
  }),
};
