import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { motion } from "motion/react";
import { Cpu, Globe } from "lucide-react";
import { Crest } from "./brand";

/**
 * Stage 1 — Passcode lock (no site content)
 * Stage 2 — Dual portal choice: Engine or Website
 * Stage 3 — Selected destination mounts routes
 *
 * All stage state is in-memory only: refresh always returns to Stage 1.
 */
const VALID_CODES = new Set(["1967"]);

type Stage = "lock" | "portals";
export type PortalChoice = "engine" | "website";

type GatewayContextValue = {
  portal: PortalChoice | null;
  returnToPortals: () => void;
  lockSignOut: () => void;
};

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function useGateway() {
  const ctx = useContext(GatewayContext);
  if (!ctx) {
    throw new Error("useGateway must be used within RootPasscodeLock");
  }
  return ctx;
}

/** Safe hook for optional gateway chrome (returns null outside provider). */
export function useGatewayOptional() {
  return useContext(GatewayContext);
}

export function RootPasscodeLock({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<Stage>("lock");
  const [portal, setPortal] = useState<PortalChoice | null>(null);

  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const returnToPortals = () => {
    setPortal(null);
    setStage("portals");
  };

  const lockSignOut = () => {
    setPortal(null);
    setStage("lock");
    setCode("");
    setError(false);
    setUnlocking(false);
  };

  const selectPortal = (choice: PortalChoice) => {
    setPortal(choice);
    navigate(choice === "engine" ? "/engine" : "/");
  };

  useEffect(() => {
    if (portal !== null) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [portal]);

  useEffect(() => {
    if (stage !== "lock") return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [stage]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    const ok = VALID_CODES.has(normalized);

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
      setStage("portals");
      setUnlocking(false);
      setCode("");
    }, 420);
  };

  const ctx: GatewayContextValue = { portal, returnToPortals, lockSignOut };

  // Destination unlocked — mount site / engine routes
  if (portal !== null) {
    return <GatewayContext.Provider value={ctx}>{children}</GatewayContext.Provider>;
  }

  return (
    <GatewayContext.Provider value={ctx}>
      <div className="fixed inset-0 z-[200] min-h-screen bg-obsidian" aria-label="Access gateway">
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 50% -10%, rgba(197,160,89,0.18), transparent 55%)",
          }}
        />

        {stage === "lock" ? (
          <div
            className={`relative z-10 flex min-h-screen items-center justify-center p-4 ${
              unlocking ? "opacity-90" : ""
            }`}
          >
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
        ) : (
          <PortalChooser onSelect={selectPortal} onLock={lockSignOut} />
        )}
      </div>
    </GatewayContext.Provider>
  );
}

function PortalChooser({
  onSelect,
  onLock,
}: {
  onSelect: (choice: PortalChoice) => void;
  onLock: () => void;
}) {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Crest size={40} />
          <div>
            <p className="eyebrow">Spalter Entertainment Technologies</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              System Online // Authorized Session
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLock}
          className="rounded-lg border border-obsidian-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-gold/40 hover:text-gold"
        >
          Lock / Sign Out
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-10 max-w-2xl text-center"
        >
          <h1 className="font-display text-3xl tracking-tight text-bone sm:text-4xl md:text-5xl">
            Select Authorized Gateway
          </h1>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Choose Engine or Website to continue.
          </p>
        </motion.div>

        <div
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          role="group"
          aria-label="Engine or Website portal"
        >
          <PortalDoor
            index="01"
            icon={Cpu}
            title="SSP Master Engine"
            subtitle="Multi-industry settlement mesh — Games, Film, Music, AI licensing & live IRS tax terminal."
            onClick={() => onSelect("engine")}
            delay={0.08}
          />
          <PortalDoor
            index="02"
            icon={Globe}
            title="Spalter Tech Website"
            subtitle="Public sovereign infrastructure site — pillars, Data Room, SSP framework & enterprise."
            onClick={() => onSelect("website")}
            delay={0.14}
          />
        </div>
      </main>

      <footer className="pb-2 pt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70">
        Dual-Portal Gateway · Authorized access only
      </footer>
    </div>
  );
}

function PortalDoor({
  index,
  icon: Icon,
  title,
  subtitle,
  onClick,
  delay,
}: {
  index: string;
  icon: typeof Cpu;
  title: string;
  subtitle: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay }}
      onClick={onClick}
      className="group card-surface rounded-2xl p-7 text-left transition-all hover:-translate-y-1 hover:border-gold/50"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/35 bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-obsidian">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <span className="font-mono text-2xl text-obsidian-line transition-colors group-hover:text-gold/35">
          {index}
        </span>
      </div>
      <p className="eyebrow">Gateway {index}</p>
      <h2 className="mt-2 font-display text-xl text-bone sm:text-2xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
        Enter gateway →
      </p>
    </motion.button>
  );
}
