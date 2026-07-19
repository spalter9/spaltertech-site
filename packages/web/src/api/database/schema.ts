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
   PILLAR 1 — THE MASTER TRUST (Legal)
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

// Master Trust Vault — cryptographic escrow assets with instant split settlement
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
