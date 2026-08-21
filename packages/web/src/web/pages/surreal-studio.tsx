import { useId, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { motion } from "motion/react";
import {
  AudioWaveform,
  CheckCircle2,
  Download,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Nav } from "../components/nav";
import {
  useDspProfiles,
  useFloat32Masters,
  useRenderFloat32Master,
  type DspProfileId,
  type RenderUploadResult,
} from "../queries/surreal-studio";

const DEFAULT_PROFILE: DspProfileId = "spatial-holographic";

export default function SurrealStudio() {
  const formId = useId();
  const profiles = useDspProfiles();
  const masters = useFloat32Masters();
  const render = useRenderFloat32Master();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("Spalter Creator");
  const [profileId, setProfileId] = useState<DspProfileId>(DEFAULT_PROFILE);
  const [rightsType, setRightsType] = useState<"MASTER" | "COMPOSITION" | "NEIGHBORING">("MASTER");
  const [isrc, setIsrc] = useState("");
  const [result, setResult] = useState<RenderUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Select an MP3 or WAV file to render.");
      return;
    }
    setError(null);
    setResult(null);
    try {
      const out = await render.mutateAsync({
        file,
        profileId,
        title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
        creatorName: creatorName.trim() || "Spalter Creator",
        rightsType,
        isrc: isrc.trim() || undefined,
      });
      setResult(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.12), transparent 55%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <p className="eyebrow">Surreal Engine · Float32 Pipeline</p>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05]">
              32-bit float spatial render
              <span className="gold-text"> + SSP stamp</span>
            </h1>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              Upload a track, select a Float32 DSP profile, run the Surreal Engine chain
              (multi-band dynamics, linear-phase EQ, mid-side holographic staging), pass
              forensic phase/spectral gates, then bind the master to the Sovereign Sign ledger.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.form
              id={formId}
              onSubmit={onSubmit}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="card-surface space-y-5 rounded-2xl p-6 md:p-8"
            >
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Audio file (MP3 / WAV)
                </span>
                <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-obsidian-line bg-obsidian/50 p-5 sm:flex-row sm:items-center">
                  <Upload className="h-5 w-5 shrink-0 text-gold" aria-hidden />
                  <input
                    type="file"
                    accept=".wav,.mp3,audio/wav,audio/mpeg"
                    aria-label="Upload audio file"
                    onChange={(e) => {
                      const next = e.target.files?.[0] ?? null;
                      setFile(next);
                      if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ""));
                    }}
                    className="w-full text-sm text-bone file:mr-3 file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.14em] file:text-gold"
                  />
                </div>
                {file && (
                  <p className="mt-2 font-mono text-[11px] text-muted">
                    {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </label>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Track title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
                  placeholder="Master title"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Creator
                  </span>
                  <input
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    Rights type
                  </span>
                  <select
                    value={rightsType}
                    onChange={(e) =>
                      setRightsType(e.target.value as "MASTER" | "COMPOSITION" | "NEIGHBORING")
                    }
                    className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 text-sm text-bone outline-none focus:border-gold/45"
                  >
                    <option value="MASTER">Master</option>
                    <option value="COMPOSITION">Composition</option>
                    <option value="NEIGHBORING">Neighboring</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  ISRC (optional)
                </span>
                <input
                  value={isrc}
                  onChange={(e) => setIsrc(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-obsidian-line bg-obsidian px-4 py-3 font-mono text-sm text-bone outline-none focus:border-gold/45"
                  placeholder="US-SPA-26-00000"
                />
              </label>

              <fieldset>
                <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Float32 DSP profile
                </legend>
                <div className="mt-3 grid gap-3">
                  {(profiles.data ?? []).map((p) => (
                    <label
                      key={p.id}
                      className={[
                        "cursor-pointer rounded-xl border p-4 transition-colors",
                        profileId === p.id
                          ? "border-gold/45 bg-gold/10"
                          : "border-obsidian-line bg-obsidian/40 hover:border-gold/25",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="profile"
                          value={p.id}
                          checked={profileId === p.id}
                          onChange={() => setProfileId(p.id as DspProfileId)}
                          className="mt-1 accent-[#c5a059]"
                        />
                        <div>
                          <p className="font-display text-lg text-bone">{p.label}</p>
                          <p className="mt-1 text-sm text-muted">{p.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                  {profiles.isLoading && (
                    <p className="text-sm text-muted">Loading DSP profiles…</p>
                  )}
                </div>
              </fieldset>

              {error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={render.isPending || !file}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-bright px-5 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-obsidian transition hover:opacity-90 disabled:opacity-50"
              >
                {render.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Rendering Float32 master…
                  </>
                ) : (
                  <>
                    <AudioWaveform className="h-4 w-4" aria-hidden /> Render · Verify · Stamp SSP
                  </>
                )}
              </button>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="space-y-5"
            >
              <div className="card-surface rounded-2xl p-6">
                <p className="eyebrow">Pipeline</p>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  <li className="flex gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                    Ingest → native Float32 tensor buffers (pcm_f32le)
                  </li>
                  <li className="flex gap-2">
                    <AudioWaveform className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                    Multi-band dynamics · linear-phase EQ · mid-side spatial matrix
                  </li>
                  <li className="flex gap-2">
                    <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                    Forensic phase + spectral gate before on-chain rights
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                    Uncompressed 32-bit float WAV export + SSP ledger attestation
                  </li>
                </ul>
                <Link
                  to="/engine"
                  className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:text-gold-bright"
                >
                  Open Master Engine →
                </Link>
              </div>

              {result && (
                <div className="card-surface rounded-2xl border-verified/30 p-6">
                  <div className="flex items-center gap-2 text-verified">
                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                    <p className="font-display text-xl">Master stamped</p>
                  </div>
                  <dl className="mt-4 space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Asset key</dt>
                      <dd className="truncate text-gold">{result.assetKey}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Provenance</dt>
                      <dd className="truncate text-bone">{result.provenanceHash}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Ledger tx</dt>
                      <dd className="truncate text-bone">{result.ledgerTxHash.slice(0, 18)}…</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Format</dt>
                      <dd className="text-bone">
                        {result.sampleRate} Hz · {result.channels}ch · 32-bit float
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Phase corr.</dt>
                      <dd className="text-bone">{result.forensic.phaseCorrelation.toFixed(4)}</dd>
                    </div>
                  </dl>
                  <a
                    href={result.downloadPath}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-gold transition hover:bg-gold/15"
                  >
                    <Download className="h-4 w-4" aria-hidden /> Download Float32 WAV
                  </a>
                </div>
              )}
            </motion.div>
          </div>

          <section className="mt-14">
            <p className="eyebrow">Stamped masters</p>
            <h2 className="mt-2 font-display text-3xl">SSP Float32 archive</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-obsidian-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-obsidian-raised/80 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {masters.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-gold" /> Loading…
                      </td>
                    </tr>
                  )}
                  {masters.data?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        No Float32 masters yet. Render one above.
                      </td>
                    </tr>
                  )}
                  {masters.data?.map((m) => (
                    <tr key={m.masterId} className="border-t border-obsidian-line">
                      <td className="px-4 py-3 text-bone">{m.title}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{m.profileId}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gold">{m.assetKey}</td>
                      <td className="px-4 py-3 text-muted">{m.durationSec.toFixed(1)}s</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/surealizer/masters/${m.masterId}/download`}
                          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gold hover:text-gold-bright"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden /> WAV
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
