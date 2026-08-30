import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AudioWaveform, Loader2, Send, Volume2, VolumeX, X } from "lucide-react";
import { useSpaltyChat } from "../queries/spalty";

type Message = { id: string; role: "user" | "assistant"; content: string };

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  content: "I'm Spalty. Ask me anything about the MasterTrust, the Surrealizer Engine, or SSP.",
};

/** Fetches audio/mpeg from the Spalty voice route and plays it. Fails silently
 * (text-only) whenever ElevenLabs isn't configured or the request errors. */
async function speak(text: string, audioRef: React.MutableRefObject<HTMLAudioElement | null>) {
  try {
    const res = await fetch("/api/spalty/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    await audio.play().catch(() => {});
  } catch {
    // Voice is best-effort — the reply is already visible as text.
  }
}

export function SpaltyAssistant() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const chat = useSpaltyChat();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending]);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chat.isPending) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");

    chat.mutate(
      { messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })) },
      {
        onSuccess: (data) => {
          const reply = data.reply;
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
          if (!muted && data.available) void speak(reply, audioRef);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Spalty couldn't respond just now — try again in a moment.",
            },
          ]);
        },
      },
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface mb-3 flex h-[480px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl"
            style={{ boxShadow: "0 24px 60px -30px rgba(0,0,0,0.9)" }}
            role="dialog"
            aria-label="Spalty voice guide"
          >
            <header className="flex items-center justify-between border-b border-obsidian-line px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 text-gold">
                  <AudioWaveform size={16} />
                </div>
                <div>
                  <p className="font-display text-sm leading-none text-bone">Spalty</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Voice guide</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute Spalty's voice" : "Mute Spalty's voice"}
                  aria-pressed={muted}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:text-gold"
                >
                  {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Spalty"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:text-gold"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-gold/10 text-bone"
                      : "border border-obsidian-line bg-obsidian text-bone/90"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {chat.isPending && (
                <div className="flex items-center gap-2 border border-obsidian-line bg-obsidian rounded-xl px-3.5 py-2.5 text-sm text-muted w-fit">
                  <Loader2 size={14} className="animate-spin" /> Spalty is thinking…
                </div>
              )}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-obsidian-line p-3">
              <label className="sr-only" htmlFor="spalty-input">
                Message Spalty
              </label>
              <input
                id="spalty-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Spalty…"
                autoComplete="off"
                className="flex-1 rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 text-sm text-bone placeholder-bone/25 outline-none transition-colors focus:border-gold"
              />
              <button
                type="submit"
                disabled={!input.trim() || chat.isPending}
                aria-label="Send"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold text-obsidian transition-transform active:scale-95 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Spalty" : "Open Spalty, the voice guide"}
        aria-expanded={open}
        className="ml-auto grid h-14 w-14 place-items-center rounded-full border border-gold/50 bg-obsidian-raised text-gold transition-transform hover:-translate-y-0.5 hover:bg-gold hover:text-obsidian"
        style={{ boxShadow: "0 0 40px -14px rgba(197,160,89,0.7)" }}
      >
        {open ? <X size={20} /> : <AudioWaveform size={20} />}
      </button>
    </div>
  );
}
