import { useState } from "react";
import { BadgeCheck, Download, FileSearch, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { SectionCard } from "../section-card";
import {
  downloadBase64,
  downloadBlob,
  useInspectFile,
  useIssueCredential,
  useVerifyCredential,
  type AuthorshipCredential,
} from "../../../queries/credential";

/**
 * SSP Credit Layer, as an engine module.
 *
 * An AI label on its own says "a tool made this". The credential issued here
 * puts the person first — who directed the work and what they decided — and
 * records the AI disclosure underneath it. The disclosure stays in the file;
 * the credential is signed over it, so the two travel together.
 */

const ROLES = ["creator", "director", "artist", "designer", "photographer", "producer"];

const inputClass =
  "w-full rounded-xl border border-obsidian-line bg-obsidian/60 px-3 py-2 text-sm text-bone placeholder:text-muted/60 focus:border-gold/50 focus:outline-none";
const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted";

function creditedName(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? `${fileName.slice(0, dot)}.ssp${fileName.slice(dot)}` : `${fileName}.ssp`;
}

function CreditBadge({ credential }: { credential: AuthorshipCredential }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/[0.06] p-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-gold" aria-hidden />
        <p className="font-display text-lg text-bone">{credential.credit.creator}</p>
        <span className="rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-gold">
          {credential.credit.role}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-bone/90">
        {credential.credit.contributions.map((c) => (
          <li key={c}>· {c}</li>
        ))}
      </ul>
      {credential.credit.statement && (
        <p className="mt-3 text-sm italic text-muted">&ldquo;{credential.credit.statement}&rdquo;</p>
      )}
      <p className="mt-3 border-t border-obsidian-line pt-2 text-xs text-muted">
        Tools:{" "}
        {[
          ...credential.ai_disclosure.declared_tools,
          ...credential.ai_disclosure.detected.map((d) => d.detail),
        ].join(" · ") || "none declared"}
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted">
        {credential.credential_id} · SHA-256 {credential.subject.content_sha256.slice(0, 16)}…
      </p>
    </div>
  );
}

export function CreditLayerModule() {
  const [file, setFile] = useState<File | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [role, setRole] = useState("creator");
  const [contributions, setContributions] = useState("");
  const [declaredTools, setDeclaredTools] = useState("");
  const [statement, setStatement] = useState("");

  const inspect = useInspectFile();
  const issue = useIssueCredential();
  const verify = useVerifyCredential();

  function pick(f: File | null) {
    setFile(f);
    issue.reset();
    if (f) inspect.mutate(f);
  }

  const issued = issue.data;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard
        title="Credit layer · Sign your authorship"
        subtitle="Put your name and your creative decisions first. AI disclosures stay in the file, recorded under your credit."
        glow
      >
        <label className={labelClass} htmlFor="credit-file">
          Image (PNG or JPEG embeds inline; other formats get a sidecar)
        </label>
        <input
          id="credit-file"
          type="file"
          accept="image/*,video/mp4"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-2 file:text-gold"
        />

        {inspect.isPending && <p className="mt-3 text-xs text-muted">Reading existing provenance…</p>}
        {inspect.error && <p className="mt-3 text-xs text-danger">{inspect.error.message}</p>}
        {inspect.data && (
          <div className="mt-3 rounded-xl border border-obsidian-line bg-obsidian/50 p-3">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <FileSearch className="h-3.5 w-3.5" aria-hidden />
              Found in file · {inspect.data.format}
            </p>
            {inspect.data.disclosures.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No AI disclosure metadata found.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs text-bone/90">
                {inspect.data.disclosures.map((d) => (
                  <li key={`${d.kind}-${d.location}`}>
                    {d.detail} <span className="text-muted">— {d.location} · kept</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-muted">
              Invisible pixel watermarks can only be read by their vendor&apos;s detector and are left as-is.
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="credit-name">Credited name</label>
            <input id="credit-name" className={inputClass} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="credit-role">Role</label>
            <select id="credit-role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className={labelClass} htmlFor="credit-contrib">What you did (one per line)</label>
          <textarea
            id="credit-contrib"
            rows={4}
            className={inputClass}
            placeholder={"Concept and composition\nSelected 1 of 240 generations\nHand retouch and colour grade"}
            value={contributions}
            onChange={(e) => setContributions(e.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="credit-tools">Tools used (one per line)</label>
            <textarea id="credit-tools" rows={2} className={inputClass} value={declaredTools} onChange={(e) => setDeclaredTools(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="credit-statement">Statement (optional)</label>
            <textarea id="credit-statement" rows={2} className={inputClass} value={statement} onChange={(e) => setStatement(e.target.value)} />
          </div>
        </div>

        <button
          type="button"
          disabled={!file || !creatorName.trim() || !contributions.trim() || issue.isPending}
          onClick={() => file && issue.mutate({ file, creatorName, role, contributions, declaredTools, statement })}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-obsidian transition-colors hover:bg-gold-bright disabled:opacity-40"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {issue.isPending ? "Signing…" : "Sign credential"}
        </button>
        {issue.error && <p className="mt-3 text-xs text-danger">{issue.error.message}</p>}
      </SectionCard>

      <div className="flex flex-col gap-4">
        <SectionCard title="Your credit" subtitle="What viewers see first, signed with the protocol's Ed25519 key.">
          {issued && file ? (
            <>
              <CreditBadge credential={issued.credential} />
              <div className="mt-4 flex flex-wrap gap-2">
                {issued.credited_file_b64 && (
                  <button
                    type="button"
                    onClick={() => downloadBase64(issued.credited_file_b64!, creditedName(file.name))}
                    className="inline-flex items-center gap-2 rounded-xl border border-gold/45 px-4 py-2 text-sm text-gold hover:bg-gold/10"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Credited file
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    downloadBlob(new Blob([issued.sidecar_json], { type: "application/json" }), `${file.name}.ssp.json`)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-obsidian-line px-4 py-2 text-sm text-muted hover:text-bone"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Credential (.json)
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Sign a file to see its credit.</p>
          )}
        </SectionCard>

        <SectionCard title="Verify a credited file" subtitle="Checks the signature, the file contents, and that no recorded disclosure was removed.">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-obsidian-line px-4 py-2 text-sm text-muted hover:text-bone">
            <Upload className="h-4 w-4" aria-hidden />
            Choose file
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) verify.mutate(f);
              }}
            />
          </label>
          {verify.error && <p className="mt-3 text-xs text-danger">{verify.error.message}</p>}
          {verify.data && (
            <div className="mt-3 space-y-3">
              <ul className="space-y-1 font-mono text-[11px]">
                {(
                  [
                    ["Signature", verify.data.signature_valid],
                    ["Contents unchanged", verify.data.content_intact],
                    ["Disclosures intact", verify.data.disclosures_intact],
                  ] as const
                ).map(([label, ok]) => (
                  <li key={label} className={ok ? "text-verified" : "text-danger"}>
                    {ok ? "✓" : "✗"} {label}
                  </li>
                ))}
              </ul>
              {verify.data.problems.map((p) => (
                <p key={p} className="flex items-start gap-2 text-xs text-danger">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {p}
                </p>
              ))}
              {verify.data.credential && <CreditBadge credential={verify.data.credential} />}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
