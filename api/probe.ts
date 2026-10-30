// Temporary diagnostic endpoint — isolates whether a serverless function at
// all works on this Vercel project, independent of the app import chain.
// Remove once api/[[...route]].ts is confirmed working.
export default function () {
  return new Response(
    JSON.stringify({ ok: true, from: "probe", node: process.version }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
