import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone input via the browser's own speech recognition.
 *
 * Nothing is uploaded by this hook — recognition runs in the browser, which
 * keeps the "no third party in the audio path" promise intact for the widget
 * as well as the protocol.
 *
 * Support is genuinely uneven: Chrome, Edge and Safari implement it (Safari
 * behind the webkit prefix); Firefox does not implement it at all. Rather than
 * showing a dead button, `supported` lets the UI hide the mic where it cannot
 * work and say why.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string }; length: number };
  };
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechInputOptions = {
  /** Called with the final transcript when the speaker stops. */
  onFinal: (transcript: string) => void;
};

export function useSpeechInput({ onFinal }: SpeechInputOptions) {
  const [supported] = useState(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  /** Mirrors `interim` so `onend` reads the latest words, not a stale render. */
  const interimRef = useRef("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  /** Set when we stop on purpose, so `onend` knows not to report a problem. */
  const intentionalStopRef = useRef(false);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("This browser has no speech recognition. Chrome, Edge, or Safari can listen.");
      return;
    }

    // A stale instance left listening will fight the new one for the mic.
    recognitionRef.current?.abort();
    finalRef.current = "";
    interimRef.current = "";
    setInterim("");
    setError(null);
    intentionalStopRef.current = false;

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    // Interim results are what make the transcript appear as you talk.
    recognition.interimResults = true;
    // One utterance per press: recognition ends when you stop speaking.
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]!;
        const transcript = result[0].transcript;
        if (result.isFinal) finalRef.current += transcript;
        else interimText += transcript;
      }
      interimRef.current = interimText;
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      setListening(false);
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setError("Microphone permission is blocked. Allow it in your browser's site settings.");
          break;
        case "no-speech":
          setError("Didn't catch anything — try again.");
          break;
        case "audio-capture":
          setError("No microphone found.");
          break;
        case "aborted":
          break;
        default:
          setError(`Microphone error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      // Keep any interim words the engine never promoted to final — otherwise a
      // short utterance that ends abruptly is silently dropped.
      const transcript = `${finalRef.current} ${interimRef.current}`.trim();
      finalRef.current = "";
      interimRef.current = "";
      setInterim("");
      if (transcript) onFinalRef.current(transcript);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if it is already running; treat as already listening.
      setListening(true);
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, interim, error, start, stop, toggle, clearError: () => setError(null) };
}
