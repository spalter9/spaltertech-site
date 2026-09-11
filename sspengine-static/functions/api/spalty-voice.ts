/**
 * Cloudflare Pages Function — POST /api/spalty-voice
 *
 * Reads Spalty's reply aloud in the cloned ElevenLabs voice model. The
 * static page's `speak()` calls this first and only falls back to the
 * browser's built-in speechSynthesis ("computer voice") when this request
 * fails — so a 404/500 here silently degrades every visitor to the robot
 * voice. Requires ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID to be set as
 * environment variables on the Cloudflare Pages project (Settings →
 * Environment variables) — they are not read from any file in this repo.
 */

interface Env {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const apiKey = env.ELEVENLABS_API_KEY;
  const voiceId = env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
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

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
