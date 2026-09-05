// Cloudflare Pages Function: polls LALAL.ai for separation progress / result URLs.
const LALAL = "https://www.lalal.ai/api";
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  if (!env.LALAL_API_KEY)
    return json({ error: "LALAL_API_KEY is not set on the Pages project (Settings → Variables and secrets)" }, 500);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]+(,[\w-]+){0,9}$/.test(id)) return json({ error: "bad id" }, 400);
  const form = new URLSearchParams();
  form.set("id", id);
  const r = await fetch(LALAL + "/check/", {
    method: "POST",
    headers: { Authorization: "license " + env.LALAL_API_KEY },
    body: form,
  });
  let j = null;
  try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j) return json({ error: "LALAL.ai check failed (HTTP " + r.status + ")" }, 502);
  return json(j);
}
