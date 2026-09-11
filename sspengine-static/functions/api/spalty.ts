/**
 * Cloudflare Pages Function — POST /api/spalty
 *
 * Proxies Spalty's chat to the Anthropic Messages API, injecting the
 * server-side key so it never ships to the browser. The static page already
 * builds a full Anthropic-shaped request body (model, max_tokens, system,
 * messages) and posts it here, then reads `data.content` straight off the
 * response — so this just forwards the body through and returns Anthropic's
 * JSON unchanged. Requires ANTHROPIC_API_KEY as a Cloudflare Pages
 * environment variable (Settings → Environment variables).
 */

interface Env {
  ANTHROPIC_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const apiKey = env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Spalty is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.text();

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  });

  const responseBody = await upstream.text();
  return new Response(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
};
