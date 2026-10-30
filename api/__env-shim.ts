// Vercel's Turso Marketplace integration names its env vars
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN; the app's db client reads
// DATABASE_URL / DATABASE_AUTH_TOKEN. This has to run and finish before the
// app (and its db client) is imported — a side-effect-only module imported
// first achieves that with plain static imports, since ES modules evaluate
// in source order, depth-first.
process.env.DATABASE_URL ??= process.env.TURSO_DATABASE_URL;
process.env.DATABASE_AUTH_TOKEN ??= process.env.TURSO_AUTH_TOKEN;
