import { json, requireStaff, uid, hashPassword, randomTempPassword } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const staff = await requireStaff(request, env);
  if (!staff) return json({ error: 'Staff access required.' }, 403);

  const { results } = await env.DB.prepare(
    "SELECT id, email, name, role, ipi, pro, mogul_asset_owner_id, created_at FROM writers WHERE role = 'writer' ORDER BY created_at DESC",
  ).all();
  return json({ writers: results || [] });
}

// Invite-only account creation. Staff creates the account and relays the one-time
// temp password to the writer directly (text, email, in person) — no self-signup.
export async function onRequestPost({ request, env }) {
  const staff = await requireStaff(request, env);
  if (!staff) return json({ error: 'Staff access required.' }, 403);

  const { email, name, ipi, pro } = await request.json().catch(() => ({}));
  if (!email || !name) return json({ error: 'Email and name are required.' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM writers WHERE email = ?').bind(String(email).toLowerCase().trim()).first();
  if (existing) return json({ error: 'A writer with that email already exists.' }, 409);

  const tempPassword = randomTempPassword();
  const hash = await hashPassword(tempPassword);
  const id = uid();
  await env.DB.prepare(
    'INSERT INTO writers (id, email, password_hash, name, role, ipi, pro, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
  )
    .bind(id, String(email).toLowerCase().trim(), hash, String(name).trim(), 'writer', ipi || null, pro || null)
    .run();

  return json({
    writer: { id, email, name },
    tempPassword,
    note: 'Share this temporary password with the writer directly — it is shown only once and cannot be retrieved again.',
  });
}
