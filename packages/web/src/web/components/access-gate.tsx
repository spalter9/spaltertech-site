import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

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
        className="fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-slate-950/95 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        aria-labelledby="gate-title"
      >
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
          className="bg-gradient-to-br from-slate-900 to-blue-950/60 border border-cyan-500/30 rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl text-center space-y-6"
        >
          {/* Branding header */}
          <div className="space-y-2">
            <span className="block text-cyan-400 text-xs font-semibold tracking-widest uppercase">
              Restricted Access
            </span>
            <h3
              id="gate-title"
              className="text-2xl font-bold text-white tracking-tight"
            >
              MasterTrust Portal
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Enter your authorized investor or partner numerical access code to
              enter.
            </p>
          </div>

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
              className="w-full px-4 py-3 bg-slate-950/80 border border-cyan-500/40 rounded-xl text-center text-2xl tracking-[0.4em] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              required
            />

            <div
              className={`text-rose-400 text-xs transition-opacity duration-200 ${
                error ? "opacity-100" : "opacity-0"
              }`}
              role="alert"
            >
              Invalid access code. Please verify your credentials.
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 active:scale-[0.98] transition-all text-sm shadow-lg shadow-cyan-500/20"
            >
              Authorize Entry
            </button>
          </form>

          <div className="text-xs text-slate-500">
            Protected by MasterTrust Secure Protocol Infrastructure
          </div>
        </motion.div>
      </motion.dialog>
    </AnimatePresence>
  );
}
