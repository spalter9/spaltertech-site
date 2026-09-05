// Cloudflare Pages Function: asks LALAL.ai to separate one stem per uploaded file id.
const LALAL = "https://www.lalal.ai/api";
const ALLOWED = new Set(["vocals", "drum", "bass", "piano", "electric_guitar", "acoustic_guitar", "synthesizer", "strings", "wind", "voice"]);
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.LALAL_API_KEY)
    return json({ error: "LALAL_API_KEY is not set on the Pages project (Settings → Variables and secrets)" }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  const params = jobs
    .filter((j) => j && typeof j.id === "string" && /^[\w-]+$/.test(j.id) && ALLOWED.has(j.stem))
    .map((j) => ({ id: j.id, stem: j.stem, splitter: "phoenix" }));
  if (!params.length) return json({ error: "no valid jobs" }, 400);
  const form = new URLSearchParams();
  form.set("params", JSON.stringify(params));
  const r = await fetch(LALAL + "/split/", {
    method: "POST",
    headers: { Authorization: "license " + env.LALAL_API_KEY },
    body: form,
  });
  let j = null;
  try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j || j.status !== "success")
    return json({ error: (j && j.error) || "LALAL.ai split request failed (HTTP " + r.status + ")" }, 502);
  return json({ ok: true, jobs: params.length });
}
