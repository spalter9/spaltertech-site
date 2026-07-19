import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";

type VideoSource = { src: string; type?: string };

interface VideoPlayerProps {
  /** Ordered source list. First playable wins. */
  sources: VideoSource[];
  poster?: string;
  className?: string;
  /** Aspect ratio box, e.g. "16 / 9" or "9 / 16". Defaults to 16 / 9. */
  ratio?: string;
}

const fmt = (t: number) => {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Streaming-safe HTML5 player.
 * - Never leaves a play() promise unhandled (prevents the "video track halts,
 *   audio keeps going" state some browsers fall into on a rejected play()).
 * - Recovers from stalls/waiting by surfacing a buffering state instead of freezing.
 * - Hard error state with a retry that reloads the media element cleanly.
 */
export function VideoPlayer({ sources, poster, className = "", ratio = "16 / 9" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [started, setStarted] = useState(false);

  // Safe play(): swallow AbortError/NotAllowedError so a rejected promise never
  // desyncs the UI or halts the render loop.
  const safePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
    } catch (err) {
      const name = (err as DOMException)?.name;
      // AbortError: play() interrupted by a new load/pause — benign.
      // NotAllowedError: autoplay policy — require a user gesture (already have one here).
      if (name && name !== "AbortError" && name !== "NotAllowedError") {
        setError("Playback could not start. Tap retry.");
      }
      setPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    if (v.paused || v.ended) {
      void safePlay();
    } else {
      v.pause();
    }
  }, [safePlay]);

  const retry = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setError(null);
    setBuffering(true);
    // Force a clean reload of the media pipeline.
    v.load();
    void safePlay();
  }, [safePlay]);

  const seek = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = (val / 100) * v.duration;
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const goFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  // Wire up media element events.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => { setDuration(v.duration || 0); setReady(true); };
    const onTime = () => setCurrent(v.currentTime || 0);
    const onPlay = () => { setPlaying(true); setError(null); };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => { setBuffering(false); setError(null); };
    const onCanPlay = () => setBuffering(false);
    const onStalled = () => setBuffering(true);
    const onEnded = () => setPlaying(false);
    const onError = () => {
      const code = v.error?.code;
      const msg =
        code === 1 ? "Playback aborted." :
        code === 2 ? "Network error while loading video." :
        code === 3 ? "Video decode error." :
        code === 4 ? "Video format not supported." :
        "Unable to play this video.";
      setError(msg);
      setBuffering(false);
      setPlaying(false);
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
    };
  }, []);

  // Auto-hide controls while playing.
  const nudgeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden border border-obsidian-line bg-black group ${className}`}
      style={{ aspectRatio: ratio }}
      onMouseMove={nudgeControls}
      onMouseLeave={() => { if (playing) setControlsVisible(false); }}
    >
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-contain bg-black"
        onClick={togglePlay}
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type ?? "video/mp4"} />
        ))}
        {/* Narrated briefing has no separate caption track. */}
        <track kind="captions" />
      </video>

      {/* Buffering spinner */}
      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
          <Loader2 className="animate-spin text-gold" size={40} />
        </div>
      )}

      {/* Big center play button before first start */}
      {!started && !error && (
        <button
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 grid place-items-center bg-black/40 transition-colors hover:bg-black/25"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full border border-gold/70 bg-obsidian/70 backdrop-blur-sm transition-transform hover:scale-105">
            <Play className="ml-1 text-gold" size={30} fill="currentColor" />
          </span>
        </button>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="text-danger" size={30} />
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-bone/90">{error}</p>
            <button
              onClick={retry}
              className="mt-1 flex items-center gap-2 border border-gold px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-obsidian"
            >
              <RotateCcw size={13} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 ${
          controlsVisible || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          aria-label="Seek"
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded bg-obsidian-line accent-gold"
          style={{ background: `linear-gradient(to right, var(--color-gold) ${progress}%, var(--color-obsidian-line) ${progress}%)` }}
        />
        <div className="mt-2 flex items-center gap-4">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="text-bone transition-colors hover:text-gold">
            {playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="text-bone transition-colors hover:text-gold">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span className="font-mono text-[11px] tabular-nums text-muted">
            {fmt(current)} <span className="text-obsidian-line">/</span> {ready ? fmt(duration) : "—:—"}
          </span>
          <div className="flex-1" />
          <button onClick={goFullscreen} aria-label="Fullscreen" className="text-bone transition-colors hover:text-gold">
            <Maximize2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
