import { json, requireWriter, uid } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const writer = await requireWriter(request, env);
  if (!writer) return json({ error: 'Not signed in.' }, 401);

  const { title, isrc, notes } = await request.json().catch(() => ({}));
  if (!title || !String(title).trim()) return json({ error: 'A track title is required.' }, 400);

  const id = uid();
  await env.DB.prepare(
    'INSERT INTO tracks (id, writer_id, title, isrc, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, writer.id, String(title).trim(), isrc ? String(isrc).trim() : null, notes ? String(notes).trim() : null, 'submitted')
    .run();

  const track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ?').bind(id).first();
  return json({ track });
}
