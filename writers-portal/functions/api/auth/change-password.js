import { json, requireWriter, hashPassword } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const row = await requireWriter(request, env);
  if (!row) return json({ error: 'Not signed in.' }, 401);

  const { newPassword } = await request.json().catch(() => ({}));
  if (!newPassword || newPassword.length < 8) return json({ error: 'New password must be at least 8 characters.' }, 400);

  const hash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE writers SET password_hash = ?, must_change_password = 0 WHERE id = ?').bind(hash, row.id).run();
  return json({ ok: true });
}
