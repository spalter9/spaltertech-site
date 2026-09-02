import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spalty's speaking voice.
 *
 * The subtle part is browser autoplay policy. A browser grants playback
 * permission to an *element* that a user gesture started, not to the page — so
 * creating a fresh `new Audio()` for every reply gets exactly one utterance
 * through (the one still inside the click's grace window) and then goes silent,
 * with the rejection swallowed. That is the "it speaks the first answer then
 * only texts" failure.
 *
 * So this holds one element for the life of the widget, unlocks it on the first
 * real user gesture, and afterwards only swaps its `src`. When playback is
 * refused anyway, it says so instead of degrading silently.
 */

export type VoiceState = {
  /** Audio is currently playing. */
  speaking: boolean;
  /** Fetching the audio for a reply. */
  loading: boolean;
  /** The browser refused playback — the UI should offer a tap to enable it. */
  blocked: boolean;
  /** The server has no voice configured; stay text-only without complaining. */
  unavailable: boolean;
};

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function useSpaltyVoice() {
  const elementRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const unlockedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Guards against an earlier, slower reply speaking over a newer one. */
  const generationRef = useRef(0);

  const [state, setState] = useState<VoiceState>({
    speaking: false,
    loading: false,
    blocked: false,
    unavailable: false,
  });
  const [onEnded, setOnEnded] = useState<(() => void) | null>(null);
  const onEndedRef = useRef<(() => void) | null>(null);
  onEndedRef.current = onEnded;

  const element = useCallback(() => {
    if (!elementRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.addEventListener("ended", () => {
        setState((s) => ({ ...s, speaking: false }));
        onEndedRef.current?.();
      });
      audio.addEventListener("pause", () => setState((s) => ({ ...s, speaking: false })));
      audio.addEventListener("playing", () =>
        setState((s) => ({ ...s, speaking: true, blocked: false })),
      );
      elementRef.current = audio;
    }
    return elementRef.current;
  }, []);

  /**
   * Prime the element inside a user gesture.
   *
   * Playing a moment of silence is what actually marks the element as
   * user-activated; every later `src` swap then inherits that permission.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    const audio = element();
    audio.src = SILENT_WAV;
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        unlockedRef.current = true;
        setState((s) => ({ ...s, blocked: false }));
      })
      .catch(() => {
        audio.muted = false;
        // Not fatal: the first real utterance may still be allowed.
      });
  }, [element]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationRef.current += 1;
    const audio = elementRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState((s) => ({ ...s, speaking: false, loading: false }));
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // A newer reply always wins; cancel whatever is in flight or playing.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = (generationRef.current += 1);

      const audio = element();
      audio.pause();
      setState((s) => ({ ...s, loading: true }));

      try {
        const res = await fetch("/api/spalty/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
          signal: controller.signal,
        });

        if (res.status === 503) {
          // No voice configured on the server — stop offering it.
          setState({ speaking: false, loading: false, blocked: false, unavailable: true });
          return;
        }
        if (!res.ok) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        const blob = await res.blob();
        if (generation !== generationRef.current) return;

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        audio.src = urlRef.current;

        setState((s) => ({ ...s, loading: false }));
        await audio.play();
        setState((s) => ({ ...s, speaking: true, blocked: false }));
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        // A rejected play() is the autoplay policy talking. Surface it so the
        // user can grant it with one tap rather than wondering why it stopped.
        const blocked = (err as Error)?.name === "NotAllowedError";
        setState((s) => ({ ...s, loading: false, speaking: false, blocked }));
      }
    },
    [element],
  );

  /** Re-run the last utterance after the user taps to allow sound. */
  const resume = useCallback(async () => {
    unlockedRef.current = true;
    const audio = elementRef.current;
    if (!audio?.src) {
      setState((s) => ({ ...s, blocked: false }));
      return;
    }
    try {
      await audio.play();
      setState((s) => ({ ...s, blocked: false, speaking: true }));
    } catch {
      setState((s) => ({ ...s, blocked: true }));
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      elementRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  return { ...state, speak, stop, unlock, resume, setOnEnded };
}
