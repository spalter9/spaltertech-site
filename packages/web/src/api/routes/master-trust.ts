import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authedAllowed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * PILLAR 1 — THE MASTER TRUST (Legal)
 * Serves the 8 structured IP/financial Data Room modules and the
 * cryptographic escrow Vault. All procedures are auth-gated: the Data Room
 * is privileged legal/financial disclosure and must never be public.
 */
export const masterTrust = {
  // 8-segment Data Room index
  listSegments: authedAllowed.handler(() =>
    db.select().from(schema.dataRoomSegments).orderBy(asc(schema.dataRoomSegments.sortOrder)),
  ),

  getSegment: authedAllowed
    .input(z.object({ code: z.string() }))
    .handler(async ({ input }) => {
      const [seg] = await db
        .select()
        .from(schema.dataRoomSegments)
        .where(eq(schema.dataRoomSegments.code, input.code));
      if (!seg) throw new ORPCError("NOT_FOUND", { message: "Segment not found" });
      return seg;
    }),

  // Master Trust Vault — cryptographic escrow table
  listEscrow: authedAllowed.handler(() =>
    db.select().from(schema.escrowAssets).orderBy(asc(schema.escrowAssets.id)),
  ),

  // Trigger an instant split settlement (Creator / Label / Publisher concurrently)
  settleAsset: authedAllowed
    .input(z.object({ assetKey: z.string() }))
    .handler(async ({ input }) => {
      const [asset] = await db
        .select()
        .from(schema.escrowAssets)
        .where(eq(schema.escrowAssets.assetKey, input.assetKey));
      if (!asset) throw new ORPCError("NOT_FOUND", { message: "Asset not in escrow" });

      const [updated] = await db
        .update(schema.escrowAssets)
        .set({ settlementState: "settled", updatedAt: new Date() })
        .where(eq(schema.escrowAssets.assetKey, input.assetKey))
        .returning();

      // Write the concurrent split legs to the SSP ledger
      const legs: Array<{ counterparty: string; pct: number }> = [
        { counterparty: "Creator", pct: asset.creatorSplit },
        { counterparty: "Label", pct: asset.labelSplit },
        { counterparty: "Publisher", pct: asset.publisherSplit },
      ];
      const block = 61_400_000 + Math.floor(Math.random() * 90_000);
      for (const leg of legs) {
        await db.insert(schema.ledgerEntries).values({
          txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
          type: "SPLIT_SETTLEMENT",
          assetKey: asset.assetKey,
          amount: Number(((asset.grossValue * leg.pct) / 100).toFixed(2)),
          counterparty: leg.counterparty,
          chain: "Polygon",
          blockHeight: block,
          status: "confirmed",
        });
      }
      return updated;
    }),
};
