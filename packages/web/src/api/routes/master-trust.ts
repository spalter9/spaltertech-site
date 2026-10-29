import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authedAllowed, authedAdmin } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * PILLAR 1 — THE MASTERTRUST (Legal)
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

  // MasterTrust Vault — cryptographic escrow table
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

  // Log that the current investor opened a segment — fire-and-forget from
  // the client when the segment modal opens.
  logView: authedAllowed
    .input(z.object({ code: z.string(), title: z.string() }))
    .handler(async ({ input, context }) => {
      await db.insert(schema.documentViews).values({
        userEmail: context.user.email.trim().toLowerCase(),
        userName: context.user.name ?? null,
        docCode: input.code,
        docTitle: input.title,
      });
      return { logged: true };
    }),

  // Admin-only: who has looked at what, most recent first.
  listActivity: authedAdmin.handler(() =>
    db.select().from(schema.documentViews).orderBy(desc(schema.documentViews.viewedAt)).limit(200),
  ),

  // Admin-only: current allowlist (who can sign in to the Data Room).
  listAllowlist: authedAdmin.handler(() =>
    db.select().from(schema.allowlist).orderBy(desc(schema.allowlist.addedAt)),
  ),

  // Admin-only: invite a new investor by email.
  addInvestor: authedAdmin
    .input(z.object({ email: z.string().email(), note: z.string().optional(), role: z.enum(["admin", "member"]).default("member") }))
    .handler(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      const [existing] = await db.select({ id: schema.allowlist.id }).from(schema.allowlist).where(eq(schema.allowlist.email, email));
      if (existing) throw new ORPCError("CONFLICT", { message: "Already on the allowlist" });
      const [row] = await db
        .insert(schema.allowlist)
        .values({ email, note: input.note?.trim() || null, role: input.role })
        .returning();
      return row;
    }),

  // Admin-only: revoke an investor's access.
  removeInvestor: authedAdmin
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const [row] = await db.select().from(schema.allowlist).where(eq(schema.allowlist.id, input.id));
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Not on the allowlist" });
      if (row.email === context.user.email.trim().toLowerCase()) {
        throw new ORPCError("BAD_REQUEST", { message: "Can't remove your own access" });
      }
      await db.delete(schema.allowlist).where(eq(schema.allowlist.id, input.id));
      return { removed: true };
    }),
};
