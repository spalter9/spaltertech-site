import { json, requireWriter, uid } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const writer = await requireWriter(request, env);
  if (!writer) return json({ error: 'Not signed in.' }, 401);

  const { trackId, percentage, role } = await request.json().catch(() => ({}));
  const pct = Number(percentage);
  if (!trackId || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
    return json({ error: 'A track and a percentage between 0 and 100 are required.' }, 400);
  }

  const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ? AND writer_id = ?').bind(trackId, writer.id).first();
  if (!track) return json({ error: 'Track not found on your account.' }, 404);

  const id = uid();
  await env.DB.prepare(
    'INSERT INTO splits (id, track_id, writer_id, role, percentage, status) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, trackId, writer.id, role === 'publisher' ? 'publisher' : 'writer', pct, 'proposed')
    .run();

  const split = await env.DB.prepare('SELECT * FROM splits WHERE id = ?').bind(id).first();
  return json({ split });
}
