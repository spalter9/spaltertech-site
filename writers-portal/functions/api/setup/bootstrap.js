import { json, uid, hashPassword } from '../_lib.js';

// One-time setup: creates the first staff account. Gated by the BOOTSTRAP_KEY secret
// (set it in Cloudflare Pages -> Settings -> Variables and secrets, same way as any
// other secret on this project) so it can't be called by a random visitor. Delete
// the BOOTSTRAP_KEY secret once your staff account exists to close this off.
export async function onRequestPost({ request, env }) {
  if (!env.BOOTSTRAP_KEY) return json({ error: 'Bootstrap is not configured.' }, 503);

  const { key, email, name, password } = await request.json().catch(() => ({}));
  if (key !== env.BOOTSTRAP_KEY) return json({ error: 'Invalid bootstrap key.' }, 403);
  if (!email || !name || !password || password.length < 8) {
    return json({ error: 'email, name, and a password of 8+ characters are required.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM writers WHERE email = ?').bind(String(email).toLowerCase().trim()).first();
  if (existing) return json({ error: 'That email is already registered.' }, 409);

  const hash = await hashPassword(password);
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO writers (id, email, password_hash, name, role, must_change_password) VALUES (?, ?, ?, ?, ?, 0)',
  )
    .bind(id, String(email).toLowerCase().trim(), hash, String(name).trim(), 'staff')
    .run();

  return json({ ok: true, staff: { id, email, name } });
}
