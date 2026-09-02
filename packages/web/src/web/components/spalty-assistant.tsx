import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AudioWaveform,
  Loader2,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useSpaltyChat } from "../queries/spalty";
import { useSpaltyVoice } from "../hooks/use-spalty-voice";
import { useSpeechInput } from "../hooks/use-speech-input";

type Message = { id: string; role: "user" | "assistant"; content: string };

const GREETING: Message = {
  id: "greeting",
  role: "assistant",
  content: "I'm Spalty. Ask me anything about the MasterTrust, the Surrealizer Engine, or SSP.",
};

export function SpaltyAssistant() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  /** Hands-free: after Spalty finishes speaking, the mic reopens on its own. */
  const [handsFree, setHandsFree] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  /** Authoritative history, read outside of React's render cycle. */
  const messagesRef = useRef<Message[]>([GREETING]);

  const chat = useSpaltyChat();
  const voice = useSpaltyVoice();
  const listRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chat.isPending) return;

      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
      // History comes from a ref, not from inside a state updater: React invokes
      // updater functions twice under StrictMode, which would fire the model and
      // the voice twice for every message sent.
      const history = [...messagesRef.current, userMsg];
      messagesRef.current = history;
      setMessages(history);
      setInput("");

      chat.mutate(
          { messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })) },
          {
            onSuccess: (data) => {
              const reply: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.reply,
              };
              messagesRef.current = [...messagesRef.current, reply];
              setMessages(messagesRef.current);
              // Speak anything the server actually said, including a transient
              // "try again" — going silent is how a single hiccup used to turn
              // the rest of the session into text. Only a permanently
              // unconfigured backend is left unspoken, so it cannot loop on
              // synthesising the same offline notice.
              if (!mutedRef.current && data.status !== "unconfigured") {
                void voice.speak(data.reply);
              }
            },
            onError: () => {
              const failure: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Spalty couldn't respond just now — try again in a moment.",
              };
              messagesRef.current = [...messagesRef.current, failure];
              setMessages(messagesRef.current);
            },
          },
      );
    },
    [chat, voice],
  );

  // Speaking into the mic sends as soon as you stop talking — no extra tap.
  const speech = useSpeechInput({ onFinal: (transcript) => send(transcript) });

  // In hands-free mode, reopen the mic once Spalty has finished her answer.
  useEffect(() => {
    voice.setOnEnded(() =>
      handsFree && speech.supported
        ? () => {
            speech.start();
          }
        : null,
    );
  }, [handsFree, speech, voice]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chat.isPending, speech.interim]);

  const close = () => {
    speech.stop();
    voice.stop();
    setHandsFree(false);
    setOpen(false);
  };

  const toggleOpen = () => {
    if (open) {
      close();
      return;
    }
    // Opening is a real user gesture — the one moment the browser will let us
    // prime the audio element so every later reply can speak.
    voice.unlock();
    setOpen(true);
  };

  const voiceOff = muted || voice.unavailable;

  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface mb-3 flex h-[520px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl"
            style={{ boxShadow: "0 24px 60px -30px rgba(0,0,0,0.9)" }}
            role="dialog"
            aria-label="Spalty voice guide"
          >
            <header className="flex items-center justify-between border-b border-obsidian-line px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border text-gold transition-colors ${
                    voice.speaking ? "border-gold bg-gold/15" : "border-gold/40"
                  }`}
                >
                  <AudioWaveform size={16} className={voice.speaking ? "animate-pulse" : ""} />
                </div>
                <div>
                  <p className="font-display text-sm leading-none text-bone">Spalty</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    {voice.speaking
                      ? "Speaking"
                      : speech.listening
                        ? "Listening"
                        : voice.loading
                          ? "Loading voice"
                          : "Voice guide"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {speech.supported && (
                  <button
                    type="button"
                    onClick={() => setHandsFree((h) => !h)}
                    aria-label={handsFree ? "Turn off hands-free" : "Turn on hands-free"}
                    aria-pressed={handsFree}
                    title="Hands-free: the mic reopens after each answer"
                    className={`rounded-lg px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                      handsFree ? "bg-gold/15 text-gold" : "text-muted hover:text-gold"
                    }`}
                  >
                    Hands-free
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!muted) voice.stop();
                    setMuted((m) => !m);
                  }}
                  aria-label={muted ? "Unmute Spalty's voice" : "Mute Spalty's voice"}
                  aria-pressed={muted}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:text-gold"
                >
                  {voiceOff ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={close}
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

              {speech.listening && speech.interim && (
                <div className="ml-auto max-w-[85%] rounded-xl border border-gold/25 bg-gold/5 px-3.5 py-2.5 text-sm italic leading-relaxed text-bone/60">
                  {speech.interim}
                </div>
              )}

              {chat.isPending && (
                <div className="flex w-fit items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian px-3.5 py-2.5 text-sm text-muted">
                  <Loader2 size={14} className="animate-spin" /> Spalty is thinking…
                </div>
              )}
            </div>

            {/* Playback refused by the browser: one tap fixes it, so say so. */}
            {voice.blocked && !voiceOff && (
              <button
                type="button"
                onClick={() => void voice.resume()}
                className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold"
              >
                <Volume2 size={13} /> Tap to let Spalty speak
              </button>
            )}

            {speech.error && (
              <p
                role="alert"
                className="mx-3 mb-2 rounded-lg border border-danger/35 bg-danger/10 px-3 py-2 text-[11px] leading-relaxed text-danger"
              >
                {speech.error}
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-obsidian-line p-3"
            >
              <label className="sr-only" htmlFor="spalty-input">
                Message Spalty
              </label>

              {speech.supported && (
                <button
                  type="button"
                  onClick={() => {
                    voice.unlock();
                    if (speech.listening) speech.stop();
                    else {
                      voice.stop();
                      speech.start();
                    }
                  }}
                  aria-label={speech.listening ? "Stop listening" : "Speak to Spalty"}
                  aria-pressed={speech.listening}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                    speech.listening
                      ? "animate-pulse border-gold bg-gold text-obsidian"
                      : "border-obsidian-line text-muted hover:border-gold/50 hover:text-gold"
                  }`}
                >
                  {speech.listening ? <Square size={13} /> : <Mic size={15} />}
                </button>
              )}

              {!speech.supported && (
                <span
                  title="This browser has no speech recognition — Chrome, Edge, or Safari can listen."
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-obsidian-line text-muted/40"
                >
                  <MicOff size={15} />
                </span>
              )}

              <input
                id="spalty-input"
                type="text"
                aria-label="Message Spalty"
                value={speech.listening ? speech.interim : input}
                onChange={(e) => setInput(e.target.value)}
                readOnly={speech.listening}
                placeholder={speech.listening ? "Listening…" : "Ask Spalty…"}
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-obsidian-line bg-obsidian px-3 py-2 text-sm text-bone placeholder-bone/25 outline-none transition-colors focus:border-gold"
              />

              {voice.speaking ? (
                <button
                  type="button"
                  onClick={voice.stop}
                  aria-label="Stop Spalty speaking"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold/50 text-gold transition-transform active:scale-95"
                >
                  <Square size={13} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || chat.isPending || speech.listening}
                  aria-label="Send"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold text-obsidian transition-transform active:scale-95 disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggleOpen}
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
