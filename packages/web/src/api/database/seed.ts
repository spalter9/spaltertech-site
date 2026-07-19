import { db } from "./index";
import * as schema from "./schema";

/** Seed the three pillars with representative data. Run: bun run src/api/database/seed.ts */

const SEGMENTS: Array<typeof schema.dataRoomSegments.$inferInsert> = [
  {
    code: "01",
    title: "MASTER TRUST — VIDEO OVERVIEW",
    kind: "VIDEO",
    summary: "The 4-minute Orphaned Track narrative. How legacy masters lost their chain of title, and how the Master Trust restores it.",
    body: "A cinematic walkthrough of the Black Box problem: orphaned files, lost provenance, and the retroactive on-chain restoration of legacy catalogs.",
    status: "available",
    clearance: "privileged",
    sortOrder: 1,
  },
  {
    code: "02",
    title: "PRESENTATION — CORE TECHNOLOGY",
    kind: "PRESENTATION",
    summary: "Interactive slide framework: the Instant Anti-Scraping Tripwire. AI bots must pay instantly or get locked out.",
    body: "Covers point-of-creation QR copyright lock, the mandatory AI-training tollbooth, and the smart-contract blockade that bills crawlers on contact.",
    status: "available",
    clearance: "privileged",
    sortOrder: 2,
  },
  {
    code: "03",
    title: "TECHNICAL WHITE PAPER",
    kind: "WHITE_PAPER",
    summary: "Full protocol specification — steganographic phase coding, HRTF spatializer, neural stem extraction, ERC-4337 abstraction.",
    body: "The Sovereign Sign Protocol anchors immutable proof of ownership on Polygon. Every attestation is a $0.05 cryptographic signature anchor. The Surrealizer Engine embeds inaudible provenance directly into the frequency layer via steganographic phase coding, surviving re-encoding, compression, and stem separation. Neural stem extraction performs DNA-level credit detection, attributing every contribution to its original creator. Settlement runs through ERC-4337 account abstraction for low human overhead. The QR Split System locks copyright at the point of creation, splitting royalties 50% to the new creator and 50% among historical writers and producers, with scaled musician payments based on contribution.",
    status: "available",
    clearance: "privileged",
    sortOrder: 3,
  },
  {
    code: "04",
    title: "SSP + SURREAL INTEGRATION",
    kind: "INTEGRATION",
    summary: "How the ledger (SSP) and the signal engine (Surrealizer) interlock to verify, attribute, and settle in one pass.",
    body: "A track enters the Surrealizer Engine → forensic layers are attributed → provenance is embedded → the attestation is anchored on the SSP ledger → escrow settles splits concurrently to Creators, Labels, and Publishers.",
    status: "available",
    clearance: "privileged",
    sortOrder: 4,
  },
  {
    code: "05",
    title: "ANTI-SCRAPING FLOWCHART",
    kind: "FLOWCHART",
    summary: "The tollbooth decision tree — crawler detection → identity challenge → instant billing or lockout.",
    body: "Diagrams the mandatory AI-training tollbooth: unidentified crawler hits protected asset → smart contract issues 402 → pay instantly to proceed, or be locked out and logged.",
    status: "available",
    clearance: "standard",
    sortOrder: 5,
  },
  {
    code: "06",
    title: "MONETIZATION MATRIX & PRICING",
    kind: "PRICING",
    summary: "$0.05 per on-chain attestation, 1–2% ecosystem split, $499/mo enterprise Surrealizer node licensing.",
    body: "Stream 1: $0.05 per attestation anchor, 250,000 Month 1, 15% MoM growth. Stream 2: $499/mo per enterprise Surrealizer Engine license. COGS $0.008/settlement.",
    status: "available",
    clearance: "privileged",
    sortOrder: 6,
  },
  {
    code: "07",
    title: "PRO FORMA FINANCIALS",
    kind: "FINANCIALS",
    summary: "Month 1 verified model → Year 3 target $45M–$60M ARR. Deployed and verified on-chain.",
    body: "Month 1 verified: Rev $17,490 | COGS $2,000 | Gross Income $15,490 | OpEx $12,000 | Net Operating Income $3,490.",
    status: "available",
    clearance: "privileged",
    sortOrder: 7,
  },
  {
    code: "08",
    title: "PROTOTYPE & LEDGER ACCESS",
    kind: "LINK",
    summary: "Live access to the Master Trust Vault, SSP ledger, and Surrealizer job queue inside this Data Room.",
    body: "The interactive modules below are wired to the live three-pillar backend.",
    status: "available",
    clearance: "privileged",
    sortOrder: 8,
  },
];

const ESCROW: Array<typeof schema.escrowAssets.$inferInsert> = [
  { assetKey: "MTV-0x7F3A…C219", title: "Reversion Master — 'Golden Hour' (2003)", rightsType: "MASTER", ownershipStatus: "Cryptographically Verified / Multi-Sig Escrow", creatorSplit: 50, labelSplit: 30, publisherSplit: 20, settlementState: "settled", grossValue: 128400 },
  { assetKey: "MTV-0x9B21…A47D", title: "Composition — 'Neon Cathedral'", rightsType: "COMPOSITION", ownershipStatus: "Cryptographically Verified / Multi-Sig Escrow", creatorSplit: 50, labelSplit: 25, publisherSplit: 25, settlementState: "settling", grossValue: 84250 },
  { assetKey: "MTV-0x4E88…10FF", title: "Restored Legacy Master — 'Black Box #12'", rightsType: "MASTER", ownershipStatus: "Cryptographically Verified / Multi-Sig Escrow", creatorSplit: 40, labelSplit: 35, publisherSplit: 25, settlementState: "settled", grossValue: 201900 },
  { assetKey: "MTV-0x1C60…7B93", title: "Neighboring Rights — 'Aura Vane — Session A'", rightsType: "NEIGHBORING", ownershipStatus: "Cryptographically Verified / Multi-Sig Escrow", creatorSplit: 60, labelSplit: 20, publisherSplit: 20, settlementState: "pending", grossValue: 46700 },
  { assetKey: "MTV-0xD305…E5A1", title: "Master — 'Elio Sol — Meridian'", rightsType: "MASTER", ownershipStatus: "Cryptographically Verified / Multi-Sig Escrow", creatorSplit: 55, labelSplit: 25, publisherSplit: 20, settlementState: "held", grossValue: 73100 },
];

const CRAWLERS = ["GPTBot", "CCBot", "ClaudeBot", "Bytespider", "unknown"];

async function seed() {
  // Idempotent-ish: clear domain tables first
  await db.delete(schema.ledgerEntries);
  await db.delete(schema.tripwireEvents);
  await db.delete(schema.stemJobs);
  await db.delete(schema.escrowAssets);
  await db.delete(schema.dataRoomSegments);

  await db.insert(schema.dataRoomSegments).values(SEGMENTS);
  await db.insert(schema.escrowAssets).values(ESCROW);

  // Ledger — attestations, ingestion fees, split settlements, tolls
  const types = ["ATTESTATION", "INGESTION_FEE", "SPLIT_SETTLEMENT", "LICENSE"] as const;
  const parties = ["Creator", "Label", "Publisher", "Enterprise Node"];
  const ledger: Array<typeof schema.ledgerEntries.$inferInsert> = [];
  for (let i = 0; i < 48; i++) {
    const type = types[i % types.length]!;
    const amount =
      type === "ATTESTATION" ? 0.05 :
      type === "INGESTION_FEE" ? Number((0.1 + Math.random() * 0.1).toFixed(2)) :
      type === "LICENSE" ? 499 :
      Number((200 + Math.random() * 4000).toFixed(2));
    ledger.push({
      txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
      type,
      assetKey: ESCROW[i % ESCROW.length]!.assetKey,
      amount,
      counterparty: parties[i % parties.length]!,
      chain: "Polygon",
      blockHeight: 61_400_000 + i * 137,
      status: "confirmed",
      createdAt: new Date(Date.now() - i * 1000 * 60 * 37),
    });
  }
  await db.insert(schema.ledgerEntries).values(ledger);

  // Tripwire events
  const tw: Array<typeof schema.tripwireEvents.$inferInsert> = [];
  for (let i = 0; i < 14; i++) {
    const willPay = Math.random() > 0.55;
    tw.push({
      crawlerId: CRAWLERS[i % CRAWLERS.length]!,
      source: `AS${13000 + i} · ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.0.0/16`,
      assetKey: ESCROW[i % ESCROW.length]!.assetKey,
      action: willPay ? "billed" : "locked",
      tollAmount: willPay ? Number((0.1 + Math.random() * 0.1).toFixed(2)) : 0,
      contractRef: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`,
      createdAt: new Date(Date.now() - i * 1000 * 60 * 52),
    });
  }
  await db.insert(schema.tripwireEvents).values(tw);

  // Stem jobs
  const stems = [
    { name: "Vocals", confidence: 0.98 }, { name: "Bass", confidence: 0.95 },
    { name: "Drums", confidence: 0.96 }, { name: "Harmonic", confidence: 0.92 },
  ];
  const layers = [
    { attribution: "Bass line — historical writer credit", confidence: 0.94 },
    { attribution: "Vocal topline — new creator", confidence: 0.97 },
    { attribution: "String arrangement — historical writer credit", confidence: 0.86 },
  ];
  const jobs: Array<typeof schema.stemJobs.$inferInsert> = ["Golden Hour", "Neon Cathedral", "Black Box #12", "Meridian"].map((t, i) => ({
    trackTitle: t,
    status: i === 0 ? "processing" : "complete",
    progress: i === 0 ? 62 : 100,
    stems: JSON.stringify(stems),
    forensicLayers: JSON.stringify(layers),
    provenanceHash: `SPC-${crypto.randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase()}`,
    assetKey: ESCROW[i % ESCROW.length]!.assetKey,
    createdAt: new Date(Date.now() - i * 1000 * 60 * 90),
  }));
  await db.insert(schema.stemJobs).values(jobs);

  // Data Room allowlist — approved emails only (stored lowercased)
  const ADMINS: Array<typeof schema.allowlist.$inferInsert> = [
    { email: "brandspalter@gmail.com", note: "Bradley Spalter — Founder", role: "admin" },
    { email: "info@spaltentech.com", note: "Spalter Entertainment — Admin", role: "admin" },
  ];
  for (const a of ADMINS) {
    await db
      .insert(schema.allowlist)
      .values({ ...a, email: a.email.toLowerCase() })
      .onConflictDoNothing();
  }

  console.log("Seeded: segments, escrow, ledger, tripwire, stem jobs, allowlist.");
}

seed().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
