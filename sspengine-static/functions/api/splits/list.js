import { json, requireWriter } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const writer = await requireWriter(request, env);
  if (!writer) return json({ error: 'Not signed in.' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT s.*, t.title as track_title FROM splits s JOIN tracks t ON t.id = s.track_id
     WHERE s.writer_id = ? ORDER BY s.created_at DESC`,
  )
    .bind(writer.id)
    .all();
  return json({ splits: results || [] });
}
