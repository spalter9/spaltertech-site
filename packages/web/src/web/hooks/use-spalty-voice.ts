import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Spalty's speaking voice.
 *
 * Built on the Web Audio API instead of an <audio> element on purpose. An
 * HTMLMediaElement's "may this play without a gesture" grant is tied to the
 * timing of a specific play() call relative to the gesture that started it —
 * reliable in a synchronous click handler, flaky once a fetch (chat round
 * trip, then the TTS round trip) sits in between, which is exactly Spalty's
 * path. A browser AudioContext instead has a binary state — suspended or
 * running — and once a user gesture resumes it, it stays running for the
 * rest of the page's life, regardless of what happens asynchronously
 * afterwards. So instead of priming one element on one specific tap (opening
 * the panel) and hoping that grant survives two network round trips, this
 * resumes the context on the very first interaction *anywhere on the page*
 * — see the window-level listener registered by the widget — so by the time
 * a reply is ready to speak, audio has almost always been unlocked for a
 * while already.
 */

export type VoiceState = {
  /** Audio is currently playing. */
  speaking: boolean;
  /** Fetching the audio for a reply. */
  loading: boolean;
  /** The context is still suspended — the UI should offer a tap to enable it. */
  blocked: boolean;
  /** The server has no voice configured; stay text-only without complaining. */
  unavailable: boolean;
};

type AudioContextCtor = typeof AudioContext;

export function useSpaltyVoice() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  /** The last decoded reply, kept so a blocked playback can be retried without refetching. */
  const lastBufferRef = useRef<AudioBuffer | null>(null);
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

  const ctx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor: AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext;
      const context = new Ctor();
      const gain = context.createGain();
      gain.connect(context.destination);
      gainRef.current = gain;
      ctxRef.current = context;
    }
    return ctxRef.current;
  }, []);

  /**
   * Resume the context. Safe and cheap to call from any gesture, repeatedly
   * — a no-op once the context is already running.
   */
  const unlock = useCallback(() => {
    const context = ctx();
    if (context.state === "suspended") {
      void context.resume().then(
        () => setState((s) => ({ ...s, blocked: false })),
        () => {
          /* Still suspended — a later attempt, or the blocked banner, will catch it. */
        },
      );
    }
  }, [ctx]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    generationRef.current += 1;
    try {
      sourceRef.current?.stop();
    } catch {
      /* Already stopped/finished — fine. */
    }
    sourceRef.current = null;
    setState((s) => ({ ...s, speaking: false, loading: false }));
  }, []);

  const playBuffer = useCallback(
    (buffer: AudioBuffer) => {
      const context = ctx();
      try {
        sourceRef.current?.stop();
      } catch {
        /* Already stopped/finished — fine. */
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gainRef.current!);
      source.onended = () => {
        setState((s) => ({ ...s, speaking: false }));
        onEndedRef.current?.();
      };
      source.start();
      sourceRef.current = source;
      setState((s) => ({ ...s, loading: false, speaking: true, blocked: false }));
    },
    [ctx],
  );

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // A newer reply always wins; cancel whatever is in flight or playing.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const generation = (generationRef.current += 1);

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

        const arrayBuffer = await res.arrayBuffer();
        if (generation !== generationRef.current) return;

        const context = ctx();
        const buffer = await context.decodeAudioData(arrayBuffer);
        if (generation !== generationRef.current) return;
        lastBufferRef.current = buffer;

        // Try once more here — a resume kicked off elsewhere may have landed
        // mid-fetch — before giving up and asking the user directly.
        if (context.state === "suspended") {
          try {
            await context.resume();
          } catch {
            /* Handled by the state check below. */
          }
        }

        if (context.state !== "running") {
          setState((s) => ({ ...s, loading: false, blocked: true }));
          return;
        }

        playBuffer(buffer);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, speaking: false }));
      }
    },
    [ctx, playBuffer],
  );

  /** Re-run the last utterance after the user taps to allow sound. */
  const resume = useCallback(async () => {
    const context = ctx();
    try {
      await context.resume();
    } catch {
      /* Handled below. */
    }
    if (context.state === "running") {
      setState((s) => ({ ...s, blocked: false }));
      if (lastBufferRef.current) playBuffer(lastBufferRef.current);
    } else {
      setState((s) => ({ ...s, blocked: true }));
    }
  }, [ctx, playBuffer]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      try {
        sourceRef.current?.stop();
      } catch {
        /* Already stopped/finished — fine. */
      }
      void ctxRef.current?.close();
    };
  }, []);

  return { ...state, speak, stop, unlock, resume, setOnEnded };
}
