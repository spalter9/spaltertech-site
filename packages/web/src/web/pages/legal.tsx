import { Link, useRoute } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Nav } from "../components/nav";

/**
 * Legal pages — /legal/privacy, /legal/terms, /legal/cookies.
 *
 * The structure here follows the one drafted in the `surreal-stamp-engine`
 * Lovable project, but none of its *content* was carried over, deliberately.
 * That policy describes Paddle as merchant of record, Chainalysis sanctions
 * screening, EU-hosted data and a self-service export tool — none of which
 * exist in this deployment. Publishing it verbatim would put binding, false
 * representations on a commercial site, which is worse than publishing
 * nothing.
 *
 * What follows instead is written against the stack this repo actually runs,
 * verified against the code: the third parties named below are the ones the
 * application really contacts. Anything that depends on facts only the
 * operator holds — legal entity, jurisdiction, contact addresses, hosting
 * region — is left as an explicit placeholder rather than invented, and the
 * pages render a standing notice until those are filled in and a lawyer has
 * signed off.
 */

/** Swap to false once the placeholders are filled and counsel has reviewed. */
const IS_DRAFT = true;

/** Facts only the operator can supply. Grep for TODO before going live. */
const OPERATOR = {
  legalEntity: "[[LEGAL ENTITY NAME]]", // TODO
  jurisdiction: "[[JURISDICTION OF INCORPORATION]]", // TODO
  privacyEmail: "[[privacy@yourdomain]]", // TODO
  postalAddress: "[[REGISTERED ADDRESS]]", // TODO
  hostingRegion: "[[HOSTING REGION]]", // TODO
  lastUpdated: "[[DATE]]", // TODO
} as const;

type LegalDoc = "privacy" | "terms" | "cookies";

const TITLES: Record<LegalDoc, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  cookies: "Cookie Policy",
};

function DraftBanner() {
  if (!IS_DRAFT) return null;
  return (
    <div className="mt-8 flex gap-3 rounded-xl border border-danger/40 bg-danger/[0.07] px-5 py-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
      <p className="text-sm leading-relaxed text-muted">
        <span className="text-danger">Draft — not in force.</span> This document is
        substantively complete and describes the systems this site actually runs, but it
        still contains bracketed placeholders and has not been reviewed by counsel. It
        does not yet bind anyone. Fill in the bracketed fields, have it reviewed, then
        set <code className="font-mono text-bone">IS_DRAFT</code> to false.
      </p>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-bone">{heading}</h2>
      <div className="mt-3 space-y-4 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/** The third parties the application genuinely contacts, verified in code. */
const SUB_PROCESSORS = [
  {
    name: "Anthropic",
    purpose:
      "Powers Spalty, the on-site assistant. Messages you type to Spalty are sent to Anthropic's API to generate a reply.",
  },
  {
    name: "ElevenLabs",
    purpose:
      "Reads Spalty's replies aloud. The reply text is sent for speech synthesis; your microphone audio is not — speech recognition runs in your own browser and is never uploaded.",
  },
  {
    name: "Turso (libSQL)",
    purpose: "Hosts the application database: accounts, ledger records, audit and export session metadata.",
  },
  {
    name: "Google (via Better Auth)",
    purpose: "Optional sign-in. Used only if you choose to authenticate with a Google account.",
  },
  {
    name: "Vercel",
    purpose: "Serves the static front end.",
  },
  {
    name: "OneDollarStats",
    purpose:
      "Page analytics. A script loads on every page and reports page views to r.lilstts.com.",
  },
];

function Privacy() {
  return (
    <>
      <Section heading="Who is responsible">
        <p>
          {OPERATOR.legalEntity}, incorporated in {OPERATOR.jurisdiction}, operates this
          site and is the controller for personal data processed here. Registered address:{" "}
          {OPERATOR.postalAddress}. Data protection enquiries: {OPERATOR.privacyEmail}.
        </p>
      </Section>

      <Section heading="What we process">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-bone">Account</span> — email address, display name, and
            authentication tokens, if you create an account.
          </li>
          <li>
            <span className="text-bone">Audio you upload</span> — the file itself, its
            SHA-256 hash, and the measurements derived from it (loudness, true peak,
            forensic features, authorship findings).
          </li>
          <li>
            <span className="text-bone">Work metadata</span> — title, creator name, rights
            type, and any ISRC or ISWC you supply.
          </li>
          <li>
            <span className="text-bone">Assistant conversations</span> — the messages you
            send to Spalty, for as long as the browser tab is open. They are not stored on
            our servers, but they are transmitted to Anthropic and ElevenLabs to produce a
            reply (see below).
          </li>
          <li>
            <span className="text-bone">Usage analytics</span> — page views collected by a
            third-party script on every page.
          </li>
        </ul>
      </Section>

      <Section heading="Where your audio goes — and where it does not">
        <p className="text-bone">
          Audio submitted to the Sovereign Audio Protocol is processed entirely on our own
          infrastructure. It is not sent to any third-party service for analysis,
          separation, or storage.
        </p>
        <p>
          Source separation runs on a self-hosted worker on our own network. Loudness,
          forensic measurement, sealing and signing all run in our own application
          process. The signing key never leaves our disk. This is an architectural
          property of the system, not only a policy commitment.
        </p>
        <p>
          Spalty is the exception, and the only one: what you type to the assistant is sent
          to Anthropic, and the text of its reply is sent to ElevenLabs to be spoken. If
          that matters for what you are working on, do not put it in the assistant.
        </p>
      </Section>

      <Section heading="Legal bases">
        <p>
          Where GDPR applies we rely on: <span className="text-bone">contract</span>, to
          provide the service you asked for; <span className="text-bone">legitimate
          interests</span>, to keep the service secure and working; and{" "}
          <span className="text-bone">consent</span>, for analytics and any optional
          marketing. You can withdraw consent at any time without affecting processing
          already carried out.
        </p>
      </Section>

      <Section heading="Retention">
        <p className="text-bone">
          Uploaded audio and sealed export packages are retained on disk indefinitely and
          are not deleted automatically.
        </p>
        <p>
          This is a deliberate property of a provenance system — a sealed master and the
          audit behind it are meant to remain verifiable — but it means your files persist
          until deleted on request. Write to {OPERATOR.privacyEmail} to have material
          removed. Account data is kept until you delete the account.
        </p>
      </Section>

      <Section heading="On-chain records">
        <p>
          Where the Sovereign Sign Registry is used, the data written to Polygon — a
          content hash, recipient wallet addresses, and basis-point shares — is public and
          permanent. It cannot be edited or deleted by us or by anyone else, and no right
          of erasure can reach it. Do not place personal data in any field that is written
          on-chain.
        </p>
      </Section>

      <Section heading="Third parties we share data with">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-obsidian-line font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="py-2 pr-6">Recipient</th>
                <th className="py-2">What they receive and why</th>
              </tr>
            </thead>
            <tbody>
              {SUB_PROCESSORS.map((p) => (
                <tr key={p.name} className="border-b border-obsidian-line/60 align-top">
                  <td className="py-3 pr-6 text-bone">{p.name}</td>
                  <td className="py-3 leading-relaxed text-muted">{p.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We do not sell personal data. Application data is hosted in{" "}
          {OPERATOR.hostingRegion}.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have rights of access, correction,
          portability, restriction, objection, and erasure. There is no self-service export
          tool yet — email {OPERATOR.privacyEmail} and we will respond within 30 days. Note
          the on-chain limitation above: erasure cannot extend to data already written to a
          public chain.
        </p>
      </Section>

      <Section heading="Complaints">
        <p>
          If you are in the UK or EEA and believe we have handled your data improperly, you
          may complain to your local supervisory authority.
        </p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section heading="Agreement">
        <p>
          These terms govern your use of this site and the Sovereign Sign Protocol tools on
          it, operated by {OPERATOR.legalEntity}. By using the service you accept them. If
          you are agreeing on behalf of an organisation, you confirm you may bind it.
        </p>
      </Section>

      <Section heading="What you keep">
        <p className="text-bone">
          You retain all rights in the audio you upload and in the masters produced from
          it. We claim no ownership of your recordings, compositions, or the exports this
          system renders.
        </p>
        <p>
          You grant us only the narrow permission needed to run the service on the material
          you submit: to store it, process it, and return the results to you. Your audio is
          not used to train any model, ours or anyone else's.
        </p>
      </Section>

      <Section heading="What you warrant">
        <p>
          You confirm that you hold the rights necessary to upload each file you submit and
          to have it processed, and that doing so does not infringe anyone else's rights.
          You are responsible for the accuracy of the metadata you enter — including
          creator names, ISRCs, and split percentages.
        </p>
      </Section>

      <Section heading="Forensic findings are evidence, not proof">
        <p className="text-bone">
          The authorship analysis this service produces is a measurement-based opinion. It
          is not a certification, not a legal determination, and not legal advice.
        </p>
        <p>
          It measures physical properties that current generative systems tend not to
          reproduce. It is not a detector for any specific model, and a sufficiently good
          synthetic recording — or a heavily processed human performance — can be placed in
          the wrong band. Any copyright application you file remains your own
          responsibility, and the Copyright Office makes its own determination on every
          application regardless of what this report says.
        </p>
      </Section>

      <Section heading="On-chain actions are irreversible">
        <p>
          Stamping a track to the Sovereign Sign Registry writes an immutable record. Splits
          cannot be edited or revoked after the fact, and payments settle to the addresses
          you specified. Verify recipient addresses and shares before you stamp; a mistake
          is permanent, and we cannot reverse it.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is provided as-is, without warranty of any kind. We do not guarantee
          uninterrupted availability, and we may change or discontinue features. Keep your
          own copies of anything you cannot afford to lose — do not treat this as your only
          archive.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the maximum extent permitted by law, our aggregate liability arising from the
          service is limited to the amount you paid for it in the twelve months before the
          claim. Nothing here limits liability that cannot lawfully be limited, including
          for death, personal injury, or fraud.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>These terms are governed by the laws of {OPERATOR.jurisdiction}.</p>
      </Section>
    </>
  );
}

function Cookies() {
  return (
    <>
      <Section heading="What this site stores">
        <p>
          This site is deliberately light on cookies. It sets what is needed to keep you
          signed in and to remember that you have unlocked the access gate, and it loads
          one third-party analytics script.
        </p>
      </Section>

      <Section heading="Categories">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-bone">Strictly necessary</span> — authentication session
            tokens set by Better Auth, and the client-side flag recording that you entered
            the access passcode. Without these you cannot stay signed in or past the gate.
          </li>
          <li>
            <span className="text-bone">Analytics</span> — a script from OneDollarStats
            loads on every page and reports page views to r.lilstts.com. This is not
            strictly necessary and is the item that requires consent where consent rules
            apply.
          </li>
        </ul>
        <p>
          We do not run advertising cookies, cross-site trackers, or third-party marketing
          pixels.
        </p>
      </Section>

      <Section heading="Managing them">
        <p>
          You can clear or block cookies in your browser settings. Blocking the strictly
          necessary ones will sign you out and return you to the access gate; blocking
          analytics has no effect on how the site works.
        </p>
      </Section>
    </>
  );
}

const BODIES: Record<LegalDoc, () => React.ReactElement> = {
  privacy: Privacy,
  terms: Terms,
  cookies: Cookies,
};

export default function Legal() {
  const [, params] = useRoute("/legal/:doc");
  const doc = (params?.doc ?? "privacy") as LegalDoc;
  const known: LegalDoc = doc in BODIES ? doc : "privacy";
  const Body = BODIES[known];

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-6 py-14 md:py-20">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.06]">
            {TITLES[known]}
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Last updated {OPERATOR.lastUpdated}
          </p>

          <DraftBanner />

          <nav className="mt-8 flex flex-wrap gap-2">
            {(Object.keys(TITLES) as LegalDoc[]).map((key) => (
              <Link
                key={key}
                to={`/legal/${key}`}
                className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  key === known
                    ? "border-gold/45 bg-gold/10 text-gold"
                    : "border-obsidian-line text-muted hover:border-gold/35 hover:text-gold"
                }`}
              >
                {TITLES[key]}
              </Link>
            ))}
          </nav>

          <Body />
        </div>
      </div>
    </div>
  );
}
