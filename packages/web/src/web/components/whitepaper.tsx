/**
 * The full Sovereign Sign Protocol technical white paper, rendered as a
 * readable document scroll inside the Data Room's "Technical White Paper"
 * segment. Text is verbatim from the Spalter Entertainment Technologies
 * Technical Architecture Group white paper (June 2026).
 */

function Flow({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 border-l-2 border-gold/50 bg-obsidian-raised/40 px-5 py-4">
      <p className="font-mono text-[11px] leading-relaxed text-gold/90 tracking-wide">{children}</p>
    </div>
  );
}

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h4 className="font-display text-xl md:text-2xl mt-10 mb-3 leading-snug flex items-baseline gap-3">
      <span className="font-mono text-sm text-gold">{n}</span>
      <span>{children}</span>
    </h4>
  );
}

function Sub({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h5 className="font-display text-base md:text-lg mt-7 mb-2 leading-snug text-bone flex items-baseline gap-2.5">
      <span className="font-mono text-xs text-gold/80">{n}</span>
      <span>{children}</span>
    </h5>
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

export function WhitePaperDoc() {
  return (
    <article className="mt-8">
      {/* Title block */}
      <div className="border-b border-obsidian-line pb-7">
        <p className="eyebrow">White Paper · June 2026</p>
        <h3 className="font-display text-2xl md:text-3xl mt-3 leading-tight">
          The Sovereign Sign Protocol™ (SSP) &amp; The Surreal Automated Serialization Engine
        </h3>
        <p className="text-gold/90 text-sm md:text-base mt-3 leading-relaxed">
          A Cryptographically Anchored Media Container &amp; Autonomous 3D Spatial Mastering Framework
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted mt-5">
          Technical Architecture Group · Spalter Entertainment Technologies
        </p>
      </div>

      {/* Abstract */}
      <H n="">Abstract</H>
      <P>
        The current digital music economy suffers from severe administrative inefficiencies and structural data
        corruption. Text-based metadata injection systems are fragile and easily uncoupled at the Digital Service
        Provider (DSP) ingestion checkpoint. This results in multi-million dollar &ldquo;black box&rdquo; pools of
        unallocated royalties. Simultaneously, the rise of consumer-grade generative artificial intelligence (AI) has
        flooded distribution channels with low-fidelity, artifact-heavy audio files characterized by severe phase
        smearing, watery high-frequencies, and squashed transients.
      </P>
      <P>
        This paper introduces the Sovereign Sign Protocol (SSP) and The Surreal Engine, a unified, headless
        architecture that embeds identity and programmable 50/50 Master-to-Composition distribution rules directly into
        the acoustic audio waveform via Steganographic Phase Coding. Concurrently, an autonomous frontend runtime
        intercepts the validated signal, strips out synthetic artifacts, splits the stereo track into discrete neural
        stems, and applies a dynamic Head-Related Transfer Function (HRTF) spatializer combined with a brickwall-limited
        loudness maximizer. The result is a self-policing, high-fidelity asset that eliminates administrative middlemen,
        eradicates the black box, and establishes a new global paradigm for sound quality and creator compensation.
      </P>

      {/* 1 */}
      <H n="1">Introduction &amp; Market Friction Analysis</H>
      <P>
        The modern music industry relies on administrative architectures designed in the analog era. When a digital
        audio asset is streamed, its provenance is tracked using decoupled, external text data files (e.g., XML
        manifests or ID3 tags). When these assets migrate across distributors, performing rights organizations (PROs),
        mechanical collection agencies, and DSP retail pipelines, this metadata is routinely stripped, misspelled, or
        corrupted.
      </P>

      <Sub n="1.1">The Institutional Black Box Trap</Sub>
      <P>
        When metadata is uncoupled from an audio asset, the resulting revenue collapses into an unallocated pool
        commonly known as the &ldquo;black box.&rdquo; In the United States alone, the Mechanical Licensing Collective
        (MLC) has historically processed hundreds of millions of dollars in unmatched legacy royalty pools. These black
        boxes traditionally get distributed to top market-share owners using opaque, generalized algorithms rather than
        routing to the actual creators of the work.
      </P>

      <Sub n="1.2">The AI Structural Decay Crisis</Sub>
      <P>
        The exponential volume growth of generative music platforms has introduced a massive acoustic and structural
        bottleneck. These platforms output highly compressed audio files containing synthetic anomalies:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Phase Smearing:">
          Destructive acoustic interference in the 2&nbsp;kHz to 8&nbsp;kHz range, perceived as a metallic, unnatural
          hiss.
        </Bullet>
        <Bullet label="Transient Flattening:">
          Algorithms compress dynamic peaks, flattening the &ldquo;attack&rdquo; of percussive and vocal starts.
        </Bullet>
        <Bullet label="Layer Compounding:">
          Audio stems are pre-rendered into a flat, singular stereo layer, causing acoustic masking where mid-range
          instruments drown out human vocals.
        </Bullet>
      </ul>
      <P>
        Consequently, major DSPs are forced to build aggressive, manual screening filters to reject low-fidelity
        &ldquo;AI slop&rdquo; and prevent automated streaming fraud, inadvertently penalizing independent creators.
      </P>

      {/* 2 */}
      <H n="2">Cryptographic Architecture: The Sovereign Sign Protocol</H>
      <P>
        The Sovereign Sign Protocol solves identity loss by making the copyright data physically inseparable from the
        audio. Rather than placing data next to the file, SSP uses Asymmetric Steganographic Phase Coding (APC) to
        inject cryptographic proofs into the acoustic waveform data itself.
      </P>

      <Sub n="2.1">Waveform Ingestion &amp; Asymmetric Phase Injection</Sub>
      <P>
        When a WAV or MP3 file is ingested into the SSP framework, the audio signal is analyzed using a high-resolution
        Fast Fourier Transform (FFT). The engine locates specific psychoacoustic masking bands&mdash;regions where tiny
        changes in the wave&rsquo;s phase are completely imperceptible to human hearing (Signal-to-Noise Ratio greater
        than 46&nbsp;dB).
      </P>
      <P>
        The engine alters the mathematical phase of these selected frequency bins to encode a high-density, 64-byte
        deterministic cryptographic token. This token contains a strict protocol signature and a dedicated Polygon Smart
        Contract Address.
      </P>
      <Flow>
        [Raw Waveform Input] → [FFT Analysis Band Filter] → [Phase Alteration Matrix signed with Elliptic Curve
        secp256k1] → [Watermarked Master Audio File]
      </Flow>
      <P>
        Because this watermark alters the literal phase math of the sound wave, it is completely immune to traditional
        metadata stripping. It survives high-compression MP3 transcoding down to 128&nbsp;kbps, digital-to-analog
        conversion, ambient air-recording via consumer microphones, and sample-rate conversions from 44.1&nbsp;kHz to
        96&nbsp;kHz.
      </P>

      <Sub n="2.2">On-Chain Split Ledger &amp; Automated Compliance</Sub>
      <P>
        The embedded token maps directly to a deployed ERC-20 routing contract on the Polygon blockchain. By leveraging
        Polygon&rsquo;s high-throughput architecture, transaction fees are suppressed to fractions of a cent
        (~$0.002), rendering micro-stream routing financially viable at massive scale.
      </P>
      <P>
        The contract hardcodes the official legal guidelines of the U.S. Copyright Office into an automated, immutable
        loop, splitting gross incoming revenue into two parallel pools:
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="50%">to the Performer / Uploader Wallet</Bullet>
        <Bullet label="50%">to the Composition Element Pool</Bullet>
      </ul>
      <P>Within the Composition Element Pool, the contract enforces a mandatory sub-split allocation:</P>
      <ul className="mt-3 space-y-2">
        <Bullet label="33%">directly to the Lyrics Component (Topliners / Songwriters)</Bullet>
        <Bullet label="67%">dynamically parsed to the Production &amp; Stem Component</Bullet>
      </ul>

      {/* 3 */}
      <H n="3">Acoustic Processing: The Surreal Engine</H>
      <P>
        The Surreal Engine operates as an autonomous frontend runtime, serving as the exclusive playback environment for
        SSP-validated files. To maximize consumer simplicity, the interface exposes a singular On / Off Master Toggle to
        the user. All remediation, serialization, and mastering occur entirely beneath the user interface.
      </P>
      <Flow>
        [User Toggles Master Switch ON] → [SSP Watermark Signature Decoded] → [Stage 1: Neural Stem Extraction &amp;
        Remediation] → [Stage 2: Real-Time Binaural Spatialization via HRTF] → [Stage 3: Mastering Compression &amp;
        Loudness Maximization at −0.1&nbsp;dBFs] → [Hardware Output]
      </Flow>

      <Sub n="3.1">Neural Stem Extraction &amp; AI Artifact Remediation</Sub>
      <P>
        Upon cryptographic handshake clearance, the engine runs a localized neural demixing algorithm, separating the
        single stereo file into four discrete, un-rendered audio streams: Vocals, Drums, Bass, and Ambiance.
      </P>
      <P>
        If the track is flagged as AI-generated, the Remediation Matrix executes a dynamic spectral de-noiser that
        targets the 5.5&nbsp;kHz artifact hotspot, smoothly dimming the metallic hiss by −4.5&nbsp;dB. Concurrently, it
        runs an automated transient shaper that artificially enhances the attack envelope of the drums by a scaling
        factor of 1.35, restoring the punch of organic human tracking.
      </P>

      <Sub n="3.2">Real-Time Autonomous Spatialization</Sub>
      <P>
        Once isolated and cleaned, the discrete stems are piped into an automated Web Audio API runtime. The user has
        zero directional inputs; instead, the engine runs a real-time tracking algorithm that positions elements
        dynamically based on frequency and energy density via a Head-Related Transfer Function (HRTF).
      </P>
      <ul className="mt-3 space-y-2">
        <Bullet label="Low End (Bass):">Anchored center-low to maintain dynamic structural ground.</Bullet>
        <Bullet label="Vocals &amp; Mid-Transients:">
          Modulated cleanly on a narrow forward-facing plain to maximize clarity.
        </Bullet>
        <Bullet label="Ambiance &amp; Melodics:">
          Wrapped dynamically on a wide, breathing outer spatial perimeter driven by time-based calculations.
        </Bullet>
      </ul>

      <Sub n="3.3">Mastering Compression &amp; Loudness Maximizer</Sub>
      <P>
        The spatialized stems pass into a native mastering rack configured to push the audio to its maximum safe
        commercial loudness ceiling. Wild transient spikes are ironed out via an audio dynamics compressor node set to a
        hard 3.5:1 ratio with an ultra-fast 15&nbsp;ms attack.
      </P>
      <P>
        The gain is then programmatically boosted into a brickwall limiter, which locks a hard ceiling at exactly
        −0.1&nbsp;dBFs. The engine monitors average incoming loudness; quiet, unmastered bedroom mixes or flat AI
        generations are aggressively boosted to match major-label commercial density, while already-compressed masters
        receive transparent treatment leveling.
      </P>

      {/* 4 */}
      <H n="4">The Smart Split Sheet &amp; Stem Provenance Ledger</H>
      <P>
        By marrying the neural stem analyzer to the Polygon blockchain, the protocol introduces a completely automated,
        live-updating Digital Split Sheet that is displayed directly on the site frontend player interface.
      </P>

      <div className="my-6 border border-gold/30 bg-obsidian-raised/40 p-5 font-mono text-xs">
        <p className="text-gold uppercase tracking-[0.16em] text-[10px]">Authenticated Attribution Record</p>
        <div className="mt-4 space-y-1.5">
          <p className="text-bone">PERFORMER / USER LEVEL <span className="text-muted">(50% of gross)</span></p>
          <p className="text-muted flex justify-between"><span>Uploader Wallet Alpha</span><span className="text-gold">50.00%</span></p>
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-bone">COMPOSITION ELEMENT LEVEL <span className="text-muted">(50% of gross)</span></p>
          <p className="text-muted flex justify-between"><span>Lyricist: Jane Doe (Verified via SSP Key)</span><span className="text-gold">16.50%</span></p>
          <p className="text-muted flex justify-between"><span>Bassline Origin: John Smith (Stem Hash Match)</span><span className="text-gold">11.22%</span></p>
          <p className="text-muted flex justify-between"><span>Percussion Vault: Muted Grooves LLC</span><span className="text-gold">22.28%</span></p>
        </div>
        <p className="mt-4 pt-3 border-t border-obsidian-line text-verified text-[10px] uppercase tracking-[0.14em]">
          All revenue distributed in &lt; 2 seconds via the Polygon Network
        </p>
      </div>

      <Sub n="4.1">Frictionless Sampling Tracking</Sub>
      <P>
        When a creator samples an existing work or utilizes a registered sample loop, they no longer negotiate manual
        licensing clearances or risk copyright strikes. The ingestion engine&rsquo;s Neural Audio Embedding
        Fingerprinter identifies the acoustic signature of the underlying stem against the global database hash
        registry.
      </P>
      <P>
        If a match is found, the system automatically appends the original creator&rsquo;s Polygon wallet address to the
        new track&rsquo;s smart contract deployment array. The original creator is immediately integrated into the 67%
        production slice of the composition pool.
      </P>

      {/* 5 */}
      <H n="5">Network Economics &amp; Revenue Scaling Strategy</H>
      <P>
        The Sovereign Sign Protocol scales profitability by serving as a high-volume B2B infrastructure utility. Rather
        than competing as an isolated consumer app, the platform captures transactional revenue across three major
        market segments via an open-source Developer SDK.
      </P>

      <Sub n="5.1">The B2B Ingestion SaaS &amp; API Metering</Sub>
      <ul className="mt-3 space-y-2">
        <Bullet label="Major Record Labels (Tier 1):">
          Charged a flat bulk ingestion fee of $0.05 per track to batch-process and cryptographically watermark legacy
          hard-drive catalogs, plus a 0.5% to 1% (50&ndash;100 BPS) maintenance fee on all subsequent registry
          transactions.
        </Bullet>
        <Bullet label="Independent Distributors (Tier 2):">
          Integrate our dashboard wrapper via an enterprise SaaS subscription ranging from $2,500 to $10,000 per month.
          Every independent song upload incurs a $0.01 flat processing fee, embedding the standard protocol at the point
          of origin.
        </Bullet>
        <Bullet label="AI Audio Generators (Tier 3):">
          Charge a high-velocity computing render fee of $0.005 per audio minute to handle the real-time artifact
          de-noising and spatial mastering conversion layer at user export checkpoints.
        </Bullet>
      </ul>

      <Sub n="5.2">Gas Fee Abstraction</Sub>
      <P>
        To preserve a premium, seamless consumer application flow, the framework integrates ERC-4337 Account
        Abstraction. When a listener triggers a stream, the platform backend pays the native blockchain network gas
        costs via a dedicated Paymaster contract. The Paymaster calculation matrix immediately reimburses the network
        cost by shaving the fraction-of-a-cent overhead directly from the gross transaction value prior to final
        distributor and creator distribution.
      </P>

      {/* 6 */}
      <H n="6">Conclusion</H>
      <P>
        The Sovereign Sign Protocol and The Surreal Engine solve the structural data fragmentation and low-fidelity
        sound problems plaguing modern digital media distribution. By moving the legal contracts, split sheets, identity
        records, and processing rules out of brittle text databases and hardcoding them directly into the physical phase
        math of the sound wave, the asset becomes entirely self-policing.
      </P>
      <P>
        Through this open, scalable network standard, the music industry is handed a definitive ultimatum: platforms
        must respect creator compensation and provenance data to unlock the premium, maximum-volume, 3D spatial sound
        standard demanded by modern audiences. The protocol effectively starves the historical black box, protects
        legacy archives, cleans synthetic next-wave output, and ensures that creators are paid and credited the exact
        millisecond their art is experienced by the world.
      </P>
    </article>
  );
}
