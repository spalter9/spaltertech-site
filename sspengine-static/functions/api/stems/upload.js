// Cloudflare Pages Function: forwards an audio upload to LALAL.ai.
// Secret required in the Pages project: LALAL_API_KEY (Settings → Variables and secrets).
const LALAL = "https://www.lalal.ai/api";
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  if (!env.LALAL_API_KEY)
    return json({ error: "LALAL_API_KEY is not set on the Pages project (Settings → Variables and secrets)" }, 500);
  const name = (request.headers.get("x-filename") || "track.wav").replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const body = await request.arrayBuffer();
  if (!body.byteLength) return json({ error: "empty upload" }, 400);
  if (body.byteLength > 200 * 1024 * 1024) return json({ error: "file too large (200 MB max)" }, 413);
  const up = await fetch(LALAL + "/upload/", {
    method: "POST",
    headers: {
      Authorization: "license " + env.LALAL_API_KEY,
      "Content-Disposition": "attachment; filename=" + name,
    },
    body,
  });
  let j = null;
  try { j = await up.json(); } catch (e) {}
  if (!up.ok || !j || j.status !== "success" || !j.id)
    return json({ error: (j && j.error) || "LALAL.ai upload failed (HTTP " + up.status + ")" }, 502);
  return json({ id: j.id, duration: j.duration, size: j.size });
}
