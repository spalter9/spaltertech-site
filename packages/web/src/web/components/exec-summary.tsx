/**
 * The full Spalter Entertainment Technology Executive Summary, rendered as a
 * readable document scroll inside the Data Room's "Executive Summary" segment.
 * Text is verbatim from the Spalter Entertainment Technology executive summary
 * for The Sovereign Sign Protocol & Token (SSP).
 */

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h4 className="font-display text-xl md:text-2xl mt-10 mb-3 leading-snug flex items-baseline gap-3">
      <span className="font-mono text-sm text-gold">{n}</span>
      <span>{children}</span>
    </h4>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <h5 className="font-display text-base md:text-lg mt-7 mb-2 leading-snug text-bone">{children}</h5>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted text-sm leading-relaxed mt-3">{children}</p>;
}

function Bullet({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <li className="text-muted text-sm leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1.5 before:h-1.5 before:bg-gold/70">
      {label ? <span className="text-bone font-medium">{label} </span> : null}
      {children}
    </li>
  );
}

export function ExecSummaryDoc() {
  return (
    <article className="mt-8">
      {/* Title block */}
      <div className="border-b border-obsidian-line pb-7">
        <p className="eyebrow">Executive Summary · Institutional Positioning</p>
        <h3 className="font-display text-2xl md:text-3xl mt-3 leading-tight">
          Spalter Entertainment Technology
        </h3>
        <p className="text-gold/90 text-sm md:text-base mt-3 leading-relaxed">
          The Sovereign Sign Protocol™ &amp; Token (SSP)
        </p>
        <p className="text-muted text-sm mt-4 leading-relaxed">
          <span className="text-bone font-medium">Principals:</span> Bradley Spalter, CEO &amp; Music Designer · Peter Van Barkal, CTO
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted mt-4">
          Target: Institutional Positioning · Capital Acquisition · Monetization Strategy · Global Scale
        </p>
      </div>

      {/* I */}
      <H n="I">Mission Statement &amp; Value Proposition</H>
      <P>
        Spalter Entertainment Technology, in partnership with the Surreal Audio Engine, is launching the Sovereign Sign
        Protocol (SSP). This proprietary, institution-grade blockchain and cryptographic architecture solves the media
        industry&rsquo;s most critical vulnerabilities: fragmented chain-of-title, digital asset leakage, and the
        systemic exploitation of unauthorized content.
      </P>
      <P>
        Our core mission is to establish the new global standard for digital intellectual property validation. Driven by
        an uncompromising commitment to audio fidelity, the protocol transforms vulnerable files into intelligent,
        cryptographically sealed, immutable objects. This framework secures absolute provenance, guarantees legal
        defensibility, and automates asset monetization at the source, offering a bulletproof infrastructure for tech
        platforms, major labels, independents, and global streaming networks.
      </P>

      {/* II */}
      <H n="II">The Technical Foundation: The Surreal Engine &amp; Advanced AI Ingestion</H>
      <P>
        This initiative represents a groundbreaking architectural convergence combining advanced artificial intelligence
        with decentralized infrastructure:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Bradley Spalter (CEO &amp; Music Designer):">
          Commercial deployment strategy, industry architecture, and the enterprise integration framework.
        </Bullet>
        <Bullet label="Peter Van Barkal (CTO):">
          Seamlessly embedding the powerhouse Surreal Audio Engine and The Surreal App infrastructure into the core
          protocol.
        </Bullet>
      </ul>

      <Sub>The AI Forensic &amp; Restoration Pipeline</Sub>
      <P>
        Our integration with the Surreal Engine delivers a highly advanced, automated artificial intelligence ingestion
        layer that analyzes master recordings with surgical precision:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Forensic Stem Extraction &amp; Multi-Track Isolation:">
          The AI automatically picks the audio apart, isolating every individual stem (vocals, drums, bass, keys) and
          running a deep behavioral scan to identify exactly who played what instrument, when, and where.
        </Bullet>
        <Bullet label="Automated Artifact Removal &amp; Master Restoration:">
          During ingestion, the AI automatically strips out analog hiss, tape noise, clipping, and sonic imperfections,
          ensuring that legacy audio artifacts go completely away to deliver an optimized, pristine high-fidelity master
          track.
        </Bullet>
      </ul>
      <P>
        Algorithmic Split Resolution: By analyzing individual tracks, the AI automatically validates and assigns the 50%
        creator core asset allocation, matching performance data directly against the onboarding split sheet to remove
        human error and clerical fraud before the asset is finalized.
      </P>

      {/* III */}
      <H n="III">Anti-Scraping Enforcement &amp; The Mandatory Training Tollbooth</H>
      <P>
        As international headlines dominate with multi-billion-dollar litigation over tech conglomerates unlawfully
        scraping catalogs without consent or compensation, the Sovereign Sign Protocol introduces the industry&rsquo;s
        first proactive defense layer against illicit AI harvesting:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Immediate Threat Detection &amp; Automated Invoicing:">
          The moment an AI web crawler or LLM scraper attempts to ingest an SSP-encoded file or its extracted stems for
          training datasets, the cryptographic shield instantly flags the intrusion. It completely bypasses long legal
          discoveries and fires a smart contract transaction that charges the offending AI company immediately.
        </Bullet>
        <Bullet label={'The "Zero Free Scrapes" Mandate:'}>
          Unauthorized scraping is structurally blocked at the protocol level. Tech companies are completely restricted
          from treating intellectual property as free data inventory. If an AI platform wants to train on an SSP asset,
          they must pay our designated ingestion and data licensing fees upfront via the ledger, or face automated,
          ironclad financial penalties written directly into the block code.
        </Bullet>
      </ul>

      {/* IV */}
      <H n="IV">Architecture at the Source: The QR Split System</H>
      <P>
        The defining advantage of the Sovereign Sign Protocol is its absolute, friction-free simplicity at the exact
        moment of creation. The protocol eliminates administrative backlog by capturing metadata and locking legal
        splits at the source:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Instant Generation:">
          The moment a song is created in the studio, the session generates a unique, secure SSP QR Code linked to that
          specific master.
        </Bullet>
        <Bullet label="Scan-to-Split Enforcement:">
          Writers, producers, and contributors simply scan the QR code using their mobile device.
        </Bullet>
        <Bullet label="Frictionless Consensus:">
          Scanning the code immediately opens a secure interface where creators verify their identities, input their
          split percentages, and sign off digitally in seconds.
        </Bullet>
        <Bullet label="Cryptographic Locking:">
          Once confirmed, this split sheet is written directly to the ledger and cryptographically baked into the master
          file alongside the AI-extracted stem data as an immutable Sovereign Sign (SSP).
        </Bullet>
      </ul>

      {/* V */}
      <H n="V">The Polygon Advantage: Instant On-Chain Payment</H>
      <P>
        The entire mechanical and financial framework of the SSP infrastructure is anchored on the Polygon blockchain
        network. Polygon was specifically selected to drive the protocol&rsquo;s high-speed settlement layer due to its
        institutional-grade security, minimal gas fees, and massive scalability:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Real-Time Global Payouts:">
          Traditional royalty distributions take months, sometimes years, to route through opaque corporate
          clearinghouses. By utilizing Polygon&rsquo;s rapid block finality, the moment a track is streamed, synced, or
          licensed, smart contracts split and execute the distribution instantly.
        </Bullet>
        <Bullet label="Zero Overhead Friction:">
          Polygon enables micro-transactions to occur at a fraction of a cent per transfer. This allows the protocol to
          move microscopic fractions of capital directly to writers, publishers, and investors immediately without
          eating into margins.
        </Bullet>
        <Bullet label="Immutable Transparency:">
          Every micro-payment, platform ingestion fee, and ecosystem split is written permanently onto the ledger,
          giving our legal team and investors a 100% auditable, real-time map of revenue realization.
        </Bullet>
      </ul>

      {/* VI */}
      <H n="VI">The Revenue Model &amp; Specific Price Points</H>
      <P>
        The protocol establishes a high-margin, automated financial utility via an un-bypassable monetization matrix
        enforced on-chain. Revenue generation covers both Front-End Creation and Deep-Catalog Retroactive Ingestion:
      </P>

      <Sub>1. DSP Ingestion Gateway (Spotify, Apple Music, Amazon Music)</Sub>
      <P>Global streaming platforms interact with the protocol as an active ingestion gateway layer.</P>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Price Point:">
          DSPs are charged an Ingestion Gateway Fee of $0.10 to $0.20 every single time a track is fingerprinted, legally
          attested, and uploaded to their network.
        </Bullet>
        <Bullet label="The Revenue Flow:">
          With millions of tracks delivered across streaming networks globally, this &ldquo;digital tollbooth&rdquo;
          provides a massive, high-volume recurring utility revenue stream.
        </Bullet>
      </ul>

      <Sub>2. The Enterprise Tier &amp; Catalog Retrofitting (Major Labels)</Sub>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Target:">Warner, Universal, Sony, and major legacy entertainment groups.</Bullet>
        <Bullet label="Dual-Track Ingestion Fees:">Majors are charged on two operational tracks:</Bullet>
      </ul>
      <ul className="mt-2 space-y-2 pl-6">
        <Bullet label="Front-End Ingestion:">
          A premium, volume-scaled per-file protocol fee for encoding all new music at the point of creation.
        </Bullet>
        <Bullet label="Retroactive Catalog Ingestion:">
          A structured fee model applied when moving back into the extensive historical music catalogs to systematically
          retrofit, analyze via AI stem extraction, remove recording artifacts, and stamp legacy tracks with the
          protocol. This transforms passive archival assets into active, secure, on-chain properties.
        </Bullet>
      </ul>
      <ul className="mt-2 space-y-2">
        <Bullet label="Annual Licensing &amp; Splits:">
          Majors are locked into custom, multi-million dollar annual Enterprise B2B Licensing Fees for core pipeline
          integration, coupled with a dynamic 1% to 2% network processing split captured on all downstream royalty
          payouts routed via the automated Polygon smart contracts.
        </Bullet>
      </ul>

      <Sub>3. The Independent Creator &amp; Label Tier</Sub>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Target:">Independent labels, distributors, and solo creators.</Bullet>
        <Bullet label="The Price Point:">
          Independent entities pay a clean, flat authentication fee of $10 to $15 per track at the moment of creation
          (minted via the QR code session) or can opt for a predictable monthly SaaS Subscription Model for bulk catalog
          uploads.
        </Bullet>
        <Bullet label="The Ecosystem Split:">
          Like the enterprise tier, the protocol retains a microscopic transaction processing split on instant streaming
          and sync settlements executed across the decentralized ledger network.
        </Bullet>
      </ul>

      {/* VII */}
      <H n="VII">The Financial Forecast: The &ldquo;24/7 Cash Register&rdquo; Multiplier</H>
      <P>
        To demonstrate the profound scalability of this technology to our investment group, the protocol operates as a
        frictionless digital cash register that collects automated micro-fees 24 hours a day, completely independent of
        human overhead. Our macro financial projections harness the staggering volume of the global entertainment
        ecosystem:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Addressable Market Base:">
          The global recorded music market generates $31.7 billion annually, with paid music streaming services
          accounting for $22+ billion of that pool across over 837 million paid subscription accounts. Simultaneously,
          the global synchronization licensing market is tracking toward a $7.2 billion evaluation.
        </Bullet>
        <Bullet label="The Volume Transaction Multiplier:">
          Across Spotify, Apple Music, and social media platforms, hundreds of thousands of tracks are ingested daily,
          and hundreds of millions of music micro-streams are processed every hour.
        </Bullet>
        <Bullet label="Projected Revenue Realization:">
          By capturing an undisputed, protocol-level gatekeeping position&mdash;charging a consistent $0.10 to $0.20
          ingestion toll across platform uploads alongside an automated 1% to 2% ecosystem split on immediate on-chain
          streaming settlements&mdash;Spalter Entertainment Technology projects ultra-high-margin software infrastructure
          scaling:
        </Bullet>
      </ul>
      <ul className="mt-2 space-y-2 pl-6">
        <Bullet label="Year 1 Core Goal:">
          Encoding an initial footprint of 2 million independent and legacy catalog assets via our Surreal AI
          restoration ingestion pipeline, driving immediate transaction volume.
        </Bullet>
        <Bullet label="Year 3 Target:">
          Expanding platform integration to process a targeted 5% of global streaming ingestion traffic and sync
          transaction velocity. This position translates directly into an estimated $45M&ndash;$60M in high-margin
          annual recurring infrastructure revenue, securing an enterprise platform valuation multiple exceeding 15x to
          20x ARR due to the automated, pure tech nature of the ledger.
        </Bullet>
      </ul>

      {/* VIII */}
      <H n="VIII">Streaming Platform Compliance (DSP Mandate)</H>
      <P>Compliance from streaming networks is driven by an undeniable consumer and technical mandate:</P>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Audio Premium:">
          Powered by the Surreal Engine, files encoded with the Sovereign Sign Protocol deliver a demonstrably superior,
          high-fidelity sound quality that standard, compressed audio files cannot match.
        </Bullet>
        <Bullet label="The Market Driver:">
          As premium catalogs and elite creators mandate that their highest-fidelity masters be delivered exclusively via
          SSP, DSPs must adopt our protocol to maintain their premium tier subscriptions and satisfy a consumer base
          demanding the absolute best sound quality.
        </Bullet>
        <Bullet label="Automated Clearance Pipelines:">
          The protocol converts Spotify and Apple Music from passive platforms into active nodes on our ledger.
          Streaming payouts are recalculated at the second of play, instantly routing micro-payments directly to
          creators via the Polygon network, bypassing months of traditional administrative delay.
        </Bullet>
      </ul>

      {/* IX */}
      <H n="IX">Macro Scalability: The Enterprise Entertainment Portal (YouTube &amp; SVOD Mandate)</H>
      <P>
        While the protocol&rsquo;s immediate commercial launchpad is the high-margin global audio ecosystem, the
        underlying architecture of the Sovereign Sign Protocol (SSP) is built to seamlessly scale across the entire
        macro-digital media spectrum. Music is simply our proof of concept; the framework is fundamentally engineered to
        serve as the mandatory validation layer for global video platforms, social networks, and subscription
        video-on-demand (SVOD) channels, establishing an un-bypassable business model with tech titans like YouTube,
        Netflix, Amazon Prime, and Disney+.
      </P>

      <Sub>1. The Global Video Scaling Mandate (YouTube Integration)</Sub>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Scale:">
          YouTube represents the largest video footprint on earth, boasting over 2.8 billion active monthly users and an
          infrastructure where creators upload more than 700 hours of video every single minute. This saturation is
          heavily driven by a massive, ongoing surge in AI-assisted video production tools.
        </Bullet>
        <Bullet label="The Volume Tollbooth Model:">
          By establishing SSP as a mandatory gatekeeper protocol integrated directly into automated upload and
          processing ingestion pipelines, the protocol charges a specialized transaction fee per upload or per gigabyte
          processed. This applies an un-bypassable infrastructure fee onto the massive daily video pipeline, turning the
          sheer volume of global user-generated content into an infinite, recurring financial utility.
        </Bullet>
        <Bullet label="Automated Rights Enforcement:">
          Video networks face staggering liability over user-generated audio track infringements and synthetic voice
          clones. The protocol instantly maps incoming audio against our Polygon ledger. The millisecond an
          SSP-protected asset or isolated multi-track voice stem is detected in a video or Short, the system
          automatically redirects, splits, or claims the monetization pipeline back to the rightful owners in real-time,
          removing all manual copyright friction.
        </Bullet>
      </ul>

      <Sub>2. The Premium SVOD Gateway (Netflix, Amazon, Disney+)</Sub>
      <ul className="mt-3 space-y-2">
        <Bullet label="The Ingest Integration Model:">
          Subscription streaming services process highly complex pipelines of raw feature films, series, localized
          multi-track audio files, and international dubs. Integrating SSP directly into cloud content hubs forces an
          automated verification fee for every master content asset authenticated and pushed to edge caching networks.
        </Bullet>
        <Bullet label="Instant Dynamic Sync Clearance:">
          For platforms like Netflix, music cue-sheets and background rights clearing represent a notorious back-end
          bottleneck. By anchoring visual master files on our ledger, the file itself executes automated micro-payments
          back to publishers and artists via Polygon the exact frame a music asset is triggered during a subscriber
          stream.
        </Bullet>
        <Bullet label="Sovereign Counter-AI Defenses:">
          As major video networks face aggressive data harvesting threats from unauthorized AI visual models looking to
          scrape premium cinematography, facial assets, and vocal scores for synthetic generation tools, our protocol
          acts as a hardened defensive layer. If an unauthorized scraper or web crawler hits the platform, the SSP
          signature blocks the download chunk and levies an instant on-chain penalty transaction against the source.
        </Bullet>
      </ul>

      {/* X */}
      <H n="X">Capital Acquisition &amp; Investment Strategy</H>
      <P>
        To fund core engineering, global infrastructure deployment, and rapid enterprise market acquisition, Spalter
        Entertainment Technology is executing a structured, milestone-driven capital raise split into three distinct
        rounds:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Seed / Round 1 ($3.5M):">
          Finalizing the institutional framework, formalizing the primary smart contract layer, executing strategic AI
          ingestion beta testing via the Surreal Engine integration, and locking down foundational IP filings with elite
          legal counsel.
        </Bullet>
        <Bullet label="Round 2 (Growth / Series A):">
          Expanding software developer kits (SDKs) for external platform integration, and scaling enterprise B2B sales
          pipelines to onboard legacy media catalogs and major tech networks.
        </Bullet>
        <Bullet label="Round 3 (Expansion / Series B):">
          Dominating global enterprise licensing infrastructure, expanding network nodes, and cementing the protocol as
          the mandatory, un-bypassable industry layer for secure asset verification and automated monetization.
        </Bullet>
      </ul>

      <Sub>Automated Investor Repayment (On-Chain)</Sub>
      <P>
        Investors are wired directly into the protocol&rsquo;s on-chain distribution waterfall. Rather than waiting on
        opaque quarterly statements or manual disbursements, capital contributors are paid back automatically through
        the blockchain: a defined share of every ingestion fee, licensing payment, and ecosystem split is routed to
        investor wallets by smart contract the moment revenue is realized on the Polygon network.
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Programmatic Return of Capital:">
          Repayment terms are encoded directly into the smart contract layer. As protocol revenue flows in, the
          contracts execute investor distributions first against the agreed return schedule&mdash;return of capital,
          then ongoing yield&mdash;with zero administrative intervention.
        </Bullet>
        <Bullet label="Real-Time, Transparent Payouts:">
          Because every fee and split settles on-chain, investors receive their portion in real time and can audit each
          distribution against the immutable ledger, giving a 100% verifiable, live view of exactly when and how their
          capital is returned.
        </Bullet>
        <Bullet label="Frictionless Global Settlement:">
          Polygon&rsquo;s low-cost micro-transaction rails move investor payouts across borders instantly, without
          clearinghouses or margin-eroding overhead&mdash;the same &ldquo;24/7 cash register&rdquo; that pays creators
          pays the investors who built it.
        </Bullet>
      </ul>

      {/* XI */}
      <H n="XI">Corporate Exit Strategy (Public Market Expansion)</H>
      <P>
        To maximize investor returns, establish ultimate market liquidity, and anchor the protocol as a permanent, global
        infrastructure utility, Spalter Entertainment Technology is committed to a public market path rather than
        remaining locked as a closed entity:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Initial Public Offering (IPO):">
          Taking Spalter Entertainment Technology public as a standalone, high-yielding B2B infrastructure provider. This
          positions the company as the definitive, publicly traded clearinghouse for protected digital media worldwide,
          matching the regulatory transparency required by institutional funds.
        </Bullet>
        <Bullet label="Strategic Dual-Listings:">
          Exploring technological and traditional market public listings to capture liquidity from both the legacy
          financial sectors and emerging digital asset ecosystems.
        </Bullet>
      </ul>

      {/* XII */}
      <H n="XII">Conclusion &amp; Objective</H>
      <P>
        The Sovereign Sign Protocol shifts the power dynamic from reactive litigation to proactive, absolute technical
        enforcement. Powered by the analytical precision of the Surreal Engine and scaled on Polygon, the infrastructure
        is completely engineered, the technical partnership is locked, and the protocol is ready for global commercial
        launch.
      </P>
      <P>
        We are retaining elite counsel to institutionalize our smart contracts, cement our framework for sovereign asset
        protection, and prepare the protocol for immediate enterprise scaling and capital onboarding.
      </P>
      <div className="my-8 border-l-2 border-gold/50 bg-obsidian-raised/40 px-5 py-4">
        <p className="font-display text-lg md:text-xl text-bone leading-snug">
          The technology is bulletproof. The infrastructure is built. Let&rsquo;s move.
        </p>
      </div>
    </article>
  );
}
