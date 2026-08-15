import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { Crest } from "./brand";

/**
 * Root passcode lock — Stage 1 gatekeeper.
 * Until unlocked, NO site routes mount. Auth is in-memory only so every
 * fresh load / refresh returns to this screen (no sessionStorage skip).
 */
const VALID_CODES = new Set(["8888", "SPALTER", "SSP2026"]);

export function RootPasscodeLock({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (unlocked) return undefined;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [unlocked]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    const ok = VALID_CODES.has(normalized) || code.trim() === "8888";

    if (!ok) {
      setError(true);
      setCode("");
      setShake((s) => s + 1);
      inputRef.current?.focus();
      return;
    }

    setError(false);
    setUnlocking(true);
    window.setTimeout(() => {
      setUnlocked(true);
      setUnlocking(false);
      setCode("");
    }, 420);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div
      className={`fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-obsidian p-4 ${
        unlocking ? "opacity-90" : ""
      }`}
      aria-label="Passcode lock screen"
    >
      <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.18), transparent 55%)",
        }}
      />

      <motion.div
        key={shake}
        initial={shake === 0 ? { opacity: 0, y: 20, scale: 0.97 } : false}
        animate={
          shake === 0
            ? { opacity: 1, y: 0, scale: 1 }
            : { x: [0, -10, 9, -7, 4, 0] }
        }
        transition={
          shake === 0
            ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.42 }
        }
        className="relative w-full max-w-md space-y-7 rounded-2xl border border-obsidian-line bg-obsidian-raised p-8 text-center md:p-10"
        style={{
          boxShadow:
            "0 0 80px -32px rgba(197,160,89,0.55), 0 24px 60px -30px rgba(0,0,0,0.9)",
        }}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <Crest size={56} />
          </div>
          <p className="eyebrow">Spalter Entertainment Technologies</p>
          <h1 className="font-display gold-text text-2xl tracking-tight md:text-3xl">
            Restricted Executive Access
          </h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-bone/60">
            System Online. Enter your authorized passcode to unlock the gateway.
          </p>
        </div>

        <div
          className="h-px w-full"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(197,160,89,0.45), transparent)",
          }}
        />

        <form onSubmit={submit} className="space-y-4" noValidate>
          <label className="sr-only" htmlFor="root-passcode">
            Passcode
          </label>
          <input
            id="root-passcode"
            ref={inputRef}
            type="password"
            autoComplete="off"
            spellCheck={false}
            disabled={unlocking}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(false);
            }}
            placeholder="Enter passcode"
            aria-invalid={error}
            aria-describedby={error ? "root-passcode-error" : undefined}
            className={`w-full rounded-xl border bg-obsidian px-4 py-3.5 text-center font-mono text-lg tracking-[0.28em] text-bone placeholder-bone/25 outline-none transition-all ${
              error
                ? "border-danger focus:border-danger"
                : "border-obsidian-line focus:border-gold"
            }`}
            style={
              error
                ? undefined
                : { boxShadow: "inset 0 0 24px -14px rgba(197,160,89,0.5)" }
            }
          />

          <p
            id="root-passcode-error"
            role="alert"
            className={`font-mono text-[0.7rem] uppercase tracking-wider text-danger transition-opacity ${
              error ? "opacity-100" : "opacity-0"
            }`}
          >
            Invalid Access Code
          </p>

          <button
            type="submit"
            disabled={unlocking || !code.trim()}
            className="w-full rounded-xl bg-gold px-6 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-obsidian transition-all hover:bg-gold-bright active:scale-[0.98] disabled:opacity-50"
            style={{ boxShadow: "0 0 40px -14px rgba(197,160,89,0.7)" }}
          >
            {unlocking ? "Unlocking…" : "Unlock Gateway"}
          </button>
        </form>

        <p className="font-mono text-[0.65rem] uppercase leading-relaxed tracking-[0.18em] text-bone/35">
          Protected by MasterTrust
          <br />
          Secure Protocol Infrastructure
        </p>
      </motion.div>
    </div>
  );
}
