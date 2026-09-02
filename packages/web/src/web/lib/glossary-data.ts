/**
 * Music-rights glossary.
 *
 * Ported from the `surreal-stamp-engine` Lovable project. This is reference
 * content, not marketing: the codes, formats, rates and collecting societies
 * named here are the real ones, and the distinctions they draw (master vs.
 * composition especially) are the ones that decide who actually gets paid.
 *
 * It earns its place on this site because the protocol's own output leans on
 * these terms — a sealed manifest carries an ISRC and an ISWC, and the USCO
 * dossier reasons about the master side specifically.
 */

export interface GlossaryTerm {
  slug: string;
  term: string;
  short: string;
  body: string[];
  related?: string[];
  aka?: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "isrc",
    term: "ISRC",
    aka: ["International Standard Recording Code"],
    short:
      "A 12-character global identifier for a single sound recording — the fingerprint that follows a master through every DSP, society, and statement.",
    body: [
      "An ISRC (International Standard Recording Code) is the ISO-standard identifier assigned to a specific recording — not the song, not the release, the actual master. Two recordings of the same composition get two different ISRCs.",
      "Format: CC-XXX-YY-NNNNN. Two letters for country, three for registrant, two for year, five for the designation. Example: US-S1Z-99-00001.",
      "ISRCs are issued by national agencies (RIAA in the US, PPL in the UK, etc.) or passed through by your distributor. Every DSP, PRO, neighboring-rights society, and royalty system keys off this code — if it's wrong or missing, your money stops moving.",
      "On SSP, the ISRC is bound into the on-chain stamp alongside the SHA-256 of the master. The chain becomes the canonical place where 'this ISRC = this audio file' is provable forever.",
    ],
    related: ["iswc", "master-vs-composition", "neighboring-rights"],
  },
  {
    slug: "iswc",
    term: "ISWC",
    aka: ["International Standard Musical Work Code"],
    short:
      "The ISO identifier for a musical composition — the song itself, separate from any recording of it.",
    body: [
      "ISWC (International Standard Musical Work Code) identifies the underlying work: melody, lyrics, structure. One ISWC, many ISRCs — every cover, remix, and re-record of the same song shares the same ISWC.",
      "Format: T-NNNNNNNNN-C, e.g. T-345246800-1. Issued by CISAC societies (ASCAP, BMI, SESAC, PRS, GEMA, SACEM…).",
      "ISWC governs publishing income — mechanicals, performance royalties, sync. ISRC governs the master side. Confusing them is the single most common reason splits get paid to the wrong party.",
    ],
    related: ["isrc", "master-vs-composition", "split-sheet", "mechanical-royalty"],
  },
  {
    slug: "master-vs-composition",
    term: "Master vs. Composition",
    short:
      "Two separate copyrights live inside every song: the recording (master) and the underlying work (composition). They generate different royalties and pay different people.",
    body: [
      "The composition is the song — notes, chords, lyrics. Owned by songwriters and their publishers. Generates performance, mechanical, and sync royalties.",
      "The master is one specific recording of that composition. Owned by the performing artist, label, or whoever funded the session. Generates streaming royalties (master side), neighboring rights, and master-use sync fees.",
      "When Spotify pays out a stream, two checks get written — one to the master side, one to the composition side. They flow through entirely different pipes (DSP → distributor → label vs. DSP → MLC/PRO → publisher → songwriter).",
      "SSP stamps the master. Composition rights are handled separately by your PRO and publisher.",
    ],
    related: ["isrc", "iswc", "mechanical-royalty", "neighboring-rights", "split-sheet"],
  },
  {
    slug: "split-sheet",
    term: "Split Sheet",
    short:
      "The written agreement that records who owns what percentage of a song — songwriters, producers, featured artists. Without one, royalties get stuck.",
    body: [
      "A split sheet is the foundational document for every collaborative song. It names every contributor, their role (writer, producer, performer, lyricist), and their ownership percentage on both the master and the composition.",
      "Traditionally it's a PDF signed in the studio. The problem: that PDF then has to be re-entered into a publisher's system, a distributor's metadata, a PRO registration, and a label's accounting — and any of those entries can disagree.",
      "On-chain split sheets fix this by making the document itself the payout logic. Contributor wallets and basis-point shares are written to a smart contract; revenue routed to the contract splits automatically.",
      "SSP includes a split-sheet tool that validates shares sum to 100% and can attach the sheet to a stamped track.",
    ],
    related: ["master-vs-composition", "isrc", "iswc", "neighboring-rights"],
  },
  {
    slug: "mechanical-royalty",
    term: "Mechanical Royalty",
    short:
      "The royalty owed to songwriters and publishers every time a composition is reproduced — physically, digitally, or via on-demand streaming.",
    body: [
      "Mechanicals originate from the era of mechanical reproduction: pressing a record was a 'mechanical' use of a composition, and the songwriter was owed a per-copy fee. The same principle now covers downloads and the reproduction component of interactive streams.",
      "In the US, statutory mechanicals for streaming are administered by The MLC (Mechanical Licensing Collective). Outside the US, it's the local society (MCPS in the UK, GEMA in Germany, SACEM in France, etc.).",
      "The current US statutory rate for streaming mechanicals is set under the Phonorecords IV proceeding — roughly 15.35% of service revenue allocated to songwriters, distributed via the MLC.",
      "If you wrote the song, you're owed mechanicals. If you only performed on the master, you're not — you're owed master-side streaming income instead.",
    ],
    related: ["iswc", "mlc", "pro", "master-vs-composition"],
  },
  {
    slug: "neighboring-rights",
    term: "Neighboring Rights",
    short:
      "Royalties paid to performers and master owners when a recording is publicly broadcast or performed — radio, TV, public venues, satellite, webcasters.",
    body: [
      "Neighboring rights (also: 'related rights') are the master-side equivalent of public-performance royalties. When a recording is played on terrestrial radio in most of the world (not the US), or on non-interactive digital radio in the US (SoundExchange), the master owner and featured performers are owed money.",
      "Collected by societies: PPL (UK), GVL (Germany), SCPP/SPPF (France), SoundExchange (US, digital only). Most US artists leave significant money on the table by never registering with foreign neighboring-rights societies.",
      "The US is one of the only major markets that does NOT pay neighboring rights on terrestrial radio — a long-running political fight.",
    ],
    related: ["master-vs-composition", "isrc", "soundexchange"],
  },
  {
    slug: "pro",
    term: "PRO",
    aka: ["Performance Rights Organization"],
    short:
      "An organization that licenses public-performance rights on behalf of songwriters and publishers, then collects and distributes the resulting royalties.",
    body: [
      "PROs (Performance Rights Organizations) handle the composition side of public-performance income: a venue playing your song, a radio station spinning it, a restaurant on hold-music duty.",
      "Major PROs: ASCAP, BMI, SESAC, GMR (US); PRS for Music (UK); SOCAN (Canada); GEMA (Germany); SACEM (France); JASRAC (Japan).",
      "Every songwriter affiliates with exactly one PRO. The PRO licenses bulk-use to broadcasters and businesses, samples what gets played, and distributes royalties based on those samples.",
      "PROs handle composition public performance. The MLC handles composition mechanicals. SoundExchange handles master neighboring rights for digital radio. Three different pipes, three different registrations.",
    ],
    related: ["mlc", "iswc", "neighboring-rights", "mechanical-royalty"],
  },
  {
    slug: "mlc",
    term: "The MLC",
    aka: ["Mechanical Licensing Collective"],
    short:
      "The US non-profit created by the Music Modernization Act to collect and distribute streaming mechanical royalties to songwriters and publishers.",
    body: [
      "Created by the Music Modernization Act of 2018 and operational since 2021, The MLC administers blanket mechanical licenses for interactive streaming services (Spotify, Apple Music, Amazon Music, etc.) in the US.",
      "DSPs pay The MLC a lump sum; The MLC matches usage data to registered works and distributes royalties to the correct songwriters and publishers. Songs that can't be matched go into a black box of unclaimed royalties — historically hundreds of millions of dollars.",
      "If you're a US-based songwriter, registering your works with The MLC is non-optional, and there is no cost to do it.",
    ],
    related: ["mechanical-royalty", "pro", "iswc"],
  },
  {
    slug: "soundexchange",
    term: "SoundExchange",
    short:
      "The US organization that collects digital-radio neighboring-rights royalties for master owners and featured performers.",
    body: [
      "SoundExchange collects statutory royalties under US copyright law for non-interactive digital transmissions of sound recordings — satellite radio (SiriusXM), webcasters (Pandora's radio mode), and certain cable/internet services.",
      "Splits: 50% to the master owner, 45% to the featured artist, 5% to non-featured performers (via the AFM & SAG-AFTRA Fund). Crucially, performers are paid directly — they do NOT have to go through the label.",
      "If you perform on or own a master and have not registered with SoundExchange, you almost certainly have unclaimed money sitting there.",
    ],
    related: ["neighboring-rights", "master-vs-composition", "isrc"],
  },
  {
    slug: "sync-license",
    term: "Sync License",
    short:
      "The license required to pair a piece of music with visual media — film, TV, ads, games, social platforms.",
    body: [
      "A sync ('synchronization') license grants the right to synchronize a composition with moving images. Pairs with a separate master-use license for the specific recording. Both must be cleared independently — sync clears the composition, master-use clears the master.",
      "Negotiated directly between the music user (production company, brand, platform) and the rights holders (publishers for sync, labels or master owners for master-use). One of the few music revenue streams not capped by statute, which is why sync fees range from $0 to seven figures.",
      "Increasingly handled via sync libraries and pre-cleared catalogs to avoid the dual-clearance bottleneck.",
    ],
    related: ["master-vs-composition", "iswc", "isrc"],
  },
];

export const GLOSSARY_BY_SLUG = Object.fromEntries(
  GLOSSARY.map((t) => [t.slug, t]),
) as Record<string, GlossaryTerm>;
