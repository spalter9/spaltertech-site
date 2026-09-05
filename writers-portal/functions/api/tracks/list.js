import { json, requireWriter } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const writer = await requireWriter(request, env);
  if (!writer) return json({ error: 'Not signed in.' }, 401);

  const { results } = await env.DB.prepare('SELECT * FROM tracks WHERE writer_id = ? ORDER BY created_at DESC').bind(writer.id).all();
  return json({ tracks: results || [] });
}
