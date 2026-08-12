import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Better Auth tables (user, session, account, verification)
export * from "./auth-schema";

/* ─────────────────────────────────────────────────────────────
   ACCESS CONTROL — Data Room allowlist
   The Data Room is invite/allowlist-only. Anyone may create an
   account, but only emails present here receive privileged data.
   ───────────────────────────────────────────────────────────── */
export const allowlist = sqliteTable("allowlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(), // stored lowercased
  note: text("note"), // who / why (e.g. "Founder", "Warner Chappell counsel")
  role: text("role").notNull().default("member"), // admin | member
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/* ─────────────────────────────────────────────────────────────
   PILLAR 1 — THE MASTERTRUST (Legal)
   Data Room segments + cryptographic escrow vault
   ───────────────────────────────────────────────────────────── */

// The 8 structured IP / financial data modules served at /data-room
export const dataRoomSegments = sqliteTable("data_room_segments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(), // "01" … "08"
  title: text("title").notNull(),
  kind: text("kind").notNull(), // VIDEO | PRESENTATION | WHITE_PAPER | INTEGRATION | FLOWCHART | PRICING | FINANCIALS | LINK
  summary: text("summary").notNull(),
  body: text("body"), // long-form content (white paper text, etc.)
  status: text("status").notNull().default("available"), // available | restricted | coming_soon
  clearance: text("clearance").notNull().default("standard"), // standard | privileged
  sortOrder: integer("sort_order").notNull().default(0),
});

// MasterTrust Vault — cryptographic escrow assets with instant split settlement
export const escrowAssets = sqliteTable("escrow_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetKey: text("asset_key").notNull().unique(), // MTV-0x… multi-sig key
  title: text("title").notNull(),
  rightsType: text("rights_type").notNull(), // MASTER | COMPOSITION | NEIGHBORING
  ownershipStatus: text("ownership_status").notNull(), // "Cryptographically Verified / Multi-Sig Escrow"
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  creatorSplit: real("creator_split").notNull().default(50), // %
  labelSplit: real("label_split").notNull().default(25),
  publisherSplit: real("publisher_split").notNull().default(25),
  settlementState: text("settlement_state").notNull().default("settled"), // settled | settling | pending | held
  grossValue: real("gross_value").notNull().default(0), // USD escrowed
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/* ─────────────────────────────────────────────────────────────
   PILLAR 2 — SOVEREIGN SIGN PROTOCOL / SSP (Accounting)
   On-chain ledger, real-time split escrows, anti-scraping tripwire
   ───────────────────────────────────────────────────────────── */

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  txHash: text("tx_hash").notNull().unique(),
  type: text("type").notNull(), // ATTESTATION | SPLIT_SETTLEMENT | INGESTION_FEE | TRIPWIRE_TOLL | LICENSE
  assetKey: text("asset_key"),
  amount: real("amount").notNull().default(0),
  counterparty: text("counterparty").notNull(), // Creator / Label / Publisher / AI Crawler
  chain: text("chain").notNull().default("Polygon"),
  blockHeight: integer("block_height").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed | pending | reverted
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Anti-scraping tripwire events — bots must pay instantly or get locked out
export const tripwireEvents = sqliteTable("tripwire_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crawlerId: text("crawler_id").notNull(), // GPTBot / CCBot / ClaudeBot / unknown
  source: text("source").notNull(), // origin IP / ASN
  assetKey: text("asset_key"),
  action: text("action").notNull(), // billed | locked
  tollAmount: real("toll_amount").notNull().default(0),
  contractRef: text("contract_ref").notNull(), // smart-contract address
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/* ─────────────────────────────────────────────────────────────
   PILLAR 3 — THE SURREALIZER ENGINE (Signal / Audio)
   Forensic signal layers + neural stem extraction
   ───────────────────────────────────────────────────────────── */

export const stemJobs = sqliteTable("stem_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackTitle: text("track_title").notNull(),
  status: text("status").notNull().default("queued"), // queued | processing | complete | failed
  progress: integer("progress").notNull().default(0), // 0-100
  stems: text("stems"), // JSON: [{ name, confidence }]
  forensicLayers: text("forensic_layers"), // JSON: [{ layer, attribution, confidence }]
  provenanceHash: text("provenance_hash"), // steganographic phase-coding signature
  assetKey: text("asset_key"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/* ─────────────────────────────────────────────────────────────
   COMPLIANCE & SETTLEMENT INFRASTRUCTURE
   The cross-cutting layer that makes the three pillars enterprise-
   and regulator-ready:
     1. Dual-layer provenance — signed C2PA v2 manifest + acoustic
        watermark, anchored on Polygon (EU AI Act Art. 50 ready).
     2. Invisible account abstraction + stablecoin→fiat off-ramp.
     3. 90-day time-locked escrow for disputed / orphaned splits.
   ───────────────────────────────────────────────────────────── */

// 1 · Dual-Layer Provenance — C2PA v2 manifest + acoustic watermark + on-chain anchor
export const provenanceManifests = sqliteTable("provenance_manifests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetKey: text("asset_key"),
  title: text("title").notNull(),
  manifestHash: text("manifest_hash").notNull().unique(), // C2PA v2 manifest digest
  humanRatio: real("human_ratio").notNull().default(0), // % human contribution
  aiRatio: real("ai_ratio").notNull().default(0), // % AI contribution
  sessionHash: text("session_hash").notNull(), // signing-session hash
  watermarkId: text("watermark_id").notNull(), // multi-bit acoustic watermark payload id
  watermarkBits: integer("watermark_bits").notNull().default(128), // payload length (bits)
  survives: text("survives"), // JSON: ["MP3","AAC","stream-compression"]
  signer: text("signer").notNull().default("Spalter Trust Services CA"), // C2PA signing cert
  anchorTxHash: text("anchor_tx_hash").notNull(), // Polygon anchor transaction
  chain: text("chain").notNull().default("Polygon"),
  blockHeight: integer("block_height").notNull(),
  status: text("status").notNull().default("anchored"), // signed | anchored | pending
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// 2 · Invisible Account Abstraction + Fiat Off-Ramp — Polygon USDC → USD bank
export const fiatPayouts = sqliteTable("fiat_payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  payoutRef: text("payout_ref").notNull().unique(),
  recipient: text("recipient").notNull(), // rights-holder name
  smartAccount: text("smart_account").notNull(), // ERC-4337 abstracted wallet 0x…
  loginMethod: text("login_method").notNull().default("email"), // email | oauth | sso
  usdcAmount: real("usdc_amount").notNull().default(0), // USDC micro-payout on Polygon
  usdAmount: real("usd_amount").notNull().default(0), // settled USD to bank
  rail: text("rail").notNull().default("ACH"), // ACH | wire | RTP
  bankLast4: text("bank_last4").notNull(),
  provider: text("provider").notNull().default("Circle"), // Circle | Stripe Connect
  status: text("status").notNull().default("settled"), // settled | in_transit | queued | held
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// 3 · Unclaimed Split Escrow — 90-day time-locked programmatic hold
export const unclaimedEscrow = sqliteTable("unclaimed_escrow", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  claimKey: text("claim_key").notNull().unique(),
  title: text("title").notNull(),
  assetKey: text("asset_key"),
  amount: real("amount").notNull().default(0), // USD held
  reason: text("reason").notNull(), // disputed | orphaned | unmatched
  claimant: text("claimant"), // resolved claimant, or null while unmatched
  lockedAt: integer("locked_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  releaseAt: integer("release_at", { mode: "timestamp" }).notNull(), // lockedAt + 90 days
  releaseState: text("release_state").notNull().default("locked"), // locked | claimable | released | disputed
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
