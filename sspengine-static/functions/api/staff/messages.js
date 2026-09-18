import { json, requireStaff } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env);
  if (!staff) return json({ error: 'Staff access required.' }, 403);

  const url = new URL(request.url);
  const writerId = url.searchParams.get('writerId');
  if (!writerId) return json({ error: 'writerId is required.' }, 400);

  const { results } = await env.DB.prepare('SELECT * FROM messages WHERE writer_id = ? ORDER BY created_at ASC').bind(writerId).all();
  return json({ messages: results || [] });
}
