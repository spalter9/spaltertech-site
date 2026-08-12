import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crest } from "./brand";

/* ------------------------------------------------------------------ */
/* MasterTrust Exclusive Access Gate                                   */
/*                                                                     */
/* NOTE: This is a cosmetic deterrent, NOT security. The passcode is    */
/* present in the client bundle and the gate can be bypassed from the   */
/* browser console. Anything genuinely confidential must live behind    */
/* the server-authenticated /data-room instead.                        */
/* ------------------------------------------------------------------ */

const AUTHORIZED_CODE = "8888";
const STORAGE_KEY = "mastertrust_authenticated";
const CODE_LENGTH = 4;

export function AccessGate() {
  // undefined = still resolving session, true = show gate, false = dismissed
  const [locked, setLocked] = useState<boolean | undefined>(undefined);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let authed = false;
    try {
      authed = sessionStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      authed = false;
    }
    setLocked(!authed);
  }, []);

  useEffect(() => {
    if (locked === true) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [locked]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() === AUTHORIZED_CODE) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        /* storage unavailable — still allow entry for this view */
      }
      setLocked(false);
      return;
    }
    setError(true);
    setCode("");
    setShake((s) => s + 1);
    inputRef.current?.focus();
  };

  if (locked !== true) return null;

  return (
    <AnimatePresence>
      <motion.dialog
        open
        className="fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-obsidian/97 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        aria-labelledby="gate-title"
      >
        {/* Ambient theme background: gold grid + top glow */}
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.14), transparent 55%)" }}
        />

        <motion.div
          key={shake}
          initial={shake === 0 ? { opacity: 0, y: 18, scale: 0.97 } : false}
          animate={
            shake === 0
              ? { opacity: 1, y: 0, scale: 1 }
              : { x: [0, -9, 8, -6, 4, 0] }
          }
          transition={
            shake === 0
              ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.42 }
          }
          className="relative bg-obsidian-raised border border-obsidian-line rounded-2xl p-8 md:p-10 max-w-md w-full text-center space-y-7"
          style={{ boxShadow: "0 0 80px -32px rgba(197,160,89,0.55), 0 24px 60px -30px rgba(0,0,0,0.9)" }}
        >
          {/* Branding header */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <Crest size={52} />
            </div>
            <span className="eyebrow block">Restricted Access</span>
            <h3
              id="gate-title"
              className="font-display gold-text text-2xl md:text-3xl tracking-tight"
            >
              MasterTrust Portal
            </h3>
            <p className="text-bone/60 text-sm leading-relaxed max-w-xs mx-auto">
              Enter your authorized investor or partner numerical access code to
              enter.
            </p>
          </div>

          {/* Gold hairline divider */}
          <div
            className="h-px w-full"
            aria-hidden="true"
            style={{ background: "linear-gradient(to right, transparent, rgba(197,160,89,0.45), transparent)" }}
          />

          {/* Passcode form */}
          <form onSubmit={submit} className="space-y-4">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                if (error) setError(false);
              }}
              placeholder="••••"
              aria-label="Access code"
              aria-invalid={error}
              className={`font-mono w-full px-4 py-3.5 bg-obsidian border rounded-xl text-center text-2xl tracking-[0.5em] indent-[0.5em] text-bone placeholder-bone/20 focus:outline-none transition-all ${
                error
                  ? "border-red-500/60 focus:border-red-400"
                  : "border-obsidian-line focus:border-gold"
              }`}
              style={error ? undefined : { boxShadow: "inset 0 0 24px -14px rgba(197,160,89,0.5)" }}
              required
            />

            <div
              className={`text-red-400/90 font-mono text-[0.7rem] tracking-wider uppercase transition-opacity duration-200 ${
                error ? "opacity-100" : "opacity-0"
              }`}
              role="alert"
            >
              Invalid access code — verify your credentials
            </div>

            <button
              type="submit"
              className="font-mono w-full py-3.5 px-6 rounded-xl bg-gold text-obsidian font-semibold uppercase tracking-[0.18em] text-xs hover:bg-gold-bright active:scale-[0.98] transition-all"
              style={{ boxShadow: "0 0 40px -14px rgba(197,160,89,0.7)" }}
            >
              Authorize Entry
            </button>
          </form>

          <div className="font-mono text-[0.65rem] text-bone/35 tracking-[0.18em] uppercase leading-relaxed">
            Protected by MasterTrust
            <br />
            Secure Protocol Infrastructure
          </div>
        </motion.div>
      </motion.dialog>
    </AnimatePresence>
  );
}
