import { json, verifyPassword, signSession, sessionCookie } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) return json({ error: 'Email and password are required.' }, 400);

  const row = await env.DB.prepare('SELECT * FROM writers WHERE email = ?').bind(String(email).toLowerCase().trim()).first();
  if (!row) return json({ error: 'No account found for that email.' }, 401);

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) return json({ error: 'Incorrect password.' }, 401);

  const token = await signSession(env, { uid: row.id, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  return json(
    { id: row.id, email: row.email, name: row.name, role: row.role, mustChangePassword: !!row.must_change_password },
    200,
    { 'set-cookie': sessionCookie(token) },
  );
}
