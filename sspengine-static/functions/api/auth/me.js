import { json, requireWriter } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const row = await requireWriter(request, env);
  if (!row) return json({ error: 'Not signed in.' }, 401);
  return json({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    ipi: row.ipi,
    pro: row.pro,
    mustChangePassword: !!row.must_change_password,
  });
}
