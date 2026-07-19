# Sovereign-app build

App: /home/user/sovereign-app-build (web, port 4200)
Push target: https://github.com/spalter9/Sovereign-app

## Design
Obsidian black #0B0B0B, gold #C5A059, warm white. Cormorant + Sora + IBM Plex Mono + Manrope.
Keyhole crest + Spalter monogram in pure CSS.

## Three Pillars (backend)
1. Master Trust (Legal) → /data-room (auth-gated) 8 modules + escrow vault
2. SSP (Accounting) → /api/ssp ledger + split escrow + anti-scraping tripwire
3. Surrealizer Engine (Signal) → /api/surealizer forensic layers + neural stems

## Progress
- [x] app_init
- [x] design.md
- [x] auth deps + auth.ts + managed google + auth-schema generated
- [x] domain schema + db:push
- [x] auth middleware
- [x] API routes: masterTrust, ssp, surealizer + me
- [x] HTTP routes /api/ssp /api/surealizer + auth mount in index.ts
- [x] seed data
- [x] web: auth client, api client bearer, main.tsx handleRedirect
- [x] web: styles.css + fonts + nav + brand marks
- [ ] web: homepage 3 pillars
- [ ] web: login vault page
- [ ] web: data-room dashboard
- [ ] app.tsx routes
- [ ] build + verify + deliver
- [ ] push to github (needs token)
