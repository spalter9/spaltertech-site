import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Maximize2, RotateCcw } from "lucide-react";

/**
 * Landing hero video — autoplays muted the instant the page loads (browser-safe),
 * with a pulsing "sound on" prompt. First interaction unmutes and restarts from
 * 0:00 so the narration and hard-electronic score play in perfect sync.
 * Plays through exactly once (no loop); on end, holds on the final frame and
 * shows a replay control.
 */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    void v.play().catch(() => {});
    const onEnded = () => setEnded(true);
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, []);

  const engage = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.currentTime = 0;
    setEnded(false);
    void v.play().catch(() => {});
    setEngaged(true);
  }, []);

  const replay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    void v.play().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) setEngaged(true);
  }, []);

  const fullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="group relative w-full overflow-hidden border border-obsidian-line bg-black shadow-[0_0_80px_-30px_rgba(197,160,89,0.5)]"
      style={{ aspectRatio: "16 / 9" }}
    >
      <video
        ref={ref}
        poster={poster}
        muted={muted}
        playsInline
        preload="auto"
        aria-label="The Sovereign Briefing hero film"
        className="absolute inset-0 h-full w-full object-cover"
        onClick={engaged ? toggleMute : engage}
      >
        <source src={src} type="video/mp4" />
        <track kind="captions" />
      </video>

      {/* Sound prompt overlay (before engagement) */}
      {!engaged && (
        <button
          onClick={engage}
          aria-label="Play with sound"
          className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/50 via-transparent to-black/20 transition-colors hover:bg-black/30"
        >
          <span className="flex flex-col items-center gap-3">
            <span className="relative grid h-16 w-16 place-items-center rounded-full border border-gold/70 bg-obsidian/60 backdrop-blur-sm">
              <span className="absolute inset-0 rounded-full border border-gold/40 animate-ping" />
              <Play className="ml-0.5 text-gold" size={24} fill="currentColor" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-bone/90">Tap for sound</span>
          </span>
        </button>
      )}

      {/* Replay overlay (after the film has finished — no auto-loop) */}
      {ended && (
        <button
          onClick={replay}
          aria-label="Replay"
          className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/60 via-black/25 to-black/40 transition-colors hover:bg-black/40"
        >
          <span className="flex flex-col items-center gap-3">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-gold/70 bg-obsidian/60 backdrop-blur-sm transition-transform hover:scale-105">
              <RotateCcw className="text-gold" size={22} />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-bone/90">Replay</span>
          </span>
        </button>
      )}

      {/* Corner controls */}
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}
          className="grid h-9 w-9 place-items-center rounded-full bg-obsidian/70 border border-obsidian-line text-bone hover:text-gold backdrop-blur-sm transition-colors">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button onClick={fullscreen} aria-label="Fullscreen"
          className="grid h-9 w-9 place-items-center rounded-full bg-obsidian/70 border border-obsidian-line text-bone hover:text-gold backdrop-blur-sm transition-colors">
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Live badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-obsidian/70 border border-obsidian-line px-3 py-1.5 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-bone/90">The Sovereign Briefing · 0:60</span>
      </div>
    </div>
  );
}
