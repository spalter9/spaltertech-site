import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { auth } from "./auth";
import { db } from "./database";
import * as schema from "./database/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ping } from "./routes/ping";
import { masterTrust } from "./routes/master-trust";
import { ssp } from "./routes/ssp";
import { surealizer } from "./routes/surealizer";
import { compliance } from "./routes/compliance";
import { content } from "./routes/content";
import { withUser } from "./middleware/auth";

// Three-pillar core architecture:
//   masterTrust — Pillar 1 (Legal / Data Room + escrow vault), auth-gated
//   ssp         — Pillar 2 (Accounting / on-chain ledger + tripwire)
//   surealizer  — Pillar 3 (Signal / forensic layers + neural stems)
export const router = {
  ping,
  // Current session user + allowlist status, or null.
  // Drives the Data Room gate on the client: not signed in → login;
  // signed in but not allowlisted → "access pending"; allowlisted → dashboard.
  // OPEN ACCESS (temporary): the gate is disabled, so `me` never touches the
  // database (it previously ran an allowlist lookup that could hang if the DB
  // dropped its connection). Return the session user when present, otherwise a
  // guest — always allowed. To re-lock, restore the DB-backed handler below.
  me: withUser.handler(async ({ context }) => {
    if (!context.user) {
      return { id: "guest", email: "guest@open-access", name: "Guest", allowed: true };
    }
    return { ...context.user, allowed: true };
  }),
  /* LOCKED VERSION — restore for login + allowlist:
  me: withUser.handler(async ({ context }) => {
    if (!context.user) return null;
    return { ...context.user, allowed: await isAllowed(context.user.email) };
  }),
  */
  masterTrust,
  ssp,
  surealizer,
  // Cross-cutting compliance & settlement infrastructure (dual-layer
  // provenance, invisible AA + fiat off-ramp, 90-day unclaimed escrow).
  compliance,
  // Claude-generated homepage marketing copy (falls back to static copy
  // client-side when no ANTHROPIC_API_KEY is configured).
  content,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);

// Better Auth handler (managed Google + email/password)
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

/* ───────────────────────────────────────────────────────────
   PILLAR 2 — SSP infrastructure route
   Blockchain ledger accounting + anti-scraping tripwire toll.
   GET  /api/ssp            → protocol status + live ledger snapshot
   POST /api/ssp/tripwire   → crawler tollbooth (pay instantly or lock out)
   ─────────────────────────────────────────────────────────── */
app.get("/api/ssp", async (c) => {
  const [agg] = await db
    .select({
      volume: sql<number>`coalesce(sum(${schema.ledgerEntries.amount}), 0)`,
      txCount: sql<number>`count(*)`,
    })
    .from(schema.ledgerEntries);
  const recent = await db
    .select()
    .from(schema.ledgerEntries)
    .orderBy(desc(schema.ledgerEntries.createdAt))
    .limit(10);
  return c.json(
    {
      protocol: "Sovereign Sign Protocol",
      chain: "Polygon",
      status: "operational",
      settlement: "ERC-4337 account abstraction",
      totalVolumeUsd: agg?.volume ?? 0,
      transactions: agg?.txCount ?? 0,
      recent,
    },
    200,
  );
});

app.post("/api/ssp/tripwire", async (c) => {
  const body = await c.req.json().catch(() => ({}) as Record<string, unknown>);
  const willPay = Boolean((body as { willPay?: boolean }).willPay);
  const crawlerId = String((body as { crawlerId?: string }).crawlerId ?? "unknown");
  const action = willPay ? "billed" : "locked";
  const toll = willPay ? Number((0.1 + Math.random() * 0.1).toFixed(2)) : 0;
  const [event] = await db
    .insert(schema.tripwireEvents)
    .values({
      crawlerId,
      source: `AS${13000 + Math.floor(Math.random() * 900)}`,
      action,
      tollAmount: toll,
      contractRef: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`,
    })
    .returning();
  return c.json({ received: true, decision: action, tollUsd: toll, event }, action === "locked" ? 402 : 200);
});

/* ───────────────────────────────────────────────────────────
   PILLAR 3 — Surrealizer Engine infrastructure route
   Forensic signal layers + neural stem extraction.
   GET /api/surealizer → engine status + capability manifest
   ─────────────────────────────────────────────────────────── */
app.get("/api/surealizer", async (c) => {
  const [agg] = await db
    .select({ jobs: sql<number>`count(*)` })
    .from(schema.stemJobs);
  const [masters] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.float32Masters);
  return c.json(
    {
      engine: "The Surrealizer Engine",
      status: "operational",
      capabilities: [
        "neural stem extraction",
        "forensic signal-layer attribution",
        "steganographic phase-coded provenance",
        "HRTF 3D spatial re-mastering",
        "32-bit float DSP pipeline",
        "SSP cryptographic asset stamping",
      ],
      jobsProcessed: agg?.jobs ?? 0,
      float32Masters: masters?.count ?? 0,
      bitDepth: 32,
      sampleFormat: "pcm_f32le",
    },
    200,
  );
});

app.post("/api/surealizer/render", async (c) => {
  const { renderFloat32Master } = await import("./audio/render");
  const { DSP_PROFILES } = await import("./audio/types");
  type ProfileId = keyof typeof DSP_PROFILES;

  const form = await c.req.parseBody({ all: true });
  const rawFile = form["file"];
  const fileCandidate = Array.isArray(rawFile) ? rawFile[0] : rawFile;
  if (!fileCandidate || typeof fileCandidate === "string" || !(fileCandidate instanceof File)) {
    return c.json({ error: "Missing audio file field 'file'" }, 400);
  }
  const file = fileCandidate;

  const profileId = String(form["profileId"] ?? "spatial-holographic") as ProfileId;
  if (!(profileId in DSP_PROFILES)) {
    return c.json({ error: `Unknown profileId: ${profileId}` }, 400);
  }

  const title = String(form["title"] ?? file.name ?? "Untitled Master").trim() || "Untitled Master";
  const creatorName = String(form["creatorName"] ?? "Spalter Creator").trim() || "Spalter Creator";
  const creatorId = String(form["creatorId"] ?? "creator-open-access").trim();
  const rightsTypeRaw = String(form["rightsType"] ?? "MASTER");
  const rightsType =
    rightsTypeRaw === "COMPOSITION" || rightsTypeRaw === "NEIGHBORING" ? rightsTypeRaw : "MASTER";
  const isrc = form["isrc"] ? String(form["isrc"]) : undefined;

  const arrayBuf = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuf);

  try {
    const result = await renderFloat32Master({
      fileBytes,
      fileName: file.name || "upload.wav",
      profileId,
      ownership: { title, creatorName, creatorId, rightsType, isrc },
    });
    return c.json(
      {
        ...result,
        downloadPath: `/api/surealizer/masters/${result.masterId}/download`,
      },
      201,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    return c.json({ error: message }, 422);
  }
});

app.get("/api/surealizer/masters/:masterId/download", async (c) => {
  const masterId = c.req.param("masterId");
  const [row] = await db
    .select()
    .from(schema.float32Masters)
    .where(eq(schema.float32Masters.masterId, masterId));
  if (!row) return c.json({ error: "Master not found" }, 404);

  const { readFile } = await import("node:fs/promises");
  try {
    const bytes = await readFile(row.filePath);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="${row.fileName}"`,
        "Content-Length": String(bytes.byteLength),
        "X-SSP-Asset-Key": row.assetKey,
        "X-SSP-Asset-Hash": row.assetHash,
        "X-SSP-Provenance": row.provenanceHash,
      },
    });
  } catch {
    return c.json({ error: "Master file missing on disk" }, 404);
  }
});

/* ───────────────────────────────────────────────────────────
   COMPLIANCE & SETTLEMENT INFRASTRUCTURE status route
   Regulatory + settlement posture across the three capability groups.
   GET /api/compliance → C2PA / EU AI Act readiness + live counts
   ─────────────────────────────────────────────────────────── */
app.get("/api/compliance", async (c) => {
  const [prov] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.provenanceManifests);
  const [pay] = await db
    .select({ usd: sql<number>`coalesce(sum(${schema.fiatPayouts.usdAmount}), 0)` })
    .from(schema.fiatPayouts);
  const [esc] = await db
    .select({
      held: sql<number>`coalesce(sum(case when ${schema.unclaimedEscrow.releaseState} != 'released' then ${schema.unclaimedEscrow.amount} else 0 end), 0)`,
    })
    .from(schema.unclaimedEscrow);
  return c.json(
    {
      layer: "Compliance & Settlement Infrastructure",
      chain: "Polygon",
      status: "operational",
      standards: ["C2PA v2", "EU AI Act — Article 50", "ERC-4337"],
      settlement: "stablecoin → fiat off-ramp (ACH / wire / RTP)",
      escrowLockDays: 90,
      manifestsAnchored: prov?.count ?? 0,
      fiatSettledUsd: pay?.usd ?? 0,
      escrowHeldUsd: esc?.held ?? 0,
    },
    200,
  );
});

export default app;
