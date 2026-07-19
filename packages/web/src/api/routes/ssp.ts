import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { authedAllowed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * PILLAR 2 — SOVEREIGN SIGN PROTOCOL / SSP (Accounting)
 * Blockchain ledger accounting, real-time split escrows, and the
 * smart-contract anti-scraping tripwire. Anchored on Polygon.
 * Also exposed as a plain HTTP status route at /api/ssp (see api/index.ts).
 */
export const ssp = {
  // On-chain ledger feed
  ledger: authedAllowed
    .input(z.object({ limit: z.number().min(1).max(200).default(40) }).optional())
    .handler(({ input }) =>
      db
        .select()
        .from(schema.ledgerEntries)
        .orderBy(desc(schema.ledgerEntries.createdAt))
        .limit(input?.limit ?? 40),
    ),

  // Aggregate accounting stats for the dashboard
  stats: authedAllowed.handler(async () => {
    const [row] = await db
      .select({
        totalVolume: sql<number>`coalesce(sum(${schema.ledgerEntries.amount}), 0)`,
        txCount: sql<number>`count(*)`,
        attestations: sql<number>`sum(case when ${schema.ledgerEntries.type} = 'ATTESTATION' then 1 else 0 end)`,
        tollRevenue: sql<number>`coalesce(sum(case when ${schema.ledgerEntries.type} = 'TRIPWIRE_TOLL' then ${schema.ledgerEntries.amount} else 0 end), 0)`,
      })
      .from(schema.ledgerEntries);
    const [twr] = await db
      .select({
        billed: sql<number>`sum(case when ${schema.tripwireEvents.action} = 'billed' then 1 else 0 end)`,
        locked: sql<number>`sum(case when ${schema.tripwireEvents.action} = 'locked' then 1 else 0 end)`,
      })
      .from(schema.tripwireEvents);
    return {
      totalVolume: row?.totalVolume ?? 0,
      txCount: row?.txCount ?? 0,
      attestations: row?.attestations ?? 0,
      tollRevenue: row?.tollRevenue ?? 0,
      botsBilled: twr?.billed ?? 0,
      botsLocked: twr?.locked ?? 0,
    };
  }),

  // Anti-scraping tripwire event feed
  tripwire: authedAllowed
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .handler(({ input }) =>
      db
        .select()
        .from(schema.tripwireEvents)
        .orderBy(desc(schema.tripwireEvents.createdAt))
        .limit(input?.limit ?? 20),
    ),

  // Simulate a crawler hit — bot must pay the toll instantly or be locked out
  triggerTripwire: authedAllowed
    .input(
      z.object({
        crawlerId: z.string().default("unknown"),
        willPay: z.boolean().default(false),
      }),
    )
    .handler(async ({ input }) => {
      const action = input.willPay ? "billed" : "locked";
      const toll = input.willPay ? Number((0.1 + Math.random() * 0.1).toFixed(2)) : 0;
      const [event] = await db
        .insert(schema.tripwireEvents)
        .values({
          crawlerId: input.crawlerId,
          source: `AS${13000 + Math.floor(Math.random() * 900)} · ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0.0/16`,
          action,
          tollAmount: toll,
          contractRef: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`,
        })
        .returning();
      if (input.willPay) {
        await db.insert(schema.ledgerEntries).values({
          txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
          type: "TRIPWIRE_TOLL",
          amount: toll,
          counterparty: `AI Crawler · ${input.crawlerId}`,
          chain: "Polygon",
          blockHeight: 61_400_000 + Math.floor(Math.random() * 90_000),
          status: "confirmed",
        });
      }
      return event;
    }),
};
