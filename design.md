# Sovereign-app — Design System

Spalter Entertainment Technologies. Luxury FinTech aesthetic for the Sovereign Sign Protocol platform. Premium, forensic, institutional. "Vault-grade" trust.

## Brand Architecture — Three Pillars

1. **The Master Trust** (Legal) — the vault. Keyhole-crest crest logo. Data Room + cryptographic escrow.
2. **Sovereign Sign Protocol / SSP** (Accounting) — the ledger. On-chain settlement, anti-scraping tripwire.
3. **The Surrealizer Engine** (Signal/Audio) — the forensic signal lab. Neural stem extraction.

## Color

- `--obsidian` `#0B0B0B` — global background (deep obsidian black)
- `--obsidian-raised` `#111111` — cards / raised surfaces
- `--obsidian-line` `#1C1A16` — hairline borders (barely warm)
- `--gold` `#C5A059` — primary metallic gold accent
- `--gold-bright` `#E4C989` — highlight / gradient top
- `--gold-deep` `#8A6D34` — gradient bottom, pressed states
- `--white` `#F5F3EE` — primary text (warm white)
- `--muted` `#8C877D` — secondary text
- `--success` `#5FB37A` — verified / settled states
- `--danger` `#C6543F` — locked / tripwire states

Gold is used for accents, hairlines, and emphasis only — never as a fill background. Metallic feel via subtle gradient on the gold (`--gold-bright` → `--gold` → `--gold-deep`).

## Typography

- Display / headings: **Cormorant Garamond** (serif, luxury/legal weight) for hero + pillar titles.
- UI / body / data: **Inter Tight** is banned; use **Sora** for headings-secondary and **IBM Plex Mono** for ledger/data/asset keys (mono = forensic/technical trust).
- Body copy: **Manrope**.
- Letter-spacing: wide tracking (`0.18em`) uppercase for eyebrows and nav.

Load via Google Fonts in index.html.

## Layout

- Max content width `1200px`, generous vertical rhythm (sections `py-28`).
- Hairline gold borders (`1px solid var(--obsidian-line)` with gold on hover/active).
- Asymmetric hero: monogram crest left, wordmark stacked. Thin animated geometric lines in background.
- Data Room: dashboard grid, non-overlapping modules. Escrow/ledger data in monospace tables.

## Logos (pure CSS — no image files)

- **Master Trust keyhole crest**: gold-bordered keyhole (circle + tapered slot) inside an obsidian circle, thin gold ring.
- **Spalter monogram**: stacked "S / ET" wordmark, gold hairline divider.

## Motion

- One orchestrated page load: staggered fade-up reveals (Motion / framer-motion).
- Ledger rows stream in. Escrow settlement states pulse. Tripwire events flash danger→lock.
- Background: slow-drifting thin geometric gold lines (CSS).

## Components

- Pillar card: obsidian-raised, gold hairline, crest icon, hover lifts border to gold.
- Data table: mono font, gold column headers, zebra via `--obsidian-raised`.
- Status pill: verified (gold/success), pending (muted), locked (danger).
- Login: centered vault card, keyhole crest, Google + email/password.
