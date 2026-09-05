// Cloudflare Pages Function: proxies a finished stem download from LALAL.ai (same-origin for the browser).
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestGet({ request }) {
  const u = new URL(request.url).searchParams.get("url") || "";
  let t;
  try { t = new URL(u); } catch (e) { return json({ error: "bad url" }, 400); }
  if (t.protocol !== "https:" || !/(^|\.)lalal\.ai$/.test(t.hostname))
    return json({ error: "only lalal.ai downloads are proxied" }, 400);
  const r = await fetch(t.toString());
  if (!r.ok) return json({ error: "download failed (HTTP " + r.status + ")" }, 502);
  return new Response(r.body, {
    status: 200,
    headers: {
      "content-type": r.headers.get("content-type") || "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}
