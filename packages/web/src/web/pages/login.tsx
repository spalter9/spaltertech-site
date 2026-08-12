import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "motion/react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Crest } from "../components/brand";
import { authClient } from "../lib/auth";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setError(null);
    const res = await authClient.managedAuth.signIn({ provider: "google" });
    if (res.error && res.error.code !== "POPUP_CLOSED") setError(res.error.message ?? "Sign-in failed");
    else if (!res.error) navigate("/data-room");
  }

  async function emailPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email.split("@")[0]! });
      if (res.error) setError(res.error.message ?? "Authentication failed");
      else navigate("/data-room");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian text-bone grid place-items-center relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(197,160,89,0.12), transparent 55%)" }} />

      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-bone transition-colors">
        <ArrowLeft size={14} /> Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-[420px] card-surface p-10"
      >
        <div className="flex flex-col items-center text-center">
          <Crest size={58} />
          <p className="eyebrow mt-6">The MasterTrust</p>
          <h1 className="font-display text-3xl mt-2">Data Room Access</h1>
          <p className="text-muted text-sm mt-2">Privileged disclosure. Verified credentials required.</p>
        </div>

        <button
          onClick={google}
          className="mt-8 w-full flex items-center justify-center gap-3 py-3 border border-obsidian-line hover:border-gold text-bone font-mono text-xs uppercase tracking-[0.18em] transition-colors"
        >
          <GoogleMark /> Continue with Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-obsidian-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">or</span>
          <div className="h-px flex-1 bg-obsidian-line" />
        </div>

        <form onSubmit={emailPassword} className="space-y-3">
          {mode === "signup" && (
            <Field label="Name" value={name} onChange={setName} type="text" placeholder="Full name" />
          )}
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@firm.com" required />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />

          {error && <p className="text-danger text-xs font-mono">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold text-obsidian font-mono text-xs uppercase tracking-[0.2em] hover:bg-gold-bright transition-colors disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {mode === "signin" ? "Enter Data Room" : "Create Access"}
          </button>
        </form>

        <p className="text-center text-muted text-xs mt-6">
          {mode === "signin" ? "No credentials yet?" : "Already have access?"}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-gold hover:text-gold-bright transition-colors"
          >
            {mode === "signin" ? "Request access" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</span>
      <input
        type={type}
        aria-label={label}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-obsidian border border-obsidian-line focus:border-gold outline-none px-4 py-3 text-sm text-bone font-body transition-colors"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
