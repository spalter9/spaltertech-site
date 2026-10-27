/**
 * Cloudflare Pages Function — POST /api/spalty-voice
 *
 * Reads Spalty's reply aloud in the cloned ElevenLabs voice model. The
 * static page's `speak()` calls this first and only falls back to the
 * browser's built-in speechSynthesis ("computer voice") when this request
 * fails — so a 404/500 here silently degrades every visitor to the robot
 * voice. Requires ELEVENLABS_API_KEY as an environment variable on the
 * Cloudflare Pages project (Settings → Variables and Secrets). Spalty's voice
 * is ElevenLabs' "Adam Stone" library voice by default; ELEVENLABS_VOICE_ID
 * overrides it. The voice must be in the API key's account ("Add to my voices"
 * in the ElevenLabs Voice Library), or ElevenLabs rejects the call.
 */

// "Adam Stone – Smooth, Deep, and Relaxed" (British), picked as Spalty's voice.
const DEFAULT_VOICE_ID = "auq43ws1oslv0tO4BDa7";

interface Env {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Spalty voice is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const text = String((body as { text?: string }).text ?? "").trim().slice(0, 2000);
  if (!text) {
    return new Response(JSON.stringify({ error: "Missing text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Could not reach ElevenLabs", detail: String(err).slice(0, 300) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: "ElevenLabs request failed", detail: detail.slice(0, 300) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const audio = await upstream.arrayBuffer();
  return new Response(audio, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audio.byteLength) },
  });
};
