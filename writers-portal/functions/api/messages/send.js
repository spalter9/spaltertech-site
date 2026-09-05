import { json, requireWriter, uid } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const writer = await requireWriter(request, env);
  if (!writer) return json({ error: 'Not signed in.' }, 401);

  const { body, writerId } = await request.json().catch(() => ({}));
  if (!body || !String(body).trim()) return json({ error: 'Message cannot be empty.' }, 400);

  // Staff can send into any writer's thread by passing writerId; writers can only post to their own.
  const targetWriterId = writer.role === 'staff' && writerId ? writerId : writer.id;
  const sender = writer.role === 'staff' ? 'staff' : 'writer';

  const id = uid();
  await env.DB.prepare('INSERT INTO messages (id, writer_id, sender, body) VALUES (?, ?, ?, ?)')
    .bind(id, targetWriterId, sender, String(body).trim())
    .run();

  const message = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
  return json({ message });
}
